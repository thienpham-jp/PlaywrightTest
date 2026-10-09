import { test, expect } from "@playwright/test";
import {
  copyToClipboard,
  generateCashbackAuthHeaders,
  generateJWT,
} from "../src/helpers/jwt-helper";
import { SECRET_KEY, USER_UID } from "../src/helpers/user-helper";
import { logResponse } from "./api/helpers/api-test-helper";

const BASE_URL =
  process.env.CASHBACK_API_BASE_URL ||
  "https://mobile-dev-gurkha-id.asean-accesstrade.net";

const ENDPOINT_1 = "/v1/cashback/auth/generate-auth-url";
const ENDPOINT_2 = "/v1/cashback/auth/verify-one-time-token";

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

  test("Get token BFF Cashback service", async ({ request }) => {
    let token;
    const body = {
      userId: "thien_pham",
      tenantCode: "techcom_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
      body.tenantCode,
    );

    // Step 1: Get auth URL with retry on 503
    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      response = await request.post(`${BASE_URL}${ENDPOINT_1}`, {
        data: body,
        headers: {
          clientId,
          timestamp,
          checkSum,
        },
      });

      if (response.status() !== 503) {
        break;
      }

      retries++;
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const res = await logResponse(response!, false);
    expect(response!.status()).toBe(200);

    const url = res.data.url;
    token = url.split("token=")[1];

    // console.log(token);

    // Step 2: Verify token with retry on 503
    let response2;
    let retries2 = 0;

    while (retries2 < maxRetries) {
      response2 = await request.post(`${BASE_URL}${ENDPOINT_2}`, {
        headers: {
          "Content-Type": "application/json",
          clientId: "cash-back-client",
        },
        data: {
          oneTimeToken: token,
        },
      });

      if (response2.status() !== 503) {
        break;
      }

      retries2++;
      if (retries2 < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const body2 = await logResponse(response2!, false);
    console.log(body2.token);
    copyToClipboard(body2.token);
    expect(response2!.status()).toBe(200);
  });
});
