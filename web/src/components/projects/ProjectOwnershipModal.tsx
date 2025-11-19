/**
 * Project Ownership Modal Component
 * Assigns or updates the "Pilote du Chantier" (Project Owner/Responsible Operator)
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService, operatorService } from '@/services';
import { UserCheck, AlertCircle, X, Zap, User, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

interface ProjectOwnershipModalProps {
  projectId: string;
  projectExternalId: string;
  currentOwnerId?: string;
  currentOwnerName?: string;
  countryCode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type AssignmentMode = 'AUTO' | 'MANUAL';

interface Operator {
  id: string;
  name: string;
  email: string;
  currentProjectCount: number;
  currentWorkload: number;
  maxWorkload: number;
  availabilityScore: number;
}

export default function ProjectOwnershipModal({
  projectId,
  projectExternalId,
  currentOwnerId,
  currentOwnerName,
  countryCode,
  onClose,
  onSuccess,
}: ProjectOwnershipModalProps) {
  const queryClient = useQueryClient();

  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('AUTO');
  const [selectedOperatorId, setSelectedOperatorId] = useState(currentOwnerId || '');

  // Fetch available operators for the country
  const { data: operators, isLoading: loadingOperators } = useQuery({
    queryKey: ['operators', countryCode, 'project-ownership'],
    queryFn: () => operatorService.getOperatorsForProjectOwnership(countryCode),
    enabled: assignmentMode === 'MANUAL',
  });

  // Fetch auto-assignment recommendation
  const { data: autoRecommendation, isLoading: loadingRecommendation } = useQuery({
    queryKey: ['project-ownership-recommendation', projectId],
    queryFn: () => projectService.getOwnershipRecommendation(projectId),
    enabled: assignmentMode === 'AUTO',
  });

  const assignmentMutation = useMutation({
    mutationFn: (data: { operatorId?: string; mode: AssignmentMode }) =>
      projectService.assignProjectOwner(projectId, data),
    onSuccess: () => {
      toast.success('Project owner assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to assign project owner';
      toast.error(errorMessage);
    },
  });

  // Auto-select recommended operator when switching to AUTO mode
  useEffect(() => {
    if (assignmentMode === 'AUTO' && autoRecommendation?.recommendedOperatorId) {
      setSelectedOperatorId(autoRecommendation.recommendedOperatorId);
    }
  }, [assignmentMode, autoRecommendation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (assignmentMode === 'MANUAL' && !selectedOperatorId) {
      toast.error('Please select an operator');
      return;
    }

    assignmentMutation.mutate({
      operatorId: selectedOperatorId || undefined,
      mode: assignmentMode,
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getWorkloadColor = (workload: number, maxWorkload: number) => {
    const percentage = (workload / maxWorkload) * 100;
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 85) return 'bg-yellow-500';
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
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Assign Project Owner (Pilote du Chantier)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {projectExternalId} • {countryCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={assignmentMutation.isPending}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Current Owner Info */}
        {currentOwnerName && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Current Project Owner</p>
                <p className="text-sm text-blue-800 mt-1">{currentOwnerName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Assignment Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Assignment Mode *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={clsx(
                  'flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all',
                  assignmentMode === 'AUTO'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <input
                  type="radio"
                  name="assignmentMode"
                  value="AUTO"
                  checked={assignmentMode === 'AUTO'}
                  onChange={(e) => setAssignmentMode(e.target.value as AssignmentMode)}
                  className="w-4 h-4 mt-1"
                  disabled={assignmentMutation.isPending}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Zap className="w-4 h-4 text-blue-600" />
                    AUTO
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    System automatically assigns based on workload balancing
                  </div>
                </div>
              </label>

              <label
                className={clsx(
                  'flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all',
                  assignmentMode === 'MANUAL'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <input
                  type="radio"
                  name="assignmentMode"
                  value="MANUAL"
                  checked={assignmentMode === 'MANUAL'}
                  onChange={(e) => setAssignmentMode(e.target.value as AssignmentMode)}
                  className="w-4 h-4 mt-1"
                  disabled={assignmentMutation.isPending}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <User className="w-4 h-4 text-gray-600" />
                    MANUAL
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Manually select the responsible operator
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* AUTO Mode - Recommendation */}
          {assignmentMode === 'AUTO' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              {loadingRecommendation ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-green-800">Calculating optimal assignment...</p>
                </div>
              ) : autoRecommendation ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-900">
                      Recommended Operator
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {autoRecommendation.operatorName}
                        </p>
                        <p className="text-sm text-gray-600">{autoRecommendation.operatorEmail}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Match Score</div>
                        <div className="text-lg font-bold text-green-600">
                          {autoRecommendation.matchScore}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Current Projects:</span>
                        <span className="font-medium">{autoRecommendation.currentProjectCount}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Workload</span>
                          <span>
                            {autoRecommendation.currentWorkload}/{autoRecommendation.maxWorkload}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={clsx(
                              'h-2 rounded-full transition-all',
                              getWorkloadColor(
                                autoRecommendation.currentWorkload,
                                autoRecommendation.maxWorkload
                              )
                            )}
                            style={{
                              width: `${Math.min(
                                (autoRecommendation.currentWorkload /
                                  autoRecommendation.maxWorkload) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-3">
                    <strong>Reason:</strong> {autoRecommendation.reason}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-green-800">No recommendation available</p>
              )}
            </div>
          )}

          {/* MANUAL Mode - Operator List */}
          {assignmentMode === 'MANUAL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Select Operator *
              </label>
              {loadingOperators ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : operators && operators.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {operators.map((operator: Operator) => (
                    <label
                      key={operator.id}
                      className={clsx(
                        'flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all',
                        selectedOperatorId === operator.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="operator"
                        value={operator.id}
                        checked={selectedOperatorId === operator.id}
                        onChange={(e) => setSelectedOperatorId(e.target.value)}
                        className="w-4 h-4"
                        disabled={assignmentMutation.isPending}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{operator.name}</p>
                            <p className="text-sm text-gray-600">{operator.email}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Projects</div>
                            <div className="text-lg font-bold text-gray-900">
                              {operator.currentProjectCount}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
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
                                getWorkloadColor(operator.currentWorkload, operator.maxWorkload)
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
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No operators available for this country
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={assignmentMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                (assignmentMode === 'MANUAL' && !selectedOperatorId) ||
                (assignmentMode === 'AUTO' && !autoRecommendation) ||
                assignmentMutation.isPending
              }
              className="btn btn-primary"
            >
              {assignmentMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign Project Owner
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
