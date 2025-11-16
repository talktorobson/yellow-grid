/**
 * Schema types for schema v2
 * These mirror the Prisma schema enums until Prisma Client can be regenerated
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

export enum StatusTagType {
  CONTRACT = 'CONTRACT',
  GO_EXEC = 'GO_EXEC',
  WCF = 'WCF',
}

export enum ContractStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  REFUSED = 'REFUSED',
  SKIPPED = 'SKIPPED',
}

export enum SignatureType {
  DIGITAL = 'DIGITAL',
  MANUAL = 'MANUAL',
  SKIPPED = 'SKIPPED',
}

export enum WCFStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SIGNED_OK = 'SIGNED_OK',
  SIGNED_WITH_RESERVES = 'SIGNED_WITH_RESERVES',
  REFUSED = 'REFUSED',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  CONTESTED = 'CONTESTED',
  PAID = 'PAID',
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

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskType {
  MANUAL_ASSIGNMENT = 'MANUAL_ASSIGNMENT',
  DATE_NEGOTIATION_FAILED = 'DATE_NEGOTIATION_FAILED',
  GO_EXEC_NOK = 'GO_EXEC_NOK',
  WCF_RESERVES = 'WCF_RESERVES',
  WCF_REFUSED = 'WCF_REFUSED',
  INCOMPLETE_JOB = 'INCOMPLETE_JOB',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  PROVIDER_ISSUE = 'PROVIDER_ISSUE',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum AlertType {
  ASSIGNMENT_TIMEOUT = 'ASSIGNMENT_TIMEOUT',
  GO_EXEC_BLOCKED = 'GO_EXEC_BLOCKED',
  WCF_ISSUE = 'WCF_ISSUE',
  PROVIDER_SUSPENDED = 'PROVIDER_SUSPENDED',
  HIGH_RISK_SO = 'HIGH_RISK_SO',
  CONTRACT_REFUSED = 'CONTRACT_REFUSED',
  PAYMENT_DELAYED = 'PAYMENT_DELAYED',
}

export enum ProviderRiskStatus {
  OK = 'OK',
  ON_WATCH = 'ON_WATCH',
  SUSPENDED = 'SUSPENDED',
}
