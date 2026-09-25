import { test, expect } from "@playwright/test";
import { logResponse } from "./helpers/api-test-helper";
import { delay } from "./helpers/api-test-helper";
import { generateCashbackAuthHeaders } from "../../src/helpers/jwt-helper";

const BASE_URL =
  process.env.CASHBACK_API_BASE_URL ||
  "https://mobile-dev-gurkha-id.asean-accesstrade.net";

const ENDPOINT = "/v1/cashback/auth/generate-auth-url";

test.describe("Cashback Auth URL API", () => {
  /*
   ? Test Cases for Cashback Auth URL API method `POST /v1/cashback/auth/generate-auth-url`
   * Test summary to cover:
    - TC01: Happy path with valid userId and tenantCode
    - TC02: Missing required field userId
    - TC03: Missing required field tenantCode
    - TC04: Invalid/empty value for userId
    - TC05: Invalid/empty value for tenantCode  
    - TC06: Invalid/empty values for both userId and tenantCode
    - TC07: Invalid/empty values for all fields (userId and tenantCode)
    - TC08: Extra unexpected fields in the request body
    - TC09: Invalid HTTP method
    - TC10: Invalid headers (missing or incorrect clientId, timestamp, or checkSum)
    - TC11: Server error or unexpected response
    - TC12: Response time and performance testing
    - TC13: Edge cases and boundary testing
    - TC14: Security testing (e.g., SQL injection, XSS)
    - TC15: Combination of edge cases and security testing
    - TC16: Rate limiting and throttling testing
    - TC17: Internationalization and localization testing
    - TC18: Combination of all previous edge cases and stress testing
    - TC19: Combination of all previous edge cases and security testing
   */

  // ── HAPPY PATH ──────────────────────────────────────
  test.describe.configure({ mode: "parallel" });

  test("TC01 - Return auth URL valid with userId + tenantCode", async ({
    request,
  }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response, false);
    console.log(res.data.url);

    expect(response.status()).toBe(200);
    expect(res.data.url).toBeTruthy();
    expect(res.data.url).toContain("https://");
  });

  // ── MISSING REQUIRED FIELDS ─────────────────────────
  test("TC02 - Return error when userId is missing", async ({ request }) => {
    await delay();
    const body = {
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } =
      generateCashbackAuthHeaders("default_user");

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const body2 = await logResponse(response, false);

    expect(response.status()).toBe(400);
    expect(body2.message).toContain("userId");
  });

  test("TC03 - Return error when tenantCode is missing", async ({
    request,
  }) => {
    await delay();
    const body = {
      userId: "thien_pham",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const body2 = await logResponse(response, false);

    expect(response.status()).toBe(400);
    expect(body2.message).toContain("tenantCode");
  });

  // ── INVALID/EMPTY VALUES ────────────────────────────
  test("TC04 - Return error when userId is empty", async ({ request }) => {
    await delay();
    const body = {
      userId: "",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } =
      generateCashbackAuthHeaders("default");

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response);
    expect(response.status()).toBe(400);
  });

  test("TC05 - Return error when tenantCode is empty", async ({ request }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response);

    expect(response.status()).toBe(404);
  });

  test("TC06 - Return error when tenantCode does not exist", async ({
    request,
  }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "invalid_tenant_xyz",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response);
    expect(response.status()).toBe(404);
  });

  // ── AUTH HEADER VALIDATION ──────────────────────────
  test("TC07 - Return error when clientId is missing", async ({ request }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const { timestamp, checkSum } = generateCashbackAuthHeaders(body.userId);

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response);
    expect(response.status()).toBe(400);
  });

  test("TC08 - Return error when checkSum is invalid", async ({ request }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp } = generateCashbackAuthHeaders(body.userId);

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum: "invalid_checksum_12345",
      },
    });

    const res = await logResponse(response);
    expect(response.status()).toBe(401);
  });

  test("TC09 - Return error when timestamp is missing", async ({ request }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const { clientId, checkSum } = generateCashbackAuthHeaders(body.userId);

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        checkSum,
      },
    });

    const res = await logResponse(response);
    expect(response.status()).toBe(400);
  });

  test("TC10 - Return error when checkSum is calculated with a different userId", async ({
    request,
  }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    // Tính checkSum với userId khác
    const { clientId, timestamp, checkSum } =
      generateCashbackAuthHeaders("different_user");

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response);
    expect(response.status()).toBe(401);
  });

  // ── SPECIAL CHARACTERS & SQL INJECTION ──────────────
  test("TC11 - Handle userId with special characters", async ({ request }) => {
    await delay();
    const body = {
      userId: "user@example.com",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    // Nên accept hoặc reject với status code rõ ràng
    const res = await logResponse(response);
    expect([400]).toContain(response.status());
  });

  test("TC12 - Return error when userId contains SQL injection", async ({
    request,
  }) => {
    await delay();
    const body = {
      userId: "'; DROP TABLE users; --",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response);
    expect([400, 401]).toContain(response.status());
  });

  // ── RESPONSE VALIDATION ─────────────────────────────
  test.skip("TC13 - Response có đúng định dạng JSON", async ({ request }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    expect(response.ok()).toBeTruthy();
    const jsonBody = await response.json();
    expect(jsonBody).toHaveProperty("data");
    expect(jsonBody.data).toHaveProperty("url");
  });

  test.skip("TC14 - Returned URL chứa các parameters cần thiết", async ({
    request,
  }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    const res = await logResponse(response);

    // Kiểm tra URL có chứa các params như: userId, tenantCode, token, etc.
    console.log(res.data.url);
    expect(res.data.url).toContain("https://");
    expect(res.data.url).toContain("token");
  });

  // ── DIFFERENT TENANT CODES ──────────────────────────
  test.skip("TC15 - Hoạt động với nhiều tenant codes khác nhau", async ({
    request,
  }) => {
    await delay();
    const tenants = ["vp_bank", "mb_bank", "agribank"];

    for (const tenantCode of tenants) {
      const body = {
        userId: "test_user",
        tenantCode,
      };

      const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
        body.userId,
      );

      const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
        data: body,
        headers: {
          clientId,
          timestamp,
          checkSum,
        },
      });

      if (response.ok()) {
        const jsonBody = await response.json();
        expect(jsonBody.data.url).toBeTruthy();
        console.log(`✓ ${tenantCode}: ${jsonBody.data.url}`);
      }
    }
  });

  // ── HTTP METHOD VALIDATION ──────────────────────────
  test("TC16 - GET request không được hỗ trợ", async ({ request }) => {
    await delay();
    const response = await request.get(`${BASE_URL}${ENDPOINT}`);
    expect([404]).toContain(response.status());
  });

  test("TC17 - PUT request không được hỗ trợ", async ({ request }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const response = await request.put(`${BASE_URL}${ENDPOINT}`, {
      data: body,
    });

    const res = await logResponse(response);

    expect([404]).toContain(response.status());
  });

  // ── EDGE CASES ──────────────────────────────────────
  test.skip("TC18 - userId với độ dài lớn", async ({ request }) => {
    await delay();
    const longUserId = "a".repeat(500);
    const body = {
      userId: longUserId,
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } =
      generateCashbackAuthHeaders(longUserId);

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    // Nên có limit hoặc validation
    expect([200, 400]).toContain(response.status());
  });

  test.skip("TC19 - Cùng userId nhưng request lần thứ 2 với timestamp cũ", async ({
    request,
  }) => {
    await delay();
    const body = {
      userId: "thien_pham",
      tenantCode: "vp_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    // Request đầu tiên
    const response1 = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    expect(response1.status()).toBe(200);

    // Request lần 2 với cùng timestamp (có thể bị reject nếu có anti-replay)
    const response2 = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: body,
      headers: {
        clientId,
        timestamp,
        checkSum,
      },
    });

    // Nên check xem có anti-replay protection hay không
    console.log(`Request 2 status: ${response2.status()}`);
  });
});
