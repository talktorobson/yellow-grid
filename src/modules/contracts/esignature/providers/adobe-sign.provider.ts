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
import { AdobeSignConfig } from '../config/esignature.config';
import * as crypto from 'crypto';

/**
 * Adobe Sign E-Signature Provider Implementation
 *
 * Implements the IESignatureProvider interface for Adobe Sign.
 * Uses OAuth 2.0 for authentication.
 *
 * @see https://secure.na1.adobesign.com/public/docs/restapi/v6
 */
@Injectable()
export class AdobeSignProvider implements IESignatureProvider {
  readonly providerId = 'adobe-sign';
  readonly version = '1.0.0';

  private readonly logger = new Logger(AdobeSignProvider.name);
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(private readonly config: AdobeSignConfig) {
    this.httpClient = axios.create({
      baseURL: config.apiAccessPoint,
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
      this.logger.log(`Creating Adobe Sign agreement for contract ${request.contractId}`);

      // Step 1: Upload the document
      const transientDocumentId = await this.uploadTransientDocument(request.document);

      // Step 2: Create the agreement
      const agreementRequest = this.buildAgreementRequest(request, transientDocumentId);

      const response = await this.httpClient.post('/agreements', agreementRequest);

      this.logger.log(`Adobe Sign agreement created: ${response.data.id}`);

      return {
        envelopeId: response.data.id,
        status: EnvelopeStatus.CREATED,
        providerData: {
          agreementId: response.data.id,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create Adobe Sign agreement: ${error.message}`, error.stack);
      throw this.handleError(error);
    }
  }

  async sendForSignature(request: SendEnvelopeRequest): Promise<SendEnvelopeResponse> {
    try {
      this.logger.log(`Sending Adobe Sign agreement ${request.envelopeId} for signature`);

      // In Adobe Sign, agreements are sent automatically when created with state: 'IN_PROCESS'
      // If created in draft, we need to update the state
      const response = await this.httpClient.put(`/agreements/${request.envelopeId}/state`, {
        state: 'IN_PROCESS',
      });

      this.logger.log(`Adobe Sign agreement ${request.envelopeId} sent successfully`);

      return {
        envelopeId: request.envelopeId,
        status: EnvelopeStatus.SENT,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send Adobe Sign agreement ${request.envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResponse> {
    try {
      this.logger.debug(`Getting status for Adobe Sign agreement ${envelopeId}`);

      const response = await this.httpClient.get(`/agreements/${envelopeId}`);

      const agreement = response.data;

      // Get participant info
      const participantsResponse = await this.httpClient.get(
        `/agreements/${envelopeId}/members/participantSets`,
      );

      return {
        envelopeId: agreement.id,
        status: this.mapAdobeSignStatus(agreement.status),
        statusReason: agreement.state,
        signers: this.mapAdobeSignParticipants(participantsResponse.data.participantSets),
        createdAt: new Date(agreement.createdDate),
        sentAt: agreement.latestVersionId ? new Date(agreement.createdDate) : undefined,
        completedAt:
          agreement.signatureType === 'ESIGN' && agreement.status === 'SIGNED'
            ? new Date(agreement.latestVersionId)
            : undefined,
        expiresAt: agreement.expirationTime ? new Date(agreement.expirationTime) : undefined,
        providerData: {
          state: agreement.state,
          signatureType: agreement.signatureType,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get status for Adobe Sign agreement ${envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async downloadSignedDocument(envelopeId: string): Promise<DocumentDownloadResponse> {
    try {
      this.logger.log(`Downloading signed document from Adobe Sign agreement ${envelopeId}`);

      const response = await this.httpClient.get(`/agreements/${envelopeId}/combinedDocument`, {
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/pdf',
        },
      });

      const buffer = Buffer.from(response.data);
      const content = buffer.toString('base64');
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      this.logger.log(`Downloaded signed document from agreement ${envelopeId}`);

      return {
        content,
        contentType: 'application/pdf',
        fileName: `contract-${envelopeId}-signed.pdf`,
        fileSize: buffer.length,
        checksum,
      };
    } catch (error) {
      this.logger.error(
        `Failed to download document from Adobe Sign agreement ${envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<VoidEnvelopeResponse> {
    try {
      this.logger.log(`Cancelling Adobe Sign agreement ${envelopeId}: ${reason}`);

      await this.httpClient.put(`/agreements/${envelopeId}/state`, {
        state: 'CANCELLED',
        agreementCancellationInfo: {
          comment: reason,
        },
      });

      this.logger.log(`Adobe Sign agreement ${envelopeId} cancelled successfully`);

      return {
        envelopeId,
        status: EnvelopeStatus.VOIDED,
        voidedAt: new Date(),
        voidReason: reason,
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel Adobe Sign agreement ${envelopeId}: ${error.message}`,
        error.stack,
      );
      throw this.handleError(error);
    }
  }

  async listEnvelopes(filters: ListEnvelopesFilters): Promise<ListEnvelopesResponse> {
    try {
      this.logger.debug('Listing Adobe Sign agreements with filters', filters);

      const params: Record<string, string> = {
        pageSize: (filters.pageSize || 25).toString(),
      };

      if (filters.status) {
        params.status = this.mapToAdobeSignStatus(filters.status);
      }

      const response = await this.httpClient.get('/agreements', {
        params,
      });

      const agreements = response.data.userAgreementList || [];

      return {
        envelopes: agreements.map((agreement: any) => this.mapToEnvelopeSummary(agreement)),
        totalCount: agreements.length, // Adobe Sign doesn't provide total count easily
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
      };
    } catch (error) {
      this.logger.error(`Failed to list Adobe Sign agreements: ${error.message}`, error.stack);
      throw this.handleError(error);
    }
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now();

    try {
      await this.ensureAuthenticated();

      // Simple API call to check connectivity
      await this.httpClient.get('/baseUris');

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
      this.logger.debug('Processing Adobe Sign webhook', { headers });

      // Verify webhook signature if secret is configured
      if (this.config.webhookSecret) {
        this.verifyWebhookSignature(payload, headers);
      }

      const event = payload as any;

      return {
        eventType: this.mapAdobeSignEvent(event.event),
        envelopeId: event.agreement?.id || event.agreementId,
        eventTimestamp: new Date(event.eventDate),
        data: event,
        signer: event.participant
          ? {
              email: event.participant.email,
              name: event.participant.name || event.participant.email,
              status: this.mapAdobeSignParticipantStatus(event.participant.status),
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to process Adobe Sign webhook: ${error.message}`, error.stack);
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
      this.logger.debug('Authenticating with Adobe Sign using OAuth 2.0');

      const tokenEndpoint = `${this.config.apiAccessPoint.replace('/api/rest/v6', '')}/oauth/token`;

      const response = await axios.post(
        tokenEndpoint,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'agreement_write:account agreement_read:account',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);

      this.logger.log('Successfully authenticated with Adobe Sign');
    } catch (error) {
      this.logger.error(`Adobe Sign authentication failed: ${error.message}`, error.stack);
      throw new ESignatureProviderError(
        'Authentication failed',
        ESignatureErrorCode.AUTHENTICATION_FAILED,
        this.providerId,
        { error: error.message },
      );
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async uploadTransientDocument(document: any): Promise<string> {
    try {
      const formData = new FormData();
      const buffer = Buffer.from(document.content, 'base64');
      const blob = new Blob([buffer], { type: 'application/pdf' });

      formData.append('File', blob, document.name);

      const response = await this.httpClient.post('/transientDocuments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.transientDocumentId;
    } catch (error) {
      this.logger.error(`Failed to upload transient document: ${error.message}`, error.stack);
      throw error;
    }
  }

  private buildAgreementRequest(request: CreateEnvelopeRequest, transientDocumentId: string): any {
    return {
      fileInfos: [
        {
          transientDocumentId,
        },
      ],
      name: request.emailSubject,
      participantSetsInfo: request.signers
        .sort((a, b) => a.routingOrder - b.routingOrder)
        .map((signer, index) => ({
          order: signer.routingOrder,
          role: 'SIGNER',
          memberInfos: [
            {
              email: signer.email,
              name: signer.name,
              ...(signer.phoneNumber && {
                securityOption: {
                  authenticationMethod: 'PHONE',
                  phoneInfo: {
                    phone: signer.phoneNumber,
                  },
                },
              }),
            },
          ],
        })),
      signatureType: 'ESIGN',
      state: 'DRAFT', // Create as draft, send later
      emailOption: {
        sendOptions: {
          initEmails: 'ALL',
          completionEmails: 'ALL',
        },
      },
      ...(request.expiresAt && {
        externalId: {
          id: request.contractId,
        },
        daysUntilSigningDeadline: Math.ceil(
          (request.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      }),
      ...(request.metadata && {
        ccs: [], // Could add CC recipients if needed
        message: request.emailMessage,
      }),
    };
  }

  private mapAdobeSignStatus(status: string): EnvelopeStatus {
    const statusMap: Record<string, EnvelopeStatus> = {
      DRAFT: EnvelopeStatus.CREATED,
      IN_PROCESS: EnvelopeStatus.SENT,
      OUT_FOR_SIGNATURE: EnvelopeStatus.SENT,
      WAITING_FOR_MY_SIGNATURE: EnvelopeStatus.DELIVERED,
      SIGNED: EnvelopeStatus.COMPLETED,
      APPROVED: EnvelopeStatus.COMPLETED,
      DELIVERED: EnvelopeStatus.COMPLETED,
      CANCELLED: EnvelopeStatus.VOIDED,
      EXPIRED: EnvelopeStatus.EXPIRED,
      DECLINED: EnvelopeStatus.DECLINED,
    };

    return statusMap[status] || EnvelopeStatus.CREATED;
  }

  private mapToAdobeSignStatus(status: EnvelopeStatus): string {
    const statusMap: Record<EnvelopeStatus, string> = {
      [EnvelopeStatus.CREATED]: 'DRAFT',
      [EnvelopeStatus.SENT]: 'OUT_FOR_SIGNATURE',
      [EnvelopeStatus.DELIVERED]: 'OUT_FOR_SIGNATURE',
      [EnvelopeStatus.COMPLETED]: 'SIGNED',
      [EnvelopeStatus.DECLINED]: 'DECLINED',
      [EnvelopeStatus.VOIDED]: 'CANCELLED',
      [EnvelopeStatus.EXPIRED]: 'EXPIRED',
    };

    return statusMap[status] || 'DRAFT';
  }

  private mapAdobeSignParticipants(participantSets: any[]): SignerStatus[] {
    const signers: SignerStatus[] = [];

    for (const set of participantSets || []) {
      for (const member of set.memberInfos || []) {
        signers.push({
          email: member.email,
          name: member.name || member.email,
          status: this.mapAdobeSignParticipantStatus(member.status),
          viewedAt: member.deliveredDate ? new Date(member.deliveredDate) : undefined,
          signedAt: member.completedDate ? new Date(member.completedDate) : undefined,
        });
      }
    }

    return signers;
  }

  private mapAdobeSignParticipantStatus(status: string): SignerStatusType {
    const statusMap: Record<string, SignerStatusType> = {
      WAITING_FOR_MY_SIGNATURE: SignerStatusType.SENT,
      COMPLETED: SignerStatusType.SIGNED,
      DECLINED: SignerStatusType.DECLINED,
      DELEGATED: SignerStatusType.AUTORESPONDED,
    };

    return statusMap[status] || SignerStatusType.CREATED;
  }

  private mapAdobeSignEvent(event: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      AGREEMENT_CREATED: WebhookEventType.ENVELOPE_SENT,
      AGREEMENT_ACTION_COMPLETED: WebhookEventType.ENVELOPE_COMPLETED,
      AGREEMENT_WORKFLOW_COMPLETED: WebhookEventType.ENVELOPE_COMPLETED,
      AGREEMENT_ACTION_DELEGATED: WebhookEventType.RECIPIENT_DELIVERED,
      AGREEMENT_ACTION_REQUESTED: WebhookEventType.RECIPIENT_SENT,
      AGREEMENT_RECALLED: WebhookEventType.ENVELOPE_VOIDED,
      AGREEMENT_REJECTED: WebhookEventType.ENVELOPE_DECLINED,
      AGREEMENT_EXPIRED: WebhookEventType.ENVELOPE_VOIDED,
    };

    return eventMap[event] || WebhookEventType.ENVELOPE_SENT;
  }

  private mapToEnvelopeSummary(agreement: any): EnvelopeSummary {
    return {
      envelopeId: agreement.id,
      status: this.mapAdobeSignStatus(agreement.status),
      emailSubject: agreement.name,
      senderName: agreement.sender || 'Unknown',
      createdAt: new Date(agreement.displayDate),
      sentAt: agreement.displayDate ? new Date(agreement.displayDate) : undefined,
      signerCount: 0, // Would need additional API call to get exact count
    };
  }

  private verifyWebhookSignature(payload: unknown, headers: Record<string, string>): void {
    const signature = headers['x-adobesign-clientid'] || headers['X-AdobeSign-ClientId'];
    if (!signature) {
      throw new ESignatureProviderError(
        'Missing webhook signature',
        ESignatureErrorCode.WEBHOOK_SIGNATURE_INVALID,
        this.providerId,
      );
    }

    // Adobe Sign uses client ID verification
    if (signature !== this.config.clientId) {
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
            'Agreement not found',
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
