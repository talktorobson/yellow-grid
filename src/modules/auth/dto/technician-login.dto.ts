import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TechnicianLoginDto {
  @ApiProperty({
    description: 'Technician email address',
    example: 'tech@provider.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecureP@ss123',
  })
  @IsString()
  password: string;
}
