import { APIRequestContext, APIResponse, expect } from "@playwright/test";
import {
  generateCashbackAuthHeaders,
  generateJWT,
} from "../../../src/helpers/jwt-helper";
import { USER_UID, SECRET_KEY } from "../../../src/helpers/user-helper";

// Placeholder credentials for restricted-access test cases
export const RESTRICTED_USER_UID = "restricted_user_uid_placeholder";
export const RESTRICTED_SECRET_KEY = "restricted_secret_key_placeholder";

/**
 * Returns standard staff request headers for the given bearer token.
 */
export const createStaffHeaders = (token: string): Record<string, string> => ({
  "Content-Type": "application/json",
  "X-Accesstrade-User-Type": "staff",
  Authorization: token,
});

/**
 * Returns standard publisher request headers for the given bearer token.
 */
export const createPublisherHeaders = (
  token: string,
): Record<string, string> => ({
  "Content-Type": "application/json",
  "X-Accesstrade-User-Type": "publisher",
  Authorization: token,
});

/**
 * Returns a fresh Bearer token for the default staff user.
 */
export const getStaffToken = (): string =>
  `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;

/**
 * Parses and logs the API response body. Falls back to raw text if JSON
 * parsing fails. Safe to call on any APIResponse regardless of content type.
 */
export async function logResponse(
  res: APIResponse,
  logResults: boolean = true,
): Promise<any> {
  let responseBody: any = null;
  try {
    const rawBody = await res.text();
    responseBody =
      rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    if (responseBody !== "") {
      if (logResults) {
        console.log(JSON.stringify(responseBody, null, 2));
      }
    }
  } catch (error) {
    console.error("Failed to parse response body as JSON:", error);
    responseBody = await res.text();
  }
  return responseBody;
}

// ── Helper function để thêm delay giữa các test ──
export const delay = async (ms: number = 5000) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const CASHBACK_AUTH_BASE_URL =
  process.env.CASHBACK_API_BASE_URL ||
  "https://mobile-dev-gurkha-id.asean-accesstrade.net";

// POST, retrying up to `tries` times while the server answers 503.
async function postRetry503(
  request: APIRequestContext,
  url: string,
  options: Parameters<APIRequestContext["post"]>[1],
  tries = 5,
) {
  let res = await request.post(url, options);
  for (let i = 1; i < tries && res.status() === 503; i++) {
    await delay(1000);
    res = await request.post(url, options);
  }
  return res;
}

/**
 * Runs the cashback auth flow (generate-auth-url → verify-one-time-token)
 * and returns the Bearer token.
 */
export async function getCashbackToken(
  request: APIRequestContext,
  userId: string,
  tenantCode: string,
): Promise<string> {
  const authRes = await postRetry503(
    request,
    `${CASHBACK_AUTH_BASE_URL}/v1/cashback/auth/generate-auth-url`,
    {
      data: { userId, tenantCode },
      headers: generateCashbackAuthHeaders(userId, tenantCode),
    },
  );
  expect(authRes.status()).toBe(200);
  const oneTimeToken = (await authRes.json()).data.url.split("token=")[1];

  const verifyRes = await postRetry503(
    request,
    `${CASHBACK_AUTH_BASE_URL}/v1/cashback/auth/verify-one-time-token`,
    { headers: { clientId: "cash-back-client" }, data: { oneTimeToken } },
  );
  expect(verifyRes.status()).toBe(200);
  return (await verifyRes.json()).token;
}
