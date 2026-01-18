import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../../common/kafka';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import { ServiceOrderState } from '@prisma/client';

/**
 * Contracts Event Handlers
 *
 * Handles Kafka events related to contracts, documents, and WCF (Work Closing Form),
 * triggering billing notifications and downstream workflows.
 */
@Injectable()
export class ContractsEventHandler {
  private readonly logger = new Logger(ContractsEventHandler.name);

  constructor(
    private readonly contractsService: ContractsService,
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

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

    const { documentId, orderId, documentType, allSignaturesComplete, documentUrl, tenantId } =
      event;

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

      // Send billing notification via Kafka event
      await this.kafkaProducer.send('billing.wcf.completed', {
        eventType: 'WCF_COMPLETED',
        orderId,
        documentId,
        documentUrl,
        tenantId,
        completedAt: new Date().toISOString(),
      });

      // Update service order status to COMPLETED
      await this.prisma.serviceOrder.update({
        where: { id: orderId },
        data: {
          state: ServiceOrderState.COMPLETED,
          stateChangedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Trigger invoice generation via Kafka event
      await this.kafkaProducer.send('billing.invoice.generate', {
        eventType: 'INVOICE_GENERATION_REQUESTED',
        orderId,
        documentId,
        documentUrl,
        tenantId,
        requestedAt: new Date().toISOString(),
      });

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

      // Get service order details for WCF generation
      const serviceOrder = await this.prisma.serviceOrder.findUnique({
        where: { id: orderId },
        include: {
          project: true,
          assignedProvider: true,
          service: true,
        },
      });

      if (!serviceOrder) {
        this.logger.error(`Service order ${orderId} not found`);
        return;
      }

      // Create WCF record
      const wcf = await this.prisma.workCompletionForm.create({
        data: {
          wcfNumber: `WCF-${serviceOrder.countryCode}-${Date.now()}`,
          version: 1,
          serviceOrderId: orderId,
          countryCode: serviceOrder.countryCode,
          businessUnit: serviceOrder.businessUnit,
          customerInfo: serviceOrder.customerInfo as any,
          technicianInfo: { technicianId, name: 'Technician' },
          providerInfo: {
            id: serviceOrder.assignedProviderId,
            name: serviceOrder.assignedProvider?.name,
          },
          serviceDate: new Date(),
          serviceLocation: serviceOrder.serviceAddress as any,
          workSummary: workPerformed?.summary || 'Work completed',
          workDetails: {
            description: workPerformed?.description || 'Service completed successfully',
            tasksCompleted: workPerformed?.tasks || [],
            partsUsed: partsUsed || [],
            photos: photos || [],
          },
          status: 'PENDING_SIGNATURE',
        },
      });

      this.logger.log(`📄 WCF created: ${wcf.wcfNumber}`);

      // Request e-signature via Kafka event (to be picked up by e-signature service)
      await this.kafkaProducer.send('contracts.signature.requested', {
        eventType: 'SIGNATURE_REQUESTED',
        documentType: 'WORK_ORDER',
        documentId: wcf.id,
        orderId,
        signers: [
          {
            role: 'CUSTOMER',
            name: serviceOrder.project?.customerName,
            email: serviceOrder.project?.customerEmail,
          },
          {
            role: 'TECHNICIAN',
            technicianId,
          },
        ],
      });

      // Check if follow-up is required
      if (requiresFollowUp) {
        this.logger.log(`🔄 Follow-up required | order: ${orderId} | Creating follow-up task`);

        // Create follow-up task
        await this.prisma.task.create({
          data: {
            taskType: 'FOLLOW_UP',
            priority: 'MEDIUM',
            status: 'OPEN',
            serviceOrderId: orderId,
            context: {
              appointmentId,
              reason: event.followUpReason || 'Follow-up required after service completion',
              originalWorkPerformed: workPerformed,
            },
            slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            countryCode: serviceOrder.countryCode,
            businessUnit: serviceOrder.businessUnit,
          },
        });

        this.logger.log(`✅ Follow-up task created for order ${orderId}`);
      }

      this.logger.log(`✅ Successfully processed appointment completion | order: ${orderId}`);
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

      // Find and update the contract associated with this order
      const contract = await this.prisma.contract.findFirst({
        where: { serviceOrderId: orderId },
        orderBy: { createdAt: 'desc' },
      });

      if (contract) {
        await this.prisma.contract.update({
          where: { id: contract.id },
          data: {
            status: 'PAID',
            // Store payment info in contract metadata if needed
          },
        });
      }

      // Update service order with payment information
      await this.prisma.serviceOrder.update({
        where: { id: orderId },
        data: {
          state: ServiceOrderState.VALIDATED,
          stateChangedAt: new Date(),
        },
      });

      // Send to ERP if ready
      if (readyForERP) {
        this.logger.log(
          `📤 Sending payment data to ERP | order: ${orderId} | payment: ${paymentId}`,
        );

        // Send payment data to ERP via Kafka event
        await this.kafkaProducer.send('erp.payment.sync', {
          eventType: 'PAYMENT_SYNC_REQUESTED',
          orderId,
          paymentId,
          transactionId,
          amount,
          syncedAt: new Date().toISOString(),
        });
      }

      this.logger.log(`✅ Successfully processed payment completion | order: ${orderId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process payment.completed event | order: ${orderId}:`, error);
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
      // Update service order to indicate contract is signed and ready for scheduling
      const serviceOrder = await this.prisma.serviceOrder.findUnique({
        where: { id: orderId },
      });

      if (serviceOrder) {
        // Update service order state - contract signed means ready for scheduling
        await this.prisma.serviceOrder.update({
          where: { id: orderId },
          data: {
            // Set contract signed flag and update state if applicable
            stateChangedAt: new Date(),
            // If order is still in CREATED state, move it to indicate it's ready
            ...(serviceOrder.state === 'CREATED' && { state: ServiceOrderState.SCHEDULED }),
          },
        });

        // Update contract status
        await this.prisma.contract.updateMany({
          where: {
            serviceOrderId: orderId,
            id: documentId,
          },
          data: {
            status: 'SIGNED',
            signedAt: new Date(),
          },
        });

        // Emit event for downstream processing
        await this.kafkaProducer.send('contracts.pre_service.signed', {
          eventType: 'PRE_SERVICE_CONTRACT_SIGNED',
          orderId,
          documentId,
          signedAt: new Date().toISOString(),
        });
      }

      this.logger.log(`✅ Successfully processed pre-service contract signing | order: ${orderId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to process pre-service contract signing | order: ${orderId}:`,
        error,
      );
      throw error;
    }
  }
}
