import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { nanoid } from 'nanoid';

/**
 * Interceptor for logging HTTP requests and responses.
 *
 * Generates a correlation ID for each request, logs the method, URL, status code, and duration.
 * Logs errors if the request fails.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  /**
   * Intercepts the request/response cycle to log details.
   *
   * @param context - The execution context.
   * @param next - The call handler.
   * @returns An observable that handles the request processing.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const correlationId = nanoid(10);

    // Add correlation ID to request
    request.correlationId = correlationId;

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - now;

          this.logger.log(`[${correlationId}] ${method} ${url} ${statusCode} - ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `[${correlationId}] ${method} ${url} ERROR - ${duration}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}
