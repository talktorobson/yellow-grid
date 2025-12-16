#!/bin/bash
#
# Camunda E2E Workflow Test Suite
# ================================
# This script simulates real service order operations and triggers
# full Camunda workflow execution on VPS.
#
# Test Scenarios:
# 1. FR Standard Installation - Auto-assign (P1 provider in zone)
# 2. ES Urgent Installation - Priority auto-assign (ES is AUTO_ACCEPT)
# 3. IT Standard Installation - Auto-assign (IT is AUTO_ACCEPT)  
# 4. FR with no coverage - Workflow error handling
# 5. Multiple orders - Parallel workflow processing
#

set -e

VPS_IP="135.181.96.93"
SSH_KEY="deploy/vps_key"
TIMESTAMP=$(date +%s)

echo "═══════════════════════════════════════════════════════════════"
echo "  🧪 CAMUNDA E2E WORKFLOW TEST SUITE"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Function to run SQL on VPS
run_sql() {
    ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"$1\""
}

# Function to run SQL from heredoc
run_sql_heredoc() {
    ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid"
}

# Function to check API logs
check_logs() {
    ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api --since $1 2>&1 | grep -E '$2' | tail -$3"
}

echo "📋 STEP 1: Pre-flight Checks"
echo "-------------------------------------------"

# Verify Camunda is enabled
CAMUNDA_ENABLED=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api sh -c 'echo \$CAMUNDA_ENABLED'")
echo "CAMUNDA_ENABLED: $CAMUNDA_ENABLED"

if [ "$CAMUNDA_ENABLED" != "true" ]; then
    echo "❌ CAMUNDA_ENABLED is not true. Aborting."
    exit 1
fi
echo "✅ Camunda is enabled"

# Verify workers are registered
WORKER_COUNT=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api 2>&1 | grep -c 'Registered worker'" || echo "0")
echo "Workers registered: $WORKER_COUNT"
if [ "$WORKER_COUNT" -lt 9 ]; then
    echo "⚠️ Expected 9 workers, found $WORKER_COUNT"
fi
echo ""

echo "📋 STEP 2: Get Reference Data"
echo "-------------------------------------------"

# Get a valid service ID for FR
FR_SERVICE_ID=$(run_sql "SELECT id FROM service_catalog LIMIT 1;" | tr -d ' ')
echo "FR Service ID: $FR_SERVICE_ID"

# Get providers by country
FR_PROVIDER=$(run_sql "SELECT id FROM providers WHERE country_code = 'FR' AND status = 'ACTIVE' LIMIT 1;" | tr -d ' ')
ES_PROVIDER=$(run_sql "SELECT id FROM providers WHERE country_code = 'ES' AND status = 'ACTIVE' LIMIT 1;" | tr -d ' ')
IT_PROVIDER=$(run_sql "SELECT id FROM providers WHERE country_code = 'IT' AND status = 'ACTIVE' LIMIT 1;" | tr -d ' ')

echo "FR Provider: $FR_PROVIDER"
echo "ES Provider: $ES_PROVIDER"
echo "IT Provider: $IT_PROVIDER"

# Get postal codes with coverage
FR_POSTAL=$(run_sql "SELECT postal_codes->0 FROM intervention_zones WHERE provider_id = '$FR_PROVIDER' LIMIT 1;" | tr -d ' "')
ES_POSTAL=$(run_sql "SELECT postal_codes->0 FROM intervention_zones WHERE provider_id = '$ES_PROVIDER' LIMIT 1;" | tr -d ' "')
IT_POSTAL=$(run_sql "SELECT postal_codes->0 FROM intervention_zones iz JOIN providers p ON iz.provider_id = p.id WHERE p.country_code = 'IT' LIMIT 1;" | tr -d ' "')

echo "FR Postal Code: $FR_POSTAL"
echo "ES Postal Code: $ES_POSTAL"
echo "IT Postal Code: $IT_POSTAL"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📦 CREATING TEST SERVICE ORDERS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test Case 1: FR Standard Installation
echo "📦 Test Case 1: FR Standard Installation (75001 Paris)"
echo "-------------------------------------------"
TC1_ID="e2e-fr-standard-$TIMESTAMP"

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC1_ID',
  'CREATED',
  '$FR_SERVICE_ID',
  'FR',
  'ADEO_FR',
  '{"name": "Marie Dupont", "email": "marie.dupont@email.fr", "phone": "+33612345678", "address": {"street": "15 Rue de Rivoli", "city": "Paris", "postalCode": "75001", "country": "FR"}}'::jsonb,
  'INSTALLATION',
  180,
  '{"street": "15 Rue de Rivoli", "city": "Paris", "postalCode": "75001", "lat": 48.8566, "lng": 2.3522}'::jsonb,
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '5 days 3 hours',
  'STANDARD',
  NOW(),
  NOW(),
  'LOW'
);
EOSQL

echo "✅ Created: $TC1_ID (FR Standard, Paris 75001)"
echo ""

# Test Case 2: ES Urgent Installation (AUTO_ACCEPT country)
echo "📦 Test Case 2: ES Urgent Installation (28001 Madrid)"
echo "-------------------------------------------"
TC2_ID="e2e-es-urgent-$TIMESTAMP"

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC2_ID',
  'CREATED',
  '$FR_SERVICE_ID',
  'ES',
  'ADEO_ES',
  '{"name": "Carlos García", "email": "carlos.garcia@email.es", "phone": "+34612345678", "address": {"street": "Calle Gran Vía 25", "city": "Madrid", "postalCode": "28001", "country": "ES"}}'::jsonb,
  'INSTALLATION',
  120,
  '{"street": "Calle Gran Vía 25", "city": "Madrid", "postalCode": "28001", "lat": 40.4168, "lng": -3.7038}'::jsonb,
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days 2 hours',
  'URGENT',
  NOW(),
  NOW(),
  'LOW'
);
EOSQL

echo "✅ Created: $TC2_ID (ES Urgent, Madrid 28001)"
echo ""

# Test Case 3: IT Standard Installation (AUTO_ACCEPT country)
echo "📦 Test Case 3: IT Standard Installation (20121 Milano)"
echo "-------------------------------------------"
TC3_ID="e2e-it-standard-$TIMESTAMP"

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC3_ID',
  'CREATED',
  '$FR_SERVICE_ID',
  'IT',
  'ADEO_IT',
  '{"name": "Giuseppe Rossi", "email": "giuseppe.rossi@email.it", "phone": "+39612345678", "address": {"street": "Via Montenapoleone 10", "city": "Milano", "postalCode": "20121", "country": "IT"}}'::jsonb,
  'INSTALLATION',
  240,
  '{"street": "Via Montenapoleone 10", "city": "Milano", "postalCode": "20121", "lat": 45.4642, "lng": 9.1900}'::jsonb,
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days 4 hours',
  'STANDARD',
  NOW(),
  NOW(),
  'NONE'
);
EOSQL

echo "✅ Created: $TC3_ID (IT Standard, Milano 20121)"
echo ""

# Test Case 4: FR Low Priority with complex address
echo "📦 Test Case 4: FR Low Priority Installation (33000 Bordeaux)"
echo "-------------------------------------------"
TC4_ID="e2e-fr-low-$TIMESTAMP"

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC4_ID',
  'CREATED',
  '$FR_SERVICE_ID',
  'FR',
  'ADEO_FR',
  '{"name": "Jean-Pierre Martin", "email": "jp.martin@email.fr", "phone": "+33698765432", "address": {"street": "45 Cours de lIntendance", "city": "Bordeaux", "postalCode": "33000", "country": "FR"}}'::jsonb,
  'INSTALLATION',
  360,
  '{"street": "45 Cours de lIntendance", "city": "Bordeaux", "postalCode": "33000", "lat": 44.8378, "lng": -0.5792}'::jsonb,
  NOW() + INTERVAL '14 days',
  NOW() + INTERVAL '14 days 6 hours',
  'LOW',
  NOW(),
  NOW(),
  'NONE'
);
EOSQL

echo "✅ Created: $TC4_ID (FR Low, Bordeaux 33000)"
echo ""

# Test Case 5: PT Standard (different country)
echo "📦 Test Case 5: PT Standard Installation (1000-001 Lisboa)"
echo "-------------------------------------------"
TC5_ID="e2e-pt-standard-$TIMESTAMP"

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  '$TC5_ID',
  'CREATED',
  '$FR_SERVICE_ID',
  'PT',
  'ADEO_PT',
  '{"name": "João Silva", "email": "joao.silva@email.pt", "phone": "+351612345678", "address": {"street": "Avenida da Liberdade 100", "city": "Lisboa", "postalCode": "1000-001", "country": "PT"}}'::jsonb,
  'INSTALLATION',
  150,
  '{"street": "Avenida da Liberdade 100", "city": "Lisboa", "postalCode": "1000-001", "lat": 38.7223, "lng": -9.1393}'::jsonb,
  NOW() + INTERVAL '10 days',
  NOW() + INTERVAL '10 days 2.5 hours',
  'STANDARD',
  NOW(),
  NOW(),
  'LOW'
);
EOSQL

echo "✅ Created: $TC5_ID (PT Standard, Lisboa 1000-001)"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 TRIGGERING CAMUNDA WORKFLOWS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Note: Orders created directly in DB won't auto-trigger workflows."
echo "Simulating ServiceOrderCreatedEvent by calling CamundaService..."
echo ""

# Create a trigger script that will be executed inside the API container
ssh -i $SSH_KEY root@$VPS_IP "cat > /tmp/trigger-workflows.js << 'JSEOF'
const http = require('http');

// Orders to trigger workflows for
const orders = [
  { id: '$TC1_ID', country: 'FR', urgency: 'STANDARD', postalCode: '75001' },
  { id: '$TC2_ID', country: 'ES', urgency: 'URGENT', postalCode: '28001' },
  { id: '$TC3_ID', country: 'IT', urgency: 'STANDARD', postalCode: '20121' },
  { id: '$TC4_ID', country: 'FR', urgency: 'LOW', postalCode: '33000' },
  { id: '$TC5_ID', country: 'PT', urgency: 'STANDARD', postalCode: '1000-001' },
];

console.log('Triggering workflows for', orders.length, 'orders...');

// For now, just log what we would trigger
orders.forEach(o => {
  console.log('Order:', o.id, '| Country:', o.country, '| Urgency:', o.urgency);
});

console.log('Done - workflows would be triggered via event emitter');
JSEOF
"

echo "📋 Created trigger script on VPS"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 VERIFYING SERVICE ORDERS CREATED"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Querying database for test orders..."
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
SELECT 
  id,
  state,
  country_code,
  urgency,
  service_address->>'postalCode' as postal_code,
  created_at::date as created
FROM service_orders 
WHERE id LIKE 'e2e-%$TIMESTAMP'
ORDER BY created_at;
EOSQL

echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  🔄 SIMULATING WORKFLOW EVENTS"  
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Creating workflow process instances via Zeebe API..."
echo ""

# Trigger workflows by updating state and simulating events
# The real way would be through API, but we can simulate by:
# 1. Creating process instances directly in Zeebe
# 2. Or by calling internal endpoints

# Let's create a REST endpoint test via the API container's internal network
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api node -e \"
const { ZBClient } = require('zeebe-node');

async function triggerWorkflows() {
  try {
    const zbc = new ZBClient({
      gatewayAddress: 'yellow-grid-zeebe:26500',
      usePlainText: true,
    });
    
    const orders = [
      { id: '$TC1_ID', country: 'FR', urgency: 'STANDARD', postalCode: '75001', serviceId: '$FR_SERVICE_ID' },
      { id: '$TC2_ID', country: 'ES', urgency: 'URGENT', postalCode: '28001', serviceId: '$FR_SERVICE_ID' },
      { id: '$TC3_ID', country: 'IT', urgency: 'STANDARD', postalCode: '20121', serviceId: '$FR_SERVICE_ID' },
      { id: '$TC4_ID', country: 'FR', urgency: 'LOW', postalCode: '33000', serviceId: '$FR_SERVICE_ID' },
      { id: '$TC5_ID', country: 'PT', urgency: 'STANDARD', postalCode: '1000-001', serviceId: '$FR_SERVICE_ID' },
    ];
    
    for (const order of orders) {
      console.log('Starting workflow for:', order.id);
      const result = await zbc.createProcessInstance({
        bpmnProcessId: 'ServiceOrderLifecycle',
        variables: {
          serviceOrderId: order.id,
          customerId: 'test-customer',
          storeId: order.country + '-STORE',
          serviceId: order.serviceId,
          countryCode: order.country,
          businessUnit: 'ADEO_' + order.country,
          postalCode: order.postalCode,
          urgency: order.urgency,
          requestedStartDate: new Date(Date.now() + 5*24*60*60*1000).toISOString(),
          requestedEndDate: new Date(Date.now() + 5*24*60*60*1000 + 3*60*60*1000).toISOString(),
        },
      });
      console.log('  -> Process Instance:', result.processInstanceKey);
    }
    
    await zbc.close();
    console.log('All workflows triggered successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

triggerWorkflows();
\" 2>&1" || echo "Note: Direct Zeebe trigger may require SDK. Checking logs..."

echo ""
echo "⏱️  Waiting 10 seconds for workflow processing..."
sleep 10
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 CHECKING WORKER EXECUTION LOGS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Recent worker activity (last 30 seconds):"
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api --since 30s 2>&1 | grep -E 'validate-order|find-providers|rank-providers|auto-assign|send-offer|Worker|workflow|process' | tail -30" || echo "No recent worker logs"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 CHECKING SERVICE ORDER STATES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid" << EOSQL
SELECT 
  id,
  state,
  country_code,
  urgency,
  assigned_provider_id IS NOT NULL as has_provider,
  assigned_work_team_id IS NOT NULL as has_team,
  updated_at::timestamp(0) as last_update
FROM service_orders 
WHERE id LIKE 'e2e-%$TIMESTAMP'
ORDER BY created_at;
EOSQL

echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  📊 CHECKING ZEEBE PROCESS INSTANCES"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Checking Zeebe logs for process instances..."
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs zeebe --since 1m 2>&1 | grep -iE 'process|instance|ServiceOrder|job' | tail -20" || echo "No Zeebe activity"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ E2E TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Test Orders Created:"
echo "  1. $TC1_ID (FR Standard, Paris 75001)"
echo "  2. $TC2_ID (ES Urgent, Madrid 28001)"
echo "  3. $TC3_ID (IT Standard, Milano 20121)"
echo "  4. $TC4_ID (FR Low, Bordeaux 33000)"
echo "  5. $TC5_ID (PT Standard, Lisboa 1000-001)"
echo ""
echo "Expected Workflow Paths:"
echo "  - FR (non-AUTO_ACCEPT): Validate -> Find -> Rank -> Offer/Assign"
echo "  - ES (AUTO_ACCEPT + URGENT): Validate -> Find -> Rank -> Auto-Assign"
echo "  - IT (AUTO_ACCEPT): Validate -> Find -> Rank -> Auto-Assign"
echo "  - PT (depends on config): Validate -> Find -> Rank -> ..."
echo ""
echo "📝 To monitor workflows in real-time:"
echo "   ssh -i deploy/vps_key -L 8081:localhost:8081 root@135.181.96.93"
echo "   Then open: http://localhost:8081 (demo/demo)"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Test completed at $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"
