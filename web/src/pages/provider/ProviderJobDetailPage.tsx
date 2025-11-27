/**
 * Provider Job Detail Page
 * 
 * Shows detailed information about a specific job including customer info,
 * service details, timeline, communications, and actions.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, User, Phone, Mail, MessageSquare, 
  FileText, Camera, CheckCircle, AlertCircle, Send, Calendar,
  Navigation, DollarSign, Wrench, ClipboardList
} from 'lucide-react';
import clsx from 'clsx';

interface TimelineEvent {
  id: string;
  type: 'status' | 'message' | 'note' | 'photo';
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
}

interface JobDetail {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  service: {
    name: string;
    category: string;
    description: string;
  };
  pricing: {
    estimated: number;
    parts: number;
    labor: number;
    total: number;
  };
  notes: string[];
  timeline: TimelineEvent[];
}

// Mock job data
const mockJob: JobDetail = {
  id: '1',
  reference: 'JOB-2025-001234',
  title: 'Installation électrique complète',
  description: 'Installation du tableau électrique, câblage et mise en place des prises dans un appartement de 80m²',
  status: 'in_progress',
  priority: 'high',
  scheduledDate: '2025-11-27',
  scheduledTime: '09:00',
  estimatedDuration: '4 hours',
  customer: {
    name: 'Jean Dupont',
    phone: '+33 6 12 34 56 78',
    email: 'jean.dupont@email.fr',
    address: '15 Rue de la Paix, 75015 Paris',
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  service: {
    name: 'Installation électrique',
    category: 'Électricité',
    description: 'Installation complète du système électrique',
  },
  pricing: {
    estimated: 450,
    parts: 180,
    labor: 270,
    total: 450,
  },
  notes: [
    'Client demande une installation aux normes NF C 15-100',
    'Accès par code: 4521B',
    'Prévoir protection sols (parquet neuf)',
  ],
  timeline: [
    { id: '1', type: 'status', title: 'Job Created', timestamp: '2025-11-25 10:00', user: 'System' },
    { id: '2', type: 'status', title: 'Assigned to Provider', timestamp: '2025-11-25 10:15', user: 'Marie (Operator)' },
    { id: '3', type: 'message', title: 'Customer Message', description: 'Merci de confirmer l\'heure d\'arrivée', timestamp: '2025-11-26 09:00', user: 'Jean Dupont' },
    { id: '4', type: 'status', title: 'Job Accepted', timestamp: '2025-11-26 09:30', user: 'Provider' },
    { id: '5', type: 'status', title: 'Work Started', timestamp: '2025-11-27 09:15', user: 'Provider' },
    { id: '6', type: 'photo', title: 'Site Photo Added', description: 'Photo du tableau électrique existant', timestamp: '2025-11-27 09:20', user: 'Provider' },
    { id: '7', type: 'note', title: 'Technical Note', description: 'Tableau existant vétuste, remplacement complet nécessaire', timestamp: '2025-11-27 09:45', user: 'Provider' },
  ],
};

const getStatusColor = (status: JobDetail['status']): string => {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-700';
    case 'accepted': return 'bg-blue-100 text-blue-700';
    case 'in_progress': return 'bg-amber-100 text-amber-700';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getPriorityColor = (priority: JobDetail['priority']): string => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-700';
    case 'medium': return 'bg-blue-100 text-blue-700';
    case 'high': return 'bg-amber-100 text-amber-700';
    case 'urgent': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getTimelineIcon = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'status': return CheckCircle;
    case 'message': return MessageSquare;
    case 'note': return FileText;
    case 'photo': return Camera;
    default: return CheckCircle;
  }
};

export default function ProviderJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'documents'>('details');

  // In real app, fetch job by id from API
  // For now, using mock data. The job id would be: id
  const job = { ...mockJob, id: id ?? mockJob.id };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // Send message logic here
    setNewMessage('');
  };

  const handleStatusUpdate = (newStatus: string) => {
    // Update status logic here
    console.log('Updating status to:', newStatus);
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
              <h1 className="text-2xl font-bold text-gray-900">{job.reference}</h1>
              <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', getStatusColor(job.status))}>
                {job.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', getPriorityColor(job.priority))}>
                {job.priority.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600">{job.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {job.status === 'in_progress' && (
            <button
              onClick={() => handleStatusUpdate('completed')}
              className="btn btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Complete Job
            </button>
          )}
          {job.status === 'accepted' && (
            <button
              onClick={() => handleStatusUpdate('in_progress')}
              className="btn btn-primary flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Start Work
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Tabs */}
          <div className="card">
            <div className="flex border-b border-gray-200">
              {(['details', 'timeline', 'documents'] as const).map((tab) => (
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

            {activeTab === 'details' && (
              <div className="p-6 space-y-6">
                {/* Service Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-gray-500" />
                    Service Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">{job.service.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{job.service.category}</p>
                    <p className="text-gray-700 mt-3">{job.description}</p>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    Schedule
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{job.scheduledDate}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium">{job.scheduledTime}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium">{job.estimatedDuration}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-500" />
                    Pricing
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Labor</span>
                      <span className="font-medium">€{job.pricing.labor}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Parts & Materials</span>
                      <span className="font-medium">€{job.pricing.parts}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg text-primary-600">€{job.pricing.total}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-gray-500" />
                    Important Notes
                  </h3>
                  <ul className="space-y-2">
                    {job.notes.map((note) => (
                      <li key={note.substring(0, 30)} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  {job.timeline.map((event) => {
                    const Icon = getTimelineIcon(event.type);
                    return (
                      <div key={event.id} className="relative pl-12 pb-6">
                        <div className={clsx(
                          'absolute left-2 w-5 h-5 rounded-full flex items-center justify-center',
                          event.type === 'status' ? 'bg-primary-100' : 'bg-gray-100'
                        )}>
                          <Icon className={clsx(
                            'w-3 h-3',
                            event.type === 'status' ? 'text-primary-600' : 'text-gray-600'
                          )} />
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">{event.title}</p>
                            <p className="text-xs text-gray-500">{event.timestamp}</p>
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                          {event.user && (
                            <p className="text-xs text-gray-500 mt-2">by {event.user}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer">
                    <FileText className="w-10 h-10 text-gray-400" />
                    <div>
                      <p className="font-medium">Work Order</p>
                      <p className="text-sm text-gray-500">PDF • 245 KB</p>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer">
                    <Camera className="w-10 h-10 text-gray-400" />
                    <div>
                      <p className="font-medium">Site Photos</p>
                      <p className="text-sm text-gray-500">3 photos</p>
                    </div>
                  </div>
                  <div className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer col-span-2">
                    <Camera className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-600">Upload Photos or Documents</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Customer</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium">{job.customer.name}</p>
                  <p className="text-sm text-gray-500">Client</p>
                </div>
              </div>

              <div className="space-y-3">
                <a href={`tel:${job.customer.phone}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{job.customer.phone}</span>
                </a>
                <a href={`mailto:${job.customer.email}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{job.customer.email}</span>
                </a>
                <div className="flex items-start gap-3 p-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span className="text-sm">{job.customer.address}</span>
                </div>
              </div>

              <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                <Navigation className="w-4 h-4" />
                Open in Maps
              </button>
            </div>
          </div>

          {/* Quick Message */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Send Message</h3>
            </div>
            <div className="p-4">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to the customer..."
                rows={3}
                className="input w-full text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="btn btn-primary w-full mt-3 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                Reschedule
              </button>
              <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />
                Add Photo
              </button>
              <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Add Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
