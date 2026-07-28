import { test, expect } from "@playwright/test";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";
import { generateJWT } from "../../src/helpers/jwt-helper";
import { USER_UID, SECRET_KEY } from "../../src/helpers/user-helper";
import {
  logResponse,
  createPublisherHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/publishers/me/reports/conversion`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createPublisherHeaders(token);
const getRestrictedAuthHeaders = () => createPublisherHeaders(restrictedToken);

// TODO: replace with values that exist in the staging DB for this publisher
const VALID_SITE_ID = 102253;
const VALID_CAMPAIGN_ID = 966;
const VALID_INVOICE_NUMBER = "ATID202604-4";
const NON_EXISTING_SITE_ID = 999999999;
const NON_EXISTING_CAMPAIGN_ID = 999999999;

const defaultParams = () => ({
  fromDate: "2026-07-01",
  toDate: "2026-07-31",
  siteId: VALID_SITE_ID,
  campaignId: VALID_CAMPAIGN_ID,
  invoiceNumber: VALID_INVOICE_NUMBER,
  conversionStatuses: "APPROVED",
  periodBase: "CONVERSION_DATE",
  isPendingForMerchant: false,
  isMerchantPaymentApproved: false,
  customerType: "NEW",
});

const buildUrl = (
  params: Record<string, string | number | boolean | undefined>,
) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.append(key, String(value));
    }
  });
  return `${API_URL}?${query.toString()}`;
};

test.describe.skip("Find Publisher Conversion Reports API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Publisher Conversion Reports API method `GET /v1/publishers/me/reports/conversion`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Verify API basic connectivity and response structure with valid full params
   * 4. Missing required fromDate/toDate - Expect 400 Bad Request
   * 5. Invalid date range (fromDate > toDate) - Expect 400 Bad Request
   * 6. Filtering by siteId - Expect only conversions for the given siteId
   * 7. Filtering by campaignId - Expect only conversions for the given campaignId
   * 8. Filtering by invoiceNumber - Expect only conversions matching the invoice number
   * 9. Filtering by conversionStatuses - Expect only conversions with matching status
   * 10. Filtering by periodBase - Expect date filter applied against the selected base
   * 11. Filtering by isPendingForMerchant - Expect only conversions matching the flag
   * 12. Filtering by isMerchantPaymentApproved - Expect only conversions matching the flag
   * 13. Filtering by customerType - Expect only conversions matching the customer type
   * 14. Non-existing siteId/campaignId - Expect 200 OK with empty data
   * 15. Send 31 requests within 1 minute - Expect rate limit (429) triggered
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.get(buildUrl(defaultParams()), {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "publisher",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.get(buildUrl(defaultParams()), {
      headers: getRestrictedAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Verify API basic connectivity and response structure", async ({
    request,
  }) => {
    const res = await request.get(buildUrl(defaultParams()), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04a - Missing fromDate - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { fromDate, ...params } = defaultParams();
    const res = await request.get(buildUrl(params), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/fromDate|required/i);
  });

  test("TC_04b - Missing toDate - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { toDate, ...params } = defaultParams();
    const res = await request.get(buildUrl(params), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/toDate|required/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Invalid date range (fromDate > toDate) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({
        ...defaultParams(),
        fromDate: "2026-07-31",
        toDate: "2026-07-01",
      }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/fromDate|toDate|invalid|range/i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Filtering by siteId - Expect only conversions for given siteId", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), siteId: VALID_SITE_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        expect(item.siteId).toBe(VALID_SITE_ID);
      });
    }
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Filtering by campaignId - Expect only conversions for given campaignId", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), campaignId: VALID_CAMPAIGN_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        expect(item.campaignId).toBe(VALID_CAMPAIGN_ID);
      });
    }
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Filtering by invoiceNumber - Expect only conversions matching invoice number", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), invoiceNumber: VALID_INVOICE_NUMBER }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        expect(item.invoiceNumber).toBe(VALID_INVOICE_NUMBER);
      });
    }
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test("TC_09 - Filtering by conversionStatuses - Expect only conversions with matching status", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), conversionStatuses: "APPROVED" }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        expect(item.conversionStatus).toBe("APPROVED");
      });
    }
  });

  // ─── TC_10 ──────────────────────────────────────────────────────────────────
  test("TC_10 - Filtering by periodBase - Expect date filter applied against selected base", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), periodBase: "CLICK_DATE" }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_11 ──────────────────────────────────────────────────────────────────
  test("TC_11 - Filtering by isPendingForMerchant - Expect only conversions matching the flag", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), isPendingForMerchant: true }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        expect(item.isPendingForMerchant).toBe(true);
      });
    }
  });

  // ─── TC_12 ──────────────────────────────────────────────────────────────────
  test("TC_12 - Filtering by isMerchantPaymentApproved - Expect only conversions matching the flag", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), isMerchantPaymentApproved: true }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        expect(item.isMerchantPaymentApproved).toBe(true);
      });
    }
  });

  // ─── TC_13 ──────────────────────────────────────────────────────────────────
  test("TC_13 - Filtering by customerType - Expect only conversions matching the customer type", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), customerType: "NEW" }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        expect(item.customerType).toBe("NEW");
      });
    }
  });

  // ─── TC_14 ──────────────────────────────────────────────────────────────────
  test("TC_14a - Non-existing siteId - Expect 200 OK with empty data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), siteId: NON_EXISTING_SITE_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    expect(Array.isArray(items) ? items.length : 0).toBe(0);
  });

  test("TC_14b - Non-existing campaignId - Expect 200 OK with empty data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ ...defaultParams(), campaignId: NON_EXISTING_CAMPAIGN_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const items = (body as any)?.data ?? body;
    expect(Array.isArray(items) ? items.length : 0).toBe(0);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03.1 - Verify API basic connectivity and response structure", async ({
    request,
  }) => {
    const res = await request.get(buildUrl(defaultParams()), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_15 ──────────────────────────────────────────────────────────────────
  test("TC_15 - Send 31 requests within 1 minute - Expect rate limit (429) triggered", async ({
    request,
  }) => {
    const requests = Array.from({ length: 31 }, () =>
      request.get(buildUrl(defaultParams()), {
        headers: getAuthHeaders(),
      }),
    );
    const responses = await Promise.all(requests);

    console.log(
      "Response statuses:",
      responses.map((res) => res.status()),
    );

    const rateLimitedCount = responses.filter(
      (res) => res.status() === 429,
    ).length;
    expect(rateLimitedCount).toBeGreaterThan(0);
  });
});
