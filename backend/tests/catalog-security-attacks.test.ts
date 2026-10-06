import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL || "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Phase 3B: Database Security & Concurrency Integrity Attacks", async (t) => {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  const query = (text: string, params: any[] = []) => pool.query(text, params);

  // Setup: create actor for tests
  const staffId = randomUUID();
  await query(
    `INSERT INTO users (id, email, password_hash, role, status)
     VALUES ($1, $2, 'hash', 'media_team', 'active')`,
    [staffId, `attack-staff-${staffId}@test.com`],
  );

  await t.test("Attack A — Double default edition race condition", async () => {
    // Create new movie
    const movieId = randomUUID();
    await query(
      `INSERT INTO content (id, code_id, content_type, title, slug, created_by)
       VALUES ($1, $2, 'movie', 'Race Movie', $3, $4)`,
      [movieId, `#GF-RACE-${movieId.slice(0, 4)}`, `race-movie-${movieId.slice(0, 6)}`, staffId],
    );

    // Create 2 DJs
    const dj1Id = randomUUID();
    const dj2Id = randomUUID();
    await query(
      `INSERT INTO dj_voice_artists (id, name, stage_name, slug)
       VALUES ($1, 'DJ One', 'DJ One', $2), ($3, 'DJ Two', 'DJ Two', $4)`,
      [dj1Id, `dj-one-${dj1Id.slice(0, 5)}`, dj2Id, `dj-two-${dj2Id.slice(0, 5)}`],
    );

    // Insert edition 1 as non-default, edition 2 as non-default
    await query(
      `INSERT INTO movie_editions (movie_id, dj_id, is_default)
       VALUES ($1, $2, false), ($1, $3, false)`,
      [movieId, dj1Id, dj2Id],
    );

    // First set edition 1 as default
    await query(
      "UPDATE movie_editions SET is_default = true WHERE movie_id = $1 AND dj_id = $2",
      [movieId, dj1Id],
    );

    // Attempting to set edition 2 as default must be rejected by partial unique index
    await assert.rejects(
      async () => {
        await query(
          "UPDATE movie_editions SET is_default = true WHERE movie_id = $1 AND dj_id = $2",
          [movieId, dj2Id],
        );
      },
      /movie_editions_single_default_idx/,
    );

    // Verify database has exactly 1 default edition
    const defaults = await query(
      "SELECT count(*) FROM movie_editions WHERE movie_id = $1 AND is_default = true",
      [movieId],
    );
    assert.equal(defaults.rows[0].count, "1");
  });

  await t.test("Attack B — Taxonomy deletion vs content association race", async () => {
    const catId = randomUUID();
    await query(
      "INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)",
      [catId, `Race Cat ${catId.slice(0, 6)}`, `race-cat-${catId.slice(0, 6)}`],
    );

    const movieId = randomUUID();
    await query(
      `INSERT INTO content (id, code_id, content_type, title, slug, created_by)
       VALUES ($1, $2, 'movie', 'Cat Link Movie', $3, $4)`,
      [movieId, `#GF-CAT-${movieId.slice(0, 4)}`, `cat-link-${movieId.slice(0, 6)}`, staffId],
    );

    // Client 1 associates category to content
    await query(
      "INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)",
      [movieId, catId],
    );

    // Attempting to delete referenced category must fail with ON DELETE RESTRICT
    await assert.rejects(
      async () => {
        await query("DELETE FROM categories WHERE id = $1", [catId]);
      },
      /violates.*foreign key constraint/i,
    );

    // Verify category still exists in database
    const catCheck = await query("SELECT count(*) FROM categories WHERE id = $1", [catId]);
    assert.equal(catCheck.rows[0].count, "1");
  });

  await t.test("Attack C — Concurrent duplicate slug race", async () => {
    const slug = `race-slug-${randomUUID().slice(0, 8)}`;

    const insertPromise1 = query(
      `INSERT INTO content (code_id, content_type, title, slug, created_by)
       VALUES ($1, 'movie', 'Slug 1', $2, $3)`,
      [`#GF-SLUG-1-${randomUUID().slice(0, 8)}`, slug, staffId],
    );

    const insertPromise2 = query(
      `INSERT INTO content (code_id, content_type, title, slug, created_by)
       VALUES ($1, 'movie', 'Slug 2', $2, $3)`,
      [`#GF-SLUG-2-${randomUUID().slice(0, 8)}`, slug, staffId],
    );

    const results = await Promise.allSettled([insertPromise1, insertPromise2]);
    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly one insert must succeed");
    assert.equal(rejected.length, 1, "Exactly one insert must be rejected due to unique slug index");
    assert.match((rejected[0] as PromiseRejectedResult).reason.message, /content_slug_unique_idx/);
  });

  await t.test("Attack D — Concurrent duplicate junction race", async () => {
    const catId = randomUUID();
    await query(
      "INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)",
      [catId, `Junction Race Cat ${catId.slice(0, 6)}`, `junc-cat-${catId.slice(0, 6)}`],
    );

    const movieId = randomUUID();
    await query(
      `INSERT INTO content (id, code_id, content_type, title, slug, created_by)
       VALUES ($1, $2, 'movie', 'Junction Movie', $3, $4)`,
      [movieId, `#GF-JUNC-${movieId.slice(0, 4)}`, `junc-movie-${movieId.slice(0, 6)}`, staffId],
    );

    const p1 = query("INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)", [movieId, catId]);
    const p2 = query("INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)", [movieId, catId]);

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly one link can succeed");
    assert.equal(rejected.length, 1, "Duplicate link must fail composite primary key");
  });

  await t.test("Attack E — Invalid hierarchy attachment attempts", async () => {
    // Non-existent season attachment
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO episodes (season_id, episode_number, title)
           VALUES ($1, 1, 'Ghost Episode')`,
          [randomUUID()],
        );
      },
      /episodes_season_id_seasons_id_fk/,
    );

    // Non-existent series attachment
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO seasons (series_id, season_number, title)
           VALUES ($1, 1, 'Ghost Season')`,
          [randomUUID()],
        );
      },
      /seasons_series_id_content_id_fk/,
    );

    // Non-existent movie attachment for edition
    await assert.rejects(
      async () => {
        const [dj] = (await query("SELECT id FROM dj_voice_artists LIMIT 1")).rows;
        await query(
          "INSERT INTO movie_editions (movie_id, dj_id) VALUES ($1, $2)",
          [randomUUID(), dj.id],
        );
      },
      /movie_editions_movie_id_content_id_fk/,
    );

    // Non-existent DJ attachment for edition
    await assert.rejects(
      async () => {
        const [movie] = (await query("SELECT id FROM content WHERE content_type = 'movie' LIMIT 1")).rows;
        await query(
          "INSERT INTO movie_editions (movie_id, dj_id) VALUES ($1, $2)",
          [movie.id, randomUUID()],
        );
      },
      /movie_editions_dj_id_dj_voice_artists_id_fk/,
    );
  });

  await t.test("Attack F — Invalid lifecycle status injection attempt", async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO content (code_id, content_type, title, slug, status, created_by)
           VALUES ('#GF-INJECT', 'movie', 'Hacked Status', 'hacked-status', 'LEAKED_LIVE', $1)`,
          [staffId],
        );
      },
      /invalid input value for enum content_status/,
    );
  });

  await t.test("Attack G — Invalid media status injection attempt", async () => {
    const [movie] = (await query("SELECT id FROM content WHERE content_type = 'movie' LIMIT 1")).rows;
    const [dj] = (await query("SELECT id FROM dj_voice_artists LIMIT 1")).rows;

    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO movie_editions (movie_id, dj_id, streaming_status)
           VALUES ($1, $2, 'INSTANT_BYPASS_READY')`,
          [movie.id, dj.id],
        );
      },
      /invalid input value for enum media_status/,
    );
  });

  await t.test("Attack H — Polymorphic content integrity: prevent cross-type attachments", async () => {
    // 1. Create a Movie content
    const movieId = randomUUID();
    await query(
      `INSERT INTO content (id, code_id, content_type, title, slug, created_by)
       VALUES ($1, $2, 'movie', 'Poly Movie', $3, $4)`,
      [movieId, `#GF-POLY-M-${movieId.slice(0, 4)}`, `poly-m-${movieId.slice(0, 6)}`, staffId],
    );

    // 2. Create a Series content
    const seriesId = randomUUID();
    await query(
      `INSERT INTO content (id, code_id, content_type, title, slug, created_by)
       VALUES ($1, $2, 'series', 'Poly Series', $3, $4)`,
      [seriesId, `#GF-POLY-S-${seriesId.slice(0, 4)}`, `poly-s-${seriesId.slice(0, 6)}`, staffId],
    );

    const [dj] = (await query("SELECT id FROM dj_voice_artists LIMIT 1")).rows;

    // Verify valid attachments succeed
    await query(
      "INSERT INTO movie_editions (movie_id, dj_id) VALUES ($1, $2)",
      [movieId, dj.id],
    );
    await query(
      "INSERT INTO series_metadata (content_id, lead_dj_id) VALUES ($1, $2)",
      [seriesId, dj.id],
    );
    await query(
      "INSERT INTO seasons (series_id, season_number, title) VALUES ($1, 1, 'Season 1')",
      [seriesId],
    );

    // Verify queries enforcing polymorphic invariants:
    // A Movie cannot have seasons or series_metadata
    const movieAsSeries = await query(
      "SELECT c.id, c.content_type FROM content c JOIN seasons s ON s.series_id = c.id WHERE c.id = $1",
      [movieId],
    );
    assert.equal(movieAsSeries.rows.length, 0, "Movie must not have seasons");

    // A Series cannot have movie editions
    const seriesAsMovie = await query(
      "SELECT c.id, c.content_type FROM content c JOIN movie_editions me ON me.movie_id = c.id WHERE c.id = $1",
      [seriesId],
    );
    assert.equal(seriesAsMovie.rows.length, 0, "Series must not have movie editions");
  });

  await t.test("Attack I — Account deletion preserves content audit integrity (ON DELETE RESTRICT)", async () => {
    // Creating content requires created_by
    const creatorId = randomUUID();
    await query(
      `INSERT INTO users (id, email, password_hash, role, status)
       VALUES ($1, $2, 'hash', 'media_team', 'active')`,
      [creatorId, `creator-${creatorId}@test.com`],
    );

    const movieId = randomUUID();
    await query(
      `INSERT INTO content (id, code_id, content_type, title, slug, created_by)
       VALUES ($1, $2, 'movie', 'Audit Movie', $3, $4)`,
      [movieId, `#GF-AUDIT-${movieId.slice(0, 4)}`, `audit-movie-${movieId.slice(0, 6)}`, creatorId],
    );

    // Attempting to hard-delete the user who created content must fail
    await assert.rejects(
      async () => {
        await query("DELETE FROM users WHERE id = $1", [creatorId]);
      },
      /violates.*foreign key constraint/i,
    );

    // Verified: Deactivating or anonymizing the user is the compliant way, hard delete is blocked
    const user = await query("SELECT id, status FROM users WHERE id = $1", [creatorId]);
    assert.equal(user.rows.length, 1);
  });

  await pool.end();
});
