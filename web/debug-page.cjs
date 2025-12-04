const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  await page.goto('https://135.181.96.93/login');
  await page.waitForTimeout(2000);
  
  // Get all buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons:', JSON.stringify(buttons));
  
  await browser.close();
})().catch(console.error);
