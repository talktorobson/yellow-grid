-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('IN_STORE', 'ONLINE', 'MOBILE_APP', 'PHONE', 'PARTNER', 'B2B');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'PARTIAL', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LineItemType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "LineExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'SITE_CONTACT', 'BILLING', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('EMAIL', 'PHONE', 'MOBILE', 'WHATSAPP', 'SMS');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "bu_code" VARCHAR(20),
ADD COLUMN     "customer_language" VARCHAR(5),
ADD COLUMN     "customer_mobile" VARCHAR(50),
ADD COLUMN     "customer_whatsapp" VARCHAR(50),
ADD COLUMN     "sales_channel" "SalesChannel",
ADD COLUMN     "sales_system_id" TEXT,
ADD COLUMN     "site_contact_email" VARCHAR(255),
ADD COLUMN     "site_contact_name" VARCHAR(255),
ADD COLUMN     "site_contact_phone" VARCHAR(50),
ADD COLUMN     "store_id" TEXT;

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "all_products_delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bu_code" VARCHAR(20),
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
ADD COLUMN     "delivery_blocks_execution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "earliest_delivery_date" TIMESTAMP(3),
ADD COLUMN     "latest_delivery_date" TIMESTAMP(3),
ADD COLUMN     "margin_percent" DECIMAL(5,4),
ADD COLUMN     "order_date" TIMESTAMP(3),
ADD COLUMN     "paid_amount" DECIMAL(12,2),
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_method" VARCHAR(50),
ADD COLUMN     "payment_reference" VARCHAR(100),
ADD COLUMN     "payment_status" "PaymentStatus",
ADD COLUMN     "product_delivery_status" "DeliveryStatus",
ADD COLUMN     "sales_channel" "SalesChannel",
ADD COLUMN     "sales_order_line_id" VARCHAR(50),
ADD COLUMN     "sales_order_number" VARCHAR(50),
ADD COLUMN     "sales_system_id" TEXT,
ADD COLUMN     "store_id" TEXT,
ADD COLUMN     "total_amount_customer" DECIMAL(12,2),
ADD COLUMN     "total_amount_customer_excl_tax" DECIMAL(12,2),
ADD COLUMN     "total_amount_provider" DECIMAL(12,2),
ADD COLUMN     "total_amount_provider_excl_tax" DECIMAL(12,2),
ADD COLUMN     "total_discount_customer" DECIMAL(12,2),
ADD COLUMN     "total_margin" DECIMAL(12,2),
ADD COLUMN     "total_tax_customer" DECIMAL(12,2),
ADD COLUMN     "total_tax_provider" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "sales_systems" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "api_endpoint" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "external_store_id" TEXT,
    "country_code" VARCHAR(3) NOT NULL,
    "business_unit" VARCHAR(50) NOT NULL,
    "bu_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" JSONB NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "timezone" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_line_items" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "external_line_id" VARCHAR(100),
    "line_type" "LineItemType" NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "external_sku" VARCHAR(100),
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "product_category" VARCHAR(100),
    "product_brand" VARCHAR(100),
    "product_model" VARCHAR(255),
    "service_id" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_of_measure" VARCHAR(20) NOT NULL DEFAULT 'UNIT',
    "unit_price_customer" DECIMAL(12,4) NOT NULL,
    "tax_rate_customer" DECIMAL(5,4) NOT NULL,
    "discount_percent" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_total_customer" DECIMAL(12,2) NOT NULL,
    "line_total_customer_excl_tax" DECIMAL(12,2) NOT NULL,
    "line_tax_amount_customer" DECIMAL(12,2) NOT NULL,
    "unit_price_provider" DECIMAL(12,4),
    "tax_rate_provider" DECIMAL(5,4),
    "line_total_provider" DECIMAL(12,2),
    "line_total_provider_excl_tax" DECIMAL(12,2),
    "line_tax_amount_provider" DECIMAL(12,2),
    "margin_amount" DECIMAL(12,2),
    "margin_percent" DECIMAL(5,4),
    "delivery_status" "DeliveryStatus",
    "expected_delivery_date" TIMESTAMP(3),
    "actual_delivery_date" TIMESTAMP(3),
    "delivery_reference" VARCHAR(100),
    "delivery_notes" TEXT,
    "execution_status" "LineExecutionStatus",
    "executed_at" TIMESTAMP(3),
    "executed_quantity" DECIMAL(10,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_contacts" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "contact_type" "ContactType" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "title" VARCHAR(20),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "whatsapp" VARCHAR(50),
    "preferred_method" "ContactMethod",
    "preferred_language" VARCHAR(5),
    "do_not_call" BOOLEAN NOT NULL DEFAULT false,
    "do_not_email" BOOLEAN NOT NULL DEFAULT false,
    "availability_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_order_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_systems_code_key" ON "sales_systems"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stores_external_store_id_key" ON "stores"("external_store_id");

-- CreateIndex
CREATE INDEX "stores_country_code_business_unit_idx" ON "stores"("country_code", "business_unit");

-- CreateIndex
CREATE INDEX "stores_bu_code_idx" ON "stores"("bu_code");

-- CreateIndex
CREATE UNIQUE INDEX "stores_country_code_bu_code_key" ON "stores"("country_code", "bu_code");

-- CreateIndex
CREATE INDEX "service_order_line_items_service_order_id_idx" ON "service_order_line_items"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_line_items_sku_idx" ON "service_order_line_items"("sku");

-- CreateIndex
CREATE INDEX "service_order_line_items_line_type_idx" ON "service_order_line_items"("line_type");

-- CreateIndex
CREATE INDEX "service_order_line_items_delivery_status_idx" ON "service_order_line_items"("delivery_status");

-- CreateIndex
CREATE UNIQUE INDEX "service_order_line_items_service_order_id_line_number_key" ON "service_order_line_items"("service_order_id", "line_number");

-- CreateIndex
CREATE INDEX "service_order_contacts_service_order_id_idx" ON "service_order_contacts"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_contacts_service_order_id_is_primary_idx" ON "service_order_contacts"("service_order_id", "is_primary");

-- CreateIndex
CREATE INDEX "projects_sales_system_id_idx" ON "projects"("sales_system_id");

-- CreateIndex
CREATE INDEX "projects_store_id_idx" ON "projects"("store_id");

-- CreateIndex
CREATE INDEX "projects_bu_code_idx" ON "projects"("bu_code");

-- CreateIndex
CREATE INDEX "service_orders_sales_system_id_idx" ON "service_orders"("sales_system_id");

-- CreateIndex
CREATE INDEX "service_orders_store_id_idx" ON "service_orders"("store_id");

-- CreateIndex
CREATE INDEX "service_orders_bu_code_idx" ON "service_orders"("bu_code");

-- CreateIndex
CREATE INDEX "service_orders_sales_channel_idx" ON "service_orders"("sales_channel");

-- CreateIndex
CREATE INDEX "service_orders_sales_order_number_idx" ON "service_orders"("sales_order_number");

-- CreateIndex
CREATE INDEX "service_orders_payment_status_idx" ON "service_orders"("payment_status");

-- CreateIndex
CREATE INDEX "service_orders_product_delivery_status_idx" ON "service_orders"("product_delivery_status");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_sales_system_id_fkey" FOREIGN KEY ("sales_system_id") REFERENCES "sales_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_sales_system_id_fkey" FOREIGN KEY ("sales_system_id") REFERENCES "sales_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_line_items" ADD CONSTRAINT "service_order_line_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_line_items" ADD CONSTRAINT "service_order_line_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_contacts" ADD CONSTRAINT "service_order_contacts_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
