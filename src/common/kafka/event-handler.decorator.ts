import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for event handlers
 */
export const EVENT_HANDLER_METADATA = 'kafka:event_handler';

/**
 * Event handler configuration
 */
export interface EventHandlerConfig {
  /**
   * Event name or pattern to listen to
   * Examples: 'order.created', 'order.*', 'order.status.*'
   */
  eventName: string;

  /**
   * Kafka topic(s) to subscribe to
   * If not provided, will be derived from eventName
   */
  topics?: string[];

  /**
   * Consumer group ID
   * If not provided, will use default: `${serviceName}-${eventName}`
   */
  groupId?: string;

  /**
   * Whether to start consuming from the beginning of the topic
   * Default: false
   */
  fromBeginning?: boolean;

  /**
   * Whether to auto-commit offsets
   * Default: true
   */
  autoCommit?: boolean;
}

/**
 * Decorator to mark a method as a Kafka event handler
 *
 * Usage:
 * ```typescript
 * @EventHandler({ eventName: 'order.created', topics: ['fsm.projects'] })
 * async handleOrderCreated(event: any) {
 *   // Handle event
 * }
 * ```
 *
 * @param config - Event handler configuration
 */
export function EventHandler(config: EventHandlerConfig): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(EVENT_HANDLER_METADATA, config)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * Get event handler metadata from a class instance
 */
export function getEventHandlers(instance: any): Array<{
  methodName: string;
  config: EventHandlerConfig;
  handler: Function;
}> {
  const prototype = Object.getPrototypeOf(instance);
  const methodNames = Object.getOwnPropertyNames(prototype).filter(
    (name) => typeof prototype[name] === 'function' && name !== 'constructor',
  );

  const handlers: Array<{
    methodName: string;
    config: EventHandlerConfig;
    handler: Function;
  }> = [];

  for (const methodName of methodNames) {
    const method = prototype[methodName];
    const metadata = Reflect.getMetadata(EVENT_HANDLER_METADATA, prototype, methodName);

    if (metadata) {
      handlers.push({
        methodName,
        config: metadata,
        handler: method.bind(instance),
      });
    }
  }

  return handlers;
}
