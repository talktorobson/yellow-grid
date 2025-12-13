import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
  QueryProvidersDto,
  CreateWorkTeamDto,
  UpdateWorkTeamDto,
  CreateProviderWorkingScheduleDto,
  CreateInterventionZoneDto,
  UpdateInterventionZoneDto,
  CreateServicePriorityConfigDto,
  BulkUpsertServicePriorityDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

/**
 * Controller for managing providers, work teams, technicians, and related configurations.
 *
 * Handles CRUD operations for providers hierarchy and their operational settings.
 */
@ApiTags('providers')
@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // ============================================================================
  // PROVIDER ENDPOINTS
  // ============================================================================

  /**
   * Creates a new provider.
   *
   * @param dto - The provider creation data.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns {Promise<ProviderResponseDto>} The created provider.
   */
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new provider (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Provider successfully created' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Provider with external ID already exists',
  })
  async createProvider(@Body() dto: CreateProviderDto, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.createProvider(dto, user.userId);
  }

  /**
   * Retrieves all providers with pagination and filtering.
   *
   * @param query - Query parameters for filtering and pagination.
   * @param user - The current authenticated user.
   * @returns A paginated list of providers.
   */
  @Get()
  @ApiOperation({ summary: 'Get all providers with pagination and filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of providers' })
  async findAllProviders(
    @Query() query: QueryProvidersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.findAllProviders(query, user.countryCode, user.businessUnit);
  }

  /**
   * Retrieves a specific provider by ID.
   *
   * @param id - The provider ID.
   * @param user - The current authenticated user.
   * @returns {Promise<ProviderResponseDto>} The provider details.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async findOneProvider(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.findOneProvider(id, user.countryCode, user.businessUnit);
  }

  /**
   * Updates an existing provider.
   *
   * @param id - The provider ID.
   * @param dto - The update data.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns {Promise<ProviderResponseDto>} The updated provider.
   */
  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update provider (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider successfully updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.updateProvider(
      id,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Partially updates an existing provider.
   *
   * @param id - The provider ID.
   * @param dto - The update data.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns {Promise<ProviderResponseDto>} The updated provider.
   */
  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Partially update provider (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider successfully updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async patchProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.updateProvider(
      id,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Deletes a provider.
   *
   * @param id - The provider ID.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns {Promise<void>}
   */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete provider (Admin only)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Provider successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete provider with work teams',
  })
  async removeProvider(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.removeProvider(
      id,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  // ============================================================================
  // WORK TEAM ENDPOINTS
  // ============================================================================

  /**
   * Creates a work team for a provider.
   *
   * @param providerId - The provider ID.
   * @param dto - The work team creation data.
   * @param user - The current authenticated user (ADMIN or PROVIDER_MANAGER).
   * @returns {Promise<WorkTeamResponseDto>} The created work team.
   */
  @Post(':providerId/work-teams')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Create work team for provider' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Work team successfully created' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async createWorkTeam(
    @Param('providerId') providerId: string,
    @Body() dto: CreateWorkTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.createWorkTeam(
      providerId,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Retrieves all work teams for a provider.
   *
   * @param providerId - The provider ID.
   * @param user - The current authenticated user.
   * @returns {Promise<WorkTeamResponseDto[]>} A list of work teams.
   */
  @Get(':providerId/work-teams')
  @ApiOperation({ summary: 'Get all work teams for provider' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of work teams' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async findAllWorkTeams(
    @Param('providerId') providerId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.findAllWorkTeams(providerId, user.countryCode, user.businessUnit);
  }

  /**
   * Retrieves a specific work team by ID.
   *
   * @param workTeamId - The work team ID.
   * @param user - The current authenticated user.
   * @returns {Promise<WorkTeamResponseDto>} The work team details.
   */
  @Get('work-teams/:workTeamId')
  @ApiOperation({ summary: 'Get work team by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Work team details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team not found' })
  async findOneWorkTeam(
    @Param('workTeamId') workTeamId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.findOneWorkTeam(workTeamId, user.countryCode);
  }

  /**
   * Updates a work team.
   *
   * @param workTeamId - The work team ID.
   * @param dto - The update data.
   * @param user - The current authenticated user (ADMIN or PROVIDER_MANAGER).
   * @returns {Promise<WorkTeamResponseDto>} The updated work team.
   */
  @Put('work-teams/:workTeamId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Update work team' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Work team successfully updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team not found' })
  async updateWorkTeam(
    @Param('workTeamId') workTeamId: string,
    @Body() dto: UpdateWorkTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.updateWorkTeam(workTeamId, dto, user.userId, user.countryCode);
  }

  /**
   * Deletes a work team.
   *
   * @param workTeamId - The work team ID.
   * @param user - The current authenticated user (ADMIN or PROVIDER_MANAGER).
   * @returns {Promise<void>}
   */
  @Delete('work-teams/:workTeamId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete work team' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Work team successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team not found' })
  async removeWorkTeam(
    @Param('workTeamId') workTeamId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.removeWorkTeam(workTeamId, user.userId, user.countryCode);
  }

  // NOTE: Individual technician CRUD endpoints removed per legal requirement
  // Platform operates at WorkTeam level only to avoid co-employer liability
  // See: docs/LEGAL_BOUNDARY_WORKTEAM_VS_TECHNICIAN.md

  // ============================================================================
  // PROVIDER WORKING SCHEDULE ENDPOINTS
  // ============================================================================

  /**
   * Retrieves the working schedule of a provider.
   *
   * @param providerId - The provider ID.
   * @param user - The current authenticated user.
   * @returns {Promise<ProviderWorkingScheduleResponseDto>} The working schedule.
   */
  @Get(':providerId/working-schedule')
  @ApiOperation({ summary: 'Get provider working schedule (shifts and working days)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider working schedule' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  async getProviderWorkingSchedule(
    @Param('providerId') providerId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.getProviderWorkingSchedule(
      providerId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Creates or updates a provider's working schedule.
   *
   * @param providerId - The provider ID.
   * @param dto - The schedule data.
   * @param user - The current authenticated user.
   * @returns {Promise<ProviderWorkingScheduleResponseDto>} The updated schedule.
   */
  @Put(':providerId/working-schedule')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Create or update provider working schedule' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Working schedule created/updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async upsertProviderWorkingSchedule(
    @Param('providerId') providerId: string,
    @Body() dto: CreateProviderWorkingScheduleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.upsertProviderWorkingSchedule(
      providerId,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  // ============================================================================
  // INTERVENTION ZONE ENDPOINTS
  // ============================================================================

  /**
   * Retrieves all intervention zones for a provider.
   *
   * @param providerId - The provider ID.
   * @param user - The current authenticated user.
   * @returns {Promise<InterventionZoneResponseDto[]>} A list of intervention zones.
   */
  @Get(':providerId/intervention-zones')
  @ApiOperation({ summary: 'Get provider intervention zones' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of intervention zones' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async getProviderInterventionZones(
    @Param('providerId') providerId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.getProviderInterventionZones(
      providerId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Creates a new intervention zone for a provider.
   *
   * @param providerId - The provider ID.
   * @param dto - The intervention zone data.
   * @param user - The current authenticated user.
   * @returns {Promise<InterventionZoneResponseDto>} The created intervention zone.
   */
  @Post(':providerId/intervention-zones')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Create intervention zone for provider' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Intervention zone created' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async createInterventionZone(
    @Param('providerId') providerId: string,
    @Body() dto: CreateInterventionZoneDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.createInterventionZone(
      providerId,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Updates an intervention zone.
   *
   * @param zoneId - The intervention zone ID.
   * @param dto - The update data.
   * @param user - The current authenticated user.
   * @returns {Promise<InterventionZoneResponseDto>} The updated intervention zone.
   */
  @Put('intervention-zones/:zoneId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Update intervention zone' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Intervention zone updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Intervention zone not found' })
  async updateInterventionZone(
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateInterventionZoneDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.updateInterventionZone(
      zoneId,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Deletes an intervention zone.
   *
   * @param zoneId - The intervention zone ID.
   * @param user - The current authenticated user.
   * @returns {Promise<void>}
   */
  @Delete('intervention-zones/:zoneId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete intervention zone' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Intervention zone deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Intervention zone not found' })
  async deleteInterventionZone(
    @Param('zoneId') zoneId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.deleteInterventionZone(
      zoneId,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  // ============================================================================
  // SERVICE PRIORITY CONFIG ENDPOINTS
  // ============================================================================

  /**
   * Retrieves service priority configurations for a provider.
   *
   * @param providerId - The provider ID.
   * @param user - The current authenticated user.
   * @returns {Promise<ServicePriorityConfigResponseDto[]>} A list of service priority configs.
   */
  @Get(':providerId/service-priorities')
  @ApiOperation({ summary: 'Get provider service priority configurations (P1/P2/Opt-out)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of service priority configs' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async getProviderServicePriorities(
    @Param('providerId') providerId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.getProviderServicePriorities(
      providerId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Creates or updates a service priority configuration.
   *
   * @param providerId - The provider ID.
   * @param dto - The configuration data.
   * @param user - The current authenticated user.
   * @returns {Promise<ServicePriorityConfigResponseDto>} The updated configuration.
   */
  @Post(':providerId/service-priorities')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Create or update service priority config' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service priority config created/updated',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider or service not found' })
  async upsertServicePriorityConfig(
    @Param('providerId') providerId: string,
    @Body() dto: CreateServicePriorityConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.upsertServicePriorityConfig(
      providerId,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Bulk updates service priority configurations.
   *
   * @param providerId - The provider ID.
   * @param dto - The bulk configuration data.
   * @param user - The current authenticated user.
   * @returns {Promise<void>}
   */
  @Put(':providerId/service-priorities/bulk')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Bulk update service priority configurations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Service priority configs updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async bulkUpsertServicePriorityConfig(
    @Param('providerId') providerId: string,
    @Body() dto: BulkUpsertServicePriorityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.bulkUpsertServicePriorityConfig(
      providerId,
      dto,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  /**
   * Deletes a service priority configuration.
   *
   * @param providerId - The provider ID.
   * @param specialtyId - The specialty ID.
   * @param user - The current authenticated user.
   * @returns {Promise<void>}
   */
  @Delete(':providerId/service-priorities/:specialtyId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete service priority config' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Service priority config deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Service priority config not found' })
  async deleteServicePriorityConfig(
    @Param('providerId') providerId: string,
    @Param('specialtyId') specialtyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.deleteServicePriorityConfig(
      providerId,
      specialtyId,
      user.userId,
      user.countryCode,
      user.businessUnit,
    );
  }

  // ============================================================================
  // WORK TEAM ZONE ASSIGNMENT ENDPOINTS
  // ============================================================================

  /**
   * Assigns a work team to an intervention zone.
   *
   * @param workTeamId - The work team ID.
   * @param interventionZoneId - The intervention zone ID.
   * @param overrides - Optional overrides for max daily jobs and priority.
   * @param user - The current authenticated user.
   * @returns {Promise<void>}
   */
  @Post('work-teams/:workTeamId/zones/:interventionZoneId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Assign work team to intervention zone' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Work team assigned to zone' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team or zone not found' })
  async assignWorkTeamToZone(
    @Param('workTeamId') workTeamId: string,
    @Param('interventionZoneId') interventionZoneId: string,
    @Body()
    overrides: {
      maxDailyJobsOverride?: number;
      assignmentPriorityOverride?: number;
      travelBufferOverride?: number;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.assignWorkTeamToZone(
      workTeamId,
      interventionZoneId,
      overrides,
      user.userId,
      user.countryCode,
    );
  }

  /**
   * Removes a work team from an intervention zone.
   *
   * @param workTeamId - The work team ID.
   * @param interventionZoneId - The intervention zone ID.
   * @param user - The current authenticated user.
   * @returns {Promise<void>}
   */
  @Delete('work-teams/:workTeamId/zones/:interventionZoneId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove work team from intervention zone' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Work team removed from zone' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  async removeWorkTeamFromZone(
    @Param('workTeamId') workTeamId: string,
    @Param('interventionZoneId') interventionZoneId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.removeWorkTeamFromZone(
      workTeamId,
      interventionZoneId,
      user.userId,
      user.countryCode,
    );
  }

  // ============================================================================
  // CERTIFICATION ENDPOINTS (PSM Verification)
  // ============================================================================

  /**
   * Retrieves all certifications based on filters.
   *
   * @param status - Filter by certification status.
   * @param providerId - Filter by provider ID.
   * @param page - Page number.
   * @param limit - Items per page.
   * @param user - The current authenticated user.
   * @returns A paginated list of certifications.
   */
  @Get('certifications')
  @ApiOperation({ summary: 'Get all technician certifications for verification (PSM)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of certifications with verification status',
  })
  async getAllCertifications(
    @Query('status') status?: 'pending' | 'approved' | 'rejected' | 'expired',
    @Query('providerId') providerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.providersService.getAllCertifications(
      {
        status,
        providerId,
        page: page ? Number.parseInt(page, 10) : undefined,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
      },
      user?.countryCode || '',
      user?.businessUnit || '',
    );
  }

  /**
   * Verifies (approves or rejects) a certification.
   *
   * @param certificationId - The certification ID.
   * @param body - The verification action and optional notes.
   * @param user - The current authenticated user.
   * @returns {Promise<CertificationResponseDto>} The verified certification.
   */
  @Patch('certifications/:certificationId/verify')
  @Roles('ADMIN', 'PROVIDER_MANAGER', 'PSM')
  @ApiOperation({ summary: 'Verify (approve/reject) a certification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Certification verified' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Certification not found' })
  async verifyCertification(
    @Param('certificationId') certificationId: string,
    @Body() body: { action: 'approve' | 'reject'; notes?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.verifyCertification(
      certificationId,
      body.action,
      user.userId,
      user.countryCode,
      body.notes,
    );
  }

  // ============================================================================
  // COVERAGE ENDPOINTS (PSM Coverage Analysis)
  // ============================================================================

  /**
   * Retrieves all intervention zones for coverage analysis.
   *
   * @param user - The current authenticated user.
   * @returns A list of intervention zones with provider data.
   */
  @Get('intervention-zones/coverage')
  @ApiOperation({ summary: 'Get all intervention zones for coverage analysis (PSM)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All intervention zones with provider data' })
  async getInterventionZonesForCoverage(@CurrentUser() user: CurrentUserPayload) {
    return this.providersService.getInterventionZonesForCoverage(
      user.countryCode,
      user.businessUnit,
    );
  }
}
