# Contract Bundling Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Specification
**Gap Filled**: Multi-Service-Order Contract Grouping

---

## Overview

**Contract Bundling** allows operators to group multiple service orders into a single contract sent to the customer for signature. This simplifies customer experience when multiple services are performed as part of one project.

### Business Benefits

- **Customer**: Single signature for entire project scope
- **Operator**: Easier contract management
- **Legal**: Reduced contract overhead

---

## Use Cases

### 1. Kitchen Installation Project
**Scenario**: Customer purchases kitchen cabinets + appliances + countertop installation

**Service Orders**:
- SO-001: Cabinet installation
- SO-002: Appliance installation (dishwasher, oven)
- SO-003: Countertop cutting & installation

**Contract Bundle**: All 3 SOs in single contract with combined T&Cs

### 2. Bathroom Renovation
**Service Orders**:
- SO-101: Technical Visit (TV) for bathroom assessment
- SO-102: Plumbing installation
- SO-103: Tile installation

**Contract Bundle**: TV + both installations in one contract

---

## Data Model

```typescript
interface ServiceContract {
  id: string;
  contractNumber: string; // e.g., CTR-2025-00123

  // Bundling
  serviceOrderIds: string[]; // Array of SO IDs
  bundleType: BundleType;

  // Template
  templateId: string;
  templateVersion: string;

  // Content
  termsAndConditions: string;
  pricing: ContractPricing;
  estimatedDuration: Duration;
  workScope: string;

  // Customer
  customerId: string;
  customerSignature?: ContractSignature;
  customerSignedAt?: DateTime;

  // Status
  status: ContractStatus;

  // Metadata
  createdAt: DateTime;
  sentAt?: DateTime;
  expiresAt?: DateTime;
  completedAt?: DateTime;
}

enum BundleType {
  SINGLE = 'SINGLE',     // Single SO
  BUNDLE = 'BUNDLE',     // Multiple SOs
}

interface ContractPricing {
  items: ContractLineItem[];
  subtotal: Money;
  taxes: Money;
  total: Money;
  bundleDiscount?: Money; // Optional discount for bundled services
}

interface ContractLineItem {
  serviceOrderId: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
}
```

---

## Business Rules

### Bundling Eligibility

**Can Bundle If**:
- ✅ All SOs belong to same customer
- ✅ All SOs belong to same project
- ✅ All SOs have same business unit (e.g., Leroy Merlin)
- ✅ No SO is already in another active contract
- ✅ All SOs are in CREATED or SCHEDULED state

**Cannot Bundle If**:
- ❌ SOs from different customers
- ❌ SOs from different projects
- ❌ SOs already have signed contracts
- ❌ SOs are COMPLETED or CANCELLED

---

## Workflow

### 1. Operator Creates Bundle

```typescript
// API: POST /api/v1/contracts/bundle
interface CreateBundleContractRequest {
  serviceOrderIds: string[]; // 2+ SOs
  templateId: string;
  bundleDiscount?: Money;
  notes?: string;
}

async function createBundleContract(
  request: CreateBundleContractRequest,
  operatorId: string
): Promise<ServiceContract> {
  // Validate bundling rules
  const serviceOrders = await serviceOrderRepo.findByIds(request.serviceOrderIds);

  // Rule 1: Same customer
  const customerIds = [...new Set(serviceOrders.map(so => so.customerId))];
  if (customerIds.length > 1) {
    throw new Error('Cannot bundle SOs from different customers');
  }

  // Rule 2: Same project
  const projectIds = [...new Set(serviceOrders.map(so => so.projectId))];
  if (projectIds.length > 1) {
    throw new Error('Cannot bundle SOs from different projects');
  }

  // Rule 3: No existing active contracts
  const existingContracts = await contractRepo.findByServiceOrders(request.serviceOrderIds);
  const activeContracts = existingContracts.filter(c =>
    c.status !== ContractStatus.CANCELLED &&
    c.status !== ContractStatus.EXPIRED
  );
  if (activeContracts.length > 0) {
    throw new Error('Some SOs already have active contracts');
  }

  // Create bundle contract
  const template = await contractTemplateRepo.findById(request.templateId);

  const pricing = calculateBundlePricing(serviceOrders, request.bundleDiscount);

  const contract = await contractRepo.create({
    serviceOrderIds: request.serviceOrderIds,
    bundleType: BundleType.BUNDLE,
    templateId: request.templateId,
    termsAndConditions: template.content,
    pricing,
    customerId: customerIds[0],
    status: ContractStatus.DRAFT,
    createdAt: DateTime.now()
  });

  // Link SOs to contract
  for (const so of serviceOrders) {
    so.contractId = contract.id;
    await serviceOrderRepo.save(so);
  }

  return contract;
}
```

### 2. Template Selection

```typescript
interface ContractTemplate {
  id: string;
  name: string;
  serviceTypes: string[]; // ['installation', 'maintenance']
  supportsBundle: boolean;
  content: string; // T&Cs template with placeholders
  variables: string[]; // ['{{customerName}}', '{{totalPrice}}']
}

// Example templates
const TEMPLATES = {
  KITCHEN_BUNDLE: {
    id: 'tpl_kitchen_bundle',
    name: 'Kitchen Installation Bundle',
    serviceTypes: ['installation'],
    supportsBundle: true,
    content: `
      This agreement covers the installation of kitchen components including:
      {{serviceOrderList}}

      Total Price: {{totalPrice}}
      Estimated Duration: {{totalDuration}}

      [Standard T&Cs...]
    `
  },
  SINGLE_INSTALLATION: {
    id: 'tpl_single_install',
    name: 'Single Installation',
    serviceTypes: ['installation'],
    supportsBundle: false
  }
};

async function suggestTemplate(serviceOrderIds: string[]): Promise<string> {
  const serviceOrders = await serviceOrderRepo.findByIds(serviceOrderIds);
  const serviceTypes = [...new Set(serviceOrders.map(so => so.serviceType))];

  if (serviceOrderIds.length > 1) {
    // Bundle → Find bundle template matching service types
    const bundleTemplates = await contractTemplateRepo.find({
      supportsBundle: true,
      serviceTypes: { $in: serviceTypes }
    });

    return bundleTemplates[0]?.id || 'tpl_generic_bundle';
  } else {
    // Single SO
    return 'tpl_single_' + serviceOrders[0].serviceType;
  }
}
```

### 3. Pricing Calculation

```typescript
function calculateBundlePricing(
  serviceOrders: ServiceOrder[],
  bundleDiscount?: Money
): ContractPricing {
  const items: ContractLineItem[] = serviceOrders.map(so => ({
    serviceOrderId: so.id,
    description: `${so.serviceType}: ${so.products.map(p => p.name).join(', ')}`,
    quantity: 1,
    unitPrice: so.totalAmount,
    total: so.totalAmount
  }));

  const subtotal = items.reduce((sum, item) => sum.add(item.total), Money.zero());

  const discount = bundleDiscount || Money.zero();
  const afterDiscount = subtotal.subtract(discount);

  const taxRate = 0.20; // 20% VAT (country-specific)
  const taxes = afterDiscount.multiply(taxRate);

  const total = afterDiscount.add(taxes);

  return {
    items,
    subtotal,
    bundleDiscount: discount,
    taxes,
    total
  };
}
```

### 4. Sending Bundle Contract

```typescript
async function sendBundleContract(contractId: string): Promise<void> {
  const contract = await contractRepo.findById(contractId);

  // Generate PDF
  const pdf = await contractPdfGenerator.generate(contract);

  // Send via email + SMS
  await notificationService.sendToCustomer(contract.customerId, {
    type: 'CONTRACT_SIGNATURE_REQUIRED',
    subject: `Contract Signature Required: ${contract.contractNumber}`,
    body: `
      Please review and sign the attached service contract for your project.

      Services Included:
      ${contract.serviceOrderIds.map(id => '- ' + id).join('\n')}

      Total: ${contract.pricing.total.format()}

      Sign Online: {{signatureUrl}}
    `,
    attachments: [pdf],
    smsText: `Contract ready for signature. Link: {{signatureUrl}}`
  });

  contract.status = ContractStatus.AWAITING_SIGNATURE;
  contract.sentAt = DateTime.now();
  contract.expiresAt = DateTime.now().plus({ days: 7 });

  await contractRepo.save(contract);
}
```

---

## UI Workflow (Operator)

### Step 1: Select Service Orders for Bundling

**Screen**: Service Order List

**Actions**:
1. Filter SOs by project
2. Multi-select SOs (checkboxes)
3. Click "Bundle Selected into Contract"

**Validation**:
- Show warning if SOs don't meet bundling rules
- Suggest template based on SO types

### Step 2: Configure Bundle Contract

**Screen**: Contract Configuration

**Fields**:
- Template Selection (dropdown)
- Bundle Discount (optional, EUR)
- Special Terms (textarea)
- Preview Contract (button)

**Actions**:
- Preview PDF
- Send to Customer
- Save as Draft

---

## API Endpoints

### 1. Create Bundle Contract

**POST** `/api/v1/contracts/bundle`

```json
{
  "serviceOrderIds": ["so_1", "so_2", "so_3"],
  "templateId": "tpl_kitchen_bundle",
  "bundleDiscount": { "amount": 50, "currency": "EUR" },
  "notes": "10% discount for bundle purchase"
}
```

**Response**:
```json
{
  "contractId": "ctr_123",
  "contractNumber": "CTR-2025-00123",
  "bundleType": "BUNDLE",
  "serviceOrderCount": 3,
  "pricing": {
    "subtotal": { "amount": 500, "currency": "EUR" },
    "bundleDiscount": { "amount": 50, "currency": "EUR" },
    "taxes": { "amount": 90, "currency": "EUR" },
    "total": { "amount": 540, "currency": "EUR" }
  },
  "status": "DRAFT"
}
```

### 2. Send Bundle Contract

**POST** `/api/v1/contracts/{contractId}/send`

**Response**:
```json
{
  "contractId": "ctr_123",
  "status": "AWAITING_SIGNATURE",
  "sentAt": "2025-01-16T10:00:00Z",
  "expiresAt": "2025-01-23T10:00:00Z",
  "signatureUrl": "https://app.yellowgrid.com/sign/ctr_123/token_abc"
}
```

---

## Database Schema

```sql
CREATE TABLE app.service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(50) UNIQUE NOT NULL,

  -- Bundling
  bundle_type VARCHAR(20) NOT NULL CHECK (bundle_type IN ('SINGLE', 'BUNDLE')) DEFAULT 'SINGLE',

  -- Template
  template_id VARCHAR(50) NOT NULL,
  template_version VARCHAR(20),

  -- Customer
  customer_id UUID NOT NULL,

  -- Pricing
  subtotal_amount DECIMAL(10, 2) NOT NULL,
  subtotal_currency CHAR(3) NOT NULL,
  bundle_discount_amount DECIMAL(10, 2),
  taxes_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Status
  status VARCHAR(30) NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  customer_signed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Junction table for contract-SO relationship
CREATE TABLE app.contract_service_orders (
  contract_id UUID NOT NULL REFERENCES app.service_contracts(id),
  service_order_id UUID NOT NULL REFERENCES app.service_orders(id),
  line_item_description TEXT,
  line_item_amount DECIMAL(10, 2),

  PRIMARY KEY (contract_id, service_order_id)
);

CREATE INDEX idx_contract_service_orders_so ON app.contract_service_orders(service_order_id);
CREATE INDEX idx_contracts_customer ON app.service_contracts(customer_id);
CREATE INDEX idx_contracts_status ON app.service_contracts(status);
```

---

## Business Rules Summary

| Rule | Description |
|------|-------------|
| **Same Customer** | All SOs must belong to same customer |
| **Same Project** | All SOs must belong to same project |
| **No Duplicate Contracts** | SOs cannot have multiple active contracts |
| **Bundle Discount** | Optional discount for bundled services (0-20%) |
| **Template Matching** | Template must support bundling + service types |
| **Signature Required** | Single customer signature covers all SOs in bundle |
| **Contract Expiry** | Unsigned contracts expire after 7 days |

---

**Document Status**: Complete
**Implementation Priority**: MEDIUM (nice-to-have, not blocking)
**Estimated Effort**: 2-3 weeks
**Dependencies**: Contract signature system
