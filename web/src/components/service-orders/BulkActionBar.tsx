/**
 * Bulk Action Bar Component
 * Floating action bar for bulk operations on selected service orders
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import {
  CheckSquare,
  X,
  Calendar,
  UserPlus,
  XCircle,
  ArrowRight,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onSuccess?: () => void;
}

export default function BulkActionBar({
  selectedIds,
  onClearSelection,
  onSuccess
}: BulkActionBarProps) {
  const queryClient = useQueryClient();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    label: string;
  } | null>(null);

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: () => serviceOrderService.bulkAssign(selectedIds),
    onSuccess: (result) => {
      toast.success(`Successfully assigned ${result.successful} order(s)`);
      if (result.failed > 0) {
        toast.warning(`Failed to assign ${result.failed} order(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      onSuccess?.();
      onClearSelection();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign orders');
    },
  });

  // Bulk cancel mutation
  const bulkCancelMutation = useMutation({
    mutationFn: (reason: string) => serviceOrderService.bulkCancel(selectedIds, reason),
    onSuccess: (result) => {
      toast.success(`Successfully cancelled ${result.successful} order(s)`);
      if (result.failed > 0) {
        toast.warning(`Failed to cancel ${result.failed} order(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      onSuccess?.();
      onClearSelection();
      setShowConfirmModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel orders');
    },
  });

  // Bulk update status mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: (status: string) => serviceOrderService.bulkUpdateStatus(selectedIds, status),
    onSuccess: (result) => {
      toast.success(`Successfully updated ${result.successful} order(s)`);
      if (result.failed > 0) {
        toast.warning(`Failed to update ${result.failed} order(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      onSuccess?.();
      onClearSelection();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update orders');
    },
  });

  // Bulk reschedule mutation
  const bulkRescheduleMutation = useMutation({
    mutationFn: () => serviceOrderService.bulkReschedule(selectedIds),
    onSuccess: (result) => {
      toast.success(`Successfully rescheduled ${result.successful} order(s)`);
      if (result.failed > 0) {
        toast.warning(`Failed to reschedule ${result.failed} order(s)`);
      }
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      onSuccess?.();
      onClearSelection();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reschedule orders');
    },
  });

  const handleBulkAction = (action: string, label: string) => {
    if (action === 'cancel') {
      setPendingAction({ action, label });
      setShowConfirmModal(true);
    } else if (action === 'assign') {
      bulkAssignMutation.mutate();
    } else if (action === 'reschedule') {
      bulkRescheduleMutation.mutate();
    } else if (action === 'close') {
      bulkUpdateStatusMutation.mutate('CLOSED');
    }
  };

  const confirmAction = () => {
    if (pendingAction?.action === 'cancel') {
      bulkCancelMutation.mutate('Bulk cancellation by operator');
    }
  };

  const isPending = bulkAssignMutation.isPending ||
                   bulkCancelMutation.isPending ||
                   bulkUpdateStatusMutation.isPending ||
                   bulkRescheduleMutation.isPending;

  if (selectedIds.length === 0) return null;

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-4 flex items-center gap-4">
          {/* Selection count */}
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-600 rounded-lg">
            <CheckSquare className="w-5 h-5" />
            <span className="font-semibold">{selectedIds.length} selected</span>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-700" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('assign', 'Assign')}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Bulk Assign"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">Assign</span>
            </button>

            <button
              onClick={() => handleBulkAction('reschedule', 'Reschedule')}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Bulk Reschedule"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Reschedule</span>
            </button>

            <button
              onClick={() => handleBulkAction('close', 'Close')}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Bulk Close"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm">Close</span>
            </button>

            <button
              onClick={() => handleBulkAction('cancel', 'Cancel')}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              title="Bulk Cancel"
            >
              <XCircle className="w-4 h-4" />
              <span className="text-sm">Cancel</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-700" />

          {/* Clear selection */}
          <button
            onClick={onClearSelection}
            disabled={isPending}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Clear Selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmModal(false);
              setPendingAction(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm {pendingAction.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to {pendingAction.label.toLowerCase()} {selectedIds.length} service order(s)?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Some orders may fail if they don't meet the requirements for this action.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingAction(null);
                }}
                className="btn btn-secondary"
                disabled={bulkCancelMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={clsx(
                  'btn',
                  pendingAction.action === 'cancel' ? 'btn-danger' : 'btn-primary'
                )}
                disabled={bulkCancelMutation.isPending}
              >
                {bulkCancelMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    {pendingAction.action === 'cancel' ? (
                      <Trash2 className="w-4 h-4 mr-2" />
                    ) : (
                      <CheckSquare className="w-4 h-4 mr-2" />
                    )}
                    Confirm {pendingAction.label}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
