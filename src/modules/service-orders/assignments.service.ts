import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AssignmentMode, AssignmentState, ServiceOrderState } from '@prisma/client';

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

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAssignments(input: CreateAssignmentInput) {
    const {
      serviceOrderId,
      providerIds,
      workTeamId,
      mode,
      requestedDate,
      requestedSlot,
      executedBy = 'system',
      funnelExecutionId,
      providerScores,
    } = input;

    if (!providerIds.length) {
      throw new BadRequestException('At least one providerId is required');
    }

    const serviceOrder = await this.prisma.serviceOrder.findUnique({ where: { id: serviceOrderId } });
    if (!serviceOrder) {
      throw new NotFoundException('Service order not found');
    }

    const autoAcceptCountries = ['ES', 'IT'];
    const isAutoAcceptMode = mode === AssignmentMode.AUTO_ACCEPT || autoAcceptCountries.includes(serviceOrder.countryCode);

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
          state: isAutoAcceptMode || mode === AssignmentMode.DIRECT ? AssignmentState.ACCEPTED : AssignmentState.OFFERED,
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

    return updated;
  }

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

    return updated;
  }

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
}
