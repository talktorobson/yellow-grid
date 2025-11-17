import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCatalogService } from './service-catalog.service';
import { PricingService } from './pricing.service';
import { GeographicService } from './geographic.service';
import { ProviderSpecialtyService } from './provider-specialty.service';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { DeprecateServiceDto } from './dto/deprecate-service.dto';
jest.mock('csv-parse/sync', () => ({ parse: jest.fn() }), { virtual: true });

describe('ServiceCatalogController - CRUD Endpoints', () => {
  let controller: ServiceCatalogController;
  let serviceCatalogService: jest.Mocked<ServiceCatalogService>;

  const mockService = {
    id: 'svc-123',
    externalServiceCode: 'PYX_ES_HVAC_00123',
    fsmServiceCode: 'ES_HVAC_123456',
    externalSource: 'PYXIS',
    countryCode: 'ES',
    businessUnit: 'LM_ES',
    serviceType: ServiceType.INSTALLATION,
    serviceCategory: ServiceCategory.HVAC,
    name: 'Air Conditioning Installation',
    description: 'Complete residential AC installation',
    scopeIncluded: ['Remove old unit', 'Install new unit'],
    scopeExcluded: ['Wall modifications'],
    worksiteRequirements: ['Electrical outlet'],
    productPrerequisites: ['AC unit delivered'],
    estimatedDurationMinutes: 180,
    requiresPreServiceContract: true,
    requiresPostServiceWCF: true,
    contractTemplateId: 'tpl-123',
    status: ServiceStatus.ACTIVE,
    deprecatedAt: null,
    deprecationReason: null,
    syncChecksum: 'abc123',
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'API_USER',
    updatedBy: 'API_USER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceCatalogController],
      providers: [
        {
          provide: ServiceCatalogService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            deprecate: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            search: jest.fn(),
            getStatistics: jest.fn(),
          },
        },
        {
          provide: PricingService,
          useValue: {},
        },
        {
          provide: GeographicService,
          useValue: {},
        },
        {
          provide: ProviderSpecialtyService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ServiceCatalogController>(ServiceCatalogController);
    serviceCatalogService = module.get(ServiceCatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /services - createService', () => {
    it('should create a new service with all fields', async () => {
      const dto: CreateServiceDto = {
        externalServiceCode: 'PYX_ES_HVAC_00123',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INSTALLATION',
        serviceCategory: 'HVAC',
        name: {
          es: 'Instalación de Aire Acondicionado',
          en: 'Air Conditioning Installation',
        },
        description: {
          es: 'Instalación completa de sistema AC',
          en: 'Complete AC system installation',
        },
        scopeIncluded: ['Remove old unit', 'Install new unit'],
        scopeExcluded: ['Wall modifications'],
        worksiteRequirements: ['Electrical outlet within 2m'],
        productPrerequisites: ['AC unit delivered to site'],
        contractTemplateId: 'tpl-123',
        estimatedDurationMinutes: 180,
        requiresPreServiceContract: true,
        requiresPostServiceWCF: true,
      };

      serviceCatalogService.create.mockResolvedValue(mockService as any);

      const result = await controller.createService(dto);

      expect(result).toEqual(mockService);
      expect(serviceCatalogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          externalServiceCode: dto.externalServiceCode,
          externalSource: dto.externalSource,
          countryCode: dto.countryCode,
          businessUnit: dto.businessUnit,
          serviceType: ServiceType.INSTALLATION,
          serviceCategory: ServiceCategory.HVAC,
          name: 'Air Conditioning Installation', // English extracted
          description: 'Complete AC system installation',
          scopeIncluded: dto.scopeIncluded,
          scopeExcluded: dto.scopeExcluded,
          estimatedDurationMinutes: 180,
          createdBy: 'API_USER',
        })
      );

      // Verify FSM code was generated
      const createCall = serviceCatalogService.create.mock.calls[0][0];
      expect(createCall.fsmServiceCode).toMatch(/ES_HVAC_\d{6}\d{3}/);
    });

    it('should create service with minimal required fields', async () => {
      const dto: CreateServiceDto = {
        externalServiceCode: 'PYX_ES_HVAC_00456',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INSTALLATION',
        serviceCategory: 'HVAC',
        name: { es: 'Instalación Básica' },
        estimatedDurationMinutes: 120,
      };

      serviceCatalogService.create.mockResolvedValue(mockService as any);

      const result = await controller.createService(dto);

      expect(serviceCatalogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Instalación Básica', // Spanish used as fallback
          description: undefined,
          scopeIncluded: [],
          scopeExcluded: [],
          worksiteRequirements: [],
          productPrerequisites: [],
          requiresPreServiceContract: false,
          requiresPostServiceWCF: true,
          contractTemplateId: undefined,
        })
      );
    });

    it('should use English name when available', async () => {
      const dto: CreateServiceDto = {
        externalServiceCode: 'PYX_ES_HVAC_00789',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INSTALLATION',
        serviceCategory: 'HVAC',
        name: {
          es: 'Nombre en Español',
          fr: 'Nom en Français',
          en: 'English Name',
        },
        estimatedDurationMinutes: 180,
      };

      serviceCatalogService.create.mockResolvedValue(mockService as any);

      await controller.createService(dto);

      const createCall = serviceCatalogService.create.mock.calls[0][0];
      expect(createCall.name).toBe('English Name');
    });

    it('should fallback through language chain (en → es → fr → it → pl)', async () => {
      const testCases = [
        { name: { pl: 'Polski' }, expected: 'Polski' },
        { name: { it: 'Italiano', pl: 'Polski' }, expected: 'Italiano' },
        { name: { fr: 'Français', it: 'Italiano' }, expected: 'Français' },
        { name: { es: 'Español', fr: 'Français' }, expected: 'Español' },
        { name: { en: 'English', es: 'Español' }, expected: 'English' },
      ];

      for (const testCase of testCases) {
        serviceCatalogService.create.mockResolvedValue(mockService as any);

        const dto: CreateServiceDto = {
          externalServiceCode: `TEST_${Math.random()}`,
          externalSource: 'PYXIS',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          serviceType: 'INSTALLATION',
          serviceCategory: 'HVAC',
          name: testCase.name as any,
          estimatedDurationMinutes: 180,
        };

        await controller.createService(dto);

        const createCall = serviceCatalogService.create.mock.calls[serviceCatalogService.create.mock.calls.length - 1][0];
        expect(createCall.name).toBe(testCase.expected);
      }
    });

    it('should handle ConflictException for duplicate external code', async () => {
      const dto: CreateServiceDto = {
        externalServiceCode: 'PYX_ES_HVAC_DUPLICATE',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INSTALLATION',
        serviceCategory: 'HVAC',
        name: { en: 'Duplicate Service' },
        estimatedDurationMinutes: 180,
      };

      serviceCatalogService.create.mockRejectedValue(
        new ConflictException('Service with external code already exists')
      );

      await expect(controller.createService(dto)).rejects.toThrow(ConflictException);
    });

    it('should generate unique FSM service codes', async () => {
      serviceCatalogService.create.mockResolvedValue(mockService as any);

      const dto: CreateServiceDto = {
        externalServiceCode: 'TEST_CODE',
        externalSource: 'PYXIS',
        countryCode: 'FR',
        businessUnit: 'LM_FR',
        serviceType: 'INSTALLATION',
        serviceCategory: 'PLUMBING',
        name: { en: 'Test Service' },
        estimatedDurationMinutes: 120,
      };

      // Create multiple services
      await controller.createService(dto);
      await controller.createService({ ...dto, externalServiceCode: 'TEST_CODE_2' });
      await controller.createService({ ...dto, externalServiceCode: 'TEST_CODE_3' });

      const calls = serviceCatalogService.create.mock.calls;
      const fsmCodes = calls.map(call => call[0].fsmServiceCode);

      // All should start with FR_PLUM
      fsmCodes.forEach(code => {
        expect(code).toMatch(/^FR_PLUM_\d{6}\d{3}$/);
      });

      // All should be unique (very high probability)
      const uniqueCodes = new Set(fsmCodes);
      expect(uniqueCodes.size).toBe(fsmCodes.length);
    });
  });

  describe('PATCH /services/:id - updateService', () => {
    it('should update service with partial data', async () => {
      const dto: UpdateServiceDto = {
        name: { en: 'Updated AC Installation' },
        estimatedDurationMinutes: 200,
      };

      const updatedService = {
        ...mockService,
        name: 'Updated AC Installation',
        estimatedDurationMinutes: 200,
      };

      serviceCatalogService.update.mockResolvedValue(updatedService as any);

      const result = await controller.updateService('svc-123', dto);

      expect(result).toEqual(updatedService);
      expect(serviceCatalogService.update).toHaveBeenCalledWith(
        'svc-123',
        {
          name: 'Updated AC Installation',
          estimatedDurationMinutes: 200,
        },
        'API_USER'
      );
    });

    it('should update multiple fields', async () => {
      const dto: UpdateServiceDto = {
        name: { es: 'Nombre Actualizado' },
        description: { es: 'Descripción Actualizada' },
        scopeIncluded: ['New scope item 1', 'New scope item 2'],
        estimatedDurationMinutes: 240,
        requiresPreServiceContract: false,
      };

      serviceCatalogService.update.mockResolvedValue(mockService as any);

      await controller.updateService('svc-123', dto);

      expect(serviceCatalogService.update).toHaveBeenCalledWith(
        'svc-123',
        expect.objectContaining({
          name: 'Nombre Actualizado',
          description: 'Descripción Actualizada',
          scopeIncluded: dto.scopeIncluded,
          estimatedDurationMinutes: 240,
          requiresPreServiceContract: false,
        }),
        'API_USER'
      );
    });

    it('should only update provided fields', async () => {
      const dto: UpdateServiceDto = {
        estimatedDurationMinutes: 150,
      };

      serviceCatalogService.update.mockResolvedValue(mockService as any);

      await controller.updateService('svc-123', dto);

      const updateData = serviceCatalogService.update.mock.calls[0][1];
      expect(updateData).toEqual({
        estimatedDurationMinutes: 150,
      });
      expect(updateData).not.toHaveProperty('name');
      expect(updateData).not.toHaveProperty('description');
    });

    it('should handle NotFoundException for non-existent service', async () => {
      const dto: UpdateServiceDto = {
        name: { en: 'Updated Name' },
      };

      serviceCatalogService.update.mockRejectedValue(
        new NotFoundException('Service with ID svc-nonexistent not found')
      );

      await expect(controller.updateService('svc-nonexistent', dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should update I18n fields correctly with fallback order (en → es → fr → it → pl)', async () => {
      const dto: UpdateServiceDto = {
        name: {
          es: 'Nombre ES',
          fr: 'Nom FR',
        },
        description: {
          en: 'Description EN',
          it: 'Descrizione IT',
        },
      };

      serviceCatalogService.update.mockResolvedValue(mockService as any);

      await controller.updateService('svc-123', dto);

      const updateData = serviceCatalogService.update.mock.calls[0][1];
      expect(updateData.name).toBe('Nombre ES'); // es is second in priority (en not provided)
      expect(updateData.description).toBe('Description EN'); // en is first priority
    });

    it('should update arrays correctly', async () => {
      const dto: UpdateServiceDto = {
        scopeIncluded: ['New item 1', 'New item 2'],
        scopeExcluded: ['Excluded item 1'],
        worksiteRequirements: ['Requirement 1', 'Requirement 2'],
        productPrerequisites: [],
      };

      serviceCatalogService.update.mockResolvedValue(mockService as any);

      await controller.updateService('svc-123', dto);

      const updateData = serviceCatalogService.update.mock.calls[0][1];
      expect(updateData.scopeIncluded).toEqual(dto.scopeIncluded);
      expect(updateData.scopeExcluded).toEqual(dto.scopeExcluded);
      expect(updateData.worksiteRequirements).toEqual(dto.worksiteRequirements);
      expect(updateData.productPrerequisites).toEqual([]);
    });

    it('should update contract template ID', async () => {
      const dto: UpdateServiceDto = {
        contractTemplateId: 'new-template-id',
      };

      serviceCatalogService.update.mockResolvedValue(mockService as any);

      await controller.updateService('svc-123', dto);

      const updateData = serviceCatalogService.update.mock.calls[0][1];
      expect(updateData.contractTemplateId).toBe('new-template-id');
    });
  });

  describe('DELETE /services/:id - deprecateService', () => {
    it('should deprecate service with reason', async () => {
      const dto: DeprecateServiceDto = {
        reason: 'Service discontinued, replaced by new model',
        replacementServiceId: 'svc-456',
      };

      const deprecatedService = {
        ...mockService,
        status: ServiceStatus.DEPRECATED,
        deprecatedAt: new Date(),
        deprecationReason: dto.reason,
      };

      serviceCatalogService.deprecate.mockResolvedValue(deprecatedService as any);

      const result = await controller.deprecateService('svc-123', dto);

      expect(result).toEqual(deprecatedService);
      expect(serviceCatalogService.deprecate).toHaveBeenCalledWith(
        'svc-123',
        dto.reason,
        'API_USER'
      );
    });

    it('should deprecate service without reason (use default)', async () => {
      const dto: DeprecateServiceDto = {};

      const deprecatedService = {
        ...mockService,
        status: ServiceStatus.DEPRECATED,
        deprecatedAt: new Date(),
        deprecationReason: 'Deprecated via API',
      };

      serviceCatalogService.deprecate.mockResolvedValue(deprecatedService as any);

      await controller.deprecateService('svc-123', dto);

      expect(serviceCatalogService.deprecate).toHaveBeenCalledWith(
        'svc-123',
        'Deprecated via API',
        'API_USER'
      );
    });

    it('should handle NotFoundException for non-existent service', async () => {
      const dto: DeprecateServiceDto = {
        reason: 'Test deprecation',
      };

      serviceCatalogService.deprecate.mockRejectedValue(
        new NotFoundException('Service with ID svc-nonexistent not found')
      );

      await expect(controller.deprecateService('svc-nonexistent', dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle BadRequestException for already deprecated service', async () => {
      const dto: DeprecateServiceDto = {
        reason: 'Already deprecated',
      };

      serviceCatalogService.deprecate.mockRejectedValue(
        new BadRequestException('Service svc-123 is already deprecated')
      );

      await expect(controller.deprecateService('svc-123', dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should deprecate with custom reason', async () => {
      const customReasons = [
        'Service no longer offered',
        'Replaced by updated version',
        'Customer demand too low',
        'Regulatory compliance issue',
      ];

      for (const reason of customReasons) {
        serviceCatalogService.deprecate.mockResolvedValue({
          ...mockService,
          status: ServiceStatus.DEPRECATED,
          deprecationReason: reason,
        } as any);

        await controller.deprecateService('svc-123', { reason });

        expect(serviceCatalogService.deprecate).toHaveBeenCalledWith(
          'svc-123',
          reason,
          'API_USER'
        );
      }
    });

    it('should handle empty DTO body', async () => {
      const dto: DeprecateServiceDto = {};

      serviceCatalogService.deprecate.mockResolvedValue({
        ...mockService,
        status: ServiceStatus.DEPRECATED,
      } as any);

      await controller.deprecateService('svc-123', dto);

      expect(serviceCatalogService.deprecate).toHaveBeenCalledWith(
        'svc-123',
        'Deprecated via API',
        'API_USER'
      );
    });
  });
});
