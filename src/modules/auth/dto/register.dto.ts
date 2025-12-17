import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsIn } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'operator@store.test',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'User password (min 8 chars, must include uppercase, lowercase, number, special char)',
    example: 'StrongP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'FR',
    enum: ['FR', 'ES', 'IT', 'PL'],
  })
  @IsString()
  @IsIn(['FR', 'ES', 'IT', 'PL'])
  countryCode: string;

  @ApiProperty({
    description: 'Business unit',
    example: 'DIY_STORE',
    enum: ['DIY_STORE', 'PRO_STORE'],
  })
  @IsString()
  @IsIn(['DIY_STORE', 'PRO_STORE'])
  businessUnit: string;
}
