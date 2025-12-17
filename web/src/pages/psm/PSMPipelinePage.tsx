/**
 * PSM Pipeline Page
 * Detailed recruitment pipeline management
 */

import { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  User,
  GripVertical,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  department: string;
  services: string[];
  lastContact: string;
  score: number;
  notes: string;
  nextAction: string;
  nextActionDate: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  leads: Lead[];
}

const initialStages: Stage[] = [
  {
    id: 'prospecting',
    name: 'Prospecting',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    leads: [
      {
        id: '1',
        companyName: 'Clim Services Marseille',
        contactName: 'Sophie Roux',
        phone: '+33 6 45 67 89 01',
        email: 's.roux@clim-services.fr',
        department: '13 - Bouches-du-Rhône',
        services: ['Climatisation', 'Chauffage'],
        lastContact: '5 days ago',
        score: 45,
        notes: 'Found via LinkedIn. Medium-sized company.',
        nextAction: 'Initial call',
        nextActionDate: 'Today',
      },
      {
        id: '2',
        companyName: 'Toiture Martin',
        contactName: 'Philippe Martin',
        phone: '+33 6 56 78 90 12',
        email: 'p.martin@toiture-martin.fr',
        department: '31 - Haute-Garonne',
        services: ['Couverture', 'Charpente'],
        lastContact: '1 week ago',
        score: 38,
        notes: 'Referral from existing provider.',
        nextAction: 'Send intro email',
        nextActionDate: 'Tomorrow',
      },
    ],
  },
  {
    id: 'contacted',
    name: 'Contacted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    leads: [
      {
        id: '3',
        companyName: 'Électricité Verte',
        contactName: 'Marie Dubois',
        phone: '+33 6 23 45 67 89',
        email: 'm.dubois@elec-verte.fr',
        department: '75 - Paris',
        services: ['Électricité', 'Domotique'],
        lastContact: '1 day ago',
        score: 72,
        notes: 'Interested but concerns about volume commitment.',
        nextAction: 'Follow-up call',
        nextActionDate: 'Today',
      },
    ],
  },
  {
    id: 'meeting',
    name: 'Meeting',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    leads: [
      {
        id: '4',
        companyName: 'Plomberie Express Lyon',
        contactName: 'Pierre Martin',
        phone: '+33 6 12 34 56 78',
        email: 'p.martin@plomberie-express.fr',
        department: '69 - Rhône',
        services: ['Plomberie', 'Chauffage'],
        lastContact: '2 hours ago',
        score: 85,
        notes: 'Meeting scheduled for site visit.',
        nextAction: 'Prepare contract draft',
        nextActionDate: 'Nov 30',
      },
    ],
  },
  {
    id: 'negotiation',
    name: 'Negotiation',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    leads: [
      {
        id: '5',
        companyName: 'Isolation Pro 33',
        contactName: 'Jean-Luc Bernard',
        phone: '+33 6 34 56 78 90',
        email: 'jl.bernard@iso-pro.fr',
        department: '33 - Gironde',
        services: ['Isolation', 'Menuiserie'],
        lastContact: '3 hours ago',
        score: 92,
        notes: 'Negotiating commission rates. Close to signing.',
        nextAction: 'Send final proposal',
        nextActionDate: 'Today',
      },
    ],
  },
  {
    id: 'won',
    name: 'Onboarding',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    leads: [
      {
        id: '6',
        companyName: 'Chauffage Plus',
        contactName: 'Marc Dubois',
        phone: '+33 6 67 89 01 23',
        email: 'm.dubois@chauffage-plus.fr',
        department: '44 - Loire-Atlantique',
        services: ['Chauffage', 'Pompe à chaleur'],
        lastContact: '1 day ago',
        score: 100,
        notes: 'Contract signed. Starting onboarding process.',
        nextAction: 'Complete documentation',
        nextActionDate: 'Dec 2',
      },
    ],
  },
];

function LeadCard({ lead }: Readonly<{ lead: Lead }>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{lead.companyName}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <User className="w-3 h-3" />
                {lead.contactName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-medium text-gray-700">{lead.score}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          {lead.department}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {lead.services.map(service => (
            <span key={service} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              {service}
            </span>
          ))}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 hover:text-gray-700"
        >
          {expanded ? 'Less' : 'More'}
          <ChevronRight className={clsx('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Last Contact</div>
              <div className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3 text-gray-400" />
                {lead.lastContact}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Next Action</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-900">{lead.nextAction}</span>
                <span className={clsx(
                  'px-1.5 py-0.5 rounded text-xs',
                  lead.nextActionDate === 'Today' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                )}>
                  {lead.nextActionDate}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Notes</div>
              <p className="text-xs text-gray-700">{lead.notes}</p>
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:${lead.phone}`}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
              >
                <Phone className="w-3 h-3" />
                Call
              </a>
              <a
                href={`mailto:${lead.email}`}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
              >
                <Mail className="w-3 h-3" />
                Email
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PSMPipelinePage() {
  const [stages, setStages] = useState(initialStages);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ 
    companyName: '', 
    contactName: '', 
    phone: '', 
    email: '', 
    department: '', 
    services: ''
  });

  const totalLeads = stages.reduce((sum, stage) => sum + stage.leads.length, 0);
  const todayActions = stages.reduce((sum, stage) => 
    sum + stage.leads.filter(l => l.nextActionDate === 'Today').length, 0
  );

  const handleExport = () => {
    const allLeads = stages.flatMap(stage => 
      stage.leads.map(lead => ({ stage: stage.name, ...lead }))
    );
    const csvContent = [
      ['Stage', 'Company', 'Contact', 'Phone', 'Email', 'Department', 'Services', 'Score'].join(','),
      ...allLeads.map(l => [l.stage, l.companyName, l.contactName, l.phone, l.email, l.department, l.services.join(';'), l.score].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline-export.csv';
    a.click();
    globalThis.URL.revokeObjectURL(url);
    toast.success('Pipeline exported to CSV');
  };

  const handleAddLead = () => {
    if (!newLead.companyName || !newLead.contactName || !newLead.phone) {
      toast.error('Please fill in required fields');
      return;
    }
    const lead: Lead = {
      id: String(Date.now()),
      companyName: newLead.companyName,
      contactName: newLead.contactName,
      phone: newLead.phone,
      email: newLead.email,
      department: newLead.department || 'Unknown',
      services: newLead.services.split(',').map(s => s.trim()).filter(Boolean),
      lastContact: 'Never',
      score: 20,
      notes: '',
      nextAction: 'Initial contact',
      nextActionDate: 'Today',
    };
    setStages(prev => prev.map(stage => 
      stage.id === 'prospecting' 
        ? { ...stage, leads: [...stage.leads, lead] }
        : stage
    ));
    setNewLead({ companyName: '', contactName: '', phone: '', email: '', department: '', services: '' });
    setShowAddModal(false);
    toast.success(`Lead "${lead.companyName}" added to pipeline`);
  };

  const handleCallLead = (lead: Lead) => {
    globalThis.location.href = `tel:${lead.phone}`;
    toast.success(`Calling ${lead.contactName}...`);
  };

  const handleLogActivity = (lead: Lead) => {
    toast.success(`Activity logged for ${lead.companyName}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-gray-500">Total in Pipeline</div>
              <div className="text-2xl font-bold text-gray-900">{totalLeads}</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <div className="text-sm text-gray-500">Actions Today</div>
              <div className="text-2xl font-bold text-red-600">{todayActions}</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <div className="text-sm text-gray-500">Won This Month</div>
              <div className="text-2xl font-bold text-green-600">5</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage.id} className="flex-shrink-0 w-72">
            <div className={clsx('rounded-lg', stage.bgColor)}>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={clsx('font-semibold', stage.color)}>{stage.name}</span>
                  <span className="px-2 py-0.5 bg-white/50 rounded-full text-xs font-medium">
                    {stage.leads.length}
                  </span>
                </div>
                {stage.id === 'won' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {stage.id === 'negotiation' && <AlertCircle className="w-4 h-4 text-orange-600" />}
              </div>

              <div className="p-2 space-y-2 min-h-[200px]">
                {stage.leads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}

                {stage.leads.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-400">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Lost Column */}
        <div className="flex-shrink-0 w-72">
          <div className="rounded-lg bg-red-50">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-700">Lost</span>
                <span className="px-2 py-0.5 bg-white/50 rounded-full text-xs font-medium">2</span>
              </div>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="p-2 space-y-2 min-h-[200px]">
              <div className="bg-white/70 rounded-lg p-3 opacity-60">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Dépannage 24h</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Lost: Volume too low</div>
              </div>
              <div className="bg-white/70 rounded-lg p-3 opacity-60">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Peinture Pro</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Lost: Competitor signed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          Today's Actions
        </h3>
        <div className="space-y-3">
          {stages.flatMap(stage => 
            stage.leads
              .filter(l => l.nextActionDate === 'Today')
              .map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{lead.companyName}</div>
                      <div className="text-sm text-gray-600">{lead.nextAction}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCallLead(lead)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      Call
                    </button>
                    <button 
                      onClick={() => handleLogActivity(lead)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Log
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Lead</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="leadCompany" className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  id="leadCompany"
                  type="text"
                  value={newLead.companyName}
                  onChange={(e) => setNewLead(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Électricité Plus"
                />
              </div>
              <div>
                <label htmlFor="leadContact" className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                <input
                  id="leadContact"
                  type="text"
                  value={newLead.contactName}
                  onChange={(e) => setNewLead(prev => ({ ...prev, contactName: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="leadPhone" className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    id="leadPhone"
                    type="tel"
                    value={newLead.phone}
                    onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                <div>
                  <label htmlFor="leadEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    id="leadEmail"
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="contact@company.fr"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="leadDepartment" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  id="leadDepartment"
                  type="text"
                  value={newLead.department}
                  onChange={(e) => setNewLead(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="69 - Rhône"
                />
              </div>
              <div>
                <label htmlFor="leadServices" className="block text-sm font-medium text-gray-700 mb-1">Services (comma-separated)</label>
                <input
                  id="leadServices"
                  type="text"
                  value={newLead.services}
                  onChange={(e) => setNewLead(prev => ({ ...prev, services: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Électricité, Plomberie"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setNewLead({ companyName: '', contactName: '', phone: '', email: '', department: '', services: '' });
                  setShowAddModal(false);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLead}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
