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

test("Payments & Settlements runtime verification suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const adminId = randomUUID();
  const customerId = randomUUID();
  const otherCustomerId = randomUUID();
  const unverifiedCustomerId = randomUUID();
  const mediaTeamId = randomUUID();

  await pool.query(
    "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES " +
    "($1, $2, 'hash', 'admin', 'active', NOW()), " +
    "($3, $4, 'hash', 'customer', 'active', NOW()), " +
    "($5, $6, 'hash', 'customer', 'active', NOW()), " +
    "($7, $8, 'hash', 'customer', 'pending_verification', NULL), " +
    "($9, $10, 'hash', 'media_team', 'active', NOW()) " +
    "ON CONFLICT DO NOTHING",
    [
      adminId, "admin-pay-" + adminId.slice(0, 8) + "@giftedpro.test",
      customerId, "cust-pay-" + customerId.slice(0, 8) + "@giftedpro.test",
      otherCustomerId, "other-pay-" + otherCustomerId.slice(0, 8) + "@giftedpro.test",
      unverifiedCustomerId, "unver-pay-" + unverifiedCustomerId.slice(0, 8) + "@giftedpro.test",
      mediaTeamId, "media-pay-" + mediaTeamId.slice(0, 8) + "@giftedpro.test",
    ],
  );

  const planId = randomUUID();
  const planVersionId = randomUUID();
  await pool.query(
    "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Payment Plan') ON CONFLICT DO NOTHING",
    [planId, "PLAN_PAY_" + randomUUID().slice(0, 6).toUpperCase()],
  );
  await pool.query(
    "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 5, 2, 2) ON CONFLICT DO NOTHING",
    [planVersionId, planId],
  );

  const movieId = randomUUID();
  await pool.query(
    "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Pay Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
    [movieId, "pay-mov-" + movieId.slice(0, 8), "slug-pay-" + movieId.slice(0, 8), adminId],
  );

  const offerId = randomUUID();
  await pool.query(
    "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs) VALUES " +
    "($1, $2, 'Pay Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'MOVIE', $3, $4, 6000)",
    [offerId, "OFF_PAY_" + offerId.slice(0, 6).toUpperCase(), movieId, planVersionId],
  );

  const customerCookie = await makeSessionCookie(pool, customerId);
  const otherCustomerCookie = await makeSessionCookie(pool, otherCustomerId);
  const mediaTeamCookie = await makeSessionCookie(pool, mediaTeamId);
  const adminCookie = await makeSessionCookie(pool, adminId);

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

  // Helper to create an order for a customer
  async function createTestOrder(cookie: string, offId: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie },
      payload: { offerId: offId, idempotencyKey: "pay-ord-" + randomUUID() },
    });
    assert.equal(res.statusCode, 201);
    return res.json().data.id;
  }

  await t.test("1. Authentication and authorization guard enforcement on create and confirm (C-1)", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    // Unauthenticated create attempt
    const unauthRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      payload: {},
    });
    assert.equal(unauthRes.statusCode, 401);

    // Non-customer role (media_team) create attempt
    const mediaRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: mediaTeamCookie },
      payload: {},
    });
    assert.equal(mediaRes.statusCode, 403);

    // Create a valid attempt to test confirmation authorization
    const attRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(attRes.statusCode, 201);
    const attemptId = attRes.json().data.id;

    const confirmPayload = {
      providerEventId: "evt-auth-" + randomUUID(),
      providerReference: attRes.json().data.providerReference,
      amountTzs: 6000,
      outcome: "SUCCEEDED" as const,
    };

    // Unauthenticated confirm attempt -> 401
    const unauthConfirm = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attemptId}/simulate-confirm`,
      payload: confirmPayload,
    });
    assert.equal(unauthConfirm.statusCode, 401);

    // Authenticated Customer confirm attempt -> 403 Forbidden
    const custConfirm = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attemptId}/simulate-confirm`,
      headers: { cookie: customerCookie },
      payload: confirmPayload,
    });
    assert.equal(custConfirm.statusCode, 403);

    // Authenticated Media Team confirm attempt -> 403 Forbidden
    const mediaConfirm = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attemptId}/simulate-confirm`,
      headers: { cookie: mediaTeamCookie },
      payload: confirmPayload,
    });
    assert.equal(mediaConfirm.statusCode, 403);

    // Verify zero database mutation after unauthorized confirmation requests
    const dbAttempt = await pool.query("SELECT status, provider_event_id FROM payment_attempts WHERE id = $1", [attemptId]);
    assert.equal(dbAttempt.rows[0].status, "PENDING");
    assert.equal(dbAttempt.rows[0].provider_event_id, null);

    const dbOrder = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);
    assert.equal(dbOrder.rows[0].status, "PENDING_PAYMENT");

    const auditCount = await pool.query("SELECT COUNT(*) FROM audit_events WHERE resource_id = $1 AND action = 'PAYMENT_ATTEMPT_CONFIRM'", [attemptId]);
    assert.equal(parseInt(auditCount.rows[0].count, 10), 0);

    // Authorized Admin confirm attempt -> 200 OK
    const adminConfirm = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attemptId}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: confirmPayload,
    });
    assert.equal(adminConfirm.statusCode, 200);
    assert.equal(adminConfirm.json().data.attempt.status, "SUCCEEDED");
  });

  await t.test("2. Customer ownership and Anti-IDOR validation", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    // Other customer attempts to initiate payment attempt for orderId
    const idorCreateRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: otherCustomerCookie },
      payload: {},
    });
    // Anti-IDOR: Returns 404, not 403, preventing order existence enumeration
    assert.equal(idorCreateRes.statusCode, 404);

    // Other customer attempts to list payment attempts
    const idorListRes = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: otherCustomerCookie },
    });
    assert.equal(idorListRes.statusCode, 404);
  });

  await t.test("3. Strict input validation and provider trust boundary (M-1)", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    // Customer-supplied providerReference is rejected as forbidden unknown property
    const refRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: { providerReference: "SIM-MALICIOUS-INJECTED" },
    });
    assert.equal(refRes.statusCode, 400);

    // Non-allowlisted providerName is rejected
    const badProviderRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: { providerName: "unauthorized_gateway" },
    });
    assert.equal(badProviderRes.statusCode, 400);

    // Mass-assignment: extra injected property
    const massRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: { forgedAmount: 0, status: "SUCCEEDED" },
    });
    assert.equal(massRes.statusCode, 400);

    // Malformed UUID in route param
    const malformedRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders/not-a-uuid/payment-attempts",
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(malformedRes.statusCode, 400);

    // Create valid attempt to test simulate-confirm validation
    const validAtt = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const attId = validAtt.json().data.id;

    // Malformed providerEventId (spaces or invalid characters)
    const badEvtRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attId}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt with spaces and <script>",
        providerReference: "SIM-VALID",
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(badEvtRes.statusCode, 400);

    // Invalid outcome
    const badOutcomeRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attId}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-valid-123",
        providerReference: "SIM-VALID",
        amountTzs: 6000,
        outcome: "INVALID_STATUS",
      },
    });
    assert.equal(badOutcomeRes.statusCode, 400);

    // Negative amount
    const negAmountRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attId}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-valid-123",
        providerReference: "SIM-VALID",
        amountTzs: -500,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(negAmountRes.statusCode, 400);
  });

  await t.test("4. Server-authoritative amount copying and attempt initiation", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    const createRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: { providerName: "simulated" },
    });
    assert.equal(createRes.statusCode, 201);
    const attempt = createRes.json().data;

    assert.equal(attempt.orderId, orderId);
    assert.equal(attempt.attemptNumber, 1);
    assert.equal(attempt.amountTzs, 6000); // Server-authoritative from order
    assert.equal(attempt.status, "PENDING");
    assert.equal(attempt.providerName, "simulated");
    assert.ok(attempt.providerReference.startsWith("SIM-"));

    // Verify GET list endpoint
    const listRes = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
    });
    assert.equal(listRes.statusCode, 200);
    const list = listRes.json().data;
    assert.equal(list.length, 1);
    assert.equal(list[0].id, attempt.id);
  });

  await t.test("5. Single-in-flight unresolved attempt enforcement", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    // Create first attempt (status: PENDING)
    const firstRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(firstRes.statusCode, 201);

    // Creating a second attempt while first is PENDING must be rejected with 409
    const secondRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(secondRes.statusCode, 409);
    assert.equal(secondRes.json().error.code, "ACTIVE_PAYMENT_ATTEMPT_EXISTS");
  });

  await t.test("6. Sequential attempt numbering after terminal non-success", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    // Attempt 1 created
    const att1Res = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(att1Res.statusCode, 201);
    const att1 = att1Res.json().data;
    assert.equal(att1.attemptNumber, 1);

    // Confirm Attempt 1 as FAILED
    const failRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${att1.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-fail-" + randomUUID(),
        providerReference: att1.providerReference,
        amountTzs: 6000,
        outcome: "FAILED",
      },
    });
    assert.equal(failRes.statusCode, 200);
    assert.equal(failRes.json().data.attempt.status, "FAILED");

    // Now that Attempt 1 is terminal FAILED, creating Attempt 2 succeeds and has attemptNumber = 2
    const att2Res = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(att2Res.statusCode, 201);
    const att2 = att2Res.json().data;
    assert.equal(att2.attemptNumber, 2);
    assert.equal(att2.status, "PENDING");
  });

  await t.test("7. Simulated confirmation to SUCCEEDED and atomic order transition to PAID", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    const attRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(attRes.statusCode, 201);
    const attempt = attRes.json().data;

    const providerEventId = "evt-succ-" + randomUUID();
    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId,
        providerReference: attempt.providerReference,
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(confirmRes.statusCode, 200);
    const result = confirmRes.json().data;

    assert.equal(result.attempt.status, "SUCCEEDED");
    assert.equal(result.order.status, "PAID");
    assert.equal(result.idempotentReplay, false);
    assert.equal(result.attempt.providerEventId, providerEventId);
    assert.equal((result as Record<string, unknown>).settlement, undefined);

    // Verify in database: settlement row is NOT created in Task #3 (H-1)
    const dbSettlement = await pool.query(
      "SELECT * FROM settlements WHERE payment_attempt_id = $1",
      [attempt.id],
    );
    assert.equal(dbSettlement.rowCount, 0);

    // Verify in database: order status is PAID
    const dbOrder = await pool.query("SELECT status, amount_tzs FROM orders WHERE id = $1", [orderId]);
    assert.equal(dbOrder.rows[0].status, "PAID");
    assert.equal(dbOrder.rows[0].amount_tzs, 6000); // Terms unchanged

    // Attempting to create another payment attempt for a PAID order must fail with 409
    const paidAttemptRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    assert.equal(paidAttemptRes.statusCode, 409);
    assert.equal(paidAttemptRes.json().error.code, "ORDER_ALREADY_PAID");
  });

  await t.test("8. Amount mismatch rejection", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    const attRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const attempt = attRes.json().data;

    // Confirm with mismatched amount (1000 instead of 6000)
    const mismatchRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-mismatch-" + randomUUID(),
        providerReference: attempt.providerReference,
        amountTzs: 1000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(mismatchRes.statusCode, 422);
    assert.equal(mismatchRes.json().error.code, "PAYMENT_AMOUNT_MISMATCH");

    // Verify attempt remains PENDING and order remains PENDING_PAYMENT
    const dbAttempt = await pool.query("SELECT status FROM payment_attempts WHERE id = $1", [attempt.id]);
    assert.equal(dbAttempt.rows[0].status, "PENDING");
    const dbOrder = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);
    assert.equal(dbOrder.rows[0].status, "PENDING_PAYMENT");
  });

  await t.test("9. Terminal state transition immutability", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    const attRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const attempt = attRes.json().data;

    // Confirm as SUCCEEDED
    await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-first-" + randomUUID(),
        providerReference: attempt.providerReference,
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });

    // Attempting a different transition on a SUCCEEDED attempt fails with 409
    const secondConfirmRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-second-" + randomUUID(),
        providerReference: attempt.providerReference,
        amountTzs: 6000,
        outcome: "FAILED",
      },
    });
    assert.equal(secondConfirmRes.statusCode, 409);
    assert.equal(secondConfirmRes.json().error.code, "INVALID_PAYMENT_ATTEMPT_TRANSITION");
  });

  await t.test("10. Idempotent duplicate confirmation event replay", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    const attRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const attempt = attRes.json().data;

    const providerEventId = "evt-replay-" + randomUUID();
    const payload = {
      providerEventId,
      providerReference: attempt.providerReference,
      amountTzs: 6000,
      outcome: "SUCCEEDED" as const,
    };

    // First confirmation
    const firstRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload,
    });
    assert.equal(firstRes.statusCode, 200);
    assert.equal(firstRes.json().data.idempotentReplay, false);

    // Second identical confirmation (duplicate webhook/provider event replay)
    const secondRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload,
    });
    assert.equal(secondRes.statusCode, 200);
    assert.equal(secondRes.json().data.idempotentReplay, true);
    assert.equal((secondRes.json().data as Record<string, unknown>).settlement, undefined);

    // Verify exactly ONE audit event exists for PAYMENT_ATTEMPT_CONFIRM (no duplicate audit logs on replay)
    const auditCount = await pool.query(
      "SELECT count(*) FROM audit_events WHERE action = 'PAYMENT_ATTEMPT_CONFIRM' AND resource_id = $1",
      [attempt.id],
    );
    assert.equal(parseInt(auditCount.rows[0].count, 10), 1);

    // Reusing the same providerEventId for a DIFFERENT attempt must be rejected with 409
    const secondOrderId = await createTestOrder(customerCookie, offerId);
    const secondAttRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${secondOrderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const secondAttemptId = secondAttRes.json().data.id;

    const crossAttemptReuse = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${secondAttemptId}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId, // same event ID as attempt 1!
        providerReference: secondAttRes.json().data.providerReference,
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(crossAttemptReuse.statusCode, 409);
    assert.equal(crossAttemptReuse.json().error.code, "INVALID_PAYMENT_ATTEMPT_TRANSITION");
  });

  await t.test("11. High-concurrency race condition: single-in-flight partial index integrity", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    // Fire 6 concurrent requests to create a payment attempt on the same order
    const promises = Array.from({ length: 6 }, () =>
      app.inject({
        method: "POST",
        url: `/api/v1/orders/${orderId}/payment-attempts`,
        headers: { cookie: customerCookie },
        payload: {},
      }),
    );

    const responses = await Promise.all(promises);
    const successCount = responses.filter((r) => r.statusCode === 201).length;
    const conflictCount = responses.filter((r) => r.statusCode === 409).length;

    assert.equal(successCount, 1, "Exactly one concurrent attempt must succeed");
    assert.equal(conflictCount, 5, "All other concurrent attempts must be rejected with 409");

    // Exactly 1 payment attempt exists in the database
    const dbCount = await pool.query(
      "SELECT count(*) FROM payment_attempts WHERE order_id = $1",
      [orderId],
    );
    assert.equal(parseInt(dbCount.rows[0].count, 10), 1);
  });

  await t.test("12. Concurrent confirmation requests for attempts on the same order (H-2)", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    // Attempt 1 created
    const att1Res = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const att1 = att1Res.json().data;

    // Fail attempt 1 so attempt 2 can be created
    await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${att1.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-f1-" + randomUUID(),
        providerReference: att1.providerReference,
        amountTzs: 6000,
        outcome: "FAILED",
      },
    });

    // Attempt 2 created
    const att2Res = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const att2 = att2Res.json().data;

    // Deterministic Concurrency Barrier Setup:
    // When Attempt 2 confirmation updates orders table, pause before commit using an advisory lock.
    const S12_LOCK_ID = 88299102;
    await pool.query(`
      CREATE OR REPLACE FUNCTION test_order_barrier_fn() RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.id = '${orderId}'::uuid AND NEW.status = 'PAID' THEN
          PERFORM pg_advisory_lock(${S12_LOCK_ID});
          PERFORM pg_advisory_unlock(${S12_LOCK_ID});
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS test_trg_order_barrier ON orders;
      CREATE TRIGGER test_trg_order_barrier
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION test_order_barrier_fn();
    `);

    let conf2Promise: Promise<any> | null = null;
    let lateConf1Promise: Promise<any> | null = null;
    let competingConf2Promise: Promise<any> | null = null;
    const coordinator = await pool.connect();
    try {
      await coordinator.query("SET statement_timeout = '5000'");
      await coordinator.query("SELECT pg_advisory_lock($1)", [S12_LOCK_ID.toString()]);

      // Launch confirmation for Attempt 2 in background
      conf2Promise = app.inject({
        method: "POST",
        url: `/api/v1/payment-attempts/${att2.id}/simulate-confirm`,
        headers: { cookie: adminCookie },
        payload: {
          providerEventId: "evt-s2-" + randomUUID(),
          providerReference: att2.providerReference,
          amountTzs: 6000,
          outcome: "SUCCEEDED",
        },
      });

      // Wait until Attempt 2 confirmation enters its transaction and reaches the advisory lock barrier on orders
      let winningPid: number | null = null;
      for (let i = 0; i < 50; i++) {
        const check = await pool.query(
          "SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted = false",
          [Number(S12_LOCK_ID)],
        );
        if (check.rows.length > 0) {
          winningPid = Number(check.rows[0].pid);
          break;
        }
        await new Promise((r) => setTimeout(r, 20));
      }
      assert.ok(winningPid !== null, "Winning confirmation transaction must reach the advisory lock barrier");

      // While Attempt 2 confirmation is paused holding row locks on Attempt 2 and Order, launch competing confirmations:
      // Request B1: Late confirmation attempt on Attempt 1 (already FAILED)
      lateConf1Promise = app.inject({
        method: "POST",
        url: `/api/v1/payment-attempts/${att1.id}/simulate-confirm`,
        headers: { cookie: adminCookie },
        payload: {
          providerEventId: "evt-late-1-" + randomUUID(),
          providerReference: att1.providerReference,
          amountTzs: 6000,
          outcome: "SUCCEEDED",
        },
      });

      // Request B2: Competing confirmation for Attempt 2 with different providerEventId
      competingConf2Promise = app.inject({
        method: "POST",
        url: `/api/v1/payment-attempts/${att2.id}/simulate-confirm`,
        headers: { cookie: adminCookie },
        payload: {
          providerEventId: "evt-competing-2-" + randomUUID(),
          providerReference: att2.providerReference,
          amountTzs: 6000,
          outcome: "SUCCEEDED",
        },
      });

      // Empirically prove that the competing backend has reached PostgreSQL and is blocked by winningPid!
      let observedBlocked = false;
      let blockedQuery = "";
      let blockedWaitType = "";
      let lastActivitySnapshot: unknown[] = [];
      for (let i = 0; i < 100; i++) {
        const blockedCheck = await pool.query(
          `SELECT pid, query, wait_event_type, wait_event, pg_blocking_pids(pid) as blocking 
           FROM pg_stat_activity 
           WHERE array[$1::integer] <@ pg_blocking_pids(pid)
             AND wait_event_type = 'Lock'
             AND (query ILIKE '%payment_attempts%' OR query ILIKE '%orders%')`,
          [winningPid],
        );
        if (blockedCheck.rows.length > 0) {
          observedBlocked = true;
          blockedQuery = blockedCheck.rows[0].query;
          blockedWaitType = blockedCheck.rows[0].wait_event_type;
          break;
        }
        if (i === 99) {
          const snapshot = await pool.query(
            `SELECT pid, query, wait_event_type, wait_event, pg_blocking_pids(pid) as blocking
             FROM pg_stat_activity
             WHERE pid != pg_backend_pid()`,
          );
          lastActivitySnapshot = snapshot.rows;
        }
        await new Promise((r) => setTimeout(r, 20));
      }

      assert.ok(
        observedBlocked,
        `Expected competing confirmation request to reach PostgreSQL and block on winning transaction (PID ${winningPid}). Activity snapshot: ${JSON.stringify(lastActivitySnapshot)}`,
      );
      assert.equal(blockedWaitType, "Lock", "Competing backend must be waiting on a database row lock");
      assert.ok(
        blockedQuery.includes("payment_attempts") || blockedQuery.includes("orders"),
        `Competing query must target payment_attempts or orders, got: ${blockedQuery}`,
      );

      // Only AFTER verifying that the competing request is physically blocked behind winningPid
      // does the coordinator release the barrier!
      await coordinator.query("SELECT pg_advisory_unlock($1)", [S12_LOCK_ID.toString()]);

      const [conf2Res, lateConf1Res, competingConf2Res] = await Promise.all([
        conf2Promise!,
        lateConf1Promise!,
        competingConf2Promise!,
      ]);

      // Assertions:
      // 1. Attempt 2 successfully transitions to SUCCEEDED and order transitions to PAID
      assert.equal(conf2Res.statusCode, 200);
      assert.equal(conf2Res.json().data.attempt.status, "SUCCEEDED");
      assert.equal(conf2Res.json().data.order.status, "PAID");

      // 2. Late confirmation on Attempt 1 is rejected with 409 (terminal state violation)
      assert.equal(lateConf1Res.statusCode, 409);
      assert.equal(lateConf1Res.json().error.code, "INVALID_PAYMENT_ATTEMPT_TRANSITION");

      // 3. Competing confirmation on Attempt 2 with different event ID is rejected with 409
      assert.equal(competingConf2Res.statusCode, 409);
      assert.equal(competingConf2Res.json().error.code, "INVALID_PAYMENT_ATTEMPT_TRANSITION");

      // 4. Verify order in database is PAID exactly once
      const dbOrder = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);
      assert.equal(dbOrder.rows[0].status, "PAID");

      // 5. Verify database has exactly 1 SUCCEEDED attempt for this order
      const dbSucceeded = await pool.query(
        "SELECT count(*) FROM payment_attempts WHERE order_id = $1 AND status = 'SUCCEEDED'",
        [orderId],
      );
      assert.equal(parseInt(dbSucceeded.rows[0].count, 10), 1);

      // 6. Verify audit log has exactly 1 PAYMENT_ATTEMPT_CONFIRM for Attempt 2
      const auditCount = await pool.query(
        "SELECT count(*) FROM audit_events WHERE resource_id = $1 AND action = 'PAYMENT_ATTEMPT_CONFIRM'",
        [att2.id],
      );
      assert.equal(parseInt(auditCount.rows[0].count, 10), 1);
    } finally {
      try {
        await coordinator.query("SELECT pg_advisory_unlock_all()");
      } catch {
        // Ignored
      }
      try {
        const inFlight = [conf2Promise, lateConf1Promise, competingConf2Promise].filter(
          (p): p is Promise<any> => p !== null,
        );
        if (inFlight.length > 0) {
          await Promise.allSettled(inFlight);
        }
      } catch {
        // Ignored
      }
      coordinator.release();
      await pool.query("DROP TRIGGER IF EXISTS test_trg_order_barrier ON orders");
      await pool.query("DROP FUNCTION IF EXISTS test_order_barrier_fn()");
    }
  });

  await t.test("13. Real PostgreSQL 40001 serialization retry recovery in confirmation (H-2)", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    const attRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const attempt = attRes.json().data;

    const S40001_LOCK_ID = 88299101;

    // Set up barrier table and trigger on payment_attempts BEFORE UPDATE
    await pool.query(`
      DROP TABLE IF EXISTS test_pay_barrier;
      CREATE TABLE test_pay_barrier (id text PRIMARY KEY, counter int NOT NULL, fired boolean NOT NULL DEFAULT false);
      INSERT INTO test_pay_barrier (id, counter, fired) VALUES ('barrier', 0, false);

      CREATE OR REPLACE FUNCTION test_pay_40001_fn() RETURNS TRIGGER AS $$
      DECLARE
        v_fired boolean;
      BEGIN
        SELECT fired INTO v_fired FROM test_pay_barrier WHERE id = 'barrier';
        IF NOT v_fired THEN
          PERFORM pg_advisory_lock(${S40001_LOCK_ID});
          PERFORM pg_advisory_unlock(${S40001_LOCK_ID});
          UPDATE test_pay_barrier SET counter = counter + 1 WHERE id = 'barrier';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS test_trg_pay_40001 ON payment_attempts;
      CREATE TRIGGER test_trg_pay_40001
      BEFORE UPDATE ON payment_attempts
      FOR EACH ROW
      EXECUTE FUNCTION test_pay_40001_fn();
    `);

    const coordinator = await pool.connect();
    try {
      await coordinator.query("SET statement_timeout = '5000'");
      await coordinator.query("SELECT pg_advisory_lock($1)", [S40001_LOCK_ID.toString()]);

      const providerEventId = "evt-retry-40001-" + randomUUID();

      // Launch confirmation in background
      const confirmPromise = app.inject({
        method: "POST",
        url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
        headers: { cookie: adminCookie },
        payload: {
          providerEventId,
          providerReference: attempt.providerReference,
          amountTzs: 6000,
          outcome: "SUCCEEDED",
        },
      });

      // Wait for confirmation transaction to reach advisory lock barrier
      for (let i = 0; i < 50; i++) {
        const check = await pool.query(
          "SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted = false",
          [Number(S40001_LOCK_ID)],
        );
        if (parseInt(check.rows[0].count, 10) > 0) break;
        await new Promise((r) => setTimeout(r, 20));
      }

      // External transaction mutates the barrier row and commits
      const mutClient = await pool.connect();
      try {
        await mutClient.query("SET statement_timeout = '5000'");
        await mutClient.query("UPDATE test_pay_barrier SET counter = 999, fired = true WHERE id = 'barrier'");
      } finally {
        mutClient.release();
      }

      // Release advisory lock so transaction 1 resumes, attempts UPDATE on test_pay_barrier, and throws 40001!
      await coordinator.query("SELECT pg_advisory_unlock($1)", [S40001_LOCK_ID.toString()]);

      // simulateConfirmPayment's retry loop catches 40001, starts fresh transaction (where fired = true),
      // and succeeds!
      const confirmRes = await confirmPromise;
      assert.equal(confirmRes.statusCode, 200);
      assert.equal(confirmRes.json().data.attempt.status, "SUCCEEDED");
      assert.equal(confirmRes.json().data.order.status, "PAID");

      // Verify database state: exactly 1 payment attempt SUCCEEDED, order PAID, and 1 audit event
      const dbAtt = await pool.query("SELECT status FROM payment_attempts WHERE id = $1", [attempt.id]);
      assert.equal(dbAtt.rows[0].status, "SUCCEEDED");

      const dbOrd = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);
      assert.equal(dbOrd.rows[0].status, "PAID");

      const auditCount = await pool.query(
        "SELECT count(*) FROM audit_events WHERE resource_id = $1 AND action = 'PAYMENT_ATTEMPT_CONFIRM'",
        [attempt.id],
      );
      assert.equal(parseInt(auditCount.rows[0].count, 10), 1);
    } finally {
      try {
        await coordinator.query("SELECT pg_advisory_unlock_all()");
      } catch {
        // Ignored
      }
      coordinator.release();
      await pool.query("DROP TRIGGER IF EXISTS test_trg_pay_40001 ON payment_attempts");
      await pool.query("DROP FUNCTION IF EXISTS test_pay_40001_fn()");
      await pool.query("DROP TABLE IF EXISTS test_pay_barrier");
    }
  });

  await t.test("14. Fail-closed transactional audit logging and atomic rollback", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);

    const attRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${orderId}/payment-attempts`,
      headers: { cookie: customerCookie },
      payload: {},
    });
    const attempt = attRes.json().data;

    // Normal successful audit trail
    await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${attempt.id}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-audit-" + randomUUID(),
        providerReference: attempt.providerReference,
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });

    // Check audit trail
    const auditCreate = await pool.query(
      "SELECT * FROM audit_events WHERE action = 'PAYMENT_ATTEMPT_CREATE' AND resource_id = $1",
      [attempt.id],
    );
    assert.equal(auditCreate.rowCount, 1);
    assert.equal(auditCreate.rows[0].actor_id, customerId);

    const auditConfirm = await pool.query(
      "SELECT * FROM audit_events WHERE action = 'PAYMENT_ATTEMPT_CONFIRM' AND resource_id = $1",
      [attempt.id],
    );
    assert.equal(auditConfirm.rowCount, 1);
  });

  await t.test("15. Provider reference uniqueness collision recovery and retry (Investigation A)", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);
    const dummyOrderId = await createTestOrder(customerCookie, offerId);

    // Setup collision sequence and trigger
    await pool.query(`
      DROP SEQUENCE IF EXISTS test_collision_seq;
      CREATE SEQUENCE test_collision_seq START WITH 1;

      -- Insert a dummy existing attempt on dummyOrderId with known provider_reference to collide against
      INSERT INTO payment_attempts (id, order_id, attempt_number, provider_name, provider_reference, status, amount_tzs)
      VALUES (gen_random_uuid(), '${dummyOrderId}'::uuid, 1, 'simulated', 'SIM-COLLISION-STATIC', 'FAILED', 6000)
      ON CONFLICT DO NOTHING;

      CREATE OR REPLACE FUNCTION test_force_collision_fn() RETURNS TRIGGER AS $$
      DECLARE
        v_seq bigint;
      BEGIN
        v_seq := nextval('test_collision_seq');
        IF v_seq = 1 THEN
          -- First time: force collision with existing SIM-COLLISION-STATIC
          NEW.provider_reference := 'SIM-COLLISION-STATIC';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS test_trg_force_collision ON payment_attempts;
      CREATE TRIGGER test_trg_force_collision
      BEFORE INSERT ON payment_attempts
      FOR EACH ROW
      EXECUTE FUNCTION test_force_collision_fn();
    `);

    try {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/orders/${orderId}/payment-attempts`,
        headers: { cookie: customerCookie },
        payload: {},
      });

      // The service caught 23505 on payment_attempts_provider_reference_idx, retried, and succeeded!
      assert.equal(res.statusCode, 201);
      const attempt = res.json().data;
      assert.notEqual(attempt.providerReference, "SIM-COLLISION-STATIC");
      assert.ok(attempt.providerReference.startsWith("SIM-"));

      // Exactly 1 new attempt exists for attempt_number = 1 on orderId
      const dbAtt = await pool.query(
        "SELECT count(*) FROM payment_attempts WHERE order_id = $1 AND attempt_number = 1",
        [orderId],
      );
      assert.equal(parseInt(dbAtt.rows[0].count, 10), 1);

      // Exactly 1 PAYMENT_ATTEMPT_CREATE audit event exists (first rolled back, no duplicate!)
      const dbAudit = await pool.query(
        "SELECT count(*) FROM audit_events WHERE resource_id = $1 AND action = 'PAYMENT_ATTEMPT_CREATE'",
        [attempt.id],
      );
      assert.equal(parseInt(dbAudit.rows[0].count, 10), 1);
    } finally {
      await pool.query("DROP TRIGGER IF EXISTS test_trg_force_collision ON payment_attempts");
      await pool.query("DROP FUNCTION IF EXISTS test_force_collision_fn()");
      await pool.query("DELETE FROM payment_attempts WHERE provider_reference = 'SIM-COLLISION-STATIC'");
      await pool.query("DROP SEQUENCE IF EXISTS test_collision_seq");
    }
  });

  await t.test("16. Provider reference uniqueness collision retry exhaustion and rollback (Investigation A)", async () => {
    const orderId = await createTestOrder(customerCookie, offerId);
    const dummyOrderId = await createTestOrder(customerCookie, offerId);

    // Setup collision sequence that ALWAYS forces collision
    await pool.query(`
      DROP SEQUENCE IF EXISTS test_collision_exhaust_seq;
      CREATE SEQUENCE test_collision_exhaust_seq START WITH 1;

      INSERT INTO payment_attempts (id, order_id, attempt_number, provider_name, provider_reference, status, amount_tzs)
      VALUES (gen_random_uuid(), '${dummyOrderId}'::uuid, 1, 'simulated', 'SIM-COLLISION-PERMANENT', 'FAILED', 6000)
      ON CONFLICT DO NOTHING;

      CREATE OR REPLACE FUNCTION test_force_exhaust_fn() RETURNS TRIGGER AS $$
      BEGIN
        PERFORM nextval('test_collision_exhaust_seq');
        NEW.provider_reference := 'SIM-COLLISION-PERMANENT';
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS test_trg_force_exhaust ON payment_attempts;
      CREATE TRIGGER test_trg_force_exhaust
      BEFORE INSERT ON payment_attempts
      FOR EACH ROW
      EXECUTE FUNCTION test_force_exhaust_fn();
    `);

    try {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/orders/${orderId}/payment-attempts`,
        headers: { cookie: customerCookie },
        payload: {},
      });

      // All 3 attempts collide, service throws ProviderReferenceCollisionException (409)
      assert.equal(res.statusCode, 409);
      assert.equal(res.json().error.code, "PROVIDER_REFERENCE_COLLISION");

      // Verify sequence advanced to 4 (started at 1, nextval called 3 times)
      const countRes = await pool.query("SELECT last_value FROM test_collision_exhaust_seq");
      assert.equal(parseInt(countRes.rows[0].last_value, 10), 3);

      // Verify database state: 0 attempts created for attempt_number = 1 on orderId
      const dbAtt = await pool.query(
        "SELECT count(*) FROM payment_attempts WHERE order_id = $1 AND attempt_number = 1",
        [orderId],
      );
      assert.equal(parseInt(dbAtt.rows[0].count, 10), 0);

      // Verify audit events: 0 audit events created for orderId
      const dbAudit = await pool.query(
        "SELECT count(*) FROM audit_events WHERE metadata->>'orderId' = $1",
        [orderId],
      );
      assert.equal(parseInt(dbAudit.rows[0].count, 10), 0);
    } finally {
      await pool.query("DROP TRIGGER IF EXISTS test_trg_force_exhaust ON payment_attempts");
      await pool.query("DROP FUNCTION IF EXISTS test_force_exhaust_fn()");
      await pool.query("DELETE FROM payment_attempts WHERE provider_reference = 'SIM-COLLISION-PERMANENT'");
      await pool.query("DROP SEQUENCE IF EXISTS test_collision_exhaust_seq");
    }
  });
});

