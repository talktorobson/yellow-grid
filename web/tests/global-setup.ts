/**
 * Playwright Global Auth Setup
 * Authenticates once and stores session for all tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, '../.auth/user.json');

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  console.log(`🔐 Setting up authentication for ${baseURL}...`);

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    
    // Wait for React to render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take debug screenshot
    await page.screenshot({ path: 'auth-step-1-login-page.png' });

    // Click "Use Email & Password" button to show dev login form
    const devLoginBtn = page.getByText('Use Email & Password');
    await devLoginBtn.waitFor({ state: 'visible', timeout: 15000 });
    await devLoginBtn.click();

    // Wait for form to appear
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    // Take debug screenshot
    await page.screenshot({ path: 'auth-step-2-form-visible.png' });

    // Fill in credentials
    await page.fill('input[type="email"]', 'operator.fr@store.test');
    await page.fill('input[type="password"]', 'Admin123!');

    // Take debug screenshot
    await page.screenshot({ path: 'auth-step-3-filled.png' });

    // Submit form
    await page.click('button[type="submit"]');

    // Wait a bit for the form to process
    await page.waitForTimeout(3000);
    
    // Take debug screenshot
    await page.screenshot({ path: 'auth-step-4-after-submit.png' });
    
    // Check current URL
    console.log('Current URL after submit:', page.url());

    // Wait for redirect to dashboard or operator route
    await page.waitForURL('**/operator/**', { timeout: 15000 });

    console.log('✅ Authentication successful');

    // Save storage state (cookies, localStorage)
    await context.storageState({ path: authFile });

    console.log(`💾 Auth state saved to ${authFile}`);
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    // Take screenshot for debugging
    await page.screenshot({ path: 'auth-failure.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
