import { test, expect } from "@playwright/test";
import { NextInsightPage } from "../../pages/next-insight-page";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "../../src/helpers/user-helper";

const BASE_URL = "https://st-next-insight.accesstrade.co.id";

// ── Test suite ───────────────────────────────────────────────
test.describe("Next Insight Production Tests", () => {
  test.describe.configure({ mode: "parallel" });
  let nextInsightPage: NextInsightPage;

  test.beforeEach(async ({ page }, testInfo) => {
    // Increase timeout for login operations
    testInfo.setTimeout(90000); // 90 seconds for the entire hook

    nextInsightPage = new NextInsightPage(page);
    await nextInsightPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);

    await nextInsightPage.page.waitForLoadState("networkidle");
  });

  // ── Tests ──────────────────────────────────────────────────

  test("Dashboard - URL verification", async () => {
    await expect(nextInsightPage.page).toHaveURL(`${BASE_URL}/istools`);
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });
});
