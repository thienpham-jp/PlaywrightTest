import { test, expect } from "@playwright/test";
import { generateJWT } from "../src/helpers/jwt-helper";
import { SECRET_KEY, USER_UID } from "../src/helpers/user-helper";
import { logResponse } from "./api/helpers/api-test-helper";

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

  test("Script Generated JWT token", async () => {
    // Generate the token
    const jwtToken = generateJWT(USER_UID, SECRET_KEY);

    const token = `Bearer ${jwtToken}`;
    console.log(token);
  });

  test("Get access token from Keycloak", async ({ request }) => {
    const response = await request.post(
      "https://dev-keycloak.asean-accesstrade.net/realms/indonesia-staging/protocol/openid-connect/token",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
          grant_type: "client_credentials",
          client_id: "cfd-client",
          client_secret: "crdjOikyQPEIPi6MmuITw52Ibi0nPHp3",
        },
      },
    );
    const body = await logResponse(response, false);
    expect(response.status()).toBe(200);

    const userID = "e9e16714-9c25-4c05-8da2-0fe553b89ca3";

    const res2 = await request.post(
      "https://dev-keycloak.asean-accesstrade.net/realms/indonesia-staging/protocol/openid-connect/token",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          client_id: "cfd-client",
          client_secret: "crdjOikyQPEIPi6MmuITw52Ibi0nPHp3",
          subject_token: body.access_token,
          requested_subject: userID,
        },
      },
    );
    const body2 = await logResponse(res2, false);
    console.log(body2.access_token);
    expect(res2.status()).toBe(200);
  });
});
