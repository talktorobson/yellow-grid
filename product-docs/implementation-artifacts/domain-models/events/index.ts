/**
 * Domain Events Barrel Export
 *
 * Exports all domain events for easy importing
 */

export { DomainEvent, type EventMetadata } from './DomainEvent';
export { SalesPotentialAssessed, type SalesPotentialAssessedProps } from './SalesPotentialAssessed';
export { RiskAssessedEvent, type RiskAssessedEventProps } from './RiskAssessedEvent';
export { HighRiskDetected, type HighRiskDetectedProps } from './HighRiskDetected';
export { RiskAcknowledged, type RiskAcknowledgedProps } from './RiskAcknowledged';
export { ProjectOwnershipChanged, AssignmentMode, type ProjectOwnershipChangedProps } from './ProjectOwnershipChanged';
export { ExternalReferencesUpdated, type ExternalReferencesUpdatedProps } from './ExternalReferencesUpdated';
export { PreEstimationLinked, type PreEstimationLinkedProps, type Money } from './PreEstimationLinked';
export { SalesmanNotesUpdated, type SalesmanNotesUpdatedProps } from './SalesmanNotesUpdated';
