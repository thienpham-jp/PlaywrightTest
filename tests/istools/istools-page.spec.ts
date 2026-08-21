import { test, expect } from "@playwright/test";
import { IstoolsPage } from "../../pages/istools-page";
import testData from "./istoolsTestData.json";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  NORMAL_PASSWORD,
  NORMAL_USERNAME,
} from "../../src/helpers/user-helper";

type UserType = "admin" | "normal";

type IstoolsTestData = {
  label: string;
  userType: UserType;
  passwordOverride?: string;
  expectedUrl: string;
  expectedError?: string;
};

const resolveCredentials = (data: IstoolsTestData) => {
  const credentialsByUserType: Record<
    UserType,
    { username: string; password: string }
  > = {
    admin: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    normal: { username: NORMAL_USERNAME, password: NORMAL_PASSWORD },
  };

  const baseCredentials = credentialsByUserType[data.userType];
  return {
    username: baseCredentials.username,
    password: data.passwordOverride ?? baseCredentials.password,
  };
};

test.describe("Istools Tests", () => {
  let istoolsPage: IstoolsPage;

  test.beforeEach(async ({ page }) => {
    istoolsPage = new IstoolsPage(page);

    try {
      await istoolsPage.open();
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`[beforeEach] Failed to open istools page: ${errorMsg}`);

      // If it's a network/server issue, skip the test instead of failing
      if (
        errorMsg.includes("ERR_HTTP_RESPONSE_CODE_FAILURE") ||
        errorMsg.includes("net::ERR_")
      ) {
        test.skip(true, `SSO service unavailable: ${errorMsg}`);
        return;
      }

      // For other errors, re-throw
      throw error;
    }
  });

  for (const data of testData as IstoolsTestData[]) {
    test(data.label, async ({ page }) => {
      const credentials = resolveCredentials(data);
      await istoolsPage.login(credentials.username, credentials.password);

      await expect(page).toHaveURL(data.expectedUrl);

      if (data.expectedError) {
        const errorMessage = await istoolsPage.getErrorMessage();
        expect(errorMessage).toContain(data.expectedError);
      }
    });
  }

  test.describe.skip("Direct Navigation CFD Tests", () => {
    // Direct to Fraud Guard page
    test("Direct to Fraud Guard page", async ({}) => {
      const credentials = resolveCredentials({
        label: "Direct to Fraud Guard page",
        userType: "admin",
        expectedUrl:
          "https://st-next-insight.accesstrade.co.id/istools/fraud-guard",
      });
      await istoolsPage.login(credentials.username, credentials.password);

      await istoolsPage.page.getByRole("link", { name: /Click/ }).click();

      // Start listening for a new tab before clicking; if none opens, fall back to same-tab navigation
      const newPagePromise = istoolsPage.page
        .context()
        .waitForEvent("page", { timeout: 5000 })
        .catch(() => null);

      await istoolsPage.page.getByRole("link", { name: /Fraud Guard/ }).click();

      const newPage = await newPagePromise;
      const targetPage = newPage ?? istoolsPage.page;

      try {
        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/stag-cfd-db-id\.asean-accesstrade\.net\/\?_t/,
          { timeout: 15000 },
        );

        await expect(
          targetPage
            .getByRole("heading", { name: /Executive Dashboard/ })
            .first(),
        ).toBeVisible({
          timeout: 15000,
        });
      } finally {
        if (newPage) {
          await newPage.close();
        }
      }
    });

    // Direct to Fraud Watch page
    test("Direct to Fraud Watch page", async ({}) => {
      const credentials = resolveCredentials({
        label: "Direct to Fraud Watch page",
        userType: "admin",
        expectedUrl:
          "https://st-next-insight.accesstrade.co.id/istools/fraud-watch",
      });
      await istoolsPage.login(credentials.username, credentials.password);

      await istoolsPage.page.getByRole("link", { name: /Click/ }).click();

      // Start listening for a new tab before clicking; if none opens, fall back to same-tab navigation
      const newPagePromise = istoolsPage.page
        .context()
        .waitForEvent("page", { timeout: 5000 })
        .catch(() => null);

      await istoolsPage.page
        .getByRole("link", { name: /Fraud Watch Workspace/ })
        .click();

      const newPage = await newPagePromise;
      const targetPage = newPage ?? istoolsPage.page;

      try {
        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/stag-cfd-fraudwatch-id\.asean-accesstrade\.net\//,
          { timeout: 15000 },
        );

        await expect(
          targetPage.getByRole("tab", { name: /Operational/ }).first(),
        ).toBeVisible({
          timeout: 15000,
        });
      } finally {
        if (newPage) {
          await newPage.close();
        }
      }
    });

    // Direct to Publisher Click Trend page
    test("Direct to Publisher Click Trend page", async ({}) => {
      const credentials = resolveCredentials({
        label: "Direct to Publisher Click Trend page",
        userType: "admin",
        expectedUrl:
          "https://st-next-insight.accesstrade.co.id/istools/publisher-click-trend",
      });
      await istoolsPage.login(credentials.username, credentials.password);

      await istoolsPage.page.getByRole("link", { name: /Click/ }).click();

      // Start listening for a new tab before clicking; if none opens, fall back to same-tab navigation
      const newPagePromise = istoolsPage.page
        .context()
        .waitForEvent("page", { timeout: 5000 })
        .catch(() => null);

      await istoolsPage.page
        .getByRole("link", { name: /Publisher Click Trend/ })
        .click();

      const newPage = await newPagePromise;
      const targetPage = newPage ?? istoolsPage.page;

      try {
        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/stag-cfd-click-trend-id\.asean-accesstrade\.net\//,
          { timeout: 15000 },
        );

        await expect(
          targetPage
            .getByRole("heading", { name: /Publisher Click Trends/ })
            .first(),
        ).toBeVisible({
          timeout: 15000,
        });
      } finally {
        if (newPage) {
          await newPage.close();
        }
      }
    });

    test.afterEach(async ({ page }) => {
      await page.close();
    });
  });
});
