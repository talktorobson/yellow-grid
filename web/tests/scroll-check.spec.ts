import { test, expect } from '@playwright/test';

// Skip global setup for this test, authenticate directly
test.use({ storageState: { cookies: [], origins: [] } });

test('calendar should fit viewport without scrolling', async ({ page }) => {
  // Get auth token directly via API
  const loginResponse = await page.request.post('https://135.181.96.93/api/v1/auth/login', {
    data: {
      email: 'operator.fr@store.test',
      password: 'Admin123!'
    },
    ignoreHTTPSErrors: true
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.data?.accessToken;
  
  if (!token) {
    console.log('Login response:', loginData);
    throw new Error('Failed to get auth token');
  }
  
  // Set the token in localStorage before navigating
  await page.goto('https://135.181.96.93/login');
  await page.evaluate((t) => {
    localStorage.setItem('accessToken', t);
  }, token);
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // Navigate to calendar
  await page.goto('https://135.181.96.93/operator/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'calendar-check.png', fullPage: false });
  
  const scrollInfo = await page.evaluate(() => {
    const html = document.documentElement;
    return {
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      hasVerticalScroll: html.scrollHeight > html.clientHeight,
      scrollDiff: html.scrollHeight - html.clientHeight
    };
  });
  
  console.log('Scroll info:', JSON.stringify(scrollInfo, null, 2));
  
  if (scrollInfo.hasVerticalScroll) {
    console.log(`❌ Page NEEDS vertical scrolling (${scrollInfo.scrollDiff}px overflow)`);
  } else {
    console.log('✅ Page fits viewport - no vertical scrolling needed');
  }
  
  // Check no vertical scroll needed
  expect(scrollInfo.hasVerticalScroll).toBe(false);
});
