/**
 * Providers API Service
 */
import { apiClient } from './client';
import type { Provider } from '../types';

export const providersApi = {
  // Basic CRUD
  getAll: (params?: { countryCode?: string; tier?: number; active?: boolean }) =>
    apiClient.get<Provider[]>('/api/v1/providers', { params }),

  getById: (id: string) =>
    apiClient.get<Provider>(`/api/v1/providers/${id}`),

  getStatistics: () =>
    apiClient.get('/api/v1/providers/statistics'),

  // Tier management
  updateTier: (id: string, tier: number) =>
    apiClient.put(`/api/v1/providers/${id}/tier`, { tier }),

  getByTier: (tier: number, params?: { countryCode?: string }) =>
    apiClient.get<Provider[]>(`/api/v1/providers/tier/${tier}`, { params }),

  // Risk management
  suspend: (id: string, data: { reason: string; suspendedFrom?: string; suspendedUntil?: string }) =>
    apiClient.post(`/api/v1/providers/${id}/suspend`, data),

  unsuspend: (id: string) =>
    apiClient.post(`/api/v1/providers/${id}/unsuspend`),

  putOnWatch: (id: string, reason: string) =>
    apiClient.post(`/api/v1/providers/${id}/on-watch`, { reason }),

  clearWatch: (id: string) =>
    apiClient.post(`/api/v1/providers/${id}/clear-watch`),

  getSuspended: (countryCode?: string) =>
    apiClient.get<Provider[]>('/api/v1/providers/suspended', {
      params: { countryCode },
    }),

  getOnWatch: (countryCode?: string) =>
    apiClient.get<Provider[]>('/api/v1/providers/on-watch', {
      params: { countryCode },
    }),

  // Certifications
  addCertification: (id: string, certification: { code: string; name: string; expiresAt: string }) =>
    apiClient.post(`/api/v1/providers/${id}/certifications`, certification),

  removeCertification: (id: string, certCode: string) =>
    apiClient.delete(`/api/v1/providers/${id}/certifications/${certCode}`),

  getExpiringCertifications: (days: number = 30) =>
    apiClient.get<Provider[]>('/api/v1/providers/certifications/expiring', {
      params: { days },
    }),
};
