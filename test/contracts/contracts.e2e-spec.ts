import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TestDataFactory, authenticatedRequest, expectRecentDate } from '../utils';

describe('Contracts API (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let factory: TestDataFactory;
  let operatorToken: string;
  let testProject: any;
  let testServiceOrder: any;
  let testProvider: any;
  let testContract: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    factory = new TestDataFactory(prisma);

    // Clean previous test data
    await prisma.contract.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.provider.deleteMany({ where: { email: { contains: '@test.com' } } });

    // Create test data
    testProvider = await factory.createProvider();
    testProject = await factory.createProject();
    testServiceOrder = await factory.createServiceOrder(testProject.id, {
      state: 'ASSIGNED',
      assignedProviderId: testProvider.id,
    });

    // Mock token
    operatorToken = 'mock-operator-token';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.contract.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.provider.deleteMany({ where: { id: testProvider.id } });

    await app.close();
  });

  afterEach(async () => {
    // Clean contracts after each test
    await prisma.contract.deleteMany({});
  });

  // ============================================================================
  // GENERATE CONTRACT TESTS
  // ============================================================================

  describe('POST /api/v1/contracts - Generate Contract', () => {
    it('should generate pre-service contract successfully', async () => {
      const generateDto = {
        serviceOrderId: testServiceOrder.id,
        contractType: 'PRE_SERVICE',
        templateId: 'default-pre-service-template',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        customFields: {
          serviceName: 'Kitchen Cabinet Installation',
          estimatedCost: 299.99,
          warrantyPeriod: '24 months',
        },
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/contracts', operatorToken)
        .send(generateDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toMatchObject({
        serviceOrderId: testServiceOrder.id,
        contractType: 'PRE_SERVICE',
        status: 'DRAFT',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      });

      expect(response.body).toHaveProperty('contractNumber');
      expect(response.body.contractNumber).toMatch(/^CTR-/);
      expect(response.body).toHaveProperty('generatedAt');
      expectRecentDate(response.body.generatedAt);

      testContract = response.body;

      // Verify in database
      const dbContract = await prisma.contract.findUnique({
        where: { id: testContract.id },
      });

      expect(dbContract).not.toBeNull();
      expect(dbContract!.status).toBe('DRAFT');
    });

    it('should generate contract with correct customer information', async () => {
      const generateDto = {
        serviceOrderId: testServiceOrder.id,
        contractType: 'PRE_SERVICE',
        templateId: 'default-pre-service-template',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/contracts', operatorToken)
        .send(generateDto)
        .expect(201);

      expect(response.body).toHaveProperty('customerInfo');
      expect(response.body.customerInfo).toMatchObject({
        firstName: expect.any(String),
        lastName: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
      });
    });

    it('should reject contract generation for non-existent service order', async () => {
      const generateDto = {
        serviceOrderId: '00000000-0000-0000-0000-000000000000',
        contractType: 'PRE_SERVICE',
        templateId: 'default-template',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/contracts', operatorToken)
        .send(generateDto)
        .expect(404);

      expect(response.body.message).toContain('Service order not found');
    });

    it('should reject contract generation with invalid contract type', async () => {
      const generateDto = {
        serviceOrderId: testServiceOrder.id,
        contractType: 'INVALID_TYPE',
        templateId: 'default-template',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      await authenticatedRequest(app, 'post', '/api/v1/contracts', operatorToken)
        .send(generateDto)
        .expect(400);
    });

    it('should generate POST_SERVICE contract after service completion', async () => {
      const completedSO = await factory.createServiceOrder(testProject.id, {
        state: 'COMPLETED',
        assignedProviderId: testProvider.id,
      });

      const generateDto = {
        serviceOrderId: completedSO.id,
        contractType: 'POST_SERVICE',
        templateId: 'default-post-service-template',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        customFields: {
          actualCost: 315.5,
          workDuration: 180, // minutes
          materialsUsed: ['Material A', 'Material B'],
        },
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/contracts', operatorToken)
        .send(generateDto)
        .expect(201);

      expect(response.body.contractType).toBe('POST_SERVICE');
    });

    it('should prevent duplicate contract generation for same service order', async () => {
      // Create first contract
      await factory.createContract(testServiceOrder.id, {
        contractType: 'PRE_SERVICE',
        status: 'SIGNED',
      });

      const generateDto = {
        serviceOrderId: testServiceOrder.id,
        contractType: 'PRE_SERVICE',
        templateId: 'default-template',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/contracts', operatorToken)
        .send(generateDto)
        .expect(409);

      expect(response.body.message).toContain('Contract already exists');
    });
  });

  // ============================================================================
  // SEND CONTRACT TESTS
  // ============================================================================

  describe('POST /api/v1/contracts/:id/send - Send Contract', () => {
    let contract: any;

    beforeEach(async () => {
      contract = await factory.createContract(testServiceOrder.id, {
        status: 'DRAFT',
      });
    });

    it('should send contract via email successfully', async () => {
      const sendDto = {
        channel: 'EMAIL',
        recipientEmail: 'customer@example.com',
        message: 'Please review and sign the contract for your service order.',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/send`,
        operatorToken,
      )
        .send(sendDto)
        .expect(200);

      expect(response.body.status).toBe('SENT');
      expect(response.body).toHaveProperty('sentAt');
      expectRecentDate(response.body.sentAt);

      // Verify in database
      const dbContract = await prisma.contract.findUnique({
        where: { id: contract.id },
      });

      expect(dbContract!.status).toBe('SENT');
      expect(dbContract!.sentAt).toBeDefined();
    });

    it('should send contract via SMS successfully', async () => {
      const sendDto = {
        channel: 'SMS',
        recipientPhone: '+34600123456',
        message: 'Contract ready for signature. Link: https://example.com/sign/...',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/send`,
        operatorToken,
      )
        .send(sendDto)
        .expect(200);

      expect(response.body.status).toBe('SENT');
    });

    it('should reject sending contract that is already signed', async () => {
      const signedContract = await factory.createContract(testServiceOrder.id, {
        status: 'SIGNED',
      });

      const sendDto = {
        channel: 'EMAIL',
        recipientEmail: 'customer@example.com',
        message: 'Test message',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${signedContract.id}/send`,
        operatorToken,
      )
        .send(sendDto)
        .expect(400);

      expect(response.body.message).toContain('already signed');
    });

    it('should require valid email for EMAIL channel', async () => {
      const sendDto = {
        channel: 'EMAIL',
        recipientEmail: 'invalid-email',
        message: 'Test message',
      };

      await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/send`,
        operatorToken,
      )
        .send(sendDto)
        .expect(400);
    });

    it('should require valid phone for SMS channel', async () => {
      const sendDto = {
        channel: 'SMS',
        recipientPhone: 'invalid-phone',
        message: 'Test message',
      };

      await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/send`,
        operatorToken,
      )
        .send(sendDto)
        .expect(400);
    });
  });

  // ============================================================================
  // SIGN CONTRACT TESTS
  // ============================================================================

  describe('POST /api/v1/contracts/:id/sign - Sign Contract', () => {
    let contract: any;

    beforeEach(async () => {
      contract = await factory.createContract(testServiceOrder.id, {
        status: 'SENT',
      });
    });

    it('should capture customer signature successfully', async () => {
      const signDto = {
        signatureType: 'ELECTRONIC',
        signatureData: 'base64-encoded-signature-image',
        signerName: 'John Customer',
        signerEmail: 'john.customer@example.com',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        consentGiven: true,
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/sign`,
        operatorToken,
      )
        .send(signDto)
        .expect(200);

      expect(response.body.status).toBe('SIGNED');
      expect(response.body).toHaveProperty('signedAt');
      expectRecentDate(response.body.signedAt);
      expect(response.body.signatureInfo).toMatchObject({
        signerName: 'John Customer',
        signerEmail: 'john.customer@example.com',
      });

      // Verify in database
      const dbContract = await prisma.contract.findUnique({
        where: { id: contract.id },
      });

      expect(dbContract!.status).toBe('SIGNED');
      expect(dbContract!.signedAt).toBeDefined();
    });

    it('should reject signing contract without consent', async () => {
      const signDto = {
        signatureType: 'ELECTRONIC',
        signatureData: 'base64-encoded-signature',
        signerName: 'John Customer',
        signerEmail: 'john.customer@example.com',
        ipAddress: '192.168.1.100',
        consentGiven: false, // No consent
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/sign`,
        operatorToken,
      )
        .send(signDto)
        .expect(400);

      expect(response.body.message).toContain('consent');
    });

    it('should reject signing contract in DRAFT state', async () => {
      const draftContract = await factory.createContract(testServiceOrder.id, {
        status: 'DRAFT',
      });

      const signDto = {
        signatureType: 'ELECTRONIC',
        signatureData: 'base64-encoded-signature',
        signerName: 'John Customer',
        signerEmail: 'john.customer@example.com',
        ipAddress: '192.168.1.100',
        consentGiven: true,
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${draftContract.id}/sign`,
        operatorToken,
      )
        .send(signDto)
        .expect(400);

      expect(response.body.message).toContain('Cannot sign contract in DRAFT state');
    });

    it('should reject signing already signed contract', async () => {
      const signedContract = await factory.createContract(testServiceOrder.id, {
        status: 'SIGNED',
      });

      const signDto = {
        signatureType: 'ELECTRONIC',
        signatureData: 'base64-encoded-signature',
        signerName: 'John Customer',
        signerEmail: 'john.customer@example.com',
        ipAddress: '192.168.1.100',
        consentGiven: true,
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${signedContract.id}/sign`,
        operatorToken,
      )
        .send(signDto)
        .expect(400);

      expect(response.body.message).toContain('already signed');
    });

    it('should require signature data', async () => {
      const signDto = {
        signatureType: 'ELECTRONIC',
        // Missing signatureData
        signerName: 'John Customer',
        signerEmail: 'john.customer@example.com',
        ipAddress: '192.168.1.100',
        consentGiven: true,
      };

      await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/sign`,
        operatorToken,
      )
        .send(signDto)
        .expect(400);
    });

    it('should capture metadata with signature', async () => {
      const signDto = {
        signatureType: 'ELECTRONIC',
        signatureData: 'base64-encoded-signature',
        signerName: 'John Customer',
        signerEmail: 'john.customer@example.com',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        location: {
          latitude: 40.4168,
          longitude: -3.7038,
        },
        consentGiven: true,
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/sign`,
        operatorToken,
      )
        .send(signDto)
        .expect(200);

      expect(response.body.signatureInfo).toMatchObject({
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });
    });
  });

  // ============================================================================
  // LIST CONTRACTS TESTS
  // ============================================================================

  describe('GET /api/v1/contracts - List Contracts', () => {
    beforeEach(async () => {
      // Create multiple contracts for filtering
      await factory.createContract(testServiceOrder.id, {
        status: 'DRAFT',
        contractType: 'PRE_SERVICE',
      });
      await factory.createContract(testServiceOrder.id, {
        status: 'SENT',
        contractType: 'PRE_SERVICE',
      });
      await factory.createContract(testServiceOrder.id, {
        status: 'SIGNED',
        contractType: 'POST_SERVICE',
      });
    });

    it('should list all contracts with pagination', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/contracts?page=1&limit=10',
        operatorToken,
      ).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('should filter contracts by status', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/contracts?status=SIGNED',
        operatorToken,
      ).expect(200);

      expect(response.body.data.every((c: any) => c.status === 'SIGNED')).toBe(true);
    });

    it('should filter contracts by contract type', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/contracts?contractType=PRE_SERVICE',
        operatorToken,
      ).expect(200);

      expect(response.body.data.every((c: any) => c.contractType === 'PRE_SERVICE')).toBe(true);
    });

    it('should filter contracts by service order', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/contracts?serviceOrderId=${testServiceOrder.id}`,
        operatorToken,
      ).expect(200);

      expect(response.body.data.every((c: any) => c.serviceOrderId === testServiceOrder.id)).toBe(
        true,
      );
    });

    it('should filter contracts by country code', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/contracts?countryCode=ES',
        operatorToken,
      ).expect(200);

      expect(response.body.data.every((c: any) => c.countryCode === 'ES')).toBe(true);
    });
  });

  // ============================================================================
  // GET CONTRACT BY ID TESTS
  // ============================================================================

  describe('GET /api/v1/contracts/:id - Get Contract by ID', () => {
    let contract: any;

    beforeEach(async () => {
      contract = await factory.createContract(testServiceOrder.id, {
        status: 'SIGNED',
      });
    });

    it('should retrieve contract by ID', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/contracts/${contract.id}`,
        operatorToken,
      ).expect(200);

      expect(response.body.id).toBe(contract.id);
      expect(response.body.serviceOrderId).toBe(testServiceOrder.id);
    });

    it('should include status history in response', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/contracts/${contract.id}`,
        operatorToken,
      ).expect(200);

      expect(response.body).toHaveProperty('statusHistory');
      expect(Array.isArray(response.body.statusHistory)).toBe(true);

      // Should have transitions: DRAFT → SENT → SIGNED
      expect(response.body.statusHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for non-existent contract', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/contracts/${fakeId}`,
        operatorToken,
      ).expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  // ============================================================================
  // CONTRACT LIFECYCLE TESTS
  // ============================================================================

  describe('Contract Lifecycle', () => {
    it('should follow complete lifecycle: DRAFT → SENT → SIGNED', async () => {
      // Step 1: Generate (DRAFT)
      const generateDto = {
        serviceOrderId: testServiceOrder.id,
        contractType: 'PRE_SERVICE',
        templateId: 'default-template',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const generated = await authenticatedRequest(app, 'post', '/api/v1/contracts', operatorToken)
        .send(generateDto)
        .expect(201);

      expect(generated.body.status).toBe('DRAFT');

      // Step 2: Send (SENT)
      const sendDto = {
        channel: 'EMAIL',
        recipientEmail: 'customer@example.com',
        message: 'Please sign the contract',
      };

      const sent = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${generated.body.id}/send`,
        operatorToken,
      )
        .send(sendDto)
        .expect(200);

      expect(sent.body.status).toBe('SENT');

      // Step 3: Sign (SIGNED)
      const signDto = {
        signatureType: 'ELECTRONIC',
        signatureData: 'base64-signature',
        signerName: 'John Customer',
        signerEmail: 'customer@example.com',
        ipAddress: '192.168.1.1',
        consentGiven: true,
      };

      const signed = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${generated.body.id}/sign`,
        operatorToken,
      )
        .send(signDto)
        .expect(200);

      expect(signed.body.status).toBe('SIGNED');

      // Verify final state
      const final = await prisma.contract.findUnique({
        where: { id: generated.body.id },
      });

      expect(final!.status).toBe('SIGNED');
      expect(final!.generatedAt).toBeDefined();
      expect(final!.sentAt).toBeDefined();
      expect(final!.signedAt).toBeDefined();
    });

    it('should support contract rejection workflow', async () => {
      const contract = await factory.createContract(testServiceOrder.id, {
        status: 'SENT',
      });

      const rejectDto = {
        reason: 'Terms not acceptable',
        rejectedBy: 'customer@example.com',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/contracts/${contract.id}/reject`,
        operatorToken,
      )
        .send(rejectDto)
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
      expect(response.body.rejectionReason).toBe('Terms not acceptable');
    });
  });

  // ============================================================================
  // MULTI-TENANCY TESTS
  // ============================================================================

  describe('Multi-Tenancy - Contract Isolation', () => {
    it('should filter contracts by tenant context', async () => {
      // Create contracts in different countries
      const esContract = await factory.createContract(testServiceOrder.id, {
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      });

      const frProject = await factory.createProject({
        countryCode: 'FR',
        businessUnit: 'LM_FR',
      });
      const frSO = await factory.createServiceOrder(frProject.id, {
        countryCode: 'FR',
        businessUnit: 'LM_FR',
      });
      const frContract = await factory.createContract(frSO.id, {
        countryCode: 'FR',
        businessUnit: 'LM_FR',
      });

      // Query Spain contracts only
      const esContracts = await prisma.contract.findMany({
        where: { countryCode: 'ES' },
      });

      expect(esContracts).toContainEqual(expect.objectContaining({ id: esContract.id }));
      expect(esContracts).not.toContainEqual(expect.objectContaining({ id: frContract.id }));
    });
  });
});
