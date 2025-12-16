import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import {
  OrderIntakeRequestDto,
  OrderIntakeResponseDto,
  OrderIntakeStatus,
  ValidationErrorDto,
  UpdateDeliveryDateDto,
} from '../dto';
import {
  IntegrationAdapter,
  IntegrationContext,
  ValidationResult,
  HealthStatus,
} from '../interfaces';
import { KafkaProducerService } from '../../../common/kafka/kafka-producer.service';
import { RedisService } from '../../../common/redis/redis.service';

@Injectable()
export class OrderIntakeService
  implements IntegrationAdapter<OrderIntakeRequestDto, OrderIntakeResponseDto> {
  readonly adapterId = 'sales-order-intake';
  readonly version = '2.1.0';
  private readonly logger = new Logger(OrderIntakeService.name);

  constructor(
    private readonly kafkaService: KafkaProducerService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Execute order intake processing
   */
  async execute(
    request: OrderIntakeRequestDto,
    context: IntegrationContext,
  ): Promise<OrderIntakeResponseDto> {
    this.logger.log(`Processing order intake for external order: ${request.order.id} from ${request.system}`);

    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(request, context);

    // Check if already processed (idempotency)
    const existingResultJson = await this.redisService.get(idempotencyKey);
    if (existingResultJson) {
      this.logger.log(`Idempotent request detected for order: ${request.order.id}`);
      return JSON.parse(existingResultJson) as OrderIntakeResponseDto;
    }

    // Validate request
    const validation = this.validate(request);
    if (!validation.isValid) {
      const response: OrderIntakeResponseDto = {
        orderId: '',
        externalOrderId: request.order.id,
        status: OrderIntakeStatus.FAILED,
        correlationId: context.correlationId,
        receivedAt: new Date().toISOString(),
        errors: validation.errors as ValidationErrorDto[],
      };
      return response;
    }

    // Generate FSM order ID
    const orderId = this.generateOrderId();

    // Publish order intake event to Kafka
    await this.publishOrderIntakeEvent(request, orderId, context);

    // Create response
    const response: OrderIntakeResponseDto = {
      orderId,
      externalOrderId: request.order.id,
      status: OrderIntakeStatus.RECEIVED,
      correlationId: context.correlationId,
      receivedAt: new Date().toISOString(),
    };

    // Store in Redis for idempotency (TTL: 24 hours)
    await this.redisService.set(idempotencyKey, JSON.stringify(response), 24 * 60 * 60);

    this.logger.log(`Order intake processed successfully. FSM Order ID: ${orderId}`);

    return response;
  }

  /**
   * Execute update delivery date processing
   */
  async executeUpdate(
    request: UpdateDeliveryDateDto,
    context: IntegrationContext,
  ): Promise<OrderIntakeResponseDto> {
    this.logger.log(`Processing update for external order: ${request.customerOrderNumber} from ${request.saleSystem}`);

    // Generate FSM order ID (mock or lookup - here we don't look up yet, just pass through)
    // Ideally we should lookup the internal ID using external ID
    const orderId = 'UNKNOWN'; // We might not have it yet if we don't query DB

    // Publish update event to Kafka
    const event = {
      eventId: this.generateEventId(),
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
      orderId, // This might be null or we pass external
      externalOrderId: request.customerOrderNumber,
      salesSystem: request.saleSystem,
      orderData: request,
    };

    await this.kafkaService.send('sales.order', event, request.customerOrderNumber, {
      'correlation-id': context.correlationId,
      'tenant-id': context.tenantId,
      'event-type': 'UpdateDeliveryDate',
    });

    this.logger.log(`Published update delivery date event to Kafka. External Order ID: ${request.customerOrderNumber}`);

    return {
      orderId: orderId,
      externalOrderId: request.customerOrderNumber,
      status: OrderIntakeStatus.RECEIVED,
      correlationId: context.correlationId,
      receivedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate order intake request
   */
  validate(request: OrderIntakeRequestDto): ValidationResult {
    const errors: ValidationErrorDto[] = [];

    // Validate required fields
    if (!request.order?.id) {
      errors.push({
        field: 'order.id',
        code: 'FIELD_REQUIRED',
        message: 'Order ID is required',
      });
    }

    // Validate customer contact information
    if (!request.customer?.email && !request.customer?.phone) {
      errors.push({
        field: 'customer',
        code: 'MISSING_CONTACT',
        message: 'At least one contact method (email or phone) is required',
      });
    }

    // Validate email format if provided
    if (request.customer?.email && !this.isValidEmail(request.customer.email)) {
      errors.push({
        field: 'customer.email',
        code: 'INVALID_FORMAT',
        message: 'Invalid email format',
      });
    }

    // Validate phone format if provided
    if (request.customer?.phone && !this.isValidPhone(request.customer.phone)) {
      errors.push({
        field: 'customer.phone',
        code: 'INVALID_FORMAT',
        message: 'Invalid phone format',
      });
    }

    // Validate items
    if (!request.items || request.items.length === 0) {
      errors.push({
        field: 'items',
        code: 'FIELD_REQUIRED',
        message: 'At least one item is required',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Transform external response (not used for order intake)
   */
  transform(externalResponse: unknown): OrderIntakeResponseDto {
    return externalResponse as OrderIntakeResponseDto;
  }

  /**
   * Health check for Kafka connectivity
   */
  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();

    try {
      // Check Kafka connectivity
      const kafkaHealthy = this.kafkaService.isProducerConnected();
      const latency = Date.now() - start;

      return {
        status: kafkaHealthy ? 'healthy' : 'unhealthy',
        latency,
        lastChecked: new Date(),
        details: {
          kafka: kafkaHealthy ? 'connected' : 'disconnected',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Publish order intake event to Kafka
   */
  private async publishOrderIntakeEvent(
    request: OrderIntakeRequestDto,
    orderId: string,
    context: IntegrationContext,
  ): Promise<void> {
    const event = {
      eventId: this.generateEventId(),
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
      orderId,
      externalOrderId: request.order.id,
      salesSystem: request.system,
      orderData: request,
    };

    await this.kafkaService.send('sales.order', event, orderId, {
      'correlation-id': context.correlationId,
      'tenant-id': context.tenantId,
      'event-type': 'OrderIntakeReceived',
    });

    this.logger.log(`Published order intake event to Kafka. Order ID: ${orderId}`);
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(
    request: OrderIntakeRequestDto,
    context: IntegrationContext,
  ): string {
    const key = `order-intake:${request.order.id}:${request.system}`;
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    // Use timestamp + random string for uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `SO-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `evt-${timestamp}-${random}`;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (E.164 format)
   */
  private isValidPhone(phone: string): boolean {
    // Remove spaces, dashes, and parentheses
    const cleaned = phone.replace(/[\s()-]/g, '');
    // Check if it matches E.164 format (+ followed by 1-15 digits)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleaned);
  }
}
