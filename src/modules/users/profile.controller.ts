import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, AvatarResponseDto, UserResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

/**
 * DTO for avatar upload (base64 encoded image for now).
 * In production, use multipart/form-data with file upload to GCS.
 */
class UploadAvatarDto {
  avatarUrl: string;
  thumbnailUrl?: string;
}

/**
 * Controller for current user profile operations.
 * All endpoints operate on the authenticated user's own data.
 */
@ApiTags('profile')
@Controller('users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Gets the current user's full profile.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  /**
   * Updates the current user's profile.
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  async updateProfile(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  /**
   * Uploads/updates the current user's avatar.
   * For now accepts URL/base64. In production, integrate with GCS file upload.
   */
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload/update profile avatar' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatarUrl'],
      properties: {
        avatarUrl: {
          type: 'string',
          description: 'Avatar URL or base64 encoded image',
        },
        thumbnailUrl: {
          type: 'string',
          description: 'Optional thumbnail URL',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar uploaded successfully',
    type: AvatarResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid avatar data',
  })
  async uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UploadAvatarDto,
  ): Promise<AvatarResponseDto> {
    if (!dto.avatarUrl) {
      throw new BadRequestException('avatarUrl is required');
    }

    // Update user record with avatar URLs
    const updatedUser = await this.usersService.uploadAvatar(
      user.userId,
      dto.avatarUrl,
      dto.thumbnailUrl,
    );

    return {
      avatarUrl: updatedUser.avatarUrl,
      avatarThumbnailUrl: updatedUser.avatarThumbnailUrl || updatedUser.avatarUrl,
    };
  }

  /**
   * Deletes the current user's avatar.
   */
  @Delete('avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete profile avatar' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Avatar deleted successfully',
  })
  async deleteAvatar(@CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.usersService.deleteAvatar(user.userId);
  }
}
