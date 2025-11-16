import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  ServiceOrdersService,
  CreateServiceOrderDto,
  UpdateServiceOrderDto,
  AssessSalesPotentialDto,
  AssessRiskDto,
  AcknowledgeRiskDto,
  UpdateGoExecDto,
  OverrideGoExecDto,
} from './service-orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CountryCode, SalesPotential, RiskLevel } from '../../common/types/schema.types';

@ApiTags('service-orders')
@Controller('api/v1/service-orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  // ==================== CRUD OPERATIONS ====================

  @Get()
  @ApiOperation({ summary: 'Get all service orders with filters' })
  @ApiResponse({ status: 200, description: 'List of service orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'salesPotential', required: false, enum: SalesPotential })
  @ApiQuery({ name: 'riskLevel', required: false, enum: RiskLevel })
  @ApiQuery({ name: 'goExecStatus', required: false })
  @ApiQuery({ name: 'wcfStatus', required: false })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('countryCode') countryCode?: CountryCode,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('salesPotential') salesPotential?: SalesPotential,
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('goExecStatus') goExecStatus?: string,
    @Query('wcfStatus') wcfStatus?: string,
  ) {
    return this.serviceOrdersService.findAll(pagination, {
      countryCode,
      projectId,
      status,
      priority,
      salesPotential,
      riskLevel,
      goExecStatus,
      wcfStatus,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get service order statistics' })
  @ApiResponse({ status: 200, description: 'Service order statistics' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  async getStatistics(@Query('countryCode') countryCode?: CountryCode) {
    return this.serviceOrdersService.getStatistics(countryCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service order by ID' })
  @ApiResponse({ status: 200, description: 'Service order details' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async findOne(@Param('id') id: string) {
    return this.serviceOrdersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new service order' })
  @ApiResponse({ status: 201, description: 'Service order created' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(@Body() data: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service order' })
  @ApiResponse({ status: 200, description: 'Service order updated' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async update(@Param('id') id: string, @Body() data: UpdateServiceOrderDto) {
    return this.serviceOrdersService.update(id, data);
  }

  // ==================== SALES POTENTIAL ASSESSMENT ====================

  @Post(':id/assess-sales-potential')
  @ApiOperation({ summary: 'Assess TV sales potential (AI-powered)' })
  @ApiResponse({ status: 200, description: 'Sales potential assessed successfully' })
  @ApiResponse({ status: 400, description: 'Not a Technical Visit' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async assessSalesPotential(
    @Param('id') id: string,
    @Body() assessment: AssessSalesPotentialDto,
  ) {
    return this.serviceOrdersService.assessSalesPotential(id, assessment);
  }

  @Get('sales-potential/:potential')
  @ApiOperation({ summary: 'Get service orders by sales potential' })
  @ApiResponse({ status: 200, description: 'Service orders with specified potential' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  async getBySalesPotential(
    @Param('potential') potential: SalesPotential,
    @Query('countryCode') countryCode?: CountryCode,
  ) {
    return this.serviceOrdersService.getBySalesPotential(potential, countryCode);
  }

  // ==================== RISK ASSESSMENT ====================

  @Post(':id/assess-risk')
  @ApiOperation({ summary: 'Assess service order risk (AI-powered)' })
  @ApiResponse({ status: 200, description: 'Risk assessed successfully' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async assessRisk(@Param('id') id: string, @Body() assessment: AssessRiskDto) {
    return this.serviceOrdersService.assessRisk(id, assessment);
  }

  @Post(':id/acknowledge-risk')
  @ApiOperation({ summary: 'Acknowledge risk assessment' })
  @ApiResponse({ status: 200, description: 'Risk acknowledged successfully' })
  @ApiResponse({ status: 400, description: 'No risk assessment to acknowledge' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async acknowledgeRisk(
    @Param('id') id: string,
    @Body() acknowledgement: AcknowledgeRiskDto,
  ) {
    return this.serviceOrdersService.acknowledgeRisk(id, acknowledgement);
  }

  @Get('risk/high-risk-orders')
  @ApiOperation({ summary: 'Get high-risk service orders (HIGH + CRITICAL)' })
  @ApiResponse({ status: 200, description: 'High-risk service orders' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  async getHighRiskOrders(@Query('countryCode') countryCode?: CountryCode) {
    return this.serviceOrdersService.getHighRiskOrders(countryCode);
  }

  // ==================== GO EXECUTION MONITORING ====================

  @Post(':id/go-exec-status')
  @ApiOperation({ summary: 'Update Go Execution status (payment + delivery)' })
  @ApiResponse({ status: 200, description: 'Go Exec status updated successfully' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async updateGoExecStatus(@Param('id') id: string, @Body() update: UpdateGoExecDto) {
    return this.serviceOrdersService.updateGoExecStatus(id, update);
  }

  @Post(':id/go-exec-override')
  @ApiOperation({ summary: 'Override Go Exec block (operator derogation)' })
  @ApiResponse({ status: 200, description: 'Go Exec override successful' })
  @ApiResponse({ status: 400, description: 'Can only override NOK status' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async overrideGoExec(@Param('id') id: string, @Body() override: OverrideGoExecDto) {
    return this.serviceOrdersService.overrideGoExec(id, override);
  }

  @Get('go-exec/issues')
  @ApiOperation({ summary: 'Get service orders with Go Exec issues (NOK, not overridden)' })
  @ApiResponse({ status: 200, description: 'Service orders with Go Exec issues' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  async getGoExecIssues(@Query('countryCode') countryCode?: CountryCode) {
    return this.serviceOrdersService.getGoExecIssues(countryCode);
  }
}
