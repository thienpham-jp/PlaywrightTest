import { test, expect } from "@playwright/test";
import { createHmac } from "crypto";
import { SECRET_KEY, USER_UID } from "../src/helpers/user-helper";

/**
 * Base64 URL encode without padding
 */
function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateJWT(userUid: string, secretKey: string): string {
  // Current Unix timestamp in seconds
  const currentTime = Math.floor(Date.now() / 1000);

  // JWT Header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // JWT Payload (Claims)
  const payload = {
    sub: userUid,
    iat: currentTime,
  };

  // Encode header and payload
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

  // Create signature input
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // Generate signature using HMAC-SHA256
  const signatureEncoded = createHmac("sha256", secretKey)
    .update(signatureInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Combine all parts
  const jwtToken = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;

  return jwtToken;
}

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
    console.log("Generated JWT Token:", token);
  });

  test.afterEach(async ({ page }) => {
    if (page) {
      await page.close();
    }
  });
});
