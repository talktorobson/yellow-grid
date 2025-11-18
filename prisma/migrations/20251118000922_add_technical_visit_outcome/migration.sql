-- CreateEnum
CREATE TYPE "TvOutcome" AS ENUM ('YES', 'YES_BUT', 'NO');

-- AlterEnum
ALTER TYPE "DependencyType" ADD VALUE 'TV_OUTCOME';

-- CreateTable
CREATE TABLE "technical_visit_outcomes" (
    "id" TEXT NOT NULL,
    "tv_service_order_id" TEXT NOT NULL,
    "linked_installation_order_id" TEXT,
    "outcome" "TvOutcome" NOT NULL,
    "modifications" JSONB,
    "technician_notes" TEXT,
    "scope_change_requested" BOOLEAN NOT NULL DEFAULT false,
    "scope_change_requested_at" TIMESTAMP(3),
    "scope_change_approved" BOOLEAN,
    "scope_change_approved_at" TIMESTAMP(3),
    "scope_change_approved_by" VARCHAR(100),
    "installation_blocked" BOOLEAN NOT NULL DEFAULT false,
    "installation_unblocked_at" TIMESTAMP(3),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_visit_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technical_visit_outcomes_tv_service_order_id_key" ON "technical_visit_outcomes"("tv_service_order_id");

-- CreateIndex
CREATE INDEX "technical_visit_outcomes_tv_service_order_id_idx" ON "technical_visit_outcomes"("tv_service_order_id");

-- CreateIndex
CREATE INDEX "technical_visit_outcomes_linked_installation_order_id_idx" ON "technical_visit_outcomes"("linked_installation_order_id");

-- CreateIndex
CREATE INDEX "technical_visit_outcomes_outcome_idx" ON "technical_visit_outcomes"("outcome");

-- CreateIndex
CREATE INDEX "technical_visit_outcomes_installation_blocked_idx" ON "technical_visit_outcomes"("installation_blocked");
