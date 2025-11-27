// Yellow Grid Platform - User Experience Types
// Defines the 8 distinct user experiences and their configurations

/**
 * User Experience Types
 * Each type corresponds to a distinct portal/experience in the platform
 */
export enum UserExperience {
  OPERATOR = 'OPERATOR',                       // Service Operator → Control Tower
  PROVIDER = 'PROVIDER',                       // Active Provider → Provider Cockpit
  PROVIDER_ONBOARDING = 'PROVIDER_ONBOARDING', // Prospect → Onboarding Wizard
  WORK_TEAM = 'WORK_TEAM',                     // Technician → Mobile Only
  CUSTOMER = 'CUSTOMER',                       // Customer → Portal (deep-link auth)
  PSM = 'PSM',                                 // Provider Success Manager
  SELLER = 'SELLER',                           // Retail Sales Staff
  OFFER_MANAGER = 'OFFER_MANAGER',             // Catalog Manager
  ADMIN = 'ADMIN',                             // Platform Admin
}

/**
 * Backend UserType enum alignment
 */
export enum UserType {
  INTERNAL = 'INTERNAL',                       // Operators, admins, PSMs, sellers, offer managers
  EXTERNAL_PROVIDER = 'EXTERNAL_PROVIDER',     // Provider company users (managers)
  EXTERNAL_TECHNICIAN = 'EXTERNAL_TECHNICIAN', // Field technicians (mobile only)
}

/**
 * Experience Configuration
 * Defines routing, permissions, and UI behavior for each experience
 */
export interface ExperienceConfig {
  experience: UserExperience;
  layout: string;
  defaultRoute: string;
  allowedRoutePatterns: string[];
  sidebarItems: SidebarItem[];
  headerConfig: HeaderConfig;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string; // Icon name from lucide-react
  path: string;
  badge?: {
    type: 'count' | 'dot';
    dataKey?: string; // Key to fetch from dashboard data
  };
  children?: SidebarItem[];
}

export interface HeaderConfig {
  showSearch: boolean;
  showNotifications: boolean;
  showAIChat: boolean;
  showQuickActions: boolean;
  logoVariant: 'full' | 'compact';
}

/**
 * Experience Configurations by User Type/Role
 */
export const EXPERIENCE_CONFIGS: Record<string, ExperienceConfig> = {
  // ============================================================
  // ADMIN - Full platform access
  // ============================================================
  ADMIN: {
    experience: UserExperience.ADMIN,
    layout: 'AdminLayout',
    defaultRoute: '/admin/dashboard',
    allowedRoutePatterns: ['*'], // Full access
    sidebarItems: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/admin/dashboard' },
      { id: 'users', label: 'Users', icon: 'Users', path: '/admin/users' },
      { id: 'roles', label: 'Roles & Permissions', icon: 'Shield', path: '/admin/roles' },
      { id: 'config', label: 'Configuration', icon: 'Settings', path: '/admin/config' },
      { id: 'audit', label: 'Audit Logs', icon: 'FileText', path: '/admin/audit' },
      { id: 'analytics', label: 'Platform Analytics', icon: 'BarChart3', path: '/admin/analytics' },
    ],
    headerConfig: {
      showSearch: true,
      showNotifications: true,
      showAIChat: true,
      showQuickActions: true,
      logoVariant: 'full',
    },
  },

  // ============================================================
  // OPERATOR - Control Tower (current default experience)
  // ============================================================
  OPERATOR: {
    experience: UserExperience.OPERATOR,
    layout: 'OperatorLayout',
    defaultRoute: '/dashboard',
    allowedRoutePatterns: [
      '/dashboard',
      '/operations-grid',
      '/service-orders/*',
      '/providers/*',
      '/assignments/*',
      '/calendar',
      '/tasks',
      '/analytics',
      '/performance',
    ],
    sidebarItems: [
      { id: 'dashboard', label: 'Control Tower', icon: 'LayoutDashboard', path: '/dashboard', badge: { type: 'count', dataKey: 'criticalActions' } },
      { id: 'operations', label: 'Operations Grid', icon: 'Grid3X3', path: '/operations-grid' },
      { id: 'service-orders', label: 'Service Orders', icon: 'ClipboardList', path: '/service-orders', badge: { type: 'count', dataKey: 'pendingOrders' } },
      { id: 'assignments', label: 'Assignments', icon: 'UserCheck', path: '/assignments' },
      { id: 'providers', label: 'Providers', icon: 'Building2', path: '/providers' },
      { id: 'calendar', label: 'Calendar', icon: 'Calendar', path: '/calendar' },
      { id: 'tasks', label: 'Tasks', icon: 'CheckSquare', path: '/tasks', badge: { type: 'count', dataKey: 'pendingTasks' } },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/analytics' },
      { id: 'performance', label: 'Performance', icon: 'TrendingUp', path: '/performance' },
    ],
    headerConfig: {
      showSearch: true,
      showNotifications: true,
      showAIChat: true,
      showQuickActions: true,
      logoVariant: 'full',
    },
  },

  // ============================================================
  // PROVIDER - Active Provider Cockpit
  // ============================================================
  PROVIDER_MANAGER: {
    experience: UserExperience.PROVIDER,
    layout: 'ProviderLayout',
    defaultRoute: '/provider/dashboard',
    allowedRoutePatterns: [
      '/provider/dashboard',
      '/provider/jobs/*',
      '/provider/financial',
      '/provider/teams/*',
      '/provider/calendar',
      '/provider/performance',
      '/provider/settings',
    ],
    sidebarItems: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/provider/dashboard' },
      { id: 'jobs', label: 'Jobs', icon: 'Briefcase', path: '/provider/jobs', badge: { type: 'count', dataKey: 'newOffers' } },
      { id: 'calendar', label: 'Calendar', icon: 'Calendar', path: '/provider/calendar' },
      { id: 'teams', label: 'Work Teams', icon: 'Users', path: '/provider/teams' },
      { id: 'financial', label: 'Financial', icon: 'Wallet', path: '/provider/financial', badge: { type: 'count', dataKey: 'pendingWCF' } },
      { id: 'performance', label: 'Performance', icon: 'TrendingUp', path: '/provider/performance' },
      { id: 'settings', label: 'Settings', icon: 'Settings', path: '/provider/settings' },
    ],
    headerConfig: {
      showSearch: true,
      showNotifications: true,
      showAIChat: false,
      showQuickActions: false,
      logoVariant: 'full',
    },
  },

  // ============================================================
  // PSM - Provider Success Manager
  // ============================================================
  PSM: {
    experience: UserExperience.PSM,
    layout: 'PSMLayout',
    defaultRoute: '/psm/dashboard',
    allowedRoutePatterns: [
      '/psm/dashboard',
      '/psm/pipeline',
      '/psm/providers/*',
      '/psm/coverage',
      '/psm/verification',
      '/psm/analytics',
    ],
    sidebarItems: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/psm/dashboard' },
      { id: 'pipeline', label: 'Pipeline', icon: 'GitBranch', path: '/psm/pipeline', badge: { type: 'count', dataKey: 'pendingVerification' } },
      { id: 'providers', label: 'Providers', icon: 'Building2', path: '/psm/providers' },
      { id: 'coverage', label: 'Coverage Map', icon: 'Map', path: '/psm/coverage' },
      { id: 'verification', label: 'Verification', icon: 'FileCheck', path: '/psm/verification', badge: { type: 'count', dataKey: 'docsToReview' } },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/psm/analytics' },
    ],
    headerConfig: {
      showSearch: true,
      showNotifications: true,
      showAIChat: false,
      showQuickActions: true,
      logoVariant: 'full',
    },
  },

  // ============================================================
  // SELLER - Retail Sales Staff
  // ============================================================
  SELLER: {
    experience: UserExperience.SELLER,
    layout: 'SellerLayout',
    defaultRoute: '/seller/dashboard',
    allowedRoutePatterns: [
      '/seller/dashboard',
      '/seller/availability',
      '/seller/projects/*',
      '/seller/quotations/*',
      '/seller/reports/*',
    ],
    sidebarItems: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/seller/dashboard' },
      { id: 'availability', label: 'Check Availability', icon: 'CalendarSearch', path: '/seller/availability' },
      { id: 'projects', label: 'Customer Projects', icon: 'FolderOpen', path: '/seller/projects' },
      { id: 'reports', label: 'TV Reports', icon: 'FileText', path: '/seller/reports', badge: { type: 'count', dataKey: 'pendingReports' } },
      { id: 'quotations', label: 'Quotations', icon: 'Receipt', path: '/seller/quotations', badge: { type: 'count', dataKey: 'pendingQuotes' } },
    ],
    headerConfig: {
      showSearch: true,
      showNotifications: true,
      showAIChat: false,
      showQuickActions: false,
      logoVariant: 'compact',
    },
  },

  // ============================================================
  // OFFER_MANAGER - Service Catalog Manager
  // ============================================================
  OFFER_MANAGER: {
    experience: UserExperience.OFFER_MANAGER,
    layout: 'CatalogLayout',
    defaultRoute: '/catalog/services',
    allowedRoutePatterns: [
      '/catalog/services/*',
      '/catalog/pricing',
      '/catalog/checklists',
      '/catalog/analytics',
    ],
    sidebarItems: [
      { id: 'services', label: 'Services', icon: 'Package', path: '/catalog/services' },
      { id: 'pricing', label: 'Pricing', icon: 'DollarSign', path: '/catalog/pricing' },
      { id: 'checklists', label: 'Checklists', icon: 'ListChecks', path: '/catalog/checklists' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/catalog/analytics' },
    ],
    headerConfig: {
      showSearch: true,
      showNotifications: true,
      showAIChat: false,
      showQuickActions: false,
      logoVariant: 'full',
    },
  },
};

/**
 * Role to Experience Mapping
 * Maps backend roles to frontend experiences
 */
export const ROLE_TO_EXPERIENCE: Record<string, string> = {
  // Admin roles
  'SUPER_ADMIN': 'ADMIN',
  'ADMIN': 'ADMIN',
  
  // Operator roles
  'OPERATOR': 'OPERATOR',
  'SERVICE_OPERATOR': 'OPERATOR',
  'CONTROL_TOWER': 'OPERATOR',
  
  // PSM roles
  'PSM': 'PSM',
  'PROVIDER_SUCCESS_MANAGER': 'PSM',
  
  // Seller roles
  'SELLER': 'SELLER',
  'SALES_STAFF': 'SELLER',
  'STORE_SELLER': 'SELLER',
  
  // Offer Manager roles
  'OFFER_MANAGER': 'OFFER_MANAGER',
  'CATALOG_MANAGER': 'OFFER_MANAGER',
  
  // Provider roles
  'PROVIDER_MANAGER': 'PROVIDER_MANAGER',
  'PROVIDER_ADMIN': 'PROVIDER_MANAGER',
};

/**
 * Determine user experience based on user data
 */
export function determineUserExperience(user: {
  userType: UserType;
  roles: Array<{ name: string } | string>;
  providerId?: string;
  isProviderOnboarding?: boolean;
}): ExperienceConfig {
  // Check for provider onboarding state
  if (user.isProviderOnboarding) {
    return {
      experience: UserExperience.PROVIDER_ONBOARDING,
      layout: 'OnboardingLayout',
      defaultRoute: '/provider/onboarding',
      allowedRoutePatterns: ['/provider/onboarding/*'],
      sidebarItems: [],
      headerConfig: {
        showSearch: false,
        showNotifications: false,
        showAIChat: false,
        showQuickActions: false,
        logoVariant: 'full',
      },
    };
  }

  // Get role names - handle both string[] and Array<{name: string}> formats
  const roleNames = user.roles.map(r => {
    const roleName = typeof r === 'string' ? r : r.name;
    return roleName?.toUpperCase() || '';
  }).filter(Boolean);

  // Priority-based role checking (higher roles first)
  const rolePriority = [
    'SUPER_ADMIN', 'ADMIN',
    'PSM', 'PROVIDER_SUCCESS_MANAGER',
    'OFFER_MANAGER', 'CATALOG_MANAGER',
    'SELLER', 'SALES_STAFF', 'STORE_SELLER',
    'OPERATOR', 'SERVICE_OPERATOR', 'CONTROL_TOWER',
    'PROVIDER_MANAGER', 'PROVIDER_ADMIN',
  ];

  for (const role of rolePriority) {
    if (roleNames.includes(role)) {
      const experienceKey = ROLE_TO_EXPERIENCE[role];
      if (experienceKey && EXPERIENCE_CONFIGS[experienceKey]) {
        return EXPERIENCE_CONFIGS[experienceKey];
      }
    }
  }

  // Check user type for external users
  if (user.userType === UserType.EXTERNAL_PROVIDER && user.providerId) {
    return EXPERIENCE_CONFIGS.PROVIDER_MANAGER;
  }

  // Default to operator experience
  return EXPERIENCE_CONFIGS.OPERATOR;
}

/**
 * Check if a route is allowed for a given experience
 */
export function isRouteAllowed(pathname: string, config: ExperienceConfig): boolean {
  // Admin has full access
  if (config.allowedRoutePatterns.includes('*')) {
    return true;
  }

  return config.allowedRoutePatterns.some(pattern => {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
  });
}

/**
 * Get experience config by key
 */
export function getExperienceConfig(key: string): ExperienceConfig | undefined {
  return EXPERIENCE_CONFIGS[key];
}
