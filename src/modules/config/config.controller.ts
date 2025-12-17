import { Controller, Get, Put, Patch, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { UpdateSystemConfigDto, UpdateCountryConfigDto, UpdateBusinessUnitConfigDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

/**
 * Controller for managing system, country, and business unit configurations.
 *
 * Requires authentication and specific roles for modification.
 */
@ApiTags('config')
@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // ============================================================================
  // SYSTEM CONFIG ENDPOINTS
  // ============================================================================

  /**
   * Retrieves the current system configuration.
   *
   * @returns The system configuration object.
   */
  @Get('system')
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System configuration' })
  async getSystemConfig() {
    return this.configService.getSystemConfig();
  }

  /**
   * Updates the system configuration.
   *
   * @param dto - The new configuration settings.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns The updated system configuration.
   */
  @Put('system')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update system configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System configuration updated' })
  async updateSystemConfig(
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.configService.updateSystemConfig(dto, user.userId);
  }

  /**
   * Partially updates the system configuration.
   *
   * @param dto - The configuration settings to update.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns The updated system configuration.
   */
  @Patch('system')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Partially update system configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System configuration updated' })
  async patchSystemConfig(
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.configService.updateSystemConfig(dto, user.userId);
  }

  // ============================================================================
  // COUNTRY CONFIG ENDPOINTS
  // ============================================================================

  /**
   * Retrieves configuration for a specific country.
   *
   * @param countryCode - The ISO country code (e.g., FR, ES).
   * @returns The country configuration object.
   */
  @Get('country/:countryCode')
  @ApiOperation({ summary: 'Get country configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Country configuration' })
  async getCountryConfig(@Param('countryCode') countryCode: string) {
    return this.configService.getCountryConfig(countryCode.toUpperCase());
  }

  /**
   * Updates configuration for a specific country.
   *
   * @param countryCode - The ISO country code.
   * @param dto - The new configuration settings.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns The updated country configuration.
   */
  @Put('country/:countryCode')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update country configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Country configuration updated' })
  async updateCountryConfig(
    @Param('countryCode') countryCode: string,
    @Body() dto: UpdateCountryConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.configService.updateCountryConfig(countryCode.toUpperCase(), dto, user.userId);
  }

  /**
   * Partially updates configuration for a specific country.
   *
   * @param countryCode - The ISO country code.
   * @param dto - The configuration settings to update.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns The updated country configuration.
   */
  @Patch('country/:countryCode')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Partially update country configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Country configuration updated' })
  async patchCountryConfig(
    @Param('countryCode') countryCode: string,
    @Body() dto: UpdateCountryConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.configService.updateCountryConfig(countryCode.toUpperCase(), dto, user.userId);
  }

  // ============================================================================
  // BUSINESS UNIT CONFIG ENDPOINTS
  // ============================================================================

  /**
   * Retrieves configuration for a specific business unit within a country.
   *
   * @param countryCode - The ISO country code.
   * @param businessUnit - The business unit identifier (e.g., DIY_STORE).
   * @returns The business unit configuration object.
   */
  @Get('business-unit/:countryCode/:businessUnit')
  @ApiOperation({ summary: 'Get business unit configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Business unit configuration' })
  async getBusinessUnitConfig(
    @Param('countryCode') countryCode: string,
    @Param('businessUnit') businessUnit: string,
  ) {
    return this.configService.getBusinessUnitConfig(
      countryCode.toUpperCase(),
      businessUnit.toUpperCase(),
    );
  }

  /**
   * Updates configuration for a specific business unit within a country.
   *
   * @param countryCode - The ISO country code.
   * @param businessUnit - The business unit identifier.
   * @param dto - The new configuration settings.
   * @param user - The current authenticated user (must be ADMIN).
   * @returns The updated business unit configuration.
   */
  @Put('business-unit/:countryCode/:businessUnit')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update business unit configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Business unit configuration updated' })
  async updateBusinessUnitConfig(
    @Param('countryCode') countryCode: string,
    @Param('businessUnit') businessUnit: string,
    @Body() dto: UpdateBusinessUnitConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.configService.updateBusinessUnitConfig(
      countryCode.toUpperCase(),
      businessUnit.toUpperCase(),
      dto,
      user.userId,
    );
  }
}
