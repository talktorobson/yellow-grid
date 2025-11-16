# Provider Payment Lifecycle Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [WCF (Work Closing Form) Lifecycle](#2-wcf-work-closing-form-lifecycle)
3. [WCF Signature Options](#3-wcf-signature-options)
4. [WCF Reserve Handling](#4-wcf-reserve-handling)
5. [Provider Payment Authorization](#5-provider-payment-authorization)
6. [Pro Forma Invoice Generation](#6-pro-forma-invoice-generation)
7. [Provider Invoice Signature/Contest](#7-provider-invoice-signaturecontest)
8. [Payment Trigger Integration](#8-payment-trigger-integration)
9. [Payment Confirmation Feedback](#9-payment-confirmation-feedback)
10. [Data Model](#10-data-model)
11. [API Examples](#11-api-examples)

---

## 1. Overview

### 1.1 Purpose

The **Provider Payment Lifecycle** manages the complete flow from service completion through customer acceptance (WCF) to provider invoice and final payment. This ensures:
- Customer acceptance of work quality
- Provider payment authorization only after customer approval
- Provider invoice generation and acceptance
- Integration with external payment systems

### 1.2 Payment Flow Overview

```
Service Completed (Check-Out)
        │
        ▼
┌─────────────────────────────────────────┐
│ STEP 1: Auto-Send WCF to Customer      │
│ Delivery: Email + SMS                  │
│ Deadline: 48 hours to sign             │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ STEP 2: Customer WCF Signature          │
│ Options:                                │
│ - Sign without reserves (OK)            │
│ - Sign with reserves (Issue)            │
│ - Do not sign (Escalate)                │
└─────────────────────────────────────────┘
        │
        ▼ (If signed without reserves)
┌─────────────────────────────────────────┐
│ STEP 3: Provider Payment Authorized     │
│ Service Order Status: PAYMENT_AUTH      │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ STEP 4: Generate Pro Forma Invoice      │
│ Send to Provider for signature          │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ STEP 5: Provider Signs/Contests Invoice │
│ Options:                                │
│ - Sign (Accept)                         │
│ - Contest (Dispute amount/details)      │
└─────────────────────────────────────────┘
        │
        ▼ (If signed)
┌─────────────────────────────────────────┐
│ STEP 6: Trigger Payment (Kafka Event)   │
│ Send to external payment system         │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│ STEP 7: Payment Confirmation (Kafka)    │
│ Update Service Order: PROVIDER_PAID     │
└─────────────────────────────────────────┘
```

---

## 2. WCF (Work Closing Form) Lifecycle

### 2.1 WCF Auto-Send Trigger

**Trigger Event**: `CheckOut.completed`

**Business Rule**: WCF is automatically sent to customer **immediately** after provider check-out is completed.

```typescript
interface WCFAutoSendConfig {
  enabled: boolean;
  sendOnCheckoutComplete: boolean;
  deliveryChannels: ('EMAIL' | 'SMS' | 'APP_NOTIFICATION')[];
  signatureDeadlineHours: number; // Default: 48 hours
  reminderSchedule: ReminderSchedule[];
}

interface ReminderSchedule {
  hoursAfterSend: number;
  channel: 'EMAIL' | 'SMS' | 'APP_NOTIFICATION';
  message: string;
}

const defaultWCFConfig: WCFAutoSendConfig = {
  enabled: true,
  sendOnCheckoutComplete: true,
  deliveryChannels: ['EMAIL', 'SMS'],
  signatureDeadlineHours: 48,
  reminderSchedule: [
    { hoursAfterSend: 24, channel: 'EMAIL', message: 'Reminder: Please sign WCF' },
    { hoursAfterSend: 40, channel: 'SMS', message: 'Final reminder: WCF signature needed' }
  ]
};
```

### 2.2 WCF Generation Function

```typescript
interface WCFGenerationInput {
  serviceOrderId: string;
  checkOutId: string;
  providerId: string;
  customerId: string;
  workSummary: WorkSummary;
  photos: Photo[];
  completionStatus: CompletionStatus;
}

interface WCF {
  id: string;
  wcfNumber: string; // WCF-2025-001234
  serviceOrderId: string;
  checkOutId: string;
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;

  workSummary: WorkSummary;
  tasksCompleted: string[];
  materialsUsed: MaterialUsage[];
  photos: Photo[];
  completionStatus: CompletionStatus;

  templateType: 'STANDARD_WCF' | 'INSTALLATION_WCF' | 'TV_WCF' | 'MAINTENANCE_WCF';
  pdfUrl?: string;

  status: WCFStatus;
  createdAt: Date;
  sentToCustomerAt?: Date;
  signedAt?: Date;
  signedBy?: string;
  signatureType?: 'NO_RESERVES' | 'WITH_RESERVES' | 'NOT_SIGNED';
  reserves?: CustomerReserve[];

  expiresAt: Date; // sentToCustomerAt + 48 hours
}

enum WCFStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  SIGNED_NO_RESERVES = 'SIGNED_NO_RESERVES',
  SIGNED_WITH_RESERVES = 'SIGNED_WITH_RESERVES',
  NOT_SIGNED = 'NOT_SIGNED',
  EXPIRED = 'EXPIRED'
}

async function generateAndSendWCF(
  input: WCFGenerationInput
): Promise<WCF> {
  const serviceOrder = await serviceOrderRepository.findById(input.serviceOrderId);
  const provider = await providerRepository.findById(input.providerId);
  const customer = await customerRepository.findById(input.customerId);

  // Generate WCF document
  const wcfNumber = await generateWCFNumber();
  const templateType = selectWCFTemplate(serviceOrder.serviceType);

  const wcf = await wcfRepository.create({
    wcfNumber,
    serviceOrderId: input.serviceOrderId,
    checkOutId: input.checkOutId,
    providerId: input.providerId,
    providerName: provider.name,
    customerId: input.customerId,
    customerName: customer.name,
    workSummary: input.workSummary,
    tasksCompleted: input.workSummary.tasksCompleted,
    materialsUsed: input.workSummary.materialsUsed,
    photos: input.photos,
    completionStatus: input.completionStatus,
    templateType,
    status: WCFStatus.DRAFT,
    createdAt: new Date(),
    expiresAt: addHours(new Date(), 48)
  });

  // Generate PDF
  const pdfUrl = await documentService.generateWCFPdf(wcf);
  await wcfRepository.update(wcf.id, { pdfUrl });

  // Send to customer
  await sendWCFToCustomer(wcf, customer);

  return wcf;
}
```

### 2.3 WCF Template Selection

```typescript
function selectWCFTemplate(serviceType: string): string {
  const templateMap: Record<string, string> = {
    'installation': 'INSTALLATION_WCF',
    'tv': 'TV_WCF',
    'maintenance': 'MAINTENANCE_WCF',
    'rework': 'STANDARD_WCF'
  };

  return templateMap[serviceType] || 'STANDARD_WCF';
}
```

### 2.4 Send WCF to Customer

```typescript
async function sendWCFToCustomer(
  wcf: WCF,
  customer: Customer
): Promise<void> {
  const signatureUrl = await generateWCFSignatureUrl(wcf.id);

  // Email
  await emailService.send({
    to: customer.email,
    subject: `Work Completion Form - ${wcf.wcfNumber}`,
    template: 'wcf_signature_request',
    variables: {
      customerName: customer.name,
      wcfNumber: wcf.wcfNumber,
      providerName: wcf.providerName,
      signatureUrl,
      expiresAt: wcf.expiresAt,
      pdfUrl: wcf.pdfUrl
    }
  });

  // SMS
  await smsService.send({
    to: customer.phone,
    message: `Please sign Work Completion Form ${wcf.wcfNumber}. Link: ${signatureUrl}. Expires in 48h.`
  });

  // Update WCF status
  await wcfRepository.update(wcf.id, {
    status: WCFStatus.SENT,
    sentToCustomerAt: new Date()
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.wcf.sent',
    key: wcf.id,
    value: {
      wcfId: wcf.id,
      wcfNumber: wcf.wcfNumber,
      serviceOrderId: wcf.serviceOrderId,
      customerId: wcf.customerId,
      sentAt: new Date(),
      expiresAt: wcf.expiresAt
    }
  });

  // Schedule reminders
  await scheduleWCFReminders(wcf);
}
```

---

## 3. WCF Signature Options

### 3.1 Option 1: Sign Without Reserves (Happy Path)

**Customer Action**: Customer reviews WCF and signs without any quality concerns.

**System Action**:
- WCF status → `SIGNED_NO_RESERVES`
- Trigger provider payment authorization
- Send confirmation to customer and provider

```typescript
async function signWCFWithoutReserves(
  wcfId: string,
  customerId: string,
  signatureData: SignatureData
): Promise<void> {
  const wcf = await wcfRepository.findById(wcfId);

  // Validate customer
  if (wcf.customerId !== customerId) {
    throw new Error('Customer ID mismatch');
  }

  // Update WCF
  await wcfRepository.update(wcfId, {
    status: WCFStatus.SIGNED_NO_RESERVES,
    signedAt: new Date(),
    signedBy: customerId,
    signatureType: 'NO_RESERVES',
    signatureData
  });

  // Update service order
  await serviceOrderRepository.update(wcf.serviceOrderId, {
    wcfId,
    wcfStatus: WCFStatus.SIGNED_NO_RESERVES,
    customerAcceptedAt: new Date()
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.wcf.signed_no_reserves',
    key: wcf.id,
    value: {
      wcfId: wcf.id,
      serviceOrderId: wcf.serviceOrderId,
      customerId,
      signedAt: new Date()
    }
  });

  // Trigger payment authorization
  await authorizeProviderPayment(wcf.serviceOrderId);

  // Send confirmations
  await notificationService.sendWCFSignedConfirmationToCustomer(wcf);
  await notificationService.sendWCFSignedConfirmationToProvider(wcf);
}
```

---

### 3.2 Option 2: Sign With Reserves (Quality Issues)

**Customer Action**: Customer signs but notes quality concerns/reserves.

**Reserves Examples**:
- "Cabinet door not aligned properly"
- "Small scratch on countertop"
- "Incomplete cleanup of work area"

**System Action**:
- WCF status → `SIGNED_WITH_RESERVES`
- DO NOT authorize payment yet
- Create alert for operator
- Create task for operator to resolve reserves

```typescript
interface CustomerReserve {
  id: string;
  wcfId: string;
  description: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR';
  photos?: Photo[];
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

async function signWCFWithReserves(
  wcfId: string,
  customerId: string,
  signatureData: SignatureData,
  reserves: Omit<CustomerReserve, 'id' | 'wcfId' | 'createdAt'>[]
): Promise<void> {
  const wcf = await wcfRepository.findById(wcfId);

  // Create reserve records
  const createdReserves: CustomerReserve[] = [];
  for (const reserve of reserves) {
    const created = await reserveRepository.create({
      ...reserve,
      wcfId,
      createdAt: new Date()
    });
    createdReserves.push(created);
  }

  // Update WCF
  await wcfRepository.update(wcfId, {
    status: WCFStatus.SIGNED_WITH_RESERVES,
    signedAt: new Date(),
    signedBy: customerId,
    signatureType: 'WITH_RESERVES',
    signatureData,
    reserves: createdReserves
  });

  // Update service order (payment NOT authorized)
  await serviceOrderRepository.update(wcf.serviceOrderId, {
    wcfId,
    wcfStatus: WCFStatus.SIGNED_WITH_RESERVES,
    customerAcceptedAt: new Date(),
    hasQualityReserves: true
  });

  // Create alert
  const alert = await alertRepository.create({
    type: 'WCF_SIGNED_WITH_RESERVES',
    severity: determineReserveSeverity(reserves),
    serviceOrderId: wcf.serviceOrderId,
    message: `Customer signed WCF with ${reserves.length} reserve(s)`,
    createdAt: new Date()
  });

  // Create operator task
  const task = await taskRepository.create({
    type: 'RESOLVE_WCF_RESERVES',
    serviceOrderId: wcf.serviceOrderId,
    wcfId,
    title: `Resolve WCF Reserves: ${wcf.serviceOrderId}`,
    description: `Customer signed WCF with quality reserves. Review and resolve.`,
    priority: 'HIGH',
    status: 'open',
    reserves: createdReserves,
    createdAt: new Date(),
    dueDate: addDays(new Date(), 2) // 2 days to resolve
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.wcf.signed_with_reserves',
    key: wcf.id,
    value: {
      wcfId: wcf.id,
      serviceOrderId: wcf.serviceOrderId,
      customerId,
      reserveCount: reserves.length,
      alertId: alert.id,
      taskId: task.id
    }
  });

  // Notify operator
  await notificationService.sendWCFReservesAlertToOperator(wcf, reserves);

  // Notify provider (work may need rework)
  await notificationService.sendWCFReservesNotificationToProvider(wcf, reserves);
}

function determineReserveSeverity(reserves: Partial<CustomerReserve>[]): string {
  const hasMajor = reserves.some(r => r.severity === 'MAJOR');
  if (hasMajor) return 'CRITICAL';

  const hasModerate = reserves.some(r => r.severity === 'MODERATE');
  if (hasModerate) return 'HIGH';

  return 'MEDIUM';
}
```

---

### 3.3 Option 3: Do Not Sign (Rejection)

**Customer Action**: Customer does not sign WCF (either explicitly declines or lets it expire after 48h).

**System Action**:
- WCF status → `NOT_SIGNED` (or `EXPIRED`)
- Create alert for operator
- Create urgent task for operator
- DO NOT authorize payment

```typescript
async function handleWCFNotSigned(
  wcfId: string,
  reason: 'EXPLICIT_DECLINE' | 'EXPIRED'
): Promise<void> {
  const wcf = await wcfRepository.findById(wcfId);

  // Update WCF
  await wcfRepository.update(wcfId, {
    status: reason === 'EXPIRED' ? WCFStatus.EXPIRED : WCFStatus.NOT_SIGNED,
    signatureType: 'NOT_SIGNED'
  });

  // Update service order
  await serviceOrderRepository.update(wcf.serviceOrderId, {
    wcfId,
    wcfStatus: reason === 'EXPIRED' ? WCFStatus.EXPIRED : WCFStatus.NOT_SIGNED,
    customerRejectedWCF: true
  });

  // Create alert
  const alert = await alertRepository.create({
    type: 'WCF_NOT_SIGNED',
    severity: 'CRITICAL',
    serviceOrderId: wcf.serviceOrderId,
    message: reason === 'EXPIRED'
      ? `WCF expired without customer signature (48h deadline passed)`
      : `Customer declined to sign WCF`,
    createdAt: new Date()
  });

  // Create operator task
  const task = await taskRepository.create({
    type: 'WCF_NOT_SIGNED',
    serviceOrderId: wcf.serviceOrderId,
    wcfId,
    title: `Urgent: WCF Not Signed - ${wcf.serviceOrderId}`,
    description: `Customer has not signed WCF. Contact customer to understand concerns and resolve.`,
    priority: 'URGENT',
    status: 'open',
    createdAt: new Date(),
    dueDate: addHours(new Date(), 4) // 4 hours to respond
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.wcf.not_signed',
    key: wcf.id,
    value: {
      wcfId: wcf.id,
      serviceOrderId: wcf.serviceOrderId,
      reason,
      alertId: alert.id,
      taskId: task.id
    }
  });

  // Notify operator (urgent)
  await notificationService.sendWCFNotSignedUrgentAlert(wcf, reason);

  // Notify provider (payment on hold)
  await notificationService.sendWCFNotSignedToProvider(wcf);
}

// Background job to auto-expire WCFs
async function autoExpireWCFs(): Promise<void> {
  const expiredWCFs = await wcfRepository.findExpired(new Date());

  for (const wcf of expiredWCFs) {
    if (wcf.status === WCFStatus.SENT || wcf.status === WCFStatus.VIEWED) {
      await handleWCFNotSigned(wcf.id, 'EXPIRED');
    }
  }
}
```

---

## 4. WCF Reserve Handling

### 4.1 Reserve Resolution Workflow

**Operator Actions**:
1. **Contact Customer**: Understand the reserve/concern
2. **Contact Provider**: Get provider's perspective
3. **Assess Severity**: Determine if rework is needed
4. **Resolution Options**:
   - Accept reserve as-is (minor issue, customer satisfied)
   - Schedule rework service order
   - Offer compensation/discount
   - Escalate to manager

```typescript
async function resolveWCFReserve(
  reserveId: string,
  operatorId: string,
  resolution: ReserveResolution
): Promise<void> {
  const reserve = await reserveRepository.findById(reserveId);
  const wcf = await wcfRepository.findById(reserve.wcfId);

  // Update reserve
  await reserveRepository.update(reserveId, {
    resolvedAt: new Date(),
    resolvedBy: operatorId,
    resolution: resolution.description,
    resolutionAction: resolution.action
  });

  // Check if all reserves resolved
  const allReserves = await reserveRepository.findByWCFId(wcf.id);
  const allResolved = allReserves.every(r => r.resolvedAt !== undefined);

  if (allResolved) {
    // All reserves resolved, authorize payment
    await authorizeProviderPayment(wcf.serviceOrderId);
  }

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.wcf.reserve_resolved',
    key: reserve.id,
    value: {
      reserveId: reserve.id,
      wcfId: wcf.id,
      serviceOrderId: wcf.serviceOrderId,
      resolutionAction: resolution.action,
      allResolved
    }
  });
}

interface ReserveResolution {
  action: 'ACCEPTED_AS_IS' | 'REWORK_SCHEDULED' | 'COMPENSATION_OFFERED' | 'ESCALATED';
  description: string;
  reworkOrderId?: string;
  compensationAmount?: number;
}
```

---

## 5. Provider Payment Authorization

### 5.1 Payment Authorization Logic

**Business Rule**: Provider payment is authorized when:
- WCF is signed without reserves, OR
- WCF is signed with reserves AND all reserves are resolved

```typescript
async function authorizeProviderPayment(
  serviceOrderId: string
): Promise<void> {
  const serviceOrder = await serviceOrderRepository.findById(serviceOrderId);
  const wcf = await wcfRepository.findById(serviceOrder.wcfId);

  // Validate WCF is signed
  if (wcf.status !== WCFStatus.SIGNED_NO_RESERVES &&
      wcf.status !== WCFStatus.SIGNED_WITH_RESERVES) {
    throw new Error('WCF must be signed to authorize payment');
  }

  // If signed with reserves, check all resolved
  if (wcf.status === WCFStatus.SIGNED_WITH_RESERVES) {
    const reserves = await reserveRepository.findByWCFId(wcf.id);
    const allResolved = reserves.every(r => r.resolvedAt !== undefined);
    if (!allResolved) {
      throw new Error('Cannot authorize payment with unresolved reserves');
    }
  }

  // Update service order
  await serviceOrderRepository.update(serviceOrderId, {
    providerPaymentStatus: 'AUTHORIZED',
    providerPaymentAuthorizedAt: new Date()
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.provider.authorized',
    key: serviceOrderId,
    value: {
      serviceOrderId,
      wcfId: wcf.id,
      providerId: serviceOrder.providerId,
      authorizedAt: new Date()
    }
  });

  // Trigger pro forma invoice generation
  await generateProFormaInvoice(serviceOrderId);
}
```

---

## 6. Pro Forma Invoice Generation

### 6.1 Invoice Data Model

```typescript
interface ProFormaInvoice {
  id: string;
  invoiceNumber: string; // PFI-2025-001234
  serviceOrderId: string;
  providerId: string;
  providerName: string;

  lineItems: InvoiceLineItem[];
  subtotal: Money;
  taxRate: number;
  taxAmount: Money;
  totalAmount: Money;

  paymentTerms: string;
  dueDate: Date;

  pdfUrl?: string;
  status: InvoiceStatus;
  createdAt: Date;
  sentToProviderAt?: Date;
  signedAt?: Date;
  signedBy?: string;
  contestedAt?: Date;
  contestReason?: string;
}

enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  SIGNED = 'SIGNED',
  CONTESTED = 'CONTESTED',
  VOID = 'VOID'
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
  serviceType?: string;
  workDate?: Date;
}
```

### 6.2 Invoice Generation Function

```typescript
async function generateProFormaInvoice(
  serviceOrderId: string
): Promise<ProFormaInvoice> {
  const serviceOrder = await serviceOrderRepository.findById(serviceOrderId);
  const provider = await providerRepository.findById(serviceOrder.providerId);
  const assignment = await assignmentRepository.findByServiceOrderId(serviceOrderId);

  // Calculate line items
  const lineItems: InvoiceLineItem[] = [
    {
      description: `${serviceOrder.serviceType} Service - ${serviceOrder.id}`,
      quantity: 1,
      unitPrice: assignment.agreedPrice,
      totalPrice: assignment.agreedPrice,
      serviceType: serviceOrder.serviceType,
      workDate: assignment.completedAt
    }
  ];

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = await getTaxRateForCountry(serviceOrder.countryCode);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Create invoice
  const invoiceNumber = await generateInvoiceNumber();
  const invoice = await invoiceRepository.create({
    invoiceNumber,
    serviceOrderId,
    providerId: provider.id,
    providerName: provider.name,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    paymentTerms: 'Payment within 30 days of invoice signature',
    dueDate: addDays(new Date(), 30),
    status: InvoiceStatus.DRAFT,
    createdAt: new Date()
  });

  // Generate PDF
  const pdfUrl = await documentService.generateInvoicePdf(invoice);
  await invoiceRepository.update(invoice.id, { pdfUrl });

  // Send to provider
  await sendInvoiceToProvider(invoice, provider);

  return invoice;
}
```

### 6.3 Send Invoice to Provider

```typescript
async function sendInvoiceToProvider(
  invoice: ProFormaInvoice,
  provider: Provider
): Promise<void> {
  const signatureUrl = await generateInvoiceSignatureUrl(invoice.id);

  // Email
  await emailService.send({
    to: provider.email,
    subject: `Pro Forma Invoice - ${invoice.invoiceNumber}`,
    template: 'invoice_signature_request',
    variables: {
      providerName: provider.name,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      signatureUrl,
      pdfUrl: invoice.pdfUrl,
      dueDate: invoice.dueDate
    }
  });

  // Update invoice
  await invoiceRepository.update(invoice.id, {
    status: InvoiceStatus.SENT,
    sentToProviderAt: new Date()
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.invoice.sent',
    key: invoice.id,
    value: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      serviceOrderId: invoice.serviceOrderId,
      providerId: invoice.providerId,
      totalAmount: invoice.totalAmount,
      sentAt: new Date()
    }
  });
}
```

---

## 7. Provider Invoice Signature/Contest

### 7.1 Provider Signs Invoice (Accept)

```typescript
async function providerSignInvoice(
  invoiceId: string,
  providerId: string,
  signatureData: SignatureData
): Promise<void> {
  const invoice = await invoiceRepository.findById(invoiceId);

  // Validate provider
  if (invoice.providerId !== providerId) {
    throw new Error('Provider ID mismatch');
  }

  // Update invoice
  await invoiceRepository.update(invoiceId, {
    status: InvoiceStatus.SIGNED,
    signedAt: new Date(),
    signedBy: providerId,
    signatureData
  });

  // Update service order
  await serviceOrderRepository.update(invoice.serviceOrderId, {
    providerInvoiceId: invoiceId,
    providerInvoiceStatus: InvoiceStatus.SIGNED,
    providerInvoiceSignedAt: new Date()
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.invoice.signed',
    key: invoiceId,
    value: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      serviceOrderId: invoice.serviceOrderId,
      providerId,
      totalAmount: invoice.totalAmount,
      signedAt: new Date()
    }
  });

  // Trigger payment
  await triggerProviderPayment(invoice);
}
```

### 7.2 Provider Contests Invoice (Dispute)

```typescript
interface InvoiceContest {
  id: string;
  invoiceId: string;
  providerId: string;
  contestReason: string;
  disputedAmount?: Money;
  proposedAmount?: Money;
  contestDetails: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

async function providerContestInvoice(
  invoiceId: string,
  providerId: string,
  contest: Omit<InvoiceContest, 'id' | 'invoiceId' | 'providerId' | 'createdAt'>
): Promise<InvoiceContest> {
  const invoice = await invoiceRepository.findById(invoiceId);

  // Create contest record
  const contestRecord = await invoiceContestRepository.create({
    ...contest,
    invoiceId,
    providerId,
    createdAt: new Date()
  });

  // Update invoice
  await invoiceRepository.update(invoiceId, {
    status: InvoiceStatus.CONTESTED,
    contestedAt: new Date(),
    contestReason: contest.contestReason
  });

  // Create operator task
  const task = await taskRepository.create({
    type: 'INVOICE_CONTESTED',
    serviceOrderId: invoice.serviceOrderId,
    invoiceId,
    title: `Invoice Contested: ${invoice.invoiceNumber}`,
    description: `Provider disputes invoice amount or details. Reason: ${contest.contestReason}`,
    priority: 'HIGH',
    status: 'open',
    createdAt: new Date(),
    dueDate: addDays(new Date(), 3)
  });

  // Kafka event
  await kafkaProducer.send({
    topic: 'payment.invoice.contested',
    key: invoiceId,
    value: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      serviceOrderId: invoice.serviceOrderId,
      providerId,
      contestReason: contest.contestReason,
      taskId: task.id
    }
  });

  // Notify operator
  await notificationService.sendInvoiceContestedAlert(invoice, contestRecord);

  return contestRecord;
}
```

---

## 8. Payment Trigger Integration

### 8.1 Payment Trigger Event (Kafka)

**Topic**: `payment.provider.payment_requested`

**Trigger**: Provider invoice signed

**Consumer**: External payment system (outside FSM scope)

```typescript
async function triggerProviderPayment(
  invoice: ProFormaInvoice
): Promise<void> {
  const serviceOrder = await serviceOrderRepository.findById(invoice.serviceOrderId);
  const provider = await providerRepository.findById(invoice.providerId);

  // Send Kafka event to payment system
  await kafkaProducer.send({
    topic: 'payment.provider.payment_requested',
    key: invoice.id,
    value: {
      paymentRequestId: uuidv4(),
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      serviceOrderId: serviceOrder.id,
      providerId: provider.id,
      providerName: provider.name,
      providerBankAccount: provider.bankAccount,
      totalAmount: invoice.totalAmount,
      currency: serviceOrder.currency,
      paymentMethod: 'BANK_TRANSFER',
      requestedAt: new Date(),
      dueDate: invoice.dueDate
    }
  });

  // Update service order
  await serviceOrderRepository.update(serviceOrder.id, {
    providerPaymentStatus: 'PAYMENT_REQUESTED',
    providerPaymentRequestedAt: new Date()
  });
}
```

### 8.2 Payment Request Event Schema

```json
{
  "type": "record",
  "name": "ProviderPaymentRequested",
  "namespace": "com.ahs.fsm.events.payment",
  "fields": [
    { "name": "payment_request_id", "type": "string" },
    { "name": "invoice_id", "type": "string" },
    { "name": "invoice_number", "type": "string" },
    { "name": "service_order_id", "type": "string" },
    { "name": "provider_id", "type": "string" },
    { "name": "provider_name", "type": "string" },
    { "name": "provider_bank_account", "type": {
      "type": "record",
      "name": "BankAccount",
      "fields": [
        { "name": "iban", "type": "string" },
        { "name": "bic", "type": "string" },
        { "name": "bank_name", "type": "string" }
      ]
    }},
    { "name": "total_amount", "type": "double" },
    { "name": "currency", "type": "string" },
    { "name": "payment_method", "type": "string" },
    { "name": "requested_at", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "due_date", "type": "long", "logicalType": "timestamp-millis" }
  ]
}
```

---

## 9. Payment Confirmation Feedback

### 9.1 Payment Confirmation Event (Kafka)

**Topic**: `payment.provider.payment_completed`

**Source**: External payment system

**Consumer**: FSM platform

```typescript
interface PaymentConfirmationEvent {
  paymentId: string;
  paymentRequestId: string;
  invoiceId: string;
  invoiceNumber: string;
  serviceOrderId: string;
  providerId: string;
  amountPaid: Money;
  currency: string;
  paymentMethod: string;
  paymentDate: Date;
  transactionReference: string;
  bankTransactionId?: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  failureReason?: string;
}

async function handlePaymentConfirmation(
  event: PaymentConfirmationEvent
): Promise<void> {
  if (event.status === 'COMPLETED') {
    // Update invoice
    await invoiceRepository.update(event.invoiceId, {
      paymentStatus: 'PAID',
      paidAt: event.paymentDate,
      paidAmount: event.amountPaid,
      transactionReference: event.transactionReference
    });

    // Update service order
    await serviceOrderRepository.update(event.serviceOrderId, {
      providerPaymentStatus: 'PAID',
      providerPaidAt: event.paymentDate,
      providerPaidAmount: event.amountPaid,
      providerPaymentReference: event.transactionReference
    });

    // Kafka event
    await kafkaProducer.send({
      topic: 'payment.provider.payment_confirmed',
      key: event.invoiceId,
      value: {
        ...event,
        confirmedAt: new Date()
      }
    });

    // Notify provider (payment completed)
    await notificationService.sendPaymentCompletedToProvider(event);

  } else if (event.status === 'FAILED') {
    // Create alert for operator
    await alertRepository.create({
      type: 'PROVIDER_PAYMENT_FAILED',
      severity: 'HIGH',
      serviceOrderId: event.serviceOrderId,
      message: `Provider payment failed: ${event.failureReason}`,
      createdAt: new Date()
    });

    // Notify operator
    await notificationService.sendPaymentFailedAlert(event);
  }
}
```

### 9.2 Payment Confirmation Event Schema

```json
{
  "type": "record",
  "name": "ProviderPaymentCompleted",
  "namespace": "com.ahs.fsm.events.payment",
  "fields": [
    { "name": "payment_id", "type": "string" },
    { "name": "payment_request_id", "type": "string" },
    { "name": "invoice_id", "type": "string" },
    { "name": "invoice_number", "type": "string" },
    { "name": "service_order_id", "type": "string" },
    { "name": "provider_id", "type": "string" },
    { "name": "amount_paid", "type": "double" },
    { "name": "currency", "type": "string" },
    { "name": "payment_method", "type": "string" },
    { "name": "payment_date", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "transaction_reference", "type": "string" },
    { "name": "bank_transaction_id", "type": ["null", "string"], "default": null },
    { "name": "status", "type": { "type": "enum", "symbols": ["COMPLETED", "FAILED", "PENDING"] }},
    { "name": "failure_reason", "type": ["null", "string"], "default": null }
  ]
}
```

---

## 10. Data Model

### 10.1 Database Schema

**WCF Table**:

```sql
CREATE TABLE work_closing_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wcf_number VARCHAR(50) NOT NULL UNIQUE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id),
  checkout_id UUID NOT NULL REFERENCES checkouts(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  provider_name VARCHAR(255) NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,

  work_summary JSONB NOT NULL,
  tasks_completed TEXT[],
  materials_used JSONB,
  photos JSONB,
  completion_status VARCHAR(50) NOT NULL,

  template_type VARCHAR(50) NOT NULL,
  pdf_url TEXT,

  status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'VIEWED', 'SIGNED_NO_RESERVES', 'SIGNED_WITH_RESERVES', 'NOT_SIGNED', 'EXPIRED')) DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_to_customer_at TIMESTAMP,
  signed_at TIMESTAMP,
  signed_by VARCHAR(255),
  signature_type VARCHAR(50),
  signature_data JSONB,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_wcf_service_order ON work_closing_forms(service_order_id);
CREATE INDEX idx_wcf_status ON work_closing_forms(status);
CREATE INDEX idx_wcf_created_at ON work_closing_forms(created_at);
```

**Customer Reserves Table**:

```sql
CREATE TABLE customer_reserves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wcf_id UUID NOT NULL REFERENCES work_closing_forms(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('MINOR', 'MODERATE', 'MAJOR')),
  photos JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  resolution TEXT,
  resolution_action VARCHAR(50)
);

CREATE INDEX idx_reserves_wcf ON customer_reserves(wcf_id);
CREATE INDEX idx_reserves_resolved ON customer_reserves(resolved_at);
```

**Pro Forma Invoices Table**:

```sql
CREATE TABLE proforma_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  provider_name VARCHAR(255) NOT NULL,

  line_items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,

  payment_terms TEXT,
  due_date DATE NOT NULL,

  pdf_url TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'CONTESTED', 'VOID')) DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_to_provider_at TIMESTAMP,
  signed_at TIMESTAMP,
  signed_by VARCHAR(255),
  signature_data JSONB,
  contested_at TIMESTAMP,
  contest_reason TEXT,

  payment_status VARCHAR(50),
  paid_at TIMESTAMP,
  paid_amount DECIMAL(10, 2),
  transaction_reference VARCHAR(255)
);

CREATE INDEX idx_invoice_service_order ON proforma_invoices(service_order_id);
CREATE INDEX idx_invoice_provider ON proforma_invoices(provider_id);
CREATE INDEX idx_invoice_status ON proforma_invoices(status);
```

**Invoice Contests Table**:

```sql
CREATE TABLE invoice_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES proforma_invoices(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  contest_reason TEXT NOT NULL,
  disputed_amount DECIMAL(10, 2),
  proposed_amount DECIMAL(10, 2),
  contest_details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution TEXT
);

CREATE INDEX idx_contest_invoice ON invoice_contests(invoice_id);
CREATE INDEX idx_contest_provider ON invoice_contests(provider_id);
```

**Service Orders Table Update**:

```sql
ALTER TABLE service_orders ADD COLUMN wcf_id UUID REFERENCES work_closing_forms(id);
ALTER TABLE service_orders ADD COLUMN wcf_status VARCHAR(50);
ALTER TABLE service_orders ADD COLUMN customer_accepted_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN has_quality_reserves BOOLEAN DEFAULT FALSE;
ALTER TABLE service_orders ADD COLUMN customer_rejected_wcf BOOLEAN DEFAULT FALSE;

ALTER TABLE service_orders ADD COLUMN provider_payment_status VARCHAR(50);
ALTER TABLE service_orders ADD COLUMN provider_payment_authorized_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN provider_payment_requested_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN provider_invoice_id UUID REFERENCES proforma_invoices(id);
ALTER TABLE service_orders ADD COLUMN provider_invoice_status VARCHAR(50);
ALTER TABLE service_orders ADD COLUMN provider_invoice_signed_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN provider_paid_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN provider_paid_amount DECIMAL(10, 2);
ALTER TABLE service_orders ADD COLUMN provider_payment_reference VARCHAR(255);
```

---

## 11. API Examples

### 11.1 Sign WCF Without Reserves

**POST** `/api/v1/wcf/{wcfId}/sign`

**Request**:

```json
{
  "customerId": "cust_abc123",
  "signatureType": "NO_RESERVES",
  "signatureData": {
    "type": "ELECTRONIC",
    "timestamp": "2025-01-20T15:30:00Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response**:

```json
{
  "wcfId": "wcf_xyz789",
  "status": "SIGNED_NO_RESERVES",
  "signedAt": "2025-01-20T15:30:00Z",
  "message": "Thank you for signing the Work Closing Form. Provider payment has been authorized.",
  "paymentAuthorized": true,
  "invoiceGenerated": true,
  "invoiceId": "pfi_def456"
}
```

### 11.2 Sign WCF With Reserves

**POST** `/api/v1/wcf/{wcfId}/sign`

**Request**:

```json
{
  "customerId": "cust_abc123",
  "signatureType": "WITH_RESERVES",
  "signatureData": { /* ... */ },
  "reserves": [
    {
      "description": "Cabinet door slightly misaligned",
      "severity": "MINOR"
    },
    {
      "description": "Small scratch on countertop",
      "severity": "MODERATE",
      "photos": [
        { "url": "https://storage.example.com/photo1.jpg" }
      ]
    }
  ]
}
```

**Response**:

```json
{
  "wcfId": "wcf_xyz789",
  "status": "SIGNED_WITH_RESERVES",
  "signedAt": "2025-01-20T15:30:00Z",
  "reserveCount": 2,
  "message": "Thank you for signing with reserves. Our team will contact you to resolve the concerns.",
  "paymentAuthorized": false,
  "taskCreated": true,
  "taskId": "task_ghi789",
  "expectedResolutionTime": "Within 48 hours"
}
```

### 11.3 Provider Sign Invoice

**POST** `/api/v1/invoices/{invoiceId}/sign`

**Request**:

```json
{
  "providerId": "prov_123",
  "signatureData": {
    "type": "ELECTRONIC",
    "timestamp": "2025-01-21T10:00:00Z"
  }
}
```

**Response**:

```json
{
  "invoiceId": "pfi_def456",
  "status": "SIGNED",
  "signedAt": "2025-01-21T10:00:00Z",
  "totalAmount": 350.00,
  "currency": "EUR",
  "message": "Invoice signed. Payment has been requested and will be processed within 3-5 business days.",
  "paymentRequested": true,
  "expectedPaymentDate": "2025-01-26"
}
```

### 11.4 Provider Contest Invoice

**POST** `/api/v1/invoices/{invoiceId}/contest`

**Request**:

```json
{
  "providerId": "prov_123",
  "contestReason": "Incorrect service date and hours worked",
  "disputedAmount": 350.00,
  "proposedAmount": 420.00,
  "contestDetails": "Invoice shows 3 hours of work but actual time was 4.5 hours. Also, service date is wrong - should be 2025-01-19, not 2025-01-20."
}
```

**Response**:

```json
{
  "invoiceId": "pfi_def456",
  "status": "CONTESTED",
  "contestId": "contest_jkl012",
  "contestedAt": "2025-01-21T10:00:00Z",
  "message": "Invoice contest submitted. Our team will review and contact you within 3 business days.",
  "taskCreated": true,
  "taskId": "task_mno345"
}
```

---

**End of Document**
