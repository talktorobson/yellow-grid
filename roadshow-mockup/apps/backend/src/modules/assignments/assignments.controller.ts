import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  AssignmentsService,
  CreateAssignmentDto,
  AcceptAssignmentDto,
  RefuseAssignmentDto,
  NegotiateDateDto,
} from './assignments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CountryCode } from '../../common/types/schema.types';

@ApiTags('assignments')
@Controller('api/v1/assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ==================== CRUD OPERATIONS ====================

  @Get()
  @ApiOperation({ summary: 'Get all assignments with filters' })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'serviceOrderId', required: false })
  @ApiQuery({ name: 'expired', required: false, type: Boolean })
  async findAll(
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @Query('serviceOrderId') serviceOrderId?: string,
    @Query('expired') expired?: string,
  ) {
    return this.assignmentsService.findAll({
      status,
      providerId,
      serviceOrderId,
      expired: expired === 'true',
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get assignment statistics' })
  @ApiResponse({ status: 200, description: 'Assignment statistics' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  @ApiQuery({ name: 'providerId', required: false })
  async getStatistics(
    @Query('countryCode') countryCode?: CountryCode,
    @Query('providerId') providerId?: string,
  ) {
    return this.assignmentsService.getStatistics({ countryCode, providerId });
  }

  @Get('expired')
  @ApiOperation({ summary: 'Get expired assignment offers (past timeout)' })
  @ApiResponse({ status: 200, description: 'Expired assignments' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  async getExpiredOffers(@Query('countryCode') countryCode?: CountryCode) {
    return this.assignmentsService.getExpiredOffers(countryCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment by ID with full details' })
  @ApiResponse({ status: 200, description: 'Assignment details with funnel data' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create assignment (offer to provider)' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 404, description: 'Service order or provider not found' })
  @ApiResponse({ status: 400, description: 'Provider not active or suspended' })
  async create(@Body() data: CreateAssignmentDto) {
    return this.assignmentsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.assignmentsService.update(id, data);
  }

  // ==================== PROVIDER ACCEPTANCE FLOW ====================

  @Post(':id/accept')
  @ApiOperation({ summary: 'Provider accepts assignment' })
  @ApiResponse({ status: 200, description: 'Assignment accepted successfully' })
  @ApiResponse({ status: 400, description: 'Assignment must be PENDING or offer expired' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async accept(@Param('id') id: string, @Body() acceptance: AcceptAssignmentDto) {
    return this.assignmentsService.accept(id, acceptance);
  }

  @Post(':id/refuse')
  @ApiOperation({ summary: 'Provider refuses assignment' })
  @ApiResponse({ status: 200, description: 'Assignment refused successfully' })
  @ApiResponse({ status: 400, description: 'Assignment must be PENDING' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async refuse(@Param('id') id: string, @Body() refusal: RefuseAssignmentDto) {
    return this.assignmentsService.refuse(id, refusal);
  }

  // ==================== DATE NEGOTIATION ====================

  @Post(':id/negotiate-date')
  @ApiOperation({ summary: 'Negotiate date (max 3 rounds)' })
  @ApiResponse({ status: 200, description: 'Date negotiation recorded' })
  @ApiResponse({ status: 400, description: 'Max rounds exceeded or assignment not PENDING' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async negotiateDate(@Param('id') id: string, @Body() negotiation: NegotiateDateDto) {
    return this.assignmentsService.negotiateDate(id, negotiation);
  }

  @Post(':id/accept-counter-proposal')
  @ApiOperation({ summary: 'Customer accepts provider counter-proposal' })
  @ApiResponse({ status: 200, description: 'Counter-proposal accepted' })
  @ApiResponse({ status: 400, description: 'No negotiation in progress' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async acceptCounterProposal(@Param('id') id: string) {
    return this.assignmentsService.acceptCounterProposal(id);
  }

  @Post(':id/refuse-counter-proposal')
  @ApiOperation({ summary: 'Customer refuses provider counter-proposal' })
  @ApiResponse({ status: 200, description: 'Counter-proposal refused' })
  @ApiResponse({ status: 400, description: 'No negotiation in progress' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async refuseCounterProposal(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.assignmentsService.refuseCounterProposal(id, body.reason);
  }

  // ==================== TIMEOUT & EXPIRATION ====================

  @Post(':id/mark-timeout')
  @ApiOperation({ summary: 'Mark expired offer as timeout' })
  @ApiResponse({ status: 200, description: 'Assignment marked as timeout' })
  @ApiResponse({ status: 400, description: 'Assignment must be PENDING' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async markAsTimeout(@Param('id') id: string) {
    return this.assignmentsService.markAsTimeout(id);
  }
}
