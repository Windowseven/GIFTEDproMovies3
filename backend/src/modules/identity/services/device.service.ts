import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import {
  devicesTable,
  type DeviceRecord,
} from "../../../infrastructure/database/schemas/devices.schema.js";
import { SessionService } from "./session.service.js";
import { AuditService } from "../../audit/audit.service.js";

export const DEFAULT_CUSTOMER_DEVICE_LIMIT = 2;

@Injectable()
export class DeviceService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Resolves the effective device limit for a user based exclusively on their currently active
   * subscription entitlements (POD-07). One-time purchases, rentals, and inactive/expired/revoked
   * subscriptions do not contribute to device capacity.
   * If multiple active subscriptions exist, takes the maximum limit among them.
   * Falls back to DEFAULT_CUSTOMER_DEVICE_LIMIT (2) if no active subscription applies.
   */
  async getEffectiveDeviceLimit(userId: string, dbClient: ApplicationDatabase = this.db): Promise<number> {
    const maxLimitResult = await dbClient.execute(
      sql`SELECT MAX(sub.device_limit)::int AS max_limit
          FROM (
            SELECT pv.device_limit
            FROM catalog_grants cg
            JOIN orders o ON o.id = cg.order_id
            JOIN plan_versions pv ON pv.id = o.plan_version_id
            JOIN entitlements e ON e.id = cg.entitlement_id
            WHERE e.customer_id = ${userId}
              AND e.target_kind = 'CATALOG'
              AND e.status = 'ACTIVE'
              AND o.target_kind = 'CATALOG'
              AND o.status = 'PAID'
              AND cg.valid_from <= NOW()
              AND cg.valid_until > NOW()
              AND cg.order_id NOT IN (SELECT order_id FROM catalog_grant_revocations)
              AND pv.device_limit IS NOT NULL

            UNION

            SELECT pv.device_limit
            FROM entitlements e
            JOIN entitlement_order_effects eoe ON eoe.entitlement_id = e.id
            JOIN orders o ON o.id = eoe.order_id
            JOIN plan_versions pv ON pv.id = o.plan_version_id
            WHERE e.customer_id = ${userId}
              AND e.target_kind = 'CATALOG'
              AND e.status = 'ACTIVE'
              AND e.expires_at > NOW()
              AND o.target_kind = 'CATALOG'
              AND o.status = 'PAID'
              AND eoe.expires_at_after > NOW()
              AND eoe.order_id NOT IN (SELECT order_id FROM catalog_grant_revocations)
              AND pv.device_limit IS NOT NULL
          ) sub`,
    );

    const resolvedLimit = (maxLimitResult.rows[0] as { max_limit?: number | null })?.max_limit;
    return resolvedLimit !== null && resolvedLimit !== undefined && resolvedLimit > 0
      ? resolvedLimit
      : DEFAULT_CUSTOMER_DEVICE_LIMIT;
  }

  /**
   * Registers a client device as recognized metadata with plan-based capacity enforcement.
   * Device identification is strictly metadata and NEVER an authorization factor.
   * Concurrent device registrations are protected by a PostgreSQL transaction-scoped advisory lock.
   */
  async registerOrUpdateDevice(
    userId: string,
    deviceIdentifier: string,
    deviceName: string,
    deviceType = "other",
  ): Promise<DeviceRecord> {
    // 1. Fast-path check: if (userId, deviceIdentifier) already exists, update and return
    const existing = await this.db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.userId, userId), eq(devicesTable.deviceIdentifier, deviceIdentifier)))
      .limit(1);

    if (existing[0]) {
      const [updated] = await this.db
        .update(devicesTable)
        .set({
          deviceName,
          deviceType,
          lastUsedAt: new Date(),
        })
        .where(eq(devicesTable.id, existing[0].id))
        .returning();

      return updated!;
    }

    // 2. For a genuinely new device, execute inside a transaction protected by an advisory lock
    return await this.db.transaction(async (tx) => {
      // Transaction-scoped advisory lock on hashtext(userId) to prevent concurrent registration races
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);

      // Double-check existence under lock in case another concurrent transaction registered it
      const [lockedExisting] = await tx
        .select()
        .from(devicesTable)
        .where(and(eq(devicesTable.userId, userId), eq(devicesTable.deviceIdentifier, deviceIdentifier)))
        .limit(1);

      if (lockedExisting) {
        const [updated] = await tx
          .update(devicesTable)
          .set({
            deviceName,
            deviceType,
            lastUsedAt: new Date(),
          })
          .where(eq(devicesTable.id, lockedExisting.id))
          .returning();
        return updated!;
      }

      // Resolve effective device limit for this user
      const effectiveLimit = await this.getEffectiveDeviceLimit(userId, tx as unknown as ApplicationDatabase);

      // Count registered devices for this user
      const countResult = await tx.execute(
        sql`SELECT COUNT(*)::int AS cnt FROM devices WHERE user_id = ${userId}`,
      );
      const currentCount = (countResult.rows[0] as { cnt: number })?.cnt ?? 0;

      if (currentCount >= effectiveLimit) {
        throw new ForbiddenException({
          statusCode: 403,
          error: "Forbidden",
          message: `DEVICE_LIMIT_EXCEEDED: You have reached the maximum number of registered devices (${effectiveLimit}) allowed by your account or plan.`,
          code: "DEVICE_LIMIT_EXCEEDED",
          details: {
            currentDeviceCount: currentCount,
            maxDeviceLimit: effectiveLimit,
          },
        });
      }

      const [created] = await tx
        .insert(devicesTable)
        .values({
          userId,
          deviceIdentifier,
          deviceName,
          deviceType,
        })
        .returning();

      await this.audit.recordEvent({
        tx: tx as any,
        actorId: userId,
        action: "device.registered",
        resourceType: "device",
        resourceId: created!.id,
        metadata: {
          deviceType,
          deviceName,
          effectiveLimit,
          currentDeviceCount: currentCount + 1,
        },
      });

      return created!;
    });
  }

  async listUserDevices(userId: string): Promise<DeviceRecord[]> {
    return await this.db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.userId, userId));
  }

  /**
   * Removing a recognized device explicitly revokes all active sessions linked to it.
   */
  async removeDevice(userId: string, deviceId: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundException("Device not found or not owned by user");
    }

    // Wrap session revocation and device deletion in transaction for consistency
    await this.db.transaction(async (tx) => {
      // 1. Revoke all active sessions linked to this device
      await this.sessionService.revokeDeviceSessions(deviceId, "device_removed");

      // 2. Remove the device record
      await tx
        .delete(devicesTable)
        .where(eq(devicesTable.id, deviceId));
    });

    await this.audit.recordEvent({
      actorId: userId,
      action: "device.removed",
      resourceType: "device",
      resourceId: deviceId,
      metadata: { deviceIdentifier: existing[0].deviceIdentifier },
    });
  }
}
