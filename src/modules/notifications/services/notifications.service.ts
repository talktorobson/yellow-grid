import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { KafkaProducerService } from '@/common/kafka/kafka-producer.service';
import { TwilioProvider, SmsResult } from '../providers/twilio.provider';
import { SendGridProvider, EmailResult } from '../providers/sendgrid.provider';
import { TemplateEngineService } from './template-engine.service';
import { NotificationPreferencesService } from './notification-preferences.service';

export interface SendNotificationOptions {
  templateCode: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  eventType: string;
  language?: string;
  variables: Record<string, any>;
  contextType?: string;
  contextId?: string;
  countryCode?: string;
  businessUnit?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
    private readonly twilioProvider: TwilioProvider,
    private readonly sendGridProvider: SendGridProvider,
    private readonly templateEngine: TemplateEngineService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Send a notification
   */
  async sendNotification(options: SendNotificationOptions): Promise<string | null> {
    const {
      templateCode,
      recipientId,
      recipientEmail,
      recipientPhone,
      recipientName,
      channel,
      eventType,
      language = 'en',
      variables,
      contextType,
      contextId,
      countryCode,
      businessUnit,
      priority = 'NORMAL',
      metadata,
    } = options;

    this.logger.log(
      `Sending ${channel} notification: ${templateCode} to ${recipientEmail || recipientPhone || recipientId}`,
    );

    // Check user preferences if recipientId is provided
    if (recipientId) {
      const shouldSend = await this.preferencesService.shouldSendNotification(
        recipientId,
        channel,
        eventType,
      );

      if (!shouldSend) {
        this.logger.log(`Notification skipped due to user preferences: ${recipientId}`);
        return null;
      }
    }

    // Render template
    const rendered = await this.templateEngine.renderTemplate({
      templateCode,
      language,
      variables,
      countryCode,
      businessUnit,
    });

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        templateId: null, // Will be populated by trigger/hook
        recipientId,
        recipientEmail,
        recipientPhone,
        recipientName,
        channel,
        eventType,
        priority,
        language,
        subject: rendered.subject,
        body: rendered.body,
        variables,
        status: 'PENDING',
        contextType,
        contextId,
        countryCode,
        businessUnit,
        metadata,
      },
    });

    // Send notification based on channel
    try {
      let result: EmailResult | SmsResult;

      switch (channel) {
        case 'EMAIL':
          result = await this.sendEmailNotification(
            recipientEmail,
            rendered.subject || 'Notification',
            rendered.body,
          );
          break;

        case 'SMS':
          result = await this.sendSmsNotification(
            recipientPhone,
            rendered.shortMessage || rendered.body,
          );
          break;

        case 'PUSH':
          // TODO: Implement push notification
          this.logger.warn('Push notifications not yet implemented');
          result = { success: false, error: 'Not implemented' };
          break;

        default:
          throw new Error(`Unsupported notification channel: ${channel}`);
      }

      // Update notification status
      await this.updateNotificationStatus(notification.id, result);

      // Publish event
      await this.publishNotificationEvent(notification, result.success);

      return notification.id;
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`, error.stack);

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    to: string | undefined,
    subject: string,
    html: string,
  ): Promise<EmailResult> {
    if (!to) {
      return {
        success: false,
        error: 'Recipient email is required',
        errorCode: 'MISSING_RECIPIENT',
      };
    }

    return this.sendGridProvider.sendEmail({
      to,
      subject,
      html,
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(to: string | undefined, body: string): Promise<SmsResult> {
    if (!to) {
      return {
        success: false,
        error: 'Recipient phone is required',
        errorCode: 'MISSING_RECIPIENT',
      };
    }

    return this.twilioProvider.sendSms({
      to,
      body,
    });
  }

  /**
   * Update notification status after sending
   */
  private async updateNotificationStatus(notificationId: string, result: EmailResult | SmsResult) {
    const updateData: any = {
      status: result.success ? 'SENT' : 'FAILED',
      providerMessageId: result.messageId,
      errorMessage: result.error,
      errorCode: result.errorCode,
    };

    if (result.success) {
      updateData.sentAt = new Date();
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: updateData,
    });
  }

  /**
   * Publish notification event to Kafka
   */
  private async publishNotificationEvent(notification: any, success: boolean) {
    const eventType = success
      ? 'communications.notification.sent'
      : 'communications.notification.failed';

    await this.kafka.send(eventType, {
      notificationId: notification.id,
      channel: notification.channel,
      eventType: notification.eventType,
      recipientId: notification.recipientId,
      status: notification.status,
      contextType: notification.contextType,
      contextId: notification.contextId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get notification by ID
   */
  async getNotification(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        template: true,
      },
    });
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options?: {
      channel?: 'EMAIL' | 'SMS' | 'PUSH';
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { channel, status, limit = 50, offset = 0 } = options || {};

    return this.prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(channel && { channel }),
        ...(status && { status: status as any }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    if (notification.status !== 'FAILED') {
      throw new Error(`Notification is not in FAILED status: ${notificationId}`);
    }

    // Create new notification with same data
    return this.sendNotification({
      templateCode: notification.eventType,
      recipientId: notification.recipientId || undefined,
      recipientEmail: notification.recipientEmail || undefined,
      recipientPhone: notification.recipientPhone || undefined,
      recipientName: notification.recipientName || undefined,
      channel: notification.channel as any,
      eventType: notification.eventType,
      language: notification.language,
      variables: notification.variables as Record<string, any>,
      contextType: notification.contextType || undefined,
      contextId: notification.contextId || undefined,
      countryCode: notification.countryCode || undefined,
      businessUnit: notification.businessUnit || undefined,
      priority: notification.priority as any,
      metadata: notification.metadata as Record<string, any>,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        readAt: null,
      },
    });
  }

  /**
   * Delete a notification
   */
  async delete(id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
