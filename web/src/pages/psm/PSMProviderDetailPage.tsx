/**
 * PSM Provider Detail Page
 * 
 * Detailed view of a provider for PSM management, including
 * verification status, performance metrics, and onboarding progress.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building, MapPin, Phone, Mail, Star, 
  CheckCircle, XCircle, Clock, AlertTriangle, FileText,
  Users, BarChart2, Calendar, Edit, MessageSquare, Shield
} from 'lucide-react';
import clsx from 'clsx';

interface ProviderData {
  id: string;
  name: string;
  type: 'P1' | 'P2';
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  verificationStatus: 'verified' | 'pending' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high';
  contact: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  metrics: {
    rating: number;
    completedJobs: number;
    onTimeRate: number;
    firstTimeFixRate: number;
    avgResponseTime: string;
    activeTeams: number;
  };
  documents: {
    id: string;
    name: string;
    status: 'verified' | 'pending' | 'expired' | 'rejected';
    expiryDate?: string;
  }[];
  zones: string[];
  services: { name: string; priority: 'P1' | 'P2' | 'OPT_OUT' }[];
  notes: { id: string; content: string; author: string; date: string }[];
}

const mockProvider: ProviderData = {
  id: '1',
  name: 'Électricité Pro Paris',
  type: 'P1',
  status: 'active',
  verificationStatus: 'verified',
  riskLevel: 'low',
  contact: {
    name: 'Pierre Martin',
    phone: '+33 1 42 36 78 90',
    email: 'contact@electricite-pro.fr',
    address: '45 Avenue des Champs-Élysées, 75008 Paris',
  },
  metrics: {
    rating: 4.8,
    completedJobs: 423,
    onTimeRate: 96,
    firstTimeFixRate: 89,
    avgResponseTime: '2.3h',
    activeTeams: 3,
  },
  documents: [
    { id: 'd1', name: 'Business Registration (KBIS)', status: 'verified' },
    { id: 'd2', name: 'Insurance Certificate', status: 'verified', expiryDate: '2026-01-15' },
    { id: 'd3', name: 'Professional Liability', status: 'verified', expiryDate: '2025-12-31' },
    { id: 'd4', name: 'Electrical Certification', status: 'pending' },
    { id: 'd5', name: 'Safety Training Certificate', status: 'expired', expiryDate: '2025-11-01' },
  ],
  zones: ['Paris 15e', 'Paris 16e', 'Paris 8e', 'Boulogne-Billancourt', 'Issy-les-Moulineaux'],
  services: [
    { name: 'Installation électrique', priority: 'P1' },
    { name: 'Dépannage urgent', priority: 'P1' },
    { name: 'Mise aux normes', priority: 'P2' },
    { name: 'Diagnostic électrique', priority: 'P2' },
    { name: 'Domotique', priority: 'OPT_OUT' },
  ],
  notes: [
    { id: 'n1', content: 'Excellent provider, always responsive and professional', author: 'Marie (PSM)', date: '2025-11-20' },
    { id: 'n2', content: 'Completed 50+ jobs this quarter with no complaints', author: 'Sophie (PSM)', date: '2025-11-15' },
  ],
};

const getStatusColor = (status: ProviderData['status']): string => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'suspended': return 'bg-red-100 text-red-700';
    case 'inactive': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getRiskColor = (risk: ProviderData['riskLevel']): string => {
  switch (risk) {
    case 'low': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'high': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getVerificationBgColor = (status: ProviderData['verificationStatus']): string => {
  switch (status) {
    case 'verified': return 'bg-green-50 border border-green-200';
    case 'pending': return 'bg-amber-50 border border-amber-200';
    case 'rejected': return 'bg-red-50 border border-red-200';
    default: return 'bg-gray-50 border border-gray-200';
  }
};

const getDocStatusColor = (status: string): string => {
  switch (status) {
    case 'verified': return 'bg-green-100 text-green-700';
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'expired':
    case 'rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getDocStatusIcon = (status: string) => {
  switch (status) {
    case 'verified': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
    case 'expired': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
    default: return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'P1': return 'bg-green-100 text-green-700';
    case 'P2': return 'bg-blue-100 text-blue-700';
    case 'OPT_OUT': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export default function PSMProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'services' | 'history'>('overview');
  const [newNote, setNewNote] = useState('');

  // In real app, fetch provider by id from API
  const provider = { ...mockProvider, id: id ?? mockProvider.id };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    // Add note logic here
    setNewNote('');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
              <span className={clsx('px-2 py-1 rounded text-xs font-bold', 
                provider.type === 'P1' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
              )}>
                {provider.type}
              </span>
              <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', getStatusColor(provider.status))}>
                {provider.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {provider.contact.address}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Message
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="card p-4 text-center">
          <Star className="w-6 h-6 text-amber-400 mx-auto" />
          <p className="text-2xl font-bold mt-2">{provider.metrics.rating}</p>
          <p className="text-sm text-gray-600">Rating</p>
        </div>
        <div className="card p-4 text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
          <p className="text-2xl font-bold mt-2">{provider.metrics.completedJobs}</p>
          <p className="text-sm text-gray-600">Jobs</p>
        </div>
        <div className="card p-4 text-center">
          <Clock className="w-6 h-6 text-blue-500 mx-auto" />
          <p className="text-2xl font-bold mt-2">{provider.metrics.onTimeRate}%</p>
          <p className="text-sm text-gray-600">On-Time</p>
        </div>
        <div className="card p-4 text-center">
          <BarChart2 className="w-6 h-6 text-primary-500 mx-auto" />
          <p className="text-2xl font-bold mt-2">{provider.metrics.firstTimeFixRate}%</p>
          <p className="text-sm text-gray-600">First Fix</p>
        </div>
        <div className="card p-4 text-center">
          <Users className="w-6 h-6 text-purple-500 mx-auto" />
          <p className="text-2xl font-bold mt-2">{provider.metrics.activeTeams}</p>
          <p className="text-sm text-gray-600">Teams</p>
        </div>
        <div className="card p-4 text-center">
          <Shield className={clsx('w-6 h-6 mx-auto', getRiskColor(provider.riskLevel).replace('bg-', 'text-').split(' ')[0])} />
          <p className="text-2xl font-bold mt-2 capitalize">{provider.riskLevel}</p>
          <p className="text-sm text-gray-600">Risk</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2">
          {/* Tabs */}
          <div className="card">
            <div className="flex border-b border-gray-200">
              {(['overview', 'documents', 'services', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="p-6 space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Contact Person</p>
                        <p className="font-medium">{provider.contact.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{provider.contact.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg col-span-2">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{provider.contact.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Zones */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Service Zones</h3>
                  <div className="flex flex-wrap gap-2">
                    {provider.zones.map((zone) => (
                      <span key={zone} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                        {zone}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Verification Status */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Verification Status</h3>
                  <div className={clsx(
                    'p-4 rounded-lg flex items-center gap-4',
                    getVerificationBgColor(provider.verificationStatus)
                  )}>
                    {getDocStatusIcon(provider.verificationStatus)}
                    <div>
                      <p className="font-semibold capitalize">{provider.verificationStatus}</p>
                      <p className="text-sm text-gray-600">All required documents have been verified</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="p-6">
                <div className="space-y-3">
                  {provider.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        {getDocStatusIcon(doc.status)}
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          {doc.expiryDate && (
                            <p className="text-sm text-gray-500">Expires: {doc.expiryDate}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          'px-2 py-1 rounded text-xs font-medium capitalize',
                          getDocStatusColor(doc.status)
                        )}>
                          {doc.status}
                        </span>
                        <button className="text-sm text-primary-600 hover:text-primary-700">View</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 btn btn-secondary w-full flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Request Document
                </button>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="p-6">
                <div className="space-y-3">
                  {provider.services.map((service) => (
                    <div key={service.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <span className="font-medium">{service.name}</span>
                      <span className={clsx(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        getPriorityColor(service.priority)
                      )}>
                        {service.priority === 'OPT_OUT' ? 'Opted Out' : service.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-medium">Status changed to Active</p>
                      <p className="text-sm text-gray-600">2025-01-15 • By Marie (PSM)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-medium">Insurance Certificate verified</p>
                      <p className="text-sm text-gray-600">2025-01-14 • By Sophie (PSM)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-gray-500" />
                    <div>
                      <p className="font-medium">Provider onboarded</p>
                      <p className="text-sm text-gray-600">2024-12-20 • By System</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                View Calendar
              </button>
              <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Performance Report
              </button>
              <button className="w-full btn btn-secondary flex items-center justify-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50">
                <AlertTriangle className="w-4 h-4" />
                Flag for Review
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">PSM Notes</h3>
            </div>
            <div className="p-4 space-y-4">
              {provider.notes.map((note) => (
                <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{note.content}</p>
                  <p className="text-xs text-gray-500 mt-2">{note.author} • {note.date}</p>
                </div>
              ))}
              <div>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="input w-full text-sm"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="btn btn-primary w-full mt-2"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
