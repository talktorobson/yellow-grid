import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesSystem, ConfidenceLevel } from './order-intake-request.dto';

export class PreEstimationCreatedEventDto {
  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Event timestamp (milliseconds since epoch)' })
  eventTimestamp: number;

  @ApiProperty({ description: 'Pre-estimation ID' })
  preEstimationId: string;

  @ApiProperty({ description: 'Sales system source', enum: SalesSystem })
  salesSystemSource: SalesSystem;

  @ApiProperty({ description: 'Customer ID in sales system' })
  customerId: string;

  @ApiProperty({ description: 'Estimated value' })
  estimatedValue: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Product categories', type: [String] })
  productCategories: string[];

  @ApiPropertyOptional({ description: 'Salesman ID' })
  salesmanId?: string;

  @ApiPropertyOptional({ description: 'Salesman notes' })
  salesmanNotes?: string;

  @ApiProperty({ description: 'Confidence level', enum: ConfidenceLevel })
  confidenceLevel: ConfidenceLevel;

  @ApiProperty({ description: 'Created at timestamp (milliseconds since epoch)' })
  createdAt: number;

  @ApiPropertyOptional({ description: 'Valid until timestamp (milliseconds since epoch)' })
  validUntil?: number;
}
