import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * Common test helpers and utilities
 */

/**
 * Login helper - returns access token for authenticated requests
 */
export async function loginAsProvider(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/provider/login')
    .send({ email, password })
    .expect(200);

  return response.body.accessToken;
}

/**
 * Login as internal operator
 */
export async function loginAsOperator(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body.accessToken;
}

/**
 * Register a provider user and return auth token
 */
export async function registerProvider(
  app: INestApplication,
  providerId: string,
  email?: string,
): Promise<{ accessToken: string; userId: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/provider/register')
    .send({
      email: email || `provider-${Date.now()}@test.com`,
      password: 'TestPassword123!@#',
      firstName: 'Test',
      lastName: 'Provider',
      phone: '+34600000000',
      providerId,
      countryCode: 'ES',
      businessUnit: 'LM_ES',
    })
    .expect(201);

  return {
    accessToken: response.body.accessToken,
    userId: response.body.user.id,
  };
}

/**
 * Make authenticated request with bearer token
 */
export function authenticatedRequest(
  app: INestApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string,
) {
  return request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);
}

/**
 * Wait for a specific time (useful for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or max attempts reached
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 100,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delayMs);
      }
    }
  }

  throw lastError!;
}

/**
 * Assert that a date is recent (within last N seconds)
 */
export function expectRecentDate(date: string | Date, withinSeconds: number = 10): void {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffSeconds = (now.getTime() - dateObj.getTime()) / 1000;

  expect(diffSeconds).toBeLessThan(withinSeconds);
  expect(diffSeconds).toBeGreaterThanOrEqual(0);
}

/**
 * Expect array to contain object matching partial properties
 */
export function expectArrayToContainObject(array: any[], partialObject: any): void {
  const match = array.find((item) => {
    return Object.keys(partialObject).every((key) => {
      if (typeof partialObject[key] === 'object' && partialObject[key] !== null) {
        return JSON.stringify(item[key]) === JSON.stringify(partialObject[key]);
      }
      return item[key] === partialObject[key];
    });
  });

  expect(match).toBeDefined();
}

/**
 * Generate random test email
 */
export function randomEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

/**
 * Generate random phone number (ES format)
 */
export function randomPhone(): string {
  const number = Math.floor(Math.random() * 900000000) + 100000000;
  return `+34${number}`;
}

/**
 * Assert error response structure
 */
export function expectErrorResponse(response: request.Response, expectedMessage?: string) {
  expect(response.body).toHaveProperty('statusCode');
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('error');

  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage);
  }
}

/**
 * Assert paginated response structure
 */
export function expectPaginatedResponse(response: request.Response) {
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('pagination');
  expect(response.body.pagination).toHaveProperty('page');
  expect(response.body.pagination).toHaveProperty('limit');
  expect(response.body.pagination).toHaveProperty('total');
  expect(response.body.pagination).toHaveProperty('totalPages');
  expect(Array.isArray(response.body.data)).toBe(true);
}

/**
 * Create test context for multi-tenancy
 */
export interface TenantContext {
  countryCode: string;
  businessUnit: string;
}

export const SPAIN_CONTEXT: TenantContext = {
  countryCode: 'ES',
  businessUnit: 'LM_ES',
};

export const FRANCE_CONTEXT: TenantContext = {
  countryCode: 'FR',
  businessUnit: 'LM_FR',
};

export const ITALY_CONTEXT: TenantContext = {
  countryCode: 'IT',
  businessUnit: 'LM_IT',
};

export const POLAND_CONTEXT: TenantContext = {
  countryCode: 'PL',
  businessUnit: 'LM_PL',
};
