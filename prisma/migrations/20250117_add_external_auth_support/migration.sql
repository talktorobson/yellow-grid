-- Migration: Add External Authentication Support
-- Created: 2025-01-17
-- Description: Adds user types, auth providers, MFA, device registration, and provider/work team user linkage

-- Step 1: Create UserType enum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'EXTERNAL_PROVIDER', 'EXTERNAL_TECHNICIAN');

-- Step 2: Add new columns to users table
ALTER TABLE "users"
  ADD COLUMN "phone" VARCHAR(50),
  ADD COLUMN "user_type" "UserType" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'local',
  ADD COLUMN "external_auth_id" VARCHAR(255) UNIQUE,
  ADD COLUMN "provider_id" UUID,
  ADD COLUMN "work_team_id" UUID,
  ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "mfa_secret" TEXT;

-- Step 3: Make password nullable (for future SSO-only users)
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Step 4: Add foreign key constraints for provider/work team linkage
ALTER TABLE "users"
  ADD CONSTRAINT "users_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_work_team_id_fkey"
  FOREIGN KEY ("work_team_id") REFERENCES "work_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Create indexes for new user fields
CREATE INDEX "users_user_type_idx" ON "users"("user_type");
CREATE INDEX "users_provider_id_idx" ON "users"("provider_id");
CREATE INDEX "users_work_team_id_idx" ON "users"("work_team_id");

-- Step 6: Create registered_devices table for biometric authentication
CREATE TABLE "registered_devices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "device_id" VARCHAR(255) UNIQUE NOT NULL,
  "public_key" TEXT NOT NULL,
  "platform" VARCHAR(20) NOT NULL,
  "device_name" VARCHAR(255) NOT NULL,
  "device_model" VARCHAR(100),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_login_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "registered_devices_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 7: Create indexes for registered_devices
CREATE INDEX "registered_devices_user_id_idx" ON "registered_devices"("user_id");
CREATE INDEX "registered_devices_device_id_idx" ON "registered_devices"("device_id");
CREATE INDEX "registered_devices_is_active_idx" ON "registered_devices"("is_active");

-- Step 8: Update Role table to include new roles
-- Note: This is data migration, actual role creation will be done in seed script
INSERT INTO "roles" ("id", "name", "description", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'PROVIDER_MANAGER', 'Provider company manager', NOW(), NOW()),
  (gen_random_uuid(), 'PROVIDER_ADMIN', 'Provider company administrator', NOW(), NOW()),
  (gen_random_uuid(), 'TECHNICIAN', 'Field service technician', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN "users"."user_type" IS 'User classification: INTERNAL (operators/admins), EXTERNAL_PROVIDER (provider managers), EXTERNAL_TECHNICIAN (field technicians)';
COMMENT ON COLUMN "users"."auth_provider" IS 'Authentication provider: local, sso (PingID), auth0 (future)';
COMMENT ON COLUMN "users"."external_auth_id" IS 'External auth system ID for future Auth0 migration';
COMMENT ON COLUMN "users"."provider_id" IS 'Linked provider (only for EXTERNAL_PROVIDER users)';
COMMENT ON COLUMN "users"."work_team_id" IS 'Linked work team (only for EXTERNAL_TECHNICIAN users)';
COMMENT ON COLUMN "users"."mfa_enabled" IS 'Whether multi-factor authentication is enabled';
COMMENT ON COLUMN "users"."mfa_secret" IS 'Encrypted TOTP secret for MFA';

COMMENT ON TABLE "registered_devices" IS 'Registered mobile devices for biometric authentication';
COMMENT ON COLUMN "registered_devices"."device_id" IS 'Unique device fingerprint';
COMMENT ON COLUMN "registered_devices"."public_key" IS 'Device public key for biometric challenge-response authentication';
COMMENT ON COLUMN "registered_devices"."platform" IS 'Device platform: ios or android';

-- Step 10: Validate existing data
-- Ensure all existing users have valid country/business unit
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "country_code" IS NULL OR "business_unit" IS NULL) THEN
    RAISE EXCEPTION 'Found users with NULL country_code or business_unit. Please fix data before migration.';
  END IF;
END $$;
