import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { serviceOrdersApi, assignmentsApi, executionsApi } from '../api';
import { AlertCircle, TrendingUp, Users, CheckCircle } from 'lucide-react';

interface DashboardStats {
  serviceOrders: { total: number; byStatus: Record<string, number> };
  assignments: { total: number; acceptanceRate: number; expired: number };
  executions: { total: number; byStatus: Record<string, number>; blocked: number };
  tasks: { pending: number; urgent: number };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [soStats, assignStats, execStats] = await Promise.all([
        serviceOrdersApi.getStatistics(),
        assignmentsApi.getStatistics(),
        executionsApi.getStatistics(),
      ]);

      setStats({
        serviceOrders: soStats.data,
        assignments: assignStats.data,
        executions: execStats.data,
        tasks: { pending: 0, urgent: 0 }, // TODO: Load from tasks API
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Yellow Grid Field Service Management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Service Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.serviceOrders.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <Link
            to="/service-orders"
            className="text-sm text-primary-600 hover:text-primary-700 mt-4 inline-block"
          >
            View all →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assignments</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.assignments.total || 0}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats?.assignments.acceptanceRate.toFixed(0)}% acceptance
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <Link
            to="/assignments"
            className="text-sm text-primary-600 hover:text-primary-700 mt-4 inline-block"
          >
            View all →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Executions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.executions.total || 0}
              </p>
              {stats && stats.executions.blocked > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {stats.executions.blocked} blocked
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <Link
            to="/executions"
            className="text-sm text-primary-600 hover:text-primary-700 mt-4 inline-block"
          >
            View all →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.tasks.pending || 0}
              </p>
              {stats && stats.tasks.urgent > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  {stats.tasks.urgent} urgent
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <Link
            to="/tasks"
            className="text-sm text-primary-600 hover:text-primary-700 mt-4 inline-block"
          >
            View all →
          </Link>
        </div>
      </div>

      {/* Recent Activity - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Service Orders</h2>
          <p className="text-gray-500 text-sm">Coming soon...</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Critical Alerts</h2>
          <p className="text-gray-500 text-sm">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
