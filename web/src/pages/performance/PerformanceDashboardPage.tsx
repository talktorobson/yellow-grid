/**
 * Performance Dashboard Page
 * Displays operator and provider performance metrics
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { performanceService } from '@/services/performance-service';
import PerformanceMetricsCard from '@/components/performance/PerformanceMetricsCard';
import {
  BarChart3,
  Users,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import clsx from 'clsx';

export default function PerformanceDashboardPage() {
  const [activeTab, setActiveTab] = useState<'operators' | 'providers'>('operators');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['performance-summary', dateRange],
    queryFn: () => performanceService.getDashboardSummary(dateRange),
  });

  // Fetch operator performance
  const { data: operatorData, isLoading: operatorsLoading } = useQuery({
    queryKey: ['operator-performance', dateRange],
    queryFn: () => performanceService.getOperatorPerformance(dateRange),
    enabled: activeTab === 'operators',
  });

  // Fetch provider performance
  const { data: providerData, isLoading: providersLoading } = useQuery({
    queryKey: ['provider-performance', dateRange],
    queryFn: () => performanceService.getProviderPerformance(dateRange),
    enabled: activeTab === 'providers',
  });

  const handleExport = async () => {
    try {
      const blob = await performanceService.exportReport(activeTab, 'excel', dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-performance-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track operator and provider performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button onClick={handleExport} className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2 mt-7">
            <button
              onClick={() => setDateRange({
                startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
              })}
              className="btn btn-secondary text-sm"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setDateRange({
                startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
              })}
              className="btn btn-secondary text-sm"
            >
              Last 30 days
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      {summaryLoading ? (
        <div className="text-center py-8 text-gray-500">Loading summary...</div>
      ) : summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <PerformanceMetricsCard
            title="Total Service Orders"
            value={summary.totalServiceOrders.toLocaleString()}
            subtitle="All service orders in period"
            icon={BarChart3}
            iconColor="text-blue-600"
          />
          <PerformanceMetricsCard
            title="Completed Orders"
            value={summary.completedServiceOrders.toLocaleString()}
            subtitle={`${summary.overallCompletionRate.toFixed(1)}% completion rate`}
            icon={CheckCircle}
            iconColor="text-green-600"
            trend="up"
            trendValue="+5.2%"
          />
          <PerformanceMetricsCard
            title="Customer Satisfaction"
            value={summary.averageCustomerSatisfaction.toFixed(1)}
            subtitle="Average CSAT score"
            icon={Star}
            iconColor="text-yellow-600"
            trend="stable"
          />
          <PerformanceMetricsCard
            title="Active Resources"
            value={`${summary.topPerformers.operators.length + summary.topPerformers.providers.length}`}
            subtitle="Operators + Providers"
            icon={Users}
            iconColor="text-purple-600"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('operators')}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'operators'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Operator Performance
            </button>
            <button
              onClick={() => setActiveTab('providers')}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'providers'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Provider Performance
            </button>
          </nav>
        </div>
      </div>

      {/* Operator Performance Table */}
      {activeTab === 'operators' && (
        <div className="card overflow-hidden">
          {operatorsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading operators...</div>
          ) : !operatorData || operatorData.operators.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No operator data available</div>
          ) : (
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left">Operator</th>
                  <th className="px-6 py-3 text-left">Country</th>
                  <th className="px-6 py-3 text-right">Total Orders</th>
                  <th className="px-6 py-3 text-right">Completed</th>
                  <th className="px-6 py-3 text-right">Completion Rate</th>
                  <th className="px-6 py-3 text-right">Avg. Time (days)</th>
                  <th className="px-6 py-3 text-right">On-Time Delivery</th>
                  <th className="px-6 py-3 text-right">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {operatorData.operators.map((operator) => (
                  <tr key={operator.operatorId} className="table-row">
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">{operator.operatorName}</div>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{operator.countryCode}</td>
                    <td className="table-cell text-right text-sm text-gray-900">
                      {operator.metrics.totalServiceOrders}
                    </td>
                    <td className="table-cell text-right text-sm text-gray-900">
                      {operator.metrics.completedServiceOrders}
                    </td>
                    <td className="table-cell text-right">
                      <span className={clsx(
                        'badge',
                        operator.metrics.completionRate >= 90 ? 'badge-success' :
                        operator.metrics.completionRate >= 75 ? 'badge-warning' : 'badge-danger'
                      )}>
                        {operator.metrics.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-cell text-right text-sm text-gray-900">
                      {operator.metrics.averageCompletionTime.toFixed(1)}
                    </td>
                    <td className="table-cell text-right text-sm text-gray-900">
                      {operator.metrics.onTimeDeliveryRate.toFixed(1)}%
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {operator.metrics.customerSatisfactionScore.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Provider Performance Table */}
      {activeTab === 'providers' && (
        <div className="card overflow-hidden">
          {providersLoading ? (
            <div className="text-center py-12 text-gray-500">Loading providers...</div>
          ) : !providerData || providerData.providers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No provider data available</div>
          ) : (
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left">Provider</th>
                  <th className="px-6 py-3 text-left">Country</th>
                  <th className="px-6 py-3 text-right">Assignments</th>
                  <th className="px-6 py-3 text-right">Completed</th>
                  <th className="px-6 py-3 text-right">Acceptance Rate</th>
                  <th className="px-6 py-3 text-right">Completion Rate</th>
                  <th className="px-6 py-3 text-right">Quality Score</th>
                  <th className="px-6 py-3 text-right">Customer Rating</th>
                </tr>
              </thead>
              <tbody>
                {providerData.providers.map((provider) => (
                  <tr key={provider.providerId} className="table-row">
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900">{provider.providerName}</div>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{provider.countryCode}</td>
                    <td className="table-cell text-right text-sm text-gray-900">
                      {provider.metrics.totalAssignments}
                    </td>
                    <td className="table-cell text-right text-sm text-gray-900">
                      {provider.metrics.completedAssignments}
                    </td>
                    <td className="table-cell text-right">
                      <span className={clsx(
                        'badge',
                        provider.metrics.acceptanceRate >= 80 ? 'badge-success' :
                        provider.metrics.acceptanceRate >= 60 ? 'badge-warning' : 'badge-danger'
                      )}>
                        {provider.metrics.acceptanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={clsx(
                        'badge',
                        provider.metrics.completionRate >= 90 ? 'badge-success' :
                        provider.metrics.completionRate >= 75 ? 'badge-warning' : 'badge-danger'
                      )}>
                        {provider.metrics.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {provider.metrics.qualityScore.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {provider.metrics.customerRating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
