import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, AuthResponseDto } from './dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      userType: 'INTERNAL',
      roles: ['OPERATOR'],
      mfaEnabled: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should register a new user', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should return auth response with tokens', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login a user', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should return auth response with tokens', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.tokenType).toBe('Bearer');
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh access token', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should return new tokens', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('logout', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    const currentUser = {
      userId: 'user-123',
      email: 'test@example.com',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      roles: ['OPERATOR'],
    };

    it('should logout a user', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(currentUser, refreshTokenDto);

      expect(authService.logout).toHaveBeenCalledWith(currentUser.userId, refreshTokenDto.refreshToken);
    });

    it('should not return any value (NO_CONTENT)', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(currentUser, refreshTokenDto);

      expect(result).toBeUndefined();
    });
  });

  describe('getCurrentUser', () => {
    const currentUser = {
      userId: 'user-123',
      email: 'test@example.com',
      countryCode: 'FR',
      businessUnit: 'LEROY_MERLIN',
      roles: ['OPERATOR'],
    };

    it('should return current user information', async () => {
      const result = await controller.getCurrentUser(currentUser);

      expect(result).toEqual(currentUser);
    });

    it('should include user ID, email, and roles', async () => {
      const result = await controller.getCurrentUser(currentUser);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('roles');
      expect(result).toHaveProperty('countryCode');
      expect(result).toHaveProperty('businessUnit');
    });
  });
});
