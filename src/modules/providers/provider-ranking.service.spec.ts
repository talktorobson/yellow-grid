import { ProviderRankingService } from './provider-ranking.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('ProviderRankingService', () => {
  const mockPrisma = {
    serviceSkillRequirement: {
      findMany: jest.fn(),
    },
    workTeam: {
      findMany: jest.fn(),
    },
    assignmentFunnelExecution: {
      create: jest.fn(),
    },
  };

  let service: ProviderRankingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderRankingService(mockPrisma as unknown as PrismaService);
  });

  it('filters out candidates missing required specialties', async () => {
    mockPrisma.serviceSkillRequirement.findMany.mockResolvedValue([{ specialtyId: 's1' }]);
    mockPrisma.workTeam.findMany.mockResolvedValue([
      {
        id: 'wt1',
        providerId: 'p1',
        maxDailyJobs: 5,
        specialtyAssignments: [{ specialtyId: 's2', totalJobsCompleted: 0, avgQualityScore: null }],
        postalCodes: ['28001'],
      },
    ]);

    const { rankings } = await service.rankCandidates({
      serviceId: 'svc',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      requiredDurationMinutes: 60,
    });

    expect(rankings).toHaveLength(0);
  });

  it('scores eligible candidates', async () => {
    mockPrisma.serviceSkillRequirement.findMany.mockResolvedValue([{ specialtyId: 's1' }]);
    mockPrisma.workTeam.findMany.mockResolvedValue([
      {
        id: 'wt1',
        providerId: 'p1',
        maxDailyJobs: 5,
        specialtyAssignments: [
          { specialtyId: 's1', totalJobsCompleted: 2, avgQualityScore: 4.5 },
        ],
        postalCodes: ['28001'],
      },
    ]);

    const { rankings, funnel } = await service.rankCandidates({
      serviceId: 'svc',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      postalCode: '28001',
      requiredDurationMinutes: 60,
      serviceOrderId: 'so-1',
      executedBy: 'tester',
    });

    expect(rankings).toHaveLength(1);
    expect(rankings[0].workTeamId).toBe('wt1');
    expect(rankings[0].score).toBeGreaterThan(0);
    expect(funnel.some((step) => step.workTeamId === 'wt1' && step.passed)).toBe(true);
    expect(mockPrisma.assignmentFunnelExecution.create).toHaveBeenCalled();
  });
});
