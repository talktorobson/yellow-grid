# Customer Experience Portal – Frontend Specification

## Purpose
Give front-end engineers a blueprint for the self-service customer workspace where homeowners monitor projects, review documents/payments, and chat with support in the CPC SaaS platform. This is the authenticated experience linked from notifications and SMS/WhatsApp deep links.

## Tech Stack & Shell
- React 18 + TypeScript + Next.js 14 (app router) using the shared FSM design system (Tailwind + Radix primitives).
- SSR for initial project overview; hydrate chat/timeline widgets on client.
- Responsive layout: desktop (≥1280 px) uses two-column grid; tablet/mobile collapse to stacked sections with sticky action footer.
- Theming inherits customer-friendly palette (light background, navy buttons, semantic status colors).

```
┌──────────────────────────────────────────────────────────────┐
│ Header (logo, project selector, language, support)           │
├──────────────────────────────────────────────────────────────┤
│ Status timeline  │  Right Rail (Next steps + Support card)   │
│ Project cards    │                                          │
│ Documents/Payments tabs                                     │
│ Messaging drawer (bottom)                                   │
└──────────────────────────────────────────────────────────────┘
```

## Header & Project Selector
- Display customer name, address, and current project (#PX-377903). Dropdown lists active/archived service orders (searchable).
- Quick action buttons: “Call support”, “Share access”, “Download summary”.
- Language switcher (ES/PT/FR) updates locale context for dates/currency.

State model:
```ts
interface CustomerPortalState {
  selectedProjectId: string;
  locale: LocaleCode;
  contactChannels: Array<'phone'|'whatsapp'|'email'>;
  unreadMessages: number;
}
```

## Status Timeline
- Horizontal pill timeline showing major milestones: Request received → Planning → Assigned → On-site → Work closing → Billing.
- Each node indicates state (`done`, `current`, `upcoming`), date/time, and optional tooltip (e.g., “Awaiting your signature”).
- At mobile widths, render as vertical accordion.

Data contract:
```ts
GET /customer/projects/{id}/timeline
[
  { "key": "planning", "status": "done", "completedAt": "2025-02-16T10:15:00Z" },
  { "key": "contract", "status": "current", "cta": { "type": "sign", "label": "Sign contract" } },
  { "key": "assignment", "status": "upcoming" }
]
```

CTAs per node:
- Contract node → open document signing flow.
- Assignment node (if `status='current'`) → show assigned professional with contact CTA.
- Work closing node (if current) → show “Upload photos / Approve work” modal.

## Project Overview Cards
Left column stack of cards:
1. **Visit Details**: date range, assigned pro/company, actions (call, reschedule request, directions link).
2. **Preparations & Tasks**: checklist items (clear area, provide parking). Each item toggles completion; send PATCH to `/customer/projects/{id}/preparations`.
3. **Financial Summary**: contract amount, paid, outstanding, payment CTA (if invoice open). Embed Stripe payment sheet or show bank transfer instructions.

Card schema:
```ts
interface VisitDetails {
  slotStart: string;
  slotEnd: string;
  professional: { name: string; rating: number; phone: string; photoUrl?: string };
  notes: string[];
}
```

## Documents & Payments Tabs
- Tabs: `Documents`, `Payments`, `Photos`.
- Documents table lists contracts, quotes, WCF; actions: View, Download PDF, Sign (if pending). Integrate DocuSign/Adobe embed via iframe when `action='sign'`.
- Payments tab shows invoices with statuses (Pending/Processing/Paid). Provide `Pay now` button linking to checkout session.
- Photos tab grid shows before/after images uploaded by crew; allow customers to upload additional evidence (limit 10MB, jpg/png).

## Messaging Drawer & Support
- Persistent bubble bottom-right. Clicking opens drawer with conversation thread (WhatsApp/SMS sync) plus AI-suggested replies (e.g., “Confirm arrival time”).
- Provide quick filters (“All”, “Support”, “Crew”) and ability to send attachments (photos, documents).

API snippet:
```ts
POST /customer/conversations/{id}/messages
{
  "body": "Hi, can we move the appointment to Wednesday?",
  "attachmentIds": [],
  "channel": "web"
}
```

## Right Rail Widgets
1. **Next Steps**: for each pending customer action (sign contract, approve extra cost, confirm visit). Button triggers relevant modal.
2. **Support Contacts**: call center phone, WhatsApp number, SLA window, escalation link.
3. **Satisfaction Tracker**: show CSAT progress and upcoming survey.

## Wireframe Snapshot (Desktop)
```
┌──────────────────────────────────────────────────────────────┐
│ Header: [Logo] Project ▼  Language  Support  Avatar           │
├─────────────────┬────────────────────────────────────────────┤
│ Status timeline │ Next Steps widget                          │
├─────────────────┴────────────────────────────────────────────┤
│ Visit Details   │                                            │
│ Preparations    │ Right rail (Support, Satisfaction)         │
│ Financials      │                                            │
├──────────────────────────────────────────────────────────────┤
│ Tabs: Documents | Payments | Photos                          │
│  Table/Grid content                                         │
└──────────────────────────────────────────────────────────────┘
```

## Sample Payloads
```json
GET /customer/projects
[
  { "id": "PX-377903", "address": "Av. Europa 12, Madrid", "status": "contract", "scheduledAt": "2025-02-20T09:00:00Z" },
  { "id": "SX-379364", "address": "Rua Augusta 18, Lisboa", "status": "assignment" }
]
```
```json
POST /customer/projects/PX-377903/signatures
{ "documentId": "doc-123", "signatureToken": "..." }
```
```json
POST /customer/payments
{ "projectId": "PX-377903", "invoiceId": "inv-456", "method": "card", "returnUrl": "https://portal.fsm.com/callback" }
```

## Success Metrics
- 90% of customer actions complete without operator intervention.
- <2 s initial LCP on desktop/mobile.
- ≥95% DocuSign/checkout flows launched from the portal complete successfully (monitored via telemetry `events/customer-portal`).***
