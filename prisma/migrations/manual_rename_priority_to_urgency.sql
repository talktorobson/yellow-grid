-- Manual migration: Rename priority to urgency for ServiceOrder
-- This migration renames the 'priority' column to 'urgency' and updates the enum values
-- Run this on the production database BEFORE deploying the new code

-- Step 1: Create the new enum type
CREATE TYPE "ServiceUrgency" AS ENUM ('URGENT', 'STANDARD', 'LOW');

-- Step 2: Add the new urgency column
ALTER TABLE "service_orders" ADD COLUMN "urgency" "ServiceUrgency";

-- Step 3: Migrate existing data from priority to urgency
-- P1 (high priority) -> URGENT
-- P2 (standard priority) -> STANDARD
UPDATE "service_orders" SET "urgency" = 'URGENT' WHERE "priority" = 'P1';
UPDATE "service_orders" SET "urgency" = 'STANDARD' WHERE "priority" = 'P2';
UPDATE "service_orders" SET "urgency" = 'STANDARD' WHERE "urgency" IS NULL;

-- Step 4: Make urgency NOT NULL with default
ALTER TABLE "service_orders" ALTER COLUMN "urgency" SET NOT NULL;
ALTER TABLE "service_orders" ALTER COLUMN "urgency" SET DEFAULT 'STANDARD';

-- Step 5: Drop the old priority column
ALTER TABLE "service_orders" DROP COLUMN "priority";

-- Step 6: Drop the old ServicePriority enum (no longer used)
DROP TYPE IF EXISTS "ServicePriority";

-- Step 7: Update indexes
DROP INDEX IF EXISTS "service_orders_priority_idx";
CREATE INDEX "service_orders_urgency_idx" ON "service_orders"("urgency");
