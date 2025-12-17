import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CamundaService } from './camunda.service';
import { ConfigService } from '@nestjs/config';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TriggerWorkflowDto {
  @IsString()
  serviceOrderId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsString()
  countryCode: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsString()
  postalCode: string;

  @IsEnum(['URGENT', 'STANDARD', 'LOW'])
  urgency: 'URGENT' | 'STANDARD' | 'LOW';

  @IsOptional()
  @IsString()
  requestedStartDate?: string;

  @IsOptional()
  @IsString()
  requestedEndDate?: string;
}

class BulkTriggerWorkflowDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerWorkflowDto)
  orders: TriggerWorkflowDto[];
}

class OfferResponseDto {
  @IsString()
  assignmentId: string;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsEnum(['MORNING', 'AFTERNOON', 'EVENING'])
  scheduledSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING';

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  respondedBy?: string;
}

/**
 * Camunda Workflow Controller
 *
 * Provides endpoints for manually triggering Camunda workflows.
 * Useful for testing and debugging workflow execution.
 */
@ApiTags('Camunda Workflows')
@Controller('camunda')
export class CamundaController {
  private readonly logger = new Logger(CamundaController.name);
  private readonly enabled: boolean;

  constructor(
    private readonly camundaService: CamundaService,
    private readonly configService: ConfigService,
  ) {
    const enabledValue = this.configService.get<string>('CAMUNDA_ENABLED', 'false');
    this.enabled = enabledValue === 'true' || enabledValue === '1';
  }

  @Post('trigger-workflow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a service order workflow' })
  @ApiBody({ type: TriggerWorkflowDto })
  @ApiResponse({ status: 200, description: 'Workflow triggered successfully' })
  @ApiResponse({ status: 503, description: 'Camunda is disabled' })
  async triggerWorkflow(@Body() dto: TriggerWorkflowDto): Promise<{
    success: boolean;
    processInstanceKey?: string;
    error?: string;
  }> {
    if (!this.enabled) {
      return { success: false, error: 'Camunda is disabled' };
    }

    try {
      this.logger.log(`🚀 Manual workflow trigger for: ${dto.serviceOrderId}`);

      const processInstanceKey = await this.camundaService.startServiceOrderWorkflow(
        dto.serviceOrderId,
        {
          customerId: dto.customerId || `customer-${dto.serviceOrderId}`,
          storeId: dto.storeId || `${dto.countryCode}-STORE`,
          serviceId: dto.serviceId || 'default-service',
          countryCode: dto.countryCode,
          businessUnit: dto.businessUnit || `GlobalCorp_${dto.countryCode}`,
          postalCode: dto.postalCode,
          urgency: dto.urgency,
          requestedStartDate:
            dto.requestedStartDate ||
            new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          requestedEndDate:
            dto.requestedEndDate ||
            new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          correlationId: `manual-trigger-${Date.now()}`,
          goCheckWaitDuration: 'P0D',
        },
      );

      this.logger.log(`✅ Workflow started: ${processInstanceKey}`);

      return {
        success: true,
        processInstanceKey,
      };
    } catch (error) {
      this.logger.error(`❌ Workflow trigger failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('trigger-workflow/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger multiple service order workflows' })
  @ApiBody({ type: BulkTriggerWorkflowDto })
  @ApiResponse({ status: 200, description: 'Workflows triggered' })
  async triggerBulkWorkflows(@Body() dto: BulkTriggerWorkflowDto): Promise<{
    success: boolean;
    results: Array<{
      serviceOrderId: string;
      processInstanceKey?: string;
      error?: string;
    }>;
  }> {
    if (!this.enabled) {
      return {
        success: false,
        results: dto.orders.map((o) => ({
          serviceOrderId: o.serviceOrderId,
          error: 'Camunda is disabled',
        })),
      };
    }

    this.logger.log(`🚀 Bulk workflow trigger for ${dto.orders.length} orders`);

    const results: Array<{
      serviceOrderId: string;
      processInstanceKey?: string;
      error?: string;
    }> = [];

    for (const order of dto.orders) {
      try {
        const processInstanceKey = await this.camundaService.startServiceOrderWorkflow(
          order.serviceOrderId,
          {
            customerId: order.customerId || `customer-${order.serviceOrderId}`,
            storeId: order.storeId || `${order.countryCode}-STORE`,
            serviceId: order.serviceId || 'default-service',
            countryCode: order.countryCode,
            businessUnit: order.businessUnit || `GlobalCorp_${order.countryCode}`,
            postalCode: order.postalCode,
            urgency: order.urgency,
            requestedStartDate:
              order.requestedStartDate ||
              new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            requestedEndDate:
              order.requestedEndDate ||
              new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
            correlationId: `bulk-trigger-${Date.now()}`,
            goCheckWaitDuration: 'P0D',
          },
        );

        this.logger.log(`✅ ${order.serviceOrderId} -> ${processInstanceKey}`);
        results.push({ serviceOrderId: order.serviceOrderId, processInstanceKey });
      } catch (error) {
        this.logger.error(`❌ ${order.serviceOrderId}: ${error.message}`);
        results.push({ serviceOrderId: order.serviceOrderId, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.processInstanceKey).length;
    this.logger.log(`📊 Bulk trigger complete: ${successCount}/${dto.orders.length} succeeded`);

    return {
      success: successCount === dto.orders.length,
      results,
    };
  }

  @Post('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check Camunda integration health' })
  async healthCheck(): Promise<{
    enabled: boolean;
    zeebe: boolean;
    workers: string[];
  }> {
    return {
      enabled: this.enabled,
      zeebe: this.enabled && this.camundaService.getZeebeClient() !== null,
      workers: [
        'validate-order',
        'find-providers',
        'rank-providers',
        'auto-assign-provider',
        'send-offer',
        'check-availability',
        'reserve-slot',
        'go-check',
        'send-notification',
        'escalate-offer-timeout',
      ],
    };
  }

  @Post('offer/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an offer from a provider' })
  @ApiBody({ type: OfferResponseDto })
  @ApiResponse({ status: 200, description: 'Offer accepted successfully' })
  async acceptOffer(@Body() dto: OfferResponseDto): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    if (!this.enabled) {
      return { success: false, error: 'Camunda is disabled' };
    }

    try {
      this.logger.log(`✅ Accepting offer: ${dto.assignmentId}`);

      await this.camundaService.publishMessage(
        'OfferAccepted',
        dto.assignmentId,
        {
          accepted: true,
          acceptedAt: new Date().toISOString(),
          scheduledDate: dto.scheduledDate,
          scheduledSlot: dto.scheduledSlot || 'MORNING',
          respondedBy: dto.respondedBy || 'provider',
        },
      );

      return {
        success: true,
        message: `Offer ${dto.assignmentId} accepted`,
      };
    } catch (error) {
      this.logger.error(`❌ Accept offer failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  @Post('offer/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an offer from a provider' })
  @ApiBody({ type: OfferResponseDto })
  @ApiResponse({ status: 200, description: 'Offer rejected successfully' })
  async rejectOffer(@Body() dto: OfferResponseDto): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    if (!this.enabled) {
      return { success: false, error: 'Camunda is disabled' };
    }

    try {
      this.logger.log(`❌ Rejecting offer: ${dto.assignmentId}`);

      await this.camundaService.publishMessage(
        'OfferRejected',
        dto.assignmentId,
        {
          rejected: true,
          rejectedAt: new Date().toISOString(),
          rejectionReason: dto.rejectionReason || 'Provider declined',
          respondedBy: dto.respondedBy || 'provider',
        },
      );

      return {
        success: true,
        message: `Offer ${dto.assignmentId} rejected`,
      };
    } catch (error) {
      this.logger.error(`❌ Reject offer failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
