/**
 * Create Assignment Modal/Page
 * Search providers and create assignment for a service order
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '@/services/assignment-service';
import { Search, TrendingUp, Award, User } from 'lucide-react';
import { toast } from 'sonner';
import { AssignmentMode } from '@/types';

interface CreateAssignmentProps {
  serviceOrderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateAssignment({ serviceOrderId, onSuccess, onCancel }: CreateAssignmentProps) {
  const queryClient = useQueryClient();
  const [selectedMode, setSelectedMode] = useState<AssignmentMode>(AssignmentMode.DIRECT);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // Fetch candidate providers with scoring
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['assignment-candidates', serviceOrderId],
    queryFn: () => assignmentService.getCandidates(serviceOrderId),
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (selectedMode === AssignmentMode.BROADCAST) {
        return assignmentService.createBroadcast({
          serviceOrderId,
          providerIds: selectedProviders,
        });
      } else if (selectedMode === AssignmentMode.OFFER) {
        return assignmentService.createOffer({
          serviceOrderId,
          providerId: selectedProviders[0],
          mode: AssignmentMode.OFFER,
        });
      } else {
        return assignmentService.createDirect({
          serviceOrderId,
          providerId: selectedProviders[0],
          mode: AssignmentMode.DIRECT,
        });
      }
    },
    onSuccess: () => {
      toast.success('Assignment created successfully');
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['service-order', serviceOrderId] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Failed to create assignment');
      console.error(error);
    },
  });

  const handleProviderSelect = (providerId: string) => {
    if (selectedMode === AssignmentMode.BROADCAST) {
      // Multiple selection for broadcast
      setSelectedProviders((prev) =>
        prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]
      );
    } else {
      // Single selection for direct/offer
      setSelectedProviders([providerId]);
    }
  };

  const handleSubmit = () => {
    if (selectedProviders.length === 0) {
      toast.error('Please select at least one provider');
      return;
    }
    createAssignmentMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create Assignment</h2>
        <p className="text-gray-600 mt-1">Select providers and assignment mode</p>
      </div>

      {/* Assignment Mode Selection */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Assignment Mode</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => {
              setSelectedMode(AssignmentMode.DIRECT);
              setSelectedProviders([]);
            }}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              selectedMode === AssignmentMode.DIRECT
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-semibold text-sm text-gray-900">Direct</h4>
            <p className="text-xs text-gray-600 mt-1">
              Auto-assign to selected provider
            </p>
          </button>

          <button
            onClick={() => {
              setSelectedMode(AssignmentMode.OFFER);
              setSelectedProviders([]);
            }}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              selectedMode === AssignmentMode.OFFER
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-semibold text-sm text-gray-900">Offer</h4>
            <p className="text-xs text-gray-600 mt-1">
              Provider can accept/refuse
            </p>
          </button>

          <button
            onClick={() => {
              setSelectedMode(AssignmentMode.BROADCAST);
              setSelectedProviders([]);
            }}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              selectedMode === AssignmentMode.BROADCAST
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-semibold text-sm text-gray-900">Broadcast</h4>
            <p className="text-xs text-gray-600 mt-1">
              Send to multiple providers
            </p>
          </button>
        </div>
      </div>

      {/* Provider Search */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search providers by name, location..."
            className="input flex-1"
          />
        </div>
      </div>

      {/* Candidate Providers */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Recommended Providers (Ranked by Score)
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading candidates...</div>
        ) : !candidates || candidates.length === 0 ? (
          <div className="card text-center py-8 text-gray-500">
            No providers available for this service order
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const isSelected = selectedProviders.includes(candidate.provider.id);
              return (
                <button
                  key={candidate.provider.id}
                  onClick={() => handleProviderSelect(candidate.provider.id)}
                  className={`w-full card p-4 text-left transition-all ${
                    isSelected
                      ? 'border-2 border-primary-600 bg-primary-50'
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{candidate.provider.name}</h4>
                        <p className="text-sm text-gray-600">{candidate.provider.email}</p>
                        <p className="text-sm text-gray-600">{candidate.provider.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-yellow-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {candidate.scoring.totalScore.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">Total Score</span>
                    </div>
                  </div>

                  {/* Score factors preview */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {candidate.scoring.factors.slice(0, 3).map((factor, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-primary-600" />
                        <span className="text-gray-600 truncate">{factor.name}</span>
                        <span className="font-medium text-gray-900">{factor.score.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Expand to show all factors */}
                  {isSelected && candidate.scoring.factors.length > 3 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      {candidate.scoring.factors.slice(3).map((factor, idx) => (
                        <div key={idx} className="flex items-start justify-between text-xs">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{factor.name}</span>
                            <p className="text-gray-600 mt-0.5">{factor.rationale}</p>
                          </div>
                          <span className="ml-2 font-bold text-gray-900">{factor.score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedProviders.length === 0 || createAssignmentMutation.isPending}
          className="btn btn-primary"
        >
          {createAssignmentMutation.isPending ? 'Creating...' : `Create ${selectedMode} Assignment`}
        </button>
      </div>
    </div>
  );
}
