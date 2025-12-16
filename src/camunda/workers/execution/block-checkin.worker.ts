import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface BlockCheckInInput {
    serviceOrderId: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    blockingReasons?: string[];
}

interface BlockCheckInOutput {
    blockedAt: string;
}

@Injectable()
export class BlockCheckInWorker extends BaseWorker<BlockCheckInInput, BlockCheckInOutput> {
    protected readonly logger = new Logger(BlockCheckInWorker.name);
    readonly taskType = 'block-checkin';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<BlockCheckInInput>): Promise<BlockCheckInOutput> {
        const { serviceOrderId, blockingReasons } = job.variables;

        if (!serviceOrderId) {
            throw new BpmnError('INVALID_INPUT', 'Missing serviceOrderId');
        }

        this.logger.warn(`Blocking check-in for order ${serviceOrderId}. Reasons: ${blockingReasons?.join(', ')}`);

        // Block execution on the service order
        await this.prisma.serviceOrder.update({
            where: { id: serviceOrderId },
            data: {
                executionBlocked: true,
                executionBlockedReason: blockingReasons?.join('; ') || 'Pre-flight check failed',
                // We could also set state to ON_HOLD if business rules allow, but for now we rely on the flag
            },
        });

        return {
            blockedAt: new Date().toISOString(),
        };
    }
}
