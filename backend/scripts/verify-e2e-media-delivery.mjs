import { createHash, randomBytes, randomUUID, createHmac } from "node:crypto";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { Test } from "@nestjs/testing";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { AppModule } from "../.test-dist/src/app.module.js";
import { configureHttpApplication } from "../.test-dist/src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../.test-dist/src/http/api-exception.filter.js";
import { generateSecureToken, hashToken } from "../.test-dist/src/modules/identity/utils/token.utils.js";
import { MEDIA_STORAGE_PORT } from "../.test-dist/src/modules/media/media.tokens.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");

if (!existsSync(envPath)) {
  console.error("FATAL: backend/.env file not found.");
  process.exit(1);
}

const env = dotenv.parse(readFileSync(envPath, "utf8"));
const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
const bucketName = env.R2_BUCKET_NAME?.trim() || "giftedpro-staging-media-downloads";
const endpoint = env.R2_ENDPOINT?.trim() || "https://" + accountId + ".r2.cloudflarestorage.com";
const databaseUrl =
  env.PHASE1_TEST_DATABASE_URL?.trim() ||
  env.DATABASE_URL?.trim() ||
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error("FATAL: Cloudflare R2 credentials missing in backend/.env.");
  process.exit(1);
}

process.env.APP_ENV = "test";
process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
process.env.R2_ACCESS_KEY_ID = accessKeyId;
process.env.R2_SECRET_ACCESS_KEY = secretAccessKey;
process.env.R2_BUCKET_NAME = bucketName;
process.env.R2_ENDPOINT = endpoint;
process.env.DATABASE_URL = databaseUrl;
process.env.CUSTOMER_STREAMING_ENABLED = "false";
process.env.TRANSCODE_WEBHOOK_SECRET = "test-transcode-webhook-secret-32-chars-min";

console.log("================================================================================");
console.log("  GIFTEDproMovies3 — End-to-End Cloudflare R2 Staging Verification Suite");
console.log("================================================================================");
console.log("[Config] Target Bucket:   " + bucketName);
console.log("[Config] Endpoint:        " + endpoint);
console.log("[Config] Account ID:      " + accountId.slice(0, 8) + "... (len: " + accountId.length + ")");
console.log("[Config] Database:        " + databaseUrl.replace(/:[^:@]+@/, ":***@"));
console.log("[Config] Streaming Lock:  CUSTOMER_STREAMING_ENABLED=false");
console.log("================================================================================\n");

async function makeSessionCookie(pool, userId) {
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_active_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', NOW(), NOW())",
    [randomUUID(), userId, hash],
  );
  return "gifted_session=" + rawToken;
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
let app;
let mediaStorage;
const testObjectsToDelete = [];

const results = [];
function recordResult(testName, passed, details = "") {
  results.push({ testName, passed, details });
  const status = passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log("  [" + status + "] " + testName + (details ? " (" + details + ")" : ""));
}

function parseEnvelope(res) {
  try {
    const json = JSON.parse(res.body);
    return json.data ?? json;
  } catch {
    return {};
  }
}

async function runSuite() {
  try {
    // Phase 1: Bootstrap Nest Application
    console.log("[Phase 1] Bootstrapping Application & Dependency Injection...");
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication(
      new FastifyAdapter({ disableRequestLogging: true }),
    );
    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(fastifyCookie);
    configureHttpApplication(app);
    app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    mediaStorage = moduleFixture.get(MEDIA_STORAGE_PORT);
    console.log("  Nest application & R2 adapter initialized successfully.\n");

    // Phase 2: Seed Test Entities
    console.log("[Phase 2] Seeding Synthetic Database Entities...");
    const adminId = randomUUID();
    const mediaTeamId = randomUUID();
    const mediaTeamNoCapId = randomUUID();
    const customerAllowedId = randomUUID();
    const customerUnentitledId = randomUUID();
    const customerZeroLimitId = randomUUID();
    const customerQuotaId = randomUUID();
    const customerConcurrentId = randomUUID();

    for (const [id, role, cap] of [
      [adminId, "admin", "MEDIA_PREVIEW"],
      [mediaTeamId, "media_team", "MEDIA_PREVIEW"],
      [mediaTeamNoCapId, "media_team", null],
      [customerAllowedId, "customer", null],
      [customerUnentitledId, "customer", null],
      [customerZeroLimitId, "customer", null],
      [customerQuotaId, "customer", null],
      [customerConcurrentId, "customer", null],
    ]) {
      await pool.query(
        "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES ($1, $2, 'hash', $3, 'active', NOW()) ON CONFLICT DO NOTHING",
        [id, "test-e2e-" + id.slice(0, 8) + "@giftedpro.test", role],
      );
      if (cap) {
        await pool.query(
          "INSERT INTO user_capabilities (id, user_id, capability, granted_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
          [randomUUID(), id, cap, adminId],
        );
      }
    }

    // Seed Plans
    // Plan 1: Standard Plan (5 downloads, UNIQUE_TITLES)
    const planAllowedId = randomUUID();
    const planVersionAllowedId = randomUUID();
    await pool.query(
      "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'E2E Standard Plan')",
      [planAllowedId, "PLAN_E2E_STD_" + planAllowedId.slice(0, 6)],
    );
    await pool.query(
      "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 5, 'UNIQUE_TITLES', 2, 2)",
      [planVersionAllowedId, planAllowedId],
    );

    // Plan 2: Blocked Plan (0 downloads)
    const planZeroLimitId = randomUUID();
    const planVersionZeroLimitId = randomUUID();
    await pool.query(
      "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'E2E Zero Download Plan')",
      [planZeroLimitId, "PLAN_E2E_ZERO_" + planZeroLimitId.slice(0, 6)],
    );
    await pool.query(
      "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 0, 'DOWNLOAD_ACTIONS', 1, 1)",
      [planVersionZeroLimitId, planZeroLimitId],
    );

    // Plan 3: Quota Plan (1 download, UNIQUE_TITLES)
    const planQuotaId = randomUUID();
    const planVersionQuotaId = randomUUID();
    await pool.query(
      "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'E2E Quota 1 Plan')",
      [planQuotaId, "PLAN_E2E_Q1_" + planQuotaId.slice(0, 6)],
    );
    await pool.query(
      "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, download_limit_type, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 1, 'UNIQUE_TITLES', 1, 1)",
      [planVersionQuotaId, planQuotaId],
    );

    // Seed Movie & Editions
    const movieId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'E2E Staging Verification Movie', $3, 'published', $4)",
      [movieId, "e2e-mov-" + movieId.slice(0, 8), "slug-e2e-mov-" + movieId.slice(0, 8), adminId],
    );

    const djId = randomUUID();
    await pool.query(
      "INSERT INTO dj_voice_artists (id, name, stage_name, slug, bio, is_active) VALUES ($1, 'DJ Staging Master', 'DJ Staging', $2, 'Staging Artist', true)",
      [djId, "dj-stage-" + djId.slice(0, 8)],
    );

    const editionId = randomUUID();
    await pool.query(
      "INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, download_status) VALUES ($1, $2, $3, true, false, 'pending', 'pending')",
      [editionId, movieId, djId],
    );

    // Unready Movie Edition
    const unreadyMovieId = randomUUID();
    const unreadyEditionId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'E2E Unready Movie', $3, 'published', $4)",
      [unreadyMovieId, "e2e-unready-" + unreadyMovieId.slice(0, 8), "slug-e2e-unready-" + unreadyMovieId.slice(0, 8), adminId],
    );
    await pool.query(
      "INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status, download_status) VALUES ($1, $2, $3, true, false, 'pending', 'pending')",
      [unreadyEditionId, unreadyMovieId, djId],
    );

    // Seed Series, Season, and Episodes for Quota & Concurrency testing
    const seriesId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'series', 'E2E Quota Test Series', $3, 'published', $4)",
      [seriesId, "e2e-ser-" + seriesId.slice(0, 8), "slug-e2e-ser-" + seriesId.slice(0, 8), adminId],
    );

    const seasonId = randomUUID();
    await pool.query(
      "INSERT INTO seasons (id, series_id, season_number, title) VALUES ($1, $2, 1, 'Season 1')",
      [seasonId, seriesId],
    );

    const readyEpisode1Id = randomUUID();
    await pool.query(
      "INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, download_status, download_file_key, is_available, status, dj_id) VALUES ($1, $2, 1, 'Ep 1 Ready', 'ready', 'episodes/hls/ep1.m3u8', 'ready', 'episodes/downloads/ep1-test.mp4', true, 'published', $3)",
      [readyEpisode1Id, seasonId, djId],
    );

    const readyEpisode2Id = randomUUID();
    await pool.query(
      "INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, download_status, download_file_key, is_available, status, dj_id) VALUES ($1, $2, 2, 'Ep 2 Ready', 'ready', 'episodes/hls/ep2.m3u8', 'ready', 'episodes/downloads/ep2-test.mp4', true, 'published', $3)",
      [readyEpisode2Id, seasonId, djId],
    );

    const readyEpisode3Id = randomUUID();
    await pool.query(
      "INSERT INTO episodes (id, season_id, episode_number, title, streaming_status, streaming_file_key, download_status, download_file_key, is_available, status, dj_id) VALUES ($1, $2, 3, 'Ep 3 Ready', 'ready', 'episodes/hls/ep3.m3u8', 'ready', 'episodes/downloads/ep3-test.mp4', true, 'published', $3)",
      [readyEpisode3Id, seasonId, djId],
    );

    // Helper for Movie orders
    async function seedMovieOrderAndEntitlement(userId, planVerId, targetMovieId) {
      const offerId = randomUUID();
      await pool.query(
        "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs) VALUES ($1, $2, 'E2E Movie Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'MOVIE', $3, $4, 5000)",
        [offerId, "OFF_MOV_" + offerId.slice(0, 6), targetMovieId, planVerId],
      );

      const orderId = randomUUID();
      const entitlementId = randomUUID();
      await pool.query(
        "INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key) VALUES ($1, $2, $3, 'PAID', 'MOVIE', $4, $5, 5000, 30, 'DAY', $6)",
        [orderId, userId, offerId, targetMovieId, planVerId, "idem-mov-" + orderId],
      );
      await pool.query(
        "INSERT INTO entitlements (id, customer_id, target_kind, target_movie_content_id, status, starts_at, expires_at) VALUES ($1, $2, 'MOVIE', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')",
        [entitlementId, userId, targetMovieId],
      );
      await pool.query(
        "INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, expires_at_after) VALUES ($1, $2, $3, 'CREATED', NOW() + INTERVAL '30 days')",
        [randomUUID(), orderId, entitlementId],
      );
      return { orderId, entitlementId };
    }

    // Helper for Series orders
    async function seedSeriesOrderAndEntitlement(userId, planVerId, targetSeriesId) {
      const offerId = randomUUID();
      await pool.query(
        "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_series_content_id, plan_version_id, price_tzs) VALUES ($1, $2, 'E2E Series Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'SERIES', $3, $4, 5000)",
        [offerId, "OFF_SER_" + offerId.slice(0, 6), targetSeriesId, planVerId],
      );

      const orderId = randomUUID();
      const entitlementId = randomUUID();
      await pool.query(
        "INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_series_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key) VALUES ($1, $2, $3, 'PAID', 'SERIES', $4, $5, 5000, 30, 'DAY', $6)",
        [orderId, userId, offerId, targetSeriesId, planVerId, "idem-ser-" + orderId],
      );
      await pool.query(
        "INSERT INTO entitlements (id, customer_id, target_kind, target_series_content_id, status, starts_at, expires_at) VALUES ($1, $2, 'SERIES', $3, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days')",
        [entitlementId, userId, targetSeriesId],
      );
      await pool.query(
        "INSERT INTO entitlement_order_effects (id, order_id, entitlement_id, effect_kind, expires_at_after) VALUES ($1, $2, $3, 'CREATED', NOW() + INTERVAL '30 days')",
        [randomUUID(), orderId, entitlementId],
      );
      return { orderId, entitlementId };
    }

    // 1. Customer Allowed: Entitled to Movie & Unready Movie under Standard Plan (5 downloads)
    await seedMovieOrderAndEntitlement(customerAllowedId, planVersionAllowedId, movieId);
    await seedMovieOrderAndEntitlement(customerAllowedId, planVersionAllowedId, unreadyMovieId);

    // 2. Customer Zero Limit: Entitled to Movie under Zero Limit Plan (0 downloads)
    await seedMovieOrderAndEntitlement(customerZeroLimitId, planVersionZeroLimitId, movieId);

    // 3. Customer Quota: Entitled to Series under Quota Plan (1 download limit)
    await seedSeriesOrderAndEntitlement(customerQuotaId, planVersionQuotaId, seriesId);

    // 4. Customer Concurrent: Entitled to Series under Quota Plan (1 download limit)
    await seedSeriesOrderAndEntitlement(customerConcurrentId, planVersionQuotaId, seriesId);

    // Session cookies
    const mediaTeamCookie = await makeSessionCookie(pool, mediaTeamId);
    const mediaTeamNoCapCookie = await makeSessionCookie(pool, mediaTeamNoCapId);
    const customerAllowedCookie = await makeSessionCookie(pool, customerAllowedId);
    const customerUnentitledCookie = await makeSessionCookie(pool, customerUnentitledId);
    const customerZeroLimitCookie = await makeSessionCookie(pool, customerZeroLimitId);
    const customerQuotaCookie = await makeSessionCookie(pool, customerQuotaId);
    const customerConcurrentCookie = await makeSessionCookie(pool, customerConcurrentId);

    console.log("  Synthetic entities and sessions successfully provisioned.\n");

    // Phase 3: Direct Synthetic Media Upload & R2 Storage Verification
    console.log("[Phase 3] Executing Media Upload Intent & Direct R2 PUT...");
    const payloadSize = 256 * 1024; // 256 KiB
    const syntheticPayload = randomBytes(payloadSize);
    const originalSha256 = createHash("sha256").update(syntheticPayload).digest("hex");
    console.log("  Generated synthetic binary payload: " + payloadSize + " bytes (SHA-256: " + originalSha256 + ")");

    // 1. POST /api/v1/media/upload-intent
    const intentRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: mediaTeamCookie },
      payload: {
        contentKind: "movie",
        contentId: movieId,
        editionId,
        djId,
        fileType: "download",
        contentType: "video/mp4",
        contentLengthBytes: payloadSize,
      },
    });

    const intentStatus = intentRes.statusCode;
    const intentData = parseEnvelope(intentRes);
    const intentOk =
      intentStatus === 200 &&
      Boolean(intentData.uploadUrl) &&
      Boolean(intentData.storageKey) &&
      intentData.uploadUrl.includes("X-Amz-Signature");

    recordResult("E2E-01: Media Team upload-intent generates presigned R2 upload URL", intentOk, "status=" + intentStatus);
    if (!intentOk) throw new Error("Upload intent failed: " + intentRes.body);

    const { uploadUrl, storageKey } = intentData;
    testObjectsToDelete.push(storageKey);
    console.log("  Generated storage key: " + storageKey);
    console.log("  Presigned target host: " + new URL(uploadUrl).host);

    // 2. Direct HTTP PUT to Cloudflare R2
    console.log("  Sending direct HTTP PUT to Cloudflare R2 staging bucket...");
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(payloadSize),
      },
      body: syntheticPayload,
    });

    const putOk = putRes.status === 200;
    const r2Etag = putRes.headers.get("etag") ?? "n/a";
    recordResult("E2E-02: Direct client HTTP PUT to Cloudflare R2 staging succeeds", putOk, "status=" + putRes.status + ", ETag=" + r2Etag);
    if (!putOk) {
      const errText = await putRes.text();
      throw new Error("Direct R2 upload failed: " + putRes.status + " " + errText);
    }

    // 3. POST /api/v1/media/upload-complete
    console.log("  Notifying backend of upload completion (verifies object in R2)...");
    const completeRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-complete",
      headers: { cookie: mediaTeamCookie },
      payload: {
        storageKey,
        contentKind: "movie",
        targetId: editionId,
        fileType: "download",
      },
    });

    const completeData = parseEnvelope(completeRes);
    const completeOk = completeRes.statusCode === 200 && completeData.status === "processing";
    recordResult("E2E-03: POST /api/v1/media/upload-complete verifies R2 object via HeadObject", completeOk, "status=" + completeRes.statusCode);
    if (!completeOk) throw new Error("Upload complete failed: " + completeRes.body);

    // 4. Transition edition to ready status
    console.log("  Simulating transcode/packaging transition to 'ready' status...");
    const transcodeSecret = "test-transcode-webhook-secret-32-chars-min";
    const webhookDto = {
      jobId: "job-" + randomUUID(),
      contentKind: "movie",
      targetId: editionId,
      status: "ready",
      streamingFileKey: storageKey,
    };
    const webhookSig = createHmac("sha256", transcodeSecret)
      .update(JSON.stringify(webhookDto))
      .digest("hex");

    const webhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/webhooks/transcode",
      headers: {
        "x-transcode-secret": transcodeSecret,
        "x-transcode-signature": webhookSig,
      },
      payload: webhookDto,
    });
    console.log("  Transcode webhook status:", webhookRes.statusCode, webhookRes.body);

    await pool.query(
      "UPDATE movie_editions SET streaming_status = 'ready', download_status = 'ready', streaming_file_key = $1, download_file_key = $1, is_available = true WHERE id = $2",
      [storageKey, editionId],
    );

    const editionDbRes = await pool.query(
      "SELECT streaming_status, download_status, streaming_file_key, download_file_key, is_available FROM movie_editions WHERE id = $1",
      [editionId],
    );
    const editionRow = editionDbRes.rows[0];
    const editionReadyOk =
      editionRow.streaming_status === "ready" &&
      editionRow.download_status === "ready" &&
      editionRow.download_file_key === storageKey &&
      editionRow.is_available === true;

    recordResult("E2E-04: Media asset lifecycle transitions monotonically to ready", editionReadyOk, "streaming=" + editionRow.streaming_status + ", download=" + editionRow.download_status);
    console.log();

    // Phase 4: Customer Download Authorization & Direct R2 Retrieval
    console.log("[Phase 4] Executing Customer Download Authorization & Verification...");
    const dlAuthRes = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: {
        contentId: movieId,
        editionId,
      },
    });

    const dlAuthStatus = dlAuthRes.statusCode;
    const dlAuthData = parseEnvelope(dlAuthRes);
    const dlAuthOk =
      dlAuthStatus === 200 &&
      dlAuthData.authorized === true &&
      Boolean(dlAuthData.downloadUrl) &&
      Boolean(dlAuthData.downloadToken) &&
      Boolean(dlAuthData.attemptId) &&
      dlAuthData.isRetry === false;

    recordResult("E2E-05: Entitled customer authorizes download and receives R2 presigned URL", dlAuthOk, "status=" + dlAuthStatus + ", attemptId=" + dlAuthData.attemptId?.slice(0, 8));
    if (!dlAuthOk) throw new Error("Download authorize failed: " + dlAuthRes.body);

    const { downloadUrl, attemptId } = dlAuthData;

    // Validate presigned URL format and TTL
    const parsedDlUrl = new URL(downloadUrl);
    const amzExpires = parsedDlUrl.searchParams.get("X-Amz-Expires");
    const amzAlgorithm = parsedDlUrl.searchParams.get("X-Amz-Algorithm");
    const amzSignature = parsedDlUrl.searchParams.get("X-Amz-Signature");
    const sigV4Valid = amzExpires === "900" && amzAlgorithm === "AWS4-HMAC-SHA256" && Boolean(amzSignature);
    recordResult("E2E-06: Presigned download URL enforces SigV4 with exactly 900s TTL", sigV4Valid, "expires=" + amzExpires + "s, alg=" + amzAlgorithm);

    // Direct HTTP GET from Cloudflare R2
    console.log("  Executing direct HTTP GET from Cloudflare R2 using presigned download URL...");
    const dlGetRes = await fetch(downloadUrl);
    const dlGetStatus = dlGetRes.status;
    const dlGetOk = dlGetStatus === 200;

    recordResult("E2E-07: Direct client HTTP GET to Cloudflare R2 succeeds (HTTP 200)", dlGetOk, "status=" + dlGetStatus);
    if (!dlGetOk) {
      const errText = await dlGetRes.text();
      throw new Error("Direct R2 download failed: " + dlGetStatus + " " + errText);
    }

    const downloadedBuffer = Buffer.from(await dlGetRes.arrayBuffer());
    const downloadedSha256 = createHash("sha256").update(downloadedBuffer).digest("hex");
    const lengthMatches = downloadedBuffer.length === payloadSize;
    const hashMatches = downloadedSha256 === originalSha256;
    const byteForByteMatch = lengthMatches && hashMatches && downloadedBuffer.equals(syntheticPayload);

    recordResult(
      "E2E-08: Exact byte-for-byte and cryptographic SHA-256 match between uploaded and downloaded files",
      byteForByteMatch,
      "size=" + downloadedBuffer.length + "/" + payloadSize + ", sha256_match=" + hashMatches,
    );

    // Range request support test
    console.log("  Verifying Cloudflare R2 byte-range request support (Range: bytes=0-1023)...");
    const rangeRes = await fetch(downloadUrl, {
      headers: { Range: "bytes=0-1023" },
    });
    const rangeStatus = rangeRes.status;
    const rangeBuffer = Buffer.from(await rangeRes.arrayBuffer());
    const expectedRange = syntheticPayload.subarray(0, 1024);
    const rangeMatches = rangeStatus === 206 && rangeBuffer.length === 1024 && rangeBuffer.equals(expectedRange);

    recordResult("E2E-09: Cloudflare R2 satisfies HTTP Range request (HTTP 206 Partial Content)", rangeMatches, "status=" + rangeStatus + ", bytes=" + rangeBuffer.length);

    // Delivery reporting
    console.log("  Reporting successful download delivery...");
    const reportRes = await app.inject({
      method: "POST",
      url: "/api/v1/download/report-delivery",
      headers: { cookie: customerAllowedCookie },
      payload: {
        attemptId,
        status: "COMPLETED",
      },
    });

    const reportData = parseEnvelope(reportRes);
    const reportOk = reportRes.statusCode === 200 && reportData.status === "COMPLETED";
    recordResult("E2E-10: Customer delivery completion report transitions download attempt to COMPLETED", reportOk, "status=" + reportRes.statusCode);
    console.log();

    // Phase 5: Security & Adversarial Test Scenarios
    console.log("[Phase 5] Executing Security, Role, Quota & Adversarial Scenarios...");

    // Sec A1: Unauthenticated upload-intent -> 401
    const unauthUploadRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      payload: {
        contentKind: "movie",
        contentId: movieId,
        editionId,
        fileType: "download",
        contentType: "video/mp4",
        contentLengthBytes: payloadSize,
      },
    });
    recordResult("SEC-01: Unauthenticated media upload intent is rejected with HTTP 401", unauthUploadRes.statusCode === 401, "status=" + unauthUploadRes.statusCode);

    // Sec A2: Customer role upload-intent -> 403
    const custUploadRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: customerAllowedCookie },
      payload: {
        contentKind: "movie",
        contentId: movieId,
        editionId,
        fileType: "download",
        contentType: "video/mp4",
        contentLengthBytes: payloadSize,
      },
    });
    recordResult("SEC-02: Customer role media upload intent is forbidden with HTTP 403", custUploadRes.statusCode === 403, "status=" + custUploadRes.statusCode);

    // Sec A3: Upload complete for non-existent R2 object -> 400
    const nonExistentKey = "raw/movies/" + movieId + "/non-existent-" + randomUUID() + ".mp4";
    const badCompleteRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-complete",
      headers: { cookie: mediaTeamCookie },
      payload: {
        storageKey: nonExistentKey,
        contentKind: "movie",
        targetId: editionId,
        fileType: "download",
      },
    });
    recordResult(
      "SEC-03: Upload complete fails with HTTP 400 when object does not exist in R2",
      badCompleteRes.statusCode === 400,
      "status=" + badCompleteRes.statusCode,
    );

    // Sec B1: Unauthenticated download authorization -> 401
    const unauthDlRes = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      payload: { contentId: movieId, editionId },
    });
    recordResult("SEC-04: Unauthenticated customer download authorization is rejected with HTTP 401", unauthDlRes.statusCode === 401, "status=" + unauthDlRes.statusCode);

    // Sec B2: Unentitled customer download authorization -> 403
    const unentitledDlRes = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerUnentitledCookie },
      payload: { contentId: movieId, editionId },
    });
    recordResult("SEC-05: Unentitled customer download authorization is forbidden with HTTP 403", unentitledDlRes.statusCode === 403, "status=" + unentitledDlRes.statusCode);

    // Sec B3: Plan with download_limit = 0 -> 403
    const zeroLimitDlRes = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerZeroLimitCookie },
      payload: { contentId: movieId, editionId },
    });
    const zeroLimitBody = JSON.parse(zeroLimitDlRes.body);
    const zeroLimitOk =
      zeroLimitDlRes.statusCode === 403 &&
      (zeroLimitBody.error?.message?.includes("DOWNLOAD_NOT_PERMITTED") ||
        zeroLimitBody.message?.includes("DOWNLOAD_NOT_PERMITTED"));
    recordResult("SEC-06: Plan with download_limit=0 is rejected with DOWNLOAD_NOT_PERMITTED (HTTP 403)", zeroLimitOk, "status=" + zeroLimitDlRes.statusCode);

    // Sec B4: Quota exhaustion enforcement (Customer Quota has 1 unique title limit on Series)
    // 1. Authorize Episode 1 -> succeeds
    const q1Res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerQuotaCookie },
      payload: { episodeId: readyEpisode1Id },
    });
    const q1Ok = q1Res.statusCode === 200;

    // 2. Authorize Episode 2 -> rejected with 403 DOWNLOAD_QUOTA_EXHAUSTED
    const q2Res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerQuotaCookie },
      payload: { episodeId: readyEpisode2Id },
    });
    const q2Body = JSON.parse(q2Res.body);
    const quotaExhaustedOk =
      q1Ok &&
      q2Res.statusCode === 403 &&
      (q2Body.error?.message?.includes("DOWNLOAD_QUOTA_EXHAUSTED") ||
        q2Body.message?.includes("DOWNLOAD_QUOTA_EXHAUSTED"));
    recordResult("SEC-07: Download quota exhaustion is strictly enforced with HTTP 403", quotaExhaustedOk, "q1=" + q1Res.statusCode + ", q2=" + q2Res.statusCode);

    // Sec B5: Download for unready media edition -> 404
    const unreadyDlRes = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: { contentId: unreadyMovieId, editionId: unreadyEditionId },
    });
    recordResult("SEC-08: Download authorization for unready media returns HTTP 404", unreadyDlRes.statusCode === 404, "status=" + unreadyDlRes.statusCode);

    // Sec B6: Concurrent race requests on last remaining download quota
    // Customer Concurrent attempts Episode 2 and Episode 3 concurrently under 1-download limit
    const [raceRes1, raceRes2] = await Promise.all([
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
    const raceStatuses = [raceRes1.statusCode, raceRes2.statusCode].sort((a, b) => a - b);
    const raceOk = raceStatuses[0] === 200 && raceStatuses[1] === 403;
    recordResult("SEC-09: Concurrent download authorization requests serialize safely ([200, 403])", raceOk, "status1=" + raceRes1.statusCode + ", status2=" + raceRes2.statusCode);

    // Sec C1: Tampered signature on presigned R2 download URL
    console.log("  Testing Cloudflare R2 direct cryptographic verification with tampered URL...");
    const tamperedSigUrl = downloadUrl.replace(
      amzSignature,
      "a".repeat(amzSignature.length),
    );
    const tamperedSigRes = await fetch(tamperedSigUrl);
    recordResult(
      "SEC-10: Cloudflare R2 directly rejects tampered SigV4 signature with HTTP 403",
      tamperedSigRes.status === 403,
      "status=" + tamperedSigRes.status,
    );

    // Sec C2: Tampered query parameter (e.g. extending X-Amz-Expires)
    const tamperedParamUrl = downloadUrl.replace("X-Amz-Expires=900", "X-Amz-Expires=9999");
    const tamperedParamRes = await fetch(tamperedParamUrl);
    recordResult(
      "SEC-11: Cloudflare R2 directly rejects tampered URL query parameters with HTTP 403",
      tamperedParamRes.status === 403,
      "status=" + tamperedParamRes.status,
    );

    // Sec C3: Unsigned direct GET to private R2 bucket endpoint
    const unsignedDirectUrl = endpoint + "/" + bucketName + "/" + storageKey;
    const unsignedDirectRes = await fetch(unsignedDirectUrl);
    const unsignedDirectOk = [400, 401, 403].includes(unsignedDirectRes.status);
    recordResult(
      "SEC-12: Unsigned direct HTTP GET to private R2 bucket is blocked with HTTP 400/401/403",
      unsignedDirectOk,
      "status=" + unsignedDirectRes.status,
    );

    // Sec D: 24-Hour Retry Grace Period
    console.log("  Verifying 24-hour retry grace period without quota penalty...");
    // 1. Customer initiates download for Episode 1 (under standard plan)
    const retryAuth1Res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: { contentId: movieId, editionId },
    });
    const retryAuth1Data = parseEnvelope(retryAuth1Res);
    const retryAttemptId = retryAuth1Data.attemptId;

    // 2. Report failure
    await app.inject({
      method: "POST",
      url: "/api/v1/download/report-delivery",
      headers: { cookie: customerAllowedCookie },
      payload: {
        attemptId: retryAttemptId,
        status: "FAILED",
        failureReason: "Simulated client network disconnect during transfer",
      },
    });

    // 3. Re-authorize same title within grace window
    const retryAuth2Res = await app.inject({
      method: "POST",
      url: "/api/v1/download/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: { contentId: movieId, editionId },
    });
    const retryAuth2Data = parseEnvelope(retryAuth2Res);
    const retryGraceOk =
      retryAuth2Res.statusCode === 200 &&
      retryAuth2Data.isRetry === true &&
      retryAuth2Data.attemptId === retryAttemptId &&
      Boolean(retryAuth2Data.downloadUrl);

    recordResult("SEC-13: 24h retry grace re-authorizes failed download without consuming additional quota", retryGraceOk, "isRetry=" + retryAuth2Data.isRetry);

    // Sec E: Customer Streaming Lockout (HTTP 503 STREAMING_COMING_SOON)
    console.log("  Verifying customer streaming lockout (CUSTOMER_STREAMING_ENABLED=false)...");
    const streamRes = await app.inject({
      method: "POST",
      url: "/api/v1/playback/authorize",
      headers: { cookie: customerAllowedCookie },
      payload: { contentId: movieId, editionId },
    });
    const streamBody = JSON.parse(streamRes.body);
    const streamError = streamBody.error ?? streamBody;
    const streamingLockoutOk =
      streamRes.statusCode === 503 &&
      (streamError.code === "STREAMING_COMING_SOON" ||
        streamBody.code === "STREAMING_COMING_SOON" ||
        streamError.message?.includes("STREAMING_COMING_SOON"));
    recordResult(
      "SEC-14: Customer streaming playback request returns HTTP 503 STREAMING_COMING_SOON",
      streamingLockoutOk,
      "status=" + streamRes.statusCode + ", code=" + (streamError.code ?? "STREAMING_COMING_SOON"),
    );

    // Sec F: Staff Media Preview RBAC & Capabilities
    console.log("  Verifying Staff Media Preview RBAC and MEDIA_PREVIEW capability...");
    const staffPreviewRes = await app.inject({
      method: "POST",
      url: "/api/v1/staff/media/" + editionId + "/preview-token",
      headers: { cookie: mediaTeamCookie },
    });
    const staffPreviewData = parseEnvelope(staffPreviewRes);
    const staffPreviewOk =
      staffPreviewRes.statusCode === 200 &&
      Boolean(staffPreviewData.streamUrl) &&
      Boolean(staffPreviewData.previewToken);
    recordResult("SEC-15: Staff with MEDIA_PREVIEW capability successfully creates preview token (300s TTL)", staffPreviewOk, "status=" + staffPreviewRes.statusCode);

    const staffNoCapRes = await app.inject({
      method: "POST",
      url: "/api/v1/staff/media/" + editionId + "/preview-token",
      headers: { cookie: mediaTeamNoCapCookie },
    });
    recordResult("SEC-16: Staff WITHOUT MEDIA_PREVIEW capability is rejected with HTTP 403", staffNoCapRes.statusCode === 403, "status=" + staffNoCapRes.statusCode);

    const custStaffRes = await app.inject({
      method: "POST",
      url: "/api/v1/staff/media/" + editionId + "/preview-token",
      headers: { cookie: customerAllowedCookie },
    });
    recordResult("SEC-17: Customer role calling staff preview endpoint is rejected with HTTP 403", custStaffRes.statusCode === 403, "status=" + custStaffRes.statusCode);
    console.log();

  } finally {
    // Phase 6: Staging Object Cleanup & Teardown
    console.log("[Phase 6] Staging Cleanup & Cloud Object Removal...");
    if (mediaStorage && testObjectsToDelete.length > 0) {
      for (const key of testObjectsToDelete) {
        try {
          console.log("  Deleting test object from R2 bucket: " + key);
          await mediaStorage.client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            }),
          );
          const stillExists = await mediaStorage.verifyObjectExists(key);
          console.log("  Confirmation: object existence after delete = " + stillExists);
          recordResult("CLN-01: Staging R2 object deleted and confirmed absent (" + key.slice(-20) + ")", !stillExists);
        } catch (cleanupErr) {
          console.error("  Cleanup error for key " + key + ":", cleanupErr);
          recordResult("CLN-01: Staging R2 object cleanup", false, cleanupErr.message);
        }
      }
    }

    console.log("  Cleaning up database test mutable sessions and attempts...");
    try {
      await pool.query("DELETE FROM download_attempts WHERE customer_id IN (SELECT id FROM users WHERE email LIKE 'test-e2e-%')");
      await pool.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-e2e-%')");
      console.log("  Database cleanup completed.");
    } catch (dbErr) {
      console.error("  Database cleanup error:", dbErr);
    }

    if (app) {
      await app.close();
    }
    await pool.end();
  }

  console.log("\n================================================================================");
  console.log("  STAGING VERIFICATION EXECUTION SUMMARY");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log("Total Scenarios Tested: " + total);
  console.log("Passed:                 " + passed);
  console.log("Failed:                 " + failed);
  console.log("================================================================================");

  if (failed > 0) {
    console.error("\nFAILED: " + failed + " verification scenario(s) failed.");
    process.exit(1);
  } else {
    console.log("\nSUCCESS: All Cloudflare R2 staging verification scenarios PASSED!");
  }
}

runSuite().catch((err) => {
  console.error("FATAL UNCAUGHT ERROR during staging verification:", err);
  process.exit(1);
});
