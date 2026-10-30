import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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
  ListOrdersQueryDto,
  type OrderStatus,
} from "./dto/list-orders-query.dto.js";
import {
  OfferNotFoundException,
  OfferNotPurchasableException,
  OrderIdempotencyConflictException,
  OrderNotFoundException,
} from "./commercial.errors.js";
import { CommercialRepository } from "./commercial.repository.js";
import { EventBusService } from "../../infrastructure/events/event-bus.service.js";
import { OrderCreatedEvent } from "../../infrastructure/events/commercial.events.js";

@Injectable()
export class OrderService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly audit: AuditService,
    private readonly eventBus?: EventBusService,
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
        const createdOrder = await this.db.transaction(
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

        this.eventBus?.publish(
          new OrderCreatedEvent({
            orderId: createdOrder.id,
            customerId: createdOrder.customerId,
            offerId: createdOrder.offerId,
            amountTzs: createdOrder.amountTzs,
            createdAt: createdOrder.createdAt,
          }),
        );

        return createdOrder;
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

  async getCustomerOrders(
    customerId: string,
    query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponse> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const decodedCursor = query.cursor ? decodeOrderCursor(query.cursor) : null;

    const whereConditions = [sql`o.customer_id = ${customerId}::uuid`];

    if (decodedCursor) {
      const iso = decodedCursor.createdAt.toISOString();
      whereConditions.push(
        sql`(o.created_at < ${iso}::timestamptz OR (o.created_at = ${iso}::timestamptz AND o.id < ${decodedCursor.id}::uuid))`,
      );
    }

    if (query.status) {
      whereConditions.push(sql`o.status = ${query.status}::order_status`);
    }

    const whereClause = sql.join(whereConditions, sql` AND `);

    interface CustomerOrderRowDb extends Record<string, unknown> {
      id: string;
      customer_id: string;
      offer_id: string;
      status: OrderStatus;
      target_kind: string;
      target_movie_content_id: string | null;
      target_series_content_id: string | null;
      target_season_id: string | null;
      target_episode_id: string | null;
      plan_version_id: string;
      amount_tzs: number;
      duration_value: number;
      duration_unit: string;
      created_at: string;
      updated_at: string;
    }

    const rowsResult = await this.db.execute<CustomerOrderRowDb>(
      sql`
        SELECT
          o.id,
          o.customer_id,
          o.offer_id,
          o.status,
          o.target_kind,
          o.target_movie_content_id,
          o.target_series_content_id,
          o.target_season_id,
          o.target_episode_id,
          o.plan_version_id,
          o.amount_tzs,
          o.duration_value,
          o.duration_unit,
          o.catalog_policy_snapshot_id,
          o.idempotency_key,
          o.created_at,
          o.updated_at
        FROM orders o
        WHERE ${whereClause}
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT ${limit + 1}
      `,
    );

    const rawRows = rowsResult.rows ?? [];

    const hasMore = rawRows.length > limit;
    const itemsRows = hasMore ? rawRows.slice(0, limit) : rawRows;

    if (itemsRows.length === 0) {
      return { items: [], nextCursor: null };
    }

    const orderIds = itemsRows.map((r) => r.id);
    const orderIdSqlList = sql.join(
      orderIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );

    const [paymentAttemptsRes, fulfillmentsRes] = await Promise.all([
      this.db.execute<{
        order_id: string;
        status: string;
        provider_name: string;
        amount_tzs: number;
      } & Record<string, unknown>>(
        sql`
          SELECT DISTINCT ON (order_id)
            order_id, status, provider_name, amount_tzs
          FROM payment_attempts
          WHERE order_id IN (${orderIdSqlList})
          ORDER BY order_id, attempt_number DESC
        `,
      ),
      this.db.execute<{
        order_id: string;
        status: string;
        completed_at: string | null;
      } & Record<string, unknown>>(
        sql`
          SELECT order_id, status, completed_at
          FROM fulfillments
          WHERE order_id IN (${orderIdSqlList})
        `,
      ),
    ]);

    const paRows = paymentAttemptsRes.rows ?? [];
    const paByOrder = new Map(paRows.map((p) => [p.order_id, p]));

    const fRows = fulfillmentsRes.rows ?? [];
    const fByOrder = new Map(fRows.map((f) => [f.order_id, f]));

    const items: CustomerOrderSummary[] = itemsRows.map((row) => {
      const pa = paByOrder.get(row.id);
      const f = fByOrder.get(row.id);

      return {
        id: row.id,
        offerId: row.offer_id,
        status: row.status,
        targetKind: row.target_kind,
        targetMovieContentId: row.target_movie_content_id,
        targetSeriesContentId: row.target_series_content_id,
        targetSeasonId: row.target_season_id,
        targetEpisodeId: row.target_episode_id,
        planVersionId: row.plan_version_id,
        amountTzs: row.amount_tzs,
        durationValue: row.duration_value,
        durationUnit: row.duration_unit,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
        paymentAttempt: pa
          ? {
              status: pa.status,
              providerName: pa.provider_name,
              amountTzs: pa.amount_tzs,
            }
          : null,
        fulfillment: f
          ? {
              status: f.status,
              completedAt: f.completed_at
                ? new Date(f.completed_at).toISOString()
                : null,
            }
          : null,
      };
    });

    const lastItem = itemsRows[itemsRows.length - 1];
    const nextCursor = hasMore
      ? encodeOrderCursor(lastItem.created_at, lastItem.id)
      : null;

    return { items, nextCursor };
  }
}

export interface CustomerOrderSummary {
  id: string;
  offerId: string;
  status: OrderStatus;
  targetKind: string;
  targetMovieContentId: string | null;
  targetSeriesContentId: string | null;
  targetSeasonId: string | null;
  targetEpisodeId: string | null;
  planVersionId: string;
  amountTzs: number;
  durationValue: number;
  durationUnit: string;
  createdAt: string;
  updatedAt: string;
  paymentAttempt?: {
    status: string;
    providerName: string;
    amountTzs: number;
  } | null;
  fulfillment?: {
    status: string;
    completedAt: string | null;
  } | null;
}

export interface PaginatedOrdersResponse {
  items: CustomerOrderSummary[];
  nextCursor: string | null;
}

interface DecodedOrderCursor {
  createdAt: Date;
  id: string;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeOrderCursor(createdAt: Date | string, id: string): string {
  const iso =
    typeof createdAt === "string"
      ? new Date(createdAt).toISOString()
      : createdAt.toISOString();
  return Buffer.from(JSON.stringify({ createdAt: iso, id })).toString(
    "base64url",
  );
}

function decodeOrderCursor(cursor: string): DecodedOrderCursor {
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
