import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
    };

    const mockUser = {
      id: 'user-123',
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      countryCode: registerDto.countryCode,
      businessUnit: registerDto.businessUnit,
      password: 'hashed-password',
      isActive: true,
      roles: [
        {
          role: {
            name: 'OPERATOR',
          },
        },
      ],
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('7d');

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should hash password before storing', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('7d');

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-123',
      email: loginDto.email,
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      isActive: true,
      roles: [
        {
          role: {
            name: 'OPERATOR',
          },
        },
      ],
    };

    it('should login user with valid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('7d');

      const result = await service.login(loginDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const tokenPayload = {
      userId: 'user-123',
      tokenId: 'token-123',
    };

    const mockStoredToken = {
      id: tokenPayload.tokenId,
      token: refreshToken,
      userId: tokenPayload.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isRevoked: false,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        countryCode: 'FR',
        businessUnit: 'LEROY_MERLIN',
        password: 'hashed-password',
        isActive: true,
        roles: [
          {
            role: {
              name: 'OPERATOR',
            },
          },
        ],
      },
    };

    it('should refresh token successfully', async () => {
      mockJwtService.verify.mockReturnValue(tokenPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('7d');

      const result = await service.refreshToken(refreshToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: '7d',
      });
      expect(mockPrismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { id: tokenPayload.tokenId },
        include: {
          user: {
            include: {
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      });
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockStoredToken.id },
        data: { isRevoked: true },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token not found in database', async () => {
      mockJwtService.verify.mockReturnValue(tokenPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      mockJwtService.verify.mockReturnValue(tokenPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      mockJwtService.verify.mockReturnValue(tokenPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        isRevoked: true,
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const userId = 'user-123';
    const refreshToken = 'valid-refresh-token';
    const tokenPayload = {
      userId,
      tokenId: 'token-123',
    };

    it('should logout user successfully', async () => {
      mockJwtService.verify.mockReturnValue(tokenPayload);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockConfigService.get.mockReturnValue('test-secret');

      await service.logout(userId, refreshToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-secret',
      });
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          id: tokenPayload.tokenId,
          userId,
        },
        data: {
          isRevoked: true,
        },
      });
    });

    it('should handle logout with invalid token gracefully', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.logout(userId, refreshToken)).resolves.not.toThrow();
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'Password123!';

    const mockUser = {
      id: 'user-123',
      email,
      password: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      isActive: true,
      roles: [
        {
          role: {
            name: 'OPERATOR',
          },
        },
      ],
    };

    it('should validate user with correct credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(email, password);

      expect(result).toBeDefined();
      expect(result.email).toBe(email);
      expect(result.password).toBeUndefined();
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });
  });
});
