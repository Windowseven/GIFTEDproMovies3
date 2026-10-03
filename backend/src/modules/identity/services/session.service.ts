import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import { sessionsTable, type SessionRecord } from "../../../infrastructure/database/schemas/sessions.schema.js";
import { usersTable, type UserRecord } from "../../../infrastructure/database/schemas/users.schema.js";
import { generateSecureToken, hashToken } from "../utils/token.utils.js";
import { AuditService } from "../../audit/audit.service.js";

const INACTIVITY_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOUCH_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

export interface ResolvedSessionContext {
  session: SessionRecord;
  user: UserRecord;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly audit: AuditService,
  ) {}

  /**
   * Creates a fresh authenticated session with a cryptographically secure token.
   * Only the SHA-256 hash is persisted.
   */
  async createSession(
    userId: string,
    deviceId?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{ session: SessionRecord; rawToken: string }> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

    const [session] = await this.db
      .insert(sessionsTable)
      .values({
        userId,
        deviceId: deviceId ?? null,
        tokenHash,
        lastActiveAt: now,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      })
      .returning();

    if (!session) {
      throw new Error("Failed to insert session record");
    }

    await this.audit.recordEvent({
      actorId: userId,
      action: "session.created",
      resourceType: "session",
      resourceId: session.id,
      metadata: { deviceId },
      ipAddress,
      userAgent,
    });

    return { session, rawToken };
  }

  /**
   * Resolves an authenticated session by raw token.
   * Enforces non-extensible absolute timeout and throttled inactivity timeout.
   * Rejects immediately if revoked or expired.
   */
  async resolveSession(rawToken: string): Promise<ResolvedSessionContext | null> {
    if (!rawToken || typeof rawToken !== "string") {
      return null;
    }

    const tokenHash = hashToken(rawToken);
    const result = await this.db
      .select({
        session: sessionsTable,
        user: usersTable,
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(and(eq(sessionsTable.tokenHash, tokenHash), isNull(sessionsTable.revokedAt)))
      .limit(1);

    const match = result[0];
    if (!match) {
      return null;
    }

    const now = new Date();
    const { session, user } = match;

    // 1. Check absolute timeout (cannot be extended by activity)
    if (now.getTime() > session.expiresAt.getTime()) {
      await this.revokeSession(session.id, "absolute_timeout_expired");
      return null;
    }

    // 2. Check inactivity timeout
    if (now.getTime() - session.lastActiveAt.getTime() > INACTIVITY_TIMEOUT_MS) {
      await this.revokeSession(session.id, "inactivity_timeout_expired");
      return null;
    }

    return { session, user };
  }

  /**
   * Throttled touch: updates last_active_at only if 15 minutes have elapsed.
   */
  async touchSession(sessionId: string, lastActiveAt: Date): Promise<void> {
    const now = new Date();
    if (now.getTime() - lastActiveAt.getTime() >= TOUCH_THROTTLE_MS) {
      await this.db
        .update(sessionsTable)
        .set({ lastActiveAt: now })
        .where(eq(sessionsTable.id, sessionId));
    }
  }

  /**
   * Rotates a session token at privilege or security boundaries.
   * Revokes the old session and creates a new one preserving user & device context.
   */
  async rotateSession(
    sessionId: string,
    reason = "privilege_rotation",
  ): Promise<{ session: SessionRecord; rawToken: string }> {
    const existing = await this.db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    const oldSession = existing[0];
    if (!oldSession) {
      throw new Error("Session to rotate not found");
    }

    await this.revokeSession(sessionId, reason);
    return await this.createSession(
      oldSession.userId,
      oldSession.deviceId,
      oldSession.ipAddress,
      oldSession.userAgent,
    );
  }

  /**
   * Revokes a single session.
   */
  async revokeSession(sessionId: string, reason: string): Promise<void> {
    const [revoked] = await this.db
      .update(sessionsTable)
      .set({
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where(and(eq(sessionsTable.id, sessionId), isNull(sessionsTable.revokedAt)))
      .returning();

    if (revoked) {
      await this.audit.recordEvent({
        actorId: revoked.userId,
        action: "session.revoked",
        resourceType: "session",
        resourceId: sessionId,
        metadata: { reason },
      });
    }
  }

  /**
   * Revokes all active sessions for a user (e.g., logout-all, password reset, status change).
   */
  async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    await this.db
      .update(sessionsTable)
      .set({
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where(and(eq(sessionsTable.userId, userId), isNull(sessionsTable.revokedAt)));

    await this.audit.recordEvent({
      actorId: userId,
      action: "session.revoke_all",
      resourceType: "user",
      resourceId: userId,
      metadata: { reason },
    });
  }

  /**
   * Revokes all active sessions associated with a specific device upon device removal.
   */
  async revokeDeviceSessions(deviceId: string, reason: string): Promise<void> {
    await this.db
      .update(sessionsTable)
      .set({
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where(and(eq(sessionsTable.deviceId, deviceId), isNull(sessionsTable.revokedAt)));

    await this.audit.recordEvent({
      action: "session.revoke_device",
      resourceType: "device",
      resourceId: deviceId,
      metadata: { reason },
    });
  }
}
