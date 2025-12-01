/**
 * PSM Providers Page
 * Manage onboarded providers - Integrated with backend API
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  Search,
  Download,
  Eye,
  Edit,
  Pause,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { providerService } from '@/services/provider-service';
import { Provider as ApiProvider } from '@/types';

interface Provider {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  department: string;
  services: string[];
  status: 'active' | 'onboarding' | 'suspended' | 'churned';
  rating: number;
  totalJobs: number;
  monthlyJobs: number;
  trend: 'up' | 'down' | 'stable';
  onboardedDate: string;
  lastActivity: string;
  riskLevel: 'low' | 'medium' | 'high';
  commission: number;
}

// Transform API provider to UI provider
function transformProvider(apiProvider: ApiProvider): Provider {
  const riskLevelMap: Record<string, 'low' | 'medium' | 'high'> = {
    NONE: 'low',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'high',
  };

  const statusMap: Record<string, 'active' | 'onboarding' | 'suspended' | 'churned'> = {
    ACTIVE: 'active',
    ONBOARDING: 'onboarding',
    SUSPENDED: 'suspended',
    INACTIVE: 'churned',
    TERMINATED: 'churned',
  };

  return {
    id: apiProvider.id,
    companyName: apiProvider.name,
    contactName: apiProvider.legalName || apiProvider.name,
    phone: apiProvider.phone || '',
    email: apiProvider.email || '',
    department: apiProvider.address?.city 
      ? `${apiProvider.address.postalCode?.substring(0, 2) || ''} - ${apiProvider.address.city}` 
      : apiProvider.countryCode,
    services: [], // Services loaded separately if needed
    status: statusMap[apiProvider.status] || 'active',
    rating: 4.5, // Placeholder - would come from performance service
    totalJobs: 0, // Placeholder - would come from stats
    monthlyJobs: 0, // Placeholder - would come from stats
    trend: 'stable',
    onboardedDate: apiProvider.contractStartDate 
      ? new Date(apiProvider.contractStartDate).toLocaleDateString() 
      : new Date(apiProvider.createdAt).toLocaleDateString(),
    lastActivity: apiProvider.updatedAt 
      ? formatLastActivity(new Date(apiProvider.updatedAt)) 
      : 'Unknown',
    riskLevel: riskLevelMap[apiProvider.riskLevel || 'NONE'] || 'low',
    commission: 10, // Placeholder - would come from contract terms
  };
}

function formatLastActivity(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days > 7 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${days > 30 ? 's' : ''} ago`;
}

type StatusFilter = 'all' | 'active' | 'onboarding' | 'suspended' | 'churned';

export default function PSMProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showActions, setShowActions] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: Record<string, unknown> = {
        page,
        limit: 20,
      };
      
      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') {
        const statusMap: Record<StatusFilter, string> = {
          all: '',
          active: 'ACTIVE',
          onboarding: 'ONBOARDING',
          suspended: 'SUSPENDED',
          churned: 'INACTIVE',
        };
        filters.status = statusMap[statusFilter];
      }
      
      const response = await providerService.getAll(filters);
      
      setProviders(response.data.map(transformProvider));
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.total || response.data.length);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError('Failed to load providers. Please try again.');
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredProviders = providers;

  const stats = {
    total: totalCount,
    active: providers.filter(p => p.status === 'active').length,
    onboarding: providers.filter(p => p.status === 'onboarding').length,
    atRisk: providers.filter(p => p.riskLevel === 'high').length,
  };

  const handleViewDetails = (provider: Provider) => {
    navigate(`/psm/providers/${provider.id}`);
    setShowActions(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Providers</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.onboarding}</div>
              <div className="text-sm text-gray-500">Onboarding</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.atRisk}</div>
              <div className="text-sm text-gray-500">At Risk</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers, departments, services..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div className="flex gap-2">
            {(['all', 'active', 'onboarding', 'suspended'] as StatusFilter[]).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === status
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={fetchProviders}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="ml-3 text-gray-600">Loading providers...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchProviders}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProviders.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No providers found</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search query</p>
        </div>
      )}

      {/* Providers Table */}
      {!loading && !error && filteredProviders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Performance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Risk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProviders.map(provider => (
                <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{provider.companyName}</div>
                        <div className="text-sm text-gray-500">{provider.contactName}</div>
                        <div className="flex gap-1 mt-1">
                          {provider.services.slice(0, 2).map(service => (
                            <span key={service} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                              {service}
                            </span>
                          ))}
                          {provider.services.length > 2 && (
                            <span className="text-xs text-gray-400">+{provider.services.length - 2}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className={clsx(
                      'px-2.5 py-1 rounded-full text-xs font-medium',
                      provider.status === 'active' && 'bg-green-100 text-green-700',
                      provider.status === 'onboarding' && 'bg-purple-100 text-purple-700',
                      provider.status === 'suspended' && 'bg-red-100 text-red-700',
                      provider.status === 'churned' && 'bg-gray-100 text-gray-600',
                    )}>
                      {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {provider.department}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="font-medium text-gray-900">
                          {provider.rating > 0 ? provider.rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {provider.monthlyJobs}/mo
                        {provider.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 inline ml-1" />}
                        {provider.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 inline ml-1" />}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className={clsx(
                      'px-2.5 py-1 rounded-full text-xs font-medium',
                      provider.riskLevel === 'low' && 'bg-green-100 text-green-700',
                      provider.riskLevel === 'medium' && 'bg-yellow-100 text-yellow-700',
                      provider.riskLevel === 'high' && 'bg-red-100 text-red-700',
                    )}>
                      {provider.riskLevel.charAt(0).toUpperCase() + provider.riskLevel.slice(1)}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className="font-medium text-gray-900">{provider.commission}%</span>
                  </td>
                  
                  <td className="px-4 py-4 text-right relative">
                    <button
                      onClick={() => setShowActions(showActions === provider.id ? null : provider.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    
                    {showActions === provider.id && (
                      <div className="absolute right-4 top-12 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                        <button 
                          onClick={() => handleViewDetails(provider)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Edit className="w-4 h-4" />
                          Edit Provider
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Contact
                        </button>
                        <hr className="my-1" />
                        {provider.status === 'active' ? (
                          <button className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                            <Pause className="w-4 h-4" />
                            Suspend
                          </button>
                        ) : (
                          <button className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Activate
                          </button>
                        )}
                        <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Terminate
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredProviders.length} of {totalCount} providers
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
