import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { InstallationOutcomeDto, SalesSystem } from '../dto';

@Injectable()
export class InstallationOutcomeWebhookService {
  private readonly logger = new Logger(
    InstallationOutcomeWebhookService.name,
  );
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send installation outcome to sales system webhook
   */
  async sendOutcome(
    outcome: InstallationOutcomeDto,
    salesSystem: SalesSystem,
    tenantId: string,
  ): Promise<void> {
    this.logger.log(
      `Sending installation outcome to ${salesSystem} for order: ${outcome.externalOrderId}`,
    );

    // Get webhook configuration
    const webhookUrl = this.getWebhookUrl(salesSystem, tenantId);
    const webhookSecret = this.getWebhookSecret(salesSystem, tenantId);

    if (!webhookUrl) {
      this.logger.warn(
        `No webhook URL configured for ${salesSystem}, skipping webhook delivery`,
      );
      return;
    }

    // Sign the payload
    const payload = JSON.stringify(outcome);
    const signature = this.signPayload(payload, webhookSecret);

    // Send with retry logic
    await this.sendWithRetry(webhookUrl, payload, signature, outcome.correlationId);
  }

  /**
   * Send webhook request with retry logic
   */
  private async sendWithRetry(
    url: string,
    payload: string,
    signature: string,
    correlationId: string,
    attempt: number = 1,
  ): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-FSM-Signature': signature,
            'X-FSM-Timestamp': new Date().toISOString(),
            'X-Correlation-ID': correlationId,
          },
          timeout: 30000,
        }),
      );

      if (response.status !== 200 && response.status !== 202) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      this.logger.log(
        `Installation outcome webhook delivered successfully to ${url}`,
      );
    } catch (error) {
      this.logger.error(
        `Webhook delivery failed (attempt ${attempt}/${this.MAX_RETRIES}): ${(error as Error).message}`,
      );

      if (attempt < this.MAX_RETRIES) {
        // Exponential backoff
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.sendWithRetry(url, payload, signature, correlationId, attempt + 1);
      }

      // Max retries exceeded - log to DLQ or alert system
      this.logger.error(
        `Max retries exceeded for webhook delivery to ${url}`,
      );
      throw error;
    }
  }

  /**
   * Get webhook URL for sales system
   */
  private getWebhookUrl(salesSystem: SalesSystem, tenantId: string): string {
    const key = `SALES_INTEGRATION_${salesSystem}_WEBHOOK_URL`;
    return this.configService.get<string>(key, '');
  }

  /**
   * Get webhook secret for sales system
   */
  private getWebhookSecret(
    salesSystem: SalesSystem,
    tenantId: string,
  ): string {
    const key = `SALES_INTEGRATION_${salesSystem}_WEBHOOK_SECRET`;
    return this.configService.get<string>(key, 'default-secret');
  }

  /**
   * Sign webhook payload with HMAC-SHA256
   */
  private signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp: string,
  ): boolean {
    // Prevent replay attacks (reject requests older than 5 minutes)
    const requestTime = new Date(timestamp);
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - requestTime.getTime());

    if (timeDiff > 5 * 60 * 1000) {
      return false;
    }

    // Verify HMAC signature
    const expectedSignature = this.signPayload(payload, secret);
    return signature === expectedSignature;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
