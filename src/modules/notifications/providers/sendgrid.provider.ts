import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class SendGridProvider {
  private readonly logger = new Logger(SendGridProvider.name);
  private fromEmail: string;
  private fromName: string;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'noreply@yellowgrid.com',
    );
    this.fromName = this.configService.get<string>(
      'SENDGRID_FROM_NAME',
      'Yellow Grid Platform',
    );
    this.enabled = this.configService.get<boolean>('SENDGRID_ENABLED', false);

    if (this.enabled && apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid email provider initialized');
    } else {
      this.logger.warn(
        'SendGrid email provider is disabled or not configured properly',
      );
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.enabled) {
      this.logger.warn('Email sending is disabled - skipping');
      return {
        success: false,
        error: 'Email provider is disabled',
        errorCode: 'PROVIDER_DISABLED',
      };
    }

    try {
      this.logger.log(`Sending email to ${options.to}`);

      const msg = {
        to: options.to,
        from: options.from || {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      const [response] = await sgMail.send(msg as any);

      this.logger.log(
        `Email sent successfully. Message ID: ${response.headers['x-message-id']}`,
      );

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);

      // Extract SendGrid specific error information
      const errorCode =
        error.code || (error.response?.body?.errors?.[0]?.field) || 'UNKNOWN_ERROR';
      const errorMessage =
        error.message ||
        error.response?.body?.errors?.[0]?.message ||
        'Failed to send email';

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }

  async sendBulkEmail(emails: SendEmailOptions[]): Promise<EmailResult[]> {
    if (!this.enabled) {
      this.logger.warn('Email sending is disabled - skipping bulk send');
      return emails.map(() => ({
        success: false,
        error: 'Email provider is disabled',
        errorCode: 'PROVIDER_DISABLED',
      }));
    }

    const results: EmailResult[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
    }

    return results;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
