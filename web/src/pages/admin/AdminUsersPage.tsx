/**
 * Admin Users Page
 * User management and administration - Integrated with backend
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  UserPlus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { userService, User as ApiUser } from '@/services/user-service';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
}

const roleColors: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: 'bg-red-100', text: 'text-red-700' },
  PSM: { bg: 'bg-purple-100', text: 'text-purple-700' },
  PROVIDER: { bg: 'bg-blue-100', text: 'text-blue-700' },
  SELLER: { bg: 'bg-green-100', text: 'text-green-700' },
  OPERATOR: { bg: 'bg-orange-100', text: 'text-orange-700' },
  OFFER_MANAGER: { bg: 'bg-pink-100', text: 'text-pink-700' },
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  PSM: 'PSM',
  PROVIDER: 'Provider',
  SELLER: 'Seller',
  OPERATOR: 'Operator',
  OFFER_MANAGER: 'Offer Manager',
};

type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'ADMIN' | 'PSM' | 'PROVIDER' | 'SELLER' | 'OPERATOR' | 'OFFER_MANAGER';

function transformApiUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    name: `${apiUser.firstName} ${apiUser.lastName}`,
    email: apiUser.email,
    role: apiUser.roles[0] || 'OPERATOR',
    status: apiUser.isActive ? 'active' : 'inactive',
    lastLogin: apiUser.lastLoginAt 
      ? new Date(apiUser.lastLoginAt).toLocaleDateString()
      : 'Never',
    createdAt: new Date(apiUser.createdAt).toLocaleDateString(),
  };
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '',
    role: 'OPERATOR' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: Record<string, unknown> = {
        page,
        limit: 20,
      };
      
      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.isActive = statusFilter === 'active';
      if (roleFilter !== 'all') filters.role = roleFilter;
      
      const response = await userService.getAll(filters);
      
      setUsers(response.data.map(transformApiUser));
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const stats = {
    total,
    active: users.filter(u => u.status === 'active').length,
    pending: 0,
    inactive: users.filter(u => u.status === 'inactive').length,
  };

  const handleAddUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await userService.create({
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        password: newUser.password,
        roles: [newUser.role],
      });
      
      toast.success(`User ${newUser.firstName} ${newUser.lastName} created successfully`);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR' });
      setShowAddModal(false);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        await userService.delete(userId);
        toast.success('User deleted');
        fetchUsers();
      } catch {
        toast.error('Failed to delete user');
      }
    }
    setShowActions(null);
  };

  const handleToggleStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    try {
      await userService.update(userId, { 
        isActive: user.status !== 'active' 
      });
      const newStatus = user.status === 'active' ? 'deactivated' : 'activated';
      toast.success(`User ${user.name} ${newStatus}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
    setShowActions(null);
  };

  const handleSendEmail = (user: User) => {
    globalThis.location.href = `mailto:${user.email}`;
    setShowActions(null);
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created'],
      ...users.map(u => [u.name, u.email, u.role, u.status, u.lastLogin, u.createdAt])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    globalThis.URL.revokeObjectURL(url);
    toast.success('Users exported to CSV');
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">{error}</p>
        <button 
          onClick={fetchUsers}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Users</div>
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
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.inactive}</div>
              <div className="text-sm text-gray-500">Inactive</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as RoleFilter);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="PSM">PSM</option>
            <option value="SELLER">Seller</option>
            <option value="OPERATOR">Operator</option>
            <option value="PROVIDER">Provider</option>
            <option value="OFFER_MANAGER">Offer Manager</option>
          </select>

          <button
            onClick={fetchUsers}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={clsx("w-5 h-5 text-gray-500", loading && "animate-spin")} />
          </button>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <Link 
                            to={`/admin/users/${user.id}`}
                            className="font-medium text-gray-900 hover:text-green-600"
                          >
                            {user.name}
                          </Link>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        roleColors[user.role]?.bg || 'bg-gray-100',
                        roleColors[user.role]?.text || 'text-gray-700'
                      )}>
                        <Shield className="w-3 h-3 inline mr-1" />
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        user.status === 'active' && 'bg-green-100 text-green-700',
                        user.status === 'inactive' && 'bg-red-100 text-red-700',
                        user.status === 'pending' && 'bg-yellow-100 text-yellow-700'
                      )}>
                        {user.status === 'active' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {user.status === 'inactive' && <XCircle className="w-3 h-3 inline mr-1" />}
                        {user.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {user.lastLogin}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {user.createdAt}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        
                        {showActions === user.id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                            <button 
                              onClick={() => {
                                navigate(`/admin/users/${user.id}`);
                                setShowActions(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button 
                              onClick={() => {
                                navigate(`/admin/users/${user.id}/edit`);
                                setShowActions(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button 
                              onClick={() => handleSendEmail(user)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Mail className="w-4 h-4" />
                              Send Email
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(user.id)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              {user.status === 'active' ? (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  Deactivate
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
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {users.length} of {total} users
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newUserFirstName" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    id="newUserFirstName"
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label htmlFor="newUserLastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    id="newUserLastName"
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Dupont"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  id="newUserEmail"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="jean.dupont@ahs.fr"
                />
              </div>
              <div>
                <label htmlFor="newUserPassword" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  id="newUserPassword"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="newUserRole" className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select 
                  id="newUserRole" 
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="OPERATOR">Operator</option>
                  <option value="SELLER">Seller</option>
                  <option value="PSM">PSM</option>
                  <option value="OFFER_MANAGER">Offer Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR' });
                  setShowAddModal(false);
                }}
                disabled={isSubmitting}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
