import { Injectable, Logger } from '@nestjs/common';
import { ESignatureProviderFactory } from './esignature-provider.factory';
import {
  IESignatureProvider,
  CreateEnvelopeRequest,
  EnvelopeResponse,
  SendEnvelopeRequest,
  SendEnvelopeResponse,
  EnvelopeStatusResponse,
  DocumentDownloadResponse,
  VoidEnvelopeResponse,
  ListEnvelopesFilters,
  ListEnvelopesResponse,
  ESignatureProviderError,
  ESignatureErrorCode,
} from './interfaces/esignature-provider.interface';
import { ESignatureConfig } from './config/esignature.config';

/**
 * E-Signature Service
 *
 * High-level service for e-signature operations.
 * Provides retry logic, error handling, and logging.
 */
@Injectable()
export class ESignatureService {
  private readonly logger = new Logger(ESignatureService.name);
  private provider: IESignatureProvider;

  constructor(
    private readonly providerFactory: ESignatureProviderFactory,
    private readonly config: ESignatureConfig,
  ) {
    this.provider = this.providerFactory.getProvider();
  }

  /**
   * Create an envelope with automatic retry on transient failures
   */
  async createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResponse> {
    return this.executeWithRetry(
      'createEnvelope',
      async () => this.provider.createEnvelope(request),
      request.contractId,
    );
  }

  /**
   * Send envelope for signature with automatic retry
   */
  async sendForSignature(request: SendEnvelopeRequest): Promise<SendEnvelopeResponse> {
    return this.executeWithRetry(
      'sendForSignature',
      async () => this.provider.sendForSignature(request),
      request.envelopeId,
    );
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResponse> {
    return this.executeWithRetry(
      'getEnvelopeStatus',
      async () => this.provider.getEnvelopeStatus(envelopeId),
      envelopeId,
    );
  }

  /**
   * Download signed document with automatic retry
   */
  async downloadSignedDocument(envelopeId: string): Promise<DocumentDownloadResponse> {
    return this.executeWithRetry(
      'downloadSignedDocument',
      async () => this.provider.downloadSignedDocument(envelopeId),
      envelopeId,
    );
  }

  /**
   * Void/cancel an envelope
   */
  async voidEnvelope(envelopeId: string, reason: string): Promise<VoidEnvelopeResponse> {
    return this.executeWithRetry(
      'voidEnvelope',
      async () => this.provider.voidEnvelope(envelopeId, reason),
      envelopeId,
    );
  }

  /**
   * List envelopes with filters
   */
  async listEnvelopes(filters: ListEnvelopesFilters): Promise<ListEnvelopesResponse> {
    return this.executeWithRetry(
      'listEnvelopes',
      async () => this.provider.listEnvelopes(filters),
      'list',
    );
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.providerFactory.healthCheck();
  }

  /**
   * Process webhook event
   */
  async processWebhook(payload: unknown, headers: Record<string, string>) {
    try {
      return await this.provider.processWebhook(payload, headers);
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      providerId: this.provider.providerId,
      version: this.provider.version,
      availableProviders: this.providerFactory.getAvailableProviders(),
    };
  }

  // ==========================================================================
  // Retry Logic
  // ==========================================================================

  private async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    context: string,
  ): Promise<T> {
    const settings = this.config.getGeneralSettings();
    const maxRetries = settings.maxRetries;
    const baseDelay = settings.retryDelayMs;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.log(
            `Retrying ${operation} for ${context} (attempt ${attempt}/${maxRetries})`,
          );
        }

        const result = await fn();

        if (attempt > 0) {
          this.logger.log(`${operation} succeeded after ${attempt} retries`);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          this.logger.warn(
            `${operation} failed with non-retryable error: ${error.message}`,
            error.stack,
          );
          throw error;
        }

        // Check if we've exhausted retries
        if (attempt >= maxRetries) {
          this.logger.error(
            `${operation} failed after ${maxRetries} retries: ${error.message}`,
            error.stack,
          );
          break;
        }

        // Calculate exponential backoff delay
        const delay = this.calculateBackoffDelay(attempt, baseDelay);

        this.logger.warn(
          `${operation} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. ` +
            `Retrying in ${delay}ms...`,
        );

        await this.sleep(delay);
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    if (!(error instanceof ESignatureProviderError)) {
      return false; // Unknown errors are not retried
    }

    const retryableCodes = [
      ESignatureErrorCode.NETWORK_ERROR,
      ESignatureErrorCode.TIMEOUT_ERROR,
      ESignatureErrorCode.RATE_LIMIT_EXCEEDED,
      ESignatureErrorCode.PROVIDER_UNAVAILABLE,
      ESignatureErrorCode.TOKEN_EXPIRED,
    ];

    return retryableCodes.includes(error.code);
  }

  private calculateBackoffDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay * 0.3; // 30% jitter
    return Math.floor(exponentialDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
