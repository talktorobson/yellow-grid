import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogService } from './service-catalog.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';

describe('ServiceCatalogService', () => {
  let service: ServiceCatalogService;
  let prisma: PrismaService;

  const mockPrismaService = {
    serviceCatalog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockService = {
    id: 'service-uuid-1',
    externalServiceCode: 'PYX_ES_HVAC_001',
    fsmServiceCode: 'SVC_ES_001',
    externalSource: 'PYXIS',
    countryCode: 'ES',
    businessUnit: 'LM',
    serviceType: ServiceType.INSTALLATION,
    serviceCategory: ServiceCategory.HVAC,
    name: 'Air Conditioning Installation',
    description: 'Full AC installation service',
    scopeIncluded: ['Installation', 'Testing', 'Documentation'],
    scopeExcluded: ['Maintenance', 'Repair'],
    worksiteRequirements: ['Power outlet', 'Wall space'],
    productPrerequisites: ['AC unit purchased'],
    estimatedDurationMinutes: 180,
    requiresPreServiceContract: true,
    requiresPostServiceWCF: true,
    status: ServiceStatus.ACTIVE,
    syncChecksum: 'abc123',
    lastSyncedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'system',
    updatedBy: 'system',
    contractTemplateId: 'template-1',
    deprecatedAt: null,
    deprecationReason: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServiceCatalogService>(ServiceCatalogService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // FIND METHODS
  // ============================================================================

  describe('findByExternalCode', () => {
    it('should find service by external code with relations', async () => {
      const serviceWithRelations = {
        ...mockService,
        contractTemplate: { id: 'template-1', name: 'Standard Contract' },
        pricing: [],
        skillRequirements: [],
      };

      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        serviceWithRelations,
      );

      const result = await service.findByExternalCode('PYX_ES_HVAC_001');

      expect(result).toEqual(serviceWithRelations);
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

      await expect(
        service.findByExternalCode('NONEXISTENT'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findByExternalCode('NONEXISTENT'),
      ).rejects.toThrow(
        'Service with external code NONEXISTENT not found',
      );
    });
  });

  describe('findByFSMCode', () => {
    it('should find service by FSM code', async () => {
      const serviceWithRelations = {
        ...mockService,
        contractTemplate: { id: 'template-1' },
        pricing: [],
        skillRequirements: [],
      };

      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        serviceWithRelations,
      );

      const result = await service.findByFSMCode('SVC_ES_001');

      expect(result).toEqual(serviceWithRelations);
      expect(prisma.serviceCatalog.findUnique).toHaveBeenCalledWith({
        where: { fsmServiceCode: 'SVC_ES_001' },
        include: expect.objectContaining({
          contractTemplate: true,
          pricing: true,
          skillRequirements: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when FSM code not found', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.findByFSMCode('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('should find service by ID', async () => {
      const serviceWithRelations = {
        ...mockService,
        contractTemplate: { id: 'template-1' },
        pricing: [],
        skillRequirements: [],
      };

      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        serviceWithRelations,
      );

      const result = await service.findById('service-uuid-1');

      expect(result).toEqual(serviceWithRelations);
      expect(prisma.serviceCatalog.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-uuid-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when ID not found', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should find all services with country and business unit', async () => {
      const services = [mockService];
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue(services);

      const result = await service.findAll('ES', 'LM');

      expect(result).toEqual(services);
      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith({
        where: { countryCode: 'ES', businessUnit: 'LM' },
        include: expect.any(Object),
        orderBy: [{ serviceCategory: 'asc' }, { name: 'asc' }],
      });
    });

    it('should apply serviceType filter', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([mockService]);

      await service.findAll('ES', 'LM', {
        serviceType: ServiceType.INSTALLATION,
      });

      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceType: ServiceType.INSTALLATION,
          }),
        }),
      );
    });

    it('should apply serviceCategory filter', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([mockService]);

      await service.findAll('ES', 'LM', {
        serviceCategory: ServiceCategory.HVAC,
      });

      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceCategory: ServiceCategory.HVAC,
          }),
        }),
      );
    });

    it('should apply status filter', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([mockService]);

      await service.findAll('ES', 'LM', {
        status: ServiceStatus.ACTIVE,
      });

      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ServiceStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should apply externalSource filter', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([mockService]);

      await service.findAll('ES', 'LM', {
        externalSource: 'PYXIS',
      });

      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            externalSource: 'PYXIS',
          }),
        }),
      );
    });

    it('should apply multiple filters', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([mockService]);

      await service.findAll('ES', 'LM', {
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        status: ServiceStatus.ACTIVE,
        externalSource: 'PYXIS',
      });

      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceType: ServiceType.INSTALLATION,
            serviceCategory: ServiceCategory.HVAC,
            status: ServiceStatus.ACTIVE,
            externalSource: 'PYXIS',
          }),
        }),
      );
    });
  });

  describe('search', () => {
    it('should search services by name', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([mockService]);

      const result = await service.search('Air Conditioning', 'ES', 'LM');

      expect(result).toEqual([mockService]);
      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith({
        where: {
          countryCode: 'ES',
          businessUnit: 'LM',
          OR: [
            { name: { contains: 'Air Conditioning', mode: 'insensitive' } },
            { description: { contains: 'Air Conditioning', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        take: 20,
        orderBy: { name: 'asc' },
      });
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([mockService]);

      await service.search('AC', 'ES', 'LM', 10);

      expect(prisma.serviceCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  // ============================================================================
  // CREATE METHOD
  // ============================================================================

  describe('create', () => {
    const createData = {
      externalServiceCode: 'PYX_ES_PLUMB_001',
      fsmServiceCode: 'SVC_ES_002',
      externalSource: 'PYXIS',
      countryCode: 'ES',
      businessUnit: 'LM',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.PLUMBING,
      name: 'Water Heater Installation',
      description: 'Full water heater installation',
      scopeIncluded: ['Installation', 'Testing'],
      scopeExcluded: ['Maintenance'],
      worksiteRequirements: ['Water connection'],
      productPrerequisites: ['Water heater purchased'],
      estimatedDurationMinutes: 240,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
      createdBy: 'admin@test.com',
    };

    it('should create a new service', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null); // No duplicate
      const createdService = { ...mockService, ...createData };
      mockPrismaService.serviceCatalog.create.mockResolvedValue(createdService);

      const result = await service.create(createData);

      expect(result).toEqual(createdService);
      expect(prisma.serviceCatalog.findUnique).toHaveBeenCalledWith({
        where: { externalServiceCode: 'PYX_ES_PLUMB_001' },
      });
      expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createData,
          status: ServiceStatus.CREATED,
          syncChecksum: expect.any(String),
          lastSyncedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException for duplicate external code', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(mockService);

      await expect(service.create(createData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createData)).rejects.toThrow(
        'Service with external code PYX_ES_PLUMB_001 already exists',
      );
    });

    it('should compute sync checksum on create', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue({
        ...mockService,
        ...createData,
      });

      await service.create(createData);

      expect(prisma.serviceCatalog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncChecksum: expect.any(String),
          }),
        }),
      );
    });
  });

  // ============================================================================
  // UPDATE METHOD
  // ============================================================================

  describe('update', () => {
    const updateData = {
      name: 'Updated Service Name',
      description: 'Updated description',
      estimatedDurationMinutes: 200,
    };

    it('should update an existing service', async () => {
      const serviceWithRelations = {
        ...mockService,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        serviceWithRelations,
      );
      const updatedService = { ...serviceWithRelations, ...updateData };
      mockPrismaService.serviceCatalog.update.mockResolvedValue(updatedService);

      const result = await service.update(
        'service-uuid-1',
        updateData,
        'admin@test.com',
      );

      expect(result).toEqual(updatedService);
      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-uuid-1' },
        data: {
          ...updateData,
          updatedBy: 'admin@test.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if service does not exist', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(
        service.update('invalid-id', updateData, 'admin@test.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // STATUS TRANSITIONS
  // ============================================================================

  describe('activate', () => {
    it('should activate a CREATED service', async () => {
      const createdService = {
        ...mockService,
        status: ServiceStatus.CREATED,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        createdService,
      );
      const activatedService = { ...createdService, status: ServiceStatus.ACTIVE };
      mockPrismaService.serviceCatalog.update.mockResolvedValue(activatedService);

      const result = await service.activate('service-uuid-1', 'admin@test.com');

      expect(result.status).toBe(ServiceStatus.ACTIVE);
      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-uuid-1' },
        data: {
          status: ServiceStatus.ACTIVE,
          updatedBy: 'admin@test.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if already active', async () => {
      const activeService = {
        ...mockService,
        status: ServiceStatus.ACTIVE,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        activeService,
      );

      await expect(
        service.activate('service-uuid-1', 'admin@test.com'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.activate('service-uuid-1', 'admin@test.com'),
      ).rejects.toThrow('Service service-uuid-1 is already active');
    });

    it('should throw BadRequestException if deprecated', async () => {
      const deprecatedService = {
        ...mockService,
        status: ServiceStatus.DEPRECATED,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        deprecatedService,
      );

      await expect(
        service.activate('service-uuid-1', 'admin@test.com'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.activate('service-uuid-1', 'admin@test.com'),
      ).rejects.toThrow(
        'Cannot activate a deprecated service. Create a new service instead.',
      );
    });
  });

  describe('deprecate', () => {
    it('should deprecate an active service', async () => {
      const activeService = {
        ...mockService,
        status: ServiceStatus.ACTIVE,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        activeService,
      );
      const deprecatedService = {
        ...activeService,
        status: ServiceStatus.DEPRECATED,
      };
      mockPrismaService.serviceCatalog.update.mockResolvedValue(
        deprecatedService,
      );

      const result = await service.deprecate(
        'service-uuid-1',
        'No longer offered',
        'admin@test.com',
      );

      expect(result.status).toBe(ServiceStatus.DEPRECATED);
      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-uuid-1' },
        data: {
          status: ServiceStatus.DEPRECATED,
          deprecatedAt: expect.any(Date),
          deprecationReason: 'No longer offered',
          updatedBy: 'admin@test.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if already deprecated', async () => {
      const deprecatedService = {
        ...mockService,
        status: ServiceStatus.DEPRECATED,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        deprecatedService,
      );

      await expect(
        service.deprecate('service-uuid-1', 'Test', 'admin@test.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('archive', () => {
    it('should archive a deprecated service', async () => {
      const deprecatedService = {
        ...mockService,
        status: ServiceStatus.DEPRECATED,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        deprecatedService,
      );
      const archivedService = { ...deprecatedService, status: ServiceStatus.ARCHIVED };
      mockPrismaService.serviceCatalog.update.mockResolvedValue(archivedService);

      const result = await service.archive('service-uuid-1', 'admin@test.com');

      expect(result.status).toBe(ServiceStatus.ARCHIVED);
      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-uuid-1' },
        data: {
          status: ServiceStatus.ARCHIVED,
          updatedBy: 'admin@test.com',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if not deprecated', async () => {
      const activeService = {
        ...mockService,
        status: ServiceStatus.ACTIVE,
        contractTemplate: null,
        pricing: [],
        skillRequirements: [],
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        activeService,
      );

      await expect(
        service.archive('service-uuid-1', 'admin@test.com'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.archive('service-uuid-1', 'admin@test.com'),
      ).rejects.toThrow(
        'Service must be deprecated before archiving. Current status: ACTIVE',
      );
    });
  });

  // ============================================================================
  // CHECKSUM AND BREAKING CHANGES
  // ============================================================================

  describe('computeChecksum', () => {
    const serviceData = {
      externalServiceCode: 'TEST_001',
      serviceType: ServiceType.INSTALLATION,
      serviceCategory: ServiceCategory.HVAC,
      name: 'Test Service',
      description: 'Test Description',
      scopeIncluded: ['A', 'B', 'C'],
      scopeExcluded: ['D', 'E'],
      worksiteRequirements: ['Req1', 'Req2'],
      productPrerequisites: ['Pre1'],
      estimatedDurationMinutes: 120,
    };

    it('should compute deterministic checksum', () => {
      const checksum1 = service.computeChecksum(serviceData);
      const checksum2 = service.computeChecksum(serviceData);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toHaveLength(64); // SHA256 hex = 64 characters
    });

    it('should produce different checksums for different data', () => {
      const checksum1 = service.computeChecksum(serviceData);
      const checksum2 = service.computeChecksum({
        ...serviceData,
        name: 'Different Name',
      });

      expect(checksum1).not.toBe(checksum2);
    });

    it('should sort arrays for consistent hashing', () => {
      const data1 = { ...serviceData, scopeIncluded: ['C', 'A', 'B'] };
      const data2 = { ...serviceData, scopeIncluded: ['A', 'B', 'C'] };

      const checksum1 = service.computeChecksum(data1);
      const checksum2 = service.computeChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('detectBreakingChanges', () => {
    const existingService = {
      scopeIncluded: ['Installation', 'Testing', 'Documentation'],
      scopeExcluded: ['Maintenance'],
      worksiteRequirements: ['Power outlet'],
      productPrerequisites: ['AC unit purchased'],
    };

    it('should detect removed items from scope included', () => {
      const newData = {
        scopeIncluded: ['Installation', 'Testing'], // Removed 'Documentation'
        scopeExcluded: ['Maintenance'],
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['AC unit purchased'],
      };

      const result = service.detectBreakingChanges(existingService, newData);
      expect(result).toBe(true);
    });

    it('should detect added items to scope excluded', () => {
      const newData = {
        scopeIncluded: ['Installation', 'Testing', 'Documentation'],
        scopeExcluded: ['Maintenance', 'Repair'], // Added 'Repair'
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['AC unit purchased'],
      };

      const result = service.detectBreakingChanges(existingService, newData);
      expect(result).toBe(true);
    });

    it('should detect added worksite requirements', () => {
      const newData = {
        scopeIncluded: ['Installation', 'Testing', 'Documentation'],
        scopeExcluded: ['Maintenance'],
        worksiteRequirements: ['Power outlet', 'Wall space'], // Added 'Wall space'
        productPrerequisites: ['AC unit purchased'],
      };

      const result = service.detectBreakingChanges(existingService, newData);
      expect(result).toBe(true);
    });

    it('should detect added product prerequisites', () => {
      const newData = {
        scopeIncluded: ['Installation', 'Testing', 'Documentation'],
        scopeExcluded: ['Maintenance'],
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['AC unit purchased', 'Remote control'], // Added 'Remote control'
      };

      const result = service.detectBreakingChanges(existingService, newData);
      expect(result).toBe(true);
    });

    it('should not detect breaking changes for additions to scope included', () => {
      const newData = {
        scopeIncluded: ['Installation', 'Testing', 'Documentation', 'Warranty'], // Added 'Warranty'
        scopeExcluded: ['Maintenance'],
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['AC unit purchased'],
      };

      const result = service.detectBreakingChanges(existingService, newData);
      expect(result).toBe(false);
    });

    it('should not detect breaking changes for removals from scope excluded', () => {
      const newData = {
        scopeIncluded: ['Installation', 'Testing', 'Documentation'],
        scopeExcluded: [], // Removed 'Maintenance'
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['AC unit purchased'],
      };

      const result = service.detectBreakingChanges(existingService, newData);
      expect(result).toBe(false);
    });

    it('should not detect breaking changes when nothing changed', () => {
      const newData = { ...existingService };

      const result = service.detectBreakingChanges(existingService, newData);
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      mockPrismaService.serviceCatalog.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(40) // active
        .mockResolvedValueOnce(5) // deprecated
        .mockResolvedValueOnce(5); // archived

      mockPrismaService.serviceCatalog.groupBy
        .mockResolvedValueOnce([
          { serviceType: ServiceType.INSTALLATION, _count: 30 },
          { serviceType: ServiceType.MAINTENANCE, _count: 20 },
        ])
        .mockResolvedValueOnce([
          { serviceCategory: ServiceCategory.HVAC, _count: 25 },
          { serviceCategory: ServiceCategory.PLUMBING, _count: 25 },
        ])
        .mockResolvedValueOnce([
          { externalSource: 'PYXIS', _count: 30 },
          { externalSource: 'TEMPO', _count: 20 },
        ]);

      const result = await service.getStatistics('ES', 'LM');

      expect(result).toEqual({
        total: 50,
        byStatus: {
          active: 40,
          deprecated: 5,
          archived: 5,
        },
        byType: [
          { type: ServiceType.INSTALLATION, count: 30 },
          { type: ServiceType.MAINTENANCE, count: 20 },
        ],
        byCategory: [
          { category: ServiceCategory.HVAC, count: 25 },
          { category: ServiceCategory.PLUMBING, count: 25 },
        ],
        byExternalSource: [
          { source: 'PYXIS', count: 30 },
          { source: 'TEMPO', count: 20 },
        ],
      });
    });

    it('should call count with correct filters', async () => {
      mockPrismaService.serviceCatalog.count.mockResolvedValue(0);
      mockPrismaService.serviceCatalog.groupBy.mockResolvedValue([]);

      await service.getStatistics('FR', 'BD');

      expect(prisma.serviceCatalog.count).toHaveBeenCalledWith({
        where: { countryCode: 'FR', businessUnit: 'BD' },
      });
    });
  });
});
