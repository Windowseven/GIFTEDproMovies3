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
import { DeviceService } from "../src/modules/identity/services/device.service.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

async function makeSessionCookie(pool: pg.Pool, userId: string, deviceId?: string | null): Promise<string> {
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    "INSERT INTO sessions (id, user_id, device_id, token_hash, expires_at, created_at, last_active_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', NOW(), NOW())",
    [randomUUID(), userId, deviceId ?? null, hash],
  );
  return "gifted_session=" + rawToken;
}

async function makeTrackedSession(
  pool: pg.Pool,
  userId: string,
  deviceId?: string | null,
): Promise<{ cookie: string; sessionId: string }> {
  const sessionId = randomUUID();
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    "INSERT INTO sessions (id, user_id, device_id, token_hash, expires_at, created_at, last_active_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', NOW(), NOW())",
    [sessionId, userId, deviceId ?? null, hash],
  );
  return { cookie: "gifted_session=" + rawToken, sessionId };
}

async function seedCatalogSubscription(
  pool: pg.Pool,
  params: {
    customerId: string;
    planVersionId: string;
    offerCode: string;
    orderId?: string;
    entitlementId?: string;
    startsAtOffsetDays?: number;
    expiresAtOffsetDays?: number;
    orderStatus?: string;
    entitlementStatus?: string;
    revocationReason?: string;
  },
) {
  const orderId = params.orderId ?? randomUUID();
  const entitlementId = params.entitlementId ?? randomUUID();
  const offerId = randomUUID();
  const snapId = randomUUID();
  const startsOffset = params.startsAtOffsetDays ?? -1;
  const expiresOffset = params.expiresAtOffsetDays ?? 29;
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
       VALUES ($1, $2, 'Catalog Offer', 'CATALOG', 'ALL_CATALOG', $3, 10000, 'active', NOW() - INTERVAL '1 day')`,
      [offerId, params.offerCode, params.planVersionId],
    );
    await client.query(
      `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, catalog_policy_snapshot_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
       VALUES ($1, $2, $3, $4, 'CATALOG', $5, $6, 10000, 30, 'DAY', $7)`,
      [
        orderId,
        params.customerId,
        offerId,
        params.orderStatus ?? "PAID",
        snapId,
        params.planVersionId,
        `idem-cat-${orderId.slice(0, 8)}`,
      ],
    );
    await client.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, status, starts_at, expires_at)
       VALUES ($1, $2, 'CATALOG', $3, NOW() + ($4 || ' days')::interval, NOW() + ($5 || ' days')::interval)
       ON CONFLICT DO NOTHING`,
      [
        entitlementId,
        params.customerId,
        params.entitlementStatus ?? "ACTIVE",
        startsOffset,
        expiresOffset,
      ],
    );
    await client.query(
      `INSERT INTO catalog_grants (id, order_id, entitlement_id, valid_from, valid_until, created_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval, NOW() + ($5 || ' days')::interval, NOW())`,
      [
        randomUUID(),
        orderId,
        entitlementId,
        startsOffset,
        expiresOffset,
      ],
    );
    await client.query(
      `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after)
       VALUES ($1, $2, $3, 'CREATED', NOW(), NOW() + ($4 || ' days')::interval)`,
      [
        randomUUID(),
        orderId,
        entitlementId,
        expiresOffset,
      ],
    );
    if (params.revocationReason) {
      await client.query(
        `INSERT INTO catalog_grant_revocations (id, order_id, revoked_at, revocation_reason)
         VALUES ($1, $2, NOW(), $3)`,
        [randomUUID(), orderId, params.revocationReason],
      );
    }
    await client.query("COMMIT");
    return { orderId, entitlementId, snapId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

test("Customer device limit enforcement, concurrency, and session revocation suite (CDL)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 15 });

  // 1. Seed test users
  const defaultUser = randomUUID();
  const customPlanUser = randomUUID();
  const singleDeviceUser = randomUUID();
  const concurrentRaceUser = randomUUID();
  const idorAttackerUser = randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES
     ($1, $2, 'hash', 'customer', 'active', NOW()),
     ($3, $4, 'hash', 'customer', 'active', NOW()),
     ($5, $6, 'hash', 'customer', 'active', NOW()),
     ($7, $8, 'hash', 'customer', 'active', NOW()),
     ($9, $10, 'hash', 'customer', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      defaultUser, `cdl-def-${defaultUser.slice(0, 8)}@giftedpro.test`,
      customPlanUser, `cdl-plan4-${customPlanUser.slice(0, 8)}@giftedpro.test`,
      singleDeviceUser, `cdl-plan1-${singleDeviceUser.slice(0, 8)}@giftedpro.test`,
      concurrentRaceUser, `cdl-race-${concurrentRaceUser.slice(0, 8)}@giftedpro.test`,
      idorAttackerUser, `cdl-idor-${idorAttackerUser.slice(0, 8)}@giftedpro.test`,
    ],
  );

  // 2. Seed Plans
  // Plan 4 devices
  const plan4Id = randomUUID();
  const planVersion4Id = randomUUID();
  await pool.query(
    `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Family Plan (4 Devices)') ON CONFLICT DO NOTHING`,
    [plan4Id, `PLAN_CDL_4_${plan4Id.slice(0, 6)}`],
  );
  await pool.query(
    `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
     VALUES ($1, $2, 1, 30, 'DAY', 10, 'UNIQUE_TITLES', 4, 4) ON CONFLICT DO NOTHING`,
    [planVersion4Id, plan4Id],
  );

  // Plan 1 device
  const plan1Id = randomUUID();
  const planVersion1Id = randomUUID();
  await pool.query(
    `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Single Mobile Plan (1 Device)') ON CONFLICT DO NOTHING`,
    [plan1Id, `PLAN_CDL_1_${plan1Id.slice(0, 6)}`],
  );
  await pool.query(
    `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
     VALUES ($1, $2, 1, 30, 'DAY', 2, 'UNIQUE_TITLES', 1, 1) ON CONFLICT DO NOTHING`,
    [planVersion1Id, plan1Id],
  );

  // Seed Content (Movie)
  const movieId = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES
     ($1, $2, 'movie', 'Test Device Movie', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [movieId, `cdl-mov-${movieId.slice(0, 8)}`, `slug-cdl-${movieId.slice(0, 8)}`, defaultUser],
  );

  // Seed Entitlement & Order for customPlanUser (4 devices, CATALOG subscription via helper)
  await seedCatalogSubscription(pool, {
    customerId: customPlanUser,
    planVersionId: planVersion4Id,
    offerCode: `OFF_CDL_4_${randomUUID().slice(0, 6)}`,
  });

  // Seed Entitlement & Order for singleDeviceUser (1 device, CATALOG subscription via helper)
  await seedCatalogSubscription(pool, {
    customerId: singleDeviceUser,
    planVersionId: planVersion1Id,
    offerCode: `OFF_CDL_1_${randomUUID().slice(0, 6)}`,
  });

  // 3. Initialize NestJS application
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const fastifyAdapter = new FastifyAdapter();
  const app: NestFastifyApplication = moduleRef.createNestApplication<NestFastifyApplication>(fastifyAdapter);
  await app.register(fastifyCookie);
  configureHttpApplication(app);
  const fastifyInstance = app.getHttpAdapter().getInstance();
  app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
  await app.init();
  await fastifyInstance.ready();

  const deviceService = app.get(DeviceService);

  t.after(async () => {
    await app.close();
    await pool.end();
  });

  await t.test("CDL-01: Default device limit of 2 is enforced when customer has no custom plan", async () => {
    // Register 1st device
    const dev1 = await deviceService.registerOrUpdateDevice(
      defaultUser,
      "dev-uuid-1",
      "Chrome on Mac",
      "desktop",
    );
    assert.ok(dev1.id);
    assert.equal(dev1.deviceIdentifier, "dev-uuid-1");

    // Register 2nd device
    const dev2 = await deviceService.registerOrUpdateDevice(
      defaultUser,
      "dev-uuid-2",
      "Safari on iPhone",
      "mobile",
    );
    assert.ok(dev2.id);
    assert.equal(dev2.deviceIdentifier, "dev-uuid-2");

    // Register 3rd device -> Must throw ForbiddenException DEVICE_LIMIT_EXCEEDED
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(
          defaultUser,
          "dev-uuid-3",
          "Firefox on Windows",
          "desktop",
        );
      },
      (err: any) => {
        assert.equal(err.status, 403);
        const resp = err.response;
        assert.equal(resp.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(resp.details.currentDeviceCount, 2);
        assert.equal(resp.details.maxDeviceLimit, 2);
        return true;
      },
    );

    // Verify DB count
    const res = await pool.query(`SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`, [defaultUser]);
    assert.equal(res.rows[0].cnt, 2);
  });

  await t.test("CDL-02: Existing device update does NOT consume a new slot (fast-path update)", async () => {
    // Update dev1 name
    const updated = await deviceService.registerOrUpdateDevice(
      defaultUser,
      "dev-uuid-1",
      "Chrome on macOS Sequoia",
      "desktop",
    );
    assert.equal(updated.deviceIdentifier, "dev-uuid-1");
    assert.equal(updated.deviceName, "Chrome on macOS Sequoia");

    // Total count remains 2
    const res = await pool.query(`SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`, [defaultUser]);
    assert.equal(res.rows[0].cnt, 2);
  });

  await t.test("CDL-03: Plan-based device limit = 4 is enforced for multi-device family plan", async () => {
    // Register 4 devices for customPlanUser
    for (let i = 1; i <= 4; i++) {
      const dev = await deviceService.registerOrUpdateDevice(
        customPlanUser,
        `plan4-dev-${i}`,
        `Device ${i}`,
        "mobile",
      );
      assert.ok(dev.id);
    }

    // 5th device must fail with maxDeviceLimit = 4
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(
          customPlanUser,
          "plan4-dev-5",
          "Device 5",
          "tablet",
        );
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.response.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(err.response.details.currentDeviceCount, 4);
        assert.equal(err.response.details.maxDeviceLimit, 4);
        return true;
      },
    );
  });

  await t.test("CDL-04: Plan-based device limit = 1 is strictly enforced", async () => {
    // 1st device succeeds
    const dev1 = await deviceService.registerOrUpdateDevice(
      singleDeviceUser,
      "single-dev-1",
      "Primary Phone",
      "mobile",
    );
    assert.ok(dev1.id);

    // 2nd device fails
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(
          singleDeviceUser,
          "single-dev-2",
          "Secondary Tablet",
          "tablet",
        );
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.response.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(err.response.details.currentDeviceCount, 1);
        assert.equal(err.response.details.maxDeviceLimit, 1);
        return true;
      },
    );
  });

  await t.test("CDL-05: Concurrent device registration race (5 parallel requests) deterministically serializes via advisory lock", async () => {
    // concurrentRaceUser has limit = 2 (default)
    const promises = Array.from({ length: 5 }, (_, i) =>
      deviceService
        .registerOrUpdateDevice(
          concurrentRaceUser,
          `race-dev-${i}`,
          `Concurrent Device ${i}`,
          "desktop",
        )
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, code: err?.response?.code ?? err?.message })),
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r): r is { success: false; code: any } => !r.success);

    assert.equal(successes.length, 2, "Exactly 2 concurrent requests must succeed");
    assert.equal(failures.length, 3, "Exactly 3 concurrent requests must fail");
    for (const f of failures) {
      assert.equal(f.code, "DEVICE_LIMIT_EXCEEDED");
    }

    // Verify database state: exactly 2 rows
    const res = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`,
      [concurrentRaceUser],
    );
    assert.equal(res.rows[0].cnt, 2);
  });

  await t.test("CDL-06: Concurrent duplicate registrations of the same device identifier succeed idempotently", async () => {
    const promises = Array.from({ length: 5 }, () =>
      deviceService.registerOrUpdateDevice(
        concurrentRaceUser,
        "race-dev-0", // already exists from CDL-05
        "Updated Race Device 0",
        "desktop",
      ),
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5);
    for (const r of results) {
      assert.equal(r.deviceIdentifier, "race-dev-0");
    }

    // Still exactly 2 rows in DB
    const res = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`,
      [concurrentRaceUser],
    );
    assert.equal(res.rows[0].cnt, 2);
  });

  await t.test("CDL-07: Device removal frees device slot, allowing subsequent registration", async () => {
    // defaultUser currently has 2 devices ("dev-uuid-1" and "dev-uuid-2")
    const [dev1Row] = (
      await pool.query(`SELECT id FROM devices WHERE user_id = $1 AND device_identifier = $2`, [
        defaultUser,
        "dev-uuid-1",
      ])
    ).rows;

    const cookie = await makeSessionCookie(pool, defaultUser);

    // Call DELETE /api/v1/devices/:id
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/devices/${dev1Row.id}`,
      headers: { cookie },
    });

    assert.equal(deleteRes.statusCode, 200);

    // Verify DB count is now 1
    const resAfter = await pool.query(`SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`, [defaultUser]);
    assert.equal(resAfter.rows[0].cnt, 1);

    // Now registering a new device must succeed!
    const newDev = await deviceService.registerOrUpdateDevice(
      defaultUser,
      "dev-uuid-new-slot",
      "Brand New Device",
      "mobile",
    );
    assert.ok(newDev.id);

    const resFinal = await pool.query(`SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`, [defaultUser]);
    assert.equal(resFinal.rows[0].cnt, 2);
  });

  await t.test("CDL-08: Device removal cascades session revocation for all sessions on that device", async () => {
    // Create a device for defaultUser
    const [devRow] = (
      await pool.query(`SELECT id FROM devices WHERE user_id = $1 AND device_identifier = $2`, [
        defaultUser,
        "dev-uuid-2",
      ])
    ).rows;

    // Create 2 sessions associated with devRow.id
    const s1 = await makeTrackedSession(pool, defaultUser, devRow.id);
    const s2 = await makeTrackedSession(pool, defaultUser, devRow.id);

    // Remove the device via service
    await deviceService.removeDevice(defaultUser, devRow.id);

    // Both sessions associated with devRow.id must now be revoked in DB and device_id nullified
    const sessions = await pool.query(
      `SELECT id, revoked_at, revoked_reason, device_id FROM sessions WHERE id = ANY($1::uuid[])`,
      [[s1.sessionId, s2.sessionId]],
    );
    assert.equal(sessions.rows.length, 2);
    for (const s of sessions.rows) {
      assert.ok(s.revoked_at, "Session must have revoked_at timestamp");
      assert.equal(s.revoked_reason, "device_removed");
      assert.equal(s.device_id, null, "Device ID should be nullified by foreign key onDelete: set null");
    }

    // Both sessions must be rejected with 401 Unauthorized upon subsequent requests
    const resAuth1 = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: s1.cookie },
    });
    assert.equal(resAuth1.statusCode, 401);

    const resAuth2 = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: s2.cookie },
    });
    assert.equal(resAuth2.statusCode, 401);
  });

  await t.test("CDL-09: IDOR protection: Customer cannot remove another customer's device", async () => {
    // customPlanUser has a device
    const [victimDev] = (
      await pool.query(`SELECT id FROM devices WHERE user_id = $1 LIMIT 1`, [customPlanUser])
    ).rows;

    const attackerCookie = await makeSessionCookie(pool, idorAttackerUser);

    // Attacker tries to DELETE victim's device
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/devices/${victimDev.id}`,
      headers: { cookie: attackerCookie },
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.body);
    assert.ok(body.error.message.includes("Device not found or not owned by user"));

    // Victim device remains in DB
    const check = await pool.query(`SELECT id FROM devices WHERE id = $1`, [victimDev.id]);
    assert.equal(check.rows.length, 1);
  });

  await t.test("CDL-10: GET /api/v1/devices returns device list with POD-07 limit metadata", async () => {
    // customPlanUser has a subscription with limit 4, and 4 devices registered from CDL-03
    const customUserCookie = await makeSessionCookie(pool, customPlanUser);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
      headers: { cookie: customUserCookie },
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.success, true);
    const data = json.data;
    assert.ok(Array.isArray(data.devices));
    assert.equal(data.devices.length, 4);
    assert.equal(data.effectiveLimit, 4);
    assert.equal(data.currentCount, 4);
    assert.equal(data.remainingSlots, 0);

    // Unauthenticated request returns 401
    const unauthRes = await app.inject({
      method: "GET",
      url: "/api/v1/devices",
    });
    assert.equal(unauthRes.statusCode, 401);
  });

  await t.test("POD07-01: One-time movie purchase with high device limit (limit=8) does NOT increase capacity; falls back to default 2", async () => {
    const movieOnlyUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [movieOnlyUser, `movie-only-${movieOnlyUser.slice(0, 8)}@giftedpro.test`],
    );

    const plan8Id = randomUUID();
    const planVersion8Id = randomUUID();
    await pool.query(
      `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Movie Purchase (8 Devices)')`,
      [plan8Id, `PLAN_MOV_8_${plan8Id.slice(0, 6)}`],
    );
    await pool.query(
      `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
       VALUES ($1, $2, 1, 30, 'DAY', 5, 'UNIQUE_TITLES', 8, 2)`,
      [planVersion8Id, plan8Id],
    );

    const movOfferId = randomUUID();
    const movOrderId = randomUUID();
    const movEntId = randomUUID();
    await pool.query(
      `INSERT INTO offers (id, code, name, target_kind, target_movie_content_id, plan_version_id, price_tzs, status, starts_at)
       VALUES ($1, $2, 'Movie 8 Offer', 'MOVIE', $3, $4, 15000, 'active', NOW() - INTERVAL '1 day')`,
      [movOfferId, `OFF_MOV_8_${movOfferId.slice(0, 6)}`, movieId, planVersion8Id],
    );
    await pool.query(
      `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
       VALUES ($1, $2, $3, 'PAID', 'MOVIE', $4, $5, 15000, 30, 'DAY', $6)`,
      [movOrderId, movieOnlyUser, movOfferId, movieId, planVersion8Id, `idem-mov8-${movOrderId.slice(0, 8)}`],
    );
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at)
       VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days')`,
      [movEntId, movieOnlyUser, movieId],
    );
    await pool.query(
      `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after)
       VALUES ($1, $2, $3, 'CREATED', NOW(), NOW() + INTERVAL '29 days')`,
      [randomUUID(), movOrderId, movEntId],
    );

    // POD-07 Rule: Effective limit must be 2 (default), NOT 8!
    const effectiveLimit = await deviceService.getEffectiveDeviceLimit(movieOnlyUser);
    assert.equal(effectiveLimit, 2, "One-time movie purchase must not increase device capacity beyond default (2)");

    // Register 2 devices
    await deviceService.registerOrUpdateDevice(movieOnlyUser, "mov-dev-1", "Device 1", "desktop");
    await deviceService.registerOrUpdateDevice(movieOnlyUser, "mov-dev-2", "Device 2", "mobile");

    // 3rd device must be rejected with 403
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(movieOnlyUser, "mov-dev-3", "Device 3", "tablet");
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.response.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(err.response.details.maxDeviceLimit, 2);
        return true;
      },
    );
  });

  await t.test("POD07-02: Active subscription (limit=3) with one-time purchase having higher device limit (limit=10) resolves to 3", async () => {
    const hybridUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [hybridUser, `hybrid-${hybridUser.slice(0, 8)}@giftedpro.test`],
    );

    // Subscription plan (limit = 3)
    const sub3PlanId = randomUUID();
    const sub3VerId = randomUUID();
    await pool.query(
      `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Standard Sub (3 Devices)')`,
      [sub3PlanId, `PLAN_SUB_3_${sub3PlanId.slice(0, 6)}`],
    );
    await pool.query(
      `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
       VALUES ($1, $2, 1, 30, 'DAY', 5, 'UNIQUE_TITLES', 3, 2)`,
      [sub3VerId, sub3PlanId],
    );

    await seedCatalogSubscription(pool, {
      customerId: hybridUser,
      planVersionId: sub3VerId,
      offerCode: `OFF_SUB_3_${randomUUID().slice(0, 6)}`,
    });

    // Movie plan with higher limit = 10
    const mov10PlanId = randomUUID();
    const mov10VerId = randomUUID();
    await pool.query(
      `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Movie High Device (10 Devices)')`,
      [mov10PlanId, `PLAN_MOV_10_${mov10PlanId.slice(0, 6)}`],
    );
    await pool.query(
      `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
       VALUES ($1, $2, 1, 30, 'DAY', 20, 'UNIQUE_TITLES', 10, 4)`,
      [mov10VerId, mov10PlanId],
    );
    const mov10OfferId = randomUUID();
    const mov10OrderId = randomUUID();
    const mov10EntId = randomUUID();
    await pool.query(
      `INSERT INTO offers (id, code, name, target_kind, target_movie_content_id, plan_version_id, price_tzs, status, starts_at)
       VALUES ($1, $2, 'Movie 10 Offer', 'MOVIE', $3, $4, 20000, 'active', NOW() - INTERVAL '1 day')`,
      [mov10OfferId, `OFF_MOV_10_${mov10OfferId.slice(0, 6)}`, movieId, mov10VerId],
    );
    await pool.query(
      `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
       VALUES ($1, $2, $3, 'PAID', 'MOVIE', $4, $5, 20000, 30, 'DAY', $6)`,
      [mov10OrderId, hybridUser, mov10OfferId, movieId, mov10VerId, `idem-mov10-${mov10OrderId.slice(0, 8)}`],
    );
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at)
       VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days')`,
      [mov10EntId, hybridUser, movieId],
    );
    await pool.query(
      `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, applied_at, expires_at_after)
       VALUES ($1, $2, $3, 'CREATED', NOW(), NOW() + INTERVAL '29 days')`,
      [randomUUID(), mov10OrderId, mov10EntId],
    );

    // POD-07 Rule: Limit must resolve to 3 (from subscription), NOT 10 (from movie purchase)!
    const effectiveLimit = await deviceService.getEffectiveDeviceLimit(hybridUser);
    assert.equal(effectiveLimit, 3, "Limit must resolve to active subscription limit (3), ignoring higher movie limit (10)");

    for (let i = 1; i <= 3; i++) {
      await deviceService.registerOrUpdateDevice(hybridUser, `hyb-dev-${i}`, `Device ${i}`, "mobile");
    }

    // 4th device must fail
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(hybridUser, "hyb-dev-4", "Device 4", "tablet");
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.response.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(err.response.details.maxDeviceLimit, 3);
        return true;
      },
    );
  });

  await t.test("POD07-03: Multiple active subscriptions with different device limits resolves to MAX (not additive)", async () => {
    const multiSubUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [multiSubUser, `multisub-${multiSubUser.slice(0, 8)}@giftedpro.test`],
    );

    // Plan A (limit = 3)
    const planAId = randomUUID();
    const verAId = randomUUID();
    await pool.query(
      `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Tier A Plan (3 Devices)')`,
      [planAId, `PLAN_A_${planAId.slice(0, 6)}`],
    );
    await pool.query(
      `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
       VALUES ($1, $2, 1, 30, 'DAY', 5, 'UNIQUE_TITLES', 3, 2)`,
      [verAId, planAId],
    );

    // Plan B (limit = 5)
    const planBId = randomUUID();
    const verBId = randomUUID();
    await pool.query(
      `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Tier B Plan (5 Devices)')`,
      [planBId, `PLAN_B_${planBId.slice(0, 6)}`],
    );
    await pool.query(
      `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
       VALUES ($1, $2, 1, 30, 'DAY', 10, 'UNIQUE_TITLES', 5, 3)`,
      [verBId, planBId],
    );

    // Shared CATALOG anchor
    const anchorId = randomUUID();
    await pool.query(
      `INSERT INTO entitlements (id, customer_id, target_kind, status, starts_at, expires_at)
       VALUES ($1, $2, 'CATALOG', 'ACTIVE', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days')`,
      [anchorId, multiSubUser],
    );

    // Sub A Order & Grant
    await seedCatalogSubscription(pool, {
      customerId: multiSubUser,
      planVersionId: verAId,
      offerCode: `OFF_A_${randomUUID().slice(0, 6)}`,
      entitlementId: anchorId,
    });

    // Sub B Order & Grant
    await seedCatalogSubscription(pool, {
      customerId: multiSubUser,
      planVersionId: verBId,
      offerCode: `OFF_B_${randomUUID().slice(0, 6)}`,
      entitlementId: anchorId,
    });

    // POD-07 Rule: MAX(3, 5) = 5 (limits are NOT additive 3+5=8)
    const effectiveLimit = await deviceService.getEffectiveDeviceLimit(multiSubUser);
    assert.equal(effectiveLimit, 5, "Multiple active subscriptions must resolve to MAX(3, 5) = 5, not additive (8)");

    for (let i = 1; i <= 5; i++) {
      await deviceService.registerOrUpdateDevice(multiSubUser, `multi-dev-${i}`, `Device ${i}`, "mobile");
    }

    // 6th device must fail
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(multiSubUser, "multi-dev-6", "Device 6", "desktop");
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.response.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(err.response.details.maxDeviceLimit, 5);
        return true;
      },
    );
  });

  await t.test("POD07-04: Expired, revoked, and cancelled subscriptions do NOT contribute to capacity", async () => {
    // 1. Expired subscription
    const expiredUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [expiredUser, `exp-${expiredUser.slice(0, 8)}@giftedpro.test`],
    );
    await seedCatalogSubscription(pool, {
      customerId: expiredUser,
      planVersionId: planVersion4Id,
      offerCode: `OFF_EXP_${randomUUID().slice(0, 6)}`,
      startsAtOffsetDays: -60,
      expiresAtOffsetDays: -30,
      entitlementStatus: "EXPIRED",
    });

    const expiredLimit = await deviceService.getEffectiveDeviceLimit(expiredUser);
    assert.equal(expiredLimit, 2, "Expired subscription must fall back to default limit (2)");

    // 2. Revoked subscription (via catalog_grant_revocations)
    const revokedUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [revokedUser, `rev-${revokedUser.slice(0, 8)}@giftedpro.test`],
    );
    await seedCatalogSubscription(pool, {
      customerId: revokedUser,
      planVersionId: planVersion4Id,
      offerCode: `OFF_REV_${randomUUID().slice(0, 6)}`,
      revocationReason: "Customer refund processed",
    });

    const revokedLimit = await deviceService.getEffectiveDeviceLimit(revokedUser);
    assert.equal(revokedLimit, 2, "Revoked subscription must fall back to default limit (2)");

    // 3. Cancelled/unpaid order
    const cancelledUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [cancelledUser, `can-${cancelledUser.slice(0, 8)}@giftedpro.test`],
    );
    await seedCatalogSubscription(pool, {
      customerId: cancelledUser,
      planVersionId: planVersion4Id,
      offerCode: `OFF_CAN_${randomUUID().slice(0, 6)}`,
      orderStatus: "CANCELLED",
    });

    const canLimit = await deviceService.getEffectiveDeviceLimit(cancelledUser);
    assert.equal(canLimit, 2, "Cancelled order must fall back to default limit (2)");
  });

  await t.test("POD07-05: Subscription expiry and resulting device-limit fallback preserves existing devices without silent eviction", async () => {
    const fallbackUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [fallbackUser, `fb-${fallbackUser.slice(0, 8)}@giftedpro.test`],
    );

    const { orderId: fbOrderId, entitlementId: fbAnchorId } = await seedCatalogSubscription(pool, {
      customerId: fallbackUser,
      planVersionId: planVersion4Id,
      offerCode: `OFF_FB_${randomUUID().slice(0, 6)}`,
    });

    // Initial limit with active plan is 4
    const initialLimit = await deviceService.getEffectiveDeviceLimit(fallbackUser);
    assert.equal(initialLimit, 4);

    // Register 3 devices (permitted under limit 4)
    await deviceService.registerOrUpdateDevice(fallbackUser, "fb-dev-1", "Device 1", "desktop");
    await deviceService.registerOrUpdateDevice(fallbackUser, "fb-dev-2", "Device 2", "mobile");
    await deviceService.registerOrUpdateDevice(fallbackUser, "fb-dev-3", "Device 3", "tablet");

    // Verify 3 devices registered
    const initialDbCount = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`,
      [fallbackUser],
    );
    assert.equal(initialDbCount.rows[0].cnt, 3);

    // Subscription revoked/ended via immutable revocation ledger
    await pool.query(
      `INSERT INTO catalog_grant_revocations (id, order_id, revocation_reason, revoked_at)
       VALUES ($1, $2, 'Subscription ended', NOW())`,
      [randomUUID(), fbOrderId],
    );
    await pool.query(
      `UPDATE entitlements SET expires_at = NOW() - INTERVAL '1 second', status = 'EXPIRED' WHERE id = $1`,
      [fbAnchorId],
    );

    // Effective limit now falls back to default = 2
    const expiredLimit = await deviceService.getEffectiveDeviceLimit(fallbackUser);
    assert.equal(expiredLimit, 2, "After subscription expiry, limit must fall back to default (2)");

    // Existing devices MUST NOT be silently evicted: DB count must still be 3!
    const postExpiryDbCount = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`,
      [fallbackUser],
    );
    assert.equal(postExpiryDbCount.rows[0].cnt, 3, "Existing devices must not be silently evicted upon plan expiry");

    // But attempting to register a 4th device must fail since currentCount (3) >= effectiveLimit (2)
    await assert.rejects(
      async () => {
        await deviceService.registerOrUpdateDevice(fallbackUser, "fb-dev-4", "Device 4", "mobile");
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.response.code, "DEVICE_LIMIT_EXCEEDED");
        assert.equal(err.response.details.currentDeviceCount, 3);
        assert.equal(err.response.details.maxDeviceLimit, 2);
        return true;
      },
    );
  });

  await t.test("POD07-06: Concurrent registration race at resolved subscription limit (limit = 4)", async () => {
    const raceUser = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'customer', 'active', NOW())`,
      [raceUser, `race4-${raceUser.slice(0, 8)}@giftedpro.test`],
    );

    await seedCatalogSubscription(pool, {
      customerId: raceUser,
      planVersionId: planVersion4Id,
      offerCode: `OFF_RACE_${randomUUID().slice(0, 6)}`,
    });

    // 8 concurrent requests for limit = 4
    const promises = Array.from({ length: 8 }, (_, i) =>
      deviceService
        .registerOrUpdateDevice(raceUser, `sub4-race-dev-${i}`, `Concurrent Dev ${i}`, "desktop")
        .then(() => ({ success: true }))
        .catch((err) => ({
          success: false,
          code: (err?.response as any)?.code ?? err?.code ?? err?.message,
          status: typeof err?.getStatus === "function" ? err.getStatus() : err?.status,
        })),
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r): r is { success: false; code: any; status: any } => !r.success);

    assert.equal(successes.length, 4, "Exactly 4 concurrent requests must succeed");
    assert.equal(failures.length, 4, "Exactly 4 concurrent requests must fail");
    for (const f of failures) {
      assert.equal(f.code, "DEVICE_LIMIT_EXCEEDED");
      assert.equal(f.status, 403);
    }

    const finalDbCount = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM devices WHERE user_id = $1`,
      [raceUser],
    );
    assert.equal(finalDbCount.rows[0].cnt, 4, "DB count must be exactly 4");
  });
});
