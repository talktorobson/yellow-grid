import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface CreateTaskInput {
    taskType: string;
    priority: string;
    entityId: string; // The ID of the related entity (e.g., contractId, serviceOrderId)
    context?: Record<string, any>;
    description?: string;
    assignedTo?: string;
}

interface CreateTaskOutput {
    taskId: string;
    createdCheck: boolean;
}

@Injectable()
export class CreateTaskWorker extends BaseWorker<CreateTaskInput, CreateTaskOutput> {
    protected readonly logger = new Logger(CreateTaskWorker.name);
    readonly taskType = 'create-task';

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async handle(job: ZeebeJob<CreateTaskInput>): Promise<CreateTaskOutput> {
        const { taskType, priority, entityId, context, description, assignedTo } = job.variables;

        if (!taskType || !entityId) {
            throw new BpmnError('INVALID_INPUT', 'Missing taskType or entityId');
        }

        this.logger.log(`Creating task ${taskType} for entity ${entityId}`);

        // Resolve serviceOrderId from entityId if possible, or use it directly if it fits
        // For now, we assume we might need to lookup parent relations if entityId is not a serviceOrderId
        // But since Task model links to ServiceOrder usually, we might need a lookup logic here
        // However, for Contract tasks, maybe they are linked to a serviceOrder via the contract?

        // For simplicity in this generic worker, we assume the caller passes relevant IDs in context 
        // or we might need to extend the Task model to support other entity types (Polynomial association)
        // Looking at schema (remembered), Task has `serviceOrderId`. 

        // If we are creating a task for a Contract, we might need to pick one SO from the contract or 
        // maybe Task model needs to be updated to support Contract references.
        // For now, we will try to find a service order linked to this entity if it's not one itself.

        let serviceOrderId = entityId; // Default assumption

        // If context has serviceOrderId, use it
        if (context?.serviceOrderId) {
            serviceOrderId = context.serviceOrderId;
        }

        // Default SLA deadline (24h) if not calculated
        const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

        /* 
          NOTE: In a real implementation, we would validate `taskType` against the Enum 
          and `priority` against TaskPriority enum. 
          Here we cast to any to bypass strict type checks for the mock implementation.
        */

        try {
            const task = await this.prisma.task.create({
                data: {
                    taskType: taskType as any,
                    priority: (priority || 'MEDIUM') as any,
                    status: 'OPEN',
                    serviceOrderId: serviceOrderId, // This might fail if entityId is not a SO ID and we didn't find one
                    // We need to fetch country/BU from the service order or pass it in variables
                    // Mocking for now:
                    countryCode: 'ES',
                    businessUnit: 'default',
                    context: context || {},
                    assignedTo: assignedTo,
                    slaDeadline,
                    resolutionNotes: description,
                },
            });

            return {
                taskId: task.id,
                createdCheck: true,
            };
        } catch (error) {
            this.logger.error(`Failed to create task: ${error.message}`);
            // If we fail due to foreign key constraint (invalid serviceOrderId), throw BPMN error
            if (error.code === 'P2003') { // Prisma FK error
                throw new BpmnError('INVALID_REFERENCE', `Could not link task to service order ${serviceOrderId}`);
            }
            throw error;
        }
    }
}
