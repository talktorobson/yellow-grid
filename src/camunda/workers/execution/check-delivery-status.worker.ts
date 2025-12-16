import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';

interface CheckDeliveryStatusInput {
    serviceOrderId: string;
    externalOrderId?: string;
    products?: any[];
}

interface CheckDeliveryStatusOutput {
    deliveryOK: boolean;
    deliveryStatus: string;
    deliveryDetails?: any;
}

@Injectable()
export class CheckDeliveryStatusWorker extends BaseWorker<CheckDeliveryStatusInput, CheckDeliveryStatusOutput> {
    protected readonly logger = new Logger(CheckDeliveryStatusWorker.name);
    readonly taskType = 'check-delivery-status';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handle(job: ZeebeJob<CheckDeliveryStatusInput>): Promise<CheckDeliveryStatusOutput> {
        const { serviceOrderId } = job.variables;

        this.logger.log(`Checking delivery status for order ${serviceOrderId}`);

        // Mock logic: 90% success rate
        const isSuccess = Math.random() > 0.10;

        return {
            deliveryOK: isSuccess,
            deliveryStatus: isSuccess ? 'DELIVERED' : 'PENDING_DELIVERY',
            deliveryDetails: {
                checkedAt: new Date().toISOString(),
                mock: true
            }
        };
    }
}
