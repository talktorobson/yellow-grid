/**
 * Admin Roles Page
 * 
 * Manage user roles and permissions across the platform.
 */

import { useState } from 'react';
import { 
  Search, Plus, Shield, Users, Edit, Trash2, 
  Check, X, ChevronDown, ChevronRight, Settings
} from 'lucide-react';
import clsx from 'clsx';

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
  color: string;
}

const permissionCategories = [
  {
    name: 'Service Orders',
    permissions: [
      { id: 'so_view', name: 'View Orders', description: 'View service orders' },
      { id: 'so_create', name: 'Create Orders', description: 'Create new service orders' },
      { id: 'so_edit', name: 'Edit Orders', description: 'Modify existing orders' },
      { id: 'so_delete', name: 'Delete Orders', description: 'Delete service orders' },
      { id: 'so_assign', name: 'Assign Orders', description: 'Assign orders to providers' },
    ],
  },
  {
    name: 'Providers',
    permissions: [
      { id: 'prov_view', name: 'View Providers', description: 'View provider information' },
      { id: 'prov_manage', name: 'Manage Providers', description: 'Create and edit providers' },
      { id: 'prov_verify', name: 'Verify Providers', description: 'Verify provider documents' },
      { id: 'prov_suspend', name: 'Suspend Providers', description: 'Suspend provider accounts' },
    ],
  },
  {
    name: 'Users',
    permissions: [
      { id: 'user_view', name: 'View Users', description: 'View user accounts' },
      { id: 'user_manage', name: 'Manage Users', description: 'Create and edit users' },
      { id: 'user_roles', name: 'Manage Roles', description: 'Assign roles to users' },
      { id: 'user_delete', name: 'Delete Users', description: 'Delete user accounts' },
    ],
  },
  {
    name: 'Reports',
    permissions: [
      { id: 'report_view', name: 'View Reports', description: 'Access reports and analytics' },
      { id: 'report_export', name: 'Export Reports', description: 'Export report data' },
      { id: 'report_financial', name: 'Financial Reports', description: 'Access financial data' },
    ],
  },
  {
    name: 'System',
    permissions: [
      { id: 'sys_config', name: 'System Config', description: 'Modify system settings' },
      { id: 'sys_audit', name: 'Audit Logs', description: 'View audit trail' },
      { id: 'sys_backup', name: 'Backups', description: 'Manage system backups' },
    ],
  },
];

const mockRoles: Role[] = [
  { id: '1', name: 'Super Admin', description: 'Full system access', userCount: 2, permissions: permissionCategories.flatMap(c => c.permissions.map(p => p.id)), isSystem: true, color: 'bg-red-500' },
  { id: '2', name: 'Admin', description: 'Administrative access', userCount: 5, permissions: ['so_view', 'so_create', 'so_edit', 'so_assign', 'prov_view', 'prov_manage', 'user_view', 'user_manage', 'report_view', 'report_export'], isSystem: true, color: 'bg-amber-500' },
  { id: '3', name: 'Operator', description: 'Day-to-day operations', userCount: 12, permissions: ['so_view', 'so_create', 'so_edit', 'so_assign', 'prov_view', 'report_view'], isSystem: true, color: 'bg-blue-500' },
  { id: '4', name: 'PSM', description: 'Provider success management', userCount: 8, permissions: ['prov_view', 'prov_manage', 'prov_verify', 'report_view'], isSystem: true, color: 'bg-green-500' },
  { id: '5', name: 'Seller', description: 'Sales and quotations', userCount: 15, permissions: ['so_view', 'so_create', 'report_view'], isSystem: true, color: 'bg-purple-500' },
  { id: '6', name: 'Viewer', description: 'Read-only access', userCount: 20, permissions: ['so_view', 'prov_view', 'report_view'], isSystem: false, color: 'bg-gray-500' },
];

export default function AdminRolesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(mockRoles[0]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(permissionCategories.map(c => c.name));

  const filteredRoles = mockRoles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const hasPermission = (permissionId: string) => {
    return selectedRole?.permissions.includes(permissionId) ?? false;
  };

  const totalPermissions = permissionCategories.reduce((sum, cat) => sum + cat.permissions.length, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600">Manage user roles and access control</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-9 text-sm"
              />
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={clsx(
                  'w-full p-4 text-left hover:bg-gray-50 transition-colors',
                  selectedRole?.id === role.id && 'bg-primary-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', role.color)}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{role.name}</p>
                      {role.isSystem && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">System</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{role.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {role.userCount} users • {role.permissions.length} permissions
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="col-span-2 card">
          {selectedRole ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center', selectedRole.color)}>
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedRole.name}</h2>
                    <p className="text-sm text-gray-500">{selectedRole.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedRole.isSystem && (
                    <>
                      <button className="btn btn-secondary p-2" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="btn btn-secondary p-2 text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Permissions</h3>
                  <span className="text-sm text-gray-500">
                    {selectedRole.permissions.length} of {totalPermissions} enabled
                  </span>
                </div>

                <div className="space-y-2">
                  {permissionCategories.map((category) => {
                    const isExpanded = expandedCategories.includes(category.name);
                    const enabledCount = category.permissions.filter(p => hasPermission(p.id)).length;

                    return (
                      <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category.name)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            enabledCount === category.permissions.length && 'bg-green-100 text-green-700',
                            enabledCount > 0 && enabledCount < category.permissions.length && 'bg-amber-100 text-amber-700',
                            enabledCount === 0 && 'bg-gray-100 text-gray-500'
                          )}>
                            {enabledCount}/{category.permissions.length}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-gray-100">
                            {category.permissions.map((permission) => {
                              const enabled = hasPermission(permission.id);
                              return (
                                <div key={permission.id} className="flex items-center justify-between p-3">
                                  <div>
                                    <p className="font-medium text-sm">{permission.name}</p>
                                    <p className="text-xs text-gray-500">{permission.description}</p>
                                  </div>
                                  <button
                                    disabled={selectedRole.isSystem}
                                    className={clsx(
                                      'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                                      enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400',
                                      selectedRole.isSystem && 'cursor-not-allowed opacity-50'
                                    )}
                                  >
                                    {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Users with this role */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-500" />
                      Users with this role
                    </h3>
                    <span className="text-sm text-gray-500">{selectedRole.userCount} users</span>
                  </div>
                  <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Manage Users
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Select a role to view permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
