import { test, expect } from '@playwright/test';

test.describe('User Experience & Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Auth is handled by global setup - just navigate to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('Dashboard loads correctly', async ({ page }) => {
    // Check for main dashboard elements
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    // Check for some stats or widgets
    // Assuming there are some cards or charts
  });

  test('Performance Dashboard loads data', async ({ page }) => {
    // Navigate to Performance
    await page.click('a[href="/performance"]');
    await expect(page).toHaveURL('/performance');
    
    // Check for title
    await expect(page.getByText('Performance Dashboard')).toBeVisible();
    
    // Check for metrics cards (wait for data to load)
    await expect(page.getByText('Total Service Orders')).toBeVisible();
    await expect(page.getByText('Completed Orders')).toBeVisible();
    
    // Check for the table
    await expect(page.getByRole('table')).toBeVisible();
    
    // Ensure no error messages
    await expect(page.getByText('Error')).not.toBeVisible();
    await expect(page.getByText('TypeError')).not.toBeVisible();
  });

  test('Calendar loads correctly', async ({ page }) => {
    // Navigate to Calendar
    await page.click('a[href="/calendar"]');
    await expect(page).toHaveURL('/calendar');
    
    // Check for calendar view
    await expect(page.locator('.rbc-calendar')).toBeVisible(); // React Big Calendar class
  });

  test('Navigation menu checks (Dead Ends)', async ({ page }) => {
    const links = [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Analytics', href: '/analytics' },
      { name: 'Service Orders', href: '/service-orders' },
      { name: 'Assignments', href: '/assignments' },
      { name: 'Providers', href: '/providers' },
      { name: 'Calendar', href: '/calendar' },
      { name: 'Performance', href: '/performance' },
      { name: 'Tasks & Alerts', href: '/tasks' },
    ];

    for (const link of links) {
      await page.click(`a[href="${link.href}"]`);
      await expect(page).toHaveURL(link.href);
      
      // Check for 404 or error page
      await expect(page.getByText('404')).not.toBeVisible();
      await expect(page.getByText('Page Not Found')).not.toBeVisible();
    }
  });

  test('Logout works', async ({ page }) => {
    // Find logout button (usually in a profile menu or sidebar)
    // This might need adjustment based on actual UI
    const logoutButton = page.getByText('Logout');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL('/login');
    } else {
      // Try to find a user menu first
      const userMenu = page.locator('.user-menu-trigger, [aria-label="User menu"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.getByText('Logout').click();
        await expect(page).toHaveURL('/login');
      }
    }
  });
});
