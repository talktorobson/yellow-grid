/**
 * Assignments API Service
 */
import { apiClient } from './client';
import type { Assignment } from '../types';

export const assignmentsApi = {
  // Basic CRUD
  getAll: (params?: {
    status?: string;
    providerId?: string;
    serviceOrderId?: string;
    expired?: boolean;
  }) => apiClient.get<Assignment[]>('/api/v1/assignments', { params }),

  getById: (id: string) =>
    apiClient.get<Assignment>(`/api/v1/assignments/${id}`),

  create: (data: {
    serviceOrderId: string;
    providerId: string;
    workTeamId?: string;
    proposedDate?: string;
    assignmentMode?: string;
    offerTimeoutHours?: number;
  }) => apiClient.post<Assignment>('/api/v1/assignments', data),

  update: (id: string, data: Partial<Assignment>) =>
    apiClient.put<Assignment>(`/api/v1/assignments/${id}`, data),

  getStatistics: (params?: { countryCode?: string; providerId?: string }) =>
    apiClient.get('/api/v1/assignments/statistics', { params }),

  getExpiredOffers: (countryCode?: string) =>
    apiClient.get<Assignment[]>('/api/v1/assignments/expired', {
      params: { countryCode },
    }),

  // Provider acceptance flow
  accept: (id: string, data?: { acceptedDate?: string }) =>
    apiClient.post<Assignment>(`/api/v1/assignments/${id}/accept`, data || {}),

  refuse: (id: string, data: {
    refusalReason: string;
    alternativeDate?: string;
  }) => apiClient.post<Assignment>(`/api/v1/assignments/${id}/refuse`, data),

  // Date negotiation
  negotiateDate: (id: string, data: {
    proposedDate: string;
    proposedBy: 'PROVIDER' | 'CUSTOMER';
    notes?: string;
  }) => apiClient.post<Assignment>(`/api/v1/assignments/${id}/negotiate-date`, data),

  acceptCounterProposal: (id: string) =>
    apiClient.post<Assignment>(`/api/v1/assignments/${id}/accept-counter-proposal`),

  refuseCounterProposal: (id: string, reason: string) =>
    apiClient.post<Assignment>(`/api/v1/assignments/${id}/refuse-counter-proposal`, { reason }),

  // Timeout management
  markAsTimeout: (id: string) =>
    apiClient.post<Assignment>(`/api/v1/assignments/${id}/mark-timeout`),
};
