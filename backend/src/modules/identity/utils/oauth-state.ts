import crypto from "node:crypto";
import { constantTimeCompare } from "./token.utils.js";

export interface OAuthStatePayload {
  state: string;
  codeVerifier: string;
  nonce: string;
  returnTo: string;
  createdAt: number;
}

export const OAUTH_STATE_COOKIE_NAME = "gp_oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 600; // 10 minutes

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function serializeOAuthState(
  payload: OAuthStatePayload,
  signingSecret: string,
): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json, "utf8").toString("base64url");
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(data)
    .digest("base64url");
  return `${data}.${hmac}`;
}

export function parseAndVerifyOAuthState(
  cookieValue: string | undefined | null,
  expectedState: string,
  signingSecret: string,
): OAuthStatePayload | null {
  if (!cookieValue || typeof cookieValue !== "string" || !expectedState) {
    return null;
  }

  const parts = cookieValue.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [data, signature] = parts;
  if (!data || !signature) {
    return null;
  }

  const expectedHmac = crypto
    .createHmac("sha256", signingSecret)
    .update(data)
    .digest("base64url");

  if (!constantTimeCompare(signature, expectedHmac)) {
    return null;
  }

  try {
    const json = Buffer.from(data, "base64url").toString("utf8");
    const payload = JSON.parse(json) as OAuthStatePayload;

    if (!payload.state || !payload.codeVerifier || !payload.nonce || !payload.createdAt) {
      return null;
    }

    // Check expiry (10 minutes)
    if (Date.now() - payload.createdAt > OAUTH_STATE_MAX_AGE_SECONDS * 1000) {
      return null;
    }

    // Constant-time compare state
    if (!constantTimeCompare(payload.state, expectedState)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
