/**
 * Advanced Search Modal Component
 * Multi-entity search with advanced filters
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Filter, Calendar, MapPin, Package, Users, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import clsx from 'clsx';
import apiClient from '@/services/api-client';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchEntity = 'service-orders' | 'projects' | 'providers' | 'assignments';

interface SearchFilters {
  query: string;
  entity: SearchEntity;
  countryCode?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  serviceType?: string;
}

export default function AdvancedSearchModal({ isOpen, onClose }: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    entity: 'service-orders',
  });

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['advanced-search', filters],
    queryFn: async () => {
      if (!filters.query || filters.query.length < 2) return { results: [], total: 0 };

      const response = await apiClient.get('/search/advanced', {
        params: {
          ...filters,
          limit: 50,
        },
      });
      return response.data;
    },
    enabled: filters.query.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (filters.query.length >= 2) {
      refetch();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getEntityIcon = (entity: SearchEntity) => {
    const icons = {
      'service-orders': Package,
      'projects': Briefcase,
      'providers': Users,
      'assignments': Users,
    };
    return icons[entity];
  };

  const getEntityColor = (entity: SearchEntity) => {
    const colors = {
      'service-orders': 'text-blue-600 bg-blue-50',
      'projects': 'text-purple-600 bg-purple-50',
      'providers': 'text-green-600 bg-green-50',
      'assignments': 'text-orange-600 bg-orange-50',
    };
    return colors[entity];
  };

  const getResultLink = (result: any, entity: SearchEntity) => {
    const links = {
      'service-orders': `/service-orders/${result.id}`,
      'projects': `/projects/${result.id}`,
      'providers': `/providers/${result.id}`,
      'assignments': `/assignments/${result.id}`,
    };
    return links[entity];
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Advanced Search</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="p-6 border-b bg-gray-50">
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="input w-full pl-10"
                placeholder="Search by ID, name, email, address..."
                autoFocus
              />
            </div>
          </div>

          {/* Entity Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search In
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['service-orders', 'projects', 'providers', 'assignments'] as SearchEntity[]).map((entity) => {
                const Icon = getEntityIcon(entity);
                return (
                  <button
                    key={entity}
                    type="button"
                    onClick={() => setFilters({ ...filters, entity })}
                    className={clsx(
                      'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors',
                      filters.entity === entity
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium capitalize">
                      {entity.replace('-', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Filters */}
          <details className="group">
            <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
              <Filter className="w-4 h-4" />
              Advanced Filters
            </summary>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* Country Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Country
                </label>
                <select
                  value={filters.countryCode || ''}
                  onChange={(e) => setFilters({ ...filters, countryCode: e.target.value || undefined })}
                  className="input w-full"
                >
                  <option value="">All Countries</option>
                  <option value="ES">Spain</option>
                  <option value="FR">France</option>
                  <option value="IT">Italy</option>
                  <option value="PL">Poland</option>
                </select>
              </div>

              {/* Status */}
              {filters.entity === 'service-orders' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                    className="input w-full"
                  >
                    <option value="">All Statuses</option>
                    <option value="CREATED">Created</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              )}

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  className="input w-full"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                  className="input w-full"
                />
              </div>
            </div>
          </details>

          {/* Search Button */}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFilters({ query: '', entity: 'service-orders' })}
              className="btn btn-secondary"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={filters.query.length < 2}
              className="btn btn-primary"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results && results.results && results.results.length > 0 ? (
            <div>
              <div className="text-sm text-gray-600 mb-4">
                Found {results.total} result{results.total !== 1 ? 's' : ''}
              </div>
              <div className="space-y-3">
                {results.results.map((result: any) => {
                  const Icon = getEntityIcon(filters.entity);
                  return (
                    <Link
                      key={result.id}
                      to={getResultLink(result, filters.entity)}
                      onClick={onClose}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx('p-2 rounded-lg', getEntityColor(filters.entity))}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {result.externalId || result.name || result.title}
                          </h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            {result.status && (
                              <div>
                                <span className="badge badge-primary text-xs">{result.status}</span>
                              </div>
                            )}
                            {result.serviceType && (
                              <div>Type: {result.serviceType}</div>
                            )}
                            {result.customerName && (
                              <div>Customer: {result.customerName}</div>
                            )}
                            {result.countryCode && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {result.countryCode}
                              </div>
                            )}
                            {result.createdAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(result.createdAt), 'PPp')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : filters.query.length >= 2 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No results found for "{filters.query}"</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Enter at least 2 characters to search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
