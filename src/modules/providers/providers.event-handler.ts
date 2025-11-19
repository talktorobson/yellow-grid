import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../../common/kafka';

/**
 * Providers Event Handlers
 *
 * Handles Kafka events related to provider actions, particularly
 * provider acceptance/rejection of assignments, triggering scheduling updates.
 */
@Injectable()
export class ProvidersEventHandler {
  private readonly logger = new Logger(ProvidersEventHandler.name);

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

      // TODO: Update assignment status to ACCEPTED
      // await this.assignmentService.markAsAccepted(assignmentId, {
      //   acceptedAt,
      //   acceptedBy: providerId,
      // });

      // Trigger scheduling workflow
      this.logger.log(
        `📅 Triggering scheduling workflow | order: ${orderId} | provider: ${providerId}`,
      );

      // TODO: Create appointment with proposed time slot
      // await this.schedulingService.createAppointment({
      //   orderId,
      //   assignmentId,
      //   providerId,
      //   technicianId,
      //   proposedTimeSlot,
      // });

      // Send notifications
      this.logger.log(
        `📧 Sending acceptance notifications | order: ${orderId}`,
      );

      // TODO: Notify customer about assignment
      // await this.notificationService.notifyCustomerAssigned({
      //   orderId,
      //   providerId,
      //   proposedTimeSlot,
      // });

      // TODO: Notify operator about acceptance
      // await this.notificationService.notifyOperatorAssignmentAccepted({
      //   orderId,
      //   assignmentId,
      //   providerId,
      // });

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

    const {
      assignmentId,
      orderId,
      providerId,
      rejectionReason,
      rejectedAt,
      remainingProviders,
    } = event;

    try {
      // Update assignment status
      this.logger.log(
        `❌ Provider rejected assignment | assignment: ${assignmentId} | provider: ${providerId} | reason: ${rejectionReason}`,
      );

      // TODO: Update assignment with rejection
      // await this.assignmentService.recordRejection(assignmentId, {
      //   providerId,
      //   rejectionReason,
      //   rejectedAt,
      // });

      // Check if we need to find alternative providers
      if (!remainingProviders || remainingProviders.length === 0) {
        this.logger.log(
          `🔄 No remaining providers | order: ${orderId} | Re-triggering assignment process`,
        );

        // TODO: Re-trigger assignment with different criteria or escalate
        // await this.assignmentService.retryAssignment(orderId, {
          //   previousAssignmentId: assignmentId,
        //   excludeProviders: [providerId],
        //   escalate: true,
        // });
      } else {
        this.logger.log(
          `📋 ${remainingProviders.length} provider(s) remaining | order: ${orderId} | Offering to next provider`,
        );

        // TODO: Offer to next provider in the list
        // await this.assignmentService.offerToNextProvider(assignmentId);
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

    const {
      technicianId,
      previousStatus,
      newStatus,
      reason,
      effectiveFrom,
      effectiveUntil,
    } = event;

    try {
      // Update scheduling capacity
      this.logger.log(
        `📊 Updating scheduling capacity | technician: ${technicianId} | status: ${newStatus}`,
      );

      // TODO: Update technician availability in scheduling system
      // await this.schedulingService.updateTechnicianAvailability({
      //   technicianId,
      //   status: newStatus,
      //   effectiveFrom,
      //   effectiveUntil,
      // });

      // If technician becomes unavailable, handle active assignments
      if (newStatus === 'OFFLINE' || newStatus === 'ON_BREAK') {
        this.logger.log(
          `⚠️  Technician unavailable | technician: ${technicianId} | Checking active assignments`,
        );

        // TODO: Check for active assignments and reschedule if necessary
        // await this.assignmentService.handleTechnicianUnavailable(technicianId, {
        //   reason,
        //   effectiveUntil,
        // });
      }

      // If technician becomes available, check for pending assignments
      if (newStatus === 'AVAILABLE') {
        this.logger.log(
          `✅ Technician available | technician: ${technicianId} | Checking for pending assignments`,
        );

        // TODO: Check if there are pending assignments that can be offered
        // await this.assignmentService.offerPendingAssignments(technicianId);
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

    const {
      assignmentId,
      technicianId,
      orderId,
      appointmentId,
      assignmentType,
      skillsMatched,
    } = event;

    try {
      // Update provider workload
      this.logger.log(
        `📊 Updating provider workload | technician: ${technicianId}`,
      );

      // TODO: Update workload tracking
      // await this.providersService.updateWorkload(technicianId, {
      //   assignmentId,
      //   orderId,
      //   action: 'add',
      // });

      // Log skills match for analytics
      if (skillsMatched && skillsMatched.length > 0) {
        this.logger.log(
          `✅ Skills matched | technician: ${technicianId} | skills: ${skillsMatched.join(', ')}`,
        );
      }

      // If assignment type is PRIMARY, trigger scheduling
      if (assignmentType === 'PRIMARY') {
        this.logger.log(
          `📅 Primary assignment | order: ${orderId} | Ensuring scheduling is triggered`,
        );

        // TODO: Ensure scheduling workflow is triggered
        // This might be redundant if handled by assignment.offer.accepted
        // but provides a safety net
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
