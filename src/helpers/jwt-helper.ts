import * as crypto from "crypto";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateJWT(userUid: string, secretKey: string): string {
  const currentTime = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    sub: userUid,
    iat: currentTime,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const signatureEncoded = crypto
    .createHmac("sha256", secretKey)
    .update(signatureInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
}

/**
 * Tương đương pre-request script Postman:
 *   checkSum = HMAC_SHA256(userId + timestamp, secret) -> hex
 *
 * Dùng crypto built-in của Node thay vì crypto-js để khỏi thêm dependency,
 * kết quả hex giống hệt CryptoJS.HmacSHA256(...).toString(CryptoJS.enc.Hex).
 */
export function generateCashbackAuthHeaders(userId: string, secret?: string) {
  const cashbackSecret =
    secret ||
    process.env.CASHBACK_SECRET ||
    "V8qLm2Xr7Np4Ks9Wc3Jt6Yh1Fa5Zd0BgUe8PxQ2Rn7M"; // K7mQ2vR9xL4pN8sT1wY6cF3hJ0dZ5aUeB2nX9qP4rS8=

  if (!userId) {
    throw new Error("Missing userId");
  }

  const timestamp = Date.now().toString();
  const checkSum = crypto
    .createHmac("sha256", cashbackSecret)
    .update(userId + timestamp)
    .digest("hex");

  return {
    clientId: "cash-back-client",
    timestamp,
    checkSum,
  };
}
