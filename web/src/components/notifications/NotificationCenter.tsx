/**
 * Notification Center Component
 * Real-time notifications dropdown panel
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, type Notification, type NotificationType } from '@/services';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  UserCheck,
  Calendar,
  Shield,
  Clipboard,
  FileText,
  MessageSquare,
  AlertCircle,
  Package,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import clsx from 'clsx';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () =>
      notificationService.getAll({
        read: filter === 'unread' ? false : undefined,
        limit: 50,
      }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: (result) => {
      toast.success(`${result.count} notification${result.count !== 1 ? 's' : ''} marked as read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: () => notificationService.deleteAllRead(),
    onSuccess: (result) => {
      toast.success(`${result.count} read notification${result.count !== 1 ? 's' : ''} deleted`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, any> = {
      ASSIGNMENT_CREATED: UserCheck,
      ASSIGNMENT_ACCEPTED: Check,
      ASSIGNMENT_REJECTED: X,
      SERVICE_ORDER_UPDATED: Package,
      SERVICE_ORDER_RESCHEDULED: Calendar,
      GO_EXEC_BLOCKED: Shield,
      DEROGATION_REQUESTED: AlertCircle,
      TV_OUTCOME_RECORDED: Clipboard,
      PROJECT_OWNER_ASSIGNED: UserCheck,
      DOCUMENT_UPLOADED: FileText,
      NOTE_ADDED: MessageSquare,
      SYSTEM_ALERT: AlertCircle,
    };
    return iconMap[type] || Bell;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600 bg-red-50 border-red-300';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-300';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-300';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-300';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="fixed top-16 right-4 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {data && data.unreadCount > 0 && (
              <p className="text-xs text-gray-600 mt-1">{data.unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && data.unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4 text-gray-600" />
              </button>
            )}
            {data && data.notifications.some(n => n.read) && (
              <button
                onClick={() => deleteAllReadMutation.mutate()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Delete all read"
              >
                <Trash2 className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-4 border-b bg-gray-50">
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              'px-3 py-1 text-sm rounded-lg transition-colors',
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={clsx(
              'px-3 py-1 text-sm rounded-lg transition-colors',
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            Unread {data && data.unreadCount > 0 && `(${data.unreadCount})`}
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data && data.notifications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {data.notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const NotificationContent = (
                  <div
                    className={clsx(
                      'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
                      !notification.read && 'bg-blue-50'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={clsx(
                          'p-2 rounded-lg border',
                          getPriorityColor(notification.priority)
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4
                            className={clsx(
                              'text-sm font-medium',
                              !notification.read ? 'text-gray-900' : 'text-gray-600'
                            )}
                          >
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsReadMutation.mutate(notification.id);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(notification.id);
                              }}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );

                return notification.link ? (
                  <Link key={notification.id} to={notification.link}>
                    {NotificationContent}
                  </Link>
                ) : (
                  <div key={notification.id}>{NotificationContent}</div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No notifications</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
