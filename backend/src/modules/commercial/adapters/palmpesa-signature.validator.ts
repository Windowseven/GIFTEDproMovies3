import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Computes the PalmPesa webhook signature per official specification:
 * signed_data = timestamp + "." + raw_request_body
 * signature   = "sha256=" + hex( HMAC-SHA256(signed_data, YOUR_SIGNING_SECRET) )
 */
export function computePalmPesaSignature(
  rawBody: string,
  secret: string,
  timestamp: number | string,
): string {
  const signedData = `${timestamp}.${rawBody}`;
  const hmac = createHmac("sha256", secret).update(signedData, "utf8").digest("hex");
  return `sha256=${hmac}`;
}

/**
 * Verifies a PalmPesa callback signature against the raw request body and timestamp header.
 *
 * Enforces:
 * 1. Non-empty timestamp and signature header.
 * 2. Timestamp freshness (default max 300 seconds / 5 minutes drift from current epoch).
 * 3. Constant-time comparison using timingSafeEqual to prevent timing side-channel attacks.
 */
export function verifyPalmPesaSignature(
  rawBody: string,
  secret: string,
  signatureHeader: string | undefined,
  timestampHeader: string | number | undefined,
  maxDriftSeconds = 300,
): boolean {
  if (!signatureHeader || timestampHeader === undefined || timestampHeader === null || !secret) {
    return false;
  }

  const tsNum = typeof timestampHeader === "number" ? timestampHeader : parseInt(timestampHeader, 10);
  if (isNaN(tsNum)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsNum) > maxDriftSeconds) {
    // Stale timestamp / replay attempt
    return false;
  }

  const expectedSignature = computePalmPesaSignature(rawBody, secret, tsNum);

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signatureHeader.trim(), "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
