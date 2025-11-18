import { DatabaseTestSetup } from './database-test-setup';

/**
 * Global test teardown - runs once after all tests
 * Stops and cleans up Testcontainers
 */
export default async function globalTeardown() {
  console.log('\n🧹 Starting global test teardown...\n');

  try {
    // Stop containers
    await DatabaseTestSetup.stopContainers();

    console.log('\n✅ Global test teardown complete\n');
  } catch (error) {
    console.error('\n❌ Global test teardown failed:', error);
    // Don't throw - allow tests to complete
  }
}
