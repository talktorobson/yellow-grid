import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface ApplyGoOverrideInput {
    serviceOrderId: string;
    overrideId: string;
    approvedBy: string;
}

interface ApplyGoOverrideOutput {
    overriddenAt: string;
}

@Injectable()
export class ApplyGoOverrideWorker extends BaseWorker<ApplyGoOverrideInput, ApplyGoOverrideOutput> {
    protected readonly logger = new Logger(ApplyGoOverrideWorker.name);
    readonly taskType = 'apply-go-override';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<ApplyGoOverrideInput>): Promise<ApplyGoOverrideOutput> {
        const { serviceOrderId, approvedBy } = job.variables;

        if (!serviceOrderId) {
            throw new BpmnError('INVALID_INPUT', 'Missing serviceOrderId');
        }

        this.logger.log(`Applying GO execution override for order ${serviceOrderId} by ${approvedBy}`);

        // Unblock execution
        await this.prisma.serviceOrder.update({
            where: { id: serviceOrderId },
            data: {
                executionBlocked: false,
                executionBlockedReason: `Overridden by ${approvedBy}`, // Keep trace of override
            },
        });

        return {
            overriddenAt: new Date().toISOString(),
        };
    }
}
