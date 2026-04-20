import { test, expect } from "@playwright/test";
import { CFDPage } from "../../pages/cfd-page";
import { CFD_PASSWORD, CFD_USERNAME } from "../../src/helpers/user-helper";

test.describe("CFD Login Tests", () => {
  test.describe.configure({ mode: "serial" });
  let cfdPage: CFDPage;

  test.beforeEach(async ({ page }) => {
    cfdPage = new CFDPage(page);

    await cfdPage.login(CFD_USERNAME, CFD_PASSWORD);

    await cfdPage.page.waitForLoadState("networkidle");
  });

  test("Dashboard - heading verification", async () => {
    const heading = await cfdPage.page.getByRole("heading", {
      name: "Executive Dashboard",
    });
    await expect(heading).toBeVisible();
  });
});
