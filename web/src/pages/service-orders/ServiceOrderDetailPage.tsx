/**
 * Service Order Detail Page
 * Comprehensive view with all details, AI assessments, documents, and actions
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceOrderService } from '@/services/service-order-service';
import { ArrowLeft, TrendingUp, Shield, PlayCircle, FileText, Clock, CalendarClock, Clipboard } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import DocumentUpload from '@/components/documents/DocumentUpload';
import NoteForm from '@/components/documents/NoteForm';
import DocumentList from '@/components/documents/DocumentList';
import RescheduleModal from '@/components/service-orders/RescheduleModal';
import GoExecStatusModal from '@/components/service-orders/GoExecStatusModal';
import DerogationModal from '@/components/service-orders/DerogationModal';
import TechnicalVisitOutcomeModal from '@/components/service-orders/TechnicalVisitOutcomeModal';
import type { Note } from '@/services/document-service';

type TabType = 'overview' | 'documents' | 'timeline';

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showGoExecModal, setShowGoExecModal] = useState(false);
  const [showDerogationModal, setShowDerogationModal] = useState(false);
  const [showTVOutcomeModal, setShowTVOutcomeModal] = useState(false);

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

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    // Note editing is handled in NoteForm component
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

        {/* Tab Navigation */}
        <div className="flex gap-4 mt-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'documents'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Documents & Notes
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'timeline'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Timeline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
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
              {(order.customerInfo || order.customerName || order.customerAddress || order.customerPhone || order.customerEmail) && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    {(order.customerInfo?.name || order.customerName) && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{order.customerInfo?.name || order.customerName}</dd>
                      </div>
                    )}
                    {(order.customerInfo?.phone || order.customerPhone) && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{order.customerInfo?.phone || order.customerPhone}</dd>
                      </div>
                    )}
                    {(order.customerInfo?.email || order.customerEmail) && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">{order.customerInfo?.email || order.customerEmail}</dd>
                      </div>
                    )}
                    {(order.customerInfo?.address || order.customerAddress) && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {order.customerInfo?.address 
                            ? `${order.customerInfo.address.street || ''}, ${order.customerInfo.address.city || ''} ${order.customerInfo.address.postalCode || ''}, ${order.customerInfo.address.country || ''}`
                            : order.customerAddress}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
              
              {/* Service Address */}
              {order.serviceAddress && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Service Address</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {order.serviceAddress.street}, {order.serviceAddress.city} {order.serviceAddress.postalCode}, {order.serviceAddress.country}
                      </dd>
                    </div>
                    {order.serviceAddress.lat && order.serviceAddress.lng && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Coordinates</dt>
                        <dd className="mt-1 text-sm text-gray-500 font-mono text-xs">
                          {order.serviceAddress.lat.toFixed(6)}, {order.serviceAddress.lng.toFixed(6)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Sales Context (v2.1) */}
              {(order.salesSystem || order.store || order.salesOrderNumber || order.salesChannel) && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Sales Context</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    {order.salesOrderNumber && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Sales Order #</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{order.salesOrderNumber}</dd>
                      </div>
                    )}
                    {order.salesChannel && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Sales Channel</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <span className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            order.salesChannel === 'ONLINE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          )}>
                            {order.salesChannel === 'IN_STORE' ? '🏪 In-Store' : 
                             order.salesChannel === 'ONLINE' ? '🌐 Online' : 
                             order.salesChannel === 'PHONE' ? '📞 Phone' : '🚗 Field Sales'}
                          </span>
                        </dd>
                      </div>
                    )}
                    {order.salesSystem && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Sales System</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {order.salesSystem.name} <span className="text-gray-400">({order.salesSystem.code})</span>
                        </dd>
                      </div>
                    )}
                    {order.store && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Store</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {order.store.name}
                          <div className="text-xs text-gray-400">{order.store.buCode}</div>
                        </dd>
                      </div>
                    )}
                    {order.orderDate && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Order Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {format(new Date(order.orderDate), 'PPP')}
                        </dd>
                      </div>
                    )}
                    {order.buCode && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Business Unit Code</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{order.buCode}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Contacts (v2.1) */}
              {order.contacts && order.contacts.length > 0 && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Contacts</h2>
                  <div className="space-y-3">
                    {order.contacts.map((contact) => (
                      <div 
                        key={contact.id} 
                        className={clsx(
                          'p-3 rounded-lg border',
                          contact.isPrimary ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50'
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {contact.firstName} {contact.lastName}
                              </span>
                              {contact.isPrimary && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
                                  Primary
                                </span>
                              )}
                              <span className={clsx(
                                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                                contact.contactType === 'CUSTOMER' ? 'bg-blue-100 text-blue-700' :
                                contact.contactType === 'SITE_CONTACT' ? 'bg-green-100 text-green-700' :
                                contact.contactType === 'BILLING' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              )}>
                                {contact.contactType === 'CUSTOMER' ? '👤 Customer' :
                                 contact.contactType === 'SITE_CONTACT' ? '📍 Site' :
                                 contact.contactType === 'BILLING' ? '💳 Billing' : '🚨 Emergency'}
                              </span>
                            </div>
                            {contact.title && (
                              <div className="text-xs text-gray-500">{contact.title}</div>
                            )}
                          </div>
                          {contact.preferredMethod && (
                            <span className="text-xs text-gray-400">
                              Prefers: {contact.preferredMethod}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-gray-600">
                              📞 <a href={`tel:${contact.phone}`} className="hover:text-primary-600">{contact.phone}</a>
                            </div>
                          )}
                          {contact.mobile && (
                            <div className="flex items-center gap-1 text-gray-600">
                              📱 <a href={`tel:${contact.mobile}`} className="hover:text-primary-600">{contact.mobile}</a>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-1 text-gray-600">
                              ✉️ <a href={`mailto:${contact.email}`} className="hover:text-primary-600">{contact.email}</a>
                            </div>
                          )}
                          {contact.whatsapp && (
                            <div className="flex items-center gap-1 text-gray-600">
                              💬 {contact.whatsapp}
                            </div>
                          )}
                        </div>
                        {contact.availabilityNotes && (
                          <div className="mt-2 text-xs text-gray-500 italic">
                            📝 {contact.availabilityNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line Items / Order Contents (v2.1) */}
              {order.lineItems && order.lineItems.length > 0 && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Order Contents</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {order.lineItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-500">{item.lineNumber}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-start gap-2">
                                <span className={clsx(
                                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-0.5',
                                  item.lineType === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                )}>
                                  {item.lineType === 'PRODUCT' ? '📦' : '🔧'}
                                </span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                  <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
                                  {item.productBrand && (
                                    <div className="text-xs text-gray-500">{item.productBrand} {item.productModel}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center text-sm text-gray-900">
                              {Number(item.quantity)} {item.unitOfMeasure !== 'UNIT' && item.unitOfMeasure !== 'SERVICE' && item.unitOfMeasure}
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-gray-900">
                              {order.currency || '€'}{Number(item.unitPriceCustomer).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {order.currency || '€'}{Number(item.lineTotalCustomer).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-400">
                                incl. {(Number(item.taxRateCustomer) * 100).toFixed(0)}% tax
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {item.lineType === 'PRODUCT' && item.deliveryStatus && (
                                <span className={clsx(
                                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                  item.deliveryStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                  item.deliveryStatus === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                                  item.deliveryStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                )}>
                                  {item.deliveryStatus === 'DELIVERED' ? '✓ Delivered' :
                                   item.deliveryStatus === 'IN_TRANSIT' ? '🚚 In Transit' :
                                   item.deliveryStatus === 'PENDING' ? '⏳ Pending' : item.deliveryStatus}
                                </span>
                              )}
                              {item.lineType === 'SERVICE' && item.executionStatus && (
                                <span className={clsx(
                                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                  item.executionStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                  item.executionStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                  item.executionStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                )}>
                                  {item.executionStatus === 'COMPLETED' ? '✓ Done' :
                                   item.executionStatus === 'IN_PROGRESS' ? '🔄 In Progress' :
                                   item.executionStatus === 'PENDING' ? '⏳ Pending' : item.executionStatus}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium text-gray-500">
                            Subtotal (excl. tax)
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-gray-900">
                            {order.currency || '€'}{Number(order.totalAmountCustomerExclTax || 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium text-gray-500">
                            Tax
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-gray-900">
                            {order.currency || '€'}{Number(order.totalTaxCustomer || 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="border-t-2 border-gray-300">
                          <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-gray-900">
                            Total
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">
                            {order.currency || '€'}{Number(order.totalAmountCustomer || 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {/* Margin info (visible to operators) */}
                  {order.totalMargin !== undefined && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700 font-medium">Provider Cost</span>
                        <span className="text-blue-900">{order.currency || '€'}{Number(order.totalAmountProvider || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-blue-700 font-medium">Margin</span>
                        <span className="text-blue-900 font-semibold">
                          {order.currency || '€'}{Number(order.totalMargin).toFixed(2)}
                          {order.marginPercent && (
                            <span className="text-blue-600 ml-1">({(Number(order.marginPercent) * 100).toFixed(1)}%)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Status (v2.1) */}
              {(order.productDeliveryStatusEnum || order.earliestDeliveryDate || order.latestDeliveryDate) && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Delivery Status</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    {order.productDeliveryStatusEnum && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Overall Delivery Status</dt>
                        <dd className="mt-1">
                          <span className={clsx(
                            'inline-flex items-center px-2 py-1 rounded text-sm font-medium',
                            order.productDeliveryStatusEnum === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                            order.productDeliveryStatusEnum === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                            order.productDeliveryStatusEnum === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {order.productDeliveryStatusEnum === 'DELIVERED' ? '✓ All Delivered' :
                             order.productDeliveryStatusEnum === 'IN_TRANSIT' ? '🚚 In Transit' :
                             order.productDeliveryStatusEnum === 'PENDING' ? '⏳ Pending' : order.productDeliveryStatusEnum}
                          </span>
                        </dd>
                      </div>
                    )}
                    {order.allProductsDelivered !== undefined && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">All Products Delivered?</dt>
                        <dd className="mt-1 text-sm">
                          {order.allProductsDelivered ? 
                            <span className="text-green-600 font-medium">✓ Yes</span> : 
                            <span className="text-yellow-600 font-medium">⏳ Not yet</span>
                          }
                        </dd>
                      </div>
                    )}
                    {order.earliestDeliveryDate && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Earliest Delivery</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {format(new Date(order.earliestDeliveryDate), 'PPP')}
                        </dd>
                      </div>
                    )}
                    {order.latestDeliveryDate && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Latest Delivery</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {format(new Date(order.latestDeliveryDate), 'PPP')}
                        </dd>
                      </div>
                    )}
                    {order.deliveryBlocksExecution && (
                      <div className="col-span-2">
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                          ⚠️ Service execution is blocked until all products are delivered
                        </div>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Payment Status (v2.1) */}
              {(order.paymentStatus || order.paymentMethod || order.paidAmount) && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Payment</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    {order.paymentStatus && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                        <dd className="mt-1">
                          <span className={clsx(
                            'inline-flex items-center px-2 py-1 rounded text-sm font-medium',
                            order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                            order.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            order.paymentStatus === 'PARTIAL' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {order.paymentStatus === 'PAID' ? '✓ Paid' :
                             order.paymentStatus === 'PENDING' ? '⏳ Pending' :
                             order.paymentStatus === 'PARTIAL' ? '◐ Partial' : order.paymentStatus}
                          </span>
                        </dd>
                      </div>
                    )}
                    {order.paymentMethod && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                        <dd className="mt-1 text-sm text-gray-900">{order.paymentMethod}</dd>
                      </div>
                    )}
                    {order.paidAmount !== undefined && order.paidAmount !== null && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Amount Paid</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">
                          {order.currency || '€'}{Number(order.paidAmount).toFixed(2)}
                        </dd>
                      </div>
                    )}
                    {order.paymentReference && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reference</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{order.paymentReference}</dd>
                      </div>
                    )}
                    {order.paidAt && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Paid At</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {format(new Date(order.paidAt), 'PPp')}
                        </dd>
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

              {/* Technical Visit Outcome */}
              {order.serviceType === 'TECHNICAL_VISIT' && (
                <div className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <Clipboard className="w-5 h-5 text-purple-600" />
                      <h2 className="text-lg font-semibold">Technical Visit Outcome</h2>
                    </div>
                    <button
                      onClick={() => setShowTVOutcomeModal(true)}
                      className="btn btn-primary text-sm"
                    >
                      {(order as any).tvOutcome ? 'Update' : 'Record'} Outcome
                    </button>
                  </div>

                  {(order as any).tvOutcome ? (
                    <div>
                      {/* Outcome Badge */}
                      <div className={clsx(
                        'p-4 rounded-lg mb-4',
                        (order as any).tvOutcome === 'YES' ? 'bg-green-50 border-2 border-green-500' :
                        (order as any).tvOutcome === 'YES_BUT' ? 'bg-yellow-50 border-2 border-yellow-500' :
                        'bg-red-50 border-2 border-red-500'
                      )}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium mb-1">
                              {(order as any).tvOutcome === 'YES' ? '✓ YES - Ready to Proceed' :
                               (order as any).tvOutcome === 'YES_BUT' ? '⚠ YES-BUT - Conditional' :
                               '✗ NO - Cannot Proceed'}
                            </div>
                            <div className={clsx(
                              'text-2xl font-bold',
                              (order as any).tvOutcome === 'YES' ? 'text-green-700' :
                              (order as any).tvOutcome === 'YES_BUT' ? 'text-yellow-700' :
                              'text-red-700'
                            )}>
                              {(order as any).tvOutcome}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Findings */}
                      {(order as any).tvFindings && (
                        <div className="p-3 bg-gray-50 rounded-lg mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-1">Technical Findings</div>
                          <div className="text-sm text-gray-600">{(order as any).tvFindings}</div>
                        </div>
                      )}

                      {/* Issues (for NO) */}
                      {(order as any).tvOutcome === 'NO' && (order as any).tvIssues && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                          <div className="text-sm font-medium text-red-700 mb-1">Identified Issues</div>
                          <div className="text-sm text-red-600">{(order as any).tvIssues}</div>
                        </div>
                      )}

                      {/* Required Actions (for YES-BUT) */}
                      {(order as any).tvOutcome === 'YES_BUT' && (order as any).tvRequiredActions && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                          <div className="text-sm font-medium text-yellow-700 mb-1">Required Actions</div>
                          <div className="text-sm text-yellow-600">{(order as any).tvRequiredActions}</div>
                        </div>
                      )}

                      {/* Scope Changes */}
                      {(order as any).tvScopeChanges && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                          <div className="text-sm font-medium text-blue-700 mb-1">Scope Changes (Sent to Sales)</div>
                          <div className="text-sm text-blue-600">{(order as any).tvScopeChanges}</div>
                        </div>
                      )}

                      {/* Estimated Value */}
                      {(order as any).tvEstimatedValue && (
                        <div className="text-lg font-semibold text-gray-900 mb-3">
                          Estimated Value: €{(order as any).tvEstimatedValue.toLocaleString()}
                        </div>
                      )}

                      {(order as any).tvRecordedAt && (
                        <div className="text-xs text-gray-500 mt-3">
                          Recorded: {format(new Date((order as any).tvRecordedAt), 'PPp')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      No outcome recorded yet. Click "Record Outcome" to document the technical visit results.
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
                  <button
                    onClick={() => setShowGoExecModal(true)}
                    className="btn btn-secondary text-sm"
                  >
                    Update Status
                  </button>
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

                  {/* Block Reason */}
                  {order.goExecStatus === 'NOK' && order.goExecBlockReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs font-medium text-red-700 mb-1">Block Reason:</div>
                      <div className="text-sm text-red-900">{order.goExecBlockReason}</div>
                    </div>
                  )}

                  {/* Derogation Info */}
                  {order.goExecStatus === 'DEROGATION' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-xs font-medium text-yellow-700 mb-1">
                        ⚠️ Override Active (Derogation)
                      </div>
                      <div className="text-sm text-yellow-900">
                        This service order was blocked but has been overridden with management approval.
                      </div>
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
            </>
          )}

          {/* Documents & Notes Tab */}
          {activeTab === 'documents' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Document Upload */}
                <DocumentUpload serviceOrderId={id!} />

                {/* Note Form */}
                <NoteForm
                  serviceOrderId={id!}
                  existingNote={editingNote || undefined}
                  onSuccess={() => setEditingNote(null)}
                  onCancel={() => setEditingNote(null)}
                />
              </div>

              {/* Document List */}
              <DocumentList
                serviceOrderId={id!}
                onEditNote={handleEditNote}
              />
            </>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Timeline</h2>
              <div className="text-sm text-gray-500 text-center py-8">
                Timeline feature coming soon...
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="btn btn-primary w-full text-sm">Create Assignment</button>
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="btn btn-secondary w-full text-sm flex items-center justify-center gap-2"
              >
                <CalendarClock className="w-4 h-4" />
                Reschedule
              </button>
              <button className="btn btn-secondary w-full text-sm">Generate Contract</button>
              <button
                onClick={() => setActiveTab('documents')}
                className="btn btn-secondary w-full text-sm"
              >
                Add Document
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className="btn btn-secondary w-full text-sm"
              >
                View Timeline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <RescheduleModal
          serviceOrder={order}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={() => {
            setShowRescheduleModal(false);
            // Service order data will be automatically refreshed by React Query
          }}
        />
      )}

      {/* Go Exec Status Modal */}
      {showGoExecModal && (
        <GoExecStatusModal
          serviceOrder={order}
          onClose={() => setShowGoExecModal(false)}
          onSuccess={() => {
            setShowGoExecModal(false);
            // Service order data will be automatically refreshed by React Query
          }}
          onRequestDerogation={() => setShowDerogationModal(true)}
        />
      )}

      {/* Derogation Modal */}
      {showDerogationModal && (
        <DerogationModal
          serviceOrder={order}
          onClose={() => setShowDerogationModal(false)}
          onSuccess={() => {
            setShowDerogationModal(false);
            // Service order data will be automatically refreshed by React Query
          }}
        />
      )}

      {/* Technical Visit Outcome Modal */}
      {showTVOutcomeModal && (
        <TechnicalVisitOutcomeModal
          serviceOrder={order}
          onClose={() => setShowTVOutcomeModal(false)}
          onSuccess={() => {
            setShowTVOutcomeModal(false);
            // Service order data will be automatically refreshed by React Query
          }}
        />
      )}
    </div>
  );
}
