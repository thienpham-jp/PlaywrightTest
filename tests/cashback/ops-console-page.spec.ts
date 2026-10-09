import { test, expect } from "@playwright/test";
import { OpsConsolePage } from "../../pages/ops-console-page";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "../../src/helpers/user-helper";

test.describe("Ops Console Login", () => {
  const BASE_URL = "https://stag-ops-console-id.asean-accesstrade.net";
  let opsConsolePage: OpsConsolePage;

  test.beforeEach(async ({ page }) => {
    opsConsolePage = new OpsConsolePage(page);
  });

  test("Should display login form elements", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const usernameField = page.locator(opsConsolePage.usernameTextBox);
    const passwordField = page.locator(opsConsolePage.passwordTextBox);
    const signInButton = page.locator(opsConsolePage.signInButton);

    await expect(usernameField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(signInButton).toBeVisible();
  });

  test("Should login successfully with valid credentials", async ({}) => {
    const username = process.env.OPS_CONSOLE_USERNAME || ADMIN_USERNAME;
    const password = process.env.OPS_CONSOLE_PASSWORD || ADMIN_PASSWORD;

    await opsConsolePage.login(username, password);

    const heading = await opsConsolePage.page.getByRole("heading", {
      name: "Dashboard",
    });

    // Verify successful login by checking the visibility of the dashboard heading
    await expect(heading).toBeVisible();
  });

  test("Should fail login with invalid credentials", async () => {
    const username = "invalid_user";
    const password = "invalid_pass";

    await opsConsolePage.login(username, password);

    const errorMessage = await opsConsolePage.page.getByText(
      "Invalid username or password.",
    );
    await expect(errorMessage).toBeVisible();
  });

  test("Should display error message when user is not authorized", async () => {
    const username = "test_se";
    const password = "X0%eCa5M";

    await opsConsolePage.login(username, password);

    const errorMessage = opsConsolePage.page.getByText(
      /Contact an administrator./,
    );
    await expect(errorMessage).toBeVisible();
  });

  test("Should log out successfully", async () => {
    const username = process.env.OPS_CONSOLE_USERNAME || ADMIN_USERNAME;
    const password = process.env.OPS_CONSOLE_PASSWORD || ADMIN_PASSWORD;

    await opsConsolePage.login(username, password);

    const logoutButton = await opsConsolePage.page.getByRole("button", {
      name: "Log out",
    });
    await logoutButton.click();

    await expect(opsConsolePage.page).toHaveURL(`${BASE_URL}/login?logout`);
  });
});
