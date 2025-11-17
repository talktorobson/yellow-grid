import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiService } from '@services/api.service';
import { STORAGE_KEYS } from '@config/api.config';
import type {
  AuthState,
  LoginCredentials,
  AuthTokens,
  User,
} from '@types/auth.types';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiService.post<{
        user: User;
        tokens: AuthTokens;
      }>('/auth/login', credentials);

      const { user, tokens } = response;

      // Store tokens securely
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      // Call logout endpoint
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  refreshUser: async () => {
    try {
      const user = await apiService.get<User>('/auth/me');
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      set({ user });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  checkAuthStatus: async () => {
    set({ isLoading: true });

    try {
      const [accessToken, userData] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA),
      ]);

      if (accessToken && userData) {
        const user: User = JSON.parse(userData);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Refresh user data from server
        get().refreshUser();
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: (userUpdate: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userUpdate };
      set({ user: updatedUser });
      SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
