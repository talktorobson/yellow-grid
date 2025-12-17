import { IsString, IsBoolean, IsOptional, IsIn, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignmentConfigDto {
  @ApiProperty({ description: 'Assignment mode', example: 'DIRECT' })
  @IsString()
  @IsIn(['DIRECT', 'OFFER', 'BROADCAST'])
  mode: string;

  @ApiProperty({ description: 'Offer timeout in hours', example: 24 })
  @IsInt()
  @Min(1)
  offerTimeoutHours: number;

  @ApiProperty({ description: 'Max candidates for broadcast', example: 5 })
  @IsInt()
  @Min(1)
  maxBroadcastCandidates: number;
}

export class ProjectOwnershipConfigDto {
  @ApiProperty({ description: 'Assignment mode for project ownership', example: 'AUTO' })
  @IsString()
  @IsIn(['AUTO', 'MANUAL'])
  mode: string;

  @ApiProperty({ description: 'Consider workload in auto-assignment', example: true })
  @IsBoolean()
  considerWorkload: boolean;

  @ApiProperty({ description: 'Consider skills in auto-assignment', example: true })
  @IsBoolean()
  considerSkills: boolean;
}

export class UpdateBusinessUnitConfigDto {
  @ApiPropertyOptional({ description: 'Business unit code', example: 'DIY_STORE' })
  @IsOptional()
  @IsString()
  @IsIn(['DIY_STORE', 'PRO_STORE'])
  businessUnit?: string;

  @ApiPropertyOptional({ description: 'Business unit display name', example: 'DIY Store' })
  @IsOptional()
  @IsString()
  businessUnitName?: string;

  @ApiPropertyOptional({ description: 'Assignment configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentConfigDto)
  assignmentConfig?: AssignmentConfigDto;

  @ApiPropertyOptional({ description: 'Project ownership configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectOwnershipConfigDto)
  projectOwnershipConfig?: ProjectOwnershipConfigDto;

  @ApiPropertyOptional({ description: 'Enable customer portal', example: true })
  @IsOptional()
  @IsBoolean()
  enableCustomerPortal?: boolean;

  @ApiPropertyOptional({ description: 'Enable provider portal', example: true })
  @IsOptional()
  @IsBoolean()
  enableProviderPortal?: boolean;

  @ApiPropertyOptional({ description: 'Business unit specific settings' })
  @IsOptional()
  buSpecificSettings?: Record<string, any>;
}
