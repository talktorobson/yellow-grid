/**
 * Catalog Service Detail Page
 * View and edit service details, pricing, checklists
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Save,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Euro,
  Clock,
  CheckCircle,
  Plus,
  GripVertical,
  FileText,
  BarChart3,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  order: number;
}

interface PriceVariation {
  id: string;
  name: string;
  description: string;
  modifier: 'fixed' | 'percentage';
  value: number;
  active: boolean;
}

// Mock service data
const mockService = {
  id: '1',
  code: 'SRV-ELEC-001',
  name: 'Electrical Panel Upgrade',
  category: 'Électricité',
  subcategory: 'Tableau électrique',
  description: 'Complete replacement of electrical panel to NFC 15-100 standards. Includes circuit breakers, differential protection, and labeling.',
  longDescription: 'This service covers the full replacement of an outdated electrical panel with a modern, compliant unit meeting NFC 15-100 standards. The work includes:\n\n- Removal of old panel\n- Installation of new DRIVIA or equivalent panel\n- Installation of main circuit breaker\n- Installation of differential protection (30mA)\n- Circuit identification and labeling\n- Testing and certification\n- Customer walkthrough',
  basePrice: 1250,
  currency: 'EUR',
  duration: '4-6 hours',
  minDuration: 4,
  maxDuration: 6,
  status: 'active' as const,
  requiredCertifications: ['CONSUEL', 'Qualifelec'],
  requiredEquipment: ['Multimeter', 'Panel mounting kit', 'Cable crimping tools'],
  createdAt: '2024-01-15',
  updatedAt: '2025-01-11',
  createdBy: 'Admin User',
  usageCount: 156,
  avgRating: 4.7,
  completionRate: 94,
};

const mockChecklist: ChecklistItem[] = [
  { id: '1', text: 'Vérifier la coupure générale', required: true, order: 1 },
  { id: '2', text: 'Contrôler l\'état des conducteurs existants', required: true, order: 2 },
  { id: '3', text: 'Installer le nouveau tableau', required: true, order: 3 },
  { id: '4', text: 'Raccorder tous les circuits', required: true, order: 4 },
  { id: '5', text: 'Installer les protections différentielles', required: true, order: 5 },
  { id: '6', text: 'Tester chaque circuit individuellement', required: true, order: 6 },
  { id: '7', text: 'Vérifier la continuité des terres', required: true, order: 7 },
  { id: '8', text: 'Étiqueter tous les disjoncteurs', required: true, order: 8 },
  { id: '9', text: 'Prendre photos avant/après', required: false, order: 9 },
  { id: '10', text: 'Faire signer le PV de réception', required: true, order: 10 },
];

const mockPriceVariations: PriceVariation[] = [
  { id: '1', name: 'Tableau < 6 modules', description: 'Petit tableau résidentiel', modifier: 'fixed', value: -200, active: true },
  { id: '2', name: 'Tableau > 24 modules', description: 'Grand tableau avec nombreux circuits', modifier: 'fixed', value: 450, active: true },
  { id: '3', name: 'Urgence (< 48h)', description: 'Intervention urgente', modifier: 'percentage', value: 25, active: true },
  { id: '4', name: 'Week-end', description: 'Intervention samedi ou dimanche', modifier: 'percentage', value: 50, active: false },
];

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-yellow-100 text-yellow-800';
    case 'archived':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Actif',
    draft: 'Brouillon',
    archived: 'Archivé',
  };
  return labels[status] || status;
}

function formatVariationValue(
  modifier: 'fixed' | 'percentage',
  value: number,
  formatCurrency: (n: number) => string
): string {
  const prefix = value > 0 ? '+' : '';
  if (modifier === 'fixed') {
    return `${prefix}${formatCurrency(value)}`;
  }
  return `${prefix}${value}%`;
}

function getRankBadgeColor(index: number): string {
  if (index === 0) return 'bg-yellow-100 text-yellow-700';
  if (index === 1) return 'bg-gray-200 text-gray-600';
  return 'bg-orange-100 text-orange-700';
}

export default function CatalogServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'pricing' | 'stats'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'requirements']));

  // Use id to fetch service in real app
  const service = { ...mockService, id: id || mockService.id };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const tabs = [
    { id: 'details' as const, label: 'Détails', icon: FileText },
    { id: 'checklist' as const, label: 'Checklist', icon: CheckCircle },
    { id: 'pricing' as const, label: 'Tarification', icon: Euro },
    { id: 'stats' as const, label: 'Statistiques', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/catalog/services')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
              <span className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium',
                getStatusColor(service.status)
              )}>
                {getStatusLabel(service.status)}
              </span>
            </div>
            <p className="text-sm text-gray-500">{service.code} • {service.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {service.status === 'active' ? (
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Désactiver">
              <EyeOff className="h-5 w-5 text-gray-600" />
            </button>
          ) : (
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Activer">
              <Eye className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Dupliquer">
            <Copy className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
            <Trash2 className="h-5 w-5 text-red-600" />
          </button>
          
          {isEditing ? (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Modifier
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Euro className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Prix de base</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(service.basePrice)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Durée</p>
              <p className="text-xl font-bold text-gray-900">{service.duration}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Utilisations</p>
              <p className="text-xl font-bold text-gray-900">{service.usageCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Note moyenne</p>
              <p className="text-xl font-bold text-gray-900">{service.avgRating}/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200">
            <button
              onClick={() => toggleSection('basic')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900">Informations de base</h3>
              {expandedSections.has('basic') ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('basic') && (
              <div className="p-4 pt-0 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">Nom du service</label>
                    <input
                      id="serviceName"
                      type="text"
                      value={service.name}
                      readOnly={!isEditing}
                      className={clsx(
                        'w-full px-4 py-2 border border-gray-300 rounded-lg',
                        !isEditing && 'bg-gray-50'
                      )}
                    />
                  </div>
                  <div>
                    <label htmlFor="serviceCode" className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input
                      id="serviceCode"
                      type="text"
                      value={service.code}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="serviceCategory" className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select
                      id="serviceCategory"
                      value={service.category}
                      disabled={!isEditing}
                      className={clsx(
                        'w-full px-4 py-2 border border-gray-300 rounded-lg',
                        !isEditing && 'bg-gray-50'
                      )}
                    >
                      <option>Électricité</option>
                      <option>Chauffage</option>
                      <option>Plomberie</option>
                      <option>Isolation</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="serviceSubcategory" className="block text-sm font-medium text-gray-700 mb-1">Sous-catégorie</label>
                    <input
                      id="serviceSubcategory"
                      type="text"
                      value={service.subcategory}
                      readOnly={!isEditing}
                      className={clsx(
                        'w-full px-4 py-2 border border-gray-300 rounded-lg',
                        !isEditing && 'bg-gray-50'
                      )}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
                  <textarea
                    id="serviceDescription"
                    value={service.description}
                    readOnly={!isEditing}
                    rows={2}
                    className={clsx(
                      'w-full px-4 py-2 border border-gray-300 rounded-lg',
                      !isEditing && 'bg-gray-50'
                    )}
                  />
                </div>

                <div className="mt-6">
                  <label htmlFor="serviceLongDescription" className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
                  <textarea
                    id="serviceLongDescription"
                    value={service.longDescription}
                    readOnly={!isEditing}
                    rows={6}
                    className={clsx(
                      'w-full px-4 py-2 border border-gray-300 rounded-lg',
                      !isEditing && 'bg-gray-50'
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-xl border border-gray-200">
            <button
              onClick={() => toggleSection('requirements')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900">Exigences</h3>
              {expandedSections.has('requirements') ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('requirements') && (
              <div className="p-4 pt-0 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">Certifications requises</p>
                    <div className="flex flex-wrap gap-2">
                      {service.requiredCertifications.map((cert) => (
                        <span key={cert} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {cert}
                        </span>
                      ))}
                      {isEditing && (
                        <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-500 hover:border-indigo-500 hover:text-indigo-600">
                          + Ajouter
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">Équipement requis</p>
                    <div className="flex flex-wrap gap-2">
                      {service.requiredEquipment.map((equip) => (
                        <span key={equip} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          {equip}
                        </span>
                      ))}
                      {isEditing && (
                        <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-500 hover:border-indigo-500 hover:text-indigo-600">
                          + Ajouter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex flex-wrap gap-6 text-sm text-gray-500">
              <span>Créé le {formatDate(service.createdAt)} par {service.createdBy}</span>
              <span>•</span>
              <span>Mis à jour le {formatDate(service.updatedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Checklist d&apos;intervention</h3>
              <p className="text-sm text-gray-500">{mockChecklist.length} éléments • {mockChecklist.filter(i => i.required).length} obligatoires</p>
            </div>
            {isEditing && (
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un élément
              </button>
            )}
          </div>

          <div className="space-y-2">
            {mockChecklist.map((item) => (
              <div
                key={item.id}
                className={clsx(
                  'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                  isEditing ? 'bg-white border-gray-200 hover:border-indigo-300' : 'bg-gray-50 border-transparent'
                )}
              >
                {isEditing && (
                  <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                )}
                <div className="flex-1">
                  <p className="text-gray-900">{item.text}</p>
                </div>
                <div className="flex items-center gap-3">
                  {item.required ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Obligatoire</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Optionnel</span>
                  )}
                  {isEditing && (
                    <button className="p-1 hover:bg-red-50 rounded text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Base Pricing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Prix de base</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-1">Prix HT</label>
                <div className="relative">
                  <input
                    id="basePrice"
                    type="number"
                    value={service.basePrice}
                    readOnly={!isEditing}
                    className={clsx(
                      'w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg',
                      !isEditing && 'bg-gray-50'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                </div>
              </div>
              <div>
                <label htmlFor="minDuration" className="block text-sm font-medium text-gray-700 mb-1">Durée min (heures)</label>
                <input
                  id="minDuration"
                  type="number"
                  value={service.minDuration}
                  readOnly={!isEditing}
                  className={clsx(
                    'w-full px-4 py-2 border border-gray-300 rounded-lg',
                    !isEditing && 'bg-gray-50'
                  )}
                />
              </div>
              <div>
                <label htmlFor="maxDuration" className="block text-sm font-medium text-gray-700 mb-1">Durée max (heures)</label>
                <input
                  id="maxDuration"
                  type="number"
                  value={service.maxDuration}
                  readOnly={!isEditing}
                  className={clsx(
                    'w-full px-4 py-2 border border-gray-300 rounded-lg',
                    !isEditing && 'bg-gray-50'
                  )}
                />
              </div>
            </div>
          </div>

          {/* Price Variations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Variations de prix</h3>
                <p className="text-sm text-gray-500">Modificateurs selon les conditions</p>
              </div>
              {isEditing && (
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter une variation
                </button>
              )}
            </div>

            <div className="space-y-4">
              {mockPriceVariations.map((variation) => (
                <div
                  key={variation.id}
                  className={clsx(
                    'flex items-center justify-between p-4 rounded-lg border',
                    variation.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      'w-3 h-3 rounded-full',
                      variation.active ? 'bg-green-500' : 'bg-gray-300'
                    )} />
                    <div>
                      <p className={clsx(
                        'font-medium',
                        variation.active ? 'text-gray-900' : 'text-gray-500'
                      )}>{variation.name}</p>
                      <p className="text-sm text-gray-500">{variation.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={clsx(
                      'px-3 py-1 rounded-lg font-medium',
                      variation.value > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    )}>
                      {formatVariationValue(variation.modifier, variation.value, formatCurrency)}
                    </span>
                    {isEditing && (
                      <>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Edit2 className="h-4 w-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-red-50 rounded">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Usage Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Statistiques d&apos;utilisation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{service.usageCount}</p>
                <p className="text-sm text-gray-500">Commandes totales</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{service.completionRate}%</p>
                <p className="text-sm text-gray-500">Taux de complétion</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{service.avgRating}</p>
                <p className="text-sm text-gray-500">Note moyenne</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-indigo-600">{formatCurrency(service.basePrice * service.usageCount)}</p>
                <p className="text-sm text-gray-500">CA généré</p>
              </div>
            </div>
          </div>

          {/* Monthly Trend Placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution mensuelle</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Graphique des commandes mensuelles</p>
                <p className="text-sm">(Données visualisées ici)</p>
              </div>
            </div>
          </div>

          {/* Top Providers */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meilleurs prestataires pour ce service</h3>
            <div className="space-y-3">
              {['ElectroPro Services', 'Install&apos;Expert', 'Qualité Électrique'].map((provider, index) => (
                <div key={provider} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      getRankBadgeColor(index)
                    )}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{provider}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{Math.floor(Math.random() * 50 + 20)} interventions</p>
                    <p className="text-sm text-gray-500">{(4.5 + Math.random() * 0.5).toFixed(1)}★</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
