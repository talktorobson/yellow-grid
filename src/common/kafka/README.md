# Kafka Event System

Comprehensive Kafka producer and consumer infrastructure for the Yellow Grid FSM platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Event Handlers](#event-handlers)
- [Configuration](#configuration)
- [Testing](#testing)
- [Health Checks](#health-checks)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

This module provides:

- **KafkaProducerService**: Send events to Kafka topics
- **KafkaConsumerService**: Subscribe to and consume events from Kafka topics
- **EventHandlerRegistry**: Automatically discover and register event handlers
- **@EventHandler Decorator**: Declarative event handling
- **KafkaHealthIndicator**: Health checks for Kafka components
- **Dead Letter Queue (DLQ)**: Automatic error handling and retry

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Kafka Module                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  Producer Service │         │  Consumer Service │        │
│  └──────────────────┘         └──────────────────┘        │
│           │                            │                    │
│           │                            │                    │
│           v                            v                    │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  Kafka Brokers   │◄────────┤ Event Registry   │        │
│  └──────────────────┘         └──────────────────┘        │
│           │                            │                    │
│           │                            │                    │
│           v                            v                    │
│  ┌──────────────────────────────────────────┐             │
│  │      Event Handlers (@EventHandler)       │             │
│  └──────────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Event Flow

```
Producer                  Kafka Broker              Consumer
   │                           │                         │
   │─────send event────────────>│                         │
   │                           │                         │
   │                           │<────subscribe───────────│
   │                           │                         │
   │                           │─────deliver event──────>│
   │                           │                         │
   │                           │                         │
   │<───DLQ (on error)─────────│<────error handling─────│
```

---

## Quick Start

### 1. Install Dependencies

The Kafka module is already installed in the project. Ensure environment variables are set:

```bash
# .env
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=yellow-grid-fsm
KAFKA_DLQ_TOPIC=dlq.processing_errors

# Optional: SASL authentication
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password

# Optional: SSL
KAFKA_SSL=true
```

### 2. Create an Event Handler

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '@/common/kafka';

@Injectable()
export class OrdersEventHandler {
  private readonly logger = new Logger(OrdersEventHandler.name);

  @EventHandler({
    eventName: 'order.created',
    topics: ['fsm.projects'],
    groupId: 'orders-creation-handler',
  })
  async handleOrderCreated(
    event: any,
    context: {
      topic: string;
      headers: Record<string, string>;
      partition: number;
      offset: string;
    },
  ): Promise<void> {
    this.logger.log(`Received order.created event | order: ${event.orderId}`);

    // Your business logic here
    // ...
  }
}
```

### 3. Register Handler in Module

```typescript
import { Module } from '@nestjs/common';
import { OrdersEventHandler } from './orders.event-handler';

@Module({
  providers: [OrdersEventHandler],
})
export class OrdersModule {}
```

That's it! The handler will be automatically discovered and registered.

---

## Event Handlers

### @EventHandler Decorator

The `@EventHandler` decorator marks a method as a Kafka event handler.

**Parameters:**

- `eventName` (string): Event name or pattern to match (supports wildcards)
- `topics` (string[], optional): Kafka topics to subscribe to (auto-derived if not provided)
- `groupId` (string, optional): Consumer group ID (auto-generated if not provided)
- `fromBeginning` (boolean, optional): Start consuming from beginning (default: false)
- `autoCommit` (boolean, optional): Auto-commit offsets (default: true)

### Event Name Patterns

Event names support wildcards for flexible matching:

```typescript
// Exact match
@EventHandler({ eventName: 'order.created' })

// Wildcard - match all order events
@EventHandler({ eventName: 'order.*' })

// Wildcard - match all status change events
@EventHandler({ eventName: '*.status_changed' })

// Match everything (use with caution!)
@EventHandler({ eventName: '*' })
```

### Handler Method Signature

Event handlers receive two parameters:

```typescript
async handleEvent(
  event: any,                    // Parsed event data
  context: {                     // Event metadata
    topic: string;               // Kafka topic
    headers: Record<string, string>;  // Message headers
    partition: number;           // Partition number
    offset: string;              // Message offset
  },
): Promise<void> {
  // Your logic here
}
```

### Multiple Handlers

You can define multiple handlers in a single service:

```typescript
@Injectable()
export class OrdersEventHandler {
  @EventHandler({ eventName: 'order.created' })
  async handleCreated(event: any, context: any) { /* ... */ }

  @EventHandler({ eventName: 'order.updated' })
  async handleUpdated(event: any, context: any) { /* ... */ }

  @EventHandler({ eventName: 'order.cancelled' })
  async handleCancelled(event: any, context: any) { /* ... */ }
}
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KAFKA_ENABLED` | Enable/disable Kafka | `true` | No |
| `KAFKA_BROKERS` | Comma-separated broker list | `localhost:9092` | Yes |
| `KAFKA_CLIENT_ID` | Client identifier | `yellow-grid-fsm` | No |
| `KAFKA_DLQ_TOPIC` | Dead letter queue topic | `dlq.processing_errors` | No |
| `KAFKA_SSL` | Enable SSL | `false` | No |
| `KAFKA_SASL_MECHANISM` | SASL mechanism (plain, scram-sha-256, scram-sha-512) | - | No |
| `KAFKA_SASL_USERNAME` | SASL username | - | If SASL enabled |
| `KAFKA_SASL_PASSWORD` | SASL password | - | If SASL enabled |

### Topic Mapping

Events are automatically mapped to topics based on domain:

| Domain | Environment Variable | Default Topic |
|--------|---------------------|---------------|
| `projects.*` | `KAFKA_PROJECTS_TOPIC` | `fsm.projects` |
| `assignments.*` | `KAFKA_ASSIGNMENTS_TOPIC` | `fsm.assignments` |
| `scheduling.*` | `KAFKA_SCHEDULING_TOPIC` | `fsm.scheduling` |
| `execution.*` | `KAFKA_EXECUTION_TOPIC` | `fsm.execution` |
| `contracts.*` | `KAFKA_CONTRACTS_TOPIC` | `fsm.contracts` |

You can override topics in the `@EventHandler` decorator:

```typescript
@EventHandler({
  eventName: 'custom.event',
  topics: ['my-custom-topic'],
})
```

---

## Testing

### Disabling Kafka in Tests

Set `KAFKA_ENABLED=false` in your test environment:

```typescript
describe('MyService', () => {
  beforeEach(async () => {
    process.env.KAFKA_ENABLED = 'false';

    const module: TestingModule = await Test.createTestingModule({
      imports: [KafkaModule],
      providers: [MyService],
    }).compile();

    // ...
  });
});
```

### Mocking Event Handlers

```typescript
const mockHandler = jest.fn();

@EventHandler({ eventName: 'test.event' })
async handleTestEvent(event: any, context: any) {
  return mockHandler(event, context);
}

// In tests
expect(mockHandler).toHaveBeenCalledWith(
  expect.objectContaining({ orderId: '123' }),
  expect.any(Object),
);
```

---

## Health Checks

Use `KafkaHealthIndicator` for health checks:

```typescript
import { Injectable } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { KafkaHealthIndicator } from '@/common/kafka';

@Injectable()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private kafkaHealth: KafkaHealthIndicator,
  ) {}

  @HealthCheck()
  check() {
    return this.health.check([
      () => this.kafkaHealth.isHealthy('kafka'),
    ]);
  }
}
```

Available health check methods:

- `isHealthy()`: Check both producer and consumer
- `isProducerHealthy()`: Check producer only
- `isConsumerHealthy()`: Check consumer only

---

## Error Handling

### Automatic DLQ

Failed events are automatically sent to the Dead Letter Queue (DLQ):

```typescript
@EventHandler({ eventName: 'order.created' })
async handleOrderCreated(event: any, context: any) {
  // If this throws an error, the message will be sent to DLQ
  throw new Error('Processing failed');
}
```

DLQ messages include:

- Original topic, partition, offset
- Error message and stack trace
- Timestamp of failure
- Consumer group ID
- Correlation ID (if present)

### Manual Error Handling

You can also handle errors manually:

```typescript
@EventHandler({ eventName: 'order.created' })
async handleOrderCreated(event: any, context: any) {
  try {
    // Process event
  } catch (error) {
    this.logger.error('Failed to process event', error);

    // Don't re-throw if you don't want to send to DLQ
    // Re-throw if you want DLQ behavior
    throw error;
  }
}
```

### Monitoring DLQ

Query the DLQ topic to monitor failures:

```bash
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic dlq.processing_errors \
  --from-beginning
```

---

## Best Practices

### 1. Event Naming

Use a consistent naming convention:

```
{domain}.{entity}.{action}
```

Examples:
- `projects.service_order.created`
- `assignments.offer.accepted`
- `contracts.document.signed`

### 2. Idempotent Handlers

Always make handlers idempotent (safe to retry):

```typescript
@EventHandler({ eventName: 'order.created' })
async handleOrderCreated(event: any, context: any) {
  const { orderId } = event;

  // Check if already processed
  const existing = await this.ordersService.findById(orderId);
  if (existing) {
    this.logger.warn(`Order ${orderId} already exists, skipping`);
    return;
  }

  // Process event
  await this.ordersService.create(event);
}
```

### 3. Correlation IDs

Always propagate correlation IDs for tracing:

```typescript
@EventHandler({ eventName: 'order.created' })
async handleOrderCreated(event: any, context: any) {
  const correlationId = context.headers['correlation-id'] || event.correlation_id;

  // Use correlationId in downstream calls
  await this.someService.doSomething({ correlationId });
}
```

### 4. Structured Logging

Log with context for better debugging:

```typescript
this.logger.log({
  message: 'Processing order event',
  orderId: event.orderId,
  eventName: 'order.created',
  correlationId,
  partition: context.partition,
  offset: context.offset,
});
```

### 5. Error Handling

Be explicit about error handling:

```typescript
@EventHandler({ eventName: 'order.created' })
async handleOrderCreated(event: any, context: any) {
  try {
    await this.processOrder(event);
  } catch (error) {
    if (this.isRetryable(error)) {
      // Re-throw to trigger DLQ and manual retry
      throw error;
    } else {
      // Log and skip non-retryable errors
      this.logger.error('Non-retryable error', error);
    }
  }
}
```

### 6. Consumer Groups

Use descriptive consumer group names:

```typescript
@EventHandler({
  eventName: 'order.created',
  groupId: 'billing-order-processor',  // Descriptive name
})
```

### 7. Testing

Always test event handlers:

```typescript
describe('OrdersEventHandler', () => {
  it('should process order.created event', async () => {
    const event = { orderId: '123', /* ... */ };
    const context = { topic: 'fsm.projects', /* ... */ };

    await handler.handleOrderCreated(event, context);

    expect(ordersService.create).toHaveBeenCalledWith(event);
  });
});
```

---

## Examples

See the following files for complete examples:

- **Service Orders**: `src/modules/service-orders/service-orders.event-handler.ts`
- **Contracts**: `src/modules/contracts/contracts.event-handler.ts`
- **Providers**: `src/modules/providers/providers.event-handler.ts`

---

## Troubleshooting

### Consumers not starting

1. Check `KAFKA_ENABLED` is set to `true`
2. Verify Kafka brokers are accessible
3. Check logs for connection errors

### Events not being consumed

1. Verify event name matches pattern
2. Check topic mapping is correct
3. Ensure consumer group is registered

### DLQ messages

1. Query DLQ topic: `dlq.processing_errors`
2. Check error message and stack trace
3. Fix handler logic and replay from DLQ

---

## Further Reading

- [Kafka Topics Design](../../../product-docs/infrastructure/03-kafka-topics.md)
- [Event Schema Registry](../../../product-docs/integration/02-event-schema-registry.md)
- [KafkaJS Documentation](https://kafka.js.org/)
