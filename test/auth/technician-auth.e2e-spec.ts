import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('Technician Authentication (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testProviderId: string;
  let testWorkTeamId: string;
  let testTechnicianUserId: string;
  let technicianAccessToken: string;
  let testDeviceId: string;
  let privateKey: string;
  let publicKey: string;

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

    // Generate RSA key pair for biometric tests
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = priv;
    publicKey = pub;

    // Create test provider and work team
    const provider = await prisma.provider.create({
      data: {
        name: 'E2E Technician Provider',
        email: 'technician-provider@test.com',
        phone: '+34612345678',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        status: 'ACTIVE',
        type: 'COMPANY',
        taxId: 'ES87654321Z',
        address: '456 Test Avenue',
        city: 'Barcelona',
        state: 'Catalonia',
        postalCode: '08001',
        legalRepName: 'Jane Doe',
        legalRepEmail: 'jane@test.com',
        maxConcurrentJobs: 5,
      },
    });
    testProviderId = provider.id;

    const workTeam = await prisma.workTeam.create({
      data: {
        name: 'E2E Test Team',
        providerId: testProviderId,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        capacity: 10,
        status: 'ACTIVE',
        specializationTags: ['PLUMBING', 'ELECTRICAL'],
      },
    });
    testWorkTeamId = workTeam.id;
  });

  afterAll(async () => {
    // Cleanup: delete test data in correct order
    if (testTechnicianUserId) {
      await prisma.registeredDevice.deleteMany({ where: { userId: testTechnicianUserId } });
      await prisma.user.delete({ where: { id: testTechnicianUserId } }).catch(() => {});
    }
    if (testWorkTeamId) {
      await prisma.workTeam.delete({ where: { id: testWorkTeamId } }).catch(() => {});
    }
    if (testProviderId) {
      await prisma.provider.delete({ where: { id: testProviderId } }).catch(() => {});
    }

    await app.close();
  });

  describe('POST /api/v1/auth/technician/register', () => {
    it('should register a new technician successfully', async () => {
      const registerDto = {
        email: 'technician-e2e@test.com',
        password: 'TechPass123!@#',
        firstName: 'Test',
        lastName: 'Technician',
        phone: '+34655555555',
        workTeamId: testWorkTeamId,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        userType: 'EXTERNAL_TECHNICIAN',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      });

      testTechnicianUserId = response.body.user.id;
      technicianAccessToken = response.body.accessToken;

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { id: testTechnicianUserId },
        include: { workTeam: true },
      });

      expect(user).toBeDefined();
      expect(user.userType).toBe('EXTERNAL_TECHNICIAN');
      expect(user.workTeamId).toBe(testWorkTeamId);
      expect(user.workTeam.id).toBe(testWorkTeamId);
    });

    it('should reject registration with invalid work team ID', async () => {
      const registerDto = {
        email: 'invalid-team@test.com',
        password: 'TechPass123!@#',
        firstName: 'Test',
        lastName: 'User',
        phone: '+34666666666',
        workTeamId: '00000000-0000-0000-0000-000000000000',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('Work team not found');
    });

    it('should reject registration with duplicate email', async () => {
      const registerDto = {
        email: 'technician-e2e@test.com', // Already registered
        password: 'TechPass123!@#',
        firstName: 'Duplicate',
        lastName: 'Tech',
        phone: '+34677777777',
        workTeamId: testWorkTeamId,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/technician/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'technician-e2e@test.com',
        password: 'TechPass123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(loginDto.email);
      expect(response.body.user.userType).toBe('EXTERNAL_TECHNICIAN');

      technicianAccessToken = response.body.accessToken;
    });

    it('should reject login with invalid credentials', async () => {
      const loginDto = {
        email: 'technician-e2e@test.com',
        password: 'WrongPassword123!@#',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/technician/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/technician/biometric-setup', () => {
    it('should setup biometric authentication successfully', async () => {
      testDeviceId = `device-${Date.now()}`;

      const setupDto = {
        deviceId: testDeviceId,
        publicKey: publicKey,
        platform: 'ios',
        deviceName: 'iPhone 14 Pro',
        deviceModel: 'iPhone15,2',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-setup')
        .set('Authorization', `Bearer ${technicianAccessToken}`)
        .send(setupDto)
        .expect(201);

      expect(response.body).toHaveProperty('deviceId', testDeviceId);
      expect(response.body).toHaveProperty('message');

      // Verify device was registered in database
      const device = await prisma.registeredDevice.findUnique({
        where: { deviceId: testDeviceId },
      });

      expect(device).toBeDefined();
      expect(device.userId).toBe(testTechnicianUserId);
      expect(device.platform).toBe('ios');
      expect(device.isActive).toBe(true);
    });

    it('should reject biometric setup without authentication', async () => {
      const setupDto = {
        deviceId: 'unauthenticated-device',
        publicKey: publicKey,
        platform: 'android',
        deviceName: 'Test Device',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-setup')
        .send(setupDto)
        .expect(401);
    });

    it('should reject duplicate device registration', async () => {
      const setupDto = {
        deviceId: testDeviceId, // Same device ID
        publicKey: publicKey,
        platform: 'ios',
        deviceName: 'Duplicate Device',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-setup')
        .set('Authorization', `Bearer ${technicianAccessToken}`)
        .send(setupDto)
        .expect(409);

      expect(response.body.message).toContain('already registered');
    });

    it('should reject when max devices limit (3) is reached', async () => {
      // Register 2 more devices (we already have 1)
      for (let i = 1; i <= 2; i++) {
        const setupDto = {
          deviceId: `device-extra-${i}-${Date.now()}`,
          publicKey: publicKey,
          platform: 'android',
          deviceName: `Extra Device ${i}`,
        };

        await request(app.getHttpServer())
          .post('/api/v1/auth/technician/biometric-setup')
          .set('Authorization', `Bearer ${technicianAccessToken}`)
          .send(setupDto)
          .expect(201);
      }

      // Try to register 4th device (should fail)
      const setupDto = {
        deviceId: `device-fourth-${Date.now()}`,
        publicKey: publicKey,
        platform: 'android',
        deviceName: 'Fourth Device',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-setup')
        .set('Authorization', `Bearer ${technicianAccessToken}`)
        .send(setupDto)
        .expect(400);

      expect(response.body.message).toContain('Maximum number of devices');
    });
  });

  describe('POST /api/v1/auth/technician/biometric-login', () => {
    it('should login with valid biometric signature', async () => {
      const challenge = `challenge-${Date.now()}-${Math.random()}`;

      // Sign the challenge with private key
      const sign = crypto.createSign('SHA256');
      sign.update(challenge);
      sign.end();
      const signature = sign.sign(privateKey, 'base64');

      const loginDto = {
        deviceId: testDeviceId,
        challenge: challenge,
        signature: signature,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.userType).toBe('EXTERNAL_TECHNICIAN');

      // Verify lastUsedAt was updated
      const device = await prisma.registeredDevice.findUnique({
        where: { deviceId: testDeviceId },
      });

      expect(device.lastUsedAt).toBeDefined();
    });

    it('should reject biometric login with invalid signature', async () => {
      const challenge = `challenge-${Date.now()}-${Math.random()}`;
      const invalidSignature = 'invalid-signature-base64';

      const loginDto = {
        deviceId: testDeviceId,
        challenge: challenge,
        signature: invalidSignature,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-login')
        .send(loginDto)
        .expect(401);
    });

    it('should reject biometric login with non-existent device', async () => {
      const challenge = `challenge-${Date.now()}`;
      const sign = crypto.createSign('SHA256');
      sign.update(challenge);
      sign.end();
      const signature = sign.sign(privateKey, 'base64');

      const loginDto = {
        deviceId: 'non-existent-device',
        challenge: challenge,
        signature: signature,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/technician/offline-token', () => {
    it('should generate offline token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/technician/offline-token')
        .set('Authorization', `Bearer ${technicianAccessToken}`)
        .send({ deviceId: testDeviceId })
        .expect(201);

      expect(response.body).toHaveProperty('offlineToken');
      expect(response.body).toHaveProperty('expiresAt');

      // Verify token has 7-day expiration
      const expiresAt = new Date(response.body.expiresAt);
      const now = new Date();
      const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(6); // Allow for timing
      expect(diffDays).toBeLessThanOrEqual(8);

      // Verify offline token is a valid JWT
      const offlineToken = response.body.offlineToken;
      expect(offlineToken.split('.')).toHaveLength(3);
    });

    it('should reject offline token generation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/technician/offline-token')
        .send({ deviceId: testDeviceId })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/technician/devices', () => {
    it('should list all registered devices', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/technician/devices')
        .set('Authorization', `Bearer ${technicianAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const device = response.body.find((d: any) => d.deviceId === testDeviceId);
      expect(device).toBeDefined();
      expect(device).toHaveProperty('platform', 'ios');
      expect(device).toHaveProperty('deviceName', 'iPhone 14 Pro');
      expect(device).toHaveProperty('isActive', true);
      expect(device).not.toHaveProperty('publicKey'); // Should not expose key
    });

    it('should reject device listing without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/technician/devices').expect(401);
    });
  });

  describe('DELETE /api/v1/auth/technician/devices/:deviceId', () => {
    it('should revoke device successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/auth/technician/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${technicianAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('revoked');

      // Verify device was marked as inactive
      const device = await prisma.registeredDevice.findUnique({
        where: { deviceId: testDeviceId },
      });

      expect(device).toBeDefined();
      expect(device.isActive).toBe(false);
    });

    it('should reject biometric login with revoked device', async () => {
      const challenge = `challenge-${Date.now()}`;
      const sign = crypto.createSign('SHA256');
      sign.update(challenge);
      sign.end();
      const signature = sign.sign(privateKey, 'base64');

      const loginDto = {
        deviceId: testDeviceId, // Revoked device
        challenge: challenge,
        signature: signature,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/technician/biometric-login')
        .send(loginDto)
        .expect(401);
    });

    it('should reject device revocation without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/auth/technician/devices/${testDeviceId}`)
        .expect(401);
    });
  });

  describe('User Type Isolation', () => {
    it('should verify JWT contains correct user type and work team ID', async () => {
      const payload = JSON.parse(
        Buffer.from(technicianAccessToken.split('.')[1], 'base64').toString(),
      );

      expect(payload).toHaveProperty('userType', 'EXTERNAL_TECHNICIAN');
      expect(payload).toHaveProperty('workTeamId', testWorkTeamId);
      expect(payload).toHaveProperty('providerId', testProviderId);
      expect(payload).toHaveProperty('authMethod');
    });
  });
});
