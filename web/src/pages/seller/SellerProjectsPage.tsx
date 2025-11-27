/**
 * Seller Projects Page
 * 
 * Manage construction/renovation projects requiring service orders.
 * Track project status, linked service orders, and timelines.
 */

import { useState } from 'react';
import { 
  Search, Plus, Building, MapPin, Calendar, 
  Clock, CheckCircle, Users, FileText,
  ChevronRight, MoreVertical
} from 'lucide-react';
import clsx from 'clsx';

interface Project {
  id: string;
  name: string;
  reference: string;
  client: string;
  address: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  startDate: string;
  endDate?: string;
  serviceOrdersCount: number;
  completedOrders: number;
  budget: number;
  spent: number;
  priority: 'high' | 'medium' | 'low';
}

const mockProjects: Project[] = [
  { id: '1', name: 'Rénovation Immeuble Haussmann', reference: 'PRJ-2025-001', client: 'SCI Immobilière Paris', address: '45 Boulevard Haussmann, 75009 Paris', status: 'active', startDate: '2025-01-15', endDate: '2025-06-30', serviceOrdersCount: 24, completedOrders: 18, budget: 125000, spent: 89500, priority: 'high' },
  { id: '2', name: 'Construction Résidence Moderne', reference: 'PRJ-2025-002', client: 'Promotion Habitat', address: '12 Rue de la République, 69001 Lyon', status: 'active', startDate: '2025-02-01', endDate: '2025-12-15', serviceOrdersCount: 56, completedOrders: 12, budget: 450000, spent: 125000, priority: 'high' },
  { id: '3', name: 'Bureaux Centre-Ville', reference: 'PRJ-2025-003', client: 'Entreprise XYZ', address: '8 Place Bellecour, 69002 Lyon', status: 'planning', startDate: '2025-04-01', serviceOrdersCount: 0, completedOrders: 0, budget: 85000, spent: 0, priority: 'medium' },
  { id: '4', name: 'Rénovation Appartement Luxe', reference: 'PRJ-2024-018', client: 'M. et Mme Dupont', address: '23 Avenue Foch, 75016 Paris', status: 'completed', startDate: '2024-09-01', endDate: '2024-12-15', serviceOrdersCount: 12, completedOrders: 12, budget: 65000, spent: 62400, priority: 'low' },
  { id: '5', name: 'Installation Électrique Usine', reference: 'PRJ-2025-004', client: 'Industrie SA', address: 'Zone Industrielle, 93000 Bobigny', status: 'on_hold', startDate: '2025-03-01', serviceOrdersCount: 8, completedOrders: 3, budget: 180000, spent: 45000, priority: 'medium' },
];

const getStatusColor = (status: Project['status']): string => {
  switch (status) {
    case 'planning': return 'bg-blue-100 text-blue-700';
    case 'active': return 'bg-green-100 text-green-700';
    case 'on_hold': return 'bg-amber-100 text-amber-700';
    case 'completed': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getPriorityColor = (priority: Project['priority']): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'low': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export default function SellerProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Project['status']>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    active: mockProjects.filter(p => p.status === 'active').length,
    planning: mockProjects.filter(p => p.status === 'planning').length,
    totalBudget: mockProjects.reduce((sum, p) => sum + p.budget, 0),
    totalSpent: mockProjects.reduce((sum, p) => sum + p.spent, 0),
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage construction and renovation projects</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-gray-600">Active Projects</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.planning}</p>
              <p className="text-sm text-gray-600">In Planning</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">€{(stats.totalBudget / 1000).toFixed(0)}K</p>
              <p className="text-sm text-gray-600">Total Budget</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{((stats.totalSpent / stats.totalBudget) * 100).toFixed(0)}%</p>
              <p className="text-sm text-gray-600">Budget Used</p>
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
              placeholder="Search projects..."
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
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={clsx(
                'px-3 py-2',
                view === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={clsx(
                'px-3 py-2 border-l border-gray-300',
                view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'
              )}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <div key={project.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{project.name}</p>
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium capitalize',
                          getStatusColor(project.status)
                        )}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{project.reference} • {project.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-medium">{project.completedOrders}/{project.serviceOrdersCount}</p>
                      <p className="text-sm text-gray-500">Orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{project.spent.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">of €{project.budget.toLocaleString()}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProjectCardProps {
  readonly project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  const progressPercent = (project.completedOrders / Math.max(project.serviceOrdersCount, 1)) * 100;
  const budgetPercent = (project.spent / project.budget) * 100;

  return (
    <div className="card hover:shadow-lg transition-shadow cursor-pointer">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium capitalize',
                getStatusColor(project.status)
              )}>
                {project.status.replace('_', ' ')}
              </span>
              <span className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium',
                getPriorityColor(project.priority)
              )}>
                {project.priority}
              </span>
            </div>
            <h3 className="font-semibold text-lg mt-2">{project.name}</h3>
            <p className="text-sm text-gray-500">{project.reference}</p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{project.client}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{project.address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{project.startDate} {project.endDate ? `→ ${project.endDate}` : ''}</span>
        </div>

        {/* Service Orders Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Service Orders</span>
            <span className="font-medium">{project.completedOrders}/{project.serviceOrdersCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Budget Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Budget</span>
            <span className="font-medium">€{project.spent.toLocaleString()} / €{project.budget.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={clsx(
                'h-2 rounded-full',
                budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 75 ? 'bg-amber-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
