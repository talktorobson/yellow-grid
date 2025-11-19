/**
 * Dashboard Layout
 * Main layout with sidebar navigation and header
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import clsx from 'clsx';
import SearchButton from '@/components/search/SearchButton';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import NotificationCenter from '@/components/NotificationCenter';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Service Orders', href: '/service-orders', icon: ClipboardList },
  { name: 'Assignments', href: '/assignments', icon: UserCheck },
  { name: 'Providers', href: '/providers', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Performance', href: '/performance', icon: BarChart3 },
  { name: 'Tasks & Alerts', href: '/tasks', icon: CheckSquare },
];

export default function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">Yellow Grid</h1>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center px-3 py-2 mt-1 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-3">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              {user?.countryCode} • {user?.businessUnit}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <SearchButton />

            {/* Notifications */}
            <NotificationBadge />

            {/* User Role */}
            <NotificationCenter />
            <span className={clsx('badge', {
              'badge-success': user?.role === 'OPERATOR',
              'badge-primary': user?.role === 'SUPER_ADMIN',
              'badge-info': user?.role === 'COUNTRY_ADMIN',
            })}>
              {user?.role}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
