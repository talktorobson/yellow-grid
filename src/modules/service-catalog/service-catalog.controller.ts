import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ServiceCatalogService } from './service-catalog.service';
import { PricingService } from './pricing.service';
import { GeographicService } from './geographic.service';
import { ProviderSpecialtyService } from './provider-specialty.service';
import { SyncService } from './sync/sync.service';
import { ServiceCatalogEventConsumer } from './sync/service-catalog-event.consumer';
import { ReconciliationService } from './sync/reconciliation.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { ServiceEventPayload } from './sync/dto/service-event.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { DeprecateServiceDto } from './dto/deprecate-service.dto';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';

/**
 * Service Catalog Controller
 *
 * REST API endpoints for service catalog management.
 * Provides access to services, pricing, geographic data, and provider specialties.
 */
@ApiTags('Service Catalog')
@Controller('api/v1/service-catalog')
export class ServiceCatalogController {
  constructor(
    private readonly serviceCatalogService: ServiceCatalogService,
    private readonly pricingService: PricingService,
    private readonly geographicService: GeographicService,
    private readonly providerSpecialtyService: ProviderSpecialtyService,
    private readonly syncService: SyncService,
    private readonly eventConsumer: ServiceCatalogEventConsumer,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  // ============================================================================
  // SERVICE CATALOG ENDPOINTS
  // ============================================================================

  /**
   * Get all services for a country/business unit
   * GET /api/v1/service-catalog/services?countryCode=ES&businessUnit=LM_ES
   */
  @Get('services')
  async findAll(
    @Query('countryCode') countryCode: string,
    @Query('businessUnit') businessUnit: string,
    @Query('serviceType') serviceType?: ServiceType,
    @Query('serviceCategory') serviceCategory?: ServiceCategory,
    @Query('status') status?: ServiceStatus,
    @Query('externalSource') externalSource?: string,
  ) {
    return this.serviceCatalogService.findAll(countryCode, businessUnit, {
      serviceType,
      serviceCategory,
      status,
      externalSource,
    });
  }

  /**
   * Search services by name or description
   * GET /api/v1/service-catalog/services/search?q=hvac&countryCode=ES&businessUnit=LM_ES
   */
  @Get('services/search')
  async search(
    @Query('q') searchTerm: string,
    @Query('countryCode') countryCode: string,
    @Query('businessUnit') businessUnit: string,
    @Query('limit') limit?: number,
  ) {
    return this.serviceCatalogService.search(
      searchTerm,
      countryCode,
      businessUnit,
      limit,
    );
  }

  /**
   * Get service by ID
   * GET /api/v1/service-catalog/services/:id
   */
  @Get('services/:id')
  async findById(@Param('id') id: string) {
    return this.serviceCatalogService.findById(id);
  }

  /**
   * Get service by external code
   * GET /api/v1/service-catalog/services/external/:code
   */
  @Get('services/external/:code')
  async findByExternalCode(@Param('code') code: string) {
    return this.serviceCatalogService.findByExternalCode(code);
  }

  /**
   * Get service by FSM code
   * GET /api/v1/service-catalog/services/fsm/:code
   */
  @Get('services/fsm/:code')
  async findByFSMCode(@Param('code') code: string) {
    return this.serviceCatalogService.findByFSMCode(code);
  }

  /**
   * Get service statistics
   * GET /api/v1/service-catalog/services/stats?countryCode=ES&businessUnit=LM_ES
   */
  @Get('services/stats')
  async getStatistics(
    @Query('countryCode') countryCode: string,
    @Query('businessUnit') businessUnit: string,
  ) {
    return this.serviceCatalogService.getStatistics(countryCode, businessUnit);
  }

  /**
   * Create a new service
   * POST /api/v1/service-catalog/services
   */
  @Post('services')
  @ApiOperation({ summary: 'Create a new service in the catalog' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  @ApiResponse({ status: 409, description: 'Service with external code already exists' })
  async createService(@Body() dto: CreateServiceDto) {
    // Extract English name as default (fallback to first available language)
    const name = dto.name.en || dto.name.es || dto.name.fr || dto.name.it || dto.name.pl || 'Unnamed Service';
    const description = dto.description?.en || dto.description?.es || dto.description?.fr || dto.description?.it || dto.description?.pl || undefined;

    // Generate FSM service code
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const fsmServiceCode = `${dto.countryCode}_${dto.serviceCategory.substring(0, 4)}_${timestamp}${random}`;

    return this.serviceCatalogService.create({
      externalServiceCode: dto.externalServiceCode,
      fsmServiceCode,
      externalSource: dto.externalSource,
      countryCode: dto.countryCode,
      businessUnit: dto.businessUnit,
      serviceType: dto.serviceType as ServiceType,
      serviceCategory: dto.serviceCategory as ServiceCategory,
      name,
      description,
      scopeIncluded: dto.scopeIncluded || [],
      scopeExcluded: dto.scopeExcluded || [],
      worksiteRequirements: dto.worksiteRequirements || [],
      productPrerequisites: dto.productPrerequisites || [],
      estimatedDurationMinutes: dto.estimatedDurationMinutes,
      requiresPreServiceContract: dto.requiresPreServiceContract ?? false,
      requiresPostServiceWCF: dto.requiresPostServiceWCF ?? true,
      contractTemplateId: dto.contractTemplateId,
      createdBy: 'API_USER', // TODO: Extract from JWT token
    });
  }

  /**
   * Update an existing service
   * PATCH /api/v1/service-catalog/services/:id
   */
  @Patch('services/:id')
  @ApiOperation({ summary: 'Update an existing service' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async updateService(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    // Extract English name as default if provided
    const updateData: any = {};

    if (dto.name) {
      updateData.name = dto.name.en || dto.name.es || dto.name.fr || dto.name.it || dto.name.pl;
    }

    if (dto.description) {
      updateData.description = dto.description.en || dto.description.es || dto.description.fr || dto.description.it || dto.description.pl;
    }

    if (dto.scopeIncluded !== undefined) {
      updateData.scopeIncluded = dto.scopeIncluded;
    }

    if (dto.scopeExcluded !== undefined) {
      updateData.scopeExcluded = dto.scopeExcluded;
    }

    if (dto.worksiteRequirements !== undefined) {
      updateData.worksiteRequirements = dto.worksiteRequirements;
    }

    if (dto.productPrerequisites !== undefined) {
      updateData.productPrerequisites = dto.productPrerequisites;
    }

    if (dto.estimatedDurationMinutes !== undefined) {
      updateData.estimatedDurationMinutes = dto.estimatedDurationMinutes;
    }

    if (dto.requiresPreServiceContract !== undefined) {
      updateData.requiresPreServiceContract = dto.requiresPreServiceContract;
    }

    if (dto.requiresPostServiceWCF !== undefined) {
      updateData.requiresPostServiceWCF = dto.requiresPostServiceWCF;
    }

    if (dto.contractTemplateId !== undefined) {
      updateData.contractTemplateId = dto.contractTemplateId;
    }

    return this.serviceCatalogService.update(
      id,
      updateData,
      'API_USER', // TODO: Extract from JWT token
    );
  }

  /**
   * Deprecate a service
   * DELETE /api/v1/service-catalog/services/:id
   */
  @Delete('services/:id')
  @ApiOperation({ summary: 'Deprecate a service (soft delete)' })
  @ApiResponse({ status: 200, description: 'Service deprecated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 400, description: 'Service already deprecated' })
  async deprecateService(
    @Param('id') id: string,
    @Body() dto: DeprecateServiceDto,
  ) {
    return this.serviceCatalogService.deprecate(
      id,
      dto.reason || 'Deprecated via API',
      'API_USER', // TODO: Extract from JWT token
    );
  }

  // ============================================================================
  // PRICING ENDPOINTS
  // ============================================================================

  /**
   * Calculate price for a service
   * POST /api/v1/service-catalog/pricing/calculate
   */
  @Post('pricing/calculate')
  @HttpCode(HttpStatus.OK)
  async calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.pricingService.calculatePrice({
      serviceId: dto.serviceId,
      countryCode: dto.countryCode,
      businessUnit: dto.businessUnit,
      postalCode: dto.postalCode,
      isOvertime: dto.isOvertime,
      isWeekend: dto.isWeekend,
      isHoliday: dto.isHoliday,
      isUrgent: dto.isUrgent,
      durationMinutes: dto.durationMinutes,
    });
  }

  /**
   * Get all pricing for a service
   * GET /api/v1/service-catalog/pricing/service/:serviceId
   */
  @Get('pricing/service/:serviceId')
  async getPricingForService(
    @Param('serviceId') serviceId: string,
    @Query('includeExpired') includeExpired?: boolean,
  ) {
    return this.pricingService.getPricingForService(
      serviceId,
      includeExpired === true,
    );
  }

  // ============================================================================
  // GEOGRAPHIC ENDPOINTS
  // ============================================================================

  /**
   * Get all countries
   * GET /api/v1/service-catalog/geographic/countries
   */
  @Get('geographic/countries')
  async getAllCountries() {
    return this.geographicService.findAllCountries();
  }

  /**
   * Get postal code with full hierarchy
   * GET /api/v1/service-catalog/geographic/postal-codes/:code
   */
  @Get('geographic/postal-codes/:code')
  async getPostalCode(@Param('code') code: string) {
    return this.geographicService.findPostalCodeByCode(code);
  }

  /**
   * Get geographic hierarchy for a postal code
   * GET /api/v1/service-catalog/geographic/hierarchy/:postalCode
   */
  @Get('geographic/hierarchy/:postalCode')
  async getHierarchy(@Param('postalCode') postalCode: string) {
    return this.geographicService.getGeographicHierarchy(postalCode);
  }

  /**
   * Search postal codes
   * GET /api/v1/service-catalog/geographic/postal-codes/search?q=280&countryCode=ES
   */
  @Get('geographic/postal-codes/search')
  async searchPostalCodes(
    @Query('q') searchTerm: string,
    @Query('countryCode') countryCode?: string,
    @Query('limit') limit?: number,
  ) {
    return this.geographicService.searchPostalCodes(
      searchTerm,
      countryCode,
      limit,
    );
  }

  /**
   * Get provinces for a country
   * GET /api/v1/service-catalog/geographic/provinces?countryCode=ES
   */
  @Get('geographic/provinces')
  async getProvinces(@Query('countryCode') countryCode: string) {
    return this.geographicService.findProvincesByCountry(countryCode);
  }

  // ============================================================================
  // PROVIDER SPECIALTY ENDPOINTS
  // ============================================================================

  /**
   * Get all specialties
   * GET /api/v1/service-catalog/specialties
   */
  @Get('specialties')
  async getAllSpecialties(@Query('category') category?: ServiceCategory) {
    return this.providerSpecialtyService.findAllSpecialties(category);
  }

  /**
   * Get specialty by code
   * GET /api/v1/service-catalog/specialties/:code
   */
  @Get('specialties/:code')
  async getSpecialtyByCode(@Param('code') code: string) {
    return this.providerSpecialtyService.findSpecialtyByCode(code);
  }

  /**
   * Get specialties for a work team
   * GET /api/v1/service-catalog/work-teams/:workTeamId/specialties
   */
  @Get('work-teams/:workTeamId/specialties')
  async getWorkTeamSpecialties(
    @Param('workTeamId') workTeamId: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    return this.providerSpecialtyService.getWorkTeamSpecialties(
      workTeamId,
      activeOnly !== false,
    );
  }

  /**
   * Get work teams with a specific specialty
   * GET /api/v1/service-catalog/specialties/:specialtyId/work-teams
   */
  @Get('specialties/:specialtyId/work-teams')
  async getWorkTeamsWithSpecialty(
    @Param('specialtyId') specialtyId: string,
    @Query('countryCode') countryCode?: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    return this.providerSpecialtyService.getWorkTeamsWithSpecialty(
      specialtyId,
      countryCode,
      activeOnly !== false,
    );
  }

  /**
   * Find qualified work teams for a service
   * GET /api/v1/service-catalog/services/:serviceId/qualified-work-teams?countryCode=ES
   */
  @Get('services/:serviceId/qualified-work-teams')
  async findQualifiedWorkTeams(
    @Param('serviceId') serviceId: string,
    @Query('countryCode') countryCode: string,
  ) {
    return this.providerSpecialtyService.findQualifiedWorkTeamsForService(
      serviceId,
      countryCode,
    );
  }

  /**
   * Get certifications expiring soon
   * GET /api/v1/service-catalog/certifications/expiring?days=30
   */
  @Get('certifications/expiring')
  async getExpiringCertifications(
    @Query('days') days?: number,
    @Query('workTeamId') workTeamId?: string,
  ) {
    return this.providerSpecialtyService.getExpiringCertifications(
      days || 30,
      workTeamId,
    );
  }

  /**
   * Get specialty statistics for a country
   * GET /api/v1/service-catalog/specialties/stats?countryCode=ES
   */
  @Get('specialties/stats')
  async getSpecialtyStatistics(@Query('countryCode') countryCode: string) {
    return this.providerSpecialtyService.getStatistics(countryCode);
  }

  // ============================================================================
  // SYNC & ADMIN ENDPOINTS (Phase 3)
  // ============================================================================

  /**
   * Get sync statistics
   * GET /api/v1/service-catalog/admin/sync/stats?source=PYXIS
   */
  @Get('admin/sync/stats')
  async getSyncStatistics(
    @Query('source') source: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.syncService.getSyncStatistics(source, start, end);
  }

  /**
   * Retry failed sync events
   * POST /api/v1/service-catalog/admin/sync/retry
   */
  @Post('admin/sync/retry')
  @HttpCode(HttpStatus.OK)
  async retryFailedEvents(@Query('maxRetries') maxRetries?: number) {
    const retriedCount = await this.syncService.retryFailedEvents(
      maxRetries || 3,
    );
    return {
      retriedCount,
      message: `Successfully retried ${retriedCount} failed events`,
    };
  }

  /**
   * Simulate a Kafka event (for testing without Kafka)
   * POST /api/v1/service-catalog/admin/sync/simulate
   */
  @Post('admin/sync/simulate')
  @HttpCode(HttpStatus.ACCEPTED)
  async simulateEvent(@Body() payload: ServiceEventPayload) {
    await this.eventConsumer.simulateEvent(payload);
    return {
      message: `Event ${payload.eventId} queued for processing`,
      eventType: payload.eventType,
      externalServiceCode: payload.data.externalServiceCode,
    };
  }

  /**
   * Get event consumer health status
   * GET /api/v1/service-catalog/admin/sync/health
   */
  @Get('admin/sync/health')
  getEventConsumerHealth() {
    return this.eventConsumer.getHealthStatus();
  }

  /**
   * Get reconciliation history
   * GET /api/v1/service-catalog/admin/reconciliation/history?countryCode=ES&limit=10
   */
  @Get('admin/reconciliation/history')
  async getReconciliationHistory(
    @Query('countryCode') countryCode?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reconciliationService.getReconciliationHistory(
      countryCode,
      limit ? parseInt(limit.toString(), 10) : 10,
    );
  }

  /**
   * Trigger manual reconciliation for a country
   * POST /api/v1/service-catalog/admin/reconciliation/trigger
   */
  @Post('admin/reconciliation/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerReconciliation(@Body() body: { countryCode: string }) {
    await this.reconciliationService.manualReconciliation(body.countryCode);
    return {
      message: `Reconciliation triggered for ${body.countryCode}`,
      countryCode: body.countryCode,
    };
  }
}
