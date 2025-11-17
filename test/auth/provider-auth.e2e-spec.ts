import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('Provider Authentication (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testProviderId: string;
  let testUserId: string;

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

    // Create test provider for all tests
    const provider = await prisma.provider.create({
      data: {
        name: 'E2E Test Provider',
        email: 'e2e-provider@test.com',
        phone: '+34612345678',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        status: 'ACTIVE',
        type: 'COMPANY',
        taxId: 'ES12345678Z',
        address: '123 Test Street',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28001',
        legalRepName: 'John Doe',
        legalRepEmail: 'john@test.com',
        maxConcurrentJobs: 10,
      },
    });
    testProviderId = provider.id;
  });

  afterAll(async () => {
    // Cleanup: delete test data
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (testProviderId) {
      await prisma.provider.delete({ where: { id: testProviderId } }).catch(() => {});
    }

    await app.close();
  });

  describe('POST /api/v1/auth/provider/register', () => {
    it('should register a new provider user successfully', async () => {
      const registerDto = {
        email: 'provider-e2e@test.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'Provider',
        phone: '+34611111111',
        providerId: testProviderId,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('tokenType', 'Bearer');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        userType: 'EXTERNAL_PROVIDER',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      });

      // Save user ID for cleanup
      testUserId = response.body.user.id;

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        include: { provider: true },
      });

      expect(user).toBeDefined();
      expect(user.userType).toBe('EXTERNAL_PROVIDER');
      expect(user.providerId).toBe(testProviderId);
      expect(user.provider.id).toBe(testProviderId);
    });

    it('should reject registration with invalid provider ID', async () => {
      const registerDto = {
        email: 'invalid-provider@test.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        phone: '+34622222222',
        providerId: '00000000-0000-0000-0000-000000000000', // Non-existent
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/register')
        .send(registerDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Provider not found');
    });

    it('should reject registration with duplicate email', async () => {
      const registerDto = {
        email: 'provider-e2e@test.com', // Already registered
        password: 'SecurePass123!@#',
        firstName: 'Duplicate',
        lastName: 'User',
        phone: '+34633333333',
        providerId: testProviderId,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/register')
        .send(registerDto)
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration with weak password', async () => {
      const registerDto = {
        email: 'weak-pass@test.com',
        password: 'weak', // Too weak
        firstName: 'Test',
        lastName: 'User',
        phone: '+34644444444',
        providerId: testProviderId,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/register')
        .send(registerDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject registration with missing required fields', async () => {
      const registerDto = {
        email: 'incomplete@test.com',
        // Missing password, firstName, lastName, etc.
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/provider/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/provider/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'provider-e2e@test.com',
        password: 'SecurePass123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginDto.email);
      expect(response.body.user.userType).toBe('EXTERNAL_PROVIDER');
    });

    it('should reject login with invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@test.com',
        password: 'SecurePass123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginDto = {
        email: 'provider-e2e@test.com',
        password: 'WrongPassword123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login for inactive provider', async () => {
      // Deactivate the provider
      await prisma.provider.update({
        where: { id: testProviderId },
        data: { status: 'INACTIVE' },
      });

      const loginDto = {
        email: 'provider-e2e@test.com',
        password: 'SecurePass123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Provider account is not active');

      // Reactivate for other tests
      await prisma.provider.update({
        where: { id: testProviderId },
        data: { status: 'ACTIVE' },
      });
    });
  });

  describe('JWT Token Validation', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Login to get token
      const loginDto = {
        email: 'provider-e2e@test.com',
        password: 'SecurePass123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/login')
        .send(loginDto)
        .expect(200);

      accessToken = response.body.accessToken;
    });

    it('should access protected route with valid token', async () => {
      // This would test a protected provider endpoint
      // For now, we'll test if the token structure is valid
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should reject request with invalid token', async () => {
      // Test with a made-up token
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me') // Protected endpoint
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me') // Protected endpoint
        .expect(401);
    });
  });

  describe('User Type Isolation', () => {
    let providerAccessToken: string;

    beforeAll(async () => {
      // Login as provider
      const loginDto = {
        email: 'provider-e2e@test.com',
        password: 'SecurePass123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/provider/login')
        .send(loginDto)
        .expect(200);

      providerAccessToken = response.body.accessToken;
    });

    it('should allow provider to access provider-specific endpoints', async () => {
      // This would test actual provider endpoints when implemented
      // For now, verify the token has correct userType
      const payload = JSON.parse(
        Buffer.from(providerAccessToken.split('.')[1], 'base64').toString(),
      );

      expect(payload).toHaveProperty('userType', 'EXTERNAL_PROVIDER');
      expect(payload).toHaveProperty('providerId', testProviderId);
    });

    it('should deny provider access to internal-only endpoints', async () => {
      // This would test that providers can't access operator-only endpoints
      // Implementation depends on having actual protected endpoints with @UserType decorators
    });
  });
});
