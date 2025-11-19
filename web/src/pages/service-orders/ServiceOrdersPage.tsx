/**
 * Service Orders List Page
 * List view with filters, search, and pagination
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import { Search, Filter, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { ServiceOrderStatus, SalesPotential, RiskLevel } from '@/types';
import BulkActionBar from '@/components/service-orders/BulkActionBar';

export default function ServiceOrdersPage() {
  const [filters, setFilters] = useState({
    status: '',
    serviceType: '',
    priority: '',
    salesPotential: '',
    riskLevel: '',
    page: 1,
    limit: 20,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-orders', filters],
    queryFn: () => serviceOrderService.getAll(filters),
  });

  const orders = data?.data || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: ServiceOrderStatus) => {
    const colors: Record<ServiceOrderStatus, string> = {
      [ServiceOrderStatus.CREATED]: 'badge-gray',
      [ServiceOrderStatus.SCHEDULED]: 'badge-info',
      [ServiceOrderStatus.ASSIGNED]: 'badge-info',
      [ServiceOrderStatus.ACCEPTED]: 'badge-primary',
      [ServiceOrderStatus.IN_PROGRESS]: 'badge-warning',
      [ServiceOrderStatus.COMPLETED]: 'badge-success',
      [ServiceOrderStatus.VALIDATED]: 'badge-success',
      [ServiceOrderStatus.CLOSED]: 'badge-gray',
      [ServiceOrderStatus.CANCELLED]: 'badge-danger',
    };
    return <span className={clsx('badge', colors[status])}>{status}</span>;
  };

  const getSalesPotentialBadge = (potential?: SalesPotential) => {
    if (!potential) return <span className="text-xs text-gray-400">Not assessed</span>;
    const colors = {
      [SalesPotential.HIGH]: 'badge-success',
      [SalesPotential.MEDIUM]: 'badge-warning',
      [SalesPotential.LOW]: 'badge-gray',
    };
    return <span className={clsx('badge', colors[potential])}>{potential}</span>;
  };

  const getRiskLevelBadge = (risk?: RiskLevel) => {
    if (!risk) return <span className="text-xs text-gray-400">Not assessed</span>;
    const colors = {
      [RiskLevel.CRITICAL]: 'badge-danger',
      [RiskLevel.HIGH]: 'badge-danger',
      [RiskLevel.MEDIUM]: 'badge-warning',
      [RiskLevel.LOW]: 'badge-success',
    };
    return <span className={clsx('badge', colors[risk])}>{risk} RISK</span>;
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((order) => order.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const isAllSelected = orders.length > 0 && selectedIds.length === orders.length;

  if (error) {
    return (
      <div className="card">
        <p className="text-red-600">Error loading service orders. Please try again.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-gray-600 mt-1">
            {pagination ? `${pagination.total} total orders` : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer..."
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <select
            className="input w-48"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">All Statuses</option>
            {Object.values(ServiceOrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            className="input w-40"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
          >
            <option value="">All Priorities</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
          </select>

          {/* Sales Potential filter */}
          <select
            className="input w-48"
            value={filters.salesPotential}
            onChange={(e) => setFilters({ ...filters, salesPotential: e.target.value, page: 1 })}
          >
            <option value="">All Sales Potential</option>
            {Object.values(SalesPotential).map((potential) => (
              <option key={potential} value={potential}>
                {potential}
              </option>
            ))}
          </select>

          {/* Risk Level filter */}
          <select
            className="input w-48"
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value, page: 1 })}
          >
            <option value="">All Risk Levels</option>
            {Object.values(RiskLevel).map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading service orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No service orders found</div>
        ) : (
          <>
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <button
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:bg-gray-200 rounded"
                      title={isAllSelected ? 'Deselect all' : 'Select all'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">Order ID</th>
                  <th className="px-6 py-3 text-left">Customer</th>
                  <th className="px-6 py-3 text-left">Type / Priority</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Sales Potential</th>
                  <th className="px-6 py-3 text-left">Risk</th>
                  <th className="px-6 py-3 text-left">Scheduled</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isSelected = selectedIds.includes(order.id);
                  return (
                  <tr
                    key={order.id}
                    className={clsx(
                      'table-row transition-colors',
                      isSelected && 'bg-primary-50'
                    )}
                  >
                    <td className="table-cell">
                      <button
                        onClick={() => handleToggleSelection(order.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">{order.externalId}</div>
                      <div className="text-xs text-gray-500">{order.countryCode}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">Customer Name</div>
                      <div className="text-xs text-gray-500">Location</div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{order.serviceType}</span>
                      <div className="text-xs text-gray-500">{order.priority}</div>
                    </td>
                    <td className="table-cell">{getStatusBadge(order.status)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {getSalesPotentialBadge(order.salesPotential)}
                        {order.salesPreEstimationValue && (
                          <span className="text-xs text-gray-500">
                            €{order.salesPreEstimationValue.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">{getRiskLevelBadge(order.riskLevel)}</td>
                    <td className="table-cell text-sm text-gray-500">
                      {order.scheduledDate
                        ? format(new Date(order.scheduledDate), 'MMM dd, yyyy')
                        : '-'}
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/service-orders/${order.id}`}
                        className="text-primary-600 hover:text-primary-900 text-sm"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 1}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page >= pagination.totalPages}
                    className="btn btn-secondary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        onSuccess={() => {
          // Optionally refetch or show success message
        }}
      />
    </div>
  );
}
