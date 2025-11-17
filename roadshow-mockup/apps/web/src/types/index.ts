/**
 * Type definitions matching backend schema
 */

export enum CountryCode {
  ES = 'ES',
  FR = 'FR',
  IT = 'IT',
  PL = 'PL',
}

export enum AssignmentModeConfig {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum SalesPotential {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  INCOMPLETE = 'INCOMPLETE',
}

export enum CompletionStatus {
  COMPLETE = 'COMPLETE',
  INCOMPLETE = 'INCOMPLETE',
  FAILED = 'FAILED',
}

export enum ProviderRiskStatus {
  OK = 'OK',
  ON_WATCH = 'ON_WATCH',
  SUSPENDED = 'SUSPENDED',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum WCFStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SIGNED_OK = 'SIGNED_OK',
  SIGNED_WITH_RESERVES = 'SIGNED_WITH_RESERVES',
  REFUSED = 'REFUSED',
}

export enum ContractStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  REFUSED = 'REFUSED',
  SKIPPED = 'SKIPPED',
}

// Entity types
export interface Provider {
  id: string;
  name: string;
  countryCode: CountryCode;
  tier: number; // 1, 2, 3
  active: boolean;
  riskStatus: ProviderRiskStatus;
  riskReason?: string;
  rating?: number;
  certifications?: Array<{
    code: string;
    name: string;
    expiresAt: string;
  }>;
  suspendedFrom?: string;
  suspendedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkTeam {
  id: string;
  providerId: string;
  name: string;
  active: boolean;
  certifications?: string[];
  provider?: Provider;
}

export interface Project {
  id: string;
  externalId: string;
  countryCode: CountryCode;
  projectType: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  worksiteCity: string;
  worksiteZip: string;
  totalHoursEstimated?: number;
  status: string;
  responsibleOperatorId?: string;
  assignmentMode: AssignmentModeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrder {
  id: string;
  projectId: string;
  externalId: string;
  serviceType: string;
  priority: string;
  countryCode: CountryCode;
  status: string;
  scheduledDate?: string;
  estimatedDuration?: number;

  // Sales integration
  salesOrderId?: string;
  salesProjectId?: string;
  salesLeadId?: string;
  salesSystemSource?: string;

  // Sales potential (AI)
  salesPotential?: SalesPotential;
  salesPotentialScore?: number;
  salesPotentialUpdatedAt?: string;
  salesPreEstimationValue?: number;
  salesmanNotes?: string;

  // Risk assessment (AI)
  riskLevel?: RiskLevel;
  riskScore?: number;
  riskAssessedAt?: string;
  riskFactors?: any;
  riskAcknowledgedBy?: string;
  riskAcknowledgedAt?: string;

  // Go Execution
  goExecStatus?: 'OK' | 'NOK' | 'DEROGATION';
  goExecBlockReason?: string;
  paymentStatus?: string;
  productDeliveryStatus?: string;
  contractStatus?: string;
  wcfStatus?: string;

  createdAt: string;
  updatedAt: string;
  project?: Project;
  assignment?: Assignment;
}

export interface Assignment {
  id: string;
  serviceOrderId: string;
  providerId: string;
  workTeamId?: string;
  status: string;
  assignmentMode: string;
  proposedDate?: string;
  acceptedDate?: string;
  acceptedAt?: string;
  refusedAt?: string;
  refusalReason?: string;

  // Date negotiation
  originalDate?: string;
  dateNegotiationRound?: number;

  // Timeout
  offerExpiresAt?: string;

  createdAt: string;
  updatedAt: string;
  serviceOrder?: ServiceOrder;
  provider?: Provider;
  workTeam?: WorkTeam;
  dateNegotiations?: DateNegotiation[];
}

export interface DateNegotiation {
  id: string;
  assignmentId: string;
  round: number;
  proposedDate: string;
  proposedBy: 'PROVIDER' | 'CUSTOMER';
  notes?: string;
  createdAt: string;
}

export interface Execution {
  id: string;
  serviceOrderId: string;
  workTeamId: string;
  status: ExecutionStatus;

  // Check-in/out
  checkInAt?: string;
  checkInLat?: number;
  checkInLon?: number;
  checkOutAt?: string;
  checkOutLat?: number;
  checkOutLon?: number;
  actualHours?: number;

  // Checklist
  checklistItems?: Array<{
    id: string;
    label: string;
    required: boolean;
    completed: boolean;
    completedAt?: string;
    notes?: string;
  }>;
  checklistCompletion?: number;

  // Completion
  completionStatus?: CompletionStatus;
  incompleteReason?: string;

  // Blocking
  blockedReason?: string;
  canCheckIn: boolean;

  // Media
  notes?: string;
  photos?: Array<{
    url: string;
    type: 'before' | 'after';
    caption?: string;
    uploadedAt: string;
  }>;
  audioRecordings?: Array<{
    url: string;
    duration: number;
    notes?: string;
    uploadedAt: string;
  }>;

  // Customer feedback
  customerSignature?: string;
  customerRating?: number;
  customerFeedback?: string;

  createdAt: string;
  updatedAt: string;
  serviceOrder?: ServiceOrder;
  workTeam?: WorkTeam;
}

export interface Contract {
  id: string;
  serviceOrderId: string;
  assignmentId: string;
  status: ContractStatus;
  generatedAt?: string;
  sentAt?: string;
  signedAt?: string;
  refusedAt?: string;
  contractPdfUrl?: string;
  signatureType?: string;
  signatureMethod?: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface WCF {
  id: string;
  serviceOrderId: string;
  executionId: string;
  status: WCFStatus;
  generatedAt?: string;
  sentAt?: string;
  signedAt?: string;
  refusedAt?: string;
  wcfPdfUrl?: string;
  signatureType?: string;
  signatureMethod?: string;
  customerName: string;
  customerEmail: string;
  actualHours?: number;
  materialsUsed?: any;
  workPhotos?: string[];
  customerRating?: number;
  customerFeedback?: string;
  customerSignature?: string;
  createdAt: string;
  updatedAt: string;
  reserves?: WCFReserve[];
}

export interface WCFReserve {
  id: string;
  wcfId: string;
  category: string;
  description: string;
  severity: string;
  createdAt: string;
}

export interface Task {
  id: string;
  type: string;
  priority: TaskPriority;
  title: string;
  description: string;
  status: TaskStatus;
  assignedToId?: string;
  dueDate?: string;
  completedAt?: string;
  metadata?: any;
  countryCode: CountryCode;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: any;
  acknowledged: boolean;
  acknowledgedAt?: string;
  countryCode: CountryCode;
  createdAt: string;
}
