import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type {
  ApplicationDatabase,
  DatabaseClient,
} from "../../../infrastructure/database/database.module.js";
import { systemSettingsTable } from "../../../infrastructure/database/schemas/system-settings.schema.js";
import { AuditService } from "../../audit/audit.service.js";

@Injectable()
export class SystemSettingsService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly audit: AuditService,
  ) {}

  async getBooleanSetting(
    key: string,
    defaultValue = false,
    client?: DatabaseClient,
  ): Promise<boolean> {
    const executor = client ?? this.db;
    const rows = await executor
      .select({ value: systemSettingsTable.value })
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.key, key))
      .limit(1);

    if (rows.length === 0 || rows[0]?.value === null) {
      return defaultValue;
    }

    const val = rows[0]?.value;
    if (typeof val === "boolean") return val;
    if (typeof val === "string") return val.toLowerCase() === "true";
    if (typeof val === "object" && val !== null && "enabled" in (val as Record<string, unknown>)) {
      return Boolean((val as Record<string, unknown>).enabled);
    }

    return defaultValue;
  }

  async isPublishingApprovalRequired(client?: DatabaseClient): Promise<boolean> {
    return await this.getBooleanSetting("publishingRequiresApproval", true, client);
  }

  async setSetting(
    key: string,
    value: unknown,
    actorId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(systemSettingsTable)
        .where(eq(systemSettingsTable.key, key))
        .limit(1);

      const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
      if (existing.length > 0) {
        await tx
          .update(systemSettingsTable)
          .set({ value: serializedValue, updatedAt: new Date() })
          .where(eq(systemSettingsTable.key, key));
      } else {
        await tx.insert(systemSettingsTable).values({
          key,
          value: serializedValue,
          description: `System setting for ${key}`,
        });
      }

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "SYSTEM_SETTING_UPDATE",
        resourceType: "system_setting",
        resourceId: key,
        metadata: {
          key,
          value,
        },
        failClosed: true,
      });
    });
  }
}
