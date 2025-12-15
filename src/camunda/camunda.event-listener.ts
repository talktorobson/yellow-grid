import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CamundaService } from './camunda.service';
import {
  ServiceOrderCreatedEvent,
  OfferAcceptedEvent,
  OfferRejectedEvent,
  ServiceOrderCancelledEvent,
} from '../modules/service-orders/events';

/**
 * Camunda Event Listener
 *
 * Listens to domain events from ServiceOrdersModule and triggers
 * corresponding Camunda BPMN workflows. This decoupled approach
 * avoids circular dependencies between modules.
 */
@Injectable()
export class CamundaEventListener {
  private readonly logger = new Logger(CamundaEventListener.name);
  private readonly enabled: boolean;

  constructor(
    private readonly camundaService: CamundaService,
    private readonly configService: ConfigService,
  ) {
    const enabledValue = this.configService.get<string>('CAMUNDA_ENABLED', 'false');
    this.enabled = enabledValue === 'true' || enabledValue === '1';
  }

  /**
   * Handle service order creation - start the main workflow
   */
  @OnEvent(ServiceOrderCreatedEvent.eventName)
  async handleServiceOrderCreated(event: ServiceOrderCreatedEvent): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Camunda disabled - skipping workflow for order ${event.serviceOrderId}`);
      return;
    }

    this.logger.log(`🚀 Starting workflow for service order: ${event.serviceOrderId}`);

    try {
      const processInstanceKey = await this.camundaService.startServiceOrderWorkflow(
        event.serviceOrderId,
        {
          customerId: event.customerId,
          storeId: event.storeId,
          serviceId: event.serviceId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          postalCode: event.postalCode,
          urgency: event.urgency,
          requestedStartDate: event.requestedStartDate,
          requestedEndDate: event.requestedEndDate,
          correlationId: event.correlationId,
          // Calculate GO check wait duration (48h before scheduled date)
          goCheckWaitDuration: 'P0D', // Will be calculated when scheduled
        },
      );

      this.logger.log(
        `✅ Workflow started for order ${event.serviceOrderId} | processInstance: ${processInstanceKey}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to start workflow for order ${event.serviceOrderId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - log and continue, the order exists even if workflow fails
    }
  }

  /**
   * Handle offer acceptance - publish message to running workflow
   */
  @OnEvent(OfferAcceptedEvent.eventName)
  async handleOfferAccepted(event: OfferAcceptedEvent): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Camunda disabled - skipping offer accepted for ${event.offerId}`);
      return;
    }

    this.logger.log(`📬 Publishing offer accepted message: ${event.offerId}`);

    try {
      await this.camundaService.publishMessage('OfferAccepted', event.offerId, {
        serviceOrderId: event.serviceOrderId,
        providerId: event.providerId,
        workTeamId: event.workTeamId,
        acceptedAt: event.acceptedAt,
      });

      this.logger.log(`✅ Offer accepted message published for ${event.offerId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish offer accepted message for ${event.offerId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle offer rejection - publish message to running workflow
   */
  @OnEvent(OfferRejectedEvent.eventName)
  async handleOfferRejected(event: OfferRejectedEvent): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Camunda disabled - skipping offer rejected for ${event.offerId}`);
      return;
    }

    this.logger.log(`📬 Publishing offer rejected message: ${event.offerId}`);

    try {
      await this.camundaService.publishMessage('OfferRejected', event.offerId, {
        serviceOrderId: event.serviceOrderId,
        providerId: event.providerId,
        rejectionReason: event.rejectionReason,
      });

      this.logger.log(`✅ Offer rejected message published for ${event.offerId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish offer rejected message for ${event.offerId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle service order cancellation - cancel running workflow
   */
  @OnEvent(ServiceOrderCancelledEvent.eventName)
  async handleServiceOrderCancelled(event: ServiceOrderCancelledEvent): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(
        `Camunda disabled - skipping cancellation for order ${event.serviceOrderId}`,
      );
      return;
    }

    this.logger.log(`🛑 Handling cancellation for order: ${event.serviceOrderId}`);

    // Note: To cancel the process instance, we need to store the processInstanceKey
    // when the workflow starts. This would require a lookup table or storing it
    // on the service order record.
    //
    // For now, we log the event. Implementation would be:
    // const processInstanceKey = await this.lookupProcessInstance(event.serviceOrderId);
    // await this.camundaService.cancelProcessInstance(processInstanceKey);

    this.logger.warn(
      `⚠️ Process cancellation not yet implemented for order ${event.serviceOrderId}`,
    );
  }
}
