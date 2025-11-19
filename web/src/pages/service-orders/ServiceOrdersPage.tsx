/**
 * Service Orders List Page
 * List view with filters, search, and pagination
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import { Search, Filter, X, CheckSquare, UserPlus, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { ServiceOrderStatus, SalesPotential, RiskLevel } from '@/types';

export default function ServiceOrdersPage() {
  const [filters, setFilters] = useState({
    status: '',
    serviceType: '',
    priority: '',
    salesPotential: '',
    riskLevel: '',
    countryCode: '',
    businessUnit: '',
    dateFrom: '',
    dateTo: '',
    assignedProvider: '',
    page: 1,
    limit: 20,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-orders', filters],
    queryFn: () => serviceOrderService.getAll(filters),
  });

  const orders = data?.data || [];
  const pagination = data?.pagination;

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const handleBulkAssign = async () => {
    // TODO: Implement bulk assign API call
    console.log('Bulk assigning orders:', Array.from(selectedOrders));
    setShowBulkAssignModal(false);
    setSelectedOrders(new Set());
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      serviceType: '',
      priority: '',
      salesPotential: '',
      riskLevel: '',
      countryCode: '',
      businessUnit: '',
      dateFrom: '',
      dateTo: '',
      assignedProvider: '',
      page: 1,
      limit: 20,
    });
    setSearchQuery('');
  };

  const activeFiltersCount = [
    filters.status,
    filters.serviceType,
    filters.priority,
    filters.salesPotential,
    filters.riskLevel,
    filters.countryCode,
    filters.businessUnit,
    filters.dateFrom,
    filters.dateTo,
    filters.assignedProvider,
  ].filter(Boolean).length;

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
        <div className="flex items-center gap-3">
          {selectedOrders.size > 0 && (
            <button
              onClick={() => setShowBulkAssignModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Bulk Assign ({selectedOrders.size})
            </button>
          )}
          <button className="btn btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 flex-wrap mb-4">
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

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={clsx('btn', showAdvancedFilters ? 'btn-primary' : 'btn-secondary')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white text-primary-600 rounded-full text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="btn btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sales Potential filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Potential
                </label>
                <select
                  className="input w-full"
                  value={filters.salesPotential}
                  onChange={(e) =>
                    setFilters({ ...filters, salesPotential: e.target.value, page: 1 })
                  }
                >
                  <option value="">All</option>
                  {Object.values(SalesPotential).map((potential) => (
                    <option key={potential} value={potential}>
                      {potential}
                    </option>
                  ))}
                </select>
              </div>

              {/* Risk Level filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                <select
                  className="input w-full"
                  value={filters.riskLevel}
                  onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value, page: 1 })}
                >
                  <option value="">All</option>
                  {Object.values(RiskLevel).map((risk) => (
                    <option key={risk} value={risk}>
                      {risk}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  className="input w-full"
                  value={filters.countryCode}
                  onChange={(e) =>
                    setFilters({ ...filters, countryCode: e.target.value, page: 1 })
                  }
                >
                  <option value="">All Countries</option>
                  <option value="ES">Spain</option>
                  <option value="FR">France</option>
                  <option value="IT">Italy</option>
                  <option value="PL">Poland</option>
                </select>
              </div>

              {/* Business Unit filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Unit
                </label>
                <select
                  className="input w-full"
                  value={filters.businessUnit}
                  onChange={(e) =>
                    setFilters({ ...filters, businessUnit: e.target.value, page: 1 })
                  }
                >
                  <option value="">All Business Units</option>
                  <option value="LEROY_MERLIN">Leroy Merlin</option>
                  <option value="BRICO_DEPOT">Brico Depot</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  className="input w-full"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  className="input w-full"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
                />
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type
                </label>
                <select
                  className="input w-full"
                  value={filters.serviceType}
                  onChange={(e) =>
                    setFilters({ ...filters, serviceType: e.target.value, page: 1 })
                  }
                >
                  <option value="">All Service Types</option>
                  <option value="INSTALLATION">Installation</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="REPAIR">Repair</option>
                  <option value="TECHNICAL_VISIT">Technical Visit</option>
                </select>
              </div>

              {/* Assigned Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Provider
                </label>
                <input
                  type="text"
                  placeholder="Provider name or ID"
                  className="input w-full"
                  value={filters.assignedProvider}
                  onChange={(e) =>
                    setFilters({ ...filters, assignedProvider: e.target.value, page: 1 })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 border-red-200 mb-6">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Service Orders</h3>
              <p className="text-sm text-red-700">
                We encountered an issue loading the service orders. Please try refreshing the page
                or contact support if the problem persists.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
                </div>
                <div className="w-40 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
                <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No service orders found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
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
                {orders.map((order) => (
                  <tr key={order.id} className="table-row">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
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
                ))}
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

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Bulk Assign Service Orders
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Assign {selectedOrders.size} selected order{selectedOrders.size !== 1 ? 's' : ''} to
                a provider
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Provider
                </label>
                <select className="input w-full">
                  <option value="">Choose a provider...</option>
                  <option value="provider-1">Solar Experts Ltd</option>
                  <option value="provider-2">Green Energy Solutions</option>
                  <option value="provider-3">EcoInstall Partners</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Mode
                </label>
                <select className="input w-full">
                  <option value="DIRECT">Direct Assignment</option>
                  <option value="OFFER">Send as Offer</option>
                  <option value="BROADCAST">Broadcast to Multiple</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Override (Optional)
                </label>
                <select className="input w-full">
                  <option value="">Keep current priority</option>
                  <option value="P1">P1 - Priority</option>
                  <option value="P2">P2 - Standard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  className="input w-full"
                  rows={3}
                  placeholder="Add any notes for the provider..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleBulkAssign} className="btn btn-primary">
                Assign Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
