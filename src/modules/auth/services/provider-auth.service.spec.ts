import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProviderAuthService } from './provider-auth.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ProviderRegisterDto, ProviderLoginDto } from '../dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('ProviderAuthService', () => {
  let service: ProviderAuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    provider: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
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
        ProviderAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProviderAuthService>(ProviderAuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks before each test
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: ProviderRegisterDto = {
      email: 'provider@test.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+34612345678',
      providerId: 'provider-123',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
    };

    const mockProvider = {
      id: 'provider-123',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      status: 'ACTIVE',
      name: 'Test Provider',
    };

    const mockUser = {
      id: 'user-123',
      email: 'provider@test.com',
      firstName: 'John',
      lastName: 'Doe',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      userType: 'EXTERNAL_PROVIDER',
      providerId: 'provider-123',
      mfaEnabled: false,
      roles: [
        {
          role: {
            name: 'PROVIDER_MANAGER',
          },
        },
      ],
      provider: mockProvider,
    };

    it('should register a new provider user successfully', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('provider@test.com');
      expect(result.user.userType).toBe('EXTERNAL_PROVIDER');

      expect(mockPrismaService.provider.findUnique).toHaveBeenCalledWith({
        where: { id: 'provider-123' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'provider@test.com' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if provider not found', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Provider not found');
    });

    it('should throw BadRequestException if provider is not active', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue({
        ...mockProvider,
        status: 'INACTIVE',
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Provider is not active');
    });

    it('should throw BadRequestException if country code does not match', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue({
        ...mockProvider,
        countryCode: 'FR',
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Country code or business unit does not match provider');
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('User with this email already exists');
    });

    it('should hash the password before storing', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });
  });

  describe('login', () => {
    const loginDto: ProviderLoginDto = {
      email: 'provider@test.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-123',
      email: 'provider@test.com',
      firstName: 'John',
      lastName: 'Doe',
      password: '$2b$10$hashedpassword',
      userType: 'EXTERNAL_PROVIDER',
      isActive: true,
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      providerId: 'provider-123',
      mfaEnabled: false,
      roles: [
        {
          role: {
            name: 'PROVIDER_MANAGER',
          },
        },
      ],
      provider: {
        status: 'ACTIVE',
      },
    };

    it('should login provider user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect('user' in result && result.user.email).toBe('provider@test.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if user is not EXTERNAL_PROVIDER', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        userType: 'INTERNAL',
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('User account is disabled');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if provider is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        provider: {
          status: 'INACTIVE',
        },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Provider account is not active');
    });

    it('should return MFA required response if MFA is enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('mfaRequired', true);
      expect(result).toHaveProperty('mfaMethods');
      expect(result).toHaveProperty('message', 'MFA verification required');
    });

    it('should verify password using bcrypt.compare', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.login(loginDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
    });
  });

  describe('JWT token generation', () => {
    it('should generate tokens with correct payload structure', async () => {
      const registerDto: ProviderRegisterDto = {
        email: 'provider@test.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+34612345678',
        providerId: 'provider-123',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
      };

      const mockProvider = {
        id: 'provider-123',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        status: 'ACTIVE',
      };

      const mockUser = {
        id: 'user-123',
        email: 'provider@test.com',
        firstName: 'John',
        lastName: 'Doe',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        userType: 'EXTERNAL_PROVIDER',
        providerId: 'provider-123',
        mfaEnabled: false,
        roles: [{ role: { name: 'PROVIDER_MANAGER' } }],
        provider: mockProvider,
      };

      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.register(registerDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          email: 'provider@test.com',
          userType: 'EXTERNAL_PROVIDER',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          providerId: 'provider-123',
          roles: ['PROVIDER_MANAGER'],
          authMethod: 'local',
        }),
      );
    });

    it('should store refresh token in database', async () => {
      const loginDto: ProviderLoginDto = {
        email: 'provider@test.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'provider@test.com',
        password: '$2b$10$hashedpassword',
        userType: 'EXTERNAL_PROVIDER',
        isActive: true,
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        providerId: 'provider-123',
        mfaEnabled: false,
        roles: [{ role: { name: 'PROVIDER_MANAGER' } }],
        provider: { status: 'ACTIVE' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('7d');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.login(loginDto);

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            token: 'refresh-token',
          }),
        }),
      );
    });
  });
});
