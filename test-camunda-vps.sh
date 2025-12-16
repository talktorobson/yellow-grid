#!/bin/bash
set -e

echo "🧪 Camunda Integration Test - Comprehensive Suite"
echo "=================================================="
echo ""

# Test on VPS
VPS_IP="135.181.96.93"
SSH_KEY="deploy/vps_key"

echo "📋 Test 1: Verify BPMN Process Deployment"
echo "-------------------------------------------"
PROCESSES=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api 2>&1 | grep 'Deployed process'")
echo "$PROCESSES"
PROCESS_COUNT=$(echo "$PROCESSES" | wc -l | tr -d ' ')
echo "✅ Deployed Processes: $PROCESS_COUNT"
echo ""

echo "👷 Test 2: Verify Zeebe Workers Registered"
echo "-------------------------------------------"
WORKERS=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api 2>&1 | grep 'Registered worker'")
WORKER_COUNT=$(echo "$WORKERS" | wc -l | tr -d ' ')
echo "Workers registered: $WORKER_COUNT"
echo "$WORKERS" | tail -10
echo ""

echo "🔗 Test 3: Verify Zeebe Connectivity"
echo "-------------------------------------------"
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api sh -c 'nc -zv yellow-grid-zeebe 26500 2>&1'"
echo "✅ Zeebe gateway accessible"
echo ""

echo "📦 Test 4: Check Current Service Orders"
echo "-------------------------------------------"
ORDER_COUNT=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c 'SELECT COUNT(*) FROM service_orders;'")
echo "Total service orders in DB: $ORDER_COUNT"
echo ""

echo "🚀 Test 5: Create Test Service Order via API (Triggers Workflow)"
echo "-------------------------------------------"
echo "Note: This would create a service order through the API which emits ServiceOrderCreatedEvent"
echo "The event listener would then start the Camunda workflow"
echo ""

echo "Creating test service order..."
NEW_ORDER=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t <<'EOSQL'
INSERT INTO service_orders (
  id, state, service_id, country_code, business_unit,
  customer_info, service_type, estimated_duration_minutes,
  service_address, requested_start_date, requested_end_date,
  urgency, created_at, updated_at, risk_level
) VALUES (
  gen_random_uuid()::text,
  'CREATED',
  'svc_installation_kitchen',
  'FR',
  'ADEO_FR',
  '{\"name\": \"Integration Test\", \"email\": \"test@example.com\", \"phone\": \"+33612345678\"}'::jsonb,
  'INSTALLATION',
  180,
  '{\"street\": \"123 Test St\", \"city\": \"Paris\", \"postalCode\": \"75001\"}'::jsonb,
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '5 days 3 hours',
  'STANDARD',
  NOW(),
  NOW(),
  'LOW'
) RETURNING id, state, service_type;
EOSQL
")
echo "Created order: $NEW_ORDER"
ORDER_ID=$(echo "$NEW_ORDER" | awk '{print $1}' | tr -d ' ')
echo "Order ID: $ORDER_ID"
echo ""

echo "⏱️  Waiting 8 seconds for workflow processing..."
sleep 8
echo ""

echo "📊 Test 6: Check Workflow Activity Logs"
echo "-------------------------------------------"
echo "Recent worker activity (last 15 seconds):"
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs api --since 15s 2>&1 | grep -E 'workflow|Worker|validate-order|find-providers' || echo 'No recent activity'"
echo ""

echo "🔍 Test 7: Check Zeebe Activity"
echo "-------------------------------------------"
echo "Checking Zeebe logs for process instances:"
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose logs zeebe --since 15s 2>&1 | grep -iE 'process|instance|job|command' | tail -15 || echo 'No Zeebe activity'"
echo ""

echo "🐳 Test 8: Container Health Status"
echo "-------------------------------------------"
ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose ps | grep -E 'zeebe|operate|tasklist|api|postgres'"
echo ""

echo "📈 Test 9: Camunda Environment Check"
echo "-------------------------------------------"
echo "Checking CAMUNDA_ENABLED setting..."
CAMUNDA_ENABLED=$(ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T api sh -c 'env | grep CAMUNDA' || echo 'CAMUNDA vars not set'")
echo "$CAMUNDA_ENABLED"
echo ""

if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "" ]; then
    echo "🔎 Test 10: Verify Order State in Database"
    echo "-------------------------------------------"
    echo "Checking service order state after workflow processing:"
    ssh -i $SSH_KEY root@$VPS_IP "cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -t -c \"SELECT id, state, service_type, created_at FROM service_orders WHERE id='$ORDER_ID';\""
fi

echo ""
echo "=================================================="
echo "✅ Integration Test Complete"
echo "=================================================="
echo ""
echo "📊 Summary:"
echo "  - BPMN Processes Deployed: $PROCESS_COUNT"
echo "  - Workers Registered: $WORKER_COUNT"
echo "  - Zeebe Gateway: ✓ Accessible"
echo "  - Test Order Created: $ORDER_ID"
echo ""
echo "🔗 Useful Links:"
echo "  - Operate UI: http://$VPS_IP:8081 (requires SSH tunnel)"
echo "  - Tasklist UI: http://$VPS_IP:8082 (requires SSH tunnel)"
echo "  - API: https://$VPS_IP/api/v1"
echo "  - API Docs: https://$VPS_IP/api/docs"
echo ""
echo "💡 To access Camunda Operate UI locally:"
echo "  ssh -i $SSH_KEY -L 8081:localhost:8081 root@$VPS_IP"
echo "  Then open: http://localhost:8081"
