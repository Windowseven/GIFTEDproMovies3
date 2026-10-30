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
import { CommercialAccessService } from "../src/modules/commercial/commercial-access.service.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

async function makeSessionCookie(pool: pg.Pool, userId: string): Promise<string> {
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_active_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', NOW(), NOW())`,
    [randomUUID(), userId, hash],
  );
  return `gifted_session=${rawToken}`;
}

test("Commercial Access Evaluation & Entitlement Library Runtime Suite (Task #7)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const adminId = randomUUID();
  const customerAId = randomUUID();
  const customerBId = randomUUID();
  const suspendedCustomerId = randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
     VALUES ($1, $2, $3, 'admin', 'active', NOW()),
            ($4, $5, $6, 'customer', 'active', NOW()),
            ($7, $8, $9, 'customer', 'active', NOW()),
            ($10, $11, $12, 'customer', 'suspended', NOW())
     ON CONFLICT DO NOTHING`,
    [
      adminId,
      `admin-access-${adminId.slice(0, 8)}@giftedpro.test`,
      "hash",
      customerAId,
      `cust-a-${customerAId.slice(0, 8)}@giftedpro.test`,
      "hash",
      customerBId,
      `cust-b-${customerBId.slice(0, 8)}@giftedpro.test`,
      "hash",
      suspendedCustomerId,
      `cust-susp-${suspendedCustomerId.slice(0, 8)}@giftedpro.test`,
      "hash",
    ],
  );

  // Content fixtures: Movie 1, Movie 2, Series 1 (Season 1 with Ep 1, Season 2 with Ep 2)
  const movie1Id = randomUUID();
  const movie2Id = randomUUID();
  const seriesId = randomUUID();
  const season1Id = randomUUID();
  const season2Id = randomUUID();
  const episode1Id = randomUUID();
  const episode2Id = randomUUID();

  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, description, poster_url, backdrop_url, trailer_url, status, created_by)
     VALUES ($1, $2, 'movie', 'Access Movie 1', $3, 'desc', 'https://example.test/p1.jpg', 'https://example.test/b1.jpg', 'https://example.test/t1.mp4', 'published', $4),
            ($5, $6, 'movie', 'Access Movie 2 (Unpublished)', $7, 'desc', 'https://example.test/p2.jpg', 'https://example.test/b2.jpg', 'https://example.test/t2.mp4', 'archived', $8),
            ($9, $10, 'series', 'Access Series 1', $11, 'desc', 'https://example.test/p3.jpg', 'https://example.test/b3.jpg', 'https://example.test/t3.mp4', 'published', $12)
     ON CONFLICT DO NOTHING`,
    [
      movie1Id,
      `m1-${movie1Id.slice(0, 8)}`,
      `m1-${movie1Id.slice(0, 8)}`,
      adminId,
      movie2Id,
      `m2-${movie2Id.slice(0, 8)}`,
      `m2-${movie2Id.slice(0, 8)}`,
      adminId,
      seriesId,
      `s1-${seriesId.slice(0, 8)}`,
      `s1-${seriesId.slice(0, 8)}`,
      adminId,
    ],
  );

  await pool.query(
    `INSERT INTO seasons (id, series_id, season_number, title, is_active)
     VALUES ($1, $2, 1, 'Season One', true),
            ($3, $2, 2, 'Season Two', true)
     ON CONFLICT DO NOTHING`,
    [season1Id, seriesId, season2Id],
  );

  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, status, is_available)
     VALUES ($1, $2, 1, 'S1 Episode 1', 'published', true),
            ($3, $4, 1, 'S2 Episode 1', 'published', true)
     ON CONFLICT DO NOTHING`,
    [episode1Id, season1Id, episode2Id, season2Id],
  );

  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;
  let accessService: CommercialAccessService;

  try {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ disableRequestLogging: true }),
    );

    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(fastifyCookie);
    configureHttpApplication(app);
    app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
    await app.init();

    accessService = moduleFixture.get(CommercialAccessService);
  } catch (error) {
    console.error("Failed to initialize test app", error);
    throw error;
  }

  const customerACookie = await makeSessionCookie(pool, customerAId);
  const customerBCookie = await makeSessionCookie(pool, customerBId);

  async function injectRequest(options: {
    method: "GET" | "POST";
    url: string;
    cookie?: string;
  }) {
    const headers: Record<string, string> = {};
    if (options.cookie) {
      headers.cookie = options.cookie;
    }

    const response = await app.inject({
      method: options.method,
      url: options.url,
      headers,
    });

    try {
      const body = JSON.parse(response.body);
      return { statusCode: response.statusCode, body };
    } catch {
      return { statusCode: response.statusCode, body: response.body };
    }
  }

  t.after(async () => {
    if (app) {
      await app.close();
    } else {
      await pool.end();
    }
    await moduleFixture?.close();
  });

  await t.test("1. Direct exact-target access evaluation (MOVIE)", async () => {
    // Customer A has active entitlement for Movie 1
    const entId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', NOW(), NOW())`,
      [entId, customerAId, movie1Id],
    );

    const decisionA = await accessService.canAccess(customerAId, { contentId: movie1Id });
    assert.equal(decisionA.granted, true);
    assert.equal(decisionA.grantType, "EXACT_ENTITLEMENT");
    assert.equal(decisionA.targetKind, "MOVIE");
    assert.equal(decisionA.entitlementId, entId);

    // Customer B has no entitlement for Movie 1
    const decisionB = await accessService.canAccess(customerBId, { contentId: movie1Id });
    assert.equal(decisionB.granted, false);
    assert.equal(decisionB.reason, "NO_ACTIVE_ENTITLEMENT");

    // Suspended customer fails closed
    const decisionSuspended = await accessService.canAccess(suspendedCustomerId, { contentId: movie1Id });
    assert.equal(decisionSuspended.granted, false);
    assert.equal(decisionSuspended.reason, "CUSTOMER_NOT_ACTIVE");
  });

  await t.test("2. Expired entitlement does not grant access", async () => {
    const expiredEntId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', NOW(), NOW())`,
      [expiredEntId, customerBId, movie1Id],
    );

    const decision = await accessService.canAccess(customerBId, { contentId: movie1Id });
    assert.equal(decision.granted, false);
    assert.equal(decision.reason, "NO_ACTIVE_ENTITLEMENT");
  });

  await t.test("3. Revoked entitlement does not grant access", async () => {
    const custRevokedId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [custRevokedId, `cust-rev-ent-${custRevokedId.slice(0, 8)}@giftedpro.test`],
    );

    const revokedEntId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, created_at, updated_at, revocation_reason, revoked_at)
       VALUES ($1, $2, 'MOVIE', $3, 'REVOKED', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', NOW(), NOW(), 'ADMIN_REVOCATION', NOW())`,
      [revokedEntId, custRevokedId, movie1Id],
    );

    const decision = await accessService.canAccess(custRevokedId, { contentId: movie1Id });
    assert.equal(decision.granted, false);
    assert.equal(decision.reason, "NO_ACTIVE_ENTITLEMENT");
  });

  await t.test("4. Scope-aware series hierarchy inheritance (D4)", async () => {
    // Customer A purchases full SERIES entitlement
    const seriesEntId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_series_content_id, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'SERIES', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '14 days', NOW(), NOW())`,
      [seriesEntId, customerAId, seriesId],
    );

    // Can access series directly
    const seriesDec = await accessService.canAccess(customerAId, { contentId: seriesId });
    assert.equal(seriesDec.granted, true);
    assert.equal(seriesDec.targetKind, "SERIES");

    // Can access Season 1 and Season 2 via series inheritance
    const s1Dec = await accessService.canAccess(customerAId, { seasonId: season1Id });
    assert.equal(s1Dec.granted, true);
    assert.equal(s1Dec.targetKind, "SERIES");

    const s2Dec = await accessService.canAccess(customerAId, { seasonId: season2Id });
    assert.equal(s2Dec.granted, true);
    assert.equal(s2Dec.targetKind, "SERIES");

    // Can access Episode 1 and Episode 2 via series inheritance
    const ep1Dec = await accessService.canAccess(customerAId, { episodeId: episode1Id });
    assert.equal(ep1Dec.granted, true);
    assert.equal(ep1Dec.targetKind, "SERIES");

    const ep2Dec = await accessService.canAccess(customerAId, { episodeId: episode2Id });
    assert.equal(ep2Dec.granted, true);
    assert.equal(ep2Dec.targetKind, "SERIES");

    // Customer B only purchases Season 1 (D4: Season 1 purchase must NOT unlock Season 2)
    const seasonEntId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_season_id, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'SEASON', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', NOW(), NOW())`,
      [seasonEntId, customerBId, season1Id],
    );

    const custBS1 = await accessService.canAccess(customerBId, { seasonId: season1Id });
    assert.equal(custBS1.granted, true);
    assert.equal(custBS1.targetKind, "SEASON");

    const custBEp1 = await accessService.canAccess(customerBId, { episodeId: episode1Id });
    assert.equal(custBEp1.granted, true);
    assert.equal(custBEp1.targetKind, "SEASON");

    // Season 2 and Episode 2 MUST FAIL for Customer B
    const custBS2 = await accessService.canAccess(customerBId, { seasonId: season2Id });
    assert.equal(custBS2.granted, false);

    const custBEp2 = await accessService.canAccess(customerBId, { episodeId: episode2Id });
    assert.equal(custBEp2.granted, false);
  });

  await t.test("5. Multi-tier catalog grant evaluation (ALL_CATALOG & CONTENT_SET)", async () => {
    const custCatId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [custCatId, `cat-user-${custCatId.slice(0, 8)}@giftedpro.test`],
    );

    // Create anchor entitlement
    const anchorId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'CATALOG', 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days', NOW(), NOW())`,
      [anchorId, custCatId],
    );

    const planVerId = randomUUID();
    const planId = randomUUID();
    const planCode = "PL_ACC_" + randomUUID().slice(0, 8);
    const offerCode = "OFF_ACC_" + randomUUID().slice(0, 8);
    await pool.query(`INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Plan')`, [planId, planCode]);
    await pool.query(
      `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit)
       VALUES ($1, $2, 1, 30, 'DAY')`,
      [planVerId, planId],
    );

    const offerId = randomUUID();
    await pool.query(
      `INSERT INTO offers (id, code, name, target_kind, catalog_policy_type, plan_version_id, price_tzs, status, starts_at)
       VALUES ($1, $2, 'Offer', 'CATALOG', 'ALL_CATALOG', $3, 10000, 'active', NOW())`,
      [offerId, offerCode, planVerId],
    );

    const snapId = randomUUID();
    const orderId = randomUUID();
    const grantValidFrom = new Date(Date.now() - 3600 * 1000);
    const grantValidUntil = new Date(Date.now() + 30 * 86400 * 1000);
    const grantId = randomUUID();

    const client5 = await pool.connect();
    try {
      await client5.query("BEGIN");
      await client5.query(
        `INSERT INTO commercial_policy_snapshots (id, policy_type, created_at)
         VALUES ($1, 'ALL_CATALOG', NOW())`,
        [snapId],
      );
      await client5.query(
        `INSERT INTO orders (id, customer_id, offer_id, plan_version_id, target_kind, catalog_policy_snapshot_id, duration_value, duration_unit, amount_tzs, status, idempotency_key)
         VALUES ($1, $2, $3, $4, 'CATALOG', $5, 30, 'DAY', 10000, 'PAID', $6)`,
        [orderId, custCatId, offerId, planVerId, snapId, "idemp-cat-" + orderId],
      );
      await client5.query(
        `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after)
         VALUES ($1, $2, $3, 'CREATED', NOW(), $4)`,
        [randomUUID(), orderId, anchorId, grantValidUntil],
      );
      await client5.query(
        `INSERT INTO catalog_grants (id, order_id, entitlement_id, valid_from, valid_until, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [grantId, orderId, anchorId, grantValidFrom, grantValidUntil],
      );
      await client5.query("COMMIT");
    } finally {
      client5.release();
    }

    // Customer can access Movie 1 and Series 1 via ALL_CATALOG grant
    const movDec = await accessService.canAccess(custCatId, { contentId: movie1Id });
    assert.equal(movDec.granted, true);
    assert.equal(movDec.grantType, "CATALOG_GRANT");
    assert.equal(movDec.policyType, "ALL_CATALOG");

    const epDec = await accessService.canAccess(custCatId, { episodeId: episode1Id });
    assert.equal(epDec.granted, true);
    assert.equal(epDec.grantType, "CATALOG_GRANT");
  });

  await t.test("6. Future-scheduled grant does not grant access before valid_from", async () => {
    const custFutureId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [custFutureId, `cat-fut-${custFutureId.slice(0, 8)}@giftedpro.test`],
    );

    const anchorId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'CATALOG', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())`,
      [anchorId, custFutureId],
    );

    const snapId = randomUUID();
    const [plan] = (await pool.query(`SELECT id FROM plan_versions LIMIT 1`)).rows;
    const [off] = (await pool.query(`SELECT id FROM offers WHERE target_kind = 'CATALOG' LIMIT 1`)).rows;

    const orderId = randomUUID();
    const futValidFrom = new Date(Date.now() + 7 * 86400 * 1000);
    const futValidUntil = new Date(Date.now() + 21 * 86400 * 1000);
    const grantId = randomUUID();

    const client6 = await pool.connect();
    try {
      await client6.query("BEGIN");
      await client6.query(
        `INSERT INTO commercial_policy_snapshots (id, policy_type, created_at)
         VALUES ($1, 'ALL_CATALOG', NOW())`,
        [snapId],
      );
      await client6.query(
        `INSERT INTO orders (id, customer_id, offer_id, plan_version_id, target_kind, catalog_policy_snapshot_id, duration_value, duration_unit, amount_tzs, status, idempotency_key)
         VALUES ($1, $2, $3, $4, 'CATALOG', $5, 14, 'DAY', 10000, 'PAID', $6)`,
        [orderId, custFutureId, off.id, plan.id, snapId, "idemp-fut-" + orderId],
      );
      await client6.query(
        `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after)
         VALUES ($1, $2, $3, 'EXTENDED', NOW(), $4)`,
        [randomUUID(), orderId, anchorId, futValidUntil],
      );
      await client6.query(
        `INSERT INTO catalog_grants (id, order_id, entitlement_id, valid_from, valid_until, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [grantId, orderId, anchorId, futValidFrom, futValidUntil],
      );
      await client6.query("COMMIT");
    } finally {
      client6.release();
    }

    const decision = await accessService.canAccess(custFutureId, { contentId: movie1Id });
    assert.equal(decision.granted, false);
    assert.equal(decision.reason, "NO_ACTIVE_ENTITLEMENT");
  });

  await t.test("7. Revocation of catalog grant blocks access", async () => {
    const custRevId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [custRevId, `cat-rev-${custRevId.slice(0, 8)}@giftedpro.test`],
    );

    const anchorId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'CATALOG', 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '14 days', NOW(), NOW())`,
      [anchorId, custRevId],
    );

    const snapId = randomUUID();
    const [plan] = (await pool.query(`SELECT id FROM plan_versions LIMIT 1`)).rows;
    const [off] = (await pool.query(`SELECT id FROM offers WHERE target_kind = 'CATALOG' LIMIT 1`)).rows;

    const orderId = randomUUID();
    const revValidFrom = new Date(Date.now() - 3600 * 1000);
    const revValidUntil = new Date(Date.now() + 14 * 86400 * 1000);
    const grantId = randomUUID();

    const client7 = await pool.connect();
    try {
      await client7.query("BEGIN");
      await client7.query(
        `INSERT INTO commercial_policy_snapshots (id, policy_type, created_at)
         VALUES ($1, 'ALL_CATALOG', NOW())`,
        [snapId],
      );
      await client7.query(
        `INSERT INTO orders (id, customer_id, offer_id, plan_version_id, target_kind, catalog_policy_snapshot_id, duration_value, duration_unit, amount_tzs, status, idempotency_key)
         VALUES ($1, $2, $3, $4, 'CATALOG', $5, 14, 'DAY', 10000, 'PAID', $6)`,
        [orderId, custRevId, off.id, plan.id, snapId, "idemp-rev-" + orderId],
      );
      await client7.query(
        `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after)
         VALUES ($1, $2, $3, 'CREATED', NOW(), $4)`,
        [randomUUID(), orderId, anchorId, revValidUntil],
      );
      await client7.query(
        `INSERT INTO catalog_grants (id, order_id, entitlement_id, valid_from, valid_until, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [grantId, orderId, anchorId, revValidFrom, revValidUntil],
      );
      await client7.query("COMMIT");
    } finally {
      client7.release();
    }

    // Verify granted before revocation
    const decBefore = await accessService.canAccess(custRevId, { contentId: movie1Id });
    assert.equal(decBefore.granted, true);

    // Revoke the grant
    await pool.query(
      `INSERT INTO catalog_grant_revocations (id, order_id, revoked_at, revocation_reason, revoked_by)
       VALUES ($1, $2, NOW(), 'CHARGEBACK_SUSPICION', $3)`,
      [randomUUID(), orderId, adminId],
    );

    // Access must immediately fail
    const decAfter = await accessService.canAccess(custRevId, { contentId: movie1Id });
    assert.equal(decAfter.granted, false);
    assert.equal(decAfter.reason, "NO_ACTIVE_ENTITLEMENT");
  });

  await t.test("8. Archived / Unpublished content does not revoke valid customer access", async () => {
    // Customer A has active entitlement for Movie 2 (status = 'archived')
    const entId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at, created_at, updated_at)
       VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', NOW(), NOW())`,
      [entId, customerAId, movie2Id],
    );

    const decision = await accessService.canAccess(customerAId, { contentId: movie2Id });
    if (!decision.granted) {
      console.error("DEBUG TEST 8 DECISION:", JSON.stringify(decision));
    }
    assert.equal(decision.granted, true);
    assert.equal(decision.grantType, "EXACT_ENTITLEMENT");
  });

  await t.test("9. HTTP GET /commercial/me/library returns authenticated customer library (Anti-IDOR)", async () => {
    const resA = await injectRequest({
      method: "GET",
      url: "/api/v1/commercial/me/library",
      cookie: customerACookie,
    });

    assert.equal(resA.statusCode, 200);
    assert.equal(resA.body.data.customerId, customerAId);
    assert.ok(Array.isArray(resA.body.data.exactEntitlements));
    assert.ok(resA.body.data.exactEntitlements.length >= 2); // Movie 1, Series 1, Movie 2

    const resB = await injectRequest({
      method: "GET",
      url: "/api/v1/commercial/me/library",
      cookie: customerBCookie,
    });

    assert.equal(resB.statusCode, 200);
    assert.equal(resB.body.data.customerId, customerBId);

    // Zero cross-customer entitlement leakage
    const idsA = new Set(resA.body.data.exactEntitlements.map((e: any) => e.id));
    for (const entB of resB.body.data.exactEntitlements) {
      assert.equal(idsA.has(entB.id), false);
    }
  });

  await t.test("10. HTTP GET /commercial/me/access/:contentId enforces authentication", async () => {
    // Authenticated access check for Customer A on Movie 1
    const res = await injectRequest({
      method: "GET",
      url: `/api/v1/commercial/me/access/${movie1Id}`,
      cookie: customerACookie,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.granted, true);

    // Unauthenticated request rejected with 401
    const unauthRes = await injectRequest({
      method: "GET",
      url: `/api/v1/commercial/me/access/${movie1Id}`,
    });

    assert.equal(unauthRes.statusCode, 401);
  });
});
