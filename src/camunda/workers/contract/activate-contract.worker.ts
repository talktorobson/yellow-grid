import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface ActivateContractInput {
    contractId: string;
}

interface ActivateContractOutput {
    activatedAt: string;
}

@Injectable()
export class ActivateContractWorker extends BaseWorker<ActivateContractInput, ActivateContractOutput> {
    protected readonly logger = new Logger(ActivateContractWorker.name);
    readonly taskType = 'activate-contract';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<ActivateContractInput>): Promise<ActivateContractOutput> {
        const { contractId } = job.variables;

        if (!contractId) {
            throw new BpmnError('INVALID_INPUT', 'Missing contractId');
        }

        this.logger.log(`Activating contract ${contractId}`);

        // Update contract status to ACTIVE
        await this.prisma.contract.update({
            where: { id: contractId },
            data: {
                status: 'SIGNED',
                signedAt: new Date(),
            },
        });

        // Logic to activate associated service orders could go here
        // e.g. move them from SCHEDULED to READY_FOR_EXECUTION if waiting on contract

        return {
            activatedAt: new Date().toISOString(),
        };
    }
}
