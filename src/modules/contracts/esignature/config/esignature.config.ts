import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * E-Signature Configuration Service
 *
 * Provides configuration for e-signature providers.
 * Configuration is loaded from environment variables.
 */
@Injectable()
export class ESignatureConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the active e-signature provider
   * @returns 'docusign' | 'adobe-sign' | 'mock'
   */
  getProvider(): ESignatureProviderType {
    const provider = this.configService.get<string>('ESIGNATURE_PROVIDER', 'mock');
    return provider as ESignatureProviderType;
  }

  /**
   * Get DocuSign configuration
   */
  getDocuSignConfig(): DocuSignConfig {
    return {
      integrationKey: this.configService.getOrThrow<string>('DOCUSIGN_INTEGRATION_KEY'),
      userId: this.configService.getOrThrow<string>('DOCUSIGN_USER_ID'),
      accountId: this.configService.getOrThrow<string>('DOCUSIGN_ACCOUNT_ID'),
      privateKey: this.configService.getOrThrow<string>('DOCUSIGN_PRIVATE_KEY'),
      basePath: this.configService.get<string>(
        'DOCUSIGN_BASE_PATH',
        'https://demo.docusign.net/restapi',
      ),
      oAuthBasePath: this.configService.get<string>(
        'DOCUSIGN_OAUTH_BASE_PATH',
        'https://account-d.docusign.com',
      ),
      webhookSecret: this.configService.get<string>('DOCUSIGN_WEBHOOK_SECRET'),
      tokenExpirationBuffer: this.configService.get<number>(
        'DOCUSIGN_TOKEN_EXPIRATION_BUFFER',
        300,
      ), // 5 minutes
    };
  }

  /**
   * Get Adobe Sign configuration
   */
  getAdobeSignConfig(): AdobeSignConfig {
    return {
      integrationKey: this.configService.getOrThrow<string>('ADOBE_SIGN_INTEGRATION_KEY'),
      clientId: this.configService.getOrThrow<string>('ADOBE_SIGN_CLIENT_ID'),
      clientSecret: this.configService.getOrThrow<string>('ADOBE_SIGN_CLIENT_SECRET'),
      apiAccessPoint: this.configService.get<string>(
        'ADOBE_SIGN_API_ACCESS_POINT',
        'https://api.na1.adobesign.com/api/rest/v6',
      ),
      webhookSecret: this.configService.get<string>('ADOBE_SIGN_WEBHOOK_SECRET'),
      tokenExpirationBuffer: this.configService.get<number>(
        'ADOBE_SIGN_TOKEN_EXPIRATION_BUFFER',
        300,
      ), // 5 minutes
    };
  }

  /**
   * Get general e-signature settings
   */
  getGeneralSettings(): GeneralESignatureSettings {
    return {
      defaultExpirationDays: this.configService.get<number>(
        'ESIGNATURE_DEFAULT_EXPIRATION_DAYS',
        14,
      ),
      enableReminders: this.configService.get<boolean>('ESIGNATURE_ENABLE_REMINDERS', true),
      reminderFrequencyDays: this.configService.get<number>(
        'ESIGNATURE_REMINDER_FREQUENCY_DAYS',
        3,
      ),
      maxRetries: this.configService.get<number>('ESIGNATURE_MAX_RETRIES', 3),
      retryDelayMs: this.configService.get<number>('ESIGNATURE_RETRY_DELAY_MS', 1000),
      requestTimeoutMs: this.configService.get<number>('ESIGNATURE_REQUEST_TIMEOUT_MS', 30000),
      webhookEnabled: this.configService.get<boolean>('ESIGNATURE_WEBHOOK_ENABLED', true),
    };
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export type ESignatureProviderType = 'docusign' | 'adobe-sign' | 'mock';

export interface DocuSignConfig {
  /** DocuSign Integration Key (Client ID) */
  integrationKey: string;

  /** DocuSign User ID (for JWT authentication) */
  userId: string;

  /** DocuSign Account ID */
  accountId: string;

  /** Private key for JWT authentication (PEM format) */
  privateKey: string;

  /** DocuSign API base path */
  basePath: string;

  /** DocuSign OAuth base path */
  oAuthBasePath: string;

  /** Webhook signature secret */
  webhookSecret?: string;

  /** Token expiration buffer in seconds */
  tokenExpirationBuffer: number;
}

export interface AdobeSignConfig {
  /** Adobe Sign Integration Key */
  integrationKey: string;

  /** OAuth Client ID */
  clientId: string;

  /** OAuth Client Secret */
  clientSecret: string;

  /** Adobe Sign API access point */
  apiAccessPoint: string;

  /** Webhook signature secret */
  webhookSecret?: string;

  /** Token expiration buffer in seconds */
  tokenExpirationBuffer: number;
}

export interface GeneralESignatureSettings {
  /** Default envelope expiration in days */
  defaultExpirationDays: number;

  /** Enable automatic reminders */
  enableReminders: boolean;

  /** Reminder frequency in days */
  reminderFrequencyDays: number;

  /** Maximum retry attempts for failed requests */
  maxRetries: number;

  /** Delay between retries in milliseconds */
  retryDelayMs: number;

  /** Request timeout in milliseconds */
  requestTimeoutMs: number;

  /** Enable webhook processing */
  webhookEnabled: boolean;
}
