import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/**
 * Service to handle domain events and trigger notifications
 */
@Injectable()
export class NotificationEventHandlerService {
  private readonly logger = new Logger(NotificationEventHandlerService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Handle order assignment event
   */
  async handleOrderAssigned(event: any): Promise<void> {
    this.logger.log(`Handling order assigned event: ${event.orderId}`);

    try {
      // Send notification to provider
      if (event.providerId && event.providerEmail) {
        await this.notificationsService.sendNotification({
          templateCode: 'ORDER_ASSIGNED',
          recipientId: event.providerId,
          recipientEmail: event.providerEmail,
          recipientPhone: event.providerPhone,
          recipientName: event.providerName,
          channel: 'EMAIL',
          eventType: 'order.assigned',
          language: event.language || 'en',
          variables: {
            orderNumber: event.orderNumber,
            serviceType: event.serviceType,
            scheduledDate: event.scheduledDate,
            customerName: event.customerName,
            customerAddress: event.customerAddress,
            providerName: event.providerName,
          },
          contextType: 'service_order',
          contextId: event.orderId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'HIGH',
        });
      }

      // Send SMS if configured
      if (event.providerPhone) {
        await this.notificationsService.sendNotification({
          templateCode: 'ORDER_ASSIGNED',
          recipientId: event.providerId,
          recipientPhone: event.providerPhone,
          recipientName: event.providerName,
          channel: 'SMS',
          eventType: 'order.assigned',
          language: event.language || 'en',
          variables: {
            orderNumber: event.orderNumber,
            serviceType: event.serviceType,
            scheduledDate: event.scheduledDate,
          },
          contextType: 'service_order',
          contextId: event.orderId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'HIGH',
        });
      }

      this.logger.log(`Order assigned notifications sent for: ${event.orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order assigned notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle technician check-in event
   */
  async handleTechnicianCheckIn(event: any): Promise<void> {
    this.logger.log(`Handling technician check-in event: ${event.orderId}`);

    try {
      // Send notification to customer
      if (event.customerEmail) {
        await this.notificationsService.sendNotification({
          templateCode: 'TECH_ON_WAY',
          recipientEmail: event.customerEmail,
          recipientPhone: event.customerPhone,
          recipientName: event.customerName,
          channel: 'EMAIL',
          eventType: 'execution.checkin',
          language: event.language || 'en',
          variables: {
            technicianName: event.technicianName,
            estimatedArrival: event.estimatedArrival,
            orderNumber: event.orderNumber,
            serviceType: event.serviceType,
          },
          contextType: 'service_order',
          contextId: event.orderId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'NORMAL',
        });
      }

      // Send SMS alert
      if (event.customerPhone) {
        await this.notificationsService.sendNotification({
          templateCode: 'TECH_ON_WAY',
          recipientPhone: event.customerPhone,
          recipientName: event.customerName,
          channel: 'SMS',
          eventType: 'execution.checkin',
          language: event.language || 'en',
          variables: {
            technicianName: event.technicianName,
            estimatedArrival: event.estimatedArrival,
          },
          contextType: 'service_order',
          contextId: event.orderId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'NORMAL',
        });
      }

      this.logger.log(`Check-in notifications sent for: ${event.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send check-in notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle service order completion event
   */
  async handleOrderCompleted(event: any): Promise<void> {
    this.logger.log(`Handling order completed event: ${event.orderId}`);

    try {
      // Send notification to customer
      if (event.customerEmail) {
        await this.notificationsService.sendNotification({
          templateCode: 'ORDER_COMPLETED',
          recipientEmail: event.customerEmail,
          recipientName: event.customerName,
          channel: 'EMAIL',
          eventType: 'execution.checkout',
          language: event.language || 'en',
          variables: {
            orderNumber: event.orderNumber,
            serviceType: event.serviceType,
            completedDate: event.completedDate,
            technicianName: event.technicianName,
            wcfLink: event.wcfLink,
          },
          contextType: 'service_order',
          contextId: event.orderId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'NORMAL',
        });
      }

      this.logger.log(`Completion notifications sent for: ${event.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send completion notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle WCF ready event
   */
  async handleWcfReady(event: any): Promise<void> {
    this.logger.log(`Handling WCF ready event: ${event.wcfId}`);

    try {
      // Send notification to customer
      if (event.customerEmail) {
        await this.notificationsService.sendNotification({
          templateCode: 'WCF_READY',
          recipientEmail: event.customerEmail,
          recipientPhone: event.customerPhone,
          recipientName: event.customerName,
          channel: 'EMAIL',
          eventType: 'wcf.ready',
          language: event.language || 'en',
          variables: {
            orderNumber: event.orderNumber,
            wcfNumber: event.wcfNumber,
            wcfLink: event.wcfLink,
            completedDate: event.completedDate,
          },
          contextType: 'wcf',
          contextId: event.wcfId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'HIGH',
        });
      }

      // Send SMS with link
      if (event.customerPhone) {
        await this.notificationsService.sendNotification({
          templateCode: 'WCF_READY',
          recipientPhone: event.customerPhone,
          recipientName: event.customerName,
          channel: 'SMS',
          eventType: 'wcf.ready',
          language: event.language || 'en',
          variables: {
            orderNumber: event.orderNumber,
            wcfLink: event.wcfLink,
          },
          contextType: 'wcf',
          contextId: event.wcfId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'HIGH',
        });
      }

      this.logger.log(`WCF ready notifications sent for: ${event.wcfId}`);
    } catch (error) {
      this.logger.error(`Failed to send WCF ready notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle contract ready event
   */
  async handleContractReady(event: any): Promise<void> {
    this.logger.log(`Handling contract ready event: ${event.contractId}`);

    try {
      // Send notification to customer
      if (event.customerEmail) {
        await this.notificationsService.sendNotification({
          templateCode: 'CONTRACT_READY',
          recipientEmail: event.customerEmail,
          recipientName: event.customerName,
          channel: 'EMAIL',
          eventType: 'contract.ready',
          language: event.language || 'en',
          variables: {
            orderNumber: event.orderNumber,
            contractNumber: event.contractNumber,
            contractLink: event.contractLink,
            signatureDeadline: event.signatureDeadline,
          },
          contextType: 'contract',
          contextId: event.contractId,
          countryCode: event.countryCode,
          businessUnit: event.businessUnit,
          priority: 'HIGH',
        });
      }

      this.logger.log(`Contract ready notifications sent for: ${event.contractId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send contract ready notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
