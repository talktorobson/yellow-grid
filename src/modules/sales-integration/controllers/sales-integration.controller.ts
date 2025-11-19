import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  OrderIntakeRequestDto,
  OrderIntakeResponseDto,
  SlotAvailabilityRequestDto,
  SlotAvailabilityResponseDto,
  InstallationOutcomeDto,
  PreEstimationCreatedEventDto,
  SalesSystem,
} from '../dto';
import {
  OrderIntakeService,
  EventMappingService,
  OrderMappingService,
  SlotAvailabilityService,
  InstallationOutcomeWebhookService,
  PreEstimationService,
} from '../services';
import { IntegrationContext } from '../interfaces';

@ApiTags('Sales Integration')
@Controller('api/v1/integrations/sales')
export class SalesIntegrationController {
  private readonly logger = new Logger(SalesIntegrationController.name);

  constructor(
    private readonly orderIntakeService: OrderIntakeService,
    private readonly eventMappingService: EventMappingService,
    private readonly orderMappingService: OrderMappingService,
    private readonly slotAvailabilityService: SlotAvailabilityService,
    private readonly installationOutcomeWebhookService: InstallationOutcomeWebhookService,
    private readonly preEstimationService: PreEstimationService,
  ) {}

  /**
   * POST /api/v1/integrations/sales/orders/intake
   * Receive order intake from sales systems (Pyxis/Tempo/SAP)
   */
  @Post('orders/intake')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  @ApiOperation({
    summary: 'Order intake from sales systems',
    description: 'Receive new order from Pyxis, Tempo, or SAP sales systems',
  })
  @ApiResponse({
    status: 202,
    description: 'Order intake accepted for processing',
    type: OrderIntakeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async orderIntake(
    @Body() request: OrderIntakeRequestDto,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<OrderIntakeResponseDto> {
    this.logger.log(
      `Received order intake request: ${request.externalOrderId} from ${request.salesSystem}`,
    );

    const context: IntegrationContext = {
      correlationId: correlationId || this.generateCorrelationId(),
      tenantId: tenantId || 'default',
      timestamp: new Date(),
    };

    const response = await this.orderIntakeService.execute(request, context);

    // If successful, trigger event mapping
    if (response.status === 'RECEIVED') {
      await this.eventMappingService.mapOrderIntakeToServiceOrderCreated(
        request.externalOrderId,
        request.salesSystem,
        request,
        response.orderId,
        context.correlationId,
      );

      // Map to internal format
      const internalOrder = this.orderMappingService.mapToInternalFormat(
        request,
        response.orderId,
      );

      this.logger.log(
        `Order mapped to internal format: ${internalOrder.orderNumber}`,
      );
    }

    return response;
  }

  /**
   * POST /api/v1/integrations/sales/slots/availability
   * Query available appointment slots
   */
  @Post('slots/availability')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 200, ttl: 60000 } }) // 200 requests per minute
  @ApiOperation({
    summary: 'Query available appointment slots',
    description:
      'Check available slots for scheduling service orders from sales systems',
  })
  @ApiResponse({
    status: 200,
    description: 'Available slots found',
    type: SlotAvailabilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getAvailableSlots(
    @Body() request: SlotAvailabilityRequestDto,
    @Headers('x-correlation-id') correlationId?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<SlotAvailabilityResponseDto> {
    this.logger.log('Processing slot availability request');

    const context: IntegrationContext = {
      correlationId: correlationId || this.generateCorrelationId(),
      tenantId: tenantId || 'default',
      timestamp: new Date(),
    };

    return this.slotAvailabilityService.execute(request, context);
  }

  /**
   * POST /api/v1/integrations/sales/pre-estimations
   * Receive pre-estimation created event from sales system
   */
  @Post('pre-estimations')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Pre-estimation created event',
    description:
      'Receive pre-estimation from sales system for linking to Technical Visits',
  })
  @ApiResponse({ status: 202, description: 'Pre-estimation received' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async preEstimationCreated(
    @Body() event: PreEstimationCreatedEventDto,
  ): Promise<{ status: string; preEstimationId: string }> {
    this.logger.log(
      `Received pre-estimation created event: ${event.preEstimationId}`,
    );

    await this.preEstimationService.handlePreEstimationCreated(event);

    return {
      status: 'ACCEPTED',
      preEstimationId: event.preEstimationId,
    };
  }

  /**
   * POST /api/v1/integrations/sales/installation-outcomes
   * Send installation outcome to sales system webhook
   */
  @Post('installation-outcomes')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send installation outcome to sales system',
    description:
      'Internal endpoint to trigger webhook delivery of installation outcomes',
  })
  @ApiResponse({ status: 202, description: 'Webhook delivery initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendInstallationOutcome(
    @Body() outcome: InstallationOutcomeDto,
    @Query('salesSystem') salesSystem: SalesSystem,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<{ status: string }> {
    this.logger.log(
      `Sending installation outcome for order: ${outcome.externalOrderId}`,
    );

    await this.installationOutcomeWebhookService.sendOutcome(
      outcome,
      salesSystem,
      tenantId || 'default',
    );

    return { status: 'ACCEPTED' };
  }

  /**
   * GET /api/v1/integrations/sales/health
   * Health check for sales integration
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check health status of sales integration services',
  })
  @ApiResponse({ status: 200, description: 'Health status' })
  async healthCheck(): Promise<{
    status: string;
    services: Record<string, any>;
  }> {
    const orderIntakeHealth = await this.orderIntakeService.healthCheck();
    const slotAvailabilityHealth =
      await this.slotAvailabilityService.healthCheck();

    const overallStatus =
      orderIntakeHealth.status === 'healthy' &&
      slotAvailabilityHealth.status === 'healthy'
        ? 'healthy'
        : 'degraded';

    return {
      status: overallStatus,
      services: {
        orderIntake: orderIntakeHealth,
        slotAvailability: slotAvailabilityHealth,
      },
    };
  }

  /**
   * GET /api/v1/integrations/sales/service-orders/by-external-reference
   * Lookup service order by external reference
   */
  @Get('service-orders/by-external-reference')
  @ApiOperation({
    summary: 'Lookup service order by external reference',
    description:
      'Find FSM service order using external sales system reference',
  })
  @ApiResponse({ status: 200, description: 'Service order found' })
  @ApiResponse({ status: 404, description: 'Service order not found' })
  async getServiceOrderByExternalReference(
    @Query('system') system: SalesSystem,
    @Query('type') type: 'SALES_ORDER' | 'PROJECT' | 'LEAD',
    @Query('id') id: string,
  ): Promise<any> {
    this.logger.log(
      `Looking up service order by external reference: ${system}/${type}/${id}`,
    );

    // TODO: Implement database lookup
    return {
      message: 'Not implemented yet',
      system,
      type,
      id,
    };
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `corr-${timestamp}-${random}`;
  }
}
