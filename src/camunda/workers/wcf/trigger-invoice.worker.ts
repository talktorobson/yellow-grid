import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface TriggerInvoiceInput {
    serviceOrderId: string;
    wcfId: string;
    providerId: string;
    adjustedAmount?: number;
}

interface TriggerInvoiceOutput {
    invoiceTriggeredAt: string;
    serviceOrderState: string;
}

@Injectable()
export class TriggerInvoiceWorker extends BaseWorker<TriggerInvoiceInput, TriggerInvoiceOutput> {
    protected readonly logger = new Logger(TriggerInvoiceWorker.name);
    readonly taskType = 'trigger-invoice';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<TriggerInvoiceInput>): Promise<TriggerInvoiceOutput> {
        const { serviceOrderId, wcfId } = job.variables;

        if (!serviceOrderId) {
            throw new BpmnError('INVALID_INPUT', 'Missing serviceOrderId');
        }

        this.logger.log(`Triggering invoice for service order ${serviceOrderId} (WCF: ${wcfId})`);

        // Update Service Order to COMPLETED
        const serviceOrder = await this.prisma.serviceOrder.update({
            where: { id: serviceOrderId },
            data: {
                state: 'COMPLETED',
                // In a real system, we might set a reason or other flags
            },
        });

        // Mock invoice generation call
        this.logger.log(`[MOCK] Invoice generation initiated for Order ${serviceOrderId}`);

        return {
            invoiceTriggeredAt: new Date().toISOString(),
            serviceOrderState: serviceOrder.state,
        };
    }
}
