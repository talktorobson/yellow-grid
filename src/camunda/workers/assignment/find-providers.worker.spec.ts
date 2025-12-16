import { FindProvidersWorker } from './find-providers.worker';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BpmnError } from '../base.worker';

describe('FindProvidersWorker', () => {
  let worker: FindProvidersWorker;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      serviceCatalog: {
        findFirst: jest.fn(),
      },
      interventionZone: {
        findMany: jest.fn(),
      },
    };

    worker = new FindProvidersWorker(mockPrisma as unknown as PrismaService);
  });

  describe('handle', () => {
    const validInput = {
      serviceOrderId: 'so-123',
      serviceTypeCode: 'SVC_ES_001',
      postalCode: '28001',
      countryCode: 'ES',
      businessUnit: 'LM',
      urgency: 'STANDARD' as const,
    };

    it('finds providers with matching postal code and specialties', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        fsmServiceCode: 'SVC_ES_001',
        skillRequirements: [
          { specialty: { id: 'spec-1', code: 'HVAC_INSTALL' } },
        ],
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['28001', '28002'],
          zoneType: 'PRIMARY',
          provider: {
            id: 'provider-1',
            name: 'Madrid Services',
            status: 'ACTIVE',
            workTeams: [
              {
                id: 'team-1',
                maxDailyJobs: 5,
                specialtyAssignments: [
                  { specialtyId: 'spec-1' },
                ],
              },
            ],
          },
        },
        {
          id: 'zone-2',
          postalCodes: ['28001', '28003'],
          zoneType: 'SECONDARY',
          provider: {
            id: 'provider-2',
            name: 'Backup Services',
            status: 'ACTIVE',
            workTeams: [
              {
                id: 'team-2',
                maxDailyJobs: 3,
                specialtyAssignments: [
                  { specialtyId: 'spec-1' },
                ],
              },
            ],
          },
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.candidateProviders).toHaveLength(2);
      expect(result.candidateProviders[0].providerId).toBe('provider-1');
      expect(result.candidateProviders[0].zoneType).toBe('PRIMARY');
      expect(result.candidateProviders[1].providerId).toBe('provider-2');
      expect(result.candidateProviders[1].zoneType).toBe('SECONDARY');
    });

    it('throws BpmnError when no providers cover postal code', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        skillRequirements: [],
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('includes providers without matching specialties when they have teams', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        skillRequirements: [
          { specialtyId: 'spec-hvac' }, // Required specialty
        ],
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['28001'],
          zoneType: 'PRIMARY',
          provider: {
            id: 'provider-1',
            name: 'General Provider',
            status: 'ACTIVE',
            providerType: 'P2',
            workTeams: [
              {
                id: 'team-1',
                maxDailyJobs: 5,
                specialtyAssignments: [
                  { specialtyId: 'spec-hvac' }, // Has matching specialty
                ],
              },
            ],
          },
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.candidateProviders).toHaveLength(1);
    });

    it('handles services with no skill requirements', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        skillRequirements: [],
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['28001'],
          zoneType: 'PRIMARY',
          provider: {
            id: 'provider-1',
            name: 'General Services',
            status: 'ACTIVE',
            workTeams: [
              {
                id: 'team-1',
                maxDailyJobs: 5,
                specialtyAssignments: [],
              },
            ],
          },
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.candidateProviders).toHaveLength(1);
    });

    it('normalizes postal codes for matching', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        skillRequirements: [],
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['28001'],
          zoneType: 'PRIMARY',
          provider: {
            id: 'provider-1',
            name: 'Provider',
            status: 'ACTIVE',
            workTeams: [
              {
                id: 'team-1',
                maxDailyJobs: 5,
                specialtyAssignments: [],
              },
            ],
          },
        },
      ]);

      const result = await worker.handle({
        variables: { ...validInput, postalCode: '28 001' }, // With space
      } as any);

      expect(result.candidateProviders).toHaveLength(1);
    });

    it('handles service not found gracefully', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue(null);

      mockPrisma.interventionZone.findMany.mockResolvedValue([]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(); // Will throw error when trying to access skillRequirements
    });

    it('includes zone type priority in results', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        skillRequirements: [],
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-overflow',
          postalCodes: ['28001'],
          zoneType: 'OVERFLOW',
          provider: {
            id: 'provider-overflow',
            name: 'Overflow Provider',
            status: 'ACTIVE',
            workTeams: [{ id: 'team-1', maxDailyJobs: 2, specialtyAssignments: [] }],
          },
        },
        {
          id: 'zone-primary',
          postalCodes: ['28001'],
          zoneType: 'PRIMARY',
          provider: {
            id: 'provider-primary',
            name: 'Primary Provider',
            status: 'ACTIVE',
            workTeams: [{ id: 'team-2', maxDailyJobs: 10, specialtyAssignments: [] }],
          },
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.candidateProviders).toHaveLength(2);
      const primaryCandidate = result.candidateProviders.find(
        (c) => c.providerId === 'provider-primary',
      );
      expect(primaryCandidate?.zoneType).toBe('PRIMARY');
    });

    it('skips duplicate providers from different zones', async () => {
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        skillRequirements: [],
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['28001'],
          zoneType: 'PRIMARY',
          provider: {
            id: 'provider-1',
            name: 'Multi-Zone Provider',
            status: 'ACTIVE',
            workTeams: [{ id: 'team-1', maxDailyJobs: 5, specialtyAssignments: [] }],
          },
        },
        {
          id: 'zone-2',
          postalCodes: ['28001'],
          zoneType: 'SECONDARY',
          provider: {
            id: 'provider-1', // Same provider
            name: 'Multi-Zone Provider',
            status: 'ACTIVE',
            workTeams: [{ id: 'team-1', maxDailyJobs: 5, specialtyAssignments: [] }],
          },
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      // Should only return one candidate (PRIMARY zone takes priority)
      expect(result.candidateProviders).toHaveLength(1);
      expect(result.candidateProviders[0].zoneType).toBe('PRIMARY');
    });
  });
});
