import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsPhoneNumber } from 'class-validator';

/**
 * DTO for updating current user's own profile
 * More permissive than UpdateUserDto (admin-only fields excluded)
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+33612345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Preferred language code',
    example: 'fr',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  preferredLanguage?: string;
}

/**
 * Response DTO for avatar upload
 */
export class AvatarResponseDto {
  @ApiProperty({ description: 'Avatar URL', example: 'https://storage.googleapis.com/...' })
  avatarUrl: string;

  @ApiProperty({
    description: 'Avatar thumbnail URL',
    example: 'https://storage.googleapis.com/...',
  })
  avatarThumbnailUrl: string;
}
