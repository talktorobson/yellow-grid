# Legal Boundary: Work Teams vs Individual Technicians

## Executive Summary

Yellow Grid Platform operates exclusively at the **Work Team level** and does NOT track, manage, or register individual technicians. This is a deliberate architectural decision driven by **labor law compliance** to avoid co-employer liability.

## Legal Context

### The Co-Employer Risk

In European labor law (particularly French law), a company can become a "co-employer" of another company's workers if it exercises sufficient control over them. Signs of co-employment include:

1. **Direct management** of individual workers' schedules
2. **Tracking individual performance** metrics
3. **Recording individual identities** and personal data
4. **Issuing instructions** directly to individual workers
5. **Controlling work methods** at an individual level

### Consequences of Co-Employment

If Yellow Grid (ADEO) were deemed a co-employer:
- **Joint liability** for wages, benefits, and working conditions
- **Responsibility** for workplace accidents and insurance
- **Obligation** to respect collective bargaining agreements
- **Potential reclassification** of service contract as employment
- **Significant financial and legal penalties**

## Platform Architecture Decision

### What Yellow Grid Manages (B2B Relationship)

| Entity | Description | Platform Role |
|--------|-------------|---------------|
| **Provider** | Service company (legal entity) | Contract partner |
| **Work Team** | Operational unit within Provider | Assignment target |
| **Work Team Calendar** | Team availability & capacity | Scheduling unit |
| **Work Team Certification** | Team-level qualifications | Skill verification |

### What Yellow Grid Does NOT Manage (Provider's Responsibility)

| Entity | Description | Why Not Tracked |
|--------|-------------|-----------------|
| ~~Technician~~ | Individual worker | Creates co-employer risk |
| ~~Technician Certification~~ | Individual qualifications | Individual tracking |
| ~~Individual Schedules~~ | Personal work hours | Direct management sign |
| ~~Individual Performance~~ | Personal KPIs | Performance control sign |

## Implementation

### The Work Team as Atomic Unit

```
Provider (Contract Partner)
    │
    └── Work Team (Operational Unit) ← Platform's lowest granularity
            │
            ├── Calendar (availability)
            ├── Certifications (team-level)
            ├── Zone Assignments (coverage)
            └── Specialties (capabilities)
            
            [Individual technicians are Provider's internal concern]
```

### Key Principles

1. **Assignments go to Work Teams**, not individuals
2. **Check-ins are by Work Team users**, not tracked per-technician
3. **Certifications are held by Work Teams**, representing team capability
4. **Signatures are by "Work Team representative"**, not named individuals
5. **Capacity is team-level**, not individual headcount

### Database Models

**Removed:**
- `Technician` - Individual worker tracking
- `TechnicianCertification` - Individual certifications

**Added:**
- `WorkTeamCertification` - Team-level certification (the team as a unit is certified)

### Field Naming Convention

| Old Field | New Field | Rationale |
|-----------|-----------|-----------|
| `technicianId` | `workTeamUserId` | User is part of team, not tracked individually |
| `technicianName` | `workTeamName` | Display team name, not individual |
| `TECHNICIAN` signer | `WORK_TEAM` signer | Team representative signs |
| `minTechnicians` | `teamSize` | Capacity, not headcount |

## User Experience

### For Customers

- Customer sees: "Your installation will be performed by **[Work Team Name]**"
- Customer does NOT see: Individual technician names/photos
- This is similar to: "A DHL driver will deliver your package" (not a named individual)

### For Work Team Members (Mobile App)

- Work team member logs in with their credentials
- They see orders assigned to their **team**
- They check-in/out as a **team representative**
- Their individual identity is authentication, not business data

### For Operators

- Operators assign orders to **Work Teams**
- They see team capacity, not individual availability
- They track team performance, not individual metrics

## Compliance Checklist

- [x] No individual technician records in database (Technician model removed)
- [x] No individual performance tracking (removed from schema)
- [x] No individual schedule management (WorkTeamCalendar at team level)
- [x] Assignments target Work Teams only (verified in service layer)
- [x] Certifications held at team level (WorkTeamCertification)
- [x] User role renamed from TECHNICIAN to WORK_TEAM
- [ ] Signatures are "Work Team Representative" (pending verification)
- [ ] Customer communications reference team, not individuals (pending UI review)

## Implementation Status

**Completed (January 2025):**
- Removed `Technician` model from Prisma schema
- Removed `TechnicianCertification` model, replaced with `WorkTeamCertification`
- Removed technician CRUD endpoints from providers.controller.ts
- Removed technician CRUD service methods from providers.service.ts
- Updated certification methods to work at WorkTeam level
- Renamed TECHNICIAN role to WORK_TEAM across codebase
- Updated web and mobile app types
- Updated seed data to create WorkTeamCertifications
- Updated test files to remove technician tests

**Remaining:**
- Review sales integration DTOs (technicianId references may be external system IDs)
- Review WCF service for any individual tracking
- Verify mobile app shows team names, not individual names

## References

- French Labor Code (Code du travail) - Article L.8241-1 (illegal labor lending)
- EU Posted Workers Directive 96/71/EC
- French Court of Cassation rulings on co-employment (co-emploi)

---

*This document defines a critical legal boundary in the Yellow Grid Platform architecture. Any feature requests that would track individual technicians must be rejected or redesigned to operate at the Work Team level.*
