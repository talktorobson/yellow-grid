/**
 * Provider Team Detail Page
 * 
 * Shows detailed information about a work team including members,
 * schedule, current assignments, and performance metrics.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Calendar, MapPin, Phone, Mail, Star, 
  BarChart2, Clock, CheckCircle, AlertTriangle, Edit, Plus
} from 'lucide-react';
import clsx from 'clsx';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  completedJobs: number;
  certifications: string[];
}

interface TeamAssignment {
  id: string;
  jobTitle: string;
  customer: string;
  date: string;
  time: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface TeamData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
  leader: TeamMember;
  members: TeamMember[];
  assignments: TeamAssignment[];
  stats: {
    completedJobs: number;
    avgRating: number;
    onTimeRate: number;
    activeJobs: number;
  };
  zones: string[];
}

// Mock team data
const mockTeam: TeamData = {
  id: '1',
  name: 'Équipe Alpha',
  description: 'Spécialisée dans les installations électriques résidentielles',
  status: 'active',
  createdAt: '2024-01-15',
  leader: {
    id: 'L1',
    name: 'Pierre Martin',
    role: 'Team Lead',
    phone: '+33 6 12 34 56 78',
    email: 'pierre.martin@provider.fr',
    status: 'busy',
    rating: 4.9,
    completedJobs: 245,
    certifications: ['Habilitation BR', 'Habilitation B2V'],
  },
  members: [
    {
      id: 'M1',
      name: 'Jean Dupont',
      role: 'Team Member',
      phone: '+33 6 22 33 44 55',
      email: 'jean.dupont@provider.fr',
      status: 'busy',
      rating: 4.8,
      completedJobs: 180,
      certifications: ['Habilitation BR'],
    },
    {
      id: 'M2',
      name: 'Marie Leblanc',
      role: 'Team Member',
      phone: '+33 6 33 44 55 66',
      email: 'marie.leblanc@provider.fr',
      status: 'available',
      rating: 4.7,
      completedJobs: 156,
      certifications: ['Habilitation B1', 'Habilitation B2'],
    },
  ],
  assignments: [
    { id: 'A1', jobTitle: 'Installation électrique', customer: 'Jean Dupont', date: '2025-11-27', time: '09:00', status: 'in_progress' },
    { id: 'A2', jobTitle: 'Dépannage tableau', customer: 'Marie Martin', date: '2025-11-27', time: '14:00', status: 'scheduled' },
    { id: 'A3', jobTitle: 'Mise aux normes', customer: 'Paul Bernard', date: '2025-11-28', time: '08:30', status: 'scheduled' },
    { id: 'A4', jobTitle: 'Installation prise', customer: 'Sophie Petit', date: '2025-11-26', time: '10:00', status: 'completed' },
  ],
  stats: {
    completedJobs: 423,
    avgRating: 4.8,
    onTimeRate: 96,
    activeJobs: 2,
  },
  zones: ['Paris 15e', 'Paris 16e', 'Boulogne-Billancourt'],
};

const getStatusColor = (status: TeamMember['status']): string => {
  switch (status) {
    case 'available': return 'bg-green-500';
    case 'busy': return 'bg-amber-500';
    case 'offline': return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
};

const getAssignmentStatusColor = (status: TeamAssignment['status']): string => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-700';
    case 'in_progress': return 'bg-amber-100 text-amber-700';
    case 'completed': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getAssignmentBarColor = (status: TeamAssignment['status']): string => {
  switch (status) {
    case 'in_progress': return 'bg-amber-500';
    case 'completed': return 'bg-green-500';
    default: return 'bg-blue-500';
  }
};

export default function ProviderTeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'schedule' | 'settings'>('overview');

  // In real app, fetch team by id from API
  const team = { ...mockTeam, id: id ?? mockTeam.id };

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
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <span className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium',
                team.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              )}>
                {team.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600">{team.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit Team
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.stats.completedJobs}</p>
              <p className="text-sm text-gray-600">Jobs Completed</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.stats.avgRating}</p>
              <p className="text-sm text-gray-600">Avg Rating</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.stats.onTimeRate}%</p>
              <p className="text-sm text-gray-600">On-Time Rate</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.stats.activeJobs}</p>
              <p className="text-sm text-gray-600">Active Jobs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200">
          {(['overview', 'members', 'schedule', 'settings'] as const).map((tab) => (
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
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Team Leader */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Team Leader</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-primary-600" />
                      </div>
                      <div className={clsx(
                        'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white',
                        getStatusColor(team.leader.status)
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{team.leader.name}</p>
                      <p className="text-gray-600">{team.leader.role}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium">{team.leader.rating}</span>
                        <span className="text-sm text-gray-500">({team.leader.completedJobs} jobs)</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <a href={`tel:${team.leader.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                      <Phone className="w-4 h-4" />
                      {team.leader.phone}
                    </a>
                    <a href={`mailto:${team.leader.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                      <Mail className="w-4 h-4" />
                      {team.leader.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Service Zones */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Service Zones</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">Assigned Zones</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.zones.map((zone) => (
                      <span key={zone} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                        {zone}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Upcoming Assignments */}
              <div className="col-span-2">
                <h3 className="font-semibold text-gray-900 mb-4">Upcoming Assignments</h3>
                <div className="space-y-3">
                  {team.assignments.slice(0, 3).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                          <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{assignment.jobTitle}</p>
                          <p className="text-sm text-gray-600">{assignment.customer}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{assignment.date}</p>
                          <p className="text-sm text-gray-500">{assignment.time}</p>
                        </div>
                        <span className={clsx(
                          'px-3 py-1 rounded-full text-xs font-medium',
                          getAssignmentStatusColor(assignment.status)
                        )}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="p-6">
            <div className="space-y-4">
              {/* Leader */}
              <MemberCard member={team.leader} isLeader />
              
              {/* Members */}
              {team.members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="p-6">
            <div className="space-y-4">
              {team.assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      'w-2 h-12 rounded-full',
                      getAssignmentBarColor(assignment.status)
                    )} />
                    <div>
                      <p className="font-medium">{assignment.jobTitle}</p>
                      <p className="text-sm text-gray-600">{assignment.customer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{assignment.date}</p>
                      <p className="text-sm text-gray-500">{assignment.time}</p>
                    </div>
                    <span className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      getAssignmentStatusColor(assignment.status)
                    )}>
                      {assignment.status.replace('_', ' ')}
                    </span>
                    <button className="text-sm text-primary-600 hover:text-primary-700">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-6">
            <div className="max-w-2xl space-y-6">
              <div>
                <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input id="team-name" type="text" defaultValue={team.name} className="input w-full" />
              </div>
              <div>
                <label htmlFor="team-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea id="team-desc" rows={3} defaultValue={team.description} className="input w-full" />
              </div>
              <div>
                <label htmlFor="team-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="team-status" defaultValue={team.status} className="input w-full">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <button className="btn btn-primary">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Member Card Component
interface MemberCardProps {
  readonly member: TeamMember;
  readonly isLeader?: boolean;
}

const getMemberStatusColor = (status: TeamMember['status']): string => {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-700';
    case 'busy': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

function MemberCard({ member, isLeader = false }: MemberCardProps) {
  return (
    <div className={clsx(
      'p-4 border rounded-lg',
      isLeader ? 'border-primary-200 bg-primary-50' : 'border-gray-200'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200">
              <User className="w-6 h-6 text-gray-500" />
            </div>
            <div className={clsx(
              'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
              getStatusColor(member.status)
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{member.name}</p>
              {isLeader && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">Leader</span>
              )}
            </div>
            <p className="text-sm text-gray-600">{member.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm">{member.rating}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-600">{member.completedJobs} jobs</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={clsx(
            'px-2 py-1 rounded text-xs font-medium',
            getMemberStatusColor(member.status)
          )}>
            {member.status}
          </span>
          <div className="flex gap-2">
            <a href={`tel:${member.phone}`} className="p-2 hover:bg-gray-100 rounded-lg" title="Call">
              <Phone className="w-4 h-4 text-gray-500" />
            </a>
            <a href={`mailto:${member.email}`} className="p-2 hover:bg-gray-100 rounded-lg" title="Email">
              <Mail className="w-4 h-4 text-gray-500" />
            </a>
          </div>
        </div>
      </div>
      {member.certifications.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Certifications:</span>
            <div className="flex flex-wrap gap-1">
              {member.certifications.map((cert) => (
                <span key={cert} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                  {cert}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
