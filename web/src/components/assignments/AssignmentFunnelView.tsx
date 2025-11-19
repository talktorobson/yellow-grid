/**
 * Assignment Funnel View Component
 * Visualizes the candidate filtering funnel with transparency
 */

import {
  Users,
  Filter,
  Target,
  CheckCircle,
  XCircle,
  TrendingDown,
  Info,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

interface FunnelStage {
  stage: string;
  label: string;
  candidateCount: number;
  rejectedCount: number;
  rejectionReasons: Array<{ reason: string; count: number }>;
  criteria: string[];
}

interface AssignmentFunnelData {
  serviceOrderId: string;
  totalProviders: number;
  stages: FunnelStage[];
  finalCandidates: number;
  assignedProvider?: {
    id: string;
    name: string;
    score: number;
    rank: number;
  };
}

interface AssignmentFunnelViewProps {
  funnelData: AssignmentFunnelData;
  onViewScoring?: (providerId: string) => void;
  className?: string;
}

export default function AssignmentFunnelView({
  funnelData,
  onViewScoring,
  className,
}: AssignmentFunnelViewProps) {
  const getStageColor = (index: number) => {
    const colors = [
      'border-blue-500 bg-blue-50',
      'border-purple-500 bg-purple-50',
      'border-indigo-500 bg-indigo-50',
      'border-green-500 bg-green-50',
    ];
    return colors[index % colors.length];
  };

  const getStageIcon = (index: number) => {
    const icons = [Users, Filter, Target, CheckCircle];
    const Icon = icons[index % icons.length];
    return Icon;
  };

  const calculatePassRate = (candidateCount: number, rejectedCount: number) => {
    const total = candidateCount + rejectedCount;
    return total > 0 ? ((candidateCount / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Assignment Funnel
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Candidate filtering transparency for {funnelData.serviceOrderId}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Providers</div>
          <div className="text-2xl font-bold text-gray-900">{funnelData.totalProviders}</div>
        </div>
      </div>

      {/* Funnel Stages */}
      <div className="space-y-4">
        {funnelData.stages.map((stage, index) => {
          const Icon = getStageIcon(index);
          const passRate = calculatePassRate(stage.candidateCount, stage.rejectedCount);
          const isLastStage = index === funnelData.stages.length - 1;

          return (
            <div key={stage.stage}>
              <div className={clsx('border-2 rounded-lg p-4', getStageColor(index))}>
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{stage.label}</h4>
                      <p className="text-xs text-gray-600">{stage.stage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {stage.candidateCount}
                    </div>
                    <div className="text-xs text-gray-600">candidates</div>
                  </div>
                </div>

                {/* Pass Rate */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Pass Rate</span>
                    <span className="font-semibold">{passRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all',
                        parseFloat(passRate) >= 75
                          ? 'bg-green-500'
                          : parseFloat(passRate) >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      )}
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                </div>

                {/* Criteria */}
                {stage.criteria && stage.criteria.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Filtering Criteria
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stage.criteria.map((criterion, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-white border border-gray-300 rounded text-gray-700"
                        >
                          {criterion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reasons */}
                {stage.rejectedCount > 0 && (
                  <div className="pt-3 border-t border-gray-300">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-600" />
                        Rejected: {stage.rejectedCount}
                      </div>
                    </div>
                    {stage.rejectionReasons && stage.rejectionReasons.length > 0 && (
                      <div className="space-y-1">
                        {stage.rejectionReasons.map((rejection, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-white bg-opacity-50 px-2 py-1 rounded"
                          >
                            <span className="text-gray-700">{rejection.reason}</span>
                            <span className="font-semibold text-red-600">{rejection.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow between stages */}
              {!isLastStage && (
                <div className="flex justify-center py-2">
                  <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Final Assignment */}
      {funnelData.assignedProvider && (
        <div className="mt-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-900 mb-1">
                ✓ Assigned Provider
              </div>
              <div className="font-semibold text-gray-900">
                {funnelData.assignedProvider.name}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Rank #{funnelData.assignedProvider.rank} • Score:{' '}
                {funnelData.assignedProvider.score}
              </div>
            </div>
            {onViewScoring && (
              <button
                onClick={() => onViewScoring(funnelData.assignedProvider!.id)}
                className="btn btn-secondary text-sm"
              >
                View Scoring
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Initial Pool</div>
          <div className="text-lg font-bold text-gray-900">{funnelData.totalProviders}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Final Candidates</div>
          <div className="text-lg font-bold text-blue-600">{funnelData.finalCandidates}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Conversion Rate</div>
          <div className="text-lg font-bold text-green-600">
            {funnelData.totalProviders > 0
              ? ((funnelData.finalCandidates / funnelData.totalProviders) * 100).toFixed(1)
              : '0.0'}
            %
          </div>
        </div>
      </div>
    </div>
  );
}
