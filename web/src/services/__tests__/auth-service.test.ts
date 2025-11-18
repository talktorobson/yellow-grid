/**
 * Authentication Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../auth-service';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await authService.login('operator@yellowgrid.com', 'password123');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.email).toBe('operator@yellowgrid.com');
      expect(result.user.role).toBe('OPERATOR');
    });

    it('should fail login with invalid credentials', async () => {
      await expect(
        authService.login('wrong@example.com', 'wrong-password')
      ).rejects.toThrow();
    });

    it('should store tokens in localStorage after successful login', async () => {
      await authService.login('operator@yellowgrid.com', 'password123');

      expect(localStorage.getItem('access_token')).toBe('mock-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('mock-refresh-token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      // Set token first
      localStorage.setItem('access_token', 'mock-access-token');

      const user = await authService.getCurrentUser();

      expect(user).toBeDefined();
      expect(user.email).toBe('operator@yellowgrid.com');
      expect(user.role).toBe('OPERATOR');
    });
  });

  describe('logout', () => {
    it('should clear tokens from localStorage', async () => {
      // Set tokens first
      localStorage.setItem('access_token', 'mock-access-token');
      localStorage.setItem('refresh_token', 'mock-refresh-token');

      await authService.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      localStorage.setItem('refresh_token', 'mock-refresh-token');

      const result = await authService.refreshToken();

      expect(result.accessToken).toBe('new-mock-access-token');
      expect(result.refreshToken).toBe('new-mock-refresh-token');
      expect(localStorage.getItem('access_token')).toBe('new-mock-access-token');
    });
  });
});
