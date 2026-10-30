import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { LogController } from "fastify";
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

test("Customer order history integration suite (GPM-AUDIT-015)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

  const adminId = randomUUID();
  const customerAId = randomUUID();
  const customerBId = randomUUID();
  const mediaTeamId = randomUUID();

  // Create users
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES
     ($1, $2, 'hash', 'admin', 'active', NOW()),
     ($3, $4, 'hash', 'customer', 'active', NOW()),
     ($5, $6, 'hash', 'customer', 'active', NOW()),
     ($7, $8, 'hash', 'media_team', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      adminId, `admin-${adminId.slice(0, 8)}@giftedpro.test`,
      customerAId, `customer-a-${customerAId.slice(0, 8)}@giftedpro.test`,
      customerBId, `customer-b-${customerBId.slice(0, 8)}@giftedpro.test`,
      mediaTeamId, `media-${mediaTeamId.slice(0, 8)}@giftedpro.test`,
    ],
  );

  const movieId = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by)
     VALUES ($1, $2, 'movie', 'Test Movie', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [movieId, `mov-${movieId.slice(0, 8)}`, `test-mov-${movieId.slice(0, 8)}`, adminId],
  );

  // Setup plan and offers
  const planId = randomUUID();
  const planVersionId = randomUUID();
  await pool.query(
    "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Test Plan') ON CONFLICT DO NOTHING",
    [planId, `PLAN_${planId.slice(0, 6).toUpperCase()}`],
  );
  await pool.query(
    "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 5, 2, 2) ON CONFLICT DO NOTHING",
    [planVersionId, planId],
  );

  const offerId = randomUUID();
  await pool.query(
    `INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs)
     VALUES ($1, $2, 'Movie Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'MOVIE', $3, $4, 5000)
     ON CONFLICT DO NOTHING`,
    [offerId, `OFFER_${offerId.slice(0, 6).toUpperCase()}`, movieId, planVersionId],
  );

  // Seed Customer A orders: 5 orders with staggered created_at
  const customerAOrderIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const oId = randomUUID();
    customerAOrderIds.push(oId);
    const status = i % 2 === 0 ? "PAID" : "PENDING_PAYMENT";
    await pool.query(
      `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'MOVIE', $5, $6, 5000, 30, 'DAY', $7, NOW() - ($8 || ' minutes')::interval, NOW())`,
      [oId, customerAId, offerId, status, movieId, planVersionId, `idem-a-${i}-${randomUUID().slice(0, 8)}`, (5 - i) * 10],
    );
  }

  // Seed Customer B orders: 2 orders
  const customerBOrderIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const oId = randomUUID();
    customerBOrderIds.push(oId);
    await pool.query(
      `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key, created_at, updated_at)
       VALUES ($1, $2, $3, 'PAID', 'MOVIE', $4, $5, 5000, 30, 'DAY', $6, NOW() - ($7 || ' minutes')::interval, NOW())`,
      [oId, customerBId, offerId, movieId, planVersionId, `idem-b-${i}-${randomUUID().slice(0, 8)}`, i * 5],
    );
  }

  // Add payment attempts and fulfillment for Customer A's first order
  const firstAOrderId = customerAOrderIds[4]; // Most recent order (lowest minutes interval)
  await pool.query(
    `INSERT INTO payment_attempts (id, order_id, attempt_number, provider_name, provider_reference, amount_tzs, status)
     VALUES ($1, $2, 1, 'tigopesa', 'TP-REF-1', 5000, 'FAILED'),
            ($3, $2, 2, 'airtelmoney', 'AM-REF-2', 5000, 'SUCCEEDED')`,
    [randomUUID(), firstAOrderId, randomUUID()],
  );

  await pool.query(
    `INSERT INTO fulfillments (id, order_id, status, completed_at)
     VALUES ($1, $2, 'COMPLETED', NOW())`,
    [randomUUID(), firstAOrderId],
  );

  const customerACookie = await makeSessionCookie(pool, customerAId);
  const customerBCookie = await makeSessionCookie(pool, customerBId);
  const mediaTeamCookie = await makeSessionCookie(pool, mediaTeamId);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logController: new LogController({ disableRequestLogging: true }) }),
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

  await t.test("OH-01: Keyset pagination and descending order", async () => {
    // Page 1: limit 2
    const res1 = await app.inject({
      method: "GET",
      url: "/api/v1/orders?limit=2",
      headers: { cookie: customerACookie },
    });
    assert.equal(res1.statusCode, 200);
    const envelope1 = JSON.parse(res1.body);
    assert.equal(envelope1.success, true);
    const body1 = envelope1.data;
    assert.equal(body1.items.length, 2);
    assert.ok(body1.nextCursor, "Expected nextCursor on first page");

    // Verify ordering
    const d0 = new Date(body1.items[0].createdAt).getTime();
    const d1 = new Date(body1.items[1].createdAt).getTime();
    assert.ok(d0 >= d1, "Items must be in descending order of createdAt");

    // Page 2: with cursor
    const res2 = await app.inject({
      method: "GET",
      url: `/api/v1/orders?limit=2&cursor=${encodeURIComponent(body1.nextCursor)}`,
      headers: { cookie: customerACookie },
    });
    assert.equal(res2.statusCode, 200);
    const envelope2 = JSON.parse(res2.body);
    assert.equal(envelope2.success, true);
    const body2 = envelope2.data;
    assert.equal(body2.items.length, 2);
    assert.ok(body2.nextCursor, "Expected nextCursor on second page");

    // Disjoint items
    const page1Ids = body1.items.map((i: any) => i.id);
    const page2Ids = body2.items.map((i: any) => i.id);
    for (const id of page2Ids) {
      assert.ok(!page1Ids.includes(id), `Page 2 item ${id} should not be on page 1`);
    }

    // Page 3: last page
    const res3 = await app.inject({
      method: "GET",
      url: `/api/v1/orders?limit=2&cursor=${encodeURIComponent(body2.nextCursor)}`,
      headers: { cookie: customerACookie },
    });
    assert.equal(res3.statusCode, 200);
    const envelope3 = JSON.parse(res3.body);
    assert.equal(envelope3.success, true);
    const body3 = envelope3.data;
    assert.equal(body3.items.length, 1);
    assert.equal(body3.nextCursor, null, "Last page nextCursor must be null");
  });

  await t.test("OH-02: BOLA / IDOR protection & tenant isolation", async () => {
    // Customer A only sees Customer A's orders
    const resA = await app.inject({
      method: "GET",
      url: "/api/v1/orders?limit=50",
      headers: { cookie: customerACookie },
    });
    assert.equal(resA.statusCode, 200);
    const envelopeA = JSON.parse(resA.body);
    assert.equal(envelopeA.success, true);
    const bodyA = envelopeA.data;
    const returnedAIds = bodyA.items.map((i: any) => i.id);
    for (const bId of customerBOrderIds) {
      assert.ok(!returnedAIds.includes(bId), `Customer A should not see Customer B's order ${bId}`);
    }

    // Customer B only sees Customer B's orders
    const resB = await app.inject({
      method: "GET",
      url: "/api/v1/orders?limit=50",
      headers: { cookie: customerBCookie },
    });
    assert.equal(resB.statusCode, 200);
    const envelopeB = JSON.parse(resB.body);
    assert.equal(envelopeB.success, true);
    const bodyB = envelopeB.data;
    assert.equal(bodyB.items.length, 2);
    const returnedBIds = bodyB.items.map((i: any) => i.id);
    for (const bId of customerBOrderIds) {
      assert.ok(returnedBIds.includes(bId), `Customer B should see their own order ${bId}`);
    }
    for (const aId of customerAOrderIds) {
      assert.ok(!returnedBIds.includes(aId), `Customer B should not see Customer A's order ${aId}`);
    }
  });

  await t.test("OH-03: Status filter works correctly", async () => {
    const resPaid = await app.inject({
      method: "GET",
      url: "/api/v1/orders?status=PAID",
      headers: { cookie: customerACookie },
    });
    assert.equal(resPaid.statusCode, 200);
    const envelopePaid = JSON.parse(resPaid.body);
    assert.equal(envelopePaid.success, true);
    const bodyPaid = envelopePaid.data;
    for (const item of bodyPaid.items) {
      assert.equal(item.status, "PAID");
    }

    const resPending = await app.inject({
      method: "GET",
      url: "/api/v1/orders?status=PENDING_PAYMENT",
      headers: { cookie: customerACookie },
    });
    assert.equal(resPending.statusCode, 200);
    const envelopePending = JSON.parse(resPending.body);
    assert.equal(envelopePending.success, true);
    const bodyPending = envelopePending.data;
    for (const item of bodyPending.items) {
      assert.equal(item.status, "PENDING_PAYMENT");
    }
  });

  await t.test("OH-04: Payment attempt and fulfillment projections", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/orders?limit=10",
      headers: { cookie: customerACookie },
    });
    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    const body = envelope.data;

    const targetOrder = body.items.find((i: any) => i.id === firstAOrderId);
    assert.ok(targetOrder, "Target order should be present");
    assert.ok(targetOrder.paymentAttempt, "Payment attempt projection must be present");
    assert.equal(targetOrder.paymentAttempt.providerName, "airtelmoney");
    assert.equal(targetOrder.paymentAttempt.status, "SUCCEEDED");
    assert.equal(targetOrder.paymentAttempt.amountTzs, 5000);

    assert.ok(targetOrder.fulfillment, "Fulfillment projection must be present");
    assert.equal(targetOrder.fulfillment.status, "COMPLETED");
    assert.ok(targetOrder.fulfillment.completedAt, "Fulfillment completedAt must be present");

    // An order without payment attempts or fulfillment has null
    const otherOrder = body.items.find((i: any) => i.id !== firstAOrderId);
    assert.ok(otherOrder, "Other order should be present");
    assert.equal(otherOrder.paymentAttempt, null);
    assert.equal(otherOrder.fulfillment, null);
  });

  await t.test("OH-05: Malformed cursor and parameter validation", async () => {
    // Malformed cursor
    const resBadCursor = await app.inject({
      method: "GET",
      url: "/api/v1/orders?cursor=not-valid-base64",
      headers: { cookie: customerACookie },
    });
    assert.equal(resBadCursor.statusCode, 400);

    // Malformed cursor JSON
    const fakeCursor = Buffer.from(JSON.stringify({ createdAt: "invalid-date", id: "not-a-uuid" })).toString("base64url");
    const resBadCursorContent = await app.inject({
      method: "GET",
      url: `/api/v1/orders?cursor=${fakeCursor}`,
      headers: { cookie: customerACookie },
    });
    assert.equal(resBadCursorContent.statusCode, 400);

    // Invalid status
    const resBadStatus = await app.inject({
      method: "GET",
      url: "/api/v1/orders?status=INVALID_STATUS",
      headers: { cookie: customerACookie },
    });
    assert.equal(resBadStatus.statusCode, 400);

    // Invalid limit (over 100)
    const resBadLimit = await app.inject({
      method: "GET",
      url: "/api/v1/orders?limit=101",
      headers: { cookie: customerACookie },
    });
    assert.equal(resBadLimit.statusCode, 400);
  });

  await t.test("OH-06: Authentication and role authorization", async () => {
    // Unauthenticated
    const resUnauth = await app.inject({
      method: "GET",
      url: "/api/v1/orders",
    });
    assert.equal(resUnauth.statusCode, 401);

    // Media team role without customer role
    const resMedia = await app.inject({
      method: "GET",
      url: "/api/v1/orders",
      headers: { cookie: mediaTeamCookie },
    });
    assert.equal(resMedia.statusCode, 403);
  });
});
