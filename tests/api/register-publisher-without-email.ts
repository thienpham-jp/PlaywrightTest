import { test, expect } from "@playwright/test";

const API_URL =
  "https://gurkha-staging.accesstrade.vn/v2/publishers/register-without-email";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "X-Accesstrade-User-Type": "staff",
});

const uniqueSuffix = () => Date.now();

const validPayload = () => ({
  loginName: `testuser_${uniqueSuffix()}`,
  password: "Test@1234",
  accountType: "individual",
  countryCode: "VN",
  siteName: `Test Site ${uniqueSuffix()}`,
  siteUrl: `https://testsite-${uniqueSuffix()}.com`,
  agencyId: "123",
  referralId: 456,
  referralUrl: "https://ref.accesstrade.vn/abc",
  utmSource: "isglobal-api",
  utmMedium: "internal",
  utmContent: "signup-v2",
  utmCampaign: "publisher_api_v2",
  utmTerm: "optional",
});

test.describe("Internal Publisher Registration Without Email API V2 Specification", () => {
  test("TC01 - Verify exception when loginName is null", async ({
    request,
  }) => {
    const payload = { ...validPayload(), loginName: null };
    const res = await request.post(API_URL, { data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/loginName|login_name/i);
  });

  test("TC02 - Verify exception when password is null", async ({ request }) => {
    const payload = { ...validPayload(), password: null };
    const res = await request.post(API_URL, { data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/password/i);
  });

  test("TC03 - Verify exception when siteName is null", async ({ request }) => {
    const payload = { ...validPayload(), siteName: null };
    const res = await request.post(API_URL, { data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/siteName|site_name/i);
  });

  test("TC04 - Verify exception when siteUrl is null", async ({ request }) => {
    const payload = { ...validPayload(), siteUrl: null };
    const res = await request.post(API_URL, { data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/siteUrl|site_url/i);
  });

  test("TC05 - Verify exception when accountType is null", async ({
    request,
  }) => {
    const payload = { ...validPayload(), accountType: null };
    const res = await request.post(API_URL, { data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/accountType|account_type/i);
  });

  test("TC06 - Verify exception when siteUrl is duplicated", async ({
    request,
  }) => {
    const payload = validPayload();
    await request.post(API_URL, { data: payload });
    const res = await request.post(API_URL, { data: { ...validPayload(), siteUrl: payload.siteUrl },
    });
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(
      /duplicate|already.*exist|siteUrl|site_url/i,
    );
  });

  test("TC07 - Verify exception when loginName is duplicated", async ({
    request,
  }) => {
    const payload = validPayload();
    await request.post(API_URL, { data: payload });
    const res = await request.post(API_URL, { data: { ...validPayload(), loginName: payload.loginName },
    });
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(
      /duplicate|already.*exist|loginName|login_name/i,
    );
  });

  test("TC08 - Verify successful registration without email", async ({
    request,
  }) => {
    const res = await request.post(API_URL, { data: validPayload(),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("statusCode", 200);
  });

  test("TC09 - Verify successful registration with email and phoneNumber", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      email: `testuser_${uniqueSuffix()}@example.com`,
      phoneNumber: "08123456789",
    };
    const res = await request.post(API_URL, { data: payload,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("statusCode", 200);
  });

  test("TC10 - Verify exception when email is duplicated", async ({
    request,
  }) => {
    const email = `testdup_${uniqueSuffix()}@example.com`;
    await request.post(API_URL, { data: { ...validPayload(), email },
    });
    const res = await request.post(API_URL, { data: { ...validPayload(), email },
    });
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/duplicate|already.*exist|email/i);
  });

  test("TC11 - Verify loginName shorter than 3 characters", async ({
    request,
  }) => {
    const payload = { ...validPayload(), loginName: "ab" };
    const res = await request.post(API_URL, { data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(
      /loginName|login_name|min.*length|too.*short/i,
    );
  });
});

/* Test Case ID

Title

Expected Result

Actual Result

TC01

Verify exception when loginName is null

API returns 400 validation error

API returns correct validation error

TC02

Verify exception when password is null

API returns 400 validation error



TC03

Verify exception when siteName is null

API returns 400 validation error

API returns correct validation error

TC04

Verify exception when siteUrl is null

API returns 400 validation error

API returns correct validation error

TC05

Verify exception when accountType is null

API returns 400 validation error



TC06

Verify exception when siteUrl is duplicated

API returns duplicate site URL error



TC07

Verify exception when loginName is duplicated

API returns duplicate login name error



TC08

Verify successful registration without email

API returns statusCode 200



TC09

Verify successful registration with email and phoneNumber

API returns statusCode 200



TC10

Verify exception when email is duplicated

API returns duplicate email error



TC11

Verify loginName shorter than 3 characters

API returns 400 validation error



TC12

Verify loginName longer than 64 characters

API returns 400 validation error



TC13

Verify loginName with invalid special characters

API returns 400 validation error



TC14

Verify loginName with valid allowed characters

Registration succeeds successfully



TC15

Verify null or empty countryCode

API returns 400 validation error



TC16

Verify invalid countryCode outside allowed list

API returns 400 validation error



TC17

Verify valid countryCode values (ID, TH, VN)

Registration succeeds successfully



TC18

Verify invalid email format

API returns 400 validation error



TC19

Verify invalid phoneNumber format

API returns 400 validation error



TC20

Verify registration without email and phoneNumber

Registration succeeds successfully



TC21

Verify registration with email and phoneNumber

Registration succeeds successfully



TC22

Verify duplicate validation combinations

API returns correct duplicate validation errors



TC23

Verify account status after successful registration

DB status = ACTIVE and siteStatus = APPROVED



TC24

Verify hashedActivationCode is NULL after registration

DB hashedActivationCode = NULL



TC25

Verify no activation records are created

No records created in activation-related tables



TC26

Verify V1 public signup flow is not affected

Public signup still requires activation flow



TC27

Verify API access is restricted to internal usage

Unauthorized external access is rejected


*/

