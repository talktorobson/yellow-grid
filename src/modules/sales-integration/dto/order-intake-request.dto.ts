import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VatDto {
  @ApiProperty({ description: 'VAT Rate' })
  @IsNumber()
  rate: number;

  @ApiProperty({ description: 'VAT Amount' })
  @IsNumber()
  amount: number;
}

export class OrderHeaderDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({ type: [VatDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VatDto)
  @IsOptional()
  vats?: VatDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shift?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mavNumber?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  orderUUID?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sellerNotes?: string;

  @ApiProperty()
  @IsString()
  creationDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessUnitId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deliveryStatus?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  maxDeliveryDate?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  preEstimationId?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  salesAdapterNotes?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  orderPaymentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  transactionLinkedTo?: any | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  preEstimationVersion?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  saleSystemOrderStatus?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  technicalVisitMandatory?: boolean | null;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  servcProviderAgreedPrice?: number | null;
}

export class AddressDto {
  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiPropertyOptional()
  @IsString()
  province: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty()
  @IsString()
  streetName: string;

  @ApiPropertyOptional()
  @IsString()
  streetNumber: string;

  @ApiPropertyOptional()
  @IsString()
  buildingComplement: string;
}

export class CustomerDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsString()
  number: string;

  @ApiPropertyOptional()
  @IsString()
  fiscalId: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  firstName: string;
}

export class ItemDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsString()
  vatCode: string;

  @ApiPropertyOptional()
  @IsNumber()
  vatRate: number;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiProperty()
  @IsString()
  itemNumber: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  expectedDate?: string;

  @ApiPropertyOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  providersPrice?: number | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  configurationIdentifier?: string | null;
}

export class CollaboratorDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  firstName: string;
}

export enum SalesSystem {
  PYXIS = 'Pyxis Order',
  TEMPO = 'TEMPO',
  SAP = 'SAP',
}

// Re-export deprecated enums mostly for avoiding massive breaks in other files before refactoring
// But ideally should be removed. Logic using them will need to change.
export enum OrderType {
  INSTALLATION = 'INSTALLATION',
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
  TV = 'TV',
  UPGRADE = 'UPGRADE',
  QUOTATION = 'QUOTATION',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class OrderIntakeRequestDto {
  @ApiProperty({ type: [ItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @ApiProperty({ type: OrderHeaderDto })
  @ValidateNested()
  @Type(() => OrderHeaderDto)
  order: OrderHeaderDto;

  @ApiProperty()
  @IsString()
  system: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty()
  @IsNumber()
  version: number;

  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiPropertyOptional({ type: CollaboratorDto })
  @ValidateNested()
  @Type(() => CollaboratorDto)
  @IsOptional()
  modifiedBy?: CollaboratorDto | null;

  @ApiPropertyOptional({ type: CollaboratorDto })
  @ValidateNested()
  @Type(() => CollaboratorDto)
  @IsOptional()
  generatedBy?: CollaboratorDto;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  configurationIds?: string[];
}
