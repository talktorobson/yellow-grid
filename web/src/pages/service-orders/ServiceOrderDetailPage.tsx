/**
 * Service Order Detail Page
 * Comprehensive view with all details, AI assessments, and actions
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import { ArrowLeft, TrendingUp, Shield, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['service-order', id],
    queryFn: () => serviceOrderService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
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
          <h3 className="text-lg font-medium text-gray-900">Service Order Not Found</h3>
          <Link to="/service-orders" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            ← Back to Service Orders
          </Link>
        </div>
      </div>
    );
  }

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
              <span className="badge badge-primary">{order.status}</span>
              <span className="text-sm text-gray-500">
                {order.serviceType} • {order.priority} • {order.countryCode}
              </span>
            </div>
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
                <dt className="text-sm font-medium text-gray-500">External ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.externalId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.serviceType}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.priority}</dd>
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

          {/* Customer Information */}
          {(order.customerName || order.customerAddress || order.customerPhone || order.customerEmail) && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <dl className="grid grid-cols-2 gap-4">
                {order.customerName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.customerName}</dd>
                  </div>
                )}
                {order.customerPhone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.customerPhone}</dd>
                  </div>
                )}
                {order.customerAddress && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.customerAddress}</dd>
                  </div>
                )}
                {order.customerEmail && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{order.customerEmail}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* AI Sales Potential Assessment */}
          {order.serviceType === 'TECHNICAL_VISIT' && (
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold">AI Sales Potential Assessment</h2>
                </div>
                <button className="btn btn-secondary text-sm">
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
                    <div className="text-lg font-semibold text-gray-900 mb-3">
                      Estimated Sales Value: €{order.salesPreEstimationValue.toLocaleString()}
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
              <button className="btn btn-secondary text-sm">
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

                {!order.riskAcknowledgedAt && (
                  <button className="btn btn-primary w-full text-sm">Acknowledge Risk</button>
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
              <button className="btn btn-secondary text-sm">Update Status</button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">Go Exec Status</div>
                <div>
                  {order.goExecStatus === 'OK' && <span className="badge badge-success">OK</span>}
                  {order.goExecStatus === 'NOK' && <span className="badge badge-danger">NOK - BLOCKED</span>}
                  {order.goExecStatus === 'DEROGATION' && <span className="badge badge-warning">DEROGATION</span>}
                  {!order.goExecStatus && <span className="badge badge-gray">NOT SET</span>}
                </div>
              </div>

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
          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="btn btn-primary w-full text-sm">Create Assignment</button>
              <button className="btn btn-secondary w-full text-sm">Generate Contract</button>
              <button className="btn btn-secondary w-full text-sm">View Timeline</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
