import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { generateSecureToken, hashToken } from "../src/modules/identity/utils/token.utils.js";
import { computePalmPesaSignature } from "../src/modules/commercial/adapters/palmpesa-signature.validator.js";
import { MEDIA_STORAGE_PORT, PLAYBACK_SIGNER_PORT } from "../src/modules/media/media.tokens.js";
import type { MediaStoragePort } from "../src/modules/media/ports/media-storage.port.js";
import type { PlaybackSignerPort } from "../src/modules/media/ports/playback-signer.port.js";
import { FulfillmentService } from "../src/modules/commercial/fulfillment.service.js";
import { PaymentReconciliationWorker } from "../src/modules/commercial/workers/payment-reconciliation.worker.js";
import { PAYMENT_GATEWAY_PORT } from "../src/modules/commercial/commercial.tokens.js";

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

test("Phase 5 Master Directive: PalmPesa Gateway & Streaming Delivery Integration Suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const adminId = randomUUID();
  const mediaTeamId = randomUUID();
  const customerId = randomUUID();
  const otherCustomerId = randomUUID();

  // 1. Seed identities
  await pool.query(
    "INSERT INTO users (id, email, password_hash, role, status, email_verified_at) VALUES " +
      "($1, $2, 'hash', 'admin', 'active', NOW()), " +
      "($3, $4, 'hash', 'media_team', 'active', NOW()), " +
      "($5, $6, 'hash', 'customer', 'active', NOW()), " +
      "($7, $8, 'hash', 'customer', 'active', NOW()) " +
      "ON CONFLICT DO NOTHING",
    [
      adminId,
      `admin-p5-${adminId.slice(0, 8)}@giftedpro.test`,
      mediaTeamId,
      `mediateam-p5-${mediaTeamId.slice(0, 8)}@giftedpro.test`,
      customerId,
      `cust-p5-${customerId.slice(0, 8)}@giftedpro.test`,
      otherCustomerId,
      `other-p5-${otherCustomerId.slice(0, 8)}@giftedpro.test`,
    ],
  );

  // 2. Seed catalog plan & movie
  const planId = randomUUID();
  const planVersionId = randomUUID();
  await pool.query(
    "INSERT INTO access_plans (id, code, name) VALUES ($1, $2, 'Phase 5 Plan') ON CONFLICT DO NOTHING",
    [planId, `PLAN_P5_${randomUUID().slice(0, 6).toUpperCase()}`],
  );
  await pool.query(
    "INSERT INTO plan_versions (id, access_plan_id, version_number, duration_value, duration_unit, download_limit, device_limit, concurrent_stream_limit) VALUES ($1, $2, 1, 30, 'DAY', 5, 2, 2) ON CONFLICT DO NOTHING",
    [planVersionId, planId],
  );

  const movieId = randomUUID();
  await pool.query(
    "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Phase 5 Movie Blockbuster', $3, 'published', $4) ON CONFLICT DO NOTHING",
    [movieId, `p5-mov-${movieId.slice(0, 8)}`, `slug-p5-${movieId.slice(0, 8)}`, adminId],
  );

  const djId = randomUUID();
  await pool.query(
    "INSERT INTO dj_voice_artists (id, name, stage_name, slug, bio, is_active) VALUES ($1, 'DJ Afro', 'DJ Afro King', 'dj-afro-king', 'Premier voice artist', true) ON CONFLICT DO NOTHING",
    [djId],
  );

  const movieEditionId = randomUUID();
  await pool.query(
    "INSERT INTO movie_editions (id, movie_id, dj_id, is_default, is_available, streaming_status) VALUES ($1, $2, $3, true, false, 'pending') ON CONFLICT DO NOTHING",
    [movieEditionId, movieId, djId],
  );

  const offerId = randomUUID();
  await pool.query(
    "INSERT INTO offers (id, code, name, status, starts_at, ends_at, target_kind, target_movie_content_id, plan_version_id, price_tzs) VALUES " +
      "($1, $2, 'P5 Offer', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'MOVIE', $3, $4, 5000)",
    [offerId, `OFF_P5_${offerId.slice(0, 6).toUpperCase()}`, movieId, planVersionId],
  );

  const palmpesaWebhookSecret = "test-palmpesa-webhook-secret-32-chars-minimum";
  process.env.PALMPESA_SIGNING_SECRET = palmpesaWebhookSecret;
  process.env.CUSTOMER_STREAMING_ENABLED = "true";

  // 3. Initialize Nest test application
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

  const mediaStorage = moduleFixture.get<MediaStoragePort>(MEDIA_STORAGE_PORT);
  const playbackSigner = moduleFixture.get<PlaybackSignerPort>(PLAYBACK_SIGNER_PORT);
  const fulfillmentService = moduleFixture.get(FulfillmentService);
  const reconciliationWorker = moduleFixture.get(PaymentReconciliationWorker);

  const adminCookie = await makeSessionCookie(pool, adminId);
  const mediaTeamCookie = await makeSessionCookie(pool, mediaTeamId);
  const customerCookie = await makeSessionCookie(pool, customerId);
  const otherCustomerCookie = await makeSessionCookie(pool, otherCustomerId);

  const transcodeSecret = "test-transcode-webhook-secret-32-chars-min";

  t.after(async () => {
    await app.close();
    await pool.end();
  });

  let createdOrderId: string;
  let activeOrderReference: string;
  let activeProviderOrderId: string;

  // --------------------------------------------------------------------------
  // WORKSTREAM A: PALMPESA INTEGRATION
  // --------------------------------------------------------------------------

  await t.test("Task 5.A2: Initiates asynchronous mobile checkout for customer order", async () => {
    // 1. Create a customer order first
    const orderRes = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie: customerCookie },
      payload: {
        offerId,
        idempotencyKey: `idemp-p5-order-${randomUUID()}`,
      },
    });

    assert.equal(orderRes.statusCode, 201);
    const orderBody = JSON.parse(orderRes.body);
    createdOrderId = orderBody.data?.id ?? orderBody.id;
    assert.ok(createdOrderId);

    // 2. Initiate checkout on the order
    const checkoutRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${createdOrderId}/checkout`,
      headers: { cookie: customerCookie },
      payload: {
        returnUrl: "https://giftedpro.test/checkout/success",
        cancelUrl: "https://giftedpro.test/checkout/cancel",
        phoneNumber: "+255712345678",
      },
    });

    assert.equal(checkoutRes.statusCode, 200);
    const checkoutBody = JSON.parse(checkoutRes.body);
    const data = checkoutBody.data ?? checkoutBody;

    assert.equal(data.paymentMode, "ASYNC_PROMPT");
    assert.ok(data.statusUrl);
    assert.ok(data.statusUrl.includes("palmpesa"));
    assert.equal(data.orderId, createdOrderId);
    assert.equal(data.amountTzs, 5000);
    assert.equal(data.currency, "TZS");
    assert.equal(data.status, "PENDING");

    // Reference constraint verification: strictly alphanumeric, starts with PP, length <= 20
    assert.ok(data.orderReference.startsWith("PP"));
    assert.ok(/^[A-Za-z0-9]{1,20}$/.test(data.orderReference));
    assert.ok(data.orderReference.length <= 20);
    activeOrderReference = data.orderReference;
    activeProviderOrderId = data.providerOrderId;
    assert.ok(activeProviderOrderId);

    // Database state verification
    const dbAttempt = await pool.query(
      "SELECT * FROM payment_attempts WHERE provider_reference = $1",
      [activeOrderReference],
    );
    assert.equal(dbAttempt.rowCount, 1);
    assert.equal(dbAttempt.rows[0].status, "PENDING");
    assert.equal(dbAttempt.rows[0].provider_name, "palmpesa");
    assert.equal(dbAttempt.rows[0].provider_event_id, activeProviderOrderId);
  });

  await t.test("Task 5.A2: Anti-IDOR enforces strict customer order ownership", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${createdOrderId}/checkout`,
      headers: { cookie: otherCustomerCookie }, // Different customer
      payload: {},
    });

    assert.equal(res.statusCode, 404);
  });

  await t.test("Task 5.A2: Concurrency & single unresolved attempt rule", async () => {
    // Re-attempting checkout without forceNew when active pending attempt exists -> 409
    const duplicateRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${createdOrderId}/checkout`,
      headers: { cookie: customerCookie },
      payload: { forceNew: false, phoneNumber: "+255712345678" },
    });

    assert.equal(duplicateRes.statusCode, 409);

    // Re-attempting with forceNew: true cancels prior attempt and succeeds
    const forceRes = await app.inject({
      method: "POST",
      url: `/api/v1/orders/${createdOrderId}/checkout`,
      headers: { cookie: customerCookie },
      payload: { forceNew: true, phoneNumber: "+255712345678" },
    });

    assert.equal(forceRes.statusCode, 200);
    const data = (JSON.parse(forceRes.body).data ?? JSON.parse(forceRes.body));
    assert.notEqual(data.orderReference, activeOrderReference);
    activeOrderReference = data.orderReference; // Update active reference to the new one
    activeProviderOrderId = data.providerOrderId;
  });

  await t.test("Task 5.A3: Webhook ingress with HMAC-SHA256 signature settles payment", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      event: "payment.completed",
      event_id: `EVT_${randomUUID().slice(0, 10)}`,
      order_id: activeProviderOrderId,
      transaction_id: activeOrderReference,
      status: "COMPLETED",
      amount: 5000,
      currency: "TZS",
      channel: "TIGOPESATZ",
      phone: "255712345678",
      processed_at: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(payload);
    const signature = computePalmPesaSignature(rawBody, palmpesaWebhookSecret, now);

    const webhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/commercial/webhooks/palmpesa",
      headers: {
        "content-type": "application/json",
        "x-palmpesa-signature": signature,
        "x-palmpesa-timestamp": String(now),
      },
      payload: rawBody,
    });

    assert.equal(webhookRes.statusCode, 200);
    const body = JSON.parse(webhookRes.body);
    const data = body.data ?? body;
    assert.equal(data.received, true);
    assert.equal(data.status, "SUCCEEDED");

    // Verify order and attempt in database
    const orderCheck = await pool.query("SELECT status FROM orders WHERE id = $1", [createdOrderId]);
    assert.equal(orderCheck.rows[0].status, "PAID");

    const attemptCheck = await pool.query(
      "SELECT status, provider_event_id FROM payment_attempts WHERE provider_reference = $1",
      [activeOrderReference],
    );
    assert.equal(attemptCheck.rows[0].status, "SUCCEEDED");

    // Verify immutable settlement persistence
    const settlementCheck = await pool.query(
      "SELECT * FROM settlements WHERE provider_reference = $1",
      [activeOrderReference],
    );
    assert.equal(settlementCheck.rowCount, 1);
    assert.equal(settlementCheck.rows[0].amount_tzs, 5000);
    assert.equal(settlementCheck.rows[0].provider_name, "palmpesa");

    // Verify fulfillment was queued
    const fulfillmentCheck = await pool.query(
      "SELECT status FROM fulfillments WHERE order_id = $1",
      [createdOrderId],
    );
    assert.equal(fulfillmentCheck.rowCount, 1);
  });

  await t.test("Task 5.A3: Webhook replay idempotency", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      event: "payment.completed",
      event_id: `EVT_REPLAY`,
      order_id: activeProviderOrderId,
      transaction_id: activeOrderReference,
      status: "COMPLETED",
      amount: 5000,
      currency: "TZS",
      channel: "TIGOPESATZ",
      phone: "255712345678",
      processed_at: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(payload);
    const signature = computePalmPesaSignature(rawBody, palmpesaWebhookSecret, now);

    const replayRes = await app.inject({
      method: "POST",
      url: "/api/v1/commercial/webhooks/palmpesa",
      headers: {
        "content-type": "application/json",
        "x-palmpesa-signature": signature,
        "x-palmpesa-timestamp": String(now),
      },
      payload: rawBody,
    });

    assert.equal(replayRes.statusCode, 200);
    const body = (JSON.parse(replayRes.body).data ?? JSON.parse(replayRes.body));
    assert.equal(body.idempotentReplay, true);

    // Settlement count remains exactly 1
    const settlementCount = await pool.query(
      "SELECT COUNT(*)::int as cnt FROM settlements WHERE provider_reference = $1",
      [activeOrderReference],
    );
    assert.equal(settlementCount.rows[0].cnt, 1);
  });

  await t.test("Task 5.A3: Webhook tampering and forgery defenses", async () => {
    const now = Math.floor(Date.now() / 1000);

    // 1. Tampered amount attack
    const tamperedAmountPayload = {
      event: "payment.completed",
      event_id: `EVT_TAMPER`,
      order_id: activeProviderOrderId,
      transaction_id: activeOrderReference,
      status: "COMPLETED",
      amount: 100, // Tampered down
      currency: "TZS",
      phone: "255712345678",
    };
    const tamperedRaw = JSON.stringify(tamperedAmountPayload);
    const validSignatureForTampered = computePalmPesaSignature(tamperedRaw, palmpesaWebhookSecret, now);

    const tamperedRes = await app.inject({
      method: "POST",
      url: "/api/v1/commercial/webhooks/palmpesa",
      headers: {
        "content-type": "application/json",
        "x-palmpesa-signature": validSignatureForTampered,
        "x-palmpesa-timestamp": String(now),
      },
      payload: tamperedRaw,
    });
    // Amount mismatch is rejected
    assert.ok(
      tamperedRes.statusCode === 400 ||
        tamperedRes.statusCode === 409 ||
        tamperedRes.statusCode === 422,
    );

    // 2. Invalid signature
    const invalidSigRes = await app.inject({
      method: "POST",
      url: "/api/v1/commercial/webhooks/palmpesa",
      headers: {
        "content-type": "application/json",
        "x-palmpesa-signature": "sha256=" + "00".repeat(32),
        "x-palmpesa-timestamp": String(now),
      },
      payload: JSON.stringify({
        event: "payment.completed",
        event_id: "evt_invalid_sig",
        order_id: activeProviderOrderId,
        transaction_id: activeOrderReference,
        status: "COMPLETED",
        amount: 5000,
        currency: "TZS",
        phone: "255712345678",
      }),
    });
    assert.equal(invalidSigRes.statusCode, 401);

    // 3. Stale timestamp
    const staleNow = now - 350;
    const stalePayload = {
      event: "payment.completed",
      event_id: "evt_stale_ts",
      order_id: activeProviderOrderId,
      transaction_id: activeOrderReference,
      status: "COMPLETED",
      amount: 5000,
      currency: "TZS",
      phone: "255712345678",
    };
    const staleRaw = JSON.stringify(stalePayload);
    const staleSig = computePalmPesaSignature(staleRaw, palmpesaWebhookSecret, staleNow);
    const staleRes = await app.inject({
      method: "POST",
      url: "/api/v1/commercial/webhooks/palmpesa",
      headers: {
        "content-type": "application/json",
        "x-palmpesa-signature": staleSig,
        "x-palmpesa-timestamp": String(staleNow),
      },
      payload: staleRaw,
    });
    assert.equal(staleRes.statusCode, 401);
  });

  // --------------------------------------------------------------------------
  // WORKSTREAM B: MEDIA STREAMING & PLAYER DELIVERY INTEGRATION
  // --------------------------------------------------------------------------

  let presignedStorageKey: string;

  await t.test("Task 5.B2: Media upload role authorization (media_team vs admin vs customer vs unauthenticated)", async () => {
    const payload = {
      contentKind: "movie",
      contentId: movieId,
      editionId: movieEditionId,
      fileType: "streaming",
      contentType: "video/mp4",
      contentLengthBytes: 500_000_000,
    };

    // 1. Unauthenticated request is rejected with 401
    const unauthRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      payload,
    });
    assert.equal(unauthRes.statusCode, 401);

    // 2. Customer is rejected with 403 Forbidden
    const customerForbiddenRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: customerCookie },
      payload,
    });
    assert.equal(customerForbiddenRes.statusCode, 403);

    // 3. Media Team member succeeds with 200 OK
    const mediaTeamUploadRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: mediaTeamCookie },
      payload,
    });
    assert.equal(mediaTeamUploadRes.statusCode, 200);

    // 4. Admin succeeds with 200 OK
    const adminUploadRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: adminCookie },
      payload,
    });
    assert.equal(adminUploadRes.statusCode, 200);
    const body = JSON.parse(adminUploadRes.body);
    const data = body.data ?? body;
    assert.ok(data.uploadUrl);
    assert.ok(data.storageKey);
    presignedStorageKey = data.storageKey;
  });

  await t.test("Task 5.B2: Cross-content IDOR attack on upload intent is rejected", async () => {
    // Seed an unrelated movie
    const unrelatedMovieId = randomUUID();
    await pool.query(
      "INSERT INTO content (id, code_id, content_type, title, slug, status, created_by) VALUES ($1, $2, 'movie', 'Unrelated Movie', $3, 'published', $4) ON CONFLICT DO NOTHING",
      [unrelatedMovieId, `unrelated-${unrelatedMovieId.slice(0, 8)}`, `slug-${unrelatedMovieId.slice(0, 8)}`, adminId],
    );

    // Attempt to bind movieEditionId (which belongs to movieId) to unrelatedMovieId
    const crossIdorRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-intent",
      headers: { cookie: mediaTeamCookie },
      payload: {
        contentKind: "movie",
        contentId: unrelatedMovieId,
        editionId: movieEditionId, // Belongs to movieId!
        fileType: "streaming",
        contentType: "video/mp4",
        contentLengthBytes: 500_000_000,
      },
    });

    assert.equal(crossIdorRes.statusCode, 404);
  });

  await t.test("Task 5.B2: Media upload completion verifies storage and alone cannot make media playable", async () => {
    // 1. Unverified object fails with 400
    mediaStorage.verifyObjectExists = async () => false;
    const unverifiedRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-complete",
      headers: { cookie: mediaTeamCookie },
      payload: {
        storageKey: presignedStorageKey,
        contentKind: "movie",
        targetId: movieEditionId,
        fileType: "streaming",
      },
    });
    assert.equal(unverifiedRes.statusCode, 400);

    // 2. Mock object arrival in R2 storage
    mediaStorage.verifyObjectExists = async () => true;

    // 3. Media team confirms upload completion
    const completeRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-complete",
      headers: { cookie: mediaTeamCookie },
      payload: {
        storageKey: presignedStorageKey,
        contentKind: "movie",
        targetId: movieEditionId,
        fileType: "streaming",
      },
    });
    assert.equal(completeRes.statusCode, 200);

    // 4. Invariant: Upload completion leaves status as 'processing'; media must NOT be playable yet!
    const editionInProcessing = await pool.query("SELECT streaming_status, is_available FROM movie_editions WHERE id = $1", [movieEditionId]);
    assert.equal(editionInProcessing.rows[0].streaming_status, "processing");
    assert.equal(editionInProcessing.rows[0].is_available, false);
  });

  await t.test("Task 5.B3: Transcode webhook authentication and monotonic transitions", async () => {
    const transcodePayload = {
      jobId: `JOB_${randomUUID()}`,
      status: "ready" as const,
      contentKind: "movie" as const,
      targetId: movieEditionId,
      streamingFileKey: `hls/movies/${movieId}/${movieEditionId}/master.m3u8`,
      durationSeconds: 7200,
    };

    // 1. Webhook without authentication is rejected with 401
    const unauthWebhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/webhooks/transcode",
      payload: transcodePayload,
    });
    assert.equal(unauthWebhookRes.statusCode, 401);

    // 2. Webhook with invalid signature is rejected with 401
    const invalidSigWebhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/webhooks/transcode",
      headers: { "x-transcode-signature": "invalid-transcode-sig-12345" },
      payload: transcodePayload,
    });
    assert.equal(invalidSigWebhookRes.statusCode, 401);

    // 3. Webhook with valid HMAC-SHA256 signature succeeds with 200 OK
    const validSignature = createHmac("sha256", transcodeSecret)
      .update(JSON.stringify(transcodePayload))
      .digest("hex");

    const readyRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/webhooks/transcode",
      headers: { "x-transcode-signature": validSignature },
      payload: transcodePayload,
    });
    assert.equal(readyRes.statusCode, 200);

    // Verify DB update
    const edition = await pool.query("SELECT * FROM movie_editions WHERE id = $1", [movieEditionId]);
    assert.equal(edition.rows[0].streaming_status, "ready");
    assert.equal(edition.rows[0].is_available, true);
    assert.equal(
      edition.rows[0].streaming_file_key,
      `hls/movies/${movieId}/${movieEditionId}/master.m3u8`,
    );

    // 4. Monotonicity check: regressing from 'ready' to 'processing' is ignored
    const regressPayload = {
      jobId: `JOB_REGRESS`,
      status: "processing" as const,
      contentKind: "movie" as const,
      targetId: movieEditionId,
    };
    const regressSignature = createHmac("sha256", transcodeSecret)
      .update(JSON.stringify(regressPayload))
      .digest("hex");

    await app.inject({
      method: "POST",
      url: "/api/v1/media/webhooks/transcode",
      headers: { "x-transcode-signature": regressSignature },
      payload: regressPayload,
    });
    const checkStillReady = await pool.query("SELECT streaming_status FROM movie_editions WHERE id = $1", [movieEditionId]);
    assert.equal(checkStillReady.rows[0].streaming_status, "ready");
  });

  await t.test("Task 5.A4: Background payment reconciliation worker recovers stale pending attempts", async () => {
    // 1. Seed a stale order and pending payment attempt created 30 minutes ago
    const staleOrderId = randomUUID();
    const staleAttemptId = randomUUID();
    const staleReference = `PPSTALE${randomUUID().slice(0, 6).toUpperCase()}`;

    await pool.query(
      "INSERT INTO orders (id, customer_id, offer_id, status, target_kind, target_movie_content_id, plan_version_id, amount_tzs, duration_value, duration_unit, idempotency_key, created_at) " +
        "VALUES ($1, $2, $3, 'PENDING_PAYMENT', 'MOVIE', $4, $5, 5000, 30, 'DAY', $6, NOW() - INTERVAL '30 minutes')",
      [staleOrderId, customerId, offerId, movieId, planVersionId, `idemp-stale-${staleOrderId}`],
    );

    await pool.query(
      "INSERT INTO payment_attempts (id, order_id, attempt_number, provider_name, provider_reference, status, amount_tzs, created_at) " +
        "VALUES ($1, $2, 1, 'palmpesa', $3, 'PENDING', 5000, NOW() - INTERVAL '30 minutes')",
      [staleAttemptId, staleOrderId, staleReference],
    );

    // 2. Preset simulated gateway status to SUCCESS
    const gateway = moduleFixture.get(PAYMENT_GATEWAY_PORT) as any;
    if (gateway && typeof gateway.setTransactionStatus === "function") {
      gateway.setTransactionStatus(staleReference, "SUCCESS", {
        providerEventId: `EVT-${staleReference}-RECONCILED`,
        amountTzs: 5000,
      });
    }

    // 3. Execute background reconciliation cycle
    const cycleResult = await reconciliationWorker.reconcileStalePendingAttemptsOnce({
      overrideThresholdMinutes: 15,
    });

    assert.ok(cycleResult.examined >= 1);
    assert.ok(cycleResult.reconciled >= 1);

    // 4. Verify DB: attempt transitioned to SUCCEEDED and settlement created
    const reconciledAttempt = await pool.query(
      "SELECT status, provider_event_id FROM payment_attempts WHERE id = $1",
      [staleAttemptId],
    );
    assert.equal(reconciledAttempt.rows[0].status, "SUCCEEDED");

    const reconciledSettlement = await pool.query(
      "SELECT * FROM settlements WHERE payment_attempt_id = $1",
      [staleAttemptId],
    );
    assert.equal(reconciledSettlement.rowCount, 1);
    assert.equal(reconciledSettlement.rows[0].amount_tzs, 5000);
    assert.equal(reconciledSettlement.rows[0].provider_name, "palmpesa");
  });

  // --------------------------------------------------------------------------
  // WORKSTREAM C: CROSS-WORKSTREAM COMMERCE-TO-STREAMING RELEASE GATE
  // --------------------------------------------------------------------------

  await t.test("Task 5.C1: Unentitled customer playback authorization is denied", async () => {
    const deniedRes = await app.inject({
      method: "POST",
      url: "/api/v1/playback/authorize",
      headers: { cookie: otherCustomerCookie }, // Has never bought anything
      payload: {
        contentId: movieId,
      },
    });

    assert.equal(deniedRes.statusCode, 403);
  });

  await t.test("Task 5.C1: Entitled customer playback authorization succeeds end-to-end", async () => {
    // 1. Process fulfillment for the paid order so the customer has active entitlement
    const [pendingFulfillment] = (
      await pool.query("SELECT id FROM fulfillments WHERE order_id = $1", [createdOrderId])
    ).rows;
    assert.ok(pendingFulfillment);

    // Execute fulfillment directly
    const fulfillmentResult = await fulfillmentService.processNextPendingFulfillment();
    assert.ok(fulfillmentResult);
    assert.equal(fulfillmentResult.status, "COMPLETED");

    // Verify entitlement exists and is active
    const entitlementCheck = await pool.query(
      "SELECT * FROM entitlements WHERE customer_id = $1 AND target_movie_content_id = $2 AND status = 'ACTIVE'",
      [customerId, movieId],
    );
    assert.equal(entitlementCheck.rowCount, 1);

    // 2. Customer authorizes playback on the movie
    const playbackRes = await app.inject({
      method: "POST",
      url: "/api/v1/playback/authorize",
      headers: { cookie: customerCookie },
      payload: {
        contentId: movieId,
        editionId: movieEditionId,
      },
    });

    assert.equal(playbackRes.statusCode, 200);
    const body = JSON.parse(playbackRes.body);
    const playbackData = body.data ?? body;

    assert.equal(playbackData.authorized, true);
    assert.ok(playbackData.playbackToken);
    assert.ok(playbackData.streamUrl);
    assert.ok(playbackData.streamUrl.includes("master.m3u8?token="));

    // 3. Cryptographically verify the issued playback token
    const verifiedClaims = await playbackSigner.verifyPlaybackToken(playbackData.playbackToken);
    assert.ok(verifiedClaims);
    assert.equal(verifiedClaims.sub, customerId);
    assert.equal(verifiedClaims.contentId, movieId);
    assert.equal(verifiedClaims.editionId, movieEditionId);
    assert.equal(verifiedClaims.djId, djId);
    assert.ok(verifiedClaims.exp > Math.floor(Date.now() / 1000));
  });
});
