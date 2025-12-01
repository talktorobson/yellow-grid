/**
 * Unified Portal Layout
 * 
 * Multi-experience navigation with collapsible portal sections.
 * Admin users see all portals. Other users see their relevant portals.
 * Enables easy demonstration and testing of all user experiences.
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Users,
  Calendar,
  CheckSquare,
  LogOut,
  User,
  BarChart3,
  Grid3X3,
  ChevronDown,
  ChevronRight,
  Briefcase,
  DollarSign,
  Shield,
  Settings,
  Store,
  MapPin,
  FileCheck,
  Package,
  Tag,
  ListChecks,
  Eye,
  Clock,
  FileSignature,
  Camera,
  Star,
  MessageSquare,
  TrendingUp,
  Building2,
  UserCog,
  FileText,
  PieChart,
  Home,
  Wallet,
  Bell,
  Phone,
} from 'lucide-react';
import clsx from 'clsx';
import SearchButton from '@/components/search/SearchButton';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import NotificationCenter from '@/components/NotificationCenter';
import { AIAssistantButton, AIChatWidget } from '@/components/ai';
import { useAIChat } from '@/hooks/useAIChat';

// Portal definitions with their sub-menus
interface MenuItem {
  name: string;
  href: string;
  icon: any;
  badge?: number | string;
}

interface Portal {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  items: MenuItem[];
  roles?: string[]; // Roles that can access this portal
}

const portals: Portal[] = [
  {
    id: 'operator',
    name: 'Service Operator',
    description: 'Control Tower - Manage all operations',
    icon: Grid3X3,
    color: 'bg-blue-600',
    roles: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'COUNTRY_ADMIN'],
    items: [
      { name: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
      { name: 'Operations Grid', href: '/operator/grid', icon: Grid3X3 },
      { name: 'Service Orders', href: '/operator/orders', icon: ClipboardList, badge: '1,247' },
      { name: 'Assignments', href: '/operator/assignments', icon: UserCheck, badge: 89 },
      { name: 'Provider Network', href: '/operator/providers', icon: Users },
      { name: 'Calendar', href: '/operator/calendar', icon: Calendar },
      { name: 'Tasks & Alerts', href: '/operator/tasks', icon: CheckSquare, badge: 12 },
      { name: 'Analytics', href: '/operator/analytics', icon: BarChart3 },
      { name: 'Performance', href: '/operator/performance', icon: TrendingUp },
    ],
  },
  {
    id: 'provider',
    name: 'Provider',
    description: 'Professional service provider view',
    icon: Briefcase,
    color: 'bg-emerald-600',
    roles: ['ADMIN', 'SUPER_ADMIN', 'PROVIDER'],
    items: [
      { name: 'Dashboard', href: '/provider/dashboard', icon: Home },
      { name: 'Jobs', href: '/provider/jobs', icon: Briefcase, badge: 8 },
      { name: 'Calendar', href: '/provider/calendar', icon: Calendar },
      { name: 'Work Teams', href: '/provider/teams', icon: Users },
      { name: 'Financial', href: '/provider/financial', icon: Wallet },
      { name: 'Performance', href: '/provider/performance', icon: TrendingUp },
      { name: 'Messages', href: '/provider/messages', icon: MessageSquare, badge: 3 },
      { name: 'Settings', href: '/provider/settings', icon: Settings },
    ],
  },
  {
    id: 'customer',
    name: 'Customer',
    description: 'End customer service tracking',
    icon: User,
    color: 'bg-purple-600',
    roles: ['ADMIN', 'SUPER_ADMIN', 'CUSTOMER'],
    items: [
      { name: 'My Service', href: '/customer/demo/status', icon: Eye },
      { name: 'Schedule', href: '/customer/demo/schedule', icon: Clock },
      { name: 'Contract', href: '/customer/demo/contract', icon: FileSignature },
      { name: 'Photos', href: '/customer/demo/photos', icon: Camera },
      { name: 'Work Complete', href: '/customer/demo/wcf', icon: FileCheck },
      { name: 'Rate Service', href: '/customer/demo/evaluate', icon: Star },
      { name: 'Messages', href: '/customer/demo/messages', icon: MessageSquare },
      { name: 'Support', href: '/customer/demo/support', icon: Phone },
    ],
  },
  {
    id: 'psm',
    name: 'PSM',
    description: 'Provider Success Manager',
    icon: UserCheck,
    color: 'bg-amber-600',
    roles: ['ADMIN', 'SUPER_ADMIN', 'PSM'],
    items: [
      { name: 'Dashboard', href: '/psm/dashboard', icon: LayoutDashboard },
      { name: 'Pipeline', href: '/psm/pipeline', icon: TrendingUp, badge: 23 },
      { name: 'My Providers', href: '/psm/providers', icon: Users },
      { name: 'Coverage Map', href: '/psm/coverage', icon: MapPin },
      { name: 'Verification', href: '/psm/verification', icon: FileCheck, badge: 7 },
      { name: 'Analytics', href: '/psm/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'seller',
    name: 'Store Seller',
    description: 'In-store sales associate',
    icon: Store,
    color: 'bg-rose-600',
    roles: ['ADMIN', 'SUPER_ADMIN', 'SELLER'],
    items: [
      { name: 'Dashboard', href: '/seller/dashboard', icon: Home },
      { name: 'Check Availability', href: '/seller/availability', icon: Calendar },
      { name: 'Customer Projects', href: '/seller/projects', icon: ClipboardList },
      { name: 'TV Reports', href: '/seller/reports', icon: FileText, badge: 5 },
      { name: 'Quotations', href: '/seller/quotations', icon: DollarSign },
    ],
  },
  {
    id: 'catalog',
    name: 'Offer Manager',
    description: 'Service catalog management',
    icon: Package,
    color: 'bg-cyan-600',
    roles: ['ADMIN', 'SUPER_ADMIN', 'OFFER_MANAGER'],
    items: [
      { name: 'Services', href: '/catalog/services', icon: Package },
      { name: 'Pricing', href: '/catalog/pricing', icon: Tag },
      { name: 'Checklists', href: '/catalog/checklists', icon: ListChecks },
      { name: 'Analytics', href: '/catalog/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'System administration',
    icon: Shield,
    color: 'bg-gray-700',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Users', href: '/admin/users', icon: UserCog },
      { name: 'Roles & Permissions', href: '/admin/roles', icon: Shield },
      { name: 'Notifications', href: '/admin/notifications', icon: Bell },
      { name: 'Business Units', href: '/admin/business-units', icon: Building2 },
      { name: 'Configuration', href: '/admin/config', icon: Settings },
      { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
      { name: 'Platform Analytics', href: '/admin/analytics', icon: PieChart },
    ],
  },
];

export default function UnifiedPortalLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { messages, isLoading, isOpen, sendMessage, toggleChat, closeChat } = useAIChat();
  
  // Track expanded portals
  const [expandedPortals, setExpandedPortals] = useState<string[]>(['operator']);

  // Auto-expand portal based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    for (const portal of portals) {
      if (portal.items.some(item => currentPath.startsWith(item.href.split('/').slice(0, 2).join('/')))) {
        if (!expandedPortals.includes(portal.id)) {
          setExpandedPortals(prev => [...prev, portal.id]);
        }
        break;
      }
    }
  }, [location.pathname]);

  const togglePortal = (portalId: string) => {
    setExpandedPortals(prev => 
      prev.includes(portalId)
        ? prev.filter(id => id !== portalId)
        : [...prev, portalId]
    );
  };

  const handleLogout = async () => {
    await logout();
  };

  // Check if user can access a portal (admin sees all)
  const canAccessPortal = (portal: Portal): boolean => {
    if (!user) return false;
    const userRoles = (user as any).roles || [user.role];
    // Admin/Super Admin sees everything
    if (userRoles.some((r: string) => ['ADMIN', 'SUPER_ADMIN'].includes(r?.toUpperCase()))) {
      return true;
    }
    // Otherwise check portal roles
    return portal.roles?.some(role => 
      userRoles.some((r: string) => r?.toUpperCase() === role)
    ) ?? true;
  };

  // Check if a menu item is active
  const isItemActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Get which portal is currently active
  const getActivePortal = () => {
    for (const portal of portals) {
      if (portal.items.some(item => isItemActive(item.href))) {
        return portal.id;
      }
    }
    return 'operator';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-72 bg-gray-900 text-white overflow-hidden flex flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-800 flex-shrink-0">
          <h1 className="text-xl font-bold">Yellow Grid</h1>
          <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 rounded-full">Demo</span>
        </div>

        {/* Portal Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {portals.filter(canAccessPortal).map((portal) => {
            const Icon = portal.icon;
            const isExpanded = expandedPortals.includes(portal.id);
            const isActive = getActivePortal() === portal.id;
            
            return (
              <div key={portal.id} className="mb-2">
                {/* Portal Header */}
                <button
                  onClick={() => togglePortal(portal.id)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all',
                    isActive
                      ? `${portal.color} text-white shadow-lg`
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{portal.name}</div>
                      <div className="text-xs opacity-70">{portal.description}</div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Sub-menu Items */}
                {isExpanded && (
                  <div className="mt-1 ml-4 pl-4 border-l border-gray-700">
                    {portal.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isItemActive(item.href);
                      
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={clsx(
                            'flex items-center justify-between px-3 py-2 mt-1 rounded-lg text-sm transition-colors',
                            active
                              ? 'bg-gray-700 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          )}
                        >
                          <div className="flex items-center">
                            <ItemIcon className="w-4 h-4 mr-2" />
                            {item.name}
                          </div>
                          {item.badge && (
                            <span className={clsx(
                              'px-1.5 py-0.5 text-xs rounded-full',
                              active ? 'bg-white/20' : 'bg-gray-700'
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="px-3 py-3 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <button 
              onClick={toggleChat}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </button>
            <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User info at bottom */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'px-2 py-1 text-xs rounded-full',
              'bg-primary-600/20 text-primary-400'
            )}>
              {((user as any)?.roles?.[0] || user?.role || 'USER').toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              {user?.countryCode} • {user?.businessUnit}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full mt-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-72">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 sticky top-0 z-10">
          <div className="flex-1">
            <nav className="text-sm text-gray-500">
              {/* Breadcrumb will be auto-generated based on route */}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <SearchButton />
            <NotificationBadge />
            <NotificationCenter />
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant */}
      <AIAssistantButton onClick={toggleChat} isOpen={isOpen} />
      <AIChatWidget
        isOpen={isOpen}
        onClose={closeChat}
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        userName={user?.firstName || 'User'}
      />
    </div>
  );
}
