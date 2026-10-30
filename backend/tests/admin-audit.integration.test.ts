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

test("Admin audit query controller integration suite (GPM-AUDIT-006)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

  const adminId = randomUUID();
  const staffId = randomUUID();
  const customerId = randomUUID();

  // 1. Seed users
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES
     ($1, $2, 'hash', 'admin', 'active', NOW()),
     ($3, $4, 'hash', 'media_team', 'active', NOW()),
     ($5, $6, 'hash', 'customer', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      adminId, `admin-audit-${adminId.slice(0, 8)}@giftedpro.test`,
      staffId, `staff-audit-${staffId.slice(0, 8)}@giftedpro.test`,
      customerId, `cust-audit-${customerId.slice(0, 8)}@giftedpro.test`,
    ],
  );

  // 2. Seed distinct audit events for querying
  const event1Id = randomUUID();
  const event2Id = randomUUID();
  const event3Id = randomUUID();
  const event4Id = randomUUID();

  // Distinct timestamps to test keyset pagination and date bounding
  await pool.query(
    `INSERT INTO audit_events (id, actor_id, action, resource_type, resource_id, metadata, ip_address, created_at)
     VALUES
     ($1, $2::uuid, 'AUTH_LOGIN_SUCCESS', 'user', $2::text, '{"ip":"127.0.0.1"}', '127.0.0.1', '2026-01-01T10:00:00Z'),
     ($3, $2::uuid, 'PASSWORD_CHANGE_SUCCESS', 'user', $2::text, '{"reason":"periodic"}', '127.0.0.1', '2026-01-02T10:00:00Z'),
     ($4, $5::uuid, 'MEDIA_EDITION_READY', 'edition', 'ed-1', '{"editionId":"ed-1"}', '127.0.0.1', '2026-01-03T10:00:00Z'),
     ($6, $7::uuid, 'ORDER_CREATED', 'order', 'ord-1', '{"amount":5000}', '127.0.0.1', '2026-01-04T10:00:00Z')`,
    [event1Id, adminId, event2Id, event3Id, staffId, event4Id, customerId],
  );

  // 3. Bootstrap NestJS test application
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logController: new LogController({ disableRequestLogging: true }) }),
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie as any);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
  await app.init();
  await fastifyInstance.ready();

  const adminCookie = await makeSessionCookie(pool, adminId);
  const staffCookie = await makeSessionCookie(pool, staffId);
  const customerCookie = await makeSessionCookie(pool, customerId);

  t.after(async () => {
    await app.close();
    await pool.end();
  });

  await t.test("AA-01: Admin queries audit logs and receives paginated events in descending order", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?limit=2",
      headers: {
        cookie: adminCookie,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.items.length, 2);
    assert.ok(body.data.nextCursor, "Expected nextCursor when more records exist");

    // Must be strictly descending by created_at
    const firstDate = new Date(body.data.items[0].createdAt).getTime();
    const secondDate = new Date(body.data.items[1].createdAt).getTime();
    assert.ok(firstDate >= secondDate, "Events must be sorted in descending created_at order");
  });

  await t.test("AA-02: Keyset cursor advancement retrieves subsequent page without duplicating records", async () => {
    const page1Res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?limit=2",
      headers: {
        cookie: adminCookie,
      },
    });
    const page1 = JSON.parse(page1Res.body).data;
    assert.ok(page1.nextCursor);

    const page2Res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/audit?limit=2&cursor=${encodeURIComponent(page1.nextCursor)}`,
      headers: {
        cookie: adminCookie,
      },
    });
    assert.equal(page2Res.statusCode, 200);
    const page2 = JSON.parse(page2Res.body).data;

    const page1Ids = new Set(page1.items.map((i: any) => i.id));
    for (const item of page2.items) {
      assert.ok(!page1Ids.has(item.id), `Record ${item.id} from page 2 should not appear in page 1`);
    }
  });

  await t.test("AA-03: Filtering by actorId returns only events for that actor", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/admin/audit?actorId=${staffId}`,
      headers: {
        cookie: adminCookie,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.data.items.length >= 1);
    for (const item of body.data.items) {
      assert.equal(item.actorId, staffId);
    }
  });

  await t.test("AA-04: Filtering by action and resourceType returns exact matches", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?action=AUTH_LOGIN_SUCCESS&resourceType=user",
      headers: {
        cookie: adminCookie,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.data.items.length >= 1);
    for (const item of body.data.items) {
      assert.equal(item.action, "AUTH_LOGIN_SUCCESS");
      assert.equal(item.resourceType, "user");
    }
  });

  await t.test("AA-05: Filtering by startDate and endDate bounds the returned records", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?startDate=2026-01-02T00:00:00Z&endDate=2026-01-03T23:59:59Z",
      headers: {
        cookie: adminCookie,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    for (const item of body.data.items) {
      const dt = new Date(item.createdAt).getTime();
      assert.ok(dt >= new Date("2026-01-02T00:00:00Z").getTime());
      assert.ok(dt <= new Date("2026-01-03T23:59:59Z").getTime());
    }
  });

  await t.test("AA-06: Staff and Customer roles are rejected with 403 Forbidden", async () => {
    // Staff attempt
    const staffRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit",
      headers: {
        cookie: staffCookie,
      },
    });
    assert.equal(staffRes.statusCode, 403);

    // Customer attempt
    const customerRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit",
      headers: {
        cookie: customerCookie,
      },
    });
    assert.equal(customerRes.statusCode, 403);
  });

  await t.test("AA-07: Unauthenticated request is rejected with 401 Unauthorized", async () => {
    const unauthRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit",
    });
    assert.equal(unauthRes.statusCode, 401);
  });

  await t.test("AA-08: Malformed cursor, invalid UUID, and invalid date formats are rejected with 400 Bad Request", async () => {
    // Malformed cursor
    const badCursorRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?cursor=invalid-not-base64",
      headers: {
        cookie: adminCookie,
      },
    });
    assert.equal(badCursorRes.statusCode, 400);

    // Invalid actorId (not UUID v4)
    const badActorRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?actorId=not-a-uuid",
      headers: {
        cookie: adminCookie,
      },
    });
    assert.equal(badActorRes.statusCode, 400);

    // Invalid date
    const badDateRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/audit?startDate=not-a-date",
      headers: {
        cookie: adminCookie,
      },
    });
    assert.equal(badDateRes.statusCode, 400);
  });
});
