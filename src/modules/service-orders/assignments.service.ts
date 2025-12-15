import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AssignmentMode, AssignmentState, ServiceOrderState } from '@prisma/client';
import { OfferAcceptedEvent, OfferRejectedEvent } from './events';

export interface CreateAssignmentInput {
  serviceOrderId: string;
  providerIds: string[];
  workTeamId?: string;
  mode: AssignmentMode;
  requestedDate?: Date;
  requestedSlot?: string;
  executedBy?: string;
  funnelExecutionId?: string;
  providerScores?: Record<string, { score: number; scoreBreakdown: any }>;
}

/**
 * Service for managing assignments of service orders to providers.
 *
 * Handles creation, acceptance, decline, and retrieval of assignments.
 */
@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates assignments for a service order.
   *
   * @param input - The assignment creation data.
   * @returns {Promise<Assignment[]>} The created assignments.
   * @throws {BadRequestException} If providerIds are missing.
   * @throws {NotFoundException} If the service order is not found.
   */
  async createAssignments(input: CreateAssignmentInput) {
    const {
      serviceOrderId,
      providerIds,
      workTeamId,
      mode,
      // requestedDate and requestedSlot reserved for future scheduling logic
      executedBy = 'system',
      funnelExecutionId,
      providerScores,
    } = input;

    if (!providerIds.length) {
      throw new BadRequestException('At least one providerId is required');
    }

    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
    });
    if (!serviceOrder) {
      throw new NotFoundException('Service order not found');
    }

    const autoAcceptCountries = ['ES', 'IT'];
    const isAutoAcceptMode =
      mode === AssignmentMode.AUTO_ACCEPT || autoAcceptCountries.includes(serviceOrder.countryCode);

    const assignments = [];
    for (const [index, providerId] of providerIds.entries()) {
      const scoreData = providerScores?.[providerId];
      const assignment = await this.prisma.assignment.create({
        data: {
          serviceOrderId,
          providerId,
          workTeamId,
          assignmentMode: mode,
          assignmentMethod: mode,
          providerRank: index + 1,
          funnelExecutionId: funnelExecutionId ?? null,
          providerScore: scoreData?.score ?? null,
          scoreBreakdown: scoreData?.scoreBreakdown ?? null,
          state:
            isAutoAcceptMode || mode === AssignmentMode.DIRECT
              ? AssignmentState.ACCEPTED
              : AssignmentState.OFFERED,
          acceptedAt: isAutoAcceptMode || mode === AssignmentMode.DIRECT ? new Date() : null,
          stateChangedAt: new Date(),
        },
      });
      assignments.push(assignment);
    }

    // Update service order state for accepted/direct/auto-accept flows
    if (isAutoAcceptMode || mode === AssignmentMode.DIRECT) {
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          assignedProviderId: providerIds[0],
          assignedWorkTeamId: workTeamId,
          state: ServiceOrderState.ACCEPTED,
          stateChangedAt: new Date(),
        },
      });
    } else {
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          assignedProviderId: providerIds[0],
          assignedWorkTeamId: workTeamId,
          state: ServiceOrderState.ASSIGNED,
          stateChangedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Created ${assignments.length} assignment(s) for service order ${serviceOrderId} with mode ${mode} by ${executedBy}`,
    );

    return assignments;
  }

  /**
   * Accepts an assignment.
   *
   * @param assignmentId - The assignment ID.
   * @returns {Promise<Assignment>} The updated assignment.
   * @throws {NotFoundException} If the assignment is not found.
   */
  async acceptAssignment(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        state: AssignmentState.ACCEPTED,
        acceptedAt: new Date(),
        stateChangedAt: new Date(),
      },
    });

    await this.prisma.serviceOrder.update({
      where: { id: assignment.serviceOrderId },
      data: {
        assignedProviderId: assignment.providerId,
        assignedWorkTeamId: assignment.workTeamId,
        state: ServiceOrderState.ACCEPTED,
        stateChangedAt: new Date(),
      },
    });

    // Emit event for workflow orchestration
    this.eventEmitter.emit(
      OfferAcceptedEvent.eventName,
      new OfferAcceptedEvent(
        assignment.serviceOrderId,
        assignmentId, // offerId = assignmentId
        assignment.providerId,
        assignment.workTeamId || '',
      ),
    );

    return updated;
  }

  /**
   * Declines an assignment.
   *
   * @param assignmentId - The assignment ID.
   * @param reason - The reason for declining.
   * @returns {Promise<Assignment>} The updated assignment.
   * @throws {NotFoundException} If the assignment is not found.
   */
  async declineAssignment(assignmentId: string, reason?: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        state: AssignmentState.DECLINED,
        rejectedAt: new Date(),
        rejectionReason: reason,
        stateChangedAt: new Date(),
      },
    });

    // Emit event for workflow orchestration
    this.eventEmitter.emit(
      OfferRejectedEvent.eventName,
      new OfferRejectedEvent(
        assignment.serviceOrderId,
        assignmentId, // offerId = assignmentId
        assignment.providerId,
        reason,
      ),
    );

    return updated;
  }

  /**
   * Retrieves the funnel execution details for an assignment.
   *
   * @param assignmentId - The assignment ID.
   * @returns {Promise<AssignmentFunnelExecution>} The funnel execution data.
   * @throws {NotFoundException} If the assignment or funnel data is not found.
   */
  async getAssignmentFunnel(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { funnelExecutionId: true, serviceOrderId: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (!assignment.funnelExecutionId) {
      throw new NotFoundException('No funnel execution data available for this assignment');
    }

    const funnelExecution = await this.prisma.assignmentFunnelExecution.findUnique({
      where: { id: assignment.funnelExecutionId },
    });

    if (!funnelExecution) {
      throw new NotFoundException('Funnel execution not found');
    }

    return funnelExecution;
  }

  /**
   * Bulk creates assignments for multiple service orders.
   *
   * @param input - The bulk assignment input.
   * @returns {Promise<{serviceOrderId: string, success: boolean, assignments?: any[], error?: string}[]>} The results of the bulk operation.
   */
  async bulkCreateAssignments(input: {
    serviceOrderIds: string[];
    providerId: string;
    mode: AssignmentMode;
    executedBy?: string;
  }) {
    const { serviceOrderIds, providerId, mode, executedBy } = input;
    const results = [];

    for (const serviceOrderId of serviceOrderIds) {
      try {
        const assignments = await this.createAssignments({
          serviceOrderId,
          providerIds: [providerId],
          mode,
          executedBy,
        });
        results.push({ serviceOrderId, success: true, assignments });
      } catch (error) {
        this.logger.error(`Failed to assign service order ${serviceOrderId}: ${error.message}`);
        results.push({ serviceOrderId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Retrieves assignments with pagination and filtering.
   *
   * @param params - The filtering and pagination parameters.
   * @returns {Promise<{data: Assignment[], pagination: any}>} A paginated list of assignments.
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    status?: AssignmentState;
    mode?: AssignmentMode;
  }) {
    const { page = 1, limit = 20, status, mode } = params;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.state = status;
    if (mode) where.assignmentMode = mode;

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          serviceOrder: true,
          provider: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
