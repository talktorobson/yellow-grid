import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface RecordDateProposalInput {
  assignmentId: string;
  proposedDate: string; // ISO 8601
  proposedBy: 'PROVIDER' | 'CUSTOMER';
  round: number;
}

interface RecordDateProposalOutput {
  negotiationId: string;
  recordedAt: string;
}

@Injectable()
export class RecordDateProposalWorker extends BaseWorker<RecordDateProposalInput, RecordDateProposalOutput> {
  protected readonly logger = new Logger(RecordDateProposalWorker.name);
  readonly taskType = 'record-date-proposal';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<RecordDateProposalInput>): Promise<RecordDateProposalOutput> {
    const { assignmentId, proposedDate, proposedBy, round } = job.variables;

    if (!assignmentId || !proposedDate || !proposedBy || round === undefined) {
      throw new BpmnError('INVALID_INPUT', 'Missing required variables for date proposal');
    }

    this.logger.log(
      `Recording date proposal for assignment ${assignmentId}: ${proposedDate} by ${proposedBy} (Round ${round})`
    );

    // Verify assignment exists
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new BpmnError('ASSIGNMENT_NOT_FOUND', `Assignment ${assignmentId} not found`);
    }

    // Create negotiation record
    const negotiation = await this.prisma.dateNegotiation.create({
      data: {
        assignmentId,
        proposedDate: new Date(proposedDate),
        proposedBy,
        round,
        status: 'PROPOSED',
      },
    });

    // Update assignment round
    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        negotiationRound: round,
      },
    });

    return {
      negotiationId: negotiation.id,
      recordedAt: negotiation.createdAt.toISOString(),
    };
  }
}
