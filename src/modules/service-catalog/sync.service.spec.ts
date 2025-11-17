import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogSyncService } from './sync.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServiceCatalogService } from './service-catalog.service';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';

describe('ServiceCatalogSyncService', () => {
  let service: ServiceCatalogSyncService;
  let prisma: PrismaService;
  let serviceCatalogService: ServiceCatalogService;

  const mockPrismaService = {
    serviceCatalog: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockServiceCatalogService = {
    computeChecksum: jest.fn(),
    detectBreakingChanges: jest.fn(),
  };

  const mockExternalEvent = {
    externalServiceCode: 'PYX_ES_HVAC_001',
    source: 'PYXIS',
    countryCode: 'ES',
    businessUnit: 'LM',
    type: 'installation',
    category: 'hvac',
    name: {
      es: 'Instalación de Aire Acondicionado',
      en: 'Air Conditioning Installation',
    },
    description: {
      es: 'Instalación completa de sistema AC',
      en: 'Complete AC system installation',
    },
    scopeIncluded: ['Installation', 'Testing', 'Documentation'],
    scopeExcluded: ['Maintenance'],
    worksiteRequirements: ['Power outlet'],
    productPrerequisites: ['AC unit delivered'],
    contractType: 'pre_service',
    estimatedDuration: 180,
    complexity: 'MEDIUM',
    requiresTechnicalVisit: true,
  };

  const mockService = {
    id: 'service-uuid-1',
    externalServiceCode: 'PYX_ES_HVAC_001',
    fsmServiceCode: 'ES_HVAC_12345',
    externalSource: 'PYXIS',
    countryCode: 'ES',
    businessUnit: 'LM',
    serviceType: ServiceType.INSTALLATION,
    serviceCategory: ServiceCategory.HVAC,
    name: 'Air Conditioning Installation',
    description: 'Complete AC system installation',
    scopeIncluded: ['Installation', 'Testing', 'Documentation'],
    scopeExcluded: ['Maintenance'],
    worksiteRequirements: ['Power outlet'],
    productPrerequisites: ['AC unit delivered'],
    estimatedDurationMinutes: 180,
    requiresPreServiceContract: true,
    requiresPostServiceWCF: true,
    status: ServiceStatus.ACTIVE,
    syncChecksum: 'abc123',
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'SYNC_JOB',
    updatedBy: 'SYNC_JOB',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogSyncService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ServiceCatalogService, useValue: mockServiceCatalogService },
      ],
    }).compile();

    service = module.get<ServiceCatalogSyncService>(
      ServiceCatalogSyncService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    serviceCatalogService = module.get<ServiceCatalogService>(
      ServiceCatalogService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // HANDLE SERVICE CREATED
  // ============================================================================

  describe('handleServiceCreated', () => {
    beforeEach(() => {
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc123');
    });

    it('should create a new service', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);

      const result = await service.handleServiceCreated(mockExternalEvent);

      expect(result).toEqual(mockService);
      expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          externalServiceCode: 'PYX_ES_HVAC_001',
          externalSource: 'PYXIS',
          countryCode: 'ES',
          businessUnit: 'LM',
          serviceType: ServiceType.INSTALLATION,
          serviceCategory: ServiceCategory.HVAC,
          status: ServiceStatus.ACTIVE,
          createdBy: 'SYNC_JOB',
          updatedBy: 'SYNC_JOB',
        }),
      });
    });

    it('should extract localized name from i18n object', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);

      await service.handleServiceCreated(mockExternalEvent);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.name).toBe('Air Conditioning Installation'); // English version
    });

    it('should treat duplicate as update if service already exists', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        mockService,
      );
      mockPrismaService.serviceCatalog.update.mockResolvedValue(mockService);

      const result = await service.handleServiceCreated(mockExternalEvent);

      expect(prisma.serviceCatalog.create).not.toHaveBeenCalled();
      expect(prisma.serviceCatalog.update).toHaveBeenCalled();
    });

    it('should compute checksum for drift detection', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);

      await service.handleServiceCreated(mockExternalEvent);

      expect(serviceCatalogService.computeChecksum).toHaveBeenCalledWith(
        expect.objectContaining({
          externalServiceCode: 'PYX_ES_HVAC_001',
          serviceType: ServiceType.INSTALLATION,
          serviceCategory: ServiceCategory.HVAC,
        }),
      );
    });

    it('should generate FSM service code', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);

      await service.handleServiceCreated(mockExternalEvent);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.fsmServiceCode).toMatch(/^ES_HVAC_\d{5}$/);
    });

    it('should set requiresPreServiceContract based on contractType', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);

      await service.handleServiceCreated(mockExternalEvent);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.requiresPreServiceContract).toBe(true);
    });
  });

  // ============================================================================
  // HANDLE SERVICE UPDATED
  // ============================================================================

  describe('handleServiceUpdated', () => {
    beforeEach(() => {
      mockServiceCatalogService.computeChecksum.mockReturnValue('def456');
      mockServiceCatalogService.detectBreakingChanges.mockReturnValue(false);
    });

    it('should update an existing service', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        mockService,
      );
      const updated = { ...mockService, syncChecksum: 'def456' };
      mockPrismaService.serviceCatalog.update.mockResolvedValue(updated);

      const result = await service.handleServiceUpdated(mockExternalEvent);

      expect(result).toEqual(updated);
      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-uuid-1' },
        data: expect.objectContaining({
          syncChecksum: 'def456',
          lastSyncedAt: expect.any(Date),
          updatedBy: 'SYNC_JOB',
        }),
      });
    });

    it('should create service if not found', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);

      const result = await service.handleServiceUpdated(mockExternalEvent);

      expect(prisma.serviceCatalog.create).toHaveBeenCalled();
      expect(prisma.serviceCatalog.update).not.toHaveBeenCalled();
    });

    it('should detect and log breaking changes', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        mockService,
      );
      mockServiceCatalogService.detectBreakingChanges.mockReturnValue(true);
      mockPrismaService.serviceCatalog.update.mockResolvedValue(mockService);

      await service.handleServiceUpdated(mockExternalEvent);

      expect(serviceCatalogService.detectBreakingChanges).toHaveBeenCalledWith(
        mockService,
        expect.any(Object),
      );
      // Still updates even with breaking changes (just logs warning)
      expect(prisma.serviceCatalog.update).toHaveBeenCalled();
    });

    it('should update scope arrays', async () => {
      const eventWithChangedScope = {
        ...mockExternalEvent,
        scopeIncluded: ['Installation', 'Testing', 'Documentation', 'Warranty'],
        scopeExcluded: ['Maintenance', 'Repair'],
      };

      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        mockService,
      );
      mockPrismaService.serviceCatalog.update.mockResolvedValue(mockService);

      await service.handleServiceUpdated(eventWithChangedScope);

      const callArgs = (prisma.serviceCatalog.update as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.scopeIncluded).toHaveLength(4);
      expect(callArgs.data.scopeExcluded).toHaveLength(2);
    });

    it('should update estimatedDurationMinutes', async () => {
      const eventWithNewDuration = {
        ...mockExternalEvent,
        estimatedDuration: 240,
      };

      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        mockService,
      );
      mockPrismaService.serviceCatalog.update.mockResolvedValue(mockService);

      await service.handleServiceUpdated(eventWithNewDuration);

      const callArgs = (prisma.serviceCatalog.update as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.estimatedDurationMinutes).toBe(240);
    });
  });

  // ============================================================================
  // HANDLE SERVICE DEPRECATED
  // ============================================================================

  describe('handleServiceDeprecated', () => {
    it('should deprecate an active service', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        mockService,
      );
      const deprecated = {
        ...mockService,
        status: ServiceStatus.DEPRECATED,
        deprecatedAt: new Date(),
      };
      mockPrismaService.serviceCatalog.update.mockResolvedValue(deprecated);

      const deprecationEvent = {
        externalServiceCode: 'PYX_ES_HVAC_001',
        reason: 'Service discontinued',
      };

      const result = await service.handleServiceDeprecated(deprecationEvent);

      expect(result.status).toBe(ServiceStatus.DEPRECATED);
      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-uuid-1' },
        data: expect.objectContaining({
          status: ServiceStatus.DEPRECATED,
          deprecatedAt: expect.any(Date),
          deprecationReason: 'Service discontinued',
          updatedBy: 'SYNC_JOB',
        }),
      });
    });

    it('should throw error if service not found', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);

      const deprecationEvent = {
        externalServiceCode: 'NONEXISTENT',
        reason: 'Test',
      };

      await expect(
        service.handleServiceDeprecated(deprecationEvent),
      ).rejects.toThrow('Service NONEXISTENT not found');
    });

    it('should handle already deprecated service gracefully', async () => {
      const deprecatedService = {
        ...mockService,
        status: ServiceStatus.DEPRECATED,
        deprecatedAt: new Date(),
      };
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        deprecatedService,
      );
      mockPrismaService.serviceCatalog.update.mockResolvedValue(
        deprecatedService,
      );

      const deprecationEvent = {
        externalServiceCode: 'PYX_ES_HVAC_001',
        reason: 'Test',
      };

      const result = await service.handleServiceDeprecated(deprecationEvent);

      expect(result).toEqual(deprecatedService);
      // Should NOT update if already deprecated
      expect(prisma.serviceCatalog.update).not.toHaveBeenCalled();
    });

    it('should use default reason if not provided', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(
        mockService,
      );
      mockPrismaService.serviceCatalog.update.mockResolvedValue(mockService);

      const deprecationEvent = {
        externalServiceCode: 'PYX_ES_HVAC_001',
      };

      await service.handleServiceDeprecated(deprecationEvent);

      const callArgs = (prisma.serviceCatalog.update as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.deprecationReason).toBe(
        'Deprecated by external system',
      );
    });
  });

  // ============================================================================
  // MAPPING METHODS
  // ============================================================================

  describe('Service type mapping', () => {
    it('should map all service types correctly', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc');

      const types = [
        { external: 'installation', expected: ServiceType.INSTALLATION },
        {
          external: 'confirmation_visit',
          expected: ServiceType.CONFIRMATION_TV,
        },
        { external: 'quotation_visit', expected: ServiceType.QUOTATION_TV },
        { external: 'maintenance', expected: ServiceType.MAINTENANCE },
        { external: 'rework', expected: ServiceType.REWORK },
        { external: 'complex', expected: ServiceType.COMPLEX },
      ];

      for (const type of types) {
        const event = { ...mockExternalEvent, type: type.external };
        await service.handleServiceCreated(event);

        const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
          .calls[0][0];
        expect(callArgs.data.serviceType).toBe(type.expected);

        jest.clearAllMocks();
      }
    });

    it('should default to INSTALLATION for unknown type', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc');

      const event = { ...mockExternalEvent, type: 'unknown_type' };
      await service.handleServiceCreated(event);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.serviceType).toBe(ServiceType.INSTALLATION);
    });
  });

  describe('Service category mapping', () => {
    it('should map common service categories', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc');

      const categories = [
        { external: 'hvac', expected: ServiceCategory.HVAC },
        { external: 'plumbing', expected: ServiceCategory.PLUMBING },
        { external: 'electrical', expected: ServiceCategory.ELECTRICAL },
        {
          external: 'kitchen',
          expected: ServiceCategory.KITCHEN,
        },
        {
          external: 'bathroom',
          expected: ServiceCategory.BATHROOM,
        },
        { external: 'flooring', expected: ServiceCategory.FLOORING },
        { external: 'windows', expected: ServiceCategory.WINDOWS_DOORS },
        { external: 'garden', expected: ServiceCategory.GARDEN },
        {
          external: 'furniture',
          expected: ServiceCategory.FURNITURE,
        },
      ];

      for (const category of categories) {
        const event = { ...mockExternalEvent, category: category.external };
        await service.handleServiceCreated(event);

        const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
          .calls[0][0];
        expect(callArgs.data.serviceCategory).toBe(category.expected);

        jest.clearAllMocks();
      }
    });

    it('should default to OTHER for unknown category', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc');

      const event = { ...mockExternalEvent, category: 'unknown_category' };
      await service.handleServiceCreated(event);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.serviceCategory).toBe(
        ServiceCategory.OTHER,
      );
    });
  });

  describe('Localized string extraction', () => {
    it('should extract English string from i18n object', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc');

      await service.handleServiceCreated(mockExternalEvent);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.name).toBe('Air Conditioning Installation');
    });

    it('should handle plain string name', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc');

      const event = {
        ...mockExternalEvent,
        name: 'Simple String Name',
      };

      await service.handleServiceCreated(event);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.name).toBe('Simple String Name');
    });

    it('should return empty string for invalid input', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.create.mockResolvedValue(mockService);
      mockServiceCatalogService.computeChecksum.mockReturnValue('abc');

      const event = {
        ...mockExternalEvent,
        name: null,
      };

      await service.handleServiceCreated(event);

      const callArgs = (prisma.serviceCatalog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.name).toBe('');
    });
  });
});
