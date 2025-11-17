import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { TechnicianAuthService } from './technician-auth.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TechnicianRegisterDto, TechnicianLoginDto, BiometricSetupDto, BiometricLoginDto } from '../dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock crypto - preserve original functionality but allow createVerify to be mocked
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    createVerify: jest.fn(),
  };
});

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

describe('TechnicianAuthService', () => {
  let service: TechnicianAuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    workTeam: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
    registeredDevice: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicianAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TechnicianAuthService>(TechnicianAuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: TechnicianRegisterDto = {
      email: 'tech@test.com',
      password: 'Password123!',
      firstName: 'Carlos',
      lastName: 'Garcia',
      phone: '+34612345678',
      workTeamId: 'team-123',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
    };

    const mockWorkTeam = {
      id: 'team-123',
      countryCode: 'ES',
      providerId: 'provider-123',
      name: 'Test Team',
      provider: {
        id: 'provider-123',
        status: 'ACTIVE',
      },
    };

    const mockUser = {
      id: 'user-123',
      email: 'tech@test.com',
      firstName: 'Carlos',
      lastName: 'Garcia',
      userType: 'EXTERNAL_TECHNICIAN',
      workTeamId: 'team-123',
      providerId: 'provider-123',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      mfaEnabled: false,
      roles: [{ role: { name: 'TECHNICIAN' } }],
      workTeam: mockWorkTeam,
      provider: mockWorkTeam.provider,
    };

    it('should register a new technician successfully', async () => {
      mockPrismaService.workTeam.findUnique.mockResolvedValue(mockWorkTeam);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.userType).toBe('EXTERNAL_TECHNICIAN');
      expect(result.user.workTeamId).toBe('team-123');
    });

    it('should throw BadRequestException if work team not found', async () => {
      mockPrismaService.workTeam.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Work team not found');
    });

    it('should throw BadRequestException if provider is not active', async () => {
      mockPrismaService.workTeam.findUnique.mockResolvedValue({
        ...mockWorkTeam,
        provider: { status: 'INACTIVE' },
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Provider is not active');
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.workTeam.findUnique.mockResolvedValue(mockWorkTeam);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto: TechnicianLoginDto = {
      email: 'tech@test.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-123',
      email: 'tech@test.com',
      password: '$2b$10$hashedpassword',
      userType: 'EXTERNAL_TECHNICIAN',
      isActive: true,
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      workTeamId: 'team-123',
      providerId: 'provider-123',
      mfaEnabled: false,
      roles: [{ role: { name: 'TECHNICIAN' } }],
      provider: { status: 'ACTIVE' },
      workTeam: { name: 'Test Team' },
    };

    it('should login technician successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.userType).toBe('EXTERNAL_TECHNICIAN');
    });

    it('should throw UnauthorizedException if user is not EXTERNAL_TECHNICIAN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        userType: 'INTERNAL',
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('setupBiometric', () => {
    const setupDto: BiometricSetupDto = {
      deviceId: 'device-123',
      publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----',
      platform: 'ios',
      deviceName: 'iPhone 14 Pro',
      deviceModel: 'iPhone15,2',
    };

    const mockUser = {
      id: 'user-123',
      email: 'tech@test.com',
      userType: 'EXTERNAL_TECHNICIAN',
      devices: [],
    };

    it('should setup biometric authentication successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.registeredDevice.findUnique.mockResolvedValue(null);
      mockPrismaService.registeredDevice.create.mockResolvedValue({
        id: 'device-record-id',
        ...setupDto,
      });

      const result = await service.setupBiometric('user-123', setupDto);

      expect(result).toHaveProperty('deviceId', 'device-123');
      expect(result).toHaveProperty('message');
      expect(mockPrismaService.registeredDevice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            deviceId: 'device-123',
            publicKey: setupDto.publicKey,
            platform: 'ios',
          }),
        }),
      );
    });

    it('should throw UnauthorizedException if user is not technician', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        userType: 'INTERNAL',
      });

      await expect(service.setupBiometric('user-123', setupDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if max devices limit reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        devices: [{}, {}, {}], // 3 devices (max limit)
      });

      await expect(service.setupBiometric('user-123', setupDto)).rejects.toThrow(BadRequestException);
      await expect(service.setupBiometric('user-123', setupDto)).rejects.toThrow('Maximum 3 devices allowed');
    });

    it('should throw ConflictException if device already registered', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.registeredDevice.findUnique.mockResolvedValue({
        id: 'existing-device',
      });

      await expect(service.setupBiometric('user-123', setupDto)).rejects.toThrow(ConflictException);
      await expect(service.setupBiometric('user-123', setupDto)).rejects.toThrow('Device already registered');
    });
  });

  describe('biometricLogin', () => {
    const loginDto: BiometricLoginDto = {
      deviceId: 'device-123',
      challenge: 'test-challenge',
      signature: 'test-signature',
    };

    const mockDevice = {
      id: 'device-id',
      deviceId: 'device-123',
      publicKey: 'test-public-key',
      isActive: true,
      deviceName: 'iPhone 14 Pro',
      user: {
        id: 'user-123',
        email: 'tech@test.com',
        firstName: 'Carlos',
        lastName: 'Garcia',
        isActive: true,
        userType: 'EXTERNAL_TECHNICIAN',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        workTeamId: 'team-123',
        providerId: 'provider-123',
        mfaEnabled: false,
        roles: [{ role: { name: 'TECHNICIAN' } }],
      },
    };

    it('should login with biometric successfully', async () => {
      mockPrismaService.registeredDevice.findUnique.mockResolvedValue(mockDevice);

      // Mock crypto signature verification
      const mockVerifier = {
        update: jest.fn(),
        end: jest.fn(),
        verify: jest.fn().mockReturnValue(true),
      };
      (crypto.createVerify as jest.Mock).mockReturnValue(mockVerifier);

      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockDevice.user);
      mockPrismaService.registeredDevice.update.mockResolvedValue({});

      const result = await service.biometricLogin(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(mockPrismaService.registeredDevice.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if device not found', async () => {
      mockPrismaService.registeredDevice.findUnique.mockResolvedValue(null);

      await expect(service.biometricLogin(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.biometricLogin(loginDto)).rejects.toThrow('Device not found or inactive');
    });

    it('should throw UnauthorizedException if device is inactive', async () => {
      mockPrismaService.registeredDevice.findUnique.mockResolvedValue({
        ...mockDevice,
        isActive: false,
      });

      await expect(service.biometricLogin(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if signature is invalid', async () => {
      mockPrismaService.registeredDevice.findUnique.mockResolvedValue(mockDevice);

      const mockVerifier = {
        update: jest.fn(),
        end: jest.fn(),
        verify: jest.fn().mockReturnValue(false),
      };
      (crypto.createVerify as jest.Mock).mockReturnValue(mockVerifier);

      await expect(service.biometricLogin(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.biometricLogin(loginDto)).rejects.toThrow('Invalid biometric signature');
    });
  });

  describe('generateOfflineToken', () => {
    const mockDevice = {
      id: 'device-id',
      deviceId: 'device-123',
      isActive: true,
      user: {
        id: 'user-123',
        email: 'tech@test.com',
        userType: 'EXTERNAL_TECHNICIAN',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        workTeamId: 'team-123',
        providerId: 'provider-123',
        roles: [{ role: { name: 'TECHNICIAN' } }],
      },
    };

    it('should generate offline token successfully', async () => {
      mockPrismaService.registeredDevice.findFirst.mockResolvedValue(mockDevice);
      mockJwtService.sign.mockReturnValue('offline-token');

      const result = await service.generateOfflineToken('user-123', 'device-123');

      expect(result).toHaveProperty('offlineToken', 'offline-token');
      expect(result).toHaveProperty('expiresAt');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          authMethod: 'offline',
          deviceId: 'device-123',
        }),
        expect.objectContaining({
          expiresIn: '7d',
        }),
      );
    });

    it('should throw UnauthorizedException if device not found', async () => {
      mockPrismaService.registeredDevice.findFirst.mockResolvedValue(null);

      await expect(service.generateOfflineToken('user-123', 'device-123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getDevices', () => {
    const mockDevices = [
      {
        id: 'device-1',
        deviceId: 'device-123',
        platform: 'ios',
        deviceName: 'iPhone 14 Pro',
        deviceModel: 'iPhone15,2',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      },
      {
        id: 'device-2',
        deviceId: 'device-456',
        platform: 'android',
        deviceName: 'Samsung Galaxy',
        deviceModel: 'SM-G991B',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      },
    ];

    it('should return list of user devices', async () => {
      mockPrismaService.registeredDevice.findMany.mockResolvedValue(mockDevices);

      const result = await service.getDevices('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('deviceId', 'device-123');
      expect(mockPrismaService.registeredDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        }),
      );
    });
  });

  describe('revokeDevice', () => {
    const mockDevice = {
      id: 'device-id',
      deviceId: 'device-123',
      userId: 'user-123',
    };

    it('should revoke device successfully', async () => {
      mockPrismaService.registeredDevice.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.registeredDevice.update.mockResolvedValue({
        ...mockDevice,
        isActive: false,
      });

      const result = await service.revokeDevice('user-123', 'device-123');

      expect(result).toHaveProperty('message', 'Device revoked successfully');
      expect(mockPrismaService.registeredDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-id' },
          data: { isActive: false },
        }),
      );
    });

    it('should throw BadRequestException if device not found', async () => {
      mockPrismaService.registeredDevice.findFirst.mockResolvedValue(null);

      await expect(service.revokeDevice('user-123', 'device-123')).rejects.toThrow(BadRequestException);
      await expect(service.revokeDevice('user-123', 'device-123')).rejects.toThrow('Device not found');
    });
  });
});
