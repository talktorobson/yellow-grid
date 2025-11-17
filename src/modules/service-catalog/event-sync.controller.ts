import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ServiceCatalogEventLogService } from './event-log.service';
import { ServiceCatalogEventProcessor } from './event-processor.service';
import { Roles } from '../users/decorators/roles.decorator';
import { RolesGuard } from '../users/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Event Sync Controller
 *
 * REST API endpoints for service catalog event synchronization.
 * Provides access to event processing, statistics, and failed event management.
 *
 * **Security**: All endpoints require ADMIN role
 */
@ApiTags('Service Catalog - Event Sync')
@Controller('api/v1/service-catalog/sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventSyncController {
  constructor(
    private readonly eventLogService: ServiceCatalogEventLogService,
    private readonly eventProcessor: ServiceCatalogEventProcessor,
  ) {}

  // ============================================================================
  // EVENT PROCESSING ENDPOINTS
  // ============================================================================

  /**
   * Process a single service catalog event
   * POST /api/v1/service-catalog/sync/events
   *
   * Accepts events from external systems (PYXIS, TEMPO) and processes them
   * with full idempotency and error handling.
   */
  @Post('events')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process service catalog event',
    description:
      'Process a single event from external systems with idempotency',
  })
  @ApiResponse({
    status: 200,
    description: 'Event processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid event format',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async processEvent(@Body() event: any) {
    return this.eventProcessor.processEvent(event);
  }

  /**
   * Process a batch of service catalog events
   * POST /api/v1/service-catalog/sync/events/batch
   *
   * Processes multiple events in parallel with aggregated results.
   */
  @Post('events/batch')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process batch of service catalog events',
    description: 'Process multiple events in parallel',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch processed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async processEventBatch(@Body() events: any[]) {
    return this.eventProcessor.processEventBatch(events);
  }

  // ============================================================================
  // EVENT LOG & STATISTICS ENDPOINTS
  // ============================================================================

  /**
   * Get event processing statistics
   * GET /api/v1/service-catalog/sync/statistics
   *
   * Returns real-time analytics: success rate, event counts by type/source.
   */
  @Get('statistics')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get event processing statistics',
    description: 'Real-time analytics dashboard data',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getStatistics(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : undefined;
    return this.eventLogService.getStatistics(sinceDate);
  }

  /**
   * Get failed events
   * GET /api/v1/service-catalog/sync/failed-events
   *
   * Retrieves events that failed processing (for manual intervention).
   */
  @Get('failed-events')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get failed events',
    description: 'Retrieve events that failed processing',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed events retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getFailedEvents(@Query('limit') limit?: number) {
    const maxLimit = limit ? parseInt(limit.toString(), 10) : 50;
    return this.eventLogService.getFailedEvents(maxLimit);
  }

  /**
   * Retry failed events
   * POST /api/v1/service-catalog/sync/retry-failed
   *
   * Attempts to reprocess failed events (max retries configurable).
   */
  @Post('retry-failed')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry failed events',
    description: 'Attempt to reprocess failed events',
  })
  @ApiResponse({
    status: 200,
    description: 'Retry completed',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async retryFailedEvents(@Query('maxRetries') maxRetries?: number) {
    const max = maxRetries ? parseInt(maxRetries.toString(), 10) : 10;
    const retriedCount = await this.eventProcessor.retryFailedEvents(max);
    return {
      retriedCount,
      message: `Successfully retried ${retriedCount} events`,
    };
  }

  // ============================================================================
  // HOUSEKEEPING ENDPOINTS
  // ============================================================================

  /**
   * Cleanup old completed events
   * POST /api/v1/service-catalog/sync/cleanup
   *
   * Deletes old completed event logs (configurable retention period).
   */
  @Post('cleanup')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cleanup old completed events',
    description: 'Delete completed event logs older than specified days',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async cleanupOldEvents(@Query('olderThanDays') olderThanDays?: number) {
    const days = olderThanDays ? parseInt(olderThanDays.toString(), 10) : 30;
    const deletedCount = await this.eventLogService.cleanupOldEvents(days);
    return {
      deletedCount,
      message: `Deleted ${deletedCount} old event logs (older than ${days} days)`,
    };
  }

  // ============================================================================
  // EVENT DETAILS ENDPOINT
  // ============================================================================

  /**
   * Get event by ID
   * GET /api/v1/service-catalog/sync/events/:eventId
   *
   * Retrieves detailed information about a specific event.
   */
  @Get('events/:eventId')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get event by ID',
    description: 'Retrieve event details and processing status',
  })
  @ApiResponse({
    status: 200,
    description: 'Event details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getEventById(@Query('eventId') eventId: string) {
    return this.eventLogService.findByEventId(eventId);
  }
}
