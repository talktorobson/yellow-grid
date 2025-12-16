import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for send-notification task
 */
interface SendNotificationInput {
  serviceOrderId: string;
  notificationType: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  templateCode: string;
  recipientType: 'CUSTOMER' | 'PROVIDER' | 'OPERATOR' | 'WORK_TEAM';
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  variables: Record<string, any>;
  priority?: 'HIGH' | 'NORMAL' | 'LOW' | 'URGENT';
  eventType?: string;
  countryCode?: string;
  businessUnit?: string;
}

/**
 * Output variables from send-notification task
 */
interface SendNotificationOutput {
  notificationId: string;
  sentAt: string;
  channel: string;
  status: 'SENT' | 'QUEUED' | 'FAILED' | 'SKIPPED';
  errorMessage?: string;
}

/**
 * Send Notification Worker
 *
 * Task Type: send-notification
 *
 * Handles all notification sending across channels:
 * - Creates Notification record in database
 * - Resolves recipient details from recipientType+recipientId
 * - Supports EMAIL, SMS, PUSH, IN_APP channels
 */
@Injectable()
export class SendNotificationWorker extends BaseWorker<
  SendNotificationInput,
  SendNotificationOutput
> {
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
      templateCode,
      recipientType,
      recipientId,
      recipientEmail,
      recipientPhone,
      recipientName,
      variables,
      priority = 'NORMAL',
      eventType,
      countryCode,
      businessUnit,
    } = job.variables;

    const sentAt = new Date();

    try {
      // Resolve recipient details if not provided
      const recipient = await this.resolveRecipient(
        recipientType,
        recipientId,
        recipientEmail,
        recipientPhone,
        recipientName,
      );

      if (!recipient.email && !recipient.phone && notificationType !== 'IN_APP') {
        this.logger.warn(`No contact info for ${recipientType} ${recipientId}, skipping notification`);
        return {
          notificationId: '',
          sentAt: sentAt.toISOString(),
          channel: notificationType,
          status: 'SKIPPED',
          errorMessage: 'No contact information available',
        };
      }

      // Get template for content
      const template = await this.prisma.notificationTemplate.findFirst({
        where: { code: templateCode, isActive: true },
        include: {
          translations: {
            where: { language: 'en' }, // Default to English
          },
        },
      });

      // Render content (simple variable substitution)
      const content = this.renderContent(template, templateCode, variables);

      // Create notification record
      const notification = await this.prisma.notification.create({
        data: {
          templateId: template?.id || null,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientPhone: recipient.phone,
          recipientName: recipient.name,
          channel: this.mapNotificationType(notificationType) as any,
          eventType: eventType || templateCode,
          priority: priority as any,
          language: 'en',
          subject: content.subject,
          body: content.body,
          variables,
          status: 'PENDING',
          contextType: 'service_order',
          contextId: serviceOrderId,
          countryCode,
          businessUnit,
        },
      });

      // Attempt to send via appropriate channel
      let sendSuccess = false;
      let errorMessage: string | undefined;

      try {
        switch (notificationType) {
          case 'EMAIL':
            if (recipient.email) {
              await this.sendEmail(recipient.email, content.subject, content.body);
              sendSuccess = true;
            }
            break;
          case 'SMS':
            if (recipient.phone) {
              await this.sendSms(recipient.phone, content.shortMessage || content.body);
              sendSuccess = true;
            }
            break;
          case 'PUSH':
            if (recipient.id) {
              await this.sendPush(recipient.id, content.subject, content.body);
              sendSuccess = true;
            }
            break;
          case 'IN_APP':
            // IN_APP notifications are just DB records - no external send needed
            sendSuccess = true;
            break;
        }
      } catch (sendError: any) {
        errorMessage = sendError.message;
        this.logger.error(`Failed to send ${notificationType}: ${errorMessage}`);
      }

      // Update notification status
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: sendSuccess ? 'SENT' : 'FAILED',
          sentAt: sendSuccess ? sentAt : null,
          errorMessage,
        },
      });

      this.logger.log(
        `${sendSuccess ? 'Sent' : 'Failed'} ${notificationType} notification to ${recipientType} ${recipient.name || recipient.id} (template: ${templateCode})`,
      );

      return {
        notificationId: notification.id,
        sentAt: sentAt.toISOString(),
        channel: notificationType,
        status: sendSuccess ? 'SENT' : 'FAILED',
        errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create notification: ${error.message}`);

      return {
        notificationId: '',
        sentAt: sentAt.toISOString(),
        channel: notificationType,
        status: 'FAILED',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Resolve recipient details from type and ID
   */
  private async resolveRecipient(
    recipientType: string,
    recipientId?: string,
    email?: string,
    phone?: string,
    name?: string,
  ): Promise<{ id?: string; email?: string; phone?: string; name?: string }> {
    // If contact info already provided, use it
    if (email || phone) {
      return { id: recipientId, email, phone, name };
    }

    if (!recipientId) {
      return {};
    }

    // Look up contact info based on recipient type
    if (recipientType === 'CUSTOMER') {
      // Customer info is embedded in ServiceOrder, not a separate table
      // For now, return just the ID - actual info should be passed in variables
      return { id: recipientId };
    }
    
    if (recipientType === 'PROVIDER') {
      const provider = await this.prisma.provider.findUnique({
        where: { id: recipientId },
        select: { id: true, email: true, phone: true, name: true },
      });
      return {
        id: provider?.id,
        email: provider?.email || undefined,
        phone: provider?.phone || undefined,
        name: provider?.name,
      };
    }
    
    if (recipientType === 'OPERATOR') {
      const operator = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      return {
        id: operator?.id,
        email: operator?.email || undefined,
        name: operator ? `${operator.firstName || ''} ${operator.lastName || ''}`.trim() : undefined,
      };
    }
    
    if (recipientType === 'WORK_TEAM') {
      // Work teams don't have direct contact - get from parent provider
      const workTeam = await this.prisma.workTeam.findUnique({
        where: { id: recipientId },
        include: { provider: { select: { id: true, email: true, phone: true, name: true } } },
      });
      return {
        id: workTeam?.id,
        email: workTeam?.provider?.email || undefined,
        phone: workTeam?.provider?.phone || undefined,
        name: workTeam?.name || workTeam?.provider?.name,
      };
    }

    return { id: recipientId };
  }

  private mapNotificationType(type: string): 'EMAIL' | 'SMS' | 'PUSH' | 'SYSTEM' {
    const mapping: Record<string, 'EMAIL' | 'SMS' | 'PUSH' | 'SYSTEM'> = {
      EMAIL: 'EMAIL',
      SMS: 'SMS',
      PUSH: 'PUSH',
      IN_APP: 'SYSTEM',
    };
    return mapping[type] || 'SYSTEM';
  }

  private renderContent(
    template: any,
    templateCode: string,
    variables: Record<string, any>,
  ): { subject: string; body: string; shortMessage?: string } {
    // Use template if available
    if (template?.translations?.[0]) {
      const t = template.translations[0];
      return {
        subject: this.substituteVariables(t.subject || '', variables),
        body: this.substituteVariables(t.body || '', variables),
        shortMessage: t.shortMessage ? this.substituteVariables(t.shortMessage, variables) : undefined,
      };
    }

    // Fallback to hardcoded templates
    const fallbackTemplates: Record<string, { subject: string; body: string }> = {
      offer_sent: {
        subject: 'New Service Assignment Offer',
        body: `You have a new service assignment offer for order ${variables.serviceOrderId || 'N/A'}`,
      },
      offer_accepted: {
        subject: 'Assignment Confirmed',
        body: `Provider ${variables.providerName || 'Provider'} has accepted the assignment for order ${variables.serviceOrderId || 'N/A'}`,
      },
      offer_declined: {
        subject: 'Assignment Declined',
        body: `Provider ${variables.providerName || 'Provider'} has declined the assignment. Reason: ${variables.reason || 'Not specified'}`,
      },
      scheduled: {
        subject: 'Service Scheduled',
        body: `Your service has been scheduled for ${variables.scheduledDate || 'the requested date'}`,
      },
      reminder: {
        subject: 'Service Reminder',
        body: `Reminder: Your service is scheduled for tomorrow at ${variables.scheduledTime || 'the scheduled time'}`,
      },
      go_blocked: {
        subject: 'Service Execution Blocked',
        body: `Service execution is blocked: ${variables.reason || 'Please contact support'}`,
      },
      completed: {
        subject: 'Service Completed',
        body: `Your service has been completed successfully. Thank you for choosing us!`,
      },
    };

    return fallbackTemplates[templateCode] || { subject: 'Notification', body: 'You have a new notification' };
  }

  private substituteVariables(text: string, variables: Record<string, any>): string {
    return text.replaceAll(/\{\{(\w+)\}\}/g, (_, key) => variables[key]?.toString() || '');
  }

  // Placeholder methods for actual notification sending
  // These log and return success - in production, integrate with actual services
  private async sendEmail(email: string, subject: string, body: string): Promise<void> {
    // Production: Integrate with NotificationsService or external email provider (SendGrid, SES, etc.)
    this.logger.debug(`[EMAIL] Sending to ${email}: ${subject}`);
    // For now, just log. Real implementation:
    // await this.notificationsService.sendEmail({ to: email, subject, html: body });
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    // Production: Integrate with NotificationsService or Twilio/Vonage
    this.logger.debug(`[SMS] Sending to ${phone}: ${message.substring(0, 50)}...`);
    // For now, just log. Real implementation:
    // await this.notificationsService.sendSms({ to: phone, body: message });
  }

  private async sendPush(userId: string, title: string, body: string): Promise<void> {
    // Production: Integrate with Firebase Cloud Messaging or OneSignal
    this.logger.debug(`[PUSH] Sending to user ${userId}: ${title}`);
    // For now, just log. Real implementation:
    // await this.fcmService.sendToUser(userId, { title, body });
  }
}
