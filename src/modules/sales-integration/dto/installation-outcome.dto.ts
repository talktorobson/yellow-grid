import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InstallationOutcome {
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum InstallationStatus {
  INSTALLED = 'INSTALLED',
  PARTIALLY_INSTALLED = 'PARTIALLY_INSTALLED',
  NOT_INSTALLED = 'NOT_INSTALLED',
}

export enum TestResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CompletionDetailsDto {
  @ApiProperty({ description: 'Completed at timestamp (ISO 8601)' })
  completedAt: string;

  @ApiProperty({ description: 'Technician ID' })
  technicianId: string;

  @ApiProperty({ description: 'Technician name' })
  technicianName: string;

  @ApiProperty({ description: 'Actual duration in minutes' })
  actualDuration: number;
}

export class InstalledItemDto {
  @ApiProperty({ description: 'Item ID' })
  itemId: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Quantity' })
  quantity: number;

  @ApiProperty({ description: 'Serial numbers', type: [String] })
  serialNumbers: string[];

  @ApiProperty({ description: 'Installation status', enum: InstallationStatus })
  installationStatus: InstallationStatus;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;
}

export class TestResultDto {
  @ApiProperty({ description: 'Test type' })
  testType: string;

  @ApiProperty({ description: 'Result', enum: TestResult })
  result: TestResult;

  @ApiPropertyOptional({ description: 'Details' })
  details?: string;
}

export class CustomerSatisfactionDto {
  @ApiProperty({ description: 'Rating (1-5)' })
  rating: number;

  @ApiPropertyOptional({ description: 'Customer feedback' })
  feedback?: string;

  @ApiPropertyOptional({ description: 'Signature URL' })
  signatureUrl?: string;
}

export class PhotoDto {
  @ApiProperty({ description: 'Photo ID' })
  photoId: string;

  @ApiProperty({ description: 'Photo URL' })
  url: string;

  @ApiPropertyOptional({ description: 'Caption' })
  caption?: string;

  @ApiProperty({ description: 'Taken at timestamp (ISO 8601)' })
  takenAt: string;
}

export class IssueDto {
  @ApiProperty({ description: 'Issue type' })
  issueType: string;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Severity', enum: IssueSeverity })
  severity: IssueSeverity;

  @ApiProperty({ description: 'Resolved status' })
  resolved: boolean;
}

export class InstallationOutcomeDto {
  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Correlation ID' })
  correlationId: string;

  @ApiProperty({ description: 'Timestamp (ISO 8601)' })
  timestamp: string;

  @ApiProperty({ description: 'FSM order ID' })
  orderId: string;

  @ApiProperty({ description: 'External order ID from sales system' })
  externalOrderId: string;

  @ApiProperty({ description: 'Appointment ID' })
  appointmentId: string;

  @ApiProperty({ description: 'Outcome', enum: InstallationOutcome })
  outcome: InstallationOutcome;

  @ApiProperty({ description: 'Completion details', type: CompletionDetailsDto })
  completionDetails: CompletionDetailsDto;

  @ApiProperty({ description: 'Installed items', type: [InstalledItemDto] })
  installedItems: InstalledItemDto[];

  @ApiPropertyOptional({ description: 'Test results', type: [TestResultDto] })
  testResults?: TestResultDto[];

  @ApiPropertyOptional({ description: 'Customer satisfaction', type: CustomerSatisfactionDto })
  customerSatisfaction?: CustomerSatisfactionDto;

  @ApiPropertyOptional({ description: 'Photos', type: [PhotoDto] })
  photos?: PhotoDto[];

  @ApiPropertyOptional({ description: 'Issues', type: [IssueDto] })
  issues?: IssueDto[];

  @ApiProperty({ description: 'Follow-up required' })
  followUpRequired: boolean;

  @ApiPropertyOptional({ description: 'Follow-up reason' })
  followUpReason?: string;
}
