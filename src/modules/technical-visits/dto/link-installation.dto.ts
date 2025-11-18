import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkInstallationDto {
  @ApiProperty({
    description: 'Installation Service Order ID to link to this TV',
    example: 'so_install_456',
  })
  @IsString()
  installationServiceOrderId: string;
}
