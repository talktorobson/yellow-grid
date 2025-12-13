import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class TwilioProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: twilio.Twilio;
  private fromNumber: string;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';
    this.enabled = this.configService.get<boolean>('TWILIO_ENABLED', false);

    if (this.enabled && accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio SMS provider initialized');
    } else {
      this.logger.warn('Twilio SMS provider is disabled or not configured properly');
    }
  }

  async sendSms(options: SendSmsOptions): Promise<SmsResult> {
    if (!this.enabled) {
      this.logger.warn('SMS sending is disabled - skipping');
      return {
        success: false,
        error: 'SMS provider is disabled',
        errorCode: 'PROVIDER_DISABLED',
      };
    }

    if (!this.client) {
      this.logger.error('Twilio client not initialized');
      return {
        success: false,
        error: 'Twilio client not initialized',
        errorCode: 'CLIENT_NOT_INITIALIZED',
      };
    }

    try {
      this.logger.log(`Sending SMS to ${options.to}`);

      const message = await this.client.messages.create({
        body: options.body,
        from: options.from || this.fromNumber,
        to: options.to,
      });

      this.logger.log(`SMS sent successfully. Message SID: ${message.sid}`);

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);

      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  async getMessageStatus(messageSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch message status: ${error.message}`, error.stack);
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.enabled && !!this.client;
  }
}
