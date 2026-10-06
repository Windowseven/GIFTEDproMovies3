import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import { usersTable, type UserRecord } from "../../../infrastructure/database/schemas/users.schema.js";
import { userCapabilitiesTable } from "../../../infrastructure/database/schemas/capabilities.schema.js";
import { SessionService } from "./session.service.js";
import { AuditService } from "../../audit/audit.service.js";
import { sanitizeUser, type SafeUser } from "./auth.service.js";

export const VALID_CAPABILITIES = [
  "CONTENT_CREATE",
  "CONTENT_EDIT",
  "CONTENT_UPLOAD",
  "CONTENT_PUBLISH",
  "CONTENT_UNPUBLISH",
  "CONTENT_ARCHIVE",
  "CONTENT_DELETE",
  "TAXONOMY_MANAGE",
] as const;

export type StaffCapability = (typeof VALID_CAPABILITIES)[number];

@Injectable()
export class AccountService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  async getUserById(userId: string): Promise<UserRecord | null> {
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    return user ?? null;
  }

  async getSafeUserById(userId: string): Promise<SafeUser | null> {
    const user = await this.getUserById(userId);
    return user ? sanitizeUser(user) : null;
  }

  /**
   * Updates an account's status according to the approved state transition matrix.
   * Admin-only. Revokes all active sessions upon suspension or deactivation.
   * Fails closed on audit failure.
   */
  async updateAccountStatus(
    adminId: string,
    targetUserId: string,
    newStatus: "active" | "suspended" | "deactivated",
  ): Promise<SafeUser> {
    const user = await this.getUserById(targetUserId);
    if (!user) {
      throw new NotFoundException("Target user not found");
    }

    const currentStatus = user.status;

    // Validate Transition Matrix
    if (currentStatus === "deactivated") {
      throw new BadRequestException("Deactivated accounts cannot be modified or reactivated");
    }

    if (currentStatus === "pending_verification" && newStatus === "suspended") {
      throw new BadRequestException("Pending verification accounts cannot be transitioned directly to suspended");
    }

    if (currentStatus === newStatus) {
      return sanitizeUser(user);
    }

    const now = new Date();

    // 1. Update user status
    const [updated] = await this.db
      .update(usersTable)
      .set({
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(usersTable.id, targetUserId))
      .returning();

    // 2. If suspended or deactivated, revoke all active sessions immediately
    if (newStatus === "suspended" || newStatus === "deactivated") {
      await this.sessionService.revokeAllUserSessions(targetUserId, `account_${newStatus}`);
    }

    // 3. Fail-closed audit
    await this.audit.recordEvent({
      actorId: adminId,
      action: "account.status_changed",
      resourceType: "user",
      resourceId: targetUserId,
      metadata: { from: currentStatus, to: newStatus },
      failClosed: true,
    });

    return sanitizeUser(updated!);
  }

  /**
   * Updates a user's role. Admin-only.
   * If demoting from staff to customer, strips capabilities and revokes active sessions.
   * Fails closed on audit.
   */
  async updateUserRole(
    adminId: string,
    targetUserId: string,
    newRole: "customer" | "media_team" | "admin",
  ): Promise<SafeUser> {
    const user = await this.getUserById(targetUserId);
    if (!user) {
      throw new NotFoundException("Target user not found");
    }

    const oldRole = user.role;
    if (oldRole === newRole) {
      return sanitizeUser(user);
    }

    const now = new Date();

    // 1. Update role
    const [updated] = await this.db
      .update(usersTable)
      .set({
        role: newRole,
        updatedAt: now,
      })
      .where(eq(usersTable.id, targetUserId))
      .returning();

    // 2. If demoting to customer, remove any staff capabilities
    if (newRole === "customer") {
      await this.db
        .delete(userCapabilitiesTable)
        .where(eq(userCapabilitiesTable.userId, targetUserId));
    }

    // 3. Mandatory: Revoke all active sessions on role change
    await this.sessionService.revokeAllUserSessions(targetUserId, "role_changed");

    // 4. Fail-closed audit
    await this.audit.recordEvent({
      actorId: adminId,
      action: "account.role_changed",
      resourceType: "user",
      resourceId: targetUserId,
      metadata: { from: oldRole, to: newRole },
      failClosed: true,
    });

    return sanitizeUser(updated!);
  }

  /**
   * Grants a capability to a staff member. Admin-only.
   * Invariant: Customers CANNOT receive staff capabilities!
   */
  async grantCapability(
    adminId: string,
    targetUserId: string,
    capability: string,
  ): Promise<void> {
    if (!VALID_CAPABILITIES.includes(capability as StaffCapability)) {
      throw new BadRequestException(`Invalid capability: ${capability}`);
    }

    const user = await this.getUserById(targetUserId);
    if (!user) {
      throw new NotFoundException("Target user not found");
    }

    if (user.role !== "media_team") {
      throw new ForbiddenException("Capabilities can only be granted to media_team staff");
    }

    const existing = await this.db
      .select()
      .from(userCapabilitiesTable)
      .where(
        and(
          eq(userCapabilitiesTable.userId, targetUserId),
          eq(userCapabilitiesTable.capability, capability),
        ),
      )
      .limit(1);

    if (existing[0]) {
      return;
    }

    await this.db.insert(userCapabilitiesTable).values({
      userId: targetUserId,
      capability,
      grantedBy: adminId,
    });

    // Invalidate sessions to refresh capabilities
    await this.sessionService.revokeAllUserSessions(targetUserId, "capability_granted");

    await this.audit.recordEvent({
      actorId: adminId,
      action: "staff.capability_granted",
      resourceType: "user_capability",
      resourceId: targetUserId,
      metadata: { capability },
      failClosed: true,
    });
  }

  /**
   * Revokes a capability from a staff member. Admin-only.
   */
  async revokeCapability(
    adminId: string,
    targetUserId: string,
    capability: string,
  ): Promise<void> {
    const existing = await this.db
      .select()
      .from(userCapabilitiesTable)
      .where(
        and(
          eq(userCapabilitiesTable.userId, targetUserId),
          eq(userCapabilitiesTable.capability, capability),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return;
    }

    await this.db
      .delete(userCapabilitiesTable)
      .where(
        and(
          eq(userCapabilitiesTable.userId, targetUserId),
          eq(userCapabilitiesTable.capability, capability),
        ),
      );

    await this.sessionService.revokeAllUserSessions(targetUserId, "capability_revoked");

    await this.audit.recordEvent({
      actorId: adminId,
      action: "staff.capability_revoked",
      resourceType: "user_capability",
      resourceId: targetUserId,
      metadata: { capability },
      failClosed: true,
    });
  }

  /**
   * Lists all active capabilities for a user.
   */
  async getUserCapabilities(userId: string): Promise<string[]> {
    const records = await this.db
      .select({ capability: userCapabilitiesTable.capability })
      .from(userCapabilitiesTable)
      .where(eq(userCapabilitiesTable.userId, userId));

    return records.map((r) => r.capability);
  }
}
