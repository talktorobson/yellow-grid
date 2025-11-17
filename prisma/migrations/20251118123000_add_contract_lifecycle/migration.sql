-- AlterTable
ALTER TABLE "contract_templates"
  ADD COLUMN "body_template" TEXT,
  ADD COLUMN "default_payload" JSONB;

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractSignerType" AS ENUM ('CUSTOMER', 'SERVICE_PROVIDER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('TYPED', 'DRAWN', 'UPLOADED');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('REQUESTED', 'SIGNED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contract_number" VARCHAR(30) NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "template_id" TEXT,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "document_body" TEXT,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "sent_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "signature_code" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signatures" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "signer_type" "ContractSignerType" NOT NULL,
    "signer_name" VARCHAR(255) NOT NULL,
    "signer_email" TEXT,
    "signer_phone" TEXT,
    "signature_method" "SignatureMethod" NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'REQUESTED',
    "signed_at" TIMESTAMP(3),
    "verification_code" VARCHAR(20),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "evidence" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_notifications" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "destination" VARCHAR(255) NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts" ("contract_number");

-- CreateIndex
CREATE INDEX "contracts_service_order_id_idx" ON "contracts" ("service_order_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts" ("status");

-- CreateIndex
CREATE INDEX "contract_signatures_contract_id_idx" ON "contract_signatures" ("contract_id");

-- CreateIndex
CREATE INDEX "contract_notifications_contract_id_idx" ON "contract_notifications" ("contract_id");

-- CreateIndex
CREATE INDEX "contract_notifications_channel_idx" ON "contract_notifications" ("channel");

-- AddForeignKey
ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signatures"
  ADD CONSTRAINT "contract_signatures_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_notifications"
  ADD CONSTRAINT "contract_notifications_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
