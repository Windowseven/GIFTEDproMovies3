import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { FulfillmentService } from "../src/modules/commercial/fulfillment.service.js";
import { EntitlementService } from "../src/modules/commercial/entitlement.service.js";
import { PaymentService } from "../src/modules/commercial/payment.service.js";
import { ReconciliationService } from "../src/modules/commercial/reconciliation.service.js";
import { CommercialRepository } from "../src/modules/commercial/commercial.repository.js";
import {
  AmbiguousCommitException,
  EntitlementConsistencyException,
  FulfillmentIntegrityException,
  OrderNotSettledException,
} from "../src/modules/commercial/commercial.errors.js";
import { DRIZZLE_DATABASE } from "../src/infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../src/infrastructure/database/database.module.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Fulfillments Engine & Recovery runtime verification suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 25 });

  const adminId = randomUUID();
  const customerId = randomUUID();
  const otherCustomerId = randomUUID();

  await pool.query(
    "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES " +
      "($1, $2, 'hash', 'admin', 'active', NOW()), " +
      "($3, $4, 'hash', 'customer', 'active', NOW()), " +
      "($5, $6, 'hash', 'customer', 'active', NOW()) " +
      "ON CONFLICT DO NOTHING",
    [
      adminId,
      "admin-ful-" + adminId.slice(0, 8) + "@giftedpro.test",
      customerId,
      "cust-ful-" + customerId.slice(0, 8) + "@giftedpro.test",
      otherCustomerId,
      "other-ful-" + otherCustomerId.slice(0, 8) + "@giftedpro.test",
    ],
  );

  const planId = randomUUID();
  const planVersionId = randomUUID();
  await pool.query(
    "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Fulfillment Plan') ON CONFLICT DO NOTHING",
    [planId, "PLAN_FUL_" + randomUUID().slice(0, 6).toUpperCase()],
  );
  await pool.query(
    "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 7, 'DAY', 5, 2, 2) ON CONFLICT DO NOTHING",
    [planVersionId, planId],
  );

  const movieId = randomUUID();
  await pool.query(
    "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Fulfillment Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
    [movieId, "ful-mov-" + movieId.slice(0, 8), "slug-ful-" + movieId.slice(0, 8), adminId],
  );

  const offerId = randomUUID();
  await pool.query(
    "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs) VALUES " +
      "($1, $2, 'Fulfillment Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'MOVIE', $3, $4, 5000)",
    [offerId, "OFF_FUL_" + offerId.slice(0, 6).toUpperCase(), movieId, planVersionId],
  );

  const catOfferId = randomUUID();
  await pool.query(
    "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, catalog_policy_type, plan_version_id, price_tzs) VALUES " +
      "($1, $2, 'Cat Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'ALL_CATALOG', $3, 10000)",
    [catOfferId, "OFF_CAT_" + catOfferId.slice(0, 6).toUpperCase(), planVersionId],
  );

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ disableRequestLogging: true }),
  );
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
  await app.init();

  const fulfillmentService = moduleFixture.get(FulfillmentService);
  const entitlementService = moduleFixture.get(EntitlementService);
  const paymentService = moduleFixture.get(PaymentService);
  const reconciliationService = moduleFixture.get(ReconciliationService);
  const commercialRepository = moduleFixture.get(CommercialRepository);
  const db = moduleFixture.get<ApplicationDatabase>(DRIZZLE_DATABASE);

  t.after(async () => {
    await app.close();
    await pool.end();
  });

  // Helper to create an order, payment attempt, and optionally settle it
  async function createPaidOrderFixture(params: {
    targetKind?: "MOVIE" | "SERIES" | "SEASON" | "EPISODE" | "CATALOG";
    targetMovieContentId?: string | null;
    custUserId?: string;
    durationValue?: number;
    durationUnit?: "HOUR" | "DAY";
    amountTzs?: number;
    withSettlement?: boolean;
    markPaid?: boolean;
    offerId?: string;
  }) {
    const oId = randomUUID();
    const kind = params.targetKind ?? "MOVIE";
    const cust = params.custUserId ?? customerId;
    const durVal = params.durationValue ?? 7;
    const durUnit = params.durationUnit ?? "DAY";
    const amount = params.amountTzs ?? 5000;
    const status = params.markPaid ? "PAID" : "PENDING_PAYMENT";
    const usedOfferId = params.offerId ?? (kind === "CATALOG" ? catOfferId : offerId);

    if (kind === "CATALOG") {
      const snapId = randomUUID();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO commercial_policy_snapshots (id, policy_type, created_at) VALUES ($1, 'ALL_CATALOG', NOW())",
          [snapId],
        );
        await client.query(
          "INSERT INTO orders (id, customer_id, offer_id, plan_version_id, target_kind, target_movie_content_id, catalog_policy_snapshot_id, duration_value, duration_unit, amount_tzs, status, idempotency_key, created_at, updated_at) VALUES " +
            "($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())",
          [
            oId,
            cust,
            usedOfferId,
            planVersionId,
            kind,
            null,
            snapId,
            durVal,
            durUnit,
            amount,
            status,
            "idemp-" + oId,
          ],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } else {
      await pool.query(
        "INSERT INTO orders (id, customer_id, offer_id, plan_version_id, target_kind, target_movie_content_id, catalog_policy_snapshot_id, duration_value, duration_unit, amount_tzs, status, idempotency_key, created_at, updated_at) VALUES " +
          "($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())",
        [
          oId,
          cust,
          usedOfferId,
          planVersionId,
          kind,
          params.targetMovieContentId !== undefined ? params.targetMovieContentId : movieId,
          null,
          durVal,
          durUnit,
          amount,
          status,
          "idemp-" + oId,
        ],
      );
    }

    const paId = randomUUID();
    const provRef = "prov-ref-" + paId.slice(0, 8);
    const provEvent = "prov-evt-" + paId.slice(0, 8);
    await pool.query(
      "INSERT INTO payment_attempts (id, order_id, attempt_number, status, provider_name, provider_reference, provider_event_id, amount_tzs, created_at, updated_at) VALUES " +
        "($1, $2, 1, $3, 'simulated', $4, $5, $6, NOW(), NOW())",
      [paId, oId, params.markPaid ? "SUCCEEDED" : "PENDING", provRef, provEvent, amount],
    );

    let settlementId: string | null = null;
    if (params.withSettlement) {
      settlementId = randomUUID();
      await pool.query(
        "INSERT INTO settlements (id, payment_attempt_id, provider_name, provider_event_id, provider_reference, amount_tzs, settled_at) VALUES " +
          "($1, $2, 'simulated', $3, $4, $5, NOW())",
        [settlementId, paId, provEvent, provRef, amount],
      );
    }

    const orderRow = await commercialRepository.findOrderById(db, oId);
    return {
      orderId: oId,
      paymentAttemptId: paId,
      settlementId,
      providerReference: provRef,
      providerEventId: provEvent,
      order: orderRow!,
    };
  }

  await t.test("1. Atomic Enqueueing on Confirmation [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: false });
    const res = await paymentService.simulateConfirmPayment(
      fixture.paymentAttemptId,
      {
        outcome: "SUCCEEDED",
        providerEventId: fixture.providerEventId,
        providerReference: fixture.providerReference,
        amountTzs: 5000,
      },
      adminId,
    );

    assert.equal(res.order.status, "PAID");
    assert.equal(res.attempt.status, "SUCCEEDED");

    // Proves a fulfillment row exists in PENDING with attempt_count 0
    const fRes = await pool.query("SELECT * FROM fulfillments WHERE order_id = $1", [
      fixture.orderId,
    ]);
    assert.equal(fRes.rows.length, 1);
    assert.equal(fRes.rows[0].status, "PENDING");
    assert.equal(fRes.rows[0].attempt_count, 0);
  });

  await t.test("2. Atomic Enqueueing on Confirmation Replay Backfill [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: false });
    // Replay confirm where settlement was missing and is backfilled
    const res = await paymentService.simulateConfirmPayment(
      fixture.paymentAttemptId,
      {
        outcome: "SUCCEEDED",
        providerEventId: fixture.providerEventId,
        providerReference: fixture.providerReference,
        amountTzs: 5000,
      },
      adminId,
    );

    assert.equal(res.idempotentReplay, true);
    assert.ok(res.settlement);

    const fRes = await pool.query("SELECT * FROM fulfillments WHERE order_id = $1", [
      fixture.orderId,
    ]);
    assert.equal(fRes.rows.length, 1);
    assert.equal(fRes.rows[0].status, "PENDING");
  });

  await t.test("3. Idempotent Enqueueing on Replay with Existing Settlement [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    // Pre-insert a fulfillment row with custom attempt_count to verify inviolability
    const customFId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, created_at, updated_at) VALUES ($1, $2, 'PENDING', 2, NOW(), NOW())",
      [customFId, fixture.orderId],
    );

    const res = await paymentService.simulateConfirmPayment(
      fixture.paymentAttemptId,
      {
        outcome: "SUCCEEDED",
        providerEventId: fixture.providerEventId,
        providerReference: fixture.providerReference,
        amountTzs: 5000,
      },
      adminId,
    );

    assert.equal(res.idempotentReplay, true);
    const fRes = await pool.query("SELECT * FROM fulfillments WHERE order_id = $1", [
      fixture.orderId,
    ]);
    assert.equal(fRes.rows.length, 1);
    // Preserves attempt_count = 2 intact!
    assert.equal(fRes.rows[0].attempt_count, 2);
  });

  await t.test("4. Atomic Enqueueing on Settlement Repair [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: false });
    const res = await reconciliationService.repairMissingSettlement(
      fixture.paymentAttemptId,
      adminId,
    );

    assert.ok(res.settlement);
    const fRes = await pool.query("SELECT * FROM fulfillments WHERE order_id = $1", [
      fixture.orderId,
    ]);
    assert.equal(fRes.rows.length, 1);
    assert.equal(fRes.rows[0].status, "PENDING");
  });

  await t.test("5. Pre-Existing Fulfillment Inviolability [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, last_error_code, failed_at, created_at, updated_at) VALUES ($1, $2, 'FAILED_RETRYABLE', 2, 'PREV_ERR', NOW(), NOW(), NOW())",
      [fId, fixture.orderId],
    );

    // Enqueue fulfillment again
    await db.transaction(async (tx) => {
      await fulfillmentService.enqueueFulfillment(tx, fixture.orderId);
    });

    const fRes = await pool.query("SELECT * FROM fulfillments WHERE order_id = $1", [
      fixture.orderId,
    ]);
    assert.equal(fRes.rows.length, 1);
    assert.equal(fRes.rows[0].status, "FAILED_RETRYABLE");
    assert.equal(fRes.rows[0].attempt_count, 2);
    assert.equal(fRes.rows[0].last_error_code, "PREV_ERR");
  });

  await t.test("6. Legacy Missing-Fulfillment Financial Preconditions [Direct Real Transaction]", async () => {
    // Unsettled order without fulfillment must fail closed
    const unsettledFixture = await createPaidOrderFixture({ markPaid: true, withSettlement: false });
    await assert.rejects(
      async () => {
        await fulfillmentService.processFulfillmentForOrder(unsettledFixture.orderId);
      },
      (err: any) => err instanceof OrderNotSettledException,
    );

    // No fulfillment row was inserted
    const fRes1 = await pool.query("SELECT * FROM fulfillments WHERE order_id = $1", [
      unsettledFixture.orderId,
    ]);
    assert.equal(fRes1.rows.length, 0);

    // When preconditions are met, missing fulfillment is recovered and processed
    const settledFixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const res = await fulfillmentService.processFulfillmentForOrder(settledFixture.orderId);
    assert.equal(res.status, "COMPLETED");
  });

  await t.test("7. Corrupt Completed Fulfillment Fails Closed [Committed Database Boundary Simulation]", async () => {
    const freshCustId = randomUUID();
    await pool.query(
      "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES ($1, $2, 'hash', 'customer', 'active', NOW())",
      [freshCustId, "cust-7-" + freshCustId.slice(0, 8) + "@giftedpro.test"],
    );
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true, custUserId: freshCustId });
    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, completed_at, created_at, updated_at) VALUES ($1, $2, 'COMPLETED', 1, NOW(), NOW(), NOW())",
      [fId, fixture.orderId],
    );

    // Calling processFulfillmentForOrder with no effect row present
    await assert.rejects(
      async () => {
        await fulfillmentService.processFulfillmentForOrder(fixture.orderId);
      },
      (err: any) => err instanceof FulfillmentIntegrityException,
    );

    // Proves zero entitlements created
    const entRes = await pool.query("SELECT * FROM entitlements WHERE customer_id = $1", [
      fixture.order.customerId,
    ]);
    assert.equal(entRes.rows.length, 0);
  });

  await t.test("8. Valid Completed Replay Pure No-Op [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    // Process once to completion
    const res1 = await fulfillmentService.processFulfillmentForOrder(fixture.orderId);
    assert.equal(res1.status, "COMPLETED");

    // Process second time: pure no-op replay
    const res2 = await fulfillmentService.processFulfillmentForOrder(fixture.orderId);
    assert.equal(res2.status, "COMPLETED");
    if (res2.status === "COMPLETED") {
      assert.equal(res2.idempotentReplay, true);
    }
  });

  await t.test("9. Settlement Verification Precondition [Direct Real Transaction]", async () => {
    // Order marked PAID but lacking settlement in DB
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: false });
    // Enqueue fulfillment row
    await db.transaction(async (tx) => {
      await fulfillmentService.enqueueFulfillment(tx, fixture.orderId);
    });

    const res = await fulfillmentService.processFulfillmentForOrder(fixture.orderId);
    assert.equal(res.status, "FAILED_TERMINAL");
    if (res.status === "FAILED_TERMINAL") {
      assert.equal(res.errorCode, "ORDER_NOT_SETTLED");
      assert.equal(res.attemptCount, 1);
    }
  });

  await t.test("10. Exact-Once Entitlement Grant [Direct Real Transaction]", async () => {
    const freshMovieId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Exact Once Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
      [freshMovieId, "mov-10-" + freshMovieId.slice(0, 8), "slug-10-" + freshMovieId.slice(0, 8), adminId],
    );
    const fixture = await createPaidOrderFixture({
      markPaid: true,
      withSettlement: true,
      durationValue: 3,
      durationUnit: "DAY",
      targetMovieContentId: freshMovieId,
    });
    const res = await fulfillmentService.processFulfillmentForOrder(fixture.orderId);

    assert.equal(res.status, "COMPLETED");
    if (res.status === "COMPLETED") {
      assert.equal(res.fulfillment.status, "COMPLETED");
      assert.equal(res.fulfillment.attemptCount, 1);
      assert.equal(res.entitlement.status, "ACTIVE");
      assert.equal(res.effect.effectKind, "CREATED");

      // Verify duration: expiresAt should be approximately 3 days from startsAt
      const diffDays = Math.round(
        (new Date(res.entitlement.expiresAt).getTime() - new Date(res.entitlement.startsAt).getTime()) /
          (1000 * 3600 * 24),
      );
      assert.equal(diffDays, 3);
    }
  });

  await t.test("11. Active Entitlement Extension [Direct Real Transaction]", async () => {
    const fixture1 = await createPaidOrderFixture({ markPaid: true, withSettlement: true, durationValue: 2, durationUnit: "DAY" });
    const res1 = await fulfillmentService.processFulfillmentForOrder(fixture1.orderId);
    assert.equal(res1.status, "COMPLETED");
    const initialExpiry = (res1 as any).entitlement.expiresAt;

    // Second order for the same customer and same target
    const fixture2 = await createPaidOrderFixture({ markPaid: true, withSettlement: true, durationValue: 3, durationUnit: "DAY" });
    const res2 = await fulfillmentService.processFulfillmentForOrder(fixture2.orderId);
    assert.equal(res2.status, "COMPLETED");

    if (res2.status === "COMPLETED") {
      assert.equal(res2.effect.effectKind, "EXTENDED");
      // New expiry should be approx initialExpiry + 3 days
      const diffDays = Math.round(
        (new Date(res2.entitlement.expiresAt).getTime() - new Date(initialExpiry).getTime()) /
          (1000 * 3600 * 24),
      );
      assert.equal(diffDays, 3);
    }
  });

  await t.test("12. Expired Entitlement Extension & Preservation of starts_at [Direct Real Transaction]", async () => {
    const fixture1 = await createPaidOrderFixture({ markPaid: true, withSettlement: true, durationValue: 1, durationUnit: "DAY" });
    const res1 = await fulfillmentService.processFulfillmentForOrder(fixture1.orderId);
    assert.equal(res1.status, "COMPLETED");

    // Manually expire the entitlement while preserving starts_at < expires_at
    const expiredStartsAt = new Date(Date.now() - 5 * 24 * 3600 * 1000);
    const expiredExpiresAt = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    await pool.query(
      "UPDATE entitlements SET status = 'EXPIRED', starts_at = $1, expires_at = $2 WHERE id = $3",
      [expiredStartsAt, expiredExpiresAt, (res1 as any).entitlement.id],
    );

    const fixture2 = await createPaidOrderFixture({ markPaid: true, withSettlement: true, durationValue: 5, durationUnit: "DAY" });
    const res2 = await fulfillmentService.processFulfillmentForOrder(fixture2.orderId);
    assert.equal(res2.status, "COMPLETED");

    if (res2.status === "COMPLETED") {
      assert.equal(res2.entitlement.status, "ACTIVE");
      assert.equal(res2.effect.effectKind, "EXTENDED");
      // starts_at is preserved unchanged!
      assert.equal(
        new Date(res2.entitlement.startsAt).toISOString(),
        expiredStartsAt.toISOString(),
      );
    }
  });

  await t.test("13. Concurrent Creation Convergence [Direct Real Transaction]", async () => {
    const targetMovieId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Concurrent Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
      [targetMovieId, "con-mov-" + targetMovieId.slice(0, 8), "slug-con-" + targetMovieId.slice(0, 8), adminId],
    );

    const f1 = await createPaidOrderFixture({
      targetMovieContentId: targetMovieId,
      markPaid: true,
      withSettlement: true,
      durationValue: 2,
    });
    const f2 = await createPaidOrderFixture({
      targetMovieContentId: targetMovieId,
      markPaid: true,
      withSettlement: true,
      durationValue: 3,
    });

    // Run both fulfillments concurrently
    const [res1, res2] = await Promise.all([
      fulfillmentService.processFulfillmentForOrder(f1.orderId),
      fulfillmentService.processFulfillmentForOrder(f2.orderId),
    ]);

    assert.equal(res1.status, "COMPLETED");
    assert.equal(res2.status, "COMPLETED");

    // Both should point to the exact same entitlement row!
    assert.equal((res1 as any).entitlement.id, (res2 as any).entitlement.id);
    const effects = await pool.query(
      "SELECT * FROM entitlement_order_effects WHERE entitlement_id = $1 ORDER BY applied_at ASC",
      [(res1 as any).entitlement.id],
    );
    assert.equal(effects.rows.length, 2);
    const kinds = effects.rows.map((r: any) => r.effect_kind).sort();
    assert.deepEqual(kinds, ["CREATED", "EXTENDED"]);
  });

  await t.test("14. Crash-Recovery Effect Reconciliation (Attempt Count = 1) [Committed Database Boundary Simulation]", async () => {
    const freshMovieId14 = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Crash Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
      [freshMovieId14, "mov-14-" + freshMovieId14.slice(0, 8), "slug-14-" + freshMovieId14.slice(0, 8), adminId],
    );
    const fixture = await createPaidOrderFixture({
      markPaid: true,
      withSettlement: true,
      durationValue: 2,
      targetMovieContentId: freshMovieId14,
    });
    // Insert entitlement and effect directly as if Transaction 2 committed effect before worker crashed
    const entId = randomUUID();
    const effId = randomUUID();
    const expiryDate = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    await pool.query(
      "INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, created_at, updated_at) VALUES " +
        "($1, $2, 'MOVIE', $3, 'ACTIVE', NOW(), $4, NOW(), NOW())",
      [entId, fixture.order.customerId, freshMovieId14, expiryDate],
    );
    await pool.query(
      "INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after) VALUES " +
        "($1, $2, $3, 'CREATED', NOW(), $4)",
      [effId, fixture.orderId, entId, expiryDate],
    );

    // Fulfillment queue row remains in PENDING with attempt_count 0
    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, created_at, updated_at) VALUES ($1, $2, 'PENDING', 0, NOW(), NOW())",
      [fId, fixture.orderId],
    );

    const res = await fulfillmentService.processFulfillmentForOrder(fixture.orderId);
    assert.equal(res.status, "COMPLETED");
    if (res.status === "COMPLETED") {
      assert.equal(res.recoveredFromPriorEffect, true);
      assert.equal(res.fulfillment.status, "COMPLETED");
      assert.equal(res.fulfillment.attemptCount, 1);
    }
  });

  await t.test("15. Historical Effect Provenance Independence from Subsequent State [Direct Real Transaction]", async () => {
    const fixture1 = await createPaidOrderFixture({ markPaid: true, withSettlement: true, durationValue: 1 });
    const res1 = await fulfillmentService.processFulfillmentForOrder(fixture1.orderId);
    assert.equal(res1.status, "COMPLETED");

    // Later order extends entitlement expiry into the future
    const fixture2 = await createPaidOrderFixture({ markPaid: true, withSettlement: true, durationValue: 10 });
    const res2 = await fulfillmentService.processFulfillmentForOrder(fixture2.orderId);
    assert.equal(res2.status, "COMPLETED");

    // Provenance check of order 1's historical effect must still pass even though entitlement.expires_at has moved forward!
    const effect1 = (res1 as any).effect;
    const currentEnt = (res2 as any).entitlement;
    assert.doesNotThrow(() => {
      entitlementService.verifyHistoricalEffectProvenance(fixture1.order, effect1, currentEnt);
    });
  });

  await t.test("16. Transaction-Phase Error: Confirmed Pre-Commit Savepoint Failure (Pathway A) [Direct Real Transaction]", async () => {
    // Revoked target fails within savepoint without aborting connection
    const targetMovieId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Revoked Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
      [targetMovieId, "rev-mov-" + targetMovieId.slice(0, 8), "slug-rev-" + targetMovieId.slice(0, 8), adminId],
    );

    // Pre-insert a REVOKED entitlement for this customer and target
    await pool.query(
      "INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, revoked_at, revocation_reason) VALUES " +
        "($1, $2, 'MOVIE', $3, 'REVOKED', NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', NOW(), 'Violation')",
      [randomUUID(), customerId, targetMovieId],
    );

    const fixture = await createPaidOrderFixture({
      targetMovieContentId: targetMovieId,
      markPaid: true,
      withSettlement: true,
    });

    const res = await fulfillmentService.processFulfillmentForOrder(fixture.orderId);
    assert.equal(res.status, "FAILED_TERMINAL");
    if (res.status === "FAILED_TERMINAL") {
      assert.equal(res.errorCode, "REVOKED_TARGET");
      assert.equal(res.attemptCount, 1);
    }
  });

  await t.test("17. Transaction-Phase Error: Confirmed Pre-Commit Transaction Abort (Pathway B) [Direct Real Transaction]", async () => {
    // Testing recoverAbortedPreCommitFailure directly
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, created_at, updated_at) VALUES ($1, $2, 'PENDING', 0, NOW(), NOW())",
      [fId, fixture.orderId],
    );

    // Simulate 40001 serialization error triggering Pathway B
    const res = await (fulfillmentService as any).recoverAbortedPreCommitFailure(
      fId,
      fixture.orderId,
      "40001",
      "serialization failure simulated",
      3,
    );

    assert.equal(res.status, "FAILED_RETRYABLE");
    assert.equal(res.errorCode, "40001");
    assert.equal(res.attemptCount, 1);
  });

  await t.test("18. Transaction-Phase Error: Ambiguous Lost COMMIT Acknowledgment (Pathway C / Case 4) [Committed Database Boundary Simulation]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, created_at, updated_at) VALUES ($1, $2, 'PENDING', 0, NOW(), NOW())",
      [fId, fixture.orderId],
    );

    // Call recoverAmbiguousCommit where no effect row exists
    await assert.rejects(
      async () => {
        await fulfillmentService.recoverAmbiguousCommit(fId, fixture.orderId);
      },
      (err: any) => err instanceof AmbiguousCommitException,
    );

    // Verify ZERO mutations made to fulfillments table (0 attempts consumed, status unchanged)
    const fRes = await pool.query("SELECT * FROM fulfillments WHERE id = $1", [fId]);
    assert.equal(fRes.rows[0].status, "PENDING");
    assert.equal(fRes.rows[0].attempt_count, 0);
    assert.equal(fRes.rows[0].failed_at, null);
    assert.equal(fRes.rows[0].last_error_code, null);
  });

  await t.test("19. Transaction-Phase Error: Unresolved Recovery Transaction State (Phase 5) [Direct Real Transaction]", async () => {
    // Corrupt effect ledger: entitlement.expires_at < effect.expires_at_after
    const freshMovieId19 = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Unresolved Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
      [freshMovieId19, "mov-19-" + freshMovieId19.slice(0, 8), "slug-19-" + freshMovieId19.slice(0, 8), adminId],
    );
    const fixture = await createPaidOrderFixture({
      markPaid: true,
      withSettlement: true,
      targetMovieContentId: freshMovieId19,
    });
    const entId = randomUUID();
    await pool.query(
      "INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, created_at, updated_at) VALUES " +
        "($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', NOW(), NOW())",
      [entId, fixture.order.customerId, freshMovieId19],
    );
    const effId = randomUUID();
    await pool.query(
      "INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after) VALUES " +
        "($1, $2, $3, 'CREATED', NOW(), NOW() + INTERVAL '10 days')",
      [effId, fixture.orderId, entId],
    );

    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, created_at, updated_at) VALUES ($1, $2, 'PENDING', 0, NOW(), NOW())",
      [fId, fixture.orderId],
    );

    await assert.rejects(
      async () => {
        await fulfillmentService.recoverAmbiguousCommit(fId, fixture.orderId);
      },
      (err: any) => err instanceof EntitlementConsistencyException,
    );

    // Database state remains untouched
    const fRes = await pool.query("SELECT * FROM fulfillments WHERE id = $1", [fId]);
    assert.equal(fRes.rows[0].status, "PENDING");
    assert.equal(fRes.rows[0].attempt_count, 0);
  });

  await t.test("20. Queue Claiming with SKIP LOCKED [Direct Real Transaction]", async () => {
    const fixture1 = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const fixture2 = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    await db.transaction(async (tx) => {
      await fulfillmentService.enqueueFulfillment(tx, fixture1.orderId);
      await fulfillmentService.enqueueFulfillment(tx, fixture2.orderId);
    });

    // In parallel, call processNextPendingFulfillment
    const [c1, c2] = await Promise.all([
      fulfillmentService.processNextPendingFulfillment(),
      fulfillmentService.processNextPendingFulfillment(),
    ]);

    assert.ok(c1);
    assert.ok(c2);
    assert.equal(c1.status, "COMPLETED");
    assert.equal(c2.status, "COMPLETED");
    assert.notEqual(c1.fulfillment.id, c2.fulfillment.id);
  });

  await t.test("21. Transient Retryable Failure & Total Attempt Counting [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, created_at, updated_at) VALUES ($1, $2, 'PENDING', 0, NOW(), NOW())",
      [fId, fixture.orderId],
    );

    const res = await (fulfillmentService as any).recoverAbortedPreCommitFailure(
      fId,
      fixture.orderId,
      "TIMEOUT",
      "Network timeout",
      3,
    );

    assert.equal(res.status, "FAILED_RETRYABLE");
    assert.equal(res.attemptCount, 1);
    assert.equal(res.errorCode, "TIMEOUT");

    const fRes = await pool.query("SELECT * FROM fulfillments WHERE id = $1", [fId]);
    assert.equal(fRes.rows[0].status, "FAILED_RETRYABLE");
    assert.equal(fRes.rows[0].attempt_count, 1);
    assert.ok(fRes.rows[0].last_attempt_at);
    assert.ok(fRes.rows[0].failed_at);
  });

  await t.test("22. Total Attempt Exhaustion Terminal Transition [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const fId = randomUUID();
    // Already failed twice
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, failed_at, created_at, updated_at) VALUES ($1, $2, 'FAILED_RETRYABLE', 2, NOW(), NOW(), NOW())",
      [fId, fixture.orderId],
    );

    // 3rd attempt fails -> transitions to FAILED_TERMINAL
    const res = await (fulfillmentService as any).recoverAbortedPreCommitFailure(
      fId,
      fixture.orderId,
      "TIMEOUT",
      "Network timeout",
      3,
    );

    assert.equal(res.status, "FAILED_TERMINAL");
    assert.equal(res.attemptCount, 3);

    const fRes = await pool.query("SELECT * FROM fulfillments WHERE id = $1", [fId]);
    assert.equal(fRes.rows[0].status, "FAILED_TERMINAL");
    assert.equal(fRes.rows[0].attempt_count, 3);
  });

  await t.test("23. Deterministic Terminal Failure on Revoked Entitlement [Direct Real Transaction]", async () => {
    const targetMovieId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Revoked Movie 2', $3, 'published', $4) ON CONFLICT DO NOTHING",
      [targetMovieId, "rev2-mov-" + targetMovieId.slice(0, 8), "slug-rev2-" + targetMovieId.slice(0, 8), adminId],
    );

    await pool.query(
      "INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, revoked_at, revocation_reason) VALUES " +
        "($1, $2, 'MOVIE', $3, 'REVOKED', NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', NOW(), 'Violation')",
      [randomUUID(), customerId, targetMovieId],
    );

    const fixture = await createPaidOrderFixture({
      targetMovieContentId: targetMovieId,
      markPaid: true,
      withSettlement: true,
    });

    const res = await fulfillmentService.processFulfillmentForOrder(fixture.orderId);
    assert.equal(res.status, "FAILED_TERMINAL");
    assert.equal(res.errorCode, "REVOKED_TARGET");
  });

  await t.test("24. Decoupled Financial Fact Preservation [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    const fId = randomUUID();
    await pool.query(
      "INSERT INTO fulfillments (id, order_id, status, attempt_count, created_at, updated_at) VALUES ($1, $2, 'PENDING', 2, NOW(), NOW())",
      [fId, fixture.orderId],
    );

    // Cause terminal failure
    await (fulfillmentService as any).recoverAbortedPreCommitFailure(
      fId,
      fixture.orderId,
      "PERMANENT_ERROR",
      "Fatal failure",
      3,
    );

    // Verify financial facts remain 100% intact!
    const oRes = await pool.query("SELECT * FROM orders WHERE id = $1", [fixture.orderId]);
    assert.equal(oRes.rows[0].status, "PAID");

    const paRes = await pool.query("SELECT * FROM payment_attempts WHERE id = $1", [
      fixture.paymentAttemptId,
    ]);
    assert.equal(paRes.rows[0].status, "SUCCEEDED");

    const sRes = await pool.query("SELECT * FROM settlements WHERE id = $1", [
      fixture.settlementId,
    ]);
    assert.equal(sRes.rows.length, 1);
  });

  await t.test("25. Transaction Rollback Isolation [Direct Real Transaction]", async () => {
    const fixture = await createPaidOrderFixture({ markPaid: true, withSettlement: true });
    // Execute a transaction that aborts midway
    try {
      await db.transaction(async (tx) => {
        await entitlementService.applyOrderFulfillment(tx, fixture.order);
        throw new Error("Midway abort");
      });
    } catch {
      // Expected
    }

    // Zero rows in entitlements or effects for this customer and order
    const eRes = await pool.query("SELECT * FROM entitlement_order_effects WHERE order_id = $1", [
      fixture.orderId,
    ]);
    assert.equal(eRes.rows.length, 0);
  });

  await t.test("26. Full CATALOG Fulfillment and Contiguous Renewal Chaining [Direct Real Transaction]", async () => {
    // 1. Initial CATALOG purchase (Grant A: 7 days)
    const catFixtureA = await createPaidOrderFixture({
      targetKind: "CATALOG",
      targetMovieContentId: null,
      markPaid: true,
      withSettlement: true,
      durationValue: 7,
      durationUnit: "DAY",
    });

    await db.transaction(async (tx) => {
      await fulfillmentService.enqueueFulfillment(tx, catFixtureA.orderId);
    });

    const resA = await fulfillmentService.processFulfillmentForOrder(catFixtureA.orderId);
    assert.equal(resA.status, "COMPLETED");
    assert.equal(resA.fulfillment.status, "COMPLETED");
    assert.ok(resA.grant);
    assert.equal(resA.grant!.predecessorOrderId, null);

    const grantAStart = new Date(resA.grant!.validFrom).getTime();
    const grantAEnd = new Date(resA.grant!.validUntil).getTime();
    // Invariant: 7 days = 7 * 24 * 3600 * 1000 ms
    assert.equal(grantAEnd - grantAStart, 7 * 24 * 3600 * 1000);

    // 2. Renewal purchase (Grant B: 7 days) while Grant A is active
    const catFixtureB = await createPaidOrderFixture({
      targetKind: "CATALOG",
      targetMovieContentId: null,
      markPaid: true,
      withSettlement: true,
      durationValue: 7,
      durationUnit: "DAY",
    });

    await db.transaction(async (tx) => {
      await fulfillmentService.enqueueFulfillment(tx, catFixtureB.orderId);
    });

    const resB = await fulfillmentService.processFulfillmentForOrder(catFixtureB.orderId);
    assert.equal(resB.status, "COMPLETED");
    assert.ok(resB.grant);
    assert.equal(resB.grant!.predecessorOrderId, catFixtureA.orderId);

    const grantBStart = new Date(resB.grant!.validFrom).getTime();
    const grantBEnd = new Date(resB.grant!.validUntil).getTime();
    // Invariant: Grant B starts exactly when Grant A ends
    assert.equal(grantBStart, grantAEnd);
    assert.equal(grantBEnd - grantBStart, 7 * 24 * 3600 * 1000);

    // 3. Second renewal purchase (Grant C: 14 days) while Grant A is active and Grant B is future-scheduled
    const catFixtureC = await createPaidOrderFixture({
      targetKind: "CATALOG",
      targetMovieContentId: null,
      markPaid: true,
      withSettlement: true,
      durationValue: 14,
      durationUnit: "DAY",
    });

    await db.transaction(async (tx) => {
      await fulfillmentService.enqueueFulfillment(tx, catFixtureC.orderId);
    });

    const resC = await fulfillmentService.processFulfillmentForOrder(catFixtureC.orderId);
    assert.equal(resC.status, "COMPLETED");
    assert.ok(resC.grant);
    // Invariant: Grant C attaches after future-scheduled Grant B, NOT Grant A!
    assert.equal(resC.grant!.predecessorOrderId, catFixtureB.orderId);

    const grantCStart = new Date(resC.grant!.validFrom).getTime();
    const grantCEnd = new Date(resC.grant!.validUntil).getTime();
    assert.equal(grantCStart, grantBEnd);
    assert.equal(grantCEnd - grantCStart, 14 * 24 * 3600 * 1000);

    // 4. Anchor Entitlement Expiry Cache reflects total duration (A + B + C = 28 days from start)
    const anchorRes = await pool.query(
      "SELECT * FROM entitlements WHERE customer_id = $1 AND target_kind = 'CATALOG'",
      [customerId],
    );
    assert.equal(anchorRes.rows.length, 1);
    const anchorRow = anchorRes.rows[0];
    assert.equal(new Date(anchorRow.expires_at).getTime(), grantCEnd);
    assert.equal(anchorRow.status, "ACTIVE");

    // 5. Idempotent replay of Order C does not shift start or duplicate records
    const replayC = await fulfillmentService.processFulfillmentForOrder(catFixtureC.orderId);
    assert.equal(replayC.status, "COMPLETED");
    assert.equal(replayC.idempotentReplay, true);
    assert.equal(new Date(replayC.grant!.validFrom).getTime(), grantCStart);
    assert.equal(new Date(replayC.grant!.validUntil).getTime(), grantCEnd);
  });

});
