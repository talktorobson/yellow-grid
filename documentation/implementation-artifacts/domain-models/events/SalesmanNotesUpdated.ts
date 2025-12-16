/**
 * Salesman Notes Updated Event
 *
 * Emitted when salesman notes are updated (triggers sales potential reassessment).
 * Published to Kafka topic: projects.salesman_notes.updated
 *
 * @see documentation/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';

export interface SalesmanNotesUpdatedProps {
  serviceOrderId: string;
  notes: string;
  updatedBy: string;
  metadata: EventMetadata;
}

export class SalesmanNotesUpdated extends DomainEvent {
  public readonly serviceOrderId: string;
  public readonly notes: string;
  public readonly updatedBy: string;

  constructor(props: SalesmanNotesUpdatedProps) {
    super('SalesmanNotesUpdated', props.metadata);
    this.serviceOrderId = props.serviceOrderId;
    this.notes = props.notes;
    this.updatedBy = props.updatedBy;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      serviceOrderId: this.serviceOrderId,
      notes: this.notes,
      updatedBy: this.updatedBy,
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
    return 'projects.salesman_notes.updated';
  }
}
