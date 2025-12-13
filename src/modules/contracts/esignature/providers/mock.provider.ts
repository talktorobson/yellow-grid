import { Injectable, Logger } from '@nestjs/common';
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
  EnvelopeStatus,
  SignerStatusType,
  HealthStatus,
  EnvelopeSummary,
} from '../interfaces/esignature-provider.interface';
import { nanoid } from 'nanoid';

/**
 * Mock E-Signature Provider
 *
 * Simulates e-signature operations for testing and development.
 * Does not make any external API calls.
 */
@Injectable()
export class MockESignatureProvider implements IESignatureProvider {
  readonly providerId = 'mock';
  readonly version = '1.0.0';

  private readonly logger = new Logger(MockESignatureProvider.name);
  private envelopes: Map<string, MockEnvelope> = new Map();

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  async createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResponse> {
    this.logger.log(`[MOCK] Creating envelope for contract ${request.contractId}`);

    const envelopeId = `mock-env-${nanoid(10)}`;

    const envelope: MockEnvelope = {
      envelopeId,
      contractId: request.contractId,
      status: EnvelopeStatus.CREATED,
      document: request.document,
      signers: request.signers.map((signer) => ({
        email: signer.email,
        name: signer.name,
        status: SignerStatusType.CREATED,
        routingOrder: signer.routingOrder,
      })),
      emailSubject: request.emailSubject,
      emailMessage: request.emailMessage,
      createdAt: new Date(),
      metadata: request.metadata,
    };

    this.envelopes.set(envelopeId, envelope);

    this.logger.log(`[MOCK] Envelope created: ${envelopeId}`);

    return {
      envelopeId,
      status: EnvelopeStatus.CREATED,
      providerData: {
        mock: true,
        contractId: request.contractId,
      },
    };
  }

  async sendForSignature(request: SendEnvelopeRequest): Promise<SendEnvelopeResponse> {
    this.logger.log(`[MOCK] Sending envelope ${request.envelopeId} for signature`);

    const envelope = this.envelopes.get(request.envelopeId);
    if (!envelope) {
      throw new Error(`Envelope ${request.envelopeId} not found`);
    }

    envelope.status = EnvelopeStatus.SENT;
    envelope.sentAt = new Date();

    // Update signer statuses
    envelope.signers.forEach((signer) => {
      signer.status = SignerStatusType.SENT;
    });

    this.logger.log(`[MOCK] Envelope ${request.envelopeId} sent successfully`);

    // Simulate signing URLs (for embedded signing)
    const signerUrls: Record<string, string> = {};
    envelope.signers.forEach((signer) => {
      signerUrls[signer.email] =
        `https://mock.esignature.com/sign/${envelope.envelopeId}/${signer.email}`;
    });

    return {
      envelopeId: request.envelopeId,
      status: EnvelopeStatus.SENT,
      signerUrls,
      sentAt: new Date(),
    };
  }

  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResponse> {
    this.logger.debug(`[MOCK] Getting status for envelope ${envelopeId}`);

    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) {
      throw new Error(`Envelope ${envelopeId} not found`);
    }

    return {
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      statusReason: 'Mock envelope',
      signers: envelope.signers.map((signer) => ({
        email: signer.email,
        name: signer.name,
        status: signer.status,
        viewedAt: signer.viewedAt,
        signedAt: signer.signedAt,
        declineReason: signer.declineReason,
        ipAddress: signer.ipAddress,
      })),
      createdAt: envelope.createdAt,
      sentAt: envelope.sentAt,
      completedAt: envelope.completedAt,
      expiresAt: envelope.expiresAt,
      providerData: {
        mock: true,
        contractId: envelope.contractId,
      },
    };
  }

  async downloadSignedDocument(envelopeId: string): Promise<DocumentDownloadResponse> {
    this.logger.log(`[MOCK] Downloading signed document from envelope ${envelopeId}`);

    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) {
      throw new Error(`Envelope ${envelopeId} not found`);
    }

    if (envelope.status !== EnvelopeStatus.COMPLETED) {
      throw new Error(`Envelope ${envelopeId} is not completed yet`);
    }

    // Return the original document with a "SIGNED" watermark note
    const signedContent = envelope.document.content;

    return {
      content: signedContent,
      contentType: 'application/pdf',
      fileName: `${envelope.document.name}-signed.pdf`,
      fileSize: Buffer.from(signedContent, 'base64').length,
      checksum: 'mock-checksum-' + envelopeId,
    };
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<VoidEnvelopeResponse> {
    this.logger.log(`[MOCK] Voiding envelope ${envelopeId}: ${reason}`);

    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) {
      throw new Error(`Envelope ${envelopeId} not found`);
    }

    envelope.status = EnvelopeStatus.VOIDED;
    envelope.voidedAt = new Date();
    envelope.voidReason = reason;

    this.logger.log(`[MOCK] Envelope ${envelopeId} voided successfully`);

    return {
      envelopeId,
      status: EnvelopeStatus.VOIDED,
      voidedAt: new Date(),
      voidReason: reason,
    };
  }

  async listEnvelopes(filters: ListEnvelopesFilters): Promise<ListEnvelopesResponse> {
    this.logger.debug('[MOCK] Listing envelopes with filters', filters);

    let envelopes = Array.from(this.envelopes.values());

    // Apply filters
    if (filters.status) {
      envelopes = envelopes.filter((env) => env.status === filters.status);
    }

    if (filters.fromDate) {
      envelopes = envelopes.filter((env) => env.createdAt >= filters.fromDate!);
    }

    if (filters.toDate) {
      envelopes = envelopes.filter((env) => env.createdAt <= filters.toDate!);
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedEnvelopes = envelopes.slice(start, end);

    return {
      envelopes: paginatedEnvelopes.map((env) => ({
        envelopeId: env.envelopeId,
        status: env.status,
        emailSubject: env.emailSubject,
        senderName: 'Mock Sender',
        createdAt: env.createdAt,
        sentAt: env.sentAt,
        completedAt: env.completedAt,
        signerCount: env.signers.length,
      })),
      totalCount: envelopes.length,
      page,
      pageSize,
    };
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return {
      status: HealthStatus.HEALTHY,
      latency: 1,
      checkedAt: new Date(),
      details: {
        provider: this.providerId,
        version: this.version,
        envelopeCount: this.envelopes.size,
      },
    };
  }

  async processWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<WebhookEventData> {
    this.logger.debug('[MOCK] Processing webhook', { payload, headers });

    // Mock webhook processing
    const event = payload as any;

    return {
      eventType: event.eventType,
      envelopeId: event.envelopeId,
      eventTimestamp: new Date(event.timestamp || Date.now()),
      data: event,
    };
  }

  // ==========================================================================
  // Mock Helper Methods (for testing)
  // ==========================================================================

  /**
   * Simulate a signer viewing the document
   */
  simulateView(envelopeId: string, signerEmail: string): void {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return;

    const signer = envelope.signers.find((s) => s.email === signerEmail);
    if (signer) {
      signer.status = SignerStatusType.DELIVERED;
      signer.viewedAt = new Date();
      envelope.status = EnvelopeStatus.DELIVERED;
    }
  }

  /**
   * Simulate a signer signing the document
   */
  simulateSign(envelopeId: string, signerEmail: string, ipAddress?: string): void {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return;

    const signer = envelope.signers.find((s) => s.email === signerEmail);
    if (signer) {
      signer.status = SignerStatusType.SIGNED;
      signer.signedAt = new Date();
      signer.ipAddress = ipAddress || '127.0.0.1';

      // Check if all signers have signed
      const allSigned = envelope.signers.every((s) => s.status === SignerStatusType.SIGNED);
      if (allSigned) {
        envelope.status = EnvelopeStatus.COMPLETED;
        envelope.completedAt = new Date();
      }
    }
  }

  /**
   * Simulate a signer declining the document
   */
  simulateDecline(envelopeId: string, signerEmail: string, reason: string): void {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return;

    const signer = envelope.signers.find((s) => s.email === signerEmail);
    if (signer) {
      signer.status = SignerStatusType.DECLINED;
      signer.declineReason = reason;
      envelope.status = EnvelopeStatus.DECLINED;
    }
  }

  /**
   * Simulate envelope expiration
   */
  simulateExpire(envelopeId: string): void {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return;

    envelope.status = EnvelopeStatus.EXPIRED;
  }

  /**
   * Clear all mock data
   */
  clearAll(): void {
    this.envelopes.clear();
    this.logger.log('[MOCK] All envelopes cleared');
  }

  /**
   * Get envelope for testing
   */
  getEnvelope(envelopeId: string): MockEnvelope | undefined {
    return this.envelopes.get(envelopeId);
  }
}

// ==========================================================================
// Mock Data Types
// ==========================================================================

interface MockEnvelope {
  envelopeId: string;
  contractId: string;
  status: EnvelopeStatus;
  document: {
    name: string;
    content: string;
    fileExtension: string;
    documentId: string;
  };
  signers: MockSigner[];
  emailSubject: string;
  emailMessage: string;
  createdAt: Date;
  sentAt?: Date;
  completedAt?: Date;
  voidedAt?: Date;
  expiresAt?: Date;
  voidReason?: string;
  metadata?: Record<string, string>;
}

interface MockSigner {
  email: string;
  name: string;
  status: SignerStatusType;
  routingOrder: number;
  viewedAt?: Date;
  signedAt?: Date;
  declineReason?: string;
  ipAddress?: string;
}
