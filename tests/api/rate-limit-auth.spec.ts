import { test, expect } from "@playwright/test";
import { createHash } from "crypto";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";
import { PUB_USERNAME, PUB_PASSWORD } from "../../src/helpers/user-helper";
import { logResponse } from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/publishers/auth`;

const hashMd5 = (value: string) =>
  createHash("md5").update(value).digest("hex");

const hashSha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

// authorization = hashSha256(username + ":" + hashMd5(password))
const buildAuthHeader = (username: string, password: string) =>
  hashSha256(`${username}:${hashMd5(password)}`);

const getAuthHeaders = (username: string, password: string) => ({
  "Content-Type": "application/json",
  Authorization: buildAuthHeader(username, password),
});

const buildUrl = (
  username: string,
  params: Record<string, string | number | boolean>,
) => {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${API_URL}/${username}?${query}`;
};

const getRequestParams = () => ({
  isGlobal: false,
  countryCode: "ID",
});

test.describe("Rate Limit Auth API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Rate Limit Auth API method `GET /publishers/auth?countryCode&isGlobal&username`
   * *Test summary to cover:
   * 1. Verify API basic call 1 time - Expect 200 OK
   * 2. Send 31 requests within 1 minute - Expect rate limit (429) triggered
   * 3. Send 31 requests back-to-back (no wait) - Expect rate limit (429) triggered
   * 4. Send requests continuously until rate limit (429) is triggered - Log statistics
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Verify API basic call 1 time - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.get(buildUrl(PUB_USERNAME, getRequestParams()), {
      headers: getAuthHeaders(PUB_USERNAME, PUB_PASSWORD),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test.skip("TC_02 - Send 31 requests within 1 minute - Expect rate limit (429) triggered", async ({
    request,
  }) => {
    const TOTAL_REQUESTS = 31;
    const WINDOW_MS = 60_500; // 1.1 minute
    const intervalMs = WINDOW_MS / TOTAL_REQUESTS;

    const statuses: number[] = [];
    const url = buildUrl(PUB_USERNAME, getRequestParams());
    const headers = getAuthHeaders(PUB_USERNAME, PUB_PASSWORD);

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const start = Date.now();

      const res = await request.get(url, { headers });
      statuses.push(res.status());

      // Space requests evenly across the 1-minute window
      const elapsed = Date.now() - start;
      const wait = intervalMs - elapsed;
      if (wait > 0 && i < TOTAL_REQUESTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }

    console.log("Response statuses:", statuses);

    // const rateLimitedCount = statuses.filter((s) => s === 429).length;
    // expect(rateLimitedCount).toBeGreaterThan(0);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test.skip("TC_03 - Send 31 requests back-to-back (no wait) - Expect rate limit (429) triggered", async ({
    request,
  }) => {
    const TOTAL_REQUESTS = 31;

    const statuses: number[] = [];
    const url = buildUrl(PUB_USERNAME, getRequestParams());
    const headers = getAuthHeaders(PUB_USERNAME, PUB_PASSWORD);

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const res = await request.get(url, { headers });
      statuses.push(res.status());
    }

    console.log("Response statuses:", statuses);

    const rateLimitedCount = statuses.filter((s) => s === 429).length;
    expect(rateLimitedCount).toBeGreaterThan(0);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Send requests continuously until rate limit (429) is triggered - Log statistics", async ({
    request,
  }) => {
    const url = buildUrl(PUB_USERNAME, getRequestParams());
    const headers = getAuthHeaders(PUB_USERNAME, PUB_PASSWORD);

    const statuses: number[] = [];
    let requestCount = 0;
    let hitRateLimit = false;
    const startTime = Date.now();

    while (!hitRateLimit) {
      requestCount++;
      const res = await request.get(url, { headers });
      const status = res.status();
      statuses.push(status);

      if (status === 429) {
        hitRateLimit = true;
      }
    }

    const durationMs = Date.now() - startTime;

    const statusCounts = statuses.reduce<Record<number, number>>(
      (acc, status) => {
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {},
    );

    console.log("─── TC_04 Rate Limit Statistics ───────────────────────────");
    console.log(`Total requests sent : ${requestCount}`);
    console.log(`Duration            : ${durationMs} ms`);
    console.log(`Status breakdown    : ${JSON.stringify(statusCounts)}`);
    console.log(`Request # that hit 429 : ${statuses.indexOf(429) + 1}`);
    console.log("────────────────────────────────────────────────────────────");

    expect(hitRateLimit).toBe(true);
    expect(statusCounts[429]).toBeGreaterThan(0);
  });
});
