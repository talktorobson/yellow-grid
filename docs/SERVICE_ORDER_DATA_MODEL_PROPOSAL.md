# Service Order Enhanced Data Model Proposal

**Date**: 2025-11-26  
**Status**: DRAFT  
**Author**: Engineering Team

---

## Executive Summary

This document proposes an enhanced data model for Service Orders to address the following gaps:
1. **Sales Context**: Sales system, channel, store, order numbers
2. **Financial Data**: Customer prices, provider costs, taxes
3. **Line Items**: Products and services with quantities, prices, taxes
4. **Delivery Tracking**: Product delivery dates and statuses
5. **Customer Contacts**: Multiple contact methods (email, phone, mobile)

---

## 1. New Models to Add

### 1.1 SalesSystem (Reference Data)

Represents the external sales systems that feed orders into FSM.

```prisma
model SalesSystem {
  id                String   @id @default(uuid())
  code              String   @unique @db.VarChar(20) // PYXIS, TEMPO, SAP, MANUAL
  name              String   @db.VarChar(100)
  description       String?  @db.Text
  
  // Integration settings
  apiEndpoint       String?  @map("api_endpoint") @db.VarChar(500)
  isActive          Boolean  @default(true) @map("is_active")
  
  // Relations
  serviceOrders     ServiceOrder[]
  
  // Audit
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  @@map("sales_systems")
}
```

### 1.2 Store (Reference Data)

Physical store locations within business units.

```prisma
model Store {
  id                String   @id @default(uuid())
  externalStoreId   String?  @unique @map("external_store_id") // Store code from sales system
  
  // Multi-tenancy
  countryCode       String   @map("country_code") @db.VarChar(3)
  businessUnit      String   @map("business_unit") @db.VarChar(50)
  buCode            String   @map("bu_code") @db.VarChar(20) // LM_ES_001, BD_FR_042
  
  // Store details
  name              String   @db.VarChar(255)
  address           Json     @map("address") // {street, city, postalCode, country, lat, lng}
  phone             String?  @db.VarChar(50)
  email             String?  @db.VarChar(255)
  
  // Operational
  timezone          String   @db.VarChar(50) // Europe/Madrid
  isActive          Boolean  @default(true) @map("is_active")
  
  // Relations
  serviceOrders     ServiceOrder[]
  
  // Audit
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  @@unique([countryCode, buCode])
  @@index([countryCode, businessUnit])
  @@index([buCode])
  @@map("stores")
}
```

### 1.3 ServiceOrderLineItem (Core Addition)

Line items for products and services within a service order.

```prisma
model ServiceOrderLineItem {
  id                    String   @id @default(uuid())
  serviceOrderId        String   @map("service_order_id")
  
  // Line identification
  lineNumber            Int      @map("line_number") // 1, 2, 3...
  externalLineId        String?  @map("external_line_id") @db.VarChar(100) // Sales system line ID
  
  // Item type discrimination
  lineType              LineItemType @map("line_type") // PRODUCT, SERVICE
  
  // Item reference (polymorphic - either product or service)
  sku                   String   @db.VarChar(100) // Product SKU or Service code
  externalSku           String?  @map("external_sku") @db.VarChar(100) // Original SKU from sales system
  name                  String   @db.VarChar(500)
  description           String?  @db.Text
  
  // Product-specific (only for PRODUCT type)
  productCategory       String?  @map("product_category") @db.VarChar(100) // HVAC, PLUMBING, etc.
  productBrand          String?  @map("product_brand") @db.VarChar(100)
  productModel          String?  @map("product_model") @db.VarChar(255)
  
  // Service-specific (only for SERVICE type)
  serviceId             String?  @map("service_id") // Link to ServiceCatalog
  
  // Quantities
  quantity              Decimal  @db.Decimal(10, 3) // Supports fractional quantities
  unitOfMeasure         String   @default("UNIT") @map("unit_of_measure") @db.VarChar(20) // UNIT, M2, ML, KG, HOUR
  
  // Customer pricing (what customer pays)
  unitPriceCustomer     Decimal  @map("unit_price_customer") @db.Decimal(12, 4) // Unit price excl. tax
  taxRateCustomer       Decimal  @map("tax_rate_customer") @db.Decimal(5, 4) // 0.2100 = 21%
  discountPercent       Decimal  @default(0) @map("discount_percent") @db.Decimal(5, 4)
  discountAmount        Decimal  @default(0) @map("discount_amount") @db.Decimal(12, 2)
  lineTotalCustomer     Decimal  @map("line_total_customer") @db.Decimal(12, 2) // Calculated: qty * price * (1 - discount) * (1 + tax)
  lineTotalCustomerExclTax Decimal @map("line_total_customer_excl_tax") @db.Decimal(12, 2)
  lineTaxAmountCustomer Decimal  @map("line_tax_amount_customer") @db.Decimal(12, 2)
  
  // Provider pricing (what we pay provider) - may differ from customer price
  unitPriceProvider     Decimal? @map("unit_price_provider") @db.Decimal(12, 4)
  taxRateProvider       Decimal? @map("tax_rate_provider") @db.Decimal(5, 4)
  lineTotalProvider     Decimal? @map("line_total_provider") @db.Decimal(12, 2)
  lineTotalProviderExclTax Decimal? @map("line_total_provider_excl_tax") @db.Decimal(12, 2)
  lineTaxAmountProvider Decimal? @map("line_tax_amount_provider") @db.Decimal(12, 2)
  
  // Margin tracking
  marginAmount          Decimal? @map("margin_amount") @db.Decimal(12, 2) // Customer - Provider
  marginPercent         Decimal? @map("margin_percent") @db.Decimal(5, 4)
  
  // Delivery tracking (for PRODUCT type)
  deliveryStatus        DeliveryStatus? @map("delivery_status")
  expectedDeliveryDate  DateTime? @map("expected_delivery_date")
  actualDeliveryDate    DateTime? @map("actual_delivery_date")
  deliveryReference     String?  @map("delivery_reference") @db.VarChar(100) // Tracking number
  deliveryNotes         String?  @map("delivery_notes") @db.Text
  
  // Execution tracking (for SERVICE type)
  executionStatus       LineExecutionStatus? @map("execution_status")
  executedAt            DateTime? @map("executed_at")
  executedQuantity      Decimal? @map("executed_quantity") @db.Decimal(10, 3)
  
  // Relations
  serviceOrder          ServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)
  service               ServiceCatalog? @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  
  // Audit
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  @@unique([serviceOrderId, lineNumber])
  @@index([serviceOrderId])
  @@index([sku])
  @@index([lineType])
  @@index([deliveryStatus])
  @@map("service_order_line_items")
}

enum LineItemType {
  PRODUCT   // Physical product (HVAC unit, faucet, etc.)
  SERVICE   // Service (installation, maintenance, etc.)
}

enum DeliveryStatus {
  PENDING           // Not yet shipped
  SHIPPED           // In transit
  DELIVERED         // Delivered to customer
  PARTIAL           // Partially delivered
  RETURNED          // Returned
  CANCELLED         // Cancelled
}

enum LineExecutionStatus {
  PENDING           // Not started
  IN_PROGRESS       // Being executed
  COMPLETED         // Fully executed
  PARTIAL           // Partially executed
  SKIPPED           // Skipped (with reason)
  CANCELLED         // Cancelled
}
```

### 1.4 ServiceOrderContact (Multiple Contacts)

Multiple customer contacts per service order.

```prisma
model ServiceOrderContact {
  id                String   @id @default(uuid())
  serviceOrderId    String   @map("service_order_id")
  
  // Contact details
  contactType       ContactType @map("contact_type")
  isPrimary         Boolean  @default(false) @map("is_primary")
  
  // Personal info
  firstName         String   @map("first_name") @db.VarChar(100)
  lastName          String   @map("last_name") @db.VarChar(100)
  title             String?  @db.VarChar(20) // Mr., Mrs., Dr.
  
  // Contact methods
  email             String?  @db.VarChar(255)
  phone             String?  @db.VarChar(50) // Landline
  mobile            String?  @db.VarChar(50) // Mobile
  whatsapp          String?  @db.VarChar(50) // WhatsApp number (may differ from mobile)
  
  // Preferences
  preferredMethod   ContactMethod? @map("preferred_method")
  preferredLanguage String?  @map("preferred_language") @db.VarChar(5) // es, fr, it
  doNotCall         Boolean  @default(false) @map("do_not_call")
  doNotEmail        Boolean  @default(false) @map("do_not_email")
  
  // Availability
  availabilityNotes String?  @map("availability_notes") @db.Text // "Available after 5pm"
  
  // Relations
  serviceOrder      ServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)
  
  // Audit
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  @@index([serviceOrderId])
  @@index([serviceOrderId, isPrimary])
  @@map("service_order_contacts")
}

enum ContactType {
  CUSTOMER          // End customer
  SITE_CONTACT      // Person at service location (may differ from customer)
  BILLING           // Billing contact
  EMERGENCY         // Emergency contact
}

enum ContactMethod {
  EMAIL
  PHONE
  MOBILE
  WHATSAPP
  SMS
}
```

---

## 2. Enhanced ServiceOrder Model

Add these fields to the existing ServiceOrder model:

```prisma
model ServiceOrder {
  // ... existing fields ...

  // ============================================================================
  // NEW: Sales Context (v2.1)
  // ============================================================================
  
  // Sales system reference
  salesSystemId         String?  @map("sales_system_id")
  salesSystem           SalesSystem? @relation(fields: [salesSystemId], references: [id], onDelete: SetNull)
  
  // Store reference
  storeId               String?  @map("store_id")
  store                 Store?   @relation(fields: [storeId], references: [id], onDelete: SetNull)
  
  // Business unit code (denormalized for quick access)
  buCode                String?  @map("bu_code") @db.VarChar(20) // LM_ES_001, BD_FR_042
  
  // Sales channel
  salesChannel          SalesChannel? @map("sales_channel")
  
  // Order identification
  salesOrderNumber      String?  @map("sales_order_number") @db.VarChar(50) // Human-readable: "LM-2025-123456"
  salesOrderLineId      String?  @map("sales_order_line_id") @db.VarChar(50) // If SO has multiple service orders
  
  // Order date (when customer placed order, not when SO was created in FSM)
  orderDate             DateTime? @map("order_date")
  
  // ============================================================================
  // NEW: Financial Totals (v2.1) - Aggregated from line items
  // ============================================================================
  
  // Currency
  currency              String   @default("EUR") @db.VarChar(3)
  
  // Customer totals (what customer pays)
  totalAmountCustomer   Decimal? @map("total_amount_customer") @db.Decimal(12, 2) // Total incl. tax
  totalAmountCustomerExclTax Decimal? @map("total_amount_customer_excl_tax") @db.Decimal(12, 2)
  totalTaxCustomer      Decimal? @map("total_tax_customer") @db.Decimal(12, 2)
  totalDiscountCustomer Decimal? @map("total_discount_customer") @db.Decimal(12, 2)
  
  // Provider totals (what we pay provider)
  totalAmountProvider   Decimal? @map("total_amount_provider") @db.Decimal(12, 2)
  totalAmountProviderExclTax Decimal? @map("total_amount_provider_excl_tax") @db.Decimal(12, 2)
  totalTaxProvider      Decimal? @map("total_tax_provider") @db.Decimal(12, 2)
  
  // Margin
  totalMargin           Decimal? @map("total_margin") @db.Decimal(12, 2)
  marginPercent         Decimal? @map("margin_percent") @db.Decimal(5, 4)
  
  // Payment tracking
  paymentStatus         PaymentStatus? @map("payment_status")
  paymentMethod         String?  @map("payment_method") @db.VarChar(50) // CARD, FINANCING, CASH
  paymentReference      String?  @map("payment_reference") @db.VarChar(100)
  paidAmount            Decimal? @map("paid_amount") @db.Decimal(12, 2)
  paidAt                DateTime? @map("paid_at")
  
  // ============================================================================
  // NEW: Delivery Context (v2.1)
  // ============================================================================
  
  // Overall product delivery status (computed from line items)
  productDeliveryStatus DeliveryStatus? @map("product_delivery_status")
  earliestDeliveryDate  DateTime? @map("earliest_delivery_date")
  latestDeliveryDate    DateTime? @map("latest_delivery_date")
  allProductsDelivered  Boolean  @default(false) @map("all_products_delivered")
  deliveryBlocksExecution Boolean @default(false) @map("delivery_blocks_execution") // Can't execute until delivered
  
  // ============================================================================
  // NEW: Relations (v2.1)
  // ============================================================================
  
  lineItems             ServiceOrderLineItem[]
  contacts              ServiceOrderContact[]
  
  // ============================================================================
  // NEW: Indexes (v2.1)
  // ============================================================================
  
  @@index([salesSystemId])
  @@index([storeId])
  @@index([buCode])
  @@index([salesChannel])
  @@index([salesOrderNumber])
  @@index([paymentStatus])
  @@index([productDeliveryStatus])
}

enum SalesChannel {
  IN_STORE      // Walk-in at physical store
  ONLINE        // E-commerce website
  MOBILE_APP    // Mobile application
  PHONE         // Call center
  PARTNER       // Partner/affiliate
  B2B           // Business to business
}

enum PaymentStatus {
  PENDING       // Not yet paid
  PARTIAL       // Partially paid
  PAID          // Fully paid
  REFUNDED      // Refunded
  CANCELLED     // Payment cancelled
}
```

---

## 3. Enhanced Project Model

Add customer contact fields to Project as well:

```prisma
model Project {
  // ... existing fields ...
  
  // ============================================================================
  // NEW: Enhanced Customer Info (v2.1)
  // ============================================================================
  
  // Additional customer contact
  customerMobile        String?  @map("customer_mobile") @db.VarChar(50)
  customerWhatsapp      String?  @map("customer_whatsapp") @db.VarChar(50)
  customerLanguage      String?  @map("customer_language") @db.VarChar(5) // es, fr, it
  
  // Site contact (if different from customer)
  siteContactName       String?  @map("site_contact_name") @db.VarChar(255)
  siteContactPhone      String?  @map("site_contact_phone") @db.VarChar(50)
  siteContactEmail      String?  @map("site_contact_email") @db.VarChar(255)
  
  // ============================================================================
  // NEW: Sales Context (v2.1)
  // ============================================================================
  
  salesSystemId         String?  @map("sales_system_id")
  storeId               String?  @map("store_id")
  buCode                String?  @map("bu_code") @db.VarChar(20)
  salesChannel          SalesChannel? @map("sales_channel")
}
```

---

## 4. ServiceCatalog Enhancement

Add relation to line items:

```prisma
model ServiceCatalog {
  // ... existing fields ...
  
  // NEW: Line items that reference this service
  lineItems             ServiceOrderLineItem[]
}
```

---

## 5. Migration Strategy

### Phase 1: Schema Migration (Non-Breaking)
1. Add new tables: `SalesSystem`, `Store`, `ServiceOrderLineItem`, `ServiceOrderContact`
2. Add new optional fields to `ServiceOrder` and `Project`
3. Add new enums
4. Run `prisma migrate dev`

### Phase 2: Data Backfill
1. Create default `SalesSystem` records (PYXIS, TEMPO, SAP, MANUAL)
2. Parse existing `customerInfo` JSON and populate `ServiceOrderContact` records
3. Backfill `buCode` from existing `businessUnit` + store info

### Phase 3: Frontend Updates
1. Update `ServiceOrderDetailPage` to display new fields
2. Add line items table/list
3. Add contacts section
4. Add financial summary card

### Phase 4: API Updates
1. Update DTOs to include new fields
2. Update service layer to handle line items
3. Add endpoints for line item CRUD
4. Add endpoints for contact CRUD

---

## 6. Data Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Sales System  │     │     Store       │     │    Customer     │
│   (PYXIS, etc.) │     │   (LM_ES_001)   │     │   (End User)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │     ServiceOrder       │
                    │ ─────────────────────  │
                    │ • salesSystemId        │
                    │ • storeId / buCode     │
                    │ • salesChannel         │
                    │ • Financial totals     │
                    │ • Delivery status      │
                    └────────────┬───────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐
    │  LineItems[]    │ │  Contacts[]   │ │   Existing      │
    │ ───────────     │ │ ───────────   │ │   Relations     │
    │ • PRODUCT items │ │ • CUSTOMER    │ │ • Provider      │
    │ • SERVICE items │ │ • SITE_CONTACT│ │ • WorkTeam      │
    │ • Qty, Price    │ │ • BILLING     │ │ • Bookings      │
    │ • Tax, Margin   │ │ • Email/Phone │ │ • Contracts     │
    │ • Delivery      │ │ • Mobile      │ │ • Tasks         │
    └─────────────────┘ └───────────────┘ └─────────────────┘
```

---

## 7. Example Data

### ServiceOrder with Line Items

```json
{
  "id": "uuid-123",
  "externalServiceOrderId": "PYXIS-2025-987654",
  "salesOrderNumber": "LM-2025-123456",
  "salesChannel": "IN_STORE",
  "buCode": "LM_ES_028",
  "currency": "EUR",
  
  "lineItems": [
    {
      "lineNumber": 1,
      "lineType": "PRODUCT",
      "sku": "HVAC-DAIKIN-2500W",
      "name": "Daikin Split AC 2500W",
      "quantity": 1,
      "unitOfMeasure": "UNIT",
      "unitPriceCustomer": 899.00,
      "taxRateCustomer": 0.21,
      "lineTotalCustomer": 1087.79,
      "deliveryStatus": "DELIVERED",
      "actualDeliveryDate": "2025-11-25"
    },
    {
      "lineNumber": 2,
      "lineType": "SERVICE",
      "sku": "SVC_ES_HVAC_INSTALL",
      "name": "HVAC Installation Service",
      "quantity": 1,
      "unitOfMeasure": "UNIT",
      "unitPriceCustomer": 250.00,
      "taxRateCustomer": 0.21,
      "lineTotalCustomer": 302.50,
      "unitPriceProvider": 180.00,
      "taxRateProvider": 0.21,
      "lineTotalProvider": 217.80,
      "marginAmount": 84.70,
      "executionStatus": "PENDING"
    }
  ],
  
  "contacts": [
    {
      "contactType": "CUSTOMER",
      "isPrimary": true,
      "firstName": "Juan",
      "lastName": "García",
      "email": "juan.garcia@email.com",
      "mobile": "+34612345678",
      "preferredMethod": "WHATSAPP"
    },
    {
      "contactType": "SITE_CONTACT",
      "isPrimary": false,
      "firstName": "María",
      "lastName": "García",
      "mobile": "+34687654321",
      "availabilityNotes": "Available weekday mornings only"
    }
  ],
  
  "totalAmountCustomer": 1390.29,
  "totalAmountProvider": 217.80,
  "totalMargin": 1172.49,
  "paymentStatus": "PAID",
  "productDeliveryStatus": "DELIVERED",
  "allProductsDelivered": true
}
```

---

## 8. Open Questions

1. **SKU Source of Truth**: Should we create a `Product` master table or rely on external SKUs?
2. **Tax Handling**: Should we support multiple tax lines per item (e.g., eco-tax + VAT)?
3. **Multi-Currency**: Do we need to support orders in different currencies within the same country?
4. **Warranty Tracking**: Should line items track warranty information?
5. **Returns/Exchanges**: How should we handle product returns or exchanges?

---

## 9. Next Steps

1. [ ] Review and approve this proposal
2. [ ] Create Prisma migration script
3. [ ] Implement backend DTOs and service layer
4. [ ] Update frontend components
5. [ ] Write data migration scripts for existing orders
6. [ ] Update API documentation

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-11-26
