import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';

/**
 * DTO for changing user password
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 8 chars, 1 uppercase, 1 number)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must contain at least 1 uppercase letter and 1 number',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match newPassword)',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

/**
 * Response DTO for change password success
 */
export class ChangePasswordResponseDto {
  @ApiProperty({ description: 'Success message', example: 'Password changed successfully' })
  message: string;

  @ApiProperty({ description: 'Whether user needs to re-login', example: true })
  requiresRelogin: boolean;
}
