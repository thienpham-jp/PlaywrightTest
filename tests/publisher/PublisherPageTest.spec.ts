import { test, expect } from "@playwright/test";
import { PublisherPage } from "../../pages/PublisherPage";
import userData from "../../src/helpers/users.json";

// ── Publisher config ─────────────────────────────────────────
const PAN = "84255";
const SITE_ID = "102253";

const DASHBOARD_URL = "https://publisher-staging.accesstrade.co.id/#/dashboard";

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
    await expect(publisherPage.page).toHaveURL(DASHBOARD_URL);
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

  test.afterEach(async () => {
    await publisherPage.page.close();
  });
});
