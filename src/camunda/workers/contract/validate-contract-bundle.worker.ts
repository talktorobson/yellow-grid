import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface ValidateContractBundleInput {
    contractId: string;
    serviceOrderIds?: string[];
}

interface ValidateContractBundleOutput {
    isValid: boolean;
    validationDetails?: string;
    serviceOrderIds: string[]; // Pass through or resolved IDs
}

@Injectable()
export class ValidateContractBundleWorker extends BaseWorker<ValidateContractBundleInput, ValidateContractBundleOutput> {
    protected readonly logger = new Logger(ValidateContractBundleWorker.name);
    readonly taskType = 'validate-contract-bundle';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<ValidateContractBundleInput>): Promise<ValidateContractBundleOutput> {
        const { contractId, serviceOrderIds } = job.variables;

        if (!contractId) {
            throw new BpmnError('INVALID_INPUT', 'Missing contractId');
        }

        this.logger.log(`Validating contract bundle ${contractId}`);

        const contract = await this.prisma.contract.findUnique({
            where: { id: contractId },
            include: { serviceOrder: true },
        });

        if (!contract) {
            throw new BpmnError('CONTRACT_NOT_FOUND', `Contract ${contractId} not found`);
        }

        // Business Logic: Check if the linked service order is in a valid state
        const so = contract.serviceOrder;

        if (!['CREATED', 'SCHEDULED'].includes(so.state)) {
            throw new BpmnError('INVALID_BUNDLE', `Contract linked order ${so.id} is in invalid state ${so.state}`);
        }

        return {
            isValid: true,
            serviceOrderIds: [so.id],
        };
    }
}
