# Integration Testing Standards

## Overview

Integration tests verify that different modules, services, and components work together correctly. This document establishes standards and patterns for testing API endpoints, database operations, event handlers, and external service integrations.

## Test Scope

Integration tests validate:
- API endpoint behavior (REST, GraphQL)
- Database operations and transactions
- Message queue publishers/consumers
- External service integrations
- Authentication and authorization
- Multi-component workflows

## Test Environment Setup

### Testcontainers Configuration

```typescript
// src/test/integration/setup.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Client } from 'pg';
import Redis from 'ioredis';

export class TestEnvironment {
  private postgresContainer: StartedTestContainer;
  private redisContainer: StartedTestContainer;
  private rabbitMQContainer: StartedTestContainer;

  async setup(): Promise<void> {
    // Start PostgreSQL
    this.postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      })
      .withExposedPorts(5432)
      .start();

    // Start Redis
    this.redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    // Start RabbitMQ
    this.rabbitMQContainer = await new GenericContainer('rabbitmq:3-management')
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'testuser',
        RABBITMQ_DEFAULT_PASS: 'testpass',
      })
      .withExposedPorts(5672, 15672)
      .start();

    // Set environment variables
    process.env.DATABASE_URL = `postgresql://testuser:testpass@localhost:${this.postgresContainer.getMappedPort(
      5432
    )}/testdb`;
    process.env.REDIS_URL = `redis://localhost:${this.redisContainer.getMappedPort(
      6379
    )}`;
    process.env.RABBITMQ_URL = `amqp://testuser:testpass@localhost:${this.rabbitMQContainer.getMappedPort(
      5672
    )}`;
  }

  async teardown(): Promise<void> {
    await this.postgresContainer?.stop();
    await this.redisContainer?.stop();
    await this.rabbitMQContainer?.stop();
  }

  async resetDatabase(): Promise<void> {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // Drop all tables
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    await client.end();
  }

  async resetRedis(): Promise<void> {
    const redis = new Redis(process.env.REDIS_URL);
    await redis.flushall();
    await redis.quit();
  }
}

// Global setup
export default async function globalSetup() {
  const env = new TestEnvironment();
  await env.setup();
  (global as any).testEnvironment = env;
}

// Global teardown
export async function globalTeardown() {
  const env = (global as any).testEnvironment;
  await env?.teardown();
}
```

### Jest Configuration for Integration Tests

```javascript
// jest.integration.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  globalSetup: '<rootDir>/src/test/integration/setup.ts',
  globalTeardown: '<rootDir>/src/test/integration/teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/src/test/integration/jest.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run sequentially to avoid conflicts
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.ts',
    '!src/test/**',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Test Fixtures and Migrations

```typescript
// src/test/integration/fixtures/database.ts
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DatabaseFixtures {
  constructor(private client: Client) {}

  async runMigrations(): Promise<void> {
    const migrations = [
      '001_create_users_table.sql',
      '002_create_workflows_table.sql',
      '003_create_workflow_executions_table.sql',
      '004_create_state_transitions_table.sql',
    ];

    for (const migration of migrations) {
      const sql = readFileSync(
        join(__dirname, '../../../db/migrations', migration),
        'utf-8'
      );
      await this.client.query(sql);
    }
  }

  async seedData(): Promise<void> {
    // Insert test users
    await this.client.query(`
      INSERT INTO users (id, email, name, role, created_at, updated_at)
      VALUES
        (1, 'admin@example.com', 'Admin User', 'admin', NOW(), NOW()),
        (2, 'user@example.com', 'Regular User', 'user', NOW(), NOW()),
        (3, 'manager@example.com', 'Manager User', 'manager', NOW(), NOW())
    `);

    // Insert test workflows
    await this.client.query(`
      INSERT INTO workflows (id, name, description, user_id, definition, created_at, updated_at)
      VALUES
        (1, 'Approval Workflow', 'Standard approval process', 1, $1, NOW(), NOW()),
        (2, 'Onboarding Workflow', 'Employee onboarding', 1, $2, NOW(), NOW())
    `, [
      JSON.stringify({
        initial: 'pending',
        states: {
          pending: { on: { APPROVE: 'approved', REJECT: 'rejected' } },
          approved: { type: 'final' },
          rejected: { type: 'final' },
        },
      }),
      JSON.stringify({
        initial: 'created',
        states: {
          created: { on: { START: 'in_progress' } },
          in_progress: { on: { COMPLETE: 'completed' } },
          completed: { type: 'final' },
        },
      }),
    ]);
  }

  async cleanup(): Promise<void> {
    await this.client.query('DELETE FROM state_transitions');
    await this.client.query('DELETE FROM workflow_executions');
    await this.client.query('DELETE FROM workflows');
    await this.client.query('DELETE FROM users');
  }
}
```

## API Testing with Supertest

### REST API Testing

```typescript
// __tests__/integration/api/workflows.test.ts
import request from 'supertest';
import { app } from '@/app';
import { DatabaseFixtures } from '@/test/integration/fixtures/database';
import { Client } from 'pg';

describe('Workflows API', () => {
  let client: Client;
  let fixtures: DatabaseFixtures;
  let authToken: string;

  beforeAll(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    fixtures = new DatabaseFixtures(client);
    await fixtures.runMigrations();
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    await fixtures.seedData();

    // Get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    authToken = response.body.token;
  });

  afterEach(async () => {
    await fixtures.cleanup();
  });

  describe('POST /api/workflows', () => {
    it('should create new workflow with valid data', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test description',
        definition: {
          initial: 'draft',
          states: {
            draft: { on: { SUBMIT: 'review' } },
            review: { on: { APPROVE: 'published' } },
            published: { type: 'final' },
          },
        },
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: 'Test Workflow',
        description: 'Test description',
        userId: expect.any(Number),
        definition: workflowData.definition,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify in database
      const result = await client.query(
        'SELECT * FROM workflows WHERE id = $1',
        [response.body.id]
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test Workflow');
    });

    it('should return 400 for invalid workflow definition', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Workflow',
          definition: {
            initial: 'nonexistent',
            states: {
              draft: {},
            },
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid workflow definition',
        details: expect.arrayContaining([
          expect.stringContaining('Initial state "nonexistent" not found'),
        ]),
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/workflows')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should enforce rate limiting', async () => {
      const promises = Array.from({ length: 101 }, () =>
        request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Test' })
      );

      const results = await Promise.all(promises);
      const rateLimited = results.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/workflows', () => {
    it('should return paginated workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
          }),
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
      });
    });

    it('should filter workflows by search term', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'Approval' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Approval Workflow');
    });

    it('should sort workflows by created_at desc', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'created_at', order: 'desc' })
        .expect(200);

      const dates = response.body.data.map((w) => new Date(w.createdAt));
      const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('PUT /api/workflows/:id', () => {
    it('should update workflow', async () => {
      const response = await request(app)
        .put('/api/workflows/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Workflow',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Workflow');
      expect(response.body.description).toBe('Updated description');
    });

    it('should return 404 for non-existent workflow', async () => {
      await request(app)
        .put('/api/workflows/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 403 for unauthorized user', async () => {
      // Login as regular user
      const userResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      await request(app)
        .put('/api/workflows/1') // Workflow owned by admin
        .set('Authorization', `Bearer ${userResponse.body.token}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /api/workflows/:id', () => {
    it('should soft delete workflow', async () => {
      await request(app)
        .delete('/api/workflows/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify soft delete (deleted_at is set)
      const result = await client.query(
        'SELECT deleted_at FROM workflows WHERE id = $1',
        [1]
      );
      expect(result.rows[0].deleted_at).not.toBeNull();
    });
  });
});
```

### GraphQL API Testing

```typescript
// __tests__/integration/api/graphql.test.ts
import request from 'supertest';
import { app } from '@/app';

describe('GraphQL API', () => {
  let authToken: string;

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    authToken = response.body.token;
  });

  describe('workflows query', () => {
    it('should fetch workflows with nested data', async () => {
      const query = `
        query {
          workflows(limit: 10) {
            id
            name
            description
            user {
              id
              email
              name
            }
            executions {
              id
              status
              currentState
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.data.workflows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            user: expect.objectContaining({
              email: expect.any(String),
            }),
          }),
        ])
      );
    });

    it('should handle errors gracefully', async () => {
      const query = `
        query {
          workflow(id: "invalid") {
            id
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Workflow not found');
    });
  });

  describe('createWorkflow mutation', () => {
    it('should create workflow via mutation', async () => {
      const mutation = `
        mutation CreateWorkflow($input: CreateWorkflowInput!) {
          createWorkflow(input: $input) {
            id
            name
            definition
          }
        }
      `;

      const variables = {
        input: {
          name: 'GraphQL Workflow',
          description: 'Created via GraphQL',
          definition: {
            initial: 'start',
            states: {
              start: { on: { NEXT: 'end' } },
              end: { type: 'final' },
            },
          },
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data.createWorkflow).toMatchObject({
        id: expect.any(String),
        name: 'GraphQL Workflow',
      });
    });
  });
});
```

## Database Testing

### Transaction Testing

```typescript
// __tests__/integration/database/transactions.test.ts
import { Client } from 'pg';
import { WorkflowRepository } from '@/repositories/workflow.repository';
import { WorkflowExecutionRepository } from '@/repositories/workflow-execution.repository';

describe('Database Transactions', () => {
  let client: Client;
  let workflowRepo: WorkflowRepository;
  let executionRepo: WorkflowExecutionRepository;

  beforeAll(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  describe('Workflow Execution Transaction', () => {
    it('should rollback on error', async () => {
      const workflow = await workflowRepo.create({
        name: 'Test Workflow',
        definition: { initial: 'start', states: { start: {} } },
      });

      await client.query('BEGIN');

      try {
        // Create execution
        await executionRepo.create({
          workflowId: workflow.id,
          status: 'running',
        });

        // Simulate error
        throw new Error('Simulated error');
      } catch (error) {
        await client.query('ROLLBACK');
      }

      // Verify no execution was created
      const result = await client.query(
        'SELECT * FROM workflow_executions WHERE workflow_id = $1',
        [workflow.id]
      );
      expect(result.rows).toHaveLength(0);
    });

    it('should commit on success', async () => {
      const workflow = await workflowRepo.create({
        name: 'Test Workflow',
        definition: { initial: 'start', states: { start: {} } },
      });

      await client.query('BEGIN');

      const execution = await executionRepo.create({
        workflowId: workflow.id,
        status: 'running',
      });

      await executionRepo.addTransition({
        executionId: execution.id,
        fromState: 'start',
        toState: 'running',
        event: 'START',
      });

      await client.query('COMMIT');

      // Verify both records exist
      const execResult = await client.query(
        'SELECT * FROM workflow_executions WHERE id = $1',
        [execution.id]
      );
      const transResult = await client.query(
        'SELECT * FROM state_transitions WHERE execution_id = $1',
        [execution.id]
      );

      expect(execResult.rows).toHaveLength(1);
      expect(transResult.rows).toHaveLength(1);
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle optimistic locking', async () => {
      const workflow = await workflowRepo.create({
        name: 'Test Workflow',
        version: 1,
      });

      // Simulate two concurrent updates
      const update1 = workflowRepo.update(workflow.id, {
        name: 'Update 1',
        version: 1, // Expects version 1
      });

      const update2 = workflowRepo.update(workflow.id, {
        name: 'Update 2',
        version: 1, // Also expects version 1
      });

      const results = await Promise.allSettled([update1, update2]);

      // One should succeed, one should fail
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });
  });
});
```

### Query Performance Testing

```typescript
// __tests__/integration/database/performance.test.ts
describe('Database Query Performance', () => {
  it('should fetch workflows efficiently with pagination', async () => {
    // Seed 1000 workflows
    await seedWorkflows(1000);

    const start = performance.now();

    const result = await client.query(`
      SELECT * FROM workflows
      ORDER BY created_at DESC
      LIMIT 20 OFFSET 0
    `);

    const duration = performance.now() - start;

    expect(result.rows).toHaveLength(20);
    expect(duration).toBeLessThan(50); // Should complete in <50ms
  });

  it('should use index for workflow search', async () => {
    const explainResult = await client.query(`
      EXPLAIN (FORMAT JSON)
      SELECT * FROM workflows
      WHERE name ILIKE '%approval%'
    `);

    const plan = explainResult.rows[0]['QUERY PLAN'][0];
    expect(plan.Plan['Node Type']).toBe('Index Scan');
  });

  it('should optimize join queries', async () => {
    const start = performance.now();

    await client.query(`
      SELECT w.*, u.email, COUNT(e.id) as execution_count
      FROM workflows w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN workflow_executions e ON w.id = e.workflow_id
      GROUP BY w.id, u.email
      LIMIT 20
    `);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

## Message Queue Testing

### RabbitMQ Integration

```typescript
// __tests__/integration/messaging/rabbitmq.test.ts
import amqp from 'amqplib';
import { WorkflowEventPublisher } from '@/messaging/workflow-event.publisher';
import { WorkflowEventConsumer } from '@/messaging/workflow-event.consumer';

describe('RabbitMQ Integration', () => {
  let connection: amqp.Connection;
  let channel: amqp.Channel;
  let publisher: WorkflowEventPublisher;
  let consumer: WorkflowEventConsumer;

  beforeAll(async () => {
    connection = await amqp.connect(process.env.RABBITMQ_URL!);
    channel = await connection.createChannel();
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
  });

  beforeEach(async () => {
    publisher = new WorkflowEventPublisher(channel);
    consumer = new WorkflowEventConsumer(channel);

    // Declare test queue
    await channel.assertQueue('test-workflow-events', { durable: false });
  });

  afterEach(async () => {
    await channel.deleteQueue('test-workflow-events');
  });

  describe('Event Publishing', () => {
    it('should publish workflow event to queue', async () => {
      const event = {
        type: 'workflow.created',
        workflowId: 1,
        timestamp: new Date(),
        data: { name: 'Test Workflow' },
      };

      await publisher.publish('test-workflow-events', event);

      // Consume message
      const message = await new Promise<any>((resolve) => {
        channel.consume('test-workflow-events', (msg) => {
          if (msg) {
            resolve(JSON.parse(msg.content.toString()));
            channel.ack(msg);
          }
        });
      });

      expect(message).toMatchObject(event);
    });

    it('should handle message acknowledgment', async () => {
      let messageProcessed = false;

      await publisher.publish('test-workflow-events', { test: 'data' });

      await consumer.consume('test-workflow-events', async (msg) => {
        messageProcessed = true;
        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(messageProcessed).toBe(true);
    });

    it('should retry failed messages', async () => {
      let attemptCount = 0;

      await publisher.publish('test-workflow-events', { test: 'data' });

      await consumer.consume(
        'test-workflow-events',
        async (msg) => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Simulated failure');
          }
        },
        { maxRetries: 3 }
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(attemptCount).toBe(3);
    });

    it('should move to dead letter queue after max retries', async () => {
      // Setup DLQ
      await channel.assertQueue('test-workflow-events.dlq');
      await channel.bindQueue(
        'test-workflow-events.dlq',
        'dlx',
        'test-workflow-events'
      );

      await publisher.publish('test-workflow-events', { test: 'data' });

      await consumer.consume(
        'test-workflow-events',
        async () => {
          throw new Error('Always fails');
        },
        { maxRetries: 3 }
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check DLQ
      const dlqMessage = await channel.get('test-workflow-events.dlq', {
        noAck: true,
      });
      expect(dlqMessage).not.toBe(false);
    });
  });
});
```

## External Service Integration Testing

### Mock Server with MSW

```typescript
// __tests__/integration/external/webhook.test.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { WebhookService } from '@/services/webhook.service';

const server = setupServer();

describe('Webhook Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('Webhook Delivery', () => {
    it('should deliver webhook to external endpoint', async () => {
      let receivedPayload: any;

      server.use(
        rest.post('https://example.com/webhook', async (req, res, ctx) => {
          receivedPayload = await req.json();
          return res(ctx.status(200), ctx.json({ success: true }));
        })
      );

      const webhookService = new WebhookService();
      const result = await webhookService.deliver({
        url: 'https://example.com/webhook',
        event: 'workflow.completed',
        payload: { workflowId: 1, status: 'completed' },
      });

      expect(result.success).toBe(true);
      expect(receivedPayload).toMatchObject({
        workflowId: 1,
        status: 'completed',
      });
    });

    it('should retry on failure', async () => {
      let attemptCount = 0;

      server.use(
        rest.post('https://example.com/webhook', (req, res, ctx) => {
          attemptCount++;
          if (attemptCount < 3) {
            return res(ctx.status(500));
          }
          return res(ctx.status(200), ctx.json({ success: true }));
        })
      );

      const webhookService = new WebhookService();
      const result = await webhookService.deliver(
        {
          url: 'https://example.com/webhook',
          event: 'test',
          payload: {},
        },
        { maxRetries: 3 }
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should handle timeout', async () => {
      server.use(
        rest.post('https://example.com/webhook', async (req, res, ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 6000));
          return res(ctx.status(200));
        })
      );

      const webhookService = new WebhookService();

      await expect(
        webhookService.deliver(
          {
            url: 'https://example.com/webhook',
            event: 'test',
            payload: {},
          },
          { timeout: 5000 }
        )
      ).rejects.toThrow('Webhook delivery timeout');
    });
  });
});
```

## Authentication & Authorization Testing

```typescript
// __tests__/integration/auth/authorization.test.ts
import request from 'supertest';
import { app } from '@/app';

describe('Authorization', () => {
  let adminToken: string;
  let userToken: string;
  let managerToken: string;

  beforeEach(async () => {
    // Get tokens for different roles
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminRes.body.token;

    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });
    userToken = userRes.body.token;

    const managerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@example.com', password: 'password123' });
    managerToken = managerRes.body.token;
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin endpoints', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny regular user from admin endpoints', async () => {
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow manager to approve workflows', async () => {
      await request(app)
        .post('/api/workflows/1/approve')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('should deny regular user from approving workflows', async () => {
      await request(app)
        .post('/api/workflows/1/approve')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Resource Ownership', () => {
    it('should allow user to edit own workflow', async () => {
      // Create workflow as user
      const createRes = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'My Workflow' });

      const workflowId = createRes.body.id;

      // Edit own workflow
      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);
    });

    it('should deny user from editing others workflow', async () => {
      // Workflow owned by admin
      await request(app)
        .put('/api/workflows/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });
});
```

## Running Integration Tests

### NPM Scripts

```json
{
  "scripts": {
    "test:integration": "jest --config jest.integration.config.js",
    "test:integration:watch": "jest --config jest.integration.config.js --watch",
    "test:integration:coverage": "jest --config jest.integration.config.js --coverage",
    "test:integration:ci": "jest --config jest.integration.config.js --ci --maxWorkers=2"
  }
}
```

### CI Configuration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration:ci
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          flags: integration
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Realistic Data**: Use production-like test data
4. **Performance**: Keep tests reasonably fast (<1s each)
5. **Error Cases**: Test both happy and error paths
6. **Idempotency**: Tests should produce same results when run multiple times
7. **Transactions**: Use database transactions for rollback
8. **Mocking**: Mock only truly external services

## Summary

Integration tests validate:
- API contracts and behavior
- Database operations and integrity
- Message queue processing
- External service interactions
- Authentication and authorization
- Multi-component workflows

Target: 80%+ coverage of critical integration paths with execution time <8 minutes.
