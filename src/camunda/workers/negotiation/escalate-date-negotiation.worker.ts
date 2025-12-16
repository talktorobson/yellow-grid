import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface EscalateNegotiationInput {
    assignmentId: string;
    round?: number;
}

interface EscalateNegotiationOutput {
    taskId: string;
    escalatedAt: string;
}

@Injectable()
export class EscalateDateNegotiationWorker extends BaseWorker<EscalateNegotiationInput, EscalateNegotiationOutput> {
    protected readonly logger = new Logger(EscalateDateNegotiationWorker.name);
    readonly taskType = 'escalate-date-negotiation';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<EscalateNegotiationInput>): Promise<EscalateNegotiationOutput> {
        const { assignmentId, round } = job.variables;

        if (!assignmentId) {
            throw new BpmnError('INVALID_INPUT', 'Missing assignmentId');
        }

        this.logger.log(`Escalating date negotiation for assignment ${assignmentId} (Round ${round})`);

        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { serviceOrder: true },
        });

        if (!assignment) {
            throw new BpmnError('ASSIGNMENT_NOT_FOUND', `Assignment ${assignmentId} not found`);
        }

        // Create a generic UNASSIGNED_JOB task for operator intervention
        const task = await this.prisma.task.create({
            data: {
                taskType: 'UNASSIGNED_JOB', // Using existing enum value
                priority: 'HIGH',
                status: 'OPEN',
                serviceOrderId: assignment.serviceOrderId,
                countryCode: assignment.serviceOrder.countryCode,
                businessUnit: assignment.serviceOrder.businessUnit,
                context: {
                    reason: 'Date Negotiation Failed',
                    assignmentId,
                    lastRound: round,
                    failureType: 'NEGOTIATION_LIMIT_REACHED',
                },
                slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours SLA (HIGH priority)
            },
        });

        return {
            taskId: task.id,
            escalatedAt: task.createdAt.toISOString(),
        };
    }
}
