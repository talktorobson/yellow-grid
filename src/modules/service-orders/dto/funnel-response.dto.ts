import { ApiProperty } from '@nestjs/swagger';

export class FunnelStepDto {
  @ApiProperty({ example: 'eligibility.specialties', description: 'Funnel step name' })
  step: string;

  @ApiProperty({ example: 'wt_123', description: 'Work team ID' })
  workTeamId: string;

  @ApiProperty({ example: 'p_456', description: 'Provider ID' })
  providerId: string;

  @ApiProperty({ example: true, description: 'Whether provider passed this step' })
  passed: boolean;

  @ApiProperty({ type: [String], example: ['eligible'], description: 'Reasons for pass/fail' })
  reasons: string[];
}

export class AssignmentFunnelResponseDto {
  @ApiProperty({ example: 'funnel_exec_123', description: 'Funnel execution ID' })
  id: string;

  @ApiProperty({ example: 'so_789', description: 'Service order ID' })
  serviceOrderId: string;

  @ApiProperty({ example: '2025-01-20T10:00:00Z', description: 'Requested date for assignment' })
  requestedDate: Date;

  @ApiProperty({ example: 'AM', description: 'Requested time slot', required: false })
  requestedSlot: string | null;

  @ApiProperty({ example: 25, description: 'Total providers evaluated in funnel' })
  totalProvidersEvaluated: number;

  @ApiProperty({ example: 10, description: 'Number of eligible providers' })
  eligibleProviders: number;

  @ApiProperty({ type: [FunnelStepDto], description: 'Detailed funnel step audit trail' })
  funnelSteps: FunnelStepDto[];

  @ApiProperty({ example: 156, description: 'Execution time in milliseconds' })
  executionTimeMs: number;

  @ApiProperty({ example: '2025-01-18T14:30:00Z', description: 'When funnel was executed' })
  executedAt: Date;

  @ApiProperty({ example: 'operator@example.com', description: 'Who executed the funnel' })
  executedBy: string;
}
