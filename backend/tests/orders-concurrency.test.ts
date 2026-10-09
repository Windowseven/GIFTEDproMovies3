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

test("Orders deterministic concurrency & snapshot consistency suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const adminId = randomUUID();
  const customerId = randomUUID();
  await pool.query(
    "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES " +
    "($1, $2, 'hash', 'admin', 'active', NOW()), " +
    "($3, $4, 'hash', 'customer', 'active', NOW()) " +
    "ON CONFLICT DO NOTHING",
    [
      adminId, "admin-conc-" + adminId.slice(0, 8) + "@giftedpro.test",
      customerId, "customer-conc-" + customerId.slice(0, 8) + "@giftedpro.test",
    ],
  );

  const planId = randomUUID();
  const planVersionId = randomUUID();
  await pool.query(
    "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Concurrency Plan') ON CONFLICT DO NOTHING",
    [planId, "PLAN_CNC_" + randomUUID().slice(0, 6).toUpperCase()],
  );
  await pool.query(
    "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 5, 2, 2) ON CONFLICT DO NOTHING",
    [planVersionId, planId],
  );

  const customerCookie = await makeSessionCookie(pool, customerId);

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

  // Helper to install and teardown the deterministic coordination barrier trigger
  const BARRIER_LOCK_ID = 88776655n;

  async function installBarrierTrigger(barrierPool: pg.Pool) {
    const client = await barrierPool.connect();
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION test_coordination_barrier_fn() RETURNS TRIGGER AS $$
        BEGIN
          PERFORM pg_advisory_lock(${BARRIER_LOCK_ID});
          PERFORM pg_advisory_unlock(${BARRIER_LOCK_ID});
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await client.query(`
        CREATE TRIGGER test_trg_coordination_barrier
        BEFORE INSERT ON commercial_policy_snapshots
        FOR EACH ROW
        EXECUTE FUNCTION test_coordination_barrier_fn();
      `);
    } finally {
      client.release();
    }
  }

  async function removeBarrierTrigger(barrierPool: pg.Pool) {
    const client = await barrierPool.connect();
    try {
      await client.query("DROP TRIGGER IF EXISTS test_trg_coordination_barrier ON commercial_policy_snapshots");
      await client.query("DROP FUNCTION IF EXISTS test_coordination_barrier_fn()");
    } finally {
      client.release();
    }
  }

  await t.test("Test A — Policy membership mutation: concurrent category removal is isolated by transaction snapshot", async () => {
    const cat1Id = randomUUID();
    const cat2Id = randomUUID();
    await pool.query(
      "INSERT INTO categories (id, name, slug, is_active, display_order) VALUES ($1, $2, $3, true, 1), ($4, $5, $6, true, 2)",
      [cat1Id, "Conc Cat 1 " + cat1Id.slice(0, 6), "cc1-" + cat1Id.slice(0, 8), cat2Id, "Conc Cat 2 " + cat2Id.slice(0, 6), "cc2-" + cat2Id.slice(0, 8)],
    );

    const mov1Id = randomUUID();
    const mov2Id = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES " +
      "($1, $2, 'movie', 'Conc Mov 1', $3, 'published', $4), " +
      "($5, $6, 'movie', 'Conc Mov 2', $7, 'published', $4)",
      [mov1Id, "m1-" + mov1Id.slice(0, 8), "slug-m1-" + mov1Id.slice(0, 8), adminId, mov2Id, "m2-" + mov2Id.slice(0, 8), "slug-m2-" + mov2Id.slice(0, 8)],
    );
    await pool.query("INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2), ($3, $4)", [mov1Id, cat1Id, mov2Id, cat2Id]);

    const offerId = randomUUID();
    const setupClient = await pool.connect();
    try {
      await setupClient.query("BEGIN");
      await setupClient.query(
        "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, catalog_policy_type, plan_version_id, price_tzs) VALUES " +
        "($1, $2, 'Conc Cat Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'CATEGORY_SET', $3, 5000)",
        [offerId, "OFF_CNC_CAT_" + offerId.slice(0, 6).toUpperCase(), planVersionId],
      );
      await setupClient.query("INSERT INTO offer_catalog_policy_category_members (offer_id, category_id) VALUES ($1, $2), ($1, $3)", [offerId, cat1Id, cat2Id]);
      await setupClient.query("COMMIT");
    } finally {
      setupClient.release();
    }

    await installBarrierTrigger(pool);

    const coordinator = await pool.connect();
    try {
      // 1. Coordinator acquires advisory lock to hold the barrier
      await coordinator.query("SELECT pg_advisory_lock($1)", [BARRIER_LOCK_ID.toString()]);

      // 2. Launch order request in background
      const orderPromise = app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { cookie: customerCookie },
        payload: { offerId, idempotencyKey: "test-a-" + randomUUID() },
      });

      // 3. Wait for order transaction to reach the barrier
      let reached = false;
      for (let i = 0; i < 50; i++) {
        const check = await pool.query(
          "SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted = false",
          [Number(BARRIER_LOCK_ID)],
        );
        if (parseInt(check.rows[0].count, 10) > 0) {
          reached = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 20));
      }
      assert.ok(reached, "Order transaction must reach the coordination barrier");

      // 4. Coordinator concurrently deletes category member C2 from offer and commits
      const mutClient = await pool.connect();
      try {
        await mutClient.query("BEGIN");
        await mutClient.query(
          "DELETE FROM offer_catalog_policy_category_members WHERE offer_id = $1 AND category_id = $2",
          [offerId, cat2Id],
        );
        await mutClient.query("COMMIT");
      } finally {
        mutClient.release();
      }

      // 5. Release barrier so order transaction proceeds
      await coordinator.query("SELECT pg_advisory_unlock($1)", [BARRIER_LOCK_ID.toString()]);

      // 6. Await order response
      const orderRes = await orderPromise;
      assert.equal(orderRes.statusCode, 201);
      const order = orderRes.json().data;

      // 7. Verify snapshot consistency: Under REPEATABLE READ snapshot, C2 is still captured because
      // the snapshot was anchored at transaction start before coordinator committed the deletion!
      const snapCats = await pool.query(
        "SELECT category_id FROM commercial_policy_snapshot_categories WHERE snapshot_id = $1 ORDER BY category_id",
        [order.catalogPolicySnapshotId],
      );
      assert.equal(snapCats.rowCount, 2);
      const recordedCats = snapCats.rows.map((r) => r.category_id).sort();
      assert.deepEqual(recordedCats, [cat1Id, cat2Id].sort());

      const snapCnts = await pool.query(
        "SELECT content_id FROM commercial_policy_snapshot_contents WHERE snapshot_id = $1 ORDER BY content_id",
        [order.catalogPolicySnapshotId],
      );
      assert.equal(snapCnts.rowCount, 2);
      const recordedCnts = snapCnts.rows.map((r) => r.content_id).sort();
      assert.deepEqual(recordedCnts, [mov1Id, mov2Id].sort());
    } finally {
      coordinator.release();
      await removeBarrierTrigger(pool);
    }
  });

  await t.test("Test B — Content publication mutation: concurrent publishing state change is isolated", async () => {
    const catId = randomUUID();
    await pool.query(
      "INSERT INTO categories (id, name, slug, is_active, display_order) VALUES ($1, $2, $3, true, 1)",
      [catId, "Unpub Cat " + catId.slice(0, 6), "upc-" + catId.slice(0, 8)],
    );

    const mov1Id = randomUUID();
    const mov2Id = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES " +
      "($1, $2, 'movie', 'Mov 1', $3, 'draft', $4), " +
      "($5, $6, 'movie', 'Mov 2', $7, 'published', $4)",
      [mov1Id, "m1-" + mov1Id.slice(0, 8), "slug-m1-" + mov1Id.slice(0, 8), adminId, mov2Id, "m2-" + mov2Id.slice(0, 8), "slug-m2-" + mov2Id.slice(0, 8)],
    );
    await pool.query("INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2), ($3, $2)", [mov1Id, catId, mov2Id]);

    const offerId = randomUUID();
    const setupClient = await pool.connect();
    try {
      await setupClient.query("BEGIN");
      await setupClient.query(
        "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, catalog_policy_type, plan_version_id, price_tzs) VALUES " +
        "($1, $2, 'Unpub Cat Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'CATEGORY_SET', $3, 4000)",
        [offerId, "OFF_UPB_" + offerId.slice(0, 6).toUpperCase(), planVersionId],
      );
      await setupClient.query("INSERT INTO offer_catalog_policy_category_members (offer_id, category_id) VALUES ($1, $2)", [offerId, catId]);
      await setupClient.query("COMMIT");
    } finally {
      setupClient.release();
    }

    await installBarrierTrigger(pool);

    const coordinator = await pool.connect();
    try {
      await coordinator.query("SELECT pg_advisory_lock($1)", [BARRIER_LOCK_ID.toString()]);

      const orderPromise = app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { cookie: customerCookie },
        payload: { offerId, idempotencyKey: "test-b-" + randomUUID() },
      });

      // Wait until order transaction is paused at barrier
      for (let i = 0; i < 50; i++) {
        const check = await pool.query(
          "SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted = false",
          [Number(BARRIER_LOCK_ID)],
        );
        if (parseInt(check.rows[0].count, 10) > 0) break;
        await new Promise((r) => setTimeout(r, 20));
      }

      // Concurrently promote mov1 from 'draft' to 'published' and commit
      const mutClient = await pool.connect();
      try {
        await mutClient.query("UPDATE content SET status = 'published' WHERE id = $1", [mov1Id]);
      } finally {
        mutClient.release();
      }

      // Release barrier
      await coordinator.query("SELECT pg_advisory_unlock($1)", [BARRIER_LOCK_ID.toString()]);

      const orderRes = await orderPromise;
      assert.equal(orderRes.statusCode, 201);
      const order = orderRes.json().data;

      // Under REPEATABLE READ, mov1 was 'draft' at transaction start, so it is NOT captured.
      // Under READ COMMITTED, statement 4 would have seen 'published' and captured mov1 (failing this assertion)!
      const snapCnts = await pool.query(
        "SELECT content_id FROM commercial_policy_snapshot_contents WHERE snapshot_id = $1",
        [order.catalogPolicySnapshotId],
      );
      assert.equal(snapCnts.rowCount, 1);
      assert.equal(snapCnts.rows[0].content_id, mov2Id);
    } finally {
      coordinator.release();
      await removeBarrierTrigger(pool);
    }
  });

  await t.test("Test C — Content-category association mutation: concurrent link is isolated", async () => {
    const catId = randomUUID();
    await pool.query(
      "INSERT INTO categories (id, name, slug, is_active, display_order) VALUES ($1, $2, $3, true, 1)",
      [catId, "Assoc Cat " + catId.slice(0, 6), "asc-" + catId.slice(0, 8)],
    );

    const mov1Id = randomUUID();
    const mov2Id = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES " +
      "($1, $2, 'movie', 'Assoc Mov 1', $3, 'published', $4), " +
      "($5, $6, 'movie', 'Assoc Mov 2', $7, 'published', $4)",
      [mov1Id, "m1-" + mov1Id.slice(0, 8), "slug-m1-" + mov1Id.slice(0, 8), adminId, mov2Id, "m2-" + mov2Id.slice(0, 8), "slug-m2-" + mov2Id.slice(0, 8)],
    );
    // Initially only mov1 is in catId
    await pool.query("INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)", [mov1Id, catId]);

    const offerId = randomUUID();
    const setupClient = await pool.connect();
    try {
      await setupClient.query("BEGIN");
      await setupClient.query(
        "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, catalog_policy_type, plan_version_id, price_tzs) VALUES " +
        "($1, $2, 'Assoc Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'CATEGORY_SET', $3, 4500)",
        [offerId, "OFF_ASC_" + offerId.slice(0, 6).toUpperCase(), planVersionId],
      );
      await setupClient.query("INSERT INTO offer_catalog_policy_category_members (offer_id, category_id) VALUES ($1, $2)", [offerId, catId]);
      await setupClient.query("COMMIT");
    } finally {
      setupClient.release();
    }

    await installBarrierTrigger(pool);

    const coordinator = await pool.connect();
    try {
      await coordinator.query("SELECT pg_advisory_lock($1)", [BARRIER_LOCK_ID.toString()]);

      const orderPromise = app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { cookie: customerCookie },
        payload: { offerId, idempotencyKey: "test-c-" + randomUUID() },
      });

      for (let i = 0; i < 50; i++) {
        const check = await pool.query(
          "SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted = false",
          [Number(BARRIER_LOCK_ID)],
        );
        if (parseInt(check.rows[0].count, 10) > 0) break;
        await new Promise((r) => setTimeout(r, 20));
      }

      // Concurrently associate mov2 with catId and commit
      const mutClient = await pool.connect();
      try {
        await mutClient.query("INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)", [mov2Id, catId]);
      } finally {
        mutClient.release();
      }

      await coordinator.query("SELECT pg_advisory_unlock($1)", [BARRIER_LOCK_ID.toString()]);

      const orderRes = await orderPromise;
      assert.equal(orderRes.statusCode, 201);
      const order = orderRes.json().data;

      // Under REPEATABLE READ, mov2 was NOT associated at transaction snapshot start; only mov1 is in snapshot!
      const snapCnts = await pool.query(
        "SELECT content_id FROM commercial_policy_snapshot_contents WHERE snapshot_id = $1",
        [order.catalogPolicySnapshotId],
      );
      assert.equal(snapCnts.rowCount, 1);
      assert.equal(snapCnts.rows[0].content_id, mov1Id);
    } finally {
      coordinator.release();
      await removeBarrierTrigger(pool);
    }
  });

  await t.test("Test D — Empty category resolution: 0 contents validly handled without violating triggers", async () => {
    const emptyCatId = randomUUID();
    await pool.query(
      "INSERT INTO categories (id, name, slug, is_active, display_order) VALUES ($1, $2, $3, true, 1)",
      [emptyCatId, "Empty Cat " + emptyCatId.slice(0, 6), "emp-" + emptyCatId.slice(0, 8)],
    );

    const offerId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, catalog_policy_type, plan_version_id, price_tzs) VALUES " +
        "($1, $2, 'Empty Cat Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'CATEGORY_SET', $3, 3000)",
        [offerId, "OFF_EMP_" + offerId.slice(0, 6).toUpperCase(), planVersionId],
      );
      await client.query("INSERT INTO offer_catalog_policy_category_members (offer_id, category_id) VALUES ($1, $2)", [offerId, emptyCatId]);
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const orderRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: { offerId, idempotencyKey: "test-d-" + randomUUID() },
    });
    assert.equal(orderRes.statusCode, 201);
    const order = orderRes.json().data;

    const snapCats = await pool.query(
      "SELECT category_id FROM commercial_policy_snapshot_categories WHERE snapshot_id = $1",
      [order.catalogPolicySnapshotId],
    );
    assert.equal(snapCats.rowCount, 1);
    assert.equal(snapCats.rows[0].category_id, emptyCatId);

    const snapCnts = await pool.query(
      "SELECT COUNT(*) FROM commercial_policy_snapshot_contents WHERE snapshot_id = $1",
      [order.catalogPolicySnapshotId],
    );
    assert.equal(parseInt(snapCnts.rows[0].count, 10), 0);
  });

  await t.test("Test E — SQLSTATE 40001 serialization failure induction and transparent retry recovery", async () => {
    // We deterministically induce a real PostgreSQL 40001 conflict:
    // A temporary trigger on orders BEFORE INSERT fires on attempt 1,
    // coordinates with an external client to execute an UPDATE on the locked offer row and commit,
    // causing PostgreSQL to raise: "could not serialize access due to concurrent update" (40001).
    // The OrderService catches 40001 and retries in attempt 2, where the trigger is no longer blocking.

    const catId = randomUUID();
    await pool.query(
      "INSERT INTO categories (id, name, slug, is_active, display_order) VALUES ($1, $2, $3, true, 1)",
      [catId, "40001 Cat " + catId.slice(0, 6), "s40-" + catId.slice(0, 8)],
    );

    const offerId = randomUUID();
    const setupClient = await pool.connect();
    try {
      await setupClient.query("BEGIN");
      await setupClient.query(
        "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, catalog_policy_type, plan_version_id, price_tzs) VALUES " +
        "($1, $2, '40001 Test Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', 'CATALOG', 'CATEGORY_SET', $3, 1000)",
        [offerId, "OFF_40001_" + offerId.slice(0, 6).toUpperCase(), planVersionId],
      );
      await setupClient.query("INSERT INTO offer_catalog_policy_category_members (offer_id, category_id) VALUES ($1, $2)", [offerId, catId]);
      await setupClient.query("COMMIT");
    } finally {
      setupClient.release();
    }

    // Set up coordination table for 40001 induction
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_serialization_barrier (
        id text PRIMARY KEY,
        fired boolean DEFAULT false,
        counter int DEFAULT 0
      );
      INSERT INTO test_serialization_barrier (id, fired, counter) VALUES ('barrier', false, 0)
      ON CONFLICT (id) DO UPDATE SET fired = false, counter = 0;
    `);

    const S40001_LOCK_ID = 44332211n;

    // Trigger on commercial_policy_snapshots:
    // On attempt 1 (fired = false), transaction takes snapshot read of test_serialization_barrier,
    // pauses on advisory lock. An external transaction mutates test_serialization_barrier and commits.
    // Coordinator releases advisory lock. Order transaction unblocks and attempts UPDATE on test_serialization_barrier.
    // Under REPEATABLE READ, PostgreSQL immediately raises SQLSTATE 40001: could not serialize access due to concurrent update!
    // OrderService catches 40001 and retries in attempt 2, where fired is true so it succeeds cleanly.
    await pool.query(`
      CREATE OR REPLACE FUNCTION test_induce_40001_fn() RETURNS TRIGGER AS $$
      DECLARE
        v_fired boolean;
      BEGIN
        SELECT fired INTO v_fired FROM test_serialization_barrier WHERE id = 'barrier';
        IF NOT v_fired THEN
          PERFORM pg_advisory_lock(${S40001_LOCK_ID});
          PERFORM pg_advisory_unlock(${S40001_LOCK_ID});
          UPDATE test_serialization_barrier SET counter = counter + 1 WHERE id = 'barrier';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER test_trg_induce_40001
      BEFORE INSERT ON commercial_policy_snapshots
      FOR EACH ROW
      EXECUTE FUNCTION test_induce_40001_fn();
    `);

    const coordinator = await pool.connect();
    try {
      await coordinator.query("SET statement_timeout = '5000'");

      // 1. Coordinator acquires advisory lock
      await coordinator.query("SELECT pg_advisory_lock($1)", [S40001_LOCK_ID.toString()]);

      const idempotencyKey = "key-40001-" + randomUUID();

      // 2. Launch order request in background
      const orderPromise = app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { cookie: customerCookie },
        payload: { offerId, idempotencyKey },
      });

      // 3. Wait for order transaction to reach barrier on attempt 1
      for (let i = 0; i < 50; i++) {
        const check = await pool.query(
          "SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted = false",
          [Number(S40001_LOCK_ID)],
        );
        if (parseInt(check.rows[0].count, 10) > 0) break;
        await new Promise((r) => setTimeout(r, 20));
      }

      // 4. External transaction mutates the barrier row and commits!
      // This row was read by attempt 1 under REPEATABLE READ.
      // Committing this concurrent change guarantees that attempt 1's subsequent UPDATE throws 40001.
      const mutClient = await pool.connect();
      try {
        await mutClient.query("SET statement_timeout = '5000'");
        await mutClient.query("UPDATE test_serialization_barrier SET counter = 99, fired = true WHERE id = 'barrier'");
      } finally {
        mutClient.release();
      }

      // 5. Release advisory lock so order transaction resumes, hits 40001 on its UPDATE, and triggers retry!
      await coordinator.query("SELECT pg_advisory_unlock($1)", [S40001_LOCK_ID.toString()]);

      // 6. On retry (attempt 2), 'fired' is true, so trigger does not pause.
      // Order creation succeeds cleanly on retry!
      const orderRes = await orderPromise;
      assert.equal(orderRes.statusCode, 201);
      const order = orderRes.json().data;

      // 7. Verify exactly 1 order, 1 snapshot, and 1 audit event survived
      const dbOrders = await pool.query("SELECT COUNT(*) FROM orders WHERE customer_id = $1 AND idempotency_key = $2", [customerId, idempotencyKey]);
      assert.equal(parseInt(dbOrders.rows[0].count, 10), 1);

      const dbSnapshots = await pool.query("SELECT COUNT(*) FROM commercial_policy_snapshots WHERE id = $1", [order.catalogPolicySnapshotId]);
      assert.equal(parseInt(dbSnapshots.rows[0].count, 10), 1);

      const auditCount = await pool.query("SELECT COUNT(*) FROM audit_events WHERE resource_type = 'order' AND resource_id = $1", [order.id]);
      assert.equal(parseInt(auditCount.rows[0].count, 10), 1);
    } finally {
      try {
        await coordinator.query("SELECT pg_advisory_unlock_all()");
      } catch {
        // Ignored in finally block: connection might already be released or in error state
      }
      coordinator.release();
      await pool.query("DROP TRIGGER IF EXISTS test_trg_induce_40001 ON commercial_policy_snapshots");
      await pool.query("DROP FUNCTION IF EXISTS test_induce_40001_fn()");
      await pool.query("DROP TABLE IF EXISTS test_serialization_barrier");
    }
  });
});
