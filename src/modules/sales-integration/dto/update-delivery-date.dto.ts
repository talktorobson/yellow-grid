import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemDeliveryDateDto {
    @ApiProperty({ description: 'Line Item ID' })
    @IsString()
    lineItemId: string;

    @ApiProperty({ description: 'Item max delivery date' })
    @IsString()
    itemMaxDeliveryDate: string;
}

export class UpdateDeliveryDateDto {
    @ApiProperty({ description: 'Event Type', example: 'UpdateDeliveryDate' })
    @IsString()
    eventType: string;

    @ApiProperty({ description: 'Business Unit Identifier' })
    @IsString()
    businessUnitIdentifier: string;

    @ApiPropertyOptional({ description: 'Store Identifier' })
    @IsString()
    @IsOptional()
    storeIdentifier?: string;

    @ApiProperty({ description: 'Customer Order Number' })
    @IsString()
    customerOrderNumber: string;

    @ApiProperty({ description: 'Max Delivery Date' })
    @IsString()
    maxDeliveryDate: string;

    @ApiPropertyOptional({ description: 'Delivery Status' })
    @IsString()
    @IsOptional()
    deliveryStatus?: string | null;

    @ApiProperty({ description: 'Sales System' })
    @IsString()
    saleSystem: string;

    @ApiPropertyOptional({ type: [ItemDeliveryDateDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemDeliveryDateDto)
    @IsOptional()
    itemDeliveryDates?: ItemDeliveryDateDto[];
}
