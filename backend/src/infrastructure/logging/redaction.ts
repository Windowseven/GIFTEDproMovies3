export const REDACTED_VALUE = "[REDACTED]";

export const SENSITIVE_LOG_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["set-cookie"]',
  "req.headers.x-api-key",
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "sessionId",
  "signature",
  "apiKey",
  "*.password",
  "*.token",
  "*.secret",
  "*.authorization",
  "*.cookie",
  "*.sessionId",
  "*.signature",
  "*.apiKey",
  "code",
  "codeVerifier",
  "code_verifier",
  "idToken",
  "id_token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "nonce",
  "state",
  "*.code",
  "*.codeVerifier",
  "*.code_verifier",
  "*.idToken",
  "*.id_token",
  "*.accessToken",
  "*.access_token",
  "*.refreshToken",
  "*.refresh_token",
  "*.nonce",
  "*.state",
  "encryptedPayload",
  "encrypted_payload",
  "payloadIv",
  "payload_iv",
  "payloadTag",
  "payload_tag",
  "encryptionKey",
  "encryption_key",
  "outboxKey",
  "outbox_key",
  "*.encryptedPayload",
  "*.encrypted_payload",
  "*.payloadIv",
  "*.payload_iv",
  "*.payloadTag",
  "*.payload_tag",
  "*.encryptionKey",
  "*.encryption_key",
  "*.outboxKey",
  "*.outbox_key",
] as const;

const SENSITIVE_KEY_REGEX =
  /(password|token|secret|authorization|cookie|sessionid|apikey|credential|codeverifier|code_verifier|idtoken|id_token|accesstoken|access_token|refreshtoken|refresh_token|nonce|code|encryptedpayload|encrypted_payload|payloadiv|payload_iv|payloadtag|payload_tag|encryptionkey|encryption_key|outboxkey|outbox_key)/i;

export function sanitizeMetadata(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      result[key] = REDACTED_VALUE;
    } else if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

