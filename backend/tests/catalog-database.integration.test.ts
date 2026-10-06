import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL || "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Phase 3B: Functional Database Tests & Integrity Verification", async (t) => {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  // Helper to run query
  const query = (text: string, params: any[] = []) => pool.query(text, params);

  // Setup: create a test admin user and media team user for foreign key references
  const adminId = randomUUID();
  const mediaStaffId = randomUUID();
  await query(
    `INSERT INTO users (id, email, password_hash, role, status)
     VALUES ($1, $2, 'hash', 'admin', 'active'),
            ($3, $4, 'hash', 'media_team', 'active')`,
    [adminId, `admin-${adminId}@test.com`, mediaStaffId, `staff-${mediaStaffId}@test.com`],
  );

  await t.test("Positive 1: Create Categories with case-insensitive unique name & slug", async () => {
    const catId = randomUUID();
    const res = await query(
      `INSERT INTO categories (id, name, slug, description, display_order, is_active)
       VALUES ($1, 'Action Cinema', 'action-cinema', 'High adrenaline movies', 1, true)
       RETURNING id, name, slug, display_order, is_active`,
      [catId],
    );
    assert.equal(res.rowCount, 1);
    assert.equal(res.rows[0].name, "Action Cinema");
    assert.equal(res.rows[0].slug, "action-cinema");
  });

  await t.test("Positive 2: Create Countries with uppercase unique code & case-insensitive name", async () => {
    const countryId = randomUUID();
    const res = await query(
      `INSERT INTO countries (id, code, name, flag_emoji, is_active)
       VALUES ($1, 'TZ', 'Tanzania', '🇹🇿', true)
       RETURNING id, code, name, flag_emoji`,
      [countryId],
    );
    assert.equal(res.rowCount, 1);
    assert.equal(res.rows[0].code, "TZ");
    assert.equal(res.rows[0].name, "Tanzania");
  });

  await t.test("Positive 3: Create DJ Voice Artist with unique slug and stage name", async () => {
    const djId = randomUUID();
    const res = await query(
      `INSERT INTO dj_voice_artists (id, name, stage_name, slug, color_hex, is_active)
       VALUES ($1, 'John Doe', 'DJ Afro', 'dj-afro', '#FF5500', true)
       RETURNING id, stage_name, slug`,
      [djId],
    );
    assert.equal(res.rowCount, 1);
    assert.equal(res.rows[0].stage_name, "DJ Afro");
    assert.equal(res.rows[0].slug, "dj-afro");
  });

  await t.test("Positive 4: Create Movie with 5-state lifecycle and full metadata", async () => {
    const movieId = randomUUID();
    const res = await query(
      `INSERT INTO content (
         id, code_id, content_type, title, original_title, slug, release_year,
         description, status, duration_minutes, created_by
       ) VALUES ($1, '#GF-0001', 'movie', 'Gladiator II', 'Gladiator 2', 'gladiator-ii', 2024,
                 'Epic historical drama', 'draft', 148, $2)
       RETURNING id, code_id, content_type, status, slug`,
      [movieId, mediaStaffId],
    );
    assert.equal(res.rowCount, 1);
    assert.equal(res.rows[0].code_id, "#GF-0001");
    assert.equal(res.rows[0].content_type, "movie");
    assert.equal(res.rows[0].status, "draft");
  });

  await t.test("Positive 5: Link Movie to Category and Country (M:N junctions)", async () => {
    const [movie] = (await query("SELECT id FROM content WHERE code_id = '#GF-0001'")).rows;
    const [cat] = (await query("SELECT id FROM categories WHERE slug = 'action-cinema'")).rows;
    const [country] = (await query("SELECT id FROM countries WHERE code = 'TZ'")).rows;

    const catLink = await query(
      "INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2) RETURNING content_id, category_id",
      [movie.id, cat.id],
    );
    assert.equal(catLink.rowCount, 1);

    const countryLink = await query(
      "INSERT INTO content_countries (content_id, country_id) VALUES ($1, $2) RETURNING content_id, country_id",
      [movie.id, country.id],
    );
    assert.equal(countryLink.rowCount, 1);
  });

  await t.test("Positive 6: Create Multiple Movie Editions (Default and Non-Default)", async () => {
    const [movie] = (await query("SELECT id FROM content WHERE code_id = '#GF-0001'")).rows;
    const [dj1] = (await query("SELECT id FROM dj_voice_artists WHERE slug = 'dj-afro'")).rows;

    const dj2Id = randomUUID();
    await query(
      `INSERT INTO dj_voice_artists (id, name, stage_name, slug)
       VALUES ($1, 'Peter Murphy', 'DJ Murphy', 'dj-murphy')`,
      [dj2Id],
    );

    // Edition 1: Default & Available
    const ed1Res = await query(
      `INSERT INTO movie_editions (
         movie_id, dj_id, streaming_file_key, download_file_key,
         streaming_status, download_status, is_default, is_available
       ) VALUES ($1, $2, 'streams/glad_afro.m3u8', 'downloads/glad_afro.zip', 'ready', 'ready', true, true)
       RETURNING id, is_default, is_available`,
      [movie.id, dj1.id],
    );
    assert.equal(ed1Res.rowCount, 1);
    assert.equal(ed1Res.rows[0].is_default, true);
    assert.equal(ed1Res.rows[0].is_available, true);

    // Edition 2: Secondary, Non-Default, Processing
    const ed2Res = await query(
      `INSERT INTO movie_editions (
         movie_id, dj_id, streaming_file_key, download_file_key,
         streaming_status, download_status, is_default, is_available
       ) VALUES ($1, $2, 'streams/glad_murphy.m3u8', NULL, 'ready', 'processing', false, false)
       RETURNING id, is_default, is_available`,
      [movie.id, dj2Id],
    );
    assert.equal(ed2Res.rowCount, 1);
    assert.equal(ed2Res.rows[0].is_default, false);
    assert.equal(ed2Res.rows[0].is_available, false);
  });

  await t.test("Positive 7: Create Series hierarchy (Series -> Seasons -> Episodes)", async () => {
    const seriesId = randomUUID();
    const [dj1] = (await query("SELECT id FROM dj_voice_artists WHERE slug = 'dj-afro'")).rows;

    // Series Content record
    await query(
      `INSERT INTO content (
         id, code_id, content_type, title, slug, status, created_by
       ) VALUES ($1, '#GF-0002', 'series', 'Sultana', 'sultana', 'published', $2)`,
      [seriesId, mediaStaffId],
    );

    // Series Metadata record
    await query(
      `INSERT INTO series_metadata (content_id, lead_dj_id)
       VALUES ($1, $2)`,
      [seriesId, dj1.id],
    );

    // Season 1
    const seasonId = randomUUID();
    await query(
      `INSERT INTO seasons (id, series_id, season_number, title, is_active)
       VALUES ($1, $2, 1, 'Season 1', true)`,
      [seasonId, seriesId],
    );

    // Episode 1 (Published & Available)
    const ep1Id = randomUUID();
    await query(
      `INSERT INTO episodes (
         id, season_id, episode_number, title, duration_minutes, dj_id,
         streaming_file_key, download_file_key, streaming_status, download_status,
         status, is_available
       ) VALUES ($1, $2, 1, 'Pilot', 45, $3,
                 'streams/sultana_s1e1.m3u8', 'downloads/sultana_s1e1.zip',
                 'ready', 'ready', 'published', true)`,
      [ep1Id, seasonId, dj1.id],
    );

    // Episode 2 (Draft & Incomplete)
    const ep2Id = randomUUID();
    await query(
      `INSERT INTO episodes (
         id, season_id, episode_number, title, duration_minutes, dj_id,
         streaming_file_key, streaming_status, download_status,
         status, is_available
       ) VALUES ($1, $2, 2, 'The Journey', 42, $3,
                 'streams/sultana_s1e2.m3u8', 'processing', 'pending',
                 'draft', false)`,
      [ep2Id, seasonId, dj1.id],
    );

    const epsCount = await query("SELECT count(*) FROM episodes WHERE season_id = $1", [seasonId]);
    assert.equal(epsCount.rows[0].count, "2");
  });

  await t.test("Positive 8: Rejection Review Notes history persistence", async () => {
    const [movie] = (await query("SELECT id FROM content WHERE code_id = '#GF-0001'")).rows;

    const noteId = randomUUID();
    const res = await query(
      `INSERT INTO content_review_notes (id, content_id, reviewer_id, assigned_to, rejection_reason)
       VALUES ($1, $2, $3, $4, 'Voiceover sync defect in Act 2')
       RETURNING id, rejection_reason`,
      [noteId, movie.id, adminId, mediaStaffId],
    );
    assert.equal(res.rowCount, 1);
    assert.equal(res.rows[0].rejection_reason, "Voiceover sync defect in Act 2");
  });

  await t.test("Negative 1: Reject duplicate category slug (case-insensitive)", async () => {
    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO categories (name, slug) VALUES ('Different Action', 'ACTION-CINEMA')",
        );
      },
      /categories_slug_unique_idx/,
    );
  });

  await t.test("Negative 2: Reject duplicate country code (case-insensitive uppercase)", async () => {
    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO countries (code, name) VALUES ('tz', 'Tanzania Clone')",
        );
      },
      /countries_code_unique_idx/,
    );
  });

  await t.test("Negative 3: Reject duplicate DJ slug (case-insensitive)", async () => {
    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO dj_voice_artists (name, stage_name, slug) VALUES ('Other', 'DJ AFRO', 'DJ-AFRO')",
        );
      },
      /dj_voice_artists_slug_unique_idx/,
    );
  });

  await t.test("Negative 4: Reject duplicate content slug (case-insensitive)", async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO content (code_id, content_type, title, slug, created_by)
           VALUES ('#GF-DIFF', 'movie', 'Gladiator Clone', 'GLADIATOR-II', $1)`,
          [mediaStaffId],
        );
      },
      /content_slug_unique_idx/,
    );
  });

  await t.test("Negative 5: Reject duplicate junction (content_categories)", async () => {
    const [movie] = (await query("SELECT id FROM content WHERE code_id = '#GF-0001'")).rows;
    const [cat] = (await query("SELECT id FROM categories WHERE slug = 'action-cinema'")).rows;

    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)",
          [movie.id, cat.id],
        );
      },
      /content_categories_content_id_category_id_pk/,
    );
  });

  await t.test("Negative 6: Reject duplicate season number in same series", async () => {
    const [series] = (await query("SELECT id FROM content WHERE code_id = '#GF-0002'")).rows;
    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO seasons (series_id, season_number, title) VALUES ($1, 1, 'Duplicate Season 1')",
          [series.id],
        );
      },
      /seasons_series_season_number_unique_idx/,
    );
  });

  await t.test("Negative 7: Reject duplicate episode number in same season", async () => {
    const [season] = (await query("SELECT id FROM seasons WHERE season_number = 1")).rows;
    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO episodes (season_id, episode_number, title) VALUES ($1, 1, 'Duplicate Ep 1')",
          [season.id],
        );
      },
      /episodes_season_episode_number_unique_idx/,
    );
  });

  await t.test("Negative 8: Reject invalid content lifecycle enum value", async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO content (code_id, content_type, title, slug, status, created_by)
           VALUES ('#GF-BAD', 'movie', 'Bad Status', 'bad-status', 'invalid_status_enum', $1)`,
          [mediaStaffId],
        );
      },
      /invalid input value for enum content_status/,
    );
  });

  await t.test("Negative 9: Reject invalid media status enum value", async () => {
    const [movie] = (await query("SELECT id FROM content WHERE code_id = '#GF-0001'")).rows;
    const dj3Id = randomUUID();
    await query(
      "INSERT INTO dj_voice_artists (id, name, stage_name, slug) VALUES ($1, 'DJ Three', 'DJ Three', 'dj-three')",
      [dj3Id],
    );

    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO movie_editions (movie_id, dj_id, streaming_status)
           VALUES ($1, $2, 'transcoding_magic')`,
          [movie.id, dj3Id],
        );
      },
      /invalid input value for enum media_status/,
    );
  });

  await t.test("Negative 10: Reject two default editions for the same movie (Partial Unique Index)", async () => {
    const [movie] = (await query("SELECT id FROM content WHERE code_id = '#GF-0001'")).rows;
    const [dj2] = (await query("SELECT id FROM dj_voice_artists WHERE slug = 'dj-murphy'")).rows;

    await assert.rejects(
      async () => {
        await query(
          "UPDATE movie_editions SET is_default = true WHERE movie_id = $1 AND dj_id = $2",
          [movie.id, dj2.id],
        );
      },
      /movie_editions_single_default_idx/,
    );
  });

  await t.test("Negative 11: Reject hard-deleting category referenced by content (ON DELETE RESTRICT)", async () => {
    const [cat] = (await query("SELECT id FROM categories WHERE slug = 'action-cinema'")).rows;
    await assert.rejects(
      async () => {
        await query("DELETE FROM categories WHERE id = $1", [cat.id]);
      },
      /violates.*foreign key constraint/i,
    );
  });

  await t.test("Negative 12: Reject hard-deleting country referenced by content (ON DELETE RESTRICT)", async () => {
    const [country] = (await query("SELECT id FROM countries WHERE code = 'TZ'")).rows;
    await assert.rejects(
      async () => {
        await query("DELETE FROM countries WHERE id = $1", [country.id]);
      },
      /violates.*foreign key constraint/i,
    );
  });

  await t.test("Negative 13: Reject hard-deleting DJ referenced by movie edition (ON DELETE RESTRICT)", async () => {
    const [dj1] = (await query("SELECT id FROM dj_voice_artists WHERE slug = 'dj-afro'")).rows;
    await assert.rejects(
      async () => {
        await query("DELETE FROM dj_voice_artists WHERE id = $1", [dj1.id]);
      },
      /violates.*foreign key constraint/i,
    );
  });

  await t.test("Positive 9: Movie can exist with 0 default editions when in draft/incomplete state", async () => {
    const unpubMovieId = randomUUID();
    await query(
      `INSERT INTO content (id, code_id, content_type, title, slug, status, created_by)
       VALUES ($1, $2, 'movie', 'Zero Defaults Movie', $3, 'draft', $4)`,
      [unpubMovieId, `#GF-ZERO-${unpubMovieId.slice(0, 4)}`, `zero-def-${unpubMovieId.slice(0, 6)}`, mediaStaffId],
    );
    const count = await query("SELECT count(*) FROM movie_editions WHERE movie_id = $1 AND is_default = true", [unpubMovieId]);
    assert.equal(count.rows[0].count, "0", "Movie can have 0 default editions");
  });

  await t.test("Negative 14: System settings rejects duplicate key", async () => {
    await query("INSERT INTO system_settings (key, value) VALUES ('publishingRequiresApproval', 'true') ON CONFLICT (key) DO NOTHING");
    await assert.rejects(
      async () => {
        await query("INSERT INTO system_settings (key, value) VALUES ('publishingRequiresApproval', 'false')");
      },
      /system_settings_pkey/,
    );
  });

  await pool.end();
});
