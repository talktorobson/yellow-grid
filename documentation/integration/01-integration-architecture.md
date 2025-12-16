# Integration Architecture

## Overview

The Field Service Management system employs a sophisticated integration architecture designed for reliability, scalability, and fault tolerance. This document outlines the core patterns, strategies, and components that enable seamless communication with external systems.

## Architecture Principles

### 1. Loose Coupling
- Event-driven architecture for asynchronous communication
- API contracts versioned independently
- Integration adapters isolated from core business logic

### 2. Reliability
- Circuit breakers for external service protection
- Retry mechanisms with exponential backoff
- Idempotency guarantees for all operations

### 3. Scalability
- Message queue-based asynchronous processing
- Horizontal scaling of integration workers
- Rate limiting and throttling

### 4. Observability
- Distributed tracing across all integrations
- Comprehensive logging and metrics
- Real-time monitoring and alerting

## Core Integration Patterns

### Adapter Pattern

All external integrations implement a standardized adapter interface, isolating external dependencies from core business logic.

```typescript
interface IntegrationAdapter<TRequest, TResponse> {
  // Unique identifier for the adapter
  readonly adapterId: string;

  // Adapter version (semantic versioning)
  readonly version: string;

  // Execute integration operation
  execute(request: TRequest, context: IntegrationContext): Promise<TResponse>;

  // Validate request before execution
  validate(request: TRequest): ValidationResult;

  // Transform external response to internal format
  transform(externalResponse: unknown): TResponse;

  // Health check
  healthCheck(): Promise<HealthStatus>;
}

interface IntegrationContext {
  correlationId: string;
  tenantId: string;
  userId: string;
  timestamp: Date;
  retryCount: number;
  metadata: Record<string, unknown>;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastChecked: Date;
  details?: Record<string, unknown>;
}
```

#### Example Adapter Implementation

```typescript
class SalesSystemAdapter implements IntegrationAdapter<OrderIntakeRequest, OrderIntakeResponse> {
  readonly adapterId = 'sales-system-pyxis';
  readonly version = '2.1.0';

  constructor(
    private httpClient: HttpClient,
    private config: SalesSystemConfig,
    private circuitBreaker: CircuitBreaker,
    private logger: Logger
  ) {}

  async execute(
    request: OrderIntakeRequest,
    context: IntegrationContext
  ): Promise<OrderIntakeResponse> {
    this.logger.info('Executing sales system integration', {
      correlationId: context.correlationId,
      orderId: request.orderId
    });

    // Validate request
    const validation = this.validate(request);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // Execute with circuit breaker
    const response = await this.circuitBreaker.execute(async () => {
      return await this.httpClient.post(
        `${this.config.baseUrl}/api/v2/orders/intake`,
        {
          headers: {
            'X-Correlation-ID': context.correlationId,
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'X-Idempotency-Key': this.generateIdempotencyKey(request, context)
          },
          body: this.transformRequest(request)
        }
      );
    });

    return this.transform(response);
  }

  private generateIdempotencyKey(
    request: OrderIntakeRequest,
    context: IntegrationContext
  ): string {
    return createHash('sha256')
      .update(`${request.orderId}-${context.timestamp.toISOString()}`)
      .digest('hex');
  }
}
```

### Idempotency Pattern

All integration operations are idempotent, ensuring safe retries without side effects.

#### Implementation Strategy

```typescript
class IdempotencyManager {
  constructor(
    private cache: RedisClient,
    private ttl: number = 86400 // 24 hours
  ) {}

  async execute<T>(
    idempotencyKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check cache for existing result
    const cached = await this.cache.get(idempotencyKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // Acquire distributed lock
    const lock = await this.acquireLock(idempotencyKey);
    if (!lock) {
      // Another process is handling this, wait and retry
      await this.sleep(100);
      return this.execute(idempotencyKey, operation);
    }

    try {
      // Execute operation
      const result = await operation();

      // Cache result
      await this.cache.setex(
        idempotencyKey,
        this.ttl,
        JSON.stringify(result)
      );

      return result;
    } finally {
      await this.releaseLock(idempotencyKey);
    }
  }

  private async acquireLock(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const acquired = await this.cache.set(
      lockKey,
      '1',
      'EX', 300, // 5 minute expiry
      'NX'
    );
    return acquired === 'OK';
  }

  private async releaseLock(key: string): Promise<void> {
    await this.cache.del(`lock:${key}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Usage Example

```typescript
const idempotencyManager = new IdempotencyManager(redisClient);

const result = await idempotencyManager.execute(
  idempotencyKey,
  async () => {
    return await salesAdapter.execute(request, context);
  }
);
```

### Circuit Breaker Pattern

Circuit breakers protect the system from cascading failures when external services are unavailable.

#### Implementation

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: Date = new Date();

  constructor(
    private config: CircuitBreakerConfig,
    private logger: Logger,
    private metrics: MetricsCollector
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (new Date() < this.nextAttempt) {
        throw new CircuitOpenError('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      this.logger.info('Circuit breaker transitioning to HALF_OPEN');
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError('Operation timeout')),
          this.config.timeout
        )
      )
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        this.logger.info('Circuit breaker closed');
        this.metrics.recordCircuitState('CLOSED');
      }
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.successCount = 0;

    this.logger.error('Circuit breaker failure', { error });

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);

      this.logger.warn('Circuit breaker opened', {
        nextAttempt: this.nextAttempt
      });

      this.metrics.recordCircuitState('OPEN');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.logger.info('Circuit breaker manually reset');
  }
}
```

#### Circuit Breaker Configuration

```typescript
const circuitBreakerConfigs = {
  salesSystem: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    resetTimeout: 60000 // 1 minute
  },
  erpSystem: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 45000, // 45 seconds
    resetTimeout: 120000 // 2 minutes
  },
  eSignature: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000, // 60 seconds
    resetTimeout: 300000 // 5 minutes
  },
  communicationGateway: {
    failureThreshold: 10,
    successThreshold: 3,
    timeout: 15000, // 15 seconds
    resetTimeout: 30000 // 30 seconds
  }
};
```

## Retry Strategy

### Exponential Backoff with Jitter

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  jitterFactor: number;
}

class RetryStrategy {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    isRetryable: (error: Error) => boolean = () => true
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (!isRetryable(lastError)) {
          throw lastError;
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.config.initialDelay * Math.pow(this.config.multiplier, attempt),
      this.config.maxDelay
    );

    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();

    return exponentialDelay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Retry Configuration by Integration Type

```typescript
const retryConfigs = {
  salesSystem: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitterFactor: 0.1
  },
  erpSystem: {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    multiplier: 2,
    jitterFactor: 0.2
  },
  eSignature: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitterFactor: 0.1
  },
  communicationGateway: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 10000,
    multiplier: 2,
    jitterFactor: 0.15
  }
};
```

### Retryable Error Classification

```typescript
class ErrorClassifier {
  isRetryable(error: Error): boolean {
    // Network errors are retryable
    if (this.isNetworkError(error)) {
      return true;
    }

    // HTTP 5xx errors are retryable
    if (this.isServerError(error)) {
      return true;
    }

    // Rate limiting is retryable
    if (this.isRateLimitError(error)) {
      return true;
    }

    // Timeout errors are retryable
    if (error instanceof TimeoutError) {
      return true;
    }

    // Circuit breaker open is not retryable
    if (error instanceof CircuitOpenError) {
      return false;
    }

    // Client errors (4xx) are generally not retryable
    if (this.isClientError(error)) {
      return false;
    }

    return false;
  }

  private isNetworkError(error: Error): boolean {
    return error.message.includes('ECONNREFUSED') ||
           error.message.includes('ETIMEDOUT') ||
           error.message.includes('ENOTFOUND');
  }

  private isServerError(error: Error): boolean {
    if ('status' in error) {
      const status = (error as any).status;
      return status >= 500 && status < 600;
    }
    return false;
  }

  private isRateLimitError(error: Error): boolean {
    if ('status' in error) {
      return (error as any).status === 429;
    }
    return false;
  }

  private isClientError(error: Error): boolean {
    if ('status' in error) {
      const status = (error as any).status;
      return status >= 400 && status < 500;
    }
    return false;
  }
}
```

## Dead Letter Queue (DLQ) Handling

Messages that fail all retry attempts are sent to a Dead Letter Queue for manual investigation.

```typescript
interface DLQMessage {
  originalMessage: unknown;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata: {
    attempts: number;
    firstAttempt: Date;
    lastAttempt: Date;
    correlationId: string;
    adapterId: string;
  };
}

class DeadLetterQueueHandler {
  constructor(
    private kafkaProducer: KafkaProducer,
    private logger: Logger,
    private alerting: AlertingService
  ) {}

  async sendToDLQ(
    message: unknown,
    error: Error,
    metadata: {
      attempts: number;
      firstAttempt: Date;
      lastAttempt: Date;
      correlationId: string;
      adapterId: string;
    }
  ): Promise<void> {
    const dlqMessage: DLQMessage = {
      originalMessage: message,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      },
      metadata
    };

    await this.kafkaProducer.send({
      topic: 'integration.dlq',
      messages: [{
        key: metadata.correlationId,
        value: JSON.stringify(dlqMessage),
        headers: {
          'adapter-id': metadata.adapterId,
          'error-type': error.constructor.name
        }
      }]
    });

    this.logger.error('Message sent to DLQ', {
      correlationId: metadata.correlationId,
      adapterId: metadata.adapterId,
      error: error.message
    });

    // Alert on-call team
    await this.alerting.sendAlert({
      severity: 'high',
      title: 'Message sent to DLQ',
      description: `Integration failed after ${metadata.attempts} attempts`,
      metadata: {
        correlationId: metadata.correlationId,
        adapterId: metadata.adapterId,
        error: error.message
      }
    });
  }

  async reprocessDLQMessage(messageId: string): Promise<void> {
    // Implementation for manual DLQ message reprocessing
  }
}
```

## Rate Limiting

### Token Bucket Algorithm

```typescript
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: Date;

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
    private storage: RedisClient
  ) {
    this.tokens = capacity;
    this.lastRefill = new Date();
  }

  async acquire(key: string, tokensRequested: number = 1): Promise<boolean> {
    await this.refill(key);

    const currentTokens = await this.getCurrentTokens(key);

    if (currentTokens >= tokensRequested) {
      await this.consumeTokens(key, tokensRequested);
      return true;
    }

    return false;
  }

  private async refill(key: string): Promise<void> {
    const now = new Date();
    const data = await this.getData(key);

    const timePassed = (now.getTime() - data.lastRefill.getTime()) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    const newTokens = Math.min(
      this.capacity,
      data.tokens + tokensToAdd
    );

    await this.setData(key, {
      tokens: newTokens,
      lastRefill: now
    });
  }

  private async getCurrentTokens(key: string): Promise<number> {
    const data = await this.getData(key);
    return data.tokens;
  }

  private async consumeTokens(key: string, amount: number): Promise<void> {
    const data = await this.getData(key);
    await this.setData(key, {
      tokens: data.tokens - amount,
      lastRefill: data.lastRefill
    });
  }

  private async getData(key: string): Promise<{ tokens: number; lastRefill: Date }> {
    const data = await this.storage.get(`ratelimit:${key}`);
    if (!data) {
      return { tokens: this.capacity, lastRefill: new Date() };
    }
    return JSON.parse(data);
  }

  private async setData(
    key: string,
    data: { tokens: number; lastRefill: Date }
  ): Promise<void> {
    await this.storage.setex(
      `ratelimit:${key}`,
      3600,
      JSON.stringify(data)
    );
  }
}
```

### Rate Limit Configuration

```typescript
const rateLimitConfigs = {
  salesSystem: {
    capacity: 100,
    refillRate: 10 // 10 requests per second
  },
  erpSystem: {
    capacity: 50,
    refillRate: 5 // 5 requests per second
  },
  eSignature: {
    capacity: 20,
    refillRate: 2 // 2 requests per second
  },
  smsGateway: {
    capacity: 50,
    refillRate: 10 // 10 requests per second
  },
  emailGateway: {
    capacity: 100,
    refillRate: 20 // 20 requests per second
  }
};
```

## Monitoring and Observability

### Distributed Tracing

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

class TracedIntegrationAdapter<TRequest, TResponse>
  implements IntegrationAdapter<TRequest, TResponse> {

  constructor(
    private adapter: IntegrationAdapter<TRequest, TResponse>,
    private tracer = trace.getTracer('integration-adapter')
  ) {}

  get adapterId() { return this.adapter.adapterId; }
  get version() { return this.adapter.version; }

  async execute(
    request: TRequest,
    ctx: IntegrationContext
  ): Promise<TResponse> {
    const span = this.tracer.startSpan('integration.execute', {
      attributes: {
        'adapter.id': this.adapterId,
        'adapter.version': this.version,
        'correlation.id': ctx.correlationId,
        'tenant.id': ctx.tenantId
      }
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await this.adapter.execute(request, ctx);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  validate(request: TRequest): ValidationResult {
    return this.adapter.validate(request);
  }

  transform(externalResponse: unknown): TResponse {
    return this.adapter.transform(externalResponse);
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.adapter.healthCheck();
  }
}
```

### Metrics Collection

```typescript
interface IntegrationMetrics {
  requestCount: Counter;
  requestDuration: Histogram;
  errorCount: Counter;
  circuitBreakerState: Gauge;
  retryCount: Counter;
}

class MetricsCollector {
  private metrics: IntegrationMetrics;

  constructor(private metricsRegistry: MetricsRegistry) {
    this.metrics = {
      requestCount: metricsRegistry.counter({
        name: 'integration_requests_total',
        help: 'Total number of integration requests',
        labelNames: ['adapter_id', 'status']
      }),
      requestDuration: metricsRegistry.histogram({
        name: 'integration_request_duration_seconds',
        help: 'Integration request duration in seconds',
        labelNames: ['adapter_id'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
      }),
      errorCount: metricsRegistry.counter({
        name: 'integration_errors_total',
        help: 'Total number of integration errors',
        labelNames: ['adapter_id', 'error_type']
      }),
      circuitBreakerState: metricsRegistry.gauge({
        name: 'integration_circuit_breaker_state',
        help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
        labelNames: ['adapter_id']
      }),
      retryCount: metricsRegistry.counter({
        name: 'integration_retries_total',
        help: 'Total number of retry attempts',
        labelNames: ['adapter_id']
      })
    };
  }

  recordRequest(adapterId: string, status: 'success' | 'failure'): void {
    this.metrics.requestCount.labels(adapterId, status).inc();
  }

  recordDuration(adapterId: string, duration: number): void {
    this.metrics.requestDuration.labels(adapterId).observe(duration);
  }

  recordError(adapterId: string, errorType: string): void {
    this.metrics.errorCount.labels(adapterId, errorType).inc();
  }

  recordCircuitState(adapterId: string, state: CircuitState): void {
    const stateValue = { 'CLOSED': 0, 'HALF_OPEN': 1, 'OPEN': 2 }[state];
    this.metrics.circuitBreakerState.labels(adapterId).set(stateValue);
  }

  recordRetry(adapterId: string): void {
    this.metrics.retryCount.labels(adapterId).inc();
  }
}
```

## Health Check System

```typescript
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    latency?: number;
    message?: string;
  }>;
  timestamp: Date;
}

class IntegrationHealthChecker {
  constructor(
    private adapters: Map<string, IntegrationAdapter<any, any>>,
    private logger: Logger
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const checks: Record<string, any> = {};

    await Promise.all(
      Array.from(this.adapters.entries()).map(async ([id, adapter]) => {
        try {
          const health = await adapter.healthCheck();
          checks[id] = {
            status: this.mapHealthStatus(health.status),
            latency: health.latency,
            message: health.status
          };
        } catch (error) {
          checks[id] = {
            status: 'fail',
            message: (error as Error).message
          };
        }
      })
    );

    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      checks,
      timestamp: new Date()
    };
  }

  private mapHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): 'pass' | 'fail' | 'warn' {
    return {
      'healthy': 'pass',
      'degraded': 'warn',
      'unhealthy': 'fail'
    }[status] as 'pass' | 'fail' | 'warn';
  }

  private determineOverallStatus(
    checks: Record<string, { status: 'pass' | 'fail' | 'warn' }>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(c => c.status);

    if (statuses.every(s => s === 'pass')) {
      return 'healthy';
    }

    if (statuses.some(s => s === 'fail')) {
      return 'unhealthy';
    }

    return 'degraded';
  }
}
```

## Security Considerations

### API Key Management

```typescript
class SecretManager {
  constructor(private vault: VaultClient) {}

  async getApiKey(adapterId: string, tenantId: string): Promise<string> {
    const path = `integrations/${tenantId}/${adapterId}/api-key`;
    const secret = await this.vault.read(path);
    return secret.data.key;
  }

  async rotateApiKey(
    adapterId: string,
    tenantId: string,
    newKey: string
  ): Promise<void> {
    const path = `integrations/${tenantId}/${adapterId}/api-key`;
    await this.vault.write(path, { key: newKey });
  }
}
```

### Request Signing

```typescript
class RequestSigner {
  sign(payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  verify(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.sign(payload, secret);
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

## Best Practices

1. **Always use idempotency keys** for all write operations
2. **Implement circuit breakers** for all external service calls
3. **Log correlation IDs** for distributed tracing
4. **Monitor adapter health** and set up alerts
5. **Use semantic versioning** for adapter versions
6. **Validate all requests** before execution
7. **Handle partial failures** gracefully
8. **Implement proper timeout** strategies
9. **Use structured logging** for better observability
10. **Test failure scenarios** thoroughly

## Next Steps

- [Event Schema Registry](./02-event-schema-registry.md)
- [Sales Integration](./03-sales-integration.md)
- [ERP Integration](./04-erp-integration.md)
