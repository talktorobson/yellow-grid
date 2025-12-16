# Business Requirements - Source Materials

**Purpose**: Original business requirements and source documents used to create the technical specifications.

**Status**: Reference materials - DO NOT MODIFY

---

## Contents

This folder contains the **original business requirements** that informed the creation of the Yellow Grid Platform engineering specifications.

### Documents

| File | Type | Description |
|------|------|-------------|
| `Yellow Grid Platform - PRD.md` | Markdown | Product Requirements Document (business-readable format) |
| `AHS Execution Referential.docx` | Word | Original business referential document |
| `VSOP_AHS STREAM EXECUTION 2025.docx` | Word | Vision and standard operating procedures |
| `SOP_EXEC_User Guide_compressed.pdf` | PDF | Standard Operating Procedures - Execution user guide |
| `Yellow Grid Logo.png` | Image | Official brand logo |
| `Calendar with a wrench.jpg` | Image | Visual asset |

---

## Relationship to Technical Specs

These business requirements were **translated into** the complete engineering specifications located in `/documentation/`.

**Flow**:
```
Business Requirements (this folder)
    ↓
[Analysis & Architectural Design]
    ↓
Technical Specifications (/documentation/)
    ↓
Implementation (code)
```

---

## Usage

### For Business Stakeholders
- **PRD** (`Yellow Grid Platform - PRD.md`) - Read this for business features and user stories
- **User Guide** (PDF) - Standard operating procedures for business operations

### For Technical Team
- **DO NOT** use these documents directly for implementation
- **DO** reference `/documentation/` for all technical decisions
- **DO** consult these if you need to understand the business context behind a technical requirement

---

## Maintaining These Files

**Policy**: These files are **historical records** and should not be modified.

If business requirements change:
1. Update the **technical specifications** in `/documentation/`
2. Consider archiving old versions of these files
3. Add new versions with clear version numbers or dates

---

## Questions?

| Question | Answer |
|----------|--------|
| **Which file should I read for requirements?** | `/documentation/` (technical specs) |
| **What if business requirements change?** | Update `/documentation/` and archive these |
| **Can I edit these files?** | No - treat as historical reference |
| **Where is the technical design?** | `/documentation/architecture/` |
| **Where are the API contracts?** | `/documentation/api/` |

---

**Last Updated**: 2025-01-16
**Maintainer**: Product Team
