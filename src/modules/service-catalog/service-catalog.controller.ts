import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ServiceCatalogService } from './service-catalog.service';
import { PricingService } from './pricing.service';
import { GeographicService } from './geographic.service';
import { ProviderSpecialtyService } from './provider-specialty.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';

/**
 * Service Catalog Controller
 *
 * REST API endpoints for service catalog management.
 * Provides access to services, pricing, geographic data, and provider specialties.
 */
@Controller('api/v1/service-catalog')
export class ServiceCatalogController {
  constructor(
    private readonly serviceCatalogService: ServiceCatalogService,
    private readonly pricingService: PricingService,
    private readonly geographicService: GeographicService,
    private readonly providerSpecialtyService: ProviderSpecialtyService,
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
}
