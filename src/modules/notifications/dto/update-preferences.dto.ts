import { IsBoolean, IsOptional, IsObject, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable/disable email notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable SMS notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Event-specific notification preferences',
    example: {
      'order.assigned': { email: true, sms: true, push: false },
      'order.completed': { email: true, sms: false, push: true },
    },
  })
  @IsOptional()
  @IsObject()
  eventPreferences?: Record<
    string,
    {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    }
  >;

  @ApiPropertyOptional({
    description: 'Enable/disable quiet hours',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Quiet hours start time (HH:MM format)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursStart must be in HH:MM format',
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (HH:MM format)',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursEnd must be in HH:MM format',
  })
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'Timezone for quiet hours',
    example: 'Europe/Paris',
  })
  @IsOptional()
  @IsString()
  quietHoursTimezone?: string;
}
