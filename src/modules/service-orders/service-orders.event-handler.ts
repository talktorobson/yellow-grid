import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../../common/kafka';
import { AssignmentsService } from './assignments.service';
import { ServiceOrdersService } from './service-orders.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { BookingService } from '../scheduling/booking.service';
import { AssignmentMode, ServiceOrderState } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Service Order Event Handlers
 *
 * Handles Kafka events related to service orders, triggering
 * downstream workflows like assignment, scheduling, and notifications.
 */
@Injectable()
export class ServiceOrdersEventHandler {
  private readonly logger = new Logger(ServiceOrdersEventHandler.name);

  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly notificationsService: NotificationsService,
    private readonly bookingService: BookingService,
    private readonly prisma: PrismaService,
  ) {}

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

        // Find eligible providers for this order and create assignments
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
          where: { id: orderId },
          include: { service: true },
        });

        if (serviceOrder) {
          // Find providers that cover the service order's zone
          const eligibleProviders = await this.prisma.provider.findMany({
            where: {
              countryCode: serviceOrder.countryCode,
              status: 'ACTIVE',
              interventionZones: {
                some: {
                  postalCodes: { has: this.extractPostalCode(serviceOrder.serviceAddress) },
                },
              },
            },
            take: 5,
            orderBy: { createdAt: 'asc' },
          });

          if (eligibleProviders.length > 0) {
            await this.assignmentsService.createAssignments({
              serviceOrderId: orderId,
              providerIds: eligibleProviders.map((p) => p.id),
              mode: AssignmentMode.OFFER,
              executedBy: 'event_handler',
            });
            this.logger.log(
              `Created assignments for ${eligibleProviders.length} providers for order ${orderId}`,
            );
          } else {
            this.logger.warn(`No eligible providers found for order ${orderId}`);
          }
        }
      }

      // Trigger scheduling workflow for scheduled status
      if (newStatus === 'SCHEDULED') {
        this.logger.log(
          `📅 Order scheduled | order: ${orderId} | Triggering scheduling notifications`,
        );

        // Get service order details for notification
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
          where: { id: orderId },
          include: { project: true, assignedProvider: true },
        });

        if (serviceOrder?.project?.customerEmail) {
          await this.notificationsService.sendNotification({
            templateCode: 'SERVICE_SCHEDULED',
            recipientEmail: serviceOrder.project.customerEmail,
            recipientName: serviceOrder.project.customerName || undefined,
            channel: 'EMAIL',
            eventType: 'order.scheduled',
            variables: {
              orderId,
              scheduledDate: serviceOrder.scheduledDate?.toISOString(),
              scheduledStartTime: serviceOrder.scheduledStartTime?.toISOString(),
              scheduledEndTime: serviceOrder.scheduledEndTime?.toISOString(),
              providerName: serviceOrder.assignedProvider?.name,
            },
            contextType: 'SERVICE_ORDER',
            contextId: orderId,
            countryCode: serviceOrder.countryCode,
            businessUnit: serviceOrder.businessUnit,
          });
          this.logger.log(`Sent scheduling confirmation to ${serviceOrder.project.customerEmail}`);
        }
      }

      // Handle cancellation
      if (newStatus === 'CANCELLED') {
        this.logger.log(
          `❌ Order cancelled | order: ${orderId} | Cleaning up assignments and schedules`,
        );

        // Cancel all pending/offered assignments
        const pendingAssignments = await this.prisma.assignment.findMany({
          where: {
            serviceOrderId: orderId,
            state: { in: ['OFFERED', 'PENDING'] },
          },
        });

        for (const assignment of pendingAssignments) {
          await this.assignmentsService.declineAssignment(
            assignment.id,
            'Order cancelled by system',
          );
        }

        // Cancel all active bookings
        const activeBookings = await this.prisma.booking.findMany({
          where: {
            serviceOrderId: orderId,
            status: { in: ['PRE_BOOKED', 'CONFIRMED'] },
          },
        });

        for (const booking of activeBookings) {
          await this.bookingService.cancel({
            bookingId: booking.id,
            reason: 'Order cancelled',
          });
        }

        this.logger.log(
          `Cleaned up ${pendingAssignments.length} assignments and ${activeBookings.length} bookings for cancelled order ${orderId}`,
        );
      }

      this.logger.log(`✅ Successfully processed order.status_changed event | order: ${orderId}`);
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

    const { orderId, orderType, urgency, tenantId } = event;

    try {
      // Perform initial validations
      this.logger.log(`🔍 Validating new order: ${orderId}`);

      // Check for duplicate orders (same customer, same service, same date range)
      const serviceOrder = await this.prisma.serviceOrder.findUnique({
        where: { id: orderId },
        include: { project: true },
      });

      if (serviceOrder) {
        const duplicates = await this.prisma.serviceOrder.findMany({
          where: {
            id: { not: orderId },
            projectId: serviceOrder.projectId,
            serviceId: serviceOrder.serviceId,
            requestedStartDate: serviceOrder.requestedStartDate,
            state: { notIn: [ServiceOrderState.CANCELLED, ServiceOrderState.CLOSED] },
          },
        });

        if (duplicates.length > 0) {
          this.logger.warn(
            `⚠️ Potential duplicate orders detected for order ${orderId}: ${duplicates.map((d) => d.id).join(', ')}`,
          );
        }
      }

      // Route urgent orders differently
      if (urgency === 'URGENT') {
        this.logger.log(`🚨 Urgent order detected | order: ${orderId} | urgency: ${urgency}`);

        // For urgent orders, immediately trigger assignment with direct mode
        if (serviceOrder) {
          const eligibleProviders = await this.prisma.provider.findMany({
            where: {
              countryCode: serviceOrder.countryCode,
              status: 'ACTIVE',
              servicePriorities: {
                some: {
                  priority: 'P1',
                },
              },
            },
            take: 3,
            orderBy: { createdAt: 'asc' },
          });

          if (eligibleProviders.length > 0) {
            await this.assignmentsService.createAssignments({
              serviceOrderId: orderId,
              providerIds: eligibleProviders.map((p) => p.id),
              mode: AssignmentMode.DIRECT,
              executedBy: 'urgent_routing',
            });
            this.logger.log(
              `🚨 Urgent assignment created for ${eligibleProviders.length} P1 providers`,
            );
          }

          // Send urgent notification to operators
          await this.notificationsService.sendNotification({
            templateCode: 'URGENT_ORDER_CREATED',
            recipientEmail: 'operations@yellowgrid.com',
            channel: 'EMAIL',
            eventType: 'order.urgent_created',
            priority: 'URGENT',
            variables: {
              orderId,
              orderType,
              customerName: serviceOrder.project?.customerName,
            },
            contextType: 'SERVICE_ORDER',
            contextId: orderId,
            countryCode: serviceOrder.countryCode,
            businessUnit: serviceOrder.businessUnit,
          });
        }
      }

      this.logger.log(`✅ Successfully processed order.created event | order: ${orderId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process order.created event | order: ${orderId}:`, error);
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
      this.logger.log(`📝 Updating service order with scheduling info | order: ${orderId}`);

      // Update service order with appointment details and transition to SCHEDULED
      await this.prisma.serviceOrder.update({
        where: { id: orderId },
        data: {
          scheduledDate: new Date(scheduledStart),
          scheduledStartTime: new Date(scheduledStart),
          scheduledEndTime: new Date(scheduledEnd),
          state: ServiceOrderState.SCHEDULED,
          stateChangedAt: new Date(),
        },
      });

      // Send confirmation notification to customer
      const serviceOrder = await this.prisma.serviceOrder.findUnique({
        where: { id: orderId },
        include: { project: true, assignedProvider: true },
      });

      if (serviceOrder?.project?.customerEmail) {
        await this.notificationsService.sendNotification({
          templateCode: 'APPOINTMENT_CONFIRMED',
          recipientEmail: serviceOrder.project.customerEmail,
          recipientName: serviceOrder.project.customerName || undefined,
          channel: 'EMAIL',
          eventType: 'appointment.scheduled',
          variables: {
            orderId,
            appointmentId,
            scheduledStart,
            scheduledEnd,
            providerName: serviceOrder.assignedProvider?.name,
          },
          contextType: 'SERVICE_ORDER',
          contextId: orderId,
          countryCode: serviceOrder.countryCode,
          businessUnit: serviceOrder.businessUnit,
        });
      }

      this.logger.log(`✅ Successfully processed appointment.scheduled event | order: ${orderId}`);
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

  /**
   * Extract postal code from service address JSON
   */
  private extractPostalCode(serviceAddress: any): string {
    if (!serviceAddress) return '';
    if (typeof serviceAddress === 'string') {
      try {
        serviceAddress = JSON.parse(serviceAddress);
      } catch {
        return '';
      }
    }
    return serviceAddress?.postalCode || serviceAddress?.zipCode || serviceAddress?.zip || '';
  }
}
