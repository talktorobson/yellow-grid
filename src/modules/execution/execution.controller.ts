import { Body, Controller, Post, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExecutionService } from './execution.service';
import { SyncService } from './services/sync.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { StatusUpdateDto } from './dto/status-update.dto';
import { OfflineSyncDto } from './dto/offline-sync.dto';
import { MediaUploadRequestDto } from './dto/media-upload.dto';
import {
  DeltaSyncRequestDto,
  DeltaSyncResponseDto,
  SyncStatusResponseDto,
  InitializeSyncRequestDto,
  InitializeSyncResponseDto,
} from './dto/delta-sync.dto';
import { MediaUploadService } from './media-upload.service';

@ApiTags('Execution')
@ApiBearerAuth()
@Controller('execution')
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly mediaUploadService: MediaUploadService,
    private readonly syncService: SyncService,
  ) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Technician check-in with GPS/geofence validation' })
  @ApiResponse({ status: 201, description: 'Check-in recorded' })
  async checkIn(@Body() dto: CheckInDto) {
    return this.executionService.checkIn(dto);
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Technician check-out with duration calculation' })
  @ApiResponse({ status: 201, description: 'Check-out recorded' })
  async checkOut(@Body() dto: CheckOutDto) {
    return this.executionService.checkOut(dto);
  }

  @Post('status')
  @ApiOperation({ summary: 'Update service execution status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(@Body() dto: StatusUpdateDto) {
    return this.executionService.updateStatus(dto);
  }

  @Post('offline-sync')
  @ApiOperation({ summary: 'Offline batch sync (check-ins/outs/media/notes)' })
  @ApiResponse({ status: 200, description: 'Batch processed' })
  async offlineSync(@Body() dto: OfflineSyncDto) {
    return this.executionService.offlineSync(dto.ops);
  }

  @Post('media/upload')
  @ApiOperation({ summary: 'Request media upload (returns stubbed presigned URLs)' })
  @ApiResponse({
    status: 201,
    description: 'Upload URLs generated',
    schema: {
      properties: {
        uploadUrl: { type: 'string' },
        mediaUrl: { type: 'string' },
        thumbnailUrl: { type: 'string' },
        key: { type: 'string' },
      },
    },
  })
  async mediaUpload(@Body() dto: MediaUploadRequestDto) {
    return this.mediaUploadService.createUpload(dto);
  }

  // ============================================================================
  // OFFLINE SYNC ENDPOINTS (Phase 3) - Production-ready delta sync
  // ============================================================================

  @Post('sync/initialize')
  @ApiOperation({
    summary: 'Initialize offline sync - prepare data package for offline operation',
    description:
      'Creates initial sync token and prepares offline data package. Call this when app first launches or after extended offline period.',
  })
  @ApiResponse({ status: 200, description: 'Sync initialized', type: InitializeSyncResponseDto })
  async initializeSync(@Body() dto: InitializeSyncRequestDto, @Req() req: any) {
    // In production, extract userId from JWT token via auth guard
    const userId = req.user?.id || dto.userId;
    return this.syncService.initializeSync({ ...dto, userId });
  }

  @Post('sync/delta')
  @ApiOperation({
    summary: 'Delta sync - synchronize changes between client and server',
    description:
      'Applies client changes, detects conflicts, resolves per strategy, and returns server changes since last sync. Core offline sync endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Sync completed', type: DeltaSyncResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid sync token or request data' })
  @ApiResponse({ status: 409, description: 'Conflicts detected (included in response)' })
  async deltaSync(@Body() dto: DeltaSyncRequestDto, @Req() req: any) {
    // In production, extract userId from JWT token via auth guard
    const userId = req.user?.id || 'user_101'; // Fallback for development
    return this.syncService.processDeltaSync(userId, dto);
  }

  @Get('sync/status')
  @ApiOperation({
    summary: 'Get sync status - check pending uploads, conflicts, and sync health',
    description:
      'Returns current sync state for device including pending operations and health metrics.',
  })
  @ApiResponse({ status: 200, description: 'Sync status retrieved', type: SyncStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Device sync not found' })
  async getSyncStatus(@Query('device_id') deviceId: string, @Req() req: any) {
    // In production, extract userId from JWT token via auth guard
    const userId = req.user?.id || 'user_101'; // Fallback for development
    return this.syncService.getSyncStatus(deviceId, userId);
  }
}
