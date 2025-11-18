# WCF Document Persistence Migration Guide

**Date**: 2025-01-18
**Feature**: WCF Database Persistence + GCS Storage
**Status**: Implementation Complete
**Branch**: `claude/wcf-document-persistence-01USkJZFQU2MQwDXFwScCxUF`

---

## Overview

This document describes the migration from in-memory WCF storage to full database persistence with Google Cloud Storage (GCS) integration.

### What Changed

**Before**: WCF service used `Map<string, WcfRecord>` for in-memory storage only
**After**: Full PostgreSQL persistence with GCS storage for PDFs and photos

---

## Database Schema Changes

### New Tables Added

1. **work_completion_forms** - Main WCF metadata table
2. **wcf_materials** - Materials used during service
3. **wcf_equipment** - Equipment installed/removed
4. **wcf_labor** - Labor time tracking
5. **wcf_photos** - Before/after photos and documentation
6. **wcf_quality_checks** - Quality verification records
7. **wcf_signatures** - Customer and technician signatures

### New Enums

- `WcfStatus` - DRAFT, PENDING_SIGNATURE, SIGNED, APPROVED, REJECTED, FINALIZED
- `WcfPhotoType` - BEFORE_WORK, DURING_WORK, AFTER_WORK, ISSUE_FOUND, etc.
- `WcfSignerType` - CUSTOMER, TECHNICIAN, PROVIDER_MANAGER, QUALITY_INSPECTOR
- `EquipmentCondition` - NEW, EXCELLENT, GOOD, FAIR, POOR, DEFECTIVE, BEYOND_REPAIR

### Reverse Relations Added

- `ServiceOrder.workCompletionForms` - One-to-many relationship
- `Contract.workCompletionForms` - One-to-many relationship

---

## Running the Migration

### Prerequisites

1. PostgreSQL 15+ database running
2. Valid `DATABASE_URL` environment variable
3. Prisma CLI installed (`npm install`)

### Steps

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Generate Prisma Client with new models
npx prisma generate

# 3. Create migration
npx prisma migrate dev --name add_wcf_persistence

# 4. Verify migration
npx prisma migrate status

# 5. (Optional) Seed database with test data
npm run db:seed
```

### Rollback (if needed)

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Alternative: Drop WCF tables manually
psql $DATABASE_URL -c "DROP TABLE IF EXISTS wcf_signatures CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS wcf_quality_checks CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS wcf_photos CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS wcf_labor CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS wcf_equipment CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS wcf_materials CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS work_completion_forms CASCADE;"
```

---

## Environment Variables

### Required

```bash
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/yellow_grid?schema=public"
```

### Optional (GCS Configuration)

```bash
# Google Cloud Storage (for PDF and photo storage)
GCS_PROJECT_ID="your-gcp-project-id"
GCS_BUCKET="yellow-grid-media"
GCS_KEY_FILE="/path/to/service-account-key.json"
MEDIA_CDN_BASE="https://storage.googleapis.com/yellow-grid-media"

# For local development, can use emulator
GCS_EMULATOR_HOST="localhost:9023"
```

### Development Defaults

If GCS variables are not set, the service will:
- Log warnings about missing GCS configuration
- Store file paths/URLs in database (but actual file upload will fail)
- Use placeholder URLs: `https://cdn.yellow-grid.local/...`

---

## GCS Bucket Setup

### Production Setup

```bash
# 1. Create GCS bucket
gsutil mb -p your-project-id -c STANDARD -l europe-west1 gs://yellow-grid-media

# 2. Set bucket lifecycle (auto-delete old files)
gsutil lifecycle set gcs-lifecycle.json gs://yellow-grid-media

# 3. Enable versioning
gsutil versioning set on gs://yellow-grid-media

# 4. Create service account
gcloud iam service-accounts create yellow-grid-wcf \
  --description="Service account for WCF document storage" \
  --display-name="Yellow Grid WCF Service"

# 5. Grant bucket permissions
gsutil iam ch serviceAccount:yellow-grid-wcf@your-project-id.iam.gserviceaccount.com:objectAdmin \
  gs://yellow-grid-media

# 6. Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=yellow-grid-wcf@your-project-id.iam.gserviceaccount.com
```

### Example Lifecycle Policy

**File**: `gcs-lifecycle.json`

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 2555,
          "matchesPrefix": ["service-orders/"]
        }
      },
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 90,
          "matchesPrefix": ["thumbs/"]
        }
      }
    ]
  }
}
```

---

## Testing

### Unit Tests

```bash
# Run WCF service tests
npm test -- wcf.service.spec.ts

# Run all execution module tests
npm test -- src/modules/execution
```

### Integration Tests

```bash
# Run E2E tests
npm run test:e2e

# Test specific WCF endpoints
npm run test:e2e -- --grep "WCF"
```

### Manual Testing

```bash
# 1. Generate WCF
curl -X POST http://localhost:3000/wcf/generate \
  -H "Content-Type: application/json" \
  -d '{
    "serviceOrderId": "service-order-uuid",
    "customerName": "John Doe",
    "technicianName": "Jane Smith"
  }'

# 2. Submit WCF with acceptance
curl -X POST http://localhost:3000/wcf/submit \
  -H "Content-Type: application/json" \
  -d '{
    "serviceOrderId": "service-order-uuid",
    "accepted": true,
    "signatureDataUrl": "data:image/png;base64,..."
  }'

# 3. Get WCF
curl http://localhost:3000/wcf/service-order/service-order-uuid
```

---

## Data Migration (if applicable)

If you have existing WCF data in the old in-memory format that needs to be preserved:

```typescript
// scripts/migrate-wcf-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateWcfData() {
  // Load old data from backup/export
  const oldWcfData = loadOldWcfData();

  for (const oldWcf of oldWcfData) {
    await prisma.workCompletionForm.create({
      data: {
        wcfNumber: oldWcf.wcfNumber || generateWcfNumber(),
        serviceOrderId: oldWcf.serviceOrderId,
        customerAccepted: oldWcf.accepted,
        version: oldWcf.version,
        status: mapOldStatus(oldWcf),
        // ... map other fields
      },
    });
  }
}
```

**Note**: In the current implementation, there is no production data to migrate since the in-memory storage was non-persistent.

---

## Monitoring

### Database Queries to Monitor

```sql
-- Check WCF creation rate
SELECT DATE_TRUNC('hour', created_at) AS hour, COUNT(*)
FROM work_completion_forms
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Check WCF status distribution
SELECT status, COUNT(*)
FROM work_completion_forms
GROUP BY status;

-- Check average time to customer acceptance
SELECT AVG(customer_accepted_at - created_at) AS avg_time_to_acceptance
FROM work_completion_forms
WHERE customer_accepted_at IS NOT NULL;

-- Check WCFs with photos
SELECT wcf.wcf_number, COUNT(p.id) AS photo_count
FROM work_completion_forms wcf
LEFT JOIN wcf_photos p ON p.wcf_id = wcf.id
GROUP BY wcf.id
ORDER BY photo_count DESC;
```

### GCS Metrics

- Monitor bucket size: `gsutil du -sh gs://yellow-grid-media`
- Check storage class distribution
- Monitor API request rates in GCP Console

---

## Troubleshooting

### Issue: Migration fails with "relation does not exist"

**Solution**: Ensure you're connected to the correct database and schema
```bash
npx prisma migrate reset  # WARNING: Deletes all data
npx prisma migrate deploy
```

### Issue: GCS uploads fail with 403 Forbidden

**Solution**: Check service account permissions
```bash
gsutil iam get gs://yellow-grid-media
# Verify service account has objectAdmin role
```

### Issue: WCF number conflicts (duplicate key)

**Solution**: Sequence generation is based on latest record. Ensure proper transaction isolation:
```typescript
// Already handled in code with proper Prisma queries
const latest = await this.prisma.workCompletionForm.findFirst({
  where: { wcfNumber: { startsWith: prefix } },
  orderBy: { wcfNumber: 'desc' },
});
```

### Issue: Photos not visible after upload

**Solution**: Check signed URL expiration (default 7 days)
```typescript
// Re-generate signed URL
const [url] = await file.getSignedUrl({
  version: 'v4',
  action: 'read',
  expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
});
```

---

## Performance Considerations

### Database Indexes

All critical indexes are already defined in the Prisma schema:

- `work_completion_forms.service_order_id` - For lookups by service order
- `work_completion_forms.wcf_number` - Unique index for fast lookups
- `work_completion_forms.status` - For filtering by status
- `wcf_photos.wcf_id` - For photo lookups
- `wcf_labor.wcf_id` - For labor entry lookups

### Query Optimization

```typescript
// GOOD: Include related data in single query
const wcf = await prisma.workCompletionForm.findUnique({
  where: { id },
  include: {
    materials: true,
    equipment: true,
    labor: true,
    photos: true,
  },
});

// AVOID: N+1 queries
const wcf = await prisma.workCompletionForm.findUnique({ where: { id } });
const materials = await prisma.wcfMaterial.findMany({ where: { wcfId: id } });
```

### GCS Best Practices

- Use signed URLs (already implemented) instead of making files public
- Set appropriate cache headers for frequently accessed files
- Use thumbnails for preview instead of full-size images
- Enable CDN (Cloud CDN or Cloudflare) for public-facing files

---

## Next Steps

1. **PDF Generation**: Implement actual PDF template engine (currently stubbed)
2. **E-Signature Integration**: Add DocuSign/Adobe Sign integration
3. **Photo Compression**: Optimize photo uploads with client-side compression
4. **Audit Trail**: Add detailed audit logs for WCF modifications
5. **Analytics**: Add dashboards for WCF metrics and reporting
6. **Notifications**: Add email/SMS notifications for WCF status changes

---

## References

- **Domain Documentation**: `/product-docs/domain/07-contract-document-lifecycle.md`
- **API Documentation**: `/product-docs/api/08-document-media-api.md`
- **Prisma Schema**: `/prisma/schema.prisma` (lines 1602-1933)
- **WCF Service**: `/src/modules/execution/wcf/wcf.service.ts`
- **Media Upload Service**: `/src/modules/execution/media-upload.service.ts`

---

## Support

For questions or issues:
- Check the product documentation in `/product-docs/`
- Review Prisma logs: Set `DEBUG=prisma:*` environment variable
- Check application logs for WCF-related errors
- Consult GCS documentation: https://cloud.google.com/storage/docs
