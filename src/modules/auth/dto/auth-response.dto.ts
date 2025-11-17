import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'User ID', example: 'user_123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'Country code', example: 'ES' })
  countryCode: string;

  @ApiProperty({ description: 'Business unit', example: 'LM_ES' })
  businessUnit: string;

  @ApiProperty({ description: 'User type', example: 'INTERNAL', enum: ['INTERNAL', 'EXTERNAL_PROVIDER', 'EXTERNAL_TECHNICIAN'] })
  userType: string;

  @ApiProperty({ description: 'Assigned roles', example: ['OPERATOR'] })
  roles: string[];

  @ApiProperty({ description: 'Provider ID (for external users)', required: false })
  providerId?: string;

  @ApiProperty({ description: 'Work team ID (for technicians)', required: false })
  workTeamId?: string;

  @ApiProperty({ description: 'MFA enabled', required: false })
  mfaEnabled?: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User information',
    type: UserDto,
  })
  user: UserDto;
}

export class MfaRequiredDto {
  @ApiProperty({ description: 'MFA is required', example: true })
  mfaRequired: boolean;

  @ApiProperty({ description: 'Available MFA methods', example: ['sms', 'totp'] })
  mfaMethods: string[];

  @ApiProperty({ description: 'Message', example: 'MFA verification required' })
  message: string;
}
