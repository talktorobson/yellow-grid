import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TaskSlaService } from './task-sla.service';
import { KafkaProducerService } from '../../../common/kafka/kafka-producer.service';

@Injectable()
export class TaskEscalationService {
  private readonly logger = new Logger(TaskEscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slaService: TaskSlaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Cron job to check for tasks requiring escalation
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndEscalateTasks(): Promise<void> {
    this.logger.log('Running task escalation check...');

    // Get all active tasks
    const activeTasks = await this.prisma.task.findMany({
      where: {
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
        },
        slaPaused: false, // Don't escalate paused tasks
      },
    });

    for (const task of activeTasks) {
      await this.checkAndEscalateTask(task);
    }

    this.logger.log(`Escalation check completed. Checked ${activeTasks.length} tasks.`);
  }

  /**
   * Check if a single task needs escalation
   */
  private async checkAndEscalateTask(task: any): Promise<void> {
    const slaPercentage = this.slaService.calculateSlaPercentage(task);

    // First escalation at 50% of SLA
    if (slaPercentage >= 50 && task.escalationLevel < 1) {
      await this.escalateTask(task.id, 1, 'SLA_WARNING');
    }
    // Second escalation at 75% of SLA
    else if (slaPercentage >= 75 && task.escalationLevel < 2) {
      await this.escalateTask(task.id, 2, 'SLA_AT_RISK');
    }
    // Third escalation at 100% of SLA (breach)
    else if (slaPercentage >= 100 && task.escalationLevel < 3) {
      await this.escalateTask(task.id, 3, 'SLA_BREACH');
    }
  }

  /**
   * Escalate a task to a higher level
   */
  async escalateTask(taskId: string, level: 1 | 2 | 3, reason: string): Promise<void> {
    this.logger.warn(`Escalating task ${taskId} to level ${level}: ${reason}`);

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        escalationLevel: level,
        escalatedAt: new Date(),
      },
    });

    // Publish escalation event
    await this.kafkaProducer.produce({
      topic: 'tasks.task.escalated',
      messages: [
        {
          key: taskId,
          value: JSON.stringify({
            eventType: 'TASK_ESCALATED',
            taskId,
            escalationLevel: level,
            escalatedAt: new Date().toISOString(),
            escalationReason: reason,
          }),
        },
      ],
    });

    // TODO: Send notifications based on escalation level
    // Level 1: Notify assigned operator
    // Level 2: Notify operator + senior operator/team lead
    // Level 3: Notify senior management + auto-reassign
  }

  /**
   * Manually escalate a task
   */
  async manualEscalation(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const nextLevel = Math.min(3, task.escalationLevel + 1) as 1 | 2 | 3;
    await this.escalateTask(taskId, nextLevel, 'MANUAL');
  }
}
