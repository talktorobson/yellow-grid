import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface SendWCFInput {
    wcfId: string;
    customerId: string;
    customerEmail?: string;
}

interface SendWCFOutput {
    sentAt: string;
}

@Injectable()
export class SendWCFWorker extends BaseWorker<SendWCFInput, SendWCFOutput> {
    protected readonly logger = new Logger(SendWCFWorker.name);
    readonly taskType = 'send-wcf';

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super();
    }

    async handle(job: ZeebeJob<SendWCFInput>): Promise<SendWCFOutput> {
        const { wcfId, customerEmail } = job.variables;

        if (!wcfId) {
            throw new BpmnError('INVALID_INPUT', 'Missing wcfId');
        }

        this.logger.log(`Sending WCF ${wcfId} to customer ${customerEmail || 'unknown'}`);

        // Update WCF status
        const wcf = await this.prisma.workCompletionForm.update({
            where: { id: wcfId },
            data: {
                status: 'PENDING_SIGNATURE', // Assuming this enum value exists
            },
        });

        // Emit event for notification service
        this.eventEmitter.emit('wcf.sent', {
            wcfId,
            wcfNumber: wcf.wcfNumber,
            recipientEmail: customerEmail,
        });

        return {
            sentAt: new Date().toISOString(),
        };
    }
}
