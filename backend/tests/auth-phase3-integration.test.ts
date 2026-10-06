import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { generateSecureToken, hashToken } from "../src/modules/identity/utils/token.utils.js";
import { PasswordHasherService } from "../src/modules/identity/services/password-hasher.service.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Cross-Phase Integration: Real Auth -> Phase 3 Catalog Workflow", async (t) => {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });
  const hasher = new PasswordHasherService();

  // 1. Initialize full NestJS + Fastify HTTP application
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const fastifyAdapter = new FastifyAdapter();
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(fastifyAdapter);
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  // Helper to create DB-backed session directly in PostgreSQL and return the cookie header
  async function createSessionCookieForUser(userId: string): Promise<string> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, last_active_at, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), userId, tokenHash, now, expiresAt, now],
    );

    return `gifted_session=${rawToken}`;
  }

  // Helper for HTTP requests
  async function injectRequest(options: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    payload?: any;
    cookie?: string;
  }) {
    const headers: Record<string, string> = {};
    if (options.cookie) {
      headers["cookie"] = options.cookie;
    }
    if (options.payload) {
      headers["content-type"] = "application/json";
    }

    const response = await app.inject({
      method: options.method,
      url: options.url,
      headers,
      payload: options.payload ? JSON.stringify(options.payload) : undefined,
    });

    let json: any;
    try {
      json = JSON.parse(response.body);
    } catch {
      json = response.body;
    }

    return {
      statusCode: response.statusCode,
      headers: response.headers,
      body: json,
    };
  }

  // =========================================================================
  // SETUP TEST ACTORS
  // =========================================================================
  const testPassword = "Password123!Secure";
  const passwordHash = await hasher.hashPassword(testPassword);

  const adminId = randomUUID();
  const mediaStaffFullId = randomUUID();
  const mediaStaffCreateOnlyId = randomUUID();
  const customerId = randomUUID();
  const suspendedStaffId = randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
     VALUES
     ($1, $2, $3, 'admin', 'active', NOW()),
     ($4, $5, $6, 'media_team', 'active', NOW()),
     ($7, $8, $9, 'media_team', 'active', NOW()),
     ($10, $11, $12, 'customer', 'active', NOW()),
     ($13, $14, $15, 'media_team', 'suspended', NOW())`,
    [
      adminId, `admin-cross-${adminId.slice(0, 6)}@test.com`, passwordHash,
      mediaStaffFullId, `staff-full-${mediaStaffFullId.slice(0, 6)}@test.com`, passwordHash,
      mediaStaffCreateOnlyId, `staff-create-${mediaStaffCreateOnlyId.slice(0, 6)}@test.com`, passwordHash,
      customerId, `cust-cross-${customerId.slice(0, 6)}@test.com`, passwordHash,
      suspendedStaffId, `susp-cross-${suspendedStaffId.slice(0, 6)}@test.com`, passwordHash,
    ],
  );

  // Grant capabilities to full staff member
  for (const cap of ["CONTENT_CREATE", "CONTENT_EDIT", "CONTENT_PUBLISH", "CONTENT_ARCHIVE", "TAXONOMY_MANAGE"]) {
    await pool.query(
      `INSERT INTO user_capabilities (user_id, capability, granted_by) VALUES ($1, $2, $3)`,
      [mediaStaffFullId, cap, adminId],
    );
  }

  // Grant only CONTENT_CREATE to createOnly staff member
  await pool.query(
    `INSERT INTO user_capabilities (user_id, capability, granted_by) VALUES ($1, 'CONTENT_CREATE', $2)`,
    [mediaStaffCreateOnlyId, adminId],
  );

  // Shared cookies
  const adminCookie = await createSessionCookieForUser(adminId);
  const mediaStaffFullCookie = await createSessionCookieForUser(mediaStaffFullId);
  const mediaStaffCreateOnlyCookie = await createSessionCookieForUser(mediaStaffCreateOnlyId);
  const customerCookie = await createSessionCookieForUser(customerId);
  const suspendedStaffCookie = await createSessionCookieForUser(suspendedStaffId);

  // =========================================================================
  // SUITE 1: CUSTOMER REGISTRATION, LOGIN, REAL SESSION & GUARD VERIFICATION
  // =========================================================================
  await t.test("1. Customer Registration, Real Login, Session Resolution and Guards", async () => {
    const regEmail = `new-reg-${randomUUID().slice(0, 8)}@test.com`;

    // 1.1 Register through HTTP POST /api/v1/auth/register
    const regRes = await injectRequest({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: regEmail, password: testPassword },
    });
    assert.equal(regRes.statusCode, 201);
    assert.equal(regRes.body.success, true);
    assert.equal(regRes.body.data.user.role, "customer");
    assert.equal(regRes.body.data.user.status, "pending_verification");

    // Verify token was stored and verify email in database to make active
    const newUserId = regRes.body.data.user.id;
    await pool.query(`UPDATE users SET status = 'active', email_verified_at = NOW() WHERE id = $1`, [newUserId]);

    // 1.2 Login through HTTP POST /api/v1/auth/login
    const loginRes = await injectRequest({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: regEmail, password: testPassword },
    });
    assert.equal(loginRes.statusCode, 200);

    // Verify Set-Cookie header contains gifted_session
    const setCookie = loginRes.headers["set-cookie"];
    assert.ok(setCookie, "Login response must set cookie");
    const cookieString = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieString.includes("gifted_session="), "Cookie must be named gifted_session");
    assert.ok(cookieString.includes("HttpOnly"), "Cookie must be HttpOnly");

    // Extract raw cookie value
    const match = cookieString.match(/gifted_session=([^;]+)/);
    assert.ok(match, "Must extract gifted_session token");
    const rawSessionCookie = `gifted_session=${match[1]}`;

    // 1.3 Verify session resolution through HTTP GET /api/v1/auth/me
    const meRes = await injectRequest({
      method: "GET",
      url: "/api/v1/auth/me",
      cookie: rawSessionCookie,
    });
    assert.equal(meRes.statusCode, 200);
    assert.equal(meRes.body.data.user.id, newUserId);
    assert.equal(meRes.body.data.user.email, regEmail);
    assert.equal(meRes.body.data.user.role, "customer");

    // 1.4 Unauthenticated request fails with 401
    const noAuthRes = await injectRequest({
      method: "GET",
      url: "/api/v1/auth/me",
    });
    assert.equal(noAuthRes.statusCode, 401);

    // 1.5 Tampered session cookie fails with 401
    const tamperedRes = await injectRequest({
      method: "GET",
      url: "/api/v1/auth/me",
      cookie: "gifted_session=tampered-invalid-token-1234567890",
    });
    assert.equal(tamperedRes.statusCode, 401);

    // 1.6 Verify session in PostgreSQL has ONLY token_hash and NOT raw token
    const dbSession = await pool.query(`SELECT * FROM sessions WHERE user_id = $1`, [newUserId]);
    assert.equal(dbSession.rowCount, 1);
    assert.ok(dbSession.rows[0].token_hash);
    assert.notEqual(dbSession.rows[0].token_hash, match[1], "Raw token must not be stored in DB");
  });

  // =========================================================================
  // SUITE 2: CROSS-PHASE AUTHORIZATION & CAPABILITY BOUNDARIES
  // =========================================================================
  await t.test("2. Cross-Phase Authorization: Customer vs Staff vs Admin", async () => {
    // 2.1 Customer attempting staff catalog creation is blocked with 403
    const custStaffRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      cookie: customerCookie,
      payload: {
        title: "Unauthorized Movie",
        slug: `unauth-${randomUUID().slice(0, 6)}`,
        contentType: "movie",
      },
    });
    assert.equal(custStaffRes.statusCode, 403);
    assert.equal(custStaffRes.body.success, false);

    // 2.2 Media Team member with ONLY CONTENT_CREATE attempting CONTENT_EDIT is blocked with 403
    const editRes = await injectRequest({
      method: "PATCH",
      url: `/api/v1/staff/catalog/${randomUUID()}`,
      cookie: mediaStaffCreateOnlyCookie,
      payload: { title: "New Title" },
    });
    assert.equal(editRes.statusCode, 403);
    assert.equal(editRes.body.success, false);

    // 2.3 Suspended Staff Member is blocked centrally with 403 ACCOUNT_SUSPENDED
    const suspRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      cookie: suspendedStaffCookie,
      payload: {
        title: "Suspended Movie",
        slug: `susp-${randomUUID().slice(0, 6)}`,
        contentType: "movie",
      },
    });
    assert.equal(suspRes.statusCode, 403);
    assert.equal(suspRes.body.success, false);
  });

  // =========================================================================
  // SUITE 3: REAL TAXONOMY WORKFLOW & 409 CONFLICT SAFEGUARD
  // =========================================================================
  let testCategoryId: string;
  let testCountryId: string;
  let testDjId: string;

  await t.test("3. Real Taxonomy Workflow and Deletion Guard", async () => {
    // 3.1 Create Category through HTTP POST /api/v1/staff/taxonomies/categories
    const catSlug = `cat-cross-${randomUUID().slice(0, 6)}`;
    const catRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/taxonomies/categories",
      cookie: mediaStaffFullCookie,
      payload: {
        name: "Action Cinema Cross",
        slug: catSlug,
        description: "High intensity movies",
      },
    });
    assert.equal(catRes.statusCode, 201);
    assert.equal(catRes.body.success, true);
    testCategoryId = catRes.body.data.id;

    // Verify audit event in PostgreSQL captures exact authenticated actor
    const catAudit = await pool.query(
      `SELECT * FROM audit_events WHERE resource_id = $1 AND action = 'TAXONOMY_CREATE'`,
      [testCategoryId],
    );
    assert.equal(catAudit.rowCount, 1);
    assert.equal(catAudit.rows[0].actor_id, mediaStaffFullId, "Audit must record authenticated staff ID");

    // 3.2 Create Country through HTTP POST /api/v1/staff/taxonomies/countries
    const countryRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/taxonomies/countries",
      cookie: mediaStaffFullCookie,
      payload: {
        name: "Tanzania Cross",
        code: `T${randomUUID().slice(0, 3).toUpperCase()}`,
        flagEmoji: "🇹🇿",
      },
    });
    assert.equal(countryRes.statusCode, 201);
    assert.equal(countryRes.body.success, true);
    testCountryId = countryRes.body.data.id;

    // 3.3 Create DJ voice artist through HTTP POST /api/v1/staff/taxonomies/djs
    const djRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/taxonomies/djs",
      cookie: mediaStaffFullCookie,
      payload: {
        name: "DJ Afro Cross",
        stageName: `DJ Afro ${randomUUID().slice(0, 4)}`,
        slug: `dj-afro-${randomUUID().slice(0, 6)}`,
        colorHex: "#FF0000",
      },
    });
    assert.equal(djRes.statusCode, 201);
    assert.equal(djRes.body.success, true);
    testDjId = djRes.body.data.id;
  });

  // =========================================================================
  // SUITE 4: REAL MOVIE WORKFLOW, PROGRESSIVE READINESS & APPROVAL GATES
  // =========================================================================
  let movieId: string;
  let editionId: string;

  await t.test("4. Complete Movie Workflow: Creation -> 9/9 Readiness -> Approval Gate -> Audit", async () => {
    // 4.1 Create Movie with initial draft state
    const movieSlug = `movie-cross-${randomUUID().slice(0, 6)}`;
    const createMovieRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      cookie: mediaStaffFullCookie,
      payload: {
        title: "Gladiator Cross Test",
        slug: movieSlug,
        contentType: "movie",
        releaseYear: 2024,
        durationMinutes: 148,
        description: "An epic movie for integration verification",
        categoryIds: [testCategoryId],
        countryIds: [testCountryId],
      },
    });
    assert.equal(createMovieRes.statusCode, 201);
    assert.equal(createMovieRes.body.success, true);
    movieId = createMovieRes.body.data.id;
    assert.equal(createMovieRes.body.data.status, "draft");

    // Verify DB state
    const movieDb = await pool.query(`SELECT * FROM content WHERE id = $1`, [movieId]);
    assert.equal(movieDb.rows[0].created_by, mediaStaffFullId);
    assert.equal(movieDb.rows[0].status, "draft");

    // Verify taxonomy deletion is now blocked with 409 TAXONOMY_IN_USE
    const delCatRes = await injectRequest({
      method: "DELETE",
      url: `/api/v1/staff/taxonomies/categories/${testCategoryId}`,
      cookie: mediaStaffFullCookie,
    });
    assert.equal(delCatRes.statusCode, 409);
    assert.equal(delCatRes.body.error.code, "TAXONOMY_IN_USE");

    // 4.2 Negative Readiness: Attempt to publish movie without edition -> 422 DEFAULT_EDITION_REQUIRED
    const prematurePublishRes = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/publish`,
      cookie: mediaStaffFullCookie,
    });
    assert.equal(prematurePublishRes.statusCode, 422);
    assert.equal(prematurePublishRes.body.error.code, "DEFAULT_EDITION_REQUIRED");

    // 4.3 Attach Movie Edition with pending media
    const editionRes = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/movies/${movieId}/editions`,
      cookie: mediaStaffFullCookie,
      payload: {
        djId: testDjId,
        streamingFileKey: "stream-raw-key",
        downloadFileKey: "download-raw-key",
        streamingStatus: "processing", // not ready
        downloadStatus: "ready",
        isDefault: true,
        isAvailable: true,
      },
    });
    assert.equal(editionRes.statusCode, 201);
    assert.equal(editionRes.body.success, true);
    editionId = editionRes.body.data.id;

    // 4.4 Negative Readiness: Attempt to publish movie with incomplete 9/9 criteria -> 422 PUBLICATION_READINESS_FAILED
    const incompletePublishRes = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/publish`,
      cookie: mediaStaffFullCookie,
    });
    assert.equal(incompletePublishRes.statusCode, 422);
    assert.equal(incompletePublishRes.body.error.code, "PUBLICATION_READINESS_FAILED");
    assert.ok(incompletePublishRes.body.error.details.includes("streamingMedia"));

    // 4.5 Satisfy all 9/9 publication readiness criteria
    // Update metadata with poster, backdrop, trailer
    await injectRequest({
      method: "PATCH",
      url: `/api/v1/staff/catalog/${movieId}`,
      cookie: mediaStaffFullCookie,
      payload: {
        posterUrl: "https://storage.giftedpro.test/posters/gladiator.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrops/gladiator.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailers/gladiator.mp4",
      },
    });

    // Update edition streamingStatus to 'ready'
    await injectRequest({
      method: "PATCH",
      url: `/api/v1/staff/catalog/movies/${movieId}/editions/${editionId}`,
      cookie: mediaStaffFullCookie,
      payload: {
        streamingStatus: "ready",
        downloadStatus: "ready",
      },
    });

    // 4.6 Case A: Approval Gate Required (publishingRequiresApproval = true)
    await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog/settings/publishing-requires-approval",
      cookie: adminCookie,
      payload: { enabled: true },
    });

    // Staff submits for review
    const submitRes = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/submit`,
      cookie: mediaStaffFullCookie,
    });
    assert.equal(submitRes.statusCode, 200);
    assert.equal(submitRes.body.data.status, "pending_review", "Must transition to pending_review when approval required");

    // Verify DB state
    const submitDb = await pool.query(`SELECT status FROM content WHERE id = $1`, [movieId]);
    assert.equal(submitDb.rows[0].status, "pending_review");

    // Verify audit event in DB
    const submitAudit = await pool.query(
      `SELECT * FROM audit_events WHERE resource_id = $1 AND action = 'CONTENT_SUBMIT_REVIEW'`,
      [movieId],
    );
    assert.equal(submitAudit.rowCount, 1);
    assert.equal(submitAudit.rows[0].actor_id, mediaStaffFullId);

    // 4.7 Rejection Workflow: Admin rejects with reason
    const rejectReason = "Please improve audio normalization on DJ track";
    const rejectRes = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/reject`,
      cookie: adminCookie,
      payload: { rejectionReason: rejectReason },
    });
    assert.equal(rejectRes.statusCode, 200);
    assert.equal(rejectRes.body.data.status, "draft");

    // Verify review note in DB
    const noteDb = await pool.query(`SELECT * FROM content_review_notes WHERE content_id = $1`, [movieId]);
    assert.equal(noteDb.rowCount, 1);
    assert.equal(noteDb.rows[0].reviewer_id, adminId);
    assert.equal(noteDb.rows[0].rejection_reason, rejectReason);

    // Verify in-app notification delivered to original creator
    const notifDb = await pool.query(`SELECT * FROM notifications WHERE user_id = $1`, [mediaStaffFullId]);
    assert.ok((notifDb.rowCount ?? 0) >= 1, "Author must receive rejection notification");
    assert.equal(notifDb.rows[0].type, "CATALOG_REJECTION");

    // 4.8 Re-submit for review
    await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/submit`,
      cookie: mediaStaffFullCookie,
    });

    // 4.9 Admin publishes content from pending_review
    const publishRes = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/publish`,
      cookie: adminCookie,
    });
    assert.equal(publishRes.statusCode, 200);
    assert.equal(publishRes.body.data.status, "published");

    // Verify DB state is published
    const finalDb = await pool.query(`SELECT * FROM content WHERE id = $1`, [movieId]);
    assert.equal(finalDb.rows[0].status, "published");
    assert.equal(finalDb.rows[0].approved_by, adminId);
    assert.ok(finalDb.rows[0].published_at);

    // Verify publish audit in DB captures adminId
    const publishAudit = await pool.query(
      `SELECT * FROM audit_events WHERE resource_id = $1 AND action = 'CONTENT_PUBLISH' ORDER BY created_at DESC LIMIT 1`,
      [movieId],
    );
    assert.equal(publishAudit.rowCount, 1);
    assert.equal(publishAudit.rows[0].actor_id, adminId);
  });

  // =========================================================================
  // SUITE 5: CASE B AUTO-PUBLISHING WORKFLOW
  // =========================================================================
  await t.test("5. Case B: Auto-Publishing when publishingRequiresApproval = false", async () => {
    // Disable approval requirement
    await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog/settings/publishing-requires-approval",
      cookie: adminCookie,
      payload: { enabled: false },
    });

    // Create 100% complete movie
    const autoMovieSlug = `auto-movie-${randomUUID().slice(0, 6)}`;
    const createRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      cookie: mediaStaffFullCookie,
      payload: {
        title: "Auto Publish Movie",
        slug: autoMovieSlug,
        contentType: "movie",
        releaseYear: 2025,
        durationMinutes: 120,
        description: "Ready movie description",
        posterUrl: "https://storage.giftedpro.test/poster.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrop.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailer.mp4",
        categoryIds: [testCategoryId],
        countryIds: [testCountryId],
      },
    });
    assert.equal(createRes.statusCode, 201);
    const autoMovieId = createRes.body.data.id;

    // Attach ready edition
    await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/movies/${autoMovieId}/editions`,
      cookie: mediaStaffFullCookie,
      payload: {
        djId: testDjId,
        streamingFileKey: "stream-auto-key",
        downloadFileKey: "download-auto-key",
        streamingStatus: "ready",
        downloadStatus: "ready",
        isDefault: true,
        isAvailable: true,
      },
    });

    // Submit for review -> Should auto-publish directly to 'published'
    const submitRes = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${autoMovieId}/submit`,
      cookie: mediaStaffFullCookie,
    });
    assert.equal(submitRes.statusCode, 200);
    assert.equal(submitRes.body.data.status, "published", "Content must auto-publish directly when gate is false");

    const autoDb = await pool.query(`SELECT status FROM content WHERE id = $1`, [autoMovieId]);
    assert.equal(autoDb.rows[0].status, "published");
  });

  // =========================================================================
  // SUITE 6: CROSS-PHASE CONCURRENCY & INTEGRITY RACE
  // =========================================================================
  await t.test("6. Cross-Phase Concurrency: Concurrent Default Edition Promotion", async () => {
    // Create movie with 2 editions
    const raceMovieSlug = `race-movie-${randomUUID().slice(0, 6)}`;
    const createRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      cookie: mediaStaffFullCookie,
      payload: {
        title: "Race Movie",
        slug: raceMovieSlug,
        contentType: "movie",
      },
    });
    assert.equal(createRes.statusCode, 201);
    const raceMovieId = createRes.body.data.id;

    const ed1Res = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/movies/${raceMovieId}/editions`,
      cookie: mediaStaffFullCookie,
      payload: { djId: testDjId, isDefault: true, isAvailable: true },
    });
    assert.equal(ed1Res.statusCode, 201);
    const ed1Id = ed1Res.body.data.id;

    // Create second DJ
    const dj2 = await pool.query(
      `INSERT INTO dj_voice_artists (id, name, stage_name, slug, is_active)
       VALUES ($1, 'DJ Two', $2, $3, true) RETURNING id`,
      [randomUUID(), `DJ Two ${randomUUID().slice(0, 4)}`, `dj-two-${randomUUID().slice(0, 6)}`],
    );
    const dj2Id = dj2.rows[0].id;

    const ed2Res = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/movies/${raceMovieId}/editions`,
      cookie: mediaStaffFullCookie,
      payload: { djId: dj2Id, isDefault: false, isAvailable: true },
    });
    assert.equal(ed2Res.statusCode, 201);
    const ed2Id = ed2Res.body.data.id;

    // Concurrently promote ed1 and ed2 with authenticated staff sessions
    const [resA, resB] = await Promise.all([
      injectRequest({
        method: "POST",
        url: `/api/v1/staff/catalog/movies/${raceMovieId}/editions/${ed1Id}/set-default`,
        cookie: mediaStaffFullCookie,
      }),
      injectRequest({
        method: "POST",
        url: `/api/v1/staff/catalog/movies/${raceMovieId}/editions/${ed2Id}/set-default`,
        cookie: adminCookie,
      }),
    ]);

    assert.equal(resA.statusCode, 200);
    assert.equal(resB.statusCode, 200);

    // Verify DB invariant: exactly 1 default edition exists
    const defaultCheck = await pool.query(
      `SELECT id, is_default FROM movie_editions WHERE movie_id = $1 AND is_default = true`,
      [raceMovieId],
    );
    assert.equal(defaultCheck.rowCount, 1, "Must have exactly 1 default edition after concurrent promotions");
  });

  // =========================================================================
  // SUITE 7: FOCUSED INTEGRATED ADVERSARIAL ATTACKS
  // =========================================================================
  await t.test("7. Focused Integrated Adversarial Attacks", async () => {
    // 7.1 Attack 1: Unauthenticated request to staff endpoint -> 401
    const a1 = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      payload: { title: "No Auth", slug: "no-auth", contentType: "movie" },
    });
    assert.equal(a1.statusCode, 401);

    // 7.2 Attack 2: Customer privilege escalation by injecting role in payload -> 403
    const a2 = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      cookie: customerCookie,
      payload: { title: "Escalate", slug: "escalate", contentType: "movie", role: "admin" },
    });
    assert.equal(a2.statusCode, 403);

    // 7.3 Attack 3: Media Team without required capability -> 403
    const a3 = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/publish`,
      cookie: mediaStaffCreateOnlyCookie,
    });
    assert.equal(a3.statusCode, 403);
    assert.equal(a3.body.success, false);

    // 7.4 Attack 4: Polymorphic Cross-Type Attachment -> 422 INVALID_CONTENT_TYPE
    // Attempting to attach series metadata to a movie
    const a4 = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/series/${movieId}/metadata`,
      cookie: mediaStaffFullCookie,
      payload: { leadDjId: testDjId },
    });
    assert.equal(a4.statusCode, 422);
    assert.equal(a4.body.error.code, "INVALID_CONTENT_TYPE");

    // 7.5 Attack 5: Invalid Lifecycle Transition (Direct restore from DRAFT to PUBLISHED) -> 400
    const a5 = await injectRequest({
      method: "POST",
      url: `/api/v1/staff/catalog/${movieId}/restore-to-draft`,
      cookie: mediaStaffFullCookie,
    });
    assert.equal(a5.statusCode, 400);
    assert.equal(a5.body.error.code, "INVALID_LIFECYCLE_TRANSITION");

    // 7.6 Attack 6: IDOR - Manipulate edition belonging to Movie B via Movie A
    const foreignMovieRes = await injectRequest({
      method: "POST",
      url: "/api/v1/staff/catalog",
      cookie: mediaStaffFullCookie,
      payload: { title: "Movie B", slug: `movie-b-${randomUUID().slice(0, 6)}`, contentType: "movie" },
    });
    assert.equal(foreignMovieRes.statusCode, 201);
    const foreignMovieId = foreignMovieRes.body.data.id;

    const idorRes = await injectRequest({
      method: "PATCH",
      url: `/api/v1/staff/catalog/movies/${movieId}/editions/${foreignMovieId}`,
      cookie: mediaStaffFullCookie,
      payload: { streamingStatus: "ready" },
    });
    assert.equal(idorRes.statusCode, 404);
    assert.equal(idorRes.body.error.code, "NOT_FOUND");

    // 7.7 Attack 7: Canonical API Error Envelope Verification
    assert.equal(typeof a4.body.success, "boolean");
    assert.equal(a4.body.success, false);
    assert.ok(a4.body.error.code);
    assert.ok(a4.body.error.message);
    assert.ok(a4.body.error.timestamp);
    assert.ok(a4.body.error.requestId);
  });

  await app.close();
  await pool.end();
});
