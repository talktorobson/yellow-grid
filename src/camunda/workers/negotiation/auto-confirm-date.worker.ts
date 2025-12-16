import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface AutoConfirmDateInput {
    assignmentId: string;
}

interface AutoConfirmDateOutput {
    confirmedDate: string;
    confirmedAt: string;
}

@Injectable()
export class AutoConfirmDateWorker extends BaseWorker<AutoConfirmDateInput, AutoConfirmDateOutput> {
    protected readonly logger = new Logger(AutoConfirmDateWorker.name);
    readonly taskType = 'auto-confirm-date';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<AutoConfirmDateInput>): Promise<AutoConfirmDateOutput> {
        const { assignmentId } = job.variables;

        if (!assignmentId) {
            throw new BpmnError('INVALID_INPUT', 'Missing assignmentId');
        }

        // Find last proposal (should be from Provider)
        const lastNegotiation = await this.prisma.dateNegotiation.findFirst({
            where: { assignmentId },
            orderBy: { createdAt: 'desc' },
        });

        if (!lastNegotiation) {
            throw new BpmnError('NO_NEGOTIATION_FOUND', `No negotiation history for assignment ${assignmentId}`);
        }

        if (lastNegotiation.proposedBy !== 'PROVIDER') {
            // This should theoretically not happen if BPMN flow is correct (Customer performs timeout on Provider proposal)
            this.logger.warn(`Auto-confirm triggered but last proposal was from ${lastNegotiation.proposedBy}`);
        }

        const confirmedDate = lastNegotiation.proposedDate;

        this.logger.log(`Auto-confirming date for assignment ${assignmentId}: ${confirmedDate.toISOString()}`);

        // Update assignment
        await this.prisma.assignment.update({
            where: { id: assignmentId },
            data: {
                state: 'ACCEPTED',
                acceptedAt: new Date(),
                proposedDate: confirmedDate,
                rejectionReason: null,
            },
        });

        return {
            confirmedDate: confirmedDate.toISOString(),
            confirmedAt: new Date().toISOString(),
        };
    }
}
