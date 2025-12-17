import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'operator@store.test',
  })
  email: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Country code',
    example: 'FR',
  })
  countryCode: string;

  @ApiProperty({
    description: 'Business unit',
    example: 'DIY_STORE',
  })
  businessUnit: string;

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Email verified status',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'User roles',
    example: ['OPERATOR', 'ADMIN'],
  })
  roles: string[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-16T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-16T12:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2025-01-16T12:00:00Z',
    nullable: true,
  })
  lastLoginAt: Date | null;
}
