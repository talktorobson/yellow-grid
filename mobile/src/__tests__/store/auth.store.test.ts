import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@store/auth.store';
import { apiService } from '@services/api.service';
import { STORAGE_KEYS } from '@config/api.config';
import { mockUser, mockTokens, mockCredentials, mockAuthResponse } from '../../__mocks__/mockData';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('@services/api.service');

describe('auth.store', () => {
  beforeEach(() => {
    // Clear store state before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login()', () => {
    it('should successfully login and store tokens', async () => {
      // Mock API response
      (apiService.post as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });

      // Mock SecureStore
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      // Start login
      await act(async () => {
        await result.current.login(mockCredentials);
      });

      // Verify API was called correctly
      expect(apiService.post).toHaveBeenCalledWith('/auth/login', mockCredentials);

      // Verify tokens were stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        mockTokens.accessToken
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        mockTokens.refreshToken
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(mockUser)
      );

      // Verify state was updated
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during login', async () => {
      (apiService.post as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuthStore());

      // Start login (don't await)
      act(() => {
        result.current.login(mockCredentials);
      });

      // Check loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (apiService.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useAuthStore());

      // Attempt login
      await act(async () => {
        try {
          await result.current.login(mockCredentials);
        } catch (error) {
          // Expected to throw
        }
      });

      // Verify error state
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle non-Error exceptions', async () => {
      (apiService.post as jest.Mock).mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login(mockCredentials);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Login failed');
    });
  });

  describe('logout()', () => {
    beforeEach(async () => {
      // Set up authenticated state
      (apiService.post as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.login(mockCredentials);
      });

      jest.clearAllMocks();
    });

    it('should successfully logout and clear storage', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce({});
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      // Verify logout API was called
      expect(apiService.post).toHaveBeenCalledWith('/auth/logout');

      // Verify storage was cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.USER_DATA);

      // Verify state was cleared
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should clear storage even if API call fails', async () => {
      (apiService.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      // Verify storage was still cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);

      // Verify state was cleared
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('refreshUser()', () => {
    it('should fetch and update user data', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      (apiService.get as jest.Mock).mockResolvedValueOnce(updatedUser);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshUser();
      });

      // Verify API was called
      expect(apiService.get).toHaveBeenCalledWith('/auth/me');

      // Verify storage was updated
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(updatedUser)
      );

      // Verify state was updated
      expect(result.current.user).toEqual(updatedUser);
    });

    it('should handle refresh failure gracefully', async () => {
      (apiService.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      // Should not throw
      await act(async () => {
        await result.current.refreshUser();
      });

      // State should remain unchanged (null in this case)
      expect(result.current.user).toBeNull();
    });
  });

  describe('checkAuthStatus()', () => {
    it('should restore session from stored tokens', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(JSON.stringify(mockUser));
      (apiService.get as jest.Mock).mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      // Verify storage was checked
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.USER_DATA);

      // Verify state was restored
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Verify user data was refreshed from server
      await waitFor(() => {
        expect(apiService.get).toHaveBeenCalledWith('/auth/me');
      });
    });

    it('should handle missing tokens', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      // Verify state remains unauthenticated
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle storage errors', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      // Verify state is cleared on error
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('updateUser()', () => {
    beforeEach(async () => {
      // Set up authenticated state
      (apiService.post as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.login(mockCredentials);
      });

      jest.clearAllMocks();
    });

    it('should update user in state and storage', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());
      const update = { firstName: 'Jane' };

      await act(async () => {
        result.current.updateUser(update);
        // Wait a tick for async storage update
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Verify state was updated
      expect(result.current.user?.firstName).toBe('Jane');
      expect(result.current.user?.lastName).toBe(mockUser.lastName); // Other fields unchanged

      // Verify storage was updated
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify({ ...mockUser, ...update })
      );
    });

    it('should do nothing if no user is logged in', () => {
      const { result } = renderHook(() => useAuthStore());

      // Logout first
      act(() => {
        result.current.logout();
      });

      jest.clearAllMocks();

      // Try to update
      act(() => {
        result.current.updateUser({ firstName: 'Jane' });
      });

      // Verify storage was not called
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('setError() and clearError()', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });

    it('should clear error message', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
