import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderIntakeStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  SCHEDULED = 'SCHEDULED',
  FAILED = 'FAILED',
}

export class AppointmentInfoDto {
  @ApiProperty({ description: 'Appointment ID' })
  appointmentId: string;

  @ApiProperty({ description: 'Scheduled start time (ISO 8601)' })
  scheduledStart: string;

  @ApiProperty({ description: 'Scheduled end time (ISO 8601)' })
  scheduledEnd: string;

  @ApiProperty({ description: 'Technician ID' })
  technicianId: string;

  @ApiProperty({ description: 'Technician name' })
  technicianName: string;
}

export class ValidationErrorDto {
  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Field that caused the error' })
  field?: string;
}

export class OrderIntakeResponseDto {
  @ApiProperty({ description: 'FSM order ID' })
  orderId: string;

  @ApiProperty({ description: 'External order ID from sales system' })
  externalOrderId: string;

  @ApiProperty({ description: 'Order intake status', enum: OrderIntakeStatus })
  status: OrderIntakeStatus;

  @ApiProperty({ description: 'Correlation ID for tracking' })
  correlationId: string;

  @ApiProperty({ description: 'Timestamp when received (ISO 8601)' })
  receivedAt: string;

  @ApiPropertyOptional({ description: 'Appointment details if scheduled', type: AppointmentInfoDto })
  appointment?: AppointmentInfoDto;

  @ApiPropertyOptional({ description: 'Validation errors if any', type: [ValidationErrorDto] })
  errors?: ValidationErrorDto[];
}
