import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq, isNull, gt } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import { usersTable, type UserRecord } from "../../../infrastructure/database/schemas/users.schema.js";
import { authTokensTable } from "../../../infrastructure/database/schemas/auth-tokens.schema.js";
import { EMAIL_SENDER } from "../../../infrastructure/email/email.tokens.js";
import type { EmailSender } from "../../../infrastructure/email/email-sender.interface.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { SessionService } from "./session.service.js";
import { DeviceService } from "./device.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { generateSecureToken, hashToken } from "../utils/token.utils.js";
import type { SessionRecord } from "../../../infrastructure/database/schemas/sessions.schema.js";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface DeviceMetadataInput {
  deviceIdentifier: string;
  deviceName: string;
  deviceType?: string;
}

export type SafeUser = Omit<UserRecord, "passwordHash">;

export function sanitizeUser(user: UserRecord): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSender,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessionService: SessionService,
    private readonly deviceService: DeviceService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registers a new customer account.
   * Public registration strictly forces role = 'customer' and status = 'pending_verification'.
   */
  async register(email: string, password: string): Promise<SafeUser> {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing[0]) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await this.passwordHasher.hashPassword(password);

    const [user] = await this.db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        passwordHash,
        role: "customer",
        status: "pending_verification",
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    // Issue verification token
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.db.insert(authTokensTable).values({
      userId: user.id,
      type: "email_verification",
      tokenHash,
      expiresAt,
    });

    await this.emailSender.sendVerificationEmail(user.email, rawToken);

    await this.audit.recordEvent({
      actorId: user.id,
      action: "auth.register",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email: normalizedEmail },
    });

    return sanitizeUser(user);
  }

  /**
   * Verifies an email address using a single-use token.
   * Promotes account from pending_verification to active.
   */
  async verifyEmail(rawToken: string): Promise<void> {
    if (!rawToken || typeof rawToken !== "string") {
      throw new BadRequestException("Invalid or expired verification token");
    }

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const [tokenRecord] = await this.db
      .select()
      .from(authTokensTable)
      .where(
        and(
          eq(authTokensTable.tokenHash, tokenHash),
          eq(authTokensTable.type, "email_verification"),
          isNull(authTokensTable.usedAt),
          gt(authTokensTable.expiresAt, now),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    // 1. Mark token used
    await this.db
      .update(authTokensTable)
      .set({ usedAt: now })
      .where(eq(authTokensTable.id, tokenRecord.id));

    // 2. Activate user
    await this.db
      .update(usersTable)
      .set({
        status: "active",
        emailVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(usersTable.id, tokenRecord.userId));

    await this.audit.recordEvent({
      actorId: tokenRecord.userId,
      action: "auth.email_verified",
      resourceType: "user",
      resourceId: tokenRecord.userId,
    });
  }

  /**
   * Resends email verification. Deterministically invalidates all previous unused tokens.
   */
  async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    // Non-enumerating return if user doesn't exist or is already active
    if (!user || user.status !== "pending_verification") {
      return;
    }

    const now = new Date();

    // Invalidate previous unused verification tokens
    await this.db
      .update(authTokensTable)
      .set({ usedAt: now })
      .where(
        and(
          eq(authTokensTable.userId, user.id),
          eq(authTokensTable.type, "email_verification"),
          isNull(authTokensTable.usedAt),
        ),
      );

    // Issue fresh token
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS);

    await this.db.insert(authTokensTable).values({
      userId: user.id,
      type: "email_verification",
      tokenHash,
      expiresAt,
    });

    await this.emailSender.sendVerificationEmail(user.email, rawToken);

    await this.audit.recordEvent({
      actorId: user.id,
      action: "auth.verification_resent",
      resourceType: "user",
      resourceId: user.id,
    });
  }

  /**
   * Authenticates credentials and issues an opaque database session.
   * Central account-status enforcement: suspended and deactivated accounts are rejected.
   */
  async login(
    email: string,
    candidatePassword: string,
    deviceMeta?: DeviceMetadataInput | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{ user: SafeUser; session: SessionRecord; rawToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (!user) {
      await this.audit.recordEvent({
        action: "auth.login.failed",
        resourceType: "user",
        metadata: { email: normalizedEmail, reason: "user_not_found" },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValidPassword = await this.passwordHasher.verifyPassword(
      user.passwordHash,
      candidatePassword,
    );

    if (!isValidPassword) {
      await this.audit.recordEvent({
        actorId: user.id,
        action: "auth.login.failed",
        resourceType: "user",
        resourceId: user.id,
        metadata: { reason: "invalid_password" },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    // Central account status enforcement
    if (user.status === "suspended") {
      await this.audit.recordEvent({
        actorId: user.id,
        action: "auth.login.blocked",
        resourceType: "user",
        resourceId: user.id,
        metadata: { status: "suspended" },
        ipAddress,
        userAgent,
      });
      throw new ForbiddenException("ACCOUNT_SUSPENDED: Your account has been suspended");
    }

    if (user.status === "deactivated") {
      await this.audit.recordEvent({
        actorId: user.id,
        action: "auth.login.blocked",
        resourceType: "user",
        resourceId: user.id,
        metadata: { status: "deactivated" },
        ipAddress,
        userAgent,
      });
      throw new ForbiddenException("ACCOUNT_DEACTIVATED: Your account has been deactivated");
    }

    let deviceId: string | null = null;
    if (deviceMeta) {
      const device = await this.deviceService.registerOrUpdateDevice(
        user.id,
        deviceMeta.deviceIdentifier,
        deviceMeta.deviceName,
        deviceMeta.deviceType,
      );
      deviceId = device.id;
    }

    const { session, rawToken } = await this.sessionService.createSession(
      user.id,
      deviceId,
      ipAddress,
      userAgent,
    );

    await this.audit.recordEvent({
      actorId: user.id,
      action: "auth.login.success",
      resourceType: "session",
      resourceId: session.id,
      metadata: { deviceId },
      ipAddress,
      userAgent,
    });

    return { user: sanitizeUser(user), session, rawToken };
  }

  /**
   * Requests a password reset. Non-enumerating.
   * Deterministically invalidates previous unused reset tokens.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    // Non-enumerating return if user does not exist or is deactivated/suspended
    if (!user || user.status === "deactivated" || user.status === "suspended") {
      return;
    }

    const now = new Date();

    // Invalidate previous unused password reset tokens
    await this.db
      .update(authTokensTable)
      .set({ usedAt: now })
      .where(
        and(
          eq(authTokensTable.userId, user.id),
          eq(authTokensTable.type, "password_reset"),
          isNull(authTokensTable.usedAt),
        ),
      );

    // Issue fresh token (1 hour TTL)
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

    await this.db.insert(authTokensTable).values({
      userId: user.id,
      type: "password_reset",
      tokenHash,
      expiresAt,
    });

    await this.emailSender.sendPasswordResetEmail(user.email, rawToken);

    await this.audit.recordEvent({
      actorId: user.id,
      action: "auth.password_reset.requested",
      resourceType: "user",
      resourceId: user.id,
    });
  }

  /**
   * Resets password using valid token.
   * Invariant: immediately revokes ALL active sessions for that user. Fail-closed audit.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    if (!rawToken || typeof rawToken !== "string") {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const [tokenRecord] = await this.db
      .select()
      .from(authTokensTable)
      .where(
        and(
          eq(authTokensTable.tokenHash, tokenHash),
          eq(authTokensTable.type, "password_reset"),
          isNull(authTokensTable.usedAt),
          gt(authTokensTable.expiresAt, now),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const passwordHash = await this.passwordHasher.hashPassword(newPassword);

    // 1. Mark token used
    await this.db
      .update(authTokensTable)
      .set({ usedAt: now })
      .where(eq(authTokensTable.id, tokenRecord.id));

    // 2. Update user password
    await this.db
      .update(usersTable)
      .set({
        passwordHash,
        updatedAt: now,
      })
      .where(eq(usersTable.id, tokenRecord.userId));

    // 3. Mandatory Invariant: Revoke ALL existing active sessions for this user
    await this.sessionService.revokeAllUserSessions(tokenRecord.userId, "password_reset");

    // 4. Fail-closed audit
    await this.audit.recordEvent({
      actorId: tokenRecord.userId,
      action: "auth.password_reset.completed",
      resourceType: "user",
      resourceId: tokenRecord.userId,
      failClosed: true,
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId, "user_logout");
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId, "user_logout_all");
  }
}
