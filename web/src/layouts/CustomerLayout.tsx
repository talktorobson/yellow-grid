// Customer Layout - Portal for customers (deep-link authenticated)
import { Outlet, NavLink, useParams } from 'react-router-dom';
import { useCustomerAccess } from '../hooks/useCustomerAccess';
import {
  Clock,
  Calendar,
  FileText,
  Image,
  CheckSquare,
  Star,
  MessageCircle,
  Phone,
  HelpCircle,
} from 'lucide-react';
import clsx from 'clsx';

const NAVIGATION_ITEMS = [
  { id: 'status', label: 'Status', icon: Clock, path: 'status' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, path: 'schedule' },
  { id: 'contract', label: 'Contract', icon: FileText, path: 'contract' },
  { id: 'photos', label: 'Photos', icon: Image, path: 'photos' },
  { id: 'wcf', label: 'Sign Off', icon: CheckSquare, path: 'wcf' },
  { id: 'evaluate', label: 'Evaluate', icon: Star, path: 'evaluate' },
];

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your service details...</p>
      </div>
    </div>
  );
}

function AccessError({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <p className="text-sm text-gray-500">
          If you believe this is an error, please contact support or request a new access link.
        </p>
      </div>
    </div>
  );
}

export default function CustomerLayout() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const { serviceOrder, customer, isLoading, error } = useCustomerAccess(accessToken || '');

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !serviceOrder) {
    return <AccessError error={error || 'Unable to load service details'} />;
  }

  const basePath = `/c/${accessToken}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">YG</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Yellow Grid</h1>
                <p className="text-xs text-gray-500">Service Portal</p>
              </div>
            </div>

            {/* Help button */}
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Need Help?</span>
            </button>
          </div>
        </div>
      </header>

      {/* Service Info Banner */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {serviceOrder.serviceName}
              </h2>
              <p className="text-sm text-gray-500">
                Order #{serviceOrder.orderNumber} • {customer?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={serviceOrder.state} />
              {serviceOrder.scheduledDate && (
                <span className="text-sm text-gray-600">
                  {new Date(serviceOrder.scheduledDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {NAVIGATION_ITEMS.map(item => {
              const Icon = item.icon;
              const isDisabled = getNavItemDisabled(item.id, serviceOrder.state);

              return (
                <NavLink
                  key={item.id}
                  to={`${basePath}/${item.path}`}
                  className={({ isActive: navActive }) => clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    navActive
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    isDisabled && 'opacity-50 pointer-events-none'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet context={{ serviceOrder, customer, accessToken }} />
      </main>

      {/* Floating Help Button (Mobile) */}
      <div className="fixed bottom-4 right-4 sm:hidden">
        <button className="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-700 transition-colors">
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Contact Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Need assistance with your service?</p>
            <div className="flex justify-center gap-4">
              <a 
                href="tel:+33123456789" 
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Support
              </a>
              <NavLink 
                to={`${basePath}/chat`}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Send Message
              </NavLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    CREATED: { label: 'Order Received', color: 'bg-blue-100 text-blue-700' },
    SCHEDULED: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700' },
    ASSIGNED: { label: 'Technician Assigned', color: 'bg-indigo-100 text-indigo-700' },
    ACCEPTED: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    VALIDATED: { label: 'Validated', color: 'bg-green-100 text-green-700' },
    CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-700' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

  return (
    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

// Helper to determine if nav item should be disabled
function getNavItemDisabled(itemId: string, status: string): boolean {
  const statusOrder = ['CREATED', 'SCHEDULED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'CLOSED'];
  const currentIndex = statusOrder.indexOf(status);

  const itemRequirements: Record<string, number> = {
    status: 0,      // Always available
    schedule: 0,    // Always available
    contract: 0,    // Always available
    photos: 4,      // Available from IN_PROGRESS
    wcf: 5,         // Available from COMPLETED
    evaluate: 5,    // Available from COMPLETED
  };

  const requiredIndex = itemRequirements[itemId] ?? 0;
  return currentIndex < requiredIndex;
}
