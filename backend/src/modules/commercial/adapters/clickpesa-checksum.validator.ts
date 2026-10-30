import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Recursively canonicalizes an object by sorting all dictionary keys in alphabetical order.
 * Primitives, nulls, arrays, and undefined values are preserved.
 */
export function canonicalizePayload(data: unknown): unknown {
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(canonicalizePayload);
  }
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(data as Record<string, unknown>).sort();
  for (const key of keys) {
    if (key === "checksum" || key === "checksumMethod" || key === "signature") {
      continue;
    }
    sorted[key] = canonicalizePayload((data as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Computes the HMAC-SHA256 hex checksum over a canonicalized JSON payload.
 */
export function computeClickPesaChecksum(payload: unknown, secret: string): string {
  const canonical = canonicalizePayload(payload);
  const serialized = JSON.stringify(canonical);
  return createHmac("sha256", secret).update(serialized, "utf8").digest("hex");
}

/**
 * Validates a candidate checksum against a payload using constant-time comparison.
 */
export function verifyClickPesaChecksum(
  payload: unknown,
  secret: string,
  candidateChecksum: string,
): boolean {
  if (!candidateChecksum || !secret) {
    return false;
  }
  const expected = computeClickPesaChecksum(payload, secret);
  const expectedBuf = Buffer.from(expected.toLowerCase(), "utf8");
  const candidateBuf = Buffer.from(candidateChecksum.toLowerCase(), "utf8");

  if (expectedBuf.length !== candidateBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, candidateBuf);
}
