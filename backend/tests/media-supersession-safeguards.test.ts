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
import { MEDIA_STORAGE_PORT } from "../src/modules/media/media.tokens.js";
import type { LocalSimulatorMediaAdapter } from "../src/modules/media/adapters/local-simulator-media.adapter.js";

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

test("Media asset replacement and supersession safeguards suite (GPM-AUDIT-017)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

  const adminId = randomUUID();
  const customerId = randomUUID();

  // 1. Seed users
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES
     ($1, $2, 'hash', 'admin', 'active', NOW()),
     ($3, $4, 'hash', 'customer', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      adminId, `admin-mss-${adminId.slice(0, 8)}@giftedpro.test`,
      customerId, `cust-mss-${customerId.slice(0, 8)}@giftedpro.test`,
    ],
  );

  // 2. Seed Movie & Editions
  const movieWithEntitlementId = randomUUID();
  const movieWithoutEntitlementId = randomUUID();

  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES
     ($1, $2, 'movie', 'Protected Movie with Entitlement', $3, 'published', $4),
     ($5, $6, 'movie', 'Free Movie without Entitlement', $7, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [
      movieWithEntitlementId, `mss-mov-ent-${movieWithEntitlementId.slice(0, 8)}`, `slug-ent-${movieWithEntitlementId.slice(0, 8)}`, adminId,
      movieWithoutEntitlementId, `mss-mov-noent-${movieWithoutEntitlementId.slice(0, 8)}`, `slug-noent-${movieWithoutEntitlementId.slice(0, 8)}`,
    ],
  );

  const djId = randomUUID();
  const djPendingId = randomUUID();
  await pool.query(
    `INSERT INTO dj_voice_artists (id, name, stage_name, slug, bio, is_active)
     VALUES ($1, 'DJ Supersede', 'DJ Supersede Star', $2, 'Bio', true),
            ($3, 'DJ Pending', 'DJ Pending Star', $4, 'Bio', true)
     ON CONFLICT DO NOTHING`,
    [djId, `dj-mss-${djId.slice(0, 8)}`, djPendingId, `dj-pen-${djPendingId.slice(0, 8)}`],
  );

  // Ready movie edition with active commercial entitlement
  const readyEditionProtectedId = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, streaming_file_key)
     VALUES ($1, $2, $3, true, true, 'ready', 'movies/hls/ready-protected/master.m3u8')`,
    [readyEditionProtectedId, movieWithEntitlementId, djId],
  );

  // Pending movie edition for the same protected movie
  const pendingEditionProtectedId = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status)
     VALUES ($1, $2, $3, false, false, 'pending')`,
    [pendingEditionProtectedId, movieWithEntitlementId, djPendingId],
  );

  // Ready movie edition with NO entitlement
  const readyEditionFreeId = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, streaming_file_key)
     VALUES ($1, $2, $3, true, true, 'ready', 'movies/hls/ready-free/master.m3u8')`,
    [readyEditionFreeId, movieWithoutEntitlementId, djId],
  );

  // Active entitlement for movieWithEntitlementId
  const movieEntitlementId = randomUUID();
  await pool.query(
    `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at)
     VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [movieEntitlementId, customerId, movieWithEntitlementId],
  );

  // 3. Seed Series, Season, and Episode
  const seriesWithEntitlementId = randomUUID();
  const seriesWithoutEntitlementId = randomUUID();

  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES
     ($1, $2, 'series', 'Protected Series with Entitlement', $3, 'published', $4),
     ($5, $6, 'series', 'Free Series without Entitlement', $7, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [
      seriesWithEntitlementId, `mss-ser-ent-${seriesWithEntitlementId.slice(0, 8)}`, `slug-ser-ent-${seriesWithEntitlementId.slice(0, 8)}`, adminId,
      seriesWithoutEntitlementId, `mss-ser-noent-${seriesWithoutEntitlementId.slice(0, 8)}`, `slug-ser-noent-${seriesWithoutEntitlementId.slice(0, 8)}`,
    ],
  );

  const seasonProtectedId = randomUUID();
  await pool.query(
    `INSERT INTO seasons (id, series_id, season_number, title) VALUES ($1, $2, 1, 'Season 1')`,
    [seasonProtectedId, seriesWithEntitlementId],
  );

  const seasonFreeId = randomUUID();
  await pool.query(
    `INSERT INTO seasons (id, series_id, season_number, title) VALUES ($1, $2, 1, 'Season 1')`,
    [seasonFreeId, seriesWithoutEntitlementId],
  );

  const readyEpisodeProtectedId = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, is_available, status, dj_id)
     VALUES ($1, $2, 1, 'Episode Protected', 'ready', 'episodes/hls/ep-prot/master.m3u8', true, 'published', $3)`,
    [readyEpisodeProtectedId, seasonProtectedId, djId],
  );

  const readyEpisodeFreeId = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, is_available, status, dj_id)
     VALUES ($1, $2, 1, 'Episode Free', 'ready', 'episodes/hls/ep-free/master.m3u8', true, 'published', $3)`,
    [readyEpisodeFreeId, seasonFreeId, djId],
  );

  // Active entitlement for seriesWithEntitlementId
  const seriesEntitlementId = randomUUID();
  await pool.query(
    `INSERT INTO entitlements (id, customer_id, target_kind, target_series_content_id, status, starts_at, expires_at)
     VALUES ($1, $2, 'SERIES', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [seriesEntitlementId, customerId, seriesWithEntitlementId],
  );

  const adminCookie = await makeSessionCookie(pool, adminId);
  const customerCookie = await makeSessionCookie(pool, customerId);

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

  const storage = moduleFixture.get<LocalSimulatorMediaAdapter>(MEDIA_STORAGE_PORT);

  t.after(async () => {
    await app.close();
    await pool.end();
  });

  await t.test("MSS-01: Upload intent for ready movie edition with active commercial entitlement throws 409", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "movie",
        contentId: movieWithEntitlementId,
        editionId: readyEditionProtectedId,
        fileType: "streaming",
        contentType: "video/mp4",
        contentLengthBytes: 1048576,
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(
      body.error.message.includes("ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS"),
      `Expected message to contain ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS, got: ${body.error.message}`,
    );
  });

  await t.test("MSS-02: Complete upload for ready movie edition with active commercial entitlement throws 409", async () => {
    const fakeKey = "raw/movies/test/storageKey.mp4";
    storage.simulateUpload(fakeKey);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-complete",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "movie",
        targetId: readyEditionProtectedId,
        storageKey: fakeKey,
        fileType: "streaming",
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(
      body.error.message.includes("ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS"),
      `Expected message to contain ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS, got: ${body.error.message}`,
    );
  });

  await t.test("MSS-03: Upload intent for pending edition on protected movie succeeds (200)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "movie",
        contentId: movieWithEntitlementId,
        editionId: pendingEditionProtectedId,
        fileType: "streaming",
        contentType: "video/mp4",
        contentLengthBytes: 1048576,
      },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    assert.ok(envelope.data.uploadUrl);
    assert.ok(envelope.data.storageKey);
  });

  await t.test("MSS-04: Upload intent for ready movie edition without entitlement succeeds (200)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "movie",
        contentId: movieWithoutEntitlementId,
        editionId: readyEditionFreeId,
        fileType: "streaming",
        contentType: "video/mp4",
        contentLengthBytes: 1048576,
      },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    assert.ok(envelope.data.uploadUrl);
  });

  await t.test("MSS-05: Upload intent for ready episode with active commercial entitlement throws 409", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "episode",
        contentId: readyEpisodeProtectedId,
        fileType: "streaming",
        contentType: "video/mp4",
        contentLengthBytes: 1048576,
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(
      body.error.message.includes("ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS"),
      `Expected message to contain ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS, got: ${body.error.message}`,
    );
  });

  await t.test("MSS-06: Complete upload for ready episode with active commercial entitlement throws 409", async () => {
    const fakeKey = "raw/episodes/test/storageKey.mp4";
    storage.simulateUpload(fakeKey);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-complete",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "episode",
        targetId: readyEpisodeProtectedId,
        storageKey: fakeKey,
        fileType: "streaming",
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(
      body.error.message.includes("ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS"),
      `Expected message to contain ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS, got: ${body.error.message}`,
    );
  });

  await t.test("MSS-07: Upload intent for ready episode without active commercial entitlement succeeds (200)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "episode",
        contentId: readyEpisodeFreeId,
        fileType: "streaming",
        contentType: "video/mp4",
        contentLengthBytes: 1048576,
      },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    assert.ok(envelope.data.uploadUrl);
  });

  await t.test("MSS-08: Concurrent upload-intent requests against protected edition both receive 409 Conflict", async () => {
    const [res1, res2] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/v1/media/upload-intent",
        headers: { cookie: adminCookie },
        payload: {
          contentKind: "movie",
          contentId: movieWithEntitlementId,
          editionId: readyEditionProtectedId,
          fileType: "streaming",
          contentType: "video/mp4",
          contentLengthBytes: 1048576,
        },
      }),
      app.inject({
        method: "POST",
        url: "/api/v1/media/upload-intent",
        headers: { cookie: adminCookie },
        payload: {
          contentKind: "movie",
          contentId: movieWithEntitlementId,
          editionId: readyEditionProtectedId,
          fileType: "streaming",
          contentType: "video/mp4",
          contentLengthBytes: 1048576,
        },
      }),
    ]);

    assert.equal(res1.statusCode, 409);
    assert.equal(res2.statusCode, 409);
    const body1 = JSON.parse(res1.body);
    const body2 = JSON.parse(res2.body);
    assert.ok(body1.error.message.includes("ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS"));
    assert.ok(body2.error.message.includes("ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS"));
  });

  await t.test("MSS-09: Authorized supersession workflow (POST /media/supersede) succeeds for ready edition with active commercial entitlement (200)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/supersede",
      headers: { cookie: adminCookie },
      payload: {
        contentKind: "movie",
        targetId: readyEditionProtectedId,
        fileType: "streaming",
        newStorageKey: "movies/hls/ready-protected-v2/master.m3u8",
        reason: "4K Remaster upgrade authorized for active subscribers",
      },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    assert.equal(envelope.data.targetId, readyEditionProtectedId);
    assert.equal(envelope.data.newFileKey, "movies/hls/ready-protected-v2/master.m3u8");
    assert.ok(envelope.data.supersessionId);

    // Verify auditable supersession ledger in PostgreSQL
    const supersessionRes = await pool.query(
      `SELECT target_id, superseded_by_actor_id, reason, new_streaming_file_key, file_type
       FROM media_asset_supersessions
       WHERE id = $1`,
      [envelope.data.supersessionId],
    );
    assert.equal(supersessionRes.rows.length, 1);
    const record = supersessionRes.rows[0];
    assert.equal(record.target_id, readyEditionProtectedId);
    assert.equal(record.superseded_by_actor_id, adminId);
    assert.equal(record.reason, "4K Remaster upgrade authorized for active subscribers");
    assert.equal(record.new_streaming_file_key, "movies/hls/ready-protected-v2/master.m3u8");
    assert.equal(record.file_type, "streaming");

    // Verify target edition was updated
    const editionRes = await pool.query(
      `SELECT streaming_file_key, streaming_status FROM movie_editions WHERE id = $1`,
      [readyEditionProtectedId],
    );
    assert.equal(editionRes.rows[0].streaming_file_key, "movies/hls/ready-protected-v2/master.m3u8");
    assert.equal(editionRes.rows[0].streaming_status, "ready");
  });

  await t.test("MSS-10: Direct raw SQL update on ready edition with active entitlement without supersession record is blocked by DB trigger", async () => {
    await pool.query(`DELETE FROM media_asset_supersessions WHERE target_id = $1`, [readyEditionProtectedId]);

    await assert.rejects(
      async () => {
        await pool.query(
          `UPDATE movie_editions
           SET streaming_file_key = 'movies/hls/unauthorized-direct-sql/master.m3u8'
           WHERE id = $1`,
          [readyEditionProtectedId],
        );
      },
      (err: Error) => {
        return err.message.includes("DIRECT_SQL_MUTATION_DENIED");
      },
      "Direct SQL update must be blocked by check_movie_edition_immutability() trigger",
    );
  });

  await t.test("MSS-11: Customer role is rejected from POST /media/supersede with 403 Forbidden", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/media/supersede",
      headers: { cookie: customerCookie },
      payload: {
        contentKind: "movie",
        targetId: readyEditionProtectedId,
        fileType: "streaming",
        newStorageKey: "movies/hls/evil/master.m3u8",
        reason: "Unauthorized attempt",
      },
    });

    assert.equal(res.statusCode, 403);
  });
});
