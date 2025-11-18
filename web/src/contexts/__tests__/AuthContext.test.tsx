/**
 * AuthContext Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide authentication context', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      result.current.login('operator@yellowgrid.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('operator@yellowgrid.com');
    });
  });

  it('should logout user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Login first
    await waitFor(() => {
      result.current.login('operator@yellowgrid.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Then logout
    await waitFor(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it('should check user permissions', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Login first
    await waitFor(() => {
      result.current.login('operator@yellowgrid.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.checkPermission('service-orders:read')).toBe(true);
      expect(result.current.checkPermission('admin:write')).toBe(false);
    });
  });

  it('should check user role', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Login first
    await waitFor(() => {
      result.current.login('operator@yellowgrid.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.checkRole('OPERATOR')).toBe(true);
      expect(result.current.checkRole('SUPER_ADMIN')).toBe(false);
    });
  });
});
