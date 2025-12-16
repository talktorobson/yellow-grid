# Service Operator AI Cockpit – Frontend Specification

> **⚠️ IMPLEMENTATION STATUS: FUTURE FEATURE - NOT IMPLEMENTED**
> **Current Status**: 0% Complete
> **Priority**: Phase 5+ (Post-MVP)
> **Dependencies**: AI/ML infrastructure, Customer communication platform, Backend assistant API
> **Last Updated**: 2025-11-19
>
> **Note**: This specification describes an advanced AI-powered operator interface that is **not currently implemented**. The current production web app (`/web/`) implements a **traditional FSM operator interface** without AI assistant, customer chat, or advanced context-switching features.
>
> **What EXISTS today**: Basic operator cockpit with service orders, assignments, providers, calendar, and tasks.
> **What's MISSING**: AI assistant panel, customer communication drawer, context-aware workload triage, KPI highlights, advanced action board.

---

## Purpose
Define the UI/UX contract so a React + TypeScript engineer can implement the "CPC AI Assistant" cockpit that adapts to runtime context for service operators. The screen merges workload triage, AI co-pilot chat, and customer communications in a single workspace aligned with FSM visual identity.

## Tech Stack & Layout Constraints
- Target React 18 + TypeScript + Tailwind CSS in the existing operator web app shell (see stack in `documentation/architecture/02-technical-stack.md`).
- Layout is a full-height split view: fixed sidebar (64 px), fluid main column, floating customer chat panel.
- Use CSS Grid/Flexbox; all panels must support 1280 px+ desktops with graceful collapse to 1024 px (hide customer chat drawer by default).
- Color tokens should reuse the design system (navy `#1e3a8a`, slate `#1e293b`, semantic green/red/amber).

```
┌───────────────────────────────┬─────────────────────────────────────────┐
│ Sidebar (icons)               │ Main Column (header + content rows)     │
└───────────────────────────────┴─────────────────────────────────────────┘
                                  └── Floating customer chat drawer (right)
```

## Navigation Sidebar
- Vertical rail with icons: Dashboard, Tasks, Search, Alerts (badge), Chat (badge), Settings, Profile.
- Each `.sidebar-icon` supports active/hover states; badges show counts (red = blocking alerts, blue = new messages).
- On click, emit `onNavSelect(sectionId)` so parent route can switch context.

## Header & Global Context
- Header contains title (`Service Execution Cockpit`), current context badge (e.g., "Contracts & Signatures"), timezone chip, operator avatar, and quick icons (notifications, AI toggle, help).
- Provide a summary bar directly under the header containing:
  - Workload filter pills (`Today`, `Overdue`, `Upcoming`, `All`) with counts.
  - Search box (global search on projects/customers).
  - Date picker for calendar navigation.

State model:
```ts
type WorkloadContext = 'contracts' | 'assignment' | 'execution' | 'wcf' | 'alerts';
interface HeaderState {
  context: WorkloadContext;
  selectedFilter: 'today' | 'overdue' | 'upcoming' | 'all';
  timezone: string;
  pendingNotifications: number;
}
```
When `context` changes, update badge text/icon, refresh AI assistant prompt, and recalc the action board dataset.

## AI Assistant Panel
- Docked card on the left with:
  - Bot avatar, status (`Analyzing workload`, `Ready`, `Typing…`), and quick chips (e.g., "Daily summary", "Contracts", "Pro assignment").
  - Scrollable history area with alternating user/bot bubbles, timestamps, and action pills (e.g., "Call customer", "Assign Pro").
  - Composer with multiline input and microphone icon.
- Hook the send button to POST `/assistants/service-ops/messages` (payload: `message`, `context`, `selectedProjects`). Show typing indicator until response resolves.
- Provide helper `getSuggestedActions(ctx: WorkloadContext): ActionChip[]` for the dynamic chips.
- The assistant can emit structured replies containing:
```ts
interface AssistantResponse {
  text: string; // markdown
  highlights?: Array<{ projectId: string; label: string; severity: 'high'|'medium'|'low' }>;
  summary?: DailySummary;
}
```
Render `highlights` as clickable pills that sync selection in the action board.

## Action Board Grid
Three cards per row (wrap on smaller screens). Card template:
- Header: project ID + customer name + status pill.
- Body: metadata rows (value, scheduled window, pending issue) and timeline badges (e.g., "+72h", "Today 14:00").
- Footer: quick actions (call, WhatsApp, assign, approve cost) plus priority dots (red/yellow/green).

Data contract:
```ts
interface ActionItem {
  projectId: string;
  customerName: string;
  euroValue: number;
  stage: 'contract'|'assignment'|'execution'|'wcf'|'incident';
  dueAt: string; // ISO
  priority: 'critical'|'warning'|'normal';
  summary: string; // e.g., "Waiting customer signature"
  contacts: { channel: 'phone'|'whatsapp'|'email'; label: string; value: string }[];
}
```
Quick action buttons should call `onAction(actionType, item)` so modulized drawers (call assist, approve extra cost, etc.) can open.

## KPI Highlights
- Small horizontal cards summarizing counts (e.g., "Contracts pending (>72h)", "WCF pending", "Pro assignment needed").
- Each card shows total count, delta vs yesterday, and CTA ("View list"). Data originates from `/kpis/service-ops?context=...`.

## Daily Planner / Timeline
- Right column stack with:
  - "Next critical actions" timeline (time + action + CTA).
  - "Blocked workflows" list (count + explanation + support link).
  - "Field inventory" or "Parts awaiting" if context = execution.
- Provide `ContextWidgets` registry keyed by `WorkloadContext` to control which widgets render.

## Customer Communication Drawer
- Hidden by default; toggle via chat bubble icon in header.
- Contains two states:
  1. Conversation list with search/filter tabs (All, Unread, Pending, VIP). Each row displays channel badges (WhatsApp, SMS), last message preview, and SLA timer.
  2. Conversation detail with message history (left/right alignment for customer/agent), channel icons, attachments, and AI-suggested responses.
- Actions: "Mark as resolved", "Snooze", "Escalate". Trigger via callback props.
- Messaging API contract:
```ts
GET /conversations?status=pending
POST /conversations/{id}/messages { body, channel }
POST /conversations/{id}/status { status: 'resolved'|'pending'|'escalated' }
```

## Context-Sensitive Behavior
- Changing the main context should:
  - Update assistant opening prompt (e.g., `contextPrompts[context]`).
  - Swap the action board dataset to the relevant stage (contracts, assignments, etc.).
  - Adjust KPI cards (e.g., show "Urgent contracts" vs "Pros to assign").
  - Replace widgets in the right column via `ContextWidgets`.
- Maintain state in URL query (`?context=contracts&filter=overdue`) for shareability.

## Accessibility & Performance
- Ensure keyboard navigation across sidebar, action cards, assistant composer, and chat drawer.
- Provide ARIA labels for icons/badges (e.g., `aria-label="Alerts (3 new)"`).
- Lazy-load heavy panels (customer chat, AI history) after initial paint, but persist layout skeletons to avoid jumps.

## Integration Checklist
1. Implement `ServiceOperatorCockpit` route that fetches initial context, KPIs, and action items in parallel.
2. Connect assistant panel to backend conversation stream (WebSocket or SSE) for near-real-time updates.
3. Wire quick-action buttons to their respective mutations (assign pro, approve extra cost, log call) and emit toast confirmations.
4. Add feature flag (`featureFlags.cpcAiAssistant`) so rollout can be phased by tenant.
5. Telemetry: track context switches, assistant prompts, quick-action usage, and chat resolutions via existing analytics pipeline (`events/service-ops` topic).

## Wireframe References
### Desktop – Contracts Context
```
┌───────────────────────────────┬─────────────────────────────────────────────────────────────┐
│ Sidebar                       │ Header (title, context badge, timezone, avatar, icons)      │
│ [Dash] [Tasks] [Search]       ├─────────────────────────────────────────────────────────────┤
│ [Alerts•3] [Chat•5] [Settings]│ Filter pills   Search………………  Date Picker                   │
│ [Profile]                     ├───────────────┬─────────────────────────────────────────────┤
│                               │ AI Assistant  │ Action Board (3 cards/row)                  │
│                               │  ┌─────────┐  │ ┌──────────────┐ ┌──────────────┐ ┌───────┐ │
│                               │  │chips    │  │ │#PX-377903    │ │#SX-375742    │ │...   │ │
│                               │  │history  │  │ │Contract ...  │ │Assign Pro... │ │      │ │
│                               │  │composer │  │ └──────────────┘ └──────────────┘ └───────┘ │
│                               ├───────────────┴─────────────────────────────────────────────┤
│                               │ KPI strip (cards)                                           │
└───────────────────────────────┴─────────────────────────────────────────────────────────────┘
                                              └─ Right column widgets (timeline, blockers)
                                                             └─ Floating chat drawer (hidden)
```

### Customer Chat Drawer – Conversation Detail
```
┌─────────────────────────────── Chat Drawer ──────────────────────────────────────────────┐
│ Header: Maria Carminha (#SX-379364)     [WhatsApp badge][Timer][Close]                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Customer bubble (timestamp)                                                             │
│ Operator bubble (timestamp + delivered status)                                          │
│ AI suggestion pill: "Draft follow-up" → inserts template                                │
│ Attachment row (PDF contract)                                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Composer: textarea + channel selector + send + quick actions (Resolve, Snooze, Escalate) │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

For printed copies, export from Figma frame "CPC Cockpit – Contracts" (URL shared in design repo) which mirrors these ASCII layouts.

## Sample API Payloads
### Assistant Request/Response
```json
POST /assistants/service-ops/messages
{
  "message": "Show me urgent contracts today",
  "context": "contracts",
  "selectedProjects": ["PX-377903", "PX-377901"]
}
```
```json
200 OK
{
  "text": "You have 12 contracts awaiting signature (>72h). Most urgent: **#PX-377903** scheduled tomorrow 09:00.",
  "highlights": [
    { "projectId": "PX-377903", "label": "Call Ines Broncano", "severity": "high" },
    { "projectId": "PX-377901", "label": "Send WhatsApp reminder", "severity": "medium" }
  ],
  "summary": {
    "resolvedToday": 5,
    "eurosProcessed": 7585,
    "contactsMade": 12,
    "resolutionRate": 0.95
  }
}
```

### Action Board Dataset
```json
GET /actions?context=contracts&filter=overdue
[
  {
    "projectId": "PX-377903",
    "customerName": "Ines Broncano",
    "euroValue": 3850,
    "stage": "contract",
    "dueAt": "2025-02-20T09:00:00Z",
    "priority": "critical",
    "summary": "Waiting customer signature (72h)",
    "contacts": [
      { "channel": "phone", "label": "+34 600 123 456", "value": "+34600123456" },
      { "channel": "whatsapp", "label": "Send WhatsApp", "value": "+34600123456" }
    ]
  },
  {
    "projectId": "SX-375742",
    "customerName": "Fernando Checa",
    "euroValue": 1950,
    "stage": "assignment",
    "dueAt": "2025-02-19T14:00:00Z",
    "priority": "critical",
    "summary": "Assign Pro before 14:00",
    "contacts": [
      { "channel": "phone", "label": "Silva Instalações", "value": "+351211234567" }
    ]
  }
]
```

### Customer Conversation Snapshot
```json
GET /conversations?status=pending
[
  {
    "id": "conv-123",
    "projectId": "SX-379364",
    "customer": "Jose Leon",
    "channel": "whatsapp",
    "lastMessage": "Still waiting on installer. Any update?",
    "updatedAt": "2025-02-18T10:45:00Z",
    "slaStatus": "breach-2h"
  }
]
```
```json
POST /conversations/conv-123/messages
{
  "body": "Jose, we've assigned a new installer arriving at 16:00 today.",
  "channel": "whatsapp"
}
```
