import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { generateSecureToken, hashToken } from "../src/modules/identity/utils/token.utils.js";
import { AuditService } from "../src/modules/audit/audit.service.js";
import { CommercialService } from "../src/modules/commercial/commercial.service.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

async function makeSessionCookie(pool: pg.Pool, userId: string): Promise<string> {
  const rawToken = generateSecureToken();
  const hash = hashToken(rawToken);
  await pool.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_active_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 day', NOW(), NOW())`,
    [randomUUID(), userId, hash],
  );
  return `gifted_session=${rawToken}`;
}

test("Commercial runtime verification suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const adminId = randomUUID();
  const customerId = randomUUID();
  const mediaTeamId = randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, status, email_verified_at)
     VALUES ($1, $2, $3, 'admin', 'active', NOW()),
            ($4, $5, $6, 'customer', 'active', NOW()),
            ($7, $8, $9, 'media_team', 'active', NOW())
     ON CONFLICT DO NOTHING`,
    [
      adminId,
      `admin-commercial-${adminId.slice(0, 8)}@giftedpro.test`,
      "hash",
      customerId,
      `customer-commercial-${customerId.slice(0, 8)}@giftedpro.test`,
      "hash",
      mediaTeamId,
      `media-commercial-${mediaTeamId.slice(0, 8)}@giftedpro.test`,
      "hash",
    ],
  );

  const categoryId = randomUUID();
  const secondCategoryId = randomUUID();
  const movieId = randomUUID();
  const seriesId = randomUUID();
  const seasonId = randomUUID();
  const episodeId = randomUUID();

  await pool.query(
    `INSERT INTO categories (id, name, slug, is_active, display_order)
     VALUES ($1, $2, $3, true, 1), ($4, $5, $6, true, 2)
     ON CONFLICT DO NOTHING`,
    [
      categoryId,
      `Commercial Cat ${randomUUID().slice(0, 6)}`,
      `commercial-cat-${randomUUID().slice(0, 8)}`,
      secondCategoryId,
      `Commercial Cat 2 ${randomUUID().slice(0, 6)}`,
      `commercial-cat-2-${randomUUID().slice(0, 8)}`,
    ],
  );

  await pool.query(
    `INSERT INTO content (id, code_id, content_type, title, slug, description, poster_url, backdrop_url, trailer_url, status, created_by)
     VALUES ($1, $2, 'movie', $3, $4, 'movie description', 'https://example.test/poster.jpg', 'https://example.test/backdrop.jpg', 'https://example.test/trailer.mp4', 'published', $5),
            ($6, $7, 'series', $8, $9, 'series description', 'https://example.test/series-poster.jpg', 'https://example.test/series-backdrop.jpg', 'https://example.test/series-trailer.mp4', 'published', $10)
     ON CONFLICT DO NOTHING`,
    [
      movieId,
      `mov-${randomUUID().slice(0, 8)}`,
      `Commercial Movie ${randomUUID().slice(0, 6)}`,
      `commercial-movie-${randomUUID().slice(0, 8)}`,
      adminId,
      seriesId,
      `ser-${randomUUID().slice(0, 8)}`,
      `Commercial Series ${randomUUID().slice(0, 6)}`,
      `commercial-series-${randomUUID().slice(0, 8)}`,
      adminId,
    ],
  );

  await pool.query(
    `INSERT INTO seasons (id, series_id, season_number, title, is_active)
     VALUES ($1, $2, 1, 'Season One', true)
     ON CONFLICT DO NOTHING`,
    [seasonId, seriesId],
  );

  await pool.query(
    `INSERT INTO episodes (id, season_id, episode_number, title, status, is_available)
     VALUES ($1, $2, 1, 'Episode One', 'published', true)
     ON CONFLICT DO NOTHING`,
    [episodeId, seasonId],
  );

  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;

  try {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ disableRequestLogging: true }),
    );

    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(fastifyCookie);
    configureHttpApplication(app);
    app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
    await app.init();
  } catch (error) {
    console.error("Failed to initialize commercial test app", error);
    throw error;
  }

  const adminCookie = await makeSessionCookie(pool, adminId);
  const customerCookie = await makeSessionCookie(pool, customerId);
  const mediaCookie = await makeSessionCookie(pool, mediaTeamId);

  async function injectRequest(options: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    url: string;
    payload?: Record<string, unknown>;
    cookie?: string;
  }) {
    const headers: Record<string, string> = {};
    if (options.cookie) {
      headers.cookie = options.cookie;
    }
    if (options.payload !== undefined) {
      headers["content-type"] = "application/json";
    }

    const response = await app.inject({
      method: options.method,
      url: options.url,
      headers,
      payload: options.payload !== undefined ? JSON.stringify(options.payload) : undefined,
    });

    try {
      const body = JSON.parse(response.body);
      return { statusCode: response.statusCode, body };
    } catch {
      return { statusCode: response.statusCode, body: response.body };
    }
  }

  t.after(async () => {
    await app?.close();
    await moduleFixture?.close();
    await pool.end();
  });

  await t.test("F-501: access plans can be created and invalid/duplicate values are rejected", async () => {
    const createRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-ALPHA", name: "Alpha Access Plan" },
    });

    assert.equal(createRes.statusCode, 201);
    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.data.code, "PLAN-ALPHA");

    const duplicateRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-ALPHA", name: "Duplicate Plan" },
    });
    assert.equal(duplicateRes.statusCode, 409);
    assert.equal(duplicateRes.body.error.code, "ACCESS_PLAN_CODE_ALREADY_EXISTS");

    const invalidCodeRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "bad code", name: "Bad Code Plan" },
    });
    assert.equal(invalidCodeRes.statusCode, 400);

    const invalidNameRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-BETA", name: "" },
    });
    assert.equal(invalidNameRes.statusCode, 400);

    const customerRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: customerCookie,
      payload: { code: "PLAN-CUST", name: "Customer Plan" },
    });
    assert.equal(customerRes.statusCode, 403);

    const mediaRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: mediaCookie,
      payload: { code: "PLAN-STAFF", name: "Staff Plan" },
    });
    assert.equal(mediaRes.statusCode, 403);

    const unauthenticatedRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      payload: { code: "PLAN-NOAUTH", name: "Noauth Plan" },
    });
    assert.equal(unauthenticatedRes.statusCode, 401);
  });

  await t.test("F-501: plan versions validate positive and negative rules and remain immutable", async () => {
    const planRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-VERSIONS", name: "Plan Versions" },
    });
    const planId = planRes.body.data.id;

    const validRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: {
        accessPlanId: planId,
        versionNumber: 1,
        durationValue: 12,
        durationUnit: "HOUR",
        downloadLimit: 3,
        downloadLimitType: "UNIQUE_TITLES",
        deviceLimit: 2,
        concurrentStreamLimit: 2,
      },
    });
    assert.equal(validRes.statusCode, 201);
    assert.equal(validRes.body.data.durationUnit, "HOUR");

    const dayRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: {
        accessPlanId: planId,
        versionNumber: 2,
        durationValue: 30,
        durationUnit: "DAY",
        concurrentStreamLimit: 3,
      },
    });
    assert.equal(dayRes.statusCode, 201);

    const invalidDurationRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: {
        accessPlanId: planId,
        versionNumber: 3,
        durationValue: 0,
        durationUnit: "DAY",
      },
    });
    assert.equal(invalidDurationRes.statusCode, 400);

    const invalidVersionNumberRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: {
        accessPlanId: planId,
        versionNumber: 0,
        durationValue: 7,
        durationUnit: "DAY",
      },
    });
    assert.equal(invalidVersionNumberRes.statusCode, 400);

    const badAccessPlanRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: {
        accessPlanId: randomUUID(),
        versionNumber: 4,
        durationValue: 7,
        durationUnit: "DAY",
      },
    });
    assert.equal(badAccessPlanRes.statusCode, 404);

    const patchRes = await injectRequest({
      method: "PATCH",
      url: `/api/v1/admin/commercial/plan-versions/${validRes.body.data.id}`,
      cookie: adminCookie,
      payload: { durationValue: 99 },
    });
    assert.equal(patchRes.statusCode, 404);

    const deleteRes = await injectRequest({
      method: "DELETE",
      url: `/api/v1/admin/commercial/plan-versions/${validRes.body.data.id}`,
      cookie: adminCookie,
    });
    assert.equal(deleteRes.statusCode, 404);
  });

  await t.test("F-501/F-504/F-505: offers support valid targets and reject invalid target matrix, lifecycle, and money", async () => {
    const planBase = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-OFFERS", name: "Offers Plan" },
    });
    const planVersionBase = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: {
        accessPlanId: planBase.body.data.id,
        versionNumber: 1,
        durationValue: 7,
        durationUnit: "DAY",
        concurrentStreamLimit: 2,
      },
    });

    const validOfferCases = [
      { targetKind: "MOVIE", targetMovieContentId: movieId, code: "OFF-MOVIE-1" },
      { targetKind: "SERIES", targetSeriesContentId: seriesId, code: "OFF-SERIES-1" },
      { targetKind: "SEASON", targetSeasonId: seasonId, code: "OFF-SEASON-1" },
      { targetKind: "EPISODE", targetEpisodeId: episodeId, code: "OFF-EPISODE-1" },
      { targetKind: "CATALOG", code: "OFF-CATALOG-1", catalogPolicyType: "ALL_CATALOG" },
    ];

    for (const offerCase of validOfferCases) {
      const res = await injectRequest({
        method: "POST",
        url: "/api/v1/admin/commercial/offers",
        cookie: adminCookie,
        payload: {
          code: offerCase.code,
          name: `${offerCase.targetKind} offer`,
          status: "draft",
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt: "2026-01-31T00:00:00.000Z",
          targetKind: offerCase.targetKind,
          targetMovieContentId: offerCase.targetMovieContentId ?? null,
          targetSeriesContentId: offerCase.targetSeriesContentId ?? null,
          targetSeasonId: offerCase.targetSeasonId ?? null,
          targetEpisodeId: offerCase.targetEpisodeId ?? null,
          planVersionId: planVersionBase.body.data.id,
          priceTzs: 2000,
          catalogPolicyType: offerCase.catalogPolicyType ?? null,
        },
      });
      assert.equal(res.statusCode, 201, `${offerCase.targetKind} should create successfully`);
    }

    const invalidTargetRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-BAD-TARGET",
        name: "Bad target offer",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "MOVIE",
        targetSeriesContentId: seriesId,
        targetMovieContentId: movieId,
        planVersionId: planVersionBase.body.data.id,
        priceTzs: 1000,
      },
    });
    assert.equal(invalidTargetRes.statusCode, 422);

    const missingTargetRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-MISSING-TARGET",
        name: "Missing target offer",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "MOVIE",
        planVersionId: planVersionBase.body.data.id,
        priceTzs: 1000,
      },
    });
    assert.equal(missingTargetRes.statusCode, 422);

    const zeroMoneyRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-ZERO-MONEY",
        name: "Zero money offer",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "MOVIE",
        targetMovieContentId: movieId,
        planVersionId: planVersionBase.body.data.id,
        priceTzs: 0,
      },
    });
    assert.equal(zeroMoneyRes.statusCode, 201);

    const rejectedMoneyPayloads: Array<[string, unknown]> = [
      ["negative", -1],
      ["decimal", 1.5],
      ["string numeric", "1500"],
      ["string decimal", "1.5"],
      ["string non-numeric", "abc"],
      ["boolean", true],
      ["null", null],
      ["nan", NaN],
      ["infinity", Infinity],
    ];

    for (const [label, invalidPrice] of rejectedMoneyPayloads) {
      const rejectedRes = await injectRequest({
        method: "POST",
        url: "/api/v1/admin/commercial/offers",
        cookie: adminCookie,
        payload: {
          code: `OFF-REJ-${label.replace(/\s+/g, "-").toUpperCase()}`,
          name: `Invalid money ${label}`,
          status: "draft",
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt: "2026-01-31T00:00:00.000Z",
          targetKind: "MOVIE",
          targetMovieContentId: movieId,
          planVersionId: planVersionBase.body.data.id,
          priceTzs: invalidPrice as number,
        },
      });
      assert.equal(rejectedRes.statusCode, 400, `priceTzs with ${label} must be rejected with 400`);
    }
  });

  await t.test("F-503 / F-506: catalog policy validation rejects missing members and malformed UUID array values", async () => {
    const planRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-CATALOG", name: "Catalog Plan" },
    });
    const planVersionRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: { accessPlanId: planRes.body.data.id, versionNumber: 1, durationValue: 14, durationUnit: "DAY", concurrentStreamLimit: 2 },
    });

    const missingCategoryRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-MISSING-CAT",
        name: "Missing category",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "CATALOG",
        planVersionId: planVersionRes.body.data.id,
        priceTzs: 1500,
        catalogPolicyType: "CATEGORY_SET",
        categoryIds: [randomUUID()],
      },
    });
    assert.equal(missingCategoryRes.statusCode, 422);

    const missingContentRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-MISSING-CONTENT",
        name: "Missing content",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "CATALOG",
        planVersionId: planVersionRes.body.data.id,
        priceTzs: 1500,
        catalogPolicyType: "CONTENT_SET",
        contentIds: [randomUUID()],
      },
    });
    assert.equal(missingContentRes.statusCode, 422);

    const validCatalogRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-CAT-VALID",
        name: "Valid category catalog",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "CATALOG",
        planVersionId: planVersionRes.body.data.id,
        priceTzs: 1500,
        catalogPolicyType: "CATEGORY_SET",
        categoryIds: [categoryId],
      },
    });
    assert.equal(validCatalogRes.statusCode, 201);

    const malformedCategoryElements = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-BAD-ARRAY-CAT",
        name: "Bad category array",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "CATALOG",
        planVersionId: planVersionRes.body.data.id,
        priceTzs: 1500,
        catalogPolicyType: "CATEGORY_SET",
        categoryIds: ["not-a-uuid"],
      },
    });
    assert.equal(malformedCategoryElements.statusCode, 400);

    const malformedContentElements = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-BAD-ARRAY-CONTENT",
        name: "Bad content array",
        status: "draft",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-01-31T00:00:00.000Z",
        targetKind: "CATALOG",
        planVersionId: planVersionRes.body.data.id,
        priceTzs: 1500,
        catalogPolicyType: "CONTENT_SET",
        contentIds: ["not-a-uuid"],
      },
    });
    assert.equal(malformedContentElements.statusCode, 400);
  });

  await t.test("F-502: fail-closed audit rollback persists DB state only when audit succeeds", async () => {
    const planRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-AUDIT", name: "Audit Plan" },
    });
    const versionRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: { accessPlanId: planRes.body.data.id, versionNumber: 1, durationValue: 5, durationUnit: "HOUR", concurrentStreamLimit: 2 },
    });
    const offerRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-AUDIT-OK",
        name: "Offer audit success",
        status: "draft",
        startsAt: "2026-02-01T00:00:00.000Z",
        endsAt: "2026-02-15T00:00:00.000Z",
        targetKind: "MOVIE",
        targetMovieContentId: movieId,
        planVersionId: versionRes.body.data.id,
        priceTzs: 1000,
      },
    });

    const successPatch = await injectRequest({
      method: "PATCH",
      url: `/api/v1/admin/commercial/offers/${offerRes.body.data.id}/status`,
      cookie: adminCookie,
      payload: { status: "active" },
    });
    assert.equal(successPatch.statusCode, 200);
    assert.equal(successPatch.body.data.status, "active");

    const auditCount = await pool.query(
      `SELECT COUNT(*)::int AS count FROM audit_events WHERE action = 'OFFER_STATUS_UPDATE' AND resource_id = $1`,
      [offerRes.body.data.id],
    );
    assert.ok(auditCount.rows[0].count >= 1);

    const module = await moduleFixture.get(CommercialService);
    const auditService = moduleFixture.get(AuditService);
    const originalRecordEvent = auditService.recordEvent.bind(auditService);
    const persistedOffer = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-AUDIT-FAIL",
        name: "Offer audit fail",
        status: "draft",
        startsAt: "2026-03-01T00:00:00.000Z",
        endsAt: "2026-03-15T00:00:00.000Z",
        targetKind: "MOVIE",
        targetMovieContentId: movieId,
        planVersionId: versionRes.body.data.id,
        priceTzs: 500,
      },
    });
    const failOfferId = persistedOffer.body.data.id;

    auditService.recordEvent = async () => {
      throw new Error("forced audit failure");
    };

    const beforeState = await pool.query(
      `SELECT status FROM offers WHERE id = $1`,
      [failOfferId],
    );
    assert.equal(beforeState.rows[0].status, "draft");

    const failureRes = await module.updateOfferStatus(failOfferId, { status: "active" }, adminId).catch((error) => error);
    assert.ok(failureRes instanceof Error);

    const afterState = await pool.query(
      `SELECT status FROM offers WHERE id = $1`,
      [failOfferId],
    );
    assert.equal(afterState.rows[0].status, "draft");

    const afterAuditCount = await pool.query(
      `SELECT COUNT(*)::int AS count FROM audit_events WHERE action = 'OFFER_STATUS_UPDATE' AND resource_id = $1`,
      [failOfferId],
    );
    assert.equal(afterAuditCount.rows[0].count, 0);

    auditService.recordEvent = originalRecordEvent;
  });

  await t.test("F-505: lifecycle transitions are validated and archived remains terminal", async () => {
    const planRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: { code: "PLAN-LIFECYCLE", name: "Lifecycle Plan" },
    });
    const versionRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/plan-versions",
      cookie: adminCookie,
      payload: { accessPlanId: planRes.body.data.id, versionNumber: 1, durationValue: 10, durationUnit: "DAY", concurrentStreamLimit: 2 },
    });

    const createOffer = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-LIFECYCLE",
        name: "Lifecycle Offer",
        status: "draft",
        startsAt: "2026-04-01T00:00:00.000Z",
        endsAt: "2026-04-20T00:00:00.000Z",
        targetKind: "MOVIE",
        targetMovieContentId: movieId,
        planVersionId: versionRes.body.data.id,
        priceTzs: 700,
      },
    });

    const acceptedTransitions = ["active", "inactive", "archived"];
    for (const nextStatus of acceptedTransitions) {
      const res = await injectRequest({
        method: "PATCH",
        url: `/api/v1/admin/commercial/offers/${createOffer.body.data.id}/status`,
        cookie: adminCookie,
        payload: { status: nextStatus },
      });
      assert.equal(res.statusCode, 200, `${nextStatus} should be accepted from draft`);
    }

    const archivedOffer = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: adminCookie,
      payload: {
        code: "OFF-ARCHIVED-TERM",
        name: "Archived terminal",
        status: "draft",
        startsAt: "2026-05-01T00:00:00.000Z",
        endsAt: "2026-05-20T00:00:00.000Z",
        targetKind: "MOVIE",
        targetMovieContentId: movieId,
        planVersionId: versionRes.body.data.id,
        priceTzs: 500,
      },
    });

    const archiveRes = await injectRequest({
      method: "PATCH",
      url: `/api/v1/admin/commercial/offers/${archivedOffer.body.data.id}/status`,
      cookie: adminCookie,
      payload: { status: "archived" },
    });
    assert.equal(archiveRes.statusCode, 200);

    const terminalRes = await injectRequest({
      method: "PATCH",
      url: `/api/v1/admin/commercial/offers/${archivedOffer.body.data.id}/status`,
      cookie: adminCookie,
      payload: { status: "active" },
    });
    assert.equal(terminalRes.statusCode, 400);
  });

  await t.test("F-501/F-506: mass-assignment and IDOR payloads are rejected", async () => {
    const planRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/access-plans",
      cookie: adminCookie,
      payload: {
        code: "PLAN-IDOR",
        name: "IDOR Plan",
        createdBy: customerId,
        isAdmin: true,
        internalField: "attack",
      },
    });
    assert.equal(planRes.statusCode, 400);

    const badRoleRes = await injectRequest({
      method: "POST",
      url: "/api/v1/admin/commercial/offers",
      cookie: customerCookie,
      payload: {
        code: "OFF-CUST-REJECT",
        name: "Customer rejected",
        status: "draft",
        startsAt: "2026-07-01T00:00:00.000Z",
        endsAt: "2026-07-10T00:00:00.000Z",
        targetKind: "MOVIE",
        targetMovieContentId: movieId,
        planVersionId: (await injectRequest({
          method: "POST",
          url: "/api/v1/admin/commercial/access-plans",
          cookie: adminCookie,
          payload: { code: "PLAN-SEG", name: "Seg" },
        })).body.data.id,
        priceTzs: 100,
      },
    });
    assert.equal(badRoleRes.statusCode, 403);
  });
});
