import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class CalculatePriceDto {
  @IsString()
  serviceId: string;

  @IsString()
  countryCode: string;

  @IsString()
  businessUnit: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsBoolean()
  @IsOptional()
  isOvertime?: boolean;

  @IsBoolean()
  @IsOptional()
  isWeekend?: boolean;

  @IsBoolean()
  @IsOptional()
  isHoliday?: boolean;

  @IsBoolean()
  @IsOptional()
  isUrgent?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;
}
