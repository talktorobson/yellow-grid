import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType, ServicePriority } from '@prisma/client';

class CustomerInfoDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john.doe@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+33612345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: {
      street: '123 Rue de la Paix',
      city: 'Paris',
      postalCode: '75001',
      country: 'FR',
    },
  })
  @IsObject()
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

class ServiceAddressDto {
  @ApiProperty({ example: '456 Avenue des Champs-Élysées' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '75008' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 48.8698, required: false })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiProperty({ example: 2.3078, required: false })
  @IsNumber()
  @IsOptional()
  lng?: number;
}

export class CreateServiceOrderDto {
  @ApiProperty({
    description: 'Project ID if this service order belongs to a project',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Service catalog ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'FR',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: 'Business unit code',
    example: 'LEROY_MERLIN',
  })
  @IsString()
  @IsNotEmpty()
  businessUnit: string;

  @ApiProperty({
    description: 'Customer information',
    type: CustomerInfoDto,
  })
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  @IsNotEmpty()
  customerInfo: CustomerInfoDto;

  @ApiProperty({
    description: 'Service type',
    enum: ServiceType,
    example: 'INSTALLATION',
  })
  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  @ApiProperty({
    description: 'Service priority',
    enum: ServicePriority,
    example: 'P2',
  })
  @IsEnum(ServicePriority)
  @IsNotEmpty()
  priority: ServicePriority;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 120,
  })
  @IsNumber()
  @Min(15)
  estimatedDurationMinutes: number;

  @ApiProperty({
    description: 'Service execution address',
    type: ServiceAddressDto,
  })
  @ValidateNested()
  @Type(() => ServiceAddressDto)
  @IsNotEmpty()
  serviceAddress: ServiceAddressDto;

  @ApiProperty({
    description: 'Requested start date (earliest acceptable date)',
    example: '2025-11-20T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  requestedStartDate: string;

  @ApiProperty({
    description: 'Requested end date (latest acceptable date)',
    example: '2025-11-27T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  requestedEndDate: string;

  @ApiProperty({
    description: 'Requested time slot (AM, PM, or specific time)',
    example: 'AM',
    required: false,
  })
  @IsString()
  @IsOptional()
  requestedTimeSlot?: string;

  @ApiProperty({
    description: 'External service order ID from sales system',
    example: 'PYXIS-FR-12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  externalServiceOrderId?: string;

  @ApiProperty({
    description: 'External sales order ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  externalSalesOrderId?: string;

  @ApiProperty({
    description: 'External project ID from sales system',
    required: false,
  })
  @IsString()
  @IsOptional()
  externalProjectId?: string;

  @ApiProperty({
    description: 'External lead/opportunity ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  externalLeadId?: string;

  @ApiProperty({
    description: 'Source system (PYXIS, TEMPO, SAP)',
    example: 'PYXIS',
    required: false,
  })
  @IsString()
  @IsOptional()
  externalSystemSource?: string;

  @ApiProperty({
    description: 'Salesman notes (for TV/Quotation NLP analysis)',
    required: false,
  })
  @IsString()
  @IsOptional()
  salesmanNotes?: string;

  @ApiProperty({
    description: 'Pre-estimation ID from sales system',
    required: false,
  })
  @IsString()
  @IsOptional()
  salesPreEstimationId?: string;

  @ApiProperty({
    description: 'Pre-estimation value',
    example: 1500.00,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  salesPreEstimationValue?: number;
}
