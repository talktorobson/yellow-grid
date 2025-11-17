import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateTechnicianDto {
  @ApiProperty({
    description: 'Technician first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  firstName: string;

  @ApiProperty({
    description: 'Technician last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lastName: string;

  @ApiProperty({
    description: 'Technician email',
    example: 'john.doe@acme-services.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Technician phone',
    example: '+33 6 12 34 56 78',
  })
  @IsString()
  phone: string;
}
