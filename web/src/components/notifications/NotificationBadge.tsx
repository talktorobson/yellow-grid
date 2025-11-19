/**
 * Notification Badge Component
 * Shows unread notification count and triggers notification center
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services';
import { Bell } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import clsx from 'clsx';

interface NotificationBadgeProps {
  className?: string;
}

export default function NotificationBadge({ className }: NotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCount } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'relative p-2 hover:bg-gray-100 rounded-lg transition-colors',
          className
        )}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount !== undefined && unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
