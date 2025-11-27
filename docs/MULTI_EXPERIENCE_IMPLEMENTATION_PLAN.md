# Yellow Grid - Multi-Experience Implementation Plan

**Version**: 1.0
**Date**: 2025-11-27
**Status**: Ready for Implementation

---

## Overview

This document provides the technical implementation plan for building 8 distinct user experiences on the Yellow Grid platform.

---

## Phase 1: Foundation & Role-Based Architecture

**Duration**: 2 weeks
**Priority**: CRITICAL (blocks all other phases)

### 1.1 User Types & Roles Mapping

```typescript
// New types to add to web/src/types/auth.ts

export enum UserExperience {
  OPERATOR = 'OPERATOR',           // Service Operator → Control Tower
  PROVIDER = 'PROVIDER',           // Active Provider → Provider Cockpit
  PROVIDER_ONBOARDING = 'PROVIDER_ONBOARDING', // Prospect → Onboarding
  WORK_TEAM = 'WORK_TEAM',         // Technician → Mobile Only
  CUSTOMER = 'CUSTOMER',           // Customer → Portal
  PSM = 'PSM',                     // Provider Success Manager
  SELLER = 'SELLER',               // Retail Sales Staff
  OFFER_MANAGER = 'OFFER_MANAGER', // Catalog Manager
  ADMIN = 'ADMIN',                 // Platform Admin
}

export interface ExperienceConfig {
  experience: UserExperience;
  layout: string;
  defaultRoute: string;
  allowedRoutes: string[];
  permissions: string[];
}

export const EXPERIENCE_CONFIGS: Record<string, ExperienceConfig> = {
  ADMIN: {
    experience: UserExperience.ADMIN,
    layout: 'AdminLayout',
    defaultRoute: '/admin/dashboard',
    allowedRoutes: ['*'], // Full access
    permissions: ['*'],
  },
  OPERATOR: {
    experience: UserExperience.OPERATOR,
    layout: 'OperatorLayout',
    defaultRoute: '/dashboard',
    allowedRoutes: [
      '/dashboard', '/operations-grid', '/service-orders/*', 
      '/providers/*', '/assignments/*', '/calendar', '/tasks',
      '/analytics', '/performance'
    ],
    permissions: ['service_orders.*', 'providers.read', 'assignments.*'],
  },
  PROVIDER_MANAGER: {
    experience: UserExperience.PROVIDER,
    layout: 'ProviderLayout',
    defaultRoute: '/provider/dashboard',
    allowedRoutes: [
      '/provider/dashboard', '/provider/jobs/*', '/provider/financial',
      '/provider/teams/*', '/provider/calendar', '/provider/settings'
    ],
    permissions: ['own_provider.*'],
  },
  PSM: {
    experience: UserExperience.PSM,
    layout: 'PSMLayout',
    defaultRoute: '/psm/dashboard',
    allowedRoutes: [
      '/psm/dashboard', '/psm/pipeline', '/psm/providers/*',
      '/psm/coverage', '/psm/verification'
    ],
    permissions: ['providers.*', 'users.create_provider'],
  },
  SELLER: {
    experience: UserExperience.SELLER,
    layout: 'SellerLayout',
    defaultRoute: '/seller/dashboard',
    allowedRoutes: [
      '/seller/dashboard', '/seller/availability', '/seller/projects/*',
      '/seller/quotations/*', '/seller/reports/*'
    ],
    permissions: ['scheduling.read', 'service_orders.read', 'quotations.*'],
  },
  OFFER_MANAGER: {
    experience: UserExperience.OFFER_MANAGER,
    layout: 'CatalogLayout',
    defaultRoute: '/catalog/services',
    allowedRoutes: ['/catalog/*'],
    permissions: ['service_catalog.*'],
  },
};
```

### 1.2 Updated App Router Structure

```typescript
// web/src/App.tsx - Updated structure

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ExperienceRouter } from './components/routing/ExperienceRouter';

// Layouts
import OperatorLayout from './layouts/OperatorLayout';
import ProviderLayout from './layouts/ProviderLayout';
import CustomerLayout from './layouts/CustomerLayout';
import PSMLayout from './layouts/PSMLayout';
import SellerLayout from './layouts/SellerLayout';
import CatalogLayout from './layouts/CatalogLayout';
import AdminLayout from './layouts/AdminLayout';

// Public pages
import LoginPage from './pages/auth/LoginPage';
import ProviderRegistrationPage from './pages/provider-onboarding/RegistrationPage';

// Customer Portal (public with token)
import CustomerPortal from './experiences/customer/CustomerPortal';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/provider/register" element={<ProviderRegistrationPage />} />
        
        {/* Customer Portal - Token authenticated */}
        <Route path="/c/:accessToken/*" element={<CustomerLayout />}>
          <Route index element={<Navigate to="status" replace />} />
          <Route path="status" element={<CustomerPortal.Status />} />
          <Route path="schedule" element={<CustomerPortal.Schedule />} />
          <Route path="contract" element={<CustomerPortal.Contract />} />
          <Route path="photos" element={<CustomerPortal.Photos />} />
          <Route path="wcf" element={<CustomerPortal.WCF />} />
          <Route path="evaluate" element={<CustomerPortal.Evaluate />} />
          <Route path="chat" element={<CustomerPortal.Chat />} />
        </Route>

        {/* Protected Routes - Experience-based */}
        <Route element={<ExperienceRouter />}>
          {/* Operator Experience (Default - Current App) */}
          <Route path="/*" element={<OperatorLayout />}>
            {/* Existing operator routes */}
          </Route>

          {/* Provider Experience */}
          <Route path="/provider/*" element={<ProviderLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ProviderDashboard />} />
            <Route path="jobs" element={<ProviderJobs />} />
            <Route path="jobs/:id" element={<ProviderJobDetail />} />
            <Route path="financial" element={<ProviderFinancial />} />
            <Route path="teams" element={<ProviderTeams />} />
            <Route path="calendar" element={<ProviderCalendar />} />
            <Route path="settings" element={<ProviderSettings />} />
          </Route>

          {/* PSM Experience */}
          <Route path="/psm/*" element={<PSMLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PSMDashboard />} />
            <Route path="pipeline" element={<ProviderPipeline />} />
            <Route path="providers/:id" element={<ProviderOnboardingDetail />} />
            <Route path="coverage" element={<CoverageMap />} />
            <Route path="verification" element={<DocumentVerification />} />
          </Route>

          {/* Seller Experience */}
          <Route path="/seller/*" element={<SellerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SellerDashboard />} />
            <Route path="availability" element={<AvailabilityChecker />} />
            <Route path="projects" element={<CustomerProjects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="quotations" element={<QuotationPipeline />} />
            <Route path="reports" element={<TVReports />} />
          </Route>

          {/* Offer Manager Experience */}
          <Route path="/catalog/*" element={<CatalogLayout />}>
            <Route index element={<Navigate to="services" replace />} />
            <Route path="services" element={<ServiceCatalog />} />
            <Route path="services/new" element={<ServiceWizard />} />
            <Route path="services/:id" element={<ServiceDetail />} />
            <Route path="pricing" element={<PricingConfig />} />
            <Route path="checklists" element={<ChecklistBuilder />} />
          </Route>

          {/* Admin Experience */}
          <Route path="/admin/*" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="config" element={<SystemConfig />} />
            <Route path="audit" element={<AuditLogs />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
```

### 1.3 Experience Router Component

```typescript
// web/src/components/routing/ExperienceRouter.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EXPERIENCE_CONFIGS, UserExperience } from '../../types/auth';

export function ExperienceRouter() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Determine user's experience based on roles
  const experience = determineExperience(user);
  const config = EXPERIENCE_CONFIGS[experience];

  // Redirect to appropriate default route if needed
  if (location.pathname === '/' || location.pathname === '') {
    return <Navigate to={config.defaultRoute} replace />;
  }

  // Check if route is allowed for this experience
  const isAllowed = checkRouteAllowed(location.pathname, config.allowedRoutes);
  
  if (!isAllowed) {
    return <Navigate to={config.defaultRoute} replace />;
  }

  return <Outlet />;
}

function determineExperience(user: User): UserExperience {
  const roles = user.roles.map(r => r.name);
  
  if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
    return UserExperience.ADMIN;
  }
  if (roles.includes('PSM') || roles.includes('PROVIDER_SUCCESS_MANAGER')) {
    return UserExperience.PSM;
  }
  if (roles.includes('SELLER') || roles.includes('SALES_STAFF')) {
    return UserExperience.SELLER;
  }
  if (roles.includes('OFFER_MANAGER') || roles.includes('CATALOG_MANAGER')) {
    return UserExperience.OFFER_MANAGER;
  }
  if (user.userType === 'EXTERNAL_PROVIDER') {
    return UserExperience.PROVIDER;
  }
  // Default to operator
  return UserExperience.OPERATOR;
}
```

### 1.4 Folder Structure Creation

```
web/src/
├── layouts/                    # NEW: Experience layouts
│   ├── OperatorLayout.tsx      # Refactor from DashboardLayout
│   ├── ProviderLayout.tsx
│   ├── CustomerLayout.tsx
│   ├── PSMLayout.tsx
│   ├── SellerLayout.tsx
│   ├── CatalogLayout.tsx
│   └── AdminLayout.tsx
├── experiences/                # NEW: Experience-specific pages
│   ├── operator/               # Move existing pages here
│   ├── provider/
│   │   ├── ProviderDashboard.tsx
│   │   ├── ProviderJobs.tsx
│   │   ├── ProviderJobDetail.tsx
│   │   ├── ProviderFinancial.tsx
│   │   ├── ProviderTeams.tsx
│   │   ├── ProviderCalendar.tsx
│   │   └── ProviderSettings.tsx
│   ├── customer/
│   │   ├── CustomerPortal.tsx
│   │   ├── StatusPage.tsx
│   │   ├── SchedulePage.tsx
│   │   ├── ContractPage.tsx
│   │   ├── PhotosPage.tsx
│   │   ├── WCFPage.tsx
│   │   ├── EvaluatePage.tsx
│   │   └── ChatPage.tsx
│   ├── psm/
│   │   ├── PSMDashboard.tsx
│   │   ├── ProviderPipeline.tsx
│   │   ├── ProviderOnboardingDetail.tsx
│   │   ├── CoverageMap.tsx
│   │   └── DocumentVerification.tsx
│   ├── seller/
│   │   ├── SellerDashboard.tsx
│   │   ├── AvailabilityChecker.tsx
│   │   ├── CustomerProjects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── QuotationPipeline.tsx
│   │   └── TVReports.tsx
│   ├── catalog/
│   │   ├── ServiceCatalog.tsx
│   │   ├── ServiceWizard.tsx
│   │   ├── ServiceDetail.tsx
│   │   ├── PricingConfig.tsx
│   │   └── ChecklistBuilder.tsx
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── UserManagement.tsx
│       ├── UserDetail.tsx
│       ├── RoleManagement.tsx
│       ├── SystemConfig.tsx
│       └── AuditLogs.tsx
├── components/
│   ├── shared/                 # Cross-experience components
│   │   ├── KPICard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── DataTable.tsx
│   │   ├── Timeline.tsx
│   │   ├── SignaturePad.tsx
│   │   ├── PhotoGallery.tsx
│   │   ├── ChatWidget.tsx
│   │   └── MapView.tsx
│   └── routing/
│       └── ExperienceRouter.tsx
└── types/
    └── auth.ts                 # Extended with experiences
```

---

## Phase 2: Customer Portal

**Duration**: 3 weeks
**Priority**: HIGH

### 2.1 Customer Authentication (Deep-link)

```typescript
// Backend: src/modules/customer-portal/customer-portal.controller.ts

@Controller('api/v1/customer-portal')
export class CustomerPortalController {
  
  @Post('generate-access')
  @Roles('OPERATOR', 'ADMIN')
  async generateCustomerAccess(
    @Body() dto: GenerateAccessDto
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    // Generate JWT with service order access
    // Token includes: serviceOrderId, customerId, permissions, expiry
  }

  @Get('verify/:token')
  async verifyAccess(
    @Param('token') token: string
  ): Promise<{ valid: boolean; serviceOrder?: ServiceOrderSummary }> {
    // Verify token and return service order summary
  }

  @Get(':token/service-order')
  async getServiceOrder(
    @Param('token') token: string
  ): Promise<CustomerServiceOrderView> {
    // Return customer-safe view of service order
  }

  @Post(':token/reschedule-request')
  async requestReschedule(
    @Param('token') token: string,
    @Body() dto: RescheduleRequestDto
  ): Promise<RescheduleRequest> {
    // Create reschedule request
  }

  @Post(':token/contract/sign')
  async signContract(
    @Param('token') token: string,
    @Body() dto: SignContractDto
  ): Promise<Contract> {
    // Process contract signature
  }

  @Post(':token/wcf/sign')
  async signWCF(
    @Param('token') token: string,
    @Body() dto: SignWCFDto
  ): Promise<WorkCompletionForm> {
    // Process WCF signature
  }

  @Post(':token/evaluate')
  async submitEvaluation(
    @Param('token') token: string,
    @Body() dto: ServiceEvaluationDto
  ): Promise<ServiceEvaluation> {
    // Submit service evaluation
  }

  @Get(':token/photos')
  async getPhotos(
    @Param('token') token: string
  ): Promise<MediaFile[]> {
    // Return service photos (before/after)
  }

  @Post(':token/product-arrived')
  async confirmProductArrival(
    @Param('token') token: string,
    @Body() dto: ProductArrivalDto
  ): Promise<void> {
    // Mark products as arrived
  }

  @Post(':token/issue')
  async reportIssue(
    @Param('token') token: string,
    @Body() dto: IssueReportDto
  ): Promise<Issue> {
    // Create issue report
  }
}
```

### 2.2 Customer Portal Components

```typescript
// web/src/experiences/customer/CustomerPortal.tsx

import { useParams } from 'react-router-dom';
import { useCustomerAccess } from '../../hooks/useCustomerAccess';

export function CustomerPortal() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const { serviceOrder, isLoading, error } = useCustomerAccess(accessToken);

  if (isLoading) return <CustomerLoadingSkeleton />;
  if (error) return <CustomerAccessError error={error} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with service info */}
      <CustomerHeader serviceOrder={serviceOrder} />
      
      {/* Main content - route based */}
      <main className="container mx-auto px-4 py-8">
        <Outlet context={{ serviceOrder, accessToken }} />
      </main>
      
      {/* Help button */}
      <CustomerHelpButton accessToken={accessToken} />
    </div>
  );
}

// Status Page
export function StatusPage() {
  const { serviceOrder } = useOutletContext<CustomerContext>();

  return (
    <div className="space-y-6">
      {/* Status Timeline */}
      <ServiceStatusTimeline 
        currentState={serviceOrder.state}
        stateHistory={serviceOrder.stateHistory}
      />

      {/* Service Details Card */}
      <ServiceDetailsCard serviceOrder={serviceOrder} />

      {/* Scheduled Date */}
      {serviceOrder.scheduledDate && (
        <ScheduledDateCard 
          date={serviceOrder.scheduledDate}
          timeSlot={serviceOrder.scheduledTimeSlot}
        />
      )}

      {/* Product Delivery Status */}
      {serviceOrder.lineItems?.some(li => li.lineType === 'PRODUCT') && (
        <ProductDeliveryCard 
          items={serviceOrder.lineItems.filter(li => li.lineType === 'PRODUCT')}
          onConfirmArrival={handleConfirmArrival}
        />
      )}

      {/* Action Buttons */}
      <CustomerActions serviceOrder={serviceOrder} />
    </div>
  );
}
```

### 2.3 Customer Status Timeline Component

```typescript
// web/src/components/shared/ServiceStatusTimeline.tsx

interface StatusStep {
  state: ServiceOrderState;
  label: string;
  description: string;
  icon: React.ComponentType;
}

const STATUS_STEPS: StatusStep[] = [
  { state: 'CREATED', label: 'Order Received', description: 'Your service request has been received', icon: CheckCircleIcon },
  { state: 'SCHEDULED', label: 'Scheduled', description: 'Service date confirmed', icon: CalendarIcon },
  { state: 'ASSIGNED', label: 'Technician Assigned', description: 'A qualified technician has been assigned', icon: UserIcon },
  { state: 'IN_PROGRESS', label: 'In Progress', description: 'Service is being performed', icon: WrenchIcon },
  { state: 'COMPLETED', label: 'Completed', description: 'Service completed successfully', icon: CheckCircleIcon },
];

export function ServiceStatusTimeline({ 
  currentState, 
  stateHistory 
}: ServiceStatusTimelineProps) {
  const currentIndex = STATUS_STEPS.findIndex(s => s.state === currentState);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-6">Service Progress</h2>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div 
          className="absolute left-6 top-0 w-0.5 bg-green-500 transition-all"
          style={{ height: `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="space-y-6">
          {STATUS_STEPS.map((step, index) => {
            const isComplete = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const historyEntry = stateHistory?.find(h => h.state === step.state);

            return (
              <div key={step.state} className="relative flex items-start">
                {/* Icon */}
                <div className={clsx(
                  'relative z-10 flex items-center justify-center w-12 h-12 rounded-full',
                  isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400',
                  isCurrent && 'ring-2 ring-green-500 ring-offset-2'
                )}>
                  <step.icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="ml-4 flex-1">
                  <h3 className={clsx(
                    'font-medium',
                    isComplete ? 'text-gray-900' : 'text-gray-500'
                  )}>
                    {step.label}
                  </h3>
                  <p className="text-sm text-gray-500">{step.description}</p>
                  {historyEntry && (
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(historyEntry.timestamp), 'PPp')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 3: Provider Experience

**Duration**: 4 weeks

### 3A: Provider Onboarding (2 weeks)

```typescript
// web/src/experiences/provider-onboarding/RegistrationWizard.tsx

const ONBOARDING_STEPS = [
  { id: 'company', title: 'Company Information', icon: BuildingIcon },
  { id: 'documents', title: 'Documents', icon: DocumentIcon },
  { id: 'competencies', title: 'Competencies', icon: BadgeIcon },
  { id: 'teams', title: 'Work Teams', icon: UsersIcon },
  { id: 'zones', title: 'Service Areas', icon: MapIcon },
  { id: 'schedule', title: 'Availability', icon: CalendarIcon },
  { id: 'contract', title: 'Contract', icon: ClipboardIcon },
];

export function ProviderRegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ProviderOnboardingData>({});

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <OnboardingHeader />

      {/* Progress */}
      <OnboardingProgress steps={ONBOARDING_STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="container mx-auto px-4 py-8">
        {currentStep === 0 && (
          <CompanyInfoStep data={formData} onComplete={handleStepComplete} />
        )}
        {currentStep === 1 && (
          <DocumentsStep data={formData} onComplete={handleStepComplete} />
        )}
        {currentStep === 2 && (
          <CompetenciesStep data={formData} onComplete={handleStepComplete} />
        )}
        {currentStep === 3 && (
          <WorkTeamsStep data={formData} onComplete={handleStepComplete} />
        )}
        {currentStep === 4 && (
          <ZonesStep data={formData} onComplete={handleStepComplete} />
        )}
        {currentStep === 5 && (
          <ScheduleStep data={formData} onComplete={handleStepComplete} />
        )}
        {currentStep === 6 && (
          <ContractStep data={formData} onComplete={handleFinalSubmit} />
        )}
      </div>
    </div>
  );
}
```

### 3B: Provider Cockpit (2 weeks)

```typescript
// web/src/experiences/provider/ProviderDashboard.tsx

export function ProviderDashboard() {
  const { provider } = useProviderContext();
  const { data: stats } = useProviderStats(provider.id);
  const { data: pendingJobs } = usePendingJobs(provider.id);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Stats */}
      <WelcomeCard provider={provider} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          title="Pending Jobs" 
          value={stats.pendingJobs}
          icon={ClockIcon}
          trend={stats.pendingJobsTrend}
        />
        <KPICard 
          title="This Month Revenue" 
          value={formatCurrency(stats.monthRevenue)}
          icon={CurrencyIcon}
          trend={stats.revenueTrend}
        />
        <KPICard 
          title="Average Rating" 
          value={stats.avgRating.toFixed(1)}
          icon={StarIcon}
          suffix="/5"
        />
        <KPICard 
          title="Completion Rate" 
          value={`${stats.completionRate}%`}
          icon={CheckCircleIcon}
        />
      </div>

      {/* Pending Job Offers */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">New Job Offers</h2>
          <Link to="/provider/jobs" className="text-green-600 text-sm">
            View All →
          </Link>
        </div>
        
        <div className="grid gap-4">
          {pendingJobs.map(job => (
            <JobOfferCard 
              key={job.id}
              job={job}
              onAccept={() => handleAccept(job.id)}
              onDecline={() => handleDecline(job.id)}
            />
          ))}
        </div>
      </section>

      {/* Today's Schedule */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Today's Schedule</h2>
        <TodaySchedule providerId={provider.id} />
      </section>

      {/* Financial Summary */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Financial Summary</h2>
        <FinancialSummaryCard stats={stats.financial} />
      </section>
    </div>
  );
}
```

---

## Phase 4: PSM Experience

**Duration**: 2 weeks

### 4.1 PSM Dashboard

```typescript
// web/src/experiences/psm/PSMDashboard.tsx

export function PSMDashboard() {
  const { data: pipelineStats } = usePipelineStats();
  const { data: coverageGaps } = useCoverageGaps();

  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard title="Leads" value={pipelineStats.leads} color="gray" />
        <KPICard title="In Contact" value={pipelineStats.inContact} color="blue" />
        <KPICard title="Documents" value={pipelineStats.documentsPhase} color="yellow" />
        <KPICard title="Verification" value={pipelineStats.verification} color="orange" />
        <KPICard title="Ready" value={pipelineStats.ready} color="green" />
      </div>

      {/* Pipeline Board (Kanban) */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Provider Pipeline</h2>
        <ProviderPipelineBoard />
      </section>

      {/* Coverage Gaps */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Coverage Gaps</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CoverageGapMap gaps={coverageGaps} />
          <CoverageGapList gaps={coverageGaps} />
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <PSMActivityFeed />
      </section>
    </div>
  );
}
```

### 4.2 Provider Pipeline Board (Kanban)

```typescript
// web/src/experiences/psm/ProviderPipeline.tsx

const PIPELINE_STAGES = [
  { id: 'lead', title: 'Lead', color: 'gray' },
  { id: 'contact', title: 'First Contact', color: 'blue' },
  { id: 'qualification', title: 'Qualification', color: 'indigo' },
  { id: 'documents', title: 'Documents', color: 'yellow' },
  { id: 'verification', title: 'Verification', color: 'orange' },
  { id: 'setup', title: 'Setup', color: 'purple' },
  { id: 'contract', title: 'Contract', color: 'pink' },
  { id: 'active', title: 'Active', color: 'green' },
];

export function ProviderPipelineBoard() {
  const { data: providers } = useProvidersByStage();
  const [draggedItem, setDraggedItem] = useState(null);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-[1200px]">
        {PIPELINE_STAGES.map(stage => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            providers={providers[stage.id] || []}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {providers[stage.id]?.map(provider => (
              <ProviderPipelineCard
                key={provider.id}
                provider={provider}
                onDragStart={() => setDraggedItem(provider)}
              />
            ))}
          </PipelineColumn>
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 5: Seller Experience

**Duration**: 2 weeks

### 5.1 Availability Checker

```typescript
// web/src/experiences/seller/AvailabilityChecker.tsx

export function AvailabilityChecker() {
  const [searchParams, setSearchParams] = useState<AvailabilitySearchParams>({
    serviceType: null,
    postalCode: '',
    dateRange: { start: null, end: null },
  });
  const { data: slots, isLoading } = useAvailabilitySearch(searchParams);

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Check Availability</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ServiceTypeSelect
            value={searchParams.serviceType}
            onChange={(type) => setSearchParams(s => ({ ...s, serviceType: type }))}
          />
          <PostalCodeInput
            value={searchParams.postalCode}
            onChange={(code) => setSearchParams(s => ({ ...s, postalCode: code }))}
          />
          <DateRangePicker
            value={searchParams.dateRange}
            onChange={(range) => setSearchParams(s => ({ ...s, dateRange: range }))}
          />
          <Button onClick={handleSearch} disabled={!isValid}>
            Search
          </Button>
        </div>
      </div>

      {/* Results */}
      {slots && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Available Slots ({slots.length} found)
          </h2>
          
          <div className="grid gap-4">
            {slots.map(slot => (
              <AvailabilitySlotCard
                key={slot.id}
                slot={slot}
                onReserve={() => handleReserve(slot)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 6 & 7: Offer Manager & Admin

### 6.1 Service Catalog Management

```typescript
// web/src/experiences/catalog/ServiceCatalog.tsx

export function ServiceCatalog() {
  const { data: services, isLoading } = useServices();
  const [filters, setFilters] = useState<ServiceFilters>({});

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Services" value={services?.total} />
        <KPICard title="Active" value={services?.active} color="green" />
        <KPICard title="Draft" value={services?.draft} color="yellow" />
        <KPICard title="Deprecated" value={services?.deprecated} color="red" />
      </div>

      {/* Filters & Actions */}
      <div className="flex justify-between items-center">
        <ServiceFilters value={filters} onChange={setFilters} />
        <Link to="/catalog/services/new">
          <Button variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Service
          </Button>
        </Link>
      </div>

      {/* Service List */}
      <ServiceList services={services?.items} isLoading={isLoading} />
    </div>
  );
}
```

### 7.1 Admin User Management

```typescript
// web/src/experiences/admin/UserManagement.tsx

export function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard title="Total Users" value={users?.total} />
        <KPICard title="Active" value={users?.active} color="green" />
        <KPICard title="Operators" value={users?.byType?.INTERNAL} color="blue" />
        <KPICard title="Providers" value={users?.byType?.EXTERNAL_PROVIDER} color="purple" />
        <KPICard title="Technicians" value={users?.byType?.EXTERNAL_TECHNICIAN} color="orange" />
      </div>

      {/* User Table */}
      <DataTable
        columns={USER_COLUMNS}
        data={users?.items}
        isLoading={isLoading}
        onRowClick={(user) => navigate(`/admin/users/${user.id}`)}
        actions={[
          { label: 'Edit', onClick: handleEdit },
          { label: 'Deactivate', onClick: handleDeactivate, variant: 'danger' },
        ]}
      />
    </div>
  );
}
```

---

## Backend API Additions

### New Endpoints Required

```typescript
// Customer Portal APIs
POST   /api/v1/customer-portal/generate-access
GET    /api/v1/customer-portal/verify/:token
GET    /api/v1/customer-portal/:token/service-order
POST   /api/v1/customer-portal/:token/reschedule-request
POST   /api/v1/customer-portal/:token/contract/sign
POST   /api/v1/customer-portal/:token/wcf/sign
POST   /api/v1/customer-portal/:token/evaluate
GET    /api/v1/customer-portal/:token/photos
POST   /api/v1/customer-portal/:token/product-arrived
POST   /api/v1/customer-portal/:token/issue
GET    /api/v1/customer-portal/:token/chat
POST   /api/v1/customer-portal/:token/chat

// Provider Onboarding APIs
POST   /api/v1/provider-onboarding/register
POST   /api/v1/provider-onboarding/:id/documents
GET    /api/v1/provider-onboarding/:id/documents
POST   /api/v1/provider-onboarding/:id/competencies
POST   /api/v1/provider-onboarding/:id/teams
POST   /api/v1/provider-onboarding/:id/zones
POST   /api/v1/provider-onboarding/:id/schedule
POST   /api/v1/provider-onboarding/:id/contract/sign
GET    /api/v1/provider-onboarding/:id/status

// Provider Cockpit APIs
GET    /api/v1/provider-cockpit/dashboard
GET    /api/v1/provider-cockpit/jobs
GET    /api/v1/provider-cockpit/jobs/:id
POST   /api/v1/provider-cockpit/jobs/:id/accept
POST   /api/v1/provider-cockpit/jobs/:id/decline
GET    /api/v1/provider-cockpit/financial
GET    /api/v1/provider-cockpit/teams
GET    /api/v1/provider-cockpit/calendar

// PSM APIs
GET    /api/v1/psm/pipeline
GET    /api/v1/psm/pipeline/stats
POST   /api/v1/psm/pipeline/:id/stage
GET    /api/v1/psm/coverage-gaps
GET    /api/v1/psm/providers/:id/verification

// Seller APIs
GET    /api/v1/seller/availability
POST   /api/v1/seller/availability/reserve
GET    /api/v1/seller/projects
GET    /api/v1/seller/projects/:id
GET    /api/v1/seller/quotations
POST   /api/v1/seller/quotations
GET    /api/v1/seller/tv-reports

// Offer Manager APIs (mostly exist, need enhancements)
GET    /api/v1/service-catalog/stats
POST   /api/v1/service-catalog/:id/publish
POST   /api/v1/service-catalog/:id/deprecate

// Admin APIs
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id
GET    /api/v1/admin/roles
POST   /api/v1/admin/roles
GET    /api/v1/admin/audit-logs
GET    /api/v1/admin/config
PATCH  /api/v1/admin/config
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Role-based routing works for all 8 experiences
- [ ] Experience-specific layouts render correctly
- [ ] Permission-based UI hiding works
- [ ] Default route redirects work per role

### Phase 2 Complete When:
- [ ] Customer can access portal via deep-link
- [ ] Customer can view service status
- [ ] Customer can sign contract
- [ ] Customer can sign WCF
- [ ] Customer can submit evaluation
- [ ] Customer can request reschedule
- [ ] Customer can report issues

### Phase 3 Complete When:
- [ ] Provider can self-register
- [ ] Provider can complete onboarding wizard
- [ ] Provider can accept/decline jobs
- [ ] Provider can view financial summary
- [ ] Provider can manage teams
- [ ] Provider can view calendar

### Phase 4-7 Complete When:
- [ ] PSM can manage provider pipeline
- [ ] PSM can view coverage gaps
- [ ] Seller can check availability
- [ ] Seller can create quotations
- [ ] Offer Manager can manage catalog
- [ ] Admin can manage users and roles

---

## Next Steps

1. **Immediate**: Start Phase 1 foundation work
2. **Create layouts folder**: Build experience-specific layouts
3. **Update routing**: Implement ExperienceRouter
4. **Build Customer Portal**: High priority, direct revenue impact
5. **Parallel**: Continue mobile app development for Work Team

---

**Document Version**: 1.0
**Last Updated**: 2025-11-27
