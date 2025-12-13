import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface NotificationPreferenceData {
  userId: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  eventPreferences?: Record<
    string,
    {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    }
  >;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
}

export interface QuietHoursCheck {
  isQuietHours: boolean;
  reason?: string;
}

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create notification preferences for a user
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Create default notification preferences for a user
   */
  async createDefaultPreferences(userId: string) {
    this.logger.log(`Creating default notification preferences for user: ${userId}`);

    return this.prisma.notificationPreference.create({
      data: {
        userId,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        eventPreferences: {
          'order.assigned': { email: true, sms: true, push: true },
          'order.completed': { email: true, sms: false, push: true },
          'execution.checkin': { email: false, sms: true, push: true },
          'execution.checkout': { email: true, sms: false, push: true },
          'contract.ready': { email: true, sms: true, push: true },
          'wcf.ready': { email: true, sms: true, push: true },
        },
        quietHoursEnabled: false,
      },
    });
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(data: NotificationPreferenceData) {
    const { userId, ...updateData } = data;

    const dataToSave = {
      ...updateData,
      eventPreferences: updateData.eventPreferences as any,
    };

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...dataToSave,
      },
      update: dataToSave,
    });
  }

  /**
   * Check if user should receive notification based on preferences
   */
  async shouldSendNotification(
    userId: string,
    channel: 'EMAIL' | 'SMS' | 'PUSH',
    eventType: string,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Check global channel preference
    switch (channel) {
      case 'EMAIL':
        if (!preferences.emailEnabled) {
          this.logger.debug(`Email notifications disabled for user: ${userId}`);
          return false;
        }
        break;
      case 'SMS':
        if (!preferences.smsEnabled) {
          this.logger.debug(`SMS notifications disabled for user: ${userId}`);
          return false;
        }
        break;
      case 'PUSH':
        if (!preferences.pushEnabled) {
          this.logger.debug(`Push notifications disabled for user: ${userId}`);
          return false;
        }
        break;
    }

    // Check event-specific preferences
    const eventPrefs = preferences.eventPreferences as any;
    if (eventPrefs && eventPrefs[eventType]) {
      const channelKey = channel.toLowerCase();
      if (eventPrefs[eventType][channelKey] === false) {
        this.logger.debug(
          `${channel} notifications disabled for event ${eventType} for user: ${userId}`,
        );
        return false;
      }
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled) {
      const quietHoursCheck = this.isQuietHours(preferences);
      if (quietHoursCheck.isQuietHours) {
        this.logger.debug(`Quiet hours active for user: ${userId} - ${quietHoursCheck.reason}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isQuietHours(preferences: any): QuietHoursCheck {
    if (
      !preferences.quietHoursEnabled ||
      !preferences.quietHoursStart ||
      !preferences.quietHoursEnd
    ) {
      return { isQuietHours: false };
    }

    const timezone = preferences.quietHoursTimezone || 'Europe/Paris';
    const now = new Date();

    // Get current time in user's timezone
    const currentTime = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    let isQuiet = false;

    // Handle quiet hours that span midnight
    if (startMinutes > endMinutes) {
      isQuiet = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      isQuiet = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return {
      isQuietHours: isQuiet,
      reason: isQuiet
        ? `Quiet hours: ${preferences.quietHoursStart} - ${preferences.quietHoursEnd} (${timezone})`
        : undefined,
    };
  }

  /**
   * Opt user out of a specific notification channel
   */
  async optOut(userId: string, channel: 'EMAIL' | 'SMS' | 'PUSH') {
    const updateData: any = {};

    switch (channel) {
      case 'EMAIL':
        updateData.emailEnabled = false;
        break;
      case 'SMS':
        updateData.smsEnabled = false;
        break;
      case 'PUSH':
        updateData.pushEnabled = false;
        break;
    }

    return this.updatePreferences({
      userId,
      ...updateData,
    });
  }

  /**
   * Opt user back in to a specific notification channel
   */
  async optIn(userId: string, channel: 'EMAIL' | 'SMS' | 'PUSH') {
    const updateData: any = {};

    switch (channel) {
      case 'EMAIL':
        updateData.emailEnabled = true;
        break;
      case 'SMS':
        updateData.smsEnabled = true;
        break;
      case 'PUSH':
        updateData.pushEnabled = true;
        break;
    }

    return this.updatePreferences({
      userId,
      ...updateData,
    });
  }
}
