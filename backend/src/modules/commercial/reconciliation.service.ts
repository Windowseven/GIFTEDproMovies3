import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Pool } from "pg";
import { sql } from "drizzle-orm";
import {
  DATABASE_POOL,
  DRIZZLE_DATABASE,
} from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import {
  ordersTable,
  paymentAttemptsTable,
  type SettlementRecord,
} from "../../infrastructure/database/schemas/commercial.schema.js";

import { CommercialRepository } from "./commercial.repository.js";
import { PaymentService } from "./payment.service.js";
import { AuditService } from "../audit/audit.service.js";
import {
  DuplicateEventConflictException,
  InvalidPaymentAttemptTransitionException,
  OrderNotFoundException,
  PaymentAmountMismatchException,
  PaymentAttemptNotFoundException,
  ProviderReferenceCollisionException,
  ProviderReferenceConflictException,
  SettlementConflictException,
} from "./commercial.errors.js";
import {
  RECONCILIATION_DISCREPANCY_TYPES,
  type ReconciliationDiscrepancyType,
  type ReconciliationQueryDto,
} from "./dto/reconciliation-query.dto.js";

export interface DiscrepancyItem {
  type: ReconciliationDiscrepancyType;
  entityId: string;
  occurredAt: string;
  details: Record<string, unknown>;
}

export interface ReconciliationDiscrepanciesResponse {
  items: DiscrepancyItem[];
  discrepancies: DiscrepancyItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface DecodedCursor {
  occurredAt: string;
  type: ReconciliationDiscrepancyType;
  entityId: string;
}

interface DiscrepancyDbRow {
  type: ReconciliationDiscrepancyType;
  entity_id: string;
  occurred_at: Date;
  occurred_at_iso: string;
  details: Record<string, unknown>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ReconciliationService {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly commercialRepository: CommercialRepository,
    private readonly paymentService: PaymentService,
    private readonly auditService: AuditService,
  ) {}


  async findDiscrepancies(
    query: ReconciliationQueryDto,
  ): Promise<ReconciliationDiscrepanciesResponse> {
    const limit = query.limit ?? 50;

    // Window validation
    let windowStart: Date;
    let windowEnd: Date;

    if (query.windowStart) {
      windowStart = new Date(query.windowStart);
      if (isNaN(windowStart.getTime())) {
        throw new BadRequestException("windowStart must be a valid date");
      }
    } else {
      windowStart = new Date(0); // Epoch start
    }

    if (query.windowEnd) {
      windowEnd = new Date(query.windowEnd);
      if (isNaN(windowEnd.getTime())) {
        throw new BadRequestException("windowEnd must be a valid date");
      }
    } else {
      windowEnd = new Date();
    }

    if (windowStart.getTime() > windowEnd.getTime()) {
      throw new BadRequestException("windowStart must be less than or equal to windowEnd");
    }

    // Cursor decoding and validation
    let cursorOccurredAt: string | null = null;
    let cursorType: string | null = null;
    let cursorEntityId: string | null = null;

    if (query.cursor) {
      const decoded = this.decodeCursor(query.cursor);
      cursorOccurredAt = decoded.occurredAt;
      cursorType = decoded.type;
      cursorEntityId = decoded.entityId;
    }

    const filterType = query.type ?? null;

    const sqlText = `
WITH all_discrepancies AS (
  -- 1. MISSING_SETTLEMENT (SUCCEEDED attempt lacking settlement; includes order diagnostics)
  SELECT
    'MISSING_SETTLEMENT'::text AS type,
    pa.id AS entity_id,
    pa.updated_at AS occurred_at,
    jsonb_build_object(
      'paymentAttemptId', pa.id,
      'orderId', pa.order_id,
      'attemptAmountTzs', pa.amount_tzs,
      'orderAmountTzs', o.amount_tzs,
      'orderStatus', o.status,
      'providerName', pa.provider_name,
      'providerEventId', pa.provider_event_id,
      'providerReference', pa.provider_reference,
      'passesBasicRepairChecks', (
        o.status = 'PAID'
        AND pa.status = 'SUCCEEDED'
        AND pa.amount_tzs = o.amount_tzs
        AND pa.provider_event_id IS NOT NULL
        AND pa.provider_reference IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM settlements s2
          WHERE s2.provider_name = pa.provider_name
            AND s2.provider_event_id = pa.provider_event_id
            AND s2.payment_attempt_id != pa.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM payment_attempts pa2
          WHERE pa2.provider_name = pa.provider_name
            AND pa2.provider_reference = pa.provider_reference
            AND pa2.id != pa.id
        )
      ),
      'ineligibilityReasons', ARRAY_REMOVE(ARRAY[
        CASE WHEN o.status != 'PAID' THEN 'ORDER_NOT_PAID' END,
        CASE WHEN pa.amount_tzs != o.amount_tzs THEN 'AMOUNT_MISMATCH' END,
        CASE WHEN pa.provider_event_id IS NULL THEN 'MISSING_PROVIDER_EVENT' END,
        CASE WHEN pa.provider_reference IS NULL THEN 'MISSING_PROVIDER_REFERENCE' END,
        CASE WHEN EXISTS (
          SELECT 1 FROM settlements s2
          WHERE s2.provider_name = pa.provider_name
            AND s2.provider_event_id = pa.provider_event_id
            AND s2.payment_attempt_id != pa.id
        ) THEN 'CONFLICTING_EVENT_ALREADY_SETTLED' END,
        CASE WHEN EXISTS (
          SELECT 1 FROM payment_attempts pa2
          WHERE pa2.provider_name = pa.provider_name
            AND pa2.provider_reference = pa.provider_reference
            AND pa2.id != pa.id
        ) THEN 'CONFLICTING_REFERENCE_ALREADY_USED' END
      ], NULL)
    ) AS details
  FROM payment_attempts pa
  JOIN orders o ON o.id = pa.order_id
  LEFT JOIN settlements s ON s.payment_attempt_id = pa.id
  WHERE pa.status = 'SUCCEEDED'
    AND s.id IS NULL
    AND pa.updated_at >= $1 AND pa.updated_at <= $2

  UNION ALL

  -- 2. AMOUNT_MISMATCH (Inconsistent financial amounts between payment attempt and order)
  SELECT
    'AMOUNT_MISMATCH'::text AS type,
    pa.id AS entity_id,
    pa.updated_at AS occurred_at,
    jsonb_build_object(
      'paymentAttemptId', pa.id,
      'orderId', pa.order_id,
      'attemptAmountTzs', pa.amount_tzs,
      'orderAmountTzs', o.amount_tzs
    ) AS details
  FROM payment_attempts pa
  JOIN orders o ON o.id = pa.order_id
  WHERE (pa.amount_tzs != o.amount_tzs)
    AND pa.updated_at >= $1 AND pa.updated_at <= $2

  UNION ALL

  -- 3. ORPHAN_PAID_ORDER (Order marked PAID with no SUCCEEDED attempt)
  SELECT
    'ORPHAN_PAID_ORDER'::text AS type,
    o.id AS entity_id,
    o.updated_at AS occurred_at,
    jsonb_build_object(
      'orderId', o.id,
      'customerId', o.customer_id,
      'amountTzs', o.amount_tzs,
      'orderStatus', o.status
    ) AS details
  FROM orders o
  WHERE o.status = 'PAID'
    AND NOT EXISTS (
      SELECT 1 FROM payment_attempts pa
      WHERE pa.order_id = o.id AND pa.status = 'SUCCEEDED'
    )
    AND o.updated_at >= $1 AND o.updated_at <= $2

  UNION ALL

  -- 4. STRANDED_UNKNOWN (Uses pa.updated_at; exempt from windowStart lower bound)
  SELECT
    'STRANDED_UNKNOWN'::text AS type,
    pa.id AS entity_id,
    pa.updated_at AS occurred_at,
    jsonb_build_object(
      'paymentAttemptId', pa.id,
      'orderId', pa.order_id,
      'amountTzs', pa.amount_tzs,
      'providerName', pa.provider_name,
      'providerReference', pa.provider_reference,
      'strandedMinutes', ROUND(EXTRACT(EPOCH FROM (NOW() - pa.updated_at)) / 60)
    ) AS details
  FROM payment_attempts pa
  WHERE pa.status = 'UNKNOWN'
    AND pa.updated_at <= (NOW() - INTERVAL '30 minutes')
    AND pa.updated_at <= $2

  UNION ALL

  -- 5. CONFLICTING_SETTLEMENT_EVIDENCE (Settlement referencing non-succeeded attempt or mismatched fields/amounts)
  SELECT
    'CONFLICTING_SETTLEMENT_EVIDENCE'::text AS type,
    s.id AS entity_id,
    s.recorded_at AS occurred_at,
    jsonb_build_object(
      'settlementId', s.id,
      'paymentAttemptId', s.payment_attempt_id,
      'settlementProviderName', s.provider_name,
      'attemptProviderName', pa.provider_name,
      'settlementProviderEventId', s.provider_event_id,
      'attemptProviderEventId', pa.provider_event_id,
      'settlementProviderReference', s.provider_reference,
      'attemptProviderReference', pa.provider_reference,
      'settlementAmountTzs', s.amount_tzs,
      'attemptAmountTzs', pa.amount_tzs,
      'attemptStatus', pa.status
    ) AS details
  FROM settlements s
  JOIN payment_attempts pa ON pa.id = s.payment_attempt_id
  WHERE (
    pa.status != 'SUCCEEDED'
    OR s.provider_name IS DISTINCT FROM pa.provider_name
    OR s.provider_event_id IS DISTINCT FROM pa.provider_event_id
    OR s.provider_reference IS DISTINCT FROM pa.provider_reference
    OR s.amount_tzs IS DISTINCT FROM pa.amount_tzs
  )
  AND s.recorded_at >= $1 AND s.recorded_at <= $2
)
SELECT
  d.type,
  d.entity_id,
  d.occurred_at,
  to_char(d.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS occurred_at_iso,
  d.details
FROM all_discrepancies d
WHERE (
  $3::timestamptz IS NULL OR (
    d.occurred_at > $3::timestamptz
    OR (d.occurred_at = $3::timestamptz AND d.type > $4::text)
    OR (d.occurred_at = $3::timestamptz AND d.type = $4::text AND d.entity_id > $5::uuid)
  )
)
AND ($6::text IS NULL OR d.type = $6::text)
ORDER BY d.occurred_at ASC, d.type ASC, d.entity_id ASC
LIMIT $7;
`;

    const result = await this.pool.query<DiscrepancyDbRow>(sqlText, [
      windowStart,
      windowEnd,
      cursorOccurredAt,
      cursorType,
      cursorEntityId,
      filterType,
      limit + 1,
    ]);

    const rows = result.rows;
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items: DiscrepancyItem[] = pageRows.map((r) => ({
      type: r.type,
      entityId: r.entity_id,
      occurredAt: r.occurred_at_iso,
      details: r.details,
    }));

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          occurredAt: last.occurred_at_iso,
          type: last.type,
          entityId: last.entity_id,
        }),
      ).toString("base64");
    }

    return {
      items,
      discrepancies: items,
      nextCursor,
      hasMore,
    };
  }

  private decodeCursor(cursor: string): DecodedCursor {
    try {
      const raw = Buffer.from(cursor, "base64").toString("utf8");
      const parsed = JSON.parse(raw);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof parsed.occurredAt !== "string" ||
        typeof parsed.type !== "string" ||
        typeof parsed.entityId !== "string"
      ) {
        throw new Error("Invalid cursor structure");
      }

      const parsedDate = new Date(parsed.occurredAt);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid occurredAt in cursor");
      }

      if (
        !RECONCILIATION_DISCREPANCY_TYPES.includes(
          parsed.type as ReconciliationDiscrepancyType,
        )
      ) {
        throw new Error("Invalid discrepancy type in cursor");
      }

      if (!UUID_REGEX.test(parsed.entityId)) {
        throw new Error("Invalid entityId UUID in cursor");
      }

      return {
        occurredAt: parsed.occurredAt,
        type: parsed.type as ReconciliationDiscrepancyType,
        entityId: parsed.entityId,
      };
    } catch {
      throw new BadRequestException("Invalid or malformed pagination cursor");
    }
  }

  async repairMissingSettlement(
    attemptId: string,
    adminUserId: string,
  ): Promise<{ settlement: SettlementRecord; idempotentRepair: boolean }> {
    // 1. Authenticated Admin Actor Check
    if (!adminUserId || typeof adminUserId !== "string" || !UUID_REGEX.test(adminUserId)) {
      throw new UnauthorizedException(
        "Authenticated admin identity required for settlement repair.",
      );
    }

    const maxAttempts = 3;
    let lastError: unknown;

    for (let loop = 1; loop <= maxAttempts; loop++) {
      try {
        return await this.db.transaction(
          async (tx) => {
            // [Lock Attempt FOR UPDATE]
            const [attempt] = await tx
              .select()
              .from(paymentAttemptsTable)
              .where(sql`${paymentAttemptsTable.id} = ${attemptId}`)
              .for("update");

            if (!attempt) {
              throw new PaymentAttemptNotFoundException();
            }

            // [Lock Order FOR UPDATE]
            const [order] = await tx
              .select()
              .from(ordersTable)
              .where(sql`${ordersTable.id} = ${attempt.orderId}`)
              .for("update");

            if (!order) {
              throw new OrderNotFoundException();
            }

            // 1. Attempt status check
            if (attempt.status !== "SUCCEEDED") {
              throw new InvalidPaymentAttemptTransitionException(
                "Payment attempt is not in SUCCEEDED status; cannot repair settlement.",
              );
            }

            // 2. Order status check
            if (order.status !== "PAID") {
              throw new InvalidPaymentAttemptTransitionException(
                "Linked order is not in PAID status; cannot repair settlement.",
              );
            }

            // 3. Amount equality
            if (attempt.amountTzs !== order.amountTzs) {
              throw new PaymentAmountMismatchException(
                "Payment attempt amount does not match order amount.",
              );
            }

            // 4. Provider evidence completeness
            if (!attempt.providerName || !attempt.providerEventId || !attempt.providerReference) {
              throw new ProviderReferenceConflictException(
                "Payment attempt lacks authoritative provider evidence; cannot repair settlement.",
              );
            }

            // 5. Exclusive provider-reference ownership
            const refOwner = await this.commercialRepository.findPaymentAttemptByProviderReference(
              tx,
              attempt.providerName,
              attempt.providerReference,
            );
            if (refOwner && refOwner.id !== attempt.id) {
              throw new ProviderReferenceCollisionException(
                "Provider reference is already registered to another payment attempt.",
              );
            }

            // 6. Exclusive provider-event ownership
            const eventOwner = await this.commercialRepository.findPaymentAttemptByProviderEvent(
              tx,
              attempt.providerName,
              attempt.providerEventId,
            );
            if (eventOwner && eventOwner.id !== attempt.id) {
              throw new DuplicateEventConflictException(
                "Provider event is already registered to another payment attempt.",
              );
            }

            // Check if settlement already exists for this attempt
            const existingSettlement = await this.commercialRepository.findSettlementByPaymentAttemptId(
              tx,
              attempt.id,
            );
            if (existingSettlement) {
              // Validate matching settlement evidence
              if (
                existingSettlement.paymentAttemptId !== attempt.id ||
                existingSettlement.providerName !== attempt.providerName ||
                existingSettlement.providerEventId !== attempt.providerEventId ||
                existingSettlement.providerReference !== attempt.providerReference ||
                existingSettlement.amountTzs !== attempt.amountTzs
              ) {
                throw new SettlementConflictException(
                  "Existing settlement evidence conflicts with payment attempt.",
                );
              }

              // Idempotent repair with existing matching settlement:
              // ZERO audit events emitted, ZERO database mutations.
              return { settlement: existingSettlement, idempotentRepair: true };
            }

            // Check if settlement already exists for provider event
            const existingEventSettlement = await this.commercialRepository.findSettlementByProviderEvent(
              tx,
              attempt.providerName,
              attempt.providerEventId,
            );
            if (existingEventSettlement) {
              throw new SettlementConflictException(
                "Provider event has already been settled for another payment attempt.",
              );
            }

            // Pure invariant validation & DB insert
            const settlement = await this.paymentService.ensureSettlementForSucceededAttempt(
              tx,
              attempt,
              order,
              {
                providerName: attempt.providerName,
                providerEventId: attempt.providerEventId,
                providerReference: attempt.providerReference,
                amountTzs: attempt.amountTzs,
              },
            );

            // Caller writes single fail-closed audit event in tx
            await this.auditService.recordEvent({
              action: "RECONCILIATION_BACKFILL",
              resourceType: "settlement",
              resourceId: settlement.id,
              actorId: adminUserId,
              metadata: {
                paymentAttemptId: attempt.id,
                orderId: order.id,
                executionSource: "RECONCILIATION_MANUAL_REPAIR",
                providerEventId: attempt.providerEventId,
                providerReference: attempt.providerReference,
                amountTzs: attempt.amountTzs,
              },
              tx,
              failClosed: true,
            });

            return { settlement, idempotentRepair: false };
          },
          { isolationLevel: "repeatable read" },
        );
      } catch (error: unknown) {
        lastError = error;

        // Domain exceptions fail immediately
        if (
          error instanceof OrderNotFoundException ||
          error instanceof PaymentAttemptNotFoundException ||
          error instanceof PaymentAmountMismatchException ||
          error instanceof InvalidPaymentAttemptTransitionException ||
          error instanceof ProviderReferenceConflictException ||
          error instanceof ProviderReferenceCollisionException ||
          error instanceof SettlementConflictException ||
          error instanceof DuplicateEventConflictException ||
          error instanceof UnauthorizedException
        ) {
          throw error;
        }

        const err = error as {
          code?: string;
          constraint?: string;
          message?: string;
          detail?: string;
          cause?: {
            code?: string;
            constraint?: string;
            message?: string;
            detail?: string;
          };
        } | undefined;
        const rootError = err?.cause ?? err;

        const isSerializationOrDeadlock =
          err?.code === "40001" ||
          rootError?.code === "40001" ||
          err?.code === "40P01" ||
          rootError?.code === "40P01" ||
          String(err?.message ?? "").includes("could not serialize access") ||
          String(rootError?.message ?? "").includes("could not serialize access") ||
          String(err?.message ?? "").includes("deadlock detected") ||
          String(rootError?.message ?? "").includes("deadlock detected");

        if (isSerializationOrDeadlock) {
          if (loop < maxAttempts) {
            await new Promise((resolve) =>
              setTimeout(resolve, 20 * loop + Math.random() * 10),
            );
            continue;
          }
        }

        const isUniqueViolation =
          err?.code === "23505" ||
          rootError?.code === "23505";

        if (isUniqueViolation || (isSerializationOrDeadlock && loop >= maxAttempts)) {
          // Dedicated zero-DTO 8-point post-rollback recovery (outside failed transaction via this.db)
          const freshAttempt = await this.commercialRepository.findPaymentAttemptById(
            this.db,
            attemptId,
          );
          const freshOrder = freshAttempt
            ? await this.commercialRepository.findOrderById(this.db, freshAttempt.orderId)
            : null;
          const freshSettlement = await this.commercialRepository.findSettlementByPaymentAttemptId(
            this.db,
            attemptId,
          );
          const freshReferenceOwner =
            freshAttempt && freshAttempt.providerReference
              ? await this.commercialRepository.findPaymentAttemptByProviderReference(
                  this.db,
                  freshAttempt.providerName,
                  freshAttempt.providerReference,
                )
              : null;
          const freshEventSettlement =
            freshAttempt && freshAttempt.providerEventId
              ? await this.commercialRepository.findSettlementByProviderEvent(
                  this.db,
                  freshAttempt.providerName,
                  freshAttempt.providerEventId,
                )
              : null;

          // 1. Attempt exists and is SUCCEEDED
          if (!freshAttempt || freshAttempt.status !== "SUCCEEDED") {
            throw new SettlementConflictException(
              "Post-rollback recovery failed: payment attempt is not SUCCEEDED.",
            );
          }

          // 2. Linked order exists and is PAID
          if (!freshOrder || freshOrder.id !== freshAttempt.orderId || freshOrder.status !== "PAID") {
            throw new SettlementConflictException(
              "Post-rollback recovery failed: linked order is not PAID.",
            );
          }

          // 3. Attempt and order amounts agree
          if (freshAttempt.amountTzs !== freshOrder.amountTzs) {
            throw new PaymentAmountMismatchException(
              "Payment attempt amount does not match order amount.",
            );
          }

          // 4. Provider evidence is present and non-null
          if (
            !freshAttempt.providerName ||
            !freshAttempt.providerEventId ||
            !freshAttempt.providerReference
          ) {
            throw new ProviderReferenceConflictException(
              "Historical SUCCEEDED attempt lacks persisted provider reference; cannot corroborate replay evidence.",
            );
          }

          // 5. Exclusive provider-reference ownership
          if (!freshReferenceOwner || freshReferenceOwner.id !== freshAttempt.id) {
            throw new ProviderReferenceCollisionException(
              "Provider reference is owned by another payment attempt.",
            );
          }

          // 6. Exclusive provider-event ownership
          const freshEventAttempt = await this.commercialRepository.findPaymentAttemptByProviderEvent(
            this.db,
            freshAttempt.providerName,
            freshAttempt.providerEventId,
          );
          if (!freshEventAttempt || freshEventAttempt.id !== freshAttempt.id) {
            throw new DuplicateEventConflictException(
              "Provider event is owned by another payment attempt.",
            );
          }

          // 7. Valid matching settlement
          if (
            !freshSettlement ||
            freshSettlement.paymentAttemptId !== freshAttempt.id ||
            freshSettlement.amountTzs !== freshAttempt.amountTzs ||
            freshSettlement.providerName !== freshAttempt.providerName ||
            freshSettlement.providerEventId !== freshAttempt.providerEventId ||
            freshSettlement.providerReference !== freshAttempt.providerReference
          ) {
            throw new SettlementConflictException(
              "Post-rollback recovery failed: valid matching settlement not found.",
            );
          }

          // 8. Settlement event resolution
          if (!freshEventSettlement || freshEventSettlement.id !== freshSettlement.id) {
            throw new SettlementConflictException(
              "Post-rollback recovery failed: settlement event mismatch.",
            );
          }

          // All 8 points verified! Idempotent repair with ZERO audit events emitted
          return { settlement: freshSettlement, idempotentRepair: true };
        }

        throw error;
      }
    }

    throw lastError;
  }
}
