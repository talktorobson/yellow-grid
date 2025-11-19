export interface IntegrationContext {
  correlationId: string;
  tenantId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency: number;
  lastChecked: Date;
  details?: Record<string, unknown>;
}

export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface IntegrationAdapter<TRequest, TResponse> {
  readonly adapterId: string;
  readonly version: string;

  /**
   * Execute the integration adapter with the given request and context
   */
  execute(request: TRequest, context: IntegrationContext): Promise<TResponse>;

  /**
   * Validate the request before processing
   */
  validate(request: TRequest): ValidationResult;

  /**
   * Transform external response to internal format
   */
  transform(externalResponse: unknown): TResponse;

  /**
   * Health check for the integration
   */
  healthCheck(): Promise<HealthStatus>;
}
