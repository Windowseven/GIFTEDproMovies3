import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type {
  ApplicationDatabase,
  DatabaseClient,
} from "../../infrastructure/database/database.module.js";
import {
  type CatalogGrantRecord,
  type EntitlementOrderEffectRecord,
  type EntitlementRecord,
  type FulfillmentRecord,
  type OrderRecord,
  entitlementOrderEffectsTable,
  entitlementsTable,
  fulfillmentsTable,
  ordersTable,
  paymentAttemptsTable,
  settlementsTable,
} from "../../infrastructure/database/schemas/commercial.schema.js";
import { AuditService } from "../audit/audit.service.js";
import {
  AmbiguousCommitException,
  CommercialValidationException,
  EntitlementConsistencyException,
  FulfillmentIntegrityException,
  FulfillmentNotFoundException,
  OrderNotFoundException,
  OrderNotSettledException,
  RecoveryStateUnresolvedException,
  RevokedTargetException,
} from "./commercial.errors.js";
import { CommercialRepository } from "./commercial.repository.js";
import { EntitlementService } from "./entitlement.service.js";
import { EventBusService } from "../../infrastructure/events/event-bus.service.js";
import { EntitlementGrantedEvent } from "../../infrastructure/events/commercial.events.js";

export type FulfillmentProcessResult =
  | {
      status: "COMPLETED";
      fulfillment: FulfillmentRecord;
      entitlement: EntitlementRecord;
      effect: EntitlementOrderEffectRecord;
      grant?: CatalogGrantRecord | null;
      idempotentReplay: boolean;
      recoveredFromPriorEffect?: boolean;
    }

  | {
      status: "FAILED_RETRYABLE";
      fulfillment: FulfillmentRecord;
      errorCode: string;
      errorMessage: string;
      attemptCount: number;
    }
  | {
      status: "FAILED_TERMINAL";
      fulfillment: FulfillmentRecord;
      errorCode: string;
      errorMessage: string;
      attemptCount: number;
    }
  | {
      status: "DEFERRED_OUT_OF_SCOPE";
      reason: string;
      fulfillment: FulfillmentRecord;
    };

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly entitlementService: EntitlementService,
    private readonly auditService: AuditService,
    private readonly eventBus?: EventBusService,
  ) {}

  /**
   * Idempotently enqueues a fulfillment row for an order.
   * If a row already exists for this order_id, leaves it completely untouched.
   */
  async enqueueFulfillment(
    client: DatabaseClient,
    orderId: string,
  ): Promise<FulfillmentRecord> {
    const [inserted] = await client
      .insert(fulfillmentsTable)
      .values({
        orderId,
        status: "PENDING",
        attemptCount: 0,
        createdAt: sql`transaction_timestamp()`,
        updatedAt: sql`transaction_timestamp()`,
      })
      .onConflictDoNothing({ target: fulfillmentsTable.orderId })
      .returning();

    if (inserted) {
      return inserted;
    }

    const existing = await this.repository.findFulfillmentByOrderId(client, orderId);
    if (!existing) {
      throw new FulfillmentNotFoundException(
        `Fulfillment could not be created or retrieved for order ${orderId}`,
      );
    }
    return existing;
  }

  /**
   * Claims and processes the next pending or retryable fulfillment item using FOR UPDATE SKIP LOCKED.
   * Filters strictly to Task #5 exact targets (MOVIE, SERIES, SEASON, EPISODE).
   */
  async processNextPendingFulfillment(
    maxAttempts: number = 3,
  ): Promise<FulfillmentProcessResult | null> {
    let claimedId: string | null = null;
    let claimedOrderId: string | null = null;

    try {
      return await this.db.transaction(
        async (tx) => {
          const rows = await tx.execute<{ id: string; order_id: string }>(sql`
            SELECT f.id, f.order_id
            FROM fulfillments f
            JOIN orders o ON f.order_id = o.id
            WHERE f.status IN ('PENDING', 'FAILED_RETRYABLE')
              AND o.target_kind IN ('MOVIE', 'SERIES', 'SEASON', 'EPISODE')
            ORDER BY f.created_at ASC
            LIMIT 1
            FOR UPDATE OF f SKIP LOCKED;
          `);

          const candidate =
            rows.rows?.[0] ?? (rows as unknown as Array<{ id: string; order_id: string }>)[0];
          if (!candidate) {
            return null;
          }

          claimedId = candidate.id;
          claimedOrderId = candidate.order_id;
          return await this.executeClaimedFulfillment(
            tx,
            candidate.id,
            candidate.order_id,
            maxAttempts,
          );
        },
        { isolationLevel: "read committed" },
      );
    } catch (error: unknown) {
      if (
        error instanceof AmbiguousCommitException ||
        error instanceof FulfillmentIntegrityException ||
        error instanceof RecoveryStateUnresolvedException
      ) {
        throw error;
      }

      const isSerializationOrDeadlock =
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "40001" || error.code === "40P01");

      if (claimedId && claimedOrderId && isSerializationOrDeadlock) {
        return await this.recoverAbortedPreCommitFailure(
          claimedId,
          claimedOrderId,
          (error as { code: string }).code,
          error instanceof Error ? error.message : "Database transaction aborted",
          maxAttempts,
        );
      }

      throw error;
    }
  }

  /**
   * Deterministic batch processor for worker loops.
   */
  async processPendingBatch(
    limit: number = 10,
    maxAttempts: number = 3,
  ): Promise<FulfillmentProcessResult[]> {
    const results: FulfillmentProcessResult[] = [];
    for (let i = 0; i < limit; i++) {
      const res = await this.processNextPendingFulfillment(maxAttempts);
      if (!res) {
        break;
      }
      results.push(res);
    }
    return results;
  }

  /**
   * Targeted executor for tests and single-order recovery.
   * If fulfillment row does not exist, verifies financial preconditions and enqueues inside a transaction.
   */
  async processFulfillmentForOrder(
    orderId: string,
    maxAttempts: number = 3,
  ): Promise<FulfillmentProcessResult> {
    let fulfillment = await this.repository.findFulfillmentByOrderId(this.db, orderId);

    if (!fulfillment) {
      // Legacy missing-fulfillment recovery: verify financial preconditions first
      fulfillment = await this.db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.id, orderId))
          .for("update")
          .limit(1);

        if (!order) {
          throw new OrderNotFoundException(`Order ${orderId} not found`);
        }

        if (order.status !== "PAID") {
          throw new OrderNotSettledException(
            `Order ${orderId} is not in PAID status (current status: ${order.status})`,
          );
        }

        const [attempt] = await tx
          .select()
          .from(paymentAttemptsTable)
          .where(
            and(
              eq(paymentAttemptsTable.orderId, orderId),
              eq(paymentAttemptsTable.status, "SUCCEEDED"),
            ),
          )
          .limit(1);

        if (!attempt) {
          throw new OrderNotSettledException(
            `No succeeded payment attempt found for order ${orderId}`,
          );
        }

        const [settlement] = await tx
          .select()
          .from(settlementsTable)
          .where(eq(settlementsTable.paymentAttemptId, attempt.id))
          .limit(1);

        if (!settlement || settlement.amountTzs !== order.amountTzs) {
          throw new OrderNotSettledException(
            `No matching authoritative settlement found for succeeded payment attempt on order ${orderId}`,
          );
        }

        return await this.enqueueFulfillment(tx, orderId);
      });
    }

    try {
      const outcome = await this.db.transaction(
        async (tx) => {
          return await this.executeClaimedFulfillment(
            tx,
            fulfillment.id,
            orderId,
            maxAttempts,
          );
        },
        { isolationLevel: "read committed" },
      );

      if (outcome.status === "COMPLETED") {
        this.eventBus?.publish(
          new EntitlementGrantedEvent({
            entitlementId: outcome.entitlement.id,
            customerId: outcome.entitlement.customerId,
            orderId: outcome.fulfillment.orderId,
            targetKind: outcome.entitlement.targetKind,
            grantedAt: outcome.entitlement.createdAt,
          }),
        );
      }

      return outcome;
    } catch (error: unknown) {
      if (
        error instanceof AmbiguousCommitException ||
        error instanceof FulfillmentIntegrityException ||
        error instanceof RecoveryStateUnresolvedException
      ) {
        throw error;
      }

      const isSerializationOrDeadlock =
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "40001" || error.code === "40P01");

      if (isSerializationOrDeadlock) {
        return await this.recoverAbortedPreCommitFailure(
          fulfillment.id,
          orderId,
          (error as { code: string }).code,
          error instanceof Error ? error.message : "Database transaction aborted",
          maxAttempts,
        );
      }

      throw error;
    }
  }

  /**
   * Internal execution unit running inside an active transaction (Transaction 2).
   */
  private async executeClaimedFulfillment(
    tx: DatabaseClient,
    fulfillmentId: string,
    orderId: string,
    maxAttempts: number,
  ): Promise<FulfillmentProcessResult> {
    const [fulfillment] = await tx
      .select()
      .from(fulfillmentsTable)
      .where(eq(fulfillmentsTable.id, fulfillmentId))
      .for("update")
      .limit(1);

    if (!fulfillment) {
      throw new FulfillmentNotFoundException(`Fulfillment ${fulfillmentId} not found`);
    }

    const [order] = await tx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .for("update")
      .limit(1);

    if (!order) {
      throw new OrderNotFoundException(`Order ${orderId} not found`);
    }

    // Case 1: Already COMPLETED
    if (fulfillment.status === "COMPLETED") {
      let existingResult: {
        entitlement: EntitlementRecord;
        effect: EntitlementOrderEffectRecord;
      } | null;

      try {
        existingResult = await this.entitlementService.verifyExistingOrderEffect(tx, order);
      } catch (err: unknown) {
        this.logger.error(
          `Completed fulfillment ${fulfillment.id} failed effect integrity check: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        throw new FulfillmentIntegrityException(
          `Completed fulfillment ${fulfillment.id} lacks valid effect ledger provenance or consistent entitlement state.`,
        );
      }

      if (!existingResult) {
        this.logger.error(
          `Completed fulfillment ${fulfillment.id} has no recorded effect in entitlement_order_effects.`,
        );
        throw new FulfillmentIntegrityException(
          `Completed fulfillment ${fulfillment.id} has status COMPLETED but no effect row exists.`,
        );
      }

      let existingGrant: CatalogGrantRecord | null = null;
      if (order.targetKind === "CATALOG") {
        existingGrant = await this.repository.findCatalogGrantByOrderId(tx, order.id);
      }

      // Sub-case 1A: Valid completed replay is pure no-op. Zero mutations, zero attempt increments.
      return {
        status: "COMPLETED",
        fulfillment,
        entitlement: existingResult.entitlement,
        effect: existingResult.effect,
        grant: existingGrant ?? undefined,
        idempotentReplay: true,
      };
    }

    // Terminal state inspection
    if (fulfillment.status === "FAILED_TERMINAL") {
      return {
        status: "FAILED_TERMINAL",
        fulfillment,
        errorCode: fulfillment.lastErrorCode ?? "FULFILLMENT_TERMINAL_ERROR",
        errorMessage: "Fulfillment has reached terminal failure.",
        attemptCount: fulfillment.attemptCount,
      };
    }

    // Settlement Verification Precondition
    if (order.status !== "PAID") {

      return await this.recordFailureInTransaction(
        tx,
        fulfillment,
        order,
        "ORDER_NOT_PAID",
        `Order ${order.id} is in status ${order.status}, expected PAID`,
        true,
        maxAttempts,
      );
    }

    const [attempt] = await tx
      .select()
      .from(paymentAttemptsTable)
      .where(
        and(
          eq(paymentAttemptsTable.orderId, order.id),
          eq(paymentAttemptsTable.status, "SUCCEEDED"),
        ),
      )
      .limit(1);

    if (!attempt) {
      return await this.recordFailureInTransaction(
        tx,
        fulfillment,
        order,
        "ORDER_NOT_SETTLED",
        `Order ${order.id} lacks a succeeded payment attempt`,
        true,
        maxAttempts,
      );
    }

    const [settlement] = await tx
      .select()
      .from(settlementsTable)
      .where(eq(settlementsTable.paymentAttemptId, attempt.id))
      .limit(1);

    if (!settlement || settlement.amountTzs !== order.amountTzs) {
      return await this.recordFailureInTransaction(
        tx,
        fulfillment,
        order,
        "ORDER_NOT_SETTLED",
        `Order ${order.id} lacks a matching authoritative settlement`,
        true,
        maxAttempts,
      );
    }

    // Case 2: Crash-Recovery Effect Reconciliation
    const [existingEffect] = await tx
      .select()
      .from(entitlementOrderEffectsTable)
      .where(eq(entitlementOrderEffectsTable.orderId, order.id))
      .for("update")
      .limit(1);

    if (existingEffect) {
      const [entitlement] = await tx
        .select()
        .from(entitlementsTable)
        .where(eq(entitlementsTable.id, existingEffect.entitlementId))
        .for("update")
        .limit(1);

      if (!entitlement) {
        throw new EntitlementConsistencyException(
          `Referenced entitlement ${existingEffect.entitlementId} missing for existing effect on order ${order.id}`,
        );
      }

      this.entitlementService.verifyHistoricalEffectProvenance(
        order,
        existingEffect,
        entitlement,
      );

      const nextAttemptCount =
        fulfillment.attemptCount === 0 ? 1 : fulfillment.attemptCount;
      const [updatedFulfillment] = await tx
        .update(fulfillmentsTable)
        .set({
          status: "COMPLETED",
          attemptCount: nextAttemptCount,
          completedAt: sql`transaction_timestamp()`,
          failedAt: null,
          lastErrorCode: null,
          lastAttemptAt: sql`transaction_timestamp()`,
          updatedAt: sql`transaction_timestamp()`,
        })
        .where(
          and(
            eq(fulfillmentsTable.id, fulfillment.id),
            sql`${fulfillmentsTable.status} IN ('PENDING', 'FAILED_RETRYABLE')`,
          ),
        )
        .returning();

      const finalFulfillment = updatedFulfillment ?? fulfillment;

      await this.auditService.recordEvent({
        action: "FULFILLMENT_COMPLETE",
        resourceType: "fulfillment",
        resourceId: finalFulfillment.id,
        metadata: {
          orderId: order.id,
          entitlementId: entitlement.id,
          effectId: existingEffect.id,
          recoveredFromPriorEffect: true,
          attemptCount: finalFulfillment.attemptCount,
        },
        failClosed: true,
        tx,
      });

      let existingGrant: CatalogGrantRecord | null = null;
      if (order.targetKind === "CATALOG") {
        existingGrant = await this.repository.findCatalogGrantByOrderId(tx, order.id);
      }

      return {
        status: "COMPLETED",
        fulfillment: finalFulfillment,
        entitlement,
        effect: existingEffect,
        grant: existingGrant,
        idempotentReplay: true,
        recoveredFromPriorEffect: true,
      };

    }

    // Pathway A: Savepoint-Safe Failure Recording (Usable Transaction)
    await tx.execute(sql`SAVEPOINT fulfillment_exec;`);
    try {
      const result = await this.entitlementService.applyOrderFulfillment(tx, order);

      const [updatedFulfillment] = await tx
        .update(fulfillmentsTable)
        .set({
          status: "COMPLETED",
          attemptCount: fulfillment.attemptCount + 1,
          lastAttemptAt: sql`transaction_timestamp()`,
          completedAt: sql`transaction_timestamp()`,
          failedAt: null,
          lastErrorCode: null,
          updatedAt: sql`transaction_timestamp()`,
        })
        .where(
          and(
            eq(fulfillmentsTable.id, fulfillment.id),
            sql`${fulfillmentsTable.status} IN ('PENDING', 'FAILED_RETRYABLE')`,
          ),
        )
        .returning();

      await this.auditService.recordEvent({
        action: "FULFILLMENT_COMPLETE",
        resourceType: "fulfillment",
        resourceId: updatedFulfillment!.id,
        metadata: {
          orderId: order.id,
          entitlementId: result.entitlement.id,
          effectId: result.effect.id,
          effectKind: result.effect.effectKind,
          attemptCount: updatedFulfillment!.attemptCount,
        },
        failClosed: true,
        tx,
      });

      return {
        status: "COMPLETED",
        fulfillment: updatedFulfillment!,
        entitlement: result.entitlement,
        effect: result.effect,
        grant: result.grant,
        idempotentReplay: result.idempotentReplay,
      };

    } catch (execError: unknown) {
      try {
        await tx.execute(sql`ROLLBACK TO SAVEPOINT fulfillment_exec;`);
      } catch {
        // If savepoint rollback fails, database transaction was aborted by postgres
        throw execError;
      }

      let errorCode = "FULFILLMENT_FAILED";
      let isTerminal = false;
      const cause =
        execError instanceof Error &&
        "cause" in execError &&
        execError.cause instanceof Error
          ? execError.cause
          : null;
      const errorMessage =
        execError instanceof Error
          ? `${execError.message}${cause?.message ? ` (cause: ${cause.message})` : ""}`
          : "Fulfillment execution error";

      if (execError instanceof RevokedTargetException) {
        errorCode = "REVOKED_TARGET";
        isTerminal = true;
      } else if (execError instanceof OrderNotSettledException) {
        errorCode = "ORDER_NOT_SETTLED";
        isTerminal = true;
      } else if (execError instanceof CommercialValidationException) {
        errorCode = "COMMERCIAL_VALIDATION_FAILED";
        isTerminal = true;
      } else if (execError instanceof EntitlementConsistencyException) {
        errorCode = "ENTITLEMENT_CONSISTENCY_ERROR";
        isTerminal = true;
      }

      return await this.recordFailureInTransaction(
        tx,
        fulfillment,
        order,
        errorCode,
        errorMessage,
        isTerminal,
        maxAttempts,
      );
    }
  }

  /**
   * Safe conditional failure updater within an active transaction.
   * Concurrency fence: WHERE status IN ('PENDING', 'FAILED_RETRYABLE').
   */
  private async recordFailureInTransaction(
    tx: DatabaseClient,
    fulfillment: FulfillmentRecord,
    order: OrderRecord,
    errorCode: string,
    errorMessage: string,
    isTerminal: boolean,
    maxAttempts: number,
  ): Promise<FulfillmentProcessResult> {
    const nextAttemptCount = fulfillment.attemptCount + 1;
    const finalTerminal = isTerminal || nextAttemptCount >= maxAttempts;
    const nextStatus = finalTerminal ? "FAILED_TERMINAL" : "FAILED_RETRYABLE";

    const [updatedFulfillment] = await tx
      .update(fulfillmentsTable)
      .set({
        status: nextStatus,
        attemptCount: nextAttemptCount,
        failedAt: sql`transaction_timestamp()`,
        completedAt: null,
        lastErrorCode: errorCode,
        lastAttemptAt: sql`transaction_timestamp()`,
        updatedAt: sql`transaction_timestamp()`,
      })
      .where(
        and(
          eq(fulfillmentsTable.id, fulfillment.id),
          sql`${fulfillmentsTable.status} IN ('PENDING', 'FAILED_RETRYABLE')`,
        ),
      )
      .returning();

    if (updatedFulfillment) {
      await this.auditService.recordEvent({
        action: finalTerminal
          ? "FULFILLMENT_TERMINAL_FAILURE"
          : "FULFILLMENT_RETRYABLE_FAILURE",
        resourceType: "fulfillment",
        resourceId: updatedFulfillment.id,
        metadata: {
          orderId: order.id,
          errorCode,
          errorMessage,
          attemptCount: updatedFulfillment.attemptCount,
        },
        failClosed: true,
        tx,
      });

      return {
        status: nextStatus,
        fulfillment: updatedFulfillment,
        errorCode,
        errorMessage,
        attemptCount: updatedFulfillment.attemptCount,
      };
    }

    const current = await this.repository.findFulfillmentById(tx, fulfillment.id);
    return {
      status: current!.status as "FAILED_TERMINAL" | "FAILED_RETRYABLE",
      fulfillment: current!,
      errorCode,
      errorMessage,
      attemptCount: current!.attemptCount,
    };
  }

  /**
   * Pathway B: Fresh Transaction 3 recovery after confirmed pre-COMMIT transaction abort.
   */
  private async recoverAbortedPreCommitFailure(
    fulfillmentId: string,
    orderId: string,
    errorCode: string,
    errorMessage: string,
    maxAttempts: number,
  ): Promise<FulfillmentProcessResult> {
    return await this.db.transaction(async (tx) => {
      const [fulfillment] = await tx
        .select()
        .from(fulfillmentsTable)
        .where(eq(fulfillmentsTable.id, fulfillmentId))
        .for("update")
        .limit(1);

      if (!fulfillment) {
        throw new FulfillmentNotFoundException(`Fulfillment ${fulfillmentId} not found`);
      }

      const [order] = await tx
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw new OrderNotFoundException(`Order ${orderId} not found`);
      }

      const [effect] = await tx
        .select()
        .from(entitlementOrderEffectsTable)
        .where(eq(entitlementOrderEffectsTable.orderId, orderId))
        .for("update")
        .limit(1);

      if (effect) {
        const [entitlement] = await tx
          .select()
          .from(entitlementsTable)
          .where(eq(entitlementsTable.id, effect.entitlementId))
          .for("update")
          .limit(1);

        if (!entitlement) {
          throw new EntitlementConsistencyException(
            `Referenced entitlement ${effect.entitlementId} missing for effect on order ${orderId}`,
          );
        }

        this.entitlementService.verifyHistoricalEffectProvenance(order, effect, entitlement);

        const nextCount =
          fulfillment.attemptCount === 0 ? 1 : fulfillment.attemptCount;
        const [reconciled] = await tx
          .update(fulfillmentsTable)
          .set({
            status: "COMPLETED",
            attemptCount: nextCount,
            completedAt: sql`transaction_timestamp()`,
            failedAt: null,
            lastErrorCode: null,
            lastAttemptAt: sql`transaction_timestamp()`,
            updatedAt: sql`transaction_timestamp()`,
          })
          .where(
            and(
              eq(fulfillmentsTable.id, fulfillment.id),
              sql`${fulfillmentsTable.status} IN ('PENDING', 'FAILED_RETRYABLE')`,
            ),
          )
          .returning();

        return {
          status: "COMPLETED",
          fulfillment: reconciled ?? fulfillment,
          entitlement,
          effect,
          idempotentReplay: true,
          recoveredFromPriorEffect: true,
        };
      }

      if (!["PENDING", "FAILED_RETRYABLE"].includes(fulfillment.status)) {
        return {
          status: fulfillment.status as "COMPLETED" | "FAILED_TERMINAL",
          fulfillment,
          errorCode: fulfillment.lastErrorCode ?? errorCode,
          errorMessage,
          attemptCount: fulfillment.attemptCount,
        } as FulfillmentProcessResult;
      }

      return await this.recordFailureInTransaction(
        tx,
        fulfillment,
        order,
        errorCode,
        errorMessage,
        false,
        maxAttempts,
      );
    });
  }

  /**
   * Pathway C: Ambiguous COMMIT recovery.
   * If effect exists, reconciles to COMPLETED.
   * If NO effect exists, throws AmbiguousCommitException without mutating database state.
   */
  async recoverAmbiguousCommit(
    fulfillmentId: string,
    orderId: string,
  ): Promise<FulfillmentProcessResult> {
    return await this.db.transaction(async (tx) => {
      const [fulfillment] = await tx
        .select()
        .from(fulfillmentsTable)
        .where(eq(fulfillmentsTable.id, fulfillmentId))
        .for("update")
        .limit(1);

      if (!fulfillment) {
        throw new FulfillmentNotFoundException(`Fulfillment ${fulfillmentId} not found`);
      }

      const [order] = await tx
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw new OrderNotFoundException(`Order ${orderId} not found`);
      }

      const [effect] = await tx
        .select()
        .from(entitlementOrderEffectsTable)
        .where(eq(entitlementOrderEffectsTable.orderId, orderId))
        .for("update")
        .limit(1);

      if (effect) {
        const [entitlement] = await tx
          .select()
          .from(entitlementsTable)
          .where(eq(entitlementsTable.id, effect.entitlementId))
          .for("update")
          .limit(1);

        if (!entitlement) {
          throw new EntitlementConsistencyException(
            `Referenced entitlement ${effect.entitlementId} missing for effect on order ${orderId}`,
          );
        }

        this.entitlementService.verifyHistoricalEffectProvenance(order, effect, entitlement);

        const nextCount =
          fulfillment.attemptCount === 0 ? 1 : fulfillment.attemptCount;
        const [reconciled] = await tx
          .update(fulfillmentsTable)
          .set({
            status: "COMPLETED",
            attemptCount: nextCount,
            completedAt: sql`transaction_timestamp()`,
            failedAt: null,
            lastErrorCode: null,
            lastAttemptAt: sql`transaction_timestamp()`,
            updatedAt: sql`transaction_timestamp()`,
          })
          .where(
            and(
              eq(fulfillmentsTable.id, fulfillment.id),
              sql`${fulfillmentsTable.status} IN ('PENDING', 'FAILED_RETRYABLE')`,
            ),
          )
          .returning();

        return {
          status: "COMPLETED",
          fulfillment: reconciled ?? fulfillment,
          entitlement,
          effect,
          idempotentReplay: true,
          recoveredFromPriorEffect: true,
        };
      }

      this.logger.warn(
        `AMBIGUOUS_COMMIT_UNRESOLVED: Fulfillment ${fulfillmentId} for order ${orderId} outcome unresolved. Preserving database state untouched.`,
      );

      throw new AmbiguousCommitException(
        `AMBIGUOUS_COMMIT_UNRESOLVED: Fulfillment ${fulfillmentId} for order ${orderId} outcome unresolved. State preserved without failure mutations.`,
      );
    });
  }
}
