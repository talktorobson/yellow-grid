import { Test, TestingModule } from '@nestjs/testing';
import { TaskSlaService } from './task-sla.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TaskPriority } from '@prisma/client';

describe('TaskSlaService', () => {
  let service: TaskSlaService;
  let prisma: PrismaService;

  const mockPrismaService = {
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskSlaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TaskSlaService>(TaskSlaService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateSlaDeadline', () => {
    it('should calculate 2-hour deadline for CRITICAL priority', () => {
      const now = new Date('2025-01-20T10:00:00Z');
      const deadline = service.calculateSlaDeadline(TaskPriority.CRITICAL, now);

      expect(deadline.getTime()).toBe(now.getTime() + 2 * 60 * 60 * 1000);
    });

    it('should calculate 4-hour deadline for URGENT priority', () => {
      const now = new Date('2025-01-20T10:00:00Z');
      const deadline = service.calculateSlaDeadline(TaskPriority.URGENT, now);

      expect(deadline.getTime()).toBe(now.getTime() + 4 * 60 * 60 * 1000);
    });

    it('should calculate 8-hour deadline for HIGH priority', () => {
      const now = new Date('2025-01-20T10:00:00Z');
      const deadline = service.calculateSlaDeadline(TaskPriority.HIGH, now);

      expect(deadline.getTime()).toBe(now.getTime() + 8 * 60 * 60 * 1000);
    });

    it('should calculate 16-hour deadline for MEDIUM priority', () => {
      const now = new Date('2025-01-20T10:00:00Z');
      const deadline = service.calculateSlaDeadline(TaskPriority.MEDIUM, now);

      expect(deadline.getTime()).toBe(now.getTime() + 16 * 60 * 60 * 1000);
    });

    it('should calculate 40-hour deadline for LOW priority', () => {
      const now = new Date('2025-01-20T10:00:00Z');
      const deadline = service.calculateSlaDeadline(TaskPriority.LOW, now);

      expect(deadline.getTime()).toBe(now.getTime() + 40 * 60 * 60 * 1000);
    });
  });

  describe('calculateSlaPercentage', () => {
    it('should calculate 50% when halfway through SLA', () => {
      const createdAt = new Date('2025-01-20T10:00:00Z');
      const slaDeadline = new Date('2025-01-20T14:00:00Z'); // 4 hours
      const task = {
        createdAt,
        slaDeadline,
        slaPaused: false,
        slaPausedAt: null,
      };

      // Mock current time to be 2 hours after creation (50% of 4-hour SLA)
      jest.spyOn(global, 'Date').mockImplementation(() => {
        return new Date('2025-01-20T12:00:00Z') as any;
      });

      const percentage = service.calculateSlaPercentage(task);

      expect(percentage).toBe(50);
    });

    it('should calculate 100% when SLA deadline reached', () => {
      const createdAt = new Date('2025-01-20T10:00:00Z');
      const slaDeadline = new Date('2025-01-20T14:00:00Z');
      const task = {
        createdAt,
        slaDeadline,
        slaPaused: false,
        slaPausedAt: null,
      };

      jest.spyOn(global, 'Date').mockImplementation(() => {
        return new Date('2025-01-20T14:00:00Z') as any;
      });

      const percentage = service.calculateSlaPercentage(task);

      expect(percentage).toBe(100);
    });

    it('should use pause time instead of now when paused', () => {
      const createdAt = new Date('2025-01-20T10:00:00Z');
      const slaDeadline = new Date('2025-01-20T14:00:00Z');
      const slaPausedAt = new Date('2025-01-20T11:00:00Z'); // Paused at 25%

      const task = {
        createdAt,
        slaDeadline,
        slaPaused: true,
        slaPausedAt,
      };

      jest.spyOn(global, 'Date').mockImplementation(() => {
        return new Date('2025-01-20T16:00:00Z') as any; // Current time is way past deadline
      });

      const percentage = service.calculateSlaPercentage(task);

      expect(percentage).toBe(25); // Should use pause time, not current time
    });
  });

  describe('isWithinSla', () => {
    it('should return true if completed before deadline', () => {
      const completedAt = new Date('2025-01-20T12:00:00Z');
      const slaDeadline = new Date('2025-01-20T14:00:00Z');

      expect(service.isWithinSla(completedAt, slaDeadline)).toBe(true);
    });

    it('should return false if completed after deadline', () => {
      const completedAt = new Date('2025-01-20T15:00:00Z');
      const slaDeadline = new Date('2025-01-20T14:00:00Z');

      expect(service.isWithinSla(completedAt, slaDeadline)).toBe(false);
    });

    it('should return true if completed exactly at deadline', () => {
      const completedAt = new Date('2025-01-20T14:00:00Z');
      const slaDeadline = new Date('2025-01-20T14:00:00Z');

      expect(service.isWithinSla(completedAt, slaDeadline)).toBe(true);
    });
  });

  describe('pauseSla', () => {
    it('should pause SLA with reason', async () => {
      const taskId = 'task_123';
      const reason = 'Waiting for customer response';

      await service.pauseSla(taskId, reason);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          slaPaused: true,
          slaPausedAt: expect.any(Date),
          slaPauseReason: reason,
        },
      });
    });
  });

  describe('resumeSla', () => {
    it('should resume SLA and extend deadline by paused duration', async () => {
      const taskId = 'task_123';
      const pausedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const slaDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      mockPrismaService.task.findUnique.mockResolvedValue({
        id: taskId,
        slaPaused: true,
        slaPausedAt: pausedAt,
        slaDeadline,
        totalPausedMinutes: 0,
      });

      await service.resumeSla(taskId);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          slaPaused: false,
          slaDeadline: expect.any(Date),
          totalPausedMinutes: expect.any(Number),
        },
      });

      // Verify the deadline was extended
      const updateCall = mockPrismaService.task.update.mock.calls[0][0];
      const newDeadline = updateCall.data.slaDeadline;
      expect(newDeadline.getTime()).toBeGreaterThan(slaDeadline.getTime());
    });

    it('should not update if task is not paused', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        id: 'task_123',
        slaPaused: false,
      });

      await service.resumeSla('task_123');

      expect(mockPrismaService.task.update).not.toHaveBeenCalled();
    });
  });
});
