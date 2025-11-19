import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModuleRef } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { KafkaConsumerService, MessageHandler } from './kafka-consumer.service';
import { EVENT_HANDLER_METADATA, EventHandlerConfig } from './event-handler.decorator';

/**
 * Event Handler Registry
 *
 * Automatically discovers and registers all event handlers
 * decorated with @EventHandler in the application.
 */
@Injectable()
export class EventHandlerRegistry implements OnModuleInit {
  private readonly logger = new Logger(EventHandlerRegistry.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
    private readonly consumerService: KafkaConsumerService,
  ) {}

  /**
   * Discover and register all event handlers on module initialization
   */
  async onModuleInit() {
    this.logger.log('🔍 Discovering event handlers...');

    const providers = this.discoveryService.getProviders();
    const handlers = this.discoverEventHandlers(providers);

    this.logger.log(`📝 Found ${handlers.length} event handler(s)`);

    // Group handlers by consumer group
    const handlersByGroup = this.groupHandlersByConsumerGroup(handlers);

    // Register consumers for each group
    for (const [groupId, groupHandlers] of handlersByGroup.entries()) {
      await this.registerConsumerGroup(groupId, groupHandlers);
    }

    this.logger.log('✅ Event handler registration complete');
  }

  /**
   * Discover all event handlers from providers
   */
  private discoverEventHandlers(
    providers: InstanceWrapper[],
  ): Array<{
    instance: any;
    methodName: string;
    config: EventHandlerConfig;
  }> {
    const handlers: Array<{
      instance: any;
      methodName: string;
      config: EventHandlerConfig;
    }> = [];

    for (const wrapper of providers) {
      const { instance } = wrapper;

      if (!instance || !Object.getPrototypeOf(instance)) {
        continue;
      }

      const prototype = Object.getPrototypeOf(instance);
      const methodNames = this.metadataScanner.getAllMethodNames(prototype);

      for (const methodName of methodNames) {
        const config = Reflect.getMetadata(
          EVENT_HANDLER_METADATA,
          prototype,
          methodName,
        ) as EventHandlerConfig;

        if (config) {
          handlers.push({
            instance,
            methodName,
            config,
          });

          this.logger.debug(
            `  ✓ Found handler: ${instance.constructor.name}.${methodName} for event "${config.eventName}"`,
          );
        }
      }
    }

    return handlers;
  }

  /**
   * Group handlers by consumer group ID
   */
  private groupHandlersByConsumerGroup(
    handlers: Array<{
      instance: any;
      methodName: string;
      config: EventHandlerConfig;
    }>,
  ): Map<
    string,
    Array<{
      instance: any;
      methodName: string;
      config: EventHandlerConfig;
    }>
  > {
    const groups = new Map<
      string,
      Array<{
        instance: any;
        methodName: string;
        config: EventHandlerConfig;
      }>
    >();

    for (const handler of handlers) {
      const groupId = this.getConsumerGroupId(handler);

      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }

      groups.get(groupId)!.push(handler);
    }

    return groups;
  }

  /**
   * Register a consumer group with all its handlers
   */
  private async registerConsumerGroup(
    groupId: string,
    handlers: Array<{
      instance: any;
      methodName: string;
      config: EventHandlerConfig;
    }>,
  ): Promise<void> {
    // Get all unique topics for this group
    const topics = this.getUniqueTopics(handlers);

    // Determine if any handler requires fromBeginning
    const fromBeginning = handlers.some((h) => h.config.fromBeginning);

    // Determine if any handler requires manual commit
    const autoCommit = handlers.every((h) => h.config.autoCommit !== false);

    this.logger.log(
      `📡 Registering consumer group: ${groupId} | topics: ${topics.join(', ')} | handlers: ${handlers.length}`,
    );

    // Create a combined message handler
    const messageHandler: MessageHandler = async (payload) => {
      const { topic, data, headers } = payload;

      // Extract event name from headers or data
      const eventName = headers['event-name'] || data?.event_name;

      if (!eventName) {
        this.logger.warn(
          `⚠️  No event name found in message from topic: ${topic}`,
        );
        return;
      }

      // Find matching handlers for this event
      const matchingHandlers = handlers.filter((h) =>
        this.matchesEvent(eventName, h.config.eventName),
      );

      if (matchingHandlers.length === 0) {
        this.logger.debug(
          `No handlers found for event: ${eventName} in group: ${groupId}`,
        );
        return;
      }

      // Execute all matching handlers
      await Promise.all(
        matchingHandlers.map(async (handler) => {
          try {
            this.logger.debug(
              `Executing handler: ${handler.instance.constructor.name}.${handler.methodName} for event: ${eventName}`,
            );

            await handler.instance[handler.methodName](data, {
              topic,
              headers,
              partition: payload.partition,
              offset: payload.message.offset,
            });
          } catch (error) {
            this.logger.error(
              `❌ Handler ${handler.instance.constructor.name}.${handler.methodName} failed for event ${eventName}:`,
              error,
            );
            throw error; // Re-throw to trigger DLQ
          }
        }),
      );
    };

    // Subscribe to topics
    await this.consumerService.subscribe({
      groupId,
      topics,
      handler: messageHandler,
      fromBeginning,
      autoCommit,
    });
  }

  /**
   * Get unique topics from handlers
   */
  private getUniqueTopics(
    handlers: Array<{
      config: EventHandlerConfig;
    }>,
  ): string[] {
    const topicsSet = new Set<string>();

    for (const handler of handlers) {
      const topics = handler.config.topics || this.deriveTopicsFromEventName(handler.config.eventName);

      for (const topic of topics) {
        topicsSet.add(topic);
      }
    }

    return Array.from(topicsSet);
  }

  /**
   * Derive Kafka topics from event name
   */
  private deriveTopicsFromEventName(eventName: string): string[] {
    // Event naming convention: domain.entity.action
    // Map to topic: fsm.{domain}
    const [domain] = eventName.split('.');

    const topicMap: Record<string, string> = {
      projects: process.env.KAFKA_PROJECTS_TOPIC || 'fsm.projects',
      assignments: process.env.KAFKA_ASSIGNMENTS_TOPIC || 'fsm.assignments',
      scheduling: process.env.KAFKA_SCHEDULING_TOPIC || 'fsm.scheduling',
      execution: process.env.KAFKA_EXECUTION_TOPIC || 'fsm.execution',
      contracts: process.env.KAFKA_CONTRACTS_TOPIC || 'fsm.contracts',
      order: process.env.KAFKA_PROJECTS_TOPIC || 'fsm.projects',
      appointment: process.env.KAFKA_SCHEDULING_TOPIC || 'fsm.scheduling',
      technician: process.env.KAFKA_ASSIGNMENTS_TOPIC || 'fsm.assignments',
      payment: process.env.KAFKA_CONTRACTS_TOPIC || 'fsm.contracts',
      document: process.env.KAFKA_CONTRACTS_TOPIC || 'fsm.contracts',
    };

    const topic = topicMap[domain] || `fsm.${domain}`;
    return [topic];
  }

  /**
   * Get consumer group ID for a handler
   */
  private getConsumerGroupId(handler: {
    instance: any;
    config: EventHandlerConfig;
  }): string {
    if (handler.config.groupId) {
      return handler.config.groupId;
    }

    // Default: service-name + event-name
    const serviceName = handler.instance.constructor.name
      .replace(/Service$/, '')
      .toLowerCase();
    const eventSlug = handler.config.eventName.replace(/\*/g, 'all').replace(/\./g, '-');

    return `${serviceName}-${eventSlug}`;
  }

  /**
   * Check if event name matches pattern
   */
  private matchesEvent(eventName: string, pattern: string): boolean {
    // Exact match
    if (eventName === pattern) {
      return true;
    }

    // Pattern matching with wildcards
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventName);
  }
}
