import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  ExecutionsService,
  CreateExecutionDto,
  CheckInDto,
  CheckOutDto,
  UpdateChecklistDto,
  CompleteChecklistItemDto,
  RecordCompletionDto,
  UploadPhotoDto,
  UploadAudioNoteDto,
  CustomerFeedbackDto,
} from './executions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExecutionStatus } from '../../common/types/schema.types';

@ApiTags('executions')
@Controller('api/v1/executions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  // ==================== CRUD OPERATIONS ====================

  @Get()
  @ApiOperation({ summary: 'Get all executions with filters' })
  @ApiResponse({ status: 200, description: 'List of executions' })
  @ApiQuery({ name: 'status', required: false, enum: ExecutionStatus })
  @ApiQuery({ name: 'serviceOrderId', required: false })
  @ApiQuery({ name: 'workTeamId', required: false })
  @ApiQuery({ name: 'blocked', required: false, type: Boolean })
  async findAll(
    @Query('status') status?: ExecutionStatus,
    @Query('serviceOrderId') serviceOrderId?: string,
    @Query('workTeamId') workTeamId?: string,
    @Query('blocked') blocked?: string,
  ) {
    return this.executionsService.findAll({
      status,
      serviceOrderId,
      workTeamId,
      blocked: blocked === 'true',
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get execution statistics' })
  @ApiResponse({ status: 200, description: 'Execution statistics' })
  @ApiQuery({ name: 'workTeamId', required: false })
  async getStatistics(@Query('workTeamId') workTeamId?: string) {
    return this.executionsService.getStatistics({ workTeamId });
  }

  @Get('blocked')
  @ApiOperation({ summary: 'Get all blocked executions' })
  @ApiResponse({ status: 200, description: 'Blocked executions (canCheckIn = false)' })
  async getBlocked() {
    return this.executionsService.findAll({ blocked: true });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution by ID with full details' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async findOne(@Param('id') id: string) {
    return this.executionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create execution' })
  @ApiResponse({ status: 201, description: 'Execution created' })
  @ApiResponse({ status: 404, description: 'Service order or work team not found' })
  @ApiResponse({ status: 400, description: 'Execution already exists' })
  async create(@Body() data: CreateExecutionDto) {
    return this.executionsService.create(data);
  }

  // ==================== CHECK-IN / CHECK-OUT ====================

  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check-in to execution (start work)' })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Already checked in or execution blocked' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async checkIn(@Param('id') id: string, @Body() checkInData: CheckInDto) {
    return this.executionsService.checkIn(id, checkInData);
  }

  @Post(':id/check-out')
  @ApiOperation({ summary: 'Check-out from execution (end work)' })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({ status: 400, description: 'Not checked in or already checked out' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async checkOut(@Param('id') id: string, @Body() checkOutData: CheckOutDto) {
    return this.executionsService.checkOut(id, checkOutData);
  }

  // ==================== CHECKLIST MANAGEMENT ====================

  @Put(':id/checklist')
  @ApiOperation({ summary: 'Update checklist items' })
  @ApiResponse({ status: 200, description: 'Checklist updated successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async updateChecklist(@Param('id') id: string, @Body() checklistData: UpdateChecklistDto) {
    return this.executionsService.updateChecklist(id, checklistData);
  }

  @Post(':id/checklist/complete')
  @ApiOperation({ summary: 'Complete a checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item completed' })
  @ApiResponse({ status: 404, description: 'Execution or checklist item not found' })
  @ApiResponse({ status: 400, description: 'No checklist items' })
  async completeChecklistItem(
    @Param('id') id: string,
    @Body() itemData: CompleteChecklistItemDto,
  ) {
    return this.executionsService.completeChecklistItem(id, itemData);
  }

  // ==================== COMPLETION STATUS ====================

  @Post(':id/completion')
  @ApiOperation({ summary: 'Record completion status (FULL/PARTIAL/FAILED)' })
  @ApiResponse({ status: 200, description: 'Completion status recorded' })
  @ApiResponse({ status: 400, description: 'Must check-out first' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async recordCompletion(@Param('id') id: string, @Body() completionData: RecordCompletionDto) {
    return this.executionsService.recordCompletion(id, completionData);
  }

  // ==================== MEDIA MANAGEMENT ====================

  @Post(':id/photos')
  @ApiOperation({ summary: 'Upload photo (before/after)' })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async uploadPhoto(@Param('id') id: string, @Body() photoData: UploadPhotoDto) {
    return this.executionsService.uploadPhoto(id, photoData);
  }

  @Post(':id/audio')
  @ApiOperation({ summary: 'Upload audio note' })
  @ApiResponse({ status: 200, description: 'Audio note uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async uploadAudioNote(@Param('id') id: string, @Body() audioData: UploadAudioNoteDto) {
    return this.executionsService.uploadAudioNote(id, audioData);
  }

  // ==================== CUSTOMER FEEDBACK ====================

  @Post(':id/customer-feedback')
  @ApiOperation({ summary: 'Submit customer feedback (rating + signature)' })
  @ApiResponse({ status: 200, description: 'Customer feedback submitted successfully' })
  @ApiResponse({ status: 400, description: 'Execution must be completed or invalid rating' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async submitCustomerFeedback(
    @Param('id') id: string,
    @Body() feedbackData: CustomerFeedbackDto,
  ) {
    return this.executionsService.submitCustomerFeedback(id, feedbackData);
  }

  // ==================== BLOCKING LOGIC ====================

  @Post(':id/block')
  @ApiOperation({ summary: 'Block execution (called when Go Exec becomes NOK)' })
  @ApiResponse({ status: 200, description: 'Execution blocked successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async blockExecution(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.executionsService.blockExecution(id, body.reason);
  }

  @Post(':id/unblock')
  @ApiOperation({ summary: 'Unblock execution (called when Go Exec override)' })
  @ApiResponse({ status: 200, description: 'Execution unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async unblockExecution(@Param('id') id: string) {
    return this.executionsService.unblockExecution(id);
  }
}
