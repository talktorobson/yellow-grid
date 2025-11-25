/**
 * Authentication Service
 * Handles login, SSO, token management, and user info
 */

import apiClient from './api-client';
import { User } from '@/types';
import { env } from '@/config/env';

interface ApiResponse<T> {
  data: T;
  meta: any;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Login with email and password (fallback for development)
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
      email,
      password,
    });
    return response.data.data;
  }

  /**
   * Login with SSO (PingID)
   * Redirects to SSO provider
   */
  async loginWithSSO(): Promise<void> {
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: env.auth.clientId,
      redirect_uri: env.auth.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state: crypto.randomUUID(), // CSRF protection
    });

    const authUrl = `${env.auth.ssoIssuer}/authorize?${params.toString()}`;

    // Store state for validation
    sessionStorage.setItem('oauth_state', params.get('state') || '');

    // Redirect to SSO provider
    window.location.href = authUrl;
  }

  /**
   * Handle SSO callback
   * Exchange authorization code for tokens
   */
  async handleSSOCallback(code: string, state: string): Promise<LoginResponse> {
    // Validate state
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }
    sessionStorage.removeItem('oauth_state');

    // Exchange code for tokens
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/sso/callback', {
      code,
      redirectUri: env.auth.redirectUri,
    });

    return response.data.data;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<{ accessToken: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
      refreshToken,
    });

    return response.data.data;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    }
  }
}

export const authService = new AuthService();
