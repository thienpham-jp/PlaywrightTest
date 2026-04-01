import { test, expect } from "@playwright/test";
import { IstoolsPage } from "../../pages/istools-page";
import testData from "./istoolsTestData.json";

test.describe("Istools Tests", () => {
  let istoolsPage: IstoolsPage;

  test.beforeEach(async ({ page }) => {
    istoolsPage = new IstoolsPage(page);
    await istoolsPage.open();
  });

  for (const data of testData) {
    test(data.label, async ({ page }) => {
      await istoolsPage.login(data.username, data.password);

      await expect(page).toHaveURL(data.expectedUrl);

      if (data.expectedError) {
        const errorMessage = await istoolsPage.getErrorMessage();
        expect(errorMessage).toContain(data.expectedError);
      }
    });
  }

  test.afterEach(async ({ page }) => {
    if (page) {
      await page.close();
    }
  });
});
