import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BiometricLoginDto {
  @ApiProperty({
    description: 'Device identifier',
    example: 'device_abc123xyz789',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Signed challenge with device private key (base64 encoded)',
    example: 'SGVsbG8gV29ybGQh...base64signature',
  })
  @IsString()
  signature: string;

  @ApiProperty({
    description: 'Original challenge that was signed (base64 encoded)',
    example: 'Y2hhbGxlbmdlXzEyMzQ1Njc4OTA=',
  })
  @IsString()
  challenge: string;
}
