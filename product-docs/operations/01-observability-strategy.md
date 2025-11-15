# Observability Strategy

## Overview

This document outlines the comprehensive observability strategy for our distributed systems, focusing on the three pillars of observability: metrics, logs, and traces.

## Architecture

### Technology Stack

- **Tracing**: OpenTelemetry (OTLP)
- **Metrics**: Prometheus + OpenTelemetry
- **Logging**: Structured JSON logging with correlation IDs
- **Visualization**: Grafana
- **Storage**:
  - Prometheus (metrics - 30 days)
  - Tempo (traces - 7 days)
  - Loki (logs - 30 days)

### High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Services   │────▶│ OTel Agent  │────▶│   Collector │
│  (Apps)     │     │  (Sidecar)  │     │   (Gateway) │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
              ┌──────────┐              ┌──────────┐              ┌──────────┐
              │Prometheus│              │  Tempo   │              │   Loki   │
              │(Metrics) │              │ (Traces) │              │  (Logs)  │
              └──────────┘              └──────────┘              └──────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               ▼
                                        ┌──────────┐
                                        │ Grafana  │
                                        │(Visualize)│
                                        └──────────┘
```

## OpenTelemetry Implementation

### SDK Configuration

#### Node.js/TypeScript

```typescript
// config/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';

export function initTelemetry() {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'unknown-service',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '0.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.ENVIRONMENT || 'development',
      'service.namespace': process.env.SERVICE_NAMESPACE || 'default',
      'service.instance.id': process.env.HOSTNAME || 'local',
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: {},
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
        headers: {},
      }),
      exportIntervalMillis: 60000, // Export every 60 seconds
    }),
    instrumentations: [
      new HttpInstrumentation({
        requestHook: (span, request) => {
          span.setAttribute('http.request.header.user-agent', request.headers['user-agent']);
        },
      }),
      new ExpressInstrumentation(),
      new PrismaInstrumentation(),
      new RedisInstrumentation(),
    ],
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}
```

### Custom Spans and Attributes

```typescript
// utils/tracing.ts
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

const tracer = trace.getTracer('app-tracer', '1.0.0');

export async function traceAsyncOperation<T>(
  operationName: string,
  attributes: Record<string, string | number | boolean>,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      // Add custom attributes
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });

      const result = await operation(span);

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

// Example usage
export async function processUserOrder(userId: string, orderId: string) {
  return traceAsyncOperation(
    'process.user.order',
    {
      'user.id': userId,
      'order.id': orderId,
      'business.operation': 'order_processing',
    },
    async (span) => {
      // Business logic here
      const order = await fetchOrder(orderId);
      span.addEvent('order.fetched', { 'order.status': order.status });

      const validated = await validateOrder(order);
      span.addEvent('order.validated', { 'validation.result': validated });

      return processPayment(order);
    }
  );
}
```

## Correlation Strategy

### Trace ID Propagation

```typescript
// middleware/correlation.ts
import { trace, context } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get trace context
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId || uuidv4();
  const spanId = span?.spanContext().spanId || uuidv4();

  // Attach to request
  req.traceId = traceId;
  req.spanId = spanId;

  // Add to response headers for client-side correlation
  res.setHeader('X-Trace-Id', traceId);
  res.setHeader('X-Span-Id', spanId);

  // Add to logs
  req.log = req.log?.child({ traceId, spanId }) || console;

  next();
};

// Type augmentation
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      spanId?: string;
    }
  }
}
```

### Cross-Service Correlation

```typescript
// services/http-client.ts
import axios, { AxiosInstance } from 'axios';
import { trace, context, propagation } from '@opentelemetry/api';

export function createInstrumentedHttpClient(): AxiosInstance {
  const client = axios.create({
    timeout: 30000,
  });

  // Inject trace context into outgoing requests
  client.interceptors.request.use((config) => {
    const span = trace.getActiveSpan();

    if (span) {
      // Inject W3C Trace Context headers
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      config.headers = {
        ...config.headers,
        ...carrier,
      };
    }

    return config;
  });

  return client;
}
```

## Metrics Instrumentation

### Custom Metrics

```typescript
// metrics/business-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('business-metrics', '1.0.0');

// Counter: Total orders processed
export const ordersProcessedCounter = meter.createCounter('orders.processed', {
  description: 'Total number of orders processed',
  unit: '1',
});

// Histogram: Order processing duration
export const orderProcessingDuration = meter.createHistogram('orders.processing.duration', {
  description: 'Duration of order processing in milliseconds',
  unit: 'ms',
});

// UpDownCounter: Active users
export const activeUsersGauge = meter.createUpDownCounter('users.active', {
  description: 'Number of currently active users',
  unit: '1',
});

// Observable Gauge: Queue depth
export const queueDepthObservable = meter.createObservableGauge('queue.depth', {
  description: 'Current depth of processing queue',
  unit: '1',
});

queueDepthObservable.addCallback(async (observableResult) => {
  const depth = await getQueueDepth(); // Your implementation
  observableResult.observe(depth, {
    'queue.name': 'order-processing',
  });
});

// Usage example
export function recordOrderProcessing(
  orderId: string,
  userId: string,
  duration: number,
  status: 'success' | 'failure'
) {
  const attributes = {
    'order.id': orderId,
    'user.id': userId,
    'order.status': status,
  };

  ordersProcessedCounter.add(1, attributes);
  orderProcessingDuration.record(duration, attributes);
}
```

## Log Correlation

### Structured Logging with Trace Context

```typescript
// config/logger.ts
import pino from 'pino';
import { trace } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
    bindings(bindings) {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
        service: process.env.SERVICE_NAME,
      };
    },
  },
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
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Usage
logger.info({ userId: '123', action: 'login' }, 'User logged in successfully');
// Output: {"level":"info","time":1699564800000,"pid":12345,"host":"server-1","service":"auth-service","trace_id":"a1b2c3d4...","span_id":"e5f6g7h8...","userId":"123","action":"login","msg":"User logged in successfully"}
```

## Grafana Integration

### Data Source Configuration

```yaml
# grafana/datasources.yml
apiVersion: 1

datasources:
  # Prometheus for metrics
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: 15s
      exemplarTraceIdDestinations:
        - name: trace_id
          datasourceUid: tempo

  # Tempo for traces
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    uid: tempo
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ['job', 'instance', 'pod', 'namespace']
        mappedTags: [{ key: 'service.name', value: 'service' }]
        mapTagNamesEnabled: false
        spanStartTimeShift: '1h'
        spanEndTimeShift: '1h'
        filterByTraceID: false
        filterBySpanID: false
      tracesToMetrics:
        datasourceUid: prometheus
        tags: [{ key: 'service.name', value: 'service' }]
        queries:
          - name: 'Sample query'
            query: 'sum(rate(tempo_spanmetrics_latency_bucket{$__tags}[5m]))'
      serviceMap:
        datasourceUid: prometheus
      nodeGraph:
        enabled: true

  # Loki for logs
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    uid: loki
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: "trace_id=(\\w+)"
          name: TraceID
          url: '$${__value.raw}'
```

### Metrics to Traces to Logs Navigation

```yaml
# Example flow configuration
# 1. User sees high error rate in Prometheus metric
# 2. Clicks on exemplar to jump to related trace in Tempo
# 3. From trace, clicks on log correlation to see logs in Loki
# 4. All connected via trace_id

# Prometheus query with exemplars
rate(http_request_duration_seconds_count{job="api-service"}[5m])

# Tempo trace view shows:
# - Span details with trace_id
# - Link to logs with same trace_id
# - Link to metrics for that service

# Loki query using trace_id from Tempo
{service_name="api-service"} | json | trace_id="a1b2c3d4e5f6g7h8"
```

## Context Propagation

### W3C Trace Context Headers

```typescript
// Example HTTP headers for distributed tracing
const headers = {
  // W3C Trace Context
  'traceparent': '00-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-q7r8s9t0u1v2w3x4-01',
  // Format: version-trace_id-parent_span_id-trace_flags

  'tracestate': 'vendor1=value1,vendor2=value2',
  // Optional vendor-specific trace information

  // Custom correlation headers (optional, for backwards compatibility)
  'X-Correlation-ID': 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  'X-Request-ID': 'q7r8s9t0-u1v2-w3x4-y5z6-a7b8c9d0e1f2',
};
```

## Sampling Strategy

### Probabilistic Sampling

```typescript
// config/sampling.ts
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

export const sampler = new ParentBasedSampler({
  // Root spans: sample 10% of traces
  root: new TraceIdRatioBasedSampler(0.1),
});

// For production, use adaptive sampling based on importance
export class AdaptiveSampler {
  shouldSample(spanName: string, attributes: Record<string, any>): boolean {
    // Always sample errors
    if (attributes['http.status_code'] >= 400) {
      return true;
    }

    // Always sample slow requests
    if (attributes['http.response.duration'] > 1000) {
      return true;
    }

    // Sample 100% of checkout flows
    if (spanName.includes('checkout') || spanName.includes('payment')) {
      return true;
    }

    // Sample 1% of health checks
    if (spanName.includes('health')) {
      return Math.random() < 0.01;
    }

    // Default: 10% sampling
    return Math.random() < 0.1;
  }
}
```

## Performance Considerations

### Resource Limits

```yaml
# opentelemetry-collector-config.yml
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  resource:
    attributes:
      - key: deployment.environment
        value: ${ENVIRONMENT}
        action: upsert

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: otel
    const_labels:
      environment: ${ENVIRONMENT}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [prometheus]
```

## Best Practices

### 1. Trace Naming Conventions

```typescript
// Good: Descriptive, hierarchical
'http.server.request'
'database.query.select'
'cache.redis.get'
'payment.process.validate'

// Bad: Too generic or inconsistent
'request'
'db'
'process'
```

### 2. Attribute Standards

```typescript
// Use semantic conventions
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

span.setAttribute(SemanticAttributes.HTTP_METHOD, 'POST');
span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, 200);
span.setAttribute(SemanticAttributes.DB_SYSTEM, 'postgresql');
span.setAttribute(SemanticAttributes.DB_STATEMENT, 'SELECT * FROM users WHERE id = $1');

// Custom business attributes with prefixes
span.setAttribute('app.user.id', userId);
span.setAttribute('app.order.id', orderId);
span.setAttribute('app.feature.flag', 'new_checkout');
```

### 3. Error Handling

```typescript
try {
  await riskyOperation();
} catch (error) {
  const span = trace.getActiveSpan();

  if (span) {
    // Record exception with full context
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });

    // Add business context
    span.setAttribute('error.handled', true);
    span.setAttribute('error.recovery.attempted', true);
  }

  // Log with correlation
  logger.error({ err: error, traceId: span?.spanContext().traceId }, 'Operation failed');

  throw error;
}
```

### 4. High Cardinality Attributes

```typescript
// Avoid high cardinality in metric labels
// BAD: Will create millions of time series
ordersCounter.add(1, { 'user.id': userId, 'order.id': orderId });

// GOOD: Use bounded cardinality
ordersCounter.add(1, {
  'order.status': status,  // Limited values: pending, completed, failed
  'order.type': type,      // Limited values: standard, express, bulk
  'user.tier': tier,       // Limited values: free, premium, enterprise
});

// Use high cardinality attributes only in traces and logs
span.setAttribute('user.id', userId);
span.setAttribute('order.id', orderId);
```

## Security Considerations

### Sensitive Data Handling

```typescript
// config/sanitization.ts
export function sanitizeAttributes(attributes: Record<string, any>): Record<string, any> {
  const sensitive = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];

  const sanitized = { ...attributes };

  Object.keys(sanitized).forEach((key) => {
    if (sensitive.some((term) => key.toLowerCase().includes(term))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Usage
span.setAttributes(sanitizeAttributes(userInput));
```

## Deployment Configuration

### Kubernetes Sidecar Pattern

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      containers:
      - name: app
        image: api-service:latest
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://localhost:4318"
        - name: SERVICE_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['app']
        - name: SERVICE_VERSION
          value: "1.0.0"

      # OpenTelemetry Collector sidecar
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args: ["--config=/conf/otel-collector-config.yml"]
        volumeMounts:
        - name: otel-config
          mountPath: /conf

      volumes:
      - name: otel-config
        configMap:
          name: otel-collector-config
```

## Summary

This observability strategy provides:

- **End-to-end tracing** with OpenTelemetry
- **Metric correlation** via exemplars
- **Log correlation** via trace IDs
- **Unified visualization** in Grafana
- **Cross-service context propagation** with W3C standards
- **Performance optimization** through sampling
- **Security** through data sanitization

The implementation ensures that every request can be traced from entry point through all services, with metrics and logs correlated at every step.
