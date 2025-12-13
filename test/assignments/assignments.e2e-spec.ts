import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TestDataFactory, authenticatedRequest, SPAIN_CONTEXT, FRANCE_CONTEXT } from '../utils';

describe('Assignments API (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let factory: TestDataFactory;
  let operatorToken: string;
  let providerToken: string;
  let testProject: any;
  let testProvider1: any;
  let testProvider2: any;
  let testProvider3: any;
  let testWorkTeam1: any;
  let testWorkTeam2: any;
  let testServiceOrder: any;

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
    await prisma.assignment.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workTeam.deleteMany({});
    await prisma.provider.deleteMany({ where: { email: { contains: '@test.com' } } });

    // Create test providers with work teams
    testProvider1 = await factory.createProvider({
      ...SPAIN_CONTEXT,
      name: 'Provider Alpha',
    });
    testWorkTeam1 = await factory.createWorkTeam(testProvider1.id, {
      skills: ['INSTALLATION', 'REPAIR'],
      capacity: 3,
    });

    testProvider2 = await factory.createProvider({
      ...SPAIN_CONTEXT,
      name: 'Provider Beta',
    });
    testWorkTeam2 = await factory.createWorkTeam(testProvider2.id, {
      skills: ['INSTALLATION', 'ELECTRICAL'],
      capacity: 2,
    });

    testProvider3 = await factory.createProvider({
      ...FRANCE_CONTEXT,
      name: 'Provider Gamma',
    });

    // Create test project and service order
    testProject = await factory.createProject({ ...SPAIN_CONTEXT });
    testServiceOrder = await factory.createServiceOrder(testProject.id, {
      ...SPAIN_CONTEXT,
      serviceType: 'INSTALLATION',
      priority: 'P2',
      requiredSkills: ['INSTALLATION'],
      state: 'SCHEDULED',
    });

    // Mock tokens
    operatorToken = 'mock-operator-token';
    providerToken = 'mock-provider-token';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.assignment.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workTeam.deleteMany({});
    await prisma.provider.deleteMany({
      where: { id: { in: [testProvider1.id, testProvider2.id, testProvider3.id] } },
    });

    await app.close();
  });

  afterEach(async () => {
    // Clean assignments after each test
    await prisma.assignment.deleteMany({});
  });

  // ============================================================================
  // DIRECT ASSIGNMENT TESTS
  // ============================================================================

  describe('POST /api/v1/assignments/direct - Direct Assignment', () => {
    it('should create direct assignment successfully', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/direct',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('assignmentIds');
      expect(Array.isArray(response.body.assignmentIds)).toBe(true);
      expect(response.body.assignmentIds.length).toBe(1);

      // Verify in database
      const assignment = await prisma.assignment.findFirst({
        where: {
          serviceOrderId: testServiceOrder.id,
          providerId: testProvider1.id,
        },
      });

      expect(assignment).not.toBeNull();
      expect(assignment!.assignmentMode).toBe('DIRECT');
      expect(assignment!.status).toBe('ACCEPTED'); // Direct assignments are auto-accepted
    });

    it('should create multiple direct assignments', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id, testProvider2.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/direct',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      expect(response.body.assignmentIds.length).toBe(2);

      // Verify both assignments created
      const assignments = await prisma.assignment.findMany({
        where: { serviceOrderId: testServiceOrder.id },
      });

      expect(assignments.length).toBe(2);
      expect(assignments.every((a) => a.assignmentMode === 'DIRECT')).toBe(true);
    });

    it('should reject direct assignment with non-existent service order', async () => {
      const createDto = {
        serviceOrderId: '00000000-0000-0000-0000-000000000000',
        providerIds: [testProvider1.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/direct',
        operatorToken,
      )
        .send(createDto)
        .expect(404);

      expect(response.body.message).toContain('Service order not found');
    });

    it('should reject direct assignment with non-existent provider', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: ['00000000-0000-0000-0000-000000000000'],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/direct',
        operatorToken,
      )
        .send(createDto)
        .expect(404);

      expect(response.body.message).toContain('Provider not found');
    });
  });

  // ============================================================================
  // OFFER ASSIGNMENT TESTS
  // ============================================================================

  describe('POST /api/v1/assignments/offer - Offer Assignment', () => {
    it('should create offer assignment successfully', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/offer',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      expect(response.body.assignmentIds.length).toBe(1);

      // Verify in database
      const assignment = await prisma.assignment.findFirst({
        where: {
          serviceOrderId: testServiceOrder.id,
          providerId: testProvider1.id,
        },
      });

      expect(assignment!.assignmentMode).toBe('OFFER');
      expect(assignment!.status).toBe('PENDING'); // Offer assignments start as PENDING
    });

    it('should create offer for multiple providers', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id, testProvider2.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/offer',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      expect(response.body.assignmentIds.length).toBe(2);

      const assignments = await prisma.assignment.findMany({
        where: { serviceOrderId: testServiceOrder.id },
      });

      expect(assignments.every((a) => a.assignmentMode === 'OFFER')).toBe(true);
      expect(assignments.every((a) => a.status === 'PENDING')).toBe(true);
    });
  });

  // ============================================================================
  // BROADCAST ASSIGNMENT TESTS
  // ============================================================================

  describe('POST /api/v1/assignments/broadcast - Broadcast Assignment', () => {
    it('should create broadcast assignment successfully', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id, testProvider2.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/broadcast',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      expect(response.body.assignmentIds.length).toBe(2);

      // Verify in database
      const assignments = await prisma.assignment.findMany({
        where: { serviceOrderId: testServiceOrder.id },
      });

      expect(assignments.every((a) => a.assignmentMode === 'BROADCAST')).toBe(true);
      expect(assignments.every((a) => a.status === 'PENDING')).toBe(true);
    });

    it('should require multiple providers for broadcast', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id], // Only one provider
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/broadcast',
        operatorToken,
      )
        .send(createDto)
        .expect(400);

      expect(response.body.message).toContain('at least 2 providers');
    });

    it('should handle first-come-first-served in broadcast mode', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id, testProvider2.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/broadcast',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      const assignment1Id = response.body.assignmentIds[0];
      const assignment2Id = response.body.assignmentIds[1];

      // First provider accepts
      await authenticatedRequest(
        app,
        'post',
        `/api/v1/assignments/${assignment1Id}/accept`,
        providerToken,
      ).expect(200);

      // Second assignment should be auto-declined
      const assignment2 = await prisma.assignment.findUnique({
        where: { id: assignment2Id },
      });

      expect(assignment2!.status).toBe('DECLINED');
    });
  });

  // ============================================================================
  // AUTO-ACCEPT ASSIGNMENT TESTS (Spain/Italy default)
  // ============================================================================

  describe('POST /api/v1/assignments/auto-accept - Auto-Accept Assignment', () => {
    it('should create auto-accept assignment successfully', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id,
        providerIds: [testProvider1.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/auto-accept',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      expect(response.body.assignmentIds.length).toBe(1);

      // Verify in database
      const assignment = await prisma.assignment.findFirst({
        where: {
          serviceOrderId: testServiceOrder.id,
          providerId: testProvider1.id,
        },
      });

      expect(assignment!.assignmentMode).toBe('AUTO_ACCEPT');
      expect(assignment!.status).toBe('ACCEPTED'); // Auto-accepted immediately
      expect(assignment!.acceptedAt).toBeDefined();
    });

    it('should apply auto-accept for Spain providers (country-specific rule)', async () => {
      // Spain providers should have auto-accept by default
      const spainSO = await factory.createServiceOrder(testProject.id, {
        ...SPAIN_CONTEXT,
        state: 'SCHEDULED',
      });

      const createDto = {
        serviceOrderId: spainSO.id,
        providerIds: [testProvider1.id], // Spain provider
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/auto-accept',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      const assignment = await prisma.assignment.findFirst({
        where: { id: response.body.assignmentIds[0] },
      });

      expect(assignment!.status).toBe('ACCEPTED');
    });
  });

  // ============================================================================
  // ACCEPT ASSIGNMENT TESTS
  // ============================================================================

  describe('POST /api/v1/assignments/:id/accept - Accept Assignment', () => {
    it('should allow provider to accept assignment', async () => {
      // Create an offer assignment
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        assignmentMode: 'OFFER',
        status: 'PENDING',
      });

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/assignments/${assignment.id}/accept`,
        providerToken,
      ).expect(200);

      expect(response.body.status).toBe('ACCEPTED');
      expect(response.body.acceptedAt).toBeDefined();

      // Verify in database
      const dbAssignment = await prisma.assignment.findUnique({
        where: { id: assignment.id },
      });

      expect(dbAssignment!.status).toBe('ACCEPTED');
    });

    it('should reject accepting already accepted assignment', async () => {
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        assignmentMode: 'OFFER',
        status: 'ACCEPTED',
      });

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/assignments/${assignment.id}/accept`,
        providerToken,
      ).expect(400);

      expect(response.body.message).toContain('already accepted');
    });

    it('should reject accepting declined assignment', async () => {
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        assignmentMode: 'OFFER',
        status: 'DECLINED',
      });

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/assignments/${assignment.id}/accept`,
        providerToken,
      ).expect(400);

      expect(response.body.message).toContain('Cannot accept');
    });
  });

  // ============================================================================
  // DECLINE ASSIGNMENT TESTS
  // ============================================================================

  describe('POST /api/v1/assignments/:id/decline - Decline Assignment', () => {
    it('should allow provider to decline assignment', async () => {
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        assignmentMode: 'OFFER',
        status: 'PENDING',
      });

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/assignments/${assignment.id}/decline`,
        providerToken,
      )
        .send({ reason: 'Not available on that date' })
        .expect(200);

      expect(response.body.status).toBe('DECLINED');
      expect(response.body.declinedAt).toBeDefined();
      expect(response.body.declineReason).toBe('Not available on that date');
    });

    it('should require reason when declining assignment', async () => {
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        assignmentMode: 'OFFER',
        status: 'PENDING',
      });

      await authenticatedRequest(
        app,
        'post',
        `/api/v1/assignments/${assignment.id}/decline`,
        providerToken,
      )
        .send({})
        .expect(400);
    });

    it('should reject declining already accepted assignment', async () => {
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        assignmentMode: 'OFFER',
        status: 'ACCEPTED',
      });

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/assignments/${assignment.id}/decline`,
        providerToken,
      )
        .send({ reason: 'Changed my mind' })
        .expect(400);

      expect(response.body.message).toContain('Cannot decline');
    });
  });

  // ============================================================================
  // ASSIGNMENT FUNNEL TRANSPARENCY TESTS (⭐ UNIQUE FEATURE)
  // ============================================================================

  describe('GET /api/v1/assignments/:id/funnel - Assignment Funnel Transparency', () => {
    it('should retrieve assignment funnel with complete transparency data', async () => {
      // Create assignment with scoring details
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        assignmentMode: 'OFFER',
        status: 'ACCEPTED',
        score: 85.5,
        scoringDetails: {
          skillMatch: 25.0,
          availability: 20.0,
          distance: 18.0,
          performance: 12.5,
          workload: 10.0,
        },
      });

      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/assignments/${assignment.id}/funnel`,
        operatorToken,
      ).expect(200);

      expect(response.body).toHaveProperty('assignmentId', assignment.id);
      expect(response.body).toHaveProperty('funnelStages');
      expect(Array.isArray(response.body.funnelStages)).toBe(true);

      // Verify funnel stages
      const stages = response.body.funnelStages;
      expect(stages).toContainEqual(
        expect.objectContaining({
          stage: 'SKILL_MATCHING',
          passed: true,
        }),
      );

      expect(stages).toContainEqual(
        expect.objectContaining({
          stage: 'AVAILABILITY_CHECK',
          passed: true,
        }),
      );

      expect(stages).toContainEqual(
        expect.objectContaining({
          stage: 'SCORING',
          score: 85.5,
        }),
      );
    });

    it('should show scoring breakdown in funnel', async () => {
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        score: 82.3,
        scoringDetails: {
          skillMatch: 28.0,
          availability: 22.5,
          distance: 15.0,
          performance: 10.8,
          workload: 6.0,
        },
      });

      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/assignments/${assignment.id}/funnel`,
        operatorToken,
      ).expect(200);

      expect(response.body).toHaveProperty('scoringBreakdown');
      expect(response.body.scoringBreakdown).toMatchObject({
        skillMatch: 28.0,
        availability: 22.5,
        distance: 15.0,
        performance: 10.8,
        workload: 6.0,
      });

      expect(response.body).toHaveProperty('totalScore', 82.3);
    });

    it('should include filter reasons in funnel for rejected providers', async () => {
      const assignment = await factory.createAssignment(testServiceOrder.id, testProvider1.id, {
        status: 'DECLINED',
        filterReasons: [
          'Skills not matching (missing ELECTRICAL)',
          'Outside service radius (50km)',
        ],
      });

      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/assignments/${assignment.id}/funnel`,
        operatorToken,
      ).expect(200);

      expect(response.body).toHaveProperty('filterReasons');
      expect(response.body.filterReasons).toContain('Skills not matching (missing ELECTRICAL)');
      expect(response.body.filterReasons).toContain('Outside service radius (50km)');
    });

    it('should return 404 for non-existent assignment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/assignments/${fakeId}/funnel`,
        operatorToken,
      ).expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  // ============================================================================
  // MULTI-TENANCY TESTS
  // ============================================================================

  describe('Multi-Tenancy - Assignment Isolation', () => {
    it('should not assign France provider to Spain service order', async () => {
      const createDto = {
        serviceOrderId: testServiceOrder.id, // Spain service order
        providerIds: [testProvider3.id], // France provider
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/direct',
        operatorToken,
      )
        .send(createDto)
        .expect(400);

      expect(response.body.message).toContain('country mismatch');
    });

    it('should only return assignments within same tenant context', async () => {
      // Create assignments in different countries
      const spainAssignment = await factory.createAssignment(
        testServiceOrder.id,
        testProvider1.id,
        {
          ...SPAIN_CONTEXT,
        },
      );

      const franceSO = await factory.createServiceOrder(
        (await factory.createProject({ ...FRANCE_CONTEXT })).id,
        { ...FRANCE_CONTEXT, state: 'SCHEDULED' },
      );
      const franceAssignment = await factory.createAssignment(franceSO.id, testProvider3.id, {
        ...FRANCE_CONTEXT,
      });

      // Query for Spain assignments only
      const spainAssignments = await prisma.assignment.findMany({
        where: { countryCode: 'ES' },
      });

      expect(spainAssignments).toContainEqual(expect.objectContaining({ id: spainAssignment.id }));

      expect(spainAssignments).not.toContainEqual(
        expect.objectContaining({ id: franceAssignment.id }),
      );
    });
  });

  // ============================================================================
  // ASSIGNMENT SCORING TESTS
  // ============================================================================

  describe('Assignment Scoring Logic', () => {
    it('should calculate higher score for better skill match', async () => {
      // Provider with perfect skill match
      const perfectMatch = await factory.createProvider({
        ...SPAIN_CONTEXT,
        skills: ['INSTALLATION', 'ELECTRICAL', 'PLUMBING'],
      });

      // Provider with partial skill match
      const partialMatch = await factory.createProvider({
        ...SPAIN_CONTEXT,
        skills: ['INSTALLATION'],
      });

      const so = await factory.createServiceOrder(testProject.id, {
        ...SPAIN_CONTEXT,
        state: 'SCHEDULED',
        requiredSkills: ['INSTALLATION', 'ELECTRICAL'],
      });

      const createDto = {
        serviceOrderId: so.id,
        providerIds: [perfectMatch.id, partialMatch.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/offer',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      const assignments = await prisma.assignment.findMany({
        where: { serviceOrderId: so.id },
      });

      const perfectAssignment = assignments.find((a) => a.providerId === perfectMatch.id);
      const partialAssignment = assignments.find((a) => a.providerId === partialMatch.id);

      expect(perfectAssignment!.score).toBeGreaterThan(partialAssignment!.score);
    });

    it('should score proximity higher for closer providers', async () => {
      // Create providers at different distances
      const closeProvider = await factory.createProvider({
        ...SPAIN_CONTEXT,
        baseLocation: {
          latitude: 40.4168,
          longitude: -3.7038, // Madrid center
        },
      });

      const farProvider = await factory.createProvider({
        ...SPAIN_CONTEXT,
        baseLocation: {
          latitude: 41.3851,
          longitude: 2.1734, // Barcelona (far from Madrid)
        },
      });

      const so = await factory.createServiceOrder(testProject.id, {
        ...SPAIN_CONTEXT,
        state: 'SCHEDULED',
        serviceAddress: {
          latitude: 40.42,
          longitude: -3.7, // Near Madrid center
        },
      });

      const createDto = {
        serviceOrderId: so.id,
        providerIds: [closeProvider.id, farProvider.id],
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/api/v1/assignments/offer',
        operatorToken,
      )
        .send(createDto)
        .expect(201);

      const assignments = await prisma.assignment.findMany({
        where: { serviceOrderId: so.id },
      });

      const closeAssignment = assignments.find((a) => a.providerId === closeProvider.id);
      const farAssignment = assignments.find((a) => a.providerId === farProvider.id);

      expect(closeAssignment!.scoringDetails.distance).toBeGreaterThan(
        farAssignment!.scoringDetails.distance,
      );
    });
  });
});
