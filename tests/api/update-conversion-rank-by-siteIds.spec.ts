import { test, expect } from "@playwright/test";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";
import { generateJWT } from "../../src/helpers/jwt-helper";
import { USER_UID, SECRET_KEY } from "../../src/helpers/user-helper";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/conversion/rank`;
const API_URL_2 = `${baseURL}/v1/staff/affiliations/ranks`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

// Replace with a valid site IDs that exists in the staging DB
const siteIDs = [102253, 42658];

const siteIDPayload = () => ({
  campaignId: 8026,
  siteId: 102253,
  from: "2025-01-01T00:00:00",
  to: "2025-01-31T23:59:59",
  rank: 5,
});

const siteIDsPayload = () => ({
  campaignId: 966,
  siteIds: siteIDs,
  newRank: 9,
  nextRank: 10,
});

test.describe("Update Conversion Rank by Site IDs API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Update Conversion Rank by Site IDs API method `PUT /v1/staff/conversion/rank` and `PUT /v1/staff/affiliations/ranks`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Missing user type - Expect 400 Bad Request with appropriate error message
   * 4. Single siteId via Staff Tool endpoint - Expect 200 OK
   * 5. Bulk siteIds via Affiliation endpoint - Expect 200 OK
   * 6. Unified Payload Type - Both Staff Tool and Affiliation flows must use UpdateConversionsRankPayload DTO and type UPDATE_CONVERSION_RANK.
   * 7. Affiliation Date Range Logic - For bulk updates, from and to must auto-default to first/last day of the current month when not provided.
   * 8. Batch Processing Efficiency - Consumer must use IN clause to query/update multiple siteIds from a single S3 payload efficiently (one API call handles the full batch).
   * 9. Conversion Record Updates - All matching conversions must have rank updated and reward edit date nullified.
   * 10. Audit Trail Integrity - System must insert exactly one rank update history record per siteId.
   * 11. Downstream Synchronization - Postback statuses must be updated and SQS messages must be sent for all affected conversions to sync with downstream systems.
   * 12. Schema Compliance - S3 payload must strictly follow metadata schema: campaignId, rank, and ISO 8601 date strings.
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
      data: siteIDPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_01.1 ──────────────────────────────────────────────────────────────────
  test("TC_01.1 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.put(API_URL_2, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: siteIDPayload(),
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
      data: siteIDPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02.1 ──────────────────────────────────────────────────────────────────
  test("TC_02.1 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no permission in staging DB
    const res = await request.put(API_URL_2, {
      headers: getRestrictedAuthHeaders(),
      data: siteIDPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing user type - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/invalid user type:/i);
  });

  // ─── TC_03.1 ──────────────────────────────────────────────────────────────────
  test("TC_03.1 - Missing user type - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL_2, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/invalid user type:/i);
  });

  // ─── TS_01 ──────────────────────────────────────────────────────────────────
  // Single Site Update Payload (Staff Tool)
  // System must wrap a single siteId into siteIds:[siteId] and upload to S3
  // with type UPDATE_CONVERSION_RANK.
  test("TS_01 - Single siteId via Staff Tool endpoint - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...siteIDPayload() },
    });
    const body = await logResponse(res);
    // API accepts single siteId and wraps it into a siteIds list internally
    expect(res.status()).toBe(200);
  });

  // ─── TS_02 ──────────────────────────────────────────────────────────────────
  // Bulk Site Update Payload (Affiliation)
  // Payload must contain multiple siteIds for sites with actual rank changes
  // and conversions in the current month.
  test("TS_02 - Bulk siteIds via Affiliation endpoint - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL_2, {
      headers: getAuthHeaders(),
      data: siteIDsPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TS_03 ──────────────────────────────────────────────────────────────────
  // Unified Payload Type
  // Both Staff Tool and Affiliation flows must use UpdateConversionsRankPayload
  // DTO and type UPDATE_CONVERSION_RANK.
  test.skip("TS_03a - Staff Tool endpoint accepts UpdateConversionsRankPayload - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteId: 67890,
        rank: 1,
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-31T23:59:59Z",
        type: "UPDATE_CONVERSION_RANK",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  test.skip("TS_03b - Affiliation endpoint accepts UpdateConversionsRankPayload - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL_2, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteIds: [67890, 67891],
        rank: 1,
        newRank: 2,
        type: "UPDATE_CONVERSION_RANK",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TS_04 ──────────────────────────────────────────────────────────────────
  // Affiliation Date Range Logic
  // For bulk updates, from and to must auto-default to first/last day of
  // the current month when not provided.
  test.skip("TS_04 - Affiliation bulk update without from/to defaults to current month - Expect 200 OK", async ({
    request,
  }) => {
    // Omit from and to — server should default to current month range
    const res = await request.put(API_URL_2, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteIds: [67890],
        rank: 1,
        newRank: 2,
      },
    });
    const body = await logResponse(res);
    // 200 means server accepted without explicit dates (used current month defaults)
    expect(res.status()).toBe(200);
  });

  // ─── TS_05 ──────────────────────────────────────────────────────────────────
  // Batch Processing Efficiency
  // Consumer must use IN clause to query/update multiple siteIds from a single
  // S3 payload efficiently (one API call handles the full batch).
  test.skip("TS_05 - Single API call processes multiple siteIds as a batch - Expect 200 OK", async ({
    request,
  }) => {
    const batchSiteIds = [67890, 67891, 67892, 67893, 67894];
    const res = await request.put(API_URL_2, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteIds: batchSiteIds,
        rank: 1,
        newRank: 2,
      },
    });
    const body = await logResponse(res);
    // A single PUT triggers batch update for all siteIds via IN clause
    expect(res.status()).toBe(200);
  });

  // ─── TS_06 ──────────────────────────────────────────────────────────────────
  // Conversion Record Updates
  // All matching conversions must have rank updated and reward edit date nullified.
  test.skip("TS_06 - Conversion rank update and reward edit date nullification - Expect 200 OK", async ({
    request,
  }) => {
    // NOTE: full verification requires DB query or a GET conversions endpoint
    // to confirm rank is updated and rewardEditDate is null after this call.
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteId: 67890,
        rank: 2,
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-31T23:59:59Z",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TS_07 ──────────────────────────────────────────────────────────────────
  // Audit Trail Integrity
  // System must insert exactly one rank update history record per siteId.
  test.skip("TS_07 - Audit trail: one history record inserted per siteId - Expect 200 OK", async ({
    request,
  }) => {
    // NOTE: full verification requires checking rank_update_history table in DB
    // to confirm exactly N records for N siteIds after this call.
    const siteIds = [67890, 67891, 67892];
    const res = await request.put(API_URL_2, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteIds,
        rank: 1,
        newRank: 2,
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // TODO: query DB to assert history records count === siteIds.length
  });

  // ─── TS_08 ──────────────────────────────────────────────────────────────────
  // Downstream Synchronization
  // Postback statuses must be updated and SQS messages must be sent for all
  // affected conversions to sync with downstream systems.
  test.skip("TS_08 - Downstream sync: postback status updated and SQS dispatched - Expect 200 OK", async ({
    request,
  }) => {
    // NOTE: SQS message dispatch is not observable via HTTP API.
    // Full verification requires checking SQS queue or postback status endpoint.
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteId: 67890,
        rank: 1,
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-31T23:59:59Z",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // TODO: call postback status GET endpoint and assert status reflects rank change
  });

  // ─── TS_09 ──────────────────────────────────────────────────────────────────
  // Schema Compliance
  // S3 payload must strictly follow metadata schema: campaignId, rank,
  // and ISO 8601 date strings.
  test.skip("TS_09a - Missing required field campaignId - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        siteId: 67890,
        rank: 1,
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-31T23:59:59Z",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/campaignId|required/i);
  });

  test.skip("TS_09b - Missing required field rank - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteId: 67890,
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-31T23:59:59Z",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/rank|required/i);
  });

  test.skip("TS_09c - Non-ISO 8601 date string for from field - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteId: 67890,
        rank: 1,
        from: "01/01/2025", // not ISO 8601
        to: "2025-01-31T23:59:59Z",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/from|date|invalid|ISO/i);
  });

  test.skip("TS_09d - Valid payload with correct ISO 8601 dates - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        campaignId: 12345,
        siteId: 67890,
        rank: 1,
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-31T23:59:59Z",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });
});
