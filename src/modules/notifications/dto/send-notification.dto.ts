import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsEmail,
  IsPhoneNumber,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class SendNotificationDto {
  @ApiProperty({
    description: 'Template code to use for the notification',
    example: 'ORDER_ASSIGNED',
  })
  @IsString()
  templateCode: string;

  @ApiPropertyOptional({
    description: 'User ID of the recipient',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'Email address of the recipient',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the recipient (E.164 format)',
    example: '+33612345678',
  })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({
    description: 'Name of the recipient',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiProperty({
    description: 'Notification channel',
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL,
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    description: 'Event type that triggered the notification',
    example: 'order.assigned',
  })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({
    description: 'Language code for the notification',
    example: 'es',
    default: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Template variables to be used in rendering',
    example: {
      orderNumber: 'ORD-12345',
      providerName: 'ABC Services',
      scheduledDate: '2025-01-20',
    },
  })
  @IsObject()
  variables: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Context type (e.g., service_order, contract)',
    example: 'service_order',
  })
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiPropertyOptional({
    description: 'Context ID (e.g., service order ID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiPropertyOptional({
    description: 'Country code',
    example: 'ES',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Business unit code',
    example: 'LM_ES',
  })
  @IsOptional()
  @IsString()
  businessUnit?: string;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
