import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

/**
 * DTO for updating an existing service in the catalog
 * All fields are optional (partial update)
 * Cannot update externalServiceCode or externalSource
 */
export class UpdateServiceDto extends PartialType(
  OmitType(CreateServiceDto, ['externalServiceCode', 'externalSource'] as const),
) {}
