# AI/ML Governance Documentation

**Purpose**: Comprehensive AI/ML governance framework for Yellow Grid Platform v2.0
**Last Updated**: 2025-11-18
**Owner**: Data Science Team + Legal

---

## Overview

This directory contains all documentation related to AI/ML governance, compliance, and operational guidelines for Yellow Grid's AI-powered features:

1. **Sales Potential Assessment** (XGBoost model)
2. **Risk Assessment** (Random Forest model)

These systems fall under the **EU AI Act** (Regulation 2024/1689) as HIGH-RISK AI systems.

---

## Document Index

### 1. **Model Governance Framework** ([model-governance-framework.md](./model-governance-framework.md))
Complete framework for managing ML models throughout their lifecycle:
- Model development standards
- Training & validation procedures
- Versioning & deployment
- Monitoring & maintenance
- Decommissioning

**Audience**: Data scientists, ML engineers

---

### 2. **EU AI Act Compliance Checklist** ([eu-ai-act-compliance-checklist.md](./eu-ai-act-compliance-checklist.md))
Article-by-article compliance checklist with:
- Requirements summary
- Implementation status
- Evidence & artifacts
- Action items

**Audience**: Legal, compliance, data science leads

---

### 3. **Data Science Operational Guidelines** ([data-science-operational-guidelines.md](./data-science-operational-guidelines.md))
Day-to-day operational procedures for:
- Model training & retraining
- Deployment workflows
- Incident response
- Bias testing
- Performance monitoring

**Audience**: Data science team, ML engineers

---

## Quick Links

| Need | Go To |
|------|-------|
| **Creating a new ML model** | Model Governance Framework § 3 |
| **Deploying a model to production** | Data Science Operational Guidelines § 4 |
| **EU AI Act compliance status** | EU AI Act Compliance Checklist |
| **Responding to model performance drop** | Data Science Operational Guidelines § 6 |
| **Bias testing procedures** | Data Science Operational Guidelines § 7 |
| **Model card template** | Model Governance Framework § 5 |

---

## Compliance Summary

| EU AI Act Article | Status | Document Reference |
|-------------------|--------|-------------------|
| **Article 9**: Risk Management | ⚠️ In Progress | EU AI Act Compliance Checklist § 2.1 |
| **Article 10**: Data Governance | ⚠️ In Progress | Model Governance Framework § 4 |
| **Article 11**: Technical Documentation | ✅ Complete | Model Governance Framework § 5 |
| **Article 12**: Record-Keeping | ✅ Complete | Data Science Operational Guidelines § 8 |
| **Article 13**: Transparency | ✅ Complete | Model Governance Framework § 6 |
| **Article 14**: Human Oversight | ✅ Complete | Data Science Operational Guidelines § 5 |
| **Article 15**: Accuracy & Robustness | ⚠️ In Progress | Data Science Operational Guidelines § 6 |

**Target Compliance Date**: Before production deployment (Week 4 of implementation)

---

## Key Contacts

- **Data Science Lead**: data-science@adeo-homeservices.com
- **Legal/Compliance**: legal@adeo-homeservices.com
- **ML Platform Owner**: mlops@adeo-homeservices.com
- **EU AI Act DPO**: dpo@adeo-homeservices.com

---

## Related Documentation

- Product Docs: [product-docs/domain/10-ai-context-linking.md](../../product-docs/domain/10-ai-context-linking.md)
- Infrastructure: [product-docs/infrastructure/08-ml-infrastructure.md](../../product-docs/infrastructure/08-ml-infrastructure.md)
- Design Doc: [docs/design/P0-ai-ml-governance-eu-ai-act.md](../design/P0-ai-ml-governance-eu-ai-act.md)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-18 | Initial governance framework | Data Science Team |
