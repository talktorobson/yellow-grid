import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface NotifyEscalationInput {
    taskId: string;
    role: string; // MANAGER, DIRECTOR, etc.
}

interface NotifyEscalationOutput {
    notifiedAt: string;
}

@Injectable()
export class NotifyEscalationWorker extends BaseWorker<NotifyEscalationInput, NotifyEscalationOutput> {
    protected readonly logger = new Logger(NotifyEscalationWorker.name);
    readonly taskType = 'notify-escalation';

    constructor(private readonly eventEmitter: EventEmitter2) {
        super();
    }

    async handle(job: ZeebeJob<NotifyEscalationInput>): Promise<NotifyEscalationOutput> {
        const { taskId, role } = job.variables;

        this.logger.log(`Notifying ${role} about task escalation for ${taskId}`);

        // Emit event for notification service
        this.eventEmitter.emit('task.escalated', {
            taskId,
            targetRole: role,
            timestamp: new Date(),
        });

        return {
            notifiedAt: new Date().toISOString(),
        };
    }
}
