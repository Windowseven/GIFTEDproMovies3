import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { ENVIRONMENT_CONFIG } from "../../../config/tokens.js";
import type { EnvironmentConfig } from "../../../config/environment.js";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import {
  userIdentitiesTable,
  usersTable,
  type UserRecord,
} from "../../../infrastructure/database/schemas/index.js";
import { AuditService } from "../../audit/audit.service.js";
import { SessionService } from "./session.service.js";
import { sanitizeUser, type SafeUser } from "./auth.service.js";
import {
  generatePkcePair,
  parseAndVerifyOAuthState,
  serializeOAuthState,
  type OAuthStatePayload,
} from "../utils/oauth-state.js";
import { sanitizeRedirectUrl } from "../utils/redirect-validator.js";
import { generateSecureToken } from "../utils/token.utils.js";
import {
  GOOGLE_OAUTH_CLIENT,
  type GoogleOAuthClient,
} from "./google-oauth-client.interface.js";
import type { SessionRecord } from "../../../infrastructure/database/schemas/sessions.schema.js";

export interface GoogleAuthCallbackResult {
  redirectUrl: string;
  session?: SessionRecord;
  rawToken?: string;
  user?: SafeUser;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    @Inject(ENVIRONMENT_CONFIG)
    private readonly config: EnvironmentConfig,
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    @Inject(GOOGLE_OAUTH_CLIENT)
    private readonly googleClient: GoogleOAuthClient,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  private getSigningSecret(): string {
    return `${this.config.databaseUrl}:${this.config.googleClientSecret || "gp_dev_state_secret"}`;
  }

  /**
   * Generates Google OAuth authorization URL, PKCE challenge, state, and signed state cookie.
   */
  getAuthorizationUrl(returnTo?: string): {
    authorizationUrl: string;
    stateCookie: string;
  } {
    if (!this.config.googleClientId) {
      throw new BadRequestException("Google authentication is not configured");
    }

    const safeReturnTo = sanitizeRedirectUrl(
      returnTo,
      this.config.corsOrigins,
      this.config.frontendUrl,
    );

    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = generateSecureToken(32);
    const nonce = generateSecureToken(32);

    const statePayload: OAuthStatePayload = {
      state,
      codeVerifier,
      nonce,
      returnTo: safeReturnTo,
      createdAt: Date.now(),
    };

    const stateCookie = serializeOAuthState(statePayload, this.getSigningSecret());

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.config.googleClientId);
    url.searchParams.set("redirect_uri", this.config.googleCallbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("prompt", "select_account");

    return {
      authorizationUrl: url.toString(),
      stateCookie,
    };
  }

  /**
   * Processes OAuth callback:
   * 1. Validates and single-use invalidates state cookie.
   * 2. Exchanges code using PKCE code_verifier.
   * 3. Validates ID token claims (iss, aud, exp, nonce, sub, email, email_verified).
   * 4. Resolves identity: Google sub first.
   * 5. Enforces central account status before session creation.
   * 6. Creates DB-backed opaque session and returns safe redirect.
   */
  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
    stateCookie?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<GoogleAuthCallbackResult> {
    const defaultFailRedirect = `${this.config.frontendUrl}/auth/login`;

    // 1. Check for provider error
    if (params.error) {
      this.logger.warn({ oauthError: params.error }, "Google OAuth provider reported error");
      await this.audit.recordEvent({
        action: "auth.google.callback.failed",
        resourceType: "oauth",
        metadata: { reason: "provider_error" },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return { redirectUrl: `${defaultFailRedirect}?error=google_auth_failed` };
    }

    if (!params.code || !params.state) {
      return { redirectUrl: `${defaultFailRedirect}?error=invalid_request` };
    }

    // 2. Validate HMAC-signed state cookie and transaction binding
    const statePayload = parseAndVerifyOAuthState(
      params.stateCookie,
      params.state,
      this.getSigningSecret(),
    );

    if (!statePayload) {
      this.logger.warn("Google OAuth callback received with invalid or expired state cookie");
      await this.audit.recordEvent({
        action: "auth.google.callback.failed",
        resourceType: "oauth",
        metadata: { reason: "invalid_state_cookie" },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return { redirectUrl: `${defaultFailRedirect}?error=invalid_state` };
    }

    // 3. Exchange code for tokens
    let tokens;
    try {
      tokens = await this.googleClient.exchangeCode(
        params.code,
        statePayload.codeVerifier,
        this.config.googleCallbackUrl,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Code exchange failed";
      this.logger.error({ error: msg }, "Failed to exchange Google OAuth code");
      await this.audit.recordEvent({
        action: "auth.google.callback.failed",
        resourceType: "oauth",
        metadata: { reason: "code_exchange_failed" },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return { redirectUrl: `${defaultFailRedirect}?error=token_exchange_failed` };
    }

    // 4. Validate ID token claims
    let claims;
    try {
      claims = await this.googleClient.verifyIdToken(
        tokens.idToken,
        this.config.googleClientId ?? "",
        statePayload.nonce,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ID token verification failed";
      this.logger.error({ error: msg }, "Google ID token validation failed");
      await this.audit.recordEvent({
        action: "auth.google.callback.failed",
        resourceType: "oauth",
        metadata: { reason: "id_token_invalid" },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return { redirectUrl: `${defaultFailRedirect}?error=invalid_id_token` };
    }

    // 5. Ensure email is verified by Google
    if (claims.email_verified !== true) {
      await this.audit.recordEvent({
        action: "auth.google.callback.failed",
        resourceType: "oauth",
        metadata: { reason: "email_unverified" },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      return { redirectUrl: `${defaultFailRedirect}?error=email_not_verified` };
    }

    const normalizedEmail = claims.email.toLowerCase().trim();

    // 6. Identity Resolution: Google sub FIRST
    const [existingIdentity] = await this.db
      .select()
      .from(userIdentitiesTable)
      .where(
        and(
          eq(userIdentitiesTable.provider, "google"),
          eq(userIdentitiesTable.providerSubject, claims.sub),
        ),
      )
      .limit(1);

    let user: UserRecord | undefined;

    if (existingIdentity) {
      // Case A: Existing Google Identity
      const [loadedUser] = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, existingIdentity.userId))
        .limit(1);

      if (!loadedUser) {
        throw new Error("Orphaned Google identity: associated user not found");
      }
      user = loadedUser;

      // Central Account Status Validation BEFORE Session Issuance
      if (user.status === "suspended") {
        await this.audit.recordEvent({
          actorId: user.id,
          action: "auth.google.login.blocked",
          resourceType: "user",
          resourceId: user.id,
          metadata: { status: "suspended" },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
        return { redirectUrl: `${defaultFailRedirect}?error=account_suspended` };
      }

      if (user.status === "deactivated") {
        await this.audit.recordEvent({
          actorId: user.id,
          action: "auth.google.login.blocked",
          resourceType: "user",
          resourceId: user.id,
          metadata: { status: "deactivated" },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
        return { redirectUrl: `${defaultFailRedirect}?error=account_deactivated` };
      }

      // If user was pending_verification, promote to active because Google proved mailbox control
      if (user.status === "pending_verification") {
        const [activated] = await this.db
          .update(usersTable)
          .set({ status: "active", emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(usersTable.id, user.id))
          .returning();
        if (activated) {
          user = activated;
        }
      }

      await this.audit.recordEvent({
        actorId: user.id,
        action: "auth.google.login.success",
        resourceType: "session",
        metadata: { provider: "google" },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    } else {
      // Identity does not exist: Check for email collision (Case C vs Case B)
      const [existingUserByEmail] = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, normalizedEmail))
        .limit(1);

      if (existingUserByEmail) {
        // Case C: New Google identity + existing account with same email
        // Strict boundary: DO NOT auto-link. Must authenticate first.
        await this.audit.recordEvent({
          actorId: existingUserByEmail.id,
          action: "auth.google.link.conflict",
          resourceType: "user",
          resourceId: existingUserByEmail.id,
          metadata: { provider: "google" },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
        return {
          redirectUrl: `${defaultFailRedirect}?error=account_exists_link_required`,
        };
      }

      // Case B: New Google Identity + No existing account
      // Atomic creation in transaction
      const createdUser = await this.db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(usersTable)
          .values({
            email: normalizedEmail,
            passwordHash: null,
            role: "customer", // Strict customer role default
            status: "active", // Google verified email
            emailVerifiedAt: new Date(),
          })
          .returning();

        if (!newUser) {
          throw new Error("Failed to create user during Google registration");
        }

        await tx.insert(userIdentitiesTable).values({
          userId: newUser.id,
          provider: "google",
          providerSubject: claims.sub,
          emailAtLinkTime: normalizedEmail,
        });

        return newUser;
      });

      user = createdUser;

      await this.audit.recordEvent({
        actorId: user.id,
        action: "auth.google.register.success",
        resourceType: "user",
        resourceId: user.id,
        metadata: { provider: "google" },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    }

    // 7. Session Creation
    const { session, rawToken } = await this.sessionService.createSession(
      user.id,
      null,
      params.ipAddress,
      params.userAgent,
    );

    return {
      redirectUrl: statePayload.returnTo,
      session,
      rawToken,
      user: sanitizeUser(user),
    };
  }

  /**
   * Explicit authenticated account linking:
   * Links a Google identity to the currently logged-in user.
   */
  async linkAccount(
    currentUser: SafeUser,
    code: string,
    state: string,
    stateCookie?: string,
  ): Promise<{ message: string }> {
    const statePayload = parseAndVerifyOAuthState(
      stateCookie,
      state,
      this.getSigningSecret(),
    );

    if (!statePayload) {
      throw new BadRequestException("Invalid or expired OAuth state for account linking");
    }

    const tokens = await this.googleClient.exchangeCode(
      code,
      statePayload.codeVerifier,
      this.config.googleCallbackUrl,
    );

    const claims = await this.googleClient.verifyIdToken(
      tokens.idToken,
      this.config.googleClientId ?? "",
      statePayload.nonce,
    );

    if (claims.email_verified !== true) {
      throw new BadRequestException("Google account email is not verified");
    }

    // Check if this Google sub is already linked to anyone
    const [existingLink] = await this.db
      .select()
      .from(userIdentitiesTable)
      .where(
        and(
          eq(userIdentitiesTable.provider, "google"),
          eq(userIdentitiesTable.providerSubject, claims.sub),
        ),
      )
      .limit(1);

    if (existingLink) {
      if (existingLink.userId === currentUser.id) {
        return { message: "Google account is already linked to your profile." };
      }
      throw new ConflictException("This Google account is already linked to another user");
    }

    // Check if the current user already has a Google identity linked
    const [userExistingGoogle] = await this.db
      .select()
      .from(userIdentitiesTable)
      .where(
        and(
          eq(userIdentitiesTable.userId, currentUser.id),
          eq(userIdentitiesTable.provider, "google"),
        ),
      )
      .limit(1);

    if (userExistingGoogle) {
      throw new ConflictException("Your account is already linked to a Google account");
    }

    // Transactional link
    await this.db.transaction(async (tx) => {
      await tx.insert(userIdentitiesTable).values({
        userId: currentUser.id,
        provider: "google",
        providerSubject: claims.sub,
        emailAtLinkTime: claims.email.toLowerCase().trim(),
      });
    });

    await this.audit.recordEvent({
      actorId: currentUser.id,
      action: "auth.google.link.success",
      resourceType: "user",
      resourceId: currentUser.id,
      metadata: { provider: "google" },
      failClosed: true,
    });

    return { message: "Google account successfully linked." };
  }

  /**
   * Explicit account unlinking:
   * Prevents lockout if user has no password set.
   * Prevents IDOR/BOLA by scoping deletion to currentUser.id.
   */
  async unlinkAccount(currentUser: SafeUser): Promise<{ message: string }> {
    // 1. Verify user has a password set to prevent account lockout
    const [user] = await this.db
      .select({ passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.id, currentUser.id))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new BadRequestException(
        "Cannot unlink Google account without a password set. Please set an account password first.",
      );
    }

    // 2. Verify Google identity exists for this user
    const [link] = await this.db
      .select()
      .from(userIdentitiesTable)
      .where(
        and(
          eq(userIdentitiesTable.userId, currentUser.id),
          eq(userIdentitiesTable.provider, "google"),
        ),
      )
      .limit(1);

    if (!link) {
      throw new NotFoundException("No linked Google account found for your user");
    }

    // 3. Transactional deletion
    await this.db
      .delete(userIdentitiesTable)
      .where(
        and(
          eq(userIdentitiesTable.userId, currentUser.id),
          eq(userIdentitiesTable.provider, "google"),
        ),
      );

    await this.audit.recordEvent({
      actorId: currentUser.id,
      action: "auth.google.unlink.success",
      resourceType: "user",
      resourceId: currentUser.id,
      metadata: { provider: "google" },
      failClosed: true,
    });

    return { message: "Google account successfully unlinked." };
  }
}
