
import { Camunda8 } from '@camunda8/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('Initializing Camunda 8 SDK...');

    const c8 = new Camunda8({
        ZEEBE_ADDRESS: process.env.ZEEBE_ADDRESS || 'zeebe:26500',
        CAMUNDA_SECURE_CONNECTION: false
    });
    const zeebe = c8.getZeebeGrpcApiClient();

    const processId = 'DateNegotiation';
    const variables = {
        assignmentId: 'test-assignment-123',
        providerId: 'provider-abc',
        customerId: 'customer-xyz',
        proposedDate: new Date().toISOString(),
        negotiationId: 'neg-' + Date.now(),
        round: 1
    };

    console.log(`Starting process instance '${processId}' with variables:`, variables);

    try {
        const result = await zeebe.createProcessInstance({
            bpmnProcessId: processId,
            variables,
        });

        console.log('Processed instance created successfully:');
        console.log(`- Process Definition Key: ${result.processDefinitionKey}`);
        console.log(`- Process Instance Key:   ${result.processInstanceKey}`);
        console.log(`- BPMN Process ID:        ${result.bpmnProcessId}`);
        console.log(`- Version:                ${result.version}`);

        console.log('\nMonitoring for worker execution... (check app logs)');

        // Optional: We could simulate the customer message here to advance the flow
        // But first let's see if the first worker (record-date-proposal) picks it up.

    } catch (e) {
        console.error('Failed to create process instance:', e);
    } finally {
        await zeebe.close();
    }
}

main();
