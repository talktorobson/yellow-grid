#!/bin/bash
#
# Camunda E2E Workflow Test Suite v4 - With Real Data
# =====================================================
# Uses actual stores and postal codes from seeded database
#

set -e

VPS_IP="135.181.96.93"
SSH_KEY="deploy/vps_key"
TIMESTAMP=$(date +%s)

echo "═══════════════════════════════════════════════════════════════"
echo "  🧪 CAMUNDA E2E WORKFLOW TEST SUITE v4"
echo "  Using Real Seeded Data"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ====================================================================
# STEP 1: Gather real data from database
# ====================================================================
echo "📋 STEP 1: Gathering Real Data from Database"
echo "-------------------------------------------"

# Get a valid service ID
SERVICE_ID=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"SELECT id FROM service_catalog LIMIT 1;\"" | tr -d ' \n\r')
echo "Service ID: $SERVICE_ID"

# Get a French store ID (Paris Ivry)
FR_STORE_ID=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"SELECT id FROM stores WHERE country_code = 'FR' LIMIT 1;\"" | tr -d ' \n\r')
echo "French Store ID: $FR_STORE_ID"

# Get a Spanish store ID
ES_STORE_ID=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"SELECT id FROM stores WHERE country_code = 'ES' LIMIT 1;\"" | tr -d ' \n\r')
echo "Spanish Store ID: $ES_STORE_ID"

# Get a provider ID that covers 75001
FR_PROVIDER_ID=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"
SELECT p.id 
FROM providers p 
JOIN intervention_zones iz ON iz.provider_id = p.id 
WHERE p.status = 'ACTIVE' 
  AND p.country_code = 'FR'
  AND iz.postal_codes::text LIKE '%75001%'
LIMIT 1;
\"" | tr -d ' \n\r')
echo "FR Provider (covers 75001): $FR_PROVIDER_ID"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  📦 CREATING E2E TEST SERVICE ORDERS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Define test cases
TC1_ID="e2e-fr-std-$TIMESTAMP"
TC2_ID="e2e-fr-urg-$TIMESTAMP"
TC3_ID="e2e-fr-low-$TIMESTAMP"

# Create test orders with real data
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
-- Test Case 1: FR Standard (Paris 75001) - Should pass validation
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level, store_id
) VALUES (
  '$TC1_ID', 'CREATED', '$SERVICE_ID', 'FR', 'LEROY_MERLIN',
  '{"name": "Marie Dupont", "email": "marie@test.fr", "phone": "+33612345678"}'::jsonb,
  'INSTALLATION', 180,
  '{"street": "15 Rue de Rivoli", "city": "Paris", "postalCode": "75001"}'::jsonb,
  NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 3 hours',
  'STANDARD', NOW(), NOW(), 'LOW', '$FR_STORE_ID'
) ON CONFLICT (id) DO NOTHING;

-- Test Case 2: FR Urgent (Paris 75002) - Should pass validation
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level, store_id
) VALUES (
  '$TC2_ID', 'CREATED', '$SERVICE_ID', 'FR', 'LEROY_MERLIN',
  '{"name": "Jean Martin", "email": "jean@test.fr", "phone": "+33698765432"}'::jsonb,
  'INSTALLATION', 120,
  '{"street": "8 Boulevard Haussmann", "city": "Paris", "postalCode": "75002"}'::jsonb,
  NOW() + INTERVAL '1 days', NOW() + INTERVAL '1 days 2 hours',
  'URGENT', NOW(), NOW(), 'LOW', '$FR_STORE_ID'
) ON CONFLICT (id) DO NOTHING;

-- Test Case 3: FR Low (Paris 75003) - Should pass validation
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level, store_id
) VALUES (
  '$TC3_ID', 'CREATED', '$SERVICE_ID', 'FR', 'LEROY_MERLIN',
  '{"name": "Sophie Bernard", "email": "sophie@test.fr", "phone": "+33611223344"}'::jsonb,
  'INSTALLATION', 240,
  '{"street": "20 Rue du Temple", "city": "Paris", "postalCode": "75003"}'::jsonb,
  NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days 4 hours',
  'LOW', NOW(), NOW(), 'NONE', '$FR_STORE_ID'
) ON CONFLICT (id) DO NOTHING;

SELECT id, state, country_code, urgency, service_address->>'postalCode' as postal FROM service_orders WHERE id LIKE 'e2e-fr-%-$TIMESTAMP';
EOSQL

echo ""
echo "✅ Test orders created"
echo ""

# ====================================================================
# STEP 2: Trigger workflows
# ====================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 TRIGGERING CAMUNDA WORKFLOWS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

for TC in "$TC1_ID:FR:75001:STANDARD:$FR_STORE_ID:LEROY_MERLIN" "$TC2_ID:FR:75002:URGENT:$FR_STORE_ID:LEROY_MERLIN" "$TC3_ID:FR:75003:LOW:$FR_STORE_ID:LEROY_MERLIN"; do
    IFS=':' read -r ID COUNTRY POSTAL URGENCY STORE BU <<< "$TC"
    echo "  🚀 Triggering: $ID ($COUNTRY, $POSTAL, $URGENCY)"
    
    RESULT=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api node -e \"
const http = require('http');
const data = JSON.stringify({
  serviceOrderId: '$ID',
  countryCode: '$COUNTRY',
  postalCode: '$POSTAL',
  urgency: '$URGENCY',
  serviceId: '$SERVICE_ID',
  storeId: '$STORE',
  businessUnit: '$BU'
});
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/camunda/trigger-workflow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});
req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();
\"" 2>&1)
    
    echo "     $RESULT"
    echo ""
done

echo ""
echo "⏱️  Waiting 20 seconds for workflow processing..."
sleep 20
echo ""

# ====================================================================
# STEP 3: Check workflow execution
# ====================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "  📊 WORKER EXECUTION LOGS (Last 60 seconds)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api --since 60s 2>&1 | grep -E 'Worker|validate|find-providers|rank|auto-assign|send-offer|Process Instance|BpmnError|VALIDATED|ASSIGNED' | tail -80" || echo "(no logs)"
echo ""

# ====================================================================
# STEP 4: Check database state
# ====================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "  📊 SERVICE ORDER STATES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -c \"
SELECT 
  id,
  state,
  urgency,
  assigned_provider_id IS NOT NULL as has_provider,
  COALESCE(assigned_provider_id::text, 'NONE') as provider_id,
  updated_at::timestamp(0) as updated
FROM service_orders 
WHERE id LIKE 'e2e-fr-%-$TIMESTAMP'
ORDER BY urgency;
\""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  📊 PROVIDER ASSIGNMENTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -c \"
SELECT 
  so.id as order_id,
  so.state,
  p.name as provider_name,
  p.country_code
FROM service_orders so
LEFT JOIN providers p ON so.assigned_provider_id = p.id
WHERE so.id LIKE 'e2e-fr-%-$TIMESTAMP';
\""

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ E2E TEST COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Test Order IDs: $TC1_ID, $TC2_ID, $TC3_ID"
echo ""
echo "Expected Flow:"
echo "  CREATED → validate-order → VALIDATED"
echo "  VALIDATED → find-providers → FINDING_PROVIDERS"
echo "  FINDING_PROVIDERS → rank-providers → PROVIDERS_RANKED"
echo "  FR (non-AUTO_ACCEPT) → send-offer → OFFER_PENDING"
echo ""
