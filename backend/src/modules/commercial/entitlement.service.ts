import { Injectable, Logger } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseClient } from "../../infrastructure/database/database.module.js";
import {
  type CatalogGrantRecord,
  type EntitlementOrderEffectRecord,
  type EntitlementRecord,
  type OrderRecord,
  catalogGrantRevocationsTable,
  catalogGrantsTable,
  commercialPolicySnapshotsTable,
  entitlementOrderEffectsTable,
  entitlementsTable,
  ordersTable,
} from "../../infrastructure/database/schemas/commercial.schema.js";

import {
  EntitlementConsistencyException,
  RevokedTargetException,
  CommercialValidationException,
} from "./commercial.errors.js";


@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  /**
   * Verifies historical identity and provenance between an order, its recorded effect,
   * and the linked entitlement.
   *
   * Separates historical effect provenance from current entitlement state:
   * does not require current status or expires_at to match historical snapshots,
   * but fails closed if current expires_at is earlier than effect expires_at_after.
   */
  verifyHistoricalEffectProvenance(
    order: OrderRecord,
    effect: EntitlementOrderEffectRecord,
    entitlement: EntitlementRecord,
  ): void {
    if (effect.orderId !== order.id) {
      throw new EntitlementConsistencyException(
        `Effect order ID ${effect.orderId} does not match order ID ${order.id}`,
      );
    }

    if (effect.entitlementId !== entitlement.id) {
      throw new EntitlementConsistencyException(
        `Effect entitlement ID ${effect.entitlementId} does not match entitlement ID ${entitlement.id}`,
      );
    }

    if (entitlement.customerId !== order.customerId) {
      throw new EntitlementConsistencyException(
        `Entitlement customer ID ${entitlement.customerId} does not match order customer ID ${order.customerId}`,
      );
    }

    if (entitlement.targetKind !== order.targetKind) {
      throw new EntitlementConsistencyException(
        `Entitlement target kind ${entitlement.targetKind} does not match order target kind ${order.targetKind}`,
      );
    }

    if (order.targetKind === "MOVIE") {
      if (!order.targetMovieContentId || entitlement.targetMovieContentId !== order.targetMovieContentId) {
        throw new EntitlementConsistencyException(
          "Entitlement target movie does not match order target",
        );
      }
    } else if (order.targetKind === "SERIES") {
      if (!order.targetSeriesContentId || entitlement.targetSeriesContentId !== order.targetSeriesContentId) {
        throw new EntitlementConsistencyException(
          "Entitlement target series does not match order target",
        );
      }
    } else if (order.targetKind === "SEASON") {
      if (!order.targetSeasonId || entitlement.targetSeasonId !== order.targetSeasonId) {
        throw new EntitlementConsistencyException(
          "Entitlement target season does not match order target",
        );
      }
    } else if (order.targetKind === "EPISODE") {
      if (!order.targetEpisodeId || entitlement.targetEpisodeId !== order.targetEpisodeId) {
        throw new EntitlementConsistencyException(
          "Entitlement target episode does not match order target",
        );
      }
    } else if (order.targetKind === "CATALOG") {
      if (
        entitlement.targetMovieContentId ||
        entitlement.targetSeriesContentId ||
        entitlement.targetSeasonId ||
        entitlement.targetEpisodeId
      ) {
        throw new EntitlementConsistencyException(
          "CATALOG entitlement must have all typed targets null",
        );
      }
    } else {
      throw new EntitlementConsistencyException(
        `Unsupported target kind for entitlement: ${order.targetKind}`,
      );
    }


    if (new Date(effect.expiresAtAfter).getTime() <= new Date(entitlement.startsAt).getTime()) {
      throw new EntitlementConsistencyException(
        `Effect expires_at_after (${effect.expiresAtAfter.toISOString()}) must be strictly after entitlement starts_at (${entitlement.startsAt.toISOString()})`,
      );
    }

    if (new Date(entitlement.expiresAt).getTime() < new Date(effect.expiresAtAfter).getTime()) {
      throw new EntitlementConsistencyException(
        `Inconsistent effect ledger: entitlement expires_at (${entitlement.expiresAt.toISOString()}) is earlier than historical effect expires_at_after (${effect.expiresAtAfter.toISOString()})`,
      );
    }
  }

  /**
   * Under row lock, queries whether an entitlement order effect already exists for this order.
   * If found, verifies historical provenance and returns both records.
   */
  async verifyExistingOrderEffect(
    client: DatabaseClient,
    order: OrderRecord,
  ): Promise<{ entitlement: EntitlementRecord; effect: EntitlementOrderEffectRecord } | null> {
    const [effect] = await client
      .select()
      .from(entitlementOrderEffectsTable)
      .where(eq(entitlementOrderEffectsTable.orderId, order.id))
      .for("update")
      .limit(1);

    if (!effect) {
      return null;
    }

    const [entitlement] = await client
      .select()
      .from(entitlementsTable)
      .where(eq(entitlementsTable.id, effect.entitlementId))
      .for("update")
      .limit(1);

    if (!entitlement) {
      throw new EntitlementConsistencyException(
        `Referenced entitlement ${effect.entitlementId} missing for effect on order ${order.id}`,
      );
    }

    this.verifyHistoricalEffectProvenance(order, effect, entitlement);
    return { entitlement, effect };
  }

  /**
   * Authoritatively provisions exact-target entitlement access for an order.
   * Single-owner authority enforcing creation, extension arithmetic, and effect logging.
   */
  async applyOrderFulfillment(
    client: DatabaseClient,
    order: OrderRecord,
  ): Promise<{
    entitlement: EntitlementRecord;
    effect: EntitlementOrderEffectRecord;
    grant?: CatalogGrantRecord;
    idempotentReplay: boolean;
  }> {
    if (order.targetKind === "CATALOG") {
      return await this.applyCatalogOrderFulfillment(client, order);
    }

    if (!["MOVIE", "SERIES", "SEASON", "EPISODE"].includes(order.targetKind)) {
      throw new CommercialValidationException(
        `Target kind ${order.targetKind} is not a supported content grant.`,
      );
    }


    if (
      !order.durationValue ||
      order.durationValue <= 0 ||
      !order.durationUnit ||
      !["HOUR", "DAY"].includes(order.durationUnit)
    ) {
      throw new CommercialValidationException(
        `Order ${order.id} has invalid purchased duration terms: value=${order.durationValue}, unit=${order.durationUnit}`,
      );
    }

    // 1. Idempotency Check: Did this order already record an effect?
    const existing = await this.verifyExistingOrderEffect(client, order);
    if (existing) {
      this.logger.log(
        `Order ${order.id} already has a valid entitlement effect (entitlementId: ${existing.entitlement.id}). Replaying without extending.`,
      );
      return {
        entitlement: existing.entitlement,
        effect: existing.effect,
        idempotentReplay: true,
      };
    }

    const intervalSql =
      order.durationUnit === "HOUR"
        ? sql`(${order.durationValue} || ' hours')::interval`
        : sql`(${order.durationValue} || ' days')::interval`;

    // 2. Convergence Strategy: Try inserting new entitlement row
    const [createdRow] = await client
      .insert(entitlementsTable)
      .values({
        customerId: order.customerId,
        targetKind: order.targetKind,
        targetMovieContentId: order.targetMovieContentId ?? null,
        targetSeriesContentId: order.targetSeriesContentId ?? null,
        targetSeasonId: order.targetSeasonId ?? null,
        targetEpisodeId: order.targetEpisodeId ?? null,
        status: "ACTIVE",
        startsAt: sql`transaction_timestamp()`,
        expiresAt: sql`transaction_timestamp() + ${intervalSql}`,
        createdAt: sql`transaction_timestamp()`,
        updatedAt: sql`transaction_timestamp()`,
      })
      .onConflictDoNothing()
      .returning();

    if (createdRow) {
      // Won initial creation race
      const [effect] = await client
        .insert(entitlementOrderEffectsTable)
        .values({
          orderId: order.id,
          entitlementId: createdRow.id,
          effectKind: "CREATED",
          appliedAt: sql`transaction_timestamp()`,
          expiresAtAfter: createdRow.expiresAt,
        })
        .returning();

      return {
        entitlement: createdRow,
        effect: effect!,
        idempotentReplay: false,
      };
    }

    // 3. Lost creation race or pre-existing entitlement: Lock existing row FOR UPDATE
    const conditions = [
      eq(entitlementsTable.customerId, order.customerId),
      eq(entitlementsTable.targetKind, order.targetKind),
    ];

    if (order.targetKind === "MOVIE" && order.targetMovieContentId) {
      conditions.push(eq(entitlementsTable.targetMovieContentId, order.targetMovieContentId));
    } else if (order.targetKind === "SERIES" && order.targetSeriesContentId) {
      conditions.push(eq(entitlementsTable.targetSeriesContentId, order.targetSeriesContentId));
    } else if (order.targetKind === "SEASON" && order.targetSeasonId) {
      conditions.push(eq(entitlementsTable.targetSeasonId, order.targetSeasonId));
    } else if (order.targetKind === "EPISODE" && order.targetEpisodeId) {
      conditions.push(eq(entitlementsTable.targetEpisodeId, order.targetEpisodeId));
    }

    const [existingEntitlement] = await client
      .select()
      .from(entitlementsTable)
      .where(and(...conditions))
      .for("update")
      .limit(1);

    if (!existingEntitlement) {
      throw new EntitlementConsistencyException(
        `Concurrent entitlement conflict detected for customer ${order.customerId} and target ${order.targetKind}, but winning row could not be locked.`,
      );
    }

    if (existingEntitlement.status === "REVOKED") {
      throw new RevokedTargetException(
        `Target entitlement ${existingEntitlement.id} is revoked and cannot be reactivated or purchased.`,
      );
    }

    // Single unified extension formula:
    // new_expires_at = GREATEST(current_expires_at, transaction_timestamp()) + duration
    // status = 'ACTIVE'
    // starts_at is PRESERVED UNCHANGED!
    const [updatedEntitlement] = await client
      .update(entitlementsTable)
      .set({
        status: "ACTIVE",
        expiresAt: sql`GREATEST(${entitlementsTable.expiresAt}, transaction_timestamp()) + ${intervalSql}`,
        updatedAt: sql`transaction_timestamp()`,
      })
      .where(eq(entitlementsTable.id, existingEntitlement.id))
      .returning();

    const [effect] = await client
      .insert(entitlementOrderEffectsTable)
      .values({
        orderId: order.id,
        entitlementId: updatedEntitlement!.id,
        effectKind: "EXTENDED",
        appliedAt: sql`transaction_timestamp()`,
        expiresAtAfter: updatedEntitlement!.expiresAt,
      })
      .returning();

    return {
      entitlement: updatedEntitlement!,
      effect: effect!,
      idempotentReplay: false,
    };
  }

  /**
   * Authoritatively provisions per-snapshot CATALOG entitlement grants.
   * Enforces D1 per-snapshot validity windows, D2 frozen snapshots, D3 renewal continuity,
   * non-reactivation of revoked anchors, and bidirectional ledger immutability.
   */
  async applyCatalogOrderFulfillment(
    client: DatabaseClient,
    order: OrderRecord,
  ): Promise<{
    entitlement: EntitlementRecord;
    effect: EntitlementOrderEffectRecord;
    grant?: CatalogGrantRecord;
    idempotentReplay: boolean;
  }> {
    if (order.targetKind !== "CATALOG") {
      throw new CommercialValidationException(
        `Order ${order.id} is target ${order.targetKind}, expected CATALOG`,
      );
    }

    if (
      !order.durationValue ||
      order.durationValue <= 0 ||
      !order.durationUnit ||
      !["HOUR", "DAY"].includes(order.durationUnit)
    ) {
      throw new CommercialValidationException(
        `Order ${order.id} has invalid purchased duration terms: value=${order.durationValue}, unit=${order.durationUnit}`,
      );
    }

    if (!order.catalogPolicySnapshotId) {
      throw new CommercialValidationException(
        `Order ${order.id} is a CATALOG target but has no catalogPolicySnapshotId`,
      );
    }

    // 1. Idempotency Check: Did this order already record an effect and grant?
    const existing = await this.verifyExistingOrderEffect(client, order);
    if (existing) {
      const [existingGrant] = await client
        .select()
        .from(catalogGrantsTable)
        .where(eq(catalogGrantsTable.orderId, order.id))
        .limit(1);

      this.logger.log(
        `Catalog order ${order.id} already has a valid entitlement effect (entitlementId: ${existing.entitlement.id}). Replaying idempotently.`,
      );
      return {
        entitlement: existing.entitlement,
        effect: existing.effect,
        grant: existingGrant ?? undefined,
        idempotentReplay: true,
      };
    }

    // 2. Lock or Create Anchor Entitlement for Customer
    // Step 2a: Convergence insert for first-time customer catalog anchor
    await client
      .insert(entitlementsTable)
      .values({
        customerId: order.customerId,
        targetKind: "CATALOG",
        status: "ACTIVE",
        startsAt: sql`transaction_timestamp()`,
        expiresAt: sql`transaction_timestamp() + interval '1 second'`, // updated below
        createdAt: sql`transaction_timestamp()`,
        updatedAt: sql`transaction_timestamp()`,
      })
      .onConflictDoNothing();

    // Step 2b: Lock the anchor row FOR UPDATE
    const [anchor] = await client
      .select()
      .from(entitlementsTable)
      .where(
        and(
          eq(entitlementsTable.customerId, order.customerId),
          eq(entitlementsTable.targetKind, "CATALOG"),
        ),
      )
      .for("update")
      .limit(1);

    if (!anchor) {
      throw new EntitlementConsistencyException(
        `Failed to acquire locked CATALOG anchor for customer ${order.customerId}`,
      );
    }

    // Non-reactivation invariant: ordinary fulfillment cannot reactivate a terminally revoked anchor
    if (anchor.status === "REVOKED") {
      throw new RevokedTargetException(
        `Customer CATALOG entitlement ${anchor.id} is REVOKED and cannot be reactivated or purchased.`,
      );
    }

    // 3. Renewal Continuity & Predecessor Resolution (D3)
    // 3a. Read current order's snapshot and policy definition
    const [currentSnapshot] = await client
      .select()
      .from(commercialPolicySnapshotsTable)
      .where(eq(commercialPolicySnapshotsTable.id, order.catalogPolicySnapshotId))
      .limit(1);

    if (!currentSnapshot) {
      throw new CommercialValidationException(
        `Referenced policy snapshot ${order.catalogPolicySnapshotId} does not exist for order ${order.id}`,
      );
    }

    // 3b. Determine candidate predecessors: equivalent orders for same customer and offer
    const candidateOrders = await client
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.customerId, order.customerId),
          eq(ordersTable.offerId, order.offerId),
          eq(ordersTable.planVersionId, order.planVersionId),
          eq(ordersTable.targetKind, "CATALOG"),
        ),
      );

    let predecessorOrderId: string | null = null;
    let scheduledStartSql = sql`transaction_timestamp()`;

    if (candidateOrders.length > 0) {
      const candidateOrderIds = candidateOrders.map((o) => o.id).filter((id) => id !== order.id);

      if (candidateOrderIds.length > 0) {
        // Query highest valid_until among unrevoked grants with future expiry
        const candidateGrants = await client
          .select({
            orderId: catalogGrantsTable.orderId,
            validUntil: catalogGrantsTable.validUntil,
          })
          .from(catalogGrantsTable)
          .where(
            and(
              eq(catalogGrantsTable.entitlementId, anchor.id),
              inArray(catalogGrantsTable.orderId, candidateOrderIds),
              sql`${catalogGrantsTable.orderId} NOT IN (SELECT order_id FROM ${catalogGrantRevocationsTable})`,
              sql`${catalogGrantsTable.validUntil} > transaction_timestamp()`,
            ),
          )
          .orderBy(sql`${catalogGrantsTable.validUntil} DESC`)
          .limit(1);

        if (candidateGrants.length > 0 && candidateGrants[0]) {
          predecessorOrderId = candidateGrants[0].orderId;
          const dt = candidateGrants[0].validUntil;
          const iso = dt instanceof Date ? dt.toISOString() : new Date(dt).toISOString();
          scheduledStartSql = sql`${iso}::timestamptz`;
        }
      }
    }

    // 4. Calculate exact duration: 1 DAY = exactly 24 hours (86,400 seconds)
    const durationIntervalSql =
      order.durationUnit === "HOUR"
        ? sql`(${order.durationValue} || ' hours')::interval`
        : sql`(${order.durationValue * 24} || ' hours')::interval`;

    const validUntilSql = sql`(${scheduledStartSql})::timestamptz + ${durationIntervalSql}`;

    // 5. Insert catalog_grant and entitlement_order_effect atomically
    const [grant] = await client
      .insert(catalogGrantsTable)
      .values({
        orderId: order.id,
        entitlementId: anchor.id,
        predecessorOrderId,
        validFrom: scheduledStartSql,
        validUntil: validUntilSql,
        createdAt: sql`transaction_timestamp()`,
      })
      .returning();

    const [effect] = await client
      .insert(entitlementOrderEffectsTable)
      .values({
        orderId: order.id,
        entitlementId: anchor.id,
        effectKind: predecessorOrderId ? "EXTENDED" : "CREATED",
        appliedAt: sql`transaction_timestamp()`,
        expiresAtAfter: validUntilSql,
      })
      .returning();

    // 6. Update anchor entitlement expiry cache and status
    const [updatedAnchor] = await client
      .update(entitlementsTable)
      .set({
        status: "ACTIVE",
        expiresAt: sql`GREATEST(${entitlementsTable.expiresAt}, ${grant!.validUntil})`,
        updatedAt: sql`transaction_timestamp()`,
      })
      .where(and(eq(entitlementsTable.id, anchor.id), sql`${entitlementsTable.status} <> 'REVOKED'`))
      .returning();

    return {
      entitlement: updatedAnchor ?? anchor,
      effect: effect!,
      grant: grant!,
      idempotentReplay: false,
    };
  }
}

