import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { executionsApi, serviceOrdersApi } from '../api';
import type { Execution, ServiceOrder, CompletionStatus, ExecutionStatus } from '../types';
import { format } from 'date-fns';
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  Mic,
  Star,
  FileText,
  CheckSquare,
  Square,
  Ban,
  Camera,
  Play,
} from 'lucide-react';
import clsx from 'clsx';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  required: boolean;
}

export default function ExecutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Modal states
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Form states
  const [checkInLat, setCheckInLat] = useState('');
  const [checkInLon, setCheckInLon] = useState('');
  const [checkOutLat, setCheckOutLat] = useState('');
  const [checkOutLon, setCheckOutLon] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('COMPLETE' as CompletionStatus);
  const [completionNotes, setCompletionNotes] = useState('');
  const [customerRating, setCustomerRating] = useState(5);
  const [customerComments, setCustomerComments] = useState('');

  useEffect(() => {
    if (id) {
      loadExecution();
    }
  }, [id]);

  const loadExecution = async () => {
    try {
      const response = await executionsApi.getById(id!);
      setExecution(response.data);

      // Load checklist if exists
      if (response.data.checklistItems) {
        setChecklist(response.data.checklistItems.map(item => ({
          id: item.id,
          text: item.label,
          completed: item.completed,
          required: item.required,
        })));
      }

      // Load service order for context
      const soResponse = await serviceOrdersApi.getById(response.data.serviceOrderId);
      setServiceOrder(soResponse.data);
    } catch (error) {
      console.error('Failed to load execution:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      await executionsApi.checkIn(id!, {
        lat: parseFloat(checkInLat),
        lon: parseFloat(checkInLon),
      });
      await loadExecution();
      setShowCheckInModal(false);
      setCheckInLat('');
      setCheckInLon('');
    } catch (error) {
      console.error('Failed to check in:', error);
    }
  };

  const handleCheckOut = async () => {
    try {
      await executionsApi.checkOut(id!, {
        lat: parseFloat(checkOutLat),
        lon: parseFloat(checkOutLon),
        notes: actualHours ? `Actual hours: ${actualHours}` : undefined,
      });
      await loadExecution();
      setShowCheckOutModal(false);
      setCheckOutLat('');
      setCheckOutLon('');
      setActualHours('');
    } catch (error) {
      console.error('Failed to check out:', error);
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updatedChecklist);

    try {
      await executionsApi.updateChecklist(id!, updatedChecklist.map(item => ({
        id: item.id,
        label: item.text,
        required: item.required,
        completed: item.completed,
      })));
      await loadExecution();
    } catch (error) {
      console.error('Failed to update checklist:', error);
      // Revert on error
      setChecklist(checklist);
    }
  };

  const handleComplete = async () => {
    try {
      await executionsApi.recordCompletion(id!, {
        completionStatus,
        incompleteReason: completionNotes || undefined,
        notes: completionNotes || undefined,
      });
      await loadExecution();
      setShowCompleteModal(false);
      setCompletionNotes('');
    } catch (error) {
      console.error('Failed to complete execution:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await executionsApi.submitCustomerFeedback(id!, {
        rating: customerRating,
        feedback: customerComments || undefined,
        signature: undefined, // In real app, would capture signature
      });
      await loadExecution();
      setCustomerComments('');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const getStatusBadge = (status: ExecutionStatus) => {
    const colors: Record<ExecutionStatus, string> = {
      PENDING: 'badge-gray',
      BLOCKED: 'badge-danger',
      CHECKED_IN: 'badge-info',
      IN_PROGRESS: 'badge-warning',
      COMPLETED: 'badge-success',
      INCOMPLETE: 'badge-warning',
    };
    return <span className={clsx('badge', colors[status])}>{status.replace('_', ' ')}</span>;
  };

  const getCompletionStatusBadge = (status: CompletionStatus) => {
    const colors: Record<CompletionStatus, string> = {
      COMPLETE: 'badge-success',
      INCOMPLETE: 'badge-warning',
      FAILED: 'badge-danger',
    };
    return <span className={clsx('badge', colors[status])}>{status}</span>;
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          if (showCheckInModal) {
            setCheckInLat(lat);
            setCheckInLon(lon);
          } else if (showCheckOutModal) {
            setCheckOutLat(lat);
            setCheckOutLon(lon);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Could not get your current location. Please enter manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading execution details...</div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="card">
        <div className="text-center text-gray-500">Execution not found</div>
      </div>
    );
  }

  const checklistCompletionPercentage = checklist.length > 0
    ? Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Execution Details</h1>
            {serviceOrder && (
              <p className="text-gray-600 mt-1">
                Service Order: {serviceOrder.externalId} - {serviceOrder.serviceType}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(execution.status)}
            {execution.completionStatus && getCompletionStatusBadge(execution.completionStatus)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Blocking Status */}
          {execution.blockedReason && (
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <Ban className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900">Execution Blocked</h3>
                  <p className="text-sm text-red-700 mt-1">{execution.blockedReason}</p>
                  <div className="text-xs text-red-600 mt-2">
                    Check-in is not allowed until this blocking issue is resolved.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Check-in/Check-out Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Time Tracking
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check-in */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Check-in</div>
                {execution.checkInAt ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{format(new Date(execution.checkInAt), 'PPp')}</span>
                    </div>
                    {execution.checkInLat && execution.checkInLon && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {execution.checkInLat.toFixed(6)}, {execution.checkInLon.toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Not checked in</div>
                )}
              </div>

              {/* Check-out */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Check-out</div>
                {execution.checkOutAt ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{format(new Date(execution.checkOutAt), 'PPp')}</span>
                    </div>
                    {execution.checkOutLat && execution.checkOutLon && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {execution.checkOutLat.toFixed(6)}, {execution.checkOutLon.toFixed(6)}
                        </span>
                      </div>
                    )}
                    {execution.actualHours && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{execution.actualHours}h worked</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Not checked out</div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Checklist */}
          {checklist.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-green-600" />
                  Execution Checklist
                </h2>
                <div className="text-sm text-gray-600">
                  {checklistCompletionPercentage}% complete
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${checklistCompletionPercentage}%` }}
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={clsx(
                      'flex items-start gap-3 p-3 rounded-lg border transition-all',
                      item.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <button
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className="flex-shrink-0 mt-0.5"
                      disabled={execution.status === 'COMPLETED'}
                    >
                      {item.completed ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div
                        className={clsx(
                          'text-sm font-medium',
                          item.completed ? 'text-green-900 line-through' : 'text-gray-900'
                        )}
                      >
                        {item.text}
                        {item.required && (
                          <span className="ml-2 text-xs text-red-600">*Required</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Validation Message */}
              {checklist.some(item => item.required && !item.completed) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      Some required items are not completed. Complete all required items before finalizing.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Photos */}
          {execution.photos && execution.photos.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                Photos ({execution.photos.length})
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {execution.photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setSelectedPhoto(photo.url);
                      setShowPhotoModal(true);
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <div className="text-xs text-white">
                        {photo.type.charAt(0).toUpperCase() + photo.type.slice(1)} - Photo {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio Notes */}
          {execution.audioRecordings && execution.audioRecordings.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-orange-600" />
                Audio Notes ({execution.audioRecordings.length})
              </h2>

              <div className="space-y-3">
                {execution.audioRecordings.map((audio, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Mic className="w-5 h-5 text-orange-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Audio Note {index + 1}
                      </div>
                      <div className="text-xs text-gray-500">
                        Duration: {audio.duration}s{audio.notes && ` - ${audio.notes}`}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm">
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Feedback */}
          {execution.customerRating !== null && execution.customerRating !== undefined && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                Customer Feedback
              </h2>

              <div className="space-y-4">
                {/* Rating */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Rating</div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={clsx(
                          'w-6 h-6',
                          star <= execution.customerRating!
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {execution.customerRating}/5
                    </span>
                  </div>
                </div>

                {/* Comments */}
                {execution.customerFeedback && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Comments</div>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                      {execution.customerFeedback}
                    </div>
                  </div>
                )}

                {/* Signature */}
                {execution.customerSignature && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Customer Signature
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-xs text-gray-500">
                        Signature URL: {execution.customerSignature}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completion Details */}
          {execution.completionStatus && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Completion Details
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  {getCompletionStatusBadge(execution.completionStatus)}
                </div>

                {execution.incompleteReason && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                      {execution.incompleteReason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>

            <div className="space-y-3">
              {!execution.checkInAt && execution.canCheckIn && (
                <button
                  onClick={() => setShowCheckInModal(true)}
                  className="btn btn-primary w-full"
                  disabled={!!execution.blockedReason}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Check In
                </button>
              )}

              {execution.checkInAt && !execution.checkOutAt && (
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  className="btn btn-warning w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Check Out
                </button>
              )}

              {execution.checkOutAt && !execution.completionStatus && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="btn btn-success w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Execution
                </button>
              )}

              {execution.completionStatus && !execution.customerRating && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-900 mb-3">
                    Customer Feedback
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-700 block mb-2">Rating</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setCustomerRating(star)}
                            type="button"
                          >
                            <Star
                              className={clsx(
                                'w-6 h-6 cursor-pointer',
                                star <= customerRating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-700 block mb-2">Comments</label>
                      <textarea
                        value={customerComments}
                        onChange={(e) => setCustomerComments(e.target.value)}
                        rows={3}
                        className="input text-sm"
                        placeholder="Optional feedback..."
                      />
                    </div>
                    <button
                      onClick={handleSubmitFeedback}
                      className="btn btn-primary w-full text-sm"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Service Order Info */}
          {serviceOrder && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Service Order</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500">Order ID</div>
                  <div className="font-medium">{serviceOrder.externalId}</div>
                </div>
                <div>
                  <div className="text-gray-500">Service Type</div>
                  <div className="font-medium">{serviceOrder.serviceType}</div>
                </div>
                <div>
                  <div className="text-gray-500">Customer</div>
                  <div className="font-medium">{serviceOrder.project?.customerName || 'N/A'}</div>
                </div>
                {serviceOrder.scheduledDate && (
                  <div>
                    <div className="text-gray-500">Scheduled Date</div>
                    <div className="font-medium">
                      {format(new Date(serviceOrder.scheduledDate), 'PPP')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Check In</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={checkInLat}
                  onChange={(e) => setCheckInLat(e.target.value)}
                  className="input"
                  placeholder="48.856613"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={checkInLon}
                  onChange={(e) => setCheckInLon(e.target.value)}
                  className="input"
                  placeholder="2.352222"
                />
              </div>

              <button
                onClick={getCurrentLocation}
                className="btn btn-secondary w-full text-sm"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Use Current Location
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCheckInModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckIn}
                className="btn btn-primary flex-1"
                disabled={!checkInLat || !checkInLon}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Check Out</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={checkOutLat}
                  onChange={(e) => setCheckOutLat(e.target.value)}
                  className="input"
                  placeholder="48.856613"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={checkOutLon}
                  onChange={(e) => setCheckOutLon(e.target.value)}
                  className="input"
                  placeholder="2.352222"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Hours Worked
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  className="input"
                  placeholder="8.0"
                />
              </div>

              <button
                onClick={getCurrentLocation}
                className="btn btn-secondary w-full text-sm"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Use Current Location
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckOut}
                className="btn btn-primary flex-1"
                disabled={!checkOutLat || !checkOutLon || !actualHours}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Check Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Execution Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Complete Execution</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Status
                </label>
                <div className="space-y-2">
                  {(['COMPLETE', 'INCOMPLETE', 'FAILED'] as CompletionStatus[]).map((status) => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="completionStatus"
                        value={status}
                        checked={completionStatus === status}
                        onChange={(e) => setCompletionStatus(e.target.value as CompletionStatus)}
                        className="text-primary-600"
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Notes
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Describe any issues, observations, or additional information..."
                />
              </div>

              {checklist.some(item => item.required && !item.completed) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      Warning: Some required checklist items are not completed.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                className="btn btn-success flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="max-w-4xl w-full">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Photo</h3>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-sm text-gray-600">Photo URL: {selectedPhoto}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
