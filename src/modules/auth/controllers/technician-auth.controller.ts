import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { TechnicianAuthService } from '../services/technician-auth.service';
import {
  TechnicianRegisterDto,
  TechnicianLoginDto,
  BiometricSetupDto,
  BiometricLoginDto,
  AuthResponseDto,
} from '../dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserTypeGuard } from '../guards/user-type.guard';
import { UserType } from '../decorators/user-type.decorator';

@ApiTags('Authentication - Technician')
@Controller('auth/technician')
export class TechnicianAuthController {
  constructor(private readonly technicianAuthService: TechnicianAuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new technician user',
    description:
      'Creates a new external technician user account and links to an existing work team',
  })
  @ApiBody({ type: TechnicianRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Technician successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or work team not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user with this email already exists',
  })
  async register(@Body() dto: TechnicianRegisterDto): Promise<AuthResponseDto> {
    return this.technicianAuthService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Technician user login',
    description: 'Authenticate technician user with email and password (traditional login)',
  })
  @ApiBody({ type: TechnicianLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials or inactive account',
  })
  async login(@Body() dto: TechnicianLoginDto): Promise<AuthResponseDto> {
    return this.technicianAuthService.login(dto);
  }

  @Post('biometric-setup')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @UserType('EXTERNAL_TECHNICIAN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Setup biometric authentication',
    description: 'Register a device for biometric authentication by storing its public key',
  })
  @ApiBody({ type: BiometricSetupDto })
  @ApiResponse({
    status: 200,
    description: 'Biometric authentication setup successfully',
    schema: {
      properties: {
        deviceId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - max devices limit reached or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - device already registered',
  })
  async setupBiometric(
    @Request() req: any,
    @Body() dto: BiometricSetupDto,
  ): Promise<{ deviceId: string; message: string }> {
    return this.technicianAuthService.setupBiometric(req.user.userId, dto);
  }

  @Post('biometric-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with biometric authentication',
    description: 'Authenticate using biometric signature verification (challenge-response)',
  })
  @ApiBody({ type: BiometricLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Biometric login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid signature or device not found',
  })
  async biometricLogin(@Body() dto: BiometricLoginDto): Promise<AuthResponseDto> {
    return this.technicianAuthService.biometricLogin(dto);
  }

  @Post('offline-token')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @UserType('EXTERNAL_TECHNICIAN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate offline token',
    description: 'Generate a 7-day offline token for field work without internet connectivity',
  })
  @ApiBody({
    schema: {
      properties: {
        deviceId: { type: 'string', description: 'Device identifier' },
      },
      required: ['deviceId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Offline token generated',
    schema: {
      properties: {
        offlineToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - device not found or not authorized',
  })
  async generateOfflineToken(
    @Request() req: any,
    @Body('deviceId') deviceId: string,
  ): Promise<{ offlineToken: string; expiresAt: Date }> {
    return this.technicianAuthService.generateOfflineToken(req.user.userId, deviceId);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @UserType('EXTERNAL_TECHNICIAN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get registered devices',
    description: 'List all devices registered for biometric authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'List of registered devices',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string' },
          deviceId: { type: 'string' },
          platform: { type: 'string', enum: ['ios', 'android'] },
          deviceName: { type: 'string' },
          deviceModel: { type: 'string' },
          isActive: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getDevices(@Request() req: any): Promise<any[]> {
    return this.technicianAuthService.getDevices(req.user.userId);
  }

  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @UserType('EXTERNAL_TECHNICIAN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke device',
    description: 'Deactivate a registered device (prevents biometric login)',
  })
  @ApiResponse({
    status: 200,
    description: 'Device revoked successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - device not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async revokeDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
  ): Promise<{ message: string }> {
    return this.technicianAuthService.revokeDevice(req.user.userId, deviceId);
  }
}
