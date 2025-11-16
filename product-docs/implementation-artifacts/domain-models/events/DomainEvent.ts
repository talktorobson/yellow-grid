/**
 * Base Domain Event
 *
 * Abstract base class for all domain events.
 * Follows event sourcing and CQRS patterns.
 *
 * @see product-docs/architecture/05-event-driven-architecture.md
 */

import { v4 as uuidv4 } from 'uuid';

export interface EventMetadata {
  correlationId: string;
  causationId: string;
  userId?: string;
  countryCode: string;
  businessUnit: string;
}

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly timestamp: number; // milliseconds since epoch
  public readonly metadata: EventMetadata;

  protected constructor(eventType: string, metadata: EventMetadata) {
    this.eventId = uuidv4();
    this.eventType = eventType;
    this.timestamp = Date.now();
    this.metadata = metadata;
  }

  /**
   * Serialize to Avro-compatible format for Kafka
   */
  public abstract toAvro(): any;

  /**
   * Get the Kafka topic for this event
   */
  public abstract getTopicName(): string;

  /**
   * Convert timestamp to Date
   */
  public getDate(): Date {
    return new Date(this.timestamp);
  }

  /**
   * Get event age in milliseconds
   */
  public getAgeMs(): number {
    return Date.now() - this.timestamp;
  }
}
