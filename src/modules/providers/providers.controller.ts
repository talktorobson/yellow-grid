import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
  QueryProvidersDto,
  CreateWorkTeamDto,
  UpdateWorkTeamDto,
  CreateTechnicianDto,
  UpdateTechnicianDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('providers')
@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // ============================================================================
  // PROVIDER ENDPOINTS
  // ============================================================================

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new provider (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Provider successfully created' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Provider with external ID already exists' })
  async createProvider(@Body() dto: CreateProviderDto, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.createProvider(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all providers with pagination and filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of providers' })
  async findAllProviders(@Query() query: QueryProvidersDto, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.findAllProviders(query, user.countryCode, user.businessUnit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Provider details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async findOneProvider(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.findOneProvider(id, user.countryCode, user.businessUnit);
  }

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
    return this.providersService.updateProvider(id, dto, user.userId, user.countryCode, user.businessUnit);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete provider (Admin only)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Provider successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot delete provider with work teams' })
  async removeProvider(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.removeProvider(id, user.userId, user.countryCode, user.businessUnit);
  }

  // ============================================================================
  // WORK TEAM ENDPOINTS
  // ============================================================================

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
    return this.providersService.createWorkTeam(providerId, dto, user.userId, user.countryCode, user.businessUnit);
  }

  @Get(':providerId/work-teams')
  @ApiOperation({ summary: 'Get all work teams for provider' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of work teams' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Provider not found' })
  async findAllWorkTeams(@Param('providerId') providerId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.findAllWorkTeams(providerId, user.countryCode, user.businessUnit);
  }

  @Get('work-teams/:workTeamId')
  @ApiOperation({ summary: 'Get work team by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Work team details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team not found' })
  async findOneWorkTeam(@Param('workTeamId') workTeamId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.findOneWorkTeam(workTeamId, user.countryCode);
  }

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

  @Delete('work-teams/:workTeamId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete work team' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Work team successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot delete work team with technicians' })
  async removeWorkTeam(@Param('workTeamId') workTeamId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.removeWorkTeam(workTeamId, user.userId, user.countryCode);
  }

  // ============================================================================
  // TECHNICIAN ENDPOINTS
  // ============================================================================

  @Post('work-teams/:workTeamId/technicians')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Create technician for work team' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Technician successfully created' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team not found' })
  async createTechnician(
    @Param('workTeamId') workTeamId: string,
    @Body() dto: CreateTechnicianDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.createTechnician(workTeamId, dto, user.userId, user.countryCode);
  }

  @Get('work-teams/:workTeamId/technicians')
  @ApiOperation({ summary: 'Get all technicians for work team' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of technicians' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Work team not found' })
  async findAllTechnicians(@Param('workTeamId') workTeamId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.findAllTechnicians(workTeamId, user.countryCode);
  }

  @Get('technicians/:technicianId')
  @ApiOperation({ summary: 'Get technician by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Technician details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Technician not found' })
  async findOneTechnician(@Param('technicianId') technicianId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.findOneTechnician(technicianId, user.countryCode);
  }

  @Put('technicians/:technicianId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @ApiOperation({ summary: 'Update technician' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Technician successfully updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Technician not found' })
  async updateTechnician(
    @Param('technicianId') technicianId: string,
    @Body() dto: UpdateTechnicianDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.providersService.updateTechnician(technicianId, dto, user.userId, user.countryCode);
  }

  @Delete('technicians/:technicianId')
  @Roles('ADMIN', 'PROVIDER_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete technician' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Technician successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Technician not found' })
  async removeTechnician(@Param('technicianId') technicianId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.providersService.removeTechnician(technicianId, user.userId, user.countryCode);
  }
}
