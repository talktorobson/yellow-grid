import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../../common/kafka';

/**
 * Service Order Event Handlers
 *
 * Handles Kafka events related to service orders, triggering
 * downstream workflows like assignment, scheduling, and notifications.
 */
@Injectable()
export class ServiceOrdersEventHandler {
  private readonly logger = new Logger(ServiceOrdersEventHandler.name);

  /**
   * Handle service order status changes
   *
   * Workflow: Service order status changes → trigger assignment process
   *
   * When a service order transitions to certain statuses (e.g., CREATED, VALIDATED),
   * we need to trigger the assignment process to find suitable providers.
   */
  @EventHandler({
    eventName: 'order.status_changed',
    topics: ['fsm.projects'],
    groupId: 'service-orders-status-handler',
  })
  async handleOrderStatusChanged(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received order.status_changed event | order: ${event.orderId} | status: ${event.previousStatus} → ${event.newStatus}`,
    );

    const { orderId, newStatus, previousStatus, tenantId, correlationId } = event;

    try {
      // Trigger assignment workflow for applicable statuses
      if (this.shouldTriggerAssignment(newStatus)) {
        this.logger.log(
          `🎯 Triggering assignment workflow for order: ${orderId} | status: ${newStatus}`,
        );

        // TODO: Call assignment service to initiate provider matching
        // await this.assignmentService.initiateAssignment(orderId, {
        //   correlationId,
        //   triggeredBy: 'order_status_change',
        // });
      }

      // Trigger scheduling workflow for scheduled status
      if (newStatus === 'SCHEDULED') {
        this.logger.log(
          `📅 Order scheduled | order: ${orderId} | Triggering scheduling notifications`,
        );

        // TODO: Call notification service to send scheduling confirmations
        // await this.notificationService.sendSchedulingConfirmation(orderId);
      }

      // Handle cancellation
      if (newStatus === 'CANCELLED') {
        this.logger.log(
          `❌ Order cancelled | order: ${orderId} | Cleaning up assignments and schedules`,
        );

        // TODO: Clean up assignments and schedules
        // await this.assignmentService.cancelAssignments(orderId);
        // await this.schedulingService.cancelSchedules(orderId);
      }

      this.logger.log(
        `✅ Successfully processed order.status_changed event | order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process order.status_changed event | order: ${orderId}:`,
        error,
      );
      throw error; // Re-throw to trigger DLQ
    }
  }

  /**
   * Handle order created events
   *
   * Workflow: Order created → initial validation and routing
   */
  @EventHandler({
    eventName: 'order.created',
    topics: ['fsm.projects'],
    groupId: 'service-orders-creation-handler',
  })
  async handleOrderCreated(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received order.created event | order: ${event.orderId} | type: ${event.orderType}`,
    );

    const { orderId, orderType, priority, tenantId } = event;

    try {
      // Perform initial validations
      this.logger.log(`🔍 Validating new order: ${orderId}`);

      // TODO: Validate order data, check for duplicates, etc.
      // await this.serviceOrdersService.validateOrder(orderId);

      // Route high-priority orders differently
      if (priority === 'URGENT' || priority === 'EMERGENCY') {
        this.logger.log(
          `🚨 High-priority order detected | order: ${orderId} | priority: ${priority}`,
        );

        // TODO: Trigger priority routing
        // await this.assignmentService.initiateUrgentAssignment(orderId);
      }

      this.logger.log(
        `✅ Successfully processed order.created event | order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process order.created event | order: ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle appointment scheduled events
   *
   * Workflow: Appointment scheduled → update service order, send notifications
   */
  @EventHandler({
    eventName: 'appointment.scheduled',
    topics: ['fsm.scheduling'],
    groupId: 'service-orders-appointment-handler',
  })
  async handleAppointmentScheduled(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received appointment.scheduled event | appointment: ${event.appointmentId} | order: ${event.orderId}`,
    );

    const { appointmentId, orderId, scheduledStart, scheduledEnd, technicianId } = event;

    try {
      // Update service order with scheduling information
      this.logger.log(
        `📝 Updating service order with scheduling info | order: ${orderId}`,
      );

      // TODO: Update service order status to SCHEDULED
      // await this.serviceOrdersService.updateSchedulingInfo(orderId, {
      //   appointmentId,
      //   scheduledStart,
      //   scheduledEnd,
      //   technicianId,
      // });

      this.logger.log(
        `✅ Successfully processed appointment.scheduled event | order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process appointment.scheduled event | order: ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Determine if a status change should trigger assignment workflow
   */
  private shouldTriggerAssignment(status: string): boolean {
    const assignmentTriggerStatuses = [
      'CREATED',
      'APPROVED',
      'PENDING_ASSIGNMENT',
      'REASSIGNMENT_REQUIRED',
    ];

    return assignmentTriggerStatuses.includes(status);
  }
}
