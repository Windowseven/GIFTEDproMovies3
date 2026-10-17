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
  "postgresql://tester:postgres@127.0.0.1:5433/giftedpro_phase1_test";

async function makeSessionCookie(pool: pg.Pool, userId: string): Promise<string> {
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_active_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', NOW(), NOW())",
    [randomUUID(), userId, hash],
  );
  return "gifted_session=" + rawToken;
}

test("Reconciliation Discrepancies Read-Only Runtime Verification Suite (Slice A)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const adminId = randomUUID();
  const customerId = randomUUID();
  const mediaTeamId = randomUUID();

  await pool.query(
    "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES " +
    "($1, $2, 'hash', 'admin', 'active', NOW()), " +
    "($3, $4, 'hash', 'customer', 'active', NOW()), " +
    "($5, $6, 'hash', 'media_team', 'active', NOW()) " +
    "ON CONFLICT DO NOTHING",
    [
      adminId, "admin-recon-" + adminId.slice(0, 8) + "@giftedpro.test",
      customerId, "cust-recon-" + customerId.slice(0, 8) + "@giftedpro.test",
      mediaTeamId, "media-recon-" + mediaTeamId.slice(0, 8) + "@giftedpro.test",
    ],
  );

  const planId = randomUUID();
  const planVersionId = randomUUID();
  await pool.query(
    "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Recon Plan') ON CONFLICT DO NOTHING",
    [planId, "PLAN_REC_" + randomUUID().slice(0, 6).toUpperCase()],
  );
  await pool.query(
    "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 5, 2, 2) ON CONFLICT DO NOTHING",
    [planVersionId, planId],
  );

  const movieId = randomUUID();
  await pool.query(
    "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Recon Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
    [movieId, "rec-mov-" + movieId.slice(0, 8), "slug-rec-" + movieId.slice(0, 8), adminId],
  );

  const offerId = randomUUID();
  await pool.query(
    "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs) VALUES " +
    "($1, $2, 'Recon Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'MOVIE', $3, $4, 6000)",
    [offerId, "OFF_REC_" + offerId.slice(0, 6).toUpperCase(), movieId, planVersionId],
  );

  const customerCookie = await makeSessionCookie(pool, customerId);
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

  // Helper to create an order directly
  async function seedOrder(options?: {
    id?: string;
    status?: "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED";
    amountTzs?: number;
    updatedAt?: Date;
  }): Promise<string> {
    const id = options?.id ?? randomUUID();
    const status = options?.status ?? "PENDING_PAYMENT";
    const amountTzs = options?.amountTzs ?? 6000;
    const updatedAt = options?.updatedAt ?? new Date();

    await pool.query(
      `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'MOVIE', $5, $6, $7, 30, 'DAY', $8, $9, $9)`,
      [id, customerId, offerId, status, movieId, planVersionId, amountTzs, "ord-key-" + randomUUID(), updatedAt],
    );
    return id;
  }

  // Helper to create a payment attempt directly
  async function seedPaymentAttempt(options: {
    id?: string;
    orderId: string;
    attemptNumber?: number;
    providerName?: string;
    providerEventId?: string | null;
    providerReference?: string | null;
    status?: "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED";
    amountTzs?: number;
    updatedAt?: Date;
  }): Promise<string> {
    const id = options.id ?? randomUUID();
    const attemptNumber = options.attemptNumber ?? 1;
    const providerName = options.providerName ?? "simulated";
    const providerEventId = options.providerEventId === undefined ? "evt-" + randomUUID() : options.providerEventId;
    const providerReference = options.providerReference === undefined ? "ref-" + randomUUID() : options.providerReference;
    const status = options.status ?? "PENDING";
    const amountTzs = options.amountTzs ?? 6000;
    const updatedAt = options.updatedAt ?? new Date();

    await pool.query(
      `INSERT INTO payment_attempts (id, order_id, attempt_number, provider_name, provider_event_id, provider_reference, status, amount_tzs, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [id, options.orderId, attemptNumber, providerName, providerEventId, providerReference, status, amountTzs, updatedAt],
    );
    return id;
  }

  // Helper to create a settlement directly
  async function seedSettlement(options: {
    id?: string;
    paymentAttemptId: string;
    providerName?: string;
    providerEventId?: string;
    providerReference?: string;
    amountTzs?: number;
    recordedAt?: Date;
  }): Promise<string> {
    const id = options.id ?? randomUUID();
    const providerName = options.providerName ?? "simulated";
    const providerEventId = options.providerEventId ?? "evt-" + randomUUID();
    const providerReference = options.providerReference ?? "ref-" + randomUUID();
    const amountTzs = options.amountTzs ?? 6000;
    const recordedAt = options.recordedAt ?? new Date();

    await pool.query(
      `INSERT INTO settlements (id, payment_attempt_id, provider_name, provider_event_id, provider_reference, amount_tzs, settled_at, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [id, options.paymentAttemptId, providerName, providerEventId, providerReference, amountTzs, recordedAt],
    );
    return id;
  }

  // 1. Authentication and Authorization Guard Enforcement
  await t.test("1. Authentication and authorization guard enforcement on GET discrepancies", async () => {
    // Unauthenticated
    const unauthRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies",
    });
    assert.equal(unauthRes.statusCode, 401);

    // Customer role (Forbidden)
    const custRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies",
      headers: { cookie: customerCookie },
    });
    assert.equal(custRes.statusCode, 403);

    // Media team role (Forbidden)
    const mediaRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies",
      headers: { cookie: mediaTeamCookie },
    });
    assert.equal(mediaRes.statusCode, 403);

    // Admin role (Allowed)
    const adminRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies",
      headers: { cookie: adminCookie },
    });
    assert.equal(adminRes.statusCode, 200);
    const body = adminRes.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.items));
  });

  // 2. Query Validation
  await t.test("2. Query parameter validation and rejection of invalid inputs", async () => {
    // Invalid limit < 1
    const resLowLimit = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?limit=0",
      headers: { cookie: adminCookie },
    });
    assert.equal(resLowLimit.statusCode, 400);

    // Invalid limit > 100
    const resHighLimit = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?limit=101",
      headers: { cookie: adminCookie },
    });
    assert.equal(resHighLimit.statusCode, 400);

    // Invalid limit string
    const resStringLimit = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?limit=abc",
      headers: { cookie: adminCookie },
    });
    assert.equal(resStringLimit.statusCode, 400);

    // Invalid discrepancy type
    const resBadType = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?type=UNKNOWN_TYPE",
      headers: { cookie: adminCookie },
    });
    assert.equal(resBadType.statusCode, 400);

    // Invalid windowStart timestamp
    const resBadStart = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?windowStart=not-a-date",
      headers: { cookie: adminCookie },
    });
    assert.equal(resBadStart.statusCode, 400);

    // Invalid windowEnd timestamp
    const resBadEnd = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?windowEnd=not-a-date",
      headers: { cookie: adminCookie },
    });
    assert.equal(resBadEnd.statusCode, 400);

    // Inverted time window: windowStart > windowEnd
    const resInverted = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?windowStart=2026-10-15T00:00:00Z&windowEnd=2026-10-10T00:00:00Z",
      headers: { cookie: adminCookie },
    });
    assert.equal(resInverted.statusCode, 400);

    // Malformed cursor: not base64 / invalid JSON
    const resBadCursor1 = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?cursor=!!!notbase64!!!",
      headers: { cookie: adminCookie },
    });
    assert.equal(resBadCursor1.statusCode, 400);

    // Malformed cursor: valid base64 but invalid JSON structure
    const badCursorJson = Buffer.from("just a plain string").toString("base64");
    const resBadCursor2 = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?cursor=${badCursorJson}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(resBadCursor2.statusCode, 400);

    // Malformed cursor: non-UUID entityId
    const badCursorUuid = Buffer.from(JSON.stringify({
      occurredAt: new Date().toISOString(),
      type: "MISSING_SETTLEMENT",
      entityId: "not-a-uuid",
    })).toString("base64");
    const resBadCursor3 = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?cursor=${badCursorUuid}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(resBadCursor3.statusCode, 400);

    // Forbidden unknown parameter (forbidNonWhitelisted)
    const resUnknownParam = await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?injectedParam=malicious",
      headers: { cookie: adminCookie },
    });
    assert.equal(resUnknownParam.statusCode, 400);
  });

  // 3. All Five Discrepancy Types & Correct Timestamp Sources
  await t.test("3. Detection of all five discrepancy types and correct timestamp sources", async () => {
    const baseTime = new Date(Date.now() - 3600_000); // 1 hour ago
    const tMissing = new Date(baseTime.getTime() + 100_000);
    const tAmount = new Date(baseTime.getTime() + 200_000);
    const tOrphan = new Date(baseTime.getTime() + 300_000);
    const tStranded = new Date(baseTime.getTime() - 2500_000); // 45+ minutes ago
    const tConflicting = new Date(baseTime.getTime() + 500_000);

    // 1. MISSING_SETTLEMENT: SUCCEEDED attempt with no settlement
    const order1 = await seedOrder({ status: "PAID", amountTzs: 6000, updatedAt: tMissing });
    const attempt1 = await seedPaymentAttempt({
      orderId: order1,
      status: "SUCCEEDED",
      amountTzs: 6000,
      updatedAt: tMissing,
    });

    // 2. AMOUNT_MISMATCH: attempt amount != order amount
    const order2 = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000, updatedAt: tAmount });
    const attempt2 = await seedPaymentAttempt({
      orderId: order2,
      status: "PENDING",
      amountTzs: 4000, // mismatch
      updatedAt: tAmount,
    });

    // 3. ORPHAN_PAID_ORDER: order status PAID with no SUCCEEDED attempt
    const order3 = await seedOrder({ status: "PAID", amountTzs: 6000, updatedAt: tOrphan });

    // 4. STRANDED_UNKNOWN: attempt status UNKNOWN updated 45+ minutes ago
    const order4 = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000, updatedAt: tStranded });
    const attempt4 = await seedPaymentAttempt({
      orderId: order4,
      status: "UNKNOWN",
      amountTzs: 6000,
      updatedAt: tStranded,
    });

    // 5. CONFLICTING_SETTLEMENT_EVIDENCE: settlement with amount mismatch vs attempt
    const order5 = await seedOrder({ status: "PAID", amountTzs: 6000, updatedAt: baseTime });
    const attempt5 = await seedPaymentAttempt({
      orderId: order5,
      status: "SUCCEEDED",
      amountTzs: 6000,
      updatedAt: baseTime,
    });
    const settlement5 = await seedSettlement({
      paymentAttemptId: attempt5,
      amountTzs: 5000, // mismatch vs attempt's 6000
      recordedAt: tConflicting,
    });

    // Query across window containing all of them
    const windowStart = new Date(baseTime.getTime() - 3600_000);
    const windowEnd = new Date(Date.now() + 60_000);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?windowStart=${windowStart.toISOString()}&windowEnd=${windowEnd.toISOString()}&limit=100`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    const items = body.data.items as Array<{ type: string; entityId: string; occurredAt: string; details: any }>;

    const missingItem = items.find((i) => i.entityId === attempt1);
    assert.ok(missingItem, "MISSING_SETTLEMENT should be found");
    assert.equal(missingItem.type, "MISSING_SETTLEMENT");

    const amountItem = items.find((i) => i.entityId === attempt2);
    assert.ok(amountItem, "AMOUNT_MISMATCH should be found");
    assert.equal(amountItem.type, "AMOUNT_MISMATCH");

    const orphanItem = items.find((i) => i.entityId === order3);
    assert.ok(orphanItem, "ORPHAN_PAID_ORDER should be found");
    assert.equal(orphanItem.type, "ORPHAN_PAID_ORDER");

    const strandedItem = items.find((i) => i.entityId === attempt4);
    assert.ok(strandedItem, "STRANDED_UNKNOWN should be found");
    assert.equal(strandedItem.type, "STRANDED_UNKNOWN");

    const conflictingItem = items.find((i) => i.entityId === settlement5);
    assert.ok(conflictingItem, "CONFLICTING_SETTLEMENT_EVIDENCE should be found");
    assert.equal(conflictingItem.type, "CONFLICTING_SETTLEMENT_EVIDENCE");

    // Test specific type filter
    const filterRes = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=MISSING_SETTLEMENT&windowStart=${windowStart.toISOString()}&windowEnd=${windowEnd.toISOString()}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(filterRes.statusCode, 200);
    const filterItems = filterRes.json().data.items;
    assert.ok(filterItems.length > 0);
    for (const item of filterItems) {
      assert.equal(item.type, "MISSING_SETTLEMENT");
    }
  });

  // 4. Settlement Amount Mismatch when Payment Attempt Predates windowStart
  await t.test("4. Settlement amount mismatch detection when attempt predates windowStart", async () => {
    const historicalTime = new Date(Date.now() - 15 * 24 * 3600_000); // 15 days ago
    const queryWindowStart = new Date(Date.now() - 2 * 24 * 3600_000); // 2 days ago
    const settlementRecordedAt = new Date(Date.now() - 1 * 24 * 3600_000); // 1 day ago (within window)
    const queryWindowEnd = new Date();

    const order = await seedOrder({ status: "PAID", amountTzs: 10000, updatedAt: historicalTime });
    const attempt = await seedPaymentAttempt({
      orderId: order,
      status: "SUCCEEDED",
      amountTzs: 10000,
      updatedAt: historicalTime, // Predates windowStart by 13 days!
    });
    const settlement = await seedSettlement({
      paymentAttemptId: attempt,
      amountTzs: 5000, // Mismatch!
      recordedAt: settlementRecordedAt,
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?windowStart=${queryWindowStart.toISOString()}&windowEnd=${queryWindowEnd.toISOString()}&type=CONFLICTING_SETTLEMENT_EVIDENCE`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const items = res.json().data.items;
    const found = items.find((i: any) => i.entityId === settlement);
    assert.ok(found, "Settlement-originated mismatch MUST be detected even if attempt predates windowStart");
    assert.equal(found.details.settlementAmountTzs, 5000);
    assert.equal(found.details.attemptAmountTzs, 10000);
  });

  // 5. Inclusive windowStart and windowEnd Boundaries & Exclusion Immediately Outside
  await t.test("5. Inclusive boundary filtering and exclusion outside boundaries", async () => {
    const tStart = new Date("2026-05-10T12:00:00.000Z");
    const tEnd = new Date("2026-05-10T14:00:00.000Z");

    const tBefore = new Date("2026-05-10T11:59:59.990Z"); // 10ms before
    const tAtStart = new Date("2026-05-10T12:00:00.000Z"); // exact start
    const tAtEnd = new Date("2026-05-10T14:00:00.000Z"); // exact end
    const tAfter = new Date("2026-05-10T14:00:00.010Z"); // 10ms after

    const ordBefore = await seedOrder({ status: "PAID", updatedAt: tBefore });
    const ordStart = await seedOrder({ status: "PAID", updatedAt: tAtStart });
    const ordEnd = await seedOrder({ status: "PAID", updatedAt: tAtEnd });
    const ordAfter = await seedOrder({ status: "PAID", updatedAt: tAfter });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=ORPHAN_PAID_ORDER&windowStart=${tStart.toISOString()}&windowEnd=${tEnd.toISOString()}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const items = res.json().data.items;
    const ids = items.map((i: any) => i.entityId);

    assert.ok(ids.includes(ordStart), "Exact windowStart MUST be included");
    assert.ok(ids.includes(ordEnd), "Exact windowEnd MUST be included");
    assert.ok(!ids.includes(ordBefore), "Immediate millisecond before windowStart MUST be excluded");
    assert.ok(!ids.includes(ordAfter), "Immediate millisecond after windowEnd MUST be excluded");
  });

  // 6. STRANDED_UNKNOWN Threshold and Window Behavior
  await t.test("6. STRANDED_UNKNOWN 30-minute threshold and windowEnd bounding", async () => {
    const now = Date.now();
    const tRecentUnknown = new Date(now - 15 * 60_000); // 15 mins ago (<30m)
    const tStrandedPast = new Date(now - 45 * 60_000); // 45 mins ago (>30m)
    const tStrandedHistorical = new Date(now - 10 * 24 * 3600_000); // 10 days ago (>30m)

    const ordRecent = await seedOrder({ status: "PENDING_PAYMENT", updatedAt: tRecentUnknown });
    const attRecent = await seedPaymentAttempt({
      orderId: ordRecent,
      status: "UNKNOWN",
      updatedAt: tRecentUnknown,
    });

    const ordStranded = await seedOrder({ status: "PENDING_PAYMENT", updatedAt: tStrandedPast });
    const attStranded = await seedPaymentAttempt({
      orderId: ordStranded,
      status: "UNKNOWN",
      updatedAt: tStrandedPast,
    });

    const ordHist = await seedOrder({ status: "PENDING_PAYMENT", updatedAt: tStrandedHistorical });
    const attHist = await seedPaymentAttempt({
      orderId: ordHist,
      status: "UNKNOWN",
      updatedAt: tStrandedHistorical,
    });

    // Query with windowStart = 1 hour ago (tStrandedHistorical is well before windowStart)
    const windowStart = new Date(now - 3600_000);
    const windowEnd = new Date(now + 60_000);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=STRANDED_UNKNOWN&windowStart=${windowStart.toISOString()}&windowEnd=${windowEnd.toISOString()}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const ids = res.json().data.items.map((i: any) => i.entityId);

    assert.ok(!ids.includes(attRecent), "Attempt under 30 minutes in UNKNOWN must NOT be reported as STRANDED_UNKNOWN");
    assert.ok(ids.includes(attStranded), "Attempt over 30 minutes in UNKNOWN must be reported");
    assert.ok(ids.includes(attHist), "STRANDED_UNKNOWN must be exempt from windowStart lower bound to prevent indefinite stranding");

    // If windowEnd is earlier than tStrandedPast, it must be bounded by windowEnd
    const pastWindowEnd = new Date(now - 60 * 60_000); // 1 hour ago
    const resBounded = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=STRANDED_UNKNOWN&windowEnd=${pastWindowEnd.toISOString()}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(resBounded.statusCode, 200);
    const idsBounded = resBounded.json().data.items.map((i: any) => i.entityId);
    assert.ok(!idsBounded.includes(attStranded), "STRANDED_UNKNOWN updated after windowEnd must be excluded");
    assert.ok(idsBounded.includes(attHist), "Historical STRANDED_UNKNOWN updated before windowEnd must be included");
  });

  // 7. Deterministic Ordering When Timestamps Are Equal
  await t.test("7. Deterministic tie-breaking on identical timestamps (occurred_at ASC, type ASC, entity_id ASC)", async () => {
    const fixedTime = new Date("2026-06-01T10:00:00.000Z");

    const ord1 = await seedOrder({ status: "PAID", updatedAt: fixedTime }); // ORPHAN_PAID_ORDER
    const ord2 = await seedOrder({ status: "PAID", updatedAt: fixedTime });
    const att2 = await seedPaymentAttempt({
      orderId: ord2,
      status: "SUCCEEDED",
      updatedAt: fixedTime, // MISSING_SETTLEMENT
    });
    const ord3 = await seedOrder({ status: "PAID", updatedAt: fixedTime });
    const att3 = await seedPaymentAttempt({
      orderId: ord3,
      status: "SUCCEEDED",
      updatedAt: fixedTime, // MISSING_SETTLEMENT
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?windowStart=2026-06-01T09:59:00Z&windowEnd=2026-06-01T10:01:00Z`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const items = res.json().data.items;

    // Filter down to the 3 seeded items
    const testItems = items.filter((i: any) => [ord1, att2, att3].includes(i.entityId));
    assert.equal(testItems.length, 3);

    // MISSING_SETTLEMENT alphabetically precedes ORPHAN_PAID_ORDER
    assert.equal(testItems[0].type, "MISSING_SETTLEMENT");
    assert.equal(testItems[1].type, "MISSING_SETTLEMENT");
    assert.equal(testItems[2].type, "ORPHAN_PAID_ORDER");

    // Between the two MISSING_SETTLEMENT items, entity_id sorts ASC
    assert.ok(testItems[0].entityId < testItems[1].entityId);
  });

  // 8. Multiple-Page Traversal with No Missing or Duplicate Results
  await t.test("8. Keyset pagination traversal: complete results with zero duplicates or omissions", async () => {
    const baseTime = new Date("2026-07-01T00:00:00.000Z").getTime();
    const seededIds: string[] = [];

    for (let i = 0; i < 15; i++) {
      const itemTime = new Date(baseTime + i * 10_000);
      const ordId = await seedOrder({ status: "PAID", updatedAt: itemTime });
      seededIds.push(ordId);
    }

    const fetchedIds: string[] = [];
    let cursor: string | null = null;
    let pageCount = 0;

    const windowStart = new Date(baseTime - 10_000).toISOString();
    const windowEnd = new Date(baseTime + 200_000).toISOString();

    while (pageCount < 10) {
      pageCount++;
      const cursorParam: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/admin/reconciliation/discrepancies?type=ORPHAN_PAID_ORDER&limit=5&windowStart=${windowStart}&windowEnd=${windowEnd}${cursorParam}`,
        headers: { cookie: adminCookie },
      });
      assert.equal(res.statusCode, 200);
      const body = res.json().data;

      for (const item of body.items) {
        if (seededIds.includes(item.entityId)) {
          fetchedIds.push(item.entityId);
        }
      }

      if (!body.hasMore || !body.nextCursor) {
        break;
      }
      cursor = body.nextCursor;
    }

    // Verify all 15 items were retrieved
    assert.equal(fetchedIds.length, 15, "Must fetch all 15 seeded items");
    // Verify zero duplicates
    const uniqueIds = new Set(fetchedIds);
    assert.equal(uniqueIds.size, 15, "Must contain zero duplicates across pages");
    // Verify every seeded ID was retrieved
    for (const id of seededIds) {
      assert.ok(uniqueIds.has(id), `Missing item ${id} during pagination`);
    }
  });

  // 9. Actionable Diagnostic Details & Preliminary Repair Eligibility
  await t.test("9. Diagnostic details and preliminary passesBasicRepairChecks evaluation", async () => {
    const tNow = new Date();

    // Eligible: order is PAID, attempt SUCCEEDED, amount matches, provider event/reference present
    const ordEligible = await seedOrder({ status: "PAID", amountTzs: 6000, updatedAt: tNow });
    const attEligible = await seedPaymentAttempt({
      orderId: ordEligible,
      status: "SUCCEEDED",
      amountTzs: 6000,
      providerEventId: "evt-elig-" + randomUUID(),
      providerReference: "ref-elig-" + randomUUID(),
      updatedAt: tNow,
    });

    // Ineligible 1: order is NOT PAID
    const ordUnpaid = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000, updatedAt: tNow });
    const attUnpaid = await seedPaymentAttempt({
      orderId: ordUnpaid,
      status: "SUCCEEDED",
      amountTzs: 6000,
      updatedAt: tNow,
    });

    // Ineligible 2: amount mismatch
    const ordMismatch = await seedOrder({ status: "PAID", amountTzs: 8000, updatedAt: tNow });
    const attMismatch = await seedPaymentAttempt({
      orderId: ordMismatch,
      status: "SUCCEEDED",
      amountTzs: 6000, // mismatch
      updatedAt: tNow,
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=MISSING_SETTLEMENT&windowStart=${new Date(tNow.getTime() - 60_000).toISOString()}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const items = res.json().data.items;

    const itemEligible = items.find((i: any) => i.entityId === attEligible);
    assert.ok(itemEligible);
    assert.equal(itemEligible.details.passesBasicRepairChecks, true);
    assert.deepEqual(itemEligible.details.ineligibilityReasons, []);

    const itemUnpaid = items.find((i: any) => i.entityId === attUnpaid);
    assert.ok(itemUnpaid);
    assert.equal(itemUnpaid.details.passesBasicRepairChecks, false);
    assert.ok(itemUnpaid.details.ineligibilityReasons.includes("ORDER_NOT_PAID"));

    const itemMismatch = items.find((i: any) => i.entityId === attMismatch);
    assert.ok(itemMismatch);
    assert.equal(itemMismatch.details.passesBasicRepairChecks, false);
    assert.ok(itemMismatch.details.ineligibilityReasons.includes("AMOUNT_MISMATCH"));
  });

  // 10. Zero Writes Verification
  await t.test("10. Zero-write verification across all commercial and audit tables", async () => {
    async function getTableCounts(): Promise<Record<string, number>> {
      const auditCount = await pool.query("SELECT COUNT(*) FROM audit_events");
      const settlementsCount = await pool.query("SELECT COUNT(*) FROM settlements");
      const attemptsCount = await pool.query("SELECT COUNT(*) FROM payment_attempts");
      const ordersCount = await pool.query("SELECT COUNT(*) FROM orders");

      return {
        audit_events: parseInt(auditCount.rows[0].count, 10),
        settlements: parseInt(settlementsCount.rows[0].count, 10),
        payment_attempts: parseInt(attemptsCount.rows[0].count, 10),
        orders: parseInt(ordersCount.rows[0].count, 10),
      };
    }

    const beforeCounts = await getTableCounts();

    // Execute multiple diverse GET discrepancy requests
    await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies",
      headers: { cookie: adminCookie },
    });

    await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?type=MISSING_SETTLEMENT&limit=10",
      headers: { cookie: adminCookie },
    });

    await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?type=STRANDED_UNKNOWN",
      headers: { cookie: adminCookie },
    });

    // Execute an invalid request
    await app.inject({
      method: "GET",
      url: "/api/v1/admin/reconciliation/discrepancies?limit=0",
      headers: { cookie: adminCookie },
    });

    const afterCounts = await getTableCounts();

    assert.equal(afterCounts.audit_events, beforeCounts.audit_events, "audit_events count must not change");
    assert.equal(afterCounts.settlements, beforeCounts.settlements, "settlements count must not change");
    assert.equal(afterCounts.payment_attempts, beforeCounts.payment_attempts, "payment_attempts count must not change");
    assert.equal(afterCounts.orders, beforeCounts.orders, "orders count must not change");
  });

  // 11. Timestamp Proxy Semantics (Test 16 from approved plan)
  await t.test("11. Timestamp proxy semantics: post-transition row update shifts query window visibility", async () => {
    const t0 = new Date("2026-08-01T12:00:00.000Z");
    const t1 = new Date("2026-08-05T12:00:00.000Z"); // 4 days later

    const ord = await seedOrder({ status: "PAID", amountTzs: 6000, updatedAt: t0 });
    const att = await seedPaymentAttempt({
      orderId: ord,
      status: "SUCCEEDED",
      amountTzs: 6000,
      updatedAt: t0,
    });

    // Window around T0:
    const winT0Start = new Date("2026-08-01T11:00:00.000Z").toISOString();
    const winT0End = new Date("2026-08-01T13:00:00.000Z").toISOString();

    // Verify it is visible around T0
    const resT0Initial = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=MISSING_SETTLEMENT&windowStart=${winT0Start}&windowEnd=${winT0End}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(resT0Initial.statusCode, 200);
    const idsInitial = resT0Initial.json().data.items.map((i: any) => i.entityId);
    assert.ok(idsInitial.includes(att), "Attempt must be visible in window around T0 initially");

    // Touch/update attempt row at T1 (e.g. metadata refresh or note)
    await pool.query("UPDATE payment_attempts SET updated_at = $1 WHERE id = $2", [t1, att]);

    // Query window around T0 again: attempt must NO LONGER be returned in T0 window because updated_at advanced to T1!
    const resT0After = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=MISSING_SETTLEMENT&windowStart=${winT0Start}&windowEnd=${winT0End}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(resT0After.statusCode, 200);
    const idsAfterT0 = resT0After.json().data.items.map((i: any) => i.entityId);
    assert.ok(!idsAfterT0.includes(att), "Attempt must no longer be visible in T0 window after row update advances updated_at proxy");

    // Query window around T1: attempt must be returned in T1 window!
    const winT1Start = new Date("2026-08-05T11:00:00.000Z").toISOString();
    const winT1End = new Date("2026-08-05T13:00:00.000Z").toISOString();
    const resT1 = await app.inject({
      method: "GET",
      url: `/api/v1/admin/reconciliation/discrepancies?type=MISSING_SETTLEMENT&windowStart=${winT1Start}&windowEnd=${winT1End}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(resT1.statusCode, 200);
    const idsT1 = resT1.json().data.items.map((i: any) => i.entityId);
    assert.ok(idsT1.includes(att), "Attempt must be visible in window around T1 based on latest proxy timestamp");
  });

  // 12. Admin Repair Endpoint Success & Idempotency
  await t.test("12. Admin repair endpoint succeeds on valid missing settlement and is idempotent", async () => {
    const ord = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const att = await seedPaymentAttempt({
      orderId: ord,
      status: "SUCCEEDED",
      amountTzs: 6000,
      providerName: "simulated",
      providerEventId: "evt-repair-" + randomUUID(),
      providerReference: "ref-repair-" + randomUUID(),
    });

    // 1st repair call
    const res1 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att}/repair`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res1.statusCode, 200);
    const body1 = res1.json().data;
    assert.equal(body1.idempotentRepair, false);
    assert.ok(body1.settlement);
    assert.equal(body1.settlement.paymentAttemptId, att);
    assert.equal(body1.settlement.amountTzs, 6000);

    // Verify exactly 1 settlement and 1 audit event in database
    const s1 = await pool.query("SELECT * FROM settlements WHERE payment_attempt_id = $1", [att]);
    assert.equal(s1.rowCount, 1);
    const a1 = await pool.query(
      "SELECT * FROM audit_events WHERE action = 'RECONCILIATION_BACKFILL' AND resource_id = $1",
      [body1.settlement.id],
    );
    assert.equal(a1.rowCount, 1);
    assert.equal(a1.rows[0].actor_id, adminId);
    assert.equal(a1.rows[0].metadata.executionSource, "RECONCILIATION_MANUAL_REPAIR");

    // 2nd repair call (idempotent repeat)
    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att}/repair`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res2.statusCode, 200);
    const body2 = res2.json().data;
    assert.equal(body2.idempotentRepair, true);
    assert.equal(body2.settlement.id, body1.settlement.id);

    // Verify ZERO additional settlements and ZERO duplicate audit events written
    const s2 = await pool.query("SELECT count(*) FROM settlements WHERE payment_attempt_id = $1", [att]);
    assert.equal(parseInt(s2.rows[0].count, 10), 1);
    const a2 = await pool.query(
      "SELECT count(*) FROM audit_events WHERE action = 'RECONCILIATION_BACKFILL' AND resource_id = $1",
      [body1.settlement.id],
    );
    assert.equal(parseInt(a2.rows[0].count, 10), 1);
  });

  // 13. Admin Repair Authorization & RBAC
  await t.test("13. Admin repair endpoint enforces RBAC: rejects customer (403) and unauthenticated (401)", async () => {
    const ord = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const att = await seedPaymentAttempt({
      orderId: ord,
      status: "SUCCEEDED",
      amountTzs: 6000,
    });

    // Customer
    const resCust = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att}/repair`,
      headers: { cookie: customerCookie },
    });
    assert.equal(resCust.statusCode, 403);

    // Media team
    const resMedia = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att}/repair`,
      headers: { cookie: mediaTeamCookie },
    });
    assert.equal(resMedia.statusCode, 403);

    // Unauthenticated
    const resAnon = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att}/repair`,
    });
    assert.equal(resAnon.statusCode, 401);
  });

  // 14. Admin Repair Invariant Rejections
  await t.test("14. Admin repair endpoint rejects invalid invariant states", async () => {
    // Non-SUCCEEDED attempt (PENDING)
    const ord1 = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const att1 = await seedPaymentAttempt({ orderId: ord1, status: "PENDING", amountTzs: 6000 });
    const res1 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att1}/repair`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res1.statusCode, 409);
    assert.equal(res1.json().error.code, "INVALID_PAYMENT_ATTEMPT_TRANSITION");

    // Order not PAID (PENDING_PAYMENT)
    const ord2 = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000 });
    const att2 = await seedPaymentAttempt({ orderId: ord2, status: "SUCCEEDED", amountTzs: 6000 });
    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att2}/repair`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res2.statusCode, 409);
    assert.equal(res2.json().error.code, "INVALID_PAYMENT_ATTEMPT_TRANSITION");

    // Cross-table amount mismatch (pa.amount_tzs != o.amount_tzs)
    const ord3 = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const att3 = await seedPaymentAttempt({ orderId: ord3, status: "SUCCEEDED", amountTzs: 4000 });
    const res3 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att3}/repair`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res3.statusCode, 422);
    assert.equal(res3.json().error.code, "PAYMENT_AMOUNT_MISMATCH");

    // Missing providerReference on SUCCEEDED attempt
    const ord4 = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const att4 = await seedPaymentAttempt({
      orderId: ord4,
      status: "SUCCEEDED",
      amountTzs: 6000,
      providerReference: null,
    });
    const res4 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${att4}/repair`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res4.statusCode, 409);
    assert.equal(res4.json().error.code, "PROVIDER_REFERENCE_CONFLICT");

    // Non-existent attempt (404)
    const res5 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/reconciliation/settlements/${randomUUID()}/repair`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res5.statusCode, 404);
  });

  // 15. Replay of Legacy SUCCEEDED Attempt with Null Reference Rejected (Finding 2)
  await t.test("15. Replay of legacy SUCCEEDED attempt with null reference is rejected with 409", async () => {
    const evtId = "evt-legacy-" + randomUUID();
    const ord = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const att = await seedPaymentAttempt({
      orderId: ord,
      status: "SUCCEEDED",
      amountTzs: 6000,
      providerEventId: evtId,
      providerReference: null,
    });

    const replayRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${att}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: evtId,
        providerReference: "ref-new-" + randomUUID(),
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(replayRes.statusCode, 409);
    assert.equal(replayRes.json().error.code, "PROVIDER_REFERENCE_CONFLICT");

    // Assert zero mutations and zero audit logs
    const dbAttempt = await pool.query("SELECT * FROM payment_attempts WHERE id = $1", [att]);
    assert.equal(dbAttempt.rows[0].provider_reference, null);
    const auditRes = await pool.query("SELECT count(*) FROM audit_events WHERE resource_id = $1", [att]);
    assert.equal(parseInt(auditRes.rows[0].count, 10), 0);
  });

  // 16. First Confirmation Assigning Reference to Legacy Attempt with Null Reference (Finding 2)
  await t.test("16. First confirmation assigns reference to legacy PENDING attempt with null reference", async () => {
    const ord = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000 });
    const att = await seedPaymentAttempt({
      orderId: ord,
      status: "PENDING",
      amountTzs: 6000,
      providerEventId: null,
      providerReference: null,
    });

    const evtId = "evt-assign-" + randomUUID();
    const refId = "ref-assign-" + randomUUID();

    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${att}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: evtId,
        providerReference: refId,
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(confirmRes.statusCode, 200);
    const data = confirmRes.json().data;
    assert.equal(data.idempotentReplay, false);
    assert.equal(data.attempt.status, "SUCCEEDED");
    assert.equal(data.attempt.providerReference, refId);
    assert.ok(data.settlement);
    assert.equal(data.settlement.providerReference, refId);

    // Verify exactly 1 audit event written
    const auditRes = await pool.query("SELECT count(*) FROM audit_events WHERE resource_id = $1", [att]);
    assert.equal(parseInt(auditRes.rows[0].count, 10), 1);
  });

  // 17. Competing Reference Assignment Rejected (Finding 2)
  await t.test("17. Competing reference assignment across different attempts is rejected with 409", async () => {
    const sharedRef = "ref-shared-" + randomUUID();

    // First attempt takes sharedRef
    const ord1 = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000 });
    const att1 = await seedPaymentAttempt({
      orderId: ord1,
      status: "PENDING",
      amountTzs: 6000,
      providerReference: null,
    });
    const res1 = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${att1}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-comp-1-" + randomUUID(),
        providerReference: sharedRef,
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(res1.statusCode, 200);

    // Second attempt tries to use the same sharedRef
    const ord2 = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000 });
    const att2 = await seedPaymentAttempt({
      orderId: ord2,
      status: "PENDING",
      amountTzs: 6000,
      providerReference: null,
    });

    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${att2}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-comp-2-" + randomUUID(),
        providerReference: sharedRef,
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(res2.statusCode, 409);
    assert.equal(res2.json().error.code, "PROVIDER_REFERENCE_COLLISION");
  });

  // 18. DTO Reference Mismatch Rejected (Finding 2)
  await t.test("18. Confirmation rejects DTO reference mismatching persisted reference with 409", async () => {
    const ord = await seedOrder({ status: "PENDING_PAYMENT", amountTzs: 6000 });
    const att = await seedPaymentAttempt({
      orderId: ord,
      status: "PENDING",
      amountTzs: 6000,
      providerReference: "REF-PERSISTED-" + randomUUID(),
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/payment-attempts/${att}/simulate-confirm`,
      headers: { cookie: adminCookie },
      payload: {
        providerEventId: "evt-diff-" + randomUUID(),
        providerReference: "REF-DIFFERENT-" + randomUUID(),
        amountTzs: 6000,
        outcome: "SUCCEEDED",
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, "PROVIDER_REFERENCE_CONFLICT");
  });

  // 19. Settlement Immutability Trigger (Finding 1)
  await t.test("19. Settlement immutability trigger blocks direct UPDATE and DELETE", async () => {
    const ord = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const att = await seedPaymentAttempt({ orderId: ord, status: "SUCCEEDED", amountTzs: 6000 });
    const setlId = await seedSettlement({ paymentAttemptId: att, amountTzs: 6000 });

    // Attempt direct UPDATE -> should fail with P0001
    await assert.rejects(
      async () => {
        await pool.query("UPDATE settlements SET amount_tzs = 9999 WHERE id = $1", [setlId]);
      },
      (err: any) => {
        assert.equal(err.code, "P0001");
        return true;
      },
    );

    // Attempt direct DELETE -> should fail with P0001
    await assert.rejects(
      async () => {
        await pool.query("DELETE FROM settlements WHERE id = $1", [setlId]);
      },
      (err: any) => {
        assert.equal(err.code, "P0001");
        return true;
      },
    );
  });

  // 20. Concurrent Race between Replay Backfill and Admin Repair & Post-Rollback Recovery (Finding 4)
  await t.test("20. Concurrent race between replay backfill and admin repair resolves safely with post-rollback recovery", async () => {
    const ord = await seedOrder({ status: "PAID", amountTzs: 6000 });
    const evtId = "evt-race-" + randomUUID();
    const refId = "ref-race-" + randomUUID();
    const att = await seedPaymentAttempt({
      orderId: ord,
      status: "SUCCEEDED",
      amountTzs: 6000,
      providerEventId: evtId,
      providerReference: refId,
    });

    // Concurrently trigger simulateConfirm (replay backfill) and repair endpoint
    const [confirmRes, repairRes] = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/v1/payment-attempts/${att}/simulate-confirm`,
        headers: { cookie: adminCookie },
        payload: {
          providerEventId: evtId,
          providerReference: refId,
          amountTzs: 6000,
          outcome: "SUCCEEDED",
        },
      }),
      app.inject({
        method: "POST",
        url: `/api/v1/admin/reconciliation/settlements/${att}/repair`,
        headers: { cookie: adminCookie },
      }),
    ]);

    assert.equal(confirmRes.statusCode, 200);
    assert.equal(repairRes.statusCode, 200);

    // Exactly 1 settlement must exist in DB
    const settlementsInDb = await pool.query(
      "SELECT * FROM settlements WHERE payment_attempt_id = $1",
      [att],
    );
    assert.equal(settlementsInDb.rowCount, 1);

    // Exactly 1 audit event must exist (either SETTLEMENT_REPLAY_BACKFILL or RECONCILIATION_BACKFILL)
    const auditEvents = await pool.query(
      "SELECT * FROM audit_events WHERE (action = 'SETTLEMENT_REPLAY_BACKFILL' AND resource_id = $1) OR (action = 'RECONCILIATION_BACKFILL' AND metadata->>'paymentAttemptId' = $1)",
      [att],
    );
    assert.equal(auditEvents.rowCount, 1, "Exactly one audit event must be recorded across racing operations");
  });
});
