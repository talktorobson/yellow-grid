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
  | 'SYSTEM_ALERT'
  // Backend event types
  | 'TEAM_ABSENCE'
  | 'ORDER_ASSIGNED'
  | 'DOCUMENT_REQUIRED'
  | 'ORDER_COMPLETED'
  | 'ESCALATION'
  | 'SCHEDULE_CHANGE';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT';

// Backend notification structure
interface BackendNotification {
  id: UUID;
  eventType: string;
  priority: string;
  subject: string;
  body: string;
  status: string;
  readAt?: ISODateString | null;
  createdAt: ISODateString;
  contextType?: string;
  contextId?: string;
  metadata?: Record<string, any>;
}

// Frontend notification structure
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

// Transform backend notification to frontend format
function transformNotification(backend: BackendNotification): Notification {
  const contextTypeMap: Record<string, 'SERVICE_ORDER' | 'PROJECT' | 'ASSIGNMENT' | 'PROVIDER'> = {
    'service_order': 'SERVICE_ORDER',
    'project': 'PROJECT',
    'assignment': 'ASSIGNMENT',
    'provider': 'PROVIDER',
  };

  return {
    id: backend.id,
    type: (backend.eventType || 'SYSTEM_ALERT') as NotificationType,
    priority: (backend.priority || 'NORMAL') as NotificationPriority,
    title: backend.subject || 'Notification',
    message: backend.body || '',
    read: backend.status === 'READ' || !!backend.readAt,
    readAt: backend.readAt || undefined,
    createdAt: backend.createdAt,
    entityType: backend.contextType ? contextTypeMap[backend.contextType] : undefined,
    entityId: backend.contextId,
    metadata: backend.metadata || undefined,
  };
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  types: Record<NotificationType, boolean>;
}

interface ApiResponse<T> {
  data: T;
  meta: any;
}

class NotificationService {
  /**
   * Get all notifications for the current user
   */
  async getAll(userId: string, params?: {
    read?: boolean;
    type?: NotificationType;
    priority?: NotificationPriority;
    page?: number;
    limit?: number;
  }): Promise<Notification[]> {
    const response = await apiClient.get<ApiResponse<BackendNotification[]>>(`/notifications/user/${userId}`, { params });
    return (response.data.data || []).map(transformNotification);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread/count', { params: { userId } });
    return response.data.data.count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const response = await apiClient.post<ApiResponse<{ count: number }>>('/notifications/read-all', { userId });
    return response.data.data;
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
    const response = await apiClient.delete<ApiResponse<{ count: number }>>('/notifications/read');
    return response.data.data;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<ApiResponse<NotificationPreferences>>('/notifications/preferences');
    return response.data.data;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const response = await apiClient.patch<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences',
      preferences
    );
    return response.data.data;
  }

  /**
   * Get recent notifications (last 24 hours)
   */
  async getRecent(limit: number = 10): Promise<Notification[]> {
    const response = await apiClient.get<ApiResponse<{ notifications: Notification[] }>>(
      '/notifications/recent',
      { params: { limit } }
    );
    return response.data.data.notifications;
  }
}

export const notificationService = new NotificationService();
