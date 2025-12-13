import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CustomerPortalService } from './customer-portal.service';

/**
 * Customer Portal Controller
 *
 * Provides public (unauthenticated) endpoints for customer self-service portal.
 * Customers access via deep-link with access token (service order ID or hash).
 */
@ApiTags('Customer Portal')
@Controller('customer-portal')
export class CustomerPortalController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  /**
   * Get service order for customer portal
   *
   * This is a PUBLIC endpoint - no JWT authentication required.
   * The accessToken serves as the authentication mechanism.
   */
  @Get(':accessToken/service-order')
  @Public()
  @ApiOperation({ summary: 'Get service order for customer portal (public)' })
  @ApiResponse({
    status: 200,
    description: 'Service order retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Service order not found or access denied',
  })
  async getServiceOrder(@Param('accessToken') accessToken: string) {
    const result = await this.customerPortalService.getServiceOrderByToken(accessToken);

    if (!result) {
      throw new NotFoundException('Service order not found or access denied');
    }

    return result;
  }

  /**
   * Get WCF (Work Completion Form) data for customer portal
   */
  @Get(':accessToken/wcf')
  @Public()
  @ApiOperation({ summary: 'Get WCF data for customer portal (public)' })
  @ApiResponse({
    status: 200,
    description: 'WCF data retrieved successfully',
  })
  async getWCFData(@Param('accessToken') accessToken: string) {
    const result = await this.customerPortalService.getWCFData(accessToken);

    if (!result) {
      throw new NotFoundException('WCF data not found');
    }

    return result;
  }

  /**
   * Get photos for customer portal
   */
  @Get(':accessToken/photos')
  @Public()
  @ApiOperation({ summary: 'Get photos for customer portal (public)' })
  @ApiResponse({
    status: 200,
    description: 'Photos retrieved successfully',
  })
  async getPhotos(@Param('accessToken') accessToken: string) {
    return this.customerPortalService.getPhotos(accessToken);
  }
}
