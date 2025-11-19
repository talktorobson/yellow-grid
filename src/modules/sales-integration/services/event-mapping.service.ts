import { Injectable, Logger } from '@nestjs/common';
import { KafkaService } from '../../../common/kafka/kafka.service';
import {
  OrderIntakeRequestDto,
  SalesSystem,
  OrderType,
  Priority,
} from '../dto';

export interface FSMServiceOrderCreatedEvent {
  eventId: string;
  eventType: 'SERVICE_ORDER_CREATED';
  timestamp: string;
  correlationId: string;
  serviceOrderId: string;
  projectId?: string;
  customerId: string;
  orderType: string;
  priority: string;
  status: string;
  externalReferences: {
    salesOrderId: string;
    projectId?: string;
    leadId?: string;
    systemSource: string;
  };
  schedulingWindow: {
    startDate: string;
    endDate: string;
    preferredDate?: string;
  };
  requiredSkills: string[];
  estimatedDuration?: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class EventMappingService {
  private readonly logger = new Logger(EventMappingService.name);

  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * Map external sales system event to FSM internal event
   */
  async mapOrderIntakeToServiceOrderCreated(
    externalOrderId: string,
    salesSystem: SalesSystem,
    orderData: OrderIntakeRequestDto,
    fsmOrderId: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.log(
      `Mapping external order ${externalOrderId} to FSM service order ${fsmOrderId}`,
    );

    // Create FSM service order created event
    const fsmEvent: FSMServiceOrderCreatedEvent = {
      eventId: this.generateEventId(),
      eventType: 'SERVICE_ORDER_CREATED',
      timestamp: new Date().toISOString(),
      correlationId,
      serviceOrderId: fsmOrderId,
      customerId: orderData.customer.customerId,
      orderType: this.mapOrderType(orderData.orderType),
      priority: this.mapPriority(orderData.priority),
      status: 'CREATED',
      externalReferences: {
        salesOrderId: orderData.externalReferences.salesOrderId,
        projectId: orderData.externalReferences.projectId,
        leadId: orderData.externalReferences.leadId,
        systemSource: salesSystem,
      },
      schedulingWindow: {
        startDate:
          orderData.schedulingPreferences?.preferredDate ||
          new Date().toISOString(),
        endDate: this.calculateEndDate(
          orderData.schedulingPreferences?.preferredDate,
        ),
        preferredDate: orderData.schedulingPreferences?.preferredDate,
      },
      requiredSkills: orderData.requiredSkills || [],
      estimatedDuration: orderData.estimatedDuration,
      metadata: {
        salesSystem,
        externalOrderId,
        serviceItems: orderData.serviceItems,
        totalAmount: orderData.totalAmount,
        ...orderData.metadata,
      },
    };

    // Publish to Kafka
    await this.kafkaService.send({
      topic: 'fsm.service_order.created',
      messages: [
        {
          key: fsmOrderId,
          value: JSON.stringify(fsmEvent),
          headers: {
            'correlation-id': correlationId,
            'event-type': 'SERVICE_ORDER_CREATED',
            'source-system': salesSystem,
          },
        },
      ],
    });

    this.logger.log(
      `Successfully mapped and published SERVICE_ORDER_CREATED event for ${fsmOrderId}`,
    );
  }

  /**
   * Map status update from FSM to sales system event
   */
  async mapServiceOrderStatusToSalesSystemEvent(
    serviceOrderId: string,
    externalOrderId: string,
    salesSystem: SalesSystem,
    previousStatus: string,
    newStatus: string,
    correlationId: string,
  ): Promise<void> {
    this.logger.log(
      `Mapping service order status change: ${previousStatus} -> ${newStatus}`,
    );

    const salesEvent = {
      eventId: this.generateEventId(),
      eventType: 'SERVICE_ORDER_STATUS_UPDATED',
      timestamp: new Date().toISOString(),
      correlationId,
      fsmServiceOrderId: serviceOrderId,
      externalOrderId,
      salesSystem,
      previousStatus,
      newStatus,
      mappedStatus: this.mapFSMStatusToSalesSystemStatus(newStatus),
    };

    // Publish to Kafka topic for sales system integration
    await this.kafkaService.send({
      topic: `sales.${salesSystem.toLowerCase()}.status_update`,
      messages: [
        {
          key: externalOrderId,
          value: JSON.stringify(salesEvent),
          headers: {
            'correlation-id': correlationId,
            'event-type': 'SERVICE_ORDER_STATUS_UPDATED',
            'target-system': salesSystem,
          },
        },
      ],
    });

    this.logger.log(
      `Successfully published status update event to sales system ${salesSystem}`,
    );
  }

  /**
   * Map order type from sales system to FSM
   */
  private mapOrderType(orderType: OrderType): string {
    const mapping: Record<OrderType, string> = {
      [OrderType.INSTALLATION]: 'INSTALLATION',
      [OrderType.REPAIR]: 'REPAIR',
      [OrderType.MAINTENANCE]: 'MAINTENANCE',
      [OrderType.UPGRADE]: 'UPGRADE',
      [OrderType.TV]: 'TECHNICAL_VISIT',
      [OrderType.QUOTATION]: 'QUOTATION',
    };
    return mapping[orderType] || orderType;
  }

  /**
   * Map priority from sales system to FSM
   */
  private mapPriority(priority: Priority): string {
    const mapping: Record<Priority, string> = {
      [Priority.LOW]: 'P2',
      [Priority.MEDIUM]: 'P2',
      [Priority.HIGH]: 'P1',
      [Priority.URGENT]: 'P1',
      [Priority.EMERGENCY]: 'P1',
    };
    return mapping[priority] || 'P2';
  }

  /**
   * Map FSM status to sales system status
   */
  private mapFSMStatusToSalesSystemStatus(fsmStatus: string): string {
    const mapping: Record<string, string> = {
      CREATED: 'RECEIVED',
      SCHEDULED: 'SCHEDULED',
      ASSIGNED: 'ASSIGNED',
      DISPATCHED: 'IN_TRANSIT',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      VERIFIED: 'VERIFIED',
      CANCELLED: 'CANCELLED',
      ON_HOLD: 'ON_HOLD',
    };
    return mapping[fsmStatus] || fsmStatus;
  }

  /**
   * Calculate end date based on preferred date (default: +30 days)
   */
  private calculateEndDate(preferredDate?: string): string {
    const startDate = preferredDate ? new Date(preferredDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30-day window
    return endDate.toISOString();
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `evt-${timestamp}-${random}`;
  }
}
