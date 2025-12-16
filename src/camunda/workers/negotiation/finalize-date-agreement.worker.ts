import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface FinalizeDateAgreementInput {
    assignmentId: string;
}

interface FinalizeDateAgreementOutput {
    agreedDate: string;
    finalizedAt: string;
}

@Injectable()
export class FinalizeDateAgreementWorker extends BaseWorker<FinalizeDateAgreementInput, FinalizeDateAgreementOutput> {
    protected readonly logger = new Logger(FinalizeDateAgreementWorker.name);
    readonly taskType = 'finalize-date-agreement';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<FinalizeDateAgreementInput>): Promise<FinalizeDateAgreementOutput> {
        const { assignmentId } = job.variables;

        if (!assignmentId) {
            throw new BpmnError('INVALID_INPUT', 'Missing assignmentId');
        }

        // Get the last negotiation round (which contains the agreed date)
        const lastNegotiation = await this.prisma.dateNegotiation.findFirst({
            where: { assignmentId },
            orderBy: { createdAt: 'desc' },
        });

        if (!lastNegotiation) {
            throw new BpmnError('NO_NEGOTIATION_FOUND', `No negotiation history for assignment ${assignmentId}`);
        }

        const agreedDate = lastNegotiation.proposedDate;

        this.logger.log(`Finalizing date agreement for assignment ${assignmentId}: ${agreedDate.toISOString()}`);

        // Update assignment state to ACCEPTED (or similar) and set the date
        // Note: detailed logic depends on whether this replaces the standard booking flow
        // For now, we update the assignment state and the confirmed date
        await this.prisma.assignment.update({
            where: { id: assignmentId },
            data: {
                state: 'ACCEPTED',
                acceptedAt: new Date(),
                proposedDate: agreedDate, // Ensuring the agreed date is the one stored
                // Clear any rejection reason if it existed
                rejectionReason: null,
            },
        });

        // Update the negotiation status to ACCEPTED
        await this.prisma.dateNegotiation.update({
            where: { id: lastNegotiation.id },
            data: { status: 'ACCEPTED' },
        });

        return {
            agreedDate: agreedDate.toISOString(),
            finalizedAt: new Date().toISOString(),
        };
    }
}
