import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
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
  HealthCheckResponse,
  WebhookEventData,
  ESignatureProviderError,
  ESignatureErrorCode,
  EnvelopeStatus,
  SignerStatusType,
  WebhookEventType,
  HealthStatus,
  EnvelopeSummary,
  SignerStatus,
} from '../interfaces/esignature-provider.interface';
import { DocuSignConfig } from '../config/esignature.config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * DocuSign E-Signature Provider Implementation
 *
 * Implements the IESignatureProvider interface for DocuSign.
 * Uses JWT authentication for server-to-server communication.
 *
 * @see https://developers.docusign.com/docs/esign-rest-api/
 */
@Injectable()
export class DocuSignProvider implements IESignatureProvider {
  readonly providerId = 'docusign';
  readonly version = '1.0.0';

  private readonly logger = new Logger(DocuSignProvider.name);
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(private readonly config: DocuSignConfig) {
    this.httpClient = axios.create({
      baseURL: config.basePath,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use(async (config) => {
      await this.ensureAuthenticated();
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      },
    );
  }

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  async createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResponse> {
    try {
      this.logger.log(`Creating DocuSign envelope for contract ${request.contractId}`);

      const envelopeDefinition = this.buildEnvelopeDefinition(request);

      const response = await this.httpClient.post(
        `/v2.1/accounts/${this.config.accountId}/envelopes`,
        envelopeDefinition,
      );

      this.logger.log(`DocuSign envelope created: ${response.data.envelopeId}`);

      return {
        envelopeId: response.data.envelopeId,
        status: this.mapDocuSignStatus(response.data.status),
        providerData: {
          uri: response.data.uri,
          statusDateTime: response.data.statusDateTime,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create DocuSign envelope: ${error.message}`, error.stack);
      throw this.handleError(error);
    }
  }

  async sendForSignature(request: SendEnvelopeRequest): Promise<SendEnvelopeResponse> {
    try {
      this.logger.log(`Sending DocuSign envelope ${request.envelopeId} for signature`);

      // DocuSign envelopes are sent by updating status to 'sent'
      const response = await this.httpClient.put(
        `/v2.1/accounts/${this.config.accountId}/envelopes/${request.envelopeId}`,
        {
          status: 'sent',
        },
      );

      this.logger.log(`DocuSign envelope ${request.envelopeId} sent successfully`);

      return {
        envelopeId: request.envelopeId,
        status: this.mapDocuSignStatus(response.data.status),
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send DocuSign envelope ${request.envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResponse> {
    try {
      this.logger.debug(`Getting status for DocuSign envelope ${envelopeId}`);

      const response = await this.httpClient.get(
        `/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}`,
        {
          params: {
            include: 'recipients',
          },
        },
      );

      const envelope = response.data;

      return {
        envelopeId: envelope.envelopeId,
        status: this.mapDocuSignStatus(envelope.status),
        statusReason: envelope.statusChangedDateTime,
        signers: this.mapDocuSignRecipients(envelope.recipients),
        createdAt: new Date(envelope.createdDateTime),
        sentAt: envelope.sentDateTime ? new Date(envelope.sentDateTime) : undefined,
        completedAt: envelope.completedDateTime ? new Date(envelope.completedDateTime) : undefined,
        expiresAt: envelope.expireDateTime ? new Date(envelope.expireDateTime) : undefined,
        providerData: {
          statusChangedDateTime: envelope.statusChangedDateTime,
          emailSubject: envelope.emailSubject,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get status for DocuSign envelope ${envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async downloadSignedDocument(envelopeId: string): Promise<DocumentDownloadResponse> {
    try {
      this.logger.log(`Downloading signed document from DocuSign envelope ${envelopeId}`);

      const response = await this.httpClient.get(
        `/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}/documents/combined`,
        {
          responseType: 'arraybuffer',
          headers: {
            Accept: 'application/pdf',
          },
        },
      );

      const buffer = Buffer.from(response.data);
      const content = buffer.toString('base64');
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      this.logger.log(`Downloaded signed document from envelope ${envelopeId}`);

      return {
        content,
        contentType: 'application/pdf',
        fileName: `contract-${envelopeId}-signed.pdf`,
        fileSize: buffer.length,
        checksum,
      };
    } catch (error) {
      this.logger.error(
        `Failed to download document from DocuSign envelope ${envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<VoidEnvelopeResponse> {
    try {
      this.logger.log(`Voiding DocuSign envelope ${envelopeId}: ${reason}`);

      const response = await this.httpClient.put(
        `/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}`,
        {
          status: 'voided',
          voidedReason: reason,
        },
      );

      this.logger.log(`DocuSign envelope ${envelopeId} voided successfully`);

      return {
        envelopeId,
        status: EnvelopeStatus.VOIDED,
        voidedAt: new Date(),
        voidReason: reason,
      };
    } catch (error) {
      this.logger.error(
        `Failed to void DocuSign envelope ${envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async listEnvelopes(filters: ListEnvelopesFilters): Promise<ListEnvelopesResponse> {
    try {
      this.logger.debug('Listing DocuSign envelopes with filters', filters);

      const params: Record<string, string> = {};

      if (filters.fromDate) {
        params.from_date = filters.fromDate.toISOString();
      }
      if (filters.toDate) {
        params.to_date = filters.toDate.toISOString();
      }
      if (filters.status) {
        params.status = this.mapToDocuSignStatus(filters.status);
      }

      const response = await this.httpClient.get(
        `/v2.1/accounts/${this.config.accountId}/envelopes`,
        {
          params,
        },
      );

      const envelopes = response.data.envelopes || [];

      return {
        envelopes: envelopes.map((env: any) => this.mapToEnvelopeSummary(env)),
        totalCount: response.data.totalSetSize || envelopes.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
      };
    } catch (error) {
      this.logger.error(`Failed to list DocuSign envelopes: ${error.message}`, error.stack);
      throw this.handleError(error);
    }
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now();

    try {
      await this.ensureAuthenticated();

      // Simple API call to check connectivity
      await this.httpClient.get(`/v2.1/accounts/${this.config.accountId}`);

      const latency = Date.now() - startTime;

      return {
        status: HealthStatus.HEALTHY,
        latency,
        checkedAt: new Date(),
        details: {
          provider: this.providerId,
          version: this.version,
          authenticated: this.accessToken !== null,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        status: HealthStatus.UNHEALTHY,
        latency,
        checkedAt: new Date(),
        error: error.message,
        details: {
          provider: this.providerId,
          version: this.version,
        },
      };
    }
  }

  async processWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<WebhookEventData> {
    try {
      this.logger.debug('Processing DocuSign webhook', { headers });

      // Verify webhook signature if secret is configured
      if (this.config.webhookSecret) {
        this.verifyWebhookSignature(payload, headers);
      }

      const event = payload as any;

      // DocuSign Connect webhook format
      return {
        eventType: this.mapDocuSignEvent(event.event),
        envelopeId: event.data.envelopeId || event.envelopeId,
        eventTimestamp: new Date(
          event.generatedDateTime || event.data.envelopeSummary?.statusChangedDateTime,
        ),
        data: event.data,
        signer: event.data.envelopeSummary?.recipients?.signers?.[0]
          ? {
              email: event.data.envelopeSummary.recipients.signers[0].email,
              name: event.data.envelopeSummary.recipients.signers[0].name,
              status: this.mapDocuSignRecipientStatus(
                event.data.envelopeSummary.recipients.signers[0].status,
              ),
              signedAt: event.data.envelopeSummary.recipients.signers[0].signedDateTime
                ? new Date(event.data.envelopeSummary.recipients.signers[0].signedDateTime)
                : undefined,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to process DocuSign webhook: ${error.message}`, error.stack);
      throw new ESignatureProviderError(
        'Webhook processing failed',
        ESignatureErrorCode.WEBHOOK_PROCESSING_ERROR,
        this.providerId,
        { error: error.message },
      );
    }
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  private async ensureAuthenticated(): Promise<void> {
    // Check if token is still valid (with buffer)
    if (this.accessToken && this.tokenExpiresAt) {
      const now = new Date();
      const expiryWithBuffer = new Date(
        this.tokenExpiresAt.getTime() - this.config.tokenExpirationBuffer * 1000,
      );

      if (now < expiryWithBuffer) {
        return; // Token is still valid
      }
    }

    // Get new token
    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    try {
      this.logger.debug('Authenticating with DocuSign using JWT');

      // Create JWT token
      const jwtToken = this.createJWT();

      // Exchange JWT for access token
      const oAuthClient = axios.create({
        baseURL: this.config.oAuthBasePath,
        timeout: 10000,
      });

      const response = await oAuthClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);

      this.logger.log('Successfully authenticated with DocuSign');
    } catch (error) {
      this.logger.error(`DocuSign authentication failed: ${error.message}`, error.stack);
      throw new ESignatureProviderError(
        'Authentication failed',
        ESignatureErrorCode.AUTHENTICATION_FAILED,
        this.providerId,
        { error: error.message },
      );
    }
  }

  private createJWT(): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: this.config.integrationKey,
      sub: this.config.userId,
      aud: this.config.oAuthBasePath.replace('https://', ''),
      iat: now,
      exp: now + 3600, // 1 hour
      scope: 'signature impersonation',
    };

    // Sign with RSA private key
    return jwt.sign(payload, this.config.privateKey, { algorithm: 'RS256' });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private buildEnvelopeDefinition(request: CreateEnvelopeRequest): any {
    const expiresInDays = request.expiresAt
      ? Math.ceil((request.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 14;

    return {
      emailSubject: request.emailSubject,
      emailBlurb: request.emailMessage,
      status: 'created', // Create as draft, send later
      documents: [
        {
          documentBase64: request.document.content,
          name: request.document.name,
          fileExtension: request.document.fileExtension,
          documentId: '1',
        },
      ],
      recipients: {
        signers: request.signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: (index + 1).toString(),
          routingOrder: signer.routingOrder.toString(),
          tabs: signer.tabs
            ? {
                signHereTabs: signer.tabs
                  .filter((tab) => tab.type === 'SIGNATURE')
                  .map((tab) => ({
                    documentId: '1',
                    pageNumber: tab.pageNumber.toString(),
                    xPosition: tab.xPosition.toString(),
                    yPosition: tab.yPosition.toString(),
                    optional: !tab.required,
                  })),
                initialHereTabs: signer.tabs
                  .filter((tab) => tab.type === 'INITIAL')
                  .map((tab) => ({
                    documentId: '1',
                    pageNumber: tab.pageNumber.toString(),
                    xPosition: tab.xPosition.toString(),
                    yPosition: tab.yPosition.toString(),
                    optional: !tab.required,
                  })),
                dateSignedTabs: signer.tabs
                  .filter((tab) => tab.type === 'DATE_SIGNED')
                  .map((tab) => ({
                    documentId: '1',
                    pageNumber: tab.pageNumber.toString(),
                    xPosition: tab.xPosition.toString(),
                    yPosition: tab.yPosition.toString(),
                  })),
              }
            : undefined,
          ...(signer.requireIdVerification && {
            identityVerification: {
              workflowId: 'default',
              inputOptions: [
                {
                  name: 'phone_number_list',
                  valueType: 'PhoneNumberList',
                  phoneNumberList: [{ countryCode: '+1', number: signer.phoneNumber || '' }],
                },
              ],
            },
          }),
        })),
      },
      notification: {
        useAccountDefaults: false,
        reminders: {
          reminderEnabled: true,
          reminderDelay: 3,
          reminderFrequency: 3,
        },
        expirations: {
          expireEnabled: true,
          expireAfter: expiresInDays.toString(),
          expireWarn: (expiresInDays - 3).toString(),
        },
      },
      customFields: {
        textCustomFields: request.metadata
          ? Object.entries(request.metadata).map(([name, value]) => ({
              name,
              value,
              show: 'false',
            }))
          : [],
      },
    };
  }

  private mapDocuSignStatus(status: string): EnvelopeStatus {
    const statusMap: Record<string, EnvelopeStatus> = {
      created: EnvelopeStatus.CREATED,
      sent: EnvelopeStatus.SENT,
      delivered: EnvelopeStatus.DELIVERED,
      completed: EnvelopeStatus.COMPLETED,
      declined: EnvelopeStatus.DECLINED,
      voided: EnvelopeStatus.VOIDED,
      expired: EnvelopeStatus.EXPIRED,
    };

    return statusMap[status.toLowerCase()] || EnvelopeStatus.CREATED;
  }

  private mapToDocuSignStatus(status: EnvelopeStatus): string {
    const statusMap: Record<EnvelopeStatus, string> = {
      [EnvelopeStatus.CREATED]: 'created',
      [EnvelopeStatus.SENT]: 'sent',
      [EnvelopeStatus.DELIVERED]: 'delivered',
      [EnvelopeStatus.COMPLETED]: 'completed',
      [EnvelopeStatus.DECLINED]: 'declined',
      [EnvelopeStatus.VOIDED]: 'voided',
      [EnvelopeStatus.EXPIRED]: 'expired',
    };

    return statusMap[status] || 'created';
  }

  private mapDocuSignRecipients(recipients: any): SignerStatus[] {
    if (!recipients || !recipients.signers) {
      return [];
    }

    return recipients.signers.map((signer: any) => ({
      email: signer.email,
      name: signer.name,
      status: this.mapDocuSignRecipientStatus(signer.status),
      viewedAt: signer.deliveredDateTime ? new Date(signer.deliveredDateTime) : undefined,
      signedAt: signer.signedDateTime ? new Date(signer.signedDateTime) : undefined,
      declineReason: signer.declinedReason,
      ipAddress: signer.ipAddress,
    }));
  }

  private mapDocuSignRecipientStatus(status: string): SignerStatusType {
    const statusMap: Record<string, SignerStatusType> = {
      created: SignerStatusType.CREATED,
      sent: SignerStatusType.SENT,
      delivered: SignerStatusType.DELIVERED,
      signed: SignerStatusType.SIGNED,
      declined: SignerStatusType.DECLINED,
      completed: SignerStatusType.COMPLETED,
      autoresponded: SignerStatusType.AUTORESPONDED,
    };

    return statusMap[status.toLowerCase()] || SignerStatusType.CREATED;
  }

  private mapDocuSignEvent(event: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'envelope-sent': WebhookEventType.ENVELOPE_SENT,
      'envelope-delivered': WebhookEventType.ENVELOPE_DELIVERED,
      'envelope-completed': WebhookEventType.ENVELOPE_COMPLETED,
      'envelope-declined': WebhookEventType.ENVELOPE_DECLINED,
      'envelope-voided': WebhookEventType.ENVELOPE_VOIDED,
      'recipient-sent': WebhookEventType.RECIPIENT_SENT,
      'recipient-delivered': WebhookEventType.RECIPIENT_DELIVERED,
      'recipient-completed': WebhookEventType.RECIPIENT_SIGNED,
      'recipient-declined': WebhookEventType.RECIPIENT_DECLINED,
      'recipient-authenticationfailed': WebhookEventType.RECIPIENT_AUTHENTICATION_FAILED,
    };

    return eventMap[event] || WebhookEventType.ENVELOPE_SENT;
  }

  private mapToEnvelopeSummary(envelope: any): EnvelopeSummary {
    return {
      envelopeId: envelope.envelopeId,
      status: this.mapDocuSignStatus(envelope.status),
      emailSubject: envelope.emailSubject,
      senderName: envelope.sender?.userName || 'Unknown',
      createdAt: new Date(envelope.createdDateTime),
      sentAt: envelope.sentDateTime ? new Date(envelope.sentDateTime) : undefined,
      completedAt: envelope.completedDateTime ? new Date(envelope.completedDateTime) : undefined,
      signerCount: envelope.recipients?.signers?.length || 0,
    };
  }

  private verifyWebhookSignature(payload: unknown, headers: Record<string, string>): void {
    const signature = headers['x-docusign-signature-1'] || headers['X-DocuSign-Signature-1'];
    if (!signature) {
      throw new ESignatureProviderError(
        'Missing webhook signature',
        ESignatureErrorCode.WEBHOOK_SIGNATURE_INVALID,
        this.providerId,
      );
    }

    const hmac = crypto.createHmac('sha256', this.config.webhookSecret!);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = hmac.digest('base64');

    if (signature !== expectedSignature) {
      throw new ESignatureProviderError(
        'Invalid webhook signature',
        ESignatureErrorCode.WEBHOOK_SIGNATURE_INVALID,
        this.providerId,
      );
    }
  }

  private handleError(error: any): ESignatureProviderError {
    if (error instanceof ESignatureProviderError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        if (status === 401) {
          return new ESignatureProviderError(
            'Authentication failed',
            ESignatureErrorCode.AUTHENTICATION_FAILED,
            this.providerId,
            { response: data },
          );
        }

        if (status === 403) {
          return new ESignatureProviderError(
            'Authorization failed',
            ESignatureErrorCode.AUTHORIZATION_FAILED,
            this.providerId,
            { response: data },
          );
        }

        if (status === 404) {
          return new ESignatureProviderError(
            'Envelope not found',
            ESignatureErrorCode.ENVELOPE_NOT_FOUND,
            this.providerId,
            { response: data },
          );
        }

        if (status === 429) {
          return new ESignatureProviderError(
            'Rate limit exceeded',
            ESignatureErrorCode.RATE_LIMIT_EXCEEDED,
            this.providerId,
            { response: data },
          );
        }

        return new ESignatureProviderError(
          data.message || 'Provider error',
          ESignatureErrorCode.PROVIDER_ERROR,
          this.providerId,
          { status, response: data },
        );
      }

      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return new ESignatureProviderError(
          'Request timeout',
          ESignatureErrorCode.TIMEOUT_ERROR,
          this.providerId,
        );
      }

      return new ESignatureProviderError(
        'Network error',
        ESignatureErrorCode.NETWORK_ERROR,
        this.providerId,
        { code: axiosError.code },
      );
    }

    return new ESignatureProviderError(
      error.message || 'Unknown error',
      ESignatureErrorCode.UNKNOWN_ERROR,
      this.providerId,
      { error },
    );
  }
}
