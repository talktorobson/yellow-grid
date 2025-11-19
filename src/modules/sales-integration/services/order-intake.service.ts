import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import {
  OrderIntakeRequestDto,
  OrderIntakeResponseDto,
  OrderIntakeStatus,
  ValidationErrorDto,
} from '../dto';
import {
  IntegrationAdapter,
  IntegrationContext,
  ValidationResult,
  HealthStatus,
} from '../interfaces';
import { KafkaService } from '../../../common/kafka/kafka.service';
import { RedisService } from '../../../common/redis/redis.service';

@Injectable()
export class OrderIntakeService
  implements
    IntegrationAdapter<OrderIntakeRequestDto, OrderIntakeResponseDto>
{
  readonly adapterId = 'sales-order-intake';
  readonly version = '2.1.0';
  private readonly logger = new Logger(OrderIntakeService.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Execute order intake processing
   */
  async execute(
    request: OrderIntakeRequestDto,
    context: IntegrationContext,
  ): Promise<OrderIntakeResponseDto> {
    this.logger.log(
      `Processing order intake for external order: ${request.externalOrderId}`,
    );

    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(request, context);

    // Check if already processed (idempotency)
    const existingResult =
      await this.redisService.get<OrderIntakeResponseDto>(idempotencyKey);
    if (existingResult) {
      this.logger.log(
        `Idempotent request detected for order: ${request.externalOrderId}`,
      );
      return existingResult;
    }

    // Validate request
    const validation = this.validate(request);
    if (!validation.isValid) {
      const response: OrderIntakeResponseDto = {
        orderId: '',
        externalOrderId: request.externalOrderId,
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
      externalOrderId: request.externalOrderId,
      status: OrderIntakeStatus.RECEIVED,
      correlationId: context.correlationId,
      receivedAt: new Date().toISOString(),
    };

    // Store in Redis for idempotency (TTL: 24 hours)
    await this.redisService.setex(
      idempotencyKey,
      24 * 60 * 60,
      JSON.stringify(response),
    );

    this.logger.log(
      `Order intake processed successfully. FSM Order ID: ${orderId}`,
    );

    return response;
  }

  /**
   * Validate order intake request
   */
  validate(request: OrderIntakeRequestDto): ValidationResult {
    const errors: ValidationErrorDto[] = [];

    // Validate required fields
    if (!request.externalOrderId) {
      errors.push({
        field: 'externalOrderId',
        code: 'FIELD_REQUIRED',
        message: 'External order ID is required',
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

    // Validate service items
    if (!request.serviceItems || request.serviceItems.length === 0) {
      errors.push({
        field: 'serviceItems',
        code: 'FIELD_REQUIRED',
        message: 'At least one service item is required',
      });
    }

    // Validate total amount calculation
    if (request.totalAmount) {
      const subtotal = parseFloat(request.totalAmount.subtotal);
      const tax = parseFloat(request.totalAmount.tax);
      const total = parseFloat(request.totalAmount.total);

      if (Math.abs(subtotal + tax - total) > 0.01) {
        errors.push({
          field: 'totalAmount',
          code: 'INVALID_CALCULATION',
          message: 'Total amount does not match subtotal + tax',
        });
      }
    }

    // Validate external references
    if (!request.externalReferences?.salesOrderId) {
      errors.push({
        field: 'externalReferences.salesOrderId',
        code: 'FIELD_REQUIRED',
        message: 'Sales order ID is required in external references',
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
      const kafkaHealthy = await this.kafkaService.ping();
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
      externalOrderId: request.externalOrderId,
      salesSystem: request.salesSystem,
      orderData: request,
    };

    await this.kafkaService.send({
      topic: 'sales.order.intake',
      messages: [
        {
          key: orderId,
          value: JSON.stringify(event),
          headers: {
            'correlation-id': context.correlationId,
            'tenant-id': context.tenantId,
            'event-type': 'OrderIntakeReceived',
          },
        },
      ],
    });

    this.logger.log(
      `Published order intake event to Kafka. Order ID: ${orderId}`,
    );
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(
    request: OrderIntakeRequestDto,
    context: IntegrationContext,
  ): string {
    const key = `order-intake:${request.externalOrderId}:${request.salesSystem}`;
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
