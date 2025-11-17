import { Controller, Get, Put, Patch, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { UpdateSystemConfigDto, UpdateCountryConfigDto, UpdateBusinessUnitConfigDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../users/guards/roles.guard';
import { Roles } from '../users/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('config')
@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // ============================================================================
  // SYSTEM CONFIG ENDPOINTS
  // ============================================================================

  @Get('system')
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System configuration' })
  async getSystemConfig() {
    return this.configService.getSystemConfig();
  }

  @Put('system')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update system configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System configuration updated' })
  async updateSystemConfig(@Body() dto: UpdateSystemConfigDto, @CurrentUser() user: CurrentUserPayload) {
    return this.configService.updateSystemConfig(dto, user.userId);
  }

  @Patch('system')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Partially update system configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System configuration updated' })
  async patchSystemConfig(@Body() dto: UpdateSystemConfigDto, @CurrentUser() user: CurrentUserPayload) {
    return this.configService.updateSystemConfig(dto, user.userId);
  }

  // ============================================================================
  // COUNTRY CONFIG ENDPOINTS
  // ============================================================================

  @Get('country/:countryCode')
  @ApiOperation({ summary: 'Get country configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Country configuration' })
  async getCountryConfig(@Param('countryCode') countryCode: string) {
    return this.configService.getCountryConfig(countryCode.toUpperCase());
  }

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

  @Get('business-unit/:countryCode/:businessUnit')
  @ApiOperation({ summary: 'Get business unit configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Business unit configuration' })
  async getBusinessUnitConfig(
    @Param('countryCode') countryCode: string,
    @Param('businessUnit') businessUnit: string,
  ) {
    return this.configService.getBusinessUnitConfig(countryCode.toUpperCase(), businessUnit.toUpperCase());
  }

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
