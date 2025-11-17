import { create } from 'zustand';
import type { CheckIn, CheckOut, Photo } from '@types/checkin-checkout.types';

interface ExecutionStore {
  // State
  currentCheckIn: CheckIn | null;
  currentCheckOut: CheckOut | null;
  photos: Photo[];
  isOnSite: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCheckIn: (checkIn: CheckIn | null) => void;
  setCheckOut: (checkOut: CheckOut | null) => void;
  addPhoto: (photo: Photo) => void;
  removePhoto: (photoId: string) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  setOnSite: (isOnSite: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  // Initial state
  currentCheckIn: null,
  currentCheckOut: null,
  photos: [],
  isOnSite: false,
  isLoading: false,
  error: null,

  // Actions
  setCheckIn: (checkIn: CheckIn | null) => {
    set({ currentCheckIn: checkIn, isOnSite: checkIn !== null });
  },

  setCheckOut: (checkOut: CheckOut | null) => {
    set({ currentCheckOut: checkOut });
  },

  addPhoto: (photo: Photo) => {
    set((state) => ({
      photos: [...state.photos, photo],
    }));
  },

  removePhoto: (photoId: string) => {
    set((state) => ({
      photos: state.photos.filter((p) => p.id !== photoId),
    }));
  },

  updatePhoto: (photoId: string, updates: Partial<Photo>) => {
    set((state) => ({
      photos: state.photos.map((p) => (p.id === photoId ? { ...p, ...updates } : p)),
    }));
  },

  setOnSite: (isOnSite: boolean) => {
    set({ isOnSite });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      currentCheckIn: null,
      currentCheckOut: null,
      photos: [],
      isOnSite: false,
      isLoading: false,
      error: null,
    });
  },
}));
