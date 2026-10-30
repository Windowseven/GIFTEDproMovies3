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
import { PLAYBACK_SIGNER_PORT } from "../src/modules/media/media.tokens.js";
import type { PlaybackSignerPort } from "../src/modules/media/ports/playback-signer.port.js";

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

test("Staff media preview token integration suite (GPM-AUDIT-016)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

  const adminId = randomUUID();
  const staffWithCapId = randomUUID();
  const staffNoCapId = randomUUID();
  const customerId = randomUUID();

  // 1. Seed users
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES
     ($1, $2, 'hash', 'admin', 'active', NOW()),
     ($3, $4, 'hash', 'media_team', 'active', NOW()),
     ($5, $6, 'hash', 'media_team', 'active', NOW()),
     ($7, $8, 'hash', 'customer', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      adminId, `admin-smp-${adminId.slice(0, 8)}@giftedpro.test`,
      staffWithCapId, `staff-cap-${staffWithCapId.slice(0, 8)}@giftedpro.test`,
      staffNoCapId, `staff-nocap-${staffNoCapId.slice(0, 8)}@giftedpro.test`,
      customerId, `cust-smp-${customerId.slice(0, 8)}@giftedpro.test`,
    ],
  );

  // 2. Grant MEDIA_PREVIEW capability to staffWithCapId
  await pool.query(
    `INSERT INTO user_capabilities (id, user_id, capability, granted_by)
     VALUES ($1, $2, 'MEDIA_PREVIEW', $3)`,
    [randomUUID(), staffWithCapId, adminId],
  );

  // 3. Seed Movie & Editions
  const movieId = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by)
     VALUES ($1, $2, 'movie', 'Preview Test Movie', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [movieId, `smp-mov-${movieId.slice(0, 8)}`, `slug-smp-${movieId.slice(0, 8)}`, adminId],
  );

  const djId = randomUUID();
  const secondDjId = randomUUID();
  await pool.query(
    `INSERT INTO dj_voice_artists (id, name, stage_name, slug, bio, is_active)
     VALUES ($1, 'DJ Preview', 'DJ Preview Star', $2, 'Bio', true),
            ($3, 'DJ Second', 'DJ Second Star', $4, 'Bio', true)
     ON CONFLICT DO NOTHING`,
    [djId, `dj-smp-${djId.slice(0, 8)}`, secondDjId, `dj-smp2-${secondDjId.slice(0, 8)}`],
  );

  // Ready movie edition
  const readyEditionId = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, streaming_file_key)
     VALUES ($1, $2, $3, true, true, 'ready', 'movies/hls/ready-edition/master.m3u8')`,
    [readyEditionId, movieId, djId],
  );

  // Pending movie edition (not ready)
  const pendingEditionId = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status)
     VALUES ($1, $2, $3, false, false, 'pending')`,
    [pendingEditionId, movieId, secondDjId],
  );

  // 4. Seed Series, Season, and Episode (for polymorphic preview test)
  const seriesId = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by)
     VALUES ($1, $2, 'series', 'Preview Series', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [seriesId, `smp-ser-${seriesId.slice(0, 8)}`, `slug-ser-${seriesId.slice(0, 8)}`, adminId],
  );

  const seasonId = randomUUID();
  await pool.query(
    `INSERT INTO seasons (id, series_id, season_number, title, is_active)
     VALUES ($1, $2, 1, 'Season 1', true)`,
    [seasonId, seriesId],
  );

  const readyEpisodeId = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, is_available, status, dj_id)
     VALUES ($1, $2, 1, 'Episode 1', 'ready', 'episodes/hls/ep1/master.m3u8', true, 'published', $3)`,
    [readyEpisodeId, seasonId, djId],
  );

  const adminCookie = await makeSessionCookie(pool, adminId);
  const staffWithCapCookie = await makeSessionCookie(pool, staffWithCapId);
  const staffNoCapCookie = await makeSessionCookie(pool, staffNoCapId);
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

  const playbackSigner = moduleFixture.get<PlaybackSignerPort>(PLAYBACK_SIGNER_PORT);

  t.after(async () => {
    await app.close();
    await pool.end();
  });

  await t.test("SMP-01: Admin generates preview token for ready movie edition", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${readyEditionId}/preview-token`,
      headers: { cookie: adminCookie },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    const data = envelope.data;

    assert.equal(data.authorized, true);
    assert.equal(data.targetKind, "movie");
    assert.equal(data.contentId, movieId);
    assert.equal(data.editionId, readyEditionId);
    assert.equal(data.djId, djId);
    assert.ok(data.previewToken, "Must have previewToken");
    assert.ok(data.streamUrl.includes(data.previewToken), "streamUrl must include previewToken");

    // Verify token claims and bounded TTL (300 seconds)
    const claims = await playbackSigner.verifyPlaybackToken(data.previewToken);
    assert.ok(claims, "Playback token must verify successfully");
    assert.equal(claims.sub, adminId);
    assert.equal(claims.contentId, movieId);
    assert.equal(claims.editionId, readyEditionId);
    const ttl = claims.exp - claims.iat;
    assert.equal(ttl, 300, "Token TTL must be strictly 300 seconds");
  });

  await t.test("SMP-02: Staff with MEDIA_PREVIEW capability generates preview token", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${readyEditionId}/preview-token`,
      headers: { cookie: staffWithCapCookie },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    const data = envelope.data;

    assert.equal(data.authorized, true);
    assert.ok(data.previewToken);

    const claims = await playbackSigner.verifyPlaybackToken(data.previewToken);
    assert.ok(claims);
    assert.equal(claims.sub, staffWithCapId);
    assert.equal(claims.exp - claims.iat, 300);
  });

  await t.test("SMP-03: Staff WITHOUT MEDIA_PREVIEW capability is rejected (403)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${readyEditionId}/preview-token`,
      headers: { cookie: staffNoCapCookie },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes("INSUFFICIENT_CAPABILITY"));
  });

  await t.test("SMP-04: Customer role (403) and unauthenticated (401) are rejected", async () => {
    // Customer
    const resCust = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${readyEditionId}/preview-token`,
      headers: { cookie: customerCookie },
    });
    assert.equal(resCust.statusCode, 403);

    // Unauthenticated
    const resUnauth = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${readyEditionId}/preview-token`,
    });
    assert.equal(resUnauth.statusCode, 401);
  });

  await t.test("SMP-05: Non-ready edition is rejected with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${pendingEditionId}/preview-token`,
      headers: { cookie: adminCookie },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes("not complete or streaming asset is not ready"));
  });

  await t.test("SMP-06: Non-existent edition returns 404", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${randomUUID()}/preview-token`,
      headers: { cookie: adminCookie },
    });

    assert.equal(res.statusCode, 404);
  });

  await t.test("SMP-07: Episode preview succeeds with episode ID", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/staff/media/${readyEpisodeId}/preview-token`,
      headers: { cookie: staffWithCapCookie },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    const data = envelope.data;

    assert.equal(data.authorized, true);
    assert.equal(data.targetKind, "episode");
    assert.equal(data.contentId, readyEpisodeId);
    assert.equal(data.editionId, null);
    assert.ok(data.previewToken);
  });

  await t.test("SMP-08: Structured audit log verification", async () => {
    const auditRes = await pool.query(
      `SELECT * FROM audit_events
       WHERE action = 'STAFF_MEDIA_PREVIEW_GENERATED'
       ORDER BY created_at DESC
       LIMIT 5`,
    );

    assert.ok(auditRes.rows.length >= 2, "Expected at least 2 audit events");
    const latestEvent = auditRes.rows[0];
    assert.equal(latestEvent.action, "STAFF_MEDIA_PREVIEW_GENERATED");
    assert.ok(latestEvent.actor_id);
    assert.ok(latestEvent.resource_type);
    assert.ok(latestEvent.metadata);
    assert.equal(latestEvent.metadata.ttlSeconds, 300);
  });
});
