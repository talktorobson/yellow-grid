import { AssignmentsService } from './assignments.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AssignmentMode, AssignmentState, ServiceOrderState } from '@prisma/client';

describe('AssignmentsService', () => {
  const mockPrisma = {
    serviceOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assignment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assignmentFunnelExecution: {
      findUnique: jest.fn(),
    },
  };

  let service: AssignmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssignmentsService(mockPrisma as unknown as PrismaService);
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({
      id: 'so1',
      countryCode: 'ES',
    });
    mockPrisma.assignment.create.mockImplementation(({ data }) => ({ id: `a-${data.providerId}`, ...data }));
  });

  it('creates direct assignment and auto-accepts', async () => {
    const result = await service.createAssignments({
      serviceOrderId: 'so1',
      providerIds: ['p1'],
      mode: AssignmentMode.DIRECT,
    });

    expect(result[0].state).toBe(AssignmentState.ACCEPTED);
    expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: ServiceOrderState.ACCEPTED,
        }),
      }),
    );
  });

  it('creates offer assignment without auto-accept', async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({
      id: 'so1',
      countryCode: 'FR',
    });

    const assignments = await service.createAssignments({
      serviceOrderId: 'so1',
      providerIds: ['p1'],
      mode: AssignmentMode.OFFER,
    });

    expect(assignments[0].state).toBe(AssignmentState.OFFERED);
  });

  it('accepts assignment and updates service order', async () => {
    mockPrisma.assignment.findUnique.mockResolvedValue({
      id: 'a1',
      providerId: 'p1',
      workTeamId: 'w1',
      serviceOrderId: 'so1',
    });
    mockPrisma.assignment.update.mockResolvedValue({ id: 'a1', state: AssignmentState.ACCEPTED });

    const updated = await service.acceptAssignment('a1');

    expect(updated.state).toBe(AssignmentState.ACCEPTED);
    expect(mockPrisma.serviceOrder.update).toHaveBeenCalled();
  });

  describe('getAssignmentFunnel', () => {
    it('returns funnel execution data for assignment with funnel', async () => {
      const mockFunnelData = {
        id: 'funnel1',
        serviceOrderId: 'so1',
        requestedDate: new Date('2025-01-20T10:00:00Z'),
        requestedSlot: 'AM',
        totalProvidersEvaluated: 25,
        eligibleProviders: 10,
        funnelSteps: [
          {
            step: 'eligibility.specialties',
            workTeamId: 'wt1',
            providerId: 'p1',
            passed: true,
            reasons: ['eligible'],
          },
        ],
        executionTimeMs: 156,
        executedAt: new Date('2025-01-18T14:30:00Z'),
        executedBy: 'operator@example.com',
      };

      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'a1',
        funnelExecutionId: 'funnel1',
        serviceOrderId: 'so1',
      });
      mockPrisma.assignmentFunnelExecution.findUnique.mockResolvedValue(mockFunnelData);

      const result = await service.getAssignmentFunnel('a1');

      expect(result).toEqual(mockFunnelData);
      expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'a1' },
        select: { funnelExecutionId: true, serviceOrderId: true },
      });
      expect(mockPrisma.assignmentFunnelExecution.findUnique).toHaveBeenCalledWith({
        where: { id: 'funnel1' },
      });
    });

    it('throws NotFoundException when assignment not found', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue(null);

      await expect(service.getAssignmentFunnel('invalid-id')).rejects.toThrow('Assignment not found');
    });

    it('throws NotFoundException when assignment has no funnel execution', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'a1',
        funnelExecutionId: null,
        serviceOrderId: 'so1',
      });

      await expect(service.getAssignmentFunnel('a1')).rejects.toThrow(
        'No funnel execution data available for this assignment',
      );
    });

    it('throws NotFoundException when funnel execution not found', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'a1',
        funnelExecutionId: 'funnel1',
        serviceOrderId: 'so1',
      });
      mockPrisma.assignmentFunnelExecution.findUnique.mockResolvedValue(null);

      await expect(service.getAssignmentFunnel('a1')).rejects.toThrow('Funnel execution not found');
    });
  });

  describe('createAssignments with funnel tracking', () => {
    it('creates assignments with funnel execution ID and scores', async () => {
      const funnelExecutionId = 'funnel1';
      const providerScores = {
        p1: { score: 0.85, scoreBreakdown: { capacity: 0.8, quality: 0.9, distance: 0.5 } },
      };

      const result = await service.createAssignments({
        serviceOrderId: 'so1',
        providerIds: ['p1'],
        mode: AssignmentMode.OFFER,
        funnelExecutionId,
        providerScores,
      });

      expect(mockPrisma.assignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          funnelExecutionId,
          providerScore: 0.85,
          scoreBreakdown: { capacity: 0.8, quality: 0.9, distance: 0.5 },
        }),
      });
    });
  });
});
