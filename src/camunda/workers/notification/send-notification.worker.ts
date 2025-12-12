import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Input variables for send-notification task
 */
interface SendNotificationInput {
  serviceOrderId: string;
  notificationType: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  templateId: string;
  recipientType: 'CUSTOMER' | 'PROVIDER' | 'OPERATOR' | 'WORK_TEAM';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  variables: Record<string, any>;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

/**
 * Output variables from send-notification task
 */
interface SendNotificationOutput {
  notificationId: string;
  sentAt: string;
  channel: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  errorMessage?: string;
}

/**
 * Send Notification Worker
 * 
 * Task Type: send-notification
 * 
 * Handles all notification sending across channels:
 * - Email
 * - SMS
 * - Push notifications
 * - In-app notifications
 */
@Injectable()
export class SendNotificationWorker extends BaseWorker<SendNotificationInput, SendNotificationOutput> {
  protected readonly logger = new Logger(SendNotificationWorker.name);
  readonly taskType = 'send-notification';
  readonly timeout = 30000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<SendNotificationInput>): Promise<SendNotificationOutput> {
    const {
      serviceOrderId,
      notificationType,
      templateId,
      recipientType,
      recipientId,
      recipientEmail,
      recipientPhone,
      variables,
      priority = 'NORMAL',
    } = job.variables;

    const sentAt = new Date();
    let status: SendNotificationOutput['status'] = 'SENT';
    let errorMessage: string | undefined;

    try {
      // Create notification record
      const notification = await this.prisma.notification.create({
        data: {
          userId: recipientId,
          type: this.mapNotificationType(notificationType),
          title: this.getTitle(templateId, variables),
          message: this.getMessage(templateId, variables),
          priority: priority,
          status: 'SENT',
          serviceOrderId,
          sentAt,
        },
      });

      // Send via appropriate channel
      switch (notificationType) {
        case 'EMAIL':
          await this.sendEmail(recipientEmail!, templateId, variables);
          break;
        case 'SMS':
          await this.sendSms(recipientPhone!, templateId, variables);
          break;
        case 'PUSH':
          await this.sendPush(recipientId, templateId, variables);
          break;
        case 'IN_APP':
          // Already created notification record
          break;
      }

      this.logger.log(
        `Sent ${notificationType} notification to ${recipientType} ${recipientId} ` +
        `(template: ${templateId})`
      );

      return {
        notificationId: notification.id,
        sentAt: sentAt.toISOString(),
        channel: notificationType,
        status: 'SENT',
      };
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      
      return {
        notificationId: '',
        sentAt: sentAt.toISOString(),
        channel: notificationType,
        status: 'FAILED',
        errorMessage: error.message,
      };
    }
  }

  private mapNotificationType(type: string): string {
    const mapping: Record<string, string> = {
      EMAIL: 'EMAIL',
      SMS: 'SMS',
      PUSH: 'PUSH',
      IN_APP: 'SYSTEM',
    };
    return mapping[type] || 'SYSTEM';
  }

  private getTitle(templateId: string, variables: Record<string, any>): string {
    const templates: Record<string, string> = {
      'offer_sent': 'New Service Assignment Offer',
      'offer_accepted': 'Assignment Confirmed',
      'offer_declined': 'Assignment Declined',
      'scheduled': 'Service Scheduled',
      'reminder': 'Service Reminder',
      'go_blocked': 'Service Execution Blocked',
      'completed': 'Service Completed',
    };
    return templates[templateId] || 'Notification';
  }

  private getMessage(templateId: string, variables: Record<string, any>): string {
    // Simple template rendering
    const templates: Record<string, string> = {
      'offer_sent': `You have a new service assignment offer for order ${variables.serviceOrderId}`,
      'offer_accepted': `Provider ${variables.providerName} accepted the assignment`,
      'scheduled': `Your service is scheduled for ${variables.scheduledDate}`,
      'reminder': `Reminder: Service scheduled for tomorrow`,
      'go_blocked': `Service execution blocked: ${variables.reason}`,
      'completed': `Service completed successfully`,
    };
    return templates[templateId] || 'You have a new notification';
  }

  // Placeholder methods for actual notification sending
  private async sendEmail(email: string, templateId: string, variables: Record<string, any>): Promise<void> {
    // TODO: Integrate with email service (SendGrid, SES, etc.)
    this.logger.debug(`[EMAIL] Would send to ${email}: ${templateId}`);
  }

  private async sendSms(phone: string, templateId: string, variables: Record<string, any>): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    this.logger.debug(`[SMS] Would send to ${phone}: ${templateId}`);
  }

  private async sendPush(userId: string, templateId: string, variables: Record<string, any>): Promise<void> {
    // TODO: Integrate with push service (Firebase, etc.)
    this.logger.debug(`[PUSH] Would send to user ${userId}: ${templateId}`);
  }
}
