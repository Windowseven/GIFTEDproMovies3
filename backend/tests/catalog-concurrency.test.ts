import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/infrastructure/database/schemas/index.js";
import { CatalogRepository } from "../src/modules/catalog/repositories/catalog.repository.js";
import { PolymorphicCatalogService } from "../src/modules/catalog/services/polymorphic-catalog.service.js";
import { ContentLifecycleService } from "../src/modules/catalog/services/content-lifecycle.service.js";
import { SystemSettingsService } from "../src/modules/catalog/services/system-settings.service.js";
import { AuditService } from "../src/modules/audit/audit.service.js";
import { NotificationsService } from "../src/modules/notifications/notifications.service.js";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Phase 3C Stage 2: Concurrency & Lock Serialization Tests (Real PostgreSQL Connections)", async (t) => {
  const pool1 = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  const pool2 = new pg.Pool({ connectionString: databaseUrl, max: 2 });

  const db1 = drizzle(pool1, { schema });
  const db2 = drizzle(pool2, { schema });

  const audit1 = new AuditService(db1);
  const audit2 = new AuditService(db2);

  const notifications1 = new NotificationsService(db1);
  const notifications2 = new NotificationsService(db2);

  const repo1 = new CatalogRepository(db1);
  const repo2 = new CatalogRepository(db2);

  const settings1 = new SystemSettingsService(db1, audit1);
  const settings2 = new SystemSettingsService(db2, audit2);

  const catalog1 = new PolymorphicCatalogService(db1, repo1, audit1);
  const catalog2 = new PolymorphicCatalogService(db2, repo2, audit2);

  const lifecycle1 = new ContentLifecycleService(db1, repo1, audit1, notifications1, settings1);
  const lifecycle2 = new ContentLifecycleService(db2, repo2, audit2, notifications2, settings2);

  // Setup staff users and fixtures
  const adminId = randomUUID();
  const staffId = randomUUID();
  await pool1.query(
    `INSERT INTO users (id, email, password_hash, role, status)
     VALUES ($1, $2, 'hash', 'admin', 'active'),
            ($3, $4, 'hash', 'media_team', 'active')
     ON CONFLICT DO NOTHING`,
    [adminId, `admin-c-${adminId}@giftedpro.test`, staffId, `staff-c-${staffId}@giftedpro.test`],
  );

  const djRes = await pool1.query(
    `INSERT INTO dj_voice_artists (id, name, stage_name, slug, is_active)
     VALUES ($1, 'DJ Concurrency', $2, $3, true) RETURNING id`,
    [randomUUID(), `DJ Concurrency ${randomUUID().slice(0, 6)}`, `dj-conc-${randomUUID().slice(0, 6)}`],
  );
  const djId = djRes.rows[0].id;

  const catRes = await pool1.query(
    `INSERT INTO categories (id, name, slug, is_active)
     VALUES ($1, $2, $3, true) RETURNING id`,
    [randomUUID(), `Conc Cat ${randomUUID().slice(0, 6)}`, `cat-conc-${randomUUID().slice(0, 6)}`],
  );
  const categoryId = catRes.rows[0].id;

  const countryRes = await pool1.query(
    `INSERT INTO countries (id, name, code, is_active)
     VALUES ($1, $2, $3, true) RETURNING id`,
    [randomUUID(), `Conc Country ${randomUUID().slice(0, 6)}`, `C-${randomUUID().slice(0, 5)}`],
  );
  const countryId = countryRes.rows[0].id;

  t.after(async () => {
    await pool1.end();
    await pool2.end();
  });

  // =========================================================================
  // RACE A: Parent deletion vs Child creation
  // =========================================================================
  await t.test("Race A: Parent deletion vs child creation on independent connections", async () => {
    const movie = await catalog1.createContent(
      {
        title: "Race A Movie",
        slug: `race-a-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
      },
      staffId,
    );

    // Client 1 deletes parent inside transaction after a brief pause
    // Client 2 attempts to attach edition to parent concurrently
    const [delResult, attachResult] = await Promise.allSettled([
      db1.transaction(async (tx) => {
        await repo1.lockContentForUpdate(tx, movie.id);
        await new Promise((resolve) => setTimeout(resolve, 50));
        await repo1.deleteContent(tx, movie.id);
      }),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return await catalog2.attachMovieEdition(
          movie.id,
          {
            djId,
            streamingStatus: "ready",
            downloadStatus: "ready",
          },
          staffId,
        );
      })(),
    ]);

    // Deletion must succeed
    assert.equal(delResult.status, "fulfilled");
    // Child attachment must be rejected (parent deleted, not found)
    assert.equal(attachResult.status, "rejected");

    // Verify zero orphan edition rows exist in PostgreSQL
    const editions = await pool1.query(
      `SELECT * FROM movie_editions WHERE movie_id = $1`,
      [movie.id],
    );
    assert.equal(editions.rows.length, 0);
  });

  // =========================================================================
  // RACE B: Parent lifecycle mutation vs Child creation
  // =========================================================================
  await t.test("Race B: Parent lifecycle mutation vs child creation cleanly serializes", async () => {
    const movie = await catalog1.createContent(
      {
        title: "Race B Movie",
        slug: `race-b-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
      },
      staffId,
    );

    // Client 1 archives content (locks content FOR UPDATE)
    // Client 2 attaches an edition concurrently (locks content FOR UPDATE)
    const [archiveResult, attachResult] = await Promise.allSettled([
      lifecycle1.archiveContent(movie.id, adminId),
      catalog2.attachMovieEdition(
        movie.id,
        {
          djId,
          streamingStatus: "ready",
          downloadStatus: "ready",
        },
        staffId,
      ),
    ]);

    // Both operations must settle cleanly without error or unhandled deadlock
    assert.equal(archiveResult.status, "fulfilled", "Archive operation must succeed");
    assert.equal(attachResult.status, "fulfilled", "Attach edition operation must succeed");

    // Both operations must finish with valid serialized states
    const finalMovie = await repo1.findContentById(db1, movie.id);
    assert.ok(finalMovie !== null);
    assert.equal(finalMovie.status, "archived", "Final lifecycle state must be archived");

    // Verify final child count: exactly one edition exists attached to the movie
    const finalEditions = await pool1.query(
      `SELECT count(*) FROM movie_editions WHERE movie_id = $1`,
      [movie.id],
    );
    assert.equal(finalEditions.rows[0].count, "1", "Exactly one child edition exists");
  });

  // =========================================================================
  // RACE C: Two concurrent default-edition assignments
  // =========================================================================
  await t.test("Race C: Two concurrent default-edition assignments produce at most one default", async () => {
    const movie = await catalog1.createContent(
      {
        title: "Race C Movie",
        slug: `race-c-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
      },
      staffId,
    );

    // Create 2 editions
    const ed1 = await catalog1.attachMovieEdition(
      movie.id,
      { djId, isDefault: true, streamingStatus: "ready", downloadStatus: "ready" },
      staffId,
    );

    const dj2Res = await pool1.query(
      `INSERT INTO dj_voice_artists (id, name, stage_name, slug, is_active)
       VALUES ($1, 'DJ Second', $2, $3, true) RETURNING id`,
      [randomUUID(), `DJ Two ${randomUUID().slice(0, 6)}`, `dj-two-${randomUUID().slice(0, 6)}`],
    );
    const dj2Id = dj2Res.rows[0].id;

    const ed2 = await catalog1.attachMovieEdition(
      movie.id,
      { djId: dj2Id, isDefault: false, streamingStatus: "ready", downloadStatus: "ready" },
      staffId,
    );

    // Concurrent default assignments on independent connections
    await Promise.allSettled([
      catalog1.repointDefaultEdition(movie.id, ed1.id, adminId),
      catalog2.repointDefaultEdition(movie.id, ed2.id, adminId),
    ]);

    // Check exact defaults in PostgreSQL
    const defaults = await pool1.query(
      `SELECT id, is_default FROM movie_editions WHERE movie_id = $1 AND is_default = true`,
      [movie.id],
    );

    // Exactly one default edition exists!
    assert.equal(defaults.rows.length, 1);
  });

  // =========================================================================
  // RACE D: Concurrent edition outage / fallback
  // =========================================================================
  await t.test("Race D: Concurrent edition outage handling serializes without conflict", async () => {
    const movie = await catalog1.createContent(
      {
        title: "Race D Movie",
        slug: `race-d-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
        durationMinutes: 95,
        description: "Race D movie",
        posterUrl: "https://storage.giftedpro.test/posters/rd.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrops/rd.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailers/rd.mp4",
        categoryIds: [categoryId],
        countryIds: [countryId],
      },
      staffId,
    );

    const ed1 = await catalog1.attachMovieEdition(
      movie.id,
      {
        djId,
        isDefault: true,
        streamingStatus: "ready",
        downloadStatus: "ready",
        streamingFileKey: "media/movies/race-d-stream.m3u8",
        downloadFileKey: "media/movies/race-d-dl.mp4",
      },
      staffId,
    );

    await lifecycle1.publishContent(movie.id, adminId);

    // Two concurrent outage reports for the same edition
    const results = await Promise.allSettled([
      lifecycle1.handleMovieEditionFailure(movie.id, ed1.id, adminId),
      lifecycle2.handleMovieEditionFailure(movie.id, ed1.id, adminId),
    ]);

    // 1. Both concurrent transactions must settle successfully (fulfilled)
    assert.equal(results[0].status, "fulfilled", "Client 1 outage handling must fulfill cleanly");
    assert.equal(results[1].status, "fulfilled", "Client 2 outage handling must fulfill cleanly");

    // 2. Explicitly verify zero deadlocks (PostgreSQL SQLSTATE 40P01) occurred
    for (const res of results) {
      if (res.status === "rejected") {
        const error = (res as PromiseRejectedResult).reason;
        const code = error?.code || error?.cause?.code;
        assert.notEqual(code, "40P01", "PostgreSQL deadlock detected (40P01)");
        assert.notEqual(code, "57014", "PostgreSQL statement timeout detected (57014)");
        assert.ok(!String(error?.message).toLowerCase().includes("timeout"), "Transaction timed out");
      }
    }

    // 3. Final movie state is valid (unpublished)
    const checkMovie = await repo1.findContentById(db1, movie.id);
    assert.equal(checkMovie?.status, "unpublished", "Final movie status must be unpublished");

    // 4. Final default-edition state is valid (0 defaults remain)
    const checkEditions = await pool1.query(
      `SELECT * FROM movie_editions WHERE movie_id = $1 AND is_default = true`,
      [movie.id],
    );
    assert.equal(checkEditions.rows.length, 0, "No default editions exist for unpublished movie");
  });

  // =========================================================================
  // RACE E: Concurrent publish vs unpublish
  // =========================================================================
  await t.test("Race E: Concurrent publish vs unpublish cleanly serializes to valid state", async () => {
    const movie = await catalog1.createContent(
      {
        title: "Race E Movie",
        slug: `race-e-${randomUUID().slice(0, 8)}`,
        contentType: "movie",
        releaseYear: 2024,
        durationMinutes: 100,
        description: "Race E movie",
        posterUrl: "https://storage.giftedpro.test/posters/re.jpg",
        backdropUrl: "https://storage.giftedpro.test/backdrops/re.jpg",
        trailerUrl: "https://storage.giftedpro.test/trailers/re.mp4",
        categoryIds: [categoryId],
        countryIds: [countryId],
      },
      staffId,
    );

    await catalog1.attachMovieEdition(
      movie.id,
      {
        djId,
        isDefault: true,
        streamingStatus: "ready",
        downloadStatus: "ready",
        streamingFileKey: "media/movies/race-e-stream.m3u8",
        downloadFileKey: "media/movies/race-e-dl.mp4",
      },
      staffId,
    );

    // Run publish on Client 1 and unpublish on Client 2 concurrently
    const [pubResult, unpubResult] = await Promise.allSettled([
      lifecycle1.publishContent(movie.id, adminId),
      lifecycle2.unpublishContent(movie.id, adminId),
    ]);

    // Both operations must settle cleanly without error or unhandled deadlock
    assert.equal(pubResult.status, "fulfilled", "Publish operation must settle cleanly");
    assert.equal(unpubResult.status, "fulfilled", "Unpublish operation must settle cleanly");

    const final = await repo1.findContentById(db1, movie.id);
    assert.ok(final !== null);
    // Because both operations acquired content FOR UPDATE, they serialized cleanly
    assert.ok(
      final.status === "published" || final.status === "unpublished",
      "Final state must be a valid serialized terminal state",
    );

    // Verify audit consistency: both lifecycle transitions wrote append-only audit events inside their tx
    const auditRows = await pool1.query(
      `SELECT action FROM audit_events WHERE resource_id = $1 AND action IN ('CONTENT_PUBLISH', 'CONTENT_UNPUBLISH') ORDER BY created_at ASC`,
      [movie.id],
    );
    assert.equal(auditRows.rows.length, 2, "Both publish and unpublish audit events recorded");
  });

  // =========================================================================
  // RACE F: Concurrent episode attachment
  // =========================================================================
  await t.test("Race F: Concurrent episode attachment with same episode number rejects duplicate", async () => {
    const series = await catalog1.createContent(
      {
        title: "Race F Series",
        slug: `race-f-${randomUUID().slice(0, 8)}`,
        contentType: "series",
        releaseYear: 2024,
      },
      staffId,
    );

    const season = await catalog1.createSeason(series.id, { seasonNumber: 1 }, staffId);

    // Client 1 and Client 2 attempt to attach episode 1 simultaneously
    const [res1, res2] = await Promise.allSettled([
      catalog1.attachEpisode(
        season.id,
        { episodeNumber: 1, title: "Client 1 Episode 1" },
        staffId,
      ),
      catalog2.attachEpisode(
        season.id,
        { episodeNumber: 1, title: "Client 2 Episode 1" },
        staffId,
      ),
    ]);

    // Exactly one must succeed, and one must be rejected by unique constraint / locking
    const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejected = [res1, res2].filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    // Exactly 1 episode with episode_number = 1 in database
    const rows = await pool1.query(
      `SELECT * FROM episodes WHERE season_id = $1 AND episode_number = 1`,
      [season.id],
    );
    assert.equal(rows.rows.length, 1);
  });
});
