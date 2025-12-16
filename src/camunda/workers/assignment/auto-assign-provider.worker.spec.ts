import { AutoAssignProviderWorker } from './auto-assign-provider.worker';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('AutoAssignProviderWorker', () => {
  let worker: AutoAssignProviderWorker;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      serviceOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      servicePriorityConfig: {
        findFirst: jest.fn(),
      },
      assignment: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    worker = new AutoAssignProviderWorker(mockPrisma as unknown as PrismaService);
  });

  describe('handle', () => {
    const validInput = {
      serviceOrderId: 'so-123',
      countryCode: 'ES',
      urgency: 'STANDARD' as const,
      rankedProviders: [
        {
          providerId: 'provider-1',
          providerName: 'Top Provider',
          workTeamId: 'team-1',
          rank: 1,
          finalScore: 95,
        },
        {
          providerId: 'provider-2',
          providerName: 'Second Provider',
          workTeamId: 'team-2',
          rank: 2,
          finalScore: 85,
        },
      ],
    };

    it('auto-assigns provider with P1 priority service', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        priority: 'P1',
      });

      mockPrisma.assignment.create.mockResolvedValue({
        id: 'assignment-123',
        state: 'ACCEPTED',
      });

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.autoAssigned).toBe(true);
      expect(result.assignedProviderId).toBe('provider-1');
      expect(result.assignmentReason).toContain('P1 priority');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('auto-assigns in AUTO_ACCEPT country mode', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue(null); // No P1 priority

      mockPrisma.assignment.create.mockResolvedValue({
        id: 'assignment-123',
        state: 'ACCEPTED',
      });

      const result = await worker.handle({
        variables: {
          ...validInput,
          countryCode: 'IT', // AUTO_ACCEPT country (ES and IT)
        },
      } as any);

      expect(result.autoAssigned).toBe(true);
      expect(result.assignmentReason).toContain('AUTO_ACCEPT mode');
    });

    it('auto-assigns URGENT order with high score provider', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue(null);

      mockPrisma.assignment.create.mockResolvedValue({
        id: 'assignment-123',
        state: 'ACCEPTED',
      });

      const result = await worker.handle({
        variables: {
          ...validInput,
          countryCode: 'FR', // Not AUTO_ACCEPT country
          urgency: 'URGENT',
          rankedProviders: [
            {
              providerId: 'provider-urgent',
              providerName: 'Top Provider',
              workTeamId: 'team-1',
              rank: 1,
              finalScore: 92, // High score >= 90
            },
          ],
        },
      } as any);

      expect(result.autoAssigned).toBe(true);
      expect(result.assignmentReason).toContain('Urgent');
    });

    it('does not auto-assign URGENT order with low score', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue(null);

      const result = await worker.handle({
        variables: {
          ...validInput,
          countryCode: 'FR', // Not AUTO_ACCEPT country
          urgency: 'URGENT',
          rankedProviders: [
            {
              providerId: 'provider-1',
              providerName: 'Low Score Provider',
              workTeamId: 'team-1',
              rank: 1,
              finalScore: 70, // Below 90 threshold
            },
          ],
        },
      } as any);

      expect(result.autoAssigned).toBe(false);
    });

    it('does not auto-assign when no eligible providers', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue(null);

      const result = await worker.handle({
        variables: {
          ...validInput,
          countryCode: 'FR', // Not AUTO_ACCEPT
          urgency: 'STANDARD', // Not URGENT
        },
      } as any);

      expect(result.autoAssigned).toBe(false);
      expect(result.autoAssignFailReason).toBe('No auto-assign eligible providers - offer required');
    });

    it('returns error when service order not found', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.autoAssigned).toBe(false);
      expect(result.autoAssignFailReason).toBe('Service order not found');
    });

    it('handles empty provider list', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      const result = await worker.handle({
        variables: {
          ...validInput,
          rankedProviders: [],
        },
      } as any);

      expect(result.autoAssigned).toBe(false);
    });

    it('creates assignment with correct data', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        priority: 'P1',
      });

      mockPrisma.assignment.create.mockResolvedValue({
        id: 'assignment-123',
        state: 'ACCEPTED',
      });

      await worker.handle({
        variables: validInput,
      } as any);

      expect(mockPrisma.assignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serviceOrderId: 'so-123',
          providerId: 'provider-1',
          workTeamId: 'team-1',
          assignmentMethod: 'AUTO',
          providerRank: 1,
          providerScore: 95,
          state: 'ACCEPTED',
          scoreBreakdown: Prisma.DbNull,
        }),
      });
    });

    it('updates service order state to ASSIGNED', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-123',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        priority: 'P1',
      });

      mockPrisma.assignment.create.mockResolvedValue({
        id: 'assignment-123',
        state: 'ACCEPTED',
      });

      await worker.handle({
        variables: validInput,
      } as any);

      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
        where: { id: 'so-123' },
        data: {
          assignedProviderId: 'provider-1',
          state: 'ASSIGNED',
        },
      });
    });

    it('checks P1 priority with service mapping', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        serviceId: 'svc-hvac',
      });

      mockPrisma.servicePriorityConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        priority: 'P1',
      });

      mockPrisma.assignment.create.mockResolvedValue({
        id: 'assignment-123',
        state: 'ACCEPTED',
      });

      await worker.handle({
        variables: validInput,
      } as any);

      expect(mockPrisma.servicePriorityConfig.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          providerId: 'provider-1',
          specialty: {
            serviceMappings: {
              some: {
                serviceId: 'svc-hvac',
              },
            },
          },
          priority: 'P1',
        }),
      });
    });
  });
});
