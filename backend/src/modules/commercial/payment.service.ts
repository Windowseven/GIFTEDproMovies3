import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import {
  ordersTable,
  paymentAttemptsTable,
  type OrderRecord,
  type PaymentAttemptRecord,
} from "../../infrastructure/database/schemas/commercial.schema.js";
import { CommercialRepository } from "./commercial.repository.js";
import { AuditService } from "../audit/audit.service.js";
import {
  ActivePaymentAttemptExistsException,
  InvalidPaymentAttemptTransitionException,
  OrderAlreadyPaidException,
  OrderNotFoundException,
  OrderNotPayableException,
  PaymentAmountMismatchException,
  PaymentAttemptNotFoundException,
  ProviderReferenceCollisionException,
} from "./commercial.errors.js";
import type { CreatePaymentAttemptDto } from "./dto/create-payment-attempt.dto.js";
import type { SimulateConfirmPaymentDto } from "./dto/simulate-confirm-payment.dto.js";

export interface SimulateConfirmPaymentResult {
  attempt: PaymentAttemptRecord;
  order: OrderRecord;
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
            // Lock & read payment attempt
            const [attempt] = await tx
              .select()
              .from(paymentAttemptsTable)
              .where(sql`${paymentAttemptsTable.id} = ${attemptId}`)
              .for("update");

            if (!attempt) {
              throw new PaymentAttemptNotFoundException();
            }

            // Lock & read order
            const [order] = await tx
              .select()
              .from(ordersTable)
              .where(sql`${ordersTable.id} = ${attempt.orderId}`)
              .for("update");

            if (!order) {
              throw new OrderNotFoundException();
            }

            // Idempotency check: if attempt is already SUCCEEDED
            if (attempt.status === "SUCCEEDED") {
              if (
                attempt.providerEventId === dto.providerEventId &&
                dto.outcome === "SUCCEEDED"
              ) {
                return {
                  attempt,
                  order,
                  idempotentReplay: true,
                };
              }
              throw new InvalidPaymentAttemptTransitionException(
                "Payment attempt is already SUCCEEDED; cannot confirm again.",
              );
            }

            // Terminal state check for non-success
            if (
              attempt.status === "FAILED" ||
              attempt.status === "CANCELLED" ||
              attempt.status === "EXPIRED"
            ) {
              throw new InvalidPaymentAttemptTransitionException(
                `Payment attempt is in terminal status "${attempt.status}"; cannot confirm.`,
              );
            }

            // Validate server-authoritative amount match
            if (dto.amountTzs !== attempt.amountTzs) {
              throw new PaymentAmountMismatchException(
                `Confirmed amount (${dto.amountTzs} TZS) does not match expected amount (${attempt.amountTzs} TZS).`,
              );
            }

            // Check if provider event ID was already used
            const existingWithEvent = await this.repository.findPaymentAttemptByProviderEvent(
              tx,
              attempt.providerName,
              dto.providerEventId,
            );
            if (existingWithEvent) {
              if (existingWithEvent.id === attempt.id) {
                if (existingWithEvent.status === "SUCCEEDED" && dto.outcome === "SUCCEEDED") {
                  return {
                    attempt: existingWithEvent,
                    order,
                    idempotentReplay: true,
                  };
                }
                throw new InvalidPaymentAttemptTransitionException(
                  `Payment attempt is already processed with event "${dto.providerEventId}".`,
                );
              }
              throw new InvalidPaymentAttemptTransitionException(
                `Provider event "${dto.providerEventId}" has already been processed for another payment attempt.`,
              );
            }

            if (dto.outcome === "SUCCEEDED") {
              // Verify order is not already paid
              if (order.status === "PAID") {
                throw new OrderAlreadyPaidException("This order has already been marked as PAID.");
              }

              // Transition attempt to SUCCEEDED
              const updatedAttempt = await this.repository.updatePaymentAttemptStatus(
                tx,
                attempt.id,
                "SUCCEEDED",
                dto.providerEventId,
                dto.providerReference,
              );

              // Transition order to PAID
              const updatedOrder = await this.repository.updateOrderStatus(tx, order.id, "PAID");

              // Atomic fail-closed audit log
              await this.auditService.recordEvent({
                action: "PAYMENT_ATTEMPT_CONFIRM",
                resourceType: "payment_attempt",
                resourceId: attempt.id,
                actorId: operatorUserId ?? order.customerId,
                metadata: {
                  orderId: order.id,
                  outcome: "SUCCEEDED",
                  providerEventId: dto.providerEventId,
                  providerReference: dto.providerReference,
                  amountTzs: attempt.amountTzs,
                },
                tx,
                failClosed: true,
              });

              return {
                attempt: updatedAttempt,
                order: updatedOrder,
                idempotentReplay: false,
              };
            }

            // Non-success outcomes: FAILED, CANCELLED, EXPIRED, UNKNOWN
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
              actorId: operatorUserId ?? order.customerId,
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
          error instanceof InvalidPaymentAttemptTransitionException
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

        const isProviderEventConflict =
          err?.code === "23505" ||
          rootError?.code === "23505" ||
          err?.constraint === "payment_attempts_provider_event_unique" ||
          rootError?.constraint === "payment_attempts_provider_event_unique" ||
          String(err?.message ?? "").includes("payment_attempts_provider_event_unique") ||
          String(rootError?.message ?? "").includes("payment_attempts_provider_event_unique");

        if (isProviderEventConflict) {
          const existing = await this.repository.findPaymentAttemptByProviderEvent(
            this.db,
            "simulated",
            dto.providerEventId,
          );
          if (existing) {
            if (existing.id === attemptId && existing.status === "SUCCEEDED" && dto.outcome === "SUCCEEDED") {
              const order = await this.repository.findOrderById(this.db, existing.orderId);
              if (order) {
                return { attempt: existing, order, idempotentReplay: true };
              }
            }
            throw new InvalidPaymentAttemptTransitionException(
              `Provider event "${dto.providerEventId}" has already been processed for another payment attempt.`,
            );
          }
          throw new InvalidPaymentAttemptTransitionException(
            "Provider event conflict detected.",
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

          // Retries exhausted. Inspect committed state outside transaction for deterministic response
          const currentAttempt = await this.repository.findPaymentAttemptById(this.db, attemptId);
          if (currentAttempt) {
            if (
              currentAttempt.status === "SUCCEEDED" &&
              currentAttempt.providerEventId === dto.providerEventId &&
              dto.outcome === "SUCCEEDED"
            ) {
              const currentOrder = await this.repository.findOrderById(this.db, currentAttempt.orderId);
              if (currentOrder) {
                return { attempt: currentAttempt, order: currentOrder, idempotentReplay: true };
              }
            }
            if (currentAttempt.status === "SUCCEEDED") {
              throw new InvalidPaymentAttemptTransitionException(
                "Payment attempt was already marked SUCCEEDED by a concurrent transaction.",
              );
            }
            if (
              currentAttempt.status === "FAILED" ||
              currentAttempt.status === "CANCELLED" ||
              currentAttempt.status === "EXPIRED"
            ) {
              throw new InvalidPaymentAttemptTransitionException(
                `Payment attempt is in terminal status "${currentAttempt.status}"; cannot confirm.`,
              );
            }
            const currentOrder = await this.repository.findOrderById(this.db, currentAttempt.orderId);
            if (currentOrder && currentOrder.status === "PAID") {
              throw new OrderAlreadyPaidException("This order has already been marked as PAID.");
            }
          }
        }

        throw error;
      }
    }

    throw lastError;
  }
}

