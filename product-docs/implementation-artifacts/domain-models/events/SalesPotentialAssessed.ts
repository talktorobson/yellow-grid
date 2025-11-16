/**
 * Sales Potential Assessed Event
 *
 * Emitted when AI assesses sales potential for a TV/Quotation service order.
 * Published to Kafka topic: projects.sales_potential.assessed
 *
 * @see product-docs/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';
import { PotentialLevel } from '../value-objects/SalesPotential';

export interface SalesPotentialAssessedProps {
  serviceOrderId: string;
  potential: PotentialLevel;
  score: number;
  confidence: number;
  reasoning: string[];
  modelVersion?: string;
  metadata: EventMetadata;
}

export class SalesPotentialAssessed extends DomainEvent {
  public readonly serviceOrderId: string;
  public readonly potential: PotentialLevel;
  public readonly score: number;
  public readonly confidence: number;
  public readonly reasoning: string[];
  public readonly modelVersion?: string;

  constructor(props: SalesPotentialAssessedProps) {
    super('SalesPotentialAssessed', props.metadata);
    this.serviceOrderId = props.serviceOrderId;
    this.potential = props.potential;
    this.score = props.score;
    this.confidence = props.confidence;
    this.reasoning = props.reasoning;
    this.modelVersion = props.modelVersion;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      serviceOrderId: this.serviceOrderId,
      potential: this.potential,
      score: this.score,
      confidence: this.confidence,
      reasoning: this.reasoning,
      modelVersion: this.modelVersion || null,
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
    return 'projects.sales_potential.assessed';
  }
}
