import { test, expect } from "@playwright/test";
import { PublisherPage } from "../../pages/PublisherPage";
import userData from "../../src/helpers/users.json";

// ── Publisher config ─────────────────────────────────────────
const PAN = "84255";
const SITE_ID = "102253";

const BASE_URL = "https://publisher-staging.accesstrade.co.id/#";

const PERFORMANCE_ITEMS = [
  "Earnings (IDR)",
  "Clicks",
  "Conversions",
  "Earnings per Click (IDR)",
];

// ── Test suite ───────────────────────────────────────────────
test.describe("Publisher Tests", () => {
  let publisherPage: PublisherPage;

  test.beforeEach(async ({ page }) => {
    publisherPage = new PublisherPage(page);
    await publisherPage.open();
    await publisherPage.login(userData.admin.username, userData.admin.password);
    await publisherPage.loginPub(PAN, SITE_ID);
  });

  // ── Tests ──────────────────────────────────────────────────

  test("Dashboard - URL verification", async () => {
    await expect(publisherPage.page).toHaveURL(`${BASE_URL}/dashboard`);
  });

  test("Dashboard - Performance section", async () => {
    const performanceText = publisherPage.page.getByText("Performance", {
      exact: true,
    });

    await performanceText.waitFor({ state: "visible", timeout: 30000 });
    await expect(performanceText).toBeVisible();

    for (const item of PERFORMANCE_ITEMS) {
      await expect(publisherPage.page.getByText(item)).toBeVisible();
    }
  });

  test.describe("Account Settings section", () => {
    test.beforeEach(async () => {
      // 1. Click on the user profile icon
      await publisherPage.page
        .locator('div[class="character"]')
        .first()
        .click();
      // 2. Click on 'Account Settings' in the dropdown
      await publisherPage.page
        .getByText("Account Settings", { exact: true })
        .click();
    });

    test("View Account Settings", async () => {
      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL}/dashboard/account-settings/publisher-account/show`,
      );
      await expect(
        publisherPage.page.getByRole("heading", { name: "Account Settings" }),
      ).toBeVisible();
    });

    test("Account Settings - Change password", async () => {
      // 1. Click on 'Change Password' edit button
      await publisherPage.page
        .locator("app-password-block div")
        .filter({ hasText: /^edit$/ })
        .click();

      // 2. Input current password
      await publisherPage.page
        .locator('input[type="password"]')
        .first()
        .fill(userData.admin.password);

      // 3. Input new password
      await publisherPage.page
        .locator('input[type="password"]')
        .nth(1)
        .fill(userData.admin.password);

      // 4. Input confirm new password
      await publisherPage.page
        .locator('input[type="password"]')
        .nth(2)
        .fill(userData.admin.password);

      // 5. Click on 'Update' button
      await publisherPage.page.getByRole("button", { name: "Update" }).click();

      // 6. Expect success message is visible
      await expect(
        publisherPage.page.getByText("Password is updated successfully."),
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.afterEach(async () => {
    await publisherPage.page.close();
  });
});
