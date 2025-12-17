/**
 * Branded Portal Login Page
 * Each portal has its own themed login experience
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Building2,
  ShoppingCart, 
  Settings, 
  Briefcase, 
  Wrench,
  UserCheck,
  LayoutDashboard,
  Globe,
  ArrowLeft
} from 'lucide-react';

// Portal configuration type
interface PortalConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  accentColor: string;
  defaultRedirect: string;
  defaultEmail: string;
  features: string[];
}

// Portal configurations
const portalConfigs: Record<string, PortalConfig> = {
  operator: {
    id: 'operator',
    name: 'Control Tower',
    subtitle: 'Service Operations Hub',
    description: 'Manage service orders, assignments, and field operations in real-time.',
    icon: <LayoutDashboard className="w-12 h-12" />,
    gradient: 'from-blue-600 to-blue-800',
    accentColor: 'blue',
    defaultRedirect: '/operator/dashboard',
    defaultEmail: 'operator.fr@store.test',
    features: ['Service Order Management', 'Real-time Calendar', 'Provider Assignments', 'Task Queue'],
  },
  provider: {
    id: 'provider',
    name: 'Provider Portal',
    subtitle: 'Business Management Center',
    description: 'Manage your jobs, teams, and business performance.',
    icon: <Building2 className="w-12 h-12" />,
    gradient: 'from-emerald-600 to-emerald-800',
    accentColor: 'emerald',
    defaultRedirect: '/provider/dashboard',
    defaultEmail: 'provider.fr@store.test',
    features: ['Job Pipeline', 'Team Management', 'Financial Center', 'Performance Metrics'],
  },
  psm: {
    id: 'psm',
    name: 'PSM Portal',
    subtitle: 'Provider Success Management',
    description: 'Recruit, onboard, and manage provider partners.',
    icon: <UserCheck className="w-12 h-12" />,
    gradient: 'from-purple-600 to-purple-800',
    accentColor: 'purple',
    defaultRedirect: '/psm/dashboard',
    defaultEmail: 'psm.fr@store.test',
    features: ['Provider Pipeline', 'Document Verification', 'Coverage Mapping', 'Onboarding'],
  },
  seller: {
    id: 'seller',
    name: 'Seller Portal',
    subtitle: 'Sales Enablement Platform',
    description: 'Check availability, create quotes, and manage customer projects.',
    icon: <ShoppingCart className="w-12 h-12" />,
    gradient: 'from-orange-500 to-orange-700',
    accentColor: 'orange',
    defaultRedirect: '/seller/dashboard',
    defaultEmail: 'seller.fr@store.test',
    features: ['Availability Checker', 'Quotation Builder', 'TV Reports', 'Customer Projects'],
  },
  admin: {
    id: 'admin',
    name: 'Admin Portal',
    subtitle: 'Platform Administration',
    description: 'System configuration, user management, and platform oversight.',
    icon: <Settings className="w-12 h-12" />,
    gradient: 'from-slate-700 to-slate-900',
    accentColor: 'slate',
    defaultRedirect: '/admin/dashboard',
    defaultEmail: 'admin.fr@store.test',
    features: ['User Management', 'Role Configuration', 'System Settings', 'Audit Logs'],
  },
  catalog: {
    id: 'catalog',
    name: 'Catalog Manager',
    subtitle: 'Service Catalog Administration',
    description: 'Define services, pricing, and checklists.',
    icon: <Briefcase className="w-12 h-12" />,
    gradient: 'from-cyan-600 to-cyan-800',
    accentColor: 'cyan',
    defaultRedirect: '/catalog/services',
    defaultEmail: 'catalog.fr@store.test',
    features: ['Service Definitions', 'Pricing Rules', 'Checklist Builder', 'Skill Requirements'],
  },
  workteam: {
    id: 'workteam',
    name: 'Work Team Portal',
    subtitle: 'Field Service Execution',
    description: 'View your schedule, execute jobs, and submit reports.',
    icon: <Wrench className="w-12 h-12" />,
    gradient: 'from-amber-600 to-amber-800',
    accentColor: 'amber',
    defaultRedirect: '/mobile/', // Redirect to mobile app
    defaultEmail: 'workteam.fr@store.test',
    features: ['Daily Agenda', 'Job Execution', 'Photo Capture', 'WCF Submission'],
  },
};

// Country configurations
const countries = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
];

export default function PortalLoginPage() {
  const { portal } = useParams<{ portal: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('FR');

  // Get portal config or default to operator
  const config = portalConfigs[portal || 'operator'] || portalConfigs.operator;

  // Update email when country changes
  useEffect(() => {
    const role = config.id;
    setEmail(`${role}.${selectedCountry.toLowerCase()}@store.test`);
    setPassword('Admin123!');
  }, [selectedCountry, config.id]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(config.defaultRedirect, { replace: true });
    }
  }, [isAuthenticated, navigate, config.defaultRedirect]);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || config.defaultRedirect;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    try {
      await login(email, password);
      toast.success(`Welcome to ${config.name}`);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('Invalid credentials. Try Admin123! as password.');
    }
  };

  const handleQuickLogin = async (countryCode: string) => {
    const role = config.id;
    const quickEmail = `${role}.${countryCode.toLowerCase()}@store.test`;
    
    try {
      await login(quickEmail, 'Admin123!');
      toast.success(`Welcome to ${config.name} (${countryCode})`);
      navigate(config.defaultRedirect, { replace: true });
    } catch (error) {
      toast.error(`Failed to login as ${quickEmail}`);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} flex`}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold">Y</span>
            </div>
            <span className="text-2xl font-bold">Yellow Grid</span>
          </div>

          {/* Portal Info */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-xl">
                {config.icon}
              </div>
              <div>
                <h1 className="text-4xl font-bold">{config.name}</h1>
                <p className="text-xl text-white/80">{config.subtitle}</p>
              </div>
            </div>
            <p className="text-lg text-white/70 max-w-md">
              {config.description}
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Features</h3>
            <div className="grid grid-cols-2 gap-3">
              {config.features.map((feature) => (
                <div 
                  key={feature} 
                  className="flex items-center gap-2 text-white/80"
                >
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-white/50 text-sm">
          <p>Yellow Grid Field Service Management Platform</p>
          <p>© 2025 GlobalCorp Home Services</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white lg:rounded-l-3xl">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center text-white`}>
                {config.icon}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{config.name}</h1>
            <p className="text-gray-600">{config.subtitle}</p>
          </div>

          {/* Sign In Header */}
          <div className="text-center lg:text-left mb-8">
            <a href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to portals
            </a>
            <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
            <p className="text-gray-600 mt-1">Access your {config.name.toLowerCase()}</p>
          </div>

          {/* Country Quick Select */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Select Country
            </label>
            <div className="grid grid-cols-4 gap-2">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => setSelectedCountry(country.code)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    selectedCountry === country.code
                      ? `border-${config.accentColor}-500 bg-${config.accentColor}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <p className="text-xs font-medium text-gray-700 mt-1">{country.code}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@store.test"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">Demo password: Admin123!</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity disabled:opacity-50`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Login Buttons */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">Quick Login by Country</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleQuickLogin(country.code)}
                  disabled={isLoading}
                  className={`p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-center disabled:opacity-50`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <p className="text-xs font-medium text-gray-600">{country.code}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Other Portals Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Looking for a different portal?{' '}
              <a href="/login" className="text-blue-600 hover:underline font-medium">
                View all portals
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
