/**
 * Admin Notifications Page
 * Manage notification templates for SMS, Email, Push Notifications, and Chat
 */

import { useState } from 'react';
import {
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  CheckCircle,
  Clock,
  Tag,
  ChevronRight,
  Globe,
  FileText,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

type TemplateType = 'email' | 'sms' | 'push' | 'chat';
type TemplateStatus = 'active' | 'draft' | 'archived';

interface NotificationTemplate {
  id: string;
  name: string;
  type: TemplateType;
  trigger: string;
  subject?: string;
  content: string;
  variables: string[];
  language: string;
  status: TemplateStatus;
  lastUpdated: string;
  usageCount: number;
}

const mockTemplates: NotificationTemplate[] = [
  {
    id: '1',
    name: 'Service Order Confirmation',
    type: 'email',
    trigger: 'order.created',
    subject: 'Your service order #{{orderNumber}} has been confirmed',
    content: 'Dear {{customerName}},\n\nThank you for your order. Your service order #{{orderNumber}} has been confirmed.\n\nService: {{serviceName}}\nScheduled Date: {{scheduledDate}}\nProvider: {{providerName}}\n\nBest regards,\nYellow Grid Team',
    variables: ['customerName', 'orderNumber', 'serviceName', 'scheduledDate', 'providerName'],
    language: 'en',
    status: 'active',
    lastUpdated: '2 days ago',
    usageCount: 1247,
  },
  {
    id: '2',
    name: 'Appointment Reminder',
    type: 'sms',
    trigger: 'appointment.reminder',
    content: 'Reminder: Your {{serviceName}} appointment is tomorrow at {{time}}. Provider: {{providerName}}. Reply HELP for assistance.',
    variables: ['serviceName', 'time', 'providerName'],
    language: 'en',
    status: 'active',
    lastUpdated: '1 week ago',
    usageCount: 3562,
  },
  {
    id: '3',
    name: 'New Job Offer',
    type: 'push',
    trigger: 'offer.new',
    content: 'New job offer: {{serviceName}} in {{postalCode}}. €{{amount}} - Respond within {{expiryHours}}h',
    variables: ['serviceName', 'postalCode', 'amount', 'expiryHours'],
    language: 'en',
    status: 'active',
    lastUpdated: '3 days ago',
    usageCount: 892,
  },
  {
    id: '4',
    name: 'Provider On the Way',
    type: 'sms',
    trigger: 'provider.enroute',
    content: 'Good news! Your provider {{providerName}} is on the way and should arrive in approximately {{eta}} minutes.',
    variables: ['providerName', 'eta'],
    language: 'en',
    status: 'active',
    lastUpdated: '5 days ago',
    usageCount: 2134,
  },
  {
    id: '5',
    name: 'Work Complete - Rate Service',
    type: 'email',
    trigger: 'order.completed',
    subject: 'How was your service experience?',
    content: 'Dear {{customerName}},\n\nYour service for {{serviceName}} has been completed.\n\nWe would love to hear about your experience. Please take a moment to rate our service:\n\n{{ratingLink}}\n\nThank you for choosing Yellow Grid!',
    variables: ['customerName', 'serviceName', 'ratingLink'],
    language: 'en',
    status: 'active',
    lastUpdated: '1 week ago',
    usageCount: 956,
  },
  {
    id: '6',
    name: 'Chat - Greeting',
    type: 'chat',
    trigger: 'chat.greeting',
    content: 'Hello {{customerName}}! Welcome to Yellow Grid support. How can I help you today?',
    variables: ['customerName'],
    language: 'en',
    status: 'active',
    lastUpdated: '2 weeks ago',
    usageCount: 4521,
  },
  {
    id: '7',
    name: 'Chat - Appointment Confirmation',
    type: 'chat',
    trigger: 'chat.appointment_confirmed',
    content: 'Great! I\'ve scheduled your {{serviceName}} appointment for {{date}} at {{time}}. You\'ll receive a confirmation email shortly.',
    variables: ['serviceName', 'date', 'time'],
    language: 'en',
    status: 'active',
    lastUpdated: '1 week ago',
    usageCount: 1876,
  },
  {
    id: '8',
    name: 'Chat - Transfer to Human',
    type: 'chat',
    trigger: 'chat.transfer',
    content: 'I understand this requires more detailed assistance. Let me connect you with one of our customer service specialists. Please hold for a moment.',
    variables: [],
    language: 'en',
    status: 'active',
    lastUpdated: '3 weeks ago',
    usageCount: 342,
  },
  {
    id: '9',
    name: 'Provider Document Expiry',
    type: 'email',
    trigger: 'provider.document_expiry',
    subject: 'Important: Your {{documentType}} expires in {{daysUntilExpiry}} days',
    content: 'Dear {{providerName}},\n\nThis is a reminder that your {{documentType}} will expire on {{expiryDate}}.\n\nPlease upload the renewed document to your provider portal to ensure uninterrupted service.\n\nBest regards,\nYellow Grid Team',
    variables: ['providerName', 'documentType', 'daysUntilExpiry', 'expiryDate'],
    language: 'en',
    status: 'draft',
    lastUpdated: '1 day ago',
    usageCount: 0,
  },
  {
    id: '10',
    name: 'Invoice Ready',
    type: 'push',
    trigger: 'invoice.ready',
    content: 'Invoice #{{invoiceNumber}} for €{{amount}} is ready. Tap to view details.',
    variables: ['invoiceNumber', 'amount'],
    language: 'en',
    status: 'active',
    lastUpdated: '4 days ago',
    usageCount: 678,
  },
];

const typeConfig: Record<TemplateType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  email: { label: 'Email', icon: Mail, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'text-green-700', bgColor: 'bg-green-100' },
  push: { label: 'Push', icon: Smartphone, color: 'text-purple-700', bgColor: 'bg-purple-100' },
  chat: { label: 'Chat', icon: Bell, color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

const statusConfig: Record<TemplateStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' },
  draft: { label: 'Draft', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  archived: { label: 'Archived', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

interface TemplateEditorProps {
  template?: NotificationTemplate;
  onSave: (template: Partial<NotificationTemplate>) => void;
  onCancel: () => void;
}

function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'email' as TemplateType,
    trigger: template?.trigger || '',
    subject: template?.subject || '',
    content: template?.content || '',
    language: template?.language || 'en',
    status: template?.status || 'draft' as TemplateStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {template ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., Order Confirmation"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TemplateType })}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push Notification</option>
                <option value="chat">Chat Response</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
              <input
                type="text"
                value={formData.trigger}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., order.created"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
              </select>
            </div>
          </div>

          {formData.type === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., Your order has been confirmed"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={formData.type === 'email' ? 10 : 4}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
              placeholder="Use {{variableName}} for dynamic content"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Use {'{{variableName}}'} syntax for dynamic variables
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TemplateStatus })}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Available Variables
            </h4>
            <div className="flex flex-wrap gap-2">
              {['customerName', 'orderNumber', 'serviceName', 'providerName', 'scheduledDate', 'amount', 'time', 'date'].map(v => (
                <code key={v} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [templates, setTemplates] = useState(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | undefined>();
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trigger.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: templates.length,
    email: templates.filter(t => t.type === 'email').length,
    sms: templates.filter(t => t.type === 'sms').length,
    push: templates.filter(t => t.type === 'push').length,
    chat: templates.filter(t => t.type === 'chat').length,
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
    setShowActions(null);
  };

  const handleSaveTemplate = (data: Partial<NotificationTemplate>) => {
    if (editingTemplate) {
      // Update existing
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, ...data, lastUpdated: 'Just now' }
          : t
      ));
      toast.success('Template updated successfully');
    } else {
      // Create new
      const newTemplate: NotificationTemplate = {
        id: String(templates.length + 1),
        name: data.name || '',
        type: data.type || 'email',
        trigger: data.trigger || '',
        subject: data.subject,
        content: data.content || '',
        variables: [],
        language: data.language || 'en',
        status: data.status || 'draft',
        lastUpdated: 'Just now',
        usageCount: 0,
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast.success('Template created successfully');
    }
    setShowEditor(false);
    setEditingTemplate(undefined);
  };

  const handleDuplicateTemplate = (template: NotificationTemplate) => {
    const duplicate: NotificationTemplate = {
      ...template,
      id: String(templates.length + 1),
      name: `${template.name} (Copy)`,
      status: 'draft',
      lastUpdated: 'Just now',
      usageCount: 0,
    };
    setTemplates(prev => [...prev, duplicate]);
    toast.success('Template duplicated');
    setShowActions(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    }
    setShowActions(null);
  };

  const handleToggleStatus = (template: NotificationTemplate) => {
    const newStatus = template.status === 'active' ? 'archived' : 'active';
    setTemplates(prev => prev.map(t => 
      t.id === template.id 
        ? { ...t, status: newStatus, lastUpdated: 'Just now' }
        : t
    ));
    toast.success(`Template ${newStatus === 'active' ? 'activated' : 'archived'}`);
    setShowActions(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Templates</h1>
          <p className="text-gray-500">Manage SMS, Email, Push, and Chat notification templates</p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </div>
        {(['email', 'sms', 'push', 'chat'] as TemplateType[]).map(type => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', config.bgColor)}>
                  <Icon className={clsx('w-5 h-5', config.color)} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats[type]}</div>
                  <div className="text-sm text-gray-500">{config.label}</div>
                </div>
              </div>
            </div>
          );
        })}
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
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TemplateType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Types</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
              <option value="chat">Chat</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TemplateStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTemplates.map(template => {
            const typeConf = typeConfig[template.type];
            const statusConf = statusConfig[template.status];
            const TypeIcon = typeConf.icon;
            const isExpanded = expandedTemplate === template.id;

            return (
              <div key={template.id} className="hover:bg-gray-50 transition-colors">
                <div 
                  className="px-5 py-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', typeConf.bgColor)}>
                      <TypeIcon className={clsx('w-5 h-5', typeConf.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', statusConf.bgColor, statusConf.color)}>
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          {template.trigger}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" />
                          {template.language.toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {template.lastUpdated}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{template.usageCount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">times used</div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActions(showActions === template.id ? null : template.id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      {showActions === template.id && (
                        <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTemplate(template);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(template);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            {template.status === 'active' ? (
                              <>
                                <Eye className="w-4 h-4" />
                                Archive
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <ChevronRight className={clsx(
                      'w-5 h-5 text-gray-400 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                    {template.subject && (
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</label>
                        <p className="text-sm text-gray-900 mt-1">{template.subject}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Content</label>
                      <pre className="mt-1 p-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {template.content}
                      </pre>
                    </div>
                    {template.variables.length > 0 && (
                      <div className="mt-3">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Variables</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {template.variables.map(v => (
                            <code key={v} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {`{{${v}}}`}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="px-5 py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowEditor(false);
            setEditingTemplate(undefined);
          }}
        />
      )}
    </div>
  );
}
