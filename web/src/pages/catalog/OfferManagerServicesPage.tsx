/**
 * Offer Manager Services Page
 * Manage service catalog
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  Euro,
  Clock,
  Tag,
  ChevronDown,
  Settings,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  duration: string;
  status: 'active' | 'draft' | 'archived';
  checklistItems: number;
  variations: number;
  lastUpdated: string;
}

const mockServices: Service[] = [
  {
    id: '1',
    name: 'Electrical Panel Upgrade',
    category: 'Électricité',
    description: 'Complete replacement of electrical panel to NFC 15-100 standards',
    basePrice: 1250,
    duration: '4-6 hours',
    status: 'active',
    checklistItems: 15,
    variations: 3,
    lastUpdated: '2 days ago',
  },
  {
    id: '2',
    name: 'Heat Pump Installation',
    category: 'Chauffage',
    description: 'Installation of air-to-air or air-to-water heat pump',
    basePrice: 8500,
    duration: '1-2 days',
    status: 'active',
    checklistItems: 22,
    variations: 5,
    lastUpdated: '1 week ago',
  },
  {
    id: '3',
    name: 'Roof Insulation',
    category: 'Isolation',
    description: 'Attic and roof insulation with mineral wool or spray foam',
    basePrice: 3200,
    duration: '1 day',
    status: 'active',
    checklistItems: 12,
    variations: 4,
    lastUpdated: '3 days ago',
  },
  {
    id: '4',
    name: 'Solar Panel Installation',
    category: 'Énergie solaire',
    description: 'Photovoltaic panel installation with grid connection',
    basePrice: 12000,
    duration: '2-3 days',
    status: 'draft',
    checklistItems: 8,
    variations: 2,
    lastUpdated: '5 hours ago',
  },
  {
    id: '5',
    name: 'Plumbing Overhaul',
    category: 'Plomberie',
    description: 'Complete replacement of pipes and fixtures',
    basePrice: 4500,
    duration: '2 days',
    status: 'active',
    checklistItems: 18,
    variations: 3,
    lastUpdated: '1 month ago',
  },
  {
    id: '6',
    name: 'Gas Boiler Replacement',
    category: 'Chauffage',
    description: 'Replacement of old gas boiler with high-efficiency model',
    basePrice: 3800,
    duration: '1 day',
    status: 'archived',
    checklistItems: 14,
    variations: 2,
    lastUpdated: '2 months ago',
  },
];

const categories = ['All', 'Électricité', 'Chauffage', 'Isolation', 'Plomberie', 'Énergie solaire'];

type StatusFilter = 'all' | 'active' | 'draft' | 'archived';

const initialServices = mockServices;

export default function OfferManagerServicesPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({ name: '', category: 'Électricité', description: '', basePrice: '' });

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || service.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: services.length,
    active: services.filter(s => s.status === 'active').length,
    draft: services.filter(s => s.status === 'draft').length,
    archived: services.filter(s => s.status === 'archived').length,
  };

  const handleAddService = () => {
    if (!newService.name || !newService.description || !newService.basePrice) {
      toast.error('Please fill in all required fields');
      return;
    }
    const service: Service = {
      id: String(services.length + 1),
      name: newService.name,
      category: newService.category,
      description: newService.description,
      basePrice: Number.parseInt(newService.basePrice),
      duration: '1 day',
      status: 'draft',
      checklistItems: 0,
      variations: 0,
      lastUpdated: 'Just now',
    };
    setServices(prev => [...prev, service]);
    setNewService({ name: '', category: 'Électricité', description: '', basePrice: '' });
    setShowAddModal(false);
    toast.success(`Service "${service.name}" created successfully`);
  };

  const handleViewService = (service: Service) => {
    navigate(`/catalog/services/${service.id}`);
    setShowActions(null);
  };

  const handleEditService = (service: Service) => {
    navigate(`/catalog/services/${service.id}/edit`);
    setShowActions(null);
  };

  const handleDuplicateService = (service: Service) => {
    const duplicate: Service = {
      ...service,
      id: String(services.length + 1),
      name: `${service.name} (Copy)`,
      status: 'draft',
      lastUpdated: 'Just now',
    };
    setServices(prev => [...prev, duplicate]);
    toast.success(`Service duplicated successfully`);
    setShowActions(null);
  };

  const handleDeleteService = (service: Service) => {
    if (confirm(`Are you sure you want to delete "${service.name}"?`)) {
      setServices(prev => prev.filter(s => s.id !== service.id));
      toast.success('Service deleted');
    }
    setShowActions(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Services</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.draft}</div>
              <div className="text-sm text-gray-500">Drafts</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.archived}</div>
              <div className="text-sm text-gray-500">Archived</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['all', 'active', 'draft', 'archived'] as StatusFilter[]).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={clsx(
                    'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                    statusFilter === status
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map(service => (
          <div
            key={service.id}
            className={clsx(
              'bg-white rounded-xl shadow-sm border overflow-hidden',
              service.status === 'archived' && 'opacity-60'
            )}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    service.status === 'active' && 'bg-green-100 text-green-700',
                    service.status === 'draft' && 'bg-yellow-100 text-yellow-700',
                    service.status === 'archived' && 'bg-gray-100 text-gray-600',
                  )}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowActions(showActions === service.id ? null : service.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {showActions === service.id && (
                    <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                      <button 
                        onClick={() => handleViewService(service)}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button 
                        onClick={() => handleEditService(service)}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDuplicateService(service)}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      <hr className="my-1" />
                      <button 
                        onClick={() => handleDeleteService(service)}
                        className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mt-3">{service.name}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>

              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {service.category}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Euro className="w-3 h-3" />
                    Base Price
                  </div>
                  <div className="font-semibold text-gray-900">€{service.basePrice.toLocaleString()}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Clock className="w-3 h-3" />
                    Duration
                  </div>
                  <div className="font-semibold text-gray-900">{service.duration}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {service.checklistItems} items
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {service.variations} variants
                  </span>
                </div>
                <span>{service.lastUpdated}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search or filters
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Add New Service
          </button>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input
                  id="serviceName"
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Electrical Panel Upgrade"
                />
              </div>
              <div>
                <label htmlFor="serviceCategory" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  id="serviceCategory"
                  value={newService.category}
                  onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="serviceDescription"
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Service description..."
                />
              </div>
              <div>
                <label htmlFor="servicePrice" className="block text-sm font-medium text-gray-700 mb-1">Base Price (€)</label>
                <input
                  id="servicePrice"
                  type="number"
                  value={newService.basePrice}
                  onChange={(e) => setNewService(prev => ({ ...prev, basePrice: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="1250"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setNewService({ name: '', category: 'Électricité', description: '', basePrice: '' });
                  setShowAddModal(false);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
