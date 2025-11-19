/**
 * Technical Visit Outcome Modal Component
 * Records TV outcomes (YES/YES-BUT/NO) with detailed findings
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import { Clipboard, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import type { ServiceOrder } from '@/types';

interface TechnicalVisitOutcomeModalProps {
  serviceOrder: ServiceOrder;
  onClose: () => void;
  onSuccess?: () => void;
}

type TVOutcome = 'YES' | 'YES_BUT' | 'NO';

const OUTCOME_OPTIONS = [
  {
    value: 'YES' as TVOutcome,
    label: 'YES - Ready to Proceed',
    description: 'Installation can proceed as planned',
    icon: CheckCircle,
    color: 'border-green-500 bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    value: 'YES_BUT' as TVOutcome,
    label: 'YES-BUT - Conditional Approval',
    description: 'Installation can proceed with modifications or conditions',
    icon: AlertTriangle,
    color: 'border-yellow-500 bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
  {
    value: 'NO' as TVOutcome,
    label: 'NO - Cannot Proceed',
    description: 'Installation cannot proceed. Major issues identified.',
    icon: XCircle,
    color: 'border-red-500 bg-red-50',
    iconColor: 'text-red-600',
  },
];

export default function TechnicalVisitOutcomeModal({
  serviceOrder,
  onClose,
  onSuccess,
}: TechnicalVisitOutcomeModalProps) {
  const queryClient = useQueryClient();

  const [outcome, setOutcome] = useState<TVOutcome | ''>('');
  const [findings, setFindings] = useState('');
  const [issues, setIssues] = useState('');
  const [scopeChanges, setScopeChanges] = useState('');
  const [requiredActions, setRequiredActions] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [blockInstallation, setBlockInstallation] = useState(false);

  const recordOutcomeMutation = useMutation({
    mutationFn: (data: {
      outcome: TVOutcome;
      findings: string;
      issues?: string;
      scopeChanges?: string;
      requiredActions?: string;
      estimatedValue?: number;
      blockInstallation: boolean;
    }) => serviceOrderService.recordTVOutcome(serviceOrder.id, data),
    onSuccess: () => {
      toast.success('Technical Visit outcome recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['service-order', serviceOrder.id] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to record TV outcome';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!outcome) {
      toast.error('Please select an outcome');
      return;
    }

    if (!findings.trim()) {
      toast.error('Please provide technical findings');
      return;
    }

    if (findings.trim().length < 20) {
      toast.error('Findings must be at least 20 characters');
      return;
    }

    if (outcome === 'NO' && !issues.trim()) {
      toast.error('Please specify issues for NO outcome');
      return;
    }

    if (outcome === 'YES_BUT' && !requiredActions.trim()) {
      toast.error('Please specify required actions for YES-BUT outcome');
      return;
    }

    recordOutcomeMutation.mutate({
      outcome,
      findings: findings.trim(),
      issues: issues.trim() || undefined,
      scopeChanges: scopeChanges.trim() || undefined,
      requiredActions: requiredActions.trim() || undefined,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      blockInstallation,
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-blue-600" />
              Record Technical Visit Outcome
            </h2>
            <p className="text-sm text-gray-600 mt-1">{serviceOrder.externalId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={recordOutcomeMutation.isPending}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Outcome Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Technical Visit Outcome *
            </label>
            <div className="space-y-3">
              {OUTCOME_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={clsx(
                      'flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all',
                      outcome === option.value ? option.color : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={option.value}
                      checked={outcome === option.value}
                      onChange={(e) => setOutcome(e.target.value as TVOutcome)}
                      className="w-4 h-4 mt-1"
                      disabled={recordOutcomeMutation.isPending}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium text-gray-900 mb-1">
                        <Icon className={clsx('w-5 h-5', option.iconColor)} />
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Technical Findings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Technical Findings *
            </label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              className="input w-full"
              placeholder="Detailed findings from the technical visit (minimum 20 characters)..."
              rows={4}
              maxLength={2000}
              disabled={recordOutcomeMutation.isPending}
              required
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">Minimum 20 characters</p>
              <p
                className={clsx(
                  'text-xs',
                  findings.length < 20 ? 'text-red-500' : 'text-gray-500'
                )}
              >
                {findings.length}/2000
              </p>
            </div>
          </div>

          {/* Issues (for NO outcome) */}
          {outcome === 'NO' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Identified Issues *
              </label>
              <textarea
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                className="input w-full"
                placeholder="Specific issues preventing installation..."
                rows={3}
                maxLength={1000}
                disabled={recordOutcomeMutation.isPending}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{issues.length}/1000</p>
            </div>
          )}

          {/* Required Actions (for YES-BUT outcome) */}
          {outcome === 'YES_BUT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Actions *
              </label>
              <textarea
                value={requiredActions}
                onChange={(e) => setRequiredActions(e.target.value)}
                className="input w-full"
                placeholder="Actions required before installation can proceed..."
                rows={3}
                maxLength={1000}
                disabled={recordOutcomeMutation.isPending}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{requiredActions.length}/1000</p>
            </div>
          )}

          {/* Scope Changes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scope Changes (Optional)
            </label>
            <textarea
              value={scopeChanges}
              onChange={(e) => setScopeChanges(e.target.value)}
              className="input w-full"
              placeholder="Any changes to the original scope identified during the visit..."
              rows={3}
              maxLength={1000}
              disabled={recordOutcomeMutation.isPending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Will be sent to sales if provided • {scopeChanges.length}/1000
            </p>
          </div>

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Installation Value (€)
            </label>
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              className="input w-full"
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={recordOutcomeMutation.isPending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Pre-estimation for sales matching
            </p>
          </div>

          {/* Block Installation Checkbox */}
          {(outcome === 'NO' || outcome === 'YES_BUT') && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockInstallation}
                  onChange={(e) => setBlockInstallation(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                  disabled={recordOutcomeMutation.isPending}
                />
                <div className="flex-1">
                  <div className="font-medium text-yellow-900 mb-1">
                    Block Installation Orders
                  </div>
                  <p className="text-xs text-yellow-800">
                    {outcome === 'NO'
                      ? 'Block all related installation orders until issues are resolved'
                      : 'Block installation orders until required actions are completed'}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={recordOutcomeMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !outcome ||
                !findings.trim() ||
                findings.trim().length < 20 ||
                (outcome === 'NO' && !issues.trim()) ||
                (outcome === 'YES_BUT' && !requiredActions.trim()) ||
                recordOutcomeMutation.isPending
              }
              className={clsx(
                'btn',
                outcome === 'YES'
                  ? 'btn-success'
                  : outcome === 'YES_BUT'
                  ? 'btn-warning'
                  : outcome === 'NO'
                  ? 'btn-danger'
                  : 'btn-primary'
              )}
            >
              {recordOutcomeMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4 mr-2" />
                  Record Outcome
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
