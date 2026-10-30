import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import { ContentNotFoundException } from "../catalog.errors.js";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import type {
  GetCatalogTitlesQueryDto,
  SearchCatalogQueryDto,
} from "../dto/customer-catalog.dto.js";

export interface CustomerCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface CustomerCountry {
  id: string;
  code: string;
  name: string;
  flagEmoji: string | null;
}

export interface CustomerVoiceArtist {
  id: string;
  name: string;
  stageName: string;
  slug: string;
  avatarUrl: string | null;
  bio?: string | null;
  colorHex?: string | null;
}

export interface CustomerTitleCard {
  id: string;
  codeId: string;
  contentType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  slug: string;
  releaseYear: number | null;
  description: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  durationMinutes: number | null;
  publishedAt: string;
  categories: CustomerCategory[];
  countries: CustomerCountry[];
}

export interface CustomerMovieEdition {
  id: string;
  isDefault: boolean;
  dj: CustomerVoiceArtist;
}

export interface CustomerEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  durationMinutes: number | null;
  description: string | null;
  thumbnailUrl: string | null;
  dj: { id: string; stageName: string } | null;
}

export interface CustomerSeason {
  id: string;
  seasonNumber: number;
  title: string | null;
  episodes: CustomerEpisode[];
}

export interface CustomerMovieDetail extends CustomerTitleCard {
  editions: CustomerMovieEdition[];
}

export interface CustomerSeriesDetail extends CustomerTitleCard {
  seasons: CustomerSeason[];
}

export interface PublicTaxonomiesResponse {
  categories: CustomerCategory[];
  countries: CustomerCountry[];
  voiceArtists: CustomerVoiceArtist[];
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

interface DecodedCursor {
  publishedAt: Date;
  id: string;
}

interface ContentDbRow extends Record<string, unknown> {
  id: string;
  code_id: string;
  content_type: "movie" | "series";
  title: string;
  original_title: string | null;
  slug: string;
  release_year: number | null;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  duration_minutes: number | null;
  published_at: string;
}

interface ContentSearchDbRow extends ContentDbRow {
  rank: number;
}

interface MovieEditionDbRow extends Record<string, unknown> {
  id: string;
  is_default: boolean;
  dj_id: string;
  dj_name: string;
  dj_stage_name: string;
  dj_slug: string;
  dj_avatar_url: string | null;
  dj_bio: string | null;
  dj_color_hex: string | null;
}

interface SeasonDbRow extends Record<string, unknown> {
  id: string;
  season_number: number;
  title: string | null;
}

interface EpisodeDbRow extends Record<string, unknown> {
  id: string;
  season_id: string;
  episode_number: number;
  title: string;
  duration_minutes: number | null;
  description: string | null;
  thumbnail_url: string | null;
  dj_id: string | null;
  dj_stage_name: string | null;
}

interface CategoryDbRow extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface CountryDbRow extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
}

interface VoiceArtistDbRow extends Record<string, unknown> {
  id: string;
  name: string;
  stage_name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
  color_hex: string | null;
}

interface ContentCategoryJoinRow extends Record<string, unknown> {
  content_id: string;
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface ContentCountryJoinRow extends Record<string, unknown> {
  content_id: string;
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeCursor(publishedAt: Date | string, id: string): string {
  const iso =
    typeof publishedAt === "string"
      ? new Date(publishedAt).toISOString()
      : publishedAt.toISOString();
  return Buffer.from(JSON.stringify({ publishedAt: iso, id })).toString(
    "base64url",
  );
}

function decodeCursor(cursor: string): DecodedCursor {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid cursor format");
    }
    if (
      typeof parsed.publishedAt !== "string" ||
      isNaN(Date.parse(parsed.publishedAt))
    ) {
      throw new Error("Invalid publishedAt in cursor");
    }
    if (typeof parsed.id !== "string" || !UUID_V4_REGEX.test(parsed.id)) {
      throw new Error("Invalid id in cursor");
    }
    return {
      publishedAt: new Date(parsed.publishedAt),
      id: parsed.id.toLowerCase(),
    };
  } catch {
    throw new BadRequestException({
      code: "INVALID_CURSOR",
      message: "The provided pagination cursor is invalid or malformed.",
    });
  }
}

@Injectable()
export class CustomerCatalogService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
  ) {}

  /**
   * Browse published titles with keyset pagination and filters.
   * Ordering: (published_at DESC, id DESC).
   */
  async listTitles(
    query: GetCatalogTitlesQueryDto,
  ): Promise<PaginatedResult<CustomerTitleCard>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;

    // Build filter expressions
    const whereConditions = [
      sql`c.status = 'published'`,
      sql`c.published_at IS NOT NULL`,
    ];

    if (decodedCursor) {
      const iso = decodedCursor.publishedAt.toISOString();
      whereConditions.push(
        sql`(c.published_at < ${iso}::timestamptz OR (c.published_at = ${iso}::timestamptz AND c.id < ${decodedCursor.id}::uuid))`,
      );
    }

    if (query.type) {
      whereConditions.push(sql`c.content_type = ${query.type}::content_type`);
    }

    if (query.categoryId) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM content_categories cc
          WHERE cc.content_id = c.id AND cc.category_id = ${query.categoryId}::uuid
        )`,
      );
    }

    if (query.countryId) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM content_countries ccount
          WHERE ccount.content_id = c.id AND ccount.country_id = ${query.countryId}::uuid
        )`,
      );
    }

    if (query.djId) {
      whereConditions.push(
        sql`(
          EXISTS (
            SELECT 1 FROM movie_editions me
            WHERE me.movie_id = c.id
              AND me.dj_id = ${query.djId}::uuid
              AND me.is_available = true
          )
          OR EXISTS (
            SELECT 1 FROM series_metadata sm
            WHERE sm.content_id = c.id
              AND sm.lead_dj_id = ${query.djId}::uuid
          )
          OR EXISTS (
            SELECT 1 FROM episodes ep
            JOIN seasons s ON ep.season_id = s.id
            WHERE s.series_id = c.id
              AND ep.dj_id = ${query.djId}::uuid
              AND ep.is_available = true
              AND ep.status = 'published'
          )
        )`,
      );
    }

    if (query.genre) {
      const normalizedGenre = query.genre.trim();
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM content_categories cc
          JOIN categories cat ON cc.category_id = cat.id
          WHERE cc.content_id = c.id
            AND cat.is_active = true
            AND (lower(cat.slug) = lower(${normalizedGenre}) OR cat.name ILIKE ${normalizedGenre})
        )`,
      );
    }

    const whereClause = sql.join(whereConditions, sql` AND `);

    const rowsResult = await this.db.execute<ContentDbRow>(
      sql`
        SELECT
          c.id,
          c.code_id,
          c.content_type,
          c.title,
          c.original_title,
          c.slug,
          c.release_year,
          c.description,
          c.poster_url,
          c.backdrop_url,
          c.trailer_url,
          c.duration_minutes,
          c.published_at
        FROM content c
        WHERE ${whereClause}
        ORDER BY c.published_at DESC, c.id DESC
        LIMIT ${limit + 1}
      `,
    );

    const rawRows: ContentDbRow[] = rowsResult.rows ?? [];
    const hasMore = rawRows.length > limit;
    const itemsRows = hasMore ? rawRows.slice(0, limit) : rawRows;

    if (itemsRows.length === 0) {
      return { items: [], nextCursor: null };
    }

    const contentIds = itemsRows.map((r) => r.id);
    const { categoriesByContent, countriesByContent } =
      await this.batchFetchTaxonomies(contentIds);

    const items: CustomerTitleCard[] = itemsRows.map((row) => ({
      id: row.id,
      codeId: row.code_id,
      contentType: row.content_type,
      title: row.title,
      originalTitle: row.original_title,
      slug: row.slug,
      releaseYear: row.release_year,
      description: row.description,
      posterUrl: row.poster_url,
      backdropUrl: row.backdrop_url,
      trailerUrl: row.trailer_url,
      durationMinutes: row.duration_minutes,
      publishedAt: new Date(row.published_at).toISOString(),
      categories: categoriesByContent.get(row.id) ?? [],
      countries: countriesByContent.get(row.id) ?? [],
    }));

    const lastItem = itemsRows[itemsRows.length - 1];
    const nextCursor = hasMore
      ? encodeCursor(lastItem.published_at, lastItem.id)
      : null;

    return { items, nextCursor };
  }

  /**
   * Detail view by slug.
   * Movies return available editions and DJ information.
   * Series return active seasons and published available episodes.
   * Throws ContentNotFoundException (404) if content is not found or not published.
   */
  async getTitleBySlug(
    slug: string,
  ): Promise<CustomerMovieDetail | CustomerSeriesDetail> {
    const normalizedSlug = slug.trim().toLowerCase();

    const result = await this.db.execute<ContentDbRow>(
      sql`
        SELECT
          c.id,
          c.code_id,
          c.content_type,
          c.title,
          c.original_title,
          c.slug,
          c.release_year,
          c.description,
          c.poster_url,
          c.backdrop_url,
          c.trailer_url,
          c.duration_minutes,
          c.published_at
        FROM content c
        WHERE lower(c.slug) = ${normalizedSlug}
          AND c.status = 'published'
          AND c.published_at IS NOT NULL
        LIMIT 1
      `,
    );

    const rows: ContentDbRow[] = result.rows ?? [];
    const content = rows[0];

    if (!content) {
      throw new ContentNotFoundException(
        "The requested catalog item was not found.",
      );
    }

    const { categoriesByContent, countriesByContent } =
      await this.batchFetchTaxonomies([content.id]);

    const baseCard: CustomerTitleCard = {
      id: content.id,
      codeId: content.code_id,
      contentType: content.content_type,
      title: content.title,
      originalTitle: content.original_title,
      slug: content.slug,
      releaseYear: content.release_year,
      description: content.description,
      posterUrl: content.poster_url,
      backdropUrl: content.backdrop_url,
      trailerUrl: content.trailer_url,
      durationMinutes: content.duration_minutes,
      publishedAt: new Date(content.published_at).toISOString(),
      categories: categoriesByContent.get(content.id) ?? [],
      countries: countriesByContent.get(content.id) ?? [],
    };

    if (content.content_type === "movie") {
      const editionsResult = await this.db.execute<MovieEditionDbRow>(
        sql`
          SELECT
            me.id,
            me.is_default,
            dj.id AS dj_id,
            dj.name AS dj_name,
            dj.stage_name AS dj_stage_name,
            dj.slug AS dj_slug,
            dj.avatar_url AS dj_avatar_url,
            dj.bio AS dj_bio,
            dj.color_hex AS dj_color_hex
          FROM movie_editions me
          JOIN dj_voice_artists dj ON me.dj_id = dj.id
          WHERE me.movie_id = ${content.id}::uuid
            AND me.is_available = true
            AND dj.is_active = true
          ORDER BY me.is_default DESC, dj.stage_name ASC
        `,
      );

      const editionRows: MovieEditionDbRow[] = editionsResult.rows ?? [];

      const editions: CustomerMovieEdition[] = editionRows.map((e) => ({
        id: e.id,
        isDefault: e.is_default,
        dj: {
          id: e.dj_id,
          name: e.dj_name,
          stageName: e.dj_stage_name,
          slug: e.dj_slug,
          avatarUrl: e.dj_avatar_url,
          bio: e.dj_bio,
          colorHex: e.dj_color_hex,
        },
      }));

      return {
        ...baseCard,
        editions,
      };
    }

    // Series detail
    const seasonsResult = await this.db.execute<SeasonDbRow>(
      sql`
        SELECT s.id, s.season_number, s.title
        FROM seasons s
        WHERE s.series_id = ${content.id}::uuid
          AND s.is_active = true
        ORDER BY s.season_number ASC
      `,
    );

    const seasonRows: SeasonDbRow[] = seasonsResult.rows ?? [];

    if (seasonRows.length === 0) {
      return {
        ...baseCard,
        seasons: [],
      };
    }

    const seasonIds = seasonRows.map((s) => s.id);
    const episodesResult = await this.db.execute<EpisodeDbRow>(
      sql`
        SELECT
          ep.id,
          ep.season_id,
          ep.episode_number,
          ep.title,
          ep.duration_minutes,
          ep.description,
          ep.thumbnail_url,
          dj.id AS dj_id,
          dj.stage_name AS dj_stage_name
        FROM episodes ep
        LEFT JOIN dj_voice_artists dj ON ep.dj_id = dj.id AND dj.is_active = true
        WHERE ep.season_id IN (${sql.join(
          seasonIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})
          AND ep.status = 'published'
          AND ep.is_available = true
        ORDER BY ep.episode_number ASC
      `,
    );

    const episodeRows: EpisodeDbRow[] = episodesResult.rows ?? [];

    const episodesBySeason = new Map<string, CustomerEpisode[]>();
    for (const ep of episodeRows) {
      const list = episodesBySeason.get(ep.season_id) ?? [];
      list.push({
        id: ep.id,
        episodeNumber: ep.episode_number,
        title: ep.title,
        durationMinutes: ep.duration_minutes,
        description: ep.description,
        thumbnailUrl: ep.thumbnail_url,
        dj: ep.dj_id
          ? {
              id: ep.dj_id,
              stageName: ep.dj_stage_name ?? "",
            }
          : null,
      });
      episodesBySeason.set(ep.season_id, list);
    }

    const seasons: CustomerSeason[] = seasonRows.map((s) => ({
      id: s.id,
      seasonNumber: s.season_number,
      title: s.title,
      episodes: episodesBySeason.get(s.id) ?? [],
    }));

    return {
      ...baseCard,
      seasons,
    };
  }

  /**
   * Public taxonomies lookup.
   * Returns active categories, countries, and approved DJ voice artists.
   */
  async getPublicTaxonomies(): Promise<PublicTaxonomiesResponse> {
    const [categoriesResult, countriesResult, djsResult] = await Promise.all([
      this.db.execute<CategoryDbRow>(
        sql`
          SELECT id, name, slug, description
          FROM categories
          WHERE is_active = true
          ORDER BY display_order ASC, name ASC
        `,
      ),
      this.db.execute<CountryDbRow>(
        sql`
          SELECT id, code, name, flag_emoji
          FROM countries
          WHERE is_active = true
          ORDER BY name ASC
        `,
      ),
      this.db.execute<VoiceArtistDbRow>(
        sql`
          SELECT id, name, stage_name, slug, avatar_url, bio, color_hex
          FROM dj_voice_artists
          WHERE is_active = true
          ORDER BY stage_name ASC
        `,
      ),
    ]);

    const categoriesRows: CategoryDbRow[] = categoriesResult.rows ?? [];
    const countriesRows: CountryDbRow[] = countriesResult.rows ?? [];
    const djsRows: VoiceArtistDbRow[] = djsResult.rows ?? [];

    return {
      categories: categoriesRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
      })),
      countries: countriesRows.map((co) => ({
        id: co.id,
        code: co.code,
        name: co.name,
        flagEmoji: co.flag_emoji,
      })),
      voiceArtists: djsRows.map((d) => ({
        id: d.id,
        name: d.name,
        stageName: d.stage_name,
        slug: d.slug,
        avatarUrl: d.avatar_url,
        bio: d.bio,
        colorHex: d.color_hex,
      })),
    };
  }

  /**
   * Native PostgreSQL full-text search (ADR-013).
   * Dynamically evaluates to_tsvector @@ plainto_tsquery on published content.
   * Note: No GIN index is defined in migrations 0000-0012; evaluates across candidate rows.
   */
  async searchTitles(
    query: SearchCatalogQueryDto,
  ): Promise<PaginatedResult<CustomerTitleCard>> {
    const rawTerm = (query.q ?? "").trim();
    if (!rawTerm) {
      return { items: [], nextCursor: null };
    }

    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;

    const whereConditions = [
      sql`c.status = 'published'`,
      sql`c.published_at IS NOT NULL`,
      sql`to_tsvector('simple', c.title || ' ' || coalesce(c.description, '')) @@ plainto_tsquery('simple', ${rawTerm})`,
    ];

    if (decodedCursor) {
      const iso = decodedCursor.publishedAt.toISOString();
      whereConditions.push(
        sql`(c.published_at < ${iso}::timestamptz OR (c.published_at = ${iso}::timestamptz AND c.id < ${decodedCursor.id}::uuid))`,
      );
    }

    const whereClause = sql.join(whereConditions, sql` AND `);

    const rowsResult = await this.db.execute<ContentSearchDbRow>(
      sql`
        SELECT
          c.id,
          c.code_id,
          c.content_type,
          c.title,
          c.original_title,
          c.slug,
          c.release_year,
          c.description,
          c.poster_url,
          c.backdrop_url,
          c.trailer_url,
          c.duration_minutes,
          c.published_at,
          ts_rank(
            to_tsvector('simple', c.title || ' ' || coalesce(c.description, '')),
            plainto_tsquery('simple', ${rawTerm})
          ) AS rank
        FROM content c
        WHERE ${whereClause}
        ORDER BY rank DESC, c.published_at DESC, c.id DESC
        LIMIT ${limit + 1}
      `,
    );

    const rawRows: ContentSearchDbRow[] = rowsResult.rows ?? [];
    const hasMore = rawRows.length > limit;
    const itemsRows = hasMore ? rawRows.slice(0, limit) : rawRows;

    if (itemsRows.length === 0) {
      return { items: [], nextCursor: null };
    }

    const contentIds = itemsRows.map((r) => r.id);
    const { categoriesByContent, countriesByContent } =
      await this.batchFetchTaxonomies(contentIds);

    const items: CustomerTitleCard[] = itemsRows.map((row) => ({
      id: row.id,
      codeId: row.code_id,
      contentType: row.content_type,
      title: row.title,
      originalTitle: row.original_title,
      slug: row.slug,
      releaseYear: row.release_year,
      description: row.description,
      posterUrl: row.poster_url,
      backdropUrl: row.backdrop_url,
      trailerUrl: row.trailer_url,
      durationMinutes: row.duration_minutes,
      publishedAt: new Date(row.published_at).toISOString(),
      categories: categoriesByContent.get(row.id) ?? [],
      countries: countriesByContent.get(row.id) ?? [],
    }));

    const lastItem = itemsRows[itemsRows.length - 1];
    const nextCursor = hasMore
      ? encodeCursor(lastItem.published_at, lastItem.id)
      : null;

    return { items, nextCursor };
  }

  /**
   * Helper to batch fetch categories and countries for a list of content IDs without N+1 queries.
   */
  private async batchFetchTaxonomies(contentIds: string[]): Promise<{
    categoriesByContent: Map<string, CustomerCategory[]>;
    countriesByContent: Map<string, CustomerCountry[]>;
  }> {
    if (contentIds.length === 0) {
      return {
        categoriesByContent: new Map(),
        countriesByContent: new Map(),
      };
    }

    const contentIdSqlList = sql.join(
      contentIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );

    const [categoriesResult, countriesResult] = await Promise.all([
      this.db.execute<ContentCategoryJoinRow>(
        sql`
          SELECT
            cc.content_id,
            cat.id,
            cat.name,
            cat.slug,
            cat.description
          FROM content_categories cc
          JOIN categories cat ON cc.category_id = cat.id
          WHERE cc.content_id IN (${contentIdSqlList})
            AND cat.is_active = true
          ORDER BY cat.display_order ASC, cat.name ASC
        `,
      ),
      this.db.execute<ContentCountryJoinRow>(
        sql`
          SELECT
            ccount.content_id,
            co.id,
            co.code,
            co.name,
            co.flag_emoji
          FROM content_countries ccount
          JOIN countries co ON ccount.country_id = co.id
          WHERE ccount.content_id IN (${contentIdSqlList})
            AND co.is_active = true
          ORDER BY co.name ASC
        `,
      ),
    ]);

    const catRows: ContentCategoryJoinRow[] = categoriesResult.rows ?? [];
    const coRows: ContentCountryJoinRow[] = countriesResult.rows ?? [];

    const categoriesByContent = new Map<string, CustomerCategory[]>();
    for (const r of catRows) {
      const list = categoriesByContent.get(r.content_id) ?? [];
      list.push({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
      });
      categoriesByContent.set(r.content_id, list);
    }

    const countriesByContent = new Map<string, CustomerCountry[]>();
    for (const r of coRows) {
      const list = countriesByContent.get(r.content_id) ?? [];
      list.push({
        id: r.id,
        code: r.code,
        name: r.name,
        flagEmoji: r.flag_emoji,
      });
      countriesByContent.set(r.content_id, list);
    }

    return { categoriesByContent, countriesByContent };
  }
}
