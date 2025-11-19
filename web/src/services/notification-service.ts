/**
 * Notification Service
 * API calls for real-time notifications and alerts
 */

import apiClient from './api-client';
import { UUID, ISODateString } from '@/types';

export type NotificationType =
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_REJECTED'
  | 'SERVICE_ORDER_UPDATED'
  | 'SERVICE_ORDER_RESCHEDULED'
  | 'GO_EXEC_BLOCKED'
  | 'DEROGATION_REQUESTED'
  | 'TV_OUTCOME_RECORDED'
  | 'PROJECT_OWNER_ASSIGNED'
  | 'DOCUMENT_UPLOADED'
  | 'NOTE_ADDED'
  | 'SYSTEM_ALERT';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Notification {
  id: UUID;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string;
  entityType?: 'SERVICE_ORDER' | 'PROJECT' | 'ASSIGNMENT' | 'PROVIDER';
  entityId?: string;
  read: boolean;
  readAt?: ISODateString;
  createdAt: ISODateString;
  expiresAt?: ISODateString;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  types: Record<NotificationType, boolean>;
}

class NotificationService {
  /**
   * Get all notifications for the current user
   */
  async getAll(params?: {
    read?: boolean;
    type?: NotificationType;
    priority?: NotificationPriority;
    page?: number;
    limit?: number;
  }): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/notifications/unread/count');
    return response.data.count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const response = await apiClient.post<{ count: number }>('/notifications/read-all');
    return response.data;
  }

  /**
   * Delete notification
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<{ count: number }> {
    const response = await apiClient.delete<{ count: number }>('/notifications/read');
    return response.data;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const response = await apiClient.patch<NotificationPreferences>(
      '/notifications/preferences',
      preferences
    );
    return response.data;
  }

  /**
   * Get recent notifications (last 24 hours)
   */
  async getRecent(limit: number = 10): Promise<Notification[]> {
    const response = await apiClient.get<{ notifications: Notification[] }>(
      '/notifications/recent',
      { params: { limit } }
    );
    return response.data.notifications;
  }
}

export const notificationService = new NotificationService();
