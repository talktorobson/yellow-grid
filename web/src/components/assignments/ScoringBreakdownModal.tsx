/**
 * Scoring Breakdown Modal Component
 * Shows detailed scoring transparency for assignment decisions
 */

import { X, Award, TrendingUp, Info, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface ScoringFactor {
  factor: string;
  description: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  details?: string;
}

interface ProviderScore {
  providerId: string;
  providerName: string;
  providerEmail: string;
  totalScore: number;
  rank: number;
  scoringFactors: ScoringFactor[];
  reasoning: string;
}

interface ScoringBreakdownModalProps {
  providerScore: ProviderScore;
  onClose: () => void;
}

export default function ScoringBreakdownModal({
  providerScore,
  onClose,
}: ScoringBreakdownModalProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-blue-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Scoring Breakdown
            </h2>
            <p className="text-sm text-gray-600 mt-1">{providerScore.providerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Overall Score</div>
              <div className="text-4xl font-bold text-gray-900">
                {providerScore.totalScore.toFixed(1)}
                <span className="text-lg text-gray-500">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Rank</div>
              <div className="text-4xl font-bold text-blue-600">#{providerScore.rank}</div>
            </div>
          </div>

          {/* Overall Score Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={clsx('h-3 rounded-full transition-all', getScoreBarColor(providerScore.totalScore))}
              style={{ width: `${providerScore.totalScore}%` }}
            />
          </div>
        </div>

        {/* Reasoning */}
        {providerScore.reasoning && (
          <div className="p-6 border-b bg-blue-50">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">
                  Why This Provider?
                </div>
                <p className="text-sm text-blue-800">{providerScore.reasoning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Scoring Factors */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Scoring Factors Breakdown
          </h3>

          <div className="space-y-4">
            {providerScore.scoringFactors.map((factor, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* Factor Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">{factor.factor}</div>
                    <p className="text-xs text-gray-600">{factor.description}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500 mb-1">Weight</div>
                    <div className="text-lg font-bold text-gray-900">{(factor.weight * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Raw Score</div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-gray-900">
                        {factor.rawScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">/100</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Weighted Score</div>
                    <div className="flex items-center gap-2">
                      <div className={clsx('text-lg font-bold px-2 py-1 rounded', getScoreColor(factor.weightedScore))}>
                        {factor.weightedScore.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Raw Score</span>
                    <span>{factor.rawScore.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx('h-2 rounded-full transition-all', getScoreBarColor(factor.rawScore))}
                      style={{ width: `${factor.rawScore}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                {factor.details && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700">{factor.details}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Calculation Method</p>
              <p className="text-xs">
                Total Score = Σ (Raw Score × Weight) for all factors
              </p>
            </div>
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
