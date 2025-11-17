/**
 * API Client
 *
 * Axios instance configured with authentication, error handling,
 * and retry logic for the Yellow Grid mobile app.
 */

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { config } from '../config/env';
import { ApiError } from '../types/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptors
// ============================================================================

/**
 * Add authentication token to requests
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get token from secure storage (implementation in AuthService)
      const token = await getAuthToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add device info headers
      if (config.headers) {
        config.headers['X-Device-ID'] = await getDeviceId();
        config.headers['X-App-Version'] = getAppVersion();
        config.headers['X-Platform'] = getPlatform();
      }

      if (config.ENABLE_LOGGING) {
        console.log('[API Request]', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data,
        });
      }

      return config;
    } catch (error) {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('[API Request Interceptor Error]', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptors
// ============================================================================

/**
 * Handle token refresh and error responses
 */
apiClient.interceptors.response.use(
  (response) => {
    if (config.ENABLE_LOGGING) {
      console.log('[API Response]', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (config.ENABLE_LOGGING) {
      console.error('[API Response Error]', {
        status: error.response?.status,
        url: error.config?.url,
        error: error.response?.data,
      });
    }

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthToken();

        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Token refresh failed, logout user
        await handleAuthenticationFailure();
        return Promise.reject(refreshError);
      }
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.warn('[API] Rate limit exceeded. Retry after:', retryAfter);

      // Could implement exponential backoff here
    }

    // Handle network errors
    if (!error.response && error.message === 'Network Error') {
      console.error('[API] Network error - device may be offline');
      // Trigger offline mode
      await handleNetworkError();
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Helper Functions (to be implemented in respective services)
// ============================================================================

/**
 * Get stored authentication token
 */
async function getAuthToken(): Promise<string | null> {
  // Implementation in AuthService
  // For now, return null - will be replaced with actual implementation
  return null;
}

/**
 * Refresh authentication token
 */
async function refreshAuthToken(): Promise<string | null> {
  // Implementation in AuthService
  return null;
}

/**
 * Get device ID (generated or stored)
 */
async function getDeviceId(): Promise<string> {
  // Implementation in DeviceService
  return 'device-id-placeholder';
}

/**
 * Get app version from app.json
 */
function getAppVersion(): string {
  // Get from Expo Constants
  return '1.0.0';
}

/**
 * Get platform (iOS/Android)
 */
function getPlatform(): string {
  // Get from React Native Platform
  return 'iOS';
}

/**
 * Handle authentication failure (logout)
 */
async function handleAuthenticationFailure(): Promise<void> {
  console.log('[API] Authentication failed - logging out');
  // Implementation in AuthService
}

/**
 * Handle network error (enable offline mode)
 */
async function handleNetworkError(): Promise<void> {
  console.log('[API] Network error detected - enabling offline mode');
  // Implementation in SyncService
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;

    if (apiError?.error) {
      return apiError.error.message;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

/**
 * Extract error details from API error
 */
export function getErrorDetails(error: unknown): string[] {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;

    if (apiError?.error?.details) {
      return apiError.error.details.map(d => d.message);
    }
  }

  return [];
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response && error.message === 'Network Error';
  }
  return false;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 429;
  }
  return false;
}

export default apiClient;
