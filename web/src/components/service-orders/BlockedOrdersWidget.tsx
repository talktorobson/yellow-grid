/**
 * Blocked Orders Widget Component
 * Displays service orders blocked by Technical Visit outcomes
 */

import { useQuery } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import { Shield, Lock, UnlockIcon, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

interface BlockedOrdersWidgetProps {
  projectId?: string;
  className?: string;
}

interface BlockedOrder {
  id: string;
  externalId: string;
  serviceType: string;
  blockedBy: {
    tvOrderId: string;
    tvOrderExternalId: string;
    outcome: 'NO' | 'YES_BUT';
    reason: string;
  };
  blockedAt: string;
  status: string;
}

export default function BlockedOrdersWidget({
  projectId,
  className,
}: BlockedOrdersWidgetProps) {
  const { data: blockedOrders, isLoading } = useQuery({
    queryKey: ['blocked-orders', projectId],
    queryFn: () => serviceOrderService.getBlockedOrders(projectId),
    refetchInterval: 60000, // Refresh every minute
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

  if (!blockedOrders || blockedOrders.length === 0) {
    return (
      <div className={clsx('card', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Blocked Orders
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <UnlockIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No blocked orders</p>
        </div>
      </div>
    );
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'NO':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'YES_BUT':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Blocked Orders
        </h3>
        <span className="text-sm text-gray-500 bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
          {blockedOrders.length} blocked
        </span>
      </div>

      {/* Blocked Orders List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {blockedOrders.map((order: BlockedOrder) => (
          <div
            key={order.id}
            className="p-4 border-2 border-red-300 bg-red-50 rounded-lg"
          >
            {/* Order Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-red-600" />
                  <Link
                    to={`/service-orders/${order.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {order.externalId}
                  </Link>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
                <div className="text-xs text-gray-600">
                  {order.serviceType} • {order.status}
                </div>
              </div>
              <span
                className={clsx(
                  'text-xs font-medium px-2 py-1 rounded border',
                  getOutcomeColor(order.blockedBy.outcome)
                )}
              >
                {order.blockedBy.outcome === 'NO' ? 'BLOCKED' : 'CONDITIONAL'}
              </span>
            </div>

            {/* Blocking Info */}
            <div className="p-3 bg-white border border-red-200 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    Blocked by Technical Visit
                  </div>
                  <Link
                    to={`/service-orders/${order.blockedBy.tvOrderId}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {order.blockedBy.tvOrderExternalId}
                  </Link>
                </div>
              </div>
              <p className="text-xs text-gray-700 mt-2">{order.blockedBy.reason}</p>
              <div className="text-xs text-gray-500 mt-2">
                Blocked {format(new Date(order.blockedAt), 'PPp')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Blocked Orders</span>
          <span className="font-bold text-red-600">{blockedOrders.length}</span>
        </div>
      </div>
    </div>
  );
}
