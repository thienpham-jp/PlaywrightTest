import * as crypto from "crypto";
import { exec } from "child_process";

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

const CASHBACK_SECRETS: Record<string, string> = {
  vp_bank: "V8qLm2Xr7Np4Ks9Wc3Jt6Yh1Fa5Zd0BgUe8PxQ2Rn7M",
  mb_bank: "K7mQ2vR9xL4pN8sT1wY6cF3hJ0dZ5aUeB2nX9qP4rS8=",
  techcom_bank:
    "a0f001af45424530a444e59e6951d22a0adae2c41b4743df92de9dae582a2aed",
};

/**
 * Tương đương pre-request script Postman:
 *   checkSum = HMAC_SHA256(userId + timestamp, secret) -> hex
 *
 * Dùng crypto built-in của Node thay vì crypto-js để khỏi thêm dependency,
 * kết quả hex giống hệt CryptoJS.HmacSHA256(...).toString(CryptoJS.enc.Hex).
 */
export function generateCashbackAuthHeaders(
  userId: string,
  tenantCode?: string,
) {
  if (!userId) {
    console.error("Missing userId");
  }

  const code = tenantCode || "mb_bank";
  const cashbackSecret = CASHBACK_SECRETS[code] || process.env.CASHBACK_SECRET;

  if (!cashbackSecret) {
    throw new Error(`Unknown tenantCode: ${code}`);
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

export function copyToClipboard(text: string): void {
  const cmd =
    process.platform === "win32"
      ? `echo ${text} | clip`
      : process.platform === "darwin"
        ? `echo "${text}" | pbcopy`
        : `echo "${text}" | xclip -selection clipboard`;

  exec(cmd, (error) => {
    if (error) console.warn("Failed to copy to clipboard:", error.message);
    // else console.log("✓ Token copied to clipboard");
  });
}
