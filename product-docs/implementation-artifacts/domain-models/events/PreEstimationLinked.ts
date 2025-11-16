/**
 * Pre-Estimation Linked Event
 *
 * Emitted when a pre-estimation from sales system is linked to a service order.
 * Published to Kafka topic: projects.pre_estimation.linked
 *
 * @see product-docs/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';
import { SalesSystem } from '../value-objects/ExternalReference';

export interface Money {
  amount: number;
  currency: string;
}

export interface PreEstimationLinkedProps {
  serviceOrderId: string;
  preEstimationId: string;
  estimatedValue: Money;
  salesSystemSource: SalesSystem;
  metadata: EventMetadata;
}

export class PreEstimationLinked extends DomainEvent {
  public readonly serviceOrderId: string;
  public readonly preEstimationId: string;
  public readonly estimatedValue: Money;
  public readonly salesSystemSource: SalesSystem;

  constructor(props: PreEstimationLinkedProps) {
    super('PreEstimationLinked', props.metadata);

    // Validate estimated value
    if (props.estimatedValue.amount < 0) {
      throw new Error('Estimated value amount must be non-negative');
    }

    this.serviceOrderId = props.serviceOrderId;
    this.preEstimationId = props.preEstimationId;
    this.estimatedValue = props.estimatedValue;
    this.salesSystemSource = props.salesSystemSource;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      serviceOrderId: this.serviceOrderId,
      preEstimationId: this.preEstimationId,
      estimatedValue: {
        amount: this.estimatedValue.amount,
        currency: this.estimatedValue.currency,
      },
      salesSystemSource: this.salesSystemSource,
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
    return 'projects.pre_estimation.linked';
  }
}
