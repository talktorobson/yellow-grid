import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { serviceOrdersApi } from '../api';
import type { ServiceOrder } from '../types';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import clsx from 'clsx';

export default function ServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: string;
    priority?: string;
    salesPotential?: string;
    riskLevel?: string;
  }>({});

  useEffect(() => {
    loadServiceOrders();
  }, [filter]);

  const loadServiceOrders = async () => {
    try {
      const response = await serviceOrdersApi.getAll(filter);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load service orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSalesPotentialBadge = (potential?: string) => {
    if (!potential) return null;
    const colors = {
      HIGH: 'badge-success',
      MEDIUM: 'badge-warning',
      LOW: 'badge-gray',
    };
    return <span className={clsx('badge', colors[potential as keyof typeof colors])}>{potential}</span>;
  };

  const getRiskLevelBadge = (risk?: string) => {
    if (!risk) return null;
    const colors = {
      CRITICAL: 'badge-danger',
      HIGH: 'badge-danger',
      MEDIUM: 'badge-warning',
      LOW: 'badge-success',
    };
    return <span className={clsx('badge', colors[risk as keyof typeof colors])}>{risk} RISK</span>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      CREATED: 'badge-gray',
      SCHEDULED: 'badge-info',
      ASSIGNED: 'badge-info',
      IN_PROGRESS: 'badge-warning',
      COMPLETED: 'badge-success',
      FAILED: 'badge-danger',
    };
    return <span className={clsx('badge', colors[status] || 'badge-gray')}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading service orders...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-gray-600 mt-1">{orders.length} total orders</p>
        </div>
        <Link to="/service-orders/new" className="btn btn-primary">
          + Create Order
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                className="input pl-10"
              />
            </div>
          </div>
          <select
            className="input w-48"
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          >
            <option value="">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            className="input w-48"
            value={filter.salesPotential || ''}
            onChange={(e) => setFilter({ ...filter, salesPotential: e.target.value || undefined })}
          >
            <option value="">All Sales Potential</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            className="input w-48"
            value={filter.riskLevel || ''}
            onChange={(e) => setFilter({ ...filter, riskLevel: e.target.value || undefined })}
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Service Orders Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sales Potential
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {order.externalId}
                  </div>
                  <div className="text-xs text-gray-500">{order.countryCode}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{order.project?.customerName}</div>
                  <div className="text-xs text-gray-500">{order.project?.worksiteCity}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{order.serviceType}</span>
                  <div className="text-xs text-gray-500">{order.priority}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.salesPotential ? (
                    <div className="flex items-center gap-2">
                      {getSalesPotentialBadge(order.salesPotential)}
                      {order.salesPreEstimationValue && (
                        <span className="text-xs text-gray-500">
                          €{order.salesPreEstimationValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Not assessed</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.riskLevel ? (
                    getRiskLevelBadge(order.riskLevel)
                  ) : (
                    <span className="text-xs text-gray-400">Not assessed</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.scheduledDate
                    ? format(new Date(order.scheduledDate), 'MMM dd, yyyy')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/service-orders/${order.id}`}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No service orders found
          </div>
        )}
      </div>
    </div>
  );
}
