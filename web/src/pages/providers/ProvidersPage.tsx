/**
 * Providers List Page
 * Provider management with CRUD operations
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { providerService } from '@/services/provider-service';
import { Search, Filter, Plus, X, Users } from 'lucide-react';
import clsx from 'clsx';
import { ProviderStatus } from '@/types';
import { TableSkeleton } from '@/components/LoadingSkeleton';

export default function ProvidersPage() {
  const [filters, setFilters] = useState({
    status: '',
    countryCode: '',
    serviceType: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['providers', filters],
    queryFn: () => providerService.getAll(filters),
  });

  const providers = data?.data || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: ProviderStatus) => {
    const colors: Record<ProviderStatus, string> = {
      [ProviderStatus.ACTIVE]: 'badge-success',
      [ProviderStatus.INACTIVE]: 'badge-gray',
      [ProviderStatus.SUSPENDED]: 'badge-danger',
    };
    return <span className={clsx('badge', colors[status])}>{status}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-600 mt-1">
            {pagination ? `${pagination.total} total providers` : 'Loading...'}
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </button>
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
                placeholder="Search providers by name, email..."
                className="input pl-10"
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
            {Object.values(ProviderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Country filter */}
          <select
            className="input w-40"
            value={filters.countryCode}
            onChange={(e) => setFilters({ ...filters, countryCode: e.target.value, page: 1 })}
          >
            <option value="">All Countries</option>
            <option value="ES">Spain</option>
            <option value="FR">France</option>
            <option value="IT">Italy</option>
            <option value="PL">Poland</option>
          </select>

          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 border-red-200 mb-6">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Providers</h3>
              <p className="text-sm text-red-700">
                We encountered an issue loading the providers. Please try refreshing the page or
                contact support if the problem persists.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No providers found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters or add a new provider
            </p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left">Provider</th>
                  <th className="px-6 py-3 text-left">Contact</th>
                  <th className="px-6 py-3 text-left">Country</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Service Types</th>
                  <th className="px-6 py-3 text-left">Coverage Zones</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id} className="table-row">
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                      <div className="text-xs text-gray-500">{provider.externalId}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">{provider.email}</div>
                      <div className="text-xs text-gray-500">{provider.phone}</div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{provider.countryCode}</span>
                    </td>
                    <td className="table-cell">{getStatusBadge(provider.status)}</td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {provider.serviceTypes.slice(0, 2).map((type) => (
                          <span key={type} className="badge badge-info text-xs">
                            {type}
                          </span>
                        ))}
                        {provider.serviceTypes.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{provider.serviceTypes.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">
                        {provider.coverageZones.length} zones
                      </div>
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/providers/${provider.id}`}
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
    </div>
  );
}
