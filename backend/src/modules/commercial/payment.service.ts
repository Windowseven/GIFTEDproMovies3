import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import {
  ordersTable,
  paymentAttemptsTable,
  type OrderRecord,
  type PaymentAttemptRecord,
  type SettlementRecord,
} from "../../infrastructure/database/schemas/commercial.schema.js";

import { CommercialRepository, type DatabaseClient } from "./commercial.repository.js";
import { AuditService } from "../audit/audit.service.js";
import {
  ActivePaymentAttemptExistsException,
  ConcurrentAttemptConflictException,
  DuplicateEventConflictException,
  InvalidPaymentAttemptTransitionException,
  OrderAlreadyPaidException,
  OrderNotFoundException,
  OrderNotPayableException,
  PaymentAmountMismatchException,
  PaymentAttemptNotFoundException,
  ProviderReferenceCollisionException,
  ProviderReferenceConflictException,
  SettlementConflictException,
} from "./commercial.errors.js";
import type { CreatePaymentAttemptDto } from "./dto/create-payment-attempt.dto.js";
import type { SimulateConfirmPaymentDto } from "./dto/simulate-confirm-payment.dto.js";

export interface SimulateConfirmPaymentResult {
  attempt: PaymentAttemptRecord;
  order: OrderRecord;
  settlement: SettlementRecord | null;
  idempotentReplay: boolean;
}


@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly auditService: AuditService,
  ) {}

  async createPaymentAttempt(
    customerId: string,
    orderId: string,
    dto: CreatePaymentAttemptDto,
  ): Promise<PaymentAttemptRecord> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let loop = 1; loop <= maxAttempts; loop++) {
      try {
        return await this.db.transaction(
          async (tx) => {
            // Lock & read the target order using share lock
            const [order] = await tx
              .select()
              .from(ordersTable)
              .where(sql`${ordersTable.id} = ${orderId}`)
              .for("share");

            if (!order || order.customerId !== customerId) {
              // Anti-IDOR: same 404 regardless of whether order exists for another customer
              throw new OrderNotFoundException();
            }

            if (order.status === "PAID") {
              throw new OrderAlreadyPaidException("This order has already been paid.");
            }

            if (order.status !== "PENDING_PAYMENT") {
              throw new OrderNotPayableException(
                `Order status is "${order.status}"; payment cannot be initiated.`,
              );
            }

            // Check if an unresolved attempt (PENDING or UNKNOWN) is already in flight
            const existingUnresolved = await this.repository.findActiveUnresolvedAttemptForOrder(
              tx,
              orderId,
            );
            if (existingUnresolved) {
              throw new ActivePaymentAttemptExistsException(
                `An unresolved payment attempt (ID: ${existingUnresolved.id}) is already active for this order.`,
              );
            }

            // Calculate next attempt sequence number
            const maxAttempt = await this.repository.getMaxAttemptNumberForOrder(tx, orderId);
            const attemptNumber = maxAttempt + 1;

            // Server-enforced provider name and collision-resistant server-generated reference
            const providerName = dto.providerName ?? "simulated";
            const providerReference = `SIM-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

            // Insert payment attempt with server-authoritative amount from order
            const attempt = await this.repository.insertPaymentAttempt(tx, {
              orderId: order.id,
              attemptNumber,
              providerName,
              providerReference,
              status: "PENDING",
              amountTzs: order.amountTzs,
            });

            // Atomic fail-closed audit event
            await this.auditService.recordEvent({
              action: "PAYMENT_ATTEMPT_CREATE",
              resourceType: "payment_attempt",
              resourceId: attempt.id,
              actorId: customerId,
              metadata: {
                orderId: order.id,
                attemptNumber,
                amountTzs: order.amountTzs,
                providerName,
                providerReference,
              },
              tx,
              failClosed: true,
            });

            return attempt;
          },
          { isolationLevel: "repeatable read" },
        );
      } catch (error: unknown) {
        lastError = error;

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

        const isProviderRefCollision =
          (err?.code === "23505" || rootError?.code === "23505") &&
          (err?.constraint === "payment_attempts_provider_reference_idx" ||
            rootError?.constraint === "payment_attempts_provider_reference_idx" ||
            String(err?.message ?? "").includes("payment_attempts_provider_reference_idx") ||
            String(rootError?.message ?? "").includes("payment_attempts_provider_reference_idx") ||
            String(err?.detail ?? "").includes("payment_attempts_provider_reference_idx") ||
            String(rootError?.detail ?? "").includes("payment_attempts_provider_reference_idx"));

        if (isProviderRefCollision) {
          if (loop < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 20 * loop));
            continue;
          }
          throw new ProviderReferenceCollisionException();
        }

        const isSingleUnresolvedConflict =
          (err?.code === "23505" || rootError?.code === "23505") &&
          (err?.constraint === "payment_attempts_single_unresolved_idx" ||
            rootError?.constraint === "payment_attempts_single_unresolved_idx" ||
            String(err?.message ?? "").includes("payment_attempts_single_unresolved_idx") ||
            String(rootError?.message ?? "").includes("payment_attempts_single_unresolved_idx") ||
            String(err?.detail ?? "").includes("payment_attempts_single_unresolved_idx") ||
            String(rootError?.detail ?? "").includes("payment_attempts_single_unresolved_idx"));

        if (isSingleUnresolvedConflict) {
          throw new ActivePaymentAttemptExistsException(
            "An unresolved payment attempt is already active for this order.",
          );
        }

        const isOrderAttemptConflict =
          (err?.code === "23505" || rootError?.code === "23505") &&
          (err?.constraint === "payment_attempts_order_attempt_unique" ||
            rootError?.constraint === "payment_attempts_order_attempt_unique" ||
            String(err?.message ?? "").includes("payment_attempts_order_attempt_unique") ||
            String(rootError?.message ?? "").includes("payment_attempts_order_attempt_unique"));

        if (isOrderAttemptConflict) {
          if (loop < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 20 * loop));
            continue;
          }
          throw new ActivePaymentAttemptExistsException(
            "An unresolved payment attempt is already active for this order.",
          );
        }

        const isSerializationFailure =
          err?.code === "40001" ||
          rootError?.code === "40001" ||
          String(err?.message ?? "").includes("could not serialize access") ||
          String(rootError?.message ?? "").includes("could not serialize access");

        if (isSerializationFailure) {
          if (loop < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 20 * loop));
            continue;
          }

          const existingUnresolved = await this.repository.findActiveUnresolvedAttemptForOrder(
            this.db,
            orderId,
          );
          if (existingUnresolved) {
            throw new ActivePaymentAttemptExistsException(
              `An unresolved payment attempt (ID: ${existingUnresolved.id}) is already active for this order.`,
            );
          }
        }

        throw error;
      }
    }

    throw lastError;
  }

  async getPaymentAttemptsForOrder(
    customerId: string,
    orderId: string,
  ): Promise<PaymentAttemptRecord[]> {
    const order = await this.repository.findOrderByIdForCustomer(this.db, orderId, customerId);
    if (!order) {
      throw new OrderNotFoundException();
    }
    return this.repository.findPaymentAttemptsForOrder(this.db, orderId);
  }

  /**
   * One authoritative invariant enforcement function for settlement persistence.
   * Shared by simulateConfirmPayment (replay backfill) and ReconciliationService (admin repair).
   * Pure settlement persistence: strictly validates invariants and inserts into settlementsTable.
   * DOES NOT perform any audit writes. Callers own transaction-coupled audit event emission.
   * Caller must hold FOR UPDATE locks on attempt and order within a repeatable read tx.
   * Requires attempt.status === 'SUCCEEDED' and order.status === 'PAID' before invocation.
   */
  public async ensureSettlementForSucceededAttempt(
    tx: DatabaseClient,
    attempt: PaymentAttemptRecord,
    order: OrderRecord,
    evidence: {
      providerName: string;
      providerEventId: string;
      providerReference: string;
      amountTzs: number;
    },
  ): Promise<SettlementRecord> {
    // 1. attempt.status === "SUCCEEDED"
    if (attempt.status !== "SUCCEEDED") {
      throw new SettlementConflictException(
        "Payment attempt must be in SUCCEEDED status to create settlement.",
      );
    }

    // 2. order.id === attempt.orderId AND order.status === "PAID"
    if (order.id !== attempt.orderId || order.status !== "PAID") {
      throw new SettlementConflictException(
        "Linked order must be in PAID status matching attempt order ID.",
      );
    }

    // 3. attempt.amountTzs === order.amountTzs (authoritative cross-table equality)
    if (attempt.amountTzs !== order.amountTzs) {
      throw new PaymentAmountMismatchException(
        "Payment attempt amount does not match order amount.",
      );
    }

    // 4. evidence.amountTzs === attempt.amountTzs
    if (evidence.amountTzs !== attempt.amountTzs) {
      throw new PaymentAmountMismatchException(
        "Evidence amount does not match payment attempt amount.",
      );
    }

    // 5. Provider evidence validation
    if (!evidence.providerReference) {
      throw new ProviderReferenceConflictException(
        "Settlement evidence missing providerReference.",
      );
    }
    if (
      attempt.providerEventId !== evidence.providerEventId ||
      attempt.providerReference !== evidence.providerReference
    ) {
      throw new ProviderReferenceConflictException(
        "Settlement evidence does not match payment attempt provider evidence.",
      );
    }

    // 6. Provider name match
    if (attempt.providerName !== evidence.providerName) {
      throw new SettlementConflictException(
        "Provider name does not match attempt provider name.",
      );
    }

    // 7. Provider Reference Uniqueness: findPaymentAttemptByProviderReference matches attempt.id
    const refOwner = await this.repository.findPaymentAttemptByProviderReference(
      tx,
      evidence.providerName,
      evidence.providerReference,
    );
    if (refOwner && refOwner.id !== attempt.id) {
      throw new ProviderReferenceCollisionException(
        "Provider reference is already registered to another payment attempt.",
      );
    }

    // 8. findSettlementByPaymentAttemptId(tx, attempt.id) == null (no existing settlement for attempt)
    const existingSettlement = await this.repository.findSettlementByPaymentAttemptId(
      tx,
      attempt.id,
    );
    if (existingSettlement) {
      throw new SettlementConflictException(
        "Settlement already exists for this payment attempt.",
      );
    }

    // 9. findSettlementByProviderEvent(tx, evidence.providerName, evidence.providerEventId) == null
    const existingEventSettlement = await this.repository.findSettlementByProviderEvent(
      tx,
      evidence.providerName,
      evidence.providerEventId,
    );
    if (existingEventSettlement) {
      throw new SettlementConflictException(
        "Provider event has already been settled for another payment attempt.",
      );
    }

    // Insert immutable settlement
    return await this.repository.insertSettlement(tx, {
      paymentAttemptId: attempt.id,
      providerName: evidence.providerName,
      providerEventId: evidence.providerEventId,
      providerReference: evidence.providerReference,
      amountTzs: evidence.amountTzs,
    });
  }

  async simulateConfirmPayment(
    attemptId: string,
    dto: SimulateConfirmPaymentDto,
    operatorUserId?: string,
  ): Promise<SimulateConfirmPaymentResult> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let loop = 1; loop <= maxAttempts; loop++) {
      try {
        return await this.db.transaction(
          async (tx) => {
            // [Step 1. Acquire Locks (Strict Deterministic Order)]
            const [attempt] = await tx
              .select()
              .from(paymentAttemptsTable)
              .where(sql`${paymentAttemptsTable.id} = ${attemptId}`)
              .for("update");

            if (!attempt) {
              throw new PaymentAttemptNotFoundException();
            }

            const [order] = await tx
              .select()
              .from(ordersTable)
              .where(sql`${ordersTable.id} = ${attempt.orderId}`)
              .for("update");

            if (!order) {
              throw new OrderNotFoundException();
            }

            // [Step 2. Validate Linkage & Evidence]
            // a. Linkage is verified by query (attempt.orderId === order.id)
            // b. Financial Equality: Verify attempt.amountTzs === order.amountTzs
            if (attempt.amountTzs !== order.amountTzs) {
              throw new PaymentAmountMismatchException(
                "Payment attempt amount does not match order amount.",
              );
            }

            // c. DTO Amount Match: Verify dto.amountTzs === attempt.amountTzs
            if (dto.amountTzs !== attempt.amountTzs) {
              throw new PaymentAmountMismatchException(
                `Confirmed amount (${dto.amountTzs} TZS) does not match expected amount (${attempt.amountTzs} TZS).`,
              );
            }

            // d. Provider Identity: Verify attempt.providerName === (dto.providerName ?? "simulated")
            const expectedProvider = (dto as { providerName?: string }).providerName ?? "simulated";
            if (attempt.providerName !== expectedProvider) {
              throw new InvalidPaymentAttemptTransitionException(
                `Provider name mismatch: expected "${expectedProvider}", found "${attempt.providerName}".`,
              );
            }


            // e. Provider Reference Lifecycle & Match
            if (attempt.providerReference !== null) {
              if (attempt.providerReference !== dto.providerReference) {
                throw new ProviderReferenceConflictException(
                  `Provider reference mismatch: provided '${dto.providerReference}' does not match persisted attempt reference '${attempt.providerReference}'.`,
                );
              }
              const refOwner = await this.repository.findPaymentAttemptByProviderReference(
                tx,
                attempt.providerName,
                attempt.providerReference,
              );
              if (refOwner && refOwner.id !== attempt.id) {
                throw new ProviderReferenceCollisionException(
                  "Provider reference is already registered to another payment attempt.",
                );
              }
            } else {
              const refOwner = await this.repository.findPaymentAttemptByProviderReference(
                tx,
                attempt.providerName,
                dto.providerReference,
              );
              if (refOwner && refOwner.id !== attempt.id) {
                throw new ProviderReferenceCollisionException(
                  "Provider reference is already registered to another payment attempt.",
                );
              }
            }

            // f. Cross-Attempt Event Check
            const existingWithEvent = await this.repository.findPaymentAttemptByProviderEvent(
              tx,
              attempt.providerName,
              dto.providerEventId,
            );
            if (existingWithEvent && existingWithEvent.id !== attempt.id) {
              throw new InvalidPaymentAttemptTransitionException(
                `Provider event "${dto.providerEventId}" has already been processed for another payment attempt.`,
              );
            }


            // g. REPLAY BRANCH (if attempt.status === "SUCCEEDED")
            if (attempt.status === "SUCCEEDED") {
              if (dto.outcome !== "SUCCEEDED") {
                throw new InvalidPaymentAttemptTransitionException(
                  "Cannot transition SUCCEEDED payment attempt to non-SUCCEEDED outcome.",
                );
              }
              if (attempt.providerEventId !== dto.providerEventId) {
                throw new InvalidPaymentAttemptTransitionException(
                  "Provider event ID does not match persisted SUCCEEDED payment attempt.",
                );
              }
              if (order.status !== "PAID") {
                throw new InvalidPaymentAttemptTransitionException(
                  "Order linked to SUCCEEDED payment attempt must be in PAID status.",
                );
              }

              // Legacy Null-Reference Verification
              if (attempt.providerReference === null) {
                throw new ProviderReferenceConflictException(
                  "Historical SUCCEEDED attempt lacks persisted provider reference; cannot corroborate replay evidence.",
                );
              }
              if (attempt.providerReference !== dto.providerReference) {
                throw new ProviderReferenceConflictException(
                  `Provider reference mismatch on replay: expected "${attempt.providerReference}", got "${dto.providerReference}".`,
                );
              }
              const replayRefOwner = await this.repository.findPaymentAttemptByProviderReference(
                tx,
                attempt.providerName,
                attempt.providerReference,
              );
              if (replayRefOwner && replayRefOwner.id !== attempt.id) {
                throw new ProviderReferenceCollisionException(
                  "Provider reference is already registered to another payment attempt.",
                );
              }

              const existingSettlement = await this.repository.findSettlementByPaymentAttemptId(
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
                    "Settlement evidence conflicts with payment attempt.",
                  );
                }

                // Return existing settlement: ZERO audit events emitted, ZERO database mutations.
                return {
                  attempt,
                  order,
                  settlement: existingSettlement,
                  idempotentReplay: true,
                };
              }

              // Settlement is NULL (legacy pre-Task-4 attempt requiring backfill)
              if (!operatorUserId) {
                throw new UnauthorizedException(
                  "Authenticated admin identity required for settlement replay backfill.",
                );
              }

              const backfilledSettlement = await this.ensureSettlementForSucceededAttempt(
                tx,
                attempt,
                order,
                {
                  providerName: attempt.providerName,
                  providerEventId: dto.providerEventId,
                  providerReference: attempt.providerReference,
                  amountTzs: attempt.amountTzs,
                },
              );

              await this.auditService.recordEvent({
                action: "SETTLEMENT_REPLAY_BACKFILL",
                resourceType: "payment_attempt",
                resourceId: attempt.id,
                actorId: operatorUserId,
                metadata: {
                  orderId: order.id,
                  settlementId: backfilledSettlement.id,
                  executionSource: "CONFIRMATION_REPLAY",
                  providerEventId: dto.providerEventId,
                  providerReference: attempt.providerReference,
                  amountTzs: attempt.amountTzs,
                },
                tx,
                failClosed: true,
              });

              return {
                attempt,
                order,
                settlement: backfilledSettlement,
                idempotentReplay: true,
              };
            }

            // h. NON-SUCCESS OUTCOME BRANCH (if dto.outcome !== "SUCCEEDED")
            if (dto.outcome !== "SUCCEEDED") {
              if (
                attempt.status === "FAILED" ||
                attempt.status === "CANCELLED" ||
                attempt.status === "EXPIRED"
              ) {
                throw new InvalidPaymentAttemptTransitionException(
                  `Payment attempt is in terminal status "${attempt.status}"; cannot confirm.`,
                );
              }

              if (!operatorUserId) {
                throw new UnauthorizedException(
                  "Authenticated admin identity required for payment confirmation.",
                );
              }

              const updatedAttempt = await this.repository.updatePaymentAttemptStatus(
                tx,
                attempt.id,
                dto.outcome,
                dto.providerEventId,
                dto.providerReference,
              );

              await this.auditService.recordEvent({
                action: "PAYMENT_ATTEMPT_CONFIRM",
                resourceType: "payment_attempt",
                resourceId: attempt.id,
                actorId: operatorUserId,
                metadata: {
                  orderId: order.id,
                  outcome: dto.outcome,
                  providerEventId: dto.providerEventId,
                  providerReference: dto.providerReference,
                  amountTzs: attempt.amountTzs,
                },
                tx,
                failClosed: true,
              });

              return {
                attempt: updatedAttempt,
                order,
                settlement: null,
                idempotentReplay: false,
              };
            }

            // i. NON-REPLAY SUCCESS VALIDATION (if attempt.status !== "SUCCEEDED" AND dto.outcome === "SUCCEEDED")
            if (
              attempt.status === "FAILED" ||
              attempt.status === "CANCELLED" ||
              attempt.status === "EXPIRED"
            ) {
              throw new InvalidPaymentAttemptTransitionException(
                `Payment attempt is in terminal status "${attempt.status}"; cannot confirm.`,
              );
            }

            // CASE B: Different Attempt on Paid Order
            if (order.status === "PAID") {
              throw new OrderAlreadyPaidException(
                "This order has already been marked as PAID.",
              );
            }

            // CASE C: Approved Transition on Unpaid/Late Order
            if (!["PENDING_PAYMENT", "EXPIRED", "CANCELLED"].includes(order.status)) {
              throw new OrderNotPayableException("Order is not in a payable state.");
            }

            // [Step 3. Apply Approved Transitions]
            const updatedOrder = await this.repository.updateOrderStatus(tx, order.id, "PAID");
            const updatedAttempt = await this.repository.updatePaymentAttemptStatus(
              tx,
              attempt.id,
              "SUCCEEDED",
              dto.providerEventId,
              dto.providerReference,
            );

            // [Step 4. Validate Resulting Persisted State]
            if (updatedAttempt.status !== "SUCCEEDED" || updatedOrder.status !== "PAID") {
              throw new InvalidPaymentAttemptTransitionException(
                "Transition validation failed after state update.",
              );
            }

            // [Step 5. Insert Immutable Settlement via Shared Invariant Function]
            const settlement = await this.ensureSettlementForSucceededAttempt(
              tx,
              updatedAttempt,
              updatedOrder,
              {
                providerName: updatedAttempt.providerName,
                providerEventId: dto.providerEventId,
                providerReference: updatedAttempt.providerReference!,
                amountTzs: updatedAttempt.amountTzs,
              },
            );

            // [Step 6. Caller Writes Single Fail-Closed Audit Event]
            if (!operatorUserId) {
              throw new UnauthorizedException(
                "Authenticated admin identity required for payment confirmation.",
              );
            }

            await this.auditService.recordEvent({
              action: "PAYMENT_ATTEMPT_CONFIRM",
              resourceType: "payment_attempt",
              resourceId: updatedAttempt.id,
              actorId: operatorUserId,
              metadata: {
                orderId: updatedOrder.id,
                outcome: "SUCCEEDED",
                providerEventId: dto.providerEventId,
                providerReference: updatedAttempt.providerReference,
                amountTzs: updatedAttempt.amountTzs,
                settlementId: settlement.id,
                executionSource: "ADMIN_SIMULATE_CONFIRM",
                priorOrderStatus: order.status,
              },
              tx,
              failClosed: true,
            });

            return {
              attempt: updatedAttempt,
              order: updatedOrder,
              settlement,
              idempotentReplay: false,
            };
          },
          { isolationLevel: "repeatable read" },
        );
      } catch (error: unknown) {
        lastError = error;

        // Domain exceptions should fail immediately without retry
        if (
          error instanceof OrderNotFoundException ||
          error instanceof PaymentAttemptNotFoundException ||
          error instanceof OrderAlreadyPaidException ||
          error instanceof OrderNotPayableException ||
          error instanceof PaymentAmountMismatchException ||
          error instanceof InvalidPaymentAttemptTransitionException ||
          error instanceof ProviderReferenceConflictException ||
          error instanceof ProviderReferenceCollisionException ||
          error instanceof SettlementConflictException ||
          error instanceof DuplicateEventConflictException ||
          error instanceof ConcurrentAttemptConflictException ||
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
          const constraintName = String(
            err?.constraint ?? rootError?.constraint ?? err?.message ?? rootError?.message ?? "",
          );

          if (constraintName.includes("payment_attempts_order_attempt_unique")) {
            throw new ConcurrentAttemptConflictException(
              "Concurrent attempt sequence conflict; please retry.",
            );
          }

          if (constraintName.includes("payment_attempts_single_unresolved_idx")) {
            throw new ActivePaymentAttemptExistsException(
              "An active unresolved payment attempt already exists for this order.",
            );
          }

          if (constraintName.includes("payment_attempts_provider_reference_idx")) {
            throw new ProviderReferenceCollisionException(
              "Provider reference is already registered to another payment attempt.",
            );
          }

          // Authoritative Post-Rollback 11-Point Replay Verification (via this.db outside failed tx)
          const freshAttempt = await this.repository.findPaymentAttemptById(this.db, attemptId);
          const freshOrder = freshAttempt
            ? await this.repository.findOrderById(this.db, freshAttempt.orderId)
            : null;
          const freshSettlement = await this.repository.findSettlementByPaymentAttemptId(
            this.db,
            attemptId,
          );
          const freshReferenceOwner =
            freshAttempt && freshAttempt.providerReference
              ? await this.repository.findPaymentAttemptByProviderReference(
                  this.db,
                  freshAttempt.providerName,
                  freshAttempt.providerReference,
                )
              : null;
          const freshEventSettlement =
            freshAttempt && freshAttempt.providerEventId
              ? await this.repository.findSettlementByProviderEvent(
                  this.db,
                  freshAttempt.providerName,
                  freshAttempt.providerEventId,
                )
              : null;

          // 1. freshAttempt !== null && freshAttempt.status === 'SUCCEEDED'
          if (!freshAttempt || freshAttempt.status !== "SUCCEEDED") {
            throw new InvalidPaymentAttemptTransitionException(
              "Payment attempt was not successfully marked SUCCEEDED.",
            );
          }

          // 2. freshOrder !== null && freshAttempt.orderId === freshOrder.id
          // 3. freshOrder.status === 'PAID'
          if (!freshOrder || freshOrder.id !== freshAttempt.orderId || freshOrder.status !== "PAID") {
            throw new InvalidPaymentAttemptTransitionException(
              "Linked order is not in PAID status matching attempt order ID.",
            );
          }

          // 4. freshAttempt.amountTzs === freshOrder.amountTzs
          if (freshAttempt.amountTzs !== freshOrder.amountTzs) {
            throw new PaymentAmountMismatchException(
              "Payment attempt amount does not match order amount.",
            );
          }

          // 5. dto.amountTzs === freshAttempt.amountTzs
          if (dto.amountTzs !== freshAttempt.amountTzs) {
            throw new PaymentAmountMismatchException(
              "DTO amount does not match payment attempt amount.",
            );
          }

          // 6. freshAttempt.providerName === (dto.providerName ?? 'simulated')
          if (freshAttempt.providerName !== ((dto as { providerName?: string }).providerName ?? "simulated")) {
            throw new InvalidPaymentAttemptTransitionException(
              "Provider name does not match payment attempt provider name.",
            );
          }


          // 7. freshAttempt.providerEventId === dto.providerEventId
          if (freshAttempt.providerEventId !== dto.providerEventId) {
            throw new InvalidPaymentAttemptTransitionException(
              "Provider event ID does not match payment attempt provider event ID.",
            );
          }

          // 8. freshAttempt.providerReference !== null && freshAttempt.providerReference === dto.providerReference
          if (freshAttempt.providerReference === null) {
            throw new ProviderReferenceConflictException(
              "Historical SUCCEEDED attempt lacks persisted provider reference; cannot corroborate replay evidence.",
            );
          }
          if (freshAttempt.providerReference !== dto.providerReference) {
            throw new ProviderReferenceConflictException(
              "Provider reference does not match persisted payment attempt reference.",
            );
          }

          // 9. Provider-Reference Ownership
          if (!freshReferenceOwner || freshReferenceOwner.id !== freshAttempt.id) {
            throw new ProviderReferenceCollisionException(
              "Provider reference is owned by another payment attempt.",
            );
          }

          // 10. freshSettlement !== null AND matches attempt evidence
          if (
            !freshSettlement ||
            freshSettlement.paymentAttemptId !== freshAttempt.id ||
            freshSettlement.providerName !== freshAttempt.providerName ||
            freshSettlement.providerEventId !== freshAttempt.providerEventId ||
            freshSettlement.providerReference !== freshAttempt.providerReference ||
            freshSettlement.amountTzs !== freshAttempt.amountTzs
          ) {
            throw new SettlementConflictException(
              "Settlement evidence conflicts with payment attempt or settlement is missing.",
            );
          }

          // 11. freshEventSettlement !== null && freshEventSettlement.id === freshSettlement.id
          if (!freshEventSettlement || freshEventSettlement.id !== freshSettlement.id) {
            throw new SettlementConflictException(
              "Settlement event does not match fresh settlement.",
            );
          }

          // All 11 points verified! Return clean idempotent replay.
          return {
            attempt: freshAttempt,
            order: freshOrder,
            settlement: freshSettlement,
            idempotentReplay: true,
          };
        }

        throw error;
      }
    }

    throw lastError;
  }

}

