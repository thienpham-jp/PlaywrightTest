import { test, expect, APIResponse } from "@playwright/test";
import { randomInt, randomString } from "../../src/helpers/function-helper";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";

import { generateJWT } from "../../src/helpers/jwt-helper";

const baseURL = urlStagingAPI("VN");

const API_URL = `${baseURL}/v1/staff/campaigns/rank-master`;

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

// Replace with a valid campaign ID that exists in the staging DB
const VALID_CAMPAIGN_IDS = [3677, 3678, 3679];
const randomCampaignId = () =>
  VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)];
const NON_EXISTING_CAMPAIGN_ID = 999999999;

const NON_EXISTING_RANK_ID = 999999999;

const rankMasterPayload = () => ({
  rankId: randomInt(1, 99),
  rankName: `Update Rank ${randomString(5)}`,
  campaignId: randomCampaignId(),
  useFlag: randomInt(0, 1),
  updatedBy: "obs-dev@interspace.ne.jp",
});

test.describe("Update Rank Master API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Update Rank Master API method `PUT /v1/staff/campaigns/rank-master`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Campaign ID is null or invalid - Expect 400 Bad Request with appropriate error message
   * 4. Rank Name is null or empty - Expect 400 Bad Request with appropriate error message
   * 5. useFlag is outside allowed range (e.g., not 0 or 1) - Expect 400 Bad Request with appropriate error message
   * 6. rankId not in the system - Expect 400 Bad Request with appropriate error message
   * 7. Rank master with rank ID 71 not found for campaign ID 3679 - Expect 400 Bad Request with appropriate error message
   * 8. Successful update with valid data
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: rankMasterPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no permission in staging DB
    const res = await request.put(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: rankMasterPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03a ─────────────────────────────────────────────────────────────────
  test("TC_03a - campaignId is null - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), campaignId: null },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/campaignId is required/i);
  });

  // ─── TC_03b ─────────────────────────────────────────────────────────────────
  test("TC_03b - campaignId is non-numeric (invalid format) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), campaignId: "invalid-id" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Campaign ID is invalid/i);
  });

  // ─── TC_03c ─────────────────────────────────────────────────────────────────
  test("TC_03c - Non-existing campaignId - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), campaignId: NON_EXISTING_CAMPAIGN_ID },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Bad Request|campaignId|not found/i);
  });

  // ─── TC_04a ─────────────────────────────────────────────────────────────────
  test("TC_04a - rankName is null - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), rankName: null },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/rankName is required/i);
  });

  // ─── TC_04b ─────────────────────────────────────────────────────────────────
  test("TC_04b - rankName is empty string - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), rankName: "" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/rankName is required/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - useFlag outside allowed range (not 0 or 1) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), useFlag: 99 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/useFlag must be either 0 or 1./i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - rankId does not exist in the system - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), rankId: NON_EXISTING_RANK_ID },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Rank ID must be in range 1 to 99/i);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Rank master with rank ID ... not found for campaign ID ... - Expect 400 Bad Request", async ({
    request,
  }) => {
    const payload = rankMasterPayload();
    payload.rankId = 71; // Use a rank ID that does not exist for the campaign
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...payload },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      new RegExp(
        `Rank master with rank ID ${payload.rankId} not found for campaign ID ${payload.campaignId}`,
        "i",
      ),
    );
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Successful update with valid data - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...rankMasterPayload(), rankId: 60 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toBe(1);
  });
});
