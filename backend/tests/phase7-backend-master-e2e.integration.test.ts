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
import { DeviceService } from "../src/modules/identity/services/device.service.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

async function makeSessionCookie(
  pool: pg.Pool,
  userId: string,
  deviceId?: string | null,
): Promise<{ cookie: string; sessionId: string }> {
  const sessionId = randomUUID();
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    `INSERT INTO sessions (id, user_id, device_id, token_hash, expires_at, created_at, last_active_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', NOW(), NOW())`,
    [sessionId, userId, deviceId ?? null, hash],
  );
  return { cookie: `gifted_session=${rawToken}`, sessionId };
}

test("Phase 7 Stage 2 Master Backend Completion & Integrated Security Suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  // 1. Seed test actors
  const customerAId = randomUUID();
  const customerBId = randomUUID();
  const adminId = randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
     VALUES ($1, $2, 'hash', 'customer', 'active', NOW()),
            ($3, $4, 'hash', 'customer', 'active', NOW()),
            ($5, $6, 'hash', 'admin', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      customerAId, `p7-cust-a-${customerAId.slice(0, 8)}@giftedpro.test`,
      customerBId, `p7-cust-b-${customerBId.slice(0, 8)}@giftedpro.test`,
      adminId, `p7-admin-${adminId.slice(0, 8)}@giftedpro.test`,
    ],
  );

  // 2. Seed catalog content and media edition
  const movieId = randomUUID();
  const editionId = randomUUID();

  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, description, poster_url, backdrop_url, trailer_url, status, created_by)
     VALUES ($1, $2, 'movie', 'Phase 7 Action Feature', $3, 'Test description', 'https://example.test/p7.jpg', 'https://example.test/b7.jpg', 'https://example.test/t7.mp4', 'published', $4)
     ON CONFLICT DO NOTHING`,
    [movieId, `p7-m-${movieId.slice(0, 8)}`, `p7-movie-${movieId.slice(0, 8)}`, adminId],
  );

  const djId = randomUUID();
  await pool.query(
    `INSERT INTO dj_voice_artists (id, name, stage_name, slug, bio, is_active)
     VALUES ($1, 'DJ Phase 7', 'DJ P7 Master', $2, 'Master DJ Bio', true)
     ON CONFLICT DO NOTHING`,
    [djId, `dj-p7-${djId.slice(0, 8)}`],
  );

  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, download_status, download_file_key)
     VALUES ($1, $2, $3, true, true, 'ready', 'ready', 'movies/downloads/phase7-feature-1080p.mp4')
     ON CONFLICT DO NOTHING`,
    [editionId, movieId, djId],
  );

  // 3. Seed Access Plan & Plan Version with Subscription (limit = 3 devices, download quota = 5 unique titles)
  const planId = randomUUID();
  const planVersionId = randomUUID();

  await pool.query(
    `INSERT INTO access_plans (id, code, name)
     VALUES ($1, $2, 'Phase 7 VIP Subscription')`,
    [planId, `PLAN_VIP_${planId.slice(0, 6)}`],
  );

  await pool.query(
    `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
     VALUES ($1, $2, 1, 30, 'DAY', 5, 'UNIQUE_TITLES', 3, 2)`,
    [planVersionId, planId],
  );

  const snapId = randomUUID();
  const offerId = randomUUID();
  const orderAId = randomUUID();
  const entitlementAId = randomUUID();
  const grantAId = randomUUID();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO commercial_policy_snapshots (id, policy_type, created_at)
       VALUES ($1, 'ALL_CATALOG', NOW())`,
      [snapId],
    );

    await client.query(
      `INSERT INTO offers (id, code, name, target_kind, catalog_policy_type, plan_version_id, price_tzs, status, starts_at)
       VALUES ($1, $2, 'VIP Offer', 'CATALOG', 'ALL_CATALOG', $3, 20000, 'active', NOW() - INTERVAL '1 day')`,
      [offerId, `OFF_VIP_${offerId.slice(0, 6)}`, planVersionId],
    );

    await client.query(
      `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, catalog_policy_snapshot_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
       VALUES ($1, $2, $3, 'PAID', 'CATALOG', $4, $5, 20000, 30, 'DAY', $6)`,
      [orderAId, customerAId, offerId, snapId, planVersionId, `idem-vip-${orderAId.slice(0, 8)}`],
    );

    await client.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, status, starts_at, expires_at)
       VALUES ($1, $2, 'CATALOG', 'ACTIVE', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days')`,
      [entitlementAId, customerAId],
    );

    await client.query(
      `INSERT INTO catalog_grants (id, entitlement_id, order_id, valid_from, valid_until)
       VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days')`,
      [grantAId, entitlementAId, orderAId],
    );

    await client.query(
      `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after)
       VALUES ($1, $2, $3, 'CREATED', NOW(), NOW() + INTERVAL '29 days')`,
      [randomUUID(), orderAId, entitlementAId],
    );
    await client.query("COMMIT");
  } finally {
    client.release();
  }

  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;
  let deviceService: DeviceService;

  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({
      disableRequestLogging: true,
      logController: new LogController({ disableRequestLogging: true }),
    }),
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
  await app.init();

  deviceService = moduleFixture.get(DeviceService);

  const customerASession = await makeSessionCookie(pool, customerAId);
  const customerBSession = await makeSessionCookie(pool, customerBId);

  t.after(async () => {
    await app.close();
    await pool.end();
  });

  // Helper to extract data from envelope
  function parseResponse<T = any>(res: { body: string }): T {
    const json = JSON.parse(res.body);
    return json.data !== undefined ? json.data : json;
  }

  // -------------------------------------------------------------
  // TEST JOURNEY 1: Commercial Access Evaluation & Library APIs
  // -------------------------------------------------------------
  await t.test("PJ-01: Commercial access evaluation returns granted = true for entitled customer", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/commercial/me/access/${movieId}`,
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.equal(body.granted, true);
    assert.equal(body.grantType, "CATALOG_GRANT");
    assert.equal(body.entitlementId, entitlementAId);
  });

  await t.test("PJ-02: Commercial access evaluation returns granted = false for unentitled Customer B", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/commercial/me/access/${movieId}`,
      headers: { cookie: customerBSession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.equal(body.granted, false);
    assert.equal(body.reason, "NO_ACTIVE_ENTITLEMENT");
  });

  await t.test("PJ-03: GET /api/v1/commercial/me/library returns active catalog grants and entitlements", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/commercial/me/library",
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.equal(body.customerId, customerAId);
    assert.equal(body.hasActiveCatalogAccess, true);
    assert.equal(body.catalogGrants.length, 1);
    assert.equal(body.catalogGrants[0].status, "ACTIVE");
    assert.equal(body.catalogGrants[0].orderId, orderAId);
  });

  // -------------------------------------------------------------
  // TEST JOURNEY 2: Recognized Device Limits & Management (POD-07)
  // -------------------------------------------------------------
  await t.test("PJ-04: GET /api/v1/devices returns initial device list and POD-07 limit metadata", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.ok(Array.isArray(body.devices));
    assert.equal(body.devices.length, 0);
    assert.equal(body.effectiveLimit, 3); // From VIP subscription plan
    assert.equal(body.currentCount, 0);
    assert.equal(body.remainingSlots, 3);
  });

  let registeredDev1Id: string;
  await t.test("PJ-05: Register devices up to effective plan limit (3 devices)", async () => {
    const dev1 = await deviceService.registerOrUpdateDevice(customerAId, "p7-macbook-pro", "MacBook Pro M3", "desktop");
    const dev2 = await deviceService.registerOrUpdateDevice(customerAId, "p7-iphone-16", "iPhone 16 Pro", "mobile");
    const dev3 = await deviceService.registerOrUpdateDevice(customerAId, "p7-ipad-air", "iPad Air", "tablet");

    registeredDev1Id = dev1.id;
    assert.ok(dev1.id);
    assert.ok(dev2.id);
    assert.ok(dev3.id);

    // Verify metadata update in GET /api/v1/devices
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.equal(body.devices.length, 3);
    assert.equal(body.effectiveLimit, 3);
    assert.equal(body.currentCount, 3);
    assert.equal(body.remainingSlots, 0);
  });

  await t.test("PJ-06: Attempting to register 4th device is rejected with 403 DEVICE_LIMIT_EXCEEDED", async () => {
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(customerAId, "p7-android-tv", "Living Room TV", "tv");
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.response.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(err.response.details.currentDeviceCount, 3);
        assert.equal(err.response.details.maxDeviceLimit, 3);
        return true;
      },
    );
  });

  // -------------------------------------------------------------
  // TEST JOURNEY 3: Real R2 Download Authorization & Delivery Reporting
  // -------------------------------------------------------------
  let downloadAttemptId: string;
  await t.test("PJ-07: Customer A authorizes download and receives 900s R2 presigned URL", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerASession.cookie },
      payload: {
        contentId: movieId,
        editionId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.equal(body.authorized, true);
    assert.ok(body.downloadUrl.includes("r2.cloudflarestorage.com"));
    assert.ok(body.downloadToken);
    assert.equal(body.downloadLimit, 5);
    assert.equal(body.downloadLimitType, "UNIQUE_TITLES");
    assert.ok(body.attemptId);
    downloadAttemptId = body.attemptId;

    // Verify token expiry is ~900s
    const expiresAt = new Date(body.expiresAt).getTime();
    const now = Date.now();
    const diffSeconds = (expiresAt - now) / 1000;
    assert.ok(diffSeconds > 800 && diffSeconds <= 900);
  });

  await t.test("PJ-08: Security: Presigned download URL is NOT exposed in audit log metadata", async () => {
    const auditRows = (
      await pool.query(
        `SELECT metadata FROM audit_events WHERE action = 'CUSTOMER_MEDIA_DOWNLOAD_AUTHORIZED' AND actor_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [customerAId],
      )
    ).rows;

    assert.equal(auditRows.length, 1);
    const metadataStr = JSON.stringify(auditRows[0].metadata);
    assert.ok(!metadataStr.includes("r2.cloudflarestorage.com"), "Download URL must never be logged in audit tables");
    assert.ok(!metadataStr.includes("X-Amz-Signature"), "SigV4 parameters must never be logged");
  });

  await t.test("PJ-09: Customer A reports successful delivery to POST /api/v1/download/report-delivery", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/report-delivery",
      headers: { cookie: customerASession.cookie },
      payload: {
        attemptId: downloadAttemptId,
        status: "COMPLETED",
      },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.equal(body.status, "COMPLETED");
    assert.equal(body.retryEligible, false);

    const dbRow = (
      await pool.query(`SELECT status, completed_at FROM download_attempts WHERE id = $1`, [downloadAttemptId])
    ).rows[0];
    assert.equal(dbRow.status, "COMPLETED");
    assert.ok(dbRow.completed_at);
  });

  // -------------------------------------------------------------
  // TEST JOURNEY 4: Customer Library Download Licenses & History
  // -------------------------------------------------------------
  await t.test("PJ-10: GET /api/v1/download/licenses reflects active license and decremented quota (4/5)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/download/licenses",
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.ok(Array.isArray(body.licenses));
    assert.equal(body.licenses.length, 1);
    const license = body.licenses[0];
    assert.equal(license.orderId, orderAId);
    assert.equal(license.downloadLimit, 5);
    assert.equal(license.quotaRemaining, 4);
    assert.equal(license.latestAttemptStatus, "COMPLETED");
  });

  await t.test("PJ-11: GET /api/v1/download/history returns paginated audit records", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/download/history?page=1&limit=10",
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.ok(Array.isArray(body.downloads));
    assert.equal(body.downloads.length, 1);
    assert.equal(body.downloads[0].attemptId, downloadAttemptId);
    assert.equal(body.downloads[0].status, "COMPLETED");
    assert.equal(body.pagination.total, 1);
  });

  // -------------------------------------------------------------
  // TEST JOURNEY 5: Adversarial IDOR & Cross-Customer Isolation
  // -------------------------------------------------------------
  await t.test("PJ-12: Adversarial IDOR: Customer B cannot report delivery for Customer A's attempt (404)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/report-delivery",
      headers: { cookie: customerBSession.cookie },
      payload: {
        attemptId: downloadAttemptId,
        status: "COMPLETED",
      },
    });

    assert.equal(res.statusCode, 404);
  });

  await t.test("PJ-13: Adversarial IDOR: Customer B cannot view Customer A's download history", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/download/history",
      headers: { cookie: customerBSession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const body = parseResponse(res);
    assert.equal(body.downloads.length, 0);
    assert.equal(body.pagination.total, 0);
  });

  await t.test("PJ-14: Adversarial IDOR: Customer B cannot delete Customer A's registered device (404)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/devices/${registeredDev1Id}`,
      headers: { cookie: customerBSession.cookie },
    });

    assert.equal(res.statusCode, 404);

    const check = (await pool.query(`SELECT id FROM devices WHERE id = $1`, [registeredDev1Id])).rows;
    assert.equal(check.length, 1);
  });

  // -------------------------------------------------------------
  // TEST JOURNEY 6: Device Removal & Session Revocation
  // -------------------------------------------------------------
  await t.test("PJ-15: Customer A removes registered device: frees up slot and revokes linked session", async () => {
    // Create a tracked session specifically linked to registeredDev1Id
    const linkedSession = await makeSessionCookie(pool, customerAId, registeredDev1Id);

    // Call DELETE /api/v1/devices/:id
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/devices/${registeredDev1Id}`,
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);

    // Verify slot is freed up: currentCount is 2, remainingSlots is 1
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(listRes.statusCode, 200);
    const body = parseResponse(listRes);
    assert.equal(body.devices.length, 2);
    assert.equal(body.currentCount, 2);
    assert.equal(body.remainingSlots, 1);

    // Linked session must be revoked
    const linkedAuthRes = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: linkedSession.cookie },
    });
    assert.equal(linkedAuthRes.statusCode, 401, "Linked session must be rejected with 401 after device removal");
  });

  // -------------------------------------------------------------
  // TEST JOURNEY 7: Strict Customer Streaming Lockout (Phase 8 Invariant)
  // -------------------------------------------------------------
  await t.test("PJ-16: Customer streaming route enforces 503 STREAMING_COMING_SOON", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/playback/authorize",
      headers: { cookie: customerASession.cookie },
      payload: {
        contentId: movieId,
      },
    });

    assert.equal(res.statusCode, 503);
    const json = JSON.parse(res.body);
    assert.equal(json.success, false);
    assert.ok(json.error.code === "STREAMING_COMING_SOON" || json.error.code === "SERVICE_UNAVAILABLE");
    assert.ok(json.error.message.includes("STREAMING_COMING_SOON") || json.error.message.includes("temporarily unavailable"));
  });

  // -------------------------------------------------------------
  // TEST JOURNEY 8: Session Logout & Cookie Clearing
  // -------------------------------------------------------------
  await t.test("PJ-17: POST /api/v1/auth/logout revokes session and clears cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie: customerASession.cookie },
    });

    assert.equal(res.statusCode, 200);
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie);
    assert.ok(String(setCookie).includes("gifted_session=;"));

    // Subsequent request with the same cookie must be rejected with 401
    const subsequentRes = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: customerASession.cookie },
    });
    assert.equal(subsequentRes.statusCode, 401);
  });
});
