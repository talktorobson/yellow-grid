# Logging Standards

## Overview

This document defines logging standards, structured logging formats, log levels, retention policies, and best practices for application and infrastructure logging.

## Logging Philosophy

### Core Principles

1. **Structured over Unstructured**: Use JSON format for machine-readable logs
2. **Context-Rich**: Include correlation IDs, user context, and business metadata
3. **Actionable**: Log events that require action or provide debugging value
4. **Performance-Aware**: Avoid excessive logging in hot paths
5. **Security-First**: Never log sensitive data (PII, credentials, tokens)
6. **Cost-Conscious**: Balance verbosity with storage costs

## Log Levels

### Standard Levels

| Level | When to Use | Examples | Retention |
|-------|-------------|----------|-----------|
| **FATAL** | Application cannot continue | Database unreachable, out of memory | 90 days |
| **ERROR** | Operation failed but app continues | Failed API call, validation error | 60 days |
| **WARN** | Unexpected but recoverable | Deprecated API usage, retry attempt | 30 days |
| **INFO** | Important business events | User login, order placed, payment processed | 30 days |
| **DEBUG** | Detailed diagnostic information | Function entry/exit, variable values | 7 days |
| **TRACE** | Very detailed diagnostic info | Loop iterations, full request/response | 3 days |

### Level Selection Guidelines

```typescript
// FATAL - System cannot continue
logger.fatal({ error, config }, 'Database connection pool exhausted');
process.exit(1);

// ERROR - Operation failed, needs investigation
logger.error({ error, userId, orderId }, 'Payment processing failed');

// WARN - Unexpected but handled
logger.warn({ cacheKey }, 'Cache miss, falling back to database');

// INFO - Normal business operations
logger.info({ userId, orderId, amount }, 'Order completed successfully');

// DEBUG - Development and troubleshooting
logger.debug({ query, params }, 'Database query executed');

// TRACE - Very detailed debugging
logger.trace({ requestBody }, 'Incoming request payload');
```

## Structured Logging Format

### Standard JSON Schema

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "service": "api-service",
  "version": "1.2.3",
  "environment": "production",
  "host": "api-server-01",
  "pid": 12345,

  "trace_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "span_id": "q7r8s9t0u1v2w3x4",
  "parent_span_id": "y5z6a7b8c9d0e1f2",

  "user": {
    "id": "user_123",
    "tier": "premium",
    "session_id": "session_456"
  },

  "request": {
    "id": "req_789",
    "method": "POST",
    "path": "/api/orders",
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  },

  "context": {
    "order_id": "order_abc",
    "amount": 99.99,
    "currency": "USD",
    "payment_method": "credit_card"
  },

  "performance": {
    "duration_ms": 145,
    "db_queries": 3,
    "cache_hits": 2
  },

  "message": "Order created successfully",

  "error": {
    "type": "ValidationError",
    "message": "Invalid email format",
    "stack": "Error: Invalid email format\n  at validate...",
    "code": "INVALID_EMAIL"
  }
}
```

## Logger Implementation

### Node.js/TypeScript with Pino

```typescript
// config/logger.ts
import pino from 'pino';
import { trace } from '@opentelemetry/api';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level: LOG_LEVEL,

  // Base configuration
  name: process.env.SERVICE_NAME || 'unknown-service',

  // Formatting
  formatters: {
    level(label) {
      return { level: label.toUpperCase() };
    },
    bindings(bindings) {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
        service: process.env.SERVICE_NAME,
        version: process.env.SERVICE_VERSION,
        environment: process.env.ENVIRONMENT,
      };
    },
  },

  // Timestamp
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

  // Auto-inject trace context
  mixin() {
    const span = trace.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        trace_flags: spanContext.traceFlags,
      };
    }
    return {};
  },

  // Serializers for common objects
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'creditCard',
      'ssn',
      '*.password',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

// Production: Use JSON transport
// Development: Use pretty print
if (process.env.NODE_ENV !== 'production') {
  const transport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  });

  logger.level = 'debug';
}

export default logger;
```

### Context Logger Factory

```typescript
// utils/context-logger.ts
import { logger as baseLogger } from '../config/logger';
import { Logger } from 'pino';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  orderId?: string;
  [key: string]: any;
}

export function createContextLogger(context: LogContext): Logger {
  return baseLogger.child({
    user: context.userId ? {
      id: context.userId,
      session_id: context.sessionId,
    } : undefined,
    request: context.requestId ? {
      id: context.requestId,
    } : undefined,
    context: {
      ...Object.fromEntries(
        Object.entries(context).filter(([key]) =>
          !['userId', 'sessionId', 'requestId'].includes(key)
        )
      ),
    },
  });
}

// Usage
const log = createContextLogger({
  userId: 'user_123',
  sessionId: 'session_456',
  orderId: 'order_789',
});

log.info('Processing order');
```

### Express Middleware

```typescript
// middleware/logging.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';
import { createContextLogger } from '../utils/context-logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || uuidv4();

  // Attach request ID
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Create context logger
  req.log = createContextLogger({
    requestId,
    userId: req.user?.id,
    sessionId: req.session?.id,
  });

  // Log incoming request
  req.log.info({
    request: {
      id: requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    },
  }, 'Incoming request');

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const logLevel = res.statusCode >= 500 ? 'error' :
                     res.statusCode >= 400 ? 'warn' : 'info';

    req.log[logLevel]({
      request: {
        id: requestId,
        method: req.method,
        path: req.path,
      },
      response: {
        status_code: res.statusCode,
        duration_ms: duration,
        content_length: res.get('content-length'),
      },
    }, 'Request completed');
  });

  next();
};

// Type augmentation
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      log?: Logger;
    }
  }
}
```

## Logging Patterns

### Operation Logging

```typescript
// Good: Structured, context-rich
logger.info({
  operation: 'user.registration',
  user: { id: userId, email: email },
  performance: { duration_ms: 145 },
  result: 'success',
}, 'User registration completed');

// Bad: Unstructured, lacks context
logger.info(`User ${userId} registered`);
```

### Error Logging

```typescript
// Good: Full error context
try {
  await processPayment(orderId);
} catch (error) {
  logger.error({
    error: {
      type: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    context: {
      order_id: orderId,
      user_id: userId,
      amount: amount,
    },
  }, 'Payment processing failed');

  throw error;
}

// Bad: Lost context
catch (error) {
  logger.error(error);
  throw error;
}
```

### Performance Logging

```typescript
// Good: Measure and log performance
async function fetchUserOrders(userId: string) {
  const start = Date.now();

  try {
    const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
    const duration = Date.now() - start;

    logger.debug({
      operation: 'db.query',
      query: 'fetch_user_orders',
      performance: {
        duration_ms: duration,
        rows_returned: orders.length,
      },
      context: { user_id: userId },
    }, 'Database query completed');

    return orders;
  } catch (error) {
    logger.error({
      error,
      context: { user_id: userId },
      performance: { duration_ms: Date.now() - start },
    }, 'Database query failed');

    throw error;
  }
}
```

### Business Event Logging

```typescript
// Important business events at INFO level
logger.info({
  event: 'order.created',
  order: {
    id: order.id,
    total: order.total,
    currency: order.currency,
    item_count: order.items.length,
  },
  user: {
    id: user.id,
    tier: user.tier,
  },
  marketing: {
    campaign: order.campaign,
    referrer: order.referrer,
  },
}, 'Order created');

logger.info({
  event: 'payment.completed',
  payment: {
    id: payment.id,
    method: payment.method,
    amount: payment.amount,
  },
  order: { id: order.id },
}, 'Payment completed');
```

## Security and Compliance

### PII Redaction

```typescript
// config/redaction.ts
const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,           // SSN
  /\b\d{16}\b/g,                       // Credit card
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,     // IP address
];

export function redactSensitiveData(data: any): any {
  if (typeof data === 'string') {
    let redacted = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      redacted[key] = redactSensitiveData(value);
    }
    return redacted;
  }

  return data;
}
```

### Audit Logging

```typescript
// Special audit logs for compliance
export function logAuditEvent(event: {
  action: string;
  actor: { id: string; type: 'user' | 'system' | 'admin' };
  target: { type: string; id: string };
  changes?: Record<string, { from: any; to: any }>;
  reason?: string;
}) {
  logger.info({
    audit: true,
    event_type: 'audit',
    action: event.action,
    actor: event.actor,
    target: event.target,
    changes: event.changes,
    reason: event.reason,
    timestamp: new Date().toISOString(),
  }, `Audit: ${event.action}`);
}

// Usage
logAuditEvent({
  action: 'user.role.changed',
  actor: { id: 'admin_123', type: 'admin' },
  target: { type: 'user', id: 'user_456' },
  changes: {
    role: { from: 'user', to: 'premium' },
  },
  reason: 'Customer support ticket #789',
});
```

## Log Aggregation and Storage

### Loki Configuration

```yaml
# loki/loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: gcs
      schema: v11
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: gcs

  gcs:
    bucket_name: fsm-loki-storage
    # Uses Workload Identity for authentication (no credentials needed)

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20

chunk_store_config:
  max_look_back_period: 720h  # 30 days

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days
```

### Promtail Configuration

```yaml
# promtail/promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker container logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s

    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'

      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'

      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'

    pipeline_stages:
      # Parse JSON logs
      - json:
          expressions:
            level: level
            timestamp: timestamp
            trace_id: trace_id
            message: message

      # Extract labels
      - labels:
          level:
          trace_id:

      # Set timestamp
      - timestamp:
          source: timestamp
          format: RFC3339

      # Output message
      - output:
          source: message

  # Kubernetes pods
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod

    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app

      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

    pipeline_stages:
      - json:
          expressions:
            level: level
            trace_id: trace_id

      - labels:
          level:
          trace_id:
```

### LogQL Queries

```logql
# Find all errors in the last hour
{service="api-service"} |= "level\":\"ERROR\"" | json

# Find logs for specific trace
{service="api-service"} | json | trace_id="a1b2c3d4e5f6g7h8"

# Count errors by service
sum by (service) (count_over_time({level="ERROR"}[1h]))

# Top error messages
topk(10, count by (message) (count_over_time({level="ERROR"}[1h])))

# Slow requests (>1s)
{service="api-service"}
  | json
  | performance_duration_ms > 1000
  | line_format "{{.message}} - {{.performance_duration_ms}}ms"

# User-specific logs
{service="api-service"}
  | json
  | user_id="user_123"

# Error rate over time
rate({service="api-service",level="ERROR"}[5m])

# Logs matching regex pattern
{service="api-service"}
  |~ "payment.*failed"
  | json
```

## Retention Policies

### Tiered Storage

```yaml
# retention-policy.yml
retention:
  # Hot tier: Fast SSD storage
  hot:
    duration: 7d
    storage: ssd
    compression: none

  # Warm tier: Standard disk
  warm:
    duration: 23d
    storage: hdd
    compression: gzip

  # Cold tier: GCS archive
  cold:
    duration: 60d
    storage: gcs
    compression: zstd

  # Delete after 90 days
  delete_after: 90d

# Level-specific retention
level_retention:
  FATAL: 90d
  ERROR: 60d
  WARN: 30d
  INFO: 30d
  DEBUG: 7d
  TRACE: 3d
```

## Best Practices

### DO

1. **Use structured logging** (JSON format)
2. **Include correlation IDs** for distributed tracing
3. **Log at appropriate levels** (don't over-use INFO)
4. **Add business context** (user ID, order ID, etc.)
5. **Measure and log performance** for slow operations
6. **Log errors with full context** (stack traces, input data)
7. **Use consistent field names** across services
8. **Redact sensitive data** automatically
9. **Set up log rotation** and retention policies
10. **Monitor log volume** and costs

### DON'T

1. **Don't log sensitive data** (passwords, tokens, PII)
2. **Don't log in tight loops** (impacts performance)
3. **Don't use string concatenation** (use structured fields)
4. **Don't ignore log levels** (everything as INFO)
5. **Don't log and throw** (causes duplicate logs)
6. **Don't log without context** (who, what, when, why)
7. **Don't use different formats** per service
8. **Don't keep logs forever** (storage costs)
9. **Don't block on logging** (use async logging)
10. **Don't forget log sampling** for high-volume services

## Performance Optimization

### Async Logging

```typescript
// Use async transport in production
import pino from 'pino';
import { multistream } from 'pino-multi-stream';

const streams = [
  { stream: process.stdout },
  { stream: pino.destination('/var/log/app.log') },
];

export const logger = pino(
  { level: 'info' },
  multistream(streams, { dedupe: true })
);
```

### Sampling for High Volume

```typescript
// Sample debug logs in production
const shouldLog = (level: string): boolean => {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  if (level === 'error' || level === 'fatal') {
    return true;  // Always log errors
  }

  if (level === 'debug' || level === 'trace') {
    return Math.random() < 0.1;  // Sample 10% of debug logs
  }

  return true;
};
```

## Summary

This logging standard ensures:

- **Structured, machine-readable logs** for easy querying
- **Rich context** with correlation IDs and business metadata
- **Security compliance** through automatic PII redaction
- **Cost efficiency** through retention policies and sampling
- **Performance optimization** with async logging
- **Operational excellence** with proper log levels and patterns
