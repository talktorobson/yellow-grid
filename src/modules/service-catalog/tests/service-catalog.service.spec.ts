import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ServiceCatalogService } from '../service-catalog.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';

describe('ServiceCatalogService', () => {
  let service: ServiceCatalogService;
  let prisma: PrismaService;

  const mockPrismaService = {
    serviceCatalog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ServiceCatalogService>(ServiceCatalogService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByExternalCode', () => {
    const mockService = {
      id: 'service-1',
      externalServiceCode: 'PYX_ES_HVAC_001',
      fsmServiceCode: 'SVC_ES_HVAC_001',
      name: 'HVAC Installation',
      status: ServiceStatus.ACTIVE,
      contractTemplate: null,
      pricing: [],
      skillRequirements: [],
    };

    it('should return service with relations', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);

      const result = await service.findByExternalCode('PYX_ES_HVAC_001');

      expect(result).toEqual(mockService);
      expect(prisma.serviceCatalog.findUnique).toHaveBeenCalledWith({
        where: { externalServiceCode: 'PYX_ES_HVAC_001' },
        include: expect.objectContaining({
          contractTemplate: true,
          pricing: expect.any(Object),
          skillRequirements: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when service not found', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.findByExternalCode('NON_EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const serviceData = {
      externalServiceCode: 'PYX_ES_HVAC_001',
      fsmServiceCode: 'SVC_ES_HVAC_001',
      externalSource: 'PYXIS',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.HVAC,
      name: 'HVAC Installation',
      description: 'Standard HVAC installation',
      scopeIncluded: ['Install unit', 'Test'],
      scopeExcluded: ['Wall work'],
      worksiteRequirements: ['Power outlet'],
      productPrerequisites: ['Unit delivered'],
      estimatedDurationMinutes: 180,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      createdBy: 'admin@example.com',
    };

    it('should create service with computed checksum', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue({
        id: 'service-1',
        ...serviceData,
      });

      const result = await service.create(serviceData);

      expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...serviceData,
          status: ServiceStatus.CREATED,
          syncChecksum: expect.any(String),
          lastSyncedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException when duplicate external code', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'existing-service',
      });

      await expect(service.create(serviceData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(serviceData)).rejects.toThrow(
        'already exists',
      );
    });
  });

  describe('update', () => {
    const existingService = {
      id: 'service-1',
      externalServiceCode: 'PYX_ES_HVAC_001',
      name: 'Old Name',
    };

    beforeEach(() => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(existingService);
    });

    it('should update service fields', async () => {
      mockPrismaService.serviceCatalog.update.mockResolvedValue({
        ...existingService,
        name: 'New Name',
      });

      await service.update(
        'service-1',
        { name: 'New Name' },
        'admin@example.com',
      );

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          name: 'New Name',
          updatedBy: 'admin@example.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when service not found', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'New Name' }, 'admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('should transition service to ACTIVE status', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.CREATED,
      });
      mockPrismaService.serviceCatalog.update.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.ACTIVE,
      });

      await service.activate('service-1', 'admin@example.com');

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          status: ServiceStatus.ACTIVE,
          updatedBy: 'admin@example.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when already active', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.ACTIVE,
      });

      await expect(service.activate('service-1', 'admin')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.activate('service-1', 'admin')).rejects.toThrow(
        'already active',
      );
    });

    it('should throw BadRequestException when trying to activate deprecated service', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.DEPRECATED,
      });

      await expect(service.activate('service-1', 'admin')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.activate('service-1', 'admin')).rejects.toThrow(
        'Cannot activate a deprecated service',
      );
    });
  });

  describe('deprecate', () => {
    it('should transition service to DEPRECATED status', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.ACTIVE,
      });
      mockPrismaService.serviceCatalog.update.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.DEPRECATED,
      });

      await service.deprecate('service-1', 'No longer offered', 'admin@example.com');

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          status: ServiceStatus.DEPRECATED,
          deprecatedAt: expect.any(Date),
          deprecationReason: 'No longer offered',
          updatedBy: 'admin@example.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when already deprecated', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.DEPRECATED,
      });

      await expect(
        service.deprecate('service-1', 'reason', 'admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('archive', () => {
    it('should transition deprecated service to ARCHIVED status', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.DEPRECATED,
      });
      mockPrismaService.serviceCatalog.update.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.ARCHIVED,
      });

      await service.archive('service-1', 'admin@example.com');

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          status: ServiceStatus.ARCHIVED,
          updatedBy: 'admin@example.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when not deprecated', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'service-1',
        status: ServiceStatus.ACTIVE,
      });

      await expect(service.archive('service-1', 'admin')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.archive('service-1', 'admin')).rejects.toThrow(
        'must be deprecated before archiving',
      );
    });
  });

  describe('computeChecksum', () => {
    it('should compute consistent SHA256 checksum', () => {
      const serviceData1 = {
        externalServiceCode: 'PYX_ES_HVAC_001',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        name: 'HVAC Installation',
        description: 'Standard installation',
        scopeIncluded: ['Install', 'Test'],
        scopeExcluded: ['Wall work'],
        worksiteRequirements: ['Power'],
        productPrerequisites: ['Unit'],
        estimatedDurationMinutes: 180,
      };

      const checksum1 = service.computeChecksum(serviceData1);
      const checksum2 = service.computeChecksum(serviceData1);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toHaveLength(64); // SHA256 hex length
    });

    it('should produce different checksums for different data', () => {
      const serviceData1 = {
        externalServiceCode: 'PYX_ES_HVAC_001',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        name: 'HVAC Installation',
        description: 'Standard installation',
        scopeIncluded: ['Install', 'Test'],
        scopeExcluded: ['Wall work'],
        worksiteRequirements: ['Power'],
        productPrerequisites: ['Unit'],
        estimatedDurationMinutes: 180,
      };

      const serviceData2 = {
        ...serviceData1,
        name: 'Different Name',
      };

      const checksum1 = service.computeChecksum(serviceData1);
      const checksum2 = service.computeChecksum(serviceData2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle array order (should sort arrays)', () => {
      const serviceData1 = {
        externalServiceCode: 'PYX_ES_HVAC_001',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        name: 'HVAC Installation',
        scopeIncluded: ['Install', 'Test', 'Clean'],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        estimatedDurationMinutes: 180,
      };

      const serviceData2 = {
        ...serviceData1,
        scopeIncluded: ['Test', 'Clean', 'Install'], // Different order
      };

      const checksum1 = service.computeChecksum(serviceData1);
      const checksum2 = service.computeChecksum(serviceData2);

      expect(checksum1).toBe(checksum2); // Should be same due to sorting
    });
  });

  describe('detectBreakingChanges', () => {
    const existingService = {
      scopeIncluded: ['Install', 'Test', 'Clean'],
      scopeExcluded: ['Wall work'],
      worksiteRequirements: ['Power outlet'],
      productPrerequisites: ['Unit delivered'],
    };

    it('should detect removed items from scopeIncluded', () => {
      const newData = {
        scopeIncluded: ['Install', 'Test'], // 'Clean' removed
        scopeExcluded: ['Wall work'],
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['Unit delivered'],
      };

      const result = service.detectBreakingChanges(existingService, newData);

      expect(result).toBe(true);
    });

    it('should detect added items to scopeExcluded', () => {
      const newData = {
        scopeIncluded: ['Install', 'Test', 'Clean'],
        scopeExcluded: ['Wall work', 'Electrical work'], // Added exclusion
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['Unit delivered'],
      };

      const result = service.detectBreakingChanges(existingService, newData);

      expect(result).toBe(true);
    });

    it('should detect new requirements added', () => {
      const newData = {
        scopeIncluded: ['Install', 'Test', 'Clean'],
        scopeExcluded: ['Wall work'],
        worksiteRequirements: ['Power outlet', 'Water supply'], // New requirement
        productPrerequisites: ['Unit delivered'],
      };

      const result = service.detectBreakingChanges(existingService, newData);

      expect(result).toBe(true);
    });

    it('should detect new prerequisites added', () => {
      const newData = {
        scopeIncluded: ['Install', 'Test', 'Clean'],
        scopeExcluded: ['Wall work'],
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['Unit delivered', 'Parts delivered'], // New prerequisite
      };

      const result = service.detectBreakingChanges(existingService, newData);

      expect(result).toBe(true);
    });

    it('should return false when no breaking changes', () => {
      const newData = {
        scopeIncluded: ['Install', 'Test', 'Clean', 'Verify'], // Added to included (not breaking)
        scopeExcluded: ['Wall work'],
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['Unit delivered'],
      };

      const result = service.detectBreakingChanges(existingService, newData);

      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    const mockResults = [
      { id: '1', name: 'HVAC Installation', serviceCategory: ServiceCategory.HVAC },
      { id: '2', name: 'HVAC Repair', serviceCategory: ServiceCategory.HVAC },
    ];

    it('should search by name with case-insensitive matching', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue(mockResults);

      await service.search('hvac', 'ES', 'LM_ES', 20);

      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith({
        where: {
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          OR: [
            { name: { contains: 'hvac', mode: 'insensitive' } },
            { description: { contains: 'hvac', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        take: 20,
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getStatistics', () => {
    it('should return service statistics', async () => {
      mockPrismaService.serviceCatalog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(15)  // deprecated
        .mockResolvedValueOnce(5);  // archived

      mockPrismaService.serviceCatalog.groupBy
        .mockResolvedValueOnce([
          { serviceType: ServiceType.INSTALLATION, _count: 50 },
          { serviceType: ServiceType.MAINTENANCE, _count: 30 },
        ])
        .mockResolvedValueOnce([
          { serviceCategory: ServiceCategory.HVAC, _count: 40 },
          { serviceCategory: ServiceCategory.PLUMBING, _count: 30 },
        ])
        .mockResolvedValueOnce([
          { externalSource: 'PYXIS', _count: 70 },
          { externalSource: 'FSM_CUSTOM', _count: 30 },
        ]);

      const result = await service.getStatistics('ES', 'LM_ES');

      expect(result).toEqual({
        total: 100,
        byStatus: {
          active: 80,
          deprecated: 15,
          archived: 5,
        },
        byType: [
          { type: ServiceType.INSTALLATION, count: 50 },
          { type: ServiceType.MAINTENANCE, count: 30 },
        ],
        byCategory: [
          { category: ServiceCategory.HVAC, count: 40 },
          { category: ServiceCategory.PLUMBING, count: 30 },
        ],
        byExternalSource: [
          { source: 'PYXIS', count: 70 },
          { source: 'FSM_CUSTOM', count: 30 },
        ],
      });
    });
  });
});
