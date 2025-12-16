/**
 * High Risk Detected Event
 *
 * Emitted when HIGH or CRITICAL risk is detected (triggers task creation).
 * Published to Kafka topic: projects.risk.high_risk_detected
 *
 * @see documentation/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';
import { RiskLevel } from '../value-objects/RiskAssessment';
import { RiskFactor } from '../value-objects/RiskFactor';

export interface HighRiskDetectedProps {
  serviceOrderId: string;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  projectId: string;
  responsibleOperatorId?: string;
  metadata: EventMetadata;
}

export class HighRiskDetected extends DomainEvent {
  public readonly serviceOrderId: string;
  public readonly riskLevel: RiskLevel;
  public readonly riskFactors: RiskFactor[];
  public readonly projectId: string;
  public readonly responsibleOperatorId?: string;

  constructor(props: HighRiskDetectedProps) {
    super('HighRiskDetected', props.metadata);

    // Business rule: Only HIGH or CRITICAL risk should trigger this event
    if (props.riskLevel !== RiskLevel.HIGH && props.riskLevel !== RiskLevel.CRITICAL) {
      throw new Error('HighRiskDetected event can only be created for HIGH or CRITICAL risk');
    }

    this.serviceOrderId = props.serviceOrderId;
    this.riskLevel = props.riskLevel;
    this.riskFactors = props.riskFactors;
    this.projectId = props.projectId;
    this.responsibleOperatorId = props.responsibleOperatorId;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      serviceOrderId: this.serviceOrderId,
      riskLevel: this.riskLevel,
      riskFactors: this.riskFactors.map((factor) => ({
        factor: factor.factor,
        description: factor.description,
        weight: factor.weight,
        severity: factor.severity,
      })),
      projectId: this.projectId,
      responsibleOperatorId: this.responsibleOperatorId || null,
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
    return 'projects.risk.high_risk_detected';
  }
}
