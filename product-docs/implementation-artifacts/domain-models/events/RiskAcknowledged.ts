/**
 * Risk Acknowledged Event
 *
 * Emitted when operator acknowledges HIGH/CRITICAL risk.
 * Published to Kafka topic: projects.risk.acknowledged
 *
 * @see product-docs/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';

export interface RiskAcknowledgedProps {
  serviceOrderId: string;
  acknowledgedBy: string;
  acknowledgedAt: number; // timestamp in milliseconds
  notes?: string;
  metadata: EventMetadata;
}

export class RiskAcknowledged extends DomainEvent {
  public readonly serviceOrderId: string;
  public readonly acknowledgedBy: string;
  public readonly acknowledgedAt: number;
  public readonly notes?: string;

  constructor(props: RiskAcknowledgedProps) {
    super('RiskAcknowledged', props.metadata);
    this.serviceOrderId = props.serviceOrderId;
    this.acknowledgedBy = props.acknowledgedBy;
    this.acknowledgedAt = props.acknowledgedAt;
    this.notes = props.notes;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      serviceOrderId: this.serviceOrderId,
      acknowledgedBy: this.acknowledgedBy,
      acknowledgedAt: this.acknowledgedAt,
      notes: this.notes || null,
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
    return 'projects.risk.acknowledged';
  }
}
