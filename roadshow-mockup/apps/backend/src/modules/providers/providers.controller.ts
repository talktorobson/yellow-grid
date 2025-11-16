import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  ProvidersService,
  CreateProviderDto,
  UpdateProviderDto,
  SuspendProviderDto,
  AddCertificationDto,
} from './providers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProviderRiskStatus, CountryCode } from '../../common/types/schema.types';

@ApiTags('providers')
@Controller('api/v1/providers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // ==================== CRUD OPERATIONS ====================

  @Get()
  @ApiOperation({ summary: 'Get all providers with filters' })
  @ApiResponse({ status: 200, description: 'List of providers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  @ApiQuery({ name: 'buCode', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'tier', required: false, type: Number })
  @ApiQuery({ name: 'riskStatus', required: false, enum: ProviderRiskStatus })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('countryCode') countryCode?: CountryCode,
    @Query('buCode') buCode?: string,
    @Query('active') active?: string,
    @Query('tier') tier?: string,
    @Query('riskStatus') riskStatus?: ProviderRiskStatus,
  ) {
    return this.providersService.findAll(pagination, {
      countryCode,
      buCode,
      active: active !== undefined ? active === 'true' : undefined,
      tier: tier ? parseInt(tier, 10) : undefined,
      riskStatus,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider details' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get provider statistics' })
  @ApiResponse({ status: 200, description: 'Provider statistics' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getStats(@Param('id') id: string) {
    return this.providersService.getProviderStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Provider created' })
  @ApiResponse({ status: 400, description: 'Invalid tier value' })
  async create(@Body() data: CreateProviderDto) {
    return this.providersService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update provider' })
  @ApiResponse({ status: 200, description: 'Provider updated' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 400, description: 'Invalid tier value' })
  async update(@Param('id') id: string, @Body() data: UpdateProviderDto) {
    return this.providersService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete provider (soft delete)' })
  @ApiResponse({ status: 200, description: 'Provider deleted (soft)' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete provider with active assignments' })
  async remove(@Param('id') id: string) {
    return this.providersService.remove(id);
  }

  // ==================== TIER MANAGEMENT ====================

  @Put(':id/tier')
  @ApiOperation({ summary: 'Update provider tier (1=best, 2=standard, 3=lower)' })
  @ApiResponse({ status: 200, description: 'Tier updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid tier value' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async updateTier(@Param('id') id: string, @Body() body: { tier: number }) {
    return this.providersService.updateTier(id, body.tier);
  }

  @Get('tier/:tier')
  @ApiOperation({ summary: 'Get all providers by tier' })
  @ApiResponse({ status: 200, description: 'Providers of specified tier' })
  @ApiQuery({ name: 'countryCode', required: false, enum: CountryCode })
  async getByTier(
    @Param('tier') tier: string,
    @Query('countryCode') countryCode?: CountryCode,
  ) {
    return this.providersService.getProvidersByTier(parseInt(tier, 10), countryCode);
  }

  // ==================== RISK MANAGEMENT ====================

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend provider' })
  @ApiResponse({ status: 200, description: 'Provider suspended successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async suspend(@Param('id') id: string, @Body() data: SuspendProviderDto) {
    return this.providersService.suspend(id, data);
  }

  @Post(':id/unsuspend')
  @ApiOperation({ summary: 'Unsuspend provider (lift suspension)' })
  @ApiResponse({ status: 200, description: 'Provider unsuspended successfully' })
  @ApiResponse({ status: 400, description: 'Provider is not suspended' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async unsuspend(@Param('id') id: string) {
    return this.providersService.unsuspend(id);
  }

  @Post(':id/watch')
  @ApiOperation({ summary: 'Put provider on watch (warning status)' })
  @ApiResponse({ status: 200, description: 'Provider put on watch' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async putOnWatch(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.providersService.putOnWatch(id, body.reason);
  }

  @Post(':id/clear-watch')
  @ApiOperation({ summary: 'Clear watch status (back to OK)' })
  @ApiResponse({ status: 200, description: 'Watch status cleared' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async clearWatch(@Param('id') id: string) {
    return this.providersService.clearWatch(id);
  }

  // ==================== CERTIFICATIONS ====================

  @Post(':id/certifications')
  @ApiOperation({ summary: 'Add certification to provider' })
  @ApiResponse({ status: 201, description: 'Certification added successfully' })
  @ApiResponse({ status: 400, description: 'Certification already exists' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async addCertification(
    @Param('id') id: string,
    @Body() certification: AddCertificationDto,
  ) {
    return this.providersService.addCertification(id, certification);
  }

  @Delete(':id/certifications/:code')
  @ApiOperation({ summary: 'Remove certification from provider' })
  @ApiResponse({ status: 200, description: 'Certification removed successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async removeCertification(
    @Param('id') id: string,
    @Param('code') code: string,
  ) {
    return this.providersService.removeCertification(id, code);
  }

  @Get('certifications/expiring')
  @ApiOperation({ summary: 'Get providers with expiring certifications' })
  @ApiResponse({ status: 200, description: 'Providers with expiring certifications' })
  @ApiQuery({ name: 'daysFromNow', required: false, type: Number })
  async getExpiringCertifications(@Query('daysFromNow') daysFromNow?: string) {
    const days = daysFromNow ? parseInt(daysFromNow, 10) : 30;
    return this.providersService.getProvidersWithExpiringCertifications(days);
  }
}
