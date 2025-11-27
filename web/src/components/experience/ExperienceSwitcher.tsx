/**
 * ExperienceSwitcher Component
 * 
 * A development/admin tool to switch between different user experiences.
 * Used for testing and by admin users to preview different portals.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserExperience, EXPERIENCE_CONFIGS } from '../types/experiences';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  Package,
  Shield,
  Headphones,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

interface ExperienceOption {
  experience: UserExperience;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  path: string;
  color: string;
}

const EXPERIENCE_OPTIONS: ExperienceOption[] = [
  {
    experience: UserExperience.OPERATOR,
    label: 'Service Operator',
    icon: Headphones,
    description: 'Control Tower - Manage service orders and operations',
    path: '/dashboard',
    color: 'bg-blue-500',
  },
  {
    experience: UserExperience.PROVIDER,
    label: 'Provider Portal',
    icon: Building2,
    description: 'Provider Cockpit - Manage jobs, teams, and finances',
    path: '/provider',
    color: 'bg-green-500',
  },
  {
    experience: UserExperience.PSM,
    label: 'PSM Portal',
    icon: UserCheck,
    description: 'Provider Success - Recruitment and onboarding pipeline',
    path: '/psm',
    color: 'bg-purple-500',
  },
  {
    experience: UserExperience.SELLER,
    label: 'Seller Portal',
    icon: ShoppingCart,
    description: 'Retail Sales - Check availability, create quotations',
    path: '/seller',
    color: 'bg-orange-500',
  },
  {
    experience: UserExperience.OFFER_MANAGER,
    label: 'Offer Manager',
    icon: Package,
    description: 'Service Catalog - Manage services and pricing',
    path: '/catalog',
    color: 'bg-cyan-500',
  },
  {
    experience: UserExperience.ADMIN,
    label: 'Admin Portal',
    icon: Shield,
    description: 'Platform Admin - Users, roles, and system config',
    path: '/admin',
    color: 'bg-red-500',
  },
];

interface ExperienceSwitcherProps {
  variant?: 'dropdown' | 'grid';
  currentExperience?: UserExperience;
}

export function ExperienceSwitcher({ variant = 'dropdown', currentExperience }: ExperienceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only show for admin users
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COUNTRY_ADMIN';

  if (!isAdmin && variant === 'dropdown') {
    return null;
  }

  const handleSwitch = (option: ExperienceOption) => {
    navigate(option.path);
    setIsOpen(false);
  };

  const currentOption = EXPERIENCE_OPTIONS.find(opt => opt.experience === currentExperience) 
    || EXPERIENCE_OPTIONS[0];

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
        {EXPERIENCE_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = option.experience === currentExperience;

          return (
            <button
              key={option.experience}
              onClick={() => handleSwitch(option)}
              className={clsx(
                'flex flex-col items-center p-6 rounded-xl border-2 transition-all hover:shadow-lg',
                isActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center text-white mb-3', option.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-900">{option.label}</span>
              <span className="text-xs text-gray-500 text-center mt-1">{option.description}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-white', currentOption.color)}>
          <currentOption.icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-medium text-gray-700">{currentOption.label}</span>
        <ChevronDown className={clsx('w-4 h-4 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-2">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Switch Experience</p>
            </div>
            {EXPERIENCE_OPTIONS.map(option => {
              const Icon = option.icon;
              const isActive = option.experience === currentExperience;

              return (
                <button
                  key={option.experience}
                  onClick={() => handleSwitch(option)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors',
                    isActive && 'bg-green-50'
                  )}
                >
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-white', option.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={clsx('text-sm font-medium', isActive ? 'text-green-700' : 'text-gray-900')}>
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                  {isActive && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default ExperienceSwitcher;
