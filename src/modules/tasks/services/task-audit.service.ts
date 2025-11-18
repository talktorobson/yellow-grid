import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class TaskAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    taskId: string,
    action: string,
    performedBy: string,
    changes?: any,
    notes?: string,
  ): Promise<void> {
    await this.prisma.taskAuditLog.create({
      data: {
        taskId,
        action,
        performedBy,
        changes,
        notes,
      },
    });
  }

  async getTaskAuditLogs(taskId: string) {
    return this.prisma.taskAuditLog.findMany({
      where: { taskId },
      orderBy: { performedAt: 'desc' },
    });
  }
}
