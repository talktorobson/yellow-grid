import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ServiceType, ServiceCategory, ServiceStatus } from '@prisma/client';

/**
 * E2E tests for Service Catalog REST API
 * Tests actual HTTP endpoints with full application context
 */
describe('Service Catalog API (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testServiceId: string;
  let testServiceExternalCode: string;
  let testServiceFsmCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup: delete all test services
    await prisma.serviceCatalog.deleteMany({
      where: {
        externalServiceCode: {
          startsWith: 'E2E_TEST_',
        },
      },
    });
    await app.close();
  });

  describe('GET /api/v1/service-catalog/services', () => {
    beforeAll(async () => {
      // Create test services
      await prisma.serviceCatalog.createMany({
        data: [
          {
            externalServiceCode: 'E2E_TEST_HVAC_ES_001',
            fsmServiceCode: 'ES_HVAC_E2E_001',
            externalSource: 'PYXIS',
            countryCode: 'ES',
            businessUnit: 'LM_ES',
            serviceType: ServiceType.INSTALLATION,
            serviceCategory: ServiceCategory.HVAC,
            name: 'E2E HVAC Installation',
            estimatedDurationMinutes: 180,
            status: ServiceStatus.ACTIVE,
          },
          {
            externalServiceCode: 'E2E_TEST_PLUMB_ES_001',
            fsmServiceCode: 'ES_PLUMB_E2E_001',
            externalSource: 'TEMPO',
            countryCode: 'ES',
            businessUnit: 'LM_ES',
            serviceType: ServiceType.MAINTENANCE,
            serviceCategory: ServiceCategory.PLUMBING,
            name: 'E2E Plumbing Maintenance',
            estimatedDurationMinutes: 90,
            status: ServiceStatus.ACTIVE,
          },
          {
            externalServiceCode: 'E2E_TEST_ELEC_FR_001',
            fsmServiceCode: 'FR_ELEC_E2E_001',
            externalSource: 'PYXIS',
            countryCode: 'FR',
            businessUnit: 'LM_FR',
            serviceType: ServiceType.INSTALLATION,
            serviceCategory: ServiceCategory.ELECTRICAL,
            name: 'E2E Electrical Installation',
            estimatedDurationMinutes: 120,
            status: ServiceStatus.ACTIVE,
          },
        ],
      });
    });

    it('should return all services for country and business unit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services')
        .query({ countryCode: 'ES', businessUnit: 'LM_ES' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.every((s: any) => s.countryCode === 'ES')).toBe(true);
      expect(response.body.every((s: any) => s.businessUnit === 'LM_ES')).toBe(true);
    });

    it('should filter by service type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services')
        .query({
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          serviceType: ServiceType.INSTALLATION,
        })
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every((s: any) => s.serviceType === ServiceType.INSTALLATION)).toBe(
        true,
      );
    });

    it('should filter by service category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services')
        .query({
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          serviceCategory: ServiceCategory.HVAC,
        })
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every((s: any) => s.serviceCategory === ServiceCategory.HVAC)).toBe(
        true,
      );
    });

    it('should filter by external source', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services')
        .query({
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          externalSource: 'PYXIS',
        })
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every((s: any) => s.externalSource === 'PYXIS')).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services')
        .query({
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          status: ServiceStatus.ACTIVE,
        })
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every((s: any) => s.status === ServiceStatus.ACTIVE)).toBe(true);
    });

    it('should return 400 when countryCode is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services')
        .query({ businessUnit: 'LM_ES' })
        .expect(400);
    });
  });

  describe('GET /api/v1/service-catalog/services/search', () => {
    it('should search services by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services/search')
        .query({ q: 'HVAC', countryCode: 'ES', businessUnit: 'LM_ES' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.some((s: any) => s.name.toLowerCase().includes('hvac')),
      ).toBe(true);
    });

    it('should limit search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services/search')
        .query({ q: 'E2E', countryCode: 'ES', businessUnit: 'LM_ES', limit: 1 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array when no matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services/search')
        .query({
          q: 'NONEXISTENT_SERVICE_XYZ',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
        })
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/v1/service-catalog/services', () => {
    it('should create a new service with all fields', async () => {
      const createDto = {
        externalServiceCode: 'E2E_TEST_CREATE_FULL_001',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INSTALLATION',
        serviceCategory: 'HVAC',
        name: {
          es: 'Instalación de Aire Acondicionado',
          en: 'Air Conditioning Installation',
          fr: 'Installation de Climatisation',
        },
        description: {
          es: 'Instalación completa de AC',
          en: 'Complete AC installation',
        },
        scopeIncluded: ['Remove old unit', 'Install new unit', 'System testing'],
        scopeExcluded: ['Wall modifications', 'Electrical panel upgrades'],
        worksiteRequirements: ['Electrical outlet within 2 meters'],
        productPrerequisites: ['AC unit delivered to site'],
        estimatedDurationMinutes: 180,
        requiresPreServiceContract: true,
        requiresPostServiceWCF: true,
        contractTemplateId: 'tpl-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/service-catalog/services')
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.externalServiceCode).toBe(createDto.externalServiceCode);
      expect(response.body.name).toBe('Air Conditioning Installation'); // English fallback
      expect(response.body.description).toBe('Complete AC installation');
      expect(response.body.fsmServiceCode).toMatch(/^ES_HVAC_\d+$/);
      expect(response.body.scopeIncluded).toEqual(createDto.scopeIncluded);
      expect(response.body.estimatedDurationMinutes).toBe(180);
      expect(response.body.status).toBe(ServiceStatus.ACTIVE);

      testServiceId = response.body.id;
      testServiceExternalCode = response.body.externalServiceCode;
      testServiceFsmCode = response.body.fsmServiceCode;
    });

    it('should create service with minimal required fields', async () => {
      const createDto = {
        externalServiceCode: 'E2E_TEST_CREATE_MIN_001',
        externalSource: 'TEMPO',
        countryCode: 'FR',
        businessUnit: 'LM_FR',
        serviceType: 'MAINTENANCE',
        serviceCategory: 'PLUMBING',
        name: {
          en: 'Minimal Plumbing Service',
        },
        estimatedDurationMinutes: 60,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/service-catalog/services')
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe('Minimal Plumbing Service');
      expect(response.body.scopeIncluded).toEqual([]);
      expect(response.body.requiresPreServiceContract).toBe(false);
      expect(response.body.requiresPostServiceWCF).toBe(true);
    });

    it('should use I18n fallback when English not provided', async () => {
      const createDto = {
        externalServiceCode: 'E2E_TEST_CREATE_I18N_001',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INSTALLATION',
        serviceCategory: 'KITCHEN',
        name: {
          es: 'Instalación de Cocina',
          fr: 'Installation de Cuisine',
        },
        estimatedDurationMinutes: 240,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/service-catalog/services')
        .send(createDto)
        .expect(201);

      expect(response.body.name).toBe('Instalación de Cocina'); // Spanish fallback (no English)
    });

    it('should reject duplicate external service code', async () => {
      const createDto = {
        externalServiceCode: 'E2E_TEST_CREATE_FULL_001', // Already exists
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INSTALLATION',
        serviceCategory: 'HVAC',
        name: { en: 'Duplicate Service' },
        estimatedDurationMinutes: 120,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/service-catalog/services')
        .send(createDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject invalid service type', async () => {
      const createDto = {
        externalServiceCode: 'E2E_TEST_INVALID_TYPE',
        externalSource: 'PYXIS',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        serviceType: 'INVALID_TYPE',
        serviceCategory: 'HVAC',
        name: { en: 'Invalid Service' },
        estimatedDurationMinutes: 120,
      };

      await request(app.getHttpServer())
        .post('/api/v1/service-catalog/services')
        .send(createDto)
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      const createDto = {
        externalServiceCode: 'E2E_TEST_MISSING_FIELDS',
        externalSource: 'PYXIS',
        // Missing countryCode, businessUnit, serviceType, etc.
      };

      await request(app.getHttpServer())
        .post('/api/v1/service-catalog/services')
        .send(createDto)
        .expect(400);
    });
  });

  describe('GET /api/v1/service-catalog/services/:id', () => {
    it('should get service by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/service-catalog/services/${testServiceId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testServiceId);
      expect(response.body.externalServiceCode).toBe(testServiceExternalCode);
      expect(response.body.name).toBe('Air Conditioning Installation');
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/service-catalog/services/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/service-catalog/services/external/:code', () => {
    it('should get service by external code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/service-catalog/services/external/${testServiceExternalCode}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testServiceId);
      expect(response.body.externalServiceCode).toBe(testServiceExternalCode);
    });

    it('should return 404 for non-existent code', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services/external/NONEXISTENT_CODE')
        .expect(404);
    });
  });

  describe('GET /api/v1/service-catalog/services/fsm/:code', () => {
    it('should get service by FSM code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/service-catalog/services/fsm/${testServiceFsmCode}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testServiceId);
      expect(response.body.fsmServiceCode).toBe(testServiceFsmCode);
    });

    it('should return 404 for non-existent FSM code', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services/fsm/NONEXISTENT_FSM')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/service-catalog/services/:id', () => {
    it('should update service with all fields', async () => {
      const updateDto = {
        name: {
          en: 'Updated HVAC Installation',
          es: 'Instalación HVAC Actualizada',
        },
        description: {
          en: 'Updated description',
        },
        scopeIncluded: ['Updated scope item'],
        estimatedDurationMinutes: 240,
        requiresPreServiceContract: false,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/service-catalog/services/${testServiceId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated HVAC Installation');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.scopeIncluded).toEqual(['Updated scope item']);
      expect(response.body.estimatedDurationMinutes).toBe(240);
      expect(response.body.requiresPreServiceContract).toBe(false);
    });

    it('should update only provided fields', async () => {
      const originalService = await prisma.serviceCatalog.findUnique({
        where: { id: testServiceId },
      });

      const updateDto = {
        estimatedDurationMinutes: 300,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/service-catalog/services/${testServiceId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.estimatedDurationMinutes).toBe(300);
      expect(response.body.name).toBe(originalService.name); // Unchanged
      expect(response.body.description).toBe(originalService.description); // Unchanged
    });

    it('should use I18n fallback on update', async () => {
      const updateDto = {
        name: {
          es: 'Solo Español',
          fr: 'Seulement Français',
        },
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/service-catalog/services/${testServiceId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Solo Español'); // Spanish fallback
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto = { name: { en: 'Test' } };

      await request(app.getHttpServer())
        .patch(`/api/v1/service-catalog/services/${fakeId}`)
        .send(updateDto)
        .expect(404);
    });

    it('should reject attempt to update externalServiceCode', async () => {
      const updateDto = {
        externalServiceCode: 'SHOULD_NOT_WORK',
        name: { en: 'Updated Name' },
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/service-catalog/services/${testServiceId}`)
        .send(updateDto)
        .expect(200);

      // externalServiceCode should be ignored (OmitType in DTO)
      expect(response.body.externalServiceCode).toBe(testServiceExternalCode); // Unchanged
      expect(response.body.name).toBe('Updated Name'); // Other fields updated
    });
  });

  describe('DELETE /api/v1/service-catalog/services/:id', () => {
    let serviceToDeprecate: string;

    beforeAll(async () => {
      const service = await prisma.serviceCatalog.create({
        data: {
          externalServiceCode: 'E2E_TEST_TO_DEPRECATE',
          fsmServiceCode: 'ES_TEST_DEPRECATE_999',
          externalSource: 'PYXIS',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          serviceType: ServiceType.INSTALLATION,
          serviceCategory: ServiceCategory.OTHER,
          name: 'Service to Deprecate',
          estimatedDurationMinutes: 60,
          status: ServiceStatus.ACTIVE,
        },
      });
      serviceToDeprecate = service.id;
    });

    it('should deprecate service successfully', async () => {
      const deprecateDto = {
        reason: 'No longer offered',
        replacementServiceId: testServiceId,
      };

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/service-catalog/services/${serviceToDeprecate}`)
        .send(deprecateDto)
        .expect(200);

      expect(response.body.status).toBe(ServiceStatus.DEPRECATED);

      // Verify in database
      const dbService = await prisma.serviceCatalog.findUnique({
        where: { id: serviceToDeprecate },
      });

      expect(dbService.status).toBe(ServiceStatus.DEPRECATED);
    });

    it('should deprecate without reason', async () => {
      const service = await prisma.serviceCatalog.create({
        data: {
          externalServiceCode: 'E2E_TEST_DEPRECATE_NO_REASON',
          fsmServiceCode: 'ES_TEST_DEP_998',
          externalSource: 'PYXIS',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          serviceType: ServiceType.MAINTENANCE,
          serviceCategory: ServiceCategory.OTHER,
          name: 'Service to Deprecate No Reason',
          estimatedDurationMinutes: 60,
          status: ServiceStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/service-catalog/services/${service.id}`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe(ServiceStatus.DEPRECATED);
    });

    it('should return 400 when trying to deprecate already deprecated service', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/service-catalog/services/${serviceToDeprecate}`)
        .send({ reason: 'Already deprecated' })
        .expect(400);

      expect(response.body.message).toContain('already deprecated');
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/v1/service-catalog/services/${fakeId}`)
        .send({ reason: 'Test' })
        .expect(404);
    });
  });

  describe('GET /api/v1/service-catalog/services/stats', () => {
    it('should return statistics for country and business unit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services/stats')
        .query({ countryCode: 'ES', businessUnit: 'LM_ES' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.totalServices).toBeGreaterThanOrEqual(1);
      expect(response.body.byStatus).toBeDefined();
      expect(response.body.byType).toBeDefined();
      expect(response.body.byCategory).toBeDefined();
      expect(response.body.bySource).toBeDefined();
    });

    it('should return zero statistics for non-existent country', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/service-catalog/services/stats')
        .query({ countryCode: 'XX', businessUnit: 'NONEXISTENT' })
        .expect(200);

      expect(response.body.totalServices).toBe(0);
    });
  });
});
