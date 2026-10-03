import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import { auditEventsTable } from "../../infrastructure/database/schemas/audit-events.schema.js";
import { sanitizeMetadata } from "../../infrastructure/logging/redaction.js";

export interface RecordAuditEventInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  failClosed?: boolean;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
  ) {}

  /**
   * Strictly append-only audit event recording.
   * Never updates or deletes audit records.
   * Strips all secrets from metadata before persistence.
   */
  async recordEvent(input: RecordAuditEventInput): Promise<void> {
    const sanitizedMeta = input.metadata
      ? (sanitizeMetadata(input.metadata) as Record<string, unknown>)
      : null;

    try {
      await this.db.insert(auditEventsTable).values({
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: sanitizedMeta,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (error: unknown) {
      if (input.failClosed) {
        throw new Error(
          `Audit logging failed for critical security event [${input.action}]: ${
            error instanceof Error ? error.message : "Database error"
          }`,
          { cause: error },
        );
      }
    }
  }
}
