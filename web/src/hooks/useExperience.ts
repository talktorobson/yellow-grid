/**
 * useExperience Hook
 * 
 * Provides experience context and navigation utilities for role-based UI.
 * Used by all layout components to determine current experience state.
 */

import { useContext, createContext, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserExperience, 
  ExperienceConfig, 
  EXPERIENCE_CONFIGS,
  ROLE_TO_EXPERIENCE,
  isRouteAllowed,
} from '../types/experiences';

// Experience context type
export interface ExperienceContextType {
  // Current experience
  currentExperience: UserExperience;
  experienceConfig: ExperienceConfig | null;
  
  // User info
  isAuthenticated: boolean;
  userRole: string | null;
  userName: string | null;
  userAvatar: string | null;
  
  // Navigation
  navigateToRoute: (routeKey: string) => void;
  navigateToDashboard: () => void;
  canAccessRoute: (routeKey: string) => boolean;
  
  // Experience switching (for users with multiple roles)
  availableExperiences: UserExperience[];
  switchExperience: (experience: UserExperience) => void;
  
  // Notifications
  notificationCount: number;
  
  // Help/Support
  openHelp: () => void;
  openSupport: () => void;
}

// Create context with default values
export const ExperienceContext = createContext<ExperienceContextType | null>(null);

/**
 * Map backend roles to experiences using the ROLE_TO_EXPERIENCE mapping
 */
export function mapRoleToExperience(role: string | null): UserExperience {
  if (!role) return UserExperience.OPERATOR; // Default fallback
  
  const roleUpper = role.toUpperCase();
  
  // Check direct mapping first
  if (ROLE_TO_EXPERIENCE[roleUpper]) {
    const experienceKey = ROLE_TO_EXPERIENCE[roleUpper];
    const config = EXPERIENCE_CONFIGS[experienceKey];
    if (config) {
      return config.experience;
    }
  }
  
  // Fallback pattern matching
  // Admin roles
  if (roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')) {
    return UserExperience.ADMIN;
  }
  
  // PSM roles
  if (roleUpper.includes('PSM') || roleUpper.includes('PROVIDER_SUCCESS') || roleUpper.includes('RECRUITMENT')) {
    return UserExperience.PSM;
  }
  
  // Service Operator roles
  if (roleUpper.includes('OPERATOR') || roleUpper.includes('DISPATCHER') || roleUpper.includes('CONTROL_TOWER')) {
    return UserExperience.OPERATOR;
  }
  
  // Seller roles
  if (roleUpper.includes('SELLER') || roleUpper.includes('SALES') || roleUpper.includes('COMMERCIAL')) {
    return UserExperience.SELLER;
  }
  
  // Offer Manager roles
  if (roleUpper.includes('OFFER') || roleUpper.includes('CATALOG') || roleUpper.includes('PRODUCT_MANAGER')) {
    return UserExperience.OFFER_MANAGER;
  }
  
  // Provider roles (external)
  if (roleUpper.includes('PROVIDER') || roleUpper.includes('CONTRACTOR')) {
    return UserExperience.PROVIDER;
  }
  
  // Work Team / Technician roles
  if (roleUpper.includes('TECHNICIAN') || roleUpper.includes('FIELD') || roleUpper.includes('WORK_TEAM')) {
    return UserExperience.WORK_TEAM;
  }
  
  // Customer (handled separately via deep links, but fallback here)
  if (roleUpper.includes('CUSTOMER') || roleUpper.includes('CLIENT')) {
    return UserExperience.CUSTOMER;
  }
  
  // Default to operator for internal users
  return UserExperience.OPERATOR;
}

/**
 * Get available experiences for a user based on their roles
 */
export function getAvailableExperiences(roles: string[]): UserExperience[] {
  const experiences = new Set<UserExperience>();
  
  roles.forEach(role => {
    experiences.add(mapRoleToExperience(role));
  });
  
  // Admin can access all experiences
  if (experiences.has(UserExperience.ADMIN)) {
    return Object.values(UserExperience);
  }
  
  return Array.from(experiences);
}

/**
 * Main useExperience hook
 */
export function useExperience(): ExperienceContextType {
  const context = useContext(ExperienceContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  // Determine current experience from URL or user role
  const currentExperience = useMemo(() => {
    // Check URL for experience prefix
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0]?.toLowerCase();
    
    // Map URL prefixes to experiences
    const urlExperienceMap: Record<string, UserExperience> = {
      'provider': UserExperience.PROVIDER,
      'customer': UserExperience.CUSTOMER,
      'psm': UserExperience.PSM,
      'seller': UserExperience.SELLER,
      'admin': UserExperience.ADMIN,
      'operator': UserExperience.OPERATOR,
      'catalog': UserExperience.OFFER_MANAGER,
      'team': UserExperience.WORK_TEAM,
    };
    
    if (firstPart && urlExperienceMap[firstPart]) {
      return urlExperienceMap[firstPart];
    }
    
    // Fall back to user role
    if (context?.currentExperience) {
      return context.currentExperience;
    }
    
    // Map from user role
    const userRole = user?.role;
    return mapRoleToExperience(userRole as string);
  }, [location.pathname, context?.currentExperience, user]);
  
  // Get experience config
  const experienceConfig = useMemo(() => {
    // Find config by experience type
    return Object.values(EXPERIENCE_CONFIGS).find(
      config => config.experience === currentExperience
    ) || null;
  }, [currentExperience]);
  
  // Available experiences for the user
  const availableExperiences = useMemo(() => {
    const roles = [user?.role].filter(Boolean) as string[];
    return getAvailableExperiences(roles);
  }, [user]);
  
  // Navigation helpers
  const navigateToRoute = useCallback((routeKey: string) => {
    const route = experienceConfig?.sidebarItems?.find(r => r.id === routeKey);
    if (route) {
      navigate(route.path);
    } else {
      console.warn(`Route not found for key: ${routeKey}`);
    }
  }, [experienceConfig, navigate]);
  
  const navigateToDashboard = useCallback(() => {
    const dashboardPath = experienceConfig?.defaultRoute || '/dashboard';
    navigate(dashboardPath);
  }, [experienceConfig, navigate]);
  
  const canAccessRoute = useCallback((pathname: string): boolean => {
    if (!experienceConfig) return false;
    return isRouteAllowed(pathname, experienceConfig);
  }, [experienceConfig]);
  
  const switchExperience = useCallback((experience: UserExperience) => {
    const config = Object.values(EXPERIENCE_CONFIGS).find(
      c => c.experience === experience
    );
    if (config) {
      navigate(config.defaultRoute);
    }
  }, [navigate]);
  
  // Support helpers
  const openHelp = useCallback(() => {
    // Open help modal or navigate to help page
    window.open('/help', '_blank');
  }, []);
  
  const openSupport = useCallback(() => {
    // Open support chat or contact form
    window.open('/support', '_blank');
  }, []);
  
  // If we have context, use it; otherwise build from auth
  if (context) {
    return {
      ...context,
      currentExperience,
      experienceConfig,
      availableExperiences,
      navigateToRoute,
      navigateToDashboard,
      canAccessRoute,
      switchExperience,
      openHelp,
      openSupport,
    };
  }
  
  // Build from auth context - use User type fields
  const userName = user ? `${user.firstName} ${user.lastName}` : null;
  
  return {
    currentExperience,
    experienceConfig,
    isAuthenticated: isAuthenticated ?? false,
    userRole: user?.role || null,
    userName,
    userAvatar: null, // User type doesn't have avatar
    navigateToRoute,
    navigateToDashboard,
    canAccessRoute,
    availableExperiences,
    switchExperience,
    notificationCount: 0, // TODO: Hook up to notification service
    openHelp,
    openSupport,
  };
}

export default useExperience;
