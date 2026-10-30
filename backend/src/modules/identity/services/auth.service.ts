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
import type { EmailSender } from "../../../infrastructure/email/email-sender.interface.js";
import {
  EmailOutboxService,
  type EnqueueVerificationParams,
  type EnqueuePasswordResetParams,
} from "../../../infrastructure/email/email-outbox.service.js";
import type { EmailOutboxRecord } from "../../../infrastructure/database/schemas/email-outbox.schema.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { SessionService } from "./session.service.js";
import { DeviceService } from "./device.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { generateSecureToken, hashToken } from "../utils/token.utils.js";
import { sessionsTable, type SessionRecord } from "../../../infrastructure/database/schemas/sessions.schema.js";

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
  private readonly outboxService: EmailOutboxService;

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    outboxOrEmail: EmailOutboxService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessionService: SessionService,
    private readonly deviceService: DeviceService,
    private readonly audit: AuditService,
  ) {
    if (outboxOrEmail && "enqueueVerificationEmail" in outboxOrEmail) {
      this.outboxService = outboxOrEmail;
    } else {
      const emailSender = outboxOrEmail as unknown as EmailSender;
      this.outboxService = {
        enqueueVerificationEmail: async (params: EnqueueVerificationParams) => {
          if (emailSender?.sendVerificationEmail) {
            await emailSender.sendVerificationEmail(params.email, params.rawToken);
          }
          return { id: "compat-outbox-id" } as unknown as EmailOutboxRecord;
        },
        enqueuePasswordResetEmail: async (params: EnqueuePasswordResetParams) => {
          if (emailSender?.sendPasswordResetEmail) {
            await emailSender.sendPasswordResetEmail(params.email, params.rawToken);
          }
          return { id: "compat-outbox-id" } as unknown as EmailOutboxRecord;
        },
        cancelSupersededJobs: async () => {},
      } as unknown as EmailOutboxService;
    }
  }

  private async executeInTransaction<T>(
    callback: (tx: ApplicationDatabase) => Promise<T>,
  ): Promise<T> {
    if (typeof this.db?.transaction === "function") {
      return this.db.transaction(callback);
    }
    return callback(this.db);
  }

  /**
   * Registers a new customer account.
   * Public registration strictly forces role = 'customer' and status = 'pending_verification'.
   * Atomically commits user, verification token hash, and encrypted email outbox job.
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

    const createdUser = await this.executeInTransaction(async (tx) => {
      const [user] = await tx
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

      await tx.insert(authTokensTable).values({
        userId: user.id,
        type: "email_verification",
        tokenHash,
        expiresAt,
      });

      await this.outboxService.enqueueVerificationEmail(
        {
          userId: user.id,
          email: user.email,
          rawToken,
        },
        tx as ApplicationDatabase,
      );

      return user;
    });

    await this.audit.recordEvent({
      actorId: createdUser.id,
      action: "auth.register",
      resourceType: "user",
      resourceId: createdUser.id,
      metadata: { email: normalizedEmail },
    });

    return sanitizeUser(createdUser);
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

    // Atomic transaction: invalidate previous unused tokens, cancel superseded outbox jobs, issue fresh token, enqueue fresh outbox job
    await this.executeInTransaction(async (tx) => {
      // Invalidate previous unused verification tokens
      await tx
        .update(authTokensTable)
        .set({ usedAt: now })
        .where(
          and(
            eq(authTokensTable.userId, user.id),
            eq(authTokensTable.type, "email_verification"),
            isNull(authTokensTable.usedAt),
          ),
        );

      // Cancel previous pending/processing outbox jobs
      await this.outboxService.cancelSupersededJobs(user.id, "email_verification", tx as ApplicationDatabase);

      // Issue fresh token
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS);

      await tx.insert(authTokensTable).values({
        userId: user.id,
        type: "email_verification",
        tokenHash,
        expiresAt,
      });

      await this.outboxService.enqueueVerificationEmail(
        {
          userId: user.id,
          email: user.email,
          rawToken,
        },
        tx as ApplicationDatabase,
      );
    });

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

    if (!user.passwordHash) {
      await this.audit.recordEvent({
        actorId: user.id,
        action: "auth.login.failed",
        resourceType: "user",
        resourceId: user.id,
        metadata: { reason: "password_not_set" },
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

    // Atomic transaction: invalidate previous unused reset tokens, cancel superseded outbox jobs, issue fresh token, enqueue fresh outbox job
    await this.executeInTransaction(async (tx) => {
      // Invalidate previous unused password reset tokens
      await tx
        .update(authTokensTable)
        .set({ usedAt: now })
        .where(
          and(
            eq(authTokensTable.userId, user.id),
            eq(authTokensTable.type, "password_reset"),
            isNull(authTokensTable.usedAt),
          ),
        );

      // Cancel previous pending/processing outbox jobs
      await this.outboxService.cancelSupersededJobs(user.id, "password_reset", tx as ApplicationDatabase);

      // Issue fresh token (1 hour TTL)
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

      await tx.insert(authTokensTable).values({
        userId: user.id,
        type: "password_reset",
        tokenHash,
        expiresAt,
      });

      await this.outboxService.enqueuePasswordResetEmail(
        {
          userId: user.id,
          email: user.email,
          rawToken,
        },
        tx as ApplicationDatabase,
      );
    });

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

  /**
   * Authenticated in-session password change.
   * Atomically updates password hash, rotates active session, revokes all other sessions,
   * and records fail-closed audit event in a single PostgreSQL transaction.
   */
  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{ session: SessionRecord; rawToken: string }> {
    // 1. Fetch user to verify status and current password hash
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("User account is not active");
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        "Account does not have a password set. Use account recovery or set password flow.",
      );
    }

    // 2. Verify current password with Argon2id
    const isCurrentValid = await this.passwordHasher.verifyPassword(
      user.passwordHash,
      currentPassword,
    );

    if (!isCurrentValid) {
      try {
        await this.audit.recordEvent({
          actorId: userId,
          action: "auth.password_change.failed",
          resourceType: "user",
          resourceId: userId,
          metadata: { reason: "invalid_current_password" },
          ipAddress,
          userAgent,
          failClosed: false,
        });
      } catch {
        // Logging error must not prevent failure response or leak info
      }
      throw new UnauthorizedException("Invalid current password");
    }

    // 3. Prevent setting identical password
    if (newPassword === currentPassword) {
      throw new BadRequestException("New password cannot be identical to current password");
    }

    // 4. Hash new password outside transaction (prevents holding DB connection during CPU-intensive Argon2id)
    const newPasswordHash = await this.passwordHasher.hashPassword(newPassword);

    // 5. Execute atomic transaction
    return await this.executeInTransaction(async (tx) => {
      // Row lock on user to ensure strict mutual exclusion for concurrent requests
      const [lockedUser] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .for("update");

      if (!lockedUser || lockedUser.status !== "active") {
        throw new UnauthorizedException("User account is not active");
      }

      // Conditionally verify and rotate session (atomic test-and-set)
      const [currentSession] = await tx
        .update(sessionsTable)
        .set({
          revokedAt: new Date(),
          revokedReason: "password_change",
        })
        .where(
          and(
            eq(sessionsTable.id, currentSessionId),
            isNull(sessionsTable.revokedAt),
          ),
        )
        .returning();

      if (!currentSession) {
        throw new UnauthorizedException("Session has already been revoked or rotated");
      }

      // Update password hash
      const now = new Date();
      await tx
        .update(usersTable)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: now,
        })
        .where(eq(usersTable.id, userId));

      // Create new rotated session
      const { session: newSession, rawToken } = await this.sessionService.createSession(
        userId,
        currentSession.deviceId,
        ipAddress,
        userAgent,
        tx,
      );

      // Revoke all other active sessions for this user
      await this.sessionService.revokeOtherUserSessions(
        userId,
        newSession.id,
        "password_change",
        tx,
      );

      // Fail-closed success audit event in the same transaction
      await this.audit.recordEvent({
        actorId: userId,
        action: "auth.password_change.completed",
        resourceType: "user",
        resourceId: userId,
        metadata: {
          previousSessionId: currentSession.id,
          newSessionId: newSession.id,
        },
        ipAddress,
        userAgent,
        tx,
        failClosed: true,
      });

      return { session: newSession, rawToken };
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId, "user_logout");
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId, "user_logout_all");
  }
}
