/**
 * PSM Verification Page
 * 
 * Manage provider document verification and compliance tracking.
 * Enables PSMs to review, approve, or reject provider documents.
 */

import { useState } from 'react';
import { 
  Search, FileText, CheckCircle, XCircle, Clock, 
  AlertTriangle, Eye, Download, Building, Calendar
} from 'lucide-react';
import clsx from 'clsx';

interface VerificationItem {
  id: string;
  providerId: string;
  providerName: string;
  documentType: string;
  documentName: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiryDate?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

const mockVerifications: VerificationItem[] = [
  { id: '1', providerId: 'P1', providerName: 'Électricité Pro Paris', documentType: 'Insurance', documentName: 'Professional Liability Insurance', submittedDate: '2025-11-25', status: 'pending', priority: 'high', expiryDate: '2026-01-15' },
  { id: '2', providerId: 'P2', providerName: 'Plomberie Express', documentType: 'Certification', documentName: 'Plumbing License', submittedDate: '2025-11-24', status: 'pending', priority: 'high' },
  { id: '3', providerId: 'P3', providerName: 'Chauffage Services', documentType: 'Insurance', documentName: 'Business Insurance', submittedDate: '2025-11-23', status: 'pending', priority: 'medium', expiryDate: '2026-03-01' },
  { id: '4', providerId: 'P1', providerName: 'Électricité Pro Paris', documentType: 'Certification', documentName: 'Electrical Safety Certificate', submittedDate: '2025-11-22', status: 'approved', priority: 'low' },
  { id: '5', providerId: 'P4', providerName: 'Multi-Services Plus', documentType: 'Registration', documentName: 'KBIS Extract', submittedDate: '2025-11-21', status: 'rejected', priority: 'high', notes: 'Document expired, new version required' },
  { id: '6', providerId: 'P2', providerName: 'Plomberie Express', documentType: 'Insurance', documentName: 'Liability Insurance', submittedDate: '2025-11-20', status: 'expired', priority: 'high', expiryDate: '2025-11-15' },
];

const getStatusColor = (status: VerificationItem['status']): string => {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'approved': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'expired': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status: VerificationItem['status']) => {
  switch (status) {
    case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
    case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
    case 'expired': return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    default: return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getPriorityColor = (priority: VerificationItem['priority']): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'low': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export default function PSMVerificationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);

  const filteredItems = mockVerifications.filter(item => {
    const matchesSearch = item.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.documentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesType = filterType === 'all' || item.documentType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = mockVerifications.filter(v => v.status === 'pending').length;
  const expiredCount = mockVerifications.filter(v => v.status === 'expired').length;

  const documentTypes = [...new Set(mockVerifications.map(v => v.documentType))];

  const handleApprove = (id: string) => {
    console.log('Approving:', id);
    setSelectedItem(null);
  };

  const handleReject = (id: string) => {
    console.log('Rejecting:', id);
    setSelectedItem(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Verification</h1>
          <p className="text-gray-600">Review and verify provider documents</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              {pendingCount} pending
            </span>
          )}
          {expiredCount > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              {expiredCount} expired
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-gray-600">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mockVerifications.filter(v => v.status === 'approved').length}</p>
              <p className="text-sm text-gray-600">Approved</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mockVerifications.filter(v => v.status === 'rejected').length}</p>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiredCount}</p>
              <p className="text-sm text-gray-600">Expired</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search providers or documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-9"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="input w-40"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Types</option>
            {documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Document List */}
        <div className="col-span-2 card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">Documents ({filteredItems.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={clsx(
                  'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                  selectedItem?.id === item.id && 'bg-primary-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.documentName}</p>
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          getPriorityColor(item.priority)
                        )}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Building className="w-4 h-4" />
                        {item.providerName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{item.documentType}</span>
                        <span>•</span>
                        <span>Submitted: {item.submittedDate}</span>
                        {item.expiryDate && (
                          <>
                            <span>•</span>
                            <span className={item.status === 'expired' ? 'text-red-500' : ''}>
                              Expires: {item.expiryDate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium capitalize',
                    getStatusColor(item.status)
                  )}>
                    {item.status}
                  </span>
                </div>
                {item.notes && (
                  <p className="mt-2 ml-9 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {item.notes}
                  </p>
                )}
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No documents found matching your criteria
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="card">
          {selectedItem ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold">Document Details</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                  <p className="mt-4 font-medium">{selectedItem.documentName}</p>
                  <p className="text-sm text-gray-500">{selectedItem.documentType}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider</span>
                    <span className="font-medium">{selectedItem.providerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium capitalize',
                      getStatusColor(selectedItem.status)
                    )}>
                      {selectedItem.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted</span>
                    <span>{selectedItem.submittedDate}</span>
                  </div>
                  {selectedItem.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiry Date</span>
                      <span className={selectedItem.status === 'expired' ? 'text-red-500' : ''}>
                        {selectedItem.expiryDate}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority</span>
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium capitalize',
                      getPriorityColor(selectedItem.priority)
                    )}>
                      {selectedItem.priority}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>

                {selectedItem.status === 'pending' && (
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <button
                      onClick={() => handleApprove(selectedItem.id)}
                      className="w-full btn btn-primary flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Document
                    </button>
                    <button
                      onClick={() => handleReject(selectedItem.id)}
                      className="w-full btn btn-secondary text-red-600 border-red-300 hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Document
                    </button>
                  </div>
                )}

                {selectedItem.status === 'expired' && (
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Document Expired</span>
                    </div>
                    <p className="text-sm text-amber-600 mt-1">
                      Contact the provider to request an updated document.
                    </p>
                    <button className="mt-3 btn btn-secondary w-full flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Request Update
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Select a document to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
