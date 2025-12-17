import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Data transfer object for user login.
 */
export class LoginDto {
  /**
   * The user's email address.
   */
  @ApiProperty({
    description: 'User email address',
    example: 'operator@store.test',
  })
  @IsEmail()
  email: string;

  /**
   * The user's password.
   */
  @ApiProperty({
    description: 'User password',
    example: 'StrongP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
