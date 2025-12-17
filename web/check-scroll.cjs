const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  console.log('Navigating to login...');
  await page.goto('https://135.181.96.93/login');
  
  // Wait for React to render
  await page.waitForSelector('input', { timeout: 15000 });
  console.log('Login form loaded');
  
  // Fill form
  await page.locator('input').first().fill('operator.fr@store.test');
  await page.locator('input[type="password"]').fill('Admin123!');
  
  // Screenshot before submit
  await page.screenshot({ path: 'before-login.png' });
  
  await page.locator('button[type="submit"]').click();
  console.log('Clicked submit');
  
  // Wait for navigation
  await page.waitForURL('**/operator/**', { timeout: 15000 });
  console.log('Logged in, redirected');
  
  // Navigate to calendar
  await page.goto('https://135.181.96.93/operator/calendar');
  await page.waitForSelector('.rbc-calendar, [class*="calendar"]', { timeout: 15000 });
  console.log('Calendar page loaded');
  
  // Wait a bit for data to load
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'calendar-check.png', fullPage: false });
  console.log('Screenshot saved to calendar-check.png');
  
  const scrollInfo = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return {
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      windowInnerHeight: window.innerHeight,
      hasVerticalScroll: html.scrollHeight > html.clientHeight,
      scrollDiff: html.scrollHeight - html.clientHeight
    };
  });
  
  console.log('Scroll info:', JSON.stringify(scrollInfo, null, 2));
  
  if (scrollInfo.hasVerticalScroll) {
    console.log('Page NEEDS vertical scrolling (' + scrollInfo.scrollDiff + 'px overflow)');
  } else {
    console.log('Page fits viewport - no vertical scrolling needed');
  }
  
  await browser.close();
})();
