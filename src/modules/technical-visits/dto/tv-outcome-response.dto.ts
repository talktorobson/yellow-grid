import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TvOutcome } from '@prisma/client';

export class TvOutcomeResponseDto {
  @ApiProperty({ example: 'tvo_abc123' })
  id: string;

  @ApiProperty({ example: 'so_tv_123' })
  tvServiceOrderId: string;

  @ApiPropertyOptional({ example: 'so_install_456' })
  linkedInstallationOrderId?: string;

  @ApiProperty({ enum: TvOutcome, example: TvOutcome.YES })
  outcome: TvOutcome;

  @ApiPropertyOptional({
    description: 'Modifications required',
    example: [
      {
        description: 'Additional electrical work required',
        extraDurationMin: 60,
        reason: 'Outlet not compliant with safety standards',
      },
    ],
  })
  modifications?: Array<{
    description: string;
    extraDurationMin?: number;
    reason?: string;
  }>;

  @ApiPropertyOptional({ example: 'Site requires additional preparation' })
  technicianNotes?: string;

  @ApiProperty({ example: false })
  scopeChangeRequested: boolean;

  @ApiPropertyOptional()
  scopeChangeRequestedAt?: Date;

  @ApiPropertyOptional({ example: true })
  scopeChangeApproved?: boolean;

  @ApiPropertyOptional()
  scopeChangeApprovedAt?: Date;

  @ApiPropertyOptional({ example: 'user@example.com' })
  scopeChangeApprovedBy?: string;

  @ApiProperty({ example: false })
  installationBlocked: boolean;

  @ApiPropertyOptional()
  installationUnblockedAt?: Date;

  @ApiProperty()
  recordedAt: Date;

  @ApiProperty({ example: 'tech@provider.com' })
  recordedBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
