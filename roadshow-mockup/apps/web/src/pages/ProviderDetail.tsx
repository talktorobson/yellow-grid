import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { providersApi } from '../api';
import { ProviderRiskStatus } from '../types';
import type { Provider } from '../types';
import { format, isPast } from 'date-fns';
import {
  ArrowLeft,
  Shield,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Award,
  Users,
  TrendingUp,
  Edit,
  Ban,
  Eye,
} from 'lucide-react';
import clsx from 'clsx';

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showTierModal, setShowTierModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);

  // Form states
  const [selectedTier, setSelectedTier] = useState<number>(2);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendFrom, setSuspendFrom] = useState('');
  const [suspendUntil, setSuspendUntil] = useState('');
  const [watchReason, setWatchReason] = useState('');
  const [certCode, setCertCode] = useState('');
  const [certName, setCertName] = useState('');
  const [certExpires, setCertExpires] = useState('');

  useEffect(() => {
    if (id) {
      loadProvider();
    }
  }, [id]);

  const loadProvider = async () => {
    try {
      const response = await providersApi.getById(id!);
      setProvider(response.data);
      setSelectedTier(response.data.tier);
    } catch (error) {
      console.error('Failed to load provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTier = async (tier: number) => {
    try {
      await providersApi.updateTier(id!, tier);
      await loadProvider();
      setShowTierModal(false);
    } catch (error) {
      console.error('Failed to update tier:', error);
    }
  };

  const handleSuspend = async () => {
    try {
      await providersApi.suspend(id!, {
        reason: suspendReason,
        suspendedFrom: suspendFrom || undefined,
        suspendedUntil: suspendUntil || undefined,
      });
      await loadProvider();
      setShowSuspendModal(false);
      setSuspendReason('');
      setSuspendFrom('');
      setSuspendUntil('');
    } catch (error) {
      console.error('Failed to suspend provider:', error);
    }
  };

  const handleUnsuspend = async () => {
    try {
      await providersApi.unsuspend(id!);
      await loadProvider();
    } catch (error) {
      console.error('Failed to unsuspend provider:', error);
    }
  };

  const handlePutOnWatch = async () => {
    try {
      await providersApi.putOnWatch(id!, watchReason);
      await loadProvider();
      setShowWatchModal(false);
      setWatchReason('');
    } catch (error) {
      console.error('Failed to put provider on watch:', error);
    }
  };

  const handleClearWatch = async () => {
    try {
      await providersApi.clearWatch(id!);
      await loadProvider();
    } catch (error) {
      console.error('Failed to clear watch status:', error);
    }
  };

  const handleAddCertification = async () => {
    try {
      await providersApi.addCertification(id!, {
        code: certCode,
        name: certName,
        expiresAt: new Date(certExpires).toISOString(),
      });
      await loadProvider();
      setShowAddCertModal(false);
      setCertCode('');
      setCertName('');
      setCertExpires('');
    } catch (error) {
      console.error('Failed to add certification:', error);
    }
  };

  const handleRemoveCertification = async (certCode: string) => {
    if (!confirm('Are you sure you want to remove this certification?')) return;
    try {
      await providersApi.removeCertification(id!, certCode);
      await loadProvider();
    } catch (error) {
      console.error('Failed to remove certification:', error);
    }
  };

  const getTierBadge = (tier: number) => {
    const colors: Record<number, string> = {
      1: 'badge-success',
      2: 'badge-info',
      3: 'badge-gray',
    };
    const labels: Record<number, string> = {
      1: 'Tier 1 - Premium',
      2: 'Tier 2 - Standard',
      3: 'Tier 3 - Basic',
    };
    return <span className={clsx('badge', colors[tier])}>{labels[tier]}</span>;
  };

  const getRiskStatusBadge = (status: ProviderRiskStatus) => {
    const colors: Record<ProviderRiskStatus, string> = {
      OK: 'badge-success',
      ON_WATCH: 'badge-warning',
      SUSPENDED: 'badge-danger',
    };
    const icons: Record<ProviderRiskStatus, JSX.Element> = {
      OK: <CheckCircle className="w-4 h-4" />,
      ON_WATCH: <Eye className="w-4 h-4" />,
      SUSPENDED: <Ban className="w-4 h-4" />,
    };
    return (
      <span className={clsx('badge flex items-center gap-1', colors[status])}>
        {icons[status]}
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading provider details...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="card">
        <div className="text-center text-gray-500">Provider not found</div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">{provider.name}</h1>
            <p className="text-gray-600 mt-1">Provider ID: {provider.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-3">
            {getTierBadge(provider.tier)}
            {getRiskStatusBadge(provider.riskStatus)}
            <span className={clsx('badge', provider.active ? 'badge-success' : 'badge-gray')}>
              {provider.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Status Alert */}
          {provider.riskStatus === ProviderRiskStatus.SUSPENDED && (
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <Ban className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Provider Suspended</h3>
                  {provider.riskReason && (
                    <p className="text-sm text-red-700 mt-1">{provider.riskReason}</p>
                  )}
                  {provider.suspendedFrom && provider.suspendedUntil && (
                    <div className="text-xs text-red-600 mt-2">
                      Suspended from {format(new Date(provider.suspendedFrom), 'PPP')}
                      {' '}until {format(new Date(provider.suspendedUntil), 'PPP')}
                    </div>
                  )}
                  <button
                    onClick={handleUnsuspend}
                    className="btn btn-danger btn-sm mt-3"
                  >
                    Lift Suspension
                  </button>
                </div>
              </div>
            </div>
          )}

          {provider.riskStatus === ProviderRiskStatus.ON_WATCH && (
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <Eye className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900">Provider On Watch</h3>
                  {provider.riskReason && (
                    <p className="text-sm text-yellow-700 mt-1">{provider.riskReason}</p>
                  )}
                  <button
                    onClick={handleClearWatch}
                    className="btn btn-secondary btn-sm mt-3"
                  >
                    Clear Watch Status
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Provider Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Provider Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Country</div>
                <div className="text-base font-medium">{provider.countryCode}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Tier</div>
                <div className="text-base font-medium flex items-center gap-2">
                  {getTierBadge(provider.tier)}
                  <button
                    onClick={() => setShowTierModal(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Risk Status</div>
                <div className="text-base font-medium">
                  {getRiskStatusBadge(provider.riskStatus)}
                </div>
              </div>
              {provider.rating !== null && provider.rating !== undefined && (
                <div>
                  <div className="text-sm text-gray-500">Overall Rating</div>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-base font-medium">{provider.rating.toFixed(1)}/5</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="text-base font-medium">
                  {format(new Date(provider.createdAt), 'PPP')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last Updated</div>
                <div className="text-base font-medium">
                  {format(new Date(provider.updatedAt), 'PPP')}
                </div>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Certifications
                {provider.certifications && (
                  <span className="text-sm text-gray-500">({provider.certifications.length})</span>
                )}
              </h2>
              <button
                onClick={() => setShowAddCertModal(true)}
                className="btn btn-primary btn-sm"
              >
                Add Certification
              </button>
            </div>

            {provider.certifications && provider.certifications.length > 0 ? (
              <div className="space-y-3">
                {provider.certifications.map((cert) => {
                  const isExpired = isPast(new Date(cert.expiresAt));
                  const isExpiringSoon = !isExpired &&
                    new Date(cert.expiresAt).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

                  return (
                    <div
                      key={cert.code}
                      className={clsx(
                        'flex items-center justify-between p-3 rounded-lg border',
                        isExpired ? 'bg-red-50 border-red-200' :
                        isExpiringSoon ? 'bg-yellow-50 border-yellow-200' :
                        'bg-white border-gray-200'
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Award className={clsx(
                            'w-4 h-4',
                            isExpired ? 'text-red-600' :
                            isExpiringSoon ? 'text-yellow-600' :
                            'text-purple-600'
                          )} />
                          <span className="font-medium text-gray-900">{cert.name}</span>
                          <span className="text-xs text-gray-500">({cert.code})</span>
                        </div>
                        <div className={clsx(
                          'text-xs mt-1',
                          isExpired ? 'text-red-700' :
                          isExpiringSoon ? 'text-yellow-700' :
                          'text-gray-600'
                        )}>
                          {isExpired ? 'Expired' : 'Expires'} {format(new Date(cert.expiresAt), 'PPP')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCertification(cert.code)}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No certifications on record
              </div>
            )}
          </div>

          {/* Performance Metrics (Placeholder) */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Performance Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Acceptance Rate</div>
                <div className="text-2xl font-bold text-blue-900">87%</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">On-Time Completion</div>
                <div className="text-2xl font-bold text-green-900">92%</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Customer Rating</div>
                <div className="text-2xl font-bold text-purple-900">
                  {provider.rating?.toFixed(1) || 'N/A'}/5
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>

            <div className="space-y-3">
              <button
                onClick={() => setShowTierModal(true)}
                className="btn btn-primary w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Update Tier
              </button>

              {provider.riskStatus === ProviderRiskStatus.OK && (
                <>
                  <button
                    onClick={() => setShowWatchModal(true)}
                    className="btn btn-warning w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Put On Watch
                  </button>
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="btn btn-danger w-full"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend Provider
                  </button>
                </>
              )}

              {provider.riskStatus === ProviderRiskStatus.ON_WATCH && (
                <>
                  <button
                    onClick={handleClearWatch}
                    className="btn btn-success w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Clear Watch Status
                  </button>
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="btn btn-danger w-full"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend Provider
                  </button>
                </>
              )}

              {provider.riskStatus === ProviderRiskStatus.SUSPENDED && (
                <button
                  onClick={handleUnsuspend}
                  className="btn btn-success w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Lift Suspension
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Quick Stats
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Work Teams</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Assignments</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed Jobs (30d)</span>
                <span className="font-medium">45</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="font-medium">2.3h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Update Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Update Provider Tier</h3>

            <div className="space-y-3 mb-6">
              {[1, 2, 3].map((tier) => (
                <label key={tier} className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name="tier"
                    value={tier}
                    checked={selectedTier === tier}
                    onChange={(e) => setSelectedTier(parseInt(e.target.value))}
                    className="text-primary-600"
                  />
                  <div className="flex-1">
                    {getTierBadge(tier)}
                    <div className="text-xs text-gray-600 mt-1">
                      {tier === 1 && 'Premium providers with highest quality standards'}
                      {tier === 2 && 'Standard providers meeting baseline requirements'}
                      {tier === 3 && 'Basic providers or new partners'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTierModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTier(selectedTier)}
                className="btn btn-primary flex-1"
              >
                Update Tier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Suspend Provider</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suspension Reason *
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Explain why this provider is being suspended..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suspended From (optional)
                </label>
                <input
                  type="date"
                  value={suspendFrom}
                  onChange={(e) => setSuspendFrom(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suspended Until (optional)
                </label>
                <input
                  type="date"
                  value={suspendUntil}
                  onChange={(e) => setSuspendUntil(e.target.value)}
                  className="input"
                />
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    Suspended providers cannot receive new assignments and will be excluded from scheduling.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                className="btn btn-danger flex-1"
                disabled={!suspendReason}
              >
                Suspend Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Put On Watch Modal */}
      {showWatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Put Provider On Watch</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Watch Reason *
                </label>
                <textarea
                  value={watchReason}
                  onChange={(e) => setWatchReason(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Explain why this provider is being put on watch..."
                />
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    Providers on watch remain active but are flagged for closer monitoring and review.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWatchModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handlePutOnWatch}
                className="btn btn-warning flex-1"
                disabled={!watchReason}
              >
                Put On Watch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      {showAddCertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Certification</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certification Code *
                </label>
                <input
                  type="text"
                  value={certCode}
                  onChange={(e) => setCertCode(e.target.value)}
                  className="input"
                  placeholder="e.g., SOLAR_INST_2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certification Name *
                </label>
                <input
                  type="text"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="input"
                  placeholder="e.g., Solar Panel Installation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date *
                </label>
                <input
                  type="date"
                  value={certExpires}
                  onChange={(e) => setCertExpires(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddCertModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCertification}
                className="btn btn-primary flex-1"
                disabled={!certCode || !certName || !certExpires}
              >
                Add Certification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
