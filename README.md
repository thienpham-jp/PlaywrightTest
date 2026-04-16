# Playwright TypeScript Test Project

## 📋 Project Overview

This is an **Automation Testing** project built with **Playwright** and **TypeScript**. The project focuses on testing web applications with the following core functionalities:

- **Authentication**: Testing login and user verification flows
- **Publisher Module**: Testing publisher-related features
- **ISTools**: Testing information management tools
- **Page Object Model Pattern**: Code is organized using the standard POM architectural pattern

---

## 🚀 Setup Guide

### Prerequisites

Ensure you have the following installed:

- **Node.js** (LTS version or higher) - [Download here](https://nodejs.org/)
- **npm** (included with Node.js)
- **Git** (to clone the repository)

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/PlaywrightTest.git
cd PlaywrightTest
```

### Step 2: Install Dependencies

```bash
npm install
```

This command installs all packages defined in `package.json`:

- `@playwright/test` - Playwright testing framework
- `@types/node` - Type definitions for Node.js
- `typescript` - TypeScript support
- `allure-playwright` - Allure reporting plugin

### Step 3: Install Playwright Browsers

```bash
npx playwright install --with-deps
```

This command downloads the supported browsers (Chromium, Firefox, WebKit) and necessary system libraries.

### Step 4: Configure Test Data

Update the `src/helpers/users.json` file with actual login credentials:

```json
{
  "admin": {
    "username": "your-admin-email@example.com",
    "password": "your-admin-password"
  },
  "normalUser": {
    "username": "your-user-email@example.com",
    "password": "your-user-password"
  },
  "pubUser": {
    "username": "your-pub-email@example.com",
    "password": "your-pub-password"
  }
}
```

> ⚠️ **Security**: Never commit `users.json` containing real passwords. Use environment variables or `.gitignore` to protect sensitive data.

---

## 📁 Project Structure

```
PlaywrightTest/
├── base/
│   └── WebBase.ts                    # Base class for browser initialization
├── pages/
│   ├── BasePage.ts                   # Parent class for all page objects
│   ├── AuthenticationPage.ts         # Page object for authentication
│   ├── IstoolsPage.ts               # Page object for istools
│   └── PublisherPage.ts             # Page object for publisher
├── src/
│   └── helpers/
│       ├── function-helper.ts        # Helper functions for random data
│       ├── user-helper.ts            # Export user constants
│       └── users.json                # Test data - credentials
├── tests/
│   ├── example.spec.ts               # Basic test examples
│   ├── authentication/
│   │   ├── AuthenticationPageTest.spec.ts
│   │   └── authenticationTestData.json
│   ├── istools/
│   │   ├── istools-page.spec.ts
│   │   └── istoolsTestData.json
│   ├── publisher/
│   │   ├── PublisherPageTest.spec.ts
│   │   └── PublisherProdTest.spec.ts
│   └── helpers/
│       └── function-helper.spec.ts   # Unit tests for helpers
├── playwright-report/                # HTML test reports
├── test-results/                     # Detailed test results
├── .github/workflows/
│   └── playwright.yml                # GitHub Actions pipeline
├── playwright.config.ts              # Playwright configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies & scripts
```

---

## 🎯 Key Technologies & Techniques

### 1. **Page Object Model (POM)**

The POM pattern is used to organize test code:

```typescript
// Base Class - Parent class for all pages
export class BasePage {
  public page: Page;

  // Common methods
  async click(locator: string) {}
  async fill(locator: string, value: string) {}
  async getText(locator: string) {}
}

// Concrete Page - Inherits from BasePage
export class AuthenticationPage extends BasePage {
  usernameTextBox = "#username";
  passwordTextBox = "#password";

  async login(username: string, password: string) {
    await this.fill(this.usernameTextBox, username);
    await this.fill(this.passwordTextBox, password);
    // ...
  }
}
```

**Benefits:**

- ✅ Maintainable code
- ✅ Reusable components
- ✅ Easy to extend

### 2. **Locator Strategies**

The project uses multiple ways to identify elements:

```typescript
// CSS Selector
"#username";
"button[type=submit]";

// XPath
"//input[@id='password']";

// Playwright Locators
"role=button[name='Login']";
"role=textbox[name='Password']";
```

**Best Practice**: Prioritize `Playwright Locators` as they are more stable and user-centric.

### 3. **Test Data Management**

Test data is managed through JSON files:

```json
// authenticationTestData.json
[
  {
    "label": "Valid Login",
    "username": "user@example.com",
    "password": "password123",
    "expectedUrl": "**/secure**",
    "messageType": "success",
    "expectedMessage": "You logged into a secure area!"
  }
]
```

Data is iterated to run multiple test cases:

```typescript
for (const data of testData) {
  test(data.label, async ({ page }) => {
    // Test with each data set
  });
}
```

### 4. **Helper Functions**

The `function-helper.ts` file provides functions for generating random data:

```typescript
// Generate random password
random_secure_password(12); // "aB#1xYz$9@w2"

// Generate random email
randomEmail("example.com"); // "k9x2y5m@example.com"

// Generate phone number
randomPhoneNumber("+84"); // "+84382945671"

// Generate random integer
randomInt(1, 100); // 42

// Generate random date
randomDate(); // Date object

// Pick random element from array
randomArrayElement(["A", "B", "C"]); // "B"
```

**Security**: Uses `crypto` module to generate random data safely.

### 5. **Authentication & JWT Token**

The project supports generating JWT tokens for API testing via `src/helpers/jwt-helper.ts`:

```typescript
// src/helpers/jwt-helper.ts
export function generateJWT(userUid: string, secretKey: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: userUid, iat: Math.floor(Date.now() / 1000) };
  // Encode & sign with HMAC-SHA256...
}
```

Import from the helper — never from another spec file:

```typescript
import { generateJWT } from "../../src/helpers/jwt-helper";
```

### 6. **Browser Configuration**

`WebBase.ts` provides flexible browser initialization:

```typescript
class WebBase {
  async setup(
    browserType: "chromium" | "firefox" | "webkit" = "chromium",
    headless: boolean = false,
  );
}
```

**Launch Options** to bypass security agents:

```
--disable-save-password-bubble
--disable-features=PasswordLeakDetection
--allow-insecure-localhost
--disable-dev-shm-usage (for Docker/Linux)
```

### 7. **Multi-Page/Tab Handling**

```typescript
// Register a new page
registerPage('popup', newPage): void

// Switch between pages
switchPage('popup'): void
```

---

## ▶️ Running Tests - Detailed Guide

### 1. Run All Tests Headless (Default)

```bash
npm test
```

**When to use**: CI/CD pipeline, server environments, fast execution

### 2. Run Tests Headed (View Browser)

```bash
npm run test:headed
```

**When to use**: Debugging, viewing UI interactions, troubleshooting failures

### 3. Run Tests with UI Mode (Playwright Inspector)

```bash
npm run test:ui
```

**When to use**: Interactive debugging, step-by-step execution

### 4. Run Specific Tests

```bash
# Run a specific test file
npx playwright test tests/authentication/AuthenticationPageTest.spec.ts

# Run a specific test by name
npx playwright test -g "has title"

# Run tests in a folder
npx playwright test tests/authentication/

# Run with a specific browser
npx playwright test --project=chromium
```

### 5. Run Tests with Additional Options

```bash
# Debug mode (pause at breakpoints)
npx playwright test --debug

# Run with 1 worker (sequential)
npx playwright test --workers=1

# Retry failed tests (3 times)
npx playwright test --retries=3

# Timeout per test (ms)
npx playwright test --timeout=60000

# Show detailed output
npx playwright test --verbose
```

### 6. View HTML Report

```bash
npm run report
```

This opens a detailed report in the browser with:

- ✅ Tests passed/failed
- 📸 Screenshots
- 🎬 Videos
- 📝 Logs

---

## 🏗️ Test Organization & Best Practices

### 1. Test Structure

```typescript
test.describe("Authentication Tests", () => {
  let authen: AuthenticationPage;

  test.beforeEach(async ({ page }) => {
    // Setup before each test
    authen = new AuthenticationPage(page);
    await authen.navigate();
  });

  test("Valid Login", async ({ page }) => {
    // Arrange
    const username = "user@example.com";
    const password = "password123";

    // Act
    await authen.login(username, password);

    // Assert
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup after each test
    if (page) await page.close();
  });
});
```

### 2. Assertions

```typescript
// Page assertions
await expect(page).toHaveTitle(/Playwright/);
await expect(page).toHaveURL(/.*dashboard/);

// Locator assertions
await expect(locator).toBeVisible();
await expect(locator).toHaveText("Expected Text");
await expect(locator).toContainText("Partial Text");
await expect(locator).toBeEnabled();
await expect(locator).toHaveCount(3);
```

### 3. Waits & Timeouts

```typescript
// Wait for element visibility
await page.locator(selector).waitFor({ state: "visible", timeout: 5000 });

// Wait for network idle
await page.waitForLoadState("networkidle");

// Wait for specific URL
await page.waitForURL("**/dashboard**", { timeout: 30000 });

// Custom wait
await page.waitForTimeout(2000); // 2 second delay
```

### 4. Test Data Parameterization

```typescript
const testData = [
  { username: "admin", password: "admin123", expected: "success" },
  { username: "invalid", password: "wrong", expected: "error" },
];

for (const data of testData) {
  test(`Login with ${data.username}`, async ({ page }) => {
    // Test logic
  });
}
```

---

## 📊 Configuration Deep Dive

### `playwright.config.ts` - Main Configuration

```typescript
export default defineConfig({
  testDir: "./tests", // Tests directory
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Forbid test.only on CI
  retries: process.env.CI ? 2 : 0, // Retries on CI
  workers: process.env.CI ? 1 : undefined, // Workers on CI
  reporter: [["html", { open: "always" }]], // HTML reports

  use: {
    baseURL: "http://localhost:3000", // Base URL
    trace: "on", // Record trace per test
    screenshot: "only-on-failure", // Screenshot on failure
    video: "retain-on-failure", // Video on failure
    headless: true, // Headless mode
  },

  projects: [
    {
      name: "chromium",
      use: { channel: "chrome" }, // Chrome channel
    },
  ],
});
```

### `tsconfig.json` - TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ESNext", // Target JavaScript version
    "module": "commonjs", // Module system
    "strict": true, // Strict type checking
    "esModuleInterop": true, // ES module interop
    "resolveJsonModule": true, // Import JSON files
    "types": ["node"], // Node types
    "outDir": "./dist" // Output directory
  },
  "include": ["tests/**/*.ts", "playwright.config.ts"]
}
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

### `.github/workflows/playwright.yml`

```yaml
name: Playwright Tests

on:
  schedule:
    - cron: "0 4 * * 1-5" # Runs daily at 4 AM (Mon-Fri)
  workflow_dispatch: # Manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

**Key Features:**

- ✅ Automatic scheduled runs
- ✅ Supports manual trigger
- ✅ Stores reports for 30 days
- ✅ Ensures clean dependencies (`npm ci`)

---

## ⚡ Tips & Tricks

### 1. Effective Test Debugging

```bash
# Debug mode with inspector
npx playwright test --debug

# Debug a specific file
npx playwright test tests/auth/ --debug

# Step through code, set breakpoints
```

### 2. Speed Up Tests

```bash
# Run tests in parallel (faster when no conflict)
npx playwright test --workers=4

# Skip retries locally
npx playwright test --retries=0
```

### 3. Handle Dynamic Content

```typescript
// Wait for element to appear
await page.locator('[aria-label="Loading"]').waitFor({ state: "hidden" });

// Wait for all requests to complete
await page.waitForLoadState("networkidle");

// Click when element is interactable
await page.locator("button").click({ force: true });
```

### 4. Capture Evidence

```typescript
// Screenshot
await page.screenshot({ path: "screenshot.png" });

// Full page screenshot
await page.screenshot({ path: "fullpage.png", fullPage: true });

// HTML content
const html = await page.content();
```

### 5. Error Handling

```typescript
try {
  await page.locator("#non-existent").click();
} catch (error) {
  console.log("Element not found, proceeding...");
}

// Better: Use waitFor with timeout
await page
  .locator("#element")
  .waitFor({ state: "visible", timeout: 5000 })
  .catch(() => console.log("Element timeout"));
```

---

## 🛠️ Testing Checklist

Before writing a new test, confirm the following:

- [ ] **Stable Locators**: Locators do not change based on state or theme
- [ ] **Explicit Waits**: Do not use `waitForTimeout`, use `waitForLoadState`
- [ ] **Isolation**: Tests are independent and do not rely on each other
- [ ] **Cleanup**: `afterEach` clears state (close pages, logout)
- [ ] **Clear Assertions**: Every test has at least one assertion
- [ ] **Data Driven**: Use external data for multiple scenarios
- [ ] **Error Messages**: Descriptive error messages
- [ ] **Performance**: Tests do not run too long (>1 minute/test)

---

## 🔐 Security & Sensitive Data

### Best Practices

1. **Do not hardcode credentials**

   ```typescript
   // ❌ BAD
   const username = "admin@example.com";

   // ✅ GOOD
   const username = process.env.ADMIN_USERNAME;
   ```

2. **Environment Variables**

   ```bash
   # .env (NEVER commit this)
   ADMIN_USERNAME=admin@example.com
   ADMIN_PASSWORD=secretpassword
   ```

3. **.gitignore Setup**

   ```
   .env
   .env.local
   src/helpers/users.json
   test-results/
   playwright-report/
   ```

4. **Sensitive Data in Logs**
   ```typescript
   // Mask passwords in logs
   console.log(`Logging in as: ${username}...`);
   // ❌ Don't log password
   ```

---

## 📚 Resources & Documentation

- **Playwright Docs**: https://playwright.dev
- **TypeScript Docs**: https://www.typescriptlang.org
- **Jest Expect**: https://jestjs.io/docs/expect (similar API)
- **Web Testing Best Practices**: https://playwright.dev/docs/best-practices

---

## 🤝 Contributing Guidelines

1. **Branch Naming**: `feature/test-module-name` or `bugfix/issue-name`
2. **Commit Messages**:
   - ✅ `feat: add authentication tests for login flow`
   - ✅ `fix: update selector for login button`
3. **PR Reviews**: Each PR requires at least 1 approval
4. **Tests Required**: All code changes must include tests

---

## 🚨 Common Issues & Solutions

### Issue #1: Playwright Timeouts

```
TimeoutError: locator.click: Timeout 30000ms exceeded
```

**Solution:**

- Check if element is visible
- Increase timeout: `.click({ timeout: 60000 })`
- Use `waitForLoadState('networkidle')`

### Issue #2: Selector Not Found

```
locator.fill: Target page, context or browser has been closed
```

**Solution:**

- Check that the page is not closed
- Ensure navigation was successful
- Debug selector with `page.$('selector')`

### Issue #3: Element Not Interactable

```
Error: locator.click: Element is not visible
```

**Solution:**

```typescript
// Scroll into view
await page.locator(selector).scrollIntoViewIfNeeded();

// Visual check
await page.screenshot();

// Force click
await page.locator(selector).click({ force: true });
```

### Issue #4: Random Test Failures (Flakiness)

**Solution:**

- Add explicit waits
- Check for race conditions
- Use `fullyParallel: false` for debugging

---

## 📝 Maintenance Tasks

### Weekly

- [ ] Run the full test suite
- [ ] Check test failures
- [ ] Update selectors if the UI changes

### Monthly

- [ ] Review and refactor old tests
- [ ] Update dependencies: `npm update`
- [ ] Review CI/CD logs

### Yearly

- [ ] Upgrade Playwright/TypeScript major versions
- [ ] Audit test coverage
- [ ] Review test data strategy

---

## 🎓 Key Skills to Note

### 1. **CSS Selectors**

```
.class, #id, [attribute=value]
button:nth-child(2), div > span
```

### 2. **XPath** (When needed)

```
//button[@id='submit']
//input[@type='text' and @name='username']
```

### 3. **Playwright Locators** (BEST)

```
role=button[name="Click me"]
role=textbox[name="Email"]
```

### 4. **Async/Await Understanding**

```typescript
// Sequential execution
await step1();
await step2();

// Parallel execution
await Promise.all([step1(), step2()]);
```

### 5. **Debugging Tools**

- Browser DevTools (F12)
- Playwright Inspector (`--debug`)
- Console logs & screenshots
- Network tab analysis

---

**Version**: 1.1.0  
**Last Updated**: 2026-04-16  
**Maintainers**: Your Team  
**License**: MIT
