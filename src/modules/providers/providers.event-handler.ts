import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../../common/kafka';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import { AssignmentState, ServiceOrderState, BookingStatus } from '@prisma/client';

/**
 * Providers Event Handlers
 *
 * Handles Kafka events related to provider actions, particularly
 * provider acceptance/rejection of assignments, triggering scheduling updates.
 */
@Injectable()
export class ProvidersEventHandler {
  private readonly logger = new Logger(ProvidersEventHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Handle provider assignment acceptance
   *
   * Workflow: Provider acceptance → trigger scheduling workflow
   *
   * When a provider accepts an assignment offer, we need to:
   * 1. Update assignment status
   * 2. Trigger scheduling to create appointment
   * 3. Send notifications to customer and operator
   */
  @EventHandler({
    eventName: 'assignment.offer.accepted',
    topics: ['fsm.assignments'],
    groupId: 'providers-assignment-acceptance-handler',
  })
  async handleAssignmentOfferAccepted(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received assignment.offer.accepted event | assignment: ${event.assignmentId} | provider: ${event.providerId}`,
    );

    const {
      assignmentId,
      orderId,
      providerId,
      technicianId,
      acceptedAt,
      proposedTimeSlot,
      tenantId,
    } = event;

    try {
      // Update assignment status
      this.logger.log(
        `✅ Provider accepted assignment | assignment: ${assignmentId} | provider: ${providerId}`,
      );

      // Update assignment status to ACCEPTED
      await this.prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          state: AssignmentState.ACCEPTED,
          acceptedAt: new Date(acceptedAt),
          stateChangedAt: new Date(),
        },
      });

      // Update service order state to ACCEPTED
      await this.prisma.serviceOrder.update({
        where: { id: orderId },
        data: {
          assignedProviderId: providerId,
          assignedWorkTeamId: technicianId,
          state: ServiceOrderState.ACCEPTED,
          stateChangedAt: new Date(),
        },
      });

      // Trigger scheduling workflow
      this.logger.log(
        `📅 Triggering scheduling workflow | order: ${orderId} | provider: ${providerId}`,
      );

      // Create booking with proposed time slot if provided
      if (proposedTimeSlot) {
        const slotDate = new Date(proposedTimeSlot.date || proposedTimeSlot.start);
        const bookingDate = slotDate.toISOString().split('T')[0];

        // Find or get the first work team for this provider
        const workTeam = await this.prisma.workTeam.findFirst({
          where: { providerId },
        });

        if (workTeam) {
          await this.prisma.booking.create({
            data: {
              serviceOrderId: orderId,
              providerId,
              workTeamId: workTeam.id,
              bookingDate: slotDate,
              startSlot: proposedTimeSlot.startSlot || 32, // Default 8am
              endSlot: proposedTimeSlot.endSlot || 40, // Default 10am
              durationMinutes: proposedTimeSlot.durationMinutes || 120,
              bookingType: 'SERVICE_ORDER',
              status: BookingStatus.CONFIRMED,
              confirmedAt: new Date(),
            },
          });
          this.logger.log(`📅 Booking created for order ${orderId}`);
        }
      }

      // Send notifications
      this.logger.log(`📧 Sending acceptance notifications | order: ${orderId}`);

      // Get service order details for notifications
      const serviceOrder = await this.prisma.serviceOrder.findUnique({
        where: { id: orderId },
        include: { project: true, assignedProvider: true },
      });

      // Notify customer about assignment via Kafka
      await this.kafkaProducer.send('notifications.assignment.accepted', {
        eventType: 'ASSIGNMENT_ACCEPTED',
        orderId,
        assignmentId,
        providerId,
        providerName: serviceOrder?.assignedProvider?.name,
        customerEmail: serviceOrder?.project?.customerEmail,
        customerName: serviceOrder?.project?.customerName,
        proposedTimeSlot,
        acceptedAt: new Date().toISOString(),
      });

      // Notify operator about acceptance via Kafka
      await this.kafkaProducer.send('notifications.operator.assignment_accepted', {
        eventType: 'OPERATOR_ASSIGNMENT_ACCEPTED',
        orderId,
        assignmentId,
        providerId,
        providerName: serviceOrder?.assignedProvider?.name,
        acceptedAt: new Date().toISOString(),
      });

      this.logger.log(
        `✅ Successfully processed assignment acceptance | assignment: ${assignmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process assignment acceptance | assignment: ${assignmentId}:`,
        error,
      );
      throw error; // Re-throw to trigger DLQ
    }
  }

  /**
   * Handle provider assignment rejection
   *
   * Workflow: Provider rejection → re-trigger assignment process
   *
   * When a provider rejects an assignment, we need to find alternative providers.
   */
  @EventHandler({
    eventName: 'assignment.offer.rejected',
    topics: ['fsm.assignments'],
    groupId: 'providers-assignment-rejection-handler',
  })
  async handleAssignmentOfferRejected(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received assignment.offer.rejected event | assignment: ${event.assignmentId} | provider: ${event.providerId}`,
    );

    const { assignmentId, orderId, providerId, rejectionReason, rejectedAt, remainingProviders } =
      event;

    try {
      // Update assignment status
      this.logger.log(
        `❌ Provider rejected assignment | assignment: ${assignmentId} | provider: ${providerId} | reason: ${rejectionReason}`,
      );

      // Update assignment with rejection
      await this.prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          state: AssignmentState.DECLINED,
          rejectedAt: new Date(rejectedAt),
          rejectionReason,
          stateChangedAt: new Date(),
        },
      });

      // Check if we need to find alternative providers
      if (!remainingProviders || remainingProviders.length === 0) {
        this.logger.log(
          `🔄 No remaining providers | order: ${orderId} | Re-triggering assignment process`,
        );

        // Get the service order to find new providers
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
          where: { id: orderId },
        });

        if (serviceOrder) {
          // Get all previously rejected provider IDs for this order
          const rejectedAssignments = await this.prisma.assignment.findMany({
            where: {
              serviceOrderId: orderId,
              state: AssignmentState.DECLINED,
            },
            select: { providerId: true },
          });
          const excludedProviderIds = rejectedAssignments.map((a) => a.providerId);

          // Find new providers excluding rejected ones
          const newProviders = await this.prisma.provider.findMany({
            where: {
              countryCode: serviceOrder.countryCode,
              status: 'ACTIVE',
              id: { notIn: excludedProviderIds },
            },
            take: 3,
            orderBy: { createdAt: 'asc' },
          });

          if (newProviders.length > 0) {
            // Create new assignments for these providers
            for (const provider of newProviders) {
              await this.prisma.assignment.create({
                data: {
                  serviceOrderId: orderId,
                  providerId: provider.id,
                  assignmentMode: 'OFFER',
                  assignmentMethod: 'OFFER',
                  state: AssignmentState.OFFERED,
                  stateChangedAt: new Date(),
                },
              });
            }
            this.logger.log(
              `Created new assignments for ${newProviders.length} providers for order ${orderId}`,
            );
          } else {
            // Escalate - no more providers available
            this.logger.warn(
              `⚠️ No more providers available for order ${orderId}. Creating escalation task.`,
            );

            await this.prisma.task.create({
              data: {
                taskType: 'ASSIGNMENT_ESCALATION',
                priority: 'HIGH',
                status: 'OPEN',
                serviceOrderId: orderId,
                context: {
                  reason: 'All providers rejected assignment',
                  rejectedProviderCount: excludedProviderIds.length,
                  lastRejectionReason: rejectionReason,
                },
                slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
                countryCode: serviceOrder.countryCode,
                businessUnit: serviceOrder.businessUnit,
              },
            });
          }
        }
      } else {
        this.logger.log(
          `📋 ${remainingProviders.length} provider(s) remaining | order: ${orderId} | Offering to next provider`,
        );

        // Offer to next provider in the list
        const nextProviderId = remainingProviders[0];
        await this.prisma.assignment.create({
          data: {
            serviceOrderId: orderId,
            providerId: nextProviderId,
            assignmentMode: 'OFFER',
            assignmentMethod: 'OFFER',
            state: AssignmentState.OFFERED,
            stateChangedAt: new Date(),
          },
        });

        // Send notification to next provider
        await this.kafkaProducer.send('notifications.provider.offer', {
          eventType: 'ASSIGNMENT_OFFER',
          orderId,
          providerId: nextProviderId,
          offerExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        });
      }

      this.logger.log(
        `✅ Successfully processed assignment rejection | assignment: ${assignmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process assignment rejection | assignment: ${assignmentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle provider availability changes
   *
   * Workflow: Provider availability changed → update scheduling capacity
   */
  @EventHandler({
    eventName: 'technician.availability_changed',
    topics: ['fsm.assignments'],
    groupId: 'providers-availability-handler',
  })
  async handleTechnicianAvailabilityChanged(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received technician.availability_changed event | technician: ${event.technicianId} | status: ${event.previousStatus} → ${event.newStatus}`,
    );

    const { technicianId, previousStatus, newStatus, reason, effectiveFrom, effectiveUntil } =
      event;

    try {
      // Update scheduling capacity
      this.logger.log(
        `📊 Updating scheduling capacity | technician: ${technicianId} | status: ${newStatus}`,
      );

      // Update work team status in database
      await this.prisma.workTeam.updateMany({
        where: { id: technicianId },
        data: {
          status: newStatus === 'AVAILABLE' ? 'ACTIVE' : 'INACTIVE',
        },
      });

      // Record absence if technician goes offline for extended period
      if ((newStatus === 'OFFLINE' || newStatus === 'ON_BREAK') && effectiveUntil) {
        const workTeam = await this.prisma.workTeam.findUnique({
          where: { id: technicianId },
          include: { calendar: true },
        });

        if (workTeam?.calendar) {
          await this.prisma.plannedAbsence.create({
            data: {
              calendarId: workTeam.calendar.id,
              startDate: new Date(effectiveFrom),
              endDate: new Date(effectiveUntil),
              absenceType: reason === 'SICK' ? 'SICK_LEAVE' : 'OTHER',
              reason,
              status: 'APPROVED',
            },
          });
        }
      }

      // If technician becomes unavailable, handle active assignments
      if (newStatus === 'OFFLINE' || newStatus === 'ON_BREAK') {
        this.logger.log(
          `⚠️  Technician unavailable | technician: ${technicianId} | Checking active assignments`,
        );

        // Find active service orders assigned to this technician
        const activeOrders = await this.prisma.serviceOrder.findMany({
          where: {
            assignedWorkTeamId: technicianId,
            state: { in: [ServiceOrderState.SCHEDULED, ServiceOrderState.ASSIGNED] },
            scheduledDate: { gte: new Date() },
          },
        });

        if (activeOrders.length > 0) {
          this.logger.warn(
            `Found ${activeOrders.length} active orders for unavailable technician ${technicianId}`,
          );

          // Create tasks for reassignment
          for (const order of activeOrders) {
            await this.prisma.task.create({
              data: {
                taskType: 'REASSIGNMENT_REQUIRED',
                priority: 'HIGH',
                status: 'OPEN',
                serviceOrderId: order.id,
                context: {
                  reason: `Technician ${technicianId} became unavailable: ${reason}`,
                  previousTechnicianId: technicianId,
                  unavailableUntil: effectiveUntil,
                },
                slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
                countryCode: order.countryCode,
                businessUnit: order.businessUnit,
              },
            });
          }
        }
      }

      // If technician becomes available, check for pending assignments
      if (newStatus === 'AVAILABLE') {
        this.logger.log(
          `✅ Technician available | technician: ${technicianId} | Checking for pending assignments`,
        );

        // Get the work team's provider
        const workTeam = await this.prisma.workTeam.findUnique({
          where: { id: technicianId },
          include: { provider: true },
        });

        if (workTeam) {
          // Find pending assignments for this provider
          const pendingAssignments = await this.prisma.assignment.findMany({
            where: {
              providerId: workTeam.providerId,
              state: AssignmentState.OFFERED,
            },
            include: { serviceOrder: true },
            take: 5,
          });

          if (pendingAssignments.length > 0) {
            this.logger.log(
              `Found ${pendingAssignments.length} pending assignments for provider ${workTeam.providerId}`,
            );

            // Send notification about available assignments
            await this.kafkaProducer.send('notifications.technician.assignments_available', {
              eventType: 'ASSIGNMENTS_AVAILABLE',
              technicianId,
              providerId: workTeam.providerId,
              pendingCount: pendingAssignments.length,
              assignmentIds: pendingAssignments.map((a) => a.id),
            });
          }
        }
      }

      this.logger.log(
        `✅ Successfully processed availability change | technician: ${technicianId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process availability change | technician: ${technicianId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle technician assignment event
   *
   * Workflow: Technician assigned → update provider workload, trigger scheduling
   */
  @EventHandler({
    eventName: 'technician.assigned',
    topics: ['fsm.assignments'],
    groupId: 'providers-technician-assignment-handler',
  })
  async handleTechnicianAssigned(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received technician.assigned event | assignment: ${event.assignmentId} | technician: ${event.technicianId}`,
    );

    const { assignmentId, technicianId, orderId, appointmentId, assignmentType, skillsMatched } =
      event;

    try {
      // Update provider workload
      this.logger.log(`📊 Updating provider workload | technician: ${technicianId}`);

      // Get current workload for the technician's work team
      const workTeam = await this.prisma.workTeam.findUnique({
        where: { id: technicianId },
        include: { provider: true },
      });

      if (workTeam) {
        // Count current active assignments
        const activeAssignments = await this.prisma.assignment.count({
          where: {
            workTeamId: technicianId,
            state: { in: [AssignmentState.ACCEPTED, AssignmentState.OFFERED] },
          },
        });

        // Update workload metrics (can be extended to update provider metrics table)
        this.logger.log(
          `Technician ${technicianId} now has ${activeAssignments + 1} active assignments`,
        );

        // Emit workload update event for analytics/dashboards
        await this.kafkaProducer.send('providers.workload.updated', {
          eventType: 'WORKLOAD_UPDATED',
          technicianId,
          providerId: workTeam.providerId,
          activeAssignments: activeAssignments + 1,
          newAssignmentId: assignmentId,
          orderId,
          updatedAt: new Date().toISOString(),
        });
      }

      // Log skills match for analytics
      if (skillsMatched && skillsMatched.length > 0) {
        this.logger.log(
          `✅ Skills matched | technician: ${technicianId} | skills: ${skillsMatched.join(', ')}`,
        );

        // Record skills match for analytics
        await this.kafkaProducer.send('analytics.skills.matched', {
          eventType: 'SKILLS_MATCHED',
          technicianId,
          orderId,
          assignmentId,
          skillsMatched,
          matchedAt: new Date().toISOString(),
        });
      }

      // If assignment type is PRIMARY, ensure scheduling is triggered
      if (assignmentType === 'PRIMARY') {
        this.logger.log(
          `📅 Primary assignment | order: ${orderId} | Ensuring scheduling is triggered`,
        );

        // Verify service order has scheduling info, if not create a task
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
          where: { id: orderId },
        });

        if (serviceOrder && !serviceOrder.scheduledDate) {
          // Create a scheduling task if not already scheduled
          const existingTask = await this.prisma.task.findFirst({
            where: {
              serviceOrderId: orderId,
              taskType: 'SCHEDULE_APPOINTMENT',
              status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
            },
          });

          if (!existingTask) {
            await this.prisma.task.create({
              data: {
                taskType: 'SCHEDULE_APPOINTMENT',
                priority: 'MEDIUM',
                status: 'OPEN',
                serviceOrderId: orderId,
                context: {
                  technicianId,
                  assignmentId,
                  reason: 'Primary assignment made, appointment scheduling required',
                },
                slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                countryCode: serviceOrder.countryCode,
                businessUnit: serviceOrder.businessUnit,
              },
            });
            this.logger.log(`Created scheduling task for order ${orderId}`);
          }
        }
      }

      this.logger.log(
        `✅ Successfully processed technician assignment | assignment: ${assignmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process technician assignment | assignment: ${assignmentId}:`,
        error,
      );
      throw error;
    }
  }
}
