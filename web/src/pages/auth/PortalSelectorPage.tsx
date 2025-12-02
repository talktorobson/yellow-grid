/**
 * Portal Selector Page
 * Landing page to choose which portal to access
 * Redesigned to match Yellow Grid Pitch Deck (Dark Theme + Glassmorphism)
 */

import { Link } from 'react-router-dom';
import {
  Building2,
  ShoppingCart,
  Settings,
  Briefcase,
  Wrench,
  UserCheck,
  LayoutDashboard,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  Globe2,
  ShieldCheck
} from 'lucide-react';

interface PortalCard {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  badge?: string;
  highlight?: boolean;
}

const portals: PortalCard[] = [
  {
    id: 'operator',
    name: 'Control Tower',
    role: 'Service Operator',
    description: 'Orchestrate field operations, manage assignments, and monitor real-time execution.',
    icon: <LayoutDashboard className="w-6 h-6" />,
    url: '/login/operator',
    highlight: true,
  },
  {
    id: 'provider',
    name: 'Provider Portal',
    role: 'Service Provider',
    description: 'Manage your workforce, accept jobs, and track financial performance.',
    icon: <Building2 className="w-6 h-6" />,
    url: '/login/provider',
  },
  {
    id: 'psm',
    name: 'PSM Portal',
    role: 'Provider Success',
    description: 'Recruit, onboard, and manage the health of the provider network.',
    icon: <UserCheck className="w-6 h-6" />,
    url: '/login/psm',
  },
  {
    id: 'seller',
    name: 'Seller Portal',
    role: 'Retail Sales',
    description: 'Check availability, quote services, and track project status for customers.',
    icon: <ShoppingCart className="w-6 h-6" />,
    url: '/login/seller',
  },
  {
    id: 'catalog',
    name: 'Offer Manager',
    role: 'Catalog Admin',
    description: 'Define service catalog, pricing structures, and execution checklists.',
    icon: <Briefcase className="w-6 h-6" />,
    url: '/login/catalog',
  },
  {
    id: 'admin',
    name: 'Admin Console',
    role: 'Platform Admin',
    description: 'System configuration, user management, and security settings.',
    icon: <Settings className="w-6 h-6" />,
    url: '/login/admin',
  },
  {
    id: 'technician',
    name: 'Technician App',
    role: 'Field Technician',
    description: 'Mobile-first experience for executing jobs and submitting reports.',
    icon: <Wrench className="w-6 h-6" />,
    url: '/login/technician',
    badge: 'Mobile App',
  },
];

export default function PortalSelectorPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-yellow-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0F172A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/assets/logo.png" alt="Yellow Grid" className="h-8 w-auto" />
              <span className="font-bold text-xl tracking-tight text-white">Yellow<span className="text-[#FFD700]">Grid</span></span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Documentation</a>
              <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[#FFD700] text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            v2.0 Production Ready
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Orchestrate Field Operations <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-yellow-200">
              With Precision
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-400 mb-10">
            The enterprise-grade platform for managing complex service execution networks.
            Connect operators, providers, and technicians in a single unified ecosystem.
          </p>
        </div>
      </div>

      {/* Portal Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              to={portal.url}
              className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-yellow-500/10
                ${portal.highlight
                  ? 'bg-white/10 border-yellow-500/50 ring-1 ring-yellow-500/20'
                  : 'bg-white/5 border-white/10 hover:border-yellow-500/30 hover:bg-white/10'
                }`}
            >
              {/* Hover Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${portal.highlight ? 'bg-yellow-500 text-black' : 'bg-white/10 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-black'} transition-colors duration-300`}>
                    {portal.icon}
                  </div>
                  {portal.badge && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
                      <Smartphone className="w-3 h-3" />
                      {portal.badge}
                    </span>
                  )}
                  {portal.highlight && !portal.badge && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium border border-yellow-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Primary
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#FFD700] transition-colors">
                  {portal.name}
                </h3>
                <p className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider text-xs">
                  {portal.role}
                </p>
                <p className="text-gray-400 text-sm leading-relaxed mb-4 group-hover:text-gray-300 transition-colors">
                  {portal.description}
                </p>

                <div className="flex items-center text-sm font-medium text-[#FFD700] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  Access Portal <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-20 pt-10 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="p-3 rounded-full bg-white/5 mb-4 text-gray-400">
                <Globe2 className="w-6 h-6" />
              </div>
              <h4 className="text-white font-semibold mb-1">Multi-Country Support</h4>
              <p className="text-sm text-gray-500">Deployed across FR, ES, IT, PT</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-3 rounded-full bg-white/5 mb-4 text-gray-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-white font-semibold mb-1">Enterprise Security</h4>
              <p className="text-sm text-gray-500">Role-based access & data isolation</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-3 rounded-full bg-white/5 mb-4 text-gray-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-white font-semibold mb-1">99.9% Reliability</h4>
              <p className="text-sm text-gray-500">High availability architecture</p>
            </div>
          </div>
        </div>

        {/* Demo Credentials Footer */}
        <div className="mt-16 bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6 max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-white font-semibold mb-1 flex items-center gap-2">
                <span className="text-xl">🔑</span> Demo Access
              </h4>
              <p className="text-sm text-gray-400">Use these credentials to explore the platform.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="bg-black/30 rounded-lg p-3 border border-white/10 flex-1">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Email Pattern</p>
                <code className="text-[#FFD700] font-mono text-sm">{'{role}.{country}@adeo.com'}</code>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/10 flex-1">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Password</p>
                <code className="text-[#FFD700] font-mono text-sm">Admin123!</code>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Adeo Home Services. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
