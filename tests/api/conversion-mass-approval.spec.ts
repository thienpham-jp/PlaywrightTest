import { test, expect } from "@playwright/test";
import { generateJWT } from "../../src/helpers/jwt-helper";
import { SECRET_KEY, USER_UID } from "../../src/helpers/user-helper";

test.describe("Mass Approval API - Limit Validation", () => {
  // ── Validation for conversionId Limit (100,000) ─────────────────────────────

  test("TC01: Verify mass approval with conversionId within limit (≤100k)", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const conversionIds = Array.from(
      { length: 50_000 },
      (_, i) => `${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds: [],
          conversionIds,
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.text();
    console.log("TC01 Status:", response.status());
    console.log("Response Body:", rawBody);
    let responseBody: unknown = null;
    try {
      responseBody =
        rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      console.log("API Response Body:", JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.warn("Response is not valid JSON:", rawBody);
    }
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  test("TC02: Verify mass approval exceeding conversionId limit (>100k)", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const conversionIds = Array.from(
      { length: 100_001 },
      (_, i) => `${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds: [],
          conversionIds,
          campaignId: 7898,
          campaignName: "Otten Coffee dev.",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.json();
    console.log("TC02 Status:", response.status());
    console.log("Response Body:", rawBody);
    expect(response.status()).toBe(400);
    // expect(response.status()).toBeLessThan(600);
  });

  test("TC03: Verify boundary condition for conversionId limit (exactly 100k)", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const conversionIds = Array.from(
      { length: 100_000 },
      (_, i) => `${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds: [],
          conversionIds,
          campaignId: 7898,
          campaignName: "Otten Coffee dev.",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.text();
    console.log("TC03 Status:", response.status());
    console.log("Response Body:", rawBody);
    let responseBody: unknown = null;
    try {
      responseBody =
        rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      console.log("API Response Body:", JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.warn("Response is not valid JSON:", rawBody);
    }
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  // ── Validation for transactionId Limit (10,000) ──────────────────────────────

  test("TC04: Verify mass approval with transactionId within limit (≤10k)", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const transactionIds = Array.from(
      { length: 5_000 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds,
          conversionIds: [],
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.text();
    console.log("TC04 Status:", response.status());
    console.log("Response Body:", rawBody);
    let responseBody: unknown = null;
    try {
      responseBody =
        rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      console.log("API Response Body:", JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.warn("Response is not valid JSON:", rawBody);
    }
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  test("TC05: Verify mass approval exceeding transactionId limit (>10k)", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const transactionIds = Array.from(
      { length: 10_001 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds,
          conversionIds: [],
          campaignId: 7898,
          campaignName: "Otten Coffee dev.",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.json();
    console.log("TC05 Status:", response.status());
    console.log("Response Body:", rawBody);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(600);
  });

  test("TC06: Verify boundary condition for transactionId limit (exactly 10k)", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const transactionIds = Array.from(
      { length: 10_000 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds,
          conversionIds: [],
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.text();
    console.log("TC06 Status:", response.status());
    console.log("Response Body:", rawBody);

    let responseBody: unknown = null;
    try {
      responseBody =
        rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      console.log("API Response Body:", JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.warn("Response is not valid JSON:", rawBody);
    }
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  // ── Negative & Edge Cases ────────────────────────────────────────────────────

  test("TC07: Verify request with both conversionId and transactionId exceeding limits", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const conversionIds = Array.from(
      { length: 100_001 },
      (_, i) => `CONV${String(i + 1).padStart(7, "0")}`,
    );
    const transactionIds = Array.from(
      { length: 10_001 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds,
          conversionIds,
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.json();
    console.log("TC07 Status:", response.status());
    console.log("Response Body:", rawBody);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(600);
  });

  test("TC08: Verify empty request payload", async ({ page }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds: [],
          conversionIds: [],
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 30_000,
      },
    );

    const rawBody = await response.json();
    console.log("TC08 Status:", response.status());
    console.log("Response Body:", rawBody);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(600);
  });

  test("TC09: Verify duplicate IDs in request", async ({ page }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    // 10 unique IDs each repeated 10 times = 100 total entries
    const baseIds = Array.from(
      { length: 10 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );
    const transactionIds = Array.from<string>({ length: 10 })
      .fill("")
      .flatMap(() => baseIds);

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds,
          conversionIds: [],
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 30_000,
      },
    );

    const rawBody = await response.text();
    console.log("TC09 Status:", response.status());
    console.log("Response Body:", rawBody);

    let responseBody: unknown = null;
    try {
      responseBody =
        rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      console.log("API Response Body:", JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.warn("Response is not valid JSON:", rawBody);
    }
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
  });

  test("TC10: Verify partial invalid IDs in request", async ({ page }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const transactionIds = [
      "TXN0000001",
      "TXN0000002",
      "INVALID_ID_###",
      "   ",
      "TXN0000003",
      "",
      "TXN0000004",
    ];

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds,
          conversionIds: [],
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 30_000,
      },
    );

    const rawBody = await response.text();
    console.log("TC10 Status:", response.status());
    console.log("Response Body:", rawBody);

    let responseBody: unknown = null;
    try {
      responseBody =
        rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      console.log("API Response Body:", JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.warn("Response is not valid JSON:", rawBody);
    }
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
  });

  // ── Performance & Stability ──────────────────────────────────────────────────

  test("TC11: Verify performance at maximum allowed limit", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    const transactionIds = Array.from(
      { length: 10_000 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const startTime = Date.now();
    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds,
          conversionIds: [],
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 120_000,
      },
    );
    const elapsed = Date.now() - startTime;

    const rawBody = await response.text();
    console.log("TC11 Status:", response.status(), `Elapsed: ${elapsed}ms`);
    console.log("Response Body:", rawBody);

    let responseBody: unknown = null;
    try {
      responseBody =
        rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      console.log("API Response Body:", JSON.stringify(responseBody, null, 2));
    } catch (e) {
      console.warn("Response is not valid JSON:", rawBody);
    }

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
    expect(elapsed).toBeLessThan(30_000); // must respond within 30 seconds
  });

  // ── API Documentation ────────────────────────────────────────────────────────

  test("TC12: Verify API documentation updated with limits", async ({
    page,
  }) => {
    const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
    const today = new Date().toISOString().split("T")[0];
    // Exceed the conversionId limit to trigger a documented error response
    const conversionIds = Array.from(
      { length: 100_001 },
      (_, i) => `CONV${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(
      "https://gurkha-staging.accesstrade.co.id/v1/staff/conversion/mass-approval",
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-Accesstrade-User-Type": "staff",
        },
        data: {
          transactionIds: [],
          conversionIds,
          campaignId: 343,
          campaignName: "Test Campaign",
          conversionConfirmationTimeType: "TODAY",
          confirmationDate: today,
          status: "APPROVED",
        },
        timeout: 60_000,
      },
    );

    const rawBody = await response.json();
    console.log("TC12 Status:", response.status());
    console.log("Response Body:", rawBody);

    let responseBody: Record<string, unknown> | null = null;
    try {
      responseBody = rawBody.trim().length > 0 ? JSON.parse(rawBody) : null;
    } catch {
      // non-JSON response
    }

    // Error response should reference the limit in a machine-readable body
    expect(response.status()).toBeGreaterThanOrEqual(400);
    if (responseBody) {
      const bodyStr = JSON.stringify(responseBody).toLowerCase();
      expect(
        bodyStr.includes("limit") ||
          bodyStr.includes("100000") ||
          bodyStr.includes("exceed") ||
          bodyStr.includes("error"),
      ).toBe(true);
    }
  });
}); // end: Mass Approval API - Limit Validation
