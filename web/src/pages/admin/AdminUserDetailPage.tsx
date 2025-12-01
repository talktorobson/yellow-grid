import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Activity,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  History,
  Key,
  UserCog,
  Building,
  MapPin,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { userService, User as ApiUser } from '@/services/user-service';

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  ip: string;
  userAgent: string;
}

interface Session {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  lastLogin: string;
  loginCount: number;
  organization: string;
  department: string;
  location: string;
  avatar: string | null;
  permissions: string[];
}

function transformApiUser(apiUser: ApiUser): UserData {
  return {
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    phone: '', // Not in API response
    role: apiUser.roles[0] || 'OPERATOR',
    status: apiUser.isActive ? 'active' : 'inactive',
    emailVerified: true,
    phoneVerified: false,
    mfaEnabled: false,
    createdAt: apiUser.createdAt,
    lastLogin: apiUser.lastLoginAt || '',
    loginCount: 0,
    organization: apiUser.businessUnit || 'AHS',
    department: apiUser.countryCode || 'FR',
    location: apiUser.countryCode === 'FR' ? 'France' : apiUser.countryCode,
    avatar: null,
    permissions: [],
  };
}

// Mock activity data (no backend API for this yet)
const mockActivityLog: ActivityLog[] = [
  {
    id: '1',
    action: 'LOGIN',
    details: 'Successful login',
    timestamp: new Date().toISOString(),
    ip: '192.168.1.100',
    userAgent: 'Chrome/120.0.0.0',
  },
];

const mockSessions: Session[] = [
  {
    id: '1',
    device: 'Chrome on Windows',
    location: 'Paris, France',
    ip: '192.168.1.100',
    lastActive: new Date().toISOString(),
    current: true,
  },
];

const availableRoles = ['ADMIN', 'PSM', 'OPERATOR', 'PROVIDER', 'SELLER', 'OFFER_MANAGER'];

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    pending: 'Pending',
  };
  return labels[status] || status;
}

function getActionColor(action: string): string {
  switch (action) {
    case 'LOGIN':
      return 'bg-blue-100 text-blue-800';
    case 'LOGOUT':
      return 'bg-gray-100 text-gray-800';
    case 'UPDATE_PROVIDER':
    case 'APPROVE_SO':
      return 'bg-green-100 text-green-800';
    case 'EXPORT_REPORT':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'security' | 'permissions'>('profile');
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const apiUser = await userService.getById(id);
        const userData = transformApiUser(apiUser);
        setUser(userData);
        setSelectedRole(userData.role);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError('Failed to load user details');
        toast.error('Failed to load user');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUser();
  }, [id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'permissions' as const, label: 'Permissions', icon: Key },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-3 text-gray-600">Loading user...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-700 mb-4">{error || 'User not found'}</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-gray-500">User ID: {id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={clsx(
            'px-3 py-1 rounded-full text-sm font-medium',
            getStatusColor(user.status)
          )}>
            {getStatusLabel(user.status)}
          </span>

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />
                  Modifier
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Réinitialiser mot de passe
                </button>
                {user.status === 'active' ? (
                  <button className="w-full px-4 py-2 text-left text-sm text-yellow-700 hover:bg-yellow-50 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Suspendre
                  </button>
                ) : (
                  <button className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2">
                    <Unlock className="h-4 w-4" />
                    Réactiver
                  </button>
                )}
                <hr className="my-1" />
                <button className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600">
              {user.firstName[0]}{user.lastName[0]}
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{user.email}</span>
                {user.emailVerified && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span className="text-sm">{user.phone}</span>
                {user.phoneVerified && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="h-4 w-4" />
                <span className="text-sm">{user.organization}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <UserCog className="h-4 w-4" />
                <span className="text-sm">{user.department}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{user.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                {isEditingRole ? (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    onBlur={() => setIsEditingRole(false)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    autoFocus
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setIsEditingRole(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {selectedRole}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Créé le {formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Dernière connexion: {formatDateTime(user.lastLogin)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <History className="h-4 w-4" />
                <span className="text-sm">{user.loginCount} connexions</span>
              </div>
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
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Informations du profil</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                id="firstName"
                type="text"
                value={user.firstName}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                id="lastName"
                type="text"
                value={user.lastName}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={user.email}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                id="phone"
                type="tel"
                value={user.phone}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
              <input
                id="organization"
                type="text"
                value={user.organization}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Département</label>
              <input
                id="department"
                type="text"
                value={user.department}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              Modifier le profil
            </button>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Historique d&apos;activité</h3>
          
          <div className="space-y-4">
            {mockActivityLog.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className={clsx(
                  'px-2 py-1 rounded text-xs font-medium',
                  getActionColor(log.action)
                )}>
                  {log.action}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{log.details}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(log.timestamp)} • {log.ip} • {log.userAgent}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              Voir plus d&apos;activités
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* MFA Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentification à deux facteurs</h3>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'p-2 rounded-lg',
                  user.mfaEnabled ? 'bg-green-100' : 'bg-yellow-100'
                )}>
                  <Shield className={clsx(
                    'h-5 w-5',
                    user.mfaEnabled ? 'text-green-600' : 'text-yellow-600'
                  )} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.mfaEnabled ? '2FA activé' : '2FA non activé'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.mfaEnabled
                      ? 'La sécurité du compte est renforcée'
                      : 'Recommandé pour une meilleure sécurité'}
                  </p>
                </div>
              </div>
              <button className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                user.mfaEnabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              )}>
                {user.mfaEnabled ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sessions actives</h3>
              <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                Déconnecter toutes les sessions
              </button>
            </div>
            
            <div className="space-y-4">
              {mockSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <Activity className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.device}
                        {session.current && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                            Session actuelle
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.location} • {session.ip} • {formatDateTime(session.lastActive)}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <button className="text-red-600 hover:text-red-700 text-sm">
                      Révoquer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Password */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mot de passe</h3>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Forcer l&apos;utilisateur à réinitialiser son mot de passe à la prochaine connexion
              </p>
              <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Réinitialiser le mot de passe
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Permissions de l&apos;utilisateur</h3>
            <span className="text-sm text-gray-500">
              Basées sur le rôle: <span className="font-medium text-indigo-600">{selectedRole}</span>
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.permissions.map((permission) => {
              const [resource, action] = permission.split(':');
              return (
                <div key={permission} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{resource.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-500 capitalize">{action}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Permissions héritées du rôle</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Les permissions sont automatiquement attribuées selon le rôle de l&apos;utilisateur.
                  Pour modifier les permissions, changez le rôle ou contactez un administrateur système.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Link
              to="/admin/roles"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
            >
              Gérer les rôles et permissions
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
