/**
 * Analytics Page
 * Advanced analytics dashboard with KPIs, trends, and insights
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Download,
} from 'lucide-react';
import { dashboardService, AnalyticsData, KPIData } from '@/services/dashboard-service';
import { StatCardSkeleton } from '@/components/LoadingSkeleton';

type TimeRange = '7d' | '30d' | '90d' | 'custom';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', timeRange],
    queryFn: () => dashboardService.getAnalytics(timeRange),
  });

  if (isLoading || !analytics) {
    return (
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Performance metrics and insights</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    // Create CSV content
    const csvContent = [
      ['Metric', 'Value', 'Change', 'Trend'],
      ['Service Orders (Total)', analytics.serviceOrders.total.value, `${analytics.serviceOrders.total.change}%`, analytics.serviceOrders.total.trend],
      ['Service Orders (Completed)', analytics.serviceOrders.completed.value, `${analytics.serviceOrders.completed.change}%`, analytics.serviceOrders.completed.trend],
      ['Avg Completion Time (days)', analytics.serviceOrders.avgCompletionTime.value, `${analytics.serviceOrders.avgCompletionTime.change}%`, analytics.serviceOrders.avgCompletionTime.trend],
      ['Success Rate (%)', analytics.serviceOrders.successRate.value, `${analytics.serviceOrders.successRate.change}%`, analytics.serviceOrders.successRate.trend],
      ['Assignments (Total)', analytics.assignments.total.value, `${analytics.assignments.total.change}%`, analytics.assignments.total.trend],
      ['Acceptance Rate (%)', analytics.assignments.acceptanceRate.value, `${analytics.assignments.acceptanceRate.change}%`, analytics.assignments.acceptanceRate.trend],
      ['Avg Response Time (hours)', analytics.assignments.avgResponseTime.value, `${analytics.assignments.avgResponseTime.change}%`, analytics.assignments.avgResponseTime.trend],
      ['Providers (Total)', analytics.providers.total.value, `${analytics.providers.total.change}%`, analytics.providers.total.trend],
      ['Provider Active Rate (%)', analytics.providers.activeRate.value, `${analytics.providers.activeRate.change}%`, analytics.providers.activeRate.trend],
      ['Provider Utilization (%)', analytics.providers.utilization.value, `${analytics.providers.utilization.change}%`, analytics.providers.utilization.trend],
    ].map(row => row.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderKPICard = (
    title: string,
    data: KPIData,
    unit: string,
    icon: React.ReactNode,
    iconBgColor: string
  ) => {
    const isPositive = data.trend === 'up';
    const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">
              {data.value.toLocaleString()}
              <span className="text-lg text-gray-500 ml-1">{unit}</span>
            </p>
          </div>
          <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon className={`w-4 h-4 ${changeColor}`} />
          <span className={`text-sm font-semibold ${changeColor}`}>
            {Math.abs(data.change)}%
          </span>
          <span className="text-sm text-gray-500">vs last period</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Performance metrics and insights</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <div className="flex gap-2">
              {[
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as TimeRange)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Countries</option>
              <option value="ES">Spain</option>
              <option value="FR">France</option>
              <option value="IT">Italy</option>
              <option value="PL">Poland</option>
            </select>
          </div>
        </div>
      </div>

      {/* Service Orders KPIs */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Service Orders Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderKPICard(
            'Total Orders',
            analytics.serviceOrders.total,
            '',
            <Calendar className="w-6 h-6 text-blue-600" />,
            'bg-blue-100'
          )}
          {renderKPICard(
            'Completed Orders',
            analytics.serviceOrders.completed,
            '',
            <CheckCircle className="w-6 h-6 text-green-600" />,
            'bg-green-100'
          )}
          {renderKPICard(
            'Avg Completion Time',
            analytics.serviceOrders.avgCompletionTime,
            'days',
            <Clock className="w-6 h-6 text-orange-600" />,
            'bg-orange-100'
          )}
          {renderKPICard(
            'Success Rate',
            analytics.serviceOrders.successRate,
            '%',
            <TrendingUp className="w-6 h-6 text-purple-600" />,
            'bg-purple-100'
          )}
        </div>
      </div>

      {/* Assignments KPIs */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Assignment Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderKPICard(
            'Total Assignments',
            analytics.assignments.total,
            '',
            <Users className="w-6 h-6 text-blue-600" />,
            'bg-blue-100'
          )}
          {renderKPICard(
            'Acceptance Rate',
            analytics.assignments.acceptanceRate,
            '%',
            <CheckCircle className="w-6 h-6 text-green-600" />,
            'bg-green-100'
          )}
          {renderKPICard(
            'Avg Response Time',
            analytics.assignments.avgResponseTime,
            'hrs',
            <Clock className="w-6 h-6 text-orange-600" />,
            'bg-orange-100'
          )}
        </div>
      </div>

      {/* Provider KPIs */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Provider Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderKPICard(
            'Total Providers',
            analytics.providers.total,
            '',
            <Users className="w-6 h-6 text-blue-600" />,
            'bg-blue-100'
          )}
          {renderKPICard(
            'Active Provider Rate',
            analytics.providers.activeRate,
            '%',
            <CheckCircle className="w-6 h-6 text-green-600" />,
            'bg-green-100'
          )}
          {renderKPICard(
            'Provider Utilization',
            analytics.providers.utilization,
            '%',
            <TrendingUp className="w-6 h-6 text-purple-600" />,
            'bg-purple-100'
          )}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Trend Analysis</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Period
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Service Orders
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Completions
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Assignments
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.trends.labels.map((label, index) => {
                const orders = analytics.trends.serviceOrders[index];
                const completions = analytics.trends.completions[index];
                const assignments = analytics.trends.assignments[index];
                const rate = ((completions / orders) * 100).toFixed(1);

                return (
                  <tr key={label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {label}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-700">
                      {orders}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-700">
                      {completions}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-700">
                      {assignments}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total This Period</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.trends.serviceOrders.reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Service Orders</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {analytics.trends.completions.reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Successful Completions</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Overall Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {(
                  (analytics.trends.completions.reduce((a, b) => a + b, 0) /
                    analytics.trends.serviceOrders.reduce((a, b) => a + b, 0)) *
                  100
                ).toFixed(1)}
                %
              </p>
              <p className="text-xs text-gray-500 mt-1">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Key Insights</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Service order volume increased by {analytics.serviceOrders.total.change}% compared to previous period
              </li>
              <li>
                • Average completion time improved by {Math.abs(analytics.serviceOrders.avgCompletionTime.change)}% (now {analytics.serviceOrders.avgCompletionTime.value} days)
              </li>
              <li>
                • Provider acceptance rate is at {analytics.assignments.acceptanceRate.value}%, up {analytics.assignments.acceptanceRate.change}%
              </li>
              <li>
                • Overall success rate maintained at {analytics.serviceOrders.successRate.value}%
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
