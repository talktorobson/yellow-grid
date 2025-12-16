#!/bin/bash
#
# Camunda E2E Workflow Test Suite v2
# ===================================
# This script:
# 1. Creates test service orders in the database
# 2. Triggers workflows via the new /api/v1/camunda/trigger-workflow/bulk endpoint
# 3. Monitors worker execution
# 4. Verifies state transitions
#

set -e

VPS_IP="135.181.96.93"
SSH_KEY="deploy/vps_key"
TIMESTAMP=$(date +%s)

echo "═══════════════════════════════════════════════════════════════"
echo "  🧪 CAMUNDA E2E WORKFLOW TEST SUITE v2"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Define test cases
TC1_ID="e2e-fr-std-$TIMESTAMP"
TC2_ID="e2e-es-urg-$TIMESTAMP"
TC3_ID="e2e-it-std-$TIMESTAMP"
TC4_ID="e2e-fr-low-$TIMESTAMP"
TC5_ID="e2e-pt-std-$TIMESTAMP"

echo "📋 STEP 1: Pre-flight Checks"
echo "-------------------------------------------"

# Verify Camunda health via new endpoint
echo "Checking Camunda health endpoint..."
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api sh -c 'curl -s http://localhost:3000/api/v1/camunda/health 2>/dev/null || echo {}'" | head -5

# Get a valid service ID
FR_SERVICE_ID=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"SELECT id FROM service_catalog LIMIT 1;\"" | tr -d ' ')
echo "Service ID: $FR_SERVICE_ID"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📦 CREATING TEST SERVICE ORDERS IN DATABASE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create all 5 test orders
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
-- Test Case 1: FR Standard (Paris 75001)
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC1_ID', 'CREATED', '$FR_SERVICE_ID', 'FR', 'ADEO_FR',
  '{"name": "Marie Dupont", "email": "marie@test.fr", "phone": "+33612345678", "address": {"street": "15 Rue de Rivoli", "city": "Paris", "postalCode": "75001", "country": "FR"}}'::jsonb,
  'INSTALLATION', 180,
  '{"street": "15 Rue de Rivoli", "city": "Paris", "postalCode": "75001"}'::jsonb,
  NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 3 hours',
  'STANDARD', NOW(), NOW(), 'LOW'
) ON CONFLICT (id) DO NOTHING;

-- Test Case 2: ES Urgent (Madrid 28001)
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC2_ID', 'CREATED', '$FR_SERVICE_ID', 'ES', 'ADEO_ES',
  '{"name": "Carlos García", "email": "carlos@test.es", "phone": "+34612345678", "address": {"street": "Calle Gran Vía 25", "city": "Madrid", "postalCode": "28001", "country": "ES"}}'::jsonb,
  'INSTALLATION', 120,
  '{"street": "Calle Gran Vía 25", "city": "Madrid", "postalCode": "28001"}'::jsonb,
  NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours',
  'URGENT', NOW(), NOW(), 'LOW'
) ON CONFLICT (id) DO NOTHING;

-- Test Case 3: IT Standard (Milano 20121)
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC3_ID', 'CREATED', '$FR_SERVICE_ID', 'IT', 'ADEO_IT',
  '{"name": "Giuseppe Rossi", "email": "giuseppe@test.it", "phone": "+39612345678", "address": {"street": "Via Montenapoleone 10", "city": "Milano", "postalCode": "20121", "country": "IT"}}'::jsonb,
  'INSTALLATION', 240,
  '{"street": "Via Montenapoleone 10", "city": "Milano", "postalCode": "20121"}'::jsonb,
  NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 4 hours',
  'STANDARD', NOW(), NOW(), 'NONE'
) ON CONFLICT (id) DO NOTHING;

-- Test Case 4: FR Low (Bordeaux 33000)
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC4_ID', 'CREATED', '$FR_SERVICE_ID', 'FR', 'ADEO_FR',
  '{"name": "Jean-Pierre Martin", "email": "jp@test.fr", "phone": "+33698765432", "address": {"street": "45 Cours Intendance", "city": "Bordeaux", "postalCode": "33000", "country": "FR"}}'::jsonb,
  'INSTALLATION', 360,
  '{"street": "45 Cours Intendance", "city": "Bordeaux", "postalCode": "33000"}'::jsonb,
  NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days 6 hours',
  'LOW', NOW(), NOW(), 'NONE'
) ON CONFLICT (id) DO NOTHING;

-- Test Case 5: PT Standard (Lisboa 1000-001)
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC5_ID', 'CREATED', '$FR_SERVICE_ID', 'PT', 'ADEO_PT',
  '{"name": "João Silva", "email": "joao@test.pt", "phone": "+351612345678", "address": {"street": "Av da Liberdade 100", "city": "Lisboa", "postalCode": "1000-001", "country": "PT"}}'::jsonb,
  'INSTALLATION', 150,
  '{"street": "Av da Liberdade 100", "city": "Lisboa", "postalCode": "1000-001"}'::jsonb,
  NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days 2.5 hours',
  'STANDARD', NOW(), NOW(), 'LOW'
) ON CONFLICT (id) DO NOTHING;

SELECT 'Orders created' as status, COUNT(*) as count FROM service_orders WHERE id LIKE 'e2e-%$TIMESTAMP';
EOSQL

echo ""
echo "✅ Test orders created in database"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 TRIGGERING WORKFLOWS VIA API"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Build the bulk request JSON
BULK_REQUEST=$(cat << JSONEOF
{
  "orders": [
    {
      "serviceOrderId": "$TC1_ID",
      "countryCode": "FR",
      "postalCode": "75001",
      "urgency": "STANDARD",
      "serviceId": "$FR_SERVICE_ID"
    },
    {
      "serviceOrderId": "$TC2_ID",
      "countryCode": "ES",
      "postalCode": "28001",
      "urgency": "URGENT",
      "serviceId": "$FR_SERVICE_ID"
    },
    {
      "serviceOrderId": "$TC3_ID",
      "countryCode": "IT",
      "postalCode": "20121",
      "urgency": "STANDARD",
      "serviceId": "$FR_SERVICE_ID"
    },
    {
      "serviceOrderId": "$TC4_ID",
      "countryCode": "FR",
      "postalCode": "33000",
      "urgency": "LOW",
      "serviceId": "$FR_SERVICE_ID"
    },
    {
      "serviceOrderId": "$TC5_ID",
      "countryCode": "PT",
      "postalCode": "1000-001",
      "urgency": "STANDARD",
      "serviceId": "$FR_SERVICE_ID"
    }
  ]
}
JSONEOF
)

echo "Calling /api/v1/camunda/trigger-workflow/bulk..."
echo ""

# Call the bulk trigger endpoint from inside the API container
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api sh -c 'curl -s -X POST http://localhost:3000/api/v1/camunda/trigger-workflow/bulk -H \"Content-Type: application/json\" -d '\''$BULK_REQUEST'\'' 2>/dev/null'" | tee /tmp/workflow-results.json

echo ""
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  ⏱️ WAITING FOR WORKER PROCESSING (15 seconds)"
echo "═══════════════════════════════════════════════════════════════"
sleep 15
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 CHECKING WORKER EXECUTION LOGS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Recent worker activity:"
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api --since 30s 2>&1 | grep -E 'validate-order|find-providers|rank-providers|auto-assign|send-offer|go-check|Worker|workflow|Process Instance' | tail -40" || echo "(no activity)"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 CHECKING SERVICE ORDER FINAL STATES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
SELECT 
  id,
  state,
  country_code as country,
  urgency,
  assigned_provider_id IS NOT NULL as provider_assigned,
  assigned_work_team_id IS NOT NULL as team_assigned,
  updated_at::timestamp(0) as last_update
FROM service_orders 
WHERE id LIKE 'e2e-%$TIMESTAMP'
ORDER BY country_code, urgency;
EOSQL

echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 CHECKING FOR ASSIGNMENTS CREATED"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -c \"SELECT so.id as order_id, a.status, a.assigned_at, p.name as provider FROM service_orders so LEFT JOIN assignments a ON so.id = a.service_order_id LEFT JOIN providers p ON a.provider_id = p.id WHERE so.id LIKE 'e2e-%$TIMESTAMP';\"" || echo "No assignments table or no matches"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 ZEEBE PROCESS INSTANCE ACTIVITY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs zeebe --since 30s 2>&1 | grep -iE 'ServiceOrder|process|instance|complete|job' | tail -20" || echo "(no Zeebe activity)"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ E2E TEST COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Test Orders:"
echo "  1. $TC1_ID (FR Standard, Paris 75001)"
echo "  2. $TC2_ID (ES Urgent, Madrid 28001) - AUTO_ACCEPT"
echo "  3. $TC3_ID (IT Standard, Milano 20121) - AUTO_ACCEPT"
echo "  4. $TC4_ID (FR Low, Bordeaux 33000)"
echo "  5. $TC5_ID (PT Standard, Lisboa 1000-001)"
echo ""
echo "📝 Monitor in Operate UI:"
echo "   ssh -i deploy/vps_key -L 8081:localhost:8081 root@135.181.96.93"
echo "   http://localhost:8081 (demo/demo)"
echo ""
echo "═══════════════════════════════════════════════════════════════"
