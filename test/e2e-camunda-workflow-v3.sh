#!/bin/bash
#
# Camunda E2E Workflow Test Suite v3
# ===================================
# Simplified version that writes JSON to file first
#

set -e

VPS_IP="135.181.96.93"
SSH_KEY="deploy/vps_key"
TIMESTAMP=$(date +%s)

echo "═══════════════════════════════════════════════════════════════"
echo "  🧪 CAMUNDA E2E WORKFLOW TEST SUITE v3"
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

# Verify Camunda health
echo "Checking Camunda health..."
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api sh -c 'wget -qO- --post-data=\"\" http://localhost:3000/api/v1/camunda/health'" | head -1
echo ""

# Get a valid service ID
FR_SERVICE_ID=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"SELECT id FROM service_catalog LIMIT 1;\"" | tr -d ' ')
echo "Service ID: $FR_SERVICE_ID"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📦 CREATING TEST SERVICE ORDERS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create all 5 test orders using heredoc
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
-- Test Case 1: FR Standard (Paris 75001)
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC1_ID', 'CREATED', '$FR_SERVICE_ID', 'FR', 'ADEO_FR',
  '{"name": "Marie Dupont", "email": "marie@test.fr", "phone": "+33612345678"}'::jsonb,
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
  '{"name": "Carlos Garcia", "email": "carlos@test.es", "phone": "+34612345678"}'::jsonb,
  'INSTALLATION', 120,
  '{"street": "Calle Gran Via 25", "city": "Madrid", "postalCode": "28001"}'::jsonb,
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
  '{"name": "Giuseppe Rossi", "email": "giuseppe@test.it", "phone": "+39612345678"}'::jsonb,
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
  '{"name": "Jean-Pierre Martin", "email": "jp@test.fr", "phone": "+33698765432"}'::jsonb,
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
  '{"name": "Joao Silva", "email": "joao@test.pt", "phone": "+351612345678"}'::jsonb,
  'INSTALLATION', 150,
  '{"street": "Av da Liberdade 100", "city": "Lisboa", "postalCode": "1000-001"}'::jsonb,
  NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days 2 hours',
  'STANDARD', NOW(), NOW(), 'LOW'
) ON CONFLICT (id) DO NOTHING;

SELECT id, state, country_code, urgency FROM service_orders WHERE id LIKE 'e2e-%-$TIMESTAMP';
EOSQL

echo ""
echo "✅ Test orders created"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 TRIGGERING WORKFLOWS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create JSON file on VPS and trigger workflows
ssh -i $SSH_KEY root@$VPS_IP "cat > /tmp/bulk-request.json << 'JSONEOF'
{
  \"orders\": [
    {\"serviceOrderId\": \"$TC1_ID\", \"countryCode\": \"FR\", \"postalCode\": \"75001\", \"urgency\": \"STANDARD\", \"serviceId\": \"$FR_SERVICE_ID\"},
    {\"serviceOrderId\": \"$TC2_ID\", \"countryCode\": \"ES\", \"postalCode\": \"28001\", \"urgency\": \"URGENT\", \"serviceId\": \"$FR_SERVICE_ID\"},
    {\"serviceOrderId\": \"$TC3_ID\", \"countryCode\": \"IT\", \"postalCode\": \"20121\", \"urgency\": \"STANDARD\", \"serviceId\": \"$FR_SERVICE_ID\"},
    {\"serviceOrderId\": \"$TC4_ID\", \"countryCode\": \"FR\", \"postalCode\": \"33000\", \"urgency\": \"LOW\", \"serviceId\": \"$FR_SERVICE_ID\"},
    {\"serviceOrderId\": \"$TC5_ID\", \"countryCode\": \"PT\", \"postalCode\": \"1000-001\", \"urgency\": \"STANDARD\", \"serviceId\": \"$FR_SERVICE_ID\"}
  ]
}
JSONEOF
"

echo "JSON payload created on VPS: /tmp/bulk-request.json"
echo ""

# Trigger workflows using the JSON file
echo "Calling bulk trigger endpoint..."
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api sh -c 'cat /tmp/bulk-request.json | xargs -0 wget -qO- --post-data http://localhost:3000/api/v1/camunda/trigger-workflow/bulk --header=\"Content-Type: application/json\"'" 2>&1 || true

# Alternative: trigger one by one
echo ""
echo "Triggering workflows individually..."

for TC in "$TC1_ID:FR:75001:STANDARD" "$TC2_ID:ES:28001:URGENT" "$TC3_ID:IT:20121:STANDARD" "$TC4_ID:FR:33000:LOW" "$TC5_ID:PT:1000-001:STANDARD"; do
    IFS=':' read -r ID COUNTRY POSTAL URGENCY <<< "$TC"
    echo "  → $ID ($COUNTRY, $URGENCY)"
    
    ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api node -e \"
const http = require('http');
const data = JSON.stringify({
  serviceOrderId: '$ID',
  countryCode: '$COUNTRY',
  postalCode: '$POSTAL',
  urgency: '$URGENCY',
  serviceId: '$FR_SERVICE_ID'
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
  res.on('end', () => console.log(res.statusCode, body.substring(0, 100)));
});
req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();
\"" 2>&1 || echo "    (request sent)"
done

echo ""
echo "⏱️  Waiting 15 seconds for workflow processing..."
sleep 15
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 CHECKING WORKER EXECUTION LOGS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api --since 30s 2>&1 | grep -E 'workflow|Worker|validate|find-providers|rank|auto-assign|Process Instance|BpmnError' | tail -50" || echo "(no activity)"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 SERVICE ORDER STATES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -c \"
SELECT 
  id,
  state,
  country_code as country,
  urgency,
  assigned_provider_id IS NOT NULL as has_provider,
  updated_at::timestamp(0) as updated
FROM service_orders 
WHERE id LIKE 'e2e-%-$TIMESTAMP'
ORDER BY country_code, urgency;
\""

echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 ZEEBE ACTIVITY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs zeebe --since 30s 2>&1 | grep -iE 'ServiceOrder|process|complete' | tail -20" || echo "(no Zeebe logs)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ TEST COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Orders: $TC1_ID, $TC2_ID, $TC3_ID, $TC4_ID, $TC5_ID"
echo ""
echo "Monitor: ssh -i deploy/vps_key -L 8081:localhost:8081 root@135.181.96.93"
echo "         http://localhost:8081 (demo/demo)"
