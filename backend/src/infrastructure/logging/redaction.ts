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
] as const;

const SENSITIVE_KEY_REGEX = /(password|token|secret|authorization|cookie|sessionid|apikey|credential)/i;

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

