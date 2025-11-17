import { Test, TestingModule } from '@nestjs/testing';
import { ProviderSpecialtyService } from '../provider-specialty.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ServiceCategory, ExperienceLevel } from '@prisma/client';

describe('ProviderSpecialtyService', () => {
  let service: ProviderSpecialtyService;
  let prisma: PrismaService;

  const mockPrismaService = {
    providerSpecialty: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    providerSpecialtyAssignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    serviceSkillRequirement: {
      findMany: jest.fn(),
    },
    workTeam: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderSpecialtyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProviderSpecialtyService>(ProviderSpecialtyService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findSpecialtyByCode', () => {
    const mockSpecialty = {
      id: 'specialty-1',
      code: 'HVAC_INSTALL',
      name: 'HVAC Installation',
      category: ServiceCategory.HVAC,
      requiresCertification: true,
      serviceMappings: [],
    };

    it('should return specialty by code', async () => {
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue(
        mockSpecialty,
      );

      const result = await service.findSpecialtyByCode('HVAC_INSTALL');

      expect(result).toEqual(mockSpecialty);
      expect(prisma.providerSpecialty.findUnique).toHaveBeenCalledWith({
        where: { code: 'HVAC_INSTALL' },
        include: {
          serviceMappings: {
            include: {
              service: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if specialty not found', async () => {
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue(null);

      await expect(
        service.findSpecialtyByCode('NON_EXISTENT'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllSpecialties', () => {
    const mockSpecialties = [
      {
        id: 'specialty-1',
        code: 'HVAC_INSTALL',
        name: 'HVAC Installation',
        category: ServiceCategory.HVAC,
        serviceMappings: [],
      },
      {
        id: 'specialty-2',
        code: 'PLUMB_REPAIR',
        name: 'Plumbing Repair',
        category: ServiceCategory.PLUMBING,
        serviceMappings: [],
      },
    ];

    it('should return all specialties', async () => {
      mockPrismaService.providerSpecialty.findMany.mockResolvedValue(
        mockSpecialties,
      );

      const result = await service.findAllSpecialties();

      expect(result).toEqual(mockSpecialties);
      expect(prisma.providerSpecialty.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter by category', async () => {
      const hvacOnly = [mockSpecialties[0]];
      mockPrismaService.providerSpecialty.findMany.mockResolvedValue(hvacOnly);

      const result = await service.findAllSpecialties(ServiceCategory.HVAC);

      expect(result).toEqual(hvacOnly);
      expect(prisma.providerSpecialty.findMany).toHaveBeenCalledWith({
        where: { category: ServiceCategory.HVAC },
        include: expect.any(Object),
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('createSpecialty', () => {
    const specialtyData = {
      code: 'HVAC_INSTALL',
      name: 'HVAC Installation',
      description: 'HVAC installation services',
      category: ServiceCategory.HVAC,
      requiresCertification: true,
      certificationAuthority: 'HVAC Institute',
    };

    it('should create new specialty', async () => {
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue(null);
      mockPrismaService.providerSpecialty.create.mockResolvedValue({
        id: 'specialty-1',
        ...specialtyData,
      });

      const result = await service.createSpecialty(specialtyData);

      expect(result.code).toBe('HVAC_INSTALL');
      expect(prisma.providerSpecialty.create).toHaveBeenCalledWith({
        data: specialtyData,
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue({
        id: 'existing-specialty',
        code: 'HVAC_INSTALL',
      });

      await expect(service.createSpecialty(specialtyData)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('assignSpecialtyToWorkTeam', () => {
    const assignmentData = {
      isCertified: true,
      certificationNumber: 'HVAC-12345',
      certificationIssuedAt: new Date('2024-01-01'),
      certificationExpiresAt: new Date('2026-01-01'),
      experienceLevel: ExperienceLevel.SENIOR,
      yearsOfExperience: 5,
    };

    it('should create new assignment', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.providerSpecialtyAssignment.create.mockResolvedValue({
        id: 'assignment-1',
        workTeamId: 'team-1',
        specialtyId: 'specialty-1',
        ...assignmentData,
        isActive: true,
      });

      const result = await service.assignSpecialtyToWorkTeam(
        'team-1',
        'specialty-1',
        assignmentData,
      );

      expect(result.isActive).toBe(true);
      expect(prisma.providerSpecialtyAssignment.create).toHaveBeenCalledWith({
        data: {
          workTeamId: 'team-1',
          specialtyId: 'specialty-1',
          ...assignmentData,
          isActive: true,
        },
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException if active assignment exists', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        {
          id: 'assignment-1',
          isActive: true,
        },
      );

      await expect(
        service.assignSpecialtyToWorkTeam('team-1', 'specialty-1', assignmentData),
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate inactive assignment', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        {
          id: 'assignment-1',
          isActive: false,
          revokedAt: new Date('2024-01-01'),
          revocationReason: 'Cert expired',
        },
      );
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue({
        id: 'assignment-1',
        ...assignmentData,
        isActive: true,
        revokedAt: null,
        revocationReason: null,
      });

      const result = await service.assignSpecialtyToWorkTeam(
        'team-1',
        'specialty-1',
        assignmentData,
      );

      expect(result.isActive).toBe(true);
      expect(result.revokedAt).toBeNull();
      expect(prisma.providerSpecialtyAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: expect.objectContaining({
          isActive: true,
          revokedAt: null,
          revocationReason: null,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('revokeSpecialtyFromWorkTeam', () => {
    it('should revoke active assignment', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        {
          id: 'assignment-1',
          isActive: true,
        },
      );
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue({
        id: 'assignment-1',
        isActive: false,
        revokedAt: expect.any(Date),
        revocationReason: 'Certification expired',
      });

      const result = await service.revokeSpecialtyFromWorkTeam(
        'team-1',
        'specialty-1',
        'Certification expired',
      );

      expect(result.isActive).toBe(false);
      expect(prisma.providerSpecialtyAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revocationReason: 'Certification expired',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.revokeSpecialtyFromWorkTeam(
          'team-1',
          'specialty-1',
          'Test reason',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already revoked', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        {
          id: 'assignment-1',
          isActive: false,
        },
      );

      await expect(
        service.revokeSpecialtyFromWorkTeam(
          'team-1',
          'specialty-1',
          'Test reason',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkTeamSpecialties', () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        workTeamId: 'team-1',
        specialtyId: 'specialty-1',
        isActive: true,
        specialty: { code: 'HVAC_INSTALL' },
      },
      {
        id: 'assignment-2',
        workTeamId: 'team-1',
        specialtyId: 'specialty-2',
        isActive: false,
        specialty: { code: 'PLUMB_REPAIR' },
      },
    ];

    it('should return active assignments only', async () => {
      const activeOnly = [mockAssignments[0]];
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        activeOnly,
      );

      const result = await service.getWorkTeamSpecialties('team-1', true);

      expect(result).toEqual(activeOnly);
      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: { workTeamId: 'team-1', isActive: true },
        include: { specialty: true },
        orderBy: expect.any(Array),
      });
    });

    it('should return all assignments when activeOnly is false', async () => {
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        mockAssignments,
      );

      const result = await service.getWorkTeamSpecialties('team-1', false);

      expect(result).toEqual(mockAssignments);
      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: { workTeamId: 'team-1' },
        include: { specialty: true },
        orderBy: expect.any(Array),
      });
    });
  });

  describe('getWorkTeamsWithSpecialty', () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        specialtyId: 'specialty-1',
        workTeam: { id: 'team-1', countryCode: 'ES' },
      },
    ];

    it('should return work teams with specialty', async () => {
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        mockAssignments,
      );

      const result = await service.getWorkTeamsWithSpecialty('specialty-1');

      expect(result).toEqual(mockAssignments);
      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: { specialtyId: 'specialty-1', isActive: true },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by country code', async () => {
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        mockAssignments,
      );

      await service.getWorkTeamsWithSpecialty('specialty-1', 'ES');

      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: {
          specialtyId: 'specialty-1',
          isActive: true,
          workTeam: { countryCode: 'ES' },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe('updateCertification', () => {
    const certificationData = {
      isCertified: true,
      certificationNumber: 'HVAC-67890',
      certificationIssuedAt: new Date('2025-01-01'),
      certificationExpiresAt: new Date('2027-01-01'),
    };

    it('should update certification data', async () => {
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue({
        id: 'assignment-1',
        ...certificationData,
      });

      const result = await service.updateCertification(
        'assignment-1',
        certificationData,
      );

      expect(result.certificationNumber).toBe('HVAC-67890');
      expect(prisma.providerSpecialtyAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: certificationData,
        include: expect.any(Object),
      });
    });
  });

  describe('recordJobCompletion', () => {
    it('should calculate new averages for successful job', async () => {
      const existingAssignment = {
        id: 'assignment-1',
        totalJobsCompleted: 10,
        totalJobsFailed: 2,
        avgDurationMinutes: 120,
        avgQualityScore: 4.5,
      };

      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        existingAssignment,
      );
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue({
        ...existingAssignment,
        totalJobsCompleted: 11,
        avgDurationMinutes: 122,
        avgQualityScore: 4.46,
      });

      const jobData = {
        durationMinutes: 150,
        qualityScore: 4.0,
        success: true,
      };

      const result = await service.recordJobCompletion('assignment-1', jobData);

      // (120 * 12 + 150) / 13 = 122.3 → 122 (rounded)
      // (4.5 * 12 + 4.0) / 13 = 4.46
      expect(result.totalJobsCompleted).toBe(11);
      expect(result.avgDurationMinutes).toBe(122);
      expect(result.avgQualityScore).toBe(4.46);
    });

    it('should increment failed count for failed job', async () => {
      const existingAssignment = {
        id: 'assignment-1',
        totalJobsCompleted: 10,
        totalJobsFailed: 2,
        avgDurationMinutes: 120,
        avgQualityScore: 4.5,
      };

      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        existingAssignment,
      );
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue({
        ...existingAssignment,
        totalJobsFailed: 3,
      });

      const jobData = {
        durationMinutes: 150,
        qualityScore: 2.0,
        success: false,
      };

      const result = await service.recordJobCompletion('assignment-1', jobData);

      expect(result.totalJobsFailed).toBe(3);
      expect(result.totalJobsCompleted).toBe(10); // Unchanged
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.recordJobCompletion('non-existent', {
          durationMinutes: 120,
          qualityScore: 4.5,
          success: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findQualifiedWorkTeamsForService', () => {
    it('should return teams with all required specialties', async () => {
      const requirements = [
        { specialtyId: 'specialty-1', isRequired: true },
        { specialtyId: 'specialty-2', isRequired: true },
      ];

      const workTeams = [
        {
          id: 'team-1',
          countryCode: 'ES',
          specialtyAssignments: [
            {
              specialtyId: 'specialty-1',
              experienceLevel: ExperienceLevel.SENIOR,
            },
            {
              specialtyId: 'specialty-2',
              experienceLevel: ExperienceLevel.INTERMEDIATE,
            },
          ],
        },
        {
          id: 'team-2',
          countryCode: 'ES',
          specialtyAssignments: [
            {
              specialtyId: 'specialty-1',
              experienceLevel: ExperienceLevel.SENIOR,
            },
            // Missing specialty-2
          ],
        },
      ];

      mockPrismaService.serviceSkillRequirement.findMany.mockResolvedValue(
        requirements,
      );
      mockPrismaService.workTeam.findMany.mockResolvedValue(workTeams);

      const result = await service.findQualifiedWorkTeamsForService(
        'service-1',
        'ES',
      );

      // Only team-1 has both specialties
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('team-1');
    });

    it('should filter by minimum experience level', async () => {
      const requirements = [{ specialtyId: 'specialty-1', isRequired: true }];

      const workTeams = [
        {
          id: 'team-1',
          countryCode: 'ES',
          specialtyAssignments: [
            {
              specialtyId: 'specialty-1',
              experienceLevel: ExperienceLevel.SENIOR,
            },
          ],
        },
        {
          id: 'team-2',
          countryCode: 'ES',
          specialtyAssignments: [
            {
              specialtyId: 'specialty-1',
              experienceLevel: ExperienceLevel.JUNIOR,
            },
          ],
        },
      ];

      mockPrismaService.serviceSkillRequirement.findMany.mockResolvedValue(
        requirements,
      );
      mockPrismaService.workTeam.findMany.mockResolvedValue(workTeams);

      const result = await service.findQualifiedWorkTeamsForService(
        'service-1',
        'ES',
        ExperienceLevel.SENIOR,
      );

      // Only team-1 meets SENIOR requirement
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('team-1');
    });

    it('should return empty array if no requirements defined', async () => {
      mockPrismaService.serviceSkillRequirement.findMany.mockResolvedValue([]);

      const result = await service.findQualifiedWorkTeamsForService(
        'service-1',
        'ES',
      );

      expect(result).toEqual([]);
    });
  });

  describe('getExpiringCertifications', () => {
    it('should return certifications expiring within threshold', async () => {
      const expiringAssignments = [
        {
          id: 'assignment-1',
          certificationExpiresAt: new Date('2025-02-15'),
          specialty: { code: 'HVAC_INSTALL' },
        },
      ];

      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        expiringAssignments,
      );

      const result = await service.getExpiringCertifications(30);

      expect(result).toEqual(expiringAssignments);
      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isCertified: true,
          certificationExpiresAt: {
            lte: expect.any(Date),
            gte: expect.any(Date),
          },
        },
        include: expect.any(Object),
        orderBy: { certificationExpiresAt: 'asc' },
      });
    });

    it('should filter by work team ID', async () => {
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        [],
      );

      await service.getExpiringCertifications(30, 'team-1');

      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          workTeamId: 'team-1',
        }),
        include: expect.any(Object),
        orderBy: { certificationExpiresAt: 'asc' },
      });
    });
  });

  describe('getStatistics', () => {
    it('should return specialty statistics for country', async () => {
      mockPrismaService.providerSpecialtyAssignment.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(40) // active
        .mockResolvedValueOnce(30); // certified

      mockPrismaService.providerSpecialtyAssignment.groupBy.mockResolvedValue([
        { specialtyId: 'specialty-1', _count: 10 },
        { specialtyId: 'specialty-2', _count: 15 },
        { specialtyId: 'specialty-3', _count: 15 },
      ]);

      const result = await service.getStatistics('ES');

      expect(result).toEqual({
        totalAssignments: 50,
        activeAssignments: 40,
        certifiedAssignments: 30,
        certificationRate: '75.00', // (30 / 40) * 100
        bySpecialty: 3,
      });
    });

    it('should handle zero assignments', async () => {
      mockPrismaService.providerSpecialtyAssignment.count.mockResolvedValue(0);
      mockPrismaService.providerSpecialtyAssignment.groupBy.mockResolvedValue(
        [],
      );

      const result = await service.getStatistics('ES');

      expect(result.certificationRate).toBe('0.00');
    });
  });
});
