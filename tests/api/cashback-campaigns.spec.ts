import { test, expect } from "@playwright/test";
import { logResponse } from "./helpers/api-test-helper";
import { generateCashbackAuthHeaders } from "../../src/helpers/jwt-helper";

const BASE_URL =
  process.env.CASHBACK_CAMPAIGNS_BASE_URL ||
  "https://stag-cashback-service-id.asean-accesstrade.net";

const ENDPOINT = "/v1/cashback/campaigns";
const ENDPOINT_1 = "/v1/cashback/auth/generate-auth-url";
const ENDPOINT_2 = "/v1/cashback/auth/verify-one-time-token";

let BearerToken = "";

test.describe("Cashback Campaigns API", () => {
  test.describe.configure({ mode: "parallel" });

  test.beforeAll(async ({ request }) => {
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
  test("TC01 - Get campaigns with valid tenantCode and view parameters", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "application/json",
        tenantCode: "techcom_bank",
      },
      params: {
        view: "top_brands",
        limit: 20,
      },
    });

    const body = await logResponse(response!, false);
    expect(response!.status()).toBe(200);
  });

  test("TC02 - Get campaigns with different view types", async ({
    request,
  }) => {
    const views = ["top_brands", "featured", "popular"];

    for (const view of views) {
      const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "application/json",
          tenantCode: "techcom_bank",
        },
        params: {
          view: view,
        },
      });

      // Expecting either 200 or 404 if view not supported
      expect([200, 404]).toContain(response!.status());
    }
  });

  // ── MISSING PARAMETERS ──────────────────────────────
  test("TC03 - Return campaigns when view is missing", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "application/json",
        tenantCode: "techcom_bank",
      },
    });

    await logResponse(response, false);
    expect([200, 400, 404]).toContain(response.status());
  });

  test("TC04 - Return error when tenantCode is missing", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "application/json",
      },
      params: {
        view: "top_brands",
      },
    });

    await logResponse(response, false);
    expect(response.status()).toBe(401);
  });

  // ── EMPTY/INVALID PARAMETERS ────────────────────────
  test("TC05 - Return error when view is empty", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "application/json",
        tenantCode: "techcom_bank",
      },
      params: {
        view: "",
      },
    });

    await logResponse(response, false);
    expect([200, 400, 404]).toContain(response.status());
  });

  test("TC06 - Return error when view is invalid", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "application/json",
        tenantCode: "techcom_bank",
      },
      params: {
        view: "INVALID_VIEW",
      },
    });

    await logResponse(response);
    expect([400, 404]).toContain(response.status());
  });

  // ── SPECIAL CHARACTERS & URL ENCODING ───────────────
  test("TC07 - Handle view parameter with special characters", async ({
    request,
  }) => {
    const invalidViews = ["top_brands@123", "view #1", "50% off"];

    for (const view of invalidViews) {
      const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "application/json",
          tenantCode: "techcom_bank",
        },
        params: {
          view: view,
        },
      });

      await logResponse(response, false);
      expect([200, 400, 404]).toContain(response.status());
    }
  });

  test("TC08 - Handle view parameter with spaces", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "application/json",
        tenantCode: "techcom_bank",
      },
      params: {
        view: "top brands",
      },
    });

    await logResponse(response, false);
    expect([200, 400, 404]).toContain(response.status());
  });

  // ── EDGE CASES ──────────────────────────────────────
  test("TC09 - Handle very long view parameter", async ({ request }) => {
    const longView = "a".repeat(500);
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "techcom_bank",
      },
      params: {
        view: longView,
      },
    });

    await logResponse(response, false);
    // API should either reject or handle gracefully
    expect([200, 400, 404, 414]).toContain(response.status());
  });

  test("TC10 - Handle single character view parameter", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "techcom_bank",
      },
      params: {
        view: "a",
      },
    });

    await logResponse(response, false);
    expect([200, 400, 404]).toContain(response.status());
  });

  // ── QUERY PARAMETER VARIATIONS ──────────────────────
  test("TC11 - Handle duplicate query parameters", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?view=top_brands&view=popular`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "techcom_bank",
        },
      },
    );

    await logResponse(response);
    // API should use first or reject
    expect([200, 400]).toContain(response.status());
  });

  test("TC12 - Handle extra query parameters", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "techcom_bank",
      },
      params: {
        view: "top_brands",
        page: "1",
        limit: "10",
      },
    });

    await logResponse(response, false);
    // API should ignore extra params or use them if supported
    expect([200, 400]).toContain(response.status());
  });

  // ── PAGINATION/FILTERING (if supported) ─────────────
  test("TC13 - Get campaigns with pagination", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?view=top_brands&page=1&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "application/json",
          tenantCode: "techcom_bank",
        },
      },
    );

    const body = await logResponse(response, false);
    expect(response.status()).toBe(200);
  });

  test("TC14 - Get campaigns with custom limit", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?view=top_brands&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "application/json",
          tenantCode: "techcom_bank",
        },
      },
    );

    const body = await logResponse(response, false);
    expect(response.status()).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(50);
  });

  // ── RESPONSE VALIDATION ─────────────────────────────
  test("TC15 - Response contains required campaign fields", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?view=top_brands`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "techcom_bank",
        },
      },
    );

    const body = await logResponse(response);
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("nextCursor");

    if (body.data && body.data.length > 0) {
      const campaign = body.data[0];
      expect(campaign).toHaveProperty("storeId");
      expect(campaign).toHaveProperty("name");
      expect(campaign).toHaveProperty("logoUrl");
      expect(campaign).toHaveProperty("categories");
      expect(campaign).toHaveProperty("rate");
      expect(campaign).toHaveProperty("platform");

      // Validate categories structure
      // if (Array.isArray(campaign.categories)) {
      //   campaign.categories.forEach((category) => {
      //     expect(category).toHaveProperty("id");
      //     expect(category).toHaveProperty("label");
      //   });
      // }
    }
  });

  // ── SERVER ERROR HANDLING ───────────────────────────
  test("TC16 - Handle server errors with retry", async ({ request }) => {
    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      response = await request.get(`${BASE_URL}${ENDPOINT}?view=top_brands`, {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          accept: "*/*",
          tenantCode: "techcom_bank",
        },
      });

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
  test("TC17 - POST request is not supported", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: {
        view: "top_brands",
      },
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "techcom_bank",
      },
    });

    await logResponse(response, false);
    expect([404, 405]).toContain(response.status());
  });

  test("TC18 - PUT request is not supported", async ({ request }) => {
    const response = await request.put(`${BASE_URL}${ENDPOINT}`, {
      data: {
        view: "top_brands",
      },
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "techcom_bank",
      },
    });

    await logResponse(response, false);
    expect([404, 405]).toContain(response.status());
  });

  test("TC19 - DELETE request is not supported", async ({ request }) => {
    const response = await request.delete(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${BearerToken}`,
        accept: "*/*",
        tenantCode: "techcom_bank",
      },
    });

    await logResponse(response, false);
    expect([404, 405]).toContain(response.status());
  });

  // ── SECURITY TESTING ────────────────────────────────
  test("TC20 - Handle potential SQL injection in view parameter", async ({
    request,
  }) => {
    const sqlInjection = "test' OR '1'='1";
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?view=${encodeURIComponent(sqlInjection)}`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          tenantCode: "techcom_bank",
        },
      },
    );

    await logResponse(response);
    // Should be safe - either return 200 or 400/404
    expect([200, 400, 404]).toContain(response!.status());
  });

  test("TC21 - Handle potential XSS in view parameter", async ({ request }) => {
    const xssPayload = "<script>alert('xss')</script>";
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?view=${encodeURIComponent(xssPayload)}`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          tenantCode: "techcom_bank",
        },
      },
    );

    await logResponse(response);
    // Should be safe
    expect([200, 400, 404]).toContain(response!.status());
  });

  test("TC22 - Handle view parameter with SQL injection attempt", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}${ENDPOINT}?view=top_brands'; DROP TABLE campaigns;--`,
      {
        headers: {
          Authorization: `Bearer ${BearerToken}`,
          tenantCode: "techcom_bank",
        },
      },
    );

    await logResponse(response);
    // Should safely reject or ignore
    expect([200, 400, 404]).toContain(response!.status());
  });
});
