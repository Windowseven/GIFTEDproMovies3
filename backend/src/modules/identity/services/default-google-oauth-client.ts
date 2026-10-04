import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENVIRONMENT_CONFIG } from "../../../config/tokens.js";
import type { EnvironmentConfig } from "../../../config/environment.js";
import { constantTimeCompare } from "../utils/token.utils.js";
import type {
  GoogleIdTokenClaims,
  GoogleOAuthClient,
  GoogleTokenExchangeResult,
} from "./google-oauth-client.interface.js";

@Injectable()
export class DefaultGoogleOAuthClient implements GoogleOAuthClient {
  private readonly logger = new Logger(DefaultGoogleOAuthClient.name);

  constructor(
    @Inject(ENVIRONMENT_CONFIG)
    private readonly config: EnvironmentConfig,
  ) {}

  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<GoogleTokenExchangeResult> {
    if (!this.config.googleClientId || !this.config.googleClientSecret) {
      throw new Error("Google OAuth credentials are not configured");
    }

    const body = new URLSearchParams({
      code,
      client_id: this.config.googleClientId,
      client_secret: this.config.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok || !data.id_token) {
      const errorMsg =
        typeof data.error_description === "string"
          ? data.error_description
          : typeof data.error === "string"
            ? data.error
            : `HTTP ${response.status}`;
      this.logger.error({ errorName: data.error }, "Google OAuth token exchange failed");
      throw new Error(`Google OAuth code exchange failed: ${errorMsg}`);
    }

    return {
      idToken: String(data.id_token),
      accessToken: String(data.access_token || ""),
    };
  }

  async verifyIdToken(
    idToken: string,
    expectedAudience: string,
    expectedNonce?: string,
  ): Promise<GoogleIdTokenClaims> {
    // 1. Decode token payload
    const parts = idToken.split(".");
    if (parts.length !== 3 || !parts[1]) {
      throw new Error("Malformed Google ID token");
    }

    let claims: GoogleIdTokenClaims;
    try {
      const json = Buffer.from(parts[1], "base64url").toString("utf8");
      claims = JSON.parse(json) as GoogleIdTokenClaims;
    } catch {
      throw new Error("Failed to parse Google ID token claims");
    }

    // 2. Validate Issuer
    const validIssuers = ["https://accounts.google.com", "accounts.google.com"];
    if (!validIssuers.includes(claims.iss)) {
      throw new Error(`Invalid Google ID token issuer: ${claims.iss}`);
    }

    // 3. Validate Audience
    if (claims.aud !== expectedAudience) {
      throw new Error("Google ID token audience mismatch");
    }

    // 4. Validate Expiry
    if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
      throw new Error("Google ID token has expired");
    }

    // 5. Validate Nonce (if supplied)
    if (expectedNonce) {
      if (!claims.nonce || !constantTimeCompare(claims.nonce, expectedNonce)) {
        throw new Error("Google ID token nonce mismatch");
      }
    }

    // 6. Validate Subject
    if (!claims.sub || typeof claims.sub !== "string" || claims.sub.trim().length === 0) {
      throw new Error("Google ID token missing valid subject claim");
    }

    // 7. Validate Email and Email Verified
    if (!claims.email || typeof claims.email !== "string") {
      throw new Error("Google ID token missing email claim");
    }
    if (claims.email_verified !== true) {
      throw new Error("Google account email is not verified");
    }

    // 8. Cryptographic signature check via Google tokeninfo endpoint
    try {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!verifyRes.ok) {
        throw new Error(`Google tokeninfo endpoint rejected token with HTTP ${verifyRes.status}`);
      }
      const verifiedData = (await verifyRes.json()) as Record<string, unknown>;
      if (verifiedData.sub !== claims.sub) {
        throw new Error("Google tokeninfo subject mismatch");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn({ errorMsg: msg }, "Google tokeninfo verification check failed");
      throw new Error(`Google ID token signature verification failed: ${msg}`, { cause: err });
    }

    return claims;
  }
}
