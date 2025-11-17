import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { serviceOrdersApi, assignmentsApi, executionsApi } from '../api';
import { SalesPotential, RiskLevel } from '../types';
import type { ServiceOrder, Assignment, Execution } from '../types';
import { format } from 'date-fns';
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Shield,
  User,
  PlayCircle,
  FileText,
  Edit,
  Ban,
} from 'lucide-react';
import clsx from 'clsx';

export default function ServiceOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSalesPotentialModal, setShowSalesPotentialModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showGoExecModal, setShowGoExecModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadServiceOrder();
    }
  }, [id]);

  const loadServiceOrder = async () => {
    try {
      const response = await serviceOrdersApi.getById(id!);
      const orderData = response.data;
      setOrder(orderData);

      // Load assignment if exists
      if (orderData.assignment) {
        const assignmentResponse = await assignmentsApi.getById(orderData.assignment.id);
        setAssignment(assignmentResponse.data);

        // Load execution if assignment is accepted
        if (assignmentResponse.data.status === 'ACCEPTED') {
          try {
            const execResponse = await executionsApi.getAll({
              serviceOrderId: id,
            });
            if (execResponse.data.length > 0) {
              setExecution(execResponse.data[0]);
            }
          } catch (error) {
            console.log('No execution found');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load service order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssessSalesPotential = async (data: {
    salesPotential: SalesPotential;
    salesPotentialScore: number;
    salesPreEstimationValue?: number;
    salesmanNotes?: string;
  }) => {
    try {
      await serviceOrdersApi.assessSalesPotential(id!, data);
      await loadServiceOrder();
      setShowSalesPotentialModal(false);
    } catch (error) {
      console.error('Failed to assess sales potential:', error);
    }
  };

  const handleAssessRisk = async (data: {
    riskLevel: RiskLevel;
    riskScore: number;
    riskFactors?: any;
  }) => {
    try {
      await serviceOrdersApi.assessRisk(id!, data);
      await loadServiceOrder();
      setShowRiskModal(false);
    } catch (error) {
      console.error('Failed to assess risk:', error);
    }
  };

  const handleAcknowledgeRisk = async () => {
    try {
      const userId = 'current-user-id'; // TODO: Get from auth context
      await serviceOrdersApi.acknowledgeRisk(id!, userId);
      await loadServiceOrder();
    } catch (error) {
      console.error('Failed to acknowledge risk:', error);
    }
  };

  const handleUpdateGoExec = async (status: 'OK' | 'NOK' | 'DEROGATION', data?: any) => {
    try {
      await serviceOrdersApi.updateGoExecStatus(id!, {
        goExecStatus: status,
        ...data,
      });
      await loadServiceOrder();
      setShowGoExecModal(false);
    } catch (error) {
      console.error('Failed to update Go Exec status:', error);
    }
  };

  const handleOverrideGoExec = async () => {
    try {
      await serviceOrdersApi.overrideGoExec(id!, {
        reason: 'Manual override by operator',
        approvedBy: 'current-user-id', // TODO: Get from auth
      });
      await loadServiceOrder();
      setShowGoExecModal(false);
    } catch (error) {
      console.error('Failed to override Go Exec:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading service order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Service Order Not Found</h3>
          <Link to="/service-orders" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            ← Back to Service Orders
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      CREATED: 'badge-gray',
      SCHEDULED: 'badge-info',
      ASSIGNED: 'badge-info',
      IN_PROGRESS: 'badge-warning',
      COMPLETED: 'badge-success',
      FAILED: 'badge-danger',
    };
    return <span className={clsx('badge', colors[status] || 'badge-gray')}>{status}</span>;
  };

  const getSalesPotentialColor = (potential?: string) => {
    const colors = {
      HIGH: 'text-green-600 bg-green-50',
      MEDIUM: 'text-yellow-600 bg-yellow-50',
      LOW: 'text-gray-600 bg-gray-50',
    };
    return colors[potential as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getRiskLevelColor = (risk?: string) => {
    const colors = {
      CRITICAL: 'text-red-600 bg-red-50',
      HIGH: 'text-red-600 bg-red-50',
      MEDIUM: 'text-yellow-600 bg-yellow-50',
      LOW: 'text-green-600 bg-green-50',
    };
    return colors[risk as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/service-orders"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Service Orders
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.externalId}</h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(order.status)}
              <span className="text-sm text-gray-500">
                {order.serviceType} • {order.priority} • {order.countryCode}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Order Details */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Service Order Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.project?.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.project?.customerEmail || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.project?.customerPhone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {order.project?.worksiteCity}, {order.project?.worksiteZip}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Scheduled Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {order.scheduledDate ? format(new Date(order.scheduledDate), 'PPP') : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Estimated Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {order.estimatedDuration ? `${order.estimatedDuration}h` : '-'}
                </dd>
              </div>
              {order.salesOrderId && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sales Order ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.salesOrderId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sales System</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.salesSystemSource || '-'}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* AI Sales Potential Assessment (Technical Visits only) */}
          {order.serviceType === 'TECHNICAL_VISIT' && (
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold">AI Sales Potential Assessment</h2>
                </div>
                <button
                  onClick={() => setShowSalesPotentialModal(true)}
                  className="btn btn-secondary text-sm"
                >
                  {order.salesPotential ? 'Update' : 'Assess'}
                </button>
              </div>

              {order.salesPotential ? (
                <div>
                  <div className={clsx('p-4 rounded-lg mb-4', getSalesPotentialColor(order.salesPotential))}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Potential Level</div>
                        <div className="text-2xl font-bold">{order.salesPotential}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Confidence Score</div>
                        <div className="text-2xl font-bold">
                          {((order.salesPotentialScore || 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {order.salesPreEstimationValue && (
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-500">Estimated Sales Value</div>
                        <div className="text-lg font-semibold text-gray-900">
                          €{order.salesPreEstimationValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {order.salesmanNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-1">Salesman Notes</div>
                      <div className="text-sm text-gray-600">{order.salesmanNotes}</div>
                    </div>
                  )}

                  {order.salesPotentialUpdatedAt && (
                    <div className="text-xs text-gray-500 mt-3">
                      Last assessed: {format(new Date(order.salesPotentialUpdatedAt), 'PPp')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  No sales potential assessment yet. Click "Assess" to run AI analysis.
                </div>
              )}
            </div>
          )}

          {/* AI Risk Assessment */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold">AI Risk Assessment</h2>
              </div>
              <button
                onClick={() => setShowRiskModal(true)}
                className="btn btn-secondary text-sm"
              >
                {order.riskLevel ? 'Update' : 'Assess'}
              </button>
            </div>

            {order.riskLevel ? (
              <div>
                <div className={clsx('p-4 rounded-lg mb-4', getRiskLevelColor(order.riskLevel))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Risk Level</div>
                      <div className="text-2xl font-bold">{order.riskLevel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Risk Score</div>
                      <div className="text-2xl font-bold">
                        {((order.riskScore || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>

                {order.riskFactors && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Risk Factors</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {Object.entries(order.riskFactors).map(([key, value]) => (
                        <li key={key} className="flex items-start">
                          <span className="font-medium mr-2">{key}:</span>
                          <span>{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {order.riskAcknowledgedAt ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Risk acknowledged on {format(new Date(order.riskAcknowledgedAt), 'PPp')}
                  </div>
                ) : (
                  <button
                    onClick={handleAcknowledgeRisk}
                    className="btn btn-primary w-full text-sm"
                  >
                    Acknowledge Risk
                  </button>
                )}

                {order.riskAssessedAt && (
                  <div className="text-xs text-gray-500 mt-3">
                    Last assessed: {format(new Date(order.riskAssessedAt), 'PPp')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                No risk assessment yet. Click "Assess" to run AI analysis.
              </div>
            )}
          </div>

          {/* Go Execution Monitoring */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Go Execution Monitoring</h2>
              </div>
              <button
                onClick={() => setShowGoExecModal(true)}
                className="btn btn-secondary text-sm"
              >
                Update Status
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-700">Go Exec Status</div>
                </div>
                <div>
                  {order.goExecStatus === 'OK' && (
                    <span className="badge badge-success">OK</span>
                  )}
                  {order.goExecStatus === 'NOK' && (
                    <span className="badge badge-danger">NOK - BLOCKED</span>
                  )}
                  {order.goExecStatus === 'DEROGATION' && (
                    <span className="badge badge-warning">DEROGATION</span>
                  )}
                  {!order.goExecStatus && (
                    <span className="badge badge-gray">NOT SET</span>
                  )}
                </div>
              </div>

              {order.goExecStatus === 'NOK' && order.goExecBlockReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-800 mb-1">Execution Blocked</div>
                      <div className="text-sm text-red-700">{order.goExecBlockReason}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleOverrideGoExec}
                    className="btn btn-danger text-sm mt-3 w-full"
                  >
                    Override Block (Derogation)
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Payment Status</div>
                  <div className="text-sm font-medium text-gray-900">
                    {order.paymentStatus || 'Not set'}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Product Delivery</div>
                  <div className="text-sm font-medium text-gray-900">
                    {order.productDeliveryStatus || 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment Status */}
          {assignment && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold">Assignment</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Provider</div>
                  <div className="text-sm font-medium text-gray-900">
                    {assignment.provider?.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="mt-1">
                    <span
                      className={clsx(
                        'badge',
                        assignment.status === 'ACCEPTED' ? 'badge-success' :
                        assignment.status === 'REFUSED' ? 'badge-danger' :
                        assignment.status === 'TIMEOUT' ? 'badge-danger' :
                        'badge-warning'
                      )}
                    >
                      {assignment.status}
                    </span>
                  </div>
                </div>
                {assignment.acceptedAt && (
                  <div>
                    <div className="text-sm text-gray-500">Accepted At</div>
                    <div className="text-sm text-gray-900">
                      {format(new Date(assignment.acceptedAt), 'PPp')}
                    </div>
                  </div>
                )}
                <Link
                  to={`/assignments/${assignment.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          )}

          {/* Execution Status */}
          {execution && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <PlayCircle className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Execution</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="mt-1">
                    <span
                      className={clsx(
                        'badge',
                        execution.status === 'COMPLETED' ? 'badge-success' :
                        execution.status === 'IN_PROGRESS' ? 'badge-warning' :
                        execution.status === 'BLOCKED' ? 'badge-danger' :
                        'badge-gray'
                      )}
                    >
                      {execution.status}
                    </span>
                  </div>
                </div>
                {execution.checkInAt && (
                  <div>
                    <div className="text-sm text-gray-500">Checked In</div>
                    <div className="text-sm text-gray-900">
                      {format(new Date(execution.checkInAt), 'PPp')}
                    </div>
                  </div>
                )}
                {execution.checklistCompletion !== undefined && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Checklist Progress</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${execution.checklistCompletion}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {execution.checklistCompletion}% complete
                    </div>
                  </div>
                )}
                {execution.customerRating && (
                  <div>
                    <div className="text-sm text-gray-500">Customer Rating</div>
                    <div className="text-lg font-semibold text-yellow-600">
                      {'⭐'.repeat(Math.floor(execution.customerRating))} {execution.customerRating}/5
                    </div>
                  </div>
                )}
                <Link
                  to={`/executions/${execution.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          )}

          {/* Contract & WCF Status */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Documents</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Contract Status</div>
                <div className="mt-1">
                  <span
                    className={clsx(
                      'badge',
                      order.contractStatus === 'SIGNED' ? 'badge-success' :
                      order.contractStatus === 'SENT' ? 'badge-info' :
                      order.contractStatus === 'REFUSED' ? 'badge-danger' :
                      'badge-gray'
                    )}
                  >
                    {order.contractStatus || 'NOT STARTED'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">WCF Status</div>
                <div className="mt-1">
                  <span
                    className={clsx(
                      'badge',
                      order.wcfStatus === 'SIGNED_OK' ? 'badge-success' :
                      order.wcfStatus === 'SIGNED_WITH_RESERVES' ? 'badge-warning' :
                      order.wcfStatus === 'SENT' ? 'badge-info' :
                      order.wcfStatus === 'REFUSED' ? 'badge-danger' :
                      'badge-gray'
                    )}
                  >
                    {order.wcfStatus || 'NOT STARTED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="btn btn-secondary w-full text-sm">
                Create Assignment
              </button>
              <button className="btn btn-secondary w-full text-sm">
                Generate Contract
              </button>
              <button className="btn btn-secondary w-full text-sm">
                View Timeline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals would go here - simplified for now */}
      {showSalesPotentialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Assess Sales Potential</h3>
            <p className="text-sm text-gray-600 mb-4">
              AI assessment coming soon. For demo, select manually:
            </p>
            <div className="space-y-2">
              <button
                onClick={() =>
                  handleAssessSalesPotential({
                    salesPotential: SalesPotential.HIGH,
                    salesPotentialScore: 0.87,
                    salesPreEstimationValue: 15000,
                    salesmanNotes: 'Strong interest in solar + battery expansion',
                  })
                }
                className="btn btn-success w-full"
              >
                HIGH (87% - €15k)
              </button>
              <button
                onClick={() =>
                  handleAssessSalesPotential({
                    salesPotential: SalesPotential.MEDIUM,
                    salesPotentialScore: 0.52,
                    salesPreEstimationValue: 8000,
                  })
                }
                className="btn btn-secondary w-full"
              >
                MEDIUM (52% - €8k)
              </button>
              <button
                onClick={() =>
                  handleAssessSalesPotential({
                    salesPotential: SalesPotential.LOW,
                    salesPotentialScore: 0.23,
                  })
                }
                className="btn btn-secondary w-full"
              >
                LOW (23%)
              </button>
            </div>
            <button
              onClick={() => setShowSalesPotentialModal(false)}
              className="btn btn-secondary w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showRiskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Assess Risk Level</h3>
            <p className="text-sm text-gray-600 mb-4">
              AI assessment coming soon. For demo, select manually:
            </p>
            <div className="space-y-2">
              <button
                onClick={() =>
                  handleAssessRisk({
                    riskLevel: RiskLevel.CRITICAL,
                    riskScore: 0.92,
                    riskFactors: { complexity: 'Very high', history: 'Multiple failures' },
                  })
                }
                className="btn btn-danger w-full"
              >
                CRITICAL (92%)
              </button>
              <button
                onClick={() =>
                  handleAssessRisk({
                    riskLevel: RiskLevel.HIGH,
                    riskScore: 0.78,
                    riskFactors: { complexity: 'High', timeline: 'Tight' },
                  })
                }
                className="btn btn-danger w-full"
              >
                HIGH (78%)
              </button>
              <button
                onClick={() =>
                  handleAssessRisk({
                    riskLevel: RiskLevel.MEDIUM,
                    riskScore: 0.52,
                    riskFactors: { customerHistory: 'First-time', siteComplexity: 'Moderate' },
                  })
                }
                className="btn btn-secondary w-full"
              >
                MEDIUM (52%)
              </button>
              <button
                onClick={() =>
                  handleAssessRisk({
                    riskLevel: RiskLevel.LOW,
                    riskScore: 0.18,
                  })
                }
                className="btn btn-success w-full"
              >
                LOW (18%)
              </button>
            </div>
            <button
              onClick={() => setShowRiskModal(false)}
              className="btn btn-secondary w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showGoExecModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Update Go Exec Status</h3>
            <div className="space-y-2">
              <button
                onClick={() =>
                  handleUpdateGoExec('OK', {
                    paymentStatus: 'VERIFIED',
                    productDeliveryStatus: 'DELIVERED',
                  })
                }
                className="btn btn-success w-full"
              >
                ✓ OK - All Checks Passed
              </button>
              <button
                onClick={() =>
                  handleUpdateGoExec('NOK', {
                    goExecBlockReason: 'Customer payment not verified',
                    paymentStatus: 'PENDING',
                    productDeliveryStatus: 'SCHEDULED',
                  })
                }
                className="btn btn-danger w-full"
              >
                ✗ NOK - Block Execution
              </button>
            </div>
            <button
              onClick={() => setShowGoExecModal(false)}
              className="btn btn-secondary w-full mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
