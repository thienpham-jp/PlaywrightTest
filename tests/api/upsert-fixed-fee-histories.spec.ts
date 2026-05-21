import { test, expect, APIResponse } from "@playwright/test";
import {
  randomEmail,
  randomFloat,
  randomInt,
  randomPhoneNumber,
  randomString,
  randomURL,
} from "../../src/helpers/function-helper";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";
import { generateJWT } from "../../src/helpers/jwt-helper";

const baseURL = urlStagingAPI("VN");

const API_URL = `${baseURL}/v1/staff/campaigns/fixed-fee-histories/upsert`;

const USER_UID = "llt5mqx11xxl291lta91aqaaaalxxq67";
const SECRET_KEY = "8qbcc2zzzzbz0ezs20e9jjz90cbxls22";

// Staff user without access to the campaign's country (replace with actual restricted account)
const RESTRICTED_USER_UID = "restricted_user_uid_placeholder";
const RESTRICTED_SECRET_KEY = "restricted_secret_key_placeholder";

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "X-Accesstrade-User-Type": "staff",
  Authorization: token,
});

const getRestrictedAuthHeaders = () => ({
  "Content-Type": "application/json",
  "X-Accesstrade-User-Type": "staff",
  Authorization: restrictedToken,
});

const logResponse = async (res: APIResponse) => {
  let responseBody: unknown = null;
  try {
    const rawBody = await res.text();
    responseBody =
      rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    console.log(JSON.stringify(responseBody, null, 2));
  } catch (error) {
    console.error("Failed to parse response body as JSON:", error);
    responseBody = await res.text(); // Fallback to raw text if JSON parsing fails
  }
  return responseBody;
};

const validPayload = () => ({
  campaignId: randomInt(3677, 3749), // Replace with actual campaign IDs from staging
  transactionId: 908,
  targetMonth: "2024/12",
  fixedFeeId: 5,
  feeAmount: randomFloat(1000, 10000, 2),
  description: `Test upsert ${randomString(5)}`,
  upsertedBy: "obs-dev@interspace.ne.jp",
});

test.describe("Upsert Fixed Fee Histories API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Upsert Fixed Fee Histories API method `POST /v1/staff/campaigns/fixed-fee-histories/upsert`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Validation error when required fields are missing or invalid
   * 4. Successful upsert of fixed fee history with missing transactionId - Expect 200 OK value 1,
   * 5. Successful update of full fee history when transactionId is provided and exists - Expect 200 OK value 1,
   * 6. Upsert with non-existing transactionId - Expect 200 OK value 1,
   * 7. Edge cases for feeAmount (e.g. zero, negative, very large number)
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // TODO: replace RESTRICTED_USER_UID / RESTRICTED_SECRET_KEY with an actual
    // staff account that has no permission in staging DB
    const res = await request.post(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03a ─────────────────────────────────────────────────────────────────
  test("TC_03a - Missing required field campaignId - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { campaignId, ...payload } = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/campaignId|required/i);
  });

  // ─── TC_03b ─────────────────────────────────────────────────────────────────
  test("TC_03b - Missing required field targetMonth - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { targetMonth, ...payload } = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/targetMonth|required/i);
  });

  // ─── TC_03c ─────────────────────────────────────────────────────────────────
  test("TC_03c - Missing required field fixedFeeId - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { fixedFeeId, ...payload } = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/fixedFeeId|required/i);
  });

  // ─── TC_03d ─────────────────────────────────────────────────────────────────
  test("TC_03d - Invalid targetMonth format (not YYYY/MM) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), targetMonth: "12-2024" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/targetMonth|invalid|format/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Upsert with missing transactionId (INSERT new record) - Expect 200 OK value 1", async ({
    request,
  }) => {
    const { transactionId, ...payload } = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toBe(1);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Upsert with existing transactionId (UPDATE record) - Expect 200 OK value 1", async ({
    request,
  }) => {
    // TODO: replace 908 with a transactionId that exists in staging DB
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), transactionId: 908 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toBe(1);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Upsert with non-existing transactionId (INSERT new record) - Expect 200 OK value 1", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), transactionId: 999999999 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toBe(1);
  });

  // ─── TC_07a ─────────────────────────────────────────────────────────────────
  test("TC_07a - feeAmount = 0 (zero) - Expect 200 OK", async ({ request }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), transactionId: null, feeAmount: 0 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_07b ─────────────────────────────────────────────────────────────────
  test("TC_07b - feeAmount negative - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), transactionId: null, feeAmount: -500 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/feeAmount|negative|invalid/i);
  });

  // ─── TC_07c ─────────────────────────────────────────────────────────────────
  test("TC_07c - feeAmount very large number - Expect 200 OK or 400", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        transactionId: null,
        feeAmount: 9999999999.99,
      },
    });
    const body = await logResponse(res);
    // Accept 200 if DB supports large decimal, or 400 if validation rejects it
    expect([200, 400]).toContain(res.status());
  });
});
