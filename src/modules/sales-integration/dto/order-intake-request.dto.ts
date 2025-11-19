import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsEmail,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SalesSystem {
  PYXIS = 'PYXIS',
  TEMPO = 'TEMPO',
  SAP = 'SAP',
}

export enum OrderType {
  INSTALLATION = 'INSTALLATION',
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
  UPGRADE = 'UPGRADE',
  TV = 'TV',
  QUOTATION = 'QUOTATION',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum ContactMethod {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE = 'PHONE',
}

export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class ExternalReferencesDto {
  @ApiProperty({ description: 'Sales order ID in source system' })
  @IsString()
  @IsNotEmpty()
  salesOrderId: string;

  @ApiPropertyOptional({ description: 'Project/customer order grouping ID' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Original lead/opportunity ID' })
  @IsString()
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Customer ID in sales system' })
  @IsString()
  @IsOptional()
  customerId?: string;
}

export class PreEstimationDto {
  @ApiProperty({ description: 'Estimation ID' })
  @IsString()
  @IsNotEmpty()
  estimationId: string;

  @ApiProperty({ description: 'Estimated value' })
  @IsNumber()
  estimatedValue: number;

  @ApiProperty({ description: 'Currency code (e.g., EUR, USD)' })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @ApiProperty({ description: 'Confidence level', enum: ConfidenceLevel })
  @IsEnum(ConfidenceLevel)
  confidenceLevel: ConfidenceLevel;

  @ApiProperty({ description: 'Product categories', type: [String] })
  @IsArray()
  @IsString({ each: true })
  productCategories: string[];

  @ApiPropertyOptional({ description: 'Salesman ID' })
  @IsString()
  @IsOptional()
  salesmanId?: string;

  @ApiPropertyOptional({ description: 'Salesman notes for NLP analysis' })
  @IsString()
  @IsOptional()
  salesmanNotes?: string;

  @ApiPropertyOptional({ description: 'Pre-estimation valid until (ISO 8601)' })
  @IsString()
  @IsOptional()
  validUntil?: string;
}

export class CustomerDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number (E.164 format)' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Preferred contact method', enum: ContactMethod })
  @IsEnum(ContactMethod)
  preferredContactMethod: ContactMethod;
}

export class ServiceAddressDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiPropertyOptional({ description: 'Additional address line' })
  @IsString()
  @IsOptional()
  street2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State/province' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  country: string;

  @ApiPropertyOptional({ description: 'Access notes for technician' })
  @IsString()
  @IsOptional()
  accessNotes?: string;

  @ApiPropertyOptional({ description: 'Parking instructions' })
  @IsString()
  @IsOptional()
  parkingInstructions?: string;
}

export class UnitPriceDto {
  @ApiProperty({ description: 'Amount' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ description: 'Currency code (e.g., EUR, USD)' })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;
}

export class ServiceItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit price', type: UnitPriceDto })
  @ValidateNested()
  @Type(() => UnitPriceDto)
  unitPrice: UnitPriceDto;

  @ApiPropertyOptional({ description: 'Serial numbers', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serialNumbers?: string[];

  @ApiProperty({ description: 'Requires installation' })
  requiresInstallation: boolean;
}

export class TotalAmountDto {
  @ApiProperty({ description: 'Subtotal' })
  @IsString()
  @IsNotEmpty()
  subtotal: string;

  @ApiProperty({ description: 'Tax amount' })
  @IsString()
  @IsNotEmpty()
  tax: string;

  @ApiProperty({ description: 'Total amount' })
  @IsString()
  @IsNotEmpty()
  total: string;

  @ApiProperty({ description: 'Currency code (e.g., EUR, USD)' })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;
}

export class TimeWindowDto {
  @ApiProperty({ description: 'Start time (HH:mm format)' })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  start: string;

  @ApiProperty({ description: 'End time (HH:mm format)' })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  end: string;
}

export class SchedulingPreferencesDto {
  @ApiPropertyOptional({ description: 'Preferred date (ISO 8601 date)' })
  @IsString()
  @IsOptional()
  preferredDate?: string;

  @ApiPropertyOptional({ description: 'Time window', type: TimeWindowDto })
  @ValidateNested()
  @Type(() => TimeWindowDto)
  @IsOptional()
  timeWindow?: TimeWindowDto;

  @ApiPropertyOptional({ description: 'Excluded dates (ISO 8601)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedDates?: string[];

  @ApiPropertyOptional({ description: 'Technician preference' })
  @IsString()
  @IsOptional()
  technicianPreference?: string;

  @ApiPropertyOptional({ description: 'Special notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class OrderIntakeRequestDto {
  @ApiProperty({ description: 'External order ID from sales system' })
  @IsString()
  @IsNotEmpty()
  externalOrderId: string;

  @ApiProperty({ description: 'Sales system', enum: SalesSystem })
  @IsEnum(SalesSystem)
  salesSystem: SalesSystem;

  @ApiProperty({ description: 'Order type', enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ description: 'Priority', enum: Priority })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ description: 'External references', type: ExternalReferencesDto })
  @ValidateNested()
  @Type(() => ExternalReferencesDto)
  externalReferences: ExternalReferencesDto;

  @ApiPropertyOptional({ description: 'Pre-estimation (for TV/Quotation)', type: PreEstimationDto })
  @ValidateNested()
  @Type(() => PreEstimationDto)
  @IsOptional()
  preEstimation?: PreEstimationDto;

  @ApiProperty({ description: 'Customer information', type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({ description: 'Service address', type: ServiceAddressDto })
  @ValidateNested()
  @Type(() => ServiceAddressDto)
  serviceAddress: ServiceAddressDto;

  @ApiProperty({ description: 'Service items', type: [ServiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  serviceItems: ServiceItemDto[];

  @ApiProperty({ description: 'Total amount', type: TotalAmountDto })
  @ValidateNested()
  @Type(() => TotalAmountDto)
  totalAmount: TotalAmountDto;

  @ApiPropertyOptional({ description: 'Scheduling preferences', type: SchedulingPreferencesDto })
  @ValidateNested()
  @Type(() => SchedulingPreferencesDto)
  @IsOptional()
  schedulingPreferences?: SchedulingPreferencesDto;

  @ApiPropertyOptional({ description: 'Required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsNumber()
  @IsOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;
}
