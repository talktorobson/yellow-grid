import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import { TaskAssignmentService } from './services/task-assignment.service';
import { TaskSlaService } from './services/task-sla.service';
import { TaskAuditService } from './services/task-audit.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CancelTaskDto } from './dto/cancel-task.dto';
import { PauseSlaDto } from './dto/pause-sla.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskStatus, Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly assignmentService: TaskAssignmentService,
    private readonly slaService: TaskSlaService,
    private readonly auditService: TaskAuditService,
  ) {}

  /**
   * Create a new task
   */
  async create(createTaskDto: CreateTaskDto, createdBy = 'SYSTEM') {
    // Check for duplicate active task
    const existingTask = await this.prisma.task.findFirst({
      where: {
        serviceOrderId: createTaskDto.serviceOrderId,
        taskType: createTaskDto.taskType,
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
        },
      },
    });

    if (existingTask) {
      throw new BadRequestException(
        `Active task of type ${createTaskDto.taskType} already exists for service order ${createTaskDto.serviceOrderId}`,
      );
    }

    // Get service order to extract country and business unit
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: createTaskDto.serviceOrderId },
      select: { countryCode: true, businessUnit: true },
    });

    if (!serviceOrder) {
      throw new NotFoundException(
        `Service order ${createTaskDto.serviceOrderId} not found`,
      );
    }

    // Calculate SLA deadline
    const createdAt = new Date();
    const slaDeadline = this.slaService.calculateSlaDeadline(
      createTaskDto.priority,
      createdAt,
    );

    // Auto-assign or manual assign
    let assignedTo = createTaskDto.assignedTo;
    let assignedBy = createdBy;

    if (!assignedTo) {
      // Auto-assign
      assignedTo = await this.assignmentService.autoAssignTask(
        createTaskDto.serviceOrderId, // temporary ID
        createTaskDto.taskType,
        serviceOrder.countryCode,
      );
      assignedBy = 'SYSTEM';
    }

    // Create task
    const task = await this.prisma.task.create({
      data: {
        taskType: createTaskDto.taskType,
        priority: createTaskDto.priority,
        status: assignedTo ? 'ASSIGNED' : 'OPEN',
        serviceOrderId: createTaskDto.serviceOrderId,
        context: createTaskDto.context,
        assignedTo,
        assignedBy,
        assignedAt: assignedTo ? new Date() : undefined,
        slaDeadline,
        countryCode: serviceOrder.countryCode,
        businessUnit: serviceOrder.businessUnit,
      },
    });

    // Log audit
    await this.auditService.logAction(task.id, 'CREATED', createdBy);

    if (assignedTo) {
      await this.auditService.logAction(task.id, 'ASSIGNED', assignedBy, {
        assignedTo,
      });
    }

    // Publish event
    await this.kafkaProducer.produce({
      topic: 'tasks.task.created',
      messages: [
        {
          key: task.id,
          value: JSON.stringify({
            eventType: 'TASK_CREATED',
            taskId: task.id,
            taskType: task.taskType,
            priority: task.priority,
            serviceOrderId: task.serviceOrderId,
            context: task.context,
            slaDeadline: task.slaDeadline.toISOString(),
            countryCode: task.countryCode,
            businessUnit: task.businessUnit,
          }),
        },
      ],
    });

    this.logger.log(`Task ${task.id} created for service order ${task.serviceOrderId}`);

    return task;
  }

  /**
   * Find all tasks with filtering and pagination
   */
  async findAll(query: QueryTasksDto) {
    const { page = 1, pageSize = 20, sortBy = 'slaDeadline', sortOrder = 'asc' } = query;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.TaskWhereInput = {};

    if (query.status) {
      where.status = { in: query.status };
    }

    if (query.priority) {
      where.priority = { in: query.priority };
    }

    if (query.taskType) {
      where.taskType = { in: query.taskType };
    }

    if (query.assignedTo) {
      where.assignedTo = query.assignedTo;
    }

    if (query.serviceOrderId) {
      where.serviceOrderId = query.serviceOrderId;
    }

    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }

    // SLA status filter
    if (query.slaStatus) {
      const now = new Date();

      if (query.slaStatus === 'breached') {
        where.slaDeadline = { lt: now };
        where.status = { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] };
      } else if (query.slaStatus === 'at_risk') {
        // Tasks at 50-100% of SLA
        where.status = { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] };
        // This is simplified - in production we'd calculate this more accurately
      } else if (query.slaStatus === 'on_track') {
        where.slaDeadline = { gte: now };
        where.status = { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] };
      }
    }

    // Execute query
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          serviceOrder: {
            select: {
              id: true,
              state: true,
              serviceType: true,
              priority: true,
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Find a task by ID
   */
  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        serviceOrder: true,
        auditLogs: {
          orderBy: { performedAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  /**
   * Update a task
   */
  async update(id: string, updateTaskDto: UpdateTaskDto, updatedBy: string) {
    const task = await this.findOne(id);

    const updateData: Prisma.TaskUpdateInput = {};

    if (updateTaskDto.priority) {
      updateData.priority = updateTaskDto.priority;

      // Recalculate SLA deadline if priority changed
      if (updateTaskDto.priority !== task.priority) {
        updateData.slaDeadline = this.slaService.calculateSlaDeadline(
          updateTaskDto.priority,
          task.createdAt,
        );
      }
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Log audit
    await this.auditService.logAction(id, 'UPDATED', updatedBy, updateTaskDto, updateTaskDto.notes);

    return updatedTask;
  }

  /**
   * Assign task to operator
   */
  async assign(id: string, assignTaskDto: AssignTaskDto, assignedBy: string) {
    const task = await this.findOne(id);

    if (task.status !== 'OPEN' && task.status !== 'ASSIGNED') {
      throw new BadRequestException(
        `Cannot assign task in status ${task.status}`,
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        assignedTo: assignTaskDto.assignedTo,
        assignedBy,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      },
    });

    // Log audit
    await this.auditService.logAction(id, 'ASSIGNED', assignedBy, {
      assignedTo: assignTaskDto.assignedTo,
    });

    // Publish event
    await this.kafkaProducer.produce({
      topic: 'tasks.task.assigned',
      messages: [
        {
          key: id,
          value: JSON.stringify({
            eventType: 'TASK_ASSIGNED',
            taskId: id,
            assignedTo: assignTaskDto.assignedTo,
            assignedBy,
            assignedAt: new Date().toISOString(),
          }),
        },
      ],
    });

    return updatedTask;
  }

  /**
   * Start working on a task
   */
  async start(id: string, startedBy: string) {
    const task = await this.findOne(id);

    if (task.status !== 'ASSIGNED') {
      throw new BadRequestException(
        `Cannot start task in status ${task.status}`,
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Log audit
    await this.auditService.logAction(id, 'STARTED', startedBy);

    // Publish event
    await this.kafkaProducer.produce({
      topic: 'tasks.task.started',
      messages: [
        {
          key: id,
          value: JSON.stringify({
            eventType: 'TASK_STARTED',
            taskId: id,
            startedBy,
            startedAt: new Date().toISOString(),
          }),
        },
      ],
    });

    return updatedTask;
  }

  /**
   * Complete a task
   */
  async complete(id: string, completeTaskDto: CompleteTaskDto, completedBy: string) {
    const task = await this.findOne(id);

    if (task.status !== 'IN_PROGRESS' && task.status !== 'ASSIGNED') {
      throw new BadRequestException(
        `Cannot complete task in status ${task.status}`,
      );
    }

    const completedAt = new Date();
    const resolutionTime = Math.floor(
      (completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60),
    );
    const withinSLA = this.slaService.isWithinSla(completedAt, task.slaDeadline);

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt,
        completedBy,
        resolutionNotes: completeTaskDto.resolutionNotes,
        resolutionTime,
        withinSLA,
      },
    });

    // Log audit
    await this.auditService.logAction(
      id,
      'COMPLETED',
      completedBy,
      { withinSLA, resolutionTime },
      completeTaskDto.resolutionNotes,
    );

    // Publish event
    await this.kafkaProducer.produce({
      topic: 'tasks.task.completed',
      messages: [
        {
          key: id,
          value: JSON.stringify({
            eventType: 'TASK_COMPLETED',
            taskId: id,
            taskType: task.taskType,
            completedBy,
            completedAt: completedAt.toISOString(),
            resolutionTime,
            withinSLA,
            serviceOrderId: task.serviceOrderId,
          }),
        },
      ],
    });

    this.logger.log(`Task ${id} completed by ${completedBy} (within SLA: ${withinSLA})`);

    return updatedTask;
  }

  /**
   * Cancel a task
   */
  async cancel(id: string, cancelTaskDto: CancelTaskDto, cancelledBy: string) {
    const task = await this.findOne(id);

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot cancel task in status ${task.status}`,
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: cancelTaskDto.cancellationReason,
      },
    });

    // Log audit
    await this.auditService.logAction(
      id,
      'CANCELLED',
      cancelledBy,
      null,
      cancelTaskDto.cancellationReason,
    );

    // Publish event
    await this.kafkaProducer.produce({
      topic: 'tasks.task.cancelled',
      messages: [
        {
          key: id,
          value: JSON.stringify({
            eventType: 'TASK_CANCELLED',
            taskId: id,
            cancelledBy,
            cancelledAt: new Date().toISOString(),
            cancellationReason: cancelTaskDto.cancellationReason,
          }),
        },
      ],
    });

    return updatedTask;
  }

  /**
   * Pause SLA for a task
   */
  async pauseSla(id: string, pauseSlaDto: PauseSlaDto) {
    await this.findOne(id); // Ensure task exists

    await this.slaService.pauseSla(id, pauseSlaDto.reason);

    return this.findOne(id);
  }

  /**
   * Resume SLA for a task
   */
  async resumeSla(id: string) {
    await this.findOne(id); // Ensure task exists

    await this.slaService.resumeSla(id);

    return this.findOne(id);
  }

  /**
   * Get operator dashboard
   */
  async getOperatorDashboard(operatorId: string) {
    const [inProgress, assigned, upcomingSLAs, escalated, recentlyCompleted] =
      await Promise.all([
        this.prisma.task.findMany({
          where: { assignedTo: operatorId, status: 'IN_PROGRESS' },
          orderBy: { slaDeadline: 'asc' },
        }),
        this.prisma.task.findMany({
          where: { assignedTo: operatorId, status: 'ASSIGNED' },
          orderBy: { slaDeadline: 'asc' },
        }),
        this.prisma.task.findMany({
          where: {
            assignedTo: operatorId,
            status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
            slaDeadline: {
              lte: new Date(Date.now() + 4 * 60 * 60 * 1000), // Next 4 hours
            },
          },
          orderBy: { slaDeadline: 'asc' },
        }),
        this.prisma.task.findMany({
          where: {
            assignedTo: operatorId,
            escalationLevel: { gt: 0 },
            status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
          },
          orderBy: { escalatedAt: 'desc' },
        }),
        this.prisma.task.findMany({
          where: {
            completedBy: operatorId,
            completedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: { completedAt: 'desc' },
        }),
      ]);

    // Calculate statistics
    const completedToday = await this.prisma.task.count({
      where: {
        completedBy: operatorId,
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const completedTasks = await this.prisma.task.findMany({
      where: {
        completedBy: operatorId,
        status: 'COMPLETED',
        resolutionTime: { not: null },
      },
      select: { resolutionTime: true, withinSLA: true },
    });

    const averageResolutionTime =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.resolutionTime || 0), 0) /
          completedTasks.length
        : 0;

    const slaCompliant = completedTasks.filter((t) => t.withinSLA).length;
    const slaComplianceRate =
      completedTasks.length > 0 ? (slaCompliant / completedTasks.length) * 100 : 0;

    return {
      myTasks: {
        inProgress,
        assigned,
        total: inProgress.length + assigned.length,
      },
      upcomingSLAs,
      escalated,
      recentlyCompleted,
      statistics: {
        completedToday,
        averageResolutionTime: Math.round(averageResolutionTime),
        slaComplianceRate: Math.round(slaComplianceRate * 10) / 10,
      },
    };
  }
}
