/**
 * Environment configuration
 * Strongly-typed environment variables with validation
 */

/// <reference types="vite/client" />

interface EnvironmentConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  auth: {
    ssoIssuer: string;
    clientId: string;
    redirectUri: string;
  };
  features: {
    enableAiFeatures: boolean;
    enableCalendarView: boolean;
  };
  env: 'development' | 'staging' | 'production';
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getBooleanEnvVar(key: string, defaultValue = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

export const env: EnvironmentConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001/api/v1'),
    timeout: parseInt(getEnvVar('VITE_API_TIMEOUT', '30000'), 10),
  },
  auth: {
    ssoIssuer: getEnvVar('VITE_SSO_ISSUER', 'https://sso.yellowgrid.com'),
    clientId: getEnvVar('VITE_SSO_CLIENT_ID', 'yellow-grid-operator-web'),
    redirectUri: getEnvVar('VITE_SSO_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
  },
  features: {
    enableAiFeatures: getBooleanEnvVar('VITE_ENABLE_AI_FEATURES', true),
    enableCalendarView: getBooleanEnvVar('VITE_ENABLE_CALENDAR_VIEW', true),
  },
  env: (getEnvVar('VITE_ENV', 'development') as EnvironmentConfig['env']),
};
