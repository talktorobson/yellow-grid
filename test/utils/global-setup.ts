import { DatabaseTestSetup } from './database-test-setup';

/**
 * Global test setup - runs once before all tests
 * Starts Testcontainers for PostgreSQL and Redis
 */
export default async function globalSetup() {
  console.log('\n🚀 Starting global test setup...\n');

  try {
    // Start containers
    await DatabaseTestSetup.startContainers();

    console.log('\n✅ Global test setup complete\n');
  } catch (error) {
    console.error('\n❌ Global test setup failed:', error);
    throw error;
  }
}
