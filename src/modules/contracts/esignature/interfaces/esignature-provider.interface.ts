/**
 * E-Signature Provider Interface
 *
 * Provider-agnostic abstraction for electronic signature services.
 * Implementations: DocuSign, Adobe Sign, or any other e-signature provider.
 */

export interface IESignatureProvider {
  /**
   * Unique identifier for the provider implementation
   * @example 'docusign', 'adobe-sign'
   */
  readonly providerId: string;

  /**
   * Provider version (semantic versioning)
   */
  readonly version: string;

  /**
   * Create an envelope/agreement with document and signers
   */
  createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResponse>;

  /**
   * Send envelope for signature to all signers
   */
  sendForSignature(request: SendEnvelopeRequest): Promise<SendEnvelopeResponse>;

  /**
   * Get current status of an envelope/agreement
   */
  getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResponse>;

  /**
   * Download the signed document (PDF)
   */
  downloadSignedDocument(envelopeId: string): Promise<DocumentDownloadResponse>;

  /**
   * Void/cancel an envelope that hasn't been fully signed
   */
  voidEnvelope(envelopeId: string, reason: string): Promise<VoidEnvelopeResponse>;

  /**
   * List envelopes with optional filters
   */
  listEnvelopes(filters: ListEnvelopesFilters): Promise<ListEnvelopesResponse>;

  /**
   * Health check for the provider
   */
  healthCheck(): Promise<HealthCheckResponse>;

  /**
   * Process webhook event from the provider
   */
  processWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEventData>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateEnvelopeRequest {
  /** Internal contract ID */
  contractId: string;

  /** Document to be signed */
  document: DocumentData;

  /** List of signers */
  signers: SignerData[];

  /** Email subject */
  emailSubject: string;

  /** Email message body */
  emailMessage: string;

  /** Envelope expires after this date */
  expiresAt?: Date;

  /** Brand/customization settings */
  brandingOptions?: BrandingOptions;

  /** Additional metadata */
  metadata?: Record<string, string>;
}

export interface DocumentData {
  /** Document name */
  name: string;

  /** Document content (Base64 encoded PDF) */
  content: string;

  /** File extension (typically 'pdf') */
  fileExtension: string;

  /** Document ID reference */
  documentId: string;
}

export interface SignerData {
  /** Signer name */
  name: string;

  /** Signer email */
  email: string;

  /** Signer role/type */
  role: SignerRole;

  /** Signing order (1-based, 0 for parallel) */
  routingOrder: number;

  /** Phone number for SMS authentication */
  phoneNumber?: string;

  /** Require ID verification */
  requireIdVerification?: boolean;

  /** Signature fields/tabs */
  tabs?: SignatureTab[];
}

export enum SignerRole {
  SIGNER = 'SIGNER',
  CARBON_COPY = 'CARBON_COPY',
  CERTIFIED_DELIVERY = 'CERTIFIED_DELIVERY',
  IN_PERSON_SIGNER = 'IN_PERSON_SIGNER',
}

export interface SignatureTab {
  /** Tab type */
  type: TabType;

  /** Tab label */
  label: string;

  /** Is this tab required? */
  required: boolean;

  /** Page number (1-based) */
  pageNumber: number;

  /** X position (pixels from left) */
  xPosition: number;

  /** Y position (pixels from top) */
  yPosition: number;

  /** Width in pixels */
  width?: number;

  /** Height in pixels */
  height?: number;

  /** Tab value (for text fields) */
  value?: string;
}

export enum TabType {
  SIGNATURE = 'SIGNATURE',
  INITIAL = 'INITIAL',
  DATE_SIGNED = 'DATE_SIGNED',
  TEXT = 'TEXT',
  CHECKBOX = 'CHECKBOX',
  EMAIL = 'EMAIL',
  FULL_NAME = 'FULL_NAME',
}

export interface BrandingOptions {
  /** Company logo URL */
  logoUrl?: string;

  /** Primary brand color */
  primaryColor?: string;

  /** Email branding */
  emailBranding?: string;

  /** Custom domain for signature links */
  customDomain?: string;
}

export interface EnvelopeResponse {
  /** Provider's envelope/agreement ID */
  envelopeId: string;

  /** Current status */
  status: EnvelopeStatus;

  /** Provider-specific response data */
  providerData: Record<string, unknown>;
}

export interface SendEnvelopeRequest {
  /** Envelope ID to send */
  envelopeId: string;
}

export interface SendEnvelopeResponse {
  /** Envelope ID */
  envelopeId: string;

  /** Status after sending */
  status: EnvelopeStatus;

  /** Signer URLs (if embedded signing) */
  signerUrls?: Record<string, string>;

  /** When envelope was sent */
  sentAt: Date;
}

export interface EnvelopeStatusResponse {
  /** Envelope ID */
  envelopeId: string;

  /** Current status */
  status: EnvelopeStatus;

  /** Status reason/details */
  statusReason?: string;

  /** List of signers with their statuses */
  signers: SignerStatus[];

  /** When envelope was created */
  createdAt: Date;

  /** When envelope was sent */
  sentAt?: Date;

  /** When envelope was completed */
  completedAt?: Date;

  /** When envelope expires */
  expiresAt?: Date;

  /** Provider-specific data */
  providerData: Record<string, unknown>;
}

export interface SignerStatus {
  /** Signer email */
  email: string;

  /** Signer name */
  name: string;

  /** Current status */
  status: SignerStatusType;

  /** When signer viewed the document */
  viewedAt?: Date;

  /** When signer signed */
  signedAt?: Date;

  /** Decline reason (if declined) */
  declineReason?: string;

  /** IP address used for signing */
  ipAddress?: string;
}

export enum EnvelopeStatus {
  CREATED = 'CREATED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
  EXPIRED = 'EXPIRED',
}

export enum SignerStatusType {
  CREATED = 'CREATED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  SIGNED = 'SIGNED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  AUTORESPONDED = 'AUTORESPONDED',
}

export interface DocumentDownloadResponse {
  /** Document content (Base64 encoded) */
  content: string;

  /** Content type (typically 'application/pdf') */
  contentType: string;

  /** File name */
  fileName: string;

  /** File size in bytes */
  fileSize: number;

  /** Checksum/hash of the document */
  checksum?: string;
}

export interface VoidEnvelopeResponse {
  /** Envelope ID that was voided */
  envelopeId: string;

  /** New status (should be VOIDED) */
  status: EnvelopeStatus;

  /** When it was voided */
  voidedAt: Date;

  /** Void reason */
  voidReason: string;
}

export interface ListEnvelopesFilters {
  /** Filter by status */
  status?: EnvelopeStatus;

  /** Created after this date */
  fromDate?: Date;

  /** Created before this date */
  toDate?: Date;

  /** Search by metadata */
  metadata?: Record<string, string>;

  /** Page number (1-based) */
  page?: number;

  /** Page size */
  pageSize?: number;
}

export interface ListEnvelopesResponse {
  /** List of envelopes */
  envelopes: EnvelopeSummary[];

  /** Total count */
  totalCount: number;

  /** Current page */
  page: number;

  /** Page size */
  pageSize: number;
}

export interface EnvelopeSummary {
  /** Envelope ID */
  envelopeId: string;

  /** Envelope status */
  status: EnvelopeStatus;

  /** Email subject */
  emailSubject: string;

  /** Sender name */
  senderName: string;

  /** Created date */
  createdAt: Date;

  /** Sent date */
  sentAt?: Date;

  /** Completed date */
  completedAt?: Date;

  /** Number of signers */
  signerCount: number;
}

export interface HealthCheckResponse {
  /** Health status */
  status: HealthStatus;

  /** Response time in milliseconds */
  latency: number;

  /** When health check was performed */
  checkedAt: Date;

  /** Additional details */
  details?: Record<string, unknown>;

  /** Error message if unhealthy */
  error?: string;
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export interface WebhookEventData {
  /** Event type */
  eventType: WebhookEventType;

  /** Envelope ID */
  envelopeId: string;

  /** Event timestamp */
  eventTimestamp: Date;

  /** Event-specific data */
  data: Record<string, unknown>;

  /** Signer information (if applicable) */
  signer?: {
    email: string;
    name: string;
    status: SignerStatusType;
    signedAt?: Date;
    ipAddress?: string;
  };
}

export enum WebhookEventType {
  ENVELOPE_SENT = 'ENVELOPE_SENT',
  ENVELOPE_DELIVERED = 'ENVELOPE_DELIVERED',
  ENVELOPE_COMPLETED = 'ENVELOPE_COMPLETED',
  ENVELOPE_DECLINED = 'ENVELOPE_DECLINED',
  ENVELOPE_VOIDED = 'ENVELOPE_VOIDED',
  RECIPIENT_SENT = 'RECIPIENT_SENT',
  RECIPIENT_DELIVERED = 'RECIPIENT_DELIVERED',
  RECIPIENT_SIGNED = 'RECIPIENT_SIGNED',
  RECIPIENT_DECLINED = 'RECIPIENT_DECLINED',
  RECIPIENT_AUTHENTICATION_FAILED = 'RECIPIENT_AUTHENTICATION_FAILED',
}

// ============================================================================
// Error Types
// ============================================================================

export class ESignatureProviderError extends Error {
  constructor(
    message: string,
    public readonly code: ESignatureErrorCode,
    public readonly provider: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ESignatureProviderError';
  }
}

export enum ESignatureErrorCode {
  // Configuration errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',

  // Request errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  INVALID_SIGNER = 'INVALID_SIGNER',

  // Operation errors
  ENVELOPE_NOT_FOUND = 'ENVELOPE_NOT_FOUND',
  ENVELOPE_ALREADY_SENT = 'ENVELOPE_ALREADY_SENT',
  ENVELOPE_ALREADY_COMPLETED = 'ENVELOPE_ALREADY_COMPLETED',
  ENVELOPE_VOIDED = 'ENVELOPE_VOIDED',
  ENVELOPE_EXPIRED = 'ENVELOPE_EXPIRED',

  // Authentication errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Provider errors
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',

  // Webhook errors
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_PROCESSING_ERROR = 'WEBHOOK_PROCESSING_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
