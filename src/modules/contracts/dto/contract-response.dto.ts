import { ApiProperty } from '@nestjs/swagger';
import {
  ContractStatus,
  NotificationChannel,
  NotificationStatus,
  SignatureMethod,
  SignatureStatus,
} from '@prisma/client';

class ContractSignatureResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SignatureMethod })
  signatureMethod!: SignatureMethod;

  @ApiProperty({ enum: SignatureStatus })
  status!: SignatureStatus;

  @ApiProperty()
  signerName!: string;

  @ApiProperty({ required: false })
  signerEmail?: string | null;

  @ApiProperty({ required: false })
  signerPhone?: string | null;

  @ApiProperty({ required: false })
  signedAt?: Date | null;
}

class ContractNotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty()
  destination!: string;

  @ApiProperty({ required: false })
  sentAt?: Date | null;
}

export class ContractResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contractNumber!: string;

  @ApiProperty({ enum: ContractStatus })
  status!: ContractStatus;

  @ApiProperty()
  serviceOrderId!: string;

  @ApiProperty({ required: false })
  templateId?: string | null;

  @ApiProperty({ required: false })
  customerEmail?: string | null;

  @ApiProperty({ required: false })
  customerPhone?: string | null;

  @ApiProperty({ required: false })
  sentAt?: Date | null;

  @ApiProperty({ required: false })
  signedAt?: Date | null;

  @ApiProperty({ required: false })
  expiresAt?: Date | null;

  @ApiProperty({ description: 'Resolved template payload used for auditing' })
  payload!: Record<string, unknown>;

  @ApiProperty({ description: 'Rendered HTML/Markdown body', required: false })
  documentBody?: string | null;

  @ApiProperty({ type: () => [ContractSignatureResponseDto] })
  signatures!: ContractSignatureResponseDto[];

  @ApiProperty({ type: () => [ContractNotificationResponseDto] })
  notifications!: ContractNotificationResponseDto[];
}

export class ContractListResponseDto {
  @ApiProperty({ type: () => [ContractResponseDto] })
  data!: ContractResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
