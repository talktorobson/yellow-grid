/*
  Warnings:

  - You are about to drop the column `buffer_days` on the `service_order_buffers` table. All the data in the column will be lost.
  - You are about to drop the column `buffer_hours` on the `service_order_buffers` table. All the data in the column will be lost.
  - You are about to drop the column `buffer_type` on the `service_order_buffers` table. All the data in the column will be lost.
  - You are about to drop the `buffer_configs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[service_order_id]` on the table `service_order_buffers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('PRE_FLIGHT_FAILURE', 'RESOLVE_WCF_RESERVES', 'WCF_NOT_SIGNED', 'INVOICE_CONTESTED', 'INCOMPLETE_JOB', 'UNASSIGNED_JOB', 'CONTRACT_NOT_SIGNED', 'PAYMENT_FAILED', 'DOCUMENT_REVIEW', 'QUALITY_ALERT', 'SERVICE_ORDER_RISK_REVIEW');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('CRITICAL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WcfStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'APPROVED', 'REJECTED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "EquipmentCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DEFECTIVE', 'BEYOND_REPAIR');

-- CreateEnum
CREATE TYPE "WcfPhotoType" AS ENUM ('BEFORE_WORK', 'DURING_WORK', 'AFTER_WORK', 'ISSUE_FOUND', 'EQUIPMENT_INSTALLED', 'EQUIPMENT_REMOVED', 'DEFECT', 'QUALITY_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "WcfSignerType" AS ENUM ('CUSTOMER', 'TECHNICIAN', 'PROVIDER_MANAGER', 'QUALITY_INSPECTOR');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatusType" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SyncOperationType" AS ENUM ('DELTA_SYNC', 'INITIAL_SYNC', 'FULL_SYNC', 'BATCH_UPLOAD', 'CONFLICT_RESOLUTION');

-- CreateEnum
CREATE TYPE "SyncOperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CONFLICT', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('SERVER_WINS', 'CLIENT_WINS', 'MERGED', 'LAST_WRITE_WINS', 'MANUAL');

-- AlterTable
ALTER TABLE "service_order_buffers" DROP COLUMN "buffer_days",
DROP COLUMN "buffer_hours",
DROP COLUMN "buffer_type",
ADD COLUMN     "travel_buffer_minutes_end" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "travel_buffer_minutes_start" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "last_modified_by" VARCHAR(100),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "buffer_configs";

-- DropEnum
DROP TYPE "BufferType";

-- CreateTable
CREATE TABLE "calendar_configs" (
    "id" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "working_days" JSONB NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,
    "morning_shift_start" VARCHAR(5) NOT NULL,
    "morning_shift_end" VARCHAR(5) NOT NULL,
    "afternoon_shift_start" VARCHAR(5) NOT NULL,
    "afternoon_shift_end" VARCHAR(5) NOT NULL,
    "evening_shift_start" VARCHAR(5),
    "evening_shift_end" VARCHAR(5),
    "global_buffer_non_working_days" INTEGER NOT NULL DEFAULT 0,
    "static_buffer_non_working_days" INTEGER NOT NULL DEFAULT 0,
    "travel_buffer_minutes" INTEGER NOT NULL DEFAULT 0,
    "cross_day_allowed" BOOLEAN NOT NULL DEFAULT false,
    "holiday_region" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "calendar_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "service_order_id" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "assigned_to" TEXT,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sla_deadline" TIMESTAMP(3) NOT NULL,
    "sla_paused" BOOLEAN NOT NULL DEFAULT false,
    "sla_paused_at" TIMESTAMP(3),
    "sla_pause_reason" TEXT,
    "total_paused_minutes" INTEGER NOT NULL DEFAULT 0,
    "escalation_level" INTEGER NOT NULL DEFAULT 0,
    "escalated_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "resolution_notes" TEXT,
    "resolution_time" INTEGER,
    "within_sla" BOOLEAN,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_audit_logs" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "performed_by" VARCHAR(100) NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB,
    "notes" TEXT,

    CONSTRAINT "task_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_completion_forms" (
    "id" TEXT NOT NULL,
    "wcf_number" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "service_order_id" TEXT NOT NULL,
    "contract_id" TEXT,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "customer_info" JSONB NOT NULL,
    "technician_info" JSONB NOT NULL,
    "provider_info" JSONB NOT NULL,
    "service_date" TIMESTAMP(3) NOT NULL,
    "service_location" JSONB NOT NULL,
    "work_summary" TEXT NOT NULL,
    "work_details" JSONB NOT NULL,
    "total_labor_hours" DECIMAL(6,2) NOT NULL,
    "total_materials" INTEGER NOT NULL DEFAULT 0,
    "total_equipment" INTEGER NOT NULL DEFAULT 0,
    "pricing_summary" JSONB,
    "customer_accepted" BOOLEAN,
    "customer_accepted_at" TIMESTAMP(3),
    "customer_satisfaction_rating" INTEGER,
    "customer_feedback" TEXT,
    "customer_concerns" JSONB,
    "disputed_items" JSONB,
    "refusal_reason" TEXT,
    "pdf_url" VARCHAR(500),
    "pdf_gcs_path" VARCHAR(500),
    "thumbnail_url" VARCHAR(500),
    "warranty_info" JSONB,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_actions" JSONB,
    "status" "WcfStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100),
    "updated_by" VARCHAR(100),

    CONSTRAINT "work_completion_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcf_materials" (
    "id" TEXT NOT NULL,
    "wcf_id" TEXT NOT NULL,
    "material_code" VARCHAR(50),
    "description" VARCHAR(500) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "serial_numbers" JSONB,
    "warranty_months" INTEGER,
    "supplied_by" VARCHAR(50) NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wcf_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcf_equipment" (
    "id" TEXT NOT NULL,
    "wcf_id" TEXT NOT NULL,
    "equipment_type" VARCHAR(100) NOT NULL,
    "make" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "condition" "EquipmentCondition" NOT NULL,
    "installation_date" TIMESTAMP(3),
    "removal_date" TIMESTAMP(3),
    "unit_price" DECIMAL(10,2),
    "total_price" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "warranty_info" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wcf_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcf_labor" (
    "id" TEXT NOT NULL,
    "wcf_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "technician_name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "break_minutes" INTEGER,
    "total_minutes" INTEGER NOT NULL,
    "net_minutes" INTEGER NOT NULL,
    "hourly_rate" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "overtime_hours" DECIMAL(6,2),
    "overtime_rate" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wcf_labor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcf_photos" (
    "id" TEXT NOT NULL,
    "wcf_id" TEXT NOT NULL,
    "equipment_id" TEXT,
    "photo_type" "WcfPhotoType" NOT NULL,
    "caption" VARCHAR(500),
    "sequence" INTEGER NOT NULL,
    "photo_url" VARCHAR(500) NOT NULL,
    "photo_gcs_path" VARCHAR(500) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "original_filename" VARCHAR(255),
    "content_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "captured_by" VARCHAR(100),
    "location" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wcf_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcf_quality_checks" (
    "id" TEXT NOT NULL,
    "wcf_id" TEXT NOT NULL,
    "check_type" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "measured_value" VARCHAR(255),
    "expected_value" VARCHAR(255),
    "unit" VARCHAR(50),
    "performed_by" VARCHAR(100) NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wcf_quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcf_signatures" (
    "id" TEXT NOT NULL,
    "wcf_id" TEXT NOT NULL,
    "signer_type" "WcfSignerType" NOT NULL,
    "signer_name" VARCHAR(255) NOT NULL,
    "signer_email" TEXT,
    "signer_phone" TEXT,
    "signer_role" VARCHAR(100),
    "signature_method" "SignatureMethod" NOT NULL,
    "signature_data_url" TEXT,
    "signature_gcs_path" VARCHAR(500),
    "e_signature_provider" VARCHAR(50),
    "e_signature_id" VARCHAR(255),
    "status" "SignatureStatus" NOT NULL DEFAULT 'REQUESTED',
    "signed_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "evidence" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wcf_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "channel" "NotificationChannelType" NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "country_code" VARCHAR(3),
    "business_unit" VARCHAR(50),
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "retry_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_translations" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "language" VARCHAR(5) NOT NULL,
    "subject" VARCHAR(500),
    "body_template" TEXT NOT NULL,
    "short_message" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "event_preferences" JSONB NOT NULL,
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" VARCHAR(5),
    "quiet_hours_end" VARCHAR(5),
    "quiet_hours_timezone" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "recipient_id" TEXT,
    "recipient_email" TEXT,
    "recipient_phone" TEXT,
    "recipient_name" VARCHAR(255),
    "channel" "NotificationChannelType" NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "status" "NotificationStatusType" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "error_code" VARCHAR(100),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "provider_message_id" VARCHAR(255),
    "provider_response" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "context_type" VARCHAR(100),
    "context_id" TEXT,
    "metadata" JSONB,
    "country_code" VARCHAR(3),
    "business_unit" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_webhooks" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_syncs" (
    "id" TEXT NOT NULL,
    "device_id" VARCHAR(100) NOT NULL,
    "device_platform" VARCHAR(20),
    "device_model" VARCHAR(100),
    "app_version" VARCHAR(20),
    "user_id" TEXT NOT NULL,
    "sync_token" VARCHAR(100) NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL,
    "last_successful_sync_at" TIMESTAMP(3) NOT NULL,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "total_sync_operations" INTEGER NOT NULL DEFAULT 0,
    "total_conflicts" INTEGER NOT NULL DEFAULT 0,
    "pending_upload_count" INTEGER NOT NULL DEFAULT 0,
    "pending_upload_bytes" BIGINT NOT NULL DEFAULT 0,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_operations" (
    "id" TEXT NOT NULL,
    "device_sync_id" TEXT NOT NULL,
    "operation_type" "SyncOperationType" NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100),
    "client_version" INTEGER,
    "server_version" INTEGER,
    "operation" VARCHAR(20) NOT NULL,
    "changed_fields" JSONB,
    "conflict_detected" BOOLEAN NOT NULL DEFAULT false,
    "conflict_resolution" "ConflictResolution",
    "conflict_details" JSONB,
    "sync_token" VARCHAR(100) NOT NULL,
    "processing_time_ms" INTEGER,
    "status" "SyncOperationStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_check_ins" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "work_team_id" TEXT,
    "technician_user_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_check_outs" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "technician_user_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "break_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "travel_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_hours" DECIMAL(10,2) NOT NULL,
    "billable_hours" DECIMAL(10,2) NOT NULL,
    "regular_hours" DECIMAL(10,2) NOT NULL,
    "overtime_hours" DECIMAL(10,2) NOT NULL,
    "is_multi_day" BOOLEAN NOT NULL DEFAULT false,
    "completion_status" VARCHAR(50) NOT NULL,
    "work_summary" JSONB,
    "materials_used" JSONB,
    "customer_signature" JSONB,
    "technician_signature" JSONB,
    "location" JSONB,
    "notes" TEXT,
    "warnings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_check_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_configs_country_code_business_unit_idx" ON "calendar_configs"("country_code", "business_unit");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_configs_country_code_business_unit_key" ON "calendar_configs"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "tasks_service_order_id_idx" ON "tasks"("service_order_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_sla_deadline_idx" ON "tasks"("sla_deadline");

-- CreateIndex
CREATE INDEX "tasks_country_code_idx" ON "tasks"("country_code");

-- CreateIndex
CREATE INDEX "tasks_task_type_status_idx" ON "tasks"("task_type", "status");

-- CreateIndex
CREATE INDEX "tasks_status_priority_sla_deadline_assigned_to_idx" ON "tasks"("status", "priority", "sla_deadline", "assigned_to");

-- CreateIndex
CREATE INDEX "task_audit_logs_task_id_idx" ON "task_audit_logs"("task_id");

-- CreateIndex
CREATE INDEX "task_audit_logs_performed_at_idx" ON "task_audit_logs"("performed_at");

-- CreateIndex
CREATE UNIQUE INDEX "work_completion_forms_wcf_number_key" ON "work_completion_forms"("wcf_number");

-- CreateIndex
CREATE INDEX "work_completion_forms_service_order_id_idx" ON "work_completion_forms"("service_order_id");

-- CreateIndex
CREATE INDEX "work_completion_forms_contract_id_idx" ON "work_completion_forms"("contract_id");

-- CreateIndex
CREATE INDEX "work_completion_forms_status_idx" ON "work_completion_forms"("status");

-- CreateIndex
CREATE INDEX "work_completion_forms_country_code_business_unit_idx" ON "work_completion_forms"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "work_completion_forms_service_date_idx" ON "work_completion_forms"("service_date");

-- CreateIndex
CREATE INDEX "work_completion_forms_customer_accepted_idx" ON "work_completion_forms"("customer_accepted");

-- CreateIndex
CREATE INDEX "wcf_materials_wcf_id_idx" ON "wcf_materials"("wcf_id");

-- CreateIndex
CREATE INDEX "wcf_equipment_wcf_id_idx" ON "wcf_equipment"("wcf_id");

-- CreateIndex
CREATE INDEX "wcf_labor_wcf_id_idx" ON "wcf_labor"("wcf_id");

-- CreateIndex
CREATE INDEX "wcf_labor_technician_id_idx" ON "wcf_labor"("technician_id");

-- CreateIndex
CREATE INDEX "wcf_photos_wcf_id_idx" ON "wcf_photos"("wcf_id");

-- CreateIndex
CREATE INDEX "wcf_photos_equipment_id_idx" ON "wcf_photos"("equipment_id");

-- CreateIndex
CREATE INDEX "wcf_photos_photo_type_idx" ON "wcf_photos"("photo_type");

-- CreateIndex
CREATE INDEX "wcf_quality_checks_wcf_id_idx" ON "wcf_quality_checks"("wcf_id");

-- CreateIndex
CREATE INDEX "wcf_signatures_wcf_id_idx" ON "wcf_signatures"("wcf_id");

-- CreateIndex
CREATE INDEX "wcf_signatures_signer_type_idx" ON "wcf_signatures"("signer_type");

-- CreateIndex
CREATE INDEX "wcf_signatures_status_idx" ON "wcf_signatures"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notification_templates_channel_idx" ON "notification_templates"("channel");

-- CreateIndex
CREATE INDEX "notification_templates_event_type_idx" ON "notification_templates"("event_type");

-- CreateIndex
CREATE INDEX "notification_templates_country_code_business_unit_idx" ON "notification_templates"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "notification_templates_is_active_idx" ON "notification_templates"("is_active");

-- CreateIndex
CREATE INDEX "notification_translations_template_id_idx" ON "notification_translations"("template_id");

-- CreateIndex
CREATE INDEX "notification_translations_language_idx" ON "notification_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "notification_translations_template_id_language_key" ON "notification_translations"("template_id", "language");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_idx" ON "notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_email_idx" ON "notifications"("recipient_email");

-- CreateIndex
CREATE INDEX "notifications_recipient_phone_idx" ON "notifications"("recipient_phone");

-- CreateIndex
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_event_type_idx" ON "notifications"("event_type");

-- CreateIndex
CREATE INDEX "notifications_context_type_context_id_idx" ON "notifications"("context_type", "context_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_next_retry_at_idx" ON "notifications"("next_retry_at");

-- CreateIndex
CREATE INDEX "notification_webhooks_notification_id_idx" ON "notification_webhooks"("notification_id");

-- CreateIndex
CREATE INDEX "notification_webhooks_provider_idx" ON "notification_webhooks"("provider");

-- CreateIndex
CREATE INDEX "notification_webhooks_event_idx" ON "notification_webhooks"("event");

-- CreateIndex
CREATE INDEX "notification_webhooks_processed_idx" ON "notification_webhooks"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "device_syncs_device_id_key" ON "device_syncs"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_syncs_sync_token_key" ON "device_syncs"("sync_token");

-- CreateIndex
CREATE INDEX "device_syncs_user_id_idx" ON "device_syncs"("user_id");

-- CreateIndex
CREATE INDEX "device_syncs_device_id_idx" ON "device_syncs"("device_id");

-- CreateIndex
CREATE INDEX "device_syncs_sync_token_idx" ON "device_syncs"("sync_token");

-- CreateIndex
CREATE INDEX "device_syncs_last_sync_at_idx" ON "device_syncs"("last_sync_at");

-- CreateIndex
CREATE INDEX "device_syncs_country_code_business_unit_idx" ON "device_syncs"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "sync_operations_device_sync_id_idx" ON "sync_operations"("device_sync_id");

-- CreateIndex
CREATE INDEX "sync_operations_operation_type_idx" ON "sync_operations"("operation_type");

-- CreateIndex
CREATE INDEX "sync_operations_entity_type_entity_id_idx" ON "sync_operations"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "sync_operations_sync_token_idx" ON "sync_operations"("sync_token");

-- CreateIndex
CREATE INDEX "sync_operations_status_idx" ON "sync_operations"("status");

-- CreateIndex
CREATE INDEX "sync_operations_conflict_detected_idx" ON "sync_operations"("conflict_detected");

-- CreateIndex
CREATE INDEX "sync_operations_created_at_idx" ON "sync_operations"("created_at");

-- CreateIndex
CREATE INDEX "service_order_check_ins_service_order_id_idx" ON "service_order_check_ins"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_check_ins_technician_user_id_idx" ON "service_order_check_ins"("technician_user_id");

-- CreateIndex
CREATE INDEX "service_order_check_outs_service_order_id_idx" ON "service_order_check_outs"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_check_outs_technician_user_id_idx" ON "service_order_check_outs"("technician_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_order_buffers_service_order_id_key" ON "service_order_buffers"("service_order_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_audit_logs" ADD CONSTRAINT "task_audit_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_completion_forms" ADD CONSTRAINT "work_completion_forms_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_completion_forms" ADD CONSTRAINT "work_completion_forms_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wcf_materials" ADD CONSTRAINT "wcf_materials_wcf_id_fkey" FOREIGN KEY ("wcf_id") REFERENCES "work_completion_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wcf_equipment" ADD CONSTRAINT "wcf_equipment_wcf_id_fkey" FOREIGN KEY ("wcf_id") REFERENCES "work_completion_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wcf_labor" ADD CONSTRAINT "wcf_labor_wcf_id_fkey" FOREIGN KEY ("wcf_id") REFERENCES "work_completion_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wcf_photos" ADD CONSTRAINT "wcf_photos_wcf_id_fkey" FOREIGN KEY ("wcf_id") REFERENCES "work_completion_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wcf_photos" ADD CONSTRAINT "wcf_photos_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "wcf_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wcf_quality_checks" ADD CONSTRAINT "wcf_quality_checks_wcf_id_fkey" FOREIGN KEY ("wcf_id") REFERENCES "work_completion_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wcf_signatures" ADD CONSTRAINT "wcf_signatures_wcf_id_fkey" FOREIGN KEY ("wcf_id") REFERENCES "work_completion_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_translations" ADD CONSTRAINT "notification_translations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_syncs" ADD CONSTRAINT "device_syncs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_device_sync_id_fkey" FOREIGN KEY ("device_sync_id") REFERENCES "device_syncs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
