import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiService, onAuthLogout } from '@services/api.service';
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
  handleForceLogout: () => void;
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
      // API returns { accessToken, refreshToken, tokenType, expiresIn, user }
      const response = await apiService.post<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: number;
        user: User;
      }>('/auth/login', credentials);

      const { accessToken, refreshToken, user } = response;
      const tokens: AuthTokens = { accessToken, refreshToken };

      // Store tokens securely
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      } else {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      }

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
      if (Platform.OS === 'web') {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      }

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
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      } else {
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      }
      set({ user });
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails (e.g., 401), clear auth state and log out
      if (Platform.OS === 'web') {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      }
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  checkAuthStatus: async () => {
    set({ isLoading: true });

    try {
      let accessToken, userData;
      if (Platform.OS === 'web') {
        accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      } else {
        [accessToken, userData] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
          SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA),
        ]);
      }

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
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      } else {
        SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      }
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  handleForceLogout: () => {
    // Called when API service detects token refresh failure
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },
}));

// Subscribe to auth logout events from API service
onAuthLogout(() => {
  useAuthStore.getState().handleForceLogout();
});
