import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogService } from './service-catalog.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ServiceType, ServiceCategory, ServiceStatus } from '@prisma/client';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

/**
 * Integration tests for ServiceCatalogService
 * Tests real database operations with Prisma
 */
describe('ServiceCatalogService (Integration)', () => {
  let service: ServiceCatalogService;
  let prisma: PrismaService;
  let testServiceId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceCatalogService, PrismaService],
    }).compile();

    service = module.get<ServiceCatalogService>(ServiceCatalogService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup: delete all test services
    await prisma.serviceCatalog.deleteMany({
      where: {
        externalServiceCode: {
          startsWith: 'TEST_',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create a new service successfully', async () => {
      const createData = {
        externalServiceCode: 'TEST_HVAC_001',
        fsmServiceCode: 'ES_HVAC_123456',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        name: 'Test HVAC Installation',
        description: 'Test service for HVAC installation',
        scopeIncluded: ['Remove old unit', 'Install new unit'],
        scopeExcluded: ['Wall modifications'],
        worksiteRequirements: ['Electrical outlet'],
        productPrerequisites: ['AC unit delivered'],
        estimatedDurationMinutes: 180,
        requiresPreServiceContract: true,
        requiresPostServiceWCF: true,
        contractTemplateId: 'tpl-123',
        createdBy: 'TEST_USER',
      };

      const result = await service.create(createData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.externalServiceCode).toBe(createData.externalServiceCode);
      expect(result.fsmServiceCode).toBe(createData.fsmServiceCode);
      expect(result.name).toBe(createData.name);
      expect(result.serviceType).toBe(ServiceType.INSTALLATION);
      expect(result.serviceCategory).toBe(ServiceCategory.HVAC);
      expect(result.status).toBe(ServiceStatus.ACTIVE);
      expect(result.scopeIncluded).toEqual(createData.scopeIncluded);
      expect(result.scopeExcluded).toEqual(createData.scopeExcluded);
      expect(result.estimatedDurationMinutes).toBe(180);

      testServiceId = result.id;

      // Verify in database
      const dbService = await prisma.serviceCatalog.findUnique({
        where: { id: result.id },
      });

      expect(dbService).toBeDefined();
      expect(dbService.externalServiceCode).toBe(createData.externalServiceCode);
    });

    it('should reject duplicate external service code', async () => {
      const createData = {
        externalServiceCode: 'TEST_HVAC_001', // Duplicate
        fsmServiceCode: 'ES_HVAC_999999',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        name: 'Duplicate Service',
        scopeIncluded: [],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        estimatedDurationMinutes: 120,
        requiresPreServiceContract: false,
        requiresPostServiceWCF: true,
        createdBy: 'TEST_USER',
      };

      await expect(service.create(createData)).rejects.toThrow(ConflictException);
    });

    it('should create service with minimal required fields', async () => {
      const createData = {
        externalServiceCode: 'TEST_MINIMAL_001',
        fsmServiceCode: 'ES_PLUM_234567',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: ServiceType.MAINTENANCE,
        serviceCategory: ServiceCategory.PLUMBING,
        name: 'Minimal Plumbing Service',
        scopeIncluded: [],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        estimatedDurationMinutes: 60,
        requiresPreServiceContract: false,
        requiresPostServiceWCF: true,
        createdBy: 'TEST_USER',
      };

      const result = await service.create(createData);

      expect(result).toBeDefined();
      expect(result.description).toBeNull();
      expect(result.scopeIncluded).toEqual([]);
      expect(result.scopeExcluded).toEqual([]);
      expect(result.requiresPreServiceContract).toBe(false);
      expect(result.requiresPostServiceWCF).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find service by ID', async () => {
      const result = await service.findById(testServiceId);

      expect(result).toBeDefined();
      expect(result.id).toBe(testServiceId);
      expect(result.externalServiceCode).toBe('TEST_HVAC_001');
      expect(result.name).toBe('Test HVAC Installation');
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(service.findById(fakeId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByExternalCode', () => {
    it('should find service by external code', async () => {
      const result = await service.findByExternalCode('TEST_HVAC_001');

      expect(result).toBeDefined();
      expect(result.id).toBe(testServiceId);
      expect(result.externalServiceCode).toBe('TEST_HVAC_001');
    });

    it('should throw NotFoundException for non-existent code', async () => {
      await expect(service.findByExternalCode('NONEXISTENT_CODE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByFSMCode', () => {
    it('should find service by FSM code', async () => {
      const result = await service.findByFSMCode('ES_HVAC_123456');

      expect(result).toBeDefined();
      expect(result.id).toBe(testServiceId);
      expect(result.fsmServiceCode).toBe('ES_HVAC_123456');
    });

    it('should throw NotFoundException for non-existent FSM code', async () => {
      await expect(service.findByFSMCode('NONEXISTENT_FSM')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    beforeAll(async () => {
      // Create additional test services for filtering tests
      await service.create({
        externalServiceCode: 'TEST_ELEC_001',
        fsmServiceCode: 'FR_ELEC_111111',
        externalSource: 'TEMPO',
        countryCode: 'FR',
        businessUnit: 'LM_FR',
        serviceType: ServiceType.CONFIRMATION_TV,
        serviceCategory: ServiceCategory.ELECTRICAL,
        name: 'Test Electrical Service',
        scopeIncluded: [],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        estimatedDurationMinutes: 90,
        requiresPreServiceContract: false,
        requiresPostServiceWCF: true,
        createdBy: 'TEST_USER',
      });

      await service.create({
        externalServiceCode: 'TEST_HVAC_ES_002',
        fsmServiceCode: 'ES_HVAC_222222',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        name: 'Another HVAC Service',
        scopeIncluded: [],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        estimatedDurationMinutes: 150,
        requiresPreServiceContract: false,
        requiresPostServiceWCF: true,
        createdBy: 'TEST_USER',
      });
    });

    it('should find all services for country and business unit', async () => {
      const results = await service.findAll('ES', 'LM_ES', {});

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2); // At least our 2 test services
      expect(results.every((s) => s.countryCode === 'ES')).toBe(true);
      expect(results.every((s) => s.businessUnit === 'LM_ES')).toBe(true);
    });

    it('should filter by service type', async () => {
      const results = await service.findAll('ES', 'LM_ES', {
        serviceType: ServiceType.INSTALLATION,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((s) => s.serviceType === ServiceType.INSTALLATION)).toBe(true);
    });

    it('should filter by service category', async () => {
      const results = await service.findAll('ES', 'LM_ES', {
        serviceCategory: ServiceCategory.HVAC,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((s) => s.serviceCategory === ServiceCategory.HVAC)).toBe(true);
    });

    it('should filter by external source', async () => {
      const results = await service.findAll('ES', 'LM_ES', {
        externalSource: 'PYXIS',
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((s) => s.externalSource === 'PYXIS')).toBe(true);
    });

    it('should filter by status', async () => {
      const results = await service.findAll('ES', 'LM_ES', {
        status: ServiceStatus.ACTIVE,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((s) => s.status === ServiceStatus.ACTIVE)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const results = await service.findAll('ES', 'LM_ES', {
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        externalSource: 'PYXIS',
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((s) => s.serviceType === ServiceType.INSTALLATION)).toBe(true);
      expect(results.every((s) => s.serviceCategory === ServiceCategory.HVAC)).toBe(true);
      expect(results.every((s) => s.externalSource === 'PYXIS')).toBe(true);
    });
  });

  describe('search', () => {
    it('should search services by name', async () => {
      const results = await service.search('HVAC', 'ES', 'LM_ES');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((s) => s.name.toLowerCase().includes('hvac'))).toBe(true);
    });

    it('should search with limit', async () => {
      const results = await service.search('Test', 'ES', 'LM_ES', 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array when no matches', async () => {
      const results = await service.search('NONEXISTENT_SERVICE', 'ES', 'LM_ES');

      expect(results).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update service successfully', async () => {
      const updateData = {
        name: 'Updated HVAC Installation',
        description: 'Updated description',
        estimatedDurationMinutes: 240,
        requiresPreServiceContract: false,
      };

      const result = await service.update(testServiceId, updateData, 'TEST_USER');

      expect(result.name).toBe('Updated HVAC Installation');
      expect(result.description).toBe('Updated description');
      expect(result.estimatedDurationMinutes).toBe(240);
      expect(result.requiresPreServiceContract).toBe(false);
      expect(result.updatedAt).toBeDefined();

      // Verify in database
      const dbService = await prisma.serviceCatalog.findUnique({
        where: { id: testServiceId },
      });

      expect(dbService.name).toBe('Updated HVAC Installation');
    });

    it('should update only provided fields', async () => {
      const originalService = await service.findById(testServiceId);

      await service.update(testServiceId, { estimatedDurationMinutes: 300 }, 'TEST_USER');

      const updatedService = await service.findById(testServiceId);

      expect(updatedService.estimatedDurationMinutes).toBe(300);
      expect(updatedService.name).toBe(originalService.name); // Unchanged
      expect(updatedService.description).toBe(originalService.description); // Unchanged
    });

    it('should throw NotFoundException for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(service.update(fakeId, { name: 'Test' }, 'TEST_USER')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deprecate', () => {
    let deprecateTestServiceId: string;

    beforeAll(async () => {
      const testService = await service.create({
        externalServiceCode: 'TEST_TO_DEPRECATE',
        fsmServiceCode: 'ES_TEST_999999',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.OTHER,
        name: 'Service to Deprecate',
        scopeIncluded: [],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        estimatedDurationMinutes: 60,
        requiresPreServiceContract: false,
        requiresPostServiceWCF: true,
        createdBy: 'TEST_USER',
      });
      deprecateTestServiceId = testService.id;
    });

    it('should deprecate service successfully', async () => {
      const result = await service.deprecate(
        deprecateTestServiceId,
        'No longer offered',
        'TEST_USER',
      );

      expect(result.status).toBe(ServiceStatus.DEPRECATED);
      expect(result.updatedAt).toBeDefined();

      // Verify in database
      const dbService = await prisma.serviceCatalog.findUnique({
        where: { id: deprecateTestServiceId },
      });

      expect(dbService.status).toBe(ServiceStatus.DEPRECATED);
    });

    it('should throw BadRequestException when trying to deprecate already deprecated service', async () => {
      await expect(
        service.deprecate(deprecateTestServiceId, 'Already deprecated', 'TEST_USER'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(service.deprecate(fakeId, 'Test', 'TEST_USER')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for country and business unit', async () => {
      const stats = await service.getStatistics('ES', 'LM_ES');

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.byStatus).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(stats.byCategory).toBeDefined();
      expect(stats.byExternalSource).toBeDefined();

      // Check structure
      expect(stats.byStatus.active).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(stats.byType)).toBe(true);
      expect(Array.isArray(stats.byCategory)).toBe(true);
      expect(Array.isArray(stats.byExternalSource)).toBe(true);
    });

    it('should return zero statistics for non-existent country', async () => {
      const stats = await service.getStatistics('XX', 'NONEXISTENT');

      expect(stats.total).toBe(0);
      expect(stats.byStatus.active).toBe(0);
      expect(stats.byStatus.deprecated).toBe(0);
      expect(stats.byStatus.archived).toBe(0);
      expect(stats.byType).toEqual([]);
      expect(stats.byCategory).toEqual([]);
      expect(stats.byExternalSource).toEqual([]);
    });
  });
});
