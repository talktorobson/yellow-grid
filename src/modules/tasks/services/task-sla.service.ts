import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TaskPriority } from '@prisma/client';

@Injectable()
export class TaskSlaService {
  private readonly logger = new Logger(TaskSlaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate SLA deadline based on priority
   */
  calculateSlaDeadline(priority: TaskPriority, createdAt: Date = new Date()): Date {
    const deadline = new Date(createdAt);

    switch (priority) {
      case 'CRITICAL':
        deadline.setHours(deadline.getHours() + 2); // 2 hours
        break;
      case 'URGENT':
        deadline.setHours(deadline.getHours() + 4); // 4 hours
        break;
      case 'HIGH':
        deadline.setHours(deadline.getHours() + 8); // 8 hours
        break;
      case 'MEDIUM':
        deadline.setHours(deadline.getHours() + 16); // 16 hours
        break;
      case 'LOW':
        deadline.setHours(deadline.getHours() + 40); // 40 hours (5 days)
        break;
    }

    return deadline;
  }

  /**
   * Pause SLA clock for a task
   */
  async pauseSla(taskId: string, reason: string): Promise<void> {
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        slaPaused: true,
        slaPausedAt: new Date(),
        slaPauseReason: reason,
      },
    });

    this.logger.log(`SLA paused for task ${taskId}: ${reason}`);
  }

  /**
   * Resume SLA clock for a task
   */
  async resumeSla(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || !task.slaPaused || !task.slaPausedAt) {
      return;
    }

    // Calculate paused duration
    const pausedMinutes =
      (new Date().getTime() - task.slaPausedAt.getTime()) / (1000 * 60);

    // Extend SLA deadline by paused duration
    const newDeadline = new Date(task.slaDeadline);
    newDeadline.setMinutes(newDeadline.getMinutes() + pausedMinutes);

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        slaPaused: false,
        slaDeadline: newDeadline,
        totalPausedMinutes: task.totalPausedMinutes + Math.floor(pausedMinutes),
      },
    });

    this.logger.log(`SLA resumed for task ${taskId} (paused for ${pausedMinutes} minutes)`);
  }

  /**
   * Calculate SLA percentage elapsed
   */
  calculateSlaPercentage(task: {
    createdAt: Date;
    slaDeadline: Date;
    slaPaused: boolean;
    slaPausedAt?: Date | null;
  }): number {
    const now = new Date();
    const createdAt = new Date(task.createdAt);
    const slaDeadline = new Date(task.slaDeadline);

    // If paused, use pause time instead of now
    const effectiveNow = task.slaPaused && task.slaPausedAt ? task.slaPausedAt : now;

    const elapsedMs = effectiveNow.getTime() - createdAt.getTime();
    const totalMs = slaDeadline.getTime() - createdAt.getTime();

    return (elapsedMs / totalMs) * 100;
  }

  /**
   * Check if task is within SLA
   */
  isWithinSla(completedAt: Date, slaDeadline: Date): boolean {
    return completedAt <= slaDeadline;
  }
}
