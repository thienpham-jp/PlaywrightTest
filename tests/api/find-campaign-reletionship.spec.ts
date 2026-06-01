import { test, expect, APIResponse } from "@playwright/test";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";
import { generateJWT } from "../../src/helpers/jwt-helper";
import { SECRET_KEY, USER_UID } from "../../src/helpers/user-helper";
import { randomInt } from "../../src/helpers/function-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/campaigns/relationship`;

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

// TODO: replace with a campaignId that has relationship data in staging DB
const VALID_CAMPAIGN_ID = [7406, 11216, 230, 439, 232, 337, 7505, 7407, 966][
  randomInt(0, 8)
];

const buildUrl = (params: any) => {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${API_URL}?${query}`;
};

test.describe.skip("Find Campaign Relationship API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Campaign Relationship API method `GET /v1/staff/campaigns/relationship?`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Input param missing childCampaignId - Expect 500 Internal Server Error
   * 4. Input param childCampaignId has parentCampaignId - Expect 200 OK with correct relationship data
   * 5. Input param childCampaignId has no parentCampaignId - Expect 200 OK with default array
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ childCampaignId: VALID_CAMPAIGN_ID }),
      {
        headers: {
          ...getAuthHeaders(),
          Authorization: "",
        },
      },
    );
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
    const res = await request.get(
      buildUrl({ childCampaignId: VALID_CAMPAIGN_ID }),
      {
        headers: {
          ...getAuthHeaders(),
          Authorization: restrictedToken,
        },
      },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test.skip("TC_03 - Missing childCampaignId param - Expect 500 Internal Server Error", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({ childCampaignId: null }), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(500);
    expect(JSON.stringify(body)).toMatch(/campaignId|required/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Valid childCampaignId with parentCampaignId - Expect 200 OK with relationship data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ childCampaignId: VALID_CAMPAIGN_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);

    expect(body).toEqual(
      expect.objectContaining({
        parentCampaignNo: expect.any(Number),
        childCampaignNo: expect.any(Number),
        relationshipStatus: expect.any(Number),
        lastClickOnly: expect.any(Boolean),
      }),
    );
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Valid childCampaignId with no parentCampaignId - Expect 200 OK with default array", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({ childCampaignId: 7889 }), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);

    expect(body).toEqual({
      parentCampaignNo: 0,
      childCampaignNo: 0,
      relationshipStatus: -1,
      lastClickOnly: false,
    });
  });
});
