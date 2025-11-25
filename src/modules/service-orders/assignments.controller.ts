import { Body, Controller, Get, Param, Post, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { AssignmentMode, AssignmentState } from '@prisma/client';
import { AssignmentFunnelResponseDto } from './dto/funnel-response.dto';

class CreateAssignmentDto {
  serviceOrderId: string;
  providerIds: string[];
  workTeamId?: string;
  requestedDate?: Date;
  requestedSlot?: string;
}

class AssignmentResponseDto {
  assignmentIds: string[];
}

class BulkAssignmentDto {
  serviceOrderIds: string[];
  providerId: string;
  mode?: AssignmentMode;
}

@ApiTags('Assignments')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List assignments with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: AssignmentState,
    @Query('mode') mode?: AssignmentMode,
  ) {
    return this.assignmentsService.findAll({ page, limit, status, mode });
  }

  @Post('direct')
  @ApiOperation({ summary: 'Direct assignment to specific provider' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async direct(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.DIRECT,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post('offer')
  @ApiOperation({ summary: 'Offer assignment to specific provider (await acceptance)' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async offer(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.OFFER,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast assignment to multiple providers (first-come-first-served)' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async broadcast(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.BROADCAST,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post('auto-accept')
  @ApiOperation({ summary: 'Auto-accept assignment (ES/IT default, or explicit auto)' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async autoAccept(@Body() dto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignments = await this.assignmentsService.createAssignments({
      ...dto,
      mode: AssignmentMode.AUTO_ACCEPT,
    });
    return { assignmentIds: assignments.map((a) => a.id) };
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Provider accepts assignment' })
  async accept(@Param('id') id: string) {
    return this.assignmentsService.acceptAssignment(id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Provider declines assignment' })
  async decline(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.assignmentsService.declineAssignment(id, reason);
  }

  @Get(':id/funnel')
  @ApiOperation({ summary: 'Get assignment funnel transparency data' })
  @ApiResponse({
    status: 200,
    type: AssignmentFunnelResponseDto,
    description: 'Returns detailed funnel execution data showing how providers were filtered and scored'
  })
  @ApiResponse({ status: 404, description: 'Assignment or funnel data not found' })
  async getFunnel(@Param('id') id: string): Promise<AssignmentFunnelResponseDto> {
    const result = await this.assignmentsService.getAssignmentFunnel(id);
    return result as unknown as AssignmentFunnelResponseDto;
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk assign multiple service orders to a provider' })
  @ApiResponse({ status: 201, description: 'Bulk assignment processed' })
  async bulkAssign(@Body() dto: BulkAssignmentDto) {
    return this.assignmentsService.bulkCreateAssignments({
      serviceOrderIds: dto.serviceOrderIds,
      providerId: dto.providerId,
      mode: dto.mode || AssignmentMode.DIRECT,
    });
  }
}
