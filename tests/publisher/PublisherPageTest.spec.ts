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

    test("Change info Account Settings", async () => {
      // 1. Click on 'Certification Info' edit button
      await publisherPage.page
        .locator("app-individual-account")
        .getByText("edit")
        .click();

      // 2. Input NPWP number
      await publisherPage.page
        .locator('input[name="npwpNumber"]')
        .fill(`NPWP-${Math.floor(Math.random() * 10000)}`);

      // 3. Input first name
      await publisherPage.page.locator('input[name="firstName"]').fill("John");

      // 4. Input last name
      await publisherPage.page.locator('input[name="lastName"]').fill("Doe");

      // 5. Select Gender - random choice from 3 options
      const genderOptions = ["Unknown", "Male", "Female"];
      const randomGender =
        genderOptions[Math.floor(Math.random() * genderOptions.length)];

      // Click on gender dropdown button to open the options
      await publisherPage.page
        .locator("button[data-toggle='dropdown']")
        .click();

      // Click the random gender option
      await publisherPage.page
        .getByRole("link", { name: new RegExp(`^${randomGender}`) })
        .click();

      // 6. Input Valid Birthday
      await publisherPage.page
        .locator('input[name="datePicker"]')
        .fill("1990-01-01");

      // 7. Input Street
      await publisherPage.page
        .locator('input[name="address"]')
        .fill("123 Main Street");

      // 8. Input Province
      await publisherPage.page
        .locator('input[name="province"]')
        .fill("Jakarta");

      // 9. Input City
      await publisherPage.page
        .locator('input[name="city"]')
        .fill("Jakarta Pusat");

      // 10. Input Zip Code
      await publisherPage.page.locator('input[name="zipCode"]').fill("12345");

      // 11. Input Phone Number
      await publisherPage.page
        .locator('input[name="phoneNumber"]')
        .fill("+62812345678");

      // 13. Click on 'Update' button
      const updateButtons = publisherPage.page.getByRole("button", {
        name: "Update",
      });
      await updateButtons.click();

      // 14. Expect success message is visible
      const successMessage = publisherPage.page.getByText(
        "Profile is updated successfully",
      );

      await expect(successMessage).toBeVisible();
    });

    test.describe("Properties section", () => {
      test.beforeEach(async () => {
        await publisherPage.page
          .locator("span")
          .filter({ hasText: /^Properties$/ })
          .click();

        await publisherPage.page.waitForLoadState("networkidle");

        await expect(publisherPage.page).toHaveURL(
          `${BASE_URL}/dashboard/account-settings/properties/list`,
        );

        await publisherPage.page.waitForLoadState("networkidle");
      });

      test.describe("Site Management", () => {
        test("View Site", async () => {
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
          await expect(
            publisherPage.page.locator("tr[role='row']").first(),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          // 1. Click on 'Add' button
          await publisherPage.page
            .locator("div")
            .filter({ hasText: /^add$/ })
            .click();
          // 2. Input Site Name
          const siteName = `A Test ${Math.floor(Math.random() * 1000)}`;
          await publisherPage.page.getByRole("textbox").first().fill(siteName);
          // 3. Input Site URL
          await publisherPage.page
            .locator('input[type="url"]')
            .fill(`https://www.google.com/${Math.floor(Math.random() * 1000)}`);
          // 4. Click Type dropdown and select a type
          await publisherPage.page
            .locator("single-selector")
            .filter({ hasText: "? ? Blog Social Network" })
            .getByRole("button")
            .click();
          await publisherPage.page
            .getByRole("link", { name: "Social Network" })
            .click();
          // 5. Click Traffic dropdown and select a traffic source
          await publisherPage.page
            .getByText("Traffic? ? Organic Search")
            .click();
          await publisherPage.page
            .getByRole("link", { name: "Paid Search" })
            .click();
          // 6. Click Lead Generation dropdown and select an option
          await publisherPage.page
            .locator("single-selector")
            .filter({ hasText: "? ? Product & Service Review" })
            .getByRole("button")
            .click();
          await publisherPage.page
            .getByRole("link", { name: "Coupon" })
            .click();
          // 7. Click Category dropdown and select a category
          await publisherPage.page.locator("#ui-select-search-input").click();
          await publisherPage.page
            .getByRole("link", { name: "General" })
            .click();
          // 8. Input Description <textarea>
          await publisherPage.page
            .locator("textarea")
            .fill(
              `This is a sample description property ${siteName} created by automated test.`,
            );
          // 9.Click on 'Create' button
          await publisherPage.page
            .getByRole("button", { name: "Create" })
            .click();
          // 10. Expect new site is visible in the site list
          await publisherPage.page
            .locator("td")
            .filter({ hasText: siteName })
            .waitFor({ state: "visible", timeout: 30000 });
        });

        test("Update Site", async () => {
          await publisherPage.page
            .locator("tr[role='row']")
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          // 1. Find a site with "A Test" in the name
          const testSiteRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Test/ });

          // Check if the site exists
          const rowCount = await testSiteRow.count();

          if (rowCount > 1) {
            const row = testSiteRow.first();

            // Get the site name from the row
            const siteNameCell = row
              .locator("td")
              .filter({ hasText: /A Test/ })
              .first();

            const siteNameBefore = await siteNameCell.textContent();

            // 2. Click the delete icon/button in the row
            await publisherPage.page
              .getByRole("link", { name: "chevron_right" })
              .nth(3)
              .first()
              .click();

            // 3. Click confirm delete button in the dialog
            await publisherPage.page
              .locator("div")
              .filter({ hasText: /^edit$/ })
              .first()
              .click();

            const newSiteName = siteNameBefore + " updated";

            // 2. Input Site Name
            await publisherPage.page
              .getByRole("textbox")
              .first()
              .fill(newSiteName);

            // 3. Input Site URL
            await publisherPage.page
              .locator('input[type="url"]')
              .fill(
                `https://www.google.com/${Math.floor(Math.random() * 1000)}`,
              );

            // 4. Click Type dropdown and select a type
            await publisherPage.page
              .locator("button[data-toggle='dropdown']")
              .first()
              .click();

            await publisherPage.page
              .getByRole("link", { name: "Media", exact: true })
              .click();

            // 5. Click Traffic dropdown and select a traffic source
            await publisherPage.page
              .locator("button[data-toggle='dropdown']")
              .nth(1)
              .click();
            await publisherPage.page
              .getByRole("link", { name: "Instagram" })
              .click();
            // 6. Click Lead Generation dropdown and select an option
            await publisherPage.page
              .locator("button[data-toggle='dropdown']")
              .nth(2)
              .click();

            await publisherPage.page
              .getByRole("link", { name: "Cashback" })
              .click();
            // 7. Click Category dropdown and select a category
            await publisherPage.page.locator("#ui-select-search-input").click();
            await publisherPage.page
              .getByRole("link", { name: "Stock" })
              .click();
            // 8. Input Description <textarea>
            await publisherPage.page
              .locator("textarea")
              .fill(
                `This is a sample description property ${newSiteName} by automated test.`,
              );
            // 9.Click on 'Update' button
            await publisherPage.page
              .getByRole("button", { name: "Update" })
              .click();

            // 10. Verify the site is no longer in the list
            await publisherPage.page
              .getByText(`name: ${newSiteName}`)
              .nth(1)
              .waitFor({ state: "visible", timeout: 30000 });
          }
        });

        test("Delete Site", async () => {
          await publisherPage.page
            .locator("tr[role='row']")
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          // 1. Find a site with "A Test" in the name
          const testSiteRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Test/ });

          // Check if the site exists
          const rowCount = await testSiteRow.count();

          if (rowCount > 1) {
            const row = testSiteRow.first();

            // Get the site name from the row
            const siteNameCell = row
              .locator("td")
              .filter({ hasText: /A Test/ })
              .first();

            const siteName = await siteNameCell.textContent();

            // 2. Click the delete icon/button in the row
            await publisherPage.page
              .locator("div")
              .filter({ hasText: /^delete$/ })
              .first()
              .click();

            // 3. Click confirm delete button in the dialog
            await publisherPage.page
              .getByRole("button", { name: /Delete/ })
              .click();

            await publisherPage.page
              .locator("tr[role='row']")
              .first()
              .waitFor({ state: "visible", timeout: 30000 });

            // 4. Verify the site is no longer in the list
            const deletedRow = publisherPage.page
              .locator("tr[role='row']")
              .filter({ hasText: siteName || /A Test/ });

            await expect(deletedRow).toHaveCount(0, { timeout: 15000 });
          }
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
