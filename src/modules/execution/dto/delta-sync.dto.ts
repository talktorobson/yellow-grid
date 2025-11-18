import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsInt,
  IsObject,
  ValidateNested,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  LAST_WRITE_WINS = 'last_write_wins',
  MERGE = 'merge',
}

export enum ChangeOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum EntityType {
  SERVICE_ORDER = 'service_order',
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  TIME_ENTRY = 'time_entry',
  TASK_UPDATE = 'task_update',
  MEDIA_UPLOAD = 'media_upload',
  NOTE = 'note',
}

// ============================================================================
// CLIENT CHANGE DEFINITIONS
// ============================================================================

export class ClientChangeDto {
  @ApiProperty({ description: 'Type of entity being changed', enum: EntityType })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: 'Entity ID (null for creates)', required: false })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiProperty({ description: 'Operation type', enum: ChangeOperation })
  @IsEnum(ChangeOperation)
  operation: ChangeOperation;

  @ApiProperty({ description: 'Client version for conflict detection', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  version?: number;

  @ApiProperty({ description: 'Change data payload' })
  @IsObject()
  data: Record<string, any>;

  @ApiProperty({ description: 'Client timestamp of change' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Offline ID for creates', required: false })
  @IsString()
  @IsOptional()
  offlineId?: string;
}

export class ServiceOrderChangesDto {
  @ApiProperty({ description: 'Service order changes', type: [ClientChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientChangeDto)
  serviceOrders: ClientChangeDto[];
}

export class TimeEntryChangesDto {
  @ApiProperty({ description: 'Time entry changes', type: [ClientChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientChangeDto)
  timeEntries: ClientChangeDto[];
}

export class MediaUploadReferenceDto {
  @ApiProperty({ description: 'Offline ID for media file' })
  @IsString()
  offlineId: string;

  @ApiProperty({ description: 'Reference entity type', enum: EntityType })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: 'Reference entity ID' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Media metadata' })
  @IsObject()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Upload timestamp' })
  @IsDateString()
  timestamp: string;
}

export class TaskUpdateChangesDto {
  @ApiProperty({ description: 'Task update changes', type: [ClientChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientChangeDto)
  taskUpdates: ClientChangeDto[];
}

// ============================================================================
// DELTA SYNC REQUEST
// ============================================================================

export class DeltaSyncRequestDto {
  @ApiProperty({ description: 'Current sync token from last sync' })
  @IsString()
  syncToken: string;

  @ApiProperty({ description: 'Device identifier' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Service order changes', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientChangeDto)
  @IsOptional()
  serviceOrders?: ClientChangeDto[];

  @ApiProperty({ description: 'Time entry changes (check-ins/outs)', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientChangeDto)
  @IsOptional()
  timeEntries?: ClientChangeDto[];

  @ApiProperty({ description: 'Media upload references', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaUploadReferenceDto)
  @IsOptional()
  mediaUploads?: MediaUploadReferenceDto[];

  @ApiProperty({ description: 'Task update changes', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientChangeDto)
  @IsOptional()
  taskUpdates?: ClientChangeDto[];

  @ApiProperty({
    description: 'Conflict resolution strategy',
    enum: ConflictResolutionStrategy,
    default: ConflictResolutionStrategy.SERVER_WINS,
  })
  @IsEnum(ConflictResolutionStrategy)
  @IsOptional()
  conflictResolutionStrategy?: ConflictResolutionStrategy = ConflictResolutionStrategy.SERVER_WINS;

  @ApiProperty({ description: 'Client timestamp', required: false })
  @IsDateString()
  @IsOptional()
  clientTimestamp?: string;
}

// ============================================================================
// CONFLICT DEFINITIONS
// ============================================================================

export class SyncConflictDto {
  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Conflicting field name' })
  field: string;

  @ApiProperty({ description: 'Client value' })
  clientValue: any;

  @ApiProperty({ description: 'Server value' })
  serverValue: any;

  @ApiProperty({ description: 'Server version' })
  serverVersion: number;

  @ApiProperty({ description: 'Client version' })
  clientVersion: number;

  @ApiProperty({ description: 'Applied resolution strategy' })
  resolution: ConflictResolutionStrategy;

  @ApiProperty({ description: 'Final resolved value' })
  resolvedValue: any;

  @ApiProperty({ description: 'Last modified by (user ID)' })
  lastModifiedBy: string;

  @ApiProperty({ description: 'Last modified timestamp' })
  lastModifiedAt: string;
}

// ============================================================================
// SERVER CHANGE DEFINITIONS
// ============================================================================

export class ServerChangeDto {
  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Operation type', enum: ChangeOperation })
  operation: ChangeOperation;

  @ApiProperty({ description: 'Complete entity data' })
  data: Record<string, any>;

  @ApiProperty({ description: 'Entity version' })
  version: number;

  @ApiProperty({ description: 'Last modified timestamp' })
  lastModifiedAt: string;
}

export class AppliedChangesDto {
  @ApiProperty({ description: 'Number of service orders updated' })
  serviceOrdersUpdated: number;

  @ApiProperty({ description: 'Number of time entries created' })
  timeEntriesCreated: number;

  @ApiProperty({ description: 'Number of media references pending upload' })
  mediaPendingUpload: number;

  @ApiProperty({ description: 'Number of tasks updated' })
  tasksUpdated: number;

  @ApiProperty({ description: 'Number of operations that failed' })
  operationsFailed: number;
}

export class PendingUploadDto {
  @ApiProperty({ description: 'Offline ID' })
  offlineId: string;

  @ApiProperty({ description: 'Upload URL endpoint' })
  uploadUrl: string;

  @ApiProperty({ description: 'Upload priority', enum: ['low', 'medium', 'high'] })
  priority: string;

  @ApiProperty({ description: 'File size estimate in bytes', required: false })
  estimatedSizeBytes?: number;
}

// ============================================================================
// DELTA SYNC RESPONSE
// ============================================================================

export class DeltaSyncResponseDto {
  @ApiProperty({ description: 'New sync token for next sync' })
  syncToken: string;

  @ApiProperty({ description: 'Server timestamp' })
  serverTime: string;

  @ApiProperty({ description: 'Detected conflicts', type: [SyncConflictDto] })
  conflicts: SyncConflictDto[];

  @ApiProperty({ description: 'Server changes to apply on client' })
  serverChanges: {
    serviceOrders: ServerChangeDto[];
    timeEntries: ServerChangeDto[];
    taskUpdates: ServerChangeDto[];
    attachments: ServerChangeDto[];
    referenceDataUpdates: any[];
  };

  @ApiProperty({ description: 'Summary of applied client changes' })
  appliedChanges: AppliedChangesDto;

  @ApiProperty({ description: 'Pending uploads requiring action', type: [PendingUploadDto] })
  pendingUploads: PendingUploadDto[];

  @ApiProperty({ description: 'Sync operation processing time (ms)' })
  processingTimeMs: number;
}

// ============================================================================
// SYNC STATUS
// ============================================================================

export class PendingItemDto {
  @ApiProperty({ description: 'Item type' })
  type: string;

  @ApiProperty({ description: 'Offline ID' })
  offlineId: string;

  @ApiProperty({ description: 'Size in bytes' })
  sizeBytes: number;

  @ApiProperty({ description: 'Priority', enum: ['low', 'medium', 'high'] })
  priority: string;
}

export class SyncHealthDto {
  @ApiProperty({ description: 'Overall sync health status' })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ description: 'Last successful sync timestamp' })
  lastSuccessfulSync: string;

  @ApiProperty({ description: 'Number of consecutive sync failures' })
  consecutiveFailures: number;

  @ApiProperty({ description: 'Available storage on device (bytes)' })
  storageAvailableBytes: number;
}

export class SyncStatusResponseDto {
  @ApiProperty({ description: 'Device ID' })
  deviceId: string;

  @ApiProperty({ description: 'Last sync timestamp' })
  lastSyncTime: string;

  @ApiProperty({ description: 'Current sync token' })
  syncToken: string;

  @ApiProperty({ description: 'Pending uploads summary' })
  pendingUploads: {
    count: number;
    totalSizeBytes: number;
    items: PendingItemDto[];
  };

  @ApiProperty({ description: 'Pending downloads summary' })
  pendingDownloads: {
    count: number;
    totalSizeBytes: number;
    items: PendingItemDto[];
  };

  @ApiProperty({ description: 'Conflicts requiring resolution' })
  conflicts: {
    count: number;
    requiresResolution: boolean;
  };

  @ApiProperty({ description: 'Sync health metrics' })
  syncHealth: SyncHealthDto;
}

// ============================================================================
// SYNC INITIALIZATION
// ============================================================================

export class InitializeSyncRequestDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Device ID' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Date range for offline data', required: false })
  @IsObject()
  @IsOptional()
  dateRange?: {
    start: string;
    end: string;
  };

  @ApiProperty({ description: 'Include attachments in offline package', default: true })
  @IsBoolean()
  @IsOptional()
  includeAttachments?: boolean = true;

  @ApiProperty({ description: 'Max attachment size in MB', default: 50 })
  @IsInt()
  @IsOptional()
  @Min(1)
  maxAttachmentSizeMb?: number = 50;

  @ApiProperty({ description: 'Enable compression', default: true })
  @IsBoolean()
  @IsOptional()
  compressionEnabled?: boolean = true;
}

export class SyncPackageContentsDto {
  @ApiProperty({ description: 'Number of jobs in package' })
  jobsCount: number;

  @ApiProperty({ description: 'Number of attachments' })
  attachmentsCount: number;

  @ApiProperty({ description: 'Number of materials' })
  materialsCount: number;

  @ApiProperty({ description: 'Reference data types included' })
  referenceData: string[];
}

export class InitializeSyncResponseDto {
  @ApiProperty({ description: 'Sync package ID' })
  syncPackageId: string;

  @ApiProperty({ description: 'Initial sync token' })
  syncToken: string;

  @ApiProperty({ description: 'Package size in bytes' })
  packageSizeBytes: number;

  @ApiProperty({ description: 'Estimated download time (seconds)' })
  estimatedDownloadTimeSeconds: number;

  @ApiProperty({ description: 'Package contents summary' })
  contents: SyncPackageContentsDto;

  @ApiProperty({ description: 'Download URL' })
  downloadUrl: string;

  @ApiProperty({ description: 'Package expiration timestamp' })
  expiresAt: string;

  @ApiProperty({ description: 'Package checksum for verification' })
  checksum: string;
}
