import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Test Database Manager using Testcontainers
 * Provides isolated PostgreSQL and Redis instances for integration tests
 */
export class DatabaseTestSetup {
  private static postgresContainer: StartedPostgreSqlContainer;
  private static redisContainer: StartedRedisContainer;
  private static prismaClient: PrismaClient;

  /**
   * Start PostgreSQL and Redis containers
   * Call this once in global test setup
   */
  static async startContainers(): Promise<void> {
    // Start PostgreSQL container
    this.postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('yellow_grid_test')
      .withUsername('testuser')
      .withPassword('testpass')
      .withExposedPorts(5432)
      .start();

    // Start Redis container
    this.redisContainer = await new RedisContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    // Set environment variables for tests
    process.env.DATABASE_URL = this.postgresContainer.getConnectionUri();
    process.env.REDIS_HOST = this.redisContainer.getHost();
    process.env.REDIS_PORT = this.redisContainer.getMappedPort(6379).toString();

    console.log('✅ Test containers started');
    console.log(`📦 PostgreSQL: ${process.env.DATABASE_URL}`);
    console.log(`📦 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

    // Initialize Prisma client
    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Run migrations
    await this.runMigrations();
  }

  /**
   * Run Prisma migrations on the test database
   */
  private static async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      await execAsync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: this.postgresContainer.getConnectionUri(),
        },
      });
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Stop containers and cleanup
   * Call this once in global test teardown
   */
  static async stopContainers(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
    }

    if (this.postgresContainer) {
      await this.postgresContainer.stop();
      console.log('🛑 PostgreSQL container stopped');
    }

    if (this.redisContainer) {
      await this.redisContainer.stop();
      console.log('🛑 Redis container stopped');
    }
  }

  /**
   * Get Prisma client for tests
   */
  static getPrismaClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call startContainers() first.');
    }
    return this.prismaClient;
  }

  /**
   * Clean all database tables (useful between tests)
   */
  static async cleanDatabase(): Promise<void> {
    const prisma = this.getPrismaClient();

    // Delete in correct order to respect foreign key constraints
    const tables = [
      'Assignment',
      'ServiceOrder',
      'Project',
      'TechnicalVisit',
      'Task',
      'Contract',
      'Media',
      'Notification',
      'NotificationPreference',
      'WorkTeam',
      'Technician',
      'Provider',
      'User',
      'Role',
      'Permission',
      'ServiceCatalogItem',
      'CalendarConfiguration',
      'Holiday',
      'BufferRule',
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      } catch (error) {
        // Table might not exist, ignore
      }
    }
  }

  /**
   * Reset the database to a clean state
   * Useful for test isolation
   */
  static async resetDatabase(): Promise<void> {
    await this.cleanDatabase();
  }
}
