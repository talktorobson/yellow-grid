import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../../common/kafka';

/**
 * Contracts Event Handlers
 *
 * Handles Kafka events related to contracts, documents, and WCF (Work Closing Form),
 * triggering billing notifications and downstream workflows.
 */
@Injectable()
export class ContractsEventHandler {
  private readonly logger = new Logger(ContractsEventHandler.name);

  /**
   * Handle WCF (Work Closing Form) completion
   *
   * Workflow: WCF completion → billing system notification
   *
   * When a technician completes a WCF and it's signed by the customer,
   * we need to notify the billing system to initiate invoicing.
   */
  @EventHandler({
    eventName: 'document.signed',
    topics: ['fsm.contracts'],
    groupId: 'contracts-wcf-completion-handler',
  })
  async handleDocumentSigned(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received document.signed event | document: ${event.documentId} | type: ${event.documentType}`,
    );

    const {
      documentId,
      orderId,
      documentType,
      allSignaturesComplete,
      documentUrl,
      tenantId,
    } = event;

    try {
      // Only process WCF documents
      if (documentType !== 'WORK_ORDER') {
        this.logger.debug(
          `Skipping non-WCF document | document: ${documentId} | type: ${documentType}`,
        );
        return;
      }

      // Only trigger billing if all signatures are complete
      if (!allSignaturesComplete) {
        this.logger.log(
          `⏳ WCF signatures incomplete | document: ${documentId} | Waiting for all signatures`,
        );
        return;
      }

      this.logger.log(
        `💰 WCF fully signed | document: ${documentId} | order: ${orderId} | Notifying billing system`,
      );

      // TODO: Send billing notification
      // await this.billingService.notifyWCFCompleted({
      //   orderId,
      //   documentId,
      //   documentUrl,
      //   tenantId,
      // });

      // TODO: Update service order status to COMPLETED
      // await this.serviceOrdersService.markAsCompleted(orderId, {
      //   wcfDocumentId: documentId,
      //   wcfCompletedAt: new Date(),
      // });

      // TODO: Trigger invoice generation
      // await this.invoiceService.generateInvoice(orderId);

      this.logger.log(
        `✅ Successfully processed WCF completion | document: ${documentId} | order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process document.signed event | document: ${documentId}:`,
        error,
      );
      throw error; // Re-throw to trigger DLQ
    }
  }

  /**
   * Handle appointment completion events
   *
   * Workflow: Appointment completed → trigger WCF generation
   */
  @EventHandler({
    eventName: 'appointment.completed',
    topics: ['fsm.scheduling'],
    groupId: 'contracts-appointment-completion-handler',
  })
  async handleAppointmentCompleted(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received appointment.completed event | appointment: ${event.appointmentId} | order: ${event.orderId}`,
    );

    const {
      appointmentId,
      orderId,
      technicianId,
      workPerformed,
      partsUsed,
      photos,
      requiresFollowUp,
    } = event;

    try {
      this.logger.log(
        `📋 Initiating WCF generation | order: ${orderId} | appointment: ${appointmentId}`,
      );

      // TODO: Generate WCF document
      // const wcfDocument = await this.contractsService.generateWCF({
      //   orderId,
      //   appointmentId,
      //   workPerformed,
      //   partsUsed,
      //   photos,
      // });

      // TODO: Request customer signature
      // await this.eSignatureService.requestSignature({
      //   documentId: wcfDocument.id,
      //   orderId,
      //   signers: [
      //     { role: 'CUSTOMER', ... },
      //     { role: 'TECHNICIAN', technicianId, ... },
      //   ],
      // });

      // Check if follow-up is required
      if (requiresFollowUp) {
        this.logger.log(
          `🔄 Follow-up required | order: ${orderId} | Creating follow-up task`,
        );

        // TODO: Create follow-up task
        // await this.tasksService.createFollowUpTask({
        //   orderId,
        //   appointmentId,
        //   reason: event.followUpReason,
        // });
      }

      this.logger.log(
        `✅ Successfully processed appointment completion | order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process appointment.completed event | order: ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle payment completion events
   *
   * Workflow: Payment completed → update contract status, notify ERP
   */
  @EventHandler({
    eventName: 'payment.completed',
    topics: ['fsm.contracts'],
    groupId: 'contracts-payment-handler',
  })
  async handlePaymentCompleted(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(
      `📥 Received payment.completed event | payment: ${event.paymentId} | order: ${event.orderId}`,
    );

    const { paymentId, orderId, transactionId, amount, readyForERP } = event;

    try {
      // Update contract with payment information
      this.logger.log(
        `💳 Updating contract with payment info | order: ${orderId} | payment: ${paymentId}`,
      );

      // TODO: Update contract status
      // await this.contractsService.markAsPaid(orderId, {
      //   paymentId,
      //   transactionId,
      //   paidAmount: amount.total,
      //   paidAt: new Date(),
      // });

      // Send to ERP if ready
      if (readyForERP) {
        this.logger.log(
          `📤 Sending payment data to ERP | order: ${orderId} | payment: ${paymentId}`,
        );

        // TODO: Send to ERP
        // await this.erpIntegrationService.sendPayment({
        //   orderId,
        //   paymentId,
        //   transactionId,
        //   amount,
        // });
      }

      this.logger.log(
        `✅ Successfully processed payment completion | order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process payment.completed event | order: ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle contract pre-service signature events
   *
   * Workflow: Pre-service contract signed → allow service execution
   */
  @EventHandler({
    eventName: 'document.signed',
    topics: ['fsm.contracts'],
    groupId: 'contracts-pre-service-handler',
  })
  async handlePreServiceContractSigned(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    const { documentId, orderId, documentType, allSignaturesComplete } = event;

    // Only process pre-service contracts
    if (documentType !== 'CONTRACT' && documentType !== 'SERVICE_AGREEMENT') {
      return;
    }

    if (!allSignaturesComplete) {
      this.logger.log(
        `⏳ Contract signatures incomplete | document: ${documentId} | order: ${orderId}`,
      );
      return;
    }

    this.logger.log(
      `📝 Pre-service contract fully signed | document: ${documentId} | order: ${orderId}`,
    );

    try {
      // TODO: Update service order to allow execution
      // await this.serviceOrdersService.markContractSigned(orderId, {
      //   contractDocumentId: documentId,
      //   contractSignedAt: new Date(),
      //   status: 'READY_FOR_SCHEDULING',
      // });

      this.logger.log(
        `✅ Successfully processed pre-service contract signing | order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process pre-service contract signing | order: ${orderId}:`,
        error,
      );
      throw error;
    }
  }
}
