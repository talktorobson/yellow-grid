import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateServiceOrderDto } from './create-service-order.dto';

export class UpdateServiceOrderDto extends PartialType(
  OmitType(CreateServiceOrderDto, ['countryCode', 'businessUnit', 'serviceId'] as const),
) {}
