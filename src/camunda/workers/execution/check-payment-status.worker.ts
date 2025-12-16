import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';

interface CheckPaymentStatusInput {
    serviceOrderId: string;
    externalOrderId?: string;
    sourceSystem?: string;
}

interface CheckPaymentStatusOutput {
    paymentOK: boolean;
    paymentStatus: string;
    paymentDetails?: any;
}

@Injectable()
export class CheckPaymentStatusWorker extends BaseWorker<CheckPaymentStatusInput, CheckPaymentStatusOutput> {
    protected readonly logger = new Logger(CheckPaymentStatusWorker.name);
    readonly taskType = 'check-payment-status';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handle(job: ZeebeJob<CheckPaymentStatusInput>): Promise<CheckPaymentStatusOutput> {
        const { serviceOrderId } = job.variables;

        this.logger.log(`Checking payment status for order ${serviceOrderId}`);

        // Mock logic: 95% success rate
        const isSuccess = Math.random() > 0.05;

        return {
            paymentOK: isSuccess,
            paymentStatus: isSuccess ? 'PAID' : 'PAYMENT_PENDING',
            paymentDetails: {
                checkedAt: new Date().toISOString(),
                mock: true
            }
        };
    }
}
