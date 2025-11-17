import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExecutionService } from './execution.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { StatusUpdateDto } from './dto/status-update.dto';
import { OfflineSyncDto } from './dto/offline-sync.dto';
import { MediaUploadRequestDto } from './dto/media-upload.dto';
import { MediaUploadService } from './media-upload.service';

@ApiTags('Execution')
@Controller('execution')
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly mediaUploadService: MediaUploadService,
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
}
