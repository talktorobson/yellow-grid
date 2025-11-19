/**
 * Dashboard Page
 * Overview of key metrics and recent activity
 */

import { Link } from 'react-router-dom';
import { ClipboardList, UserCheck, Users, CheckSquare, RefreshCw, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard-service';
import { StatCardSkeleton } from '@/components/LoadingSkeleton';

export default function DashboardPage() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    refetchOnWindowFocus: true,
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Yellow Grid Field Service Management</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 border-red-200 mb-6">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Dashboard Statistics</h3>
              <p className="text-sm text-red-700">
                We encountered an issue loading the dashboard data. Please try refreshing or contact
                support if the problem persists.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Link to="/service-orders" className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Service Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats?.serviceOrders.total ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.serviceOrders.pending ?? 0} pending
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Link>

            <Link to="/assignments" className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Assignments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats?.assignments.total ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.assignments.pending ?? 0} pending
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Link>

            <Link to="/providers" className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Providers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats?.providers.total ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.providers.active ?? 0} active
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Link>

            <Link to="/tasks" className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Tasks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats?.tasks.pending ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.tasks.overdue ?? 0} overdue
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Activity sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Service Orders</h2>
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Alerts & Tasks</h2>
          <p className="text-gray-500 text-sm">No pending tasks</p>
        </div>
      </div>
    </div>
  );
}
