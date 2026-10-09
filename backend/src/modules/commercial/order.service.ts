import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import {
  type OrderRecord,
  offersTable,
} from "../../infrastructure/database/schemas/commercial.schema.js";
import { AuditService } from "../audit/audit.service.js";
import type { CreateOrderDto } from "./dto/create-order.dto.js";
import {
  OfferNotFoundException,
  OfferNotPurchasableException,
  OrderIdempotencyConflictException,
  OrderNotFoundException,
} from "./commercial.errors.js";
import { CommercialRepository } from "./commercial.repository.js";

@Injectable()
export class OrderService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly audit: AuditService,
  ) {}

  async createOrder(
    dto: CreateOrderDto,
    customerId: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<OrderRecord> {
    const offerId = dto.offerId.trim();
    const idempotencyKey = dto.idempotencyKey.trim();

    // 1. First-pass check outside transaction for idempotency fast-path
    const fastExisting = await this.repository.findOrderByCustomerAndIdempotencyKey(
      this.db,
      customerId,
      idempotencyKey,
    );
    if (fastExisting) {
      if (fastExisting.offerId === offerId) {
        return fastExisting;
      }
      throw new OrderIdempotencyConflictException();
    }

    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.db.transaction(
          async (tx) => {
            // Double-check inside transaction before inserting
            const existingInTx = await this.repository.findOrderByCustomerAndIdempotencyKey(
              tx,
              customerId,
              idempotencyKey,
            );
            if (existingInTx) {
              if (existingInTx.offerId === offerId) {
                return existingInTx;
              }
              throw new OrderIdempotencyConflictException();
            }

            // Lock & read the Offer using row locking
            const [lockedOffer] = await tx
              .select()
              .from(offersTable)
              .where(sql`${offersTable.id} = ${offerId}`)
              .for("share");

            if (!lockedOffer) {
              throw new OfferNotFoundException("The requested offer does not exist.");
            }

            // Validate offer purchasability
            if (lockedOffer.status !== "active") {
              throw new OfferNotPurchasableException(`Offer status is "${lockedOffer.status}", only active offers are purchasable.`);
            }

            const now = new Date();
            if (now.getTime() < lockedOffer.startsAt.getTime()) {
              throw new OfferNotPurchasableException("Offer has not started yet.");
            }
            if (lockedOffer.endsAt && now.getTime() >= lockedOffer.endsAt.getTime()) {
              throw new OfferNotPurchasableException("Offer has expired.");
            }

            // Read linked Plan Version
            const planVersion = await this.repository.findPlanVersionById(tx, lockedOffer.planVersionId);
            if (!planVersion) {
              throw new OfferNotPurchasableException("Linked plan version for offer does not exist.");
            }

            // Synthesize Historical Snapshot for CATALOG offers
            let catalogPolicySnapshotId: string | null = null;
            if (lockedOffer.targetKind === "CATALOG") {
              const policyType = lockedOffer.catalogPolicyType;
              if (!policyType) {
                throw new OfferNotPurchasableException("Catalog offer does not specify a catalog policy type.");
              }

              const snapshot = await this.repository.insertPolicySnapshot(tx, {
                policyType,
              });
              catalogPolicySnapshotId = snapshot.id;

              if (policyType === "ALL_CATALOG") {
                // zero categories, zero contents
              } else if (policyType === "CATEGORY_SET") {
                const catMembers = await this.repository.findExistingOfferPolicyCategoryMembers(tx, lockedOffer.id);
                if (catMembers.length === 0) {
                  throw new OfferNotPurchasableException("CATEGORY_SET offer has no category members.");
                }
                await this.repository.insertPolicySnapshotCategories(tx, snapshot.id, catMembers);

                const resolvedContentIds = await this.repository.resolvePublishedContentIdsForCategories(tx, catMembers);
                if (resolvedContentIds.length > 0) {
                  await this.repository.insertPolicySnapshotContents(tx, snapshot.id, resolvedContentIds);
                }
              } else if (policyType === "CONTENT_SET") {
                const cntMembers = await this.repository.findExistingOfferPolicyContentMembers(tx, lockedOffer.id);
                if (cntMembers.length === 0) {
                  throw new OfferNotPurchasableException("CONTENT_SET offer has no content members.");
                }
                await this.repository.insertPolicySnapshotContents(tx, snapshot.id, cntMembers);
              }
            }

            // Insert Order
            const order = await this.repository.insertOrder(tx, {
              customerId,
              offerId: lockedOffer.id,
              status: "PENDING_PAYMENT",
              targetKind: lockedOffer.targetKind,
              targetMovieContentId: lockedOffer.targetMovieContentId,
              targetSeriesContentId: lockedOffer.targetSeriesContentId,
              targetSeasonId: lockedOffer.targetSeasonId,
              targetEpisodeId: lockedOffer.targetEpisodeId,
              planVersionId: planVersion.id,
              amountTzs: lockedOffer.priceTzs,
              durationValue: planVersion.durationValue,
              durationUnit: planVersion.durationUnit,
              catalogPolicySnapshotId,
              idempotencyKey,
            });

            // Fail-closed Audit Event
            await this.audit.recordEvent({
              actorId: customerId,
              action: "ORDER_CREATE",
              resourceType: "order",
              resourceId: order.id,
              metadata: {
                offerId: order.offerId,
                targetKind: order.targetKind,
                amountTzs: order.amountTzs,
                durationValue: order.durationValue,
                durationUnit: order.durationUnit,
                catalogPolicySnapshotId: order.catalogPolicySnapshotId,
              },
              ipAddress: context?.ipAddress ?? null,
              userAgent: context?.userAgent ?? null,
              failClosed: true,
              tx,
            });

            return order;
          },
          { isolationLevel: "repeatable read" },
        );
      } catch (error: unknown) {
        lastError = error;

        // Check for PostgreSQL unique constraint race on orders_customer_idempotency_unique
        const err = error as { code?: string; constraint?: string; message?: string; detail?: string; cause?: { code?: string; constraint?: string; message?: string; detail?: string } } | undefined;
        const rootError = err?.cause ?? err;
        const isUniqueConflict =
          err?.code === "23505" ||
          rootError?.code === "23505" ||
          err?.constraint === "orders_customer_idempotency_unique" ||
          rootError?.constraint === "orders_customer_idempotency_unique" ||
          String(err?.message ?? "").includes("orders_customer_idempotency_unique") ||
          String(rootError?.message ?? "").includes("orders_customer_idempotency_unique") ||
          String(err?.detail ?? "").includes("orders_customer_idempotency_unique") ||
          String(rootError?.detail ?? "").includes("orders_customer_idempotency_unique");

        if (isUniqueConflict) {
          // Transaction is rolled back. The winning concurrent transaction may be in the process of committing.
          // Re-query with retry loop up to 500ms.
          for (let checkAttempt = 0; checkAttempt < 20; checkAttempt++) {
            const existingAfterRace = await this.repository.findOrderByCustomerAndIdempotencyKey(
              this.db,
              customerId,
              idempotencyKey,
            );
            if (existingAfterRace) {
              if (existingAfterRace.offerId === offerId) {
                return existingAfterRace;
              }
              throw new OrderIdempotencyConflictException();
            }
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          throw error;
        }

        const isSerializationFailure =
          err?.code === "40001" ||
          rootError?.code === "40001" ||
          String(err?.message ?? "").includes("could not serialize access") ||
          String(rootError?.message ?? "").includes("could not serialize access");

        if (isSerializationFailure && attempt < maxAttempts) {
          // Check if an idempotent order already exists before retrying
          const existingBeforeRetry = await this.repository.findOrderByCustomerAndIdempotencyKey(
            this.db,
            customerId,
            idempotencyKey,
          );
          if (existingBeforeRetry) {
            if (existingBeforeRetry.offerId === offerId) {
              return existingBeforeRetry;
            }
            throw new OrderIdempotencyConflictException();
          }

          // Small exponential backoff before retrying
          await new Promise((resolve) => setTimeout(resolve, attempt * 25));
          continue;
        }

        throw error;
      }
    }

    throw lastError;


  }

  async getOrderForCustomer(orderId: string, customerId: string): Promise<OrderRecord> {
    const order = await this.repository.findOrderByIdForCustomer(this.db, orderId, customerId);
    if (!order) {
      throw new OrderNotFoundException();
    }
    return order;
  }
}
