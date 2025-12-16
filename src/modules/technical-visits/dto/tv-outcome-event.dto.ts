/**
 * Technical Visit Outcome Kafka Event DTOs
 *
 * Based on event schema from:
 * documentation/architecture/05-event-driven-architecture.md
 *
 * Event: projects.tv_outcome.recorded
 * Topic: fsm.projects
 * Partition key: {country_code}_{tv_service_order_id}
 */

export enum TvOutcomeEnum {
  YES = 'YES',
  YES_BUT = 'YES_BUT',
  NO = 'NO',
}

export interface TvModification {
  description: string;
  extra_duration_min?: number;
}

/**
 * TV Outcome Recorded Event Payload
 *
 * Published when a technician records a Technical Visit outcome.
 *
 * Consumers:
 * - Orchestration Service: Unblock/cancel installation orders
 * - Sales Adapter: Send modifications for repricing (YES_BUT) or cancellation (NO)
 * - Assignment Service: Re-assign installation if needed
 */
export interface TvOutcomeRecordedEvent {
  // Event metadata (automatically added by KafkaProducerService)
  event_id: string;
  event_name: string; // 'projects.tv_outcome.recorded'
  event_timestamp: number; // Unix timestamp in milliseconds
  correlation_id?: string;

  // TV outcome data
  tv_service_order_id: string;
  linked_installation_order_id: string | null;
  outcome: TvOutcomeEnum;
  modifications: TvModification[] | null;
  recorded_by: string; // Technician user ID/email

  // Context for consumers
  country_code: string;
  business_unit: string;
  project_id: string | null;

  // External references (for sales integration)
  external_sales_order_id: string | null;
  external_project_id: string | null;
  sales_system_source: string | null; // PYXIS, TEMPO, SAP

  // Technician notes
  technician_notes: string | null;
}
