/**
 * Domain Events for Service Orders
 *
 * These events are emitted by the ServiceOrdersService and consumed by
 * the CamundaModule to trigger BPMN workflows without circular dependencies.
 */

/**
 * Base interface for all service order events
 */
export interface ServiceOrderEvent {
  serviceOrderId: string;
  timestamp: string;
  correlationId?: string;
}

/**
 * Emitted when a new service order is created
 */
export class ServiceOrderCreatedEvent implements ServiceOrderEvent {
  static readonly eventName = 'service-order.created';

  constructor(
    public readonly serviceOrderId: string,
    public readonly customerId: string,
    public readonly storeId: string,
    public readonly serviceId: string,
    public readonly countryCode: string,
    public readonly businessUnit: string,
    public readonly postalCode: string,
    public readonly urgency: 'URGENT' | 'STANDARD' | 'LOW',
    public readonly requestedStartDate: string,
    public readonly requestedEndDate: string,
    public readonly timestamp: string = new Date().toISOString(),
    public readonly correlationId?: string,
  ) {}
}

/**
 * Emitted when a service order state changes
 */
export class ServiceOrderStateChangedEvent implements ServiceOrderEvent {
  static readonly eventName = 'service-order.state-changed';

  constructor(
    public readonly serviceOrderId: string,
    public readonly previousState: string,
    public readonly newState: string,
    public readonly timestamp: string = new Date().toISOString(),
    public readonly correlationId?: string,
  ) {}
}

/**
 * Emitted when a provider offer is accepted
 */
export class OfferAcceptedEvent implements ServiceOrderEvent {
  static readonly eventName = 'service-order.offer-accepted';

  constructor(
    public readonly serviceOrderId: string,
    public readonly offerId: string,
    public readonly providerId: string,
    public readonly workTeamId: string,
    public readonly acceptedAt: string = new Date().toISOString(),
    public readonly timestamp: string = new Date().toISOString(),
    public readonly correlationId?: string,
  ) {}
}

/**
 * Emitted when a provider offer is rejected
 */
export class OfferRejectedEvent implements ServiceOrderEvent {
  static readonly eventName = 'service-order.offer-rejected';

  constructor(
    public readonly serviceOrderId: string,
    public readonly offerId: string,
    public readonly providerId: string,
    public readonly rejectionReason?: string,
    public readonly timestamp: string = new Date().toISOString(),
    public readonly correlationId?: string,
  ) {}
}

/**
 * Emitted when a service order is scheduled
 */
export class ServiceOrderScheduledEvent implements ServiceOrderEvent {
  static readonly eventName = 'service-order.scheduled';

  constructor(
    public readonly serviceOrderId: string,
    public readonly scheduledDate: string,
    public readonly scheduledTimeSlot: string,
    public readonly providerId: string,
    public readonly workTeamId: string,
    public readonly timestamp: string = new Date().toISOString(),
    public readonly correlationId?: string,
  ) {}
}

/**
 * Emitted when a service order is cancelled
 */
export class ServiceOrderCancelledEvent implements ServiceOrderEvent {
  static readonly eventName = 'service-order.cancelled';

  constructor(
    public readonly serviceOrderId: string,
    public readonly cancellationReason: string,
    public readonly cancelledBy: string,
    public readonly timestamp: string = new Date().toISOString(),
    public readonly correlationId?: string,
  ) {}
}
