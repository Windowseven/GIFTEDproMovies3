/**
 * Validates and sanitizes post-authentication redirect destinations.
 * Enforces strict open-redirect prevention against protocol-relative,
 * foreign origin, control characters, data/javascript URI, and userinfo spoofing attacks.
 */
export function sanitizeRedirectUrl(
  returnTo: string | undefined | null,
  allowedOrigins: readonly string[],
  frontendUrl: string,
): string {
  if (!returnTo || typeof returnTo !== "string") {
    return frontendUrl;
  }

  const trimmed = returnTo.trim();
  if (trimmed.length === 0) {
    return frontendUrl;
  }

  // Reject dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return frontendUrl;
  }

  // Reject protocol-relative URLs: "//evil.com", "///evil.com", "/\evil.com", "\evil.com"
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.startsWith("\\")
  ) {
    return frontendUrl;
  }

  // Safe relative paths: starts with single "/" and must not contain backslashes or authority characters
  if (trimmed.startsWith("/")) {
    if (trimmed.includes("\\") || trimmed.includes("@")) {
      return frontendUrl;
    }
    try {
      const frontendOrigin = new URL(frontendUrl).origin;
      return new URL(trimmed, frontendOrigin).toString();
    } catch {
      return frontendUrl;
    }
  }

  // Absolute URLs: must parse cleanly and match configured trusted origins
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return frontendUrl;
    }

    // Reject userinfo spoofing: https://user:pass@evil.com or https://trusted.origin@evil.com
    if (parsed.username || parsed.password) {
      return frontendUrl;
    }

    const trustedOrigins = new Set([
      new URL(frontendUrl).origin,
      ...allowedOrigins.map((o) => {
        try {
          return new URL(o).origin;
        } catch {
          return o;
        }
      }),
    ]);

    if (trustedOrigins.has(parsed.origin)) {
      return parsed.toString();
    }
  } catch {
    return frontendUrl;
  }

  return frontendUrl;
}
