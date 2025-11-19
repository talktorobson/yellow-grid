/**
 * Performance Metrics Card Component
 * Displays key performance indicators with trend indicators
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface PerformanceMetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  className?: string;
}

export default function PerformanceMetricsCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  iconColor = 'text-blue-600',
  className,
}: PerformanceMetricsCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 bg-green-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className={clsx('card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && trendValue && (
              <div className={clsx('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium', getTrendColor())}>
                <TrendIcon className="w-3 h-3" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <Icon className={clsx('w-6 h-6', iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}
