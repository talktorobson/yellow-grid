import { Test, TestingModule } from '@nestjs/testing';
import { ProviderSpecialtyService } from './provider-specialty.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ExperienceLevel, ServiceCategory } from '@prisma/client';

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

  const mockSpecialty = {
    id: 'specialty-uuid-1',
    code: 'HVAC_INSTALL',
    name: 'HVAC Installation',
    description: 'Air conditioning and heating installation',
    category: ServiceCategory.HVAC,
    requiresCertification: true,
    certificationAuthority: 'HVAC Association',
  };

  const mockWorkTeam = {
    id: 'work-team-uuid-1',
    providerId: 'provider-uuid-1',
    name: 'Team Alpha',
    countryCode: 'ES',
    provider: {
      id: 'provider-uuid-1',
      name: 'AC Experts Ltd',
    },
  };

  const mockAssignment = {
    id: 'assignment-uuid-1',
    workTeamId: 'work-team-uuid-1',
    specialtyId: 'specialty-uuid-1',
    isCertified: true,
    certificationNumber: 'CERT-12345',
    certificationIssuedAt: new Date('2024-01-01'),
    certificationExpiresAt: new Date('2026-01-01'),
    experienceLevel: ExperienceLevel.SENIOR,
    yearsOfExperience: 5,
    isActive: true,
    assignedAt: new Date('2024-01-01'),
    revokedAt: null,
    revocationReason: null,
    totalJobsCompleted: 50,
    totalJobsFailed: 2,
    avgDurationMinutes: 180,
    avgQualityScore: 4.5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderSpecialtyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProviderSpecialtyService>(ProviderSpecialtyService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // SPECIALTY MANAGEMENT
  // ============================================================================

  describe('findSpecialtyByCode', () => {
    it('should find specialty by code with service mappings', async () => {
      const specialtyWithMappings = {
        ...mockSpecialty,
        serviceMappings: [
          {
            id: 'mapping-1',
            service: {
              id: 'service-1',
              name: 'AC Installation',
            },
          },
        ],
      };
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue(
        specialtyWithMappings,
      );

      const result = await service.findSpecialtyByCode('HVAC_INSTALL');

      expect(result).toEqual(specialtyWithMappings);
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

    it('should throw NotFoundException when specialty not found', async () => {
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue(null);

      await expect(service.findSpecialtyByCode('INVALID')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findSpecialtyByCode('INVALID')).rejects.toThrow(
        'Specialty with code INVALID not found',
      );
    });
  });

  describe('findAllSpecialties', () => {
    it('should find all specialties', async () => {
      const specialties = [mockSpecialty];
      mockPrismaService.providerSpecialty.findMany.mockResolvedValue(specialties);

      const result = await service.findAllSpecialties();

      expect(result).toEqual(specialties);
      expect(prisma.providerSpecialty.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          serviceMappings: {
            include: {
              service: {
                select: {
                  id: true,
                  fsmServiceCode: true,
                  name: true,
                  serviceType: true,
                },
              },
            },
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter by category', async () => {
      mockPrismaService.providerSpecialty.findMany.mockResolvedValue([mockSpecialty]);

      await service.findAllSpecialties(ServiceCategory.HVAC);

      expect(prisma.providerSpecialty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: ServiceCategory.HVAC },
        }),
      );
    });
  });

  describe('createSpecialty', () => {
    const createData = {
      code: 'PLUMB_INSTALL',
      name: 'Plumbing Installation',
      description: 'Water and drainage installation',
      category: ServiceCategory.PLUMBING,
      requiresCertification: true,
      certificationAuthority: 'Plumbing Guild',
    };

    it('should create a new specialty', async () => {
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue(null);
      const created = { ...mockSpecialty, ...createData };
      mockPrismaService.providerSpecialty.create.mockResolvedValue(created);

      const result = await service.createSpecialty(createData);

      expect(result).toEqual(created);
      expect(prisma.providerSpecialty.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should throw ConflictException for duplicate code', async () => {
      mockPrismaService.providerSpecialty.findUnique.mockResolvedValue(
        mockSpecialty,
      );

      await expect(service.createSpecialty(createData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createSpecialty(createData)).rejects.toThrow(
        'Specialty with code PLUMB_INSTALL already exists',
      );
    });
  });

  // ============================================================================
  // WORK TEAM SPECIALTY ASSIGNMENTS
  // ============================================================================

  describe('assignSpecialtyToWorkTeam', () => {
    const assignmentData = {
      isCertified: true,
      certificationNumber: 'CERT-99999',
      certificationIssuedAt: new Date('2025-01-01'),
      certificationExpiresAt: new Date('2027-01-01'),
      experienceLevel: ExperienceLevel.INTERMEDIATE,
      yearsOfExperience: 3,
    };

    it('should assign specialty to work team', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        null,
      );
      const created = {
        ...mockAssignment,
        ...assignmentData,
        specialty: mockSpecialty,
        workTeam: mockWorkTeam,
      };
      mockPrismaService.providerSpecialtyAssignment.create.mockResolvedValue(
        created,
      );

      const result = await service.assignSpecialtyToWorkTeam(
        'work-team-uuid-1',
        'specialty-uuid-1',
        assignmentData,
      );

      expect(result).toEqual(created);
      expect(prisma.providerSpecialtyAssignment.create).toHaveBeenCalledWith({
        data: {
          workTeamId: 'work-team-uuid-1',
          specialtyId: 'specialty-uuid-1',
          ...assignmentData,
          isActive: true,
        },
        include: {
          specialty: true,
          workTeam: {
            include: {
              provider: true,
            },
          },
        },
      });
    });

    it('should throw ConflictException if assignment already exists and is active', async () => {
      const existingActive = { ...mockAssignment, isActive: true };
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        existingActive,
      );

      await expect(
        service.assignSpecialtyToWorkTeam(
          'work-team-uuid-1',
          'specialty-uuid-1',
          assignmentData,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate inactive assignment', async () => {
      const existingInactive = { ...mockAssignment, isActive: false };
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        existingInactive,
      );
      const reactivated = {
        ...existingInactive,
        ...assignmentData,
        isActive: true,
      };
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue(
        reactivated,
      );

      const result = await service.assignSpecialtyToWorkTeam(
        'work-team-uuid-1',
        'specialty-uuid-1',
        assignmentData,
      );

      expect(result.isActive).toBe(true);
      expect(prisma.providerSpecialtyAssignment.update).toHaveBeenCalledWith({
        where: { id: existingInactive.id },
        data: expect.objectContaining({
          ...assignmentData,
          isActive: true,
          assignedAt: expect.any(Date),
          revokedAt: null,
          revocationReason: null,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('revokeSpecialtyFromWorkTeam', () => {
    it('should revoke an active specialty assignment', async () => {
      const activeAssignment = { ...mockAssignment, isActive: true };
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        activeAssignment,
      );
      const revoked = {
        ...activeAssignment,
        isActive: false,
        revokedAt: new Date(),
        revocationReason: 'Certification expired',
      };
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue(
        revoked,
      );

      const result = await service.revokeSpecialtyFromWorkTeam(
        'work-team-uuid-1',
        'specialty-uuid-1',
        'Certification expired',
      );

      expect(result.isActive).toBe(false);
      expect(result.revocationReason).toBe('Certification expired');
      expect(prisma.providerSpecialtyAssignment.update).toHaveBeenCalledWith({
        where: { id: activeAssignment.id },
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
          'work-team-uuid-1',
          'specialty-uuid-1',
          'Test',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already revoked', async () => {
      const revokedAssignment = { ...mockAssignment, isActive: false };
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        revokedAssignment,
      );

      await expect(
        service.revokeSpecialtyFromWorkTeam(
          'work-team-uuid-1',
          'specialty-uuid-1',
          'Test',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkTeamSpecialties', () => {
    it('should get active specialties for work team', async () => {
      const assignments = [
        { ...mockAssignment, specialty: mockSpecialty },
      ];
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        assignments,
      );

      const result = await service.getWorkTeamSpecialties('work-team-uuid-1');

      expect(result).toEqual(assignments);
      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: { workTeamId: 'work-team-uuid-1', isActive: true },
        include: {
          specialty: true,
        },
        orderBy: [
          { specialty: { category: 'asc' } },
          { specialty: { name: 'asc' } },
        ],
      });
    });

    it('should include inactive assignments when requested', async () => {
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue([]);

      await service.getWorkTeamSpecialties('work-team-uuid-1', false);

      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workTeamId: 'work-team-uuid-1' },
        }),
      );
    });
  });

  describe('getWorkTeamsWithSpecialty', () => {
    it('should get work teams with a specific specialty', async () => {
      const assignments = [
        {
          ...mockAssignment,
          workTeam: mockWorkTeam,
          specialty: mockSpecialty,
        },
      ];
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue(
        assignments,
      );

      const result = await service.getWorkTeamsWithSpecialty('specialty-uuid-1');

      expect(result).toEqual(assignments);
      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith({
        where: { specialtyId: 'specialty-uuid-1', isActive: true },
        include: {
          workTeam: {
            include: {
              provider: true,
            },
          },
          specialty: true,
        },
        orderBy: [
          { workTeam: { provider: { name: 'asc' } } },
          { workTeam: { name: 'asc' } },
        ],
      });
    });

    it('should filter by country code', async () => {
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue([]);

      await service.getWorkTeamsWithSpecialty('specialty-uuid-1', 'ES');

      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            specialtyId: 'specialty-uuid-1',
            isActive: true,
            workTeam: { countryCode: 'ES' },
          },
        }),
      );
    });
  });

  // ============================================================================
  // CERTIFICATION MANAGEMENT
  // ============================================================================

  describe('updateCertification', () => {
    const certificationData = {
      isCertified: true,
      certificationNumber: 'NEW-CERT-123',
      certificationIssuedAt: new Date('2025-06-01'),
      certificationExpiresAt: new Date('2028-06-01'),
    };

    it('should update certification information', async () => {
      const updated = { ...mockAssignment, ...certificationData };
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue(
        updated,
      );

      const result = await service.updateCertification(
        'assignment-uuid-1',
        certificationData,
      );

      expect(result).toEqual(updated);
      expect(prisma.providerSpecialtyAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-uuid-1' },
        data: certificationData,
        include: {
          specialty: true,
          workTeam: {
            include: {
              provider: true,
            },
          },
        },
      });
    });
  });

  describe('getExpiringCertifications', () => {
    it('should get certifications expiring within threshold', async () => {
      const expiringAssignments = [mockAssignment];
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
        include: {
          specialty: true,
          workTeam: {
            include: {
              provider: true,
            },
          },
        },
        orderBy: { certificationExpiresAt: 'asc' },
      });
    });

    it('should filter by work team', async () => {
      mockPrismaService.providerSpecialtyAssignment.findMany.mockResolvedValue([]);

      await service.getExpiringCertifications(30, 'work-team-uuid-1');

      expect(prisma.providerSpecialtyAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workTeamId: 'work-team-uuid-1',
          }),
        }),
      );
    });
  });

  // ============================================================================
  // PERFORMANCE TRACKING
  // ============================================================================

  describe('recordJobCompletion', () => {
    it('should record successful job and update averages', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        mockAssignment,
      );

      const jobData = {
        durationMinutes: 200,
        qualityScore: 5,
        success: true,
      };

      // Current: 50 completed, 2 failed (52 total), avg 180 min, avg 4.5 quality
      // New: 51 completed, 2 failed (53 total)
      // New avg duration: (180*52 + 200) / 53 = 180.38 = 180
      // New avg quality: (4.5*52 + 5) / 53 = 4.51

      const updated = {
        ...mockAssignment,
        totalJobsCompleted: 51,
        totalJobsFailed: 2,
        avgDurationMinutes: 180,
        avgQualityScore: 4.51,
      };
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue(
        updated,
      );

      const result = await service.recordJobCompletion(
        'assignment-uuid-1',
        jobData,
      );

      expect(result.totalJobsCompleted).toBe(51);
      expect(result.totalJobsFailed).toBe(2);
      expect(prisma.providerSpecialtyAssignment.update).toHaveBeenCalled();
    });

    it('should record failed job and update counters', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        mockAssignment,
      );

      const jobData = {
        durationMinutes: 150,
        qualityScore: 2,
        success: false,
      };

      const updated = {
        ...mockAssignment,
        totalJobsCompleted: 50,
        totalJobsFailed: 3,
      };
      mockPrismaService.providerSpecialtyAssignment.update.mockResolvedValue(
        updated,
      );

      const result = await service.recordJobCompletion(
        'assignment-uuid-1',
        jobData,
      );

      expect(result.totalJobsCompleted).toBe(50);
      expect(result.totalJobsFailed).toBe(3);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockPrismaService.providerSpecialtyAssignment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.recordJobCompletion('invalid-id', {
          durationMinutes: 100,
          qualityScore: 4,
          success: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // QUALIFIED WORK TEAMS
  // ============================================================================

  describe('findQualifiedWorkTeamsForService', () => {
    it('should find work teams with all required specialties', async () => {
      const requirements = [
        {
          id: 'req-1',
          serviceId: 'service-uuid-1',
          specialtyId: 'specialty-uuid-1',
          isRequired: true,
          specialty: mockSpecialty,
        },
        {
          id: 'req-2',
          serviceId: 'service-uuid-1',
          specialtyId: 'specialty-uuid-2',
          isRequired: true,
          specialty: { ...mockSpecialty, id: 'specialty-uuid-2' },
        },
      ];

      const workTeams = [
        {
          ...mockWorkTeam,
          specialtyAssignments: [
            {
              ...mockAssignment,
              specialtyId: 'specialty-uuid-1',
              specialty: mockSpecialty,
            },
            {
              ...mockAssignment,
              specialtyId: 'specialty-uuid-2',
              specialty: { ...mockSpecialty, id: 'specialty-uuid-2' },
            },
          ],
        },
      ];

      mockPrismaService.serviceSkillRequirement.findMany.mockResolvedValue(
        requirements,
      );
      mockPrismaService.workTeam.findMany.mockResolvedValue(workTeams);

      const result = await service.findQualifiedWorkTeamsForService(
        'service-uuid-1',
        'ES',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(workTeams[0]);
    });

    it('should filter out teams missing required specialties', async () => {
      const requirements = [
        {
          id: 'req-1',
          serviceId: 'service-uuid-1',
          specialtyId: 'specialty-uuid-1',
          isRequired: true,
          specialty: mockSpecialty,
        },
        {
          id: 'req-2',
          serviceId: 'service-uuid-1',
          specialtyId: 'specialty-uuid-2',
          isRequired: true,
          specialty: { ...mockSpecialty, id: 'specialty-uuid-2' },
        },
      ];

      const workTeams = [
        {
          ...mockWorkTeam,
          specialtyAssignments: [
            {
              ...mockAssignment,
              specialtyId: 'specialty-uuid-1',
              specialty: mockSpecialty,
            },
            // Missing specialty-uuid-2
          ],
        },
      ];

      mockPrismaService.serviceSkillRequirement.findMany.mockResolvedValue(
        requirements,
      );
      mockPrismaService.workTeam.findMany.mockResolvedValue(workTeams);

      const result = await service.findQualifiedWorkTeamsForService(
        'service-uuid-1',
        'ES',
      );

      expect(result).toHaveLength(0);
    });

    it('should filter by minimum experience level', async () => {
      const requirements = [
        {
          id: 'req-1',
          serviceId: 'service-uuid-1',
          specialtyId: 'specialty-uuid-1',
          isRequired: true,
          specialty: mockSpecialty,
        },
      ];

      const workTeams = [
        {
          ...mockWorkTeam,
          id: 'team-1',
          specialtyAssignments: [
            {
              ...mockAssignment,
              experienceLevel: ExperienceLevel.SENIOR,
              specialtyId: 'specialty-uuid-1',
              specialty: mockSpecialty,
            },
          ],
        },
        {
          ...mockWorkTeam,
          id: 'team-2',
          specialtyAssignments: [
            {
              ...mockAssignment,
              experienceLevel: ExperienceLevel.JUNIOR,
              specialtyId: 'specialty-uuid-1',
              specialty: mockSpecialty,
            },
          ],
        },
      ];

      mockPrismaService.serviceSkillRequirement.findMany.mockResolvedValue(
        requirements,
      );
      mockPrismaService.workTeam.findMany.mockResolvedValue(workTeams);

      const result = await service.findQualifiedWorkTeamsForService(
        'service-uuid-1',
        'ES',
        ExperienceLevel.SENIOR,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('team-1');
    });

    it('should return empty array if no requirements defined', async () => {
      mockPrismaService.serviceSkillRequirement.findMany.mockResolvedValue([]);

      const result = await service.findQualifiedWorkTeamsForService(
        'service-uuid-1',
        'ES',
      );

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('getStatistics', () => {
    it('should return specialty assignment statistics', async () => {
      mockPrismaService.providerSpecialtyAssignment.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(60); // certified

      mockPrismaService.providerSpecialtyAssignment.groupBy.mockResolvedValue([
        { specialtyId: 'spec-1', _count: 30 },
        { specialtyId: 'spec-2', _count: 25 },
        { specialtyId: 'spec-3', _count: 25 },
      ]);

      const result = await service.getStatistics('ES');

      expect(result).toEqual({
        totalAssignments: 100,
        activeAssignments: 80,
        certifiedAssignments: 60,
        certificationRate: '75.00',
        bySpecialty: 3,
      });
    });

    it('should handle zero active assignments', async () => {
      mockPrismaService.providerSpecialtyAssignment.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(0) // active = 0
        .mockResolvedValueOnce(0);

      mockPrismaService.providerSpecialtyAssignment.groupBy.mockResolvedValue([]);

      const result = await service.getStatistics('ES');

      expect(result.certificationRate).toBe('0.00');
    });
  });
});
