import { Logger } from '@nestjs/common';

/**
 * Base Worker Pattern for Camunda 8 Zeebe Workers
 *
 * Best practices implemented:
 * - Idempotency key generation
 * - Retry with exponential backoff
 * - Error classification (retryable vs. BPMN error)
 * - Logging with timing
 * - Type-safe input/output
 */
export abstract class BaseWorker<TInput = any, TOutput = any> {
  protected abstract readonly logger: Logger;

  /** Task type matching BPMN service task definition */
  abstract readonly taskType: string;

  /** Default timeout in milliseconds */
  readonly timeout: number = 30000;

  /** Maximum retries for failed jobs */
  readonly maxRetries: number = 3;

  /**
   * Main handler logic - implement in subclass
   */
  abstract handle(job: ZeebeJob<TInput>): Promise<TOutput>;

  /**
   * Generate idempotency key for deduplication
   */
  protected getIdempotencyKey(job: ZeebeJob<TInput>): string {
    return `${job.processInstanceKey}-${job.key}`;
  }

  /**
   * Create the Zeebe task handler function
   */
  createHandler(): (job: ZeebeJob<TInput>) => Promise<any> {
    return async (job: ZeebeJob<TInput>) => {
      const startTime = Date.now();
      const idempotencyKey = this.getIdempotencyKey(job);

      this.logger.log(
        `[${this.taskType}] Starting job ${job.key} ` +
          `(process: ${job.processInstanceKey}, idempotency: ${idempotencyKey})`,
      );

      try {
        const result = await this.handle(job);

        const duration = Date.now() - startTime;
        this.logger.log(`[${this.taskType}] Completed job ${job.key} in ${duration}ms`);

        return job.complete(result);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        this.logger.error(
          `[${this.taskType}] Failed job ${job.key} after ${duration}ms: ${error.message}`,
          error.stack,
        );

        // Determine error type
        if (this.isBpmnError(error)) {
          // Business logic error - throw BPMN error for error boundary
          return job.error(error.code || 'BUSINESS_ERROR', error.message);
        }

        if (this.isRetryableError(error)) {
          // Transient error - retry with backoff
          const retriesLeft = job.retries - 1;

          if (retriesLeft > 0) {
            const backoff = this.calculateBackoff(retriesLeft);
            this.logger.warn(
              `[${this.taskType}] Retrying job ${job.key} in ${backoff}ms (${retriesLeft} retries left)`,
            );

            return job.fail({
              errorMessage: error.message,
              retries: retriesLeft,
              retryBackOff: backoff,
            });
          }
        }

        // No retries left or non-retryable error
        return job.fail({
          errorMessage: `${error.message} (no retries left)`,
          retries: 0,
        });
      }
    };
  }

  /**
   * Check if error should trigger BPMN error boundary
   */
  protected isBpmnError(error: any): boolean {
    return error.isBpmnError === true || error.code?.startsWith('BPMN_');
  }

  /**
   * Check if error is retryable (transient failures)
   */
  protected isRetryableError(error: any): boolean {
    const retryableCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNRESET',
      'EPIPE',
    ];

    if (retryableCodes.includes(error.code)) {
      return true;
    }

    // HTTP 5xx errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limiting
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  protected calculateBackoff(retriesLeft: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = 1000;
    const exponent = this.maxRetries - retriesLeft;
    return Math.min(baseDelay * Math.pow(2, exponent), 60000); // Max 60s
  }
}

/**
 * Zeebe Job interface for type safety
 */
export interface ZeebeJob<T = any> {
  key: string;
  type: string;
  processInstanceKey: string;
  bpmnProcessId: string;
  processDefinitionVersion: number;
  elementId: string;
  elementInstanceKey: string;
  customHeaders: Record<string, string>;
  worker: string;
  retries: number;
  deadline: string;
  variables: T;

  complete(variables?: any): Promise<any>;
  fail(failConfig: { errorMessage: string; retries: number; retryBackOff?: number }): Promise<any>;
  error(errorCode: string, errorMessage: string, variables?: any): Promise<any>;
}

/**
 * Custom BPMN Error for business logic failures
 */
export class BpmnError extends Error {
  readonly isBpmnError = true;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BpmnError';
  }
}
