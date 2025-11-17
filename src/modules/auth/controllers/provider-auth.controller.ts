import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProviderAuthService } from '../services/provider-auth.service';
import { ProviderRegisterDto, ProviderLoginDto, AuthResponseDto, MfaRequiredDto } from '../dto';

@ApiTags('Authentication - Provider')
@Controller('auth/provider')
export class ProviderAuthController {
  constructor(private readonly providerAuthService: ProviderAuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new provider user',
    description: 'Creates a new external provider user account and links to an existing provider company',
  })
  @ApiBody({ type: ProviderRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Provider user successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or provider not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user with this email already exists',
  })
  async register(@Body() dto: ProviderRegisterDto): Promise<AuthResponseDto> {
    return this.providerAuthService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Provider user login',
    description: 'Authenticate provider user with email and password. MFA code required if enabled.',
  })
  @ApiBody({ type: ProviderLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'MFA verification required',
    type: MfaRequiredDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials or inactive account',
  })
  async login(@Body() dto: ProviderLoginDto): Promise<AuthResponseDto | MfaRequiredDto> {
    return this.providerAuthService.login(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify provider email address',
    description: 'Verifies provider email using verification token sent during registration',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(@Body() body: { token: string }): Promise<{ message: string }> {
    // TODO: Implement email verification
    throw new BadRequestException('Email verification not implemented yet');
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends password reset email to provider user',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
  })
  async forgotPassword(@Body() body: { email: string }): Promise<{ message: string }> {
    // TODO: Implement forgot password
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets provider password using reset token',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
  ): Promise<{ message: string }> {
    // TODO: Implement password reset
    throw new BadRequestException('Password reset not implemented yet');
  }

  @Post('mfa-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Setup MFA for provider user',
    description: 'Generates TOTP secret and QR code for MFA setup',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA setup initiated',
  })
  async setupMfa(@Body() body: { userId: string }): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    // TODO: Implement MFA setup
    throw new BadRequestException('MFA setup not implemented yet');
  }

  @Post('mfa-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify MFA code',
    description: 'Verifies TOTP code to complete MFA setup or login',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA code verified',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid MFA code',
  })
  async verifyMfa(@Body() body: { userId: string; code: string }): Promise<{ verified: boolean }> {
    // TODO: Implement MFA verification
    throw new BadRequestException('MFA verification not implemented yet');
  }
}
