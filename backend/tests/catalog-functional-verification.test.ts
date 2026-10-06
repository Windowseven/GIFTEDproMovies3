import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
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
import { AccountService } from "../src/modules/identity/services/account.service.js";
import { generateSecureToken, hashToken } from "../src/modules/identity/utils/token.utils.js";
import {
  InvalidLifecycleTransitionException,
  PublicationReadinessFailedException,
  DefaultEditionRequiredException,
  SeriesInitialContentRequiredException,
  RejectionReasonRequiredException,
  TaxonomyInUseException,
  SlugCollisionException,
} from "../src/modules/catalog/catalog.errors.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Phase 3C Stage 3: Comprehensive Functional Verification Suite (Domains A - J)", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
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
  const staffId = randomUUID();
  const unprivilegedStaffId = randomUUID();
  const customerId = randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status)
     VALUES ($1, $2, 'hash', 'admin', 'active'),
            ($3, $4, 'hash', 'media_team', 'active'),
            ($5, $6, 'hash', 'media_team', 'active'),
            ($7, $8, 'hash', 'customer', 'active')
     ON CONFLICT DO NOTHING`,
    [
      adminId,
      `admin-stage3-${adminId}@giftedpro.test`,
      staffId,
      `staff-stage3-${staffId}@giftedpro.test`,
      unprivilegedStaffId,
      `unprivileged-${unprivilegedStaffId}@giftedpro.test`,
      customerId,
      `customer-stage3-${customerId}@giftedpro.test`,
    ],
  );

  // Setup base taxonomy fixtures
  const catRes = await pool.query(
    `INSERT INTO categories (id, name, slug, is_active)
     VALUES ($1, $2, $3, true) RETURNING id`,
    [randomUUID(), `Action Stage3 ${randomUUID().slice(0, 6)}`, `cat-stage3-${randomUUID().slice(0, 6)}`],
  );
  const categoryId = catRes.rows[0].id;

  const countryRes = await pool.query(
    `INSERT INTO countries (id, name, code, is_active)
     VALUES ($1, $2, $3, true) RETURNING id`,
    [randomUUID(), `Uganda Stage3 ${randomUUID().slice(0, 6)}`, `U${randomUUID().slice(0, 3).toUpperCase()}`],
  );
  const countryId = countryRes.rows[0].id;

  const djRes = await pool.query(
    `INSERT INTO dj_voice_artists (id, name, stage_name, slug, is_active)
     VALUES ($1, 'DJ Stage3 Artist', $2, $3, true) RETURNING id`,
    [randomUUID(), `DJ Stage3 ${randomUUID().slice(0, 6)}`, `dj-stage3-${randomUUID().slice(0, 6)}`],
  );
  const djId = djRes.rows[0].id;

  // Initialize NestFastifyApplication for HTTP layer tests (Domains I & J)
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  let app: NestFastifyApplication;
  let testingModule: TestingModule;

  try {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ disableRequestLogging: true }),
    );

    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(fastifyCookie);
    configureHttpApplication(app);
    app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
    await app.init();
  } catch (err) {
    console.error("Failed to initialize Fastify test application:", err);
    throw err;
  }

  // Helper to create active authenticated session token for HTTP requests
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

  t.after(async () => {
    if (app) {
      await app.close();
    }
    await pool.end();
  });

  // =========================================================================
  // DOMAIN A: CONTENT LIFECYCLE STATE TRANSITIONS
  // =========================================================================

  await t.test("Domain A.1: Full valid progression (Draft -> Pending Review -> Published -> Unpublished -> Archived)", async () => {
    await settingsService.setSetting("publishingRequiresApproval", true, adminId);

    const movie = await polymorphicCatalog.createContent(
      {
        title: "Lifecycle Progression Movie",
        slug: `progression-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
        durationMinutes: 120,
        description: "Full lifecycle progression test movie.",
        posterUrl: "https://storage.giftedpro.test/posters/prog.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrops/prog.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailers/prog.mp4",
        categoryIds: [categoryId],
        countryIds: [countryId],
      },
      staffId,
    );
    assert.equal(movie.status, "draft");

    await polymorphicCatalog.attachMovieEdition(
      movie.id,
      {
        djId,
        streamingFileKey: "media/prog-stream.m3u8",
        downloadFileKey: "media/prog-dl.mp4",
        streamingStatus: "ready",
        downloadStatus: "ready",
        isDefault: true,
      },
      staffId,
    );

    // 1. Submit for review -> pending_review
    const submitted = await lifecycle.submitForReview(movie.id, staffId);
    assert.equal(submitted.status, "pending_review");
    assert.equal(submitted.submittedBy, staffId);
    assert.ok(submitted.submittedAt !== null);

    // 2. Publish -> published
    const published = await lifecycle.publishContent(movie.id, adminId);
    assert.equal(published.status, "published");
    assert.equal(published.approvedBy, adminId);
    assert.ok(published.publishedAt !== null);

    // 3. Unpublish -> unpublished
    const unpublished = await lifecycle.unpublishContent(movie.id, adminId, "Temporary licensing hold");
    assert.equal(unpublished.status, "unpublished");
    assert.ok(unpublished.unpublishedAt !== null);

    // 4. Archive -> archived
    const archived = await lifecycle.archiveContent(movie.id, adminId);
    assert.equal(archived.status, "archived");
    assert.ok(archived.archivedAt !== null);
  });

  await t.test("Domain A.2: Archived content restoration rules (Archived -> Draft only; direct publish/unpublish strictly rejected)", async () => {
    const movie = await polymorphicCatalog.createContent(
      {
        title: "Archived Restoration Target",
        slug: `archived-target-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2023,
        durationMinutes: 105,
      },
      staffId,
    );

    await lifecycle.archiveContent(movie.id, adminId);

    // Direct publish of archived content MUST fail
    await assert.rejects(
      async () => {
        await lifecycle.publishContent(movie.id, adminId);
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        assert.equal((err.getResponse() as any).code, "INVALID_LIFECYCLE_TRANSITION");
        return true;
      },
    );

    // Direct unpublish of archived content MUST fail
    await assert.rejects(
      async () => {
        await lifecycle.unpublishContent(movie.id, adminId);
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );

    // Proper restoration transitions strictly to draft, resetting publication & approval markers
    const restored = await lifecycle.restoreArchivedContent(movie.id, adminId);
    assert.equal(restored.status, "draft");
    assert.equal(restored.archivedAt, null);
    assert.equal(restored.publishedAt, null);
    assert.equal(restored.approvedBy, null);
  });

  await t.test("Domain A.3: Re-publishing unpublished content enforces full publication readiness validator", async () => {
    const movie = await polymorphicCatalog.createContent(
      {
        title: "Republish Readiness Test",
        slug: `republish-readiness-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
        durationMinutes: 98,
        description: "Valid description",
        posterUrl: "https://storage.giftedpro.test/posters/rp.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrops/rp.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailers/rp.mp4",
        categoryIds: [categoryId],
        countryIds: [countryId],
      },
      staffId,
    );

    const edition = await polymorphicCatalog.attachMovieEdition(
      movie.id,
      {
        djId,
        streamingFileKey: "media/rp-stream.m3u8",
        downloadFileKey: "media/rp-dl.mp4",
        streamingStatus: "ready",
        downloadStatus: "ready",
        isDefault: true,
      },
      staffId,
    );

    await lifecycle.publishContent(movie.id, adminId);
    await lifecycle.unpublishContent(movie.id, adminId, "Routine maintenance");

    // Corrupt edition media while unpublished to simulate media file expiration/loss
    await polymorphicCatalog.updateMovieEdition(
      movie.id,
      edition.id,
      { streamingStatus: "pending" },
      staffId,
    );

    // Re-publish MUST fail readiness checks because media is no longer ready
    await assert.rejects(
      async () => {
        await lifecycle.publishContent(movie.id, adminId);
      },
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.equal(err.getStatus(), 422);
        assert.ok((err.getResponse() as any).details.includes("streamingMedia"));
        return true;
      },
    );
  });

  await t.test("Domain A.4: Rejection requires non-empty written reason, records review note, and rejects invalid states", async () => {
    const movie = await polymorphicCatalog.createContent(
      {
        title: "Rejection Target Movie",
        slug: `rejection-target-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
        durationMinutes: 115,
      },
      staffId,
    );

    // Cannot reject content in draft status
    await assert.rejects(
      async () => {
        await lifecycle.rejectContent(movie.id, "Valid rejection reason", adminId);
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidLifecycleTransitionException);
        return true;
      },
    );

    await settingsService.setSetting("publishingRequiresApproval", true, adminId);
    await lifecycle.submitForReview(movie.id, staffId);

    // Empty or whitespace rejection reason rejected
    await assert.rejects(
      async () => {
        await lifecycle.rejectContent(movie.id, "   ", adminId);
      },
      (err: unknown) => {
        assert.ok(err instanceof RejectionReasonRequiredException);
        assert.equal(err.getStatus(), 400);
        assert.equal((err.getResponse() as any).code, "REJECTION_REASON_REQUIRED");
        return true;
      },
    );

    // Valid rejection
    const rejected = await lifecycle.rejectContent(
      movie.id,
      "Trailer watermark violates content guidelines",
      adminId,
    );
    assert.equal(rejected.status, "draft");
    assert.equal(rejected.rejectionReason, "Trailer watermark violates content guidelines");

    // Review note persisted in database
    const notes = await repository.findReviewNotes(db, movie.id);
    assert.ok(notes.length >= 1);
    assert.equal(notes[0].rejectionReason, "Trailer watermark violates content guidelines");
    assert.equal(notes[0].reviewerId, adminId);
  });

  // =========================================================================
  // DOMAIN B: AUTHORITATIVE 9/9 PUBLICATION READINESS ENGINE
  // =========================================================================

  // Helper to create baseline movie content meeting all metadata
  async function createBaseReadyMovie(overrides: Record<string, any> = {}) {
    const baseSlug = `readiness-base-${randomUUID().slice(0, 8)}`;
    const movie = await polymorphicCatalog.createContent(
      {
        title: overrides.title !== undefined ? overrides.title : "Readiness Base Title",
        slug: baseSlug,
        contentType: "movie",
        releaseYear: overrides.releaseYear !== undefined ? overrides.releaseYear : 2024,
        durationMinutes: overrides.durationMinutes !== undefined ? overrides.durationMinutes : 110,
        description: overrides.description !== undefined ? overrides.description : "Standard valid description.",
        posterUrl: overrides.posterUrl !== undefined ? overrides.posterUrl : "https://storage.giftedpro.test/posters/b.jpg",
        backdropUrl: overrides.backdropUrl !== undefined ? overrides.backdropUrl : "https://storage.giftedpro.test/backdrops/b.jpg",
        trailerUrl: overrides.trailerUrl !== undefined ? overrides.trailerUrl : "https://storage.giftedpro.test/trailers/b.mp4",
        categoryIds: overrides.categoryIds !== undefined ? overrides.categoryIds : [categoryId],
        countryIds: overrides.countryIds !== undefined ? overrides.countryIds : [countryId],
      },
      staffId,
    );

    if (overrides.skipEdition !== true) {
      await polymorphicCatalog.attachMovieEdition(
        movie.id,
        {
          djId: overrides.djId !== undefined ? overrides.djId : djId,
          streamingFileKey: overrides.streamingFileKey !== undefined ? overrides.streamingFileKey : "media/stream.m3u8",
          downloadFileKey: overrides.downloadFileKey !== undefined ? overrides.downloadFileKey : "media/dl.mp4",
          streamingStatus: overrides.streamingStatus !== undefined ? overrides.streamingStatus : "ready",
          downloadStatus: overrides.downloadStatus !== undefined ? overrides.downloadStatus : "ready",
          isDefault: overrides.isDefault !== undefined ? overrides.isDefault : true,
        },
        staffId,
      );
    }

    return movie;
  }

  await t.test("Domain B.1: Isolation Check - Missing basicInfo (empty title, empty description, year < 1900, duration < 1)", async () => {
    // Missing description
    const movieNoDesc = await createBaseReadyMovie({ description: "" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieNoDesc.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("basicInfo"));
        return true;
      },
    );

    // Invalid release year
    const movieBadYear = await createBaseReadyMovie({ releaseYear: 1850 });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieBadYear.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("basicInfo"));
        return true;
      },
    );

    // Invalid duration
    const movieBadDuration = await createBaseReadyMovie({ durationMinutes: 0 });
    await assert.rejects(
      async () => await lifecycle.publishContent(movieBadDuration.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("basicInfo"));
        return true;
      },
    );
  });

  await t.test("Domain B.2: Isolation Check - Missing posterUrl fails with 'poster'", async () => {
    const movie = await createBaseReadyMovie({ posterUrl: "" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("poster"));
        return true;
      },
    );
  });

  await t.test("Domain B.3: Isolation Check - Missing backdropUrl fails with 'backdrop'", async () => {
    const movie = await createBaseReadyMovie({ backdropUrl: "" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("backdrop"));
        return true;
      },
    );
  });

  await t.test("Domain B.4: Isolation Check - Missing trailerUrl fails with 'trailer'", async () => {
    const movie = await createBaseReadyMovie({ trailerUrl: "" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("trailer"));
        return true;
      },
    );
  });

  await t.test("Domain B.5: Isolation Check - 0 categories fails with 'categories'", async () => {
    const movie = await createBaseReadyMovie({ categoryIds: [] });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("categories"));
        return true;
      },
    );
  });

  await t.test("Domain B.6: Isolation Check - 0 countries fails with 'countries'", async () => {
    const movie = await createBaseReadyMovie({ countryIds: [] });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("countries"));
        return true;
      },
    );
  });

  await t.test("Domain B.7: Isolation Check - Missing assigned DJ fails with 'djAssigned'", async () => {
    const series = await polymorphicCatalog.createContent(
      {
        title: "Series No DJ Title",
        slug: `series-no-dj-${randomUUID().slice(0, 8)}`,
        contentType: "series",
        releaseYear: 2024,
        description: "Valid series description.",
        posterUrl: "https://storage.giftedpro.test/posters/s.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrops/s.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailers/s.mp4",
        categoryIds: [categoryId],
        countryIds: [countryId],
      },
      staffId,
    );
    const season = await polymorphicCatalog.createSeason(series.id, { seasonNumber: 1 }, staffId);
    await polymorphicCatalog.attachEpisode(
      season.id,
      {
        episodeNumber: 1,
        title: "Pilot Ready",
        streamingFileKey: "media/ep1.m3u8",
        downloadFileKey: "media/ep1.mp4",
        streamingStatus: "ready",
        downloadStatus: "ready",
        durationMinutes: 45,
      },
      staffId,
    );

    await assert.rejects(
      async () => await lifecycle.publishContent(series.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("djAssigned"));
        return true;
      },
    );
  });

  await t.test("Domain B.8: Isolation Check - Default edition streamingStatus != 'ready' fails with 'streamingMedia'", async () => {
    const movie = await createBaseReadyMovie({ streamingStatus: "pending" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("streamingMedia"));
        return true;
      },
    );
  });

  await t.test("Domain B.9: Isolation Check - Default edition downloadStatus != 'ready' fails with 'downloadMedia'", async () => {
    const movie = await createBaseReadyMovie({ downloadStatus: "failed" });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.ok((err.getResponse() as any).details.includes("downloadMedia"));
        return true;
      },
    );
  });

  await t.test("Domain B.10: Separate Movie Publication Prerequisite - Missing default edition throws DefaultEditionRequiredException (422)", async () => {
    const movie = await createBaseReadyMovie({ isDefault: false });
    await assert.rejects(
      async () => await lifecycle.publishContent(movie.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof DefaultEditionRequiredException);
        assert.equal(err.getStatus(), 422);
        assert.equal((err.getResponse() as any).code, "DEFAULT_EDITION_REQUIRED");
        return true;
      },
    );
  });

  await t.test("Domain B.11: Fully satisfied 9/9 checklist publishes movie successfully", async () => {
    const movie = await createBaseReadyMovie();
    const published = await lifecycle.publishContent(movie.id, adminId);
    assert.equal(published.status, "published");
    assert.equal(published.approvedBy, adminId);
    assert.ok(published.publishedAt !== null);
  });

  // =========================================================================
  // DOMAINS C & D: MOVIE PUBLICATION RULES, EDITIONS & OUTAGE FALLBACK
  // =========================================================================

  await t.test("Domains C & D.1: Compound uniqueness - duplicate (movieId, djId) edition attachment is rejected", async () => {
    const movie = await createBaseReadyMovie();

    await assert.rejects(
      async () => {
        await polymorphicCatalog.attachMovieEdition(
          movie.id,
          {
            djId, // Duplicate DJ on the same movie
            streamingFileKey: "media/dup-stream.m3u8",
            downloadFileKey: "media/dup-dl.mp4",
          },
          staffId,
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      },
    );
  });

  await t.test("Domains C & D.2: Repointing default edition demotes previous default; asserts at most 1 default edition", async () => {
    const movie = await createBaseReadyMovie();

    // Create DJ 2
    const dj2Res = await pool.query(
      `INSERT INTO dj_voice_artists (id, name, stage_name, slug, is_active)
       VALUES ($1, 'Second Voice', $2, $3, true) RETURNING id`,
      [randomUUID(), `DJ Repoint ${randomUUID().slice(0, 6)}`, `dj-repoint-${randomUUID().slice(0, 6)}`],
    );
    const dj2Id = dj2Res.rows[0].id;

    // Attach second edition
    const ed2 = await polymorphicCatalog.attachMovieEdition(
      movie.id,
      {
        djId: dj2Id,
        streamingFileKey: "media/ed2-stream.m3u8",
        downloadFileKey: "media/ed2-dl.mp4",
        streamingStatus: "ready",
        downloadStatus: "ready",
        isDefault: false,
      },
      staffId,
    );

    // Repoint default to ed2
    await polymorphicCatalog.repointDefaultEdition(movie.id, ed2.id, staffId);

    const editions = await repository.findMovieEditions(db, movie.id);
    const defaultEditions = editions.filter((e) => e.isDefault);
    assert.equal(defaultEditions.length, 1);
    assert.equal(defaultEditions[0].id, ed2.id);
  });

  await t.test("Domains C & D.3: Outage Fallback Case A promotes healthy secondary edition and retains published status", async () => {
    const movie = await createBaseReadyMovie();

    const dj2Res = await pool.query(
      `INSERT INTO dj_voice_artists (id, name, stage_name, slug, is_active)
       VALUES ($1, 'Healthy Backup DJ', $2, $3, true) RETURNING id`,
      [randomUUID(), `DJ Backup ${randomUUID().slice(0, 6)}`, `dj-backup-${randomUUID().slice(0, 6)}`],
    );
    const backupDjId = dj2Res.rows[0].id;

    const backupEdition = await polymorphicCatalog.attachMovieEdition(
      movie.id,
      {
        djId: backupDjId,
        streamingFileKey: "media/backup-stream.m3u8",
        downloadFileKey: "media/backup-dl.mp4",
        streamingStatus: "ready",
        downloadStatus: "ready",
        isDefault: false,
      },
      staffId,
    );

    await lifecycle.publishContent(movie.id, adminId);

    const initialEditions = await repository.findMovieEditions(db, movie.id);
    const primaryEdition = initialEditions.find((e) => e.isDefault)!;

    // Outage occurs on primary default edition
    const result = await lifecycle.handleMovieEditionFailure(movie.id, primaryEdition.id, adminId);
    assert.equal(result.content.status, "published"); // Movie remains published!

    const newDefault = result.editions.find((e) => e.isDefault);
    assert.equal(newDefault?.id, backupEdition.id);

    // Verify audit event
    const [audit] = await db
      .select()
      .from(schema.auditEventsTable)
      .where(eq(schema.auditEventsTable.resourceId, movie.id))
      .orderBy(desc(schema.auditEventsTable.createdAt))
      .limit(1);
    assert.equal(audit?.action, "MOVIE_EDITION_OUTAGE_FALLBACK");
    assert.equal((audit?.metadata as any)?.case, "A");
  });

  await t.test("Domains C & D.4: Outage Fallback Case B demotes default edition and immediately unpublishes movie", async () => {
    const movie = await createBaseReadyMovie();
    await lifecycle.publishContent(movie.id, adminId);

    const editions = await repository.findMovieEditions(db, movie.id);
    const defaultEdition = editions.find((e) => e.isDefault)!;

    // Outage occurs with no secondary ready edition available
    const result = await lifecycle.handleMovieEditionFailure(movie.id, defaultEdition.id, adminId);
    assert.equal(result.content.status, "unpublished"); // Movie transitioned to unpublished!

    const remainingDefaults = result.editions.filter((e) => e.isDefault);
    assert.equal(remainingDefaults.length, 0); // Default demoted!

    // Verify unpublish audit event
    const audits = await pool.query(
      `SELECT action, metadata FROM audit_events WHERE resource_id = $1 ORDER BY created_at DESC LIMIT 2`,
      [movie.id],
    );
    const actions = audits.rows.map((r) => r.action);
    assert.ok(actions.includes("CONTENT_UNPUBLISH"));
    assert.ok(actions.includes("MOVIE_EDITION_OUTAGE_FALLBACK"));
  });

  // =========================================================================
  // DOMAIN E: SERIES INITIAL PUBLICATION GATE & SUBSEQUENT DRAFT EPISODES
  // =========================================================================

  await t.test("Domain E.1: Series initial publication requires Season 1 and Episode 1 with ready media", async () => {
    const series = await polymorphicCatalog.createContent(
      {
        title: "Stage3 Series Gate",
        slug: `series-gate-${randomUUID().slice(0, 8)}`,
        contentType: "series",
        releaseYear: 2024,
        description: "Series gate test.",
        posterUrl: "https://storage.giftedpro.test/posters/sg.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrops/sg.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailers/sg.mp4",
        categoryIds: [categoryId],
        countryIds: [countryId],
      },
      staffId,
    );

    const metadata = await polymorphicCatalog.attachSeriesMetadata(series.id, { leadDjId: djId }, staffId);

    // Initial publish without Season 1 must fail
    await assert.rejects(
      async () => await lifecycle.publishContent(series.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof SeriesInitialContentRequiredException);
        assert.equal(err.getStatus(), 422);
        assert.equal((err.getResponse() as any).code, "SERIES_INITIAL_CONTENT_REQUIRED");
        return true;
      },
    );

    // Add Season 1 only (no Episode 1) -> must fail
    const season1 = await polymorphicCatalog.createSeason(series.id, { seasonNumber: 1 }, staffId);
    await assert.rejects(
      async () => await lifecycle.publishContent(series.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof SeriesInitialContentRequiredException);
        return true;
      },
    );

    // GAP B VERIFICATION: Add Episode 1 with pending streaming & download media -> publication MUST fail
    const ep1 = await polymorphicCatalog.attachEpisode(
      season1.id,
      {
        episodeNumber: 1,
        title: "Pilot Initial Episode",
        streamingStatus: "pending",
        downloadStatus: "pending",
      },
      staffId,
    );

    // Explicit Gap B Assertions:
    // 1. Series metadata is otherwise valid
    assert.equal(series.contentType, "series");
    assert.ok(series.title && series.description);
    assert.equal(metadata.leadDjId, djId);
    // 2. Season 1 exists
    assert.equal(season1.seriesId, series.id);
    assert.equal(season1.seasonNumber, 1);
    // 3. Episode 1 exists
    assert.equal(ep1.seasonId, season1.id);
    // 4. Episode 1 is the required initial episode
    assert.equal(ep1.episodeNumber, 1);
    // 5. Episode 1 streaming media is not ready and download media is not ready
    assert.equal(ep1.streamingStatus, "pending");
    assert.equal(ep1.downloadStatus, "pending");

    // 6. Publication attempt fails with expected Phase 3 error
    // 7. Failure details identify the relevant readiness failures (streamingMedia and downloadMedia)
    await assert.rejects(
      async () => await lifecycle.publishContent(series.id, adminId),
      (err: unknown) => {
        assert.ok(err instanceof PublicationReadinessFailedException);
        assert.equal(err.getStatus(), 422);
        assert.equal((err.getResponse() as any).code, "PUBLICATION_READINESS_FAILED");
        const details = (err.getResponse() as any).details;
        assert.ok(details.includes("streamingMedia"), "Expected streamingMedia in readiness failure details");
        assert.ok(details.includes("downloadMedia"), "Expected downloadMedia in readiness failure details");
        return true;
      },
    );

    // 8. Series remains unpublished
    const postFailSeries = await repository.findContentById(db, series.id);
    assert.notEqual(postFailSeries?.status, "published");
    assert.equal(postFailSeries?.status, "draft");
    assert.equal(postFailSeries?.publishedAt, null);

    // 9. No successful CONTENT_PUBLISH audit event is created
    const postFailPublishAudits = await pool.query(
      `SELECT * FROM audit_events WHERE resource_id = $1 AND action = 'CONTENT_PUBLISH'`,
      [series.id],
    );
    assert.equal(postFailPublishAudits.rowCount, 0);

    // Update Episode 1 media to ready
    await polymorphicCatalog.updateEpisode(
      season1.id,
      ep1.id,
      {
        streamingFileKey: "media/series/ep1-stream.m3u8",
        downloadFileKey: "media/series/ep1-dl.mp4",
        streamingStatus: "ready",
        downloadStatus: "ready",
        durationMinutes: 50,
      },
      staffId,
    );

    // Series now satisfies initial publication gate!
    const published = await lifecycle.publishContent(series.id, adminId);
    assert.equal(published.status, "published");
  });

  await t.test("Domain E.2: Adding draft Episode 2 to published series does NOT unpublish or disrupt live series", async () => {
    // Look up the published series from previous test
    const [series] = await db
      .select()
      .from(schema.contentTable)
      .where(eq(schema.contentTable.contentType, "series"))
      .orderBy(desc(schema.contentTable.createdAt))
      .limit(1);

    assert.ok(series);
    assert.equal(series.status, "published");

    const [season1] = await db
      .select()
      .from(schema.seasonsTable)
      .where(eq(schema.seasonsTable.seriesId, series.id))
      .limit(1);

    // Attach Episode 2 with status 'draft' and 'pending' media
    await polymorphicCatalog.attachEpisode(
      season1.id,
      {
        episodeNumber: 2,
        title: "Episode 2 WIP",
        streamingStatus: "pending",
        downloadStatus: "pending",
        isAvailable: false,
        status: "draft",
      },
      staffId,
    );

    // Series status must remain strictly 'published'
    const liveSeries = await repository.findContentById(db, series.id);
    assert.equal(liveSeries?.status, "published");
  });

  // =========================================================================
  // DOMAIN F: TAXONOMY GOVERNANCE
  // =========================================================================

  await t.test("Domain F.1: Case-insensitive unique collisions rejected (409 SLUG_ALREADY_EXISTS)", async () => {
    // Category collision
    const catName = `Category Collision ${randomUUID().slice(0, 6)}`;
    const catSlug = `unique-cat-${randomUUID().slice(0, 6)}`;
    await taxonomy.createCategory({ name: catName, slug: catSlug }, staffId);

    await assert.rejects(
      async () => {
        await taxonomy.createCategory({ name: catName.toUpperCase(), slug: catSlug.toUpperCase() }, staffId);
      },
      (err: unknown) => {
        assert.ok(err instanceof SlugCollisionException);
        assert.equal(err.getStatus(), 409);
        assert.equal((err.getResponse() as any).code, "SLUG_ALREADY_EXISTS");
        return true;
      },
    );

    // Country collision
    const countryName = `Z-Country ${randomUUID().slice(0, 6)}`;
    const countryCode = `Z${randomUUID().slice(0, 3).toUpperCase()}`;
    await taxonomy.createCountry({ name: countryName, code: countryCode }, staffId);

    await assert.rejects(
      async () => {
        await taxonomy.createCountry({ name: countryName.toLowerCase(), code: countryCode.toLowerCase() }, staffId);
      },
      (err: unknown) => {
        assert.ok(err instanceof SlugCollisionException);
        assert.equal(err.getStatus(), 409);
        return true;
      },
    );

    // DJ collision
    const djSlug = `dj-collision-${randomUUID().slice(0, 6)}`;
    const djName = `DJ Unique ${randomUUID().slice(0, 6)}`;
    await taxonomy.createDj({ name: "Real Name", stageName: djName, slug: djSlug }, staffId);

    await assert.rejects(
      async () => {
        await taxonomy.createDj({ name: "Another Name", stageName: djName, slug: djSlug.toUpperCase() }, staffId);
      },
      (err: unknown) => {
        assert.ok(err instanceof SlugCollisionException);
        assert.equal(err.getStatus(), 409);
        return true;
      },
    );
  });

  await t.test("Domain F.2: Unreferenced taxonomy items delete cleanly", async () => {
    const cat = await taxonomy.createCategory({ name: "Temp Cat", slug: `temp-cat-${randomUUID().slice(0, 6)}` }, staffId);
    await taxonomy.deleteCategory(cat.id, staffId);

    const country = await taxonomy.createCountry({ name: "Temp Country", code: `T${randomUUID().slice(0, 3).toUpperCase()}` }, staffId);
    await taxonomy.deleteCountry(country.id, staffId);

    const dj = await taxonomy.createDj({ name: "Temp DJ", stageName: "DJ Temp", slug: `temp-dj-${randomUUID().slice(0, 6)}` }, staffId);
    await taxonomy.deleteDj(dj.id, staffId);
  });

  await t.test("Domain F.3: Smart deletion safeguards block deletion of referenced taxonomy (409 TAXONOMY_IN_USE)", async () => {
    const safeCat = await taxonomy.createCategory({ name: `Safe Cat ${randomUUID().slice(0, 6)}`, slug: `safecat-${randomUUID().slice(0, 6)}` }, staffId);
    const safeCountry = await taxonomy.createCountry({ name: `Safe Country ${randomUUID().slice(0, 6)}`, code: `S${randomUUID().slice(0, 3).toUpperCase()}` }, staffId);
    const safeDj = await taxonomy.createDj({ name: "Safe DJ", stageName: `DJ Safe ${randomUUID().slice(0, 6)}`, slug: `safedj-${randomUUID().slice(0, 6)}` }, staffId);

    // Reference all three in movie content
    const movie = await polymorphicCatalog.createContent(
      {
        title: "Taxonomy Safeguards Movie",
        slug: `safeguard-movie-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        categoryIds: [safeCat.id],
        countryIds: [safeCountry.id],
      },
      staffId,
    );

    await polymorphicCatalog.attachMovieEdition(
      movie.id,
      {
        djId: safeDj.id,
        streamingFileKey: "media/safe-stream.m3u8",
        downloadFileKey: "media/safe-dl.mp4",
      },
      staffId,
    );

    // 1. Delete Category blocked
    await assert.rejects(
      async () => await taxonomy.deleteCategory(safeCat.id, staffId),
      (err: unknown) => {
        assert.ok(err instanceof TaxonomyInUseException);
        assert.equal(err.getStatus(), 409);
        assert.equal((err.getResponse() as any).code, "TAXONOMY_IN_USE");
        return true;
      },
    );

    // 2. Delete Country blocked
    await assert.rejects(
      async () => await taxonomy.deleteCountry(safeCountry.id, staffId),
      (err: unknown) => {
        assert.ok(err instanceof TaxonomyInUseException);
        assert.equal(err.getStatus(), 409);
        assert.equal((err.getResponse() as any).code, "TAXONOMY_IN_USE");
        return true;
      },
    );

    // 3. Delete DJ blocked
    await assert.rejects(
      async () => await taxonomy.deleteDj(safeDj.id, staffId),
      (err: unknown) => {
        assert.ok(err instanceof TaxonomyInUseException);
        assert.equal(err.getStatus(), 409);
        assert.equal((err.getResponse() as any).code, "TAXONOMY_IN_USE");
        return true;
      },
    );
  });

  await t.test("Domain F.4: Safe deactivation succeeds for referenced taxonomy items", async () => {
    const [cat] = await db.select().from(schema.categoriesTable).limit(1);
    const [country] = await db.select().from(schema.countriesTable).limit(1);
    const [dj] = await db.select().from(schema.djVoiceArtistsTable).limit(1);

    const deactCat = await taxonomy.deactivateCategory(cat.id, staffId);
    assert.equal(deactCat.isActive, false);

    const deactCountry = await taxonomy.deactivateCountry(country.id, staffId);
    assert.equal(deactCountry.isActive, false);

    const deactDj = await taxonomy.deactivateDj(dj.id, staffId);
    assert.equal(deactDj.isActive, false);
  });

  // =========================================================================
  // DOMAIN G: REVIEW & APPROVAL WORKFLOW
  // =========================================================================

  await t.test("Domain G.1A: Approval Required (publishingRequiresApproval = true) keeps ready content in pending_review and does NOT publish (Gap A Verified)", async () => {
    // 1. Explicitly enable publishingRequiresApproval in SystemSettingsService
    await settingsService.setSetting("publishingRequiresApproval", true, adminId);
    const requiresApproval = await settingsService.isPublishingApprovalRequired();
    assert.equal(requiresApproval, true);

    // 2. Create content that is otherwise fully publication-ready (9/9 criteria satisfied)
    const movie = await createBaseReadyMovie();
    assert.equal(movie.status, "draft");
    assert.equal(movie.publishedAt, null);

    // 3. Submit for review via ContentLifecycleService
    const result = await lifecycle.submitForReview(movie.id, staffId);

    // 4. Assertions on returned result and persisted database record:
    // Final content status is strictly 'pending_review' (NOT 'published')
    assert.equal(result.status, "pending_review");
    assert.notEqual(result.status, "published");
    assert.equal(result.publishedAt, null);
    assert.equal(result.approvedBy, null);
    assert.equal(result.submittedBy, staffId);
    assert.ok(result.submittedAt !== null);

    const persisted = await repository.findContentById(db, movie.id);
    assert.equal(persisted?.status, "pending_review");
    assert.notEqual(persisted?.status, "published");
    assert.equal(persisted?.publishedAt, null);
    assert.equal(persisted?.approvedBy, null);
    assert.equal(persisted?.submittedBy, staffId);

    // 5. Assert NO false CONTENT_PUBLISH audit event was emitted
    const publishAudits = await pool.query(
      `SELECT * FROM audit_events WHERE resource_id = $1 AND action = 'CONTENT_PUBLISH'`,
      [movie.id],
    );
    assert.equal(publishAudits.rowCount, 0, "No CONTENT_PUBLISH audit event should exist when approval is required");

    // 6. Assert correct CONTENT_SUBMIT_REVIEW audit event is present with required metadata
    const submitAudits = await pool.query(
      `SELECT * FROM audit_events WHERE resource_id = $1 AND action = 'CONTENT_SUBMIT_REVIEW' ORDER BY created_at DESC`,
      [movie.id],
    );
    assert.equal(submitAudits.rowCount, 1, "Exactly one CONTENT_SUBMIT_REVIEW audit event must exist");
    assert.equal(submitAudits.rows[0].actor_id, staffId);
    assert.equal(submitAudits.rows[0].resource_type, "content");
    const auditMetadata = submitAudits.rows[0].metadata;
    assert.equal(auditMetadata.requiresApproval, true);
    assert.equal(auditMetadata.previousStatus, "draft");
    assert.equal(auditMetadata.newStatus, "pending_review");
  });

  await t.test("Domain G.1B: Auto-Publish (publishingRequiresApproval = false) auto-publishes ready content", async () => {
    await settingsService.setSetting("publishingRequiresApproval", false, adminId);

    const movie = await createBaseReadyMovie();
    const result = await lifecycle.submitForReview(movie.id, staffId);

    assert.equal(result.status, "published");
    assert.ok(result.publishedAt !== null);

    // Verify auto-publish audit event
    const [audit] = await db
      .select()
      .from(schema.auditEventsTable)
      .where(eq(schema.auditEventsTable.resourceId, movie.id))
      .orderBy(desc(schema.auditEventsTable.createdAt))
      .limit(1);
    assert.equal(audit?.action, "CONTENT_PUBLISH");
    assert.equal((audit?.metadata as any)?.autoPublished, true);
  });

  await t.test("Domain G.2: Rejection triggers review note creation and in-app notification to author", async () => {
    await settingsService.setSetting("publishingRequiresApproval", true, adminId);

    const movie = await polymorphicCatalog.createContent(
      {
        title: "Notification Target Movie",
        slug: `notif-movie-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
        durationMinutes: 100,
      },
      staffId,
    );

    await lifecycle.submitForReview(movie.id, staffId);

    // Admin rejects content
    await lifecycle.rejectContent(movie.id, "Incorrect audio language metadata", adminId);

    // Verify review note row
    const notes = await repository.findReviewNotes(db, movie.id);
    assert.ok(notes.length >= 1);
    assert.equal(notes[0].rejectionReason, "Incorrect audio language metadata");

    // Verify in-app notification delivered to staff author
    const notifs = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND type = 'CATALOG_REJECTION' ORDER BY created_at DESC LIMIT 1`,
      [staffId],
    );
    assert.equal(notifs.rowCount, 1);
    assert.equal(notifs.rows[0].type, "CATALOG_REJECTION");
    assert.ok(notifs.rows[0].message.includes("Incorrect audio language metadata"));
  });

  // =========================================================================
  // DOMAIN H: AUDIT CORRECTNESS
  // =========================================================================

  await t.test("Domain H.1: Audit trail records exact actorId, action, resourceType, and metadata", async () => {
    const slug = `audit-trail-${randomUUID().slice(0, 8)}`;
    const movie = await polymorphicCatalog.createContent(
      {
        title: "Audit Test Movie",
        slug,
        contentType: "movie",
        releaseYear: 2024,
      },
      staffId,
    );

    const [audit] = await db
      .select()
      .from(schema.auditEventsTable)
      .where(eq(schema.auditEventsTable.resourceId, movie.id))
      .orderBy(desc(schema.auditEventsTable.createdAt))
      .limit(1);

    assert.equal(audit?.actorId, staffId);
    assert.equal(audit?.action, "CONTENT_CREATE");
    assert.equal(audit?.resourceType, "content");
    assert.equal((audit?.metadata as any)?.contentType, "movie");
    assert.equal((audit?.metadata as any)?.slug, slug);
    assert.ok((audit?.metadata as any)?.codeId);
  });

  await t.test("Domain H.2: Audit write failure rolls back the surrounding business mutation (failClosed: true)", async () => {
    const slug = `audit-failclosed-${randomUUID().slice(0, 8)}`;

    await assert.rejects(
      async () => {
        await db.transaction(async (tx) => {
          const codeId = await repository.generateUniqueCodeId(tx);
          const content = await repository.insertContent(tx, {
            codeId,
            contentType: "movie",
            title: "Will Rollback On Audit Failure",
            slug,
            createdBy: staffId,
          });

          // Induce real PostgreSQL string length error on audit_events.action (varchar(128))
          await auditService.recordEvent({
            tx,
            actorId: staffId,
            action: "FAIL_ACTION_".repeat(20), // > 128 characters
            resourceType: "content",
            resourceId: content.id,
            failClosed: true,
          });
        });
      },
      /Audit logging failed for critical security event/,
    );

    // Content insert must be rolled back completely
    const check = await repository.findContentBySlug(db, slug);
    assert.equal(check, null);
  });

  // =========================================================================
  // DOMAIN I: AUTHORIZATION & CAPABILITIES (HTTP Fastify Integration)
  // =========================================================================

  // Grant capabilities to staffId for HTTP operations
  const accountService = testingModule.get(AccountService);
  await accountService.grantCapability(adminId, staffId, "CONTENT_CREATE");
  await accountService.grantCapability(adminId, staffId, "CONTENT_EDIT");
  await accountService.grantCapability(adminId, staffId, "CONTENT_PUBLISH");
  await accountService.grantCapability(adminId, staffId, "CONTENT_ARCHIVE");
  await accountService.grantCapability(adminId, staffId, "TAXONOMY_MANAGE");

  // Create session cookies
  const adminCookie = await createSessionCookie(adminId);
  const staffCookie = await createSessionCookie(staffId);
  const unprivCookie = await createSessionCookie(unprivilegedStaffId);
  const customerCookie = await createSessionCookie(customerId);

  await t.test("Domain I.1: Unauthenticated requests return 401 Unauthorized", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      payload: {
        title: "Unauthorized Movie",
        slug: `unauth-${randomUUID().slice(0, 6)}`,
        contentType: "movie",
      },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "REQUEST_REJECTED");
    assert.ok(body.error.message.includes("Authentication required"));
  });

  await t.test("Domain I.2: Customer role returns 403 Forbidden", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: customerCookie },
      payload: {
        title: "Customer Forbidden Movie",
        slug: `cust-forbid-${randomUUID().slice(0, 6)}`,
        contentType: "movie",
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, false);
  });

  await t.test("Domain I.3: Staff without required capability returns 403 INSUFFICIENT_CAPABILITY", async () => {
    // 1. CONTENT_CREATE on POST /api/v1/staff/catalog
    const resCreate = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: unprivCookie },
      payload: {
        title: "Unprivileged Create",
        slug: `unpriv-create-${randomUUID().slice(0, 6)}`,
        contentType: "movie",
      },
    });
    assert.equal(resCreate.statusCode, 403);
    assert.ok(JSON.parse(resCreate.payload).error.message.includes("INSUFFICIENT_CAPABILITY"));

    // 2. TAXONOMY_MANAGE on POST /api/v1/staff/taxonomies/categories
    const resTaxonomy = await app.inject({
      method: "POST",
      url: "/api/v1/staff/taxonomies/categories",
      headers: { cookie: unprivCookie },
      payload: {
        name: "Unpriv Cat",
        slug: `unpriv-cat-${randomUUID().slice(0, 6)}`,
      },
    });
    assert.equal(resTaxonomy.statusCode, 403);
    assert.ok(JSON.parse(resTaxonomy.payload).error.message.includes("INSUFFICIENT_CAPABILITY"));
  });

  await t.test("Domain I.4: Staff with capability and Admin succeed (200 / 201)", async () => {
    // Staff with CONTENT_CREATE succeeds
    const resStaff = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: staffCookie },
      payload: {
        title: "Staff Cap Movie",
        slug: `staff-cap-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
      },
    });
    assert.equal(resStaff.statusCode, 201);
    const staffMovie = JSON.parse(resStaff.payload);
    assert.equal(staffMovie.data.title, "Staff Cap Movie");

    // Admin succeeds unconditionally
    const resAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/staff/catalog",
      headers: { cookie: adminCookie },
      payload: {
        title: "Admin Super Movie",
        slug: `admin-super-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
      },
    });
    assert.equal(resAdmin.statusCode, 201);
  });

  // =========================================================================
  // DOMAIN J: API ERROR CONTRACT & 500 INTERNAL ERROR SANITIZATION
  // =========================================================================

  await t.test("Domain J.1: Standard API error envelope structure & canonical codes", async () => {
    // 400 REJECTION_REASON_REQUIRED
    const res400 = await app.inject({
      method: "POST",
      url: `/api/v1/staff/catalog/${randomUUID()}/reject`,
      headers: { cookie: adminCookie },
      payload: { rejectionReason: "   " },
    });
    assert.equal(res400.statusCode, 400);
    const body400 = JSON.parse(res400.payload);
    assert.equal(body400.success, false);
    assert.equal(body400.error.code, "REJECTION_REASON_REQUIRED");
    assert.ok(body400.error.timestamp);
    assert.ok(body400.error.requestId);

    // 404 NOT_FOUND
    const res404 = await app.inject({
      method: "POST",
      url: `/api/v1/staff/catalog/${randomUUID()}/publish`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res404.statusCode, 404);
    const body404 = JSON.parse(res404.payload);
    assert.equal(body404.success, false);
    assert.equal(body404.error.code, "NOT_FOUND");

    // 409 SLUG_ALREADY_EXISTS
    const dupSlug = `dup-cat-${randomUUID().slice(0, 6)}`;
    const dupName1 = `Dup Cat 1 ${randomUUID().slice(0, 6)}`;
    const dupName2 = `Dup Cat 2 ${randomUUID().slice(0, 6)}`;
    const firstRes = await app.inject({
      method: "POST",
      url: "/api/v1/staff/taxonomies/categories",
      headers: { cookie: adminCookie },
      payload: { name: dupName1, slug: dupSlug },
    });
    assert.equal(firstRes.statusCode, 201);

    const res409 = await app.inject({
      method: "POST",
      url: "/api/v1/staff/taxonomies/categories",
      headers: { cookie: adminCookie },
      payload: { name: dupName2, slug: dupSlug },
    });
    assert.equal(res409.statusCode, 409);
    const body409 = JSON.parse(res409.payload);
    assert.equal(body409.success, false);
    assert.equal(body409.error.code, "SLUG_ALREADY_EXISTS");
  });

  await t.test("Domain J.2: 500 error sanitization guarantees zero SQL or database internals leakage", async () => {
    // Simulate an unexpected error by invoking an endpoint that throws an unhandled error
    // In ApiExceptionFilter, any statusCode >= 500 returns code: "INTERNAL_ERROR" and message: "An unexpected error occurred."
    const filter = new ApiExceptionFilter({
      error: () => {},
    } as any);

    let sentStatus = 0;
    let sentPayload: any = null;

    const mockReply: any = {
      status: (code: number) => {
        sentStatus = code;
        return {
          send: (payload: any) => {
            sentPayload = payload;
          },
        };
      },
    };

    const mockRequest: any = {
      id: "req-sanitization-123",
      routeOptions: { url: "/staff/catalog/test" },
    };

    const mockHost: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockReply,
      }),
    };

    // Simulate unexpected internal database error with sensitive SQL details
    const sensitiveError = new Error(
      'syntax error at or near "SELECT" in query: SELECT * FROM secret_table WHERE password = "leak"',
    );

    filter.catch(sensitiveError, mockHost);

    assert.equal(sentStatus, 500);
    assert.deepEqual(sentPayload, {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        timestamp: sentPayload.error.timestamp,
        requestId: "req-sanitization-123",
      },
    });

    // Verify sensitive SQL/table details are strictly absent from client envelope
    const serialized = JSON.stringify(sentPayload);
    assert.equal(serialized.includes("secret_table"), false);
    assert.equal(serialized.includes("password"), false);
    assert.equal(serialized.includes("SELECT"), false);
  });
});
