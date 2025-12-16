import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface AssignTaskInput {
    taskId: string;
    taskType: string;
}

interface AssignTaskOutput {
    assignedTo: string;
    assignedAt: string;
    slaDuration: string; // ISO 8601 duration
}

@Injectable()
export class AssignTaskWorker extends BaseWorker<AssignTaskInput, AssignTaskOutput> {
    protected readonly logger = new Logger(AssignTaskWorker.name);
    readonly taskType = 'assign-task';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<AssignTaskInput>): Promise<AssignTaskOutput> {
        const { taskId, taskType } = job.variables;

        if (!taskId) {
            throw new BpmnError('INVALID_INPUT', 'Missing taskId');
        }

        this.logger.log(`Auto-assigning task ${taskId} (${taskType})`);

        // Mock Assignment Logic:
        // 1. Find available operators with skill for taskType
        // 2. Select least loaded operator

        // For MVP/Mock: Assign to a default operator
        const assignedTo = 'operator.john.doe@yellowgrid.com';

        // Update task
        const task = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                assignedTo,
                status: 'ASSIGNED',
                assignedAt: new Date(),
                assignedBy: 'SYSTEM',
            },
        });

        // Calculate SLA duration based on priority (mock logic)
        // CRITICAL: 2h, HIGH: 8h, MEDIUM: 24h, LOW: 48h
        let hours = 24;
        switch (task.priority) {
            case 'CRITICAL': hours = 2; break;
            case 'URGENT': hours = 4; break;
            case 'HIGH': hours = 8; break;
            case 'MEDIUM': hours = 16; break; // as per schema enum comment
            case 'LOW': hours = 40; break;
        }

        const slaDuration = `PT${hours}H`;

        return {
            assignedTo,
            assignedAt: new Date().toISOString(),
            slaDuration, // Passed to Timer Event
        };
    }
}
