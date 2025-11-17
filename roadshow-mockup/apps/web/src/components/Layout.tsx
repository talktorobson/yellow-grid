import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  PlayCircle,
  Users,
  CheckSquare,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Service Orders', href: '/service-orders', icon: ClipboardList },
  { name: 'Assignments', href: '/assignments', icon: UserCheck },
  { name: 'Executions', href: '/executions', icon: PlayCircle },
  { name: 'Providers', href: '/providers', icon: Users },
  { name: 'Tasks & Alerts', href: '/tasks', icon: CheckSquare },
  { name: 'WCFs', href: '/wcfs', icon: FileText },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="flex h-16 items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">Yellow Grid</h1>
        </div>
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href);
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
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
