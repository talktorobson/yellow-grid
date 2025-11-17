/**
 * Authentication Service
 *
 * Handles user authentication, token management, and secure storage.
 */

import * as SecureStore from 'expo-secure-store';
import {jwtDecode} from 'jwt-decode';
import apiClient from '../../api/client';
import {LoginRequest, LoginResponse, RefreshTokenRequest, User} from '../../types/api';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

interface TokenPayload {
  user_id: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      } as LoginRequest);

      const {access_token, refresh_token, user} = response.data;

      // Store tokens securely
      await this.storeToken(access_token);
      await this.storeRefreshToken(refresh_token);
      await this.storeUser(user);

      this.currentUser = user;

      // Schedule token refresh
      this.scheduleTokenRefresh(access_token);

      console.log('[AuthService] Login successful:', user.email);
      return user;
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout and clear stored credentials
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('[AuthService] Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear stored tokens
      await this.clearTokens();

      // Clear current user
      this.currentUser = null;

      // Cancel token refresh
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
        this.tokenRefreshTimeout = null;
      }

      console.log('[AuthService] Logout successful');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = await this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<LoginResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      } as RefreshTokenRequest);

      const {access_token, refresh_token: newRefreshToken, user} = response.data;

      // Store new tokens
      await this.storeToken(access_token);
      if (newRefreshToken) {
        await this.storeRefreshToken(newRefreshToken);
      }
      await this.storeUser(user);

      this.currentUser = user;

      // Schedule next refresh
      this.scheduleTokenRefresh(access_token);

      console.log('[AuthService] Token refreshed successfully');
      return access_token;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      // Clear tokens on refresh failure
      await this.clearTokens();
      throw error;
    }
  }

  /**
   * Get current authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Error getting token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  private async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (userJson) {
        this.currentUser = JSON.parse(userJson);
        return this.currentUser;
      }
    } catch (error) {
      console.error('[AuthService] Error getting user:', error);
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();

    if (!token) {
      return false;
    }

    // Check if token is expired
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const now = Date.now() / 1000;

      if (decoded.exp < now) {
        console.log('[AuthService] Token expired');
        // Try to refresh
        try {
          await this.refreshToken();
          return true;
        } catch {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[AuthService] Error decoding token:', error);
      return false;
    }
  }

  /**
   * Initialize authentication (restore session)
   */
  async initialize(): Promise<User | null> {
    try {
      const isAuth = await this.isAuthenticated();

      if (!isAuth) {
        return null;
      }

      const user = await this.getCurrentUser();
      const token = await this.getToken();

      if (user && token) {
        this.currentUser = user;
        this.scheduleTokenRefresh(token);
        console.log('[AuthService] Session restored:', user.email);
        return user;
      }
    } catch (error) {
      console.error('[AuthService] Initialization failed:', error);
    }

    return null;
  }

  /**
   * Store authentication token securely
   */
  private async storeToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('[AuthService] Error storing token:', error);
      throw error;
    }
  }

  /**
   * Store refresh token securely
   */
  private async storeRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('[AuthService] Error storing refresh token:', error);
      throw error;
    }
  }

  /**
   * Store user data
   */
  private async storeUser(user: User): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('[AuthService] Error storing user:', error);
      throw error;
    }
  }

  /**
   * Clear all stored tokens and user data
   */
  private async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('[AuthService] Error clearing tokens:', error);
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(token: string): void {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      // Refresh 5 minutes before expiration
      const refreshAt = expiresAt - 5 * 60 * 1000;
      const delay = refreshAt - now;

      // Cancel existing timeout
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
      }

      // Schedule refresh if delay is positive
      if (delay > 0) {
        this.tokenRefreshTimeout = setTimeout(async () => {
          try {
            await this.refreshToken();
          } catch (error) {
            console.error('[AuthService] Automatic token refresh failed:', error);
          }
        }, delay);

        console.log(
          `[AuthService] Token refresh scheduled in ${Math.round(delay / 1000 / 60)} minutes`
        );
      } else {
        // Token already expired or about to expire, refresh immediately
        console.log('[AuthService] Token expired, refreshing now');
        this.refreshToken().catch((error) => {
          console.error('[AuthService] Immediate token refresh failed:', error);
        });
      }
    } catch (error) {
      console.error('[AuthService] Error scheduling token refresh:', error);
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
