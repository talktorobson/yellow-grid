/**
 * ExperienceProvider
 * 
 * Wraps the application with experience context based on user role.
 * Provides experience-specific routing and layout selection.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ExperienceContext, ExperienceContextType, getAvailableExperiences } from '../hooks/useExperience';
import { 
  UserExperience, 
  EXPERIENCE_CONFIGS,
  determineUserExperience,
  UserType,
} from '../types/experiences';

interface ExperienceProviderProps {
  children: React.ReactNode;
}

export function ExperienceProvider({ children }: ExperienceProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [currentExperienceOverride, setCurrentExperienceOverride] = useState<UserExperience | null>(null);
  
  // Determine base experience from user
  const baseExperience = useMemo(() => {
    if (!user) return UserExperience.OPERATOR;
    
    // Use determineUserExperience for full logic including onboarding state
    const userForExp = {
      userType: UserType.INTERNAL,
      roles: [{ name: user.role }],
      providerId: undefined,
      isProviderOnboarding: false,
    };
    
    const config = determineUserExperience(userForExp);
    return config.experience;
  }, [user]);
  
  // Current experience (with override support for admins)
  const currentExperience = currentExperienceOverride || baseExperience;
  
  // Get experience config
  const experienceConfig = useMemo(() => {
    return Object.values(EXPERIENCE_CONFIGS).find(
      config => config.experience === currentExperience
    ) || EXPERIENCE_CONFIGS.OPERATOR;
  }, [currentExperience]);
  
  // Available experiences for the user
  const availableExperiences = useMemo(() => {
    if (!user) return [UserExperience.OPERATOR];
    
    const roles = user.permissions || [user.role];
    const experiences = getAvailableExperiences(roles as string[]);
    
    // Admins can switch to any experience
    if (user.role === 'SUPER_ADMIN') {
      return Object.values(UserExperience);
    }
    
    return experiences;
  }, [user]);
  
  // Switch experience (for multi-role users)
  const switchExperience = useCallback((experience: UserExperience) => {
    if (availableExperiences.includes(experience)) {
      setCurrentExperienceOverride(experience);
    }
  }, [availableExperiences]);
  
  // Navigation stubs - these will be implemented in useExperience hook
  const navigateToRoute = useCallback((routeKey: string) => {
    console.log('navigateToRoute called in provider:', routeKey);
  }, []);
  
  const navigateToDashboard = useCallback(() => {
    console.log('navigateToDashboard called in provider');
  }, []);
  
  const canAccessRoute = useCallback((pathname: string): boolean => {
    if (!experienceConfig) return false;
    
    // Admin has full access
    if (experienceConfig.allowedRoutePatterns.includes('*')) {
      return true;
    }
    
    return experienceConfig.allowedRoutePatterns.some(pattern => {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(pathname);
    });
  }, [experienceConfig]);
  
  const openHelp = useCallback(() => {
    window.open('/help', '_blank');
  }, []);
  
  const openSupport = useCallback(() => {
    window.open('/support', '_blank');
  }, []);
  
  // Build user name
  const userName = user ? `${user.firstName} ${user.lastName}` : null;
  
  // Build context value
  const contextValue: ExperienceContextType = useMemo(() => ({
    currentExperience,
    experienceConfig,
    isAuthenticated: isAuthenticated ?? false,
    userRole: user?.role || null,
    userName,
    userAvatar: null, // Not in current User type
    navigateToRoute,
    navigateToDashboard,
    canAccessRoute,
    availableExperiences,
    switchExperience,
    notificationCount: 0, // TODO: Hook up to notification service
    openHelp,
    openSupport,
  }), [
    currentExperience,
    experienceConfig,
    isAuthenticated,
    user,
    userName,
    navigateToRoute,
    navigateToDashboard,
    canAccessRoute,
    availableExperiences,
    switchExperience,
    openHelp,
    openSupport,
  ]);
  
  return (
    <ExperienceContext.Provider value={contextValue}>
      {children}
    </ExperienceContext.Provider>
  );
}

export default ExperienceProvider;
