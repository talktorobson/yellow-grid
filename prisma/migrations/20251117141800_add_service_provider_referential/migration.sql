-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('INSTALLATION', 'CONFIRMATION_TV', 'QUOTATION_TV', 'MAINTENANCE', 'REWORK', 'COMPLEX');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('HVAC', 'PLUMBING', 'ELECTRICAL', 'KITCHEN', 'BATHROOM', 'FLOORING', 'WINDOWS_DOORS', 'GARDEN', 'FURNITURE', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('CREATED', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('HOURLY', 'FIXED');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT');

-- CreateEnum
CREATE TYPE "ContractProvider" AS ENUM ('ADOBE_SIGN', 'DOCUSIGN');

-- CreateEnum
CREATE TYPE "EventProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postal_codes" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postal_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_catalog" (
    "id" TEXT NOT NULL,
    "external_service_code" VARCHAR(100) NOT NULL,
    "fsm_service_code" VARCHAR(50) NOT NULL,
    "external_source" VARCHAR(20) NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "service_category" "ServiceCategory" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "scope_included" JSONB NOT NULL,
    "scope_excluded" JSONB NOT NULL,
    "worksite_requirements" JSONB NOT NULL,
    "product_prerequisites" JSONB NOT NULL,
    "estimated_duration_minutes" INTEGER NOT NULL,
    "requires_pre_service_contract" BOOLEAN NOT NULL DEFAULT false,
    "requires_post_service_wcf" BOOLEAN NOT NULL DEFAULT true,
    "contract_template_id" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'CREATED',
    "deprecated_at" TIMESTAMP(3),
    "deprecation_reason" TEXT,
    "sync_checksum" VARCHAR(64) NOT NULL,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),
    "updated_by" VARCHAR(100),

    CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pricing" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "postal_code_id" TEXT,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "overtime_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    "weekend_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.3,
    "holiday_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    "urgent_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.2,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),
    "updated_by" VARCHAR(100),

    CONSTRAINT "service_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_skill_requirements" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "minimum_experience" "ExperienceLevel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_skill_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_specialties" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" "ServiceCategory" NOT NULL,
    "requires_certification" BOOLEAN NOT NULL DEFAULT false,
    "certification_authority" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialty_service_mappings" (
    "id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialty_service_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_specialty_assignments" (
    "id" TEXT NOT NULL,
    "work_team_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "is_certified" BOOLEAN NOT NULL DEFAULT false,
    "certification_number" VARCHAR(100),
    "certification_issued_at" TIMESTAMP(3),
    "certification_expires_at" TIMESTAMP(3),
    "experience_level" "ExperienceLevel" NOT NULL,
    "years_of_experience" INTEGER NOT NULL DEFAULT 0,
    "total_jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "total_jobs_failed" INTEGER NOT NULL DEFAULT 0,
    "avg_duration_minutes" INTEGER,
    "avg_quality_score" DECIMAL(3,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revocation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_specialty_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50),
    "external_template_id" VARCHAR(100) NOT NULL,
    "provider" "ContractProvider" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "superseded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_catalog_event_log" (
    "id" TEXT NOT NULL,
    "event_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "external_source" VARCHAR(20) NOT NULL,
    "external_service_code" VARCHAR(100) NOT NULL,
    "processing_status" "EventProcessingStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "service_catalog_event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_catalog_reconciliation" (
    "id" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "run_date" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL,
    "total_services_in_file" INTEGER NOT NULL,
    "total_services_in_db" INTEGER NOT NULL,
    "services_created" INTEGER NOT NULL DEFAULT 0,
    "services_updated" INTEGER NOT NULL DEFAULT 0,
    "services_with_drift" INTEGER NOT NULL DEFAULT 0,
    "drift_percentage" DECIMAL(5,2),
    "s3_bucket" VARCHAR(100),
    "s3_key" VARCHAR(255),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "service_catalog_reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_country_code_code_key" ON "provinces"("country_code", "code");

-- CreateIndex
CREATE INDEX "provinces_country_code_idx" ON "provinces"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "cities_province_id_code_key" ON "cities"("province_id", "code");

-- CreateIndex
CREATE INDEX "cities_province_id_idx" ON "cities"("province_id");

-- CreateIndex
CREATE INDEX "postal_codes_code_idx" ON "postal_codes"("code");

-- CreateIndex
CREATE INDEX "postal_codes_city_id_idx" ON "postal_codes"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "postal_codes_city_id_code_key" ON "postal_codes"("city_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "service_catalog_external_service_code_key" ON "service_catalog"("external_service_code");

-- CreateIndex
CREATE UNIQUE INDEX "service_catalog_fsm_service_code_key" ON "service_catalog"("fsm_service_code");

-- CreateIndex
CREATE INDEX "service_catalog_country_code_business_unit_idx" ON "service_catalog"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "service_catalog_service_type_idx" ON "service_catalog"("service_type");

-- CreateIndex
CREATE INDEX "service_catalog_service_category_idx" ON "service_catalog"("service_category");

-- CreateIndex
CREATE INDEX "service_catalog_status_idx" ON "service_catalog"("status");

-- CreateIndex
CREATE INDEX "service_catalog_external_source_idx" ON "service_catalog"("external_source");

-- CreateIndex
CREATE INDEX "service_pricing_service_id_idx" ON "service_pricing"("service_id");

-- CreateIndex
CREATE INDEX "service_pricing_country_code_business_unit_idx" ON "service_pricing"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "service_pricing_postal_code_id_idx" ON "service_pricing"("postal_code_id");

-- CreateIndex
CREATE INDEX "service_pricing_valid_from_valid_until_idx" ON "service_pricing"("valid_from", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "service_pricing_service_id_country_code_business_unit_post_key" ON "service_pricing"("service_id", "country_code", "business_unit", "postal_code_id", "valid_from");

-- CreateIndex
CREATE INDEX "service_skill_requirements_service_id_idx" ON "service_skill_requirements"("service_id");

-- CreateIndex
CREATE INDEX "service_skill_requirements_specialty_id_idx" ON "service_skill_requirements"("specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_skill_requirements_service_id_specialty_id_key" ON "service_skill_requirements"("service_id", "specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_specialties_code_key" ON "provider_specialties"("code");

-- CreateIndex
CREATE INDEX "provider_specialties_category_idx" ON "provider_specialties"("category");

-- CreateIndex
CREATE INDEX "specialty_service_mappings_specialty_id_idx" ON "specialty_service_mappings"("specialty_id");

-- CreateIndex
CREATE INDEX "specialty_service_mappings_service_id_idx" ON "specialty_service_mappings"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "specialty_service_mappings_specialty_id_service_id_key" ON "specialty_service_mappings"("specialty_id", "service_id");

-- CreateIndex
CREATE INDEX "provider_specialty_assignments_work_team_id_idx" ON "provider_specialty_assignments"("work_team_id");

-- CreateIndex
CREATE INDEX "provider_specialty_assignments_specialty_id_idx" ON "provider_specialty_assignments"("specialty_id");

-- CreateIndex
CREATE INDEX "provider_specialty_assignments_is_active_idx" ON "provider_specialty_assignments"("is_active");

-- CreateIndex
CREATE INDEX "provider_specialty_assignments_certification_expires_at_idx" ON "provider_specialty_assignments"("certification_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_specialty_assignments_work_team_id_specialty_id_key" ON "provider_specialty_assignments"("work_team_id", "specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_templates_code_key" ON "contract_templates"("code");

-- CreateIndex
CREATE INDEX "contract_templates_country_code_business_unit_idx" ON "contract_templates"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "contract_templates_is_active_idx" ON "contract_templates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_catalog_event_log_event_id_key" ON "service_catalog_event_log"("event_id");

-- CreateIndex
CREATE INDEX "service_catalog_event_log_event_id_idx" ON "service_catalog_event_log"("event_id");

-- CreateIndex
CREATE INDEX "service_catalog_event_log_processing_status_received_at_idx" ON "service_catalog_event_log"("processing_status", "received_at");

-- CreateIndex
CREATE INDEX "service_catalog_event_log_external_service_code_idx" ON "service_catalog_event_log"("external_service_code");

-- CreateIndex
CREATE INDEX "service_catalog_reconciliation_country_code_run_date_idx" ON "service_catalog_reconciliation"("country_code", "run_date");

-- CreateIndex
CREATE INDEX "service_catalog_reconciliation_status_idx" ON "service_catalog_reconciliation"("status");

-- AddForeignKey
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postal_codes" ADD CONSTRAINT "postal_codes_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_contract_template_id_fkey" FOREIGN KEY ("contract_template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_postal_code_id_fkey" FOREIGN KEY ("postal_code_id") REFERENCES "postal_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_skill_requirements" ADD CONSTRAINT "service_skill_requirements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_skill_requirements" ADD CONSTRAINT "service_skill_requirements_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "provider_specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialty_service_mappings" ADD CONSTRAINT "specialty_service_mappings_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "provider_specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialty_service_mappings" ADD CONSTRAINT "specialty_service_mappings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_specialty_assignments" ADD CONSTRAINT "provider_specialty_assignments_work_team_id_fkey" FOREIGN KEY ("work_team_id") REFERENCES "work_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_specialty_assignments" ADD CONSTRAINT "provider_specialty_assignments_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "provider_specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
