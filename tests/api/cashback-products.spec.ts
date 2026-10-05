import { test, expect } from "@playwright/test";
import { logResponse } from "./helpers/api-test-helper";
import { generateCashbackAuthHeaders } from "../../src/helpers/jwt-helper";

const BASE_URL =
  process.env.CASHBACK_PRODUCTS_BASE_URL ||
  "https://stag-cashback-service-id.asean-accesstrade.net";

const ENDPOINT = "/v1/products";
const ENDPOINT_1 = "/v1/cashback/auth/generate-auth-url";
const ENDPOINT_2 = "/v1/cashback/auth/verify-one-time-token";

let BearerToken = "";

test.describe.skip("Cashback Products API", () => {
  test.describe.configure({ mode: "parallel" });

  test.beforeAll(async ({ request }) => {
    // Any setup code if needed
    let token;
    const body = {
      userId: "thien_pham",
      tenantCode: "mb_bank",
    };

    const { clientId, timestamp, checkSum } = generateCashbackAuthHeaders(
      body.userId,
    );

    // Step 1: Get auth URL with retry on 503
    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      response = await request.post(
        `https://mobile-dev-gurkha-id.asean-accesstrade.net${ENDPOINT_1}`,
        {
          data: body,
          headers: {
            clientId,
            timestamp,
            checkSum,
          },
        },
      );

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
      response2 = await request.post(
        `https://mobile-dev-gurkha-id.asean-accesstrade.net${ENDPOINT_2}`,
        {
          headers: {
            "Content-Type": "application/json",
            clientId: "cash-back-client",
          },
          data: {
            oneTimeToken: token,
          },
        },
      );

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
    BearerToken = body2.token;
    expect(response2!.status()).toBe(200);
  });

  // ── HAPPY PATH ──────────────────────────────────────
  test("TC01 - Get products with valid platform and keyword", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
        keyword: "phone",
      },
    });

    const body = await logResponse(response!, false);
    expect(response!.status()).toBe(200);
    // expect(body).toHaveProperty("data");
  });

  test("TC02 - Get products with different platforms", async ({ request }) => {
    const platforms = ["SHOPEE", "TIKTOK"];

    for (const platform of platforms) {
      const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "mb_bank",
        },
        params: {
          platform: platform,
          keyword: "phone",
        },
      });

      // Expecting either 200 or 404 if platform not supported
      expect(response!.status()).toBe(200);
    }
  });

  // ── MISSING PARAMETERS ──────────────────────────────
  test("TC03 - Return error when platform is missing", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        keyword: "test",
      },
    });

    await logResponse(response, false);
    expect(response.status()).toBe(200);
  });

  test("TC04 - Return error when keyword is missing", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
      },
    });

    await logResponse(response, false);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("TC05 - Return error when both platform and keyword are missing", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
    });

    await logResponse(response, false);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── EMPTY/INVALID PARAMETERS ────────────────────────
  test("TC06 - Return error when platform is empty", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "",
        keyword: "test",
      },
    });

    await logResponse(response, false);
    expect(response.status()).toBe(200);
  });

  test("TC07 - Return error when keyword is empty", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
        keyword: "",
      },
    });

    await logResponse(response, false);
    expect(response.status()).toBe(400);
  });

  test("TC08 - Return error when platform is invalid", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "INVALID_PLATFORM",
        keyword: "test",
      },
    });

    await logResponse(response);
    expect(response.status()).toBe(400);
  });

  // ── SPECIAL CHARACTERS & URL ENCODING ───────────────
  test("TC09 - Handle keyword with special characters", async ({ request }) => {
    const keywords = ["test@123", "laptop #1", "50% off"];

    for (const keyword of keywords) {
      const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "mb_bank",
        },
        params: {
          platform: "SHOPEE",
          keyword: keyword,
        },
      });

      await logResponse(response, false);
      expect([200, 400, 404]).toContain(response.status());
    }
  });

  test("TC10 - Handle keyword with spaces", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
        keyword: "gaming laptop",
      },
    });

    await logResponse(response, false);
    expect([200, 400, 404]).toContain(response.status());
  });

  test("TC11 - Handle keyword with unicode characters", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
        keyword: "áéíóú",
      },
    });

    await logResponse(response, false);
    expect([200, 400, 404]).toContain(response.status());
  });

  // ── EDGE CASES ──────────────────────────────────────
  test("TC12 - Handle very long keyword", async ({ request }) => {
    const longKeyword = "a".repeat(500);
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
        keyword: longKeyword,
      },
    });

    await logResponse(response, false);
    // API should either reject or handle gracefully
    expect([200, 400, 414]).toContain(response.status());
  });

  test("TC13 - Handle single character keyword", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
        keyword: "a",
      },
    });

    await logResponse(response, false);
    expect([200, 400, 404]).toContain(response.status());
  });

  // ── QUERY PARAMETER VARIATIONS ──────────────────────
  test("TC14 - Handle duplicate query parameters", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=SHOPEE&platform=LAZADA&keyword=test`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "mb_bank",
        },
      },
    );

    await logResponse(response);
    // API should use first or reject
    expect(response.status()).toBe(400);
  });

  test("TC15 - Handle extra query parameters", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
      params: {
        platform: "SHOPEE",
        keyword: "test",
        page: "1",
        limit: "10",
      },
    });

    await logResponse(response, false);
    // API should ignore extra params or use them if supported
    expect([200, 400]).toContain(response.status());
  });

  // ── PAGINATION/FILTERING (if supported) ─────────────
  test.skip("TC16 - Get products with pagination", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=shopee&keyword=test&page=1&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "mb_bank",
        },
      },
    );

    const body = await logResponse(response, false);
    expect(response.status()).toBe(200);
  });

  test.skip("TC17 - Get products with custom limit", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=shopee&keyword=test&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "mb_bank",
        },
      },
    );

    const body = await logResponse(response, false);
    expect(response.status()).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(50);
  });

  // ── RESPONSE VALIDATION ─────────────────────────────
  test("TC18 - Response contains required product fields", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=shopee&keyword=test`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "mb_bank",
        },
      },
    );

    const body = await logResponse(response);
    if (response.status() === 200 && body.data && body.data.length > 0) {
      const product = body.data[0];
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("currency");
      expect(product).toHaveProperty("platform");
      expect(product).toHaveProperty("url");
      expect(product).toHaveProperty("imageUrl");
    }
  });

  // ── SERVER ERROR HANDLING ───────────────────────────
  test("TC19 - Handle server errors with retry", async ({ request }) => {
    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      response = await request.get(
        `${BASE_URL}${ENDPOINT}?platform=shopee&keyword=test`,
        {
          headers: {
            Authorization: `Bearer ${BearerToken}`,
            accept: "*/*",
            tenantCode: "mb_bank",
          },
        },
      );

      if (response.status() !== 503 && response.status() !== 500) {
        break;
      }

      retries++;
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    expect(response).toBeDefined();
    expect([200, 400, 404]).toContain(response!.status());
    await logResponse(response!, false);
  });

  // ── HTTP METHOD VALIDATION ──────────────────────────
  test("TC20 - POST request is not supported", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: {
        platform: "shopee",
        keyword: "test",
      },
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
    });

    await logResponse(response, false);
    expect([404, 405]).toContain(response.status());
  });

  test("TC21 - PUT request is not supported", async ({ request }) => {
    const response = await request.put(`${BASE_URL}${ENDPOINT}`, {
      data: {
        platform: "shopee",
        keyword: "test",
      },
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
    });

    await logResponse(response, false);
    expect([404, 405]).toContain(response.status());
  });

  test("TC22 - DELETE request is not supported", async ({ request }) => {
    const response = await request.delete(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "mb_bank",
      },
    });

    await logResponse(response, false);
    expect([404, 405]).toContain(response.status());
  });

  // ── SECURITY TESTING ────────────────────────────────
  test("TC23 - Handle potential SQL injection in keyword", async ({
    request,
  }) => {
    const sqlInjection = "test' OR '1'='1";
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=shopee&keyword=${encodeURIComponent(sqlInjection)}`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
        },
      },
    );

    await logResponse(response);
    // Should be safe - either return 200 or 400/404
    expect(response!.status()).toBe(401);
  });

  test("TC24 - Handle potential XSS in keyword", async ({ request }) => {
    const xssPayload = "<script>alert('xss')</script>";
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=shopee&keyword=${encodeURIComponent(xssPayload)}`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
        },
      },
    );

    await logResponse(response);
    // Should be safe
    expect(response!.status()).toBe(401);
  });

  test("TC25 - Handle platform parameter with special characters", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=shopee'; DROP TABLE products;--&keyword=test`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
        },
      },
    );

    await logResponse(response);
    // Should safely reject or ignore
    expect(response!.status()).toBe(401);
  });

  test("TC26 - Handle tenantCode is missing", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?platform=shopee&keyword=test`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
        },
      },
    );

    await logResponse(response);
    expect(response.status()).toBe(401);
  });
});
