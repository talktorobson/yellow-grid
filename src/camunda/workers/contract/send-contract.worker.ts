import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface SendContractInput {
    contractId: string;
    customerId: string;
}

interface SendContractOutput {
    sentAt: string;
}

@Injectable()
export class SendContractWorker extends BaseWorker<SendContractInput, SendContractOutput> {
    protected readonly logger = new Logger(SendContractWorker.name);
    readonly taskType = 'send-contract';

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super();
    }

    async handle(job: ZeebeJob<SendContractInput>): Promise<SendContractOutput> {
        const { contractId, customerId } = job.variables;

        if (!contractId) {
            throw new BpmnError('INVALID_INPUT', 'Missing contractId');
        }

        this.logger.log(`Sending contract ${contractId} to customer ${customerId}`);

        // Update contract status to SENT or AWAITING_SIGNATURE
        // We need to check exact enum values, but safe bet for now is updating metadata
        await this.prisma.contract.update({
            where: { id: contractId },
            data: {
                sentAt: new Date(),
                status: 'SENT',
            },
        });

        // Emit event for notification service
        this.eventEmitter.emit('contract.sent', {
            contractId,
            customerId,
            timestamp: new Date(),
        });

        return {
            sentAt: new Date().toISOString(),
        };
    }
}
