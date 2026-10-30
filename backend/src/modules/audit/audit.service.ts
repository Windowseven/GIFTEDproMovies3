import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type {
  ApplicationDatabase,
  DatabaseClient,
} from "../../infrastructure/database/database.module.js";
import { auditEventsTable } from "../../infrastructure/database/schemas/audit-events.schema.js";
import { sanitizeMetadata } from "../../infrastructure/logging/redaction.js";
import type {
  PaginatedAuditEventsResponse,
  QueryAuditEventsDto,
} from "./dto/query-audit-events.dto.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DecodedAuditCursor {
  createdAt: Date;
  id: string;
}

function encodeAuditCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    "utf-8",
  ).toString("base64url");
}

function decodeAuditCursor(cursor: string): DecodedAuditCursor {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid cursor format");
    }
    if (
      typeof parsed.createdAt !== "string" ||
      isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new Error("Invalid createdAt in cursor");
    }
    if (typeof parsed.id !== "string" || !UUID_V4_REGEX.test(parsed.id)) {
      throw new Error("Invalid id in cursor");
    }
    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id.toLowerCase(),
    };
  } catch {
    throw new BadRequestException({
      code: "INVALID_CURSOR",
      message: "The provided pagination cursor is invalid or malformed.",
    });
  }
}

export interface RecordAuditEventInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  failClosed?: boolean;
  tx?: DatabaseClient;
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

    const client = input.tx ?? this.db;

    try {
      await client.insert(auditEventsTable).values({
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

  /**
   * Query tamper-resistant audit events with keyset pagination and filtering.
   * Strictly read-only; ordered by (created_at DESC, id DESC).
   */
  async queryAuditEvents(
    query: QueryAuditEventsDto,
  ): Promise<PaginatedAuditEventsResponse> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const decodedCursor = query.cursor ? decodeAuditCursor(query.cursor) : null;

    const conditions = [];

    if (decodedCursor) {
      const iso = decodedCursor.createdAt.toISOString();
      conditions.push(
        sql`(${auditEventsTable.createdAt} < ${iso}::timestamptz OR (${auditEventsTable.createdAt} = ${iso}::timestamptz AND ${auditEventsTable.id} < ${decodedCursor.id}::uuid))`,
      );
    }

    if (query.actorId) {
      conditions.push(eq(auditEventsTable.actorId, query.actorId));
    }

    if (query.resourceType) {
      conditions.push(eq(auditEventsTable.resourceType, query.resourceType.trim()));
    }

    if (query.action) {
      conditions.push(eq(auditEventsTable.action, query.action.trim()));
    }

    if (query.startDate) {
      conditions.push(gte(auditEventsTable.createdAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(auditEventsTable.createdAt, new Date(query.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(auditEventsTable)
      .where(whereClause)
      .orderBy(desc(auditEventsTable.createdAt), desc(auditEventsTable.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeAuditCursor(last.createdAt, last.id);
    }

    return {
      items,
      nextCursor,
    };
  }
}

