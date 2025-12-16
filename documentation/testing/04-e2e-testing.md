# End-to-End Testing Standards

## Overview

End-to-end (E2E) tests validate complete user journeys and critical workflows from the user's perspective. This document establishes standards for E2E testing using Playwright, covering user interactions, multi-page flows, and cross-browser compatibility.

## Framework: Playwright

### Why Playwright?

- **Modern & Fast**: Built for modern web applications
- **Cross-Browser**: Chromium, Firefox, WebKit support
- **Auto-Wait**: Smart waiting for elements
- **Parallel Execution**: Fast test execution
- **Rich API**: Powerful selectors and assertions
- **Debug Tools**: Time-travel debugging, screenshots, videos

### Installation & Setup

```bash
npm install -D @playwright/test
npx playwright install
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## Test Structure & Organization

### Directory Structure

```
tests/e2e/
├── fixtures/
│   ├── auth.fixture.ts
│   ├── data.fixture.ts
│   └── test-helpers.ts
├── pages/
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── workflow-builder.page.ts
│   └── workflow-execution.page.ts
├── specs/
│   ├── authentication.spec.ts
│   ├── workflow-creation.spec.ts
│   ├── workflow-execution.spec.ts
│   ├── collaboration.spec.ts
│   └── integration.spec.ts
└── utils/
    ├── test-data.ts
    └── helpers.ts
```

## Page Object Model (POM)

### Base Page

```typescript
// tests/e2e/pages/base.page.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }

  async fillInput(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  async selectOption(label: string, value: string) {
    await this.page.getByLabel(label).selectOption(value);
  }
}
```

### Login Page

```typescript
// tests/e2e/pages/login.page.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: /log in/i });
    this.errorMessage = page.getByTestId('error-message');
    this.forgotPasswordLink = page.getByRole('link', {
      name: /forgot password/i,
    });
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.emailInput).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL('/dashboard');
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
```

### Dashboard Page

```typescript
// tests/e2e/pages/dashboard.page.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly createWorkflowButton: Locator;
  readonly workflowsList: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.createWorkflowButton = page.getByRole('button', {
      name: /create workflow/i,
    });
    this.workflowsList = page.getByTestId('workflows-list');
    this.searchInput = page.getByPlaceholder(/search workflows/i);
    this.filterDropdown = page.getByLabel('Filter by status');
    this.userMenu = page.getByTestId('user-menu');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await expect(this.welcomeMessage).toBeVisible();
  }

  async createWorkflow() {
    await this.createWorkflowButton.click();
    await this.page.waitForURL('/workflows/new');
  }

  async searchWorkflows(term: string) {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterByStatus(status: string) {
    await this.filterDropdown.selectOption(status);
  }

  async getWorkflowByName(name: string): Promise<Locator> {
    return this.workflowsList.getByText(name);
  }

  async openWorkflow(name: string) {
    const workflow = await this.getWorkflowByName(name);
    await workflow.click();
  }

  async expectWorkflowCount(count: number) {
    const workflows = this.workflowsList.locator('[data-testid="workflow-item"]');
    await expect(workflows).toHaveCount(count);
  }
}
```

### Workflow Builder Page

```typescript
// tests/e2e/pages/workflow-builder.page.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class WorkflowBuilderPage extends BasePage {
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly addStateButton: Locator;
  readonly addTransitionButton: Locator;
  readonly saveButton: Locator;
  readonly publishButton: Locator;
  readonly canvas: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByLabel('Workflow Name');
    this.descriptionInput = page.getByLabel('Description');
    this.addStateButton = page.getByRole('button', { name: /add state/i });
    this.addTransitionButton = page.getByRole('button', {
      name: /add transition/i,
    });
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.publishButton = page.getByRole('button', { name: /publish/i });
    this.canvas = page.getByTestId('workflow-canvas');
  }

  async goto() {
    await this.page.goto('/workflows/new');
    await expect(this.nameInput).toBeVisible();
  }

  async fillBasicInfo(name: string, description: string) {
    await this.nameInput.fill(name);
    await this.descriptionInput.fill(description);
  }

  async addState(stateName: string, type: 'normal' | 'initial' | 'final' = 'normal') {
    await this.addStateButton.click();

    const dialog = this.page.getByRole('dialog');
    await dialog.getByLabel('State Name').fill(stateName);
    await dialog.getByLabel('State Type').selectOption(type);
    await dialog.getByRole('button', { name: /add/i }).click();

    await expect(this.canvas.getByText(stateName)).toBeVisible();
  }

  async addTransition(from: string, to: string, event: string) {
    await this.addTransitionButton.click();

    const dialog = this.page.getByRole('dialog');
    await dialog.getByLabel('From State').selectOption(from);
    await dialog.getByLabel('To State').selectOption(to);
    await dialog.getByLabel('Event Name').fill(event);
    await dialog.getByRole('button', { name: /add/i }).click();
  }

  async addGuard(transition: string, guardExpression: string) {
    await this.canvas.getByTestId(`transition-${transition}`).click();

    const panel = this.page.getByTestId('transition-properties');
    await panel.getByRole('button', { name: /add guard/i }).click();
    await panel.getByLabel('Guard Expression').fill(guardExpression);
    await panel.getByRole('button', { name: /save/i }).click();
  }

  async addAction(state: string, actionType: 'entry' | 'exit', code: string) {
    await this.canvas.getByTestId(`state-${state}`).click();

    const panel = this.page.getByTestId('state-properties');
    await panel.getByRole('button', { name: `Add ${actionType} action` }).click();
    await panel.getByLabel('Action Code').fill(code);
    await panel.getByRole('button', { name: /save/i }).click();
  }

  async save() {
    await this.saveButton.click();
    await expect(this.page.getByText(/saved successfully/i)).toBeVisible();
  }

  async publish() {
    await this.publishButton.click();

    // Confirm dialog
    const dialog = this.page.getByRole('dialog');
    await dialog.getByRole('button', { name: /confirm/i }).click();

    await expect(this.page.getByText(/published successfully/i)).toBeVisible();
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
```

## Test Fixtures

### Authentication Fixture

```typescript
// tests/e2e/fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

type AuthFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  authenticatedPage: async ({ page }, use) => {
    // Automatically login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(
      'test@example.com',
      'password123'
    );

    await use(page);

    // Optional: logout after test
    // await page.getByTestId('user-menu').click();
    // await page.getByRole('menuitem', { name: /logout/i }).click();
  },
});

export { expect };
```

### Test Data Fixture

```typescript
// tests/e2e/fixtures/data.fixture.ts
import { test as base } from '@playwright/test';
import { Client } from 'pg';

type DataFixtures = {
  testData: {
    users: any[];
    workflows: any[];
  };
  cleanupData: () => Promise<void>;
};

export const test = base.extend<DataFixtures>({
  testData: async ({}, use) => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // Seed test data
    const users = await seedUsers(client);
    const workflows = await seedWorkflows(client, users);

    await use({ users, workflows });

    await client.end();
  },

  cleanupData: async ({}, use) => {
    const cleanup = async () => {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query('DELETE FROM workflows WHERE name LIKE %test%');
      await client.end();
    };

    await use(cleanup);

    // Cleanup after test
    await cleanup();
  },
});

async function seedUsers(client: Client) {
  const result = await client.query(`
    INSERT INTO users (email, name, role, password_hash)
    VALUES
      ('test@example.com', 'Test User', 'user', 'hashed'),
      ('admin@example.com', 'Admin User', 'admin', 'hashed')
    RETURNING *
  `);
  return result.rows;
}

async function seedWorkflows(client: Client, users: any[]) {
  const result = await client.query(`
    INSERT INTO workflows (name, description, user_id, definition)
    VALUES
      ('Test Workflow', 'For testing', $1, $2)
    RETURNING *
  `, [users[0].id, JSON.stringify({ initial: 'start', states: { start: {} } })]);
  return result.rows;
}
```

## Critical User Journeys

### 1. User Authentication

```typescript
// tests/e2e/specs/authentication.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('User Authentication', () => {
  test('should login with valid credentials', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('test@example.com', 'wrongpassword');

    await loginPage.expectErrorMessage('Invalid email or password');
    await expect(loginPage.page).toHaveURL('/login');
  });

  test('should navigate to forgot password', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.clickForgotPassword();

    await expect(page).toHaveURL('/forgot-password');
  });

  test('should logout successfully', async ({ authenticatedPage }) => {
    await authenticatedPage.getByTestId('user-menu').click();
    await authenticatedPage.getByRole('menuitem', { name: /logout/i }).click();

    await expect(authenticatedPage).toHaveURL('/login');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should remember user session', async ({ loginPage, page, context }) => {
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard('test@example.com', 'password123');

    // Close and reopen page
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');

    // Should still be logged in
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.getByText(/welcome/i)).toBeVisible();
  });
});
```

### 2. Workflow Creation

```typescript
// tests/e2e/specs/workflow-creation.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { WorkflowBuilderPage } from '../pages/workflow-builder.page';

test.describe('Workflow Creation', () => {
  test.use({ authenticatedPage: async ({ authenticatedPage }, use) => use(authenticatedPage) });

  test('should create simple workflow', async ({ page }) => {
    const builder = new WorkflowBuilderPage(page);

    await builder.goto();
    await builder.fillBasicInfo('Simple Approval', 'Basic approval process');

    // Add states
    await builder.addState('pending', 'initial');
    await builder.addState('approved', 'final');
    await builder.addState('rejected', 'final');

    // Add transitions
    await builder.addTransition('pending', 'approved', 'APPROVE');
    await builder.addTransition('pending', 'rejected', 'REJECT');

    // Save
    await builder.save();

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Simple Approval')).toBeVisible();
  });

  test('should create workflow with guards', async ({ page }) => {
    const builder = new WorkflowBuilderPage(page);

    await builder.goto();
    await builder.fillBasicInfo('Conditional Flow', 'Flow with conditions');

    await builder.addState('start', 'initial');
    await builder.addState('approved', 'final');

    await builder.addTransition('start', 'approved', 'APPROVE');
    await builder.addGuard('start-approved', 'context.amount < 1000');

    await builder.save();

    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  });

  test('should create workflow with actions', async ({ page }) => {
    const builder = new WorkflowBuilderPage(page);

    await builder.goto();
    await builder.fillBasicInfo('Action Flow', 'Flow with actions');

    await builder.addState('processing', 'initial');
    await builder.addState('completed', 'final');

    await builder.addAction('processing', 'entry', 'console.log("Processing started")');
    await builder.addAction('processing', 'exit', 'console.log("Processing completed")');

    await builder.save();

    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  });

  test('should validate workflow before saving', async ({ page }) => {
    const builder = new WorkflowBuilderPage(page);

    await builder.goto();
    await builder.fillBasicInfo('', ''); // Empty name

    await builder.save();

    await builder.expectValidationError('Workflow name is required');
  });

  test('should publish workflow', async ({ page }) => {
    const builder = new WorkflowBuilderPage(page);

    await builder.goto();
    await builder.fillBasicInfo('Publishable Flow', 'Ready to publish');
    await builder.addState('start', 'initial');
    await builder.addState('end', 'final');
    await builder.addTransition('start', 'end', 'COMPLETE');

    await builder.save();
    await builder.publish();

    await expect(page.getByText(/published successfully/i)).toBeVisible();
  });
});
```

### 3. Workflow Execution

```typescript
// tests/e2e/specs/workflow-execution.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Workflow Execution', () => {
  test.use({ authenticatedPage: async ({ authenticatedPage }, use) => use(authenticatedPage) });

  test('should execute workflow successfully', async ({ page }) => {
    // Navigate to workflow
    await page.goto('/workflows/1');
    await page.getByRole('button', { name: /execute/i }).click();

    // Fill execution context
    await page.getByLabel('User').fill('John Doe');
    await page.getByLabel('Amount').fill('500');
    await page.getByRole('button', { name: /start execution/i }).click();

    // Verify execution started
    await expect(page.getByText(/execution started/i)).toBeVisible();
    await expect(page.getByTestId('current-state')).toHaveText('pending');
  });

  test('should transition between states', async ({ page }) => {
    await page.goto('/executions/1');

    // Current state should be pending
    await expect(page.getByTestId('current-state')).toHaveText('pending');

    // Approve
    await page.getByRole('button', { name: /approve/i }).click();

    // Wait for transition
    await expect(page.getByTestId('current-state')).toHaveText('approved');
    await expect(page.getByText(/execution completed/i)).toBeVisible();
  });

  test('should show execution history', async ({ page }) => {
    await page.goto('/executions/1');

    const history = page.getByTestId('execution-history');
    await expect(history).toBeVisible();

    // Verify transitions
    const transitions = history.locator('[data-testid="transition-item"]');
    await expect(transitions).toHaveCount(2); // Initial -> Pending -> Approved

    await expect(transitions.nth(0)).toContainText('initial → pending');
    await expect(transitions.nth(1)).toContainText('pending → approved');
  });

  test('should handle guard failures', async ({ page }) => {
    await page.goto('/executions/2'); // Execution with guard

    // Try transition with failing guard
    await page.getByRole('button', { name: /approve/i }).click();

    // Should show error
    await expect(page.getByText(/guard condition failed/i)).toBeVisible();

    // State should not change
    await expect(page.getByTestId('current-state')).toHaveText('pending');
  });

  test('should execute actions on state entry', async ({ page }) => {
    await page.goto('/executions/3'); // Execution with entry action

    // Trigger transition
    await page.getByRole('button', { name: /next/i }).click();

    // Wait for action to execute
    await expect(page.getByTestId('action-log')).toContainText('Entry action executed');
  });
});
```

### 4. Collaboration Features

```typescript
// tests/e2e/specs/collaboration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Collaboration', () => {
  test('should allow multiple users to view workflow', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login as user 1
    await page1.goto('/login');
    await page1.getByLabel('Email').fill('user1@example.com');
    await page1.getByLabel('Password').fill('password123');
    await page1.getByRole('button', { name: /log in/i }).click();

    // Login as user 2
    await page2.goto('/login');
    await page2.getByLabel('Email').fill('user2@example.com');
    await page2.getByLabel('Password').fill('password123');
    await page2.getByRole('button', { name: /log in/i }).click();

    // Both navigate to same workflow
    await page1.goto('/workflows/1');
    await page2.goto('/workflows/1');

    // Verify both can see workflow
    await expect(page1.getByTestId('workflow-name')).toBeVisible();
    await expect(page2.getByTestId('workflow-name')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should show real-time updates', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup: Both users on same workflow execution
    // User 1 makes a change
    await page1.goto('/executions/1');
    await page1.getByRole('button', { name: /approve/i }).click();

    // User 2 should see the update
    await page2.goto('/executions/1');
    await expect(page2.getByTestId('current-state')).toHaveText('approved');

    await context1.close();
    await context2.close();
  });

  test('should handle concurrent edits', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both users edit same workflow
    await page1.goto('/workflows/1/edit');
    await page2.goto('/workflows/1/edit');

    // User 1 saves first
    await page1.getByLabel('Workflow Name').fill('Updated by User 1');
    await page1.getByRole('button', { name: /save/i }).click();
    await expect(page1.getByText(/saved successfully/i)).toBeVisible();

    // User 2 tries to save (should get conflict)
    await page2.getByLabel('Workflow Name').fill('Updated by User 2');
    await page2.getByRole('button', { name: /save/i }).click();

    await expect(page2.getByText(/conflict detected/i)).toBeVisible();

    await context1.close();
    await context2.close();
  });
});
```

### 5. Mobile Responsiveness

```typescript
// tests/e2e/specs/mobile.spec.ts
import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Experience', () => {
  test.use({
    ...devices['iPhone 12'],
  });

  test('should display mobile navigation', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();

    // Mobile menu should be visible
    const mobileMenu = page.getByTestId('mobile-menu-button');
    await expect(mobileMenu).toBeVisible();

    // Desktop nav should be hidden
    const desktopNav = page.getByTestId('desktop-nav');
    await expect(desktopNav).not.toBeVisible();
  });

  test('should create workflow on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();

    await page.goto('/workflows/new');

    // Fill form on mobile
    await page.getByLabel('Workflow Name').fill('Mobile Workflow');
    await page.getByLabel('Description').fill('Created on mobile');

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  });

  test('should handle touch gestures', async ({ page }) => {
    await page.goto('/workflows/1');

    const canvas = page.getByTestId('workflow-canvas');

    // Simulate pinch to zoom
    await canvas.touchscreen.tap(200, 200);

    // Verify zoom controls appear
    await expect(page.getByTestId('zoom-controls')).toBeVisible();
  });
});
```

## Visual Regression Testing

```typescript
// tests/e2e/specs/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('should match dashboard screenshot', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match workflow builder screenshot', async ({ page }) => {
    await page.goto('/workflows/new');

    await expect(page).toHaveScreenshot('workflow-builder.png', {
      fullPage: true,
    });
  });

  test('should match component screenshots', async ({ page }) => {
    await page.goto('/workflows/1');

    // Screenshot specific component
    const canvas = page.getByTestId('workflow-canvas');
    await expect(canvas).toHaveScreenshot('workflow-canvas.png');
  });
});
```

## Performance Testing

```typescript
// tests/e2e/specs/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // 3 seconds
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/dashboard');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries.find((e) => e.entryType === 'largest-contentful-paint');
          const fid = entries.find((e) => e.entryType === 'first-input');
          const cls = entries.find((e) => e.entryType === 'layout-shift');

          resolve({ lcp, fid, cls });
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      });
    });

    console.log('Core Web Vitals:', metrics);
  });
});
```

## Running E2E Tests

### NPM Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:e2e:chrome": "playwright test --project=chromium",
    "test:e2e:firefox": "playwright test --project=firefox",
    "test:e2e:mobile": "playwright test --project=mobile-chrome"
  }
}
```

### CI Configuration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-videos
          path: test-results/
```

## Best Practices

1. **Use Page Object Model**: Encapsulate page interactions
2. **Wait Intelligently**: Use Playwright's auto-wait, avoid arbitrary timeouts
3. **Test User Journeys**: Focus on critical paths
4. **Isolate Tests**: Each test should be independent
5. **Use Test Fixtures**: Share setup code
6. **Stable Selectors**: Use `data-testid`, roles, labels (not classes/IDs)
7. **Visual Testing**: Use screenshots for visual regression
8. **Performance**: Keep E2E tests fast (<10 min total)
9. **Parallel Execution**: Run tests concurrently
10. **Debug Tools**: Use Playwright Inspector, traces, videos

## Summary

E2E testing strategy:
- **Coverage**: 20 critical user journeys
- **Browsers**: Chrome, Firefox, Safari, Mobile
- **Execution Time**: <10 minutes
- **Frequency**: On every PR and deployment
- **Tools**: Playwright, Page Object Model
- **CI Integration**: Automated with artifacts

Target: 100% coverage of critical user paths with stable, fast tests.
