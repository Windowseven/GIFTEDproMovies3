import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { createRateLimiterHook } from "../src/http/rate-limiter.js";
import { loadEnvironment } from "../src/config/environment.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

let app: NestFastifyApplication;
let pool: pg.Pool;

let staffUserId: string;
let categoryActionId: string;
let categoryDramaId: string;
let countryTanzaniaId: string;
let countryKenyaId: string;
let djAfroId: string;
let djMackId: string;

let moviePublished1Id: string;
let moviePublished2Id: string;
let moviePublished3Id: string;
let seriesPublished1Id: string;
let movieDraftId: string;
let movieArchivedId: string;

const PRIVATE_PROPERTIES = [
  "streamingFileKey",
  "downloadFileKey",
  "streaming_file_key",
  "download_file_key",
  "streamingStatus",
  "downloadStatus",
  "streaming_status",
  "download_status",
  "rejectionReason",
  "rejection_reason",
  "createdBy",
  "created_by",
  "submittedBy",
  "submitted_by",
  "assignedTo",
  "assigned_to",
  "approvedBy",
  "approved_by",
];

function assertNoDataLeakage(payload: unknown, path = "root"): void {
  if (!payload || typeof payload !== "object") return;

  if (Array.isArray(payload)) {
    payload.forEach((item, index) => assertNoDataLeakage(item, `${path}[${index}]`));
    return;
  }

  const obj = payload as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    for (const forbidden of PRIVATE_PROPERTIES) {
      assert.notEqual(
        key,
        forbidden,
        `Data leakage violation: detected forbidden internal field '${key}' at path '${path}.${key}'`,
      );
    }
    assertNoDataLeakage(obj[key], `${path}.${key}`);
  }
}

before(async () => {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const fastifyAdapter = new FastifyAdapter();
  app = moduleFixture.createNestApplication<NestFastifyApplication>(fastifyAdapter);
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie);
  const env = loadEnvironment(process.env);
  fastifyInstance.addHook("onRequest", createRateLimiterHook(env));
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
  await app.init();
  await fastifyInstance.ready();

  // Seed baseline taxonomies & user
  staffUserId = randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status)
     VALUES ($1, 'staff@giftedpro.test', 'hash', 'media_team', 'active')`,
    [staffUserId],
  );

  categoryActionId = randomUUID();
  categoryDramaId = randomUUID();
  await pool.query(
    `INSERT INTO categories (id, name, slug, description, display_order, is_active)
     VALUES ($1, 'Action Thriller', 'action-thriller', 'Action and thriller films', 1, true),
            ($2, 'Historical Drama', 'historical-drama', 'Dramatic historic pieces', 2, true),
            ($3, 'Secret Inactive Category', 'secret-inactive', 'Not public', 99, false)`,
    [categoryActionId, categoryDramaId, randomUUID()],
  );

  countryTanzaniaId = randomUUID();
  countryKenyaId = randomUUID();
  await pool.query(
    `INSERT INTO countries (id, name, code, flag_emoji, is_active)
     VALUES ($1, 'Tanzania', 'TZ', '🇹🇿', true),
            ($2, 'Kenya', 'KE', '🇰🇪', true),
            ($3, 'Atlantis', 'AT', '🌊', false)`,
    [countryTanzaniaId, countryKenyaId, randomUUID()],
  );

  djAfroId = randomUUID();
  djMackId = randomUUID();
  await pool.query(
    `INSERT INTO dj_voice_artists (id, name, stage_name, slug, avatar_url, bio, color_hex, is_active)
     VALUES ($1, 'James Afro', 'DJ Afro', 'dj-afro', 'https://cdn.giftedpro.test/afro.jpg', 'Legendary Swahili voice', '#FF0000', true),
            ($2, 'Mack Steven', 'DJ Mack', 'dj-mack', 'https://cdn.giftedpro.test/mack.jpg', 'Action voice specialist', '#0000FF', true),
            ($3, 'Retired DJ', 'DJ Retired', 'dj-retired', null, null, null, false)`,
    [djAfroId, djMackId, randomUUID()],
  );

  // Seed Published Movie 1 (Latest published, action thriller, Tanzania, DJ Afro)
  moviePublished1Id = randomUUID();
  await pool.query(
    `INSERT INTO content (
       id, code_id, content_type, title, original_title, slug, release_year,
       description, poster_url, backdrop_url, trailer_url, status, duration_minutes,
       created_by, published_at
     ) VALUES (
       $1, '#GF-1001', 'movie', 'Simba wa Serengeti', 'Serengeti Lion', 'simba-wa-serengeti', 2024,
       'An epic Swahili action narrative following wildlife rangers.', 'https://cdn.giftedpro.test/p1.jpg',
       'https://cdn.giftedpro.test/b1.jpg', 'https://cdn.giftedpro.test/t1.mp4', 'published', 110,
       $2, '2026-10-25T15:00:00.000Z'
     )`,
    [moviePublished1Id, staffUserId],
  );
  await pool.query(
    `INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)`,
    [moviePublished1Id, categoryActionId],
  );
  await pool.query(
    `INSERT INTO content_countries (content_id, country_id) VALUES ($1, $2)`,
    [moviePublished1Id, countryTanzaniaId],
  );
  await pool.query(
    `INSERT INTO movie_editions (
       id, movie_id, dj_id, streaming_file_key, download_file_key, streaming_status, download_status, is_default, is_available
     ) VALUES ($1, $2, $3, 'private/keys/stream1.enc', 'private/keys/dl1.enc', 'ready', 'ready', true, true)`,
    [randomUUID(), moviePublished1Id, djAfroId],
  );

  // Seed Published Movie 2 (Middle published, drama, Kenya, DJ Mack)
  moviePublished2Id = randomUUID();
  await pool.query(
    `INSERT INTO content (
       id, code_id, content_type, title, original_title, slug, release_year,
       description, poster_url, backdrop_url, trailer_url, status, duration_minutes,
       created_by, published_at
     ) VALUES (
       $1, '#GF-1002', 'movie', 'Kivuli cha Nairobi', 'Nairobi Shadow', 'kivuli-cha-nairobi', 2023,
       'A tense crime drama set in the heart of Nairobi urban streets.', 'https://cdn.giftedpro.test/p2.jpg',
       'https://cdn.giftedpro.test/b2.jpg', 'https://cdn.giftedpro.test/t2.mp4', 'published', 125,
       $2, '2026-10-24T12:00:00.000Z'
     )`,
    [moviePublished2Id, staffUserId],
  );
  await pool.query(
    `INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)`,
    [moviePublished2Id, categoryDramaId],
  );
  await pool.query(
    `INSERT INTO content_countries (content_id, country_id) VALUES ($1, $2)`,
    [moviePublished2Id, countryKenyaId],
  );
  await pool.query(
    `INSERT INTO movie_editions (
       id, movie_id, dj_id, streaming_file_key, download_file_key, streaming_status, download_status, is_default, is_available
     ) VALUES ($1, $2, $3, 'private/keys/stream2.enc', 'private/keys/dl2.enc', 'ready', 'ready', true, true)`,
    [randomUUID(), moviePublished2Id, djMackId],
  );

  // Seed Published Movie 3 (Earliest published, action thriller, Tanzania, DJ Afro)
  moviePublished3Id = randomUUID();
  await pool.query(
    `INSERT INTO content (
       id, code_id, content_type, title, original_title, slug, release_year,
       description, poster_url, backdrop_url, trailer_url, status, duration_minutes,
       created_by, published_at
     ) VALUES (
       $1, '#GF-1003', 'movie', 'Dhoruba ya Bahari', 'Ocean Tempest', 'dhoruba-ya-bahari', 2022,
       'Maritime rescue thriller off the coast of Zanzibar.', 'https://cdn.giftedpro.test/p3.jpg',
       'https://cdn.giftedpro.test/b3.jpg', 'https://cdn.giftedpro.test/t3.mp4', 'published', 95,
       $2, '2026-10-23T10:00:00.000Z'
     )`,
    [moviePublished3Id, staffUserId],
  );
  await pool.query(
    `INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)`,
    [moviePublished3Id, categoryActionId],
  );
  await pool.query(
    `INSERT INTO content_countries (content_id, country_id) VALUES ($1, $2)`,
    [moviePublished3Id, countryTanzaniaId],
  );
  await pool.query(
    `INSERT INTO movie_editions (
       id, movie_id, dj_id, streaming_file_key, download_file_key, streaming_status, download_status, is_default, is_available
     ) VALUES ($1, $2, $3, 'private/keys/stream3.enc', 'private/keys/dl3.enc', 'ready', 'ready', true, true)`,
    [randomUUID(), moviePublished3Id, djAfroId],
  );

  // Seed Published Series 1
  seriesPublished1Id = randomUUID();
  await pool.query(
    `INSERT INTO content (
       id, code_id, content_type, title, original_title, slug, release_year,
       description, poster_url, backdrop_url, status, created_by, published_at
     ) VALUES (
       $1, '#GF-2001', 'series', 'Mfalme wa Giza', 'Shadow King', 'mfalme-wa-giza', 2024,
       'A multi-part episodic thriller tracing crime kingdoms.', 'https://cdn.giftedpro.test/ps1.jpg',
       'https://cdn.giftedpro.test/bs1.jpg', 'published', $2, '2026-10-25T10:00:00.000Z'
     )`,
    [seriesPublished1Id, staffUserId],
  );
  await pool.query(
    `INSERT INTO content_categories (content_id, category_id) VALUES ($1, $2)`,
    [seriesPublished1Id, categoryActionId],
  );
  await pool.query(
    `INSERT INTO series_metadata (content_id, lead_dj_id) VALUES ($1, $2)`,
    [seriesPublished1Id, djAfroId],
  );

  const season1Id = randomUUID();
  await pool.query(
    `INSERT INTO seasons (id, series_id, season_number, title, is_active)
     VALUES ($1, $2, 1, 'Msimu wa Kwanza', true)`,
    [season1Id, seriesPublished1Id],
  );

  // Season 1 Episode 1 (Published & Available)
  await pool.query(
    `INSERT INTO episodes (
       id, season_id, episode_number, title, duration_minutes, description,
       thumbnail_url, dj_id, streaming_file_key, download_file_key, streaming_status,
       download_status, status, is_available
     ) VALUES (
       $1, $2, 1, 'Mwanzo wa Vita', 45, 'The confrontation begins.',
       'https://cdn.giftedpro.test/ep1.jpg', $3, 'private/stream_ep1.enc', 'private/dl_ep1.enc',
       'ready', 'ready', 'published', true
     )`,
    [randomUUID(), season1Id, djAfroId],
  );

  // Season 1 Episode 2 (Draft - Not Available, Must be excluded!)
  await pool.query(
    `INSERT INTO episodes (
       id, season_id, episode_number, title, duration_minutes, description,
       thumbnail_url, dj_id, streaming_file_key, download_file_key, streaming_status,
       download_status, status, is_available
     ) VALUES (
       $1, $2, 2, 'Siri za Ndani', 48, 'Internal secrets uncovered.',
       'https://cdn.giftedpro.test/ep2.jpg', $3, 'private/stream_ep2.enc', 'private/dl_ep2.enc',
       'processing', 'pending', 'draft', false
     )`,
    [randomUUID(), season1Id, djAfroId],
  );

  // Seed Draft Content (Must be excluded everywhere)
  movieDraftId = randomUUID();
  await pool.query(
    `INSERT INTO content (
       id, code_id, content_type, title, slug, status, created_by
     ) VALUES (
       $1, '#GF-9991', 'movie', 'Rasimu ya Siri', 'rasimu-ya-siri', 'draft', $2
     )`,
    [movieDraftId, staffUserId],
  );

  // Seed Archived Content (Must be excluded everywhere)
  movieArchivedId = randomUUID();
  await pool.query(
    `INSERT INTO content (
       id, code_id, content_type, title, slug, status, created_by, archived_at
     ) VALUES (
       $1, '#GF-9992', 'movie', 'Filamu Iliyopitwa', 'filamu-iliyopitwa', 'archived', $2, NOW()
     )`,
    [movieArchivedId, staffUserId],
  );
});

after(async () => {
  if (app) {
    await app.close();
  }
  if (pool) {
    await pool.end();
  }
});

// =========================================================================
// ACCEPTANCE SUITE: CC-01 through CC-10
// =========================================================================

test("CC-01: Keyset pagination ordering (published_at DESC, id DESC) and cursor advance without duplicates", async () => {
  // Page 1: limit=2
  const res1 = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles?limit=2",
  });

  assert.equal(res1.statusCode, 200);
  const body1 = JSON.parse(res1.payload);
  assert.equal(body1.success, true);
  assert.equal(body1.data.items.length, 2);
  assert.ok(body1.data.nextCursor, "Expected nextCursor on page 1");

  const page1Ids = body1.data.items.map((i: { id: string }) => i.id);

  // First item must be latest published (Simba wa Serengeti)
  assert.equal(page1Ids[0], moviePublished1Id);
  // Second item is either seriesPublished1Id or moviePublished2Id
  assert.ok(
    new Date(body1.data.items[0].publishedAt).getTime() >=
      new Date(body1.data.items[1].publishedAt).getTime(),
  );

  // Page 2: use cursor from page 1
  const res2 = await app.inject({
    method: "GET",
    url: `/api/v1/catalog/titles?limit=2&cursor=${encodeURIComponent(body1.data.nextCursor)}`,
  });

  assert.equal(res2.statusCode, 200);
  const body2 = JSON.parse(res2.payload);
  assert.equal(body2.success, true);
  assert.ok(body2.data.items.length > 0);

  const page2Ids = body2.data.items.map((i: { id: string }) => i.id);

  // Verify zero duplicate IDs between page 1 and page 2
  for (const id of page2Ids) {
    assert.equal(
      page1Ids.includes(id),
      false,
      `Expected duplicate-free pagination; found ${id} on both pages`,
    );
  }

  assertNoDataLeakage(body1);
  assertNoDataLeakage(body2);
});

test("CC-02: Type, taxonomy (category, country, DJ), and genre filtering", async () => {
  // Filter by type=movie
  const movieRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles?type=movie",
  });
  assert.equal(movieRes.statusCode, 200);
  const movieBody = JSON.parse(movieRes.payload);
  assert.ok(movieBody.data.items.length >= 3);
  for (const item of movieBody.data.items) {
    assert.equal(item.contentType, "movie");
  }

  // Filter by type=series
  const seriesRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles?type=series",
  });
  assert.equal(seriesRes.statusCode, 200);
  const seriesBody = JSON.parse(seriesRes.payload);
  assert.ok(seriesBody.data.items.length >= 1);
  for (const item of seriesBody.data.items) {
    assert.equal(item.contentType, "series");
  }

  // Filter by categoryId (Historical Drama -> Nairobi Shadow)
  const catRes = await app.inject({
    method: "GET",
    url: `/api/v1/catalog/titles?categoryId=${categoryDramaId}`,
  });
  assert.equal(catRes.statusCode, 200);
  const catBody = JSON.parse(catRes.payload);
  assert.equal(catBody.data.items.length, 1);
  assert.equal(catBody.data.items[0].id, moviePublished2Id);

  // Filter by countryId (Kenya -> Nairobi Shadow)
  const countryRes = await app.inject({
    method: "GET",
    url: `/api/v1/catalog/titles?countryId=${countryKenyaId}`,
  });
  assert.equal(countryRes.statusCode, 200);
  const countryBody = JSON.parse(countryRes.payload);
  assert.equal(countryBody.data.items.length, 1);
  assert.equal(countryBody.data.items[0].id, moviePublished2Id);

  // Filter by djId (DJ Mack -> Nairobi Shadow)
  const djRes = await app.inject({
    method: "GET",
    url: `/api/v1/catalog/titles?djId=${djMackId}`,
  });
  assert.equal(djRes.statusCode, 200);
  const djBody = JSON.parse(djRes.payload);
  assert.equal(djBody.data.items.length, 1);
  assert.equal(djBody.data.items[0].id, moviePublished2Id);

  // Filter by genre slug ("action-thriller")
  const genreRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles?genre=action-thriller",
  });
  assert.equal(genreRes.statusCode, 200);
  const genreBody = JSON.parse(genreRes.payload);
  assert.ok(genreBody.data.items.length >= 2);
  for (const item of genreBody.data.items) {
    const slugs = item.categories.map((c: { slug: string }) => c.slug);
    assert.ok(slugs.includes("action-thriller"));
  }
});

test("CC-03: Strict exclusion of draft, in-review, unpublished, and archived content", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles?limit=50",
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  const ids = body.data.items.map((i: { id: string }) => i.id);

  assert.equal(
    ids.includes(movieDraftId),
    false,
    "Draft content leaked into public customer listing!",
  );
  assert.equal(
    ids.includes(movieArchivedId),
    false,
    "Archived content leaked into public customer listing!",
  );

  // Search also excludes draft and archived
  const searchRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/search?q=Rasimu",
  });
  assert.equal(searchRes.statusCode, 200);
  const searchBody = JSON.parse(searchRes.payload);
  assert.equal(
    searchBody.data.items.length,
    0,
    "Draft content leaked into search results!",
  );
});

test("CC-04: Movie detail by slug with available editions and approved metadata projections", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles/simba-wa-serengeti",
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, true);

  const movie = body.data;
  assert.equal(movie.id, moviePublished1Id);
  assert.equal(movie.slug, "simba-wa-serengeti");
  assert.equal(movie.title, "Simba wa Serengeti");
  assert.equal(movie.contentType, "movie");
  assert.equal(movie.backdropUrl, "https://cdn.giftedpro.test/b1.jpg");
  assert.equal(movie.posterUrl, "https://cdn.giftedpro.test/p1.jpg");

  // Editions check
  assert.ok(Array.isArray(movie.editions), "Expected editions array");
  assert.equal(movie.editions.length, 1);
  assert.equal(movie.editions[0].isDefault, true);
  assert.equal(movie.editions[0].dj.stageName, "DJ Afro");
  assert.equal(movie.editions[0].dj.slug, "dj-afro");

  // Assert absolute absence of private keys and transcode flags
  assertNoDataLeakage(body);
});

test("CC-05: Series detail by slug with active seasons and published available episodes", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles/mfalme-wa-giza",
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, true);

  const series = body.data;
  assert.equal(series.id, seriesPublished1Id);
  assert.equal(series.contentType, "series");

  // Seasons check
  assert.ok(Array.isArray(series.seasons));
  assert.equal(series.seasons.length, 1);
  assert.equal(series.seasons[0].seasonNumber, 1);

  // Episodes check
  const episodes = series.seasons[0].episodes;
  assert.ok(Array.isArray(episodes));
  // Only Episode 1 is published; Episode 2 is draft and MUST be excluded
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].episodeNumber, 1);
  assert.equal(episodes[0].title, "Mwanzo wa Vita");
  assert.equal(episodes[0].dj.stageName, "DJ Afro");

  assertNoDataLeakage(body);
});

test("CC-06: 404 Not Found for non-existent, draft, or archived slugs", async () => {
  // Non-existent slug
  const res1 = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles/slug-that-does-not-exist",
  });
  assert.equal(res1.statusCode, 404);
  const body1 = JSON.parse(res1.payload);
  assert.equal(body1.success, false);
  assert.equal(body1.error.code, "NOT_FOUND");

  // Draft slug
  const res2 = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles/rasimu-ya-siri",
  });
  assert.equal(res2.statusCode, 404);
  const body2 = JSON.parse(res2.payload);
  assert.equal(body2.success, false);
  assert.equal(body2.error.code, "NOT_FOUND");

  // Archived slug
  const res3 = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles/filamu-iliyopitwa",
  });
  assert.equal(res3.statusCode, 404);
  const body3 = JSON.parse(res3.payload);
  assert.equal(body3.success, false);
  assert.equal(body3.error.code, "NOT_FOUND");
});

test("CC-07: Public taxonomies endpoint returns only active items", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/taxonomies",
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, true);

  const { categories, countries, voiceArtists } = body.data;

  // Active categories present, inactive omitted
  const catSlugs = categories.map((c: { slug: string }) => c.slug);
  assert.ok(catSlugs.includes("action-thriller"));
  assert.ok(catSlugs.includes("historical-drama"));
  assert.equal(
    catSlugs.includes("secret-inactive"),
    false,
    "Inactive category leaked into public taxonomies!",
  );

  // Active countries present, inactive omitted
  const countryCodes = countries.map((c: { code: string }) => c.code);
  assert.ok(countryCodes.includes("TZ"));
  assert.ok(countryCodes.includes("KE"));
  assert.equal(
    countryCodes.includes("AT"),
    false,
    "Inactive country leaked into public taxonomies!",
  );

  // Active DJs present, inactive omitted
  const djSlugs = voiceArtists.map((d: { slug: string }) => d.slug);
  assert.ok(djSlugs.includes("dj-afro"));
  assert.ok(djSlugs.includes("dj-mack"));
  assert.equal(
    djSlugs.includes("dj-retired"),
    false,
    "Inactive DJ voice artist leaked into public taxonomies!",
  );

  assertNoDataLeakage(body);
});

test("CC-08: Full-text search (ADR-013) finds relevant published content and ranks properly", async () => {
  // Search for "Serengeti"
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/search?q=Serengeti",
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, true);
  assert.ok(body.data.items.length >= 1);
  assert.equal(body.data.items[0].id, moviePublished1Id);
  assert.equal(body.data.items[0].slug, "simba-wa-serengeti");

  // Search for "Nairobi crime"
  const res2 = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/search?q=Nairobi+crime",
  });
  assert.equal(res2.statusCode, 200);
  const body2 = JSON.parse(res2.payload);
  assert.equal(body2.success, true);
  assert.ok(body2.data.items.length >= 1);
  assert.equal(body2.data.items[0].id, moviePublished2Id);

  // Search with no matches returns empty list
  const res3 = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/search?q=NonExistentTermXYZ999",
  });
  assert.equal(res3.statusCode, 200);
  const body3 = JSON.parse(res3.payload);
  assert.equal(body3.data.items.length, 0);
  assert.equal(body3.data.nextCursor, null);

  assertNoDataLeakage(body);
});

test("CC-09: Input validation, malformed cursor handling, and SQL injection safety", async () => {
  // Malformed cursor
  const badCursorRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles?cursor=not-valid-base64-json!!!",
  });
  assert.equal(badCursorRes.statusCode, 400);
  const badCursorBody = JSON.parse(badCursorRes.payload);
  assert.equal(badCursorBody.success, false);
  assert.equal(badCursorBody.error.code, "INVALID_CURSOR");

  // SQL injection string in q
  const sqliSearchRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/search?q=%27%20OR%201=1%20--",
  });
  assert.equal(sqliSearchRes.statusCode, 200);
  const sqliBody = JSON.parse(sqliSearchRes.payload);
  assert.equal(sqliBody.success, true);

  // SQL injection string in genre filter
  const sqliGenreRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles?genre=%27%20OR%20%271%27=%271",
  });
  assert.equal(sqliGenreRes.statusCode, 200);
  const sqliGenreBody = JSON.parse(sqliGenreRes.payload);
  assert.equal(sqliGenreBody.success, true);
  assert.equal(sqliGenreBody.data.items.length, 0);

  // Empty query parameter on search returns validation error
  const emptySearchRes = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/search?q=",
  });
  assert.equal(emptySearchRes.statusCode, 400);
});

test("CC-10: Rate limiting compliance and comprehensive data-leakage absence assertions", async () => {
  // Test rate limiting on catalog route:
  // Environment test limit is set; we test that the rate-limiter headers are present
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/catalog/titles",
  });
  assert.equal(res.statusCode, 200);
  assert.ok(res.headers["x-ratelimit-limit"], "Expected X-RateLimit-Limit header");
  assert.ok(res.headers["x-ratelimit-remaining"], "Expected X-RateLimit-Remaining header");

  // Exhaustive security assertion: Fetch all catalog endpoints and verify zero private field leakage
  const endpoints = [
    "/api/v1/catalog/titles",
    "/api/v1/catalog/titles/simba-wa-serengeti",
    "/api/v1/catalog/titles/mfalme-wa-giza",
    "/api/v1/catalog/taxonomies",
    "/api/v1/catalog/search?q=Serengeti",
  ];

  for (const endpoint of endpoints) {
    const r = await app.inject({ method: "GET", url: endpoint });
    assert.equal(r.statusCode, 200, `Expected 200 for ${endpoint}`);
    const rawPayload = r.payload;

    for (const forbidden of PRIVATE_PROPERTIES) {
      assert.equal(
        rawPayload.includes(`"${forbidden}"`),
        false,
        `Forbidden property "${forbidden}" detected in response for ${endpoint}!`,
      );
    }
  }
});
