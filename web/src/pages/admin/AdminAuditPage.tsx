/**
 * Admin Audit Page
 * 
 * View audit trail and system activity logs.
 */

import { useState } from 'react';
import { 
  Search, Download, User, Shield, 
  FileText, Settings, AlertTriangle, CheckCircle, Clock,
  Eye, ChevronDown, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  category: 'auth' | 'user' | 'service_order' | 'provider' | 'system' | 'security';
  target: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'failure' | 'warning';
}

const mockEvents: AuditEvent[] = [
  { id: '1', timestamp: '2025-11-27 10:45:23', user: 'admin@yellowgrid.com', userRole: 'Admin', action: 'User Login', category: 'auth', target: 'System', details: 'Successful login from Chrome/MacOS', ipAddress: '192.168.1.100', status: 'success' },
  { id: '2', timestamp: '2025-11-27 10:30:15', user: 'marie.operator@yellowgrid.com', userRole: 'Operator', action: 'Service Order Created', category: 'service_order', target: 'SO-2025-001234', details: 'Created new service order for Jean Dupont', ipAddress: '192.168.1.101', status: 'success' },
  { id: '3', timestamp: '2025-11-27 10:25:00', user: 'unknown', userRole: 'N/A', action: 'Login Failed', category: 'security', target: 'admin@test.com', details: 'Invalid credentials - 3rd attempt', ipAddress: '45.67.89.123', status: 'failure' },
  { id: '4', timestamp: '2025-11-27 10:15:42', user: 'sophie.psm@yellowgrid.com', userRole: 'PSM', action: 'Provider Verified', category: 'provider', target: 'PRV-001', details: 'Verified insurance documents for Électricité Pro', ipAddress: '192.168.1.102', status: 'success' },
  { id: '5', timestamp: '2025-11-27 09:50:33', user: 'admin@yellowgrid.com', userRole: 'Admin', action: 'Role Modified', category: 'user', target: 'Operator Role', details: 'Added permission: so_delete', ipAddress: '192.168.1.100', status: 'success' },
  { id: '6', timestamp: '2025-11-27 09:45:00', user: 'system', userRole: 'System', action: 'Backup Completed', category: 'system', target: 'Database', details: 'Daily backup completed successfully (2.4GB)', ipAddress: 'localhost', status: 'success' },
  { id: '7', timestamp: '2025-11-27 09:30:20', user: 'luc.seller@yellowgrid.com', userRole: 'Seller', action: 'Quotation Sent', category: 'service_order', target: 'DEV-2025-001', details: 'Sent quotation to client jean.dupont@email.fr', ipAddress: '192.168.1.103', status: 'success' },
  { id: '8', timestamp: '2025-11-27 09:15:55', user: 'marie.operator@yellowgrid.com', userRole: 'Operator', action: 'Assignment Failed', category: 'service_order', target: 'SO-2025-001233', details: 'Provider PRV-002 declined assignment', ipAddress: '192.168.1.101', status: 'warning' },
  { id: '9', timestamp: '2025-11-27 09:00:00', user: 'system', userRole: 'System', action: 'Service Started', category: 'system', target: 'API Server', details: 'Application started on port 3000', ipAddress: 'localhost', status: 'success' },
  { id: '10', timestamp: '2025-11-26 18:30:00', user: 'admin@yellowgrid.com', userRole: 'Admin', action: 'Config Changed', category: 'system', target: 'Email Settings', details: 'Updated SMTP configuration', ipAddress: '192.168.1.100', status: 'success' },
];

const getCategoryIcon = (category: AuditEvent['category']) => {
  switch (category) {
    case 'auth': return Shield;
    case 'user': return User;
    case 'service_order': return FileText;
    case 'provider': return User;
    case 'system': return Settings;
    case 'security': return AlertTriangle;
    default: return FileText;
  }
};

const getCategoryColor = (category: AuditEvent['category']): string => {
  switch (category) {
    case 'auth': return 'bg-blue-100 text-blue-700';
    case 'user': return 'bg-purple-100 text-purple-700';
    case 'service_order': return 'bg-green-100 text-green-700';
    case 'provider': return 'bg-amber-100 text-amber-700';
    case 'system': return 'bg-gray-100 text-gray-700';
    case 'security': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status: AuditEvent['status']) => {
  switch (status) {
    case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failure': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'warning': return <Clock className="w-4 h-4 text-amber-500" />;
    default: return <CheckCircle className="w-4 h-4 text-gray-400" />;
  }
};

export default function AdminAuditPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | AuditEvent['category']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | AuditEvent['status']>('all');
  const [dateRange, setDateRange] = useState('today');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: mockEvents.length,
    success: mockEvents.filter(e => e.status === 'success').length,
    failures: mockEvents.filter(e => e.status === 'failure').length,
    security: mockEvents.filter(e => e.category === 'security').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600">Monitor system activity and security events</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.success}</p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failures}</p>
              <p className="text-sm text-gray-600">Failures</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.security}</p>
              <p className="text-sm text-gray-600">Security Events</p>
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
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-9"
            />
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input w-36"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
            className="input w-40"
          >
            <option value="all">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="user">User</option>
            <option value="service_order">Service Orders</option>
            <option value="provider">Provider</option>
            <option value="system">System</option>
            <option value="security">Security</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="input w-36"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">Events ({filteredEvents.length})</h3>
          <p className="text-sm text-gray-500">Showing recent activity</p>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredEvents.map((event) => {
            const Icon = getCategoryIcon(event.category);
            const isExpanded = expandedEvent === event.id;

            return (
              <div key={event.id} className="hover:bg-gray-50">
                <button
                  onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      getCategoryColor(event.category)
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.action}</p>
                        {getStatusIcon(event.status)}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{event.details}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{event.user}</span>
                        <span>•</span>
                        <span>{event.target}</span>
                        <span>•</span>
                        <span>{event.timestamp}</span>
                      </div>
                    </div>
                    <ChevronDown className={clsx(
                      'w-5 h-5 text-gray-400 transition-transform',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 ml-14">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">User</p>
                          <p className="font-medium">{event.user}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Role</p>
                          <p className="font-medium">{event.userRole}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">IP Address</p>
                          <p className="font-medium font-mono">{event.ipAddress}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Category</p>
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium capitalize',
                            getCategoryColor(event.category)
                          )}>
                            {event.category.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Details</p>
                          <p className="font-medium">{event.details}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <button className="btn btn-secondary text-sm flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          View Full Details
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredEvents.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No events found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
