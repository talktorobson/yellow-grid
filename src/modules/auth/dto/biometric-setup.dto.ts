import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BiometricSetupDto {
  @ApiProperty({
    description: 'Unique device identifier (fingerprint)',
    example: 'device_abc123xyz789',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Device public key for biometric challenge-response authentication',
    example: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgk...\n-----END PUBLIC KEY-----',
  })
  @IsString()
  publicKey: string;

  @ApiProperty({
    description: 'Device platform',
    example: 'ios',
    enum: ['ios', 'android'],
  })
  @IsEnum(['ios', 'android'])
  platform: 'ios' | 'android';

  @ApiProperty({
    description: 'Device name (user-friendly)',
    example: 'iPhone 14 Pro',
  })
  @IsString()
  deviceName: string;

  @ApiProperty({
    description: 'Device model',
    example: 'iPhone15,2',
    required: false,
  })
  @IsString()
  deviceModel?: string;
}
