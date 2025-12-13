import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { UpdateNotificationPreferencesDto } from '../dto/update-preferences.dto';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';

@ApiTags('Notifications')
@Controller('notifications')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification sent successfully',
    schema: {
      properties: {
        notificationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        message: { type: 'string', example: 'Notification sent successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    const notificationId = await this.notificationsService.sendNotification(dto);

    return {
      notificationId,
      message: 'Notification sent successfully',
    };
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@Query('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@Body('userId') userId: string) {
    const result = await this.notificationsService.markAllAsRead(userId);
    return { count: result.count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  async deleteNotification(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(@Param('id') id: string) {
    return this.notificationsService.getNotification(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.getNotifications(userId, query);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed notification' })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification retry initiated',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @HttpCode(HttpStatus.OK)
  async retryNotification(@Param('id') id: string) {
    const newNotificationId = await this.notificationsService.retryNotification(id);

    return {
      originalNotificationId: id,
      newNotificationId,
      message: 'Notification retry initiated',
    };
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get notification preferences for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  async getPreferences(@Param('userId') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @Put('preferences/:userId')
  @ApiOperation({ summary: 'Update notification preferences for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences({
      userId,
      ...dto,
    });
  }

  @Post('preferences/:userId/opt-out/:channel')
  @ApiOperation({ summary: 'Opt out of a notification channel' })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'channel',
    description: 'Notification channel',
    enum: ['EMAIL', 'SMS', 'PUSH'],
  })
  @ApiResponse({
    status: 200,
    description: 'Opted out successfully',
  })
  @HttpCode(HttpStatus.OK)
  async optOut(
    @Param('userId') userId: string,
    @Param('channel') channel: 'EMAIL' | 'SMS' | 'PUSH',
  ) {
    await this.preferencesService.optOut(userId, channel);

    return {
      message: `Successfully opted out of ${channel} notifications`,
    };
  }

  @Post('preferences/:userId/opt-in/:channel')
  @ApiOperation({ summary: 'Opt in to a notification channel' })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'channel',
    description: 'Notification channel',
    enum: ['EMAIL', 'SMS', 'PUSH'],
  })
  @ApiResponse({
    status: 200,
    description: 'Opted in successfully',
  })
  @HttpCode(HttpStatus.OK)
  async optIn(
    @Param('userId') userId: string,
    @Param('channel') channel: 'EMAIL' | 'SMS' | 'PUSH',
  ) {
    await this.preferencesService.optIn(userId, channel);

    return {
      message: `Successfully opted in to ${channel} notifications`,
    };
  }
}
