import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user with default OPERATOR role
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        countryCode: dto.countryCode,
        businessUnit: dto.businessUnit,
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: 'OPERATOR' },
                create: {
                  name: 'OPERATOR',
                  description: 'Default operator role',
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
      },
    });

    this.logger.log(`User registered: ${user.email} (${user.id})`);

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
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

    this.logger.log(`User logged in: ${user.email} (${user.id})`);

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    // Verify refresh token
    let payload: { userId: string; tokenId: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
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

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    this.logger.log(`Token refreshed for user: ${storedToken.user.email}`);

    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Verify and revoke refresh token
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      await this.prisma.refreshToken.updateMany({
        where: {
          id: payload.tokenId,
          userId,
        },
        data: {
          isRevoked: true,
        },
      });

      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      // Token invalid or already expired - that's fine for logout
      this.logger.warn(`Logout with invalid token for user: ${userId}`);
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    if (!user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  private async generateTokens(user: any): Promise<AuthResponseDto> {
    const roles = user.roles.map((ur: any) => ur.role.name);

    // Generate access token
    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType || 'INTERNAL', // Default to INTERNAL for existing users
      countryCode: user.countryCode,
      businessUnit: user.businessUnit,
      providerId: user.providerId,
      workTeamId: user.workTeamId,
      roles,
      authMethod: user.authProvider || 'local',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload);

    // Generate refresh token
    const refreshTokenId = nanoid();
    const refreshTokenPayload = {
      userId: user.id,
      tokenId: refreshTokenId,
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

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour in seconds
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        countryCode: user.countryCode,
        businessUnit: user.businessUnit,
        userType: user.userType || 'INTERNAL',
        roles,
        providerId: user.providerId,
        workTeamId: user.workTeamId,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }
}
