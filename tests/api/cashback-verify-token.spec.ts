import { test, expect } from "@playwright/test";
import { logResponse } from "./helpers/api-test-helper";

const BASE_URL = "https://mobile-dev-gurkha-id.asean-accesstrade.net";
const ENDPOINT = "/v1/cashback/auth/verify-one-time-token";
const CLIENT_ID = "cash-back-client";

const oneTimeToken = "Vw_TFFedamyPunmhYy3zbsj7o8l25M9r2hxzC23c_rs";

test.describe.skip("Cashback Verify One-Time Token API", () => {
  test("should verify valid one-time token successfully", async ({
    request,
  }) => {
    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      response = await request.post(`${BASE_URL}${ENDPOINT}`, {
        headers: {
          "Content-Type": "application/json",
          clientId: CLIENT_ID,
        },
        data: {
          oneTimeToken: oneTimeToken,
        },
      });

      if (response.status() !== 503) {
        break;
      }

      retries++;
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const body = await logResponse(response!);
    expect(response!.status()).toBe(200);
    // Thêm assertion dựa vào response structure
  });

  test("should reject request with missing oneTimeToken", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: CLIENT_ID,
      },
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await logResponse(response, false);
  });

  test("should reject request with empty oneTimeToken", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: CLIENT_ID,
      },
      data: {
        oneTimeToken: "",
      },
    });

    expect(response.status()).toBe(401);
    await logResponse(response, false);
  });

  test("should reject request with invalid token format", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: CLIENT_ID,
      },
      data: {
        oneTimeToken: "invalid-token-format-123",
      },
    });

    expect(response.status()).toBe(401);
    await logResponse(response, false);
  });

  test("should reject request with missing clientId header", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        oneTimeToken: oneTimeToken,
      },
    });

    expect(response.status()).toBe(400);
    await logResponse(response, false);
  });

  test("should reject request with invalid clientId", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: "invalid-client-id",
      },
      data: {
        oneTimeToken: oneTimeToken,
      },
    });

    expect(response.status()).toBe(401);
    await logResponse(response, false);
  });

  test("should reject request with wrong Content-Type", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        clientId: CLIENT_ID,
      },
      data: {
        oneTimeToken: oneTimeToken,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    await logResponse(response, false);
  });

  test("should reject request without Content-Type header", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        clientId: CLIENT_ID,
      },
      data: {
        oneTimeToken: oneTimeToken,
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    await logResponse(response, false);
  });

  test("should handle expired token", async ({ request }) => {
    // Token format hợp lệ nhưng đã hết hạn
    const expiredToken = "-AuUqU-CtUR2d0sZ6d0slwnufwg1wNlRuHRYVyi6Fo8-EXPIRED";

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: CLIENT_ID,
      },
      data: {
        oneTimeToken: expiredToken,
      },
    });

    // Có thể 400, 401, hoặc 403 tùy implement
    expect(response.status()).toBeGreaterThanOrEqual(400);
    await logResponse(response, false);
  });

  test.skip("should handle already used token", async ({ request }) => {
    const token = oneTimeToken;

    // Lần 1: sử dụng token
    const response1 = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: CLIENT_ID,
      },
      data: { oneTimeToken: token },
    });

    if (response1.status() === 200) {
      // Lần 2: thử sử dụng lại token
      const response2 = await request.post(`${BASE_URL}${ENDPOINT}`, {
        headers: {
          "Content-Type": "application/json",
          clientId: CLIENT_ID,
        },
        data: { oneTimeToken: token },
      });

      // Token đã dùng rồi nên phải lỗi
      expect(response2.status()).toBeGreaterThanOrEqual(400);
      await logResponse(response2, false);
    }
  });

  test("should handle server errors with retry", async ({ request }) => {
    let attemptCount = 0;
    const maxRetries = 5;
    let response;

    while (attemptCount < maxRetries) {
      response = await request.post(`${BASE_URL}${ENDPOINT}`, {
        headers: {
          "Content-Type": "application/json",
          clientId: CLIENT_ID,
        },
        data: {
          oneTimeToken: oneTimeToken,
        },
      });

      // Continue retrying only on 503, break on success or client errors
      if (response.status() !== 503) {
        break;
      }

      attemptCount++;
      if (attemptCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Cuối cùng phải có response (success hoặc client error, không còn 503)
    expect(response).toBeDefined();
    expect(response!.status()).not.toBe(503);
    await logResponse(response!, false);
  });

  test("should handle null oneTimeToken", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: CLIENT_ID,
      },
      data: {
        oneTimeToken: null,
      },
    });

    expect(response.status()).toBe(400);
    await logResponse(response, false);
  });

  test.skip("should handle extra fields in request body", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        clientId: CLIENT_ID,
      },
      data: {
        oneTimeToken: oneTimeToken,
        extraField: "should-be-ignored",
        anotherField: 123,
      },
    });

    // API nên ignore extra fields hoặc chỉ check oneTimeToken
    expect([200, 400]).toContain(response.status());
    await logResponse(response, false);
  });
});
