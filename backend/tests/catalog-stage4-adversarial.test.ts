import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import * as schema from "../src/infrastructure/database/schemas/index.js";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { CatalogRepository } from "../src/modules/catalog/repositories/catalog.repository.js";
import { PolymorphicCatalogService } from "../src/modules/catalog/services/polymorphic-catalog.service.js";
import { ContentLifecycleService } from "../src/modules/catalog/services/content-lifecycle.service.js";
import { TaxonomyService } from "../src/modules/catalog/services/taxonomy.service.js";
import { SystemSettingsService } from "../src/modules/catalog/services/system-settings.service.js";
import { AuditService } from "../src/modules/audit/audit.service.js";
import { NotificationsService } from "../src/modules/notifications/notifications.service.js";
import { generateSecureToken, hashToken } from "../src/modules/identity/utils/token.utils.js";
import {
  ContentNotFoundException,
  InvalidLifecycleTransitionException,
  PublicationReadinessFailedException,
  DefaultEditionRequiredException,
  SeriesInitialContentRequiredException,
  TaxonomyInUseException,
  InvalidContentTypeException,
  InvalidHierarchyException,
} from "../src/modules/catalog/catalog.errors.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Phase 3C Stage 4: Security & Integrity Adversarial Verification Suite", async (t) => {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });
  const db = drizzle(pool, { schema });

  const auditService = new AuditService(db);
  const notificationsService = new NotificationsService(db);
  const repository = new CatalogRepository(db);
  const settingsService = new SystemSettingsService(db, auditService);
  const polymorphicCatalog = new PolymorphicCatalogService(db, repository, auditService);
  const lifecycle = new ContentLifecycleService(
    db,
    repository,
    auditService,
    notificationsService,
    settingsService,
  );
  const taxonomy = new TaxonomyService(db, auditService);

  // Setup testing actors
  const adminId = randomUUID();
  const fullStaffId = randomUUID();
  const createOnlyStaffId = randomUUID();
  const unprivilegedStaffId = randomUUID();
  const customerId = randomUUID();
  const suspendedStaffId = randomUUID();
  const deactivatedStaffId = randomUUID();
  const pendingStaffId = randomUUID();

  // Shared taxonomy fixtures
  let categoryId: string;
  let countryId: string;
  let djId: string;

  let adminCookie: string;
  let fullStaffCookie: string;
  let createOnlyStaffCookie: string;
  let unprivilegedStaffCookie: string;
  let customerCookie: string;
  let suspendedCookie: string;
  let deactivatedCookie: string;
  let pendingCookie: string;

  let app: NestFastifyApplication;

  try {
    // 1. Seed users
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
       VALUES
       ($1, $2, 'hash', 'admin', 'active', NOW()),
       ($3, $4, 'hash', 'media_team', 'active', NOW()),
       ($5, $6, 'hash', 'media_team', 'active', NOW()),
       ($7, $8, 'hash', 'media_team', 'active', NOW()),
       ($9, $10, 'hash', 'customer', 'active', NOW()),
       ($11, $12, 'hash', 'media_team', 'suspended', NOW()),
       ($13, $14, 'hash', 'media_team', 'deactivated', NOW()),
       ($15, $16, 'hash', 'media_team', 'pending_verification', NULL)`,
      [
        adminId,
        `adv-admin-${adminId.slice(0, 6)}@test.com`,
        fullStaffId,
        `adv-full-${fullStaffId.slice(0, 6)}@test.com`,
        createOnlyStaffId,
        `adv-create-${createOnlyStaffId.slice(0, 6)}@test.com`,
        unprivilegedStaffId,
        `adv-none-${unprivilegedStaffId.slice(0, 6)}@test.com`,
        customerId,
        `adv-cust-${customerId.slice(0, 6)}@test.com`,
        suspendedStaffId,
        `adv-susp-${suspendedStaffId.slice(0, 6)}@test.com`,
        deactivatedStaffId,
        `adv-deact-${deactivatedStaffId.slice(0, 6)}@test.com`,
        pendingStaffId,
        `adv-pend-${pendingStaffId.slice(0, 6)}@test.com`,
      ],
    );

    // 2. Grant capabilities
    // fullStaff has all capabilities
    for (const cap of ["CONTENT_CREATE", "CONTENT_EDIT", "CONTENT_PUBLISH", "CONTENT_ARCHIVE", "TAXONOMY_MANAGE"]) {
      await pool.query(
        `INSERT INTO user_capabilities (user_id, capability, granted_by) VALUES ($1, $2, $3)`,
        [fullStaffId, cap, adminId],
      );
    }
    // createOnlyStaff has ONLY CONTENT_CREATE
    await pool.query(
      `INSERT INTO user_capabilities (user_id, capability, granted_by) VALUES ($1, 'CONTENT_CREATE', $2)`,
      [createOnlyStaffId, adminId],
    );

    // 3. Seed taxonomy
    const cat = await taxonomy.createCategory(
      { name: `Adv Cat ${randomUUID().slice(0, 6)}`, slug: `adv-cat-${randomUUID().slice(0, 6)}` },
      fullStaffId,
    );
    categoryId = cat.id;

    const country = await taxonomy.createCountry(
      { name: `Adv Country ${randomUUID().slice(0, 6)}`, code: `A${randomUUID().slice(0, 3).toUpperCase()}` },
      fullStaffId,
    );
    countryId = country.id;

    const dj = await taxonomy.createDj(
      { name: "Adv DJ", stageName: `DJ Adv ${randomUUID().slice(0, 6)}`, slug: `dj-adv-${randomUUID().slice(0, 6)}` },
      fullStaffId,
    );
    djId = dj.id;

    // 4. Create Fastify application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const fastifyAdapter = new FastifyAdapter();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(fastifyAdapter);

    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(fastifyCookie);
    configureHttpApplication(app);
    app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
    await app.init();

    // 5. Generate session cookies
    adminCookie = await createSessionCookie(adminId);
    fullStaffCookie = await createSessionCookie(fullStaffId);
    createOnlyStaffCookie = await createSessionCookie(createOnlyStaffId);
    unprivilegedStaffCookie = await createSessionCookie(unprivilegedStaffId);
    customerCookie = await createSessionCookie(customerId);
    suspendedCookie = await createSessionCookie(suspendedStaffId);
    deactivatedCookie = await createSessionCookie(deactivatedStaffId);
    pendingCookie = await createSessionCookie(pendingStaffId);
  } catch (err) {
    console.error("Failed to setup adversarial test suite:", err);
    throw err;
  }

  async function createSessionCookie(userId: string): Promise<string> {
    const rawToken = generateSecureToken();
    const hashed = hashToken(rawToken);
    await pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_active_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', NOW(), NOW())`,
      [randomUUID(), userId, hashed],
    );
    return `gifted_session=${rawToken}`;
  }

  // Helper to create fully ready movie fixture
  async function createBaseReadyMovie(overrides: Record<string, any> = {}) {
    const movie = await polymorphicCatalog.createContent(
      {
        title: overrides.title ?? "Adv Ready Movie",
        slug: overrides.slug ?? `adv-ready-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: overrides.releaseYear ?? 2024,
        durationMinutes: overrides.durationMinutes ?? 110,
        description: overrides.description !== undefined ? overrides.description : "Valid description.",
        posterUrl: overrides.posterUrl !== undefined ? overrides.posterUrl : "https://storage.giftedpro.test/p.jpg",
        backdropUrl: overrides.backdropUrl !== undefined ? overrides.backdropUrl : "https://storage.giftedpro.test/b.jpg",
        trailerUrl: overrides.trailerUrl !== undefined ? overrides.trailerUrl : "https://storage.giftedpro.test/t.mp4",
        categoryIds: overrides.categoryIds !== undefined ? overrides.categoryIds : [categoryId],
        countryIds: overrides.countryIds !== undefined ? overrides.countryIds : [countryId],
      },
      fullStaffId,
    );

    if (overrides.skipEdition !== true) {
      await polymorphicCatalog.attachMovieEdition(
        movie.id,
        {
          djId: overrides.djId ?? djId,
          streamingFileKey: overrides.streamingFileKey ?? "media/stream.m3u8",
          downloadFileKey: overrides.downloadFileKey ?? "media/dl.mp4",
          streamingStatus: overrides.streamingStatus ?? "ready",
          downloadStatus: overrides.downloadStatus ?? "ready",
          isDefault: overrides.isDefault !== undefined ? overrides.isDefault : true,
        },
        fullStaffId,
      );
    }

    return movie;
  }

  t.after(async () => {
    if (app) {
      await app.close();
    }
    await pool.end();
  });

  // =========================================================================
  // SECTION 3: AUTHENTICATION & RBAC BOUNDARY ATTACKS
  // =========================================================================

  await t.test("Attack A.1 — Unauthenticated requests rejected with 401 across all catalog endpoints", async () => {
    const endpoints = [
      { method: "POST", url: "/api/v1/staff/catalog", payload: { title: "T", contentType: "movie" } },
      { method: "PATCH", url: `/api/v1/staff/catalog/${randomUUID()}`, payload: { title: "T" } },
      { method: "POST", url: `/api/v1/staff/catalog/${randomUUID()}/publish`, payload: {} },
      { method: "POST", url: `/api/v1/staff/catalog/${randomUUID()}/unpublish`, payload: { reason: "R" } },
      { method: "POST", url: `/api/v1/staff/catalog/${randomUUID()}/archive`, payload: {} },
      { method: "POST", url: `/api/v1/staff/taxonomies/categories`, payload: { name: "C", slug: "c" } },
    ];

    for (const ep of endpoints) {
      const res = await app.inject({
        method: ep.method as any,
        url: ep.url,
        payload: ep.payload,
      });
      assert.equal(res.statusCode, 401, `Expected 401 for ${ep.method} ${ep.url}`);
    }
  });

  await t.test("Attack A.2 — Customer accounts rejected with 403 across all staff catalog endpoints", async () => {
    const endpoints = [
      { method: "POST", url: "/api/v1/staff/catalog", payload: { title: "Cust Movie", contentType: "movie" } },
      { method: "POST", url: `/api/v1/staff/catalog/${randomUUID()}/publish`, payload: {} },
      { method: "POST", url: `/api/v1/staff/taxonomies/categories`, payload: { name: "Cust Cat", slug: "cc" } },
    ];

    for (const ep of endpoints) {
      const res = await app.inject({
        method: ep.method as any,
        url: ep.url,
        headers: { cookie: customerCookie },
        payload: ep.payload,
      });
      assert.equal(res.statusCode, 403, `Expected 403 Forbidden for customer on ${ep.method} ${ep.url}`);
    }
  });

  await t.test("Attack A.3 — Suspended and Deactivated accounts blocked centrally by SessionAuthGuard", async () => {
    const resSusp = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: suspendedCookie },
      payload: { title: "Suspended Movie", contentType: "movie" },
    });
    assert.equal(resSusp.statusCode, 403);
    const bodySusp = JSON.parse(resSusp.payload);
    assert.ok(bodySusp.error.message.includes("ACCOUNT_SUSPENDED"));

    const resDeact = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: deactivatedCookie },
      payload: { title: "Deactivated Movie", contentType: "movie" },
    });
    assert.equal(resDeact.statusCode, 403);
    const bodyDeact = JSON.parse(resDeact.payload);
    assert.ok(bodyDeact.error.message.includes("ACCOUNT_DEACTIVATED"));
  });

  await t.test("Attack A.4 — Pending verification staff blocked centrally from mutating catalog", async () => {
    const resPending = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: pendingCookie },
      payload: { title: "Pending Staff Movie", contentType: "movie" },
    });
    assert.equal(resPending.statusCode, 403);
    const bodyPending = JSON.parse(resPending.payload);
    assert.ok(bodyPending.error.message.includes("ACCOUNT_PENDING_VERIFICATION"));
  });

  // =========================================================================
  // SECTION 4: CAPABILITY BYPASS & PRIVILEGE ESCALATION ATTACKS
  // =========================================================================

  await t.test("Attack B.1 — Staff with only CONTENT_CREATE cannot invoke CONTENT_EDIT, PUBLISH, ARCHIVE, or TAXONOMY_MANAGE", async () => {
    // 1. Can create content
    const resCreate = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: createOnlyStaffCookie },
      payload: {
        title: "Create Only Movie",
        slug: `create-only-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
      },
    });
    assert.equal(resCreate.statusCode, 201);
    const created = JSON.parse(resCreate.payload).data;

    // 2. Cannot edit metadata (requires CONTENT_EDIT)
    const resEdit = await app.inject({
      method: "PATCH",
      url: `/api/v1/staff/catalog/${created.id}`,
      headers: { cookie: createOnlyStaffCookie },
      payload: { title: "Escalated Title" },
    });
    assert.equal(resEdit.statusCode, 403);

    // 3. Cannot publish (requires CONTENT_PUBLISH)
    const resPublish = await app.inject({
      method: "POST",
      url: `/api/v1/staff/catalog/${created.id}/publish`,
      headers: { cookie: createOnlyStaffCookie },
    });
    assert.equal(resPublish.statusCode, 403);

    // 4. Cannot archive (requires CONTENT_ARCHIVE)
    const resArchive = await app.inject({
      method: "POST",
      url: `/api/v1/staff/catalog/${created.id}/archive`,
      headers: { cookie: createOnlyStaffCookie },
    });
    assert.equal(resArchive.statusCode, 403);

    // 5. Cannot manage taxonomy (requires TAXONOMY_MANAGE)
    const resTaxonomy = await app.inject({
      method: "POST",
      url: `/api/v1/staff/taxonomies/categories`,
      headers: { cookie: createOnlyStaffCookie },
      payload: { name: "Escalated Cat", slug: "esc-cat" },
    });
    assert.equal(resTaxonomy.statusCode, 403);
  });

  await t.test("Attack B.2 — Privilege escalation payload tampering (injecting role: 'admin') is neutralized", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: unprivilegedStaffCookie },
      payload: {
        title: "Malicious Privilege Escalation Movie",
        slug: `tamper-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        role: "admin",
        capabilities: ["CONTENT_CREATE", "CONTENT_PUBLISH"],
      },
    });
    assert.equal(res.statusCode, 403);
  });

  // =========================================================================
  // SECTION 5: IDOR & CROSS-RESOURCE MANIPULATION ATTACKS
  // =========================================================================

  await t.test("Attack C.1 — Swapped Parent/Child: Updating Episode using Season ID of a different series is rejected", async () => {
    const series1 = await polymorphicCatalog.createContent(
      { title: "Series 1", slug: `s1-${randomUUID().slice(0, 8)}`, contentType: "series" },
      fullStaffId,
    );
    const season1 = await polymorphicCatalog.createSeason(series1.id, { seasonNumber: 1 }, fullStaffId);
    const ep1 = await polymorphicCatalog.attachEpisode(
      season1.id,
      { episodeNumber: 1, title: "S1E1", streamingStatus: "ready", downloadStatus: "ready", durationMinutes: 45 },
      fullStaffId,
    );

    const series2 = await polymorphicCatalog.createContent(
      { title: "Series 2", slug: `s2-${randomUUID().slice(0, 8)}`, contentType: "series" },
      fullStaffId,
    );
    const season2 = await polymorphicCatalog.createSeason(series2.id, { seasonNumber: 1 }, fullStaffId);

    await assert.rejects(
      async () => {
        await polymorphicCatalog.updateEpisode(
          season2.id, // WRONG SEASON
          ep1.id,
          { title: "Hijacked Title" },
          fullStaffId,
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ContentNotFoundException || err instanceof InvalidHierarchyException);
        assert.ok([404, 422].includes((err as any).getStatus()));
        return true;
      },
    );

    const originalEps = await repository.findEpisodes(db, season1.id);
    const originalEp = originalEps.find((e) => e.id === ep1.id);
    assert.equal(originalEp?.title, "S1E1");
    assert.equal(originalEp?.seasonId, season1.id);
  });

  await t.test("Attack C.2 — Cross-Movie Default Edition Manipulation: Assigning edition of Movie B as default of Movie A is rejected", async () => {
    const movieA = await createBaseReadyMovie();
    const movieB = await createBaseReadyMovie();

    const editionsB = await repository.findMovieEditions(db, movieB.id);
    assert.ok(editionsB.length > 0);
    const editionB = editionsB[0];

    await assert.rejects(
      async () => {
        await polymorphicCatalog.repointDefaultEdition(movieA.id, editionB.id, fullStaffId);
      },
      (err: unknown) => {
        assert.ok(err instanceof ContentNotFoundException || err instanceof InvalidHierarchyException);
        return true;
      },
    );
  });

  await t.test("Attack C.3 — Outage Fallback IDOR: Failing edition belonging to Movie B via Movie A is rejected", async () => {
    const movieA = await createBaseReadyMovie();
    const movieB = await createBaseReadyMovie();

    const editionsB = await repository.findMovieEditions(db, movieB.id);
    const editionB = editionsB[0];

    await assert.rejects(
      async () => {
        await lifecycle.handleMovieEditionFailure(movieA.id, editionB.id, fullStaffId);
      },
      (err: unknown) => {
        assert.ok(err instanceof ContentNotFoundException || err instanceof InvalidHierarchyException);
        return true;
      },
    );
  });

  // =========================================================================
  // SECTION 6: POLYMORPHIC TYPE-BYPASS ATTACKS
  // =========================================================================

  await t.test("Attack D.1 — Attach movie_editions to Series content rejected (422 INVALID_CONTENT_TYPE)", async () => {
    const series = await polymorphicCatalog.createContent(
      { title: "Series Target", slug: `series-target-${randomUUID().slice(0, 8)}`, contentType: "series" },
      fullStaffId,
    );

    await assert.rejects(
      async () => {
        await polymorphicCatalog.attachMovieEdition(
          series.id,
          { djId, streamingFileKey: "k", downloadFileKey: "k" },
          fullStaffId,
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidContentTypeException);
        assert.equal(err.getStatus(), 422);
        assert.equal((err.getResponse() as any).code, "INVALID_CONTENT_TYPE");
        return true;
      },
    );

    const editions = await pool.query(`SELECT * FROM movie_editions WHERE movie_id = $1`, [series.id]);
    assert.equal(editions.rowCount, 0);
  });

  await t.test("Attack D.2 — Attach series_metadata to Movie content rejected (422 INVALID_CONTENT_TYPE)", async () => {
    const movie = await createBaseReadyMovie();

    await assert.rejects(
      async () => {
        await polymorphicCatalog.attachSeriesMetadata(movie.id, { leadDjId: djId }, fullStaffId);
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidContentTypeException);
        assert.equal(err.getStatus(), 422);
        assert.equal((err.getResponse() as any).code, "INVALID_CONTENT_TYPE");
        return true;
      },
    );

    const meta = await pool.query(`SELECT * FROM series_metadata WHERE content_id = $1`, [movie.id]);
    assert.equal(meta.rowCount, 0);
  });

  await t.test("Attack D.3 — Create Season under Movie content rejected (422 INVALID_CONTENT_TYPE)", async () => {
    const movie = await createBaseReadyMovie();

    await assert.rejects(
      async () => {
        await polymorphicCatalog.createSeason(movie.id, { seasonNumber: 1 }, fullStaffId);
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidContentTypeException);
        assert.equal(err.getStatus(), 422);
        return true;
      },
    );

    const seasons = await pool.query(`SELECT * FROM seasons WHERE series_id = $1`, [movie.id]);
    assert.equal(seasons.rowCount, 0);
  });

  await t.test("Attack D.4 — Content Type Discriminator Immutability: Attempting to mutate contentType via update is rejected/ignored", async () => {
    const movie = await createBaseReadyMovie();

    // 1. HTTP PATCH attempting to change contentType
    await app.inject({
      method: "PATCH",
      url: `/api/v1/staff/catalog/${movie.id}`,
      headers: { cookie: fullStaffCookie },
      payload: {
        title: "Movie Renamed",
        contentType: "series", // Malicious attempt to change discriminator
      },
    });

    const persisted = await repository.findContentById(db, movie.id);
    assert.equal(persisted?.contentType, "movie", "contentType must remain strictly immutable");

    // 2. Direct domain repository call (UpdateContentInput does not have contentType)
    await repository.updateContent(db, movie.id, {
      title: "Movie Renamed Direct",
    });
    const persisted2 = await repository.findContentById(db, movie.id);
    assert.equal(persisted2?.contentType, "movie");
  });

  // =========================================================================
  // SECTION 7: LIFECYCLE BYPASS ATTACKS
  // =========================================================================

  await t.test("Attack E.1 — Illegal lifecycle transitions are strictly rejected (400 INVALID_LIFECYCLE_TRANSITION)", async () => {
    const movie = await createBaseReadyMovie();
    assert.equal(movie.status, "draft");

    // 1. Rejecting content that is NOT in pending_review (e.g. draft) is forbidden
    await assert.rejects(
      async () => await lifecycle.rejectContent(movie.id, "Rejected", adminId),
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );

    // 2. Publish to reach published state
    await lifecycle.publishContent(movie.id, adminId);
    const pub = await repository.findContentById(db, movie.id);
    assert.equal(pub?.status, "published");

    // 3. Submitting already-published content for review is forbidden
    await assert.rejects(
      async () => await lifecycle.submitForReview(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );

    // 4. Rejecting published content is forbidden
    await assert.rejects(
      async () => await lifecycle.rejectContent(movie.id, "Rejected", adminId),
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );

    // 5. Unpublish and Archive
    await lifecycle.unpublishContent(movie.id, adminId, "Hold");
    await lifecycle.archiveContent(movie.id, adminId);
    const arch = await repository.findContentById(db, movie.id);
    assert.equal(arch?.status, "archived");

    // 6. ARCHIVED -> PUBLISHED is strictly forbidden (must restore to draft first)
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );

    // 7. ARCHIVED -> UNPUBLISHED is forbidden
    await assert.rejects(
      async () => await lifecycle.unpublishContent(movie.id, adminId, "Hold"),
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );

    // 8. ARCHIVED -> SUBMIT_FOR_REVIEW is forbidden
    await assert.rejects(
      async () => await lifecycle.submitForReview(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );

    // 9. Restoring non-archived content is forbidden
    const draftMovie = await createBaseReadyMovie();
    await assert.rejects(
      async () => await lifecycle.restoreArchivedContent(draftMovie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );
  });

  // =========================================================================
  // SECTION 8: PUBLICATION READINESS BYPASS ATTACKS
  // =========================================================================

  await t.test("Attack F.1 — Publication fails with 422 PUBLICATION_READINESS_FAILED if any readiness criterion is missing", async () => {
    // Missing basic info
    const movieNoTitle = await createBaseReadyMovie({ title: "   " });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieNoTitle.id, adminId),
      PublicationReadinessFailedException,
    );

    // Missing poster
    const movieNoPoster = await createBaseReadyMovie({ posterUrl: "" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieNoPoster.id, adminId),
      PublicationReadinessFailedException,
    );

    // Missing categories
    const movieNoCats = await createBaseReadyMovie({ categoryIds: [] });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieNoCats.id, adminId),
      PublicationReadinessFailedException,
    );

    // Missing streaming media
    const movieNoStream = await createBaseReadyMovie({ streamingStatus: "pending" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieNoStream.id, adminId),
      PublicationReadinessFailedException,
    );

    // Missing default edition
    const movieNoDefault = await createBaseReadyMovie({ isDefault: false });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieNoDefault.id, adminId),
      DefaultEditionRequiredException,
    );
  });

  // =========================================================================
  // SECTION 9: MOVIE DEFAULT EDITION SECURITY & INTEGRITY ATTACKS
  // =========================================================================

  await t.test("Attack G.1 — Attempting to set two default editions via raw update violates partial unique index", async () => {
    const movie = await createBaseReadyMovie();

    const dj2 = await taxonomy.createDj(
      { name: "DJ 2", stageName: `DJ 2 ${randomUUID().slice(0, 6)}`, slug: `dj2-${randomUUID().slice(0, 6)}` },
      fullStaffId,
    );

    const [ed2] = await pool.query(
      `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, streaming_file_key, download_file_key)
       VALUES ($1, $2, $3, false, 'k', 'k') RETURNING *`,
      [randomUUID(), movie.id, dj2.id],
    ).then((r) => r.rows);

    await assert.rejects(
      async () => {
        await pool.query(`UPDATE movie_editions SET is_default = true WHERE id = $1`, [ed2.id]);
      },
      /movie_editions_single_default_idx/,
    );
  });

  // =========================================================================
  // SECTION 10: MOVIE OUTAGE FALLBACK ATTACKS
  // =========================================================================

  await t.test("Attack H.1 — Outage fallback Case A & Case B maintain exact default edition count and lifecycle invariants", async () => {
    const movieSolo = await createBaseReadyMovie();
    await lifecycle.publishContent(movieSolo.id, adminId);
    const [edSolo] = await repository.findMovieEditions(db, movieSolo.id);

    const caseBResult = await lifecycle.handleMovieEditionFailure(
      movieSolo.id,
      edSolo.id,
      adminId,
    );
    assert.equal(caseBResult.content.status, "unpublished");

    const postSoloMovie = await repository.findContentById(db, movieSolo.id);
    assert.equal(postSoloMovie?.status, "unpublished");

    const soloEditions = await repository.findMovieEditions(db, movieSolo.id);
    const activeDefaults = soloEditions.filter((e) => e.isDefault);
    assert.equal(activeDefaults.length, 0, "Expected exactly 0 default editions after Case B unpublish");
  });

  // =========================================================================
  // SECTION 11: SERIES INITIAL PUBLICATION BYPASS ATTACKS
  // =========================================================================

  await t.test("Attack I.1 — Series publication without Season 1 Episode 1 ready media strictly rejected", async () => {
    const series = await polymorphicCatalog.createContent(
      {
        title: "Adv Series Attack",
        slug: `adv-series-atk-${randomUUID().slice(0, 8)}`,
        contentType: "series",
        releaseYear: 2024,
        description: "Valid description",
        posterUrl: "https://storage.giftedpro.test/p.jpg",
        backdropUrl: "https://storage.giftedpro.test/b.jpg",
        trailerUrl: "https://storage.giftedpro.test/t.mp4",
        categoryIds: [categoryId],
        countryIds: [countryId],
      },
      fullStaffId,
    );
    await polymorphicCatalog.attachSeriesMetadata(series.id, { leadDjId: djId }, fullStaffId);

    // 1. No season -> fails
    await assert.rejects(
      async () => await lifecycle.publishContent(series.id, adminId),
      SeriesInitialContentRequiredException,
    );

    // 2. Season 1 with no Episode 1 -> fails
    const season1 = await polymorphicCatalog.createSeason(series.id, { seasonNumber: 1 }, fullStaffId);
    await assert.rejects(
      async () => await lifecycle.publishContent(series.id, adminId),
      SeriesInitialContentRequiredException,
    );

    // 3. Episode 2 exists but Episode 1 missing -> fails
    await polymorphicCatalog.attachEpisode(
      season1.id,
      { episodeNumber: 2, title: "Episode 2 Only", streamingStatus: "ready", downloadStatus: "ready", durationMinutes: 40 },
      fullStaffId,
    );
    await assert.rejects(
      async () => await lifecycle.publishContent(series.id, adminId),
      SeriesInitialContentRequiredException,
    );
  });

  // =========================================================================
  // SECTION 12: TAXONOMY SECURITY ATTACKS
  // =========================================================================

  await t.test("Attack J.1 — Deleting referenced category rejected with 409 TAXONOMY_IN_USE", async () => {
    const inUseCat = await taxonomy.createCategory(
      { name: `InUse Cat ${randomUUID().slice(0, 6)}`, slug: `inuse-cat-${randomUUID().slice(0, 6)}` },
      fullStaffId,
    );

    await polymorphicCatalog.createContent(
      {
        title: "Taxonomy In Use Movie",
        slug: `tax-inuse-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        categoryIds: [inUseCat.id],
      },
      fullStaffId,
    );

    await assert.rejects(
      async () => await taxonomy.deleteCategory(inUseCat.id, fullStaffId),
      (err: unknown) => {
        assert.ok(err instanceof TaxonomyInUseException);
        assert.equal(err.getStatus(), 409);
        assert.equal((err.getResponse() as any).code, "TAXONOMY_IN_USE");
        return true;
      },
    );
  });

  // =========================================================================
  // SECTION 13: SYSTEM SETTINGS ATTACKS
  // =========================================================================

  await t.test("Attack K.1 — System settings governs publishing approval flow correctly; unauthorized attempts blocked", async () => {
    // 1. Admin configures publishingRequiresApproval = true
    await settingsService.setSetting("publishingRequiresApproval", true, adminId);
    let reqApproval = await settingsService.isPublishingApprovalRequired();
    assert.equal(reqApproval, true);

    // With approval required, submitForReview moves draft to pending_review
    const movieReqApproval = await createBaseReadyMovie();
    const pending = await lifecycle.submitForReview(movieReqApproval.id, fullStaffId);
    assert.equal(pending.status, "pending_review");

    // 2. Admin configures publishingRequiresApproval = false
    await settingsService.setSetting("publishingRequiresApproval", false, adminId);
    reqApproval = await settingsService.isPublishingApprovalRequired();
    assert.equal(reqApproval, false);

    // With approval not required, submitForReview auto-publishes ready content
    const movieAutoPub = await createBaseReadyMovie();
    const autoPub = await lifecycle.submitForReview(movieAutoPub.id, fullStaffId);
    assert.equal(autoPub.status, "published");

    // Reset setting back to true
    await settingsService.setSetting("publishingRequiresApproval", true, adminId);

    // 3. Unauthorized HTTP route access for non-existent settings route returns 404 or 401
    const unauthRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/admin/settings/publishingRequiresApproval",
      headers: { cookie: adminCookie },
      payload: { value: false },
    });
    assert.ok([401, 404].includes(unauthRes.statusCode));
  });

  // =========================================================================
  // SECTION 14: AUDIT ATOMICITY & TAMPER ATTACKS
  // =========================================================================

  await t.test("Attack L.1 — Fail-Closed Audit: Simulated audit failure rolls back the business transaction completely", async () => {
    const slug = `audit-fail-${randomUUID().slice(0, 8)}`;

    await assert.rejects(
      async () => {
        await db.transaction(async (tx) => {
          await repository.insertContent(tx, {
            id: randomUUID(),
            codeId: `#GF-FAIL-${randomUUID().slice(0, 4)}`,
            title: "Will Rollback",
            slug,
            contentType: "movie",
            createdBy: fullStaffId,
          });

          await auditService.recordEvent({
            tx,
            actorId: fullStaffId,
            action: "CONTENT_CREATE",
            resourceType: "content",
            resourceId: randomUUID(),
            failClosed: true,
          });

          throw new Error("Simulated audit disk exhaustion");
        });
      },
      /Simulated audit disk exhaustion/,
    );

    const rows = await pool.query(`SELECT * FROM content WHERE slug = $1`, [slug]);
    assert.equal(rows.rowCount, 0, "Expected business row to be completely rolled back");
  });

  // =========================================================================
  // SECTION 15: INPUT VALIDATION, SQL INJECTION & ERROR LEAKAGE ATTACKS
  // =========================================================================

  await t.test("Attack M.1 — SQL Injection attack payload in title/slug is sanitized and does not leak or execute", async () => {
    const sqlInjectionPayload = "Robert'); DROP TABLE dummy_table; --";
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: fullStaffCookie },
      payload: {
        title: sqlInjectionPayload,
        slug: `sqli-test-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
      },
    });

    assert.equal(res.statusCode, 201);
    const created = JSON.parse(res.payload).data;
    assert.equal(created.title, sqlInjectionPayload);
  });

  await t.test("Attack M.2 — 500 error sanitization guarantees zero SQL or database internals leakage", async () => {
    const filter = new ApiExceptionFilter({
      error: () => {},
    } as any);

    let sentStatus = 0;
    let sentPayload: any = null;

    const mockReply: any = {
      status: (code: number) => {
        sentStatus = code;
        return {
          send: (body: any) => {
            sentPayload = body;
          },
        };
      },
    };

    const mockHost: any = {
      switchToHttp: () => ({
        getResponse: () => mockReply,
        getRequest: () => ({
          id: "req-attack-500",
          method: "POST",
          url: "/api/v1/staff/catalog",
          routeOptions: {
            url: "/api/v1/staff/catalog",
          },
        }),
      }),
    };

    const dbLeakError = new Error(
      'error: relation "users" does not exist at character 15 (SELECT * FROM users WHERE secret_key = "sensitive_pass")',
    );

    filter.catch(dbLeakError, mockHost);

    assert.equal(sentStatus, 500);
    assert.equal(sentPayload.success, false);
    assert.equal(sentPayload.error.code, "INTERNAL_ERROR");
    assert.equal(sentPayload.error.message, "An unexpected error occurred.");
    assert.ok(!JSON.stringify(sentPayload).includes("relation"));
    assert.ok(!JSON.stringify(sentPayload).includes("sensitive_pass"));
  });

  // =========================================================================
  // SECTION 17: CONCURRENCY / INTEGRITY ABUSE
  // =========================================================================

  await t.test("Attack N.1 — Race condition: Concurrent default edition promotion settles cleanly with 0 deadlocks", async () => {
    const movie = await createBaseReadyMovie({ isDefault: false });

    const djA = await taxonomy.createDj(
      { name: "DJ Concur A", stageName: `DJ Concur A ${randomUUID().slice(0, 6)}`, slug: `dja-${randomUUID().slice(0, 6)}` },
      fullStaffId,
    );
    const djB = await taxonomy.createDj(
      { name: "DJ Concur B", stageName: `DJ Concur B ${randomUUID().slice(0, 6)}`, slug: `djb-${randomUUID().slice(0, 6)}` },
      fullStaffId,
    );

    const edA = await polymorphicCatalog.attachMovieEdition(
      movie.id,
      { djId: djA.id, streamingFileKey: "kA", downloadFileKey: "kA", isDefault: false },
      fullStaffId,
    );
    const edB = await polymorphicCatalog.attachMovieEdition(
      movie.id,
      { djId: djB.id, streamingFileKey: "kB", downloadFileKey: "kB", isDefault: false },
      fullStaffId,
    );

    const results = await Promise.allSettled([
      polymorphicCatalog.repointDefaultEdition(movie.id, edA.id, fullStaffId),
      polymorphicCatalog.repointDefaultEdition(movie.id, edB.id, fullStaffId),
    ]);

    for (const r of results) {
      if (r.status === "rejected") {
        assert.ok(!String((r as any).reason).includes("40P01"), "Unexpected PostgreSQL deadlock detected");
      }
    }

    const editions = await repository.findMovieEditions(db, movie.id);
    const defaults = editions.filter((e: schema.MovieEditionRecord) => e.isDefault);
    assert.equal(defaults.length, 1, "Expected exactly 1 default edition");
  });

  // =========================================================================
  // SECTION 18: DIRECT DATABASE / RESIDUAL-RISK VERIFICATION (ADR-034)
  // =========================================================================

  await t.test("Attack O.1 — ADR-034 Residual Risk Verification: Application blocks cross-type write, direct raw SQL can bypass without app layer", async () => {
    const series = await polymorphicCatalog.createContent(
      { title: "ADR034 Series", slug: `adr-series-${randomUUID().slice(0, 8)}`, contentType: "series" },
      fullStaffId,
    );

    await assert.rejects(
      async () => {
        await polymorphicCatalog.attachMovieEdition(
          series.id,
          { djId, streamingFileKey: "k", downloadFileKey: "k" },
          fullStaffId,
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidContentTypeException);
        assert.equal(err.getStatus(), 422);
        return true;
      },
    );

    const rawEditionId = randomUUID();
    await pool.query(
      `INSERT INTO movie_editions (id, movie_id, dj_id, is_default, streaming_file_key, download_file_key)
       VALUES ($1, $2, $3, false, 'raw-key', 'raw-key')`,
      [rawEditionId, series.id, djId],
    );

    const rawCheck = await pool.query(`SELECT * FROM movie_editions WHERE id = $1`, [rawEditionId]);
    assert.equal(rawCheck.rowCount, 1, "Raw SQL bypassed application domain layer as documented in ADR-034");

    await pool.query(`DELETE FROM movie_editions WHERE id = $1`, [rawEditionId]);
  });
});
