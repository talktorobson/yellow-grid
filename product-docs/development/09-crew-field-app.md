# Crew Field App – Frontend Specification

## Purpose
Define the UI contract for installers and work teams (Pros) to manage assignments, capture evidence, and complete WCF workflows on mobile devices. This app must run offline-first (PWA + React Native wrapper) and sync with FSM backend once connectivity is restored.

## Platform Constraints
- React Native (Expo) + TypeScript; reuse shared components with operator app where possible.
- Layout optimized for 6–7" phones: bottom navigation with tabs (`Today`, `Schedule`, `Inventory`, `Messages`, `Profile`).
- Offline cache via SQLite/WatermelonDB storing assignments, forms, media metadata; background sync worker pushes changes when network available.

## Home / “Today” Tab
- Shows current assignment card at top, followed by queue of upcoming tasks.
- Card fields: project ID, customer name, address (tap to open map), arrival window, SLA countdown, job type icons (installation, repair).
- Actions: `Start route`, `Arrived`, `Start work`, `Pause`, `Complete`. Each action posts to `/crew/assignments/{id}/status`.
- Provide progress tracker (5 steps) showing checkboxes for “Review checklist”, “Capture photos”, “Collect signature”, “Submit WCF”.

Data contract:
```ts
interface Assignment {
  id: string;
  projectId: string;
  customer: { name: string; phone: string };
  address: string;
  geo: { lat: number; lng: number };
  windowStart: string;
  windowEnd: string;
  services: string[];
  requiredMaterials: string[];
  status: 'scheduled'|'en_route'|'onsite'|'paused'|'completed';
}
```

## Schedule Tab
- Calendar list view (today + next 6 days). Expand each day to show assignments with status badges and distance estimates.
- Provide filters: `All`, `Scheduled`, `Completed`, `Issue`.
- Tap row -> navigate to assignment details screen (same as “Today” card but with full info).

## Assignment Details Screen
Sections:
1. **Overview**: service scope, estimated duration, customer notes, compliance alerts (e.g., “GDPR consent required”).
2. **Checklist**: dynamic tasks from backend (pre-visit, on-site, post-visit). Items can include photo or signature requirements. Use offline-first forms storing `localId` until sync succeeds.
3. **Materials & Inventory**: show reserved parts, allow “Consume item” or “Request more” actions, calling `/crew/inventory/{itemId}/consume`.
4. **Photos & Media**: capture before/after via camera module, auto-upload when online; show upload progress states.
5. **Signatures**: collect customer signature for WCF; store vector data and photo of ID if required.
6. **Work Closing Form**: multi-step wizard summarizing labor, materials, extras, issues; final submit POSTs to `/crew/assignments/{id}/wcf`.

## Messages Tab
- Conversation inbox filtered by project. Supports push notifications and offline drafting.
- Message bubble style similar to operator chat but optimized for mobile. Provide quick templates (e.g., “Running late”, “Arrived on site”).
- Integrate voice note uploads (<2 min) with auto-transcription when online.

## Inventory Tab
- Displays team van stock plus reserved parts for upcoming jobs.
- Two views: `Reserved` (per assignment) and `On-hand`.
- Actions: “Confirm pickup”, “Report shortage”, “Transfer to teammate”.
- Data comes from `/crew/inventory?teamId=...`; offline snapshot updates nightly.

## Profile & Compliance
- Shows certification status, license expiry, productivity stats, and toggle for availability (accept emergency jobs).
- Provide “Documents” section for training manuals and safety procedures (PDF viewer).

## Wireframe Overview
### Today Tab (phone)
```
┌───────────────────────────────┐
│ Header: Today (Tue 18)        │
├───────────────────────────────┤
│ [Assignment Card]             │
│ #SX-375742 14:00-16:00        │
│ Customer: Fernando Checa      │
│ [Start route] [Arrived]       │
│ Progress: ☑ Checklist ▢ Photos│
├───────────────────────────────┤
│ Upcoming                      │
│ 16:30  #SX-379364 12km        │
│ 18:00  #PX-377903 5km         │
└───────────────────────────────┘
```

### Assignment Details Tabs
```
Overview | Checklist | Materials | Photos | WCF
┌──────────────────────────────────────┐
│ Section header + action buttons      │
│ Checklist item (photo required)      │
│ Signature pad                        │
│ Submit button (disabled until ready) │
└──────────────────────────────────────┘
```

## Sample API Payloads
```json
GET /crew/assignments?date=2025-02-18
[
  {
    "id": "assign-123",
    "projectId": "SX-375742",
    "customer": { "name": "Fernando Checa", "phone": "+351911234567" },
    "address": "Rua do Sol 45, Lisboa",
    "geo": { "lat": 38.7223, "lng": -9.1393 },
    "windowStart": "2025-02-18T14:00:00Z",
    "windowEnd": "2025-02-18T16:00:00Z",
    "services": ["Fiber installation"],
    "requiredMaterials": ["ONT-001", "Router-AC1200"],
    "status": "scheduled"
  }
]
```
```json
PATCH /crew/assignments/assign-123/status
{ "status": "onsite", "timestamp": "2025-02-18T13:55:00Z", "location": { "lat": 38.721, "lng": -9.14 } }
```
```json
POST /crew/assignments/assign-123/wcf
{
  "laborMinutes": 95,
  "materialsUsed": [
    { "sku": "ONT-001", "quantity": 1 },
    { "sku": "Cable-50m", "quantity": 0.3 }
  ],
  "issues": [],
  "customerSignature": "<base64>",
  "photos": ["media-before-1", "media-after-2"],
  "notes": "Customer requested demo of app."
}
```

## Offline & Sync Requirements
- Every mutation queues a local record with status `pending`. Sync worker batches operations per assignment to `/crew/sync`.
- Show sync badge if >0 pending items. Provide “Retry now” CTA when errors occur.
- Media uploads use background tasks; display per-file progress + failure states.

## Security & Telemetry
- Authenticate via short-lived OAuth tokens refreshed through PKCE; require biometric unlock on mobile.
- Log actions (`start_route`, `wcf_submit`, `inventory_consume`) to telemetry topic `events/crew-app`.
- Ensure personally identifiable info is redacted from crash logs.
