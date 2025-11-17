import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ProviderAuthController } from './controllers/provider-auth.controller';
import { TechnicianAuthController } from './controllers/technician-auth.controller';
import { ProviderAuthService } from './services/provider-auth.service';
import { TechnicianAuthService } from './services/technician-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserTypeGuard } from './guards/user-type.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, ProviderAuthController, TechnicianAuthController],
  providers: [
    AuthService,
    ProviderAuthService,
    TechnicianAuthService,
    JwtStrategy,
    LocalStrategy,
    UserTypeGuard,
  ],
  exports: [AuthService, ProviderAuthService, TechnicianAuthService, UserTypeGuard],
})
export class AuthModule {}
