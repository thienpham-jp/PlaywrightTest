import { test, expect, APIRequestContext } from "@playwright/test";
import { delay, logResponse } from "./helpers/api-test-helper";
import {
  copyToClipboard,
  generateCashbackAuthHeaders,
} from "../../src/helpers/jwt-helper";

const BASE_URL =
  process.env.CASHBACK_API_BASE_URL ||
  "https://mobile-dev-gurkha-id.asean-accesstrade.net";

const URL = `${BASE_URL}/v1/cashback/auth/generate-auth-url`;

type Body = { userId?: string; tenantCode?: string };

// Signs with body.userId (or "default") + body.tenantCode unless headers are given.
const methodSend = (
  request: APIRequestContext,
  data: Body,
  headers: Record<string, string> = generateCashbackAuthHeaders(
    data.userId ?? "default",
    data.tenantCode,
  ),
) => request.post(URL, { data, headers });

test.describe.skip("Cashback Auth URL API", () => {
  // retries also cover transient 503s from the dev server
  test.describe.configure({ mode: "parallel", retries: 5 });
  test.beforeEach(() => delay());

  // ── HAPPY PATH ──────────────────────────────────────
  test("TC01 - Return auth URL valid with userId + tenantCode", async ({
    request,
  }) => {
    const body = {
      userId: "thien_pham",
      tenantCode: "techcom_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
      body.tenantCode,
    );

    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      response = await request.post(URL, {
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
        await delay();
      }
    }

    const res = await logResponse(response!, false);
    const url = res.data.url;
    copyToClipboard(url);

    expect(response?.status()).toBe(200);
    expect(url).toBeTruthy();
    expect(url).toContain("https://");
  });

  // ── MISSING REQUIRED FIELDS ─────────────────────────
  test("TC02 - Return error when userId is missing", async ({ request }) => {
    const response = await methodSend(request, { tenantCode: "vp_bank" });

    const body = await logResponse(response, false);
    expect(response.status()).toBe(400);
    expect(body.message).toContain("userId");
  });

  test("TC03 - Return error when tenantCode is missing", async ({
    request,
  }) => {
    const response = await methodSend(request, { userId: "thien_pham" });

    const body = await logResponse(response, false);
    expect(response.status()).toBe(400);
    expect(body.message).toContain("tenantCode");
  });

  // ── INVALID/EMPTY VALUES ────────────────────────────
  test("TC04 - Return error when userId is empty", async ({ request }) => {
    const response = await methodSend(request, {
      userId: "",
      tenantCode: "vp_bank",
    });

    await logResponse(response);
    expect(response.status()).toBe(400);
  });

  test("TC05 - Return error when tenantCode is empty", async ({ request }) => {
    const response = await methodSend(request, {
      userId: "thien_pham",
      tenantCode: "",
    });

    await logResponse(response);
    expect(response.status()).toBe(404);
  });

  test("TC06 - Return error when tenantCode does not exist", async ({
    request,
  }) => {
    // Unknown tenant has no secret, so sign with the default one
    const response = await methodSend(
      request,
      { userId: "thien_pham", tenantCode: "invalid_tenant_xyz" },
      generateCashbackAuthHeaders("thien_pham"),
    );

    await logResponse(response);
    expect(response.status()).toBe(404);
  });

  // ── AUTH HEADER VALIDATION ──────────────────────────
  const validBody = { userId: "thien_pham", tenantCode: "vp_bank" };

  test("TC07 - Return error when clientId is missing", async ({ request }) => {
    const { clientId, ...headers } = generateCashbackAuthHeaders(
      validBody.userId,
      validBody.tenantCode,
    );
    const response = await methodSend(request, validBody, headers);

    await logResponse(response);
    expect(response.status()).toBe(400);
  });

  test("TC08 - Return error when checkSum is invalid", async ({ request }) => {
    const response = await methodSend(request, validBody, {
      ...generateCashbackAuthHeaders(validBody.userId, validBody.tenantCode),
      checkSum: "invalid_checksum_12345",
    });

    await logResponse(response, false);
    expect(response.status()).toBe(401);
  });

  test("TC09 - Return error when timestamp is missing", async ({ request }) => {
    const { timestamp, ...headers } = generateCashbackAuthHeaders(
      validBody.userId,
      validBody.tenantCode,
    );
    const response = await methodSend(request, validBody, headers);

    await logResponse(response);
    expect(response.status()).toBe(400);
  });

  test("TC10 - Return error when checkSum is calculated with a different userId", async ({
    request,
  }) => {
    const response = await methodSend(
      request,
      validBody,
      generateCashbackAuthHeaders("different_user", validBody.tenantCode),
    );

    await logResponse(response);
    expect(response.status()).toBe(401);
  });

  // ── SPECIAL CHARACTERS & SQL INJECTION ──────────────
  test("TC11 - Handle userId with special characters", async ({ request }) => {
    const response = await methodSend(request, {
      userId: "user@example.com",
      tenantCode: "vp_bank",
    });

    await logResponse(response);
    expect(response.status()).toBe(400);
  });

  test("TC12 - Return error when userId contains SQL injection", async ({
    request,
  }) => {
    const response = await methodSend(request, {
      userId: "'; DROP TABLE users; --",
      tenantCode: "vp_bank",
    });

    await logResponse(response);
    expect([400, 401]).toContain(response.status());
  });

  // ── RESPONSE VALIDATION ─────────────────────────────
  test.skip("TC13 - Response is in the correct JSON format", async ({
    request,
  }) => {
    const response = await methodSend(request, validBody);

    expect(response.ok()).toBeTruthy();
    const jsonBody = await response.json();
    expect(jsonBody).toHaveProperty("data");
    expect(jsonBody.data).toHaveProperty("url");
  });

  test.skip("TC14 - Returned URL contains the necessary parameters", async ({
    request,
  }) => {
    const res = await logResponse(await methodSend(request, validBody));

    expect(res.data.url).toContain("https://");
    expect(res.data.url).toContain("token");
  });

  // ── DIFFERENT TENANT CODES ──────────────────────────
  test.skip("TC15 - Works with different tenant codes", async ({ request }) => {
    for (const tenantCode of ["vp_bank", "mb_bank", "agribank"]) {
      const response = await methodSend(request, {
        userId: "test_user",
        tenantCode,
      });

      if (response.ok()) {
        const jsonBody = await response.json();
        expect(jsonBody.data.url).toBeTruthy();
        console.log(`✓ ${tenantCode}: ${jsonBody.data.url}`);
      }
    }
  });

  // ── HTTP METHOD VALIDATION ──────────────────────────
  test("TC16 - GET request is not supported", async ({ request }) => {
    const response = await request.get(URL);
    expect(response.status()).toBe(404);
  });

  test("TC17 - PUT request is not supported", async ({ request }) => {
    const response = await request.put(URL, { data: validBody });

    await logResponse(response);
    expect(response.status()).toBe(404);
  });

  // ── EDGE CASES ──────────────────────────────────────
  test.skip("TC18 - userId with a large length", async ({ request }) => {
    const response = await methodSend(request, {
      userId: "a".repeat(500),
      tenantCode: "vp_bank",
    });

    // Nên có limit hoặc validation
    expect([200, 400]).toContain(response.status());
  });

  test.skip("TC19 - Same userId but the 2nd request with an old timestamp", async ({
    request,
  }) => {
    const headers = generateCashbackAuthHeaders(
      validBody.userId,
      validBody.tenantCode,
    );

    const response1 = await methodSend(request, validBody, headers);
    expect(response1.status()).toBe(200);

    // Request lần 2 với cùng timestamp (có thể bị reject nếu có anti-replay)
    const response2 = await methodSend(request, validBody, headers);
    console.log(`Request 2 status: ${response2.status()}`);
  });
});
