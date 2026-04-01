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

    await publisherPage.page.waitForLoadState("networkidle");
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

  test.describe("Payments section", () => {
    test.beforeEach(async () => {
      await publisherPage.page
        .locator("span")
        .filter({ hasText: /^Payments$/ })
        .click();

      await publisherPage.page.waitForLoadState("load");
      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL}/dashboard/payments`,
      );
      await publisherPage.page.waitForLoadState("networkidle");
    });

    test("View Process Stages (IDR)", async () => {
      const listItems = [
        "Reward Approved",
        "Payment in Progress",
        "Payment Held Until Requirement Met",
      ];

      const processStagestText = publisherPage.page.getByText(
        "Process Stages",
        { exact: false },
      );
      await processStagestText.waitFor({ state: "visible", timeout: 30000 });

      for (const item of listItems) {
        const itemLocator = publisherPage.page
          .getByText(item, { exact: false })
          .first();
        await itemLocator.waitFor({ state: "visible", timeout: 10000 });
        await expect(itemLocator).toBeVisible();
      }

      // Chờ số tiền xuất hiện (không phải 0)
      await expect(async () => {
        const amounts = publisherPage.page.locator("text=/^[1-9][0-9,]*$/");
        const count = await amounts.count();
        expect(count).toBeGreaterThan(0);
      }).toPass({ timeout: 15000 });
    });

    test("View Invoice section", async () => {
      // Wait for Invoice section heading to appear
      await expect(
        publisherPage.page.getByRole("heading", { name: "Invoice" }),
      ).toBeVisible({
        timeout: 30000,
      });

      // Wait for table to render
      const invoiceTable = publisherPage.page.locator("table").first();
      await invoiceTable.waitFor({ state: "visible", timeout: 30000 });

      // Wait specifically for tbody rows to be populated (not just table shell)
      await expect(
        publisherPage.page.locator("table tbody tr").first(),
      ).toBeVisible({ timeout: 30000 });

      const invoiceRows = publisherPage.page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Bonus: verify columns exist
      await expect(
        publisherPage.page.locator("th", { hasText: "Invoice Number" }),
      ).toBeVisible();
      await expect(
        publisherPage.page.locator("th", { hasText: "Paid Amount" }),
      ).toBeVisible();
    });
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

    test.describe("Properties section", () => {
      test.beforeEach(async () => {
        await publisherPage.page
          .locator("span")
          .filter({ hasText: /^Properties$/ })
          .click();
        await publisherPage.page.waitForLoadState("load");
      });

      test.describe("Site Management", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });

      test.describe("Tracing URL", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });

      test.describe("Postback", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });
    });
  });

  test.describe("Campaign section", () => {
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

    test.describe("Properties section", () => {
      test.beforeEach(async () => {
        await publisherPage.page
          .locator("span")
          .filter({ hasText: /^Properties$/ })
          .click();
        await publisherPage.page.waitForLoadState("load");
      });

      test.describe("Site Management", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });

      test.describe("Tracing URL", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });

      test.describe("Postback", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });
    });
  });

  test.describe("Creatives", () => {
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

    test.describe("Properties section", () => {
      test.beforeEach(async () => {
        await publisherPage.page
          .locator("span")
          .filter({ hasText: /^Properties$/ })
          .click();
        await publisherPage.page.waitForLoadState("load");
      });

      test.describe("Site Management", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });

      test.describe("Tracing URL", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });

      test.describe("Postback", () => {
        test("View Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Update Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });

        test("Delete Site", async () => {
          await expect(publisherPage.page).toHaveURL(
            `${BASE_URL}/dashboard/account-settings/properties/list`,
          );
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
        });
      });
    });
  });

  test.afterEach(async () => {
    await publisherPage.page.close();
  });
});
