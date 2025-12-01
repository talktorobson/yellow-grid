/**
 * Provider Jobs Page
 * List and manage job offers and active jobs
 */

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

type JobStatus = 'OFFER_PENDING' | 'OFFER_ACCEPTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_WCF' | 'CANCELLED';
type TabType = 'offers' | 'active' | 'completed' | 'all';

interface Job {
  id: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    postalCode: string;
  };
  service: {
    name: string;
    category: string;
  };
  status: JobStatus;
  scheduledDate: string | null;
  scheduledTime: string | null;
  estimatedDuration: number;
  amount: number;
  urgency: 'normal' | 'urgent' | 'emergency';
  notes?: string;
  createdAt: string;
  expiresAt?: string;
}

const mockJobs: Job[] = [
  {
    id: 'SO-2024-001',
    customer: { name: 'Jean Dupont', phone: '06 12 34 56 78', address: '15 Rue de la Paix', postalCode: '75015' },
    service: { name: 'Installation électrique complète', category: 'Électricité' },
    status: 'IN_PROGRESS',
    scheduledDate: '2025-11-28',
    scheduledTime: '09:00',
    estimatedDuration: 4,
    amount: 450,
    urgency: 'normal',
    createdAt: '2025-11-25',
  },
  {
    id: 'SO-2024-002',
    customer: { name: 'Marie Martin', phone: '06 98 76 54 32', address: '8 Avenue des Champs', postalCode: '75008' },
    service: { name: 'Dépannage urgent', category: 'Électricité' },
    status: 'OFFER_PENDING',
    scheduledDate: null,
    scheduledTime: null,
    estimatedDuration: 2,
    amount: 150,
    urgency: 'urgent',
    notes: 'Panne de courant dans tout l\'appartement',
    createdAt: '2025-11-27',
    expiresAt: '2025-11-28T18:00:00',
  },
  {
    id: 'SO-2024-003',
    customer: { name: 'Pierre Bernard', phone: '06 11 22 33 44', address: '22 Boulevard Haussmann', postalCode: '75009' },
    service: { name: 'Mise aux normes tableau électrique', category: 'Électricité' },
    status: 'PENDING_WCF',
    scheduledDate: '2025-11-26',
    scheduledTime: '14:00',
    estimatedDuration: 3,
    amount: 890,
    urgency: 'normal',
    createdAt: '2025-11-20',
  },
  {
    id: 'SO-2024-004',
    customer: { name: 'Sophie Petit', phone: '06 55 66 77 88', address: '5 Rue du Commerce', postalCode: '75015' },
    service: { name: 'Diagnostic électrique', category: 'Électricité' },
    status: 'COMPLETED',
    scheduledDate: '2025-11-25',
    scheduledTime: '10:00',
    estimatedDuration: 1,
    amount: 80,
    urgency: 'normal',
    createdAt: '2025-11-22',
  },
  {
    id: 'SO-2024-005',
    customer: { name: 'Luc Moreau', phone: '06 44 55 66 77', address: '10 Rue de Rivoli', postalCode: '75001' },
    service: { name: 'Installation prise triphasée', category: 'Électricité' },
    status: 'OFFER_PENDING',
    scheduledDate: null,
    scheduledTime: null,
    estimatedDuration: 2,
    amount: 280,
    urgency: 'normal',
    createdAt: '2025-11-27',
    expiresAt: '2025-11-29T12:00:00',
  },
  {
    id: 'SO-2024-006',
    customer: { name: 'Emma Dubois', phone: '06 33 44 55 66', address: '18 Avenue Mozart', postalCode: '75016' },
    service: { name: 'Réparation interrupteur', category: 'Électricité' },
    status: 'SCHEDULED',
    scheduledDate: '2025-11-29',
    scheduledTime: '11:00',
    estimatedDuration: 1,
    amount: 95,
    urgency: 'normal',
    createdAt: '2025-11-26',
  },
];

const statusConfig: Record<JobStatus, { label: string; color: string; bgColor: string }> = {
  OFFER_PENDING: { label: 'Offer Pending', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  OFFER_ACCEPTED: { label: 'Accepted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  SCHEDULED: { label: 'Scheduled', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  PENDING_WCF: { label: 'Pending WCF', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

function JobCard({ job, onAccept, onDecline }: { job: Job; onAccept?: () => void; onDecline?: () => void }) {
  const status = statusConfig[job.status];
  const isOffer = job.status === 'OFFER_PENDING';
  
  return (
    <div className={clsx(
      'bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md',
      isOffer ? 'border-orange-200' : 'border-gray-200'
    )}>
      {/* Header */}
      <div className={clsx('px-5 py-3 flex items-center justify-between', isOffer ? 'bg-orange-50' : 'bg-gray-50')}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-gray-900">{job.id}</span>
          <span className={clsx('text-xs font-medium px-2 py-1 rounded-full', status.bgColor, status.color)}>
            {status.label}
          </span>
          {job.urgency !== 'normal' && (
            <span className={clsx(
              'text-xs font-medium px-2 py-1 rounded-full',
              job.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            )}>
              {job.urgency === 'emergency' ? '🚨 Emergency' : '⚡ Urgent'}
            </span>
          )}
        </div>
        {isOffer && job.expiresAt && (
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <Clock className="w-3.5 h-3.5" />
            <span>Expires {new Date(job.expiresAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex gap-5">
          <div className="flex-1 space-y-3">
            {/* Service */}
            <div>
              <p className="font-semibold text-gray-900">{job.service.name}</p>
              <p className="text-sm text-gray-500">{job.service.category}</p>
            </div>

            {/* Customer */}
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">{job.customer.name}</p>
                <p className="text-sm text-gray-500">{job.customer.phone}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">{job.customer.address}</p>
                <p className="text-sm text-gray-500">{job.customer.postalCode} Paris</p>
              </div>
            </div>

            {/* Schedule */}
            {job.scheduledDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-700">
                  {new Date(job.scheduledDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {job.scheduledTime && ` at ${job.scheduledTime}`}
                </p>
              </div>
            )}

            {/* Notes */}
            {job.notes && (
              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                <p className="text-sm text-gray-600">{job.notes}</p>
              </div>
            )}
          </div>

          {/* Right side - Amount & Duration */}
          <div className="text-right space-y-2">
            <div>
              <p className="text-2xl font-bold text-gray-900">€{job.amount}</p>
              <p className="text-xs text-gray-500">Estimated</p>
            </div>
            <div className="flex items-center gap-1 justify-end text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{job.estimatedDuration}h</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          {isOffer ? (
            <>
              <button
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Accept Offer
              </button>
              <button
                onClick={onDecline}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
            </>
          ) : (
            <Link
              to={`/provider/jobs/${job.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              View Details
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProviderJobsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('filter') === 'pending' ? 'offers' : 'all';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab as TabType);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>(mockJobs);

  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Filter by tab
    switch (activeTab) {
      case 'offers':
        result = result.filter(j => j.status === 'OFFER_PENDING');
        break;
      case 'active':
        result = result.filter(j => ['OFFER_ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'PENDING_WCF'].includes(j.status));
        break;
      case 'completed':
        result = result.filter(j => j.status === 'COMPLETED');
        break;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j => 
        j.id.toLowerCase().includes(query) ||
        j.customer.name.toLowerCase().includes(query) ||
        j.service.name.toLowerCase().includes(query) ||
        j.customer.address.toLowerCase().includes(query)
      );
    }

    return result;
  }, [activeTab, searchQuery, jobs]);

  const tabCounts = useMemo(() => ({
    offers: jobs.filter(j => j.status === 'OFFER_PENDING').length,
    active: jobs.filter(j => ['OFFER_ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'PENDING_WCF'].includes(j.status)).length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
    all: jobs.length,
  }), [jobs]);

  const handleAcceptOffer = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: 'OFFER_ACCEPTED' as JobStatus, scheduledDate: '2025-12-02', scheduledTime: '09:00' }
        : job
    ));
    toast.success('Offer accepted! Job scheduled for Dec 2nd at 09:00');
  };

  const handleDeclineOffer = (jobId: string) => {
    if (confirm('Are you sure you want to decline this offer?')) {
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'CANCELLED' as JobStatus }
          : job
      ));
      toast.success('Offer declined');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Manage your job offers and active assignments</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['offers', 'active', 'completed', 'all'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tabCounts[tab] > 0 && (
                <span className={clsx(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  activeTab === tab ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                )}>
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full md:w-64"
          />
        </div>
      </div>

      {/* Urgent Offers Alert */}
      {activeTab !== 'completed' && tabCounts.offers > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-orange-900">
              You have {tabCounts.offers} pending offer{tabCounts.offers > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-orange-700">
              Respond quickly to maintain your acceptance rate
            </p>
          </div>
          {activeTab !== 'offers' && (
            <button
              onClick={() => setActiveTab('offers')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              View Offers
            </button>
          )}
        </div>
      )}

      {/* Jobs List */}
      {filteredJobs.length > 0 ? (
        <div className="grid gap-4">
          {filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onAccept={() => handleAcceptOffer(job.id)}
              onDecline={() => handleDeclineOffer(job.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
          <p className="text-gray-500 mt-1">
            {getEmptyMessage()}
          </p>
        </div>
      )}
    </div>
  );

  function getEmptyMessage(): string {
    if (searchQuery) return 'Try adjusting your search terms';
    if (activeTab === 'all') return 'No jobs at the moment';
    return `No ${activeTab} jobs at the moment`;
  }
}
