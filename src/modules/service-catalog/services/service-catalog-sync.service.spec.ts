import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogSyncService } from './service-catalog-sync.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';

describe('ServiceCatalogSyncService', () => {
  let service: ServiceCatalogSyncService;
  let prisma: jest.Mocked<PrismaService>;

  const mockServiceData = {
    externalServiceCode: 'PYX_ES_HVAC_00123',
    countryCode: 'ES',
    businessUnit: 'LM_ES',
    type: 'installation',
    category: 'hvac',
    name: { es: 'Instalación AC', en: 'AC Installation' },
    description: { es: 'Descripción completa', en: 'Full description' },
    shortDescription: { es: 'Instalación AC', en: 'AC Install' },
    scopeIncluded: ['Remove old unit', 'Install new unit'],
    scopeExcluded: ['Wall modifications'],
    worksiteRequirements: ['Electrical outlet'],
    productPrerequisites: ['AC unit delivered'],
    contractType: 'pre_service',
    estimatedDuration: 180,
    complexity: 'MEDIUM',
    requiresTechnicalVisit: true,
    effectiveFrom: '2025-02-01T00:00:00Z',
    version: '2.0',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogSyncService,
        {
          provide: PrismaService,
          useValue: {
            serviceCatalog: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            serviceCatalogEventLog: {
              update: jest.fn(),
            },
            contractTemplate: {
              findFirst: jest.fn(),
            },
            serviceOrder: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ServiceCatalogSyncService>(ServiceCatalogSyncService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleServiceCreated', () => {
    it('should create a new service successfully', async () => {
      const eventLogId = 'evt-log-123';
      const createdService = {
        id: 'svc-123',
        fsmServiceCode: 'ES_HVAC_123456',
        externalServiceCode: mockServiceData.externalServiceCode,
        status: ServiceStatus.ACTIVE,
      };

      prisma.serviceCatalog.findUnique.mockResolvedValue(null);
      prisma.contractTemplate.findFirst.mockResolvedValue({ id: 'tpl-123' } as any);
      prisma.serviceCatalog.create.mockResolvedValue(createdService as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      await service.handleServiceCreated(mockServiceData, eventLogId);

      expect(prisma.serviceCatalog.findUnique).toHaveBeenCalledWith({
        where: { externalServiceCode: mockServiceData.externalServiceCode },
      });

      expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          externalServiceCode: mockServiceData.externalServiceCode,
          serviceType: ServiceType.INSTALLATION,
          serviceCategory: ServiceCategory.HVAC,
          status: ServiceStatus.ACTIVE,
          countryCode: 'ES',
          businessUnit: 'LM_ES',
        }),
      });

      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { id: eventLogId },
        data: { serviceId: createdService.id },
      });
    });

    it('should treat as update if service already exists (race condition)', async () => {
      const existingService = {
        id: 'svc-existing',
        externalServiceCode: mockServiceData.externalServiceCode,
      };

      prisma.serviceCatalog.findUnique.mockResolvedValue(existingService as any);
      prisma.serviceCatalog.update.mockResolvedValue(existingService as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      await service.handleServiceCreated(mockServiceData, 'evt-log-123');

      expect(prisma.serviceCatalog.update).toHaveBeenCalled();
      expect(prisma.serviceCatalog.create).not.toHaveBeenCalled();
    });

    it('should map service types correctly', async () => {
      const testCases = [
        { type: 'installation', expected: ServiceType.INSTALLATION },
        { type: 'confirmation_visit', expected: ServiceType.CONFIRMATION_TV },
        { type: 'quotation_visit', expected: ServiceType.QUOTATION_TV },
        { type: 'maintenance', expected: ServiceType.MAINTENANCE },
        { type: 'rework', expected: ServiceType.REWORK },
        { type: 'unknown', expected: ServiceType.INSTALLATION }, // default
      ];

      prisma.serviceCatalog.findUnique.mockResolvedValue(null);
      prisma.contractTemplate.findFirst.mockResolvedValue({ id: 'tpl-123' } as any);
      prisma.serviceCatalog.create.mockResolvedValue({ id: 'svc-123' } as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      for (const testCase of testCases) {
        const data = { ...mockServiceData, type: testCase.type };
        await service.handleServiceCreated(data, 'evt-log-123');

        expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            serviceType: testCase.expected,
          }),
        });

        jest.clearAllMocks();
      }
    });

    it('should map service categories correctly', async () => {
      const testCases = [
        { category: 'hvac', expected: ServiceCategory.HVAC },
        { category: 'plumbing', expected: ServiceCategory.PLUMBING },
        { category: 'electrical', expected: ServiceCategory.ELECTRICAL },
        { category: 'kitchen', expected: ServiceCategory.KITCHEN_INSTALLATION },
        { category: 'unknown', expected: ServiceCategory.OTHER },
      ];

      prisma.serviceCatalog.findUnique.mockResolvedValue(null);
      prisma.contractTemplate.findFirst.mockResolvedValue({ id: 'tpl-123' } as any);
      prisma.serviceCatalog.create.mockResolvedValue({ id: 'svc-123' } as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      for (const testCase of testCases) {
        const data = { ...mockServiceData, category: testCase.category };
        await service.handleServiceCreated(data, 'evt-log-123');

        expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            serviceCategory: testCase.expected,
          }),
        });

        jest.clearAllMocks();
      }
    });
  });

  describe('handleServiceUpdated', () => {
    it('should update an existing service', async () => {
      const existingService = {
        id: 'svc-123',
        externalServiceCode: mockServiceData.externalServiceCode,
        nameI18n: { es: 'Nombre antiguo' },
        scopeIncluded: ['Old scope'],
        syncChecksum: 'old-checksum',
      };

      prisma.serviceCatalog.findUnique.mockResolvedValue(existingService as any);
      prisma.serviceCatalog.update.mockResolvedValue({
        ...existingService,
        nameI18n: mockServiceData.name,
      } as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      await service.handleServiceUpdated(mockServiceData, 'evt-log-123');

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: existingService.id },
        data: expect.objectContaining({
          nameI18n: mockServiceData.name,
          descriptionI18n: mockServiceData.description,
          updatedBy: 'SYNC_JOB',
        }),
      });
    });

    it('should create service if not found during update', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(null);
      prisma.contractTemplate.findFirst.mockResolvedValue({ id: 'tpl-123' } as any);
      prisma.serviceCatalog.create.mockResolvedValue({ id: 'svc-new' } as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      await service.handleServiceUpdated(mockServiceData, 'evt-log-123');

      expect(prisma.serviceCatalog.create).toHaveBeenCalled();
      expect(prisma.serviceCatalog.update).not.toHaveBeenCalled();
    });

    it('should detect breaking changes (scope reduction)', async () => {
      const existingService = {
        id: 'svc-123',
        externalServiceCode: mockServiceData.externalServiceCode,
        scopeIncluded: ['Item 1', 'Item 2', 'Item 3'],
      };

      const updatedData = {
        ...mockServiceData,
        scopeIncluded: ['Item 1', 'Item 2'], // Item 3 removed - breaking change!
      };

      prisma.serviceCatalog.findUnique.mockResolvedValue(existingService as any);
      prisma.serviceCatalog.update.mockResolvedValue(existingService as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      await service.handleServiceUpdated(updatedData, 'evt-log-123');

      // Should still update but log warning (checked in console logs)
      expect(prisma.serviceCatalog.update).toHaveBeenCalled();
    });
  });

  describe('handleServiceDeprecated', () => {
    it('should deprecate a service successfully', async () => {
      const existingService = {
        id: 'svc-123',
        fsmServiceCode: 'ES_HVAC_123',
        externalServiceCode: mockServiceData.externalServiceCode,
      };

      prisma.serviceCatalog.findUnique.mockResolvedValue(existingService as any);
      prisma.serviceOrder.count.mockResolvedValue(0);
      prisma.serviceCatalog.update.mockResolvedValue({
        ...existingService,
        status: ServiceStatus.DEPRECATED,
      } as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      const deprecateData = {
        externalServiceCode: mockServiceData.externalServiceCode,
        reason: 'Service discontinued',
      };

      await service.handleServiceDeprecated(deprecateData as any, 'evt-log-123');

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: existingService.id },
        data: expect.objectContaining({
          status: ServiceStatus.DEPRECATED,
          deprecatedReason: 'Service discontinued',
          updatedBy: 'SYNC_JOB',
        }),
      });
    });

    it('should throw error if service not found', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(null);

      const deprecateData = {
        externalServiceCode: 'NON_EXISTENT',
      };

      await expect(
        service.handleServiceDeprecated(deprecateData as any, 'evt-log-123')
      ).rejects.toThrow('Service not found');
    });

    it('should warn when deprecating service with active orders', async () => {
      const existingService = {
        id: 'svc-123',
        externalServiceCode: mockServiceData.externalServiceCode,
      };

      prisma.serviceCatalog.findUnique.mockResolvedValue(existingService as any);
      prisma.serviceOrder.count.mockResolvedValue(15); // 15 active orders
      prisma.serviceCatalog.update.mockResolvedValue({
        ...existingService,
        status: ServiceStatus.DEPRECATED,
      } as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      const deprecateData = {
        externalServiceCode: mockServiceData.externalServiceCode,
      };

      await service.handleServiceDeprecated(deprecateData as any, 'evt-log-123');

      // Should still deprecate but log warning (15 active orders)
      expect(prisma.serviceCatalog.update).toHaveBeenCalled();
    });

    it('should link replacement service if provided', async () => {
      const existingService = {
        id: 'svc-old',
        externalServiceCode: 'OLD_SERVICE',
      };

      const replacementService = {
        id: 'svc-new',
        externalServiceCode: 'NEW_SERVICE',
      };

      prisma.serviceCatalog.findUnique
        .mockResolvedValueOnce(existingService as any) // First call: find service to deprecate
        .mockResolvedValueOnce(replacementService as any); // Second call: find replacement

      prisma.serviceOrder.count.mockResolvedValue(0);
      prisma.serviceCatalog.update.mockResolvedValue(existingService as any);
      prisma.serviceCatalogEventLog.update.mockResolvedValue({} as any);

      const deprecateData = {
        externalServiceCode: 'OLD_SERVICE',
        replacementServiceCode: 'NEW_SERVICE',
      };

      await service.handleServiceDeprecated(deprecateData as any, 'evt-log-123');

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: existingService.id },
        data: expect.objectContaining({
          replacementServiceId: replacementService.id,
        }),
      });
    });
  });
});
