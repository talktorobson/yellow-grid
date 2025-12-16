/**
 * E2E Workflow Trigger Script
 * 
 * This script triggers Camunda workflows for existing service orders
 * by creating process instances directly in Zeebe.
 */
import { Camunda8 } from '@camunda8/sdk';

interface ServiceOrderData {
  id: string;
  countryCode: string;
  urgency: string;
  postalCode: string;
  serviceId: string;
}

async function triggerWorkflows(orders: ServiceOrderData[]): Promise<void> {
  console.log('🚀 Initializing Camunda client...');
  
  const client = new Camunda8({
    ZEEBE_ADDRESS: process.env.ZEEBE_ADDRESS || 'localhost:26500',
    ZEEBE_CLIENT_ID: process.env.ZEEBE_CLIENT_ID,
    ZEEBE_CLIENT_SECRET: process.env.ZEEBE_CLIENT_SECRET,
    CAMUNDA_OAUTH_URL: process.env.CAMUNDA_OAUTH_URL,
  });
  
  const zeebe = client.getZeebeGrpcApiClient();
  
  console.log(`📋 Processing ${orders.length} service orders...`);
  
  const results: Array<{ orderId: string; processInstanceKey: string; status: string }> = [];
  
  for (const order of orders) {
    try {
      console.log(`\n📦 Starting workflow for: ${order.id}`);
      console.log(`   Country: ${order.countryCode} | Urgency: ${order.urgency} | PostalCode: ${order.postalCode}`);
      
      const result = await zeebe.createProcessInstance({
        bpmnProcessId: 'ServiceOrderLifecycle',
        variables: {
          serviceOrderId: order.id,
          customerId: `customer-${order.id}`,
          storeId: `${order.countryCode}-STORE`,
          serviceId: order.serviceId,
          countryCode: order.countryCode,
          businessUnit: `ADEO_${order.countryCode}`,
          postalCode: order.postalCode,
          urgency: order.urgency,
          requestedStartDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          requestedEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          correlationId: `e2e-test-${Date.now()}`,
        },
      });
      
      console.log(`   ✅ Process Instance Key: ${result.processInstanceKey}`);
      results.push({
        orderId: order.id,
        processInstanceKey: result.processInstanceKey.toString(),
        status: 'SUCCESS',
      });
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.push({
        orderId: order.id,
        processInstanceKey: '',
        status: `ERROR: ${error.message}`,
      });
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 WORKFLOW TRIGGER RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  results.forEach((r) => {
    const icon = r.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${icon} ${r.orderId} -> ${r.processInstanceKey || r.status}`);
  });
  
  console.log('\n');
  await zeebe.close();
}

// Get order IDs from command line arguments or environment
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: npx ts-node scripts/trigger-e2e-workflows.ts <order1> <order2> ...');
  console.log('Or set E2E_ORDER_IDS environment variable');
  process.exit(1);
}

// Parse order data from args (format: id:country:urgency:postal:serviceId)
const orders: ServiceOrderData[] = args.map((arg) => {
  const [id, countryCode, urgency, postalCode, serviceId] = arg.split(':');
  return { id, countryCode, urgency, postalCode, serviceId };
});

triggerWorkflows(orders)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
