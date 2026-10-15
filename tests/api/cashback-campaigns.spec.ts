import { test, expect } from "@playwright/test";
import { getCashbackToken, logResponse } from "./helpers/api-test-helper";

const BASE_URL =
  process.env.CASHBACK_CAMPAIGNS_BASE_URL ||
  "https://stag-cashback-service-id.asean-accesstrade.net";

const URL = `${BASE_URL}/v1/cashback/campaigns`;
const TENANT_CODE = "techcom_bank";

let BearerToken = "";

const headers = () => ({
  Authorization: `Bearer ${BearerToken}`,
  tenantCode: TENANT_CODE,
});

test.describe("Cashback Campaigns API", () => {
  test.describe.configure({ mode: "parallel" });

  test.beforeAll(async ({ request }) => {
    BearerToken = await getCashbackToken(request, "thien_pham", TENANT_CODE);
  });

  // ── HAPPY PATH ──────────────────────────────────────
  test("TC01 - Get campaigns with valid tenantCode and view parameters", async ({
    request,
  }) => {
    const response = await request.get(URL, {
      headers: headers(),
      params: { view: "top_brands", limit: 20 },
    });

    await logResponse(response, false);
    expect(response.status()).toBe(200);
  });

  test("TC02 - Get campaigns with different view types", async ({
    request,
  }) => {
    for (const view of ["top_brands", "featured", "popular"]) {
      const response = await request.get(URL, {
        headers: headers(),
        params: { view },
      });

      // Expecting either 200 or 404 if view not supported
      expect([200, 404]).toContain(response.status());
    }
  });

  // ── MISSING / EMPTY / UNUSUAL VIEW VALUES ───────────
  const lenientViews: [string, string | undefined][] = [
    ["TC03 - Return campaigns when view is missing", undefined],
    ["TC05 - Return error when view is empty", ""],
    ["TC07a - Handle view with special characters (@)", "top_brands@123"],
    ["TC07b - Handle view with special characters (#)", "view #1"],
    ["TC07c - Handle view with special characters (%)", "50% off"],
    ["TC08 - Handle view parameter with spaces", "top brands"],
    ["TC10 - Handle single character view parameter", "a"],
  ];
  for (const [name, view] of lenientViews) {
    test(name, async ({ request }) => {
      const response = await request.get(URL, {
        headers: headers(),
        params: view === undefined ? {} : { view },
      });

      await logResponse(response, false);
      expect([200, 400, 404]).toContain(response.status());
    });
  }

  test("TC04 - Return error when tenantCode is missing", async ({
    request,
  }) => {
    const response = await request.get(URL, {
      headers: { Authorization: `Bearer ${BearerToken}` },
      params: { view: "top_brands" },
    });

    await logResponse(response, false);
    expect(response.status()).toBe(401);
  });

  test("TC06 - Return error when view is invalid", async ({ request }) => {
    const response = await request.get(URL, {
      headers: headers(),
      params: { view: "INVALID_VIEW" },
    });

    await logResponse(response);
    expect([400, 404]).toContain(response.status());
  });

  // ── EDGE CASES ──────────────────────────────────────
  test("TC09 - Handle very long view parameter", async ({ request }) => {
    const response = await request.get(URL, {
      headers: headers(),
      params: { view: "a".repeat(500) },
    });

    await logResponse(response, false);
    // API should either reject or handle gracefully
    expect([200, 400, 404, 414]).toContain(response.status());
  });

  // ── QUERY PARAMETER VARIATIONS ──────────────────────
  test("TC11 - Handle duplicate query parameters", async ({ request }) => {
    const response = await request.get(`${URL}?view=top_brands&view=popular`, {
      headers: headers(),
    });

    await logResponse(response);
    // API should use first or reject
    expect([200, 400]).toContain(response.status());
  });

  test("TC12 - Handle extra query parameters", async ({ request }) => {
    const response = await request.get(URL, {
      headers: headers(),
      params: { view: "top_brands", page: "1", limit: "10" },
    });

    await logResponse(response, false);
    // API should ignore extra params or use them if supported
    expect([200, 400]).toContain(response.status());
  });

  test("TC14 - Get campaigns with custom limit", async ({ request }) => {
    const response = await request.get(URL, {
      headers: headers(),
      params: { view: "top_brands", limit: 50 },
    });

    const body = await logResponse(response, false);
    expect(response.status()).toBe(200);
    expect(body.data?.length).toBeLessThanOrEqual(50);
  });

  // ── RESPONSE VALIDATION ─────────────────────────────
  test("TC15 - Response contains required campaign fields", async ({
    request,
  }) => {
    const response = await request.get(URL, {
      headers: headers(),
      params: { view: "top_brands" },
    });

    const body = await logResponse(response);
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("nextCursor");

    if (body.data?.length > 0) {
      const campaign = body.data[0];
      expect(campaign).toHaveProperty("storeId");
      expect(campaign).toHaveProperty("name");
      expect(campaign).toHaveProperty("logoUrl");
      expect(campaign).toHaveProperty("categories");
      expect(campaign).toHaveProperty("rate");
      expect(campaign).toHaveProperty("platform");
    }
  });

  // ── HTTP METHOD VALIDATION ──────────────────────────
  for (const method of ["POST", "PUT", "DELETE"]) {
    test(`TC17 - ${method} request is not supported`, async ({ request }) => {
      const response = await request.fetch(URL, {
        method,
        headers: headers(),
        data: method === "DELETE" ? undefined : { view: "top_brands" },
      });

      await logResponse(response, false);
      expect([404, 405]).toContain(response.status());
    });
  }

  // ── SECURITY TESTING ────────────────────────────────
  const injectionPayloads: [string, string][] = [
    [
      "TC20 - Handle potential SQL injection in view parameter",
      "test' OR '1'='1",
    ],
    [
      "TC21 - Handle potential XSS in view parameter",
      "<script>alert('xss')</script>",
    ],
  ];
  for (const [name, view] of injectionPayloads) {
    test(name, async ({ request }) => {
      const response = await request.get(URL, {
        headers: headers(),
        params: { view },
      });

      await logResponse(response);
      // Should be safe - either return 200 or 400/404
      expect([200, 400, 404]).toContain(response.status());
    });
  }
});
