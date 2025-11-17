import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentsApi, serviceOrdersApi } from '../api';
import type { Assignment, ServiceOrder } from '../types';
import { format, differenceInHours, isPast } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import clsx from 'clsx';

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');

  useEffect(() => {
    if (id) {
      loadAssignment();
    }
  }, [id]);

  const loadAssignment = async () => {
    try {
      const response = await assignmentsApi.getById(id!);
      const assignmentData = response.data;
      setAssignment(assignmentData);

      // Load service order
      if (assignmentData.serviceOrderId) {
        const soResponse = await serviceOrdersApi.getById(assignmentData.serviceOrderId);
        setServiceOrder(soResponse.data);
      }
    } catch (error) {
      console.error('Failed to load assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      await assignmentsApi.accept(id!);
      await loadAssignment();
    } catch (error) {
      console.error('Failed to accept assignment:', error);
      alert('Failed to accept assignment');
    }
  };

  const handleRefuse = async (alternativeDate?: string) => {
    try {
      await assignmentsApi.refuse(id!, {
        refusalReason: 'Provider not available on proposed date',
        alternativeDate,
      });
      await loadAssignment();
    } catch (error) {
      console.error('Failed to refuse assignment:', error);
      alert('Failed to refuse assignment');
    }
  };

  const handleNegotiateDate = async () => {
    try {
      await assignmentsApi.negotiateDate(id!, {
        proposedDate: new Date(proposedDate).toISOString(),
        proposedBy: 'PROVIDER', // In real app, detect from context
        notes: negotiationNotes,
      });
      await loadAssignment();
      setShowNegotiateModal(false);
      setProposedDate('');
      setNegotiationNotes('');
    } catch (error) {
      console.error('Failed to negotiate date:', error);
      alert('Failed to negotiate date');
    }
  };

  const handleAcceptCounterProposal = async () => {
    try {
      await assignmentsApi.acceptCounterProposal(id!);
      await loadAssignment();
    } catch (error) {
      console.error('Failed to accept counter-proposal:', error);
      alert('Failed to accept counter-proposal');
    }
  };

  const handleRefuseCounterProposal = async () => {
    try {
      await assignmentsApi.refuseCounterProposal(id!, 'Date not suitable');
      await loadAssignment();
    } catch (error) {
      console.error('Failed to refuse counter-proposal:', error);
      alert('Failed to refuse counter-proposal');
    }
  };

  const handleMarkTimeout = async () => {
    try {
      await assignmentsApi.markAsTimeout(id!);
      await loadAssignment();
    } catch (error) {
      console.error('Failed to mark as timeout:', error);
      alert('Failed to mark as timeout');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading assignment...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Assignment Not Found</h3>
          <Link to="/assignments" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            ← Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = assignment.offerExpiresAt && isPast(new Date(assignment.offerExpiresAt));
  const hoursRemaining = assignment.offerExpiresAt
    ? differenceInHours(new Date(assignment.offerExpiresAt), new Date())
    : null;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'badge-warning',
      ACCEPTED: 'badge-success',
      REFUSED: 'badge-danger',
      TIMEOUT: 'badge-danger',
    };
    return <span className={clsx('badge', colors[status] || 'badge-gray')}>{status}</span>;
  };

  const getAssignmentModeIcon = (mode: string) => {
    if (mode === 'DIRECT') return '🎯';
    if (mode === 'OFFER') return '📧';
    if (mode === 'BROADCAST') return '📢';
    return '📋';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/assignments"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Assignments
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assignment Details</h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(assignment.status)}
              <span className="text-sm text-gray-500">
                {getAssignmentModeIcon(assignment.assignmentMode)} {assignment.assignmentMode}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Order Info */}
          {serviceOrder && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Service Order</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-gray-500">Order ID</div>
                    <div className="text-sm font-medium text-gray-900">{serviceOrder.externalId}</div>
                  </div>
                  <Link
                    to={`/service-orders/${serviceOrder.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View Details →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Customer</div>
                    <div className="text-sm text-gray-900">{serviceOrder.project?.customerName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="text-sm text-gray-900">{serviceOrder.project?.worksiteCity}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Type</div>
                    <div className="text-sm text-gray-900">{serviceOrder.serviceType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Priority</div>
                    <div className="text-sm text-gray-900">{serviceOrder.priority}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provider Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">Provider</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-gray-500">Provider</div>
                  <div className="text-sm font-medium text-gray-900">{assignment.provider?.name}</div>
                </div>
                <Link
                  to={`/providers/${assignment.provider?.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View Profile →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {assignment.provider?.tier && (
                  <div>
                    <div className="text-sm text-gray-500">Tier</div>
                    <div className="text-sm font-medium text-gray-900">
                      Tier {assignment.provider.tier}
                      {assignment.provider.tier === 1 && ' ⭐ (Best)'}
                      {assignment.provider.tier === 2 && ' (Standard)'}
                      {assignment.provider.tier === 3 && ' (Lower)'}
                    </div>
                  </div>
                )}
                {assignment.provider?.riskStatus && (
                  <div>
                    <div className="text-sm text-gray-500">Risk Status</div>
                    <div className="text-sm">
                      <span
                        className={clsx(
                          'badge',
                          assignment.provider.riskStatus === 'OK' ? 'badge-success' :
                          assignment.provider.riskStatus === 'ON_WATCH' ? 'badge-warning' :
                          'badge-danger'
                        )}
                      >
                        {assignment.provider.riskStatus}
                      </span>
                    </div>
                  </div>
                )}
                {assignment.workTeam && (
                  <div>
                    <div className="text-sm text-gray-500">Work Team</div>
                    <div className="text-sm text-gray-900">{assignment.workTeam.name}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date Negotiation Timeline */}
          {assignment.dateNegotiations && assignment.dateNegotiations.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Date Negotiation Timeline</h2>
                <span className="badge badge-info ml-auto">
                  Round {assignment.dateNegotiationRound || 0}/3
                </span>
              </div>

              <div className="space-y-4">
                {/* Original Date */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 text-sm text-gray-500">Original</div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.originalDate
                            ? format(new Date(assignment.originalDate), 'PPP')
                            : 'Not set'}
                        </div>
                        <div className="text-xs text-gray-500">Initial proposed date</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Negotiation Rounds */}
                {assignment.dateNegotiations.map((negotiation) => (
                  <div key={negotiation.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-sm text-gray-500">
                      Round {negotiation.round}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div
                          className={clsx(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                            negotiation.proposedBy === 'PROVIDER'
                              ? 'bg-blue-100'
                              : 'bg-green-100'
                          )}
                        >
                          {negotiation.proposedBy === 'PROVIDER' ? (
                            <User className="w-4 h-4 text-blue-600" />
                          ) : (
                            <User className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={clsx(
                                'text-xs font-medium',
                                negotiation.proposedBy === 'PROVIDER'
                                  ? 'text-blue-600'
                                  : 'text-green-600'
                              )}
                            >
                              {negotiation.proposedBy}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(negotiation.createdAt), 'PPp')}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {format(new Date(negotiation.proposedDate), 'PPP')}
                          </div>
                          {negotiation.notes && (
                            <div className="text-sm text-gray-600 mt-1">{negotiation.notes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Max Rounds Warning */}
                {assignment.dateNegotiationRound && assignment.dateNegotiationRound >= 3 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-red-800">
                          Maximum Negotiation Rounds Reached
                        </div>
                        <div className="text-sm text-red-700 mt-1">
                          Manual operator intervention required to resolve date conflict.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Transparency */}
          {assignment.assignmentMode === 'DIRECT' && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold">Assignment Transparency</h2>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-3">
                  This provider was selected through our transparent scoring algorithm.
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Selection Criteria:</span>
                    <span className="font-medium text-gray-900">Best Tier + Availability</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Final Score:</span>
                    <span className="font-medium text-green-600">95.5/100</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reason:</span>
                    <span className="text-gray-900 text-right max-w-xs">
                      Best tier provider with excellent rating and full availability
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card">
            <h3 className="font-semibold mb-4">Status</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Current Status</div>
                <div className="mt-1">{getStatusBadge(assignment.status)}</div>
              </div>

              {assignment.status === 'PENDING' && assignment.offerExpiresAt && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Offer Expires</div>
                  {isExpired ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Expired</span>
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        {format(new Date(assignment.offerExpiresAt), 'PPp')}
                      </div>
                      <button
                        onClick={handleMarkTimeout}
                        className="btn btn-danger text-xs mt-2 w-full"
                      >
                        Mark as Timeout
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {hoursRemaining !== null && hoursRemaining > 0
                            ? `${hoursRemaining}h remaining`
                            : 'Expiring soon'}
                        </span>
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        {format(new Date(assignment.offerExpiresAt), 'PPp')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {assignment.acceptedAt && (
                <div>
                  <div className="text-sm text-gray-500">Accepted On</div>
                  <div className="text-sm text-gray-900 mt-1">
                    {format(new Date(assignment.acceptedAt), 'PPp')}
                  </div>
                </div>
              )}

              {assignment.refusedAt && (
                <div>
                  <div className="text-sm text-gray-500">Refused On</div>
                  <div className="text-sm text-gray-900 mt-1">
                    {format(new Date(assignment.refusedAt), 'PPp')}
                  </div>
                  {assignment.refusalReason && (
                    <div className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                      {assignment.refusalReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Proposed Date */}
          <div className="card">
            <h3 className="font-semibold mb-4">Proposed Date</h3>
            <div className="space-y-3">
              <div className="p-3 bg-primary-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Current Proposal</div>
                <div className="text-lg font-semibold text-gray-900">
                  {assignment.proposedDate
                    ? format(new Date(assignment.proposedDate), 'PPP')
                    : 'Not set'}
                </div>
                {assignment.acceptedDate && assignment.acceptedDate !== assignment.proposedDate && (
                  <div className="text-xs text-green-600 mt-2">
                    Accepted: {format(new Date(assignment.acceptedDate), 'PPP')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Provider Actions (if PENDING) */}
          {assignment.status === 'PENDING' && !isExpired && (
            <div className="card">
              <h3 className="font-semibold mb-4">Provider Actions</h3>
              <div className="space-y-2">
                <button onClick={handleAccept} className="btn btn-success w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept Assignment
                </button>
                <button
                  onClick={() => setShowNegotiateModal(true)}
                  className="btn btn-secondary w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Propose Alternative Date
                </button>
                <button
                  onClick={() => handleRefuse()}
                  className="btn btn-danger w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuse Assignment
                </button>
              </div>
            </div>
          )}

          {/* Customer Actions (if date negotiation in progress) */}
          {assignment.status === 'PENDING' &&
            assignment.dateNegotiations &&
            assignment.dateNegotiations.length > 0 &&
            assignment.dateNegotiations[assignment.dateNegotiations.length - 1].proposedBy ===
              'PROVIDER' && (
              <div className="card">
                <h3 className="font-semibold mb-4">Customer Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleAcceptCounterProposal}
                    className="btn btn-success w-full"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Accept Provider's Date
                  </button>
                  <button
                    onClick={handleRefuseCounterProposal}
                    className="btn btn-danger w-full"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Refuse & Continue Negotiation
                  </button>
                </div>
              </div>
            )}

          {/* Auto-Accept Info (if applicable) */}
          {assignment.status === 'ACCEPTED' && !assignment.acceptedAt && (
            <div className="card">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Auto-Accepted</span>
                </div>
                <div className="text-xs text-green-600">
                  This assignment was automatically accepted due to country-specific auto-accept
                  policy ({serviceOrder?.countryCode}).
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <h3 className="font-semibold mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">
                  {format(new Date(assignment.createdAt), 'PP')}
                </span>
              </div>
              {assignment.acceptedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Accepted</span>
                  <span className="text-gray-900">
                    {format(new Date(assignment.acceptedAt), 'PP')}
                  </span>
                </div>
              )}
              {assignment.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-gray-900">
                    {format(new Date(assignment.updatedAt), 'PP')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Negotiation Modal */}
      {showNegotiateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Propose Alternative Date</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Alternative Date</label>
                <input
                  type="datetime-local"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  value={negotiationNotes}
                  onChange={(e) => setNegotiationNotes(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Explain why this date works better..."
                />
              </div>
              {assignment.dateNegotiationRound !== undefined && (
                <div className="text-sm text-gray-600">
                  Negotiation round: {assignment.dateNegotiationRound + 1}/3
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleNegotiateDate}
                disabled={!proposedDate}
                className="btn btn-primary flex-1"
              >
                Propose Date
              </button>
              <button onClick={() => setShowNegotiateModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
