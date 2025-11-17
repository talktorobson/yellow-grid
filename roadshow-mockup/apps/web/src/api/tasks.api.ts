/**
 * Tasks & Alerts API Service
 */
import { apiClient } from './client';
import type { Task, Alert, TaskStatus, TaskPriority } from '../types';

export const tasksApi = {
  // Tasks
  getAllTasks: (params?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToId?: string;
    countryCode?: string;
  }) => apiClient.get<Task[]>('/api/v1/tasks', { params }),

  getTaskById: (id: string) =>
    apiClient.get<Task>(`/api/v1/tasks/${id}`),

  createTask: (data: {
    type: string;
    priority: TaskPriority;
    title: string;
    description: string;
    assignedToId?: string;
    dueDate?: string;
    metadata?: any;
    countryCode: string;
  }) => apiClient.post<Task>('/api/v1/tasks', data),

  updateTask: (id: string, data: Partial<Task>) =>
    apiClient.put<Task>(`/api/v1/tasks/${id}`, data),

  completeTask: (id: string) =>
    apiClient.post<Task>(`/api/v1/tasks/${id}/complete`),

  cancelTask: (id: string, reason?: string) =>
    apiClient.post<Task>(`/api/v1/tasks/${id}/cancel`, { reason }),

  // Alerts
  getAllAlerts: (params?: {
    severity?: string;
    acknowledged?: boolean;
    countryCode?: string;
  }) => apiClient.get<Alert[]>('/api/v1/alerts', { params }),

  getAlertById: (id: string) =>
    apiClient.get<Alert>(`/api/v1/alerts/${id}`),

  acknowledgeAlert: (id: string) =>
    apiClient.post<Alert>(`/api/v1/alerts/${id}/acknowledge`),

  getUnacknowledgedCount: (countryCode?: string) =>
    apiClient.get<{ count: number }>('/api/v1/alerts/unacknowledged/count', {
      params: { countryCode },
    }),
};
