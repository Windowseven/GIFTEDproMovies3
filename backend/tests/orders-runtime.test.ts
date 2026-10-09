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
import { generateSecureToken, hashToken } from "../src/modules/identity/utils/token.utils.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

async function makeSessionCookie(pool: pg.Pool, userId: string): Promise<string> {
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_active_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', NOW(), NOW())",
    [randomUUID(), userId, hash],
  );
  return "gifted_session=" + rawToken;
}

test("Orders runtime verification suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const adminId = randomUUID();
  const customerId = randomUUID();
  const otherCustomerId = randomUUID();
  const unverifiedCustomerId = randomUUID();
  const suspendedCustomerId = randomUUID();
  const mediaTeamId = randomUUID();

  await pool.query(
    "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES " +
    "($1, $2, $3, 'admin', 'active', NOW()), " +
    "($4, $5, $6, 'customer', 'active', NOW()), " +
    "($7, $8, $9, 'customer', 'active', NOW()), " +
    "($10, $11, $12, 'customer', 'pending_verification', NULL), " +
    "($13, $14, $15, 'customer', 'suspended', NOW()), " +
    "($16, $17, $18, 'media_team', 'active', NOW()) " +
    "ON CONFLICT DO NOTHING",
    [
      adminId, "admin-ord-" + adminId.slice(0, 8) + "@giftedpro.test", "hash",
      customerId, "customer-ord-" + customerId.slice(0, 8) + "@giftedpro.test", "hash",
      otherCustomerId, "other-ord-" + otherCustomerId.slice(0, 8) + "@giftedpro.test", "hash",
      unverifiedCustomerId, "unverified-ord-" + unverifiedCustomerId.slice(0, 8) + "@giftedpro.test", "hash",
      suspendedCustomerId, "suspended-ord-" + suspendedCustomerId.slice(0, 8) + "@giftedpro.test", "hash",
      mediaTeamId, "media-ord-" + mediaTeamId.slice(0, 8) + "@giftedpro.test", "hash",
    ],
  );

  const categoryId = randomUUID();
  const secondCategoryId = randomUUID();
  const movieId = randomUUID();
  const seriesId = randomUUID();
  const seasonId = randomUUID();
  const episodeId = randomUUID();

  await pool.query(
    "INSERT INTO categories (id, name, slug, is_active, display_order) VALUES ($1, $2, $3, true, 1), ($4, $5, $6, true, 2) ON CONFLICT DO NOTHING",
    [categoryId, "Order Cat " + randomUUID().slice(0, 6), "ord-cat-" + randomUUID().slice(0, 8), secondCategoryId, "Order Cat 2 " + randomUUID().slice(0, 6), "ord-cat-2-" + randomUUID().slice(0, 8)],
  );

  await pool.query(
    "INSERT INTO content (id, code_id, content_type, title, slug, description, poster_url, backdrop_url, trailer_url, status, created_by) VALUES " +
    "($1, $2, 'movie', $3, $4, 'movie desc', 'https://example.test/poster.jpg', 'https://example.test/backdrop.jpg', 'https://example.test/trailer.mp4', 'published', $5), " +
    "($6, $7, 'series', $8, $9, 'series desc', 'https://example.test/series-poster.jpg', 'https://example.test/series-backdrop.jpg', 'https://example.test/series-trailer.mp4', 'published', $10) " +
    "ON CONFLICT DO NOTHING",
    [
      movieId, "mov-" + randomUUID().slice(0, 8), "Order Movie " + randomUUID().slice(0, 6), "ord-mov-" + randomUUID().slice(0, 8), adminId,
      seriesId, "ser-" + randomUUID().slice(0, 8), "Order Series " + randomUUID().slice(0, 6), "ord-ser-" + randomUUID().slice(0, 8), adminId,
    ],
  );

  await pool.query(
    "INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [movieId, categoryId],
  );

  await pool.query(
    "INSERT INTO seasons (id, series_id, season_number, title, is_active) VALUES ($1, $2, 1, 'Season One', true) ON CONFLICT DO NOTHING",
    [seasonId, seriesId],
  );

  await pool.query(
    "INSERT INTO episodes (id, season_id, episode_number, title, duration_minutes, status, is_available) VALUES ($1, $2, 1, 'Episode One', 45, 'published', true) ON CONFLICT DO NOTHING",
    [episodeId, seasonId],
  );


  const planId = randomUUID();
  const planVersionId = randomUUID();

  await pool.query(
    "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Standard Plan') ON CONFLICT DO NOTHING",
    [planId, "PLAN_" + randomUUID().slice(0, 6).toUpperCase()],
  );

  await pool.query(
    "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 5, 2, 2) ON CONFLICT DO NOTHING",
    [planVersionId, planId],
  );

  const movieOfferId = randomUUID();
  const draftOfferId = randomUUID();
  const expiredOfferId = randomUUID();
  const futureOfferId = randomUUID();
  const allCatalogOfferId = randomUUID();
  const categorySetOfferId = randomUUID();
  const contentSetOfferId = randomUUID();

  await pool.query(
    "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs) VALUES " +
    "($1, $2, 'Movie Offer Active', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'MOVIE', $3, $4, 2500), " +
    "($5, $6, 'Movie Offer Draft', 'draft', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'MOVIE', $3, $4, 2500), " +
    "($7, $8, 'Movie Offer Expired', 'active', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', 'MOVIE', $3, $4, 2500), " +
    "($9, $10, 'Movie Offer Future', 'active', NOW() + INTERVAL '1 day', NOW() + INTERVAL '10 days', 'MOVIE', $3, $4, 2500) " +
    "ON CONFLICT DO NOTHING",
    [
      movieOfferId, "OFFER_MOV_" + randomUUID().slice(0, 6).toUpperCase(), movieId, planVersionId,
      draftOfferId, "OFFER_DFT_" + randomUUID().slice(0, 6).toUpperCase(),
      expiredOfferId, "OFFER_EXP_" + randomUUID().slice(0, 6).toUpperCase(),
      futureOfferId, "OFFER_FUT_" + randomUUID().slice(0, 6).toUpperCase(),
    ],
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, catalog_policy_type, plan_version_id, price_tzs) VALUES " +
      "($1, $2, 'All Catalog Active', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'ALL_CATALOG', $3, 10000), " +
      "($4, $5, 'Category Set Active', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'CATEGORY_SET', $3, 5000), " +
      "($6, $7, 'Content Set Active', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'CONTENT_SET', $3, 7000)",
      [
        allCatalogOfferId, "OFFER_ALL_" + randomUUID().slice(0, 6).toUpperCase(), planVersionId,
        categorySetOfferId, "OFFER_CAT_" + randomUUID().slice(0, 6).toUpperCase(),
        contentSetOfferId, "OFFER_CNT_" + randomUUID().slice(0, 6).toUpperCase(),
      ],
    );
    await client.query(
      "INSERT INTO offer_catalog_policy_category_members (offer_id, category_id) VALUES ($1, $2)",
      [categorySetOfferId, categoryId],
    );
    await client.query(
      "INSERT INTO offer_catalog_policy_content_members (offer_id, content_id) VALUES ($1, $2)",
      [contentSetOfferId, movieId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }


  const customerCookie = await makeSessionCookie(pool, customerId);
  const otherCustomerCookie = await makeSessionCookie(pool, otherCustomerId);
  const unverifiedCookie = await makeSessionCookie(pool, unverifiedCustomerId);
  const suspendedCookie = await makeSessionCookie(pool, suspendedCustomerId);
  const mediaTeamCookie = await makeSessionCookie(pool, mediaTeamId);

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


  t.after(async () => {
    await app.close();
    await pool.end();
  });

  await t.test("1. Authentication and authorization guard enforcement", async () => {
    const guestRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: { offerId: movieOfferId, idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(guestRes.statusCode, 401);

    const nonCustomerRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: mediaTeamCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(nonCustomerRes.statusCode, 403);

    const unverifiedRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: unverifiedCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(unverifiedRes.statusCode, 403);

    const suspendedRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: suspendedCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(suspendedRes.statusCode, 403);
  });

  await t.test("2. Strict input validation and mass assignment rejection", async () => {
    const badOfferRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: "not-a-uuid", idempotencyKey: "valid-key-1" },
    });
    assert.equal(badOfferRes.statusCode, 400);

    const badKeyRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "bad key with spaces!" },
    });
    assert.equal(badKeyRes.statusCode, 400);

    const emptyKeyRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "" },
    });
    assert.equal(emptyKeyRes.statusCode, 400);

    const massCustomerRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "key-mass-1", customerId: otherCustomerId },
    });
    assert.equal(massCustomerRes.statusCode, 400);

    const massPriceRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "key-mass-2", priceTzs: 1 },
    });
    assert.equal(massPriceRes.statusCode, 400);

    const massStatusRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: "key-mass-3", status: "PAID" },
    });
    assert.equal(massStatusRes.statusCode, 400);
  });

  await t.test("3. Offer purchasability rules enforcement", async () => {
    const notFoundRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: randomUUID(), idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(notFoundRes.statusCode, 404);

    const draftRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: draftOfferId, idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(draftRes.statusCode, 422);

    const expiredRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: expiredOfferId, idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(expiredRes.statusCode, 422);

    const futureRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: futureOfferId, idempotencyKey: "k-" + randomUUID() },
    });
    assert.equal(futureRes.statusCode, 422);
  });

  await t.test("4. Server-authoritative order terms copying for active non-catalog offer", async () => {
    const key = "movie-order-" + randomUUID();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: key },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.success, true);
    const order = body.data;

    assert.equal(order.customerId, customerId);
    assert.equal(order.offerId, movieOfferId);
    assert.equal(order.status, "PENDING_PAYMENT");
    assert.equal(order.targetKind, "MOVIE");
    assert.equal(order.targetMovieContentId, movieId);
    assert.equal(order.targetSeriesContentId, null);
    assert.equal(order.planVersionId, planVersionId);
    assert.equal(order.amountTzs, 2500);
    assert.equal(order.durationValue, 30);
    assert.equal(order.durationUnit, "DAY");
    assert.equal(order.catalogPolicySnapshotId, null);
    assert.equal(order.idempotencyKey, key);

    const dbOrder = await pool.query("SELECT * FROM orders WHERE id = $1", [order.id]);
    assert.equal(dbOrder.rowCount, 1);
    assert.equal(dbOrder.rows[0].status, "PENDING_PAYMENT");
    assert.equal(dbOrder.rows[0].amount_tzs, 2500);

    const auditRow = await pool.query(
      "SELECT * FROM audit_events WHERE resource_type = 'order' AND resource_id = $1",
      [order.id],
    );
    assert.equal(auditRow.rowCount, 1);
    assert.equal(auditRow.rows[0].action, "ORDER_CREATE");
    assert.equal(auditRow.rows[0].actor_id, customerId);
  });

  await t.test("5. CATALOG historical snapshots for ALL_CATALOG, CATEGORY_SET, and CONTENT_SET", async () => {
    const allKey = "all-cat-order-" + randomUUID();
    const allRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: allCatalogOfferId, idempotencyKey: allKey },
    });
    assert.equal(allRes.statusCode, 201);
    const allOrder = allRes.json().data;
    assert.ok(allOrder.catalogPolicySnapshotId);

    const allSnap = await pool.query("SELECT * FROM commercial_policy_snapshots WHERE id = $1", [allOrder.catalogPolicySnapshotId]);
    assert.equal(allSnap.rowCount, 1);
    assert.equal(allSnap.rows[0].policy_type, "ALL_CATALOG");

    const allCatCount = await pool.query("SELECT COUNT(*) FROM commercial_policy_snapshot_categories WHERE snapshot_id = $1", [allOrder.catalogPolicySnapshotId]);
    assert.equal(parseInt(allCatCount.rows[0].count, 10), 0);

    const allCntCount = await pool.query("SELECT COUNT(*) FROM commercial_policy_snapshot_contents WHERE snapshot_id = $1", [allOrder.catalogPolicySnapshotId]);
    assert.equal(parseInt(allCntCount.rows[0].count, 10), 0);

    const catKey = "cat-set-order-" + randomUUID();
    const catRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: categorySetOfferId, idempotencyKey: catKey },
    });
    assert.equal(catRes.statusCode, 201);
    const catOrder = catRes.json().data;
    assert.ok(catOrder.catalogPolicySnapshotId);

    const catSnapCategories = await pool.query("SELECT * FROM commercial_policy_snapshot_categories WHERE snapshot_id = $1", [catOrder.catalogPolicySnapshotId]);
    assert.equal(catSnapCategories.rowCount, 1);
    assert.equal(catSnapCategories.rows[0].category_id, categoryId);

    const catSnapContents = await pool.query("SELECT * FROM commercial_policy_snapshot_contents WHERE snapshot_id = $1", [catOrder.catalogPolicySnapshotId]);
    assert.equal(catSnapContents.rowCount, 1);
    assert.equal(catSnapContents.rows[0].content_id, movieId);

    const cntKey = "cnt-set-order-" + randomUUID();
    const cntRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: contentSetOfferId, idempotencyKey: cntKey },
    });
    assert.equal(cntRes.statusCode, 201);
    const cntOrder = cntRes.json().data;
    assert.ok(cntOrder.catalogPolicySnapshotId);

    const cntSnapContents = await pool.query("SELECT * FROM commercial_policy_snapshot_contents WHERE snapshot_id = $1", [cntOrder.catalogPolicySnapshotId]);
    assert.equal(cntSnapContents.rowCount, 1);
    assert.equal(cntSnapContents.rows[0].content_id, movieId);

    const cntSnapCategories = await pool.query("SELECT COUNT(*) FROM commercial_policy_snapshot_categories WHERE snapshot_id = $1", [cntOrder.catalogPolicySnapshotId]);
    assert.equal(parseInt(cntSnapCategories.rows[0].count, 10), 0);
  });

  await t.test("6. Idempotency replay and conflict detection", async () => {
    const key = "idemp-" + randomUUID();

    const res1 = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: key },
    });
    assert.equal(res1.statusCode, 201);
    const order1 = res1.json().data;

    const res2 = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: key },
    });
    assert.equal(res2.statusCode, 201);
    const order2 = res2.json().data;
    assert.equal(order1.id, order2.id);

    const auditCount = await pool.query(
      "SELECT COUNT(*) FROM audit_events WHERE resource_type = 'order' AND resource_id = $1",
      [order1.id],
    );
    assert.equal(parseInt(auditCount.rows[0].count, 10), 1);

    const resConflict = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: allCatalogOfferId, idempotencyKey: key },
    });
    assert.equal(resConflict.statusCode, 409);
    assert.equal(resConflict.json().error.code, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");

    const resOther = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: otherCustomerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: key },
    });
    assert.equal(resOther.statusCode, 201);
    const otherOrder = resOther.json().data;
    assert.notEqual(otherOrder.id, order1.id);
    assert.equal(otherOrder.customerId, otherCustomerId);
  });

  await t.test("7. High-concurrency race condition idempotency safety", async () => {
    const raceKey = "race-" + randomUUID();
    const concurrency = 10;

    const promises = Array.from({ length: concurrency }).map(() =>
      app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { cookie: customerCookie },
        payload: { offerId: movieOfferId, idempotencyKey: raceKey },
      }),
    );

    const results = await Promise.all(promises);

    for (const res of results) {
      assert.equal(res.statusCode, 201);
    }

    const orderIds = results.map((r) => r.json().data.id);
    const uniqueIds = new Set(orderIds);
    assert.equal(uniqueIds.size, 1, "All concurrent requests must converge on the exact same Order ID");

    const dbCount = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE customer_id = $1 AND idempotency_key = $2",
      [customerId, raceKey],
    );
    assert.equal(parseInt(dbCount.rows[0].count, 10), 1);
  });

  await t.test("8. Database trigger phase4_guard_order_purchase_terms protection", async () => {
    const key = "mut-order-" + randomUUID();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: key },
    });
    const orderId = res.json().data.id;

    await assert.rejects(
      pool.query("UPDATE orders SET amount_tzs = 100 WHERE id = $1", [orderId]),
      /Order purchased terms are immutable/,
    );

    await assert.rejects(
      pool.query("UPDATE orders SET plan_version_id = $1 WHERE id = $2", [randomUUID(), orderId]),
      /Order purchased terms are immutable/,
    );

    await assert.rejects(
      pool.query("UPDATE orders SET customer_id = $1 WHERE id = $2", [randomUUID(), orderId]),
      /Order purchased terms are immutable/,
    );
  });

  await t.test("9. Deferred snapshot triggers reject orphan and invalid cardinality snapshots", async () => {
    await assert.rejects(
      (async () => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            "INSERT INTO commercial_policy_snapshots (id, policy_type) VALUES ($1, 'ALL_CATALOG')",
            [randomUUID()],
          );
          await client.query("COMMIT");
        } finally {
          client.release();
        }
      })(),
      /Snapshot .* must be referenced by exactly one order/,
    );
  });

  await t.test("10. Customer GET order retrieval and IDOR protection", async () => {
    const key = "idor-order-" + randomUUID();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId: movieOfferId, idempotencyKey: key },
    });
    const orderId = createRes.json().data.id;

    const getOwnRes = await app.inject({
      method: "GET",
      url: "/api/v1/orders/" + orderId,
      headers: { cookie: customerCookie },
    });
    assert.equal(getOwnRes.statusCode, 200);
    assert.equal(getOwnRes.json().data.id, orderId);

    const getIdorRes = await app.inject({
      method: "GET",
      url: "/api/v1/orders/" + orderId,
      headers: { cookie: otherCustomerCookie },
    });
    assert.equal(getIdorRes.statusCode, 404);
    assert.equal(getIdorRes.json().error.code, "ORDER_NOT_FOUND");

    const getBadUuidRes = await app.inject({
      method: "GET",
      url: "/api/v1/orders/invalid-uuid",
      headers: { cookie: customerCookie },
    });
    assert.equal(getBadUuidRes.statusCode, 400);
  });
});
