/*
  Warnings:

  - A unique constraint covering the columns `[external_auth_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'EXTERNAL_PROVIDER', 'EXTERNAL_TECHNICIAN');

-- CreateEnum
CREATE TYPE "PilotAssignmentMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServicePriority" AS ENUM ('P1', 'P2');

-- CreateEnum
CREATE TYPE "ServiceOrderState" AS ENUM ('CREATED', 'SCHEDULED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesPotential" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('REQUIRES_COMPLETION', 'REQUIRES_VALIDATION');

-- CreateEnum
CREATE TYPE "BufferType" AS ENUM ('GLOBAL', 'STATIC', 'COMMUTE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "RiskFactorType" AS ENUM ('CLAIM_HISTORY', 'RESCHEDULE_FREQUENCY', 'PAYMENT_ISSUES', 'PROVIDER_QUALITY', 'COMPLEX_SERVICE', 'CUSTOMER_HISTORY');

-- CreateEnum
CREATE TYPE "AssignmentMode" AS ENUM ('DIRECT', 'OFFER', 'BROADCAST', 'AUTO_ACCEPT');

-- CreateEnum
CREATE TYPE "AssignmentState" AS ENUM ('PENDING', 'OFFERED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('SERVICE_ORDER', 'EXTERNAL_BLOCK', 'STORE_CLOSURE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PRE_BOOKED', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'local',
ADD COLUMN     "external_auth_id" TEXT,
ADD COLUMN     "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_secret" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "provider_id" TEXT,
ADD COLUMN     "user_type" "UserType" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "work_team_id" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "registered_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "device_name" VARCHAR(255) NOT NULL,
    "device_model" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registered_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "external_project_id" TEXT,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "customer_address" JSONB NOT NULL,
    "project_name" VARCHAR(255) NOT NULL,
    "project_description" TEXT,
    "pilot_user_id" TEXT,
    "pilot_assignment_mode" "PilotAssignmentMode" NOT NULL DEFAULT 'AUTO',
    "pilot_assigned_at" TIMESTAMP(3),
    "external_sales_order_id" TEXT,
    "external_lead_id" TEXT,
    "external_system_source" VARCHAR(50),
    "status" "ProjectStatus" NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "external_service_order_id" TEXT,
    "project_id" TEXT,
    "service_id" TEXT NOT NULL,
    "assigned_provider_id" TEXT,
    "assigned_work_team_id" TEXT,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "customer_info" JSONB NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "priority" "ServicePriority" NOT NULL,
    "estimated_duration_minutes" INTEGER NOT NULL,
    "service_address" JSONB NOT NULL,
    "requested_start_date" TIMESTAMP(3) NOT NULL,
    "requested_end_date" TIMESTAMP(3) NOT NULL,
    "requested_time_slot" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "scheduled_start_time" TIMESTAMP(3),
    "scheduled_end_time" TIMESTAMP(3),
    "external_sales_order_id" TEXT,
    "external_project_id" TEXT,
    "external_lead_id" TEXT,
    "external_system_source" VARCHAR(50),
    "sales_potential" "SalesPotential",
    "sales_potential_score" DECIMAL(5,2),
    "sales_potential_updated_at" TIMESTAMP(3),
    "sales_pre_estimation_id" TEXT,
    "sales_pre_estimation_value" DECIMAL(10,2),
    "salesman_notes" TEXT,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "risk_score" DECIMAL(5,2),
    "risk_assessed_at" TIMESTAMP(3),
    "risk_acknowledged_by" TEXT,
    "risk_acknowledged_at" TIMESTAMP(3),
    "state" "ServiceOrderState" NOT NULL DEFAULT 'CREATED',
    "state_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_dependencies" (
    "id" TEXT NOT NULL,
    "dependent_order_id" TEXT NOT NULL,
    "blocks_order_id" TEXT NOT NULL,
    "dependency_type" "DependencyType" NOT NULL,
    "static_buffer_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_buffers" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "buffer_type" "BufferType" NOT NULL,
    "buffer_days" INTEGER NOT NULL,
    "buffer_hours" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config_ref" TEXT,

    CONSTRAINT "service_order_buffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_risk_factors" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "factor_type" "RiskFactorType" NOT NULL,
    "factor_score" DECIMAL(5,2) NOT NULL,
    "description" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detected_by" VARCHAR(50) NOT NULL,

    CONSTRAINT "service_order_risk_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "work_team_id" TEXT,
    "assignment_mode" "AssignmentMode" NOT NULL,
    "assignment_method" VARCHAR(50) NOT NULL,
    "funnel_execution_id" TEXT,
    "provider_rank" INTEGER,
    "provider_score" DECIMAL(5,2),
    "score_breakdown" JSONB,
    "state" "AssignmentState" NOT NULL DEFAULT 'PENDING',
    "state_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "negotiation_round" INTEGER NOT NULL DEFAULT 0,
    "proposed_date" TIMESTAMP(3),
    "counterproposal_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_funnel_executions" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "requested_date" TIMESTAMP(3) NOT NULL,
    "requested_slot" TEXT,
    "total_providers_evaluated" INTEGER NOT NULL,
    "eligible_providers" INTEGER NOT NULL,
    "funnel_steps" JSONB NOT NULL,
    "execution_time_ms" INTEGER NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_by" VARCHAR(100) NOT NULL,

    CONSTRAINT "assignment_funnel_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "work_team_id" TEXT NOT NULL,
    "booking_date" DATE NOT NULL,
    "start_slot" INTEGER NOT NULL,
    "end_slot" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "booking_type" "BookingType" NOT NULL,
    "expires_at" TIMESTAMP(3),
    "hold_reference" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PRE_BOOKED',
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buffer_configs" (
    "id" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50),
    "buffer_type" "BufferType" NOT NULL,
    "service_type" "ServiceType",
    "service_category" "ServiceCategory",
    "product_id" TEXT,
    "buffer_days" INTEGER NOT NULL,
    "buffer_hours" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "buffer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_national" BOOLEAN NOT NULL DEFAULT true,
    "regions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registered_devices_device_id_key" ON "registered_devices"("device_id");

-- CreateIndex
CREATE INDEX "registered_devices_user_id_idx" ON "registered_devices"("user_id");

-- CreateIndex
CREATE INDEX "registered_devices_device_id_idx" ON "registered_devices"("device_id");

-- CreateIndex
CREATE INDEX "registered_devices_is_active_idx" ON "registered_devices"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "projects_external_project_id_key" ON "projects"("external_project_id");

-- CreateIndex
CREATE INDEX "projects_country_code_business_unit_idx" ON "projects"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "projects_pilot_user_id_idx" ON "projects"("pilot_user_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_external_project_id_idx" ON "projects"("external_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_external_service_order_id_key" ON "service_orders"("external_service_order_id");

-- CreateIndex
CREATE INDEX "service_orders_project_id_idx" ON "service_orders"("project_id");

-- CreateIndex
CREATE INDEX "service_orders_service_id_idx" ON "service_orders"("service_id");

-- CreateIndex
CREATE INDEX "service_orders_assigned_provider_id_idx" ON "service_orders"("assigned_provider_id");

-- CreateIndex
CREATE INDEX "service_orders_assigned_work_team_id_idx" ON "service_orders"("assigned_work_team_id");

-- CreateIndex
CREATE INDEX "service_orders_country_code_business_unit_idx" ON "service_orders"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "service_orders_state_idx" ON "service_orders"("state");

-- CreateIndex
CREATE INDEX "service_orders_priority_idx" ON "service_orders"("priority");

-- CreateIndex
CREATE INDEX "service_orders_scheduled_date_idx" ON "service_orders"("scheduled_date");

-- CreateIndex
CREATE INDEX "service_orders_risk_level_idx" ON "service_orders"("risk_level");

-- CreateIndex
CREATE INDEX "service_order_dependencies_dependent_order_id_idx" ON "service_order_dependencies"("dependent_order_id");

-- CreateIndex
CREATE INDEX "service_order_dependencies_blocks_order_id_idx" ON "service_order_dependencies"("blocks_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_order_dependencies_dependent_order_id_blocks_order__key" ON "service_order_dependencies"("dependent_order_id", "blocks_order_id");

-- CreateIndex
CREATE INDEX "service_order_buffers_service_order_id_idx" ON "service_order_buffers"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_risk_factors_service_order_id_idx" ON "service_order_risk_factors"("service_order_id");

-- CreateIndex
CREATE INDEX "assignments_service_order_id_idx" ON "assignments"("service_order_id");

-- CreateIndex
CREATE INDEX "assignments_provider_id_idx" ON "assignments"("provider_id");

-- CreateIndex
CREATE INDEX "assignments_work_team_id_idx" ON "assignments"("work_team_id");

-- CreateIndex
CREATE INDEX "assignments_state_idx" ON "assignments"("state");

-- CreateIndex
CREATE INDEX "assignments_funnel_execution_id_idx" ON "assignments"("funnel_execution_id");

-- CreateIndex
CREATE INDEX "assignment_funnel_executions_service_order_id_idx" ON "assignment_funnel_executions"("service_order_id");

-- CreateIndex
CREATE INDEX "assignment_funnel_executions_executed_at_idx" ON "assignment_funnel_executions"("executed_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_hold_reference_key" ON "bookings"("hold_reference");

-- CreateIndex
CREATE INDEX "bookings_service_order_id_idx" ON "bookings"("service_order_id");

-- CreateIndex
CREATE INDEX "bookings_provider_id_idx" ON "bookings"("provider_id");

-- CreateIndex
CREATE INDEX "bookings_work_team_id_booking_date_idx" ON "bookings"("work_team_id", "booking_date");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_expires_at_idx" ON "bookings"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_work_team_id_booking_date_start_slot_end_slot_key" ON "bookings"("work_team_id", "booking_date", "start_slot", "end_slot");

-- CreateIndex
CREATE INDEX "buffer_configs_country_code_business_unit_idx" ON "buffer_configs"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "buffer_configs_buffer_type_idx" ON "buffer_configs"("buffer_type");

-- CreateIndex
CREATE INDEX "buffer_configs_service_type_idx" ON "buffer_configs"("service_type");

-- CreateIndex
CREATE INDEX "buffer_configs_effective_from_effective_to_idx" ON "buffer_configs"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "buffer_configs_is_active_idx" ON "buffer_configs"("is_active");

-- CreateIndex
CREATE INDEX "holidays_country_code_date_idx" ON "holidays"("country_code", "date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_country_code_date_key" ON "holidays"("country_code", "date");

-- CreateIndex
CREATE UNIQUE INDEX "users_external_auth_id_key" ON "users"("external_auth_id");

-- CreateIndex
CREATE INDEX "users_user_type_idx" ON "users"("user_type");

-- CreateIndex
CREATE INDEX "users_provider_id_idx" ON "users"("provider_id");

-- CreateIndex
CREATE INDEX "users_work_team_id_idx" ON "users"("work_team_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_work_team_id_fkey" FOREIGN KEY ("work_team_id") REFERENCES "work_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registered_devices" ADD CONSTRAINT "registered_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_pilot_user_id_fkey" FOREIGN KEY ("pilot_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assigned_provider_id_fkey" FOREIGN KEY ("assigned_provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assigned_work_team_id_fkey" FOREIGN KEY ("assigned_work_team_id") REFERENCES "work_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_dependencies" ADD CONSTRAINT "service_order_dependencies_dependent_order_id_fkey" FOREIGN KEY ("dependent_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_dependencies" ADD CONSTRAINT "service_order_dependencies_blocks_order_id_fkey" FOREIGN KEY ("blocks_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_buffers" ADD CONSTRAINT "service_order_buffers_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_risk_factors" ADD CONSTRAINT "service_order_risk_factors_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_work_team_id_fkey" FOREIGN KEY ("work_team_id") REFERENCES "work_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_work_team_id_fkey" FOREIGN KEY ("work_team_id") REFERENCES "work_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "service_pricing_service_id_country_code_business_unit_post_key" RENAME TO "service_pricing_service_id_country_code_business_unit_posta_key";
