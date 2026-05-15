import { test, expect, APIResponse } from "@playwright/test";
import {
  randomEmail,
  randomPhoneNumber,
} from "../../src/helpers/function-helper";
import { urlStagingAPI } from "../../src/helpers/base-url-helper";

const baseURL = urlStagingAPI("VN");

const API_URL = `${baseURL}/v2/publishers/accounts/email/insert`;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
});

const logResponse = async (res: APIResponse) => {
  const body = await res.json();
  console.log(JSON.stringify(body, null, 2));
  return body;
};

// TODO: Replace these with actual staging publisherIds before running
// FRESH_PUBLISHER_ID_1 / _2: publishers that exist in Gurkha, have no email yet, and exist in Hussar
// LINKED_PUBLISHER_ID: a publisher that already has an email linked
// HUSSAR_MISSING_PUBLISHER_ID: a publisher that exists in Gurkha but NOT in Hussar/Oracle
// EXISTING_EMAIL: an email address already registered to another publisher in staging
const FRESH_PUBLISHER_ID_1 = 6820267;
const FRESH_PUBLISHER_ID_2 = 6820263;
const LINKED_PUBLISHER_ID = 6820269;
const HUSSAR_MISSING_PUBLISHER_ID = 0;
const EXISTING_EMAIL = "nguyenvana3@example.com";

const validPayload = () => ({
  email: randomEmail(),
  phoneNumber: null,
  publisherId: FRESH_PUBLISHER_ID_1,
});

test.describe("Internal Publisher Update Email API V2", () => {
  test.describe.configure({ mode: "parallel" });

  test("TC01 - Verify email is null or empty", async ({ request }) => {
    const payload = { ...validPayload(), email: "" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Email cannot be empty/i);
  });

  test("TC02 - Verify publisherId is null", async ({ request }) => {
    const payload = { ...validPayload(), publisherId: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/publisherId cannot be empty/i);
  });

  test("TC03 - Verify email already exists in the system", async ({
    request,
  }) => {
    const payload = { ...validPayload(), email: EXISTING_EMAIL };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Email.*already.*exist/i);
  });

  test("TC04 - Verify publisherId does not exist in Gurkha", async ({
    request,
  }) => {
    const payload = { ...validPayload(), publisherId: 0 };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/publisherId does not exist/i);
  });

  test("TC05 - Verify account already linked with email", async ({
    request,
  }) => {
    const payload = { ...validPayload(), publisherId: LINKED_PUBLISHER_ID };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Account already has an email/i);
  });

  test("TC06 - Verify successful case - only change email", async ({
    request,
  }) => {
    const payload = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.trim()).toBe("");
  });

  test("TC07 - Verify invalid email regex format", async ({ request }) => {
    const payload = { ...validPayload(), email: "not-a-valid-email" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Invalid Email format/i);
  });

  test("TC08 - Verify success with email and phoneNumber", async ({
    request,
  }) => {
    const payload = {
      email: randomEmail(),
      phoneNumber: randomPhoneNumber("0"),
      publisherId: FRESH_PUBLISHER_ID_2,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(200);
  });

  test("TC09 - Verify publisher not found in Hussar (Oracle DB)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      publisherId: HUSSAR_MISSING_PUBLISHER_ID,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/publisherId does not exist/i);
  });
});
