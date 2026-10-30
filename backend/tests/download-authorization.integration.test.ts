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

test("Offline download authorization and quota enforcement suite (GPM-AUDIT-013)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

  const adminId = randomUUID();
  const customerAllowedId = randomUUID();
  const customerBlockedId = randomUUID();
  const customerNoEntitlementId = randomUUID();
  const customerQuotaLimitedId = randomUUID();
  const customerConcurrentId = randomUUID();

  // 1. Seed users
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES
     ($1, $2, 'hash', 'admin', 'active', NOW()),
     ($3, $4, 'hash', 'customer', 'active', NOW()),
     ($5, $6, 'hash', 'customer', 'active', NOW()),
     ($7, $8, 'hash', 'customer', 'active', NOW()),
     ($9, $10, 'hash', 'customer', 'active', NOW()),
     ($11, $12, 'hash', 'customer', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      adminId, `admin-dla-${adminId.slice(0, 8)}@giftedpro.test`,
      customerAllowedId, `cust-allow-${customerAllowedId.slice(0, 8)}@giftedpro.test`,
      customerBlockedId, `cust-block-${customerBlockedId.slice(0, 8)}@giftedpro.test`,
      customerNoEntitlementId, `cust-noent-${customerNoEntitlementId.slice(0, 8)}@giftedpro.test`,
      customerQuotaLimitedId, `cust-quota-${customerQuotaLimitedId.slice(0, 8)}@giftedpro.test`,
      customerConcurrentId, `cust-conc-${customerConcurrentId.slice(0, 8)}@giftedpro.test`,
    ],
  );

  // 2. Seed Plans
  // Plan A: Downloads allowed (download_limit = 5, UNIQUE_TITLES)
  const planAllowedId = randomUUID();
  const planVersionAllowedId = randomUUID();
  await pool.query(
    `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Download Enabled Plan') ON CONFLICT DO NOTHING`,
    [planAllowedId, `PLAN_DLA_ALLOW_${planAllowedId.slice(0, 6)}`],
  );
  await pool.query(
    `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
     VALUES ($1, $2, 1, 30, 'DAY', 5, 'UNIQUE_TITLES', 2, 2) ON CONFLICT DO NOTHING`,
    [planVersionAllowedId, planAllowedId],
  );

  // Plan B: Downloads disabled (download_limit = 0)
  const planBlockedId = randomUUID();
  const planVersionBlockedId = randomUUID();
  await pool.query(
    `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Streaming Only Plan (No Downloads)') ON CONFLICT DO NOTHING`,
    [planBlockedId, `PLAN_DLA_BLOCK_${planBlockedId.slice(0, 6)}`],
  );
  await pool.query(
    `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
     VALUES ($1, $2, 1, 30, 'DAY', 0, 'DOWNLOAD_ACTIONS', 1, 1) ON CONFLICT DO NOTHING`,
    [planVersionBlockedId, planBlockedId],
  );

  // Plan C: Single download limit (download_limit = 1, UNIQUE_TITLES)
  const planQuotaLimitedId = randomUUID();
  const planVersionQuotaLimitedId = randomUUID();
  await pool.query(
    `INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Quota Limited Plan (1 Unique Title)') ON CONFLICT DO NOTHING`,
    [planQuotaLimitedId, `PLAN_DLA_QUOTA_${planQuotaLimitedId.slice(0, 6)}`],
  );
  await pool.query(
    `INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit)
     VALUES ($1, $2, 1, 30, 'DAY', 1, 'UNIQUE_TITLES', 1, 1) ON CONFLICT DO NOTHING`,
    [planVersionQuotaLimitedId, planQuotaLimitedId],
  );

  // 3. Seed Movie & Editions
  const movieId = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES
     ($1, $2, 'movie', 'Downloadable Movie Blockbuster', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [movieId, `dla-mov-${movieId.slice(0, 8)}`, `slug-dla-mov-${movieId.slice(0, 8)}`, adminId],
  );

  const djId = randomUUID();
  const djPendingId = randomUUID();
  await pool.query(
    `INSERT INTO dj_voice_artists (id, name, stage_name, slug, bio, is_active)
     VALUES ($1, 'DJ Download', 'DJ Download King', $2, 'Bio', true),
            ($3, 'DJ Pending', 'DJ Pending Star', $4, 'Bio', true)
     ON CONFLICT DO NOTHING`,
    [djId, `dj-dla-${djId.slice(0, 8)}`, djPendingId, `dj-pen-${djPendingId.slice(0, 8)}`],
  );

  // Movie edition: Ready for streaming and download
  const readyEditionId = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, streaming_file_key, download_status, download_file_key)
     VALUES ($1, $2, $3, true, true, 'ready', 'movies/hls/master.m3u8', 'ready', 'movies/downloads/ready-offline.mp4')`,
    [readyEditionId, movieId, djId],
  );

  // Movie edition: Streaming ready but download status pending
  const pendingDownloadEditionId = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, streaming_file_key, download_status)
     VALUES ($1, $2, $3, false, true, 'ready', 'movies/hls/pending-dl.m3u8', 'pending')`,
    [pendingDownloadEditionId, movieId, djPendingId],
  );

  // Movie 2 & 3: Ready for streaming and download
  const movie2Id = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES
     ($1, $2, 'movie', 'Downloadable Movie Sequel', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [movie2Id, `dla-mov2-${movie2Id.slice(0, 8)}`, `slug-dla-mov2-${movie2Id.slice(0, 8)}`, adminId],
  );

  const readyEdition2Id = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, streaming_file_key, download_status, download_file_key)
     VALUES ($1, $2, $3, true, true, 'ready', 'movies/hls/master2.m3u8', 'ready', 'movies/downloads/ready-offline2.mp4')`,
    [readyEdition2Id, movie2Id, djId],
  );

  const movie3Id = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES
     ($1, $2, 'movie', 'Downloadable Movie Triquel', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [movie3Id, `dla-mov3-${movie3Id.slice(0, 8)}`, `slug-dla-mov3-${movie3Id.slice(0, 8)}`, adminId],
  );

  const readyEdition3Id = randomUUID();
  await pool.query(
    `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, streaming_file_key, download_status, download_file_key)
     VALUES ($1, $2, $3, true, true, 'ready', 'movies/hls/master3.m3u8', 'ready', 'movies/downloads/ready-offline3.mp4')`,
    [readyEdition3Id, movie3Id, djId],
  );

  // 4. Seed Series, Season, and Episode
  const seriesId = randomUUID();
  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES
     ($1, $2, 'series', 'Downloadable Series', $3, 'published', $4)
     ON CONFLICT DO NOTHING`,
    [seriesId, `dla-ser-${seriesId.slice(0, 8)}`, `slug-dla-ser-${seriesId.slice(0, 8)}`, adminId],
  );

  const seasonId = randomUUID();
  await pool.query(
    `INSERT INTO seasons (id, series_id, season_number, title) VALUES ($1, $2, 1, 'Season 1')`,
    [seasonId, seriesId],
  );

  const readyEpisodeId = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, download_status, download_file_key, is_available, status, dj_id)
     VALUES ($1, $2, 1, 'Episode 1 Ready Download', 'ready', 'episodes/hls/ep1.m3u8', 'ready', 'episodes/downloads/ep1-offline.mp4', true, 'published', $3)`,
    [readyEpisodeId, seasonId, djId],
  );

  const readyEpisode2Id = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, download_status, download_file_key, is_available, status, dj_id)
     VALUES ($1, $2, 2, 'Episode 2 Ready Download', 'ready', 'episodes/hls/ep2.m3u8', 'ready', 'episodes/downloads/ep2-offline.mp4', true, 'published', $3)`,
    [readyEpisode2Id, seasonId, djId],
  );

  const readyEpisode3Id = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, download_status, download_file_key, is_available, status, dj_id)
     VALUES ($1, $2, 3, 'Episode 3 Ready Download', 'ready', 'episodes/hls/ep3.m3u8', 'ready', 'episodes/downloads/ep3-offline.mp4', true, 'published', $3)`,
    [readyEpisode3Id, seasonId, djId],
  );

  // 5. Seed Commercial Orders & Entitlements
  // (a) Customer Allowed: Order with planVersionAllowedId -> Entitlement for movieId
  const offerAllowedId = randomUUID();
  await pool.query(
    `INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs)
     VALUES ($1, $2, 'Allowed Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'MOVIE', $3, $4, 5000)`,
    [offerAllowedId, `OFF_DLA_ALLOW_${offerAllowedId.slice(0, 6)}`, movieId, planVersionAllowedId],
  );

  const orderAllowedId = randomUUID();
  await pool.query(
    `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
     VALUES ($1, $2, $3, 'PAID', 'MOVIE', $4, $5, 5000, 30, 'DAY', $6)`,
    [orderAllowedId, customerAllowedId, offerAllowedId, movieId, planVersionAllowedId, `idem-allow-${orderAllowedId}`],
  );

  const entitlementAllowedId = randomUUID();
  await pool.query(
    `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at)
     VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [entitlementAllowedId, customerAllowedId, movieId],
  );

  await pool.query(
    `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, expires_at_after)
     VALUES ($1, $2, $3, 'CREATED', NOW() + INTERVAL '30 days')`,
    [randomUUID(), orderAllowedId, entitlementAllowedId],
  );

  // (b) Customer Blocked: Order with planVersionBlockedId -> Entitlement for movieId
  const offerBlockedId = randomUUID();
  await pool.query(
    `INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs)
     VALUES ($1, $2, 'Blocked Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'MOVIE', $3, $4, 2000)`,
    [offerBlockedId, `OFF_DLA_BLOCK_${offerBlockedId.slice(0, 6)}`, movieId, planVersionBlockedId],
  );

  const orderBlockedId = randomUUID();
  await pool.query(
    `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
     VALUES ($1, $2, $3, 'PAID', 'MOVIE', $4, $5, 2000, 30, 'DAY', $6)`,
    [orderBlockedId, customerBlockedId, offerBlockedId, movieId, planVersionBlockedId, `idem-block-${orderBlockedId}`],
  );

  const entitlementBlockedId = randomUUID();
  await pool.query(
    `INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at)
     VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [entitlementBlockedId, customerBlockedId, movieId],
  );

  await pool.query(
    `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, expires_at_after)
     VALUES ($1, $2, $3, 'CREATED', NOW() + INTERVAL '30 days')`,
    [randomUUID(), orderBlockedId, entitlementBlockedId],
  );

  // (c) Entitlement for Episode on Customer Allowed
  const offerEpisodeAllowedId = randomUUID();
  await pool.query(
    `INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_episode_id, plan_version_id, price_tzs)
     VALUES ($1, $2, 'Episode Allowed Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'EPISODE', $3, $4, 1000)`,
    [offerEpisodeAllowedId, `OFF_DLA_EP_${offerEpisodeAllowedId.slice(0, 6)}`, readyEpisodeId, planVersionAllowedId],
  );

  const orderEpisodeAllowedId = randomUUID();
  await pool.query(
    `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_episode_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
     VALUES ($1, $2, $3, 'PAID', 'EPISODE', $4, $5, 1000, 30, 'DAY', $6)`,
    [orderEpisodeAllowedId, customerAllowedId, offerEpisodeAllowedId, readyEpisodeId, planVersionAllowedId, `idem-ep-${orderEpisodeAllowedId}`],
  );

  const entitlementEpisodeId = randomUUID();
  await pool.query(
    `INSERT INTO entitlements (id, customer_id, target_kind, target_episode_id, status, starts_at, expires_at)
     VALUES ($1, $2, 'EPISODE', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [entitlementEpisodeId, customerAllowedId, readyEpisodeId],
  );
  await pool.query(
    `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, expires_at_after)
     VALUES ($1, $2, $3, 'CREATED', NOW() + INTERVAL '30 days')`,
    [randomUUID(), orderEpisodeAllowedId, entitlementEpisodeId],
  );

  // (d) Customer Quota Limited (Limit = 1 unique title): Order for SERIES with planVersionQuotaLimitedId
  const offerQuotaLimitedId = randomUUID();
  await pool.query(
    `INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_series_content_id, plan_version_id, price_tzs)
     VALUES ($1, $2, 'Quota Limited Series Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'SERIES', $3, $4, 3000)`,
    [offerQuotaLimitedId, `OFF_DLA_QUOTA_${offerQuotaLimitedId.slice(0, 6)}`, seriesId, planVersionQuotaLimitedId],
  );

  const orderQuotaLimitedId = randomUUID();
  await pool.query(
    `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_series_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
     VALUES ($1, $2, $3, 'PAID', 'SERIES', $4, $5, 3000, 30, 'DAY', $6)`,
    [orderQuotaLimitedId, customerQuotaLimitedId, offerQuotaLimitedId, seriesId, planVersionQuotaLimitedId, `idem-quota-${orderQuotaLimitedId}`],
  );

  // Series Entitlement for customerQuotaLimitedId (covers all episodes of seriesId)
  const entitlementQuotaLimitedId = randomUUID();
  await pool.query(
    `INSERT INTO entitlements (id, customer_id, target_kind, target_series_content_id, status, starts_at, expires_at)
     VALUES ($1, $2, 'SERIES', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [entitlementQuotaLimitedId, customerQuotaLimitedId, seriesId],
  );
  await pool.query(
    `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, expires_at_after)
     VALUES ($1, $2, $3, 'CREATED', NOW() + INTERVAL '30 days')`,
    [randomUUID(), orderQuotaLimitedId, entitlementQuotaLimitedId],
  );

  // (e) Customer Concurrent (Limit = 1 unique title): Order for SERIES with planVersionQuotaLimitedId
  const offerConcurrentId = randomUUID();
  await pool.query(
    `INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_series_content_id, plan_version_id, price_tzs)
     VALUES ($1, $2, 'Concurrent Series Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'SERIES', $3, $4, 3000)`,
    [offerConcurrentId, `OFF_DLA_CONC_${offerConcurrentId.slice(0, 6)}`, seriesId, planVersionQuotaLimitedId],
  );

  const orderConcurrentId = randomUUID();
  await pool.query(
    `INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_series_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key)
     VALUES ($1, $2, $3, 'PAID', 'SERIES', $4, $5, 3000, 30, 'DAY', $6)`,
    [orderConcurrentId, customerConcurrentId, offerConcurrentId, seriesId, planVersionQuotaLimitedId, `idem-conc-${orderConcurrentId}`],
  );

  const entitlementConcurrentId = randomUUID();
  await pool.query(
    `INSERT INTO entitlements (id, customer_id, target_kind, target_series_content_id, status, starts_at, expires_at)
     VALUES ($1, $2, 'SERIES', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')`,
    [entitlementConcurrentId, customerConcurrentId, seriesId],
  );
  await pool.query(
    `INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, expires_at_after)
     VALUES ($1, $2, $3, 'CREATED', NOW() + INTERVAL '30 days')`,
    [randomUUID(), orderConcurrentId, entitlementConcurrentId],
  );

  // Cookies
  const adminCookie = await makeSessionCookie(pool, adminId);
  const customerAllowedCookie = await makeSessionCookie(pool, customerAllowedId);
  const customerBlockedCookie = await makeSessionCookie(pool, customerBlockedId);
  const customerNoEntitlementCookie = await makeSessionCookie(pool, customerNoEntitlementId);
  const customerQuotaLimitedCookie = await makeSessionCookie(pool, customerQuotaLimitedId);
  const customerConcurrentCookie = await makeSessionCookie(pool, customerConcurrentId);

  // Nest app setup
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

  await t.test("DLA-01: Unauthenticated request to /download/authorize returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      payload: { contentId: movieId },
    });

    assert.equal(res.statusCode, 401);
  });

  await t.test("DLA-02: Non-customer role (admin) returns 403 Forbidden", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: adminCookie },
      payload: { contentId: movieId },
    });

    assert.equal(res.statusCode, 403);
  });

  await t.test("DLA-03: Customer without active entitlement returns 403 Forbidden", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerNoEntitlementCookie },
      payload: { contentId: movieId },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes("NO_ACTIVE_ENTITLEMENT"));
  });

  await t.test("DLA-04: Customer with plan where download_limit = 0 returns 403 Forbidden", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerBlockedCookie },
      payload: { contentId: movieId },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes("DOWNLOAD_NOT_PERMITTED"));
  });

  await t.test("DLA-05: Customer requesting edition with pending download status returns 404", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: {
        contentId: movieId,
        editionId: pendingDownloadEditionId,
      },
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes("download is not currently available or ready"));
  });

  await t.test("DLA-06: Customer with active entitlement on download-enabled plan authorizes ready movie download", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: {
        contentId: movieId,
        editionId: readyEditionId,
      },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    const data = envelope.data;

    assert.equal(data.authorized, true);
    assert.equal(data.targetKind, "movie");
    assert.equal(data.contentId, movieId);
    assert.equal(data.editionId, readyEditionId);
    assert.equal(data.downloadLimit, 5);
    assert.equal(data.downloadLimitType, "UNIQUE_TITLES");
    assert.ok(data.downloadToken, "Must have downloadToken");
    assert.ok(data.downloadUrl.includes(data.downloadToken), "downloadUrl must include token");

    // Cryptographic verification of token
    const claims = await playbackSigner.verifyPlaybackToken(data.downloadToken);
    assert.ok(claims);
    assert.equal(claims.sub, customerAllowedId);
    assert.equal(claims.contentId, movieId);
    assert.equal(claims.editionId, readyEditionId);
  });

  await t.test("DLA-07: Customer authorizes ready episode download", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: {
        episodeId: readyEpisodeId,
      },
    });

    assert.equal(res.statusCode, 200);
    const envelope = JSON.parse(res.body);
    assert.equal(envelope.success, true);
    const data = envelope.data;

    assert.equal(data.authorized, true);
    assert.equal(data.targetKind, "episode");
    assert.equal(data.contentId, readyEpisodeId);
    assert.ok(data.downloadToken);

    const claims = await playbackSigner.verifyPlaybackToken(data.downloadToken);
    assert.ok(claims);
    assert.equal(claims.sub, customerAllowedId);
    assert.equal(claims.contentId, readyEpisodeId);
  });

  await t.test("DLA-08: Audit event CUSTOMER_MEDIA_DOWNLOAD_AUTHORIZED is recorded", async () => {
    const auditRes = await pool.query(
      `SELECT action, actor_id, resource_type, metadata
       FROM audit_events
       WHERE action = 'CUSTOMER_MEDIA_DOWNLOAD_AUTHORIZED' AND actor_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [customerAllowedId],
    );

    assert.equal(auditRes.rows.length, 1);
    const event = auditRes.rows[0];
    assert.equal(event.actor_id, customerAllowedId);
    assert.equal(event.resource_type, "episode");
    assert.equal(event.metadata.planVersionId, planVersionAllowedId);
    assert.equal(event.metadata.downloadLimit, 5);
    assert.equal(event.metadata.downloadLimitType, "UNIQUE_TITLES");
  });

  let quotaAttemptId: string;

  await t.test("DLA-09: Finite positive quota enforcement (limit = 1 unique title)", async () => {
    // 1. Authorize Episode 1 (first unique title -> within limit of 1)
    const res1 = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerQuotaLimitedCookie },
      payload: { episodeId: readyEpisodeId },
    });
    assert.equal(res1.statusCode, 200);
    const body1 = JSON.parse(res1.body);
    assert.equal(body1.success, true);
    assert.equal(body1.data.authorized, true);
    quotaAttemptId = body1.data.attemptId;
    assert.ok(quotaAttemptId, "attemptId must be returned");

    // 2. Authorize Episode 2 (second unique title -> exceeds limit of 1)
    const res2 = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerQuotaLimitedCookie },
      payload: { episodeId: readyEpisode2Id },
    });
    assert.equal(res2.statusCode, 403);
    const body2 = JSON.parse(res2.body);
    assert.equal(body2.success, false);
    assert.ok(body2.error.message.includes("DOWNLOAD_QUOTA_EXHAUSTED"));

    // 3. Re-authorizing Episode 1 succeeds (already counted in unique titles)
    const res3 = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerQuotaLimitedCookie },
      payload: { episodeId: readyEpisodeId },
    });
    assert.equal(res3.statusCode, 200);
    const body3 = JSON.parse(res3.body);
    assert.equal(body3.success, true);
    assert.equal(body3.data.authorized, true);
  });

  await t.test("DLA-10: Customer reports delivery failure activating retry grace", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/report-delivery",
      headers: { cookie: customerQuotaLimitedCookie },
      payload: {
        attemptId: quotaAttemptId,
        status: "FAILED",
        failureReason: "NETWORK_TIMEOUT",
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.attemptId, quotaAttemptId);
    assert.equal(body.data.status, "FAILED");
    assert.equal(body.data.retryEligible, true);
    assert.ok(body.data.retryGraceExpiresAt);

    // Verify DB update
    const dbRes = await pool.query(
      `SELECT status, failure_reason FROM download_attempts WHERE id = $1`,
      [quotaAttemptId],
    );
    assert.equal(dbRes.rows[0].status, "FAILED");
    assert.equal(dbRes.rows[0].failure_reason, "NETWORK_TIMEOUT");
  });

  await t.test("DLA-11: 24-hour retry grace window permits re-download of failed attempt without consuming additional quota", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerQuotaLimitedCookie },
      payload: { episodeId: readyEpisodeId },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.authorized, true);
    assert.equal(body.data.attemptId, quotaAttemptId);
    assert.equal(body.data.isRetry, true);

    // Verify attempt count in DB incremented to 2 and status reset to PENDING
    const dbRes = await pool.query(
      `SELECT status, attempt_number FROM download_attempts WHERE id = $1`,
      [quotaAttemptId],
    );
    assert.equal(dbRes.rows[0].status, "PENDING");
    assert.equal(dbRes.rows[0].attempt_number, 2);
  });

  await t.test("DLA-12: Customer reports delivery completion", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download/report-delivery",
      headers: { cookie: customerQuotaLimitedCookie },
      payload: {
        attemptId: quotaAttemptId,
        status: "COMPLETED",
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.attemptId, quotaAttemptId);
    assert.equal(body.data.status, "COMPLETED");
    assert.equal(body.data.retryEligible, false);

    // Verify completed_at in DB
    const dbRes = await pool.query(
      `SELECT status, completed_at FROM download_attempts WHERE id = $1`,
      [quotaAttemptId],
    );
    assert.equal(dbRes.rows[0].status, "COMPLETED");
    assert.ok(dbRes.rows[0].completed_at);
  });

  await t.test("DLA-13: Concurrent download requests for distinct titles under limit = 1 serialize via order lock", async () => {
    // Customer customerConcurrentId makes two simultaneous authorization calls for two distinct titles
    const [resA, resB] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/v1/download/authorize",
        headers: { cookie: customerConcurrentCookie },
        payload: { episodeId: readyEpisode2Id },
      }),
      app.inject({
        method: "POST",
        url: "/api/v1/download/authorize",
        headers: { cookie: customerConcurrentCookie },
        payload: { episodeId: readyEpisode3Id },
      }),
    ]);

    const statuses = [resA.statusCode, resB.statusCode].sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 403]);

    const failedRes = resA.statusCode === 403 ? resA : resB;
    const failedBody = JSON.parse(failedRes.body);
    assert.ok(failedBody.error.message.includes("DOWNLOAD_QUOTA_EXHAUSTED"));

    // Verify that exactly 1 download attempt was created for orderConcurrentId
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM download_attempts WHERE order_id = $1`,
      [orderConcurrentId],
    );
    assert.equal(countRes.rows[0].cnt, 1);
  });
});
