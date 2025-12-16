import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface EscalateTaskInput {
    taskId: string;
    escalationLevel: number;
}

interface EscalateTaskOutput {
    escalatedAt: string;
    newLevel: number;
}

@Injectable()
export class EscalateTaskWorker extends BaseWorker<EscalateTaskInput, EscalateTaskOutput> {
    protected readonly logger = new Logger(EscalateTaskWorker.name);
    readonly taskType = 'escalate-task';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<EscalateTaskInput>): Promise<EscalateTaskOutput> {
        const { taskId, escalationLevel } = job.variables;

        if (!taskId) {
            throw new BpmnError('INVALID_INPUT', 'Missing taskId');
        }

        this.logger.warn(`Escalating task ${taskId} to level ${escalationLevel}`);

        // Update task escalation info
        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                escalationLevel: escalationLevel,
                escalatedAt: new Date(),
                // Might also reassign to a senior pool here
            },
        });

        return {
            escalatedAt: new Date().toISOString(),
            newLevel: escalationLevel,
        };
    }
}
