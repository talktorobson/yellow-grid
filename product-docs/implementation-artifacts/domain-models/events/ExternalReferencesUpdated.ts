/**
 * External References Updated Event
 *
 * Emitted when external sales system references are updated.
 * Published to Kafka topic: projects.external_references.updated
 *
 * @see product-docs/integration/02-event-schema-registry.md
 * @see implementation-artifacts/avro-schemas/v2-0-domain-events.avsc
 */

import { DomainEvent, EventMetadata } from './DomainEvent';
import { SalesSystem } from '../value-objects/ExternalReference';

export interface ExternalReferencesUpdatedProps {
  serviceOrderId: string;
  externalSalesOrderId?: string;
  externalProjectId?: string;
  externalLeadId?: string;
  externalSystemSource: SalesSystem;
  updatedBy: string;
  metadata: EventMetadata;
}

export class ExternalReferencesUpdated extends DomainEvent {
  public readonly serviceOrderId: string;
  public readonly externalSalesOrderId?: string;
  public readonly externalProjectId?: string;
  public readonly externalLeadId?: string;
  public readonly externalSystemSource: SalesSystem;
  public readonly updatedBy: string;

  constructor(props: ExternalReferencesUpdatedProps) {
    super('ExternalReferencesUpdated', props.metadata);

    // Business rule: At least one external ID must be provided
    if (!props.externalSalesOrderId && !props.externalProjectId && !props.externalLeadId) {
      throw new Error('At least one external reference ID must be provided');
    }

    this.serviceOrderId = props.serviceOrderId;
    this.externalSalesOrderId = props.externalSalesOrderId;
    this.externalProjectId = props.externalProjectId;
    this.externalLeadId = props.externalLeadId;
    this.externalSystemSource = props.externalSystemSource;
    this.updatedBy = props.updatedBy;
  }

  public toAvro(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      serviceOrderId: this.serviceOrderId,
      externalSalesOrderId: this.externalSalesOrderId || null,
      externalProjectId: this.externalProjectId || null,
      externalLeadId: this.externalLeadId || null,
      externalSystemSource: this.externalSystemSource,
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
    return 'projects.external_references.updated';
  }
}
