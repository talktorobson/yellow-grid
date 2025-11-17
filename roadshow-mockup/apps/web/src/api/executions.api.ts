/**
 * Executions API Service
 */
import { apiClient } from './client';
import type { Execution, ExecutionStatus, CompletionStatus } from '../types';

export const executionsApi = {
  // Basic CRUD
  getAll: (params?: {
    status?: ExecutionStatus;
    serviceOrderId?: string;
    workTeamId?: string;
    blocked?: boolean;
  }) => apiClient.get<Execution[]>('/api/v1/executions', { params }),

  getById: (id: string) =>
    apiClient.get<Execution>(`/api/v1/executions/${id}`),

  create: (data: {
    serviceOrderId: string;
    workTeamId: string;
    checklistItems?: Array<{
      id: string;
      label: string;
      required: boolean;
      completed?: boolean;
    }>;
  }) => apiClient.post<Execution>('/api/v1/executions', data),

  getStatistics: (params?: { workTeamId?: string }) =>
    apiClient.get('/api/v1/executions/statistics', { params }),

  getBlocked: () =>
    apiClient.get<Execution[]>('/api/v1/executions/blocked'),

  // Check-in / Check-out
  checkIn: (id: string, data?: {
    lat?: number;
    lon?: number;
    notes?: string;
  }) => apiClient.post<Execution>(`/api/v1/executions/${id}/check-in`, data || {}),

  checkOut: (id: string, data?: {
    lat?: number;
    lon?: number;
    notes?: string;
  }) => apiClient.post<Execution>(`/api/v1/executions/${id}/check-out`, data || {}),

  // Checklist management
  updateChecklist: (id: string, items: Array<{
    id: string;
    label: string;
    required: boolean;
    completed?: boolean;
  }>) => apiClient.put<Execution>(`/api/v1/executions/${id}/checklist`, { items }),

  completeChecklistItem: (id: string, data: {
    itemId: string;
    notes?: string;
  }) => apiClient.post<Execution>(`/api/v1/executions/${id}/checklist/complete`, data),

  // Completion status
  recordCompletion: (id: string, data: {
    completionStatus: CompletionStatus;
    incompleteReason?: string;
    notes?: string;
  }) => apiClient.post<Execution>(`/api/v1/executions/${id}/completion`, data),

  // Media management
  uploadPhoto: (id: string, data: {
    url: string;
    type: 'before' | 'after';
    caption?: string;
  }) => apiClient.post<Execution>(`/api/v1/executions/${id}/photos`, data),

  uploadAudioNote: (id: string, data: {
    url: string;
    duration: number;
    notes?: string;
  }) => apiClient.post<Execution>(`/api/v1/executions/${id}/audio`, data),

  // Customer feedback
  submitCustomerFeedback: (id: string, data: {
    rating: number;
    feedback?: string;
    signature?: string;
  }) => apiClient.post<Execution>(`/api/v1/executions/${id}/customer-feedback`, data),

  // Blocking logic
  blockExecution: (id: string, reason: string) =>
    apiClient.post<Execution>(`/api/v1/executions/${id}/block`, { reason }),

  unblockExecution: (id: string) =>
    apiClient.post<Execution>(`/api/v1/executions/${id}/unblock`),
};
