# Yellow Grid Operator Web UX - Implementation Plan

**Document Version**: 1.0
**Created**: 2025-11-19
**Target Completion**: 6 weeks (30 working days)
**Team Size**: 1-2 engineers
**Based on**: Comprehensive UX Audit (2025-11-19)

---

## 📋 Executive Summary

### Objective
Implement 10 missing operator workflow features to achieve **100% coverage** of the Operator Cockpit API specification and critical business workflows.

### Current Status
- ✅ **Core Features**: 100% complete (7/7 features)
- ⚠️ **API Coverage**: 50% complete (4/8 sections)
- ❌ **Workflow Features**: 0% complete (0/10 features)
- 🎯 **Target**: 95%+ overall UX coverage

### Success Criteria
1. All 10 missing features implemented and tested
2. ≥80% unit test coverage for new code
3. E2E tests for critical workflows
4. Documentation updated
5. Production deployment ready

---

## 🎯 Feature Prioritization Matrix

| Priority | Feature | Business Impact | Technical Complexity | Effort (days) |
|----------|---------|----------------|---------------------|---------------|
| **P0** | Document & Notes Management | Critical | Medium | 3 |
| **P0** | Service Order Rescheduling | Critical | Low | 2 |
| **P0** | Go Exec Blocking Workflow | Critical | Medium | 2 |
| **P1** | Project Ownership Interface | High | Medium | 3 |
| **P1** | Date Negotiation Workflow | High | High | 4 |
| **P1** | Contract Bundling | High | Medium | 4 |
| **P2** | Contract Auto-Send Config | Medium | Low | 2 |
| **P2** | Rework Service Order Creation | Medium | Low | 2 |
| **P3** | Calendar Business Rules | Low | Low | 2 |
| **P3** | Service Order Status Tags | Low | Medium | 3 |

**Total Estimated Effort**: 27 days + 3 days buffer = **30 days (6 weeks)**

### Priority Definitions
- **P0 (Critical)**: Blocking for MVP operator workflow - implement first
- **P1 (High)**: Core operator features - required for production
- **P2 (Medium)**: Important but not blocking - nice to have
- **P3 (Low)**: UX polish and optimization - can be deferred

---

## 📅 6-Week Sprint Plan

### **Sprint 1 (Week 1): P0 Critical Features**
**Goal**: Implement blocking operator workflow features

**Days 1-3: Document & Notes Management**
- Day 1: Document upload component + API integration
- Day 2: Note creation form + document list view
- Day 3: Testing + integration

**Days 4-5: Service Order Rescheduling**
- Day 4: Reschedule modal + date/slot picker
- Day 5: API integration + notifications

**Sprint Deliverable**: ✅ Operators can upload documents and reschedule orders

---

### **Sprint 2 (Week 2): P0 Completion + P1 Start**
**Goal**: Complete critical features, start core workflows

**Days 6-7: Go Exec Blocking Workflow**
- Day 6: Check-in blocking notification UI
- Day 7: Manual override (derogation) interface + testing

**Days 8-10: Project Ownership Interface**
- Day 8: Responsible operator display + assignment mode
- Day 9: Workload visualization + manual reassignment
- Day 10: Testing + batch reassignment capability

**Sprint Deliverable**: ✅ Complete P0 features, 50% of P1 features

---

### **Sprint 3 (Week 3): P1 Core Workflows**
**Goal**: Implement complex operator workflows

**Days 11-14: Date Negotiation Workflow**
- Day 11: Negotiation round tracker component
- Day 12: Proposal/counter-proposal UI
- Day 13: 3-round limit enforcement + escalation
- Day 14: Integration testing + edge cases

**Sprint Deliverable**: ✅ Complete date negotiation workflow with 3-round limit

---

### **Sprint 4 (Week 4): P1 Completion**
**Goal**: Complete contract management features

**Days 15-18: Contract Bundling**
- Day 15: Multi-SO selection interface
- Day 16: Contract template picker + bundle creation
- Day 17: Send contract workflow + status tracking
- Day 18: Testing + reminder schedule integration

**Sprint Deliverable**: ✅ Complete P1 features, all core workflows functional

---

### **Sprint 5 (Week 5): P2 & P3 Features**
**Goal**: Implement remaining features and polish

**Days 19-20: Contract Auto-Send Configuration**
- Day 19: Auto-send toggle + delay configuration
- Day 20: Manual override + cancel auto-send

**Days 21-22: Rework Service Order Creation**
- Day 21: Rework creation modal + reason selection
- Day 22: Link to original SO + testing

**Days 23-24: Calendar Business Rules**
- Day 23: Sunday exclusion logic + Saturday AM-only
- Day 24: Provider-to-crew expansion + testing

**Sprint Deliverable**: ✅ Complete P2 features, 33% of P3 features

---

### **Sprint 6 (Week 6): P3 Completion + QA**
**Goal**: Final features, testing, and production readiness

**Days 25-27: Service Order Status Tags**
- Day 25: Tag calculation logic
- Day 26: Tag priority/precedence rules
- Day 27: UI integration + testing

**Days 28-30: Testing & Documentation**
- Day 28: Integration testing all new features
- Day 29: Unit test coverage (target: ≥80%)
- Day 30: Documentation update + deployment preparation

**Sprint Deliverable**: ✅ 100% feature completion, production-ready

---

## 🔧 Technical Implementation Details

### **Feature 1: Document & Notes Management** (P0 - 3 days)

#### Requirements
- Upload documents to service orders (photos, PDFs, contracts)
- Add text notes with type and visibility controls
- List/filter documents and notes
- Download/view documents

#### Technical Approach

**Files to Create**:
```
web/src/components/documents/
├── DocumentUpload.tsx           # File upload component
├── NoteForm.tsx                 # Note creation form
├── DocumentList.tsx             # Document/note list display
└── DocumentViewer.tsx           # Modal for viewing documents

web/src/services/
└── document-service.ts          # API client for documents
```

**API Integration**:
```typescript
// document-service.ts
class DocumentService {
  async uploadDocument(
    serviceOrderId: string,
    file: File,
    metadata: {
      documentType: 'NOTE' | 'PHOTO' | 'PDF' | 'CONTRACT' | 'INVOICE' | 'OTHER';
      title: string;
      description?: string;
    }
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', metadata.documentType);
    formData.append('title', metadata.title);
    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    return apiClient.post(
      `/cockpit/service-orders/${serviceOrderId}/documents`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  }

  async createNote(
    serviceOrderId: string,
    note: {
      noteType: 'GENERAL' | 'CUSTOMER_PREFERENCE' | 'TECHNICAL' | 'SAFETY';
      title: string;
      content: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
      visibility: 'ALL' | 'OPERATORS_ONLY' | 'PROVIDERS_ONLY';
    }
  ): Promise<Note> {
    return apiClient.post(
      `/cockpit/service-orders/${serviceOrderId}/notes`,
      note
    );
  }

  async getDocumentsAndNotes(serviceOrderId: string): Promise<{
    documents: Document[];
    notes: Note[];
    totalCount: number;
  }> {
    return apiClient.get(
      `/cockpit/service-orders/${serviceOrderId}/documents-and-notes`
    );
  }
}
```

**UI Components**:

```tsx
// DocumentUpload.tsx
export function DocumentUpload({ serviceOrderId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('PHOTO');
  const [title, setTitle] = useState('');

  const uploadMutation = useMutation({
    mutationFn: (data) => documentService.uploadDocument(serviceOrderId, file!, data),
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      queryClient.invalidateQueries(['documents', serviceOrderId]);
    },
  });

  return (
    <div className="card">
      <h3>Upload Document</h3>
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
        <option value="PHOTO">Photo</option>
        <option value="PDF">PDF</option>
        <option value="CONTRACT">Contract</option>
        <option value="INVOICE">Invoice</option>
        <option value="OTHER">Other</option>
      </select>
      <input
        type="text"
        placeholder="Document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={() => uploadMutation.mutate({ documentType, title })}>
        Upload
      </button>
    </div>
  );
}
```

**Integration Point**:
- Add "Documents & Notes" tab to ServiceOrderDetailPage.tsx
- Display document count badge in service order list

**Testing**:
- Unit tests: Upload validation, file type checking
- Integration tests: Full upload → list → view flow
- E2E test: Upload document to service order

**Acceptance Criteria**:
- ✅ Can upload photos, PDFs to service orders
- ✅ Can add notes with visibility controls
- ✅ Documents appear in list with download links
- ✅ File size validation (max 10MB)
- ✅ Supported file types enforced

---

### **Feature 2: Service Order Rescheduling** (P0 - 2 days)

#### Requirements
- Reschedule service order to new date/slot
- Optional provider reassignment
- Notify customer and provider
- Track reschedule reason and history

#### Technical Approach

**Files to Create**:
```
web/src/components/service-orders/
├── RescheduleModal.tsx          # Modal with date/slot picker
└── RescheduleHistory.tsx        # Show reschedule audit trail

web/src/services/
└── service-order-service.ts     # Add reschedule method
```

**API Integration**:
```typescript
// service-order-service.ts (extend existing)
class ServiceOrderService {
  async reschedule(
    serviceOrderId: string,
    data: {
      newDate: string;
      newSlot: 'AM' | 'PM';
      reason: string;
      reassignProvider: boolean;
      notifyCustomer: boolean;
      notifyProvider: boolean;
    }
  ): Promise<RescheduleResponse> {
    return apiClient.post(
      `/cockpit/service-orders/${serviceOrderId}/reschedule`,
      data
    );
  }
}
```

**UI Component**:
```tsx
// RescheduleModal.tsx
export function RescheduleModal({ serviceOrder, onClose }: Props) {
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState<'AM' | 'PM'>('AM');
  const [reason, setReason] = useState('');
  const [reassignProvider, setReassignProvider] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notifyProvider, setNotifyProvider] = useState(true);

  const rescheduleMutation = useMutation({
    mutationFn: (data) => serviceOrderService.reschedule(serviceOrder.id, data),
    onSuccess: () => {
      toast.success('Service order rescheduled successfully');
      queryClient.invalidateQueries(['service-order', serviceOrder.id]);
      onClose();
    },
  });

  return (
    <div className="modal">
      <h2>Reschedule Service Order</h2>

      <div className="form-group">
        <label>Current Schedule</label>
        <p>{formatDate(serviceOrder.scheduledDate)} - {serviceOrder.scheduledSlot}</p>
      </div>

      <div className="form-group">
        <label>New Date *</label>
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')}
        />
      </div>

      <div className="form-group">
        <label>New Slot *</label>
        <select value={newSlot} onChange={(e) => setNewSlot(e.target.value)}>
          <option value="AM">Morning (AM)</option>
          <option value="PM">Afternoon (PM)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rescheduling..."
        />
      </div>

      <div className="form-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={reassignProvider}
            onChange={(e) => setReassignProvider(e.target.checked)}
          />
          Reassign provider (find new provider)
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={notifyCustomer}
            onChange={(e) => setNotifyCustomer(e.target.checked)}
          />
          Notify customer
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={notifyProvider}
            onChange={(e) => setNotifyProvider(e.target.checked)}
          />
          Notify provider
        </label>
      </div>

      <div className="modal-actions">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => rescheduleMutation.mutate({
            newDate,
            newSlot,
            reason,
            reassignProvider,
            notifyCustomer,
            notifyProvider,
          })}
          disabled={!newDate || !reason}
          className="btn btn-primary"
        >
          Reschedule
        </button>
      </div>
    </div>
  );
}
```

**Integration Point**:
- Add "Reschedule" button to ServiceOrderDetailPage.tsx
- Show reschedule history in timeline

**Testing**:
- Unit tests: Date validation, reason required
- Integration tests: Reschedule API call + response handling
- E2E test: Complete reschedule workflow

**Acceptance Criteria**:
- ✅ Can reschedule to future date/slot
- ✅ Reason is mandatory
- ✅ Notification toggles work
- ✅ Provider reassignment option available
- ✅ Reschedule history tracked

---

### **Feature 3: Go Exec Blocking Workflow** (P0 - 2 days)

#### Requirements
- Display check-in blocking notification when Go Exec = NOK
- Manual override (derogation) interface for operators
- Alert visualization for blocked orders
- Eve-of-execution check status display

#### Technical Approach

**Files to Create**:
```
web/src/components/service-orders/
├── GoExecStatusBanner.tsx       # Blocking notification banner
├── GoExecOverrideModal.tsx      # Manual override interface
└── GoExecChecklist.tsx          # Payment/delivery checklist display
```

**API Integration**:
```typescript
// service-order-service.ts (extend existing)
class ServiceOrderService {
  async checkGoExecution(serviceOrderId: string): Promise<GoExecStatus> {
    return apiClient.post(`/service-orders/${serviceOrderId}/check-go-exec`);
  }

  async overrideGoExec(
    serviceOrderId: string,
    data: {
      reason: string;
      authorizationLevel: 'SUPERVISOR' | 'MANAGER';
    }
  ): Promise<void> {
    return apiClient.post(`/service-orders/${serviceOrderId}/override-go-exec`, data);
  }
}
```

**UI Component**:
```tsx
// GoExecStatusBanner.tsx
export function GoExecStatusBanner({ serviceOrder }: Props) {
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  if (serviceOrder.goExecutionStatus === 'OK') {
    return (
      <div className="alert alert-success">
        <CheckCircle className="w-5 h-5" />
        <span>Go Execution: OK - Ready for check-in</span>
      </div>
    );
  }

  if (serviceOrder.goExecutionStatus === 'MANUAL_OVERRIDE') {
    return (
      <div className="alert alert-warning">
        <AlertTriangle className="w-5 h-5" />
        <span>
          Go Execution: Manual Override by {serviceOrder.goExecutionOverriddenBy}
        </span>
        <small className="text-xs">Reason: {serviceOrder.goExecutionOverrideReason}</small>
      </div>
    );
  }

  return (
    <div className="alert alert-error">
      <XCircle className="w-5 h-5" />
      <div className="flex-1">
        <strong>Go Execution: BLOCKED</strong>
        <div className="text-sm mt-1">
          {serviceOrder.goExecutionStatus === 'BLOCKED_PAYMENT' && (
            <p>❌ Payment not confirmed - check payment system</p>
          )}
          {serviceOrder.goExecutionStatus === 'BLOCKED_DELIVERY' && (
            <p>❌ Products not delivered - check delivery status</p>
          )}
          <p className="text-xs mt-1">
            Check-in will be blocked until resolved or manually overridden
          </p>
        </div>
      </div>
      <button
        onClick={() => setShowOverrideModal(true)}
        className="btn btn-sm btn-warning"
      >
        Manual Override
      </button>

      {showOverrideModal && (
        <GoExecOverrideModal
          serviceOrder={serviceOrder}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </div>
  );
}

// GoExecOverrideModal.tsx
export function GoExecOverrideModal({ serviceOrder, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [authLevel, setAuthLevel] = useState<'SUPERVISOR' | 'MANAGER'>('SUPERVISOR');

  const overrideMutation = useMutation({
    mutationFn: (data) => serviceOrderService.overrideGoExec(serviceOrder.id, data),
    onSuccess: () => {
      toast.success('Go Execution override applied');
      queryClient.invalidateQueries(['service-order', serviceOrder.id]);
      onClose();
    },
  });

  return (
    <div className="modal">
      <h2>Manual Go Execution Override</h2>

      <div className="alert alert-warning mb-4">
        <AlertTriangle className="w-5 h-5" />
        <span>
          This will allow check-in despite blocking conditions. Use with caution.
        </span>
      </div>

      <div className="form-group">
        <label>Blocking Reason</label>
        <p className="text-sm text-gray-600">
          {serviceOrder.goExecutionStatus === 'BLOCKED_PAYMENT' && 'Payment not confirmed'}
          {serviceOrder.goExecutionStatus === 'BLOCKED_DELIVERY' && 'Products not delivered'}
        </p>
      </div>

      <div className="form-group">
        <label>Override Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why manual override is necessary..."
          required
        />
      </div>

      <div className="form-group">
        <label>Authorization Level *</label>
        <select value={authLevel} onChange={(e) => setAuthLevel(e.target.value)}>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="MANAGER">Manager</option>
        </select>
      </div>

      <div className="modal-actions">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => overrideMutation.mutate({ reason, authorizationLevel: authLevel })}
          disabled={!reason || reason.length < 10}
          className="btn btn-warning"
        >
          Apply Override
        </button>
      </div>
    </div>
  );
}
```

**Integration Point**:
- Add GoExecStatusBanner to ServiceOrderDetailPage.tsx (top of page)
- Show Go Exec checklist in sidebar
- Display override history in timeline

**Testing**:
- Unit tests: Status rendering logic
- Integration tests: Override API call
- E2E test: Override workflow + audit trail

**Acceptance Criteria**:
- ✅ Blocking banner displays for NOK status
- ✅ Manual override requires reason (min 10 chars)
- ✅ Authorization level tracked
- ✅ Override appears in audit trail
- ✅ OK status shows green banner

---

### **Feature 4: Project Ownership Interface** (P1 - 3 days)

#### Requirements
- Display responsible operator per project
- Show AUTO/MANUAL assignment mode
- Workload visualization (hours per operator)
- Manual reassignment interface
- Batch reassignment capability

#### Technical Approach

**Files to Create**:
```
web/src/pages/projects/
├── ProjectsPage.tsx             # NEW: Projects list page
├── ProjectDetailPage.tsx        # NEW: Project detail with ownership
└── ProjectOwnershipPanel.tsx    # Ownership management panel

web/src/components/projects/
├── OperatorWorkloadChart.tsx    # Workload visualization
├── ReassignOperatorModal.tsx    # Reassignment modal
└── BatchReassignModal.tsx       # Batch reassignment

web/src/services/
└── project-service.ts           # NEW: Project API client
```

**API Integration**:
```typescript
// project-service.ts (NEW)
class ProjectService {
  async getAll(filters?: {
    countryCode?: string;
    responsibleOperatorId?: string;
    status?: ProjectStatus;
  }): Promise<PaginatedResponse<Project>> {
    return apiClient.get('/projects', { params: filters });
  }

  async getById(projectId: string): Promise<Project> {
    return apiClient.get(`/projects/${projectId}`);
  }

  async assignOperator(
    projectId: string,
    operatorId: string,
    mode: 'AUTO' | 'MANUAL'
  ): Promise<void> {
    return apiClient.post(`/projects/${projectId}/assign-operator`, {
      operatorId,
      assignmentMode: mode,
    });
  }

  async batchReassign(
    projectIds: string[],
    operatorId: string
  ): Promise<void> {
    return apiClient.post('/projects/batch-reassign', {
      projectIds,
      operatorId,
    });
  }

  async getOperatorWorkload(countryCode?: string): Promise<OperatorWorkload[]> {
    return apiClient.get('/projects/operator-workload', {
      params: { countryCode },
    });
  }
}
```

**UI Components**:

```tsx
// ProjectOwnershipPanel.tsx
export function ProjectOwnershipPanel({ project }: Props) {
  const [showReassign, setShowReassign] = useState(false);

  const { data: workload } = useQuery({
    queryKey: ['operator-workload', project.countryCode],
    queryFn: () => projectService.getOperatorWorkload(project.countryCode),
  });

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Project Ownership</h3>

      <div className="space-y-4">
        {/* Current Owner */}
        <div>
          <label className="text-sm text-gray-600">Responsible Operator</label>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <span className="font-medium">
                {project.responsibleOperator?.name || 'Unassigned'}
              </span>
            </div>
            <button
              onClick={() => setShowReassign(true)}
              className="btn btn-sm btn-secondary"
            >
              Reassign
            </button>
          </div>
        </div>

        {/* Assignment Mode */}
        <div>
          <label className="text-sm text-gray-600">Assignment Mode</label>
          <div className="mt-1">
            <span className={clsx(
              'badge',
              project.assignmentMode === 'AUTO' ? 'badge-success' : 'badge-warning'
            )}>
              {project.assignmentMode}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {project.assignmentMode === 'AUTO'
                ? 'Automatically assigned by workload balancing'
                : 'Manually assigned by supervisor'}
            </p>
          </div>
        </div>

        {/* Workload */}
        <div>
          <label className="text-sm text-gray-600">Project Workload</label>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{project.workloadHours}h</span>
            <span className="text-xs text-gray-500">
              ({project.serviceOrderCount} service orders)
            </span>
          </div>
        </div>

        {/* Assignment History */}
        <div>
          <label className="text-sm text-gray-600">Assignment History</label>
          <div className="text-xs text-gray-500 mt-1">
            Assigned {formatDistanceToNow(new Date(project.assignedAt!))} ago
            {project.assignedBy && ` by ${project.assignedBy}`}
          </div>
        </div>

        {/* Workload Visualization */}
        {workload && (
          <div>
            <label className="text-sm text-gray-600 mb-2 block">
              Operator Workload Distribution
            </label>
            <OperatorWorkloadChart data={workload} />
          </div>
        )}
      </div>

      {showReassign && (
        <ReassignOperatorModal
          project={project}
          workload={workload || []}
          onClose={() => setShowReassign(false)}
        />
      )}
    </div>
  );
}

// OperatorWorkloadChart.tsx
export function OperatorWorkloadChart({ data }: Props) {
  const maxHours = Math.max(...data.map(d => d.totalWorkloadHours));

  return (
    <div className="space-y-2">
      {data.map((operator) => (
        <div key={operator.id}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">{operator.name}</span>
            <span className="text-gray-600">
              {operator.totalWorkloadHours}h ({operator.projectCount} projects)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={clsx(
                'h-2 rounded-full transition-all',
                operator.totalWorkloadHours < maxHours * 0.7
                  ? 'bg-green-500'
                  : operator.totalWorkloadHours < maxHours * 0.9
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              )}
              style={{
                width: `${(operator.totalWorkloadHours / maxHours) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Integration Point**:
- Add "Projects" menu item to navigation
- Create new routes: `/projects`, `/projects/:id`
- Add project ownership panel to ProjectDetailPage
- Show responsible operator in service order detail

**Testing**:
- Unit tests: Workload calculation, assignment logic
- Integration tests: Assign/reassign API calls
- E2E test: Complete reassignment workflow

**Acceptance Criteria**:
- ✅ Projects list shows responsible operator
- ✅ Workload visualization displays correctly
- ✅ Can reassign projects manually
- ✅ Batch reassignment works for multiple projects
- ✅ AUTO mode uses workload balancing

---

### **Feature 5: Date Negotiation Workflow** (P1 - 4 days)

#### Requirements
- Track customer-provider date negotiations
- Enforce 3-round limit
- Escalate to operator after 3 failed rounds
- Create task for manual intervention
- Display negotiation history

#### Technical Approach

**Files to Create**:
```
web/src/components/assignments/
├── DateNegotiationPanel.tsx     # Main negotiation interface
├── NegotiationRoundCard.tsx     # Single round display
├── ProposeDateModal.tsx         # Counter-proposal modal
└── EscalationAlert.tsx          # 3-round limit alert

web/src/services/
└── negotiation-service.ts       # NEW: Negotiation API client
```

**Data Model**:
```typescript
interface DateNegotiation {
  id: string;
  serviceOrderId: string;
  providerId: string;
  rounds: NegotiationRound[];
  maxRounds: number; // = 3
  status: 'IN_PROGRESS' | 'AGREED' | 'ESCALATED';
  createdAt: string;
  resolvedAt?: string;
}

interface NegotiationRound {
  roundNumber: number;
  initiator: 'PROVIDER' | 'CUSTOMER';
  proposedDate: string;
  proposedSlot: 'AM' | 'PM';
  response: 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED' | 'PENDING';
  counterProposalDate?: string;
  counterProposalSlot?: 'AM' | 'PM';
  respondedBy?: string;
  respondedAt?: string;
  timestamp: string;
}
```

**API Integration**:
```typescript
// negotiation-service.ts (NEW)
class NegotiationService {
  async getNegotiation(serviceOrderId: string): Promise<DateNegotiation> {
    return apiClient.get(`/service-orders/${serviceOrderId}/date-negotiation`);
  }

  async acceptProposal(
    negotiationId: string,
    roundNumber: number
  ): Promise<void> {
    return apiClient.post(
      `/negotiations/${negotiationId}/rounds/${roundNumber}/accept`
    );
  }

  async rejectProposal(
    negotiationId: string,
    roundNumber: number,
    reason?: string
  ): Promise<void> {
    return apiClient.post(
      `/negotiations/${negotiationId}/rounds/${roundNumber}/reject`,
      { reason }
    );
  }

  async counterPropose(
    negotiationId: string,
    roundNumber: number,
    data: {
      newDate: string;
      newSlot: 'AM' | 'PM';
      message?: string;
    }
  ): Promise<void> {
    return apiClient.post(
      `/negotiations/${negotiationId}/rounds/${roundNumber}/counter-propose`,
      data
    );
  }

  async escalateToOperator(negotiationId: string): Promise<void> {
    return apiClient.post(`/negotiations/${negotiationId}/escalate`);
  }
}
```

**UI Component**:
```tsx
// DateNegotiationPanel.tsx
export function DateNegotiationPanel({ serviceOrder }: Props) {
  const { data: negotiation, isLoading } = useQuery({
    queryKey: ['negotiation', serviceOrder.id],
    queryFn: () => negotiationService.getNegotiation(serviceOrder.id),
  });

  if (isLoading) return <div>Loading negotiation...</div>;
  if (!negotiation) return null;

  const currentRound = negotiation.rounds[negotiation.rounds.length - 1];
  const roundsRemaining = negotiation.maxRounds - negotiation.rounds.length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Date Negotiation</h3>
        <span className={clsx(
          'badge',
          negotiation.status === 'AGREED' && 'badge-success',
          negotiation.status === 'IN_PROGRESS' && 'badge-warning',
          negotiation.status === 'ESCALATED' && 'badge-error'
        )}>
          {negotiation.status}
        </span>
      </div>

      {/* Round Counter */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            Round {negotiation.rounds.length} of {negotiation.maxRounds}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={clsx(
              'h-2 rounded-full transition-all',
              roundsRemaining > 1 ? 'bg-green-500' : 'bg-red-500'
            )}
            style={{
              width: `${(negotiation.rounds.length / negotiation.maxRounds) * 100}%`,
            }}
          />
        </div>
        {roundsRemaining === 0 && negotiation.status === 'IN_PROGRESS' && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Maximum rounds reached - will escalate if not agreed
          </p>
        )}
      </div>

      {/* Escalation Alert */}
      {negotiation.status === 'ESCALATED' && (
        <EscalationAlert negotiation={negotiation} />
      )}

      {/* Negotiation Rounds */}
      <div className="space-y-3">
        {negotiation.rounds.map((round, index) => (
          <NegotiationRoundCard
            key={round.roundNumber}
            round={round}
            isLatest={index === negotiation.rounds.length - 1}
            negotiation={negotiation}
          />
        ))}
      </div>
    </div>
  );
}

// NegotiationRoundCard.tsx
export function NegotiationRoundCard({ round, isLatest, negotiation }: Props) {
  const [showCounterPropose, setShowCounterPropose] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => negotiationService.acceptProposal(
      negotiation.id,
      round.roundNumber
    ),
    onSuccess: () => {
      toast.success('Proposal accepted');
      queryClient.invalidateQueries(['negotiation', negotiation.serviceOrderId]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => negotiationService.rejectProposal(
      negotiation.id,
      round.roundNumber
    ),
    onSuccess: () => {
      toast.success('Proposal rejected');
      queryClient.invalidateQueries(['negotiation', negotiation.serviceOrderId]);
    },
  });

  return (
    <div className={clsx(
      'border rounded-lg p-4',
      isLatest && round.response === 'PENDING' && 'border-primary-500 bg-primary-50'
    )}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-gray-500">
            Round {round.roundNumber}
          </span>
          <p className="text-sm text-gray-600 mt-1">
            Proposed by {round.initiator === 'PROVIDER' ? 'Provider' : 'Customer'}
          </p>
        </div>
        <span className={clsx(
          'badge badge-sm',
          round.response === 'ACCEPTED' && 'badge-success',
          round.response === 'REJECTED' && 'badge-error',
          round.response === 'COUNTER_PROPOSED' && 'badge-warning',
          round.response === 'PENDING' && 'badge-info'
        )}>
          {round.response}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs text-gray-500">Proposed Date</label>
          <p className="text-sm font-medium">
            {format(new Date(round.proposedDate), 'MMM dd, yyyy')}
          </p>
        </div>
        <div>
          <label className="text-xs text-gray-500">Slot</label>
          <p className="text-sm font-medium">{round.proposedSlot}</p>
        </div>
      </div>

      {round.counterProposalDate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
          <p className="text-xs text-yellow-800 mb-1">Counter Proposal:</p>
          <p className="text-sm font-medium">
            {format(new Date(round.counterProposalDate), 'MMM dd, yyyy')} - {round.counterProposalSlot}
          </p>
        </div>
      )}

      {/* Actions for pending rounds */}
      {isLatest && round.response === 'PENDING' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => acceptMutation.mutate()}
            className="btn btn-sm btn-success flex-1"
          >
            Accept
          </button>
          <button
            onClick={() => rejectMutation.mutate()}
            className="btn btn-sm btn-error flex-1"
          >
            Reject
          </button>
          {negotiation.rounds.length < negotiation.maxRounds && (
            <button
              onClick={() => setShowCounterPropose(true)}
              className="btn btn-sm btn-warning flex-1"
            >
              Counter Propose
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        {formatDistanceToNow(new Date(round.timestamp))} ago
      </p>

      {showCounterPropose && (
        <ProposeDateModal
          negotiation={negotiation}
          roundNumber={round.roundNumber}
          onClose={() => setShowCounterPropose(false)}
        />
      )}
    </div>
  );
}

// EscalationAlert.tsx
export function EscalationAlert({ negotiation }: Props) {
  return (
    <div className="alert alert-error mb-4">
      <AlertTriangle className="w-5 h-5" />
      <div className="flex-1">
        <strong>Negotiation Escalated</strong>
        <p className="text-sm mt-1">
          No agreement reached after {negotiation.maxRounds} rounds.
          A task has been created for manual operator intervention.
        </p>
        <div className="flex gap-2 mt-2">
          <Link
            to={`/tasks?filter=DATE_NEGOTIATION_FAILED&serviceOrderId=${negotiation.serviceOrderId}`}
            className="btn btn-sm btn-secondary"
          >
            View Task
          </Link>
          <Link
            to={`/service-orders/${negotiation.serviceOrderId}`}
            className="btn btn-sm btn-primary"
          >
            Go to Service Order
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Integration Point**:
- Add DateNegotiationPanel to AssignmentDetailPage.tsx
- Show negotiation status badge in assignments list
- Create task when escalated

**Testing**:
- Unit tests: Round counting, 3-round limit enforcement
- Integration tests: Accept/reject/counter-propose flows
- E2E test: Complete 3-round negotiation → escalation

**Acceptance Criteria**:
- ✅ Tracks negotiation rounds (1/3, 2/3, 3/3)
- ✅ Enforces 3-round maximum
- ✅ Escalates to operator after 3rd round
- ✅ Creates task for manual intervention
- ✅ Shows complete negotiation history
- ✅ Accept/reject/counter-propose actions work

---

### **Feature 6-10: Condensed Implementation Guide**

Due to length constraints, here's a condensed guide for remaining features:

#### **Feature 6: Contract Bundling** (P1 - 4 days)
**Files**: `ContractBundleModal.tsx`, `BundleTemplateSelector.tsx`, `BundleSummary.tsx`
**Key APIs**: `POST /cockpit/contracts/bundles`, `POST /bundles/{id}/send`
**UI Flow**: Multi-select SOs → Choose template → Review bundle → Send to customer

#### **Feature 7: Contract Auto-Send Config** (P2 - 2 days)
**Files**: `AutoSendConfig.tsx`, `AutoSendSchedule.tsx`
**Key APIs**: `POST /service-orders/{id}/contract/auto-send`, `DELETE /auto-send`
**UI Flow**: Toggle auto-send → Set delay (2h default) → Schedule display

#### **Feature 8: Rework Service Order Creation** (P2 - 2 days)
**Files**: `CreateReworkModal.tsx`
**Key APIs**: `POST /service-orders/{id}/rework`
**UI Flow**: Click "Create Rework" → Select reason → Auto-populate from original SO

#### **Feature 9: Calendar Business Rules** (P3 - 2 days)
**Files**: Modify existing `CalendarPage.tsx`, `AvailabilityHeatmap.tsx`
**Changes**: Filter out Sundays, Saturday PM slots, add crew expansion toggle

#### **Feature 10: Service Order Status Tags** (P3 - 3 days)
**Files**: `StatusTagBadge.tsx`, `TagCalculator.ts`
**Logic**: Implement priority rules (WCF > GO_EXEC > CONTRACT), show only one tag

---

## 🧪 Testing Strategy

### Unit Testing (Days 28-29)
**Target Coverage**: ≥80% for new code

**Test Files to Create**:
```
web/src/components/documents/__tests__/
├── DocumentUpload.test.tsx
├── NoteForm.test.tsx
└── DocumentList.test.tsx

web/src/components/service-orders/__tests__/
├── RescheduleModal.test.tsx
├── GoExecStatusBanner.test.tsx
└── GoExecOverrideModal.test.tsx

web/src/components/projects/__tests__/
├── ProjectOwnershipPanel.test.tsx
├── OperatorWorkloadChart.test.tsx
└── ReassignOperatorModal.test.tsx

web/src/components/assignments/__tests__/
├── DateNegotiationPanel.test.tsx
├── NegotiationRoundCard.test.tsx
└── ProposeDateModal.test.tsx

web/src/services/__tests__/
├── document-service.test.ts
├── project-service.test.ts
└── negotiation-service.test.ts
```

**Key Test Scenarios**:
- ✅ Form validation (required fields, file types, date ranges)
- ✅ API error handling (network errors, 400/500 responses)
- ✅ Loading states display correctly
- ✅ Success notifications appear
- ✅ Query cache invalidation after mutations
- ✅ Conditional rendering (permissions, status-based UI)

### Integration Testing (Day 29)
**Test Critical Workflows**:
1. Upload document → View in list → Download
2. Reschedule service order → Verify notifications sent
3. Go Exec override → Check audit trail
4. Assign project → Verify workload updates
5. 3-round negotiation → Escalation → Task creation
6. Contract bundle → Send → Track status

### E2E Testing (Day 30)
**Tool**: Playwright or Cypress

**Test Scenarios**:
```typescript
// e2e/operator-workflows.spec.ts
test('Complete operator workflow: Document upload to service order', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'operator@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // 2. Navigate to service order
  await page.click('text=Service Orders');
  await page.click('text=SO-2025-001234');

  // 3. Upload document
  await page.click('text=Documents & Notes');
  await page.setInputFiles('input[type="file"]', './test-fixtures/document.pdf');
  await page.fill('[name="title"]', 'Installation Plan');
  await page.selectOption('[name="documentType"]', 'PDF');
  await page.click('text=Upload');

  // 4. Verify document appears
  await expect(page.locator('text=Installation Plan')).toBeVisible();
});

test('Complete date negotiation with 3-round escalation', async ({ page }) => {
  // ... implement full negotiation workflow
});
```

---

## 📦 Deployment & Rollout Plan

### Pre-Deployment Checklist (Day 30)

**Code Quality**:
- [ ] All features implemented and tested
- [ ] Unit test coverage ≥80%
- [ ] E2E tests passing
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Production build successful (`npm run build`)

**Documentation**:
- [ ] IMPLEMENTATION_STATUS.md updated to 100%
- [ ] API integration documented
- [ ] Component usage examples added
- [ ] CHANGELOG.md updated with new features

**Infrastructure**:
- [ ] Environment variables configured
- [ ] Backend API endpoints deployed
- [ ] Database migrations applied
- [ ] Media storage (GCS) configured
- [ ] CDN configured for static assets

### Deployment Strategy

**Phase 1: Staging Deployment** (Week 6, Day 1)
- Deploy to staging environment
- Run smoke tests
- Internal QA review

**Phase 2: Beta Testing** (Week 6, Days 2-3)
- Select 2-3 operators for beta testing
- Monitor error logs
- Collect feedback
- Fix critical bugs

**Phase 3: Production Deployment** (Week 6, Day 4)
- Deploy to production (off-peak hours)
- Enable features gradually (feature flags)
- Monitor performance metrics
- 24h on-call support

**Phase 4: Rollout** (Week 6, Day 5)
- Enable for all operators
- Send training materials
- Monitor adoption metrics
- Collect user feedback

---

## 📊 Success Metrics

### Technical Metrics
- **Test Coverage**: ≥80% unit test coverage ✅
- **Build Time**: <10 minutes ✅
- **Bundle Size**: <500KB (excluding vendors) ✅
- **Lighthouse Score**: ≥90 (Performance, Accessibility)

### User Experience Metrics
- **Feature Adoption**: ≥70% of operators use new features within 2 weeks
- **Task Completion Time**: 20% reduction in common operator tasks
- **Error Rate**: <2% API error rate
- **User Satisfaction**: ≥4.0/5.0 CSAT score

### Business Metrics
- **Operator Efficiency**: 15% increase in service orders processed per operator
- **Rescheduling Reduction**: 10% fewer rescheduled orders (better planning)
- **Contract Signing Time**: 25% faster contract completion
- **Escalation Reduction**: 30% fewer manual escalations (date negotiation automation)

---

## ⚠️ Risks & Mitigation

### Risk 1: Backend API Not Ready
**Impact**: HIGH
**Probability**: MEDIUM
**Mitigation**:
- Use mock API during development (MSW - Mock Service Worker)
- Define API contracts early (OpenAPI spec)
- Coordinate with backend team on timeline
- Implement feature flags to enable/disable features

### Risk 2: Complex State Management
**Impact**: MEDIUM
**Probability**: LOW
**Mitigation**:
- Use React Query for server state (already implemented)
- Keep client state minimal (Zustand if needed)
- Write comprehensive tests for state transitions
- Code reviews for complex workflows

### Risk 3: Timeline Slippage
**Impact**: MEDIUM
**Probability**: MEDIUM
**Mitigation**:
- Build P0 features first (fallback to partial delivery)
- Daily progress tracking
- Defer P3 features if needed
- Add 3-day buffer in timeline

### Risk 4: User Adoption Issues
**Impact**: LOW
**Probability**: LOW
**Mitigation**:
- Involve operators in beta testing
- Provide training materials (videos, docs)
- Implement intuitive UI/UX
- Collect and act on feedback quickly

---

## 📝 Appendix A: API Endpoints Summary

### New Endpoints Required

**Documents & Notes**:
- `POST /cockpit/service-orders/{id}/documents`
- `POST /cockpit/service-orders/{id}/notes`
- `GET /cockpit/service-orders/{id}/documents-and-notes`

**Rescheduling**:
- `POST /cockpit/service-orders/{id}/reschedule`

**Go Execution**:
- `POST /service-orders/{id}/check-go-exec`
- `POST /service-orders/{id}/override-go-exec`

**Project Ownership**:
- `GET /projects`
- `GET /projects/{id}`
- `POST /projects/{id}/assign-operator`
- `POST /projects/batch-reassign`
- `GET /projects/operator-workload`

**Date Negotiation**:
- `GET /service-orders/{id}/date-negotiation`
- `POST /negotiations/{id}/rounds/{roundNumber}/accept`
- `POST /negotiations/{id}/rounds/{roundNumber}/reject`
- `POST /negotiations/{id}/rounds/{roundNumber}/counter-propose`
- `POST /negotiations/{id}/escalate`

**Contract Bundling**:
- `POST /cockpit/contracts/bundles`
- `POST /cockpit/contracts/bundles/{id}/send`
- `GET /cockpit/contracts/bundles/{id}`

**Contract Auto-Send**:
- `POST /cockpit/service-orders/{id}/contract/auto-send`
- `DELETE /cockpit/service-orders/{id}/contract/auto-send`
- `POST /cockpit/service-orders/{id}/contract/send`

**Rework**:
- `POST /service-orders/{id}/rework`

---

## 📝 Appendix B: Component Hierarchy

```
App
├── AuthProvider
│   ├── LoginPage
│   ├── CallbackPage
│   └── ProtectedRoute
│       └── DashboardLayout
│           ├── Navigation
│           ├── Header
│           └── <Routes>
│               ├── DashboardPage
│               ├── ServiceOrdersPage
│               ├── ServiceOrderDetailPage
│               │   ├── GoExecStatusBanner ✨ NEW
│               │   ├── RescheduleButton ✨ NEW
│               │   │   └── RescheduleModal ✨ NEW
│               │   ├── DocumentsTab ✨ NEW
│               │   │   ├── DocumentUpload ✨ NEW
│               │   │   ├── NoteForm ✨ NEW
│               │   │   └── DocumentList ✨ NEW
│               │   └── StatusTagBadge ✨ NEW
│               ├── AssignmentsPage
│               ├── AssignmentDetailPage
│               │   └── DateNegotiationPanel ✨ NEW
│               │       ├── NegotiationRoundCard ✨ NEW
│               │       ├── ProposeDateModal ✨ NEW
│               │       └── EscalationAlert ✨ NEW
│               ├── ProjectsPage ✨ NEW
│               ├── ProjectDetailPage ✨ NEW
│               │   └── ProjectOwnershipPanel ✨ NEW
│               │       ├── OperatorWorkloadChart ✨ NEW
│               │       ├── ReassignOperatorModal ✨ NEW
│               │       └── BatchReassignModal ✨ NEW
│               ├── ProvidersPage
│               ├── CalendarPage (enhanced) ✨ UPDATED
│               ├── TasksPage
│               └── NotFoundPage
```

---

## 🎯 Next Steps

### Immediate Actions (This Week)
1. ✅ Review and approve this implementation plan
2. ✅ Assign engineers to sprint
3. ✅ Coordinate with backend team on API readiness
4. ✅ Set up project tracking (Jira/GitHub Issues)
5. ✅ Schedule daily standups

### Week 1 Kickoff
1. Sprint planning meeting
2. Backend API contract review
3. Begin P0 feature development
4. Set up test environment

### Weekly Cadence
- **Monday**: Sprint planning / week kickoff
- **Daily**: 15-min standup (progress, blockers)
- **Wednesday**: Mid-week check-in
- **Friday**: Demo completed features, retrospective

---

**Document Status**: Ready for Implementation
**Next Review**: Weekly sprint reviews
**Maintained By**: Engineering Team Lead
**Questions**: Contact development team via Slack #yellow-grid-dev

---

**END OF IMPLEMENTATION PLAN**
