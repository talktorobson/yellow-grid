import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  ProviderRegisterDto,
  ProviderLoginDto,
  AuthResponseDto,
  MfaRequiredDto,
  UserDto,
} from '../dto';

@Injectable()
export class ProviderAuthService {
  private readonly logger = new Logger(ProviderAuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new provider user
   */
  async register(dto: ProviderRegisterDto): Promise<AuthResponseDto> {
    // Validate provider exists and is active
    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
    });

    if (!provider) {
      throw new BadRequestException('Provider not found');
    }

    if (provider.status !== 'ACTIVE') {
      throw new BadRequestException('Provider is not active');
    }

    // Verify country code and business unit match provider
    if (provider.countryCode !== dto.countryCode || provider.businessUnit !== dto.businessUnit) {
      throw new BadRequestException('Country code or business unit does not match provider');
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

    // Create provider user with PROVIDER_MANAGER role
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        countryCode: dto.countryCode,
        businessUnit: dto.businessUnit,
        userType: 'EXTERNAL_PROVIDER',
        authProvider: 'local',
        providerId: dto.providerId,
        isVerified: false, // Email verification required
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: 'PROVIDER_MANAGER' },
                create: {
                  name: 'PROVIDER_MANAGER',
                  description: 'Provider company manager',
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
        provider: true,
      },
    });

    this.logger.log(
      `Provider user registered: ${user.email} (${user.id}) for provider ${provider.name}`,
    );

    // TODO: Send email verification
    // await this.sendVerificationEmail(user.email);

    return this.generateTokens(user);
  }

  /**
   * Login provider user
   */
  async login(dto: ProviderLoginDto): Promise<AuthResponseDto | MfaRequiredDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        provider: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify user is external provider type
    if (user.userType !== 'EXTERNAL_PROVIDER') {
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

    // Check MFA requirement
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        // Return MFA required response
        return {
          mfaRequired: true,
          mfaMethods: ['totp'], // TODO: Support SMS
          message: 'MFA verification required',
        };
      }

      // Verify MFA code
      const isMfaValid = await this.verifyMfaCode(user, dto.mfaCode);
      if (!isMfaValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    this.logger.log(`Provider user logged in: ${user.email} (${user.id})`);

    return this.generateTokens(user);
  }

  /**
   * Generate JWT tokens for provider user
   */
  private async generateTokens(user: any): Promise<AuthResponseDto> {
    const roles = user.roles.map((ur: any) => ur.role.name);

    // Generate access token payload
    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      countryCode: user.countryCode,
      businessUnit: user.businessUnit,
      providerId: user.providerId,
      roles,
      authMethod: 'local',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload);

    // Generate refresh token
    const refreshTokenId = nanoid();
    const refreshTokenPayload = {
      userId: user.id,
      tokenId: refreshTokenId,
      userType: user.userType,
    };

    const refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');

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

  /**
   * Verify MFA TOTP code
   */
  private async verifyMfaCode(user: any, code: string): Promise<boolean> {
    // TODO: Implement TOTP verification
    // Use library like 'speakeasy' or 'otplib'
    // const isValid = authenticator.verify({
    //   token: code,
    //   secret: user.mfaSecret,
    // });

    this.logger.warn('MFA verification not implemented yet');
    return false;
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(email: string): Promise<void> {
    // TODO: Implement email verification
    this.logger.log(`Verification email should be sent to: ${email}`);
  }
}
