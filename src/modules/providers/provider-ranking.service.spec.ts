import { ProviderRankingService } from './provider-ranking.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DistanceCalculationService } from '@/common/distance';
import { Decimal } from '@prisma/client/runtime/library';

describe('ProviderRankingService', () => {
  const mockPrisma = {
    serviceSkillRequirement: {
      findMany: jest.fn(),
    },
    workTeam: {
      findMany: jest.fn(),
    },
    postalCode: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    assignmentFunnelExecution: {
      create: jest.fn(),
    },
  };

  const mockDistanceService = {
    calculateDistance: jest.fn(),
    calculateDistanceScore: jest.fn(),
    decimalToCoordinates: jest.fn(),
  };

  let service: ProviderRankingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderRankingService(
      mockPrisma as unknown as PrismaService,
      mockDistanceService as unknown as DistanceCalculationService,
    );
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
        specialtyAssignments: [{ specialtyId: 's1', totalJobsCompleted: 2, avgQualityScore: 4.5 }],
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

  describe('Distance Calculation Integration', () => {
    beforeEach(() => {
      // Setup default mocks for distance calculation
      mockPrisma.postalCode.findFirst.mockResolvedValue({
        latitude: new Decimal('40.4168'),
        longitude: new Decimal('-3.7038'),
      });

      mockPrisma.postalCode.findMany.mockResolvedValue([
        {
          code: '28001',
          latitude: new Decimal('40.4168'),
          longitude: new Decimal('-3.7038'),
        },
      ]);

      mockDistanceService.decimalToCoordinates.mockReturnValue({
        latitude: 40.4168,
        longitude: -3.7038,
      });

      mockDistanceService.calculateDistance.mockResolvedValue({
        distanceKm: 5.2,
        method: 'haversine',
        calculatedAt: new Date(),
      });

      mockDistanceService.calculateDistanceScore.mockReturnValue(20); // 0-10 km = 20 points
    });

    it('should calculate distance and include distanceKm in results', async () => {
      mockPrisma.serviceSkillRequirement.findMany.mockResolvedValue([{ specialtyId: 's1' }]);
      mockPrisma.workTeam.findMany.mockResolvedValue([
        {
          id: 'wt1',
          providerId: 'p1',
          maxDailyJobs: 5,
          specialtyAssignments: [
            { specialtyId: 's1', totalJobsCompleted: 2, avgQualityScore: 4.5 },
          ],
          postalCodes: ['28001', '28002'],
        },
      ]);

      const { rankings } = await service.rankCandidates({
        serviceId: 'svc',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        postalCode: '28002',
        requiredDurationMinutes: 60,
      });

      expect(rankings).toHaveLength(1);
      expect(rankings[0].distanceKm).toBe(5.2);
      expect(rankings[0].distanceScore).toBeGreaterThan(0.5); // Should be better than default
      expect(mockDistanceService.calculateDistance).toHaveBeenCalled();
      expect(mockDistanceService.calculateDistanceScore).toHaveBeenCalledWith(5.2);
    });

    it('should use default distance score when coordinates are unavailable', async () => {
      mockPrisma.postalCode.findFirst.mockResolvedValue({
        latitude: null,
        longitude: null,
      });

      mockPrisma.serviceSkillRequirement.findMany.mockResolvedValue([{ specialtyId: 's1' }]);
      mockPrisma.workTeam.findMany.mockResolvedValue([
        {
          id: 'wt1',
          providerId: 'p1',
          maxDailyJobs: 5,
          specialtyAssignments: [
            { specialtyId: 's1', totalJobsCompleted: 2, avgQualityScore: 4.5 },
          ],
          postalCodes: ['28001', '28002'],
        },
      ]);

      const { rankings } = await service.rankCandidates({
        serviceId: 'svc',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        postalCode: '28002',
        requiredDurationMinutes: 60,
      });

      expect(rankings).toHaveLength(1);
      expect(rankings[0].distanceKm).toBeUndefined();
      expect(rankings[0].distanceScore).toBe(0.5); // Default neutral score
    });

    it('should rank closer providers higher', async () => {
      mockPrisma.serviceSkillRequirement.findMany.mockResolvedValue([{ specialtyId: 's1' }]);
      mockPrisma.workTeam.findMany.mockResolvedValue([
        {
          id: 'wt1',
          providerId: 'p1',
          maxDailyJobs: 5,
          specialtyAssignments: [
            { specialtyId: 's1', totalJobsCompleted: 2, avgQualityScore: 4.0 },
          ],
          postalCodes: ['28001', '28002'],
        },
        {
          id: 'wt2',
          providerId: 'p2',
          maxDailyJobs: 5,
          specialtyAssignments: [
            { specialtyId: 's1', totalJobsCompleted: 2, avgQualityScore: 4.0 },
          ],
          postalCodes: ['28050', '28002'],
        },
      ]);

      // Mock different distances for each work team
      mockDistanceService.calculateDistance
        .mockResolvedValueOnce({
          distanceKm: 5.0, // wt1 - close
          method: 'haversine',
          calculatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          distanceKm: 60.0, // wt2 - far
          method: 'haversine',
          calculatedAt: new Date(),
        });

      mockDistanceService.calculateDistanceScore
        .mockReturnValueOnce(20) // 5km = 20 points
        .mockReturnValueOnce(5); // 60km = 5 points

      const { rankings } = await service.rankCandidates({
        serviceId: 'svc',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        postalCode: '28002',
        requiredDurationMinutes: 60,
      });

      expect(rankings).toHaveLength(2);
      // wt1 should rank higher due to closer distance
      expect(rankings[0].workTeamId).toBe('wt1');
      expect(rankings[0].distanceKm).toBe(5.0);
      expect(rankings[1].workTeamId).toBe('wt2');
      expect(rankings[1].distanceKm).toBe(60.0);
    });

    it('should calculate distance to nearest covered postal code', async () => {
      // Work team covers multiple postal codes
      mockPrisma.postalCode.findMany.mockResolvedValue([
        {
          code: '28001',
          latitude: new Decimal('40.4168'),
          longitude: new Decimal('-3.7038'),
        },
        {
          code: '28002',
          latitude: new Decimal('40.4200'),
          longitude: new Decimal('-3.7000'),
        },
      ]);

      mockDistanceService.calculateDistance
        .mockResolvedValueOnce({
          distanceKm: 10.0, // Distance to 28001
          method: 'haversine',
          calculatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          distanceKm: 2.0, // Distance to 28002 (closer)
          method: 'haversine',
          calculatedAt: new Date(),
        });

      mockDistanceService.calculateDistanceScore.mockReturnValue(20);

      mockPrisma.serviceSkillRequirement.findMany.mockResolvedValue([{ specialtyId: 's1' }]);
      mockPrisma.workTeam.findMany.mockResolvedValue([
        {
          id: 'wt1',
          providerId: 'p1',
          maxDailyJobs: 5,
          specialtyAssignments: [
            { specialtyId: 's1', totalJobsCompleted: 2, avgQualityScore: 4.0 },
          ],
          postalCodes: ['28001', '28002'],
        },
      ]);

      const { rankings } = await service.rankCandidates({
        serviceId: 'svc',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        postalCode: '28002',
        requiredDurationMinutes: 60,
      });

      expect(rankings).toHaveLength(1);
      // Should use minimum distance (2.0 km to 28002)
      expect(rankings[0].distanceKm).toBe(2.0);
      expect(mockDistanceService.calculateDistance).toHaveBeenCalledTimes(2);
    });
  });
});
