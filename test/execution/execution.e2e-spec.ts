import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MediaUploadService } from '@/modules/execution/media-upload.service';
import {
  UserType,
  ServicePriority,
  ServiceType,
  ServiceOrderState,
  ServiceCategory,
} from '@prisma/client';

describe('Execution Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testProviderId: string;
  let testTechnicianId: string;
  let testServiceOrderId: string;
  let testServiceCatalogId: string;
  let authToken: string;

  // Mock MediaUploadService
  const mockMediaUploadService = {
    createUpload: jest.fn().mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/upload/mock-url',
      mediaUrl: 'https://storage.googleapis.com/media/mock-file.jpg',
      thumbnailUrl: 'https://storage.googleapis.com/media/mock-file-thumb.jpg',
      key: 'mock-key',
    }),
  };
  beforeAll(async () => {
    process.env.KAFKA_ENABLED = 'false';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MediaUploadService)
      .useValue(mockMediaUploadService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Cleanup
    await prisma.user.deleteMany({ where: { email: 'tech-e2e@test.com' } });
    await prisma.provider.deleteMany({ where: { email: 'provider-exec-e2e@test.com' } });
    await prisma.serviceCatalog.deleteMany({ where: { name: 'E2E Test Service' } });

    // 1. Create Provider
    const provider = await prisma.provider.create({
      data: {
        name: 'E2E Execution Provider',
        legalName: 'E2E Execution Provider LLC',
        email: 'provider-exec-e2e@test.com',
        phone: '+34622222222',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        status: 'ACTIVE',
        taxId: 'ES87654321Z',
        address: {
          street: '456 Test Ave',
          city: 'Barcelona',
          state: 'Barcelona',
          postalCode: '08001',
          country: 'ES',
        },
      },
    });
    testProviderId = provider.id;

    // 1.5 Create Work Team
    const workTeam = await prisma.workTeam.create({
      data: {
        providerId: provider.id,
        name: 'E2E Test Team',
        countryCode: 'ES',
        skills: ['installation'],
        serviceTypes: ['P1'],
        postalCodes: ['08001'],
        workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        shifts: [{ start: '08:00', end: '17:00' }],
      },
    });

    // 2. Register Technician via API to get token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/technician/register')
      .send({
        email: 'tech-e2e@test.com',
        password: 'SecurePass123!@#',
        firstName: 'Tech',
        lastName: 'E2E',
        phone: '+34633333333',
        workTeamId: workTeam.id,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      });

    if (!registerResponse.body.accessToken) {
      console.error('Registration failed:', JSON.stringify(registerResponse.body, null, 2));
    }

    authToken = registerResponse.body.accessToken;
    testTechnicianId = registerResponse.body.user?.id;

    // 3. Create Service Catalog Item
    const serviceCatalog = await prisma.serviceCatalog.create({
      data: {
        name: 'E2E Test Service',
        description: 'Test Service Description',
        serviceType: ServiceType.INSTALLATION,
        serviceCategory: ServiceCategory.HVAC,
        status: 'ACTIVE',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        estimatedDurationMinutes: 60,
        externalServiceCode: 'E2E_TEST_SERVICE',
        fsmServiceCode: 'E2E_SVC_001',
        externalSource: 'TEST',
        scopeIncluded: [],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        syncChecksum: 'mock-checksum',
      },
    });
    testServiceCatalogId = serviceCatalog.id;

    // 4. Create Service Order assigned to Provider
    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        serviceId: testServiceCatalogId,
        state: ServiceOrderState.ASSIGNED,
        priority: ServicePriority.P2,
        serviceType: ServiceType.INSTALLATION,
        customerInfo: {
          name: 'Test Customer',
          phone: '+34644444444',
          email: 'customer@test.com',
        },
        serviceAddress: {
          street: '789 Customer Rd',
          city: 'Valencia',
          postalCode: '46001',
          country: 'ES',
          coordinates: { lat: 39.4699, lng: -0.3763 },
        },
        assignedProviderId: testProviderId,
        requestedStartDate: new Date(),
        requestedEndDate: new Date(),
        estimatedDurationMinutes: 120,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      },
    });
    testServiceOrderId = serviceOrder.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testServiceOrderId) {
      await prisma.serviceOrder.delete({ where: { id: testServiceOrderId } }).catch(() => {});
    }
    if (testServiceCatalogId) {
      await prisma.serviceCatalog.delete({ where: { id: testServiceCatalogId } }).catch(() => {});
    }
    if (testTechnicianId) {
      await prisma.user.delete({ where: { id: testTechnicianId } }).catch(() => {});
    }
    if (testProviderId) {
      await prisma.provider.delete({ where: { id: testProviderId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Execution Workflow', () => {
    it('should check in successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/execution/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceOrderId: testServiceOrderId,
          providerId: testProviderId,
          technicianUserId: testTechnicianId,
          workTeamId: '00000000-0000-0000-0000-000000000000', // Fake UUID
          lat: 39.4699,
          lng: -0.3763,
          accuracy: 10,
          occurredAt: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
    });

    it('should generate media upload URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/execution/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceOrderId: testServiceOrderId,
          filename: 'test-photo.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1024,
        });

      if (response.status !== 201) {
        console.error('Media upload failed:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);

      expect(response.body.uploadUrl).toBeDefined();
      expect(response.body.key).toBeDefined();
    });

    it('should check out successfully', async () => {
      const endTime = new Date();

      const response = await request(app.getHttpServer())
        .post('/api/v1/execution/check-out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceOrderId: testServiceOrderId,
          technicianUserId: testTechnicianId,
          occurredAt: endTime.toISOString(),
          location: {
            latitude: 39.4699,
            longitude: -0.3763,
            accuracy: 10,
          },
          completionStatus: 'COMPLETED',
          workSummary: {
            description: 'Job done',
            tasksCompleted: ['Task 1'],
            tasksIncomplete: [],
          },
          materialsUsed: [],
          durationMinutesOverride: 60,
        });

      if (response.status !== 201) {
        console.error('Check out failed:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.durationMinutes).toBe(60);
    });
  });
});
