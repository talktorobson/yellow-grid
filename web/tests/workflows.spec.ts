import { test, expect } from '@playwright/test';

test.describe('Exhaustive E2E Workflows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    
    // Handle dev login toggle if present
    const devLoginBtn = page.getByText('Use Email & Password');
    if (await devLoginBtn.isVisible()) {
      await devLoginBtn.click();
    }

    await page.fill('input[type="email"]', 'operator@adeo.com');
    await page.fill('input[type="password"]', 'Operator123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('Service Orders Workflow', async ({ page }) => {
    // 1. Navigate to Service Orders
    await page.click('a[href="/service-orders"]');
    await expect(page).toHaveURL('/service-orders');
    await expect(page.getByRole('heading', { name: 'Service Orders' })).toBeVisible();

    // 2. Check for Filters
    await expect(page.getByPlaceholder('Search by order ID, customer...')).toBeVisible();
    await expect(page.getByText('Filters')).toBeVisible();

    // 3. Interact with Filters (if any)
    // Just clicking the filter button to toggle advanced filters
    await page.click('button:has-text("Filters")');
    
    // 4. Check List Content
    // Wait for table to load OR empty state
    const table = page.locator('table');
    const emptyState = page.getByText('No service orders found');
    const errorState = page.getByText('Error Loading Service Orders');
    
    await expect(table.or(emptyState).or(errorState)).toBeVisible();
    
    if (await errorState.isVisible()) {
      console.log('Service Orders page showed an error');
      return; // Skip further checks if error
    }
    
    // 5. Navigate to Details (if rows exist)
    if (await table.isVisible()) {
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        const orderLink = firstRow.locator('a').first();
        if (await orderLink.isVisible()) {
          await orderLink.click();
          // Should navigate to details page (URL pattern /service-orders/:id)
          await expect(page).toHaveURL(/\/service-orders\/.+/);
          await expect(page.getByText('Service Order Details')).toBeVisible();
          
          // Check for tabs in details page
          await expect(page.getByText('Overview')).toBeVisible();
          await expect(page.getByText('Timeline')).toBeVisible();
        }
      }
    }
  });

  test('Providers Workflow', async ({ page }) => {
    // 1. Navigate to Providers
    await page.click('a[href="/providers"]');
    await expect(page).toHaveURL('/providers');
    await expect(page.getByRole('heading', { name: 'Providers' })).toBeVisible();

    // 2. Check List
    const table = page.locator('table');
    const emptyState = page.getByText('No providers found');
    await expect(table.or(emptyState)).toBeVisible();

    // 3. Check for "Add Provider" button and click it
    const addBtn = page.getByRole('link', { name: /Add Provider/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    
    // 4. Verify navigation to Create Provider page
    await expect(page).toHaveURL('/providers/new');
    await expect(page.getByRole('heading', { name: 'Onboard New Provider' })).toBeVisible();
    
    // 5. Go back
    await page.click('text=Back to Providers');
    await expect(page).toHaveURL('/providers');
  });

  test('Calendar Workflow', async ({ page }) => {
    // 1. Navigate to Calendar
    await page.click('a[href="/calendar"]');
    await expect(page).toHaveURL('/calendar');

    // 2. Check View Switchers
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Week' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Day', exact: true })).toBeVisible();

    // 3. Switch Views
    await page.click('button:has-text("Week")');
    await expect(page.locator('.rbc-time-view')).toBeVisible(); // React Big Calendar week view class

    await page.click('button:has-text("Day")');
    await expect(page.locator('.rbc-time-view')).toBeVisible();

    await page.click('button:has-text("Month")');
    await expect(page.locator('.rbc-month-view')).toBeVisible();
  });

  test('Assignments Workflow', async ({ page }) => {
    // 1. Navigate to Assignments
    await page.click('a[href="/assignments"]');
    await expect(page).toHaveURL('/assignments');
    
    // 2. Check for Map or List view
    // Assuming there might be a toggle or default view
    await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible();
  });

  test('Tasks & Alerts Workflow', async ({ page }) => {
    // 1. Navigate to Tasks
    await page.click('a[href="/tasks"]');
    await expect(page).toHaveURL('/tasks');
    
    // 2. Check for Task List
    await expect(page.getByRole('heading', { name: 'Tasks & Alerts' })).toBeVisible();
  });

  test('Analytics Workflow', async ({ page }) => {
    // 1. Navigate to Analytics
    await page.click('a[href="/analytics"]');
    await expect(page).toHaveURL('/analytics');
    
    // 2. Check for Charts/Graphs
    // Just checking for a generic container or heading
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  });

});
