// Experience Router - Routes users to appropriate experience based on role
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  determineUserExperience, 
  isRouteAllowed,
  UserType,
  EXPERIENCE_CONFIGS,
  type ExperienceConfig 
} from '../../types/experiences';

/**
 * Loading Screen Component
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your experience...</p>
      </div>
    </div>
  );
}

/**
 * Access Denied Screen
 */
function AccessDenied({ config }: { config: ExperienceConfig }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        <a 
          href={config.defaultRoute}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

/**
 * Helper to get experience config from user
 */
function getUserExperienceConfig(user: ReturnType<typeof useAuth>['user']): ExperienceConfig {
  if (!user) {
    return EXPERIENCE_CONFIGS.OPERATOR;
  }

  // Build a compatible user object for determineUserExperience
  // Support both user.role (singular) and user.roles (array from API)
  const userRoles = (user as any).roles || [user.role].filter(Boolean);
  
  const userForExp = {
    userType: UserType.INTERNAL, // Default, will be overridden by role logic
    roles: userRoles,
    providerId: undefined,
    isProviderOnboarding: false,
  };

  return determineUserExperience(userForExp);
}

/**
 * Experience Router Hook
 * Returns the current user's experience configuration
 */
export function useExperienceHook(): { config: ExperienceConfig | null; isLoading: boolean } {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated || !user) {
    return { config: null, isLoading: true };
  }

  const config = getUserExperienceConfig(user);

  return { config, isLoading: false };
}

/**
 * Experience Router Component
 * Wraps protected routes and enforces experience-based access control
 */
export function ExperienceRouter() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Determine user's experience
  const config = getUserExperienceConfig(user);

  // Handle root redirect
  if (location.pathname === '/' || location.pathname === '') {
    return <Navigate to={config.defaultRoute} replace />;
  }

  // Check route access
  const isAllowed = isRouteAllowed(location.pathname, config);

  if (!isAllowed) {
    // If trying to access a different experience's route, redirect to default
    console.warn(`Route ${location.pathname} not allowed for experience ${config.experience}`);
    return <AccessDenied config={config} />;
  }

  // Render child routes with experience context
  return <Outlet context={{ experienceConfig: config }} />;
}

/**
 * Experience Context Hook
 * Use in child components to access current experience config
 */
export function useExperienceContext(): ExperienceConfig {
  const { config, isLoading } = useExperienceHook();
  
  if (isLoading || !config) {
    throw new Error('useExperienceContext must be used within ExperienceRouter');
  }
  
  return config;
}

/**
 * Experience Guard Component
 * Conditionally renders children based on allowed experiences
 */
interface ExperienceGuardProps {
  allowed: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ExperienceGuard({ allowed, children, fallback = null }: ExperienceGuardProps) {
  const { config, isLoading } = useExperienceHook();

  if (isLoading || !config) {
    return null;
  }

  if (allowed.includes(config.experience) || allowed.includes('*')) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Permission Guard Component
 * Conditionally renders based on specific permissions
 */
interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  // Check if user has the required permission
  const hasPermission = user.permissions?.some((p: string) => {
    if (p === '*') return true;
    if (p === permission) return true;
    // Check wildcard patterns like "service_orders.*"
    const [resource] = permission.split('.');
    if (p === `${resource}.*`) return true;
    return false;
  });

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

export default ExperienceRouter;
