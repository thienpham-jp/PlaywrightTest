import { test, expect } from "@playwright/test";
import { generateJWT } from "../src/helpers/jwt-helper";
import { SECRET_KEY, USER_UID } from "../src/helpers/user-helper";

test.describe("Example Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("https://playwright.dev/");
  });

  test("has title", async ({ page }) => {
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Playwright/);
  });

  test("get started link", async ({ page }) => {
    // Click the get started link.
    await page.getByRole("link", { name: "Get started" }).click();

    // Expects page to have a heading with the name of Installation.
    await expect(
      page.getByRole("heading", { name: "Installation" }),
    ).toBeVisible();
    await page.close();
  });

  test("Script Generated JWT token", async ({ page }) => {
    // Generate the token
    const jwtToken = generateJWT(USER_UID, SECRET_KEY);

    const token = `Bearer ${jwtToken}`;
    console.log(token);
  });
});
