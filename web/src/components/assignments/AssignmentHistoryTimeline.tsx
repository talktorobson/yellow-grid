/**
 * Assignment History Timeline Component
 * Displays historical assignment events with full audit trail
 */

import { useQuery } from '@tanstack/react-query';
import { assignmentService } from '@/services';
import { Clock, UserCheck, XCircle, RefreshCw, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface AssignmentHistoryTimelineProps {
  serviceOrderId: string;
  className?: string;
}

interface AssignmentEvent {
  id: string;
  timestamp: string;
  eventType:
    | 'ASSIGNMENT_CREATED'
    | 'OFFER_SENT'
    | 'OFFER_ACCEPTED'
    | 'OFFER_REJECTED'
    | 'ASSIGNMENT_CANCELLED'
    | 'ASSIGNMENT_REASSIGNED'
    | 'AUTO_ACCEPTED';
  providerId?: string;
  providerName?: string;
  performedBy: string;
  performedByName: string;
  details: string;
  metadata?: Record<string, any>;
}

export default function AssignmentHistoryTimeline({
  serviceOrderId,
  className,
}: AssignmentHistoryTimelineProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['assignment-history', serviceOrderId],
    queryFn: () => assignmentService.getHistory(serviceOrderId),
  });

  if (isLoading) {
    return (
      <div className={clsx('card', className)}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!history || !history.events || history.events.length === 0) {
    return (
      <div className={clsx('card', className)}>
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No assignment history available</p>
        </div>
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'ASSIGNMENT_CREATED':
        return UserCheck;
      case 'OFFER_SENT':
        return Send;
      case 'OFFER_ACCEPTED':
      case 'AUTO_ACCEPTED':
        return CheckCircle;
      case 'OFFER_REJECTED':
        return XCircle;
      case 'ASSIGNMENT_CANCELLED':
        return AlertCircle;
      case 'ASSIGNMENT_REASSIGNED':
        return RefreshCw;
      default:
        return Clock;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'ASSIGNMENT_CREATED':
        return 'bg-blue-100 text-blue-600 border-blue-300';
      case 'OFFER_SENT':
        return 'bg-purple-100 text-purple-600 border-purple-300';
      case 'OFFER_ACCEPTED':
      case 'AUTO_ACCEPTED':
        return 'bg-green-100 text-green-600 border-green-300';
      case 'OFFER_REJECTED':
      case 'ASSIGNMENT_CANCELLED':
        return 'bg-red-100 text-red-600 border-red-300';
      case 'ASSIGNMENT_REASSIGNED':
        return 'bg-yellow-100 text-yellow-600 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      ASSIGNMENT_CREATED: 'Assignment Created',
      OFFER_SENT: 'Offer Sent',
      OFFER_ACCEPTED: 'Offer Accepted',
      OFFER_REJECTED: 'Offer Rejected',
      ASSIGNMENT_CANCELLED: 'Assignment Cancelled',
      ASSIGNMENT_REASSIGNED: 'Reassigned',
      AUTO_ACCEPTED: 'Auto-Accepted',
    };
    return labels[eventType] || eventType;
  };

  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Assignment History
        </h3>
        <div className="text-sm text-gray-500">
          {history.events.length} event{history.events.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Events */}
        <div className="space-y-6">
          {history.events.map((event: AssignmentEvent, index: number) => {
            const Icon = getEventIcon(event.eventType);
            const isFirst = index === 0;

            return (
              <div key={event.id} className="relative pl-14">
                {/* Icon */}
                <div
                  className={clsx(
                    'absolute left-0 w-12 h-12 rounded-full border-4 flex items-center justify-center',
                    getEventColor(event.eventType)
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div
                  className={clsx(
                    'p-4 rounded-lg border-2',
                    isFirst ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                  )}
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {getEventLabel(event.eventType)}
                      </div>
                      {event.providerName && (
                        <div className="text-sm text-gray-700 mb-1">
                          Provider: <span className="font-medium">{event.providerName}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        By {event.performedByName} •{' '}
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(event.timestamp), 'PPp')}
                    </div>
                  </div>

                  {/* Event Details */}
                  <p className="text-sm text-gray-700 mb-2">{event.details}</p>

                  {/* Metadata */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-2">Additional Details</div>
                      <div className="space-y-1">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-gray-600">{key}:</span>
                            <span className="text-gray-900 font-medium">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* First event badge */}
                  {isFirst && (
                    <div className="mt-3 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      Latest Event
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {history.summary && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Total Offers</div>
              <div className="text-lg font-bold text-gray-900">{history.summary.totalOffers || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Accepted</div>
              <div className="text-lg font-bold text-green-600">
                {history.summary.acceptedOffers || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Rejected</div>
              <div className="text-lg font-bold text-red-600">
                {history.summary.rejectedOffers || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
