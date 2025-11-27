/**
 * Seller Quotations Page
 * 
 * Manage quotations/devis for service orders.
 * Create, track, and convert quotations to orders.
 */

import { useState } from 'react';
import { 
  Search, Filter, Plus, FileText, CheckCircle, XCircle, Clock, 
  Send, Download, Eye, Edit, DollarSign, Calendar, User
} from 'lucide-react';
import clsx from 'clsx';

interface Quotation {
  id: string;
  reference: string;
  client: string;
  project?: string;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  amount: number;
  createdDate: string;
  expiryDate: string;
  validDays: number;
  items: { description: string; quantity: number; unitPrice: number }[];
}

const mockQuotations: Quotation[] = [
  { id: '1', reference: 'DEV-2025-001', client: 'Jean Dupont', title: 'Installation électrique complète', description: 'Installation du tableau électrique et câblage', status: 'sent', amount: 4500, createdDate: '2025-11-25', expiryDate: '2025-12-25', validDays: 30, items: [{ description: 'Tableau électrique', quantity: 1, unitPrice: 800 }, { description: 'Câblage', quantity: 1, unitPrice: 2200 }, { description: 'Main d\'œuvre', quantity: 1, unitPrice: 1500 }] },
  { id: '2', reference: 'DEV-2025-002', client: 'Marie Martin', project: 'Rénovation Appartement', title: 'Mise aux normes électriques', description: 'Mise aux normes NF C 15-100', status: 'viewed', amount: 2800, createdDate: '2025-11-24', expiryDate: '2025-12-24', validDays: 30, items: [{ description: 'Diagnostic', quantity: 1, unitPrice: 200 }, { description: 'Travaux', quantity: 1, unitPrice: 2600 }] },
  { id: '3', reference: 'DEV-2025-003', client: 'SCI Immobilière', project: 'Immeuble Haussmann', title: 'Rénovation électrique parties communes', description: 'Rénovation complète des parties communes', status: 'accepted', amount: 15600, createdDate: '2025-11-20', expiryDate: '2025-12-20', validDays: 30, items: [{ description: 'Éclairage', quantity: 1, unitPrice: 5000 }, { description: 'Tableau général', quantity: 1, unitPrice: 6000 }, { description: 'Installation', quantity: 1, unitPrice: 4600 }] },
  { id: '4', reference: 'DEV-2025-004', client: 'Pierre Bernard', title: 'Installation prise triphasée', description: 'Installation d\'une prise triphasée pour atelier', status: 'draft', amount: 850, createdDate: '2025-11-26', expiryDate: '2025-12-26', validDays: 30, items: [{ description: 'Prise triphasée', quantity: 1, unitPrice: 250 }, { description: 'Câblage', quantity: 1, unitPrice: 300 }, { description: 'Installation', quantity: 1, unitPrice: 300 }] },
  { id: '5', reference: 'DEV-2024-089', client: 'Sophie Petit', title: 'Diagnostic électrique', description: 'Diagnostic complet de l\'installation', status: 'rejected', amount: 350, createdDate: '2024-11-15', expiryDate: '2024-12-15', validDays: 30, items: [{ description: 'Diagnostic', quantity: 1, unitPrice: 350 }] },
  { id: '6', reference: 'DEV-2024-085', client: 'Entreprise XYZ', title: 'Installation éclairage bureaux', description: 'Éclairage LED pour open space', status: 'expired', amount: 8200, createdDate: '2024-10-01', expiryDate: '2024-10-31', validDays: 30, items: [{ description: 'Luminaires LED', quantity: 24, unitPrice: 150 }, { description: 'Installation', quantity: 1, unitPrice: 4600 }] },
];

const getStatusColor = (status: Quotation['status']): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700';
    case 'sent': return 'bg-blue-100 text-blue-700';
    case 'viewed': return 'bg-purple-100 text-purple-700';
    case 'accepted': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'expired': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status: Quotation['status']) => {
  switch (status) {
    case 'draft': return <FileText className="w-5 h-5 text-gray-500" />;
    case 'sent': return <Send className="w-5 h-5 text-blue-500" />;
    case 'viewed': return <Eye className="w-5 h-5 text-purple-500" />;
    case 'accepted': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
    case 'expired': return <Clock className="w-5 h-5 text-amber-500" />;
    default: return <FileText className="w-5 h-5 text-gray-400" />;
  }
};

export default function SellerQuotationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Quotation['status']>('all');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const filteredQuotations = mockQuotations.filter(quotation => {
    const matchesSearch = quotation.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          quotation.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          quotation.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    draft: mockQuotations.filter(q => q.status === 'draft').length,
    pending: mockQuotations.filter(q => ['sent', 'viewed'].includes(q.status)).length,
    accepted: mockQuotations.filter(q => q.status === 'accepted').length,
    totalValue: mockQuotations.filter(q => ['sent', 'viewed'].includes(q.status)).reduce((sum, q) => sum + q.amount, 0),
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600">Create and manage quotes for your clients</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-gray-600">Drafts</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending Response</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.accepted}</p>
              <p className="text-sm text-gray-600">Accepted</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">€{stats.totalValue.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Pending Value</p>
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
              placeholder="Search quotations..."
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
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Quotations List */}
        <div className="col-span-2 card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">Quotations ({filteredQuotations.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredQuotations.map((quotation) => (
              <div
                key={quotation.id}
                onClick={() => setSelectedQuotation(quotation)}
                className={clsx(
                  'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                  selectedQuotation?.id === quotation.id && 'bg-primary-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(quotation.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{quotation.title}</p>
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium capitalize',
                          getStatusColor(quotation.status)
                        )}>
                          {quotation.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{quotation.reference}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {quotation.client}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {quotation.createdDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-600">€{quotation.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Valid until {quotation.expiryDate}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredQuotations.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No quotations found matching your criteria
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="card">
          {selectedQuotation ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{selectedQuotation.reference}</h3>
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium capitalize',
                    getStatusColor(selectedQuotation.status)
                  )}>
                    {selectedQuotation.status}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="font-medium">{selectedQuotation.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-700">{selectedQuotation.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium">{selectedQuotation.client}</p>
                  </div>
                  {selectedQuotation.project && (
                    <div>
                      <p className="text-sm text-gray-500">Project</p>
                      <p className="font-medium">{selectedQuotation.project}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">{selectedQuotation.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Expires</p>
                    <p className="font-medium">{selectedQuotation.expiryDate}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Line Items</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {selectedQuotation.items.map((item) => (
                      <div key={item.description} className="flex justify-between text-sm">
                        <span>{item.description} {item.quantity > 1 && `x${item.quantity}`}</span>
                        <span className="font-medium">€{(item.quantity * item.unitPrice).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary-600">€{selectedQuotation.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                  {selectedQuotation.status === 'draft' && (
                    <>
                      <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                        <Edit className="w-4 h-4" />
                        Edit Quotation
                      </button>
                      <button className="w-full btn btn-primary flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        Send to Client
                      </button>
                    </>
                  )}
                  {selectedQuotation.status === 'accepted' && (
                    <button className="w-full btn btn-primary flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Convert to Order
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Select a quotation to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
