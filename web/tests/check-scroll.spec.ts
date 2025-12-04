import { test, expect } from '@playwright/test';

test('calendar should fit viewport without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  await page.goto('/operator/calendar');
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
  
  // Check no vertical scroll needed
  expect(scrollInfo.hasVerticalScroll).toBe(false);
});
