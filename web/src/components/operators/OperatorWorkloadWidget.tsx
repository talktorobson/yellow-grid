/**
 * Operator Workload Widget Component
 * Displays current workload and project count for operators
 */

import { useQuery } from '@tanstack/react-query';
import { operatorService, type Operator } from '@/services';
import { BarChart3, Users, TrendingUp, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface OperatorWorkloadWidgetProps {
  countryCode?: string;
  operatorId?: string;
  className?: string;
}

export default function OperatorWorkloadWidget({
  countryCode,
  operatorId,
  className,
}: OperatorWorkloadWidgetProps) {
  const { data: workloadData, isLoading } = useQuery({
    queryKey: ['operator-workload', countryCode, operatorId],
    queryFn: () => operatorService.getWorkloadStats(countryCode, operatorId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className={clsx('card', className)}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!workloadData || !workloadData.operators || workloadData.operators.length === 0) {
    return (
      <div className={clsx('card', className)}>
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No workload data available</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'text-green-600 bg-green-50';
      case 'BUSY':
        return 'text-yellow-600 bg-yellow-50';
      case 'OVERLOADED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getWorkloadBarColor = (workload: number, maxWorkload: number) => {
    const percentage = (workload / maxWorkload) * 100;
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Operator Workload
        </h3>
        {countryCode && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {countryCode}
          </span>
        )}
      </div>

      {/* Summary Stats */}
      {workloadData.summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <div className="text-xs text-blue-600 font-medium">Total Operators</div>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {workloadData.summary.totalOperators}
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div className="text-xs text-green-600 font-medium">Available</div>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {workloadData.summary.availableOperators}
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div className="text-xs text-red-600 font-medium">Overloaded</div>
            </div>
            <div className="text-2xl font-bold text-red-900">
              {workloadData.summary.overloadedOperators}
            </div>
          </div>
        </div>
      )}

      {/* Operator List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {workloadData.operators.map((operator: Operator) => (
          <div
            key={operator.id}
            className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{operator.name}</p>
                <p className="text-xs text-gray-600">{operator.email}</p>
              </div>
              <span className={clsx('text-xs font-medium px-2 py-1 rounded', getStatusColor(operator.status))}>
                {operator.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <div className="text-xs text-gray-500">Current Projects</div>
                <div className="text-lg font-bold text-gray-900">{operator.currentProjectCount}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Availability Score</div>
                <div className="text-lg font-bold text-gray-900">{operator.availabilityScore}%</div>
              </div>
            </div>

            {/* Workload Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Workload</span>
                <span>
                  {operator.currentWorkload}/{operator.maxWorkload}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={clsx(
                    'h-2 rounded-full transition-all',
                    getWorkloadBarColor(operator.currentWorkload, operator.maxWorkload)
                  )}
                  style={{
                    width: `${Math.min(
                      (operator.currentWorkload / operator.maxWorkload) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
