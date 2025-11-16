/**
 * Project Ownership Changed Event
 *
 * Emitted when project ownership (Pilote du Chantier) is assigned or changed.
 * Published to Kafka topic: projects.ownership.changed
 *
 * @see product-docs/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';

export enum AssignmentMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export interface ProjectOwnershipChangedProps {
  projectId: string;
  previousOperatorId?: string;
  newOperatorId: string;
  changedBy: string; // User ID or 'SYSTEM'
  assignmentMode: AssignmentMode;
  reason?: string;
  metadata: EventMetadata;
}

export class ProjectOwnershipChanged extends DomainEvent {
  public readonly projectId: string;
  public readonly previousOperatorId?: string;
  public readonly newOperatorId: string;
  public readonly changedBy: string;
  public readonly assignmentMode: AssignmentMode;
  public readonly reason?: string;

  constructor(props: ProjectOwnershipChangedProps) {
    super('ProjectOwnershipChanged', props.metadata);
    this.projectId = props.projectId;
    this.previousOperatorId = props.previousOperatorId;
    this.newOperatorId = props.newOperatorId;
    this.changedBy = props.changedBy;
    this.assignmentMode = props.assignmentMode;
    this.reason = props.reason;
  }

  /**
   * Check if this is an initial assignment (no previous operator)
   */
  public isInitialAssignment(): boolean {
    return !this.previousOperatorId;
  }

  /**
   * Check if this was automatically assigned
   */
  public isAutoAssigned(): boolean {
    return this.assignmentMode === AssignmentMode.AUTO;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      projectId: this.projectId,
      previousOperatorId: this.previousOperatorId || null,
      newOperatorId: this.newOperatorId,
      changedBy: this.changedBy,
      assignmentMode: this.assignmentMode,
      reason: this.reason || null,
      metadata: {
        correlationId: this.metadata.correlationId,
        causationId: this.metadata.causationId,
        userId: this.metadata.userId || null,
        countryCode: this.metadata.countryCode,
        businessUnit: this.metadata.businessUnit,
      },
    };
  }

  public getTopicName(): string {
    return 'projects.ownership.changed';
  }
}
