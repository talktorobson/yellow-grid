/**
 * Core type definitions for the Operator Web App
 * Based on product-docs specifications
 */

// Common types
export type UUID = string;
export type ISODateString = string;

export enum CountryCode {
  ES = 'ES',
  FR = 'FR',
  IT = 'IT',
  PL = 'PL',
}

export enum BusinessUnit {
  LEROY_MERLIN = 'LEROY_MERLIN',
  BRICO_DEPOT = 'BRICO_DEPOT',
}

// User & Auth types
export interface User {
  id: UUID;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  countryCode: CountryCode;
  businessUnit: BusinessUnit;
  permissions: Permission[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COUNTRY_ADMIN = 'COUNTRY_ADMIN',
  BU_ADMIN = 'BU_ADMIN',
  STORE_ADMIN = 'STORE_ADMIN',
  OPERATOR = 'OPERATOR',
  READONLY_USER = 'READONLY_USER',
}

export type Permission = string; // Format: "resource:action:scope"

// Service Order types
export interface ServiceOrder {
  id: UUID;
  externalId: string;
  countryCode: CountryCode;
  businessUnit: BusinessUnit;
  storeId: string;
  projectId: UUID;
  status: ServiceOrderStatus;
  serviceType: ServiceType;
  priority: Priority;
  scheduledDate?: ISODateString;
  estimatedDuration?: number;

  // Customer information
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;

  // AI features
  salesPotential?: SalesPotential;
  salesPotentialScore?: number;
  salesPreEstimationValue?: number;
  salesmanNotes?: string;
  salesPotentialUpdatedAt?: ISODateString;

  riskLevel?: RiskLevel;
  riskScore?: number;
  riskFactors?: Record<string, unknown>;
  riskAcknowledgedAt?: ISODateString;
  riskAssessedAt?: ISODateString;

  // Go Exec monitoring
  goExecStatus?: GoExecStatus;
  goExecBlockReason?: string;
  paymentStatus?: string;
  productDeliveryStatus?: string;

  // External references
  salesOrderId?: string;
  salesSystemSource?: string;

  // Document status
  contractStatus?: ContractStatus;
  wcfStatus?: WCFStatus;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export enum ServiceOrderStatus {
  CREATED = 'CREATED',
  SCHEDULED = 'SCHEDULED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VALIDATED = 'VALIDATED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceType {
  TECHNICAL_VISIT = 'TECHNICAL_VISIT',
  INSTALLATION = 'INSTALLATION',
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
}

export enum Priority {
  P1 = 'P1',
  P2 = 'P2',
}

export enum SalesPotential {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum GoExecStatus {
  OK = 'OK',
  NOK = 'NOK',
  DEROGATION = 'DEROGATION',
}

export enum ContractStatus {
  NOT_STARTED = 'NOT_STARTED',
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  REFUSED = 'REFUSED',
}

export enum WCFStatus {
  NOT_STARTED = 'NOT_STARTED',
  SENT = 'SENT',
  SIGNED_OK = 'SIGNED_OK',
  SIGNED_WITH_RESERVES = 'SIGNED_WITH_RESERVES',
  REFUSED = 'REFUSED',
}

// Provider types
export interface Provider {
  id: UUID;
  externalId: string;
  name: string;
  countryCode: CountryCode;
  status: ProviderStatus;
  email: string;
  phone: string;
  serviceTypes: ServiceType[];
  coverageZones: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Assignment types
export interface Assignment {
  id: UUID;
  serviceOrderId: UUID;
  providerId: UUID;
  mode: AssignmentMode;
  status: AssignmentStatus;
  offeredAt?: ISODateString;
  acceptedAt?: ISODateString;
  refusedAt?: ISODateString;
  timeoutAt?: ISODateString;
  scoringResult?: ScoringResult;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export enum AssignmentMode {
  DIRECT = 'DIRECT',
  OFFER = 'OFFER',
  BROADCAST = 'BROADCAST',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REFUSED = 'REFUSED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

export interface ScoringResult {
  totalScore: number;
  factors: ScoringFactor[];
}

export interface ScoringFactor {
  name: string;
  score: number;
  weight: number;
  rationale: string;
}

// Task types
export interface Task {
  id: UUID;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  description: string;
  assignedTo?: UUID;
  relatedEntityType?: string;
  relatedEntityId?: UUID;
  dueDate?: ISODateString;
  slaDeadline?: ISODateString;
  createdAt: ISODateString;
  completedAt?: ISODateString;
}

export enum TaskType {
  ASSIGNMENT_REQUIRED = 'ASSIGNMENT_REQUIRED',
  RISK_REVIEW = 'RISK_REVIEW',
  CUSTOMER_CONTACT = 'CUSTOMER_CONTACT',
  DOCUMENT_MISSING = 'DOCUMENT_MISSING',
  SLA_BREACH = 'SLA_BREACH',
}

export enum TaskPriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
