import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  TaskType,
  TaskPriority,
  TaskStatus,
  AlertType,
  AlertSeverity,
  CountryCode,
} from '../../common/types/schema.types';

export interface CreateTaskDto {
  type: TaskType;
  priority: TaskPriority;
  title: string;
  description?: string;
  serviceOrderId?: string;
  assignedToId?: string;
  dueDate?: Date;
  metadata?: any; // JSON data specific to task type
}

export interface CreateAlertDto {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  serviceOrderId?: string;
  userId?: string; // User to notify
  metadata?: any;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== TASK MANAGEMENT ====================

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskDto) {
    const task = await this.prisma.taskManagement.create({
      data: {
        type: data.type,
        priority: data.priority,
        status: TaskStatus.PENDING,
        title: data.title,
        description: data.description,
        serviceOrderId: data.serviceOrderId,
        assignedToId: data.assignedToId,
        dueDate: data.dueDate,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        serviceOrder: {
          select: {
            id: true,
            externalId: true,
            serviceType: true,
          },
        },
      },
    });

    // TODO: Send notification to assigned operator
    // TODO: Create calendar event if dueDate is set

    return task;
  }

  /**
   * Get all tasks with filters
   */
  async findAllTasks(filters?: {
    assignedToId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    serviceOrderId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.serviceOrderId) {
      where.serviceOrderId = filters.serviceOrderId;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.taskManagement.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          serviceOrder: {
            select: {
              id: true,
              externalId: true,
              serviceType: true,
              status: true,
            },
          },
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: [
          { priority: 'desc' }, // URGENT first
          { dueDate: 'asc' }, // Earliest due date first
          { createdAt: 'asc' }, // Oldest first
        ],
      }),
      this.prisma.taskManagement.count({ where }),
    ]);

    return {
      data: tasks,
      total,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get task by ID
   */
  async findOneTask(id: string) {
    const task = await this.prisma.taskManagement.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        serviceOrder: {
          include: {
            project: {
              include: {
                contacts: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  /**
   * Update task
   */
  async updateTask(
    id: string,
    data: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedToId?: string;
      dueDate?: Date;
      description?: string;
      resolution?: string;
    }
  ) {
    const task = await this.prisma.taskManagement.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    const updated = await this.prisma.taskManagement.update({
      where: { id },
      data: {
        ...data,
        completedAt: data.status === TaskStatus.COMPLETED ? new Date() : undefined,
      },
      include: {
        assignedTo: true,
        serviceOrder: true,
      },
    });

    return updated;
  }

  /**
   * Assign task to operator
   */
  async assignTask(id: string, operatorId: string) {
    return this.updateTask(id, { assignedToId: operatorId });
  }

  /**
   * Mark task as in progress
   */
  async startTask(id: string) {
    return this.updateTask(id, { status: TaskStatus.IN_PROGRESS });
  }

  /**
   * Complete task
   */
  async completeTask(id: string, resolution?: string) {
    return this.updateTask(id, {
      status: TaskStatus.COMPLETED,
      resolution,
    });
  }

  /**
   * Cancel task
   */
  async cancelTask(id: string, reason?: string) {
    return this.updateTask(id, {
      status: TaskStatus.CANCELLED,
      resolution: reason,
    });
  }

  /**
   * Get task statistics for operator
   */
  async getOperatorTaskStats(operatorId: string) {
    const tasks = await this.prisma.taskManagement.findMany({
      where: { assignedToId: operatorId },
      select: {
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const now = new Date();
    const overdue = tasks.filter(
      (t: any) =>
        t.status !== TaskStatus.COMPLETED &&
        t.dueDate &&
        new Date(t.dueDate) < now
    );

    return {
      total: tasks.length,
      pending: tasks.filter((t: any) => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length,
      cancelled: tasks.filter((t: any) => t.status === TaskStatus.CANCELLED).length,
      overdue: overdue.length,
      urgent: tasks.filter(
        (t: any) =>
          t.priority === TaskPriority.URGENT &&
          t.status !== TaskStatus.COMPLETED
      ).length,
      high: tasks.filter(
        (t: any) =>
          t.priority === TaskPriority.HIGH &&
          t.status !== TaskStatus.COMPLETED
      ).length,
    };
  }

  // ==================== ALERTS ====================

  /**
   * Create an alert
   */
  async createAlert(data: CreateAlertDto) {
    const alert = await this.prisma.alert.create({
      data: {
        type: data.type,
        severity: data.severity,
        title: data.title,
        message: data.message,
        serviceOrderId: data.serviceOrderId,
        userId: data.userId,
        isRead: false,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        serviceOrder: {
          select: {
            id: true,
            externalId: true,
            serviceType: true,
          },
        },
      },
    });

    // TODO: Send push notification
    // TODO: Send email for CRITICAL alerts
    // TODO: Send SMS for CRITICAL alerts with phone on file

    return alert;
  }

  /**
   * Get all alerts with filters
   */
  async findAllAlerts(filters?: {
    userId?: string;
    severity?: AlertSeverity;
    type?: AlertType;
    isRead?: boolean;
    serviceOrderId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters?.serviceOrderId) {
      where.serviceOrderId = filters.serviceOrderId;
    }

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          serviceOrder: {
            select: {
              id: true,
              externalId: true,
              serviceType: true,
            },
          },
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: [
          { severity: 'desc' }, // CRITICAL first
          { createdAt: 'desc' }, // Newest first
        ],
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      data: alerts,
      total,
      unread: await this.prisma.alert.count({
        where: { ...where, isRead: false },
      }),
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get alert by ID
   */
  async findOneAlert(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: {
        user: true,
        serviceOrder: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    return alert;
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(id: string) {
    const alert = await this.prisma.alert.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return alert;
  }

  /**
   * Mark all alerts as read for a user
   */
  async markAllAlertsAsRead(userId: string) {
    const result = await this.prisma.alert.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      markedAsRead: result.count,
    };
  }

  /**
   * Delete alert
   */
  async deleteAlert(id: string) {
    await this.prisma.alert.delete({
      where: { id },
    });

    return { deleted: true };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Auto-create task from alert (for critical alerts)
   */
  async createTaskFromAlert(alertId: string, assignedToId?: string) {
    const alert = await this.findOneAlert(alertId);

    // Map alert type to task type
    const taskTypeMap: Record<string, TaskType> = {
      [AlertType.ASSIGNMENT_TIMEOUT]: TaskType.MANUAL_ASSIGNMENT,
      [AlertType.GO_EXEC_BLOCKED]: TaskType.GO_EXEC_NOK,
      [AlertType.WCF_ISSUE]: TaskType.WCF_REFUSED,
      [AlertType.PROVIDER_SUSPENDED]: TaskType.PROVIDER_ISSUE,
      [AlertType.CONTRACT_REFUSED]: TaskType.MANUAL_ASSIGNMENT,
      [AlertType.PAYMENT_DELAYED]: TaskType.PAYMENT_ISSUE,
    };

    const taskType = taskTypeMap[alert.type] || TaskType.MANUAL_ASSIGNMENT;

    // Set priority based on severity
    const priority =
      alert.severity === AlertSeverity.CRITICAL
        ? TaskPriority.URGENT
        : alert.severity === AlertSeverity.ERROR
        ? TaskPriority.HIGH
        : TaskPriority.MEDIUM;

    const task = await this.createTask({
      type: taskType,
      priority,
      title: alert.title,
      description: alert.message,
      serviceOrderId: alert.serviceOrderId,
      assignedToId: assignedToId || alert.userId,
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
      },
    });

    return task;
  }

  /**
   * Get unread alert count for user
   */
  async getUnreadAlertCount(userId: string) {
    return this.prisma.alert.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Get pending task count for operator
   */
  async getPendingTaskCount(operatorId: string) {
    return this.prisma.taskManagement.count({
      where: {
        assignedToId: operatorId,
        status: {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
        },
      },
    });
  }
}
