# Playwright TypeScript Test Project

## 📋 Tổng Quan Dự Án

Đây là một **dự án kiểm thử tự động (Automation Testing)** được xây dựng bằng **Playwright** và **TypeScript**. Dự án tập trung vào việc kiểm thử các ứng dụng web với các chức năng chính bao gồm:

- **Authentication**: Kiểm thử đăng nhập, xác thực người dùng
- **Publisher Module**: Kiểm thử chức năng nhà xuất bản
- **ISTools**: Kiểm thử công cụ quản lý thông tin
- **Page Object Model Pattern**: Tổ chức code theo mẫu POM tiêu chuẩn

---

## 🚀 Hướng Dẫn Setup

### Prerequisites

Đảm bảo bạn đã cài đặt:

- **Node.js** (phiên bản LTS trở lên) - [Tải tại đây](https://nodejs.org/)
- **npm** (đi kèm với Node.js)
- **Git** (để clone dự án)

### Bước 1: Clone Repository

```bash
git clone https://github.com/your-repo/PlaywrightTest.git
cd PlaywrightTest
```

### Bước 2: Cài Đặt Dependencies

```bash
npm install
```

Lệnh này sẽ cài đặt tất cả các package được định nghĩa trong `package.json`:

- `@playwright/test` - Framework Playwright cho testing
- `@types/node` - Type definitions cho Node.js
- `typescript` - Hỗ trợ TypeScript
- `allure-playwright` - Plugin báo cáo Allure

### Bước 3: Cài Đặt Playwright Browsers

```bash
npx playwright install --with-deps
```

Lệnh này sẽ tải xuống các trình duyệt được hỗ trợ (Chromium, Firefox, WebKit) và các thư viện hệ thống cần thiết.

### Bước 4: Cấu Hình Test Data

Cập nhật tệp `src/helpers/users.json` với thông tin đăng nhập thực tế:

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

> ⚠️ **Bảo Mật**: Không bao giờ commit tệp `users.json` có chứa mật khẩu thực tế. Sử dụng environment variables hoặc file `.gitignore` để bảo vệ.

---

## 📁 Cấu Trúc Dự Án

```
PlaywrightTest/
├── base/
│   └── WebBase.ts                    # Lớp cơ sở cho khởi tạo browser
├── pages/
│   ├── BasePage.ts                   # Lớp cha cho tất cả page objects
│   ├── AuthenticationPage.ts         # Page object cho authentication
│   ├── IstoolsPage.ts               # Page object cho istools
│   └── PublisherPage.ts             # Page object cho publisher
├── src/
│   └── helpers/
│       ├── function-helper.ts        # Hàm helper cho random data
│       ├── user-helper.ts            # Export user constants
│       └── users.json                # Test data - credentials
├── tests/
│   ├── example.spec.ts               # Ví dụ test cơ bản
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
│       └── function-helper.spec.ts   # Unit tests cho helpers
├── playwright-report/                # Báo cáo HTML test
├── test-results/                     # Kết quả test chi tiết
├── .github/workflows/
│   └── playwright.yml                # GitHub Actions pipeline
├── playwright.config.ts              # Cấu hình Playwright
├── tsconfig.json                     # Cấu hình TypeScript
└── package.json                      # Dependencies & scripts
```

---

## 🎯 Key Technologies & Techniques

### 1. **Page Object Model (POM)**

Mẫu POM được sử dụng để tổ chức code test:

```typescript
// Base Class - Lớp cha cho tất cả pages
export class BasePage {
  public page: Page;

  // Các phương thức chung
  async click(locator: string) {}
  async fill(locator: string, value: string) {}
  async getText(locator: string) {}
}

// Concrete Page - Kế thừa từ BasePage
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

**Lợi Ích:**

- ✅ Code dễ bảo trì
- ✅ Tái sử dụng được
- ✅ Dễ mở rộng

### 2. **Locator Strategies**

Dự án sử dụng nhiều cách để xác định phần tử:

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

**Best Practice**: Ưu tiên `Playwright Locators` vì chúng ổn định và đầu tiên dành cho end-user.

### 3. **Test Data Management**

Test data được quản lý qua JSON files:

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

Dữ liệu được lặp qua để chạy multiple test cases:

```typescript
for (const data of testData) {
  test(data.label, async ({ page }) => {
    // Test với từng data set
  });
}
```

### 4. **Helper Functions**

Tệp `function-helper.ts` cung cấp các hàm hỗ trợ tạo dữ liệu ngẫu nhiên:

```typescript
// Tạo mật khẩu ngẫu nhiên
random_secure_password(12); // "aB#1xYz$9@w2"

// Tạo email ngẫu nhiên
randomEmail("example.com"); // "k9x2y5m@example.com"

// Tạo số điện thoại
randomPhoneNumber("+84"); // "+84382945671"

// Tạo số nguyên ngẫu nhiên
randomInt(1, 100); // 42

// Tạo ngày ngẫu nhiên
randomDate(); // Date object

// Chọn phần tử ngẫu nhiên từ mảng
randomArrayElement(["A", "B", "C"]); // "B"
```

**Security**: Sử dụng `crypto` module để tạo random data an toàn.

### 5. **Authentication & JWT Token**

Dự án hỗ trợ tạo JWT token cho API testing:

```typescript
function generateJWT(userUid: string, secretKey: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: userUid, iat: Math.floor(Date.now() / 1000) };
  // Encode & sign...
}
```

### 6. **Browser Configuration**

`WebBase.ts` cung cấp khởi tạo browser linh hoạt:

```typescript
class WebBase {
  async setup(
    browserType: "chromium" | "firefox" | "webkit" = "chromium",
    headless: boolean = false,
  );
}
```

**Launch Options** để bypass đặc vụ bảo mật:

```
--disable-save-password-bubble
--disable-features=PasswordLeakDetection
--allow-insecure-localhost
--disable-dev-shm-usage (cho Docker/Linux)
```

### 7. **Multi-Page/Tab Handling**

```typescript
// Đăng ký trang mới
registerPage('popup', newPage): void

// Chuyển đổi giữa các trang
switchPage('popup'): void
```

---

## ▶️ Chạy Tests - Hướng Dẫn Chi Tiết

### 1. Chạy Tất Cả Tests Headless (Mặc Định)

```bash
npm test
```

**Khi nào dùng**: CI/CD pipeline, server environment, chạy nhanh

### 2. Chạy Tests Headed (Xem Browser)

```bash
npm run test:headed
```

**Khi nào dùng**: Debug, xem UI interactions, troubleshoot failures

### 3. Chạy Tests với UI Mode (Playwright Inspector)

```bash
npm run test:ui
```

**Khi nào dùng**: Interactive debugging, step-by-step execution

### 4. Chạy Tests Cụ Thể

```bash
# Chạy file test cụ thể
npx playwright test tests/authentication/AuthenticationPageTest.spec.ts

# Chạy test cụ thể theo tên
npx playwright test -g "has title"

# Chạy tests trong thư mục
npx playwright test tests/authentication/

# Chạy với một browser cụ thể
npx playwright test --project=chromium
```

### 5. Chạy Tests Với Options Khác

```bash
# Debug mode (dừng tại breakpoints)
npx playwright test --debug

# Chạy cùng lúc 1 worker (tuần tự)
npx playwright test --workers=1

# Retry failed tests (3 lần)
npx playwright test --retries=3

# Timeout per test (ms)
npx playwright test --timeout=60000

# Show detailed output
npx playwright test --verbose
```

### 6. Xem Báo Cáo HTML

```bash
npm run report
```

Lệnh này sẽ mở trình duyệt với báo cáo chi tiết:

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
    // Setup trước mỗi test
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
    // Cleanup sau mỗi test
    if (page) await page.close();
  });
});
```

### 2. Assertions (Kiểm Thử)

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

### `playwright.config.ts` - Cấu Hình Chính

```typescript
export default defineConfig({
  testDir: "./tests", // Thư mục chứa tests
  fullyParallel: true, // Chạy tests song song
  forbidOnly: !!process.env.CI, // Cấm test.only trên CI
  retries: process.env.CI ? 2 : 0, // Retry trên CI
  workers: process.env.CI ? 1 : undefined, // Workers trên CI
  reporter: [["html", { open: "always" }]], // HTML reports

  use: {
    baseURL: "http://localhost:3000", // Base URL
    trace: "on", // Ghi trace mỗi test
    screenshot: "only-on-failure", // Screenshot khi fail
    video: "retain-on-failure", // Video khi fail
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

### `tsconfig.json` - Cấu Hình TypeScript

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
    - cron: "0 4 * * 1-5" # Chạy hàng ngày 4 AM (thứ 2-5)
  workflow_dispatch: # Trigger thủ công

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

**Điểm Quan Trọng:**

- ✅ Chạy tự động theo lịch trình
- ✅ Có thể trigger thủ công
- ✅ Lưu trữ báo cáo 30 ngày
- ✅ Đảm bảo dependency tươi (`npm ci`)

---

## ⚡ Tips & Tricks

### 1. Debug Tests Hiệu Quả

```bash
# Debug mode with inspector
npx playwright test --debug

# Debug cụ thể file
npx playwright test tests/auth/ --debug

# Step through code, set breakpoints
```

### 2. Tăng Tốc Tests

```bash
# Chạy tests kiếp tuần tự (nhanh hơn nếu không conflict)
npx playwright test --workers=4

# Skip retries locally
npx playwright test --retries=0
```

### 3. Handle Dynamic Content

```typescript
// Chờ element xuất hiện
await page.locator('[aria-label="Loading"]').waitFor({ state: "hidden" });

// Chờ tất cả requests hoàn thành
await page.waitForLoadState("networkidle");

// Click khi element có thể interact được
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

Khi viết test mới, hãy xác nhận:

- [ ] **Locators Stable**: Locator không thay đổi theo state/theme
- [ ] **Waits Explicit**: Không dùng `waitForTimeout`, dùng `waitForLoadState`
- [ ] **Isolation**: Tests độc lập, không phụ thuộc lẫn nhau
- [ ] **Cleanup**: `afterEach` clear state (close pages, logout)
- [ ] **Assertions Clear**: Mỗi test có ít nhất 1 assertion
- [ ] **Data Driven**: Sử dụng external data cho multiple scenarios
- [ ] **Error Messages**: Descriptive error messages
- [ ] **Performance**: Tests không chạy quá lâu (>1 phút/test)

---

## 🔐 Security & Sensitive Data

### Best Practices

1. **Không hardcode credentials**

   ```typescript
   // ❌ BAD
   const username = "admin@example.com";

   // ✅ GOOD
   const username = process.env.ADMIN_USERNAME;
   ```

2. **Environment Variables**

   ```bash
   # .env (NEVER commit này)
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

1. **Branch Naming**: `feature/test-module-name` hoặc `bugfix/issue-name`
2. **Commit Messages**:
   - ✅ `feat: add authentication tests for login flow`
   - ✅ `fix: update selector for login button`
3. **PR Reviews**: Mỗi PR cần ít nhất 1 approval
4. **Tests Required**: Tất cả code changes cần kèm tests

---

## 🚨 Common Issues & Solutions

### Issue #1: Playwright Timeouts

```
TimeoutError: locator.click: Timeout 30000ms exceeded
```

**Giải pháp:**

- Kiểm tra element có visible không
- Tăng timeout: `.click({ timeout: 60000 })`
- Sử dụng `waitForLoadState('networkidle')`

### Issue #2: Selector Not Found

```
locator.fill: Target page, context or browser has been closed
```

**Giải pháp:**

- Kiểm tra page không bị close
- Đảm bảo navigation thành công
- Debug selector với `page.$('selector')`

### Issue #3: Element Not Interactable

```
Error: locator.click: Element is not visible
```

**Giải pháp:**

```typescript
// Scroll vào view
await page.locator(selector).scrollIntoViewIfNeeded();

// Visual check
await page.screenshot();

// Force click
await page.locator(selector).click({ force: true });
```

### Issue #4: Random Test Failures

**Giải pháp:**

- Thêm waits explicit
- Kiểm tra race conditions
- Sử dụng `fullyParallel: false` để debug

---

## 📝 Maintenance Tasks

### Hàng Tuần

- [ ] Chạy toàn bộ test suite
- [ ] Kiểm tra test failures
- [ ] Update selectors nếu UI thay đổi

### Hàng Tháng

- [ ] Review và refactor tests cũ
- [ ] Update dependencies: `npm update`
- [ ] Kiểm tra CI/CD logs

### Hàng Năm

- [ ] Upgrade Playwright/TypeScript major versions
- [ ] Audit test coverage
- [ ] Review test data strategy

---

## 🎓 Kỹ Năng Quan Trọng Cần Lưu Ý

### 1. **CSS Selectors**

```
.class, #id, [attribute=value]
button:nth-child(2), div > span
```

### 2. **XPath** (Khi cần)

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

**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: 2026-04-13  
**Maintainers**: Your Team  
**License**: MIT
