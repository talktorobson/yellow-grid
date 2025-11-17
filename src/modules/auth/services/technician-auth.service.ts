import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TechnicianRegisterDto, TechnicianLoginDto, BiometricSetupDto, BiometricLoginDto, AuthResponseDto, UserDto } from '../dto';

@Injectable()
export class TechnicianAuthService {
  private readonly logger = new Logger(TechnicianAuthService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly MAX_DEVICES_PER_USER = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new technician user
   */
  async register(dto: TechnicianRegisterDto): Promise<AuthResponseDto> {
    // Validate work team exists and is active
    const workTeam = await this.prisma.workTeam.findUnique({
      where: { id: dto.workTeamId },
      include: { provider: true },
    });

    if (!workTeam) {
      throw new BadRequestException('Work team not found');
    }

    if (workTeam.provider.status !== 'ACTIVE') {
      throw new BadRequestException('Provider is not active');
    }

    // Verify country code and business unit match work team
    if (workTeam.countryCode !== dto.countryCode) {
      throw new BadRequestException('Country code does not match work team');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create technician user with TECHNICIAN role
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        countryCode: dto.countryCode,
        businessUnit: dto.businessUnit,
        userType: 'EXTERNAL_TECHNICIAN',
        authProvider: 'local',
        workTeamId: dto.workTeamId,
        providerId: workTeam.providerId,
        isVerified: false, // Email verification required
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: 'TECHNICIAN' },
                create: {
                  name: 'TECHNICIAN',
                  description: 'Field service technician',
                },
              },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        workTeam: true,
        provider: true,
      },
    });

    this.logger.log(
      `Technician registered: ${user.email} (${user.id}) for work team ${workTeam.name}`,
    );

    // TODO: Send email verification
    // await this.sendVerificationEmail(user.email);

    return this.generateTokens(user);
  }

  /**
   * Login technician with email/password
   */
  async login(dto: TechnicianLoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        workTeam: true,
        provider: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify user is external technician type
    if (user.userType !== 'EXTERNAL_TECHNICIAN') {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if provider is active
    if (user.provider && user.provider.status !== 'ACTIVE') {
      throw new UnauthorizedException('Provider account is not active');
    }

    this.logger.log(`Technician logged in: ${user.email} (${user.id})`);

    return this.generateTokens(user);
  }

  /**
   * Setup biometric authentication for a device
   */
  async setupBiometric(userId: string, dto: BiometricSetupDto): Promise<{
    deviceId: string;
    message: string;
  }> {
    // Check if user exists and is technician
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        devices: {
          where: { isActive: true },
        },
      },
    });

    if (!user || user.userType !== 'EXTERNAL_TECHNICIAN') {
      throw new UnauthorizedException('Invalid user');
    }

    // Check device limit
    if (user.devices.length >= this.MAX_DEVICES_PER_USER) {
      throw new BadRequestException(
        `Maximum ${this.MAX_DEVICES_PER_USER} devices allowed per user. Please remove a device first.`,
      );
    }

    // Check if device already registered
    const existingDevice = await this.prisma.registeredDevice.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (existingDevice) {
      throw new ConflictException('Device already registered');
    }

    // Store device with public key
    const device = await this.prisma.registeredDevice.create({
      data: {
        userId: user.id,
        deviceId: dto.deviceId,
        publicKey: dto.publicKey,
        platform: dto.platform,
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        isActive: true,
      },
    });

    this.logger.log(
      `Biometric setup for user ${user.email}: ${dto.deviceName} (${dto.deviceId})`,
    );

    return {
      deviceId: device.deviceId,
      message: 'Biometric authentication setup successfully',
    };
  }

  /**
   * Login with biometric authentication
   */
  async biometricLogin(dto: BiometricLoginDto): Promise<AuthResponseDto> {
    // Find device
    const device = await this.prisma.registeredDevice.findUnique({
      where: { deviceId: dto.deviceId },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
            workTeam: true,
            provider: true,
          },
        },
      },
    });

    if (!device || !device.isActive) {
      throw new UnauthorizedException('Device not found or inactive');
    }

    if (!device.user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    // Verify signature
    const isValid = this.verifySignature(
      dto.challenge,
      dto.signature,
      device.publicKey,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid biometric signature');
    }

    // Update last login
    await this.prisma.registeredDevice.update({
      where: { id: device.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(
      `Biometric login: ${device.user.email} via ${device.deviceName}`,
    );

    return this.generateTokens(device.user, 'biometric', dto.deviceId);
  }

  /**
   * Generate offline token (7-day validity for offline work)
   */
  async generateOfflineToken(userId: string, deviceId: string): Promise<{
    offlineToken: string;
    expiresAt: Date;
  }> {
    // Verify user and device
    const device = await this.prisma.registeredDevice.findFirst({
      where: {
        deviceId,
        userId,
        isActive: true,
      },
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

    if (!device) {
      throw new UnauthorizedException('Device not found or not authorized');
    }

    const user = device.user;
    const roles = user.roles.map((ur: any) => ur.role.name);

    // Generate offline token with 7-day expiration
    const offlineTokenPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      countryCode: user.countryCode,
      businessUnit: user.businessUnit,
      providerId: user.providerId,
      workTeamId: user.workTeamId,
      roles,
      authMethod: 'offline',
      deviceId: deviceId,
    };

    const offlineToken = this.jwtService.sign(offlineTokenPayload, {
      expiresIn: '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    this.logger.log(
      `Offline token generated for ${user.email} on device ${device.deviceName}`,
    );

    return {
      offlineToken,
      expiresAt,
    };
  }

  /**
   * Get user's registered devices
   */
  async getDevices(userId: string): Promise<any[]> {
    const devices = await this.prisma.registeredDevice.findMany({
      where: { userId },
      select: {
        id: true,
        deviceId: true,
        platform: true,
        deviceName: true,
        deviceModel: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return devices;
  }

  /**
   * Revoke (deactivate) a device
   */
  async revokeDevice(userId: string, deviceId: string): Promise<{ message: string }> {
    const device = await this.prisma.registeredDevice.findFirst({
      where: {
        deviceId,
        userId,
      },
    });

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    await this.prisma.registeredDevice.update({
      where: { id: device.id },
      data: { isActive: false },
    });

    this.logger.log(`Device revoked: ${deviceId} for user ${userId}`);

    return { message: 'Device revoked successfully' };
  }

  /**
   * Verify biometric signature
   */
  private verifySignature(
    challenge: string,
    signature: string,
    publicKeyPem: string,
  ): boolean {
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(challenge);
      verifier.end();

      const isValid = verifier.verify(
        publicKeyPem,
        signature,
        'base64',
      );

      return isValid;
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate JWT tokens for technician user
   */
  private async generateTokens(
    user: any,
    authMethod: string = 'local',
    deviceId?: string,
  ): Promise<AuthResponseDto> {
    const roles = user.roles.map((ur: any) => ur.role.name);

    // Generate access token payload
    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      countryCode: user.countryCode,
      businessUnit: user.businessUnit,
      providerId: user.providerId,
      workTeamId: user.workTeamId,
      roles,
      authMethod,
      ...(deviceId && { deviceId }),
    };

    const accessToken = this.jwtService.sign(accessTokenPayload);

    // Generate refresh token
    const refreshTokenId = nanoid();
    const refreshTokenPayload = {
      userId: user.id,
      tokenId: refreshTokenId,
      userType: user.userType,
    };

    const refreshTokenExpiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: refreshTokenExpiration,
    });

    // Store refresh token in database
    const expiresInDays = parseInt(refreshTokenExpiration.replace('d', ''), 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      countryCode: user.countryCode,
      businessUnit: user.businessUnit,
      userType: user.userType,
      roles,
      providerId: user.providerId,
      workTeamId: user.workTeamId,
      mfaEnabled: user.mfaEnabled,
    };

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour in seconds
      user: userDto,
    };
  }
}
