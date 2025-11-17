-- Rollback Migration: Remove External Authentication Support
-- Created: 2025-01-17
-- Description: Rollback script to revert external auth changes

-- Step 1: Drop registered_devices table
DROP TABLE IF EXISTS "registered_devices" CASCADE;

-- Step 2: Remove foreign key constraints
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_provider_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_work_team_id_fkey";

-- Step 3: Drop indexes
DROP INDEX IF EXISTS "users_user_type_idx";
DROP INDEX IF EXISTS "users_provider_id_idx";
DROP INDEX IF EXISTS "users_work_team_id_idx";

-- Step 4: Remove columns from users table
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "phone",
  DROP COLUMN IF EXISTS "user_type",
  DROP COLUMN IF EXISTS "auth_provider",
  DROP COLUMN IF EXISTS "external_auth_id",
  DROP COLUMN IF EXISTS "provider_id",
  DROP COLUMN IF EXISTS "work_team_id",
  DROP COLUMN IF EXISTS "mfa_enabled",
  DROP COLUMN IF EXISTS "mfa_secret";

-- Step 5: Make password NOT NULL again
ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;

-- Step 6: Drop UserType enum
DROP TYPE IF EXISTS "UserType";

-- Step 7: Remove newly added roles (optional - may want to keep if users assigned)
DELETE FROM "roles" WHERE "name" IN ('PROVIDER_MANAGER', 'PROVIDER_ADMIN', 'TECHNICIAN');

-- Note: This rollback assumes no production data has been created with the new schema.
-- If data exists, manual migration may be required.
