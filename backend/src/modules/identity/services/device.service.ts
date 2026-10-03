import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import { devicesTable, type DeviceRecord } from "../../../infrastructure/database/schemas/devices.schema.js";
import { SessionService } from "./session.service.js";
import { AuditService } from "../../audit/audit.service.js";

@Injectable()
export class DeviceService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registers a client device as recognized metadata.
   * Device identification is strictly metadata and NEVER an authorization factor.
   */
  async registerOrUpdateDevice(
    userId: string,
    deviceIdentifier: string,
    deviceName: string,
    deviceType = "other",
  ): Promise<DeviceRecord> {
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

    const [created] = await this.db
      .insert(devicesTable)
      .values({
        userId,
        deviceIdentifier,
        deviceName,
        deviceType,
      })
      .returning();

    await this.audit.recordEvent({
      actorId: userId,
      action: "device.registered",
      resourceType: "device",
      resourceId: created!.id,
      metadata: { deviceType, deviceName },
    });

    return created!;
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

    // 1. Revoke all active sessions linked to this device
    await this.sessionService.revokeDeviceSessions(deviceId, "device_removed");

    // 2. Remove the device record
    await this.db
      .delete(devicesTable)
      .where(eq(devicesTable.id, deviceId));

    await this.audit.recordEvent({
      actorId: userId,
      action: "device.removed",
      resourceType: "device",
      resourceId: deviceId,
      metadata: { deviceIdentifier: existing[0].deviceIdentifier },
    });
  }
}
