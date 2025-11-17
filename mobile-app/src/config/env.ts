/**
 * Environment Configuration
 *
 * Manages environment-specific configuration using Expo's environment variables.
 * Variables must be prefixed with EXPO_PUBLIC_ to be accessible in the app.
 */

interface Config {
  API_BASE_URL: string;
  WS_URL: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  API_TIMEOUT: number;
  ENABLE_LOGGING: boolean;
  SENTRY_DSN?: string;
}

const getConfig = (): Config => {
  const env = process.env.EXPO_PUBLIC_ENV || 'development';

  // Base configuration
  const baseConfig = {
    API_TIMEOUT: 30000, // 30 seconds
    ENABLE_LOGGING: env !== 'production',
  };

  // Environment-specific configuration
  const envConfigs: Record<string, Partial<Config>> = {
    development: {
      API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
      WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000/api/v1/mobile/ws',
      ENVIRONMENT: 'development',
    },
    staging: {
      API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api-staging.yellow-grid.com/api/v1',
      WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'wss://api-staging.yellow-grid.com/api/v1/mobile/ws',
      ENVIRONMENT: 'staging',
      SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    },
    production: {
      API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.yellow-grid.com/api/v1',
      WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'wss://api.yellow-grid.com/api/v1/mobile/ws',
      ENVIRONMENT: 'production',
      SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    },
  };

  return {
    ...baseConfig,
    ...envConfigs[env],
  } as Config;
};

export const config = getConfig();

// Validate required configuration
if (!config.API_BASE_URL) {
  throw new Error('API_BASE_URL is not configured');
}

console.log(`[Config] Environment: ${config.ENVIRONMENT}`);
console.log(`[Config] API Base URL: ${config.API_BASE_URL}`);
