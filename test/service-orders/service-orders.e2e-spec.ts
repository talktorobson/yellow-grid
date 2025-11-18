import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TestDataFactory, authenticatedRequest, expectRecentDate } from '../utils';

describe('Service Orders API (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let factory: TestDataFactory;
  let operatorToken: string;
  let adminToken: string;
  let testProject: any;
  let testProvider: any;
  let testServiceOrder: any;
  let adminUser: any;
  let operatorUser: any;

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
    await prisma.provider.deleteMany({ where: { email: { contains: '@test.com' } } });
    await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });

    // Create roles
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', description: 'Administrator' },
    });

    const operatorRole = await prisma.role.upsert({
      where: { name: 'OPERATOR' },
      update: {},
      create: { name: 'OPERATOR', description: 'Operator' },
    });

    // Create test users
    adminUser = await factory.createUser({
      email: 'admin-so-test@test.com',
      userType: 'INTERNAL_OPERATOR',
      roleId: adminRole.id,
    });

    operatorUser = await factory.createUser({
      email: 'operator-so-test@test.com',
      userType: 'INTERNAL_OPERATOR',
      roleId: operatorRole.id,
    });

    // Create test provider for assignment tests
    testProvider = await factory.createProvider();

    // Create test project
    testProject = await factory.createProject();

    // Mock tokens (in real scenario, get from actual login)
    operatorToken = 'mock-operator-token';
    adminToken = 'mock-admin-token';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.assignment.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.provider.deleteMany({ where: { id: testProvider.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, operatorUser.id] } },
    });

    await app.close();
  });

  afterEach(async () => {
    // Clean service orders after each test
    await prisma.assignment.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
  });

  // ============================================================================
  // CREATE SERVICE ORDER TESTS
  // ============================================================================

  describe('POST /api/v1/service-orders - Create Service Order', () => {
    it('should create a service order successfully', async () => {
      const createDto = {
        projectId: testProject.id,
        serviceType: 'INSTALLATION',
        priority: 'P2',
        description: 'Install kitchen cabinets',
        estimatedDuration: 180,
        requiredSkills: ['INSTALLATION', 'CARPENTRY'],
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/service-orders', operatorToken)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toMatchObject({
        projectId: testProject.id,
        serviceType: 'INSTALLATION',
        priority: 'P2',
        state: 'CREATED',
        status: 'PENDING',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      });

      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body.orderNumber).toMatch(/^SO-/);

      testServiceOrder = response.body;

      // Verify in database
      const dbServiceOrder = await prisma.serviceOrder.findUnique({
        where: { id: testServiceOrder.id },
      });

      expect(dbServiceOrder).not.toBeNull();
      expect(dbServiceOrder!.state).toBe('CREATED');
      expectRecentDate(dbServiceOrder!.createdAt);
    });

    it('should reject service order with invalid project ID', async () => {
      const createDto = {
        projectId: '00000000-0000-0000-0000-000000000000',
        serviceType: 'INSTALLATION',
        priority: 'P2',
        description: 'Test service order',
        estimatedDuration: 120,
        requiredSkills: ['INSTALLATION'],
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/service-orders', operatorToken)
        .send(createDto)
        .expect(404);

      expect(response.body.message).toContain('Project not found');
    });

    it('should reject service order with missing required fields', async () => {
      const createDto = {
        projectId: testProject.id,
        // Missing serviceType, priority, etc.
      };

      await authenticatedRequest(app, 'post', '/api/v1/service-orders', operatorToken)
        .send(createDto)
        .expect(400);
    });

    it('should reject service order with invalid priority', async () => {
      const createDto = {
        projectId: testProject.id,
        serviceType: 'INSTALLATION',
        priority: 'P3', // P3 is not allowed
        description: 'Test service order',
        estimatedDuration: 120,
        requiredSkills: ['INSTALLATION'],
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/service-orders', operatorToken)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toContain('priority');
    });

    it('should create P1 priority service order with correct SLA', async () => {
      const createDto = {
        projectId: testProject.id,
        serviceType: 'REPAIR',
        priority: 'P1',
        description: 'Emergency repair',
        estimatedDuration: 90,
        requiredSkills: ['REPAIR'],
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await authenticatedRequest(app, 'post', '/api/v1/service-orders', operatorToken)
        .send(createDto)
        .expect(201);

      expect(response.body.priority).toBe('P1');
      // P1 should have 24-72h response time
      expect(response.body).toHaveProperty('slaDeadline');
    });
  });

  // ============================================================================
  // LIST SERVICE ORDERS TESTS
  // ============================================================================

  describe('GET /api/v1/service-orders - List Service Orders', () => {
    beforeEach(async () => {
      // Create multiple service orders for filtering tests
      await factory.createServiceOrder(testProject.id, { priority: 'P1', state: 'CREATED' });
      await factory.createServiceOrder(testProject.id, { priority: 'P2', state: 'SCHEDULED' });
      await factory.createServiceOrder(testProject.id, { priority: 'P2', state: 'ASSIGNED' });
    });

    it('should list all service orders with pagination', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/service-orders?skip=0&take=10',
        operatorToken,
      ).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should filter service orders by state', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/service-orders?state=CREATED',
        operatorToken,
      ).expect(200);

      expect(response.body.every((so: any) => so.state === 'CREATED')).toBe(true);
    });

    it('should filter service orders by priority', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/service-orders?priority=P1',
        operatorToken,
      ).expect(200);

      expect(response.body.every((so: any) => so.priority === 'P1')).toBe(true);
    });

    it('should filter service orders by project', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/service-orders?projectId=${testProject.id}`,
        operatorToken,
      ).expect(200);

      expect(response.body.every((so: any) => so.projectId === testProject.id)).toBe(true);
    });

    it('should filter service orders by country code', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/api/v1/service-orders?countryCode=ES',
        operatorToken,
      ).expect(200);

      expect(response.body.every((so: any) => so.countryCode === 'ES')).toBe(true);
    });
  });

  // ============================================================================
  // GET SERVICE ORDER BY ID TESTS
  // ============================================================================

  describe('GET /api/v1/service-orders/:id - Get Service Order by ID', () => {
    let serviceOrder: any;

    beforeEach(async () => {
      serviceOrder = await factory.createServiceOrder(testProject.id);
    });

    it('should retrieve service order by ID', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/service-orders/${serviceOrder.id}`,
        operatorToken,
      ).expect(200);

      expect(response.body.id).toBe(serviceOrder.id);
      expect(response.body.projectId).toBe(testProject.id);
    });

    it('should return 404 for non-existent service order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, 'get', `/api/v1/service-orders/${fakeId}`, operatorToken)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  // ============================================================================
  // UPDATE SERVICE ORDER TESTS
  // ============================================================================

  describe('PATCH /api/v1/service-orders/:id - Update Service Order', () => {
    let serviceOrder: any;

    beforeEach(async () => {
      serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'CREATED',
      });
    });

    it('should update service order successfully', async () => {
      const updateDto = {
        description: 'Updated description',
        estimatedDuration: 240,
        requiredSkills: ['INSTALLATION', 'ELECTRICAL'],
      };

      const response = await authenticatedRequest(
        app,
        'patch',
        `/api/v1/service-orders/${serviceOrder.id}`,
        operatorToken,
      )
        .send(updateDto)
        .expect(200);

      expect(response.body.description).toBe(updateDto.description);
      expect(response.body.estimatedDuration).toBe(updateDto.estimatedDuration);
      expect(response.body.requiredSkills).toEqual(updateDto.requiredSkills);
    });

    it('should reject updating priority to P3', async () => {
      const updateDto = {
        priority: 'P3',
      };

      const response = await authenticatedRequest(
        app,
        'patch',
        `/api/v1/service-orders/${serviceOrder.id}`,
        operatorToken,
      )
        .send(updateDto)
        .expect(400);

      expect(response.body.message).toContain('priority');
    });

    it('should not allow state transitions via PATCH', async () => {
      const updateDto = {
        state: 'COMPLETED', // State transitions should use specific endpoints
      };

      const response = await authenticatedRequest(
        app,
        'patch',
        `/api/v1/service-orders/${serviceOrder.id}`,
        operatorToken,
      )
        .send(updateDto)
        .expect(400);

      expect(response.body.message).toContain('state');
    });
  });

  // ============================================================================
  // SCHEDULE SERVICE ORDER TESTS
  // ============================================================================

  describe('POST /api/v1/service-orders/:id/schedule - Schedule Service Order', () => {
    let serviceOrder: any;

    beforeEach(async () => {
      serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'CREATED',
      });
    });

    it('should schedule service order successfully', async () => {
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 2); // 2 days from now

      const scheduleDto = {
        scheduledStartTime: scheduleDate.toISOString(),
        scheduledEndTime: new Date(scheduleDate.getTime() + 3 * 60 * 60 * 1000).toISOString(), // +3 hours
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${serviceOrder.id}/schedule`,
        operatorToken,
      )
        .send(scheduleDto)
        .expect(200);

      expect(response.body.state).toBe('SCHEDULED');
      expect(response.body.scheduledStartTime).toBeDefined();
      expect(response.body.scheduledEndTime).toBeDefined();
    });

    it('should reject scheduling in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const scheduleDto = {
        scheduledStartTime: pastDate.toISOString(),
        scheduledEndTime: new Date(pastDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${serviceOrder.id}/schedule`,
        operatorToken,
      )
        .send(scheduleDto)
        .expect(400);

      expect(response.body.message).toContain('past');
    });

    it('should reject scheduling with end time before start time', async () => {
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 2);

      const scheduleDto = {
        scheduledStartTime: scheduleDate.toISOString(),
        scheduledEndTime: new Date(scheduleDate.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour before start
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${serviceOrder.id}/schedule`,
        operatorToken,
      )
        .send(scheduleDto)
        .expect(400);

      expect(response.body.message).toContain('end time');
    });
  });

  // ============================================================================
  // ASSIGN SERVICE ORDER TESTS
  // ============================================================================

  describe('POST /api/v1/service-orders/:id/assign - Assign Service Order', () => {
    let serviceOrder: any;

    beforeEach(async () => {
      serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'SCHEDULED',
      });
    });

    it('should assign provider to service order successfully', async () => {
      const assignDto = {
        providerId: testProvider.id,
        assignmentMode: 'DIRECT',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${serviceOrder.id}/assign`,
        operatorToken,
      )
        .send(assignDto)
        .expect(200);

      expect(response.body.state).toBe('ASSIGNED');
      expect(response.body.assignedProviderId).toBe(testProvider.id);

      // Verify assignment was created
      const assignment = await prisma.assignment.findFirst({
        where: {
          serviceOrderId: serviceOrder.id,
          providerId: testProvider.id,
        },
      });

      expect(assignment).not.toBeNull();
    });

    it('should reject assignment to non-existent provider', async () => {
      const assignDto = {
        providerId: '00000000-0000-0000-0000-000000000000',
        assignmentMode: 'DIRECT',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${serviceOrder.id}/assign`,
        operatorToken,
      )
        .send(assignDto)
        .expect(404);

      expect(response.body.message).toContain('Provider not found');
    });

    it('should reject assignment if service order not in correct state', async () => {
      const createdSO = await factory.createServiceOrder(testProject.id, {
        state: 'CREATED', // Not scheduled yet
      });

      const assignDto = {
        providerId: testProvider.id,
        assignmentMode: 'DIRECT',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${createdSO.id}/assign`,
        operatorToken,
      )
        .send(assignDto)
        .expect(400);

      expect(response.body.message).toContain('state');
    });
  });

  // ============================================================================
  // CANCEL SERVICE ORDER TESTS
  // ============================================================================

  describe('POST /api/v1/service-orders/:id/cancel - Cancel Service Order', () => {
    let serviceOrder: any;

    beforeEach(async () => {
      serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'SCHEDULED',
      });
    });

    it('should cancel service order successfully', async () => {
      const cancelDto = {
        reason: 'Customer requested cancellation',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${serviceOrder.id}/cancel`,
        operatorToken,
      )
        .send(cancelDto)
        .expect(200);

      expect(response.body.state).toBe('CANCELLED');
      expect(response.body.cancellationReason).toBe(cancelDto.reason);
      expect(response.body.cancelledAt).toBeDefined();
    });

    it('should reject cancellation without reason', async () => {
      await authenticatedRequest(app, 'post', `/api/v1/service-orders/${serviceOrder.id}/cancel`, operatorToken)
        .send({})
        .expect(400);
    });

    it('should reject cancelling already completed service order', async () => {
      const completedSO = await factory.createServiceOrder(testProject.id, {
        state: 'COMPLETED',
      });

      const cancelDto = {
        reason: 'Test cancellation',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${completedSO.id}/cancel`,
        operatorToken,
      )
        .send(cancelDto)
        .expect(400);

      expect(response.body.message).toContain('Cannot cancel');
    });
  });

  // ============================================================================
  // DEPENDENCIES TESTS
  // ============================================================================

  describe('GET /api/v1/service-orders/:id/dependencies - Get Unsatisfied Dependencies', () => {
    it('should return empty array when no dependencies', async () => {
      const serviceOrder = await factory.createServiceOrder(testProject.id);

      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/service-orders/${serviceOrder.id}/dependencies`,
        operatorToken,
      ).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return unsatisfied dependencies', async () => {
      // Create a service order that depends on another
      const technicalVisit = await factory.createServiceOrder(testProject.id, {
        serviceType: 'TECHNICAL_VISIT',
        state: 'CREATED', // Not completed yet
      });

      const installation = await factory.createServiceOrder(testProject.id, {
        serviceType: 'INSTALLATION',
        dependencies: [technicalVisit.id],
      });

      const response = await authenticatedRequest(
        app,
        'get',
        `/api/v1/service-orders/${installation.id}/dependencies`,
        operatorToken,
      ).expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((dep: any) => dep.id === technicalVisit.id)).toBe(true);
    });
  });

  // ============================================================================
  // DELETE SERVICE ORDER TESTS
  // ============================================================================

  describe('DELETE /api/v1/service-orders/:id - Delete Service Order', () => {
    it('should delete service order in CREATED state (admin only)', async () => {
      const serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'CREATED',
      });

      await authenticatedRequest(app, 'delete', `/api/v1/service-orders/${serviceOrder.id}`, adminToken)
        .expect(204);

      // Verify deletion
      const dbSO = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrder.id },
      });

      expect(dbSO).toBeNull();
    });

    it('should delete service order in CANCELLED state (admin only)', async () => {
      const serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'CANCELLED',
      });

      await authenticatedRequest(app, 'delete', `/api/v1/service-orders/${serviceOrder.id}`, adminToken)
        .expect(204);
    });

    it('should reject deletion of service order in other states', async () => {
      const serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'ASSIGNED',
      });

      const response = await authenticatedRequest(
        app,
        'delete',
        `/api/v1/service-orders/${serviceOrder.id}`,
        adminToken,
      ).expect(400);

      expect(response.body.message).toContain('Cannot delete');
    });

    it('should reject deletion by non-admin users', async () => {
      const serviceOrder = await factory.createServiceOrder(testProject.id, {
        state: 'CREATED',
      });

      const response = await authenticatedRequest(
        app,
        'delete',
        `/api/v1/service-orders/${serviceOrder.id}`,
        operatorToken,
      ).expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });

  // ============================================================================
  // STATE MACHINE TESTS
  // ============================================================================

  describe('Service Order State Machine', () => {
    it('should follow correct state transitions: CREATED → SCHEDULED → ASSIGNED → IN_PROGRESS → COMPLETED', async () => {
      // Create
      const so = await factory.createServiceOrder(testProject.id, {
        state: 'CREATED',
      });
      expect(so.state).toBe('CREATED');

      // Schedule
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 1);

      const scheduled = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${so.id}/schedule`,
        operatorToken,
      )
        .send({
          scheduledStartTime: scheduleDate.toISOString(),
          scheduledEndTime: new Date(scheduleDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      expect(scheduled.body.state).toBe('SCHEDULED');

      // Assign
      const assigned = await authenticatedRequest(
        app,
        'post',
        `/api/v1/service-orders/${so.id}/assign`,
        operatorToken,
      )
        .send({
          providerId: testProvider.id,
          assignmentMode: 'DIRECT',
        })
        .expect(200);

      expect(assigned.body.state).toBe('ASSIGNED');
    });

    it('should allow transition to CANCELLED from any state except COMPLETED', async () => {
      const states = ['CREATED', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'];

      for (const state of states) {
        const so = await factory.createServiceOrder(testProject.id, {
          state,
        });

        const cancelled = await authenticatedRequest(app, 'post', `/api/v1/service-orders/${so.id}/cancel`, operatorToken)
          .send({ reason: 'Test cancellation' })
          .expect(200);

        expect(cancelled.body.state).toBe('CANCELLED');
      }
    });
  });
});
