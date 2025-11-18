import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import { TaskAssignmentService } from './services/task-assignment.service';
import { TaskSlaService } from './services/task-sla.service';
import { TaskAuditService } from './services/task-audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskType, TaskPriority, TaskStatus } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;
  let kafkaProducer: KafkaProducerService;
  let assignmentService: TaskAssignmentService;
  let slaService: TaskSlaService;
  let auditService: TaskAuditService;

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    serviceOrder: {
      findUnique: jest.fn(),
    },
    taskAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockKafkaProducer = {
    produce: jest.fn(),
  };

  const mockAssignmentService = {
    autoAssignTask: jest.fn(),
  };

  const mockSlaService = {
    calculateSlaDeadline: jest.fn(),
    pauseSla: jest.fn(),
    resumeSla: jest.fn(),
    isWithinSla: jest.fn(),
    calculateSlaPercentage: jest.fn(),
  };

  const mockAuditService = {
    logAction: jest.fn(),
    getTaskAuditLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
        { provide: TaskAssignmentService, useValue: mockAssignmentService },
        { provide: TaskSlaService, useValue: mockSlaService },
        { provide: TaskAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
    kafkaProducer = module.get<KafkaProducerService>(KafkaProducerService);
    assignmentService = module.get<TaskAssignmentService>(TaskAssignmentService);
    slaService = module.get<TaskSlaService>(TaskSlaService);
    auditService = module.get<TaskAuditService>(TaskAuditService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTaskDto = {
      taskType: TaskType.PRE_FLIGHT_FAILURE,
      priority: TaskPriority.URGENT,
      serviceOrderId: 'so_123',
      context: {
        goExecutionStatus: 'NOT_OK_PAYMENT',
        paymentStatus: 'NOT_PAID',
      },
    };

    const serviceOrder = {
      countryCode: 'FR',
      businessUnit: 'Leroy Merlin',
    };

    const slaDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000);

    beforeEach(() => {
      mockPrismaService.task.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(serviceOrder);
      mockSlaService.calculateSlaDeadline.mockReturnValue(slaDeadline);
      mockAssignmentService.autoAssignTask.mockResolvedValue('user_123');
      mockAuditService.logAction.mockResolvedValue(undefined);
      mockKafkaProducer.produce.mockResolvedValue(undefined);
    });

    it('should create a task and auto-assign it', async () => {
      const createdTask = {
        id: 'task_456',
        ...createTaskDto,
        status: TaskStatus.ASSIGNED,
        assignedTo: 'user_123',
        assignedBy: 'SYSTEM',
        assignedAt: expect.any(Date),
        slaDeadline,
        countryCode: 'FR',
        businessUnit: 'Leroy Merlin',
        slaPaused: false,
        totalPausedMinutes: 0,
        escalationLevel: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockPrismaService.task.create.mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto);

      expect(result).toEqual(createdTask);
      expect(mockPrismaService.task.findFirst).toHaveBeenCalledWith({
        where: {
          serviceOrderId: createTaskDto.serviceOrderId,
          taskType: createTaskDto.taskType,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      });
      expect(mockAssignmentService.autoAssignTask).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalledTimes(2); // CREATED + ASSIGNED
      expect(mockKafkaProducer.produce).toHaveBeenCalled();
    });

    it('should throw BadRequestException if duplicate active task exists', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue({
        id: 'existing_task',
        taskType: createTaskDto.taskType,
        serviceOrderId: createTaskDto.serviceOrderId,
        status: TaskStatus.OPEN,
      });

      await expect(service.create(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if service order not found', async () => {
      mockPrismaService.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.create(createTaskDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create task with manual assignment', async () => {
      const dtoWithAssignment = {
        ...createTaskDto,
        assignedTo: 'user_789',
      };

      mockPrismaService.task.create.mockResolvedValue({
        id: 'task_456',
        ...dtoWithAssignment,
        status: TaskStatus.ASSIGNED,
      });

      await service.create(dtoWithAssignment, 'admin_user');

      expect(mockAssignmentService.autoAssignTask).not.toHaveBeenCalled();
      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedTo: 'user_789',
            assignedBy: 'admin_user',
          }),
        }),
      );
    });
  });

  describe('complete', () => {
    const taskId = 'task_123';
    const task = {
      id: taskId,
      taskType: TaskType.PRE_FLIGHT_FAILURE,
      status: TaskStatus.IN_PROGRESS,
      serviceOrderId: 'so_123',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    };

    const completeDto = {
      resolutionNotes: 'Payment confirmed, issue resolved',
    };

    beforeEach(() => {
      mockPrismaService.task.findUnique.mockResolvedValue(task);
      mockSlaService.isWithinSla.mockReturnValue(true);
      mockAuditService.logAction.mockResolvedValue(undefined);
      mockKafkaProducer.produce.mockResolvedValue(undefined);
    });

    it('should complete a task successfully', async () => {
      const completedTask = {
        ...task,
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
        completedBy: 'user_123',
        resolutionNotes: completeDto.resolutionNotes,
        resolutionTime: expect.any(Number),
        withinSLA: true,
      };

      mockPrismaService.task.update.mockResolvedValue(completedTask);

      const result = await service.complete(taskId, completeDto, 'user_123');

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(mockSlaService.isWithinSla).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        taskId,
        'COMPLETED',
        'user_123',
        expect.any(Object),
        completeDto.resolutionNotes,
      );
      expect(mockKafkaProducer.produce).toHaveBeenCalled();
    });

    it('should throw BadRequestException if task is not in valid status', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      await expect(
        service.complete(taskId, completeDto, 'user_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark task as SLA breached if completed late', async () => {
      mockSlaService.isWithinSla.mockReturnValue(false);

      const completedTask = {
        ...task,
        status: TaskStatus.COMPLETED,
        withinSLA: false,
      };

      mockPrismaService.task.update.mockResolvedValue(completedTask);

      const result = await service.complete(taskId, completeDto, 'user_123');

      expect(result.withinSLA).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks with filters', async () => {
      const queryDto = {
        status: [TaskStatus.OPEN, TaskStatus.ASSIGNED],
        priority: [TaskPriority.URGENT],
        page: 1,
        pageSize: 20,
        sortBy: 'slaDeadline',
        sortOrder: 'asc' as const,
      };

      const tasks = [
        {
          id: 'task_1',
          taskType: TaskType.PRE_FLIGHT_FAILURE,
          priority: TaskPriority.URGENT,
          status: TaskStatus.OPEN,
        },
        {
          id: 'task_2',
          taskType: TaskType.PAYMENT_FAILED,
          priority: TaskPriority.URGENT,
          status: TaskStatus.ASSIGNED,
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(tasks);
      mockPrismaService.task.count.mockResolvedValue(2);

      const result = await service.findAll(queryDto);

      expect(result.data).toEqual(tasks);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      });
    });
  });

  describe('getOperatorDashboard', () => {
    it('should return operator dashboard data', async () => {
      const operatorId = 'user_123';

      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(5);

      const result = await service.getOperatorDashboard(operatorId);

      expect(result).toHaveProperty('myTasks');
      expect(result).toHaveProperty('upcomingSLAs');
      expect(result).toHaveProperty('escalated');
      expect(result).toHaveProperty('recentlyCompleted');
      expect(result).toHaveProperty('statistics');
      expect(result.statistics).toHaveProperty('completedToday');
      expect(result.statistics).toHaveProperty('averageResolutionTime');
      expect(result.statistics).toHaveProperty('slaComplianceRate');
    });
  });

  describe('assign', () => {
    const taskId = 'task_123';
    const task = {
      id: taskId,
      status: TaskStatus.OPEN,
    };

    const assignDto = {
      assignedTo: 'user_456',
    };

    beforeEach(() => {
      mockPrismaService.task.findUnique.mockResolvedValue(task);
      mockAuditService.logAction.mockResolvedValue(undefined);
      mockKafkaProducer.produce.mockResolvedValue(undefined);
    });

    it('should assign task to operator', async () => {
      const assignedTask = {
        ...task,
        status: TaskStatus.ASSIGNED,
        assignedTo: 'user_456',
        assignedBy: 'manager_123',
        assignedAt: expect.any(Date),
      };

      mockPrismaService.task.update.mockResolvedValue(assignedTask);

      const result = await service.assign(taskId, assignDto, 'manager_123');

      expect(result.assignedTo).toBe('user_456');
      expect(result.status).toBe(TaskStatus.ASSIGNED);
      expect(mockAuditService.logAction).toHaveBeenCalled();
      expect(mockKafkaProducer.produce).toHaveBeenCalled();
    });

    it('should throw BadRequestException if task is not in valid status', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      await expect(
        service.assign(taskId, assignDto, 'manager_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
