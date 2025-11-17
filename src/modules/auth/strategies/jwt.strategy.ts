import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: string;
  countryCode: string;
  businessUnit: string;
  providerId?: string;
  workTeamId?: string;
  roles: string[];
  authMethod?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Verify user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        countryCode: true,
        businessUnit: true,
        providerId: true,
        workTeamId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Return user data that will be attached to request.user
    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      countryCode: user.countryCode,
      businessUnit: user.businessUnit,
      providerId: user.providerId,
      workTeamId: user.workTeamId,
      roles: payload.roles,
      authMethod: payload.authMethod,
    };
  }
}
