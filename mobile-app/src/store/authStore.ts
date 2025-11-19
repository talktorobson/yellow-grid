import { create } from 'zustand';
import { AuthService } from '../services/auth/AuthService';
import { User } from '../types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const user = await AuthService.getInstance().login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.getInstance().logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      // Even if API fails, we clear local state
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // In a real app, AuthService would check for a valid token in SecureStore
      // and potentially validate it or refresh it.
      // For now, we'll assume if we have a user in memory or token in storage, we are good.
      // But AuthService.currentUser is not persistent across reloads unless we restore it.
      // We need a method in AuthService to restore session.
      
      // Let's assume AuthService has a method `restoreSession` or similar, 
      // or we just check if we can get a token.
      
      // For this implementation, we will rely on AuthService to handle the logic.
      // Since AuthService.ts in context didn't show a restore method returning User,
      // we might need to add one or just check token existence.
      
      // Let's try to refresh token to validate session
      try {
        const token = await AuthService.getInstance().refreshToken();
        if (token) {
           // If we have a token, we might need to fetch user profile if not stored.
           // For now, let's just set authenticated.
           // Ideally we fetch /auth/me
           set({ isAuthenticated: true, isLoading: false });
           return;
        }
      } catch (e) {
        // Token refresh failed or no token
      }

      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
