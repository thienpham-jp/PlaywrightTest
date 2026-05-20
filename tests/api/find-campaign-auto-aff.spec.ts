import { test, expect, APIResponse } from "@playwright/test";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";
import { generateJWT } from "../../src/helpers/jwt-helper";
import { randomInt } from "../../src/helpers/function-helper";

const baseURL = urlStagingAPI("VN");

const NON_EXISTING_CAMPAIGN_ID = 999999999;

// Replace with a valid campaign ID that exists in the staging DB
const VALID_CAMPAIGN_IDS = [3745, 3746, 3748, 3749, 3750];
const randomCampaignId = () =>
  VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)];

const getApiUrl = (campaignId: number | null) =>
  `${baseURL}/v1/staff/campaigns/auto-affiliation-approval?campaignId=${campaignId}`;

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
  const body = await res.json();
  console.log(JSON.stringify(body, null, 2));
  return body;
};

test.describe("Find Auto Affiliation Approval API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Auto Affiliation Approval API method `GET v1/staff/campaigns/auto-affiliation-approval?campaignId={campaignId}`
   *
   * Test summary to cover:
   *  1. Valid Campaign ID - Expect 200 OK with correct auto affiliation approval data.
   *  2. Non-Existing Campaign ID - Expect 404 Not Found with appropriate error message.
   *  3. Missing Campaign ID - Expect 400 Bad Request with validation error message.
   *  4. Invalid Campaign ID Format (e.g., string instead of number) - Expect 400 Bad Request with validation error message.
   *  5. Unauthorized Access (e.g., no token or invalid token) - Expect 401 Unauthorized with appropriate error message.
   *  6. Forbidden Access (e.g., user without access to the campaign's country) - Expect 401 Unauthorized with appropriate error message.
   *  7. Valid Campaign ID with Auto Affiliation Approval Disabled - Expect 200 OK with correct data indicating auto affiliation approval is disabled.
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Valid Campaign ID - Expect 200 OK with correct auto affiliation approval data", async ({
    request,
  }) => {
    const res = await request.get(getApiUrl(3747), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("autoAffApprDuration");
    expect(body).toHaveProperty("autoAffLimitationOption");
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Non-Existing Campaign ID - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(getApiUrl(NON_EXISTING_CAMPAIGN_ID), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/does not exist/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing Campaign ID - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(
      `${baseURL}/v1/staff/campaigns/auto-affiliation-approval`,
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Invalid Campaign ID Format (string) - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(
      `${baseURL}/v1/staff/campaigns/auto-affiliation-approval?campaignId=invalid-id`,
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Unauthorized Access (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.get(getApiUrl(campaignId), {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Forbidden Access (user without country access) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // TODO: replace RESTRICTED_USER_UID / RESTRICTED_SECRET_KEY with an actual
    // staff account that has no access to the campaign's country in staging DB
    const campaignId = randomCampaignId();
    const res = await request.get(getApiUrl(campaignId), {
      headers: getRestrictedAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Campaign with Auto Affiliation Approval Disabled - Expect 200 OK with disabled flag", async ({
    request,
  }) => {
    // TODO: replace with a campaign ID that has auto affiliation approval DISABLED in staging DB
    const campaignIdWithAutoAffDisabled = 3746;
    const res = await request.get(getApiUrl(campaignIdWithAutoAffDisabled), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("autoAffiliationApproval");
    expect(body.autoAffiliationApproval).toBe(0);
  });
});
