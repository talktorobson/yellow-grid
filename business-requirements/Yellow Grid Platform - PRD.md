
# Field Service Execution Platform – PRD (v2)

> Note: Platform name is placeholder (“Field Service Execution Platform”) to avoid using “AHS” explicitly.

---

## 1. Business Context, Goals & Problem Statement

### 1.1 Market & Business Context

Home installation and services (Home Services) are a structural component of the home improvement market for inhabitants, Pros and the Group:

- A significant share of customers enter via services.
- Home projects (windows, heating, bathrooms, kitchens, complex renovations) require skills, equipment, time and effort that most customers don’t have. Services are how they actually get projects done and benefit from tax advantages when product + service are sold together.
- The market is very fragmented (many micro-companies with < 5 employees) and highly complex: in-home execution, limited number of qualified Pros, complex product+service orchestration, low margins that demand operational excellence.

Strategically, services are a massive lever:

- To sell more projects and energy-renovation solutions.
- To increase customer lifetime value.
- To strengthen our DIY/DIFM value proposition for inhabitants.
- To help Pros grow their business as trusted partners.

### 1.2 Current Pain & Structural Problem

Despite years in this market, the Group:

- Represents only a small fraction of the addressable Home Services market.
- Has turned only a very small percentage of Pros into partners.
- Still sells most service solutions in store.
- Runs service execution with a retail, store-centric culture and tools, creating:
  - High manual effort.
  - Low scalability.
  - Many frictions for customers, Pros, and operators.
  - Instable trust in execution performance and low profitability.

Current execution activities (organize, find a pro, orchestrate, perform, feedback, invoice & pay pro, claims, track & supervise, support & issues) are handled with heterogeneous tools, partial automation and heavy reliance on tickets/emails/Excel.

Customer and Pro inbound contact rates are high, operational excellence is low, and automation of execution is far from the target.

**Core Problem**

We need an industrial, scalable **Field Service Execution Platform** that:

- Orchestrates service execution end-to-end across all business activities.
- Is configurable by country/BU, not hard-coded.
- Removes as much operator work as possible, while giving them powerful tools when intervention is needed.
- Feeds robust data for governance, KPIs, and continuous improvement.
- Stays strictly out of sales and payment execution (those are handled by other systems).

### 1.3 Vision & Goals

The platform must become the single execution engine for services, supporting:

- Industrialisation & automation of operations (mindset: “execute a service without operator intervention” wherever possible).
- A 5-star experience for customers, Pros and internal operators (simple, guided, transparent).
- A single portal for each main persona:
  - Provider/Pro: mobile app + provider portal to manage jobs, agenda, teams, payments and documents.
  - Service operator: operator portal / control tower to supervise and intervene.
  - Customer: self-care portal/links to follow and adjust their service.
- High-quality, transparent assignment and orchestration that Pros trust and Business can audit.
- Clean integration with:
  - Sales systems.
  - ERP/Finance.
  - Ticketing/Customer Care tools.
  - Identity, master data and analytics.

### 1.4 High-Level Objectives

The platform must materially contribute to Execution Stream targets such as:

- Raising automation of service execution (no operator action) as high as possible.
- Reducing customer and Pro inbound contact rates and costs.
- Improving On-Time Service Delivery and First Time Completion.
- Reducing claim rate and rework cost.
- Enabling faster, more reliable Pro payment (while not executing payments itself).
- Supporting EBIT and operational excellence targets at Group level.

---

## 2. Scope & Business Activities

### 2.1 In Scope (Execution Activities Covered)

The platform covers the execution stream, across the business activities defined in the Execution Referential:

1. **Organize the Execution**
   - Integrate service orders from sales.
   - Plan/confirm execution slots (with buffers).
   - Manage pre-service contract signature.

2. **Find a Pro**
   - Automatic and manual assignment of providers/work teams.
   - Manage failures of automatic distribution.

3. **Orchestrate the Execution**
   - Payment readiness checks (without executing payment).
   - Product delivery checks.
   - Manage cancellations, reschedules, reassignments and extra-costs.
   - Handle orchestration events (provider cancel, missing products, etc.).

4. **Perform the Execution**
   - Provider check-in/check-out.
   - Execution checklists, photos, notes.
   - Partial completion / pauses and associated rework flows.

5. **Manage Feedback**
   - Capture CSAT/NPS/effort scores from customers, Pros and operators.
   - Feed continuous improvement.

6. **Invoice & Pay the Provider (Signalling Only)**
   - Consolidate execution, extras and acceptance status.
   - Signal to ERP/finance for self-billing or invoice-submission flows.
   - No payment execution inside this platform.

7. **Manage Claim**
   - Register and manage claims.
   - Link to rework visits and root-cause analysis.

8. **Track & Supervise the Execution**
   - Funnel and KPI views.
   - Control tower dashboards, alerts and tasking.

9. **Support & Manage Issues and Incidents**
   - Event-driven tasks for issues before, during and after execution.
   - Integration with ticketing tools.

10. **Continuous Improvement**
    - Provide data, events and exports to feed the Business Improvement Request (BIR) process and stream governance.

### 2.2 Out of Scope

- Selling services (quotations, discounts, price calculation, promo logic).
- Executing any payment (no card processing, SEPA, bank transfers, refunds).
- Full accounting/GL functionality.
- Running the ticketing platform itself (we integrate with a dedicated tool, not replace it).

The platform receives and manipulates financial information (amounts paid by customer, agreed provider fees, extra costs) solely for operational purposes and for signalling to external systems.

---

## 3. Personas, Roles & Responsibilities

### 3.1 Personas

- **Customer (Inhabitant)** – Final beneficiary of the service at home.
- **Seller / Service Sales Operator** – Store or remote sales persona, using sales systems to sell service and trigger service orders.
- **Service Operator (Execution Operator / Admin / Viewer)**  
  - Execution Editor/Operator – works in the platform to monitor execution, handle exceptions, manage manual assignment/reschedule, handle claims, reworks and tasks.
  - Execution Admin – same as operator plus higher-level overrides (skip contracts, insert extra costs over local limits, etc.).
  - Execution Viewer – read-only access.
- **Provider (Company / Independent Pro)** – Legal entity contracted by the Group, owning one or more work teams.
- **Work Team (Crew / Technician)** – Operational unit executing the service on site.
- **Customer Care Agent** – Handles inbound contacts using consolidated execution views.
- **Execution Management & Business Leaders** – Use analytics, funnel views and scorecards for governance, drive improvements.

### 3.2 RBAC Principles

- Role-based access control aligned with:
  - Local vs central scopes (store/cluster/country).
  - Business activities (organize, find a pro, orchestrate, perform, feedback, claims, etc.).
- All high-risk actions (overrides, skipping contracts, forcing WCF) require specific roles and complete audit trails.

---

## 4. Functional Requirements

### 4.1 Service Lifecycle Flows

The platform must manage:

- Installation services.
- Technical / quotation visits (including Confirmation TV Flow).
- Maintenance visits.
- Rework visits.
- Multi-step projects/journeys (e.g. kitchen, bathroom).

Key specific flows:

#### 4.1.1 Confirmation Technical Visit Flow

- For each TV, the system logs the business impact:
  - Installation unblocked/updated/cancelled.
  - Signal sent to sales to cancel/refund if TV = NO.
- When NO or YES, BUT is detected, the platform automatically:
  - Creates a task for sales/quotation follow-up (via integration event).
  - Optionally creates a ticket in the ticketing tool when manual interaction is required.

#### 4.1.2 Contract Lifecycle

- Contract templates configurable per country, per service category, per model (self-billing vs invoice submission).
- Execution cannot move to “Go” unless:
  - Contract is signed, or
  - An authorized override is registered.
- Historical versions must be retained and traceable by job and customer.

#### 4.1.3 Work Closing Form (WCF)

- WCF outcomes are used as input for:
  - Claim creation.
  - Rework service orders.
- WCF is signed by the customer (digital or paper + upload).
- WCF is stored as legal documentation attached to the project and service orders.

---

### 4.2 Provider & Work Team Model

- Provider–team hierarchy:
  - Provider is the contractual entity.
  - Teams are operational groups/crews.
- Attributes:
  - Zones/service areas.
  - P1/P2 priorities and exclusivities.
  - Service type opt-in/opt-out.
  - Product/brand eligibility.
  - TV vs installation profiles.
  - Service mix targets.
  - Risk status (OK / Watch / Blocked) and reasons.
  - Documents and certifications (with expiry management).
  - Billing model flags:
    - `billing_model = self_billing | invoice_submission`.

Risk and compliance flags must be visible to operators in the assignment funnel and provider scorecards.

---

### 4.3 Capacity, Calendar & Work Patterns

- Working calendars per provider/team (days, hours).
- Dedicated service days (e.g. bathrooms only certain days).
- External blocks (vacations, training, blackouts).
- Capacity per slot (jobs, time, complexity points).
- Multi-person jobs (minimum crew size).
- Drive time / commute buffer between jobs.
- Seasonality and special periods (campaigns, high season).
- National holidays and store closure days per country/BU.

All managed as configuration (no hard-coded per-country behaviour).

---

### 4.4 Scheduling & Buffer Logic

- Global/advance buffers (minimum delay between sale and execution).
- Static/product buffers (long-lead products, special orders).
- Commute buffer between slots.
- Slot granularity by service type (e.g. 30/60/90 minutes).
- Rules exposed via APIs to sales systems and check-availability tools.
- For each decision, traceable explanation (e.g. “slot excluded due to delivery buffer”).

---

### 4.5 Assignment & Dispatch

- Eligibility funnel filters on:
  - Zone and radius.
  - Service-type opt-out.
  - P1/P2 and priority rules.
  - Brand/product eligibility.
  - Certifications/documents.
  - Calendar & capacity.
  - Risk status.
  - TV-related rules (own vs third-party TV).
- For each step:
  - Record how many candidates and which IDs were filtered.
  - Expose in human-readable funnel view and export/audit data.
- Assignment modes:
  - Direct assignment.
  - Offer with acceptance/refusal.
  - Auto-accept (per market rule).
  - Broadcast (multiple providers receive offer, first to accept wins).
- Provider offers and negotiations (up to configured rounds) are:
  - Logged with timestamps and reasons.
  - Able to generate tasks when no agreement is reached.
- Unassigned jobs surfaced in dedicated “Unassigned” views and alert lists.

---

### 4.6 Execution Workflow & Mobile App

- Mobile app for providers/teams:
  - Job list and details.
  - Navigation link to site.
  - Check-in/check-out.
  - Execution checklists.
  - Photos, videos, notes.
  - Capture of extra works and customer validation.
  - WCF capture (signature and media).
  - Mark job as incomplete/paused, with structured reasons.
  - Offline mode with later sync.
- Structured reasons for incomplete jobs mapped to root cause taxonomy:
  - Product missing.
  - Customer no-show.
  - Site not accessible.
  - Safety condition not met.
  - Wrong product / missing parts.
- Incomplete check-out automatically generates tasks and/or tickets for operators.

---

### 4.7 Customer–Provider Intermediation & Communication

- Communication timelines and channels configured per country:
  - Reminder SMS/email before visit.
  - Appointment confirmation.
  - Reschedule notifications.
  - Provider contact windows.
- Rules for store/operator intermediation:
  - When customer can directly call Pro.
  - When store must communicate.
- Integration with ticketing tool for escalations:
  - Creation of tickets for complex issues.
  - Link execution entities to tickets.

---

### 4.8 Post-Service, Claims, Quality & Compliance

#### 4.8.1 Completion, Closure & Documentation

- On closure of a service order:
  - Emit events to ERP with:
    - Service and project IDs.
    - Provider IDs.
    - Amounts and currencies (base and extras).
    - WCF status (accepted/contested).
    - Warranty start date.
    - Provider billing model.
- Platform does not execute payment; it signals readiness/hold.

#### 4.8.2 Claims & Reworks

- Claims:
  - Linked to original and rework jobs.
  - Classified by root cause taxonomy.
  - Trigger rework orchestration when appropriate.
- Claim KPIs feed:
  - Provider scorecards.
  - Execution dashboards.
  - Continuous improvement.

#### 4.8.3 Quality Metrics & Safety

- KPIs per provider/team:
  - First-time completion rate.
  - Rework frequency.
  - Claim rate.
  - Punctuality.
  - CSAT/NPS.
- These KPIs:
  - Feed scoring and contract governance.
  - Are visible to Ops and business leaders.
- Safety:
  - Mandatory checklists for high-risk services.
  - Mandatory cause tagging for reworks, claims and incidents.

---

### 4.9 Project / Journey Orchestration

- Define standard journeys:
  - Simple installation.
  - TV → Installation → WCF.
  - Maintenance cycles.
  - Warranty flows.
  - Complex projects (kitchen, bathroom, energy renovation).
- Each journey:
  - Defines steps, dependencies and allowed transitions.
  - Maps to business activities (organize, find, orchestrate, perform, etc.).
- “Project-level freeze”:
  - Stops auto-optimisation.
  - Records reason (investigation, legal, claim).
  - Requires manager override to unfreeze.

---

### 4.10 Analytics, Simulation & Governance

- Dashboards and reports that surface:
  - Automation rate (no operator intervention).
  - Manual matching rate.
  - On-time performance.
  - Lead times by journey type.
  - Claim and rework rates.
  - Customer and Pro contact rates.
  - Provider utilisation and performance.
- Rule simulation:
  - P1/P2 and priority changes.
  - Opt-out/in changes.
  - Capacity and working time adjustments.
  - TV-only vs full-scope provider rules.
- Data exports and events:
  - Feed central data platform.
  - Support stream governance and BIR.

---

### 4.11 Document & Content Management

- Store:
  - Pre-service contracts.
  - WCFs.
  - Photos, videos, audio.
  - Provider documents (contracts, insurance, certifications).
- Tag documents as “legal” where applicable.
- Enforce retention rules per country/BU.
- Provide search and retrieval by:
  - Customer.
  - Service order.
  - Provider.
  - Project.

---

### 4.12 Operations Control Tower & Operator Tools

- Unified operator workspace with:
  - Alerts & tasks panel (contracts, payment/delivery issues, failed assignment, incomplete jobs, WCF refusals, claims, incidents, missing/expired documents).
  - Grid calendar view:
    - By BU, region, store, provider, team, service type, project.
    - Visual at-risk markers (unassigned, blocked, frozen).
  - Gantt view for projects and key providers.
  - Powerful search (by service order ID, project ID, customer, provider, sales order ID, etc.).
- Availability check:
  - Same engine as scheduling API.
  - Transparent to operators and integrated systems.

---

### 4.13 Ticketing & Support Integration

- Integration with ticketing system (e.g. Zendesk):
  - Create tickets from events:
    - Failed automatic assignment.
    - Payment/delivery issues.
    - Incomplete/paused jobs.
    - WCF refusals.
    - Claims and incidents.
    - Customer/Pro escalations.
  - Link jobs/projects/providers/customers to tickets.
  - Update ticket status based on state changes:
    - Job rescheduled.
    - Rework scheduled.
    - Claim resolved.
- Ticket IDs visible in:
  - Project view.
  - Service order view.
  - Provider view.

---

## 5. Integration Requirements

- **Sales Systems**
  - Service order intake (products, services, customer data, flags like “requires confirmation TV”).
  - Slot-availability APIs.
  - Feedback on schedules, reschedules, cancellations, TV outcomes and TV=NO flows.

- **ERP / Finance**
  - Receive signals for:
    - Self-billing vs invoice submission flows.
    - Amounts and currencies (base, extras).
    - Ready for payment / hold due to claim.
  - Platform never executes payments.

- **Master Data**
  - Customers, providers, products, services, prices.
  - Provider risk/compliance status.
  - Mandatory document definitions.

- **Identity / SSO**
  - SSO for internal users.
  - Federated access for Pros where applicable.

- **Ticketing / Customer Care**
  - Events → tickets.
  - Job/claim state changes → ticket updates.

- **Analytics / Data Platform**
  - Events and data exports for dashboards, governance and continuous improvement.

---

## 6. Localization, Multi-Currency & Legal

- Legal texts in contracts and WCFs configurable per country and per service type.
- Multi-currency support for:
  - Customer payments.
  - Provider fees and extras.
- Localised:
  - Time/date formats.
  - Notifications (templates, languages).
  - Tax and invoice-related references (passed through to ERP).

---

## 7. Non-Functional Requirements

- **Scalability & Performance**
  - Support large volumes of bookings per month, scalable beyond.
  - Low-latency APIs for slot search and assignment.

- **Availability**
  - 99.9% uptime target for core APIs and operator portal.
  - Offline-capable mobile app with conflict handling.

- **Security & GDPR**
  - Encryption in transit and at rest.
  - Strong RBAC and audit logs.
  - Support for data subject rights (export, deletion where legal).
  - EU data residency where required.

- **Configurability**
  - Buffers, calendars, provider attributes, journeys, contract/WCF templates, communication rules, billing model flags and metrics thresholds configurable without code deployment.
  - Country/BU configuration separated from core logic.

- **Maintainability & Extensibility**
  - API-first, event-driven architecture.
  - Clear separation of core platform behaviour and country/BU configurations.
  - Ability to plug in external optimisation engines (routing, AI assistants) without redesigning the platform.

