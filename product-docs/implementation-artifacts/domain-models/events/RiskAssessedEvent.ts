/**
 * Risk Assessed Event
 *
 * Emitted when AI assesses risk for a service order.
 * Published to Kafka topic: projects.risk.assessed
 *
 * @see product-docs/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';
import { RiskLevel } from '../value-objects/RiskAssessment';
import { RiskFactor } from '../value-objects/RiskFactor';

export interface RiskAssessedEventProps {
  serviceOrderId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  riskFactors: RiskFactor[];
  triggeredBy: string;
  modelVersion?: string;
  metadata: EventMetadata;
}

export class RiskAssessedEvent extends DomainEvent {
  public readonly serviceOrderId: string;
  public readonly riskLevel: RiskLevel;
  public readonly riskScore: number;
  public readonly confidence: number;
  public readonly riskFactors: RiskFactor[];
  public readonly triggeredBy: string;
  public readonly modelVersion?: string;

  constructor(props: RiskAssessedEventProps) {
    super('RiskAssessed', props.metadata);
    this.serviceOrderId = props.serviceOrderId;
    this.riskLevel = props.riskLevel;
    this.riskScore = props.riskScore;
    this.confidence = props.confidence;
    this.riskFactors = props.riskFactors;
    this.triggeredBy = props.triggeredBy;
    this.modelVersion = props.modelVersion;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      serviceOrderId: this.serviceOrderId,
      riskLevel: this.riskLevel,
      riskScore: this.riskScore,
      confidence: this.confidence,
      riskFactors: this.riskFactors.map((factor) => ({
        factor: factor.factor,
        description: factor.description,
        weight: factor.weight,
        severity: factor.severity,
      })),
      triggeredBy: this.triggeredBy,
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
    return 'projects.risk.assessed';
  }
}
