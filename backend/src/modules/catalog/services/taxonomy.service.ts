import { Inject, Injectable } from "@nestjs/common";
import { count, eq, sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import { AuditService } from "../../audit/audit.service.js";
import {
  categoriesTable,
  type CategoryRecord,
} from "../../../infrastructure/database/schemas/categories.schema.js";
import {
  countriesTable,
  type CountryRecord,
} from "../../../infrastructure/database/schemas/countries.schema.js";
import {
  djVoiceArtistsTable,
  type DjVoiceArtistRecord,
} from "../../../infrastructure/database/schemas/dj-voice-artists.schema.js";
import {
  contentCategoriesTable,
  contentCountriesTable,
} from "../../../infrastructure/database/schemas/content-taxonomies.schema.js";
import { movieEditionsTable } from "../../../infrastructure/database/schemas/movie-editions.schema.js";
import { seriesMetadataTable } from "../../../infrastructure/database/schemas/series-metadata.schema.js";
import { episodesTable } from "../../../infrastructure/database/schemas/episodes.schema.js";
import {
  ContentNotFoundException,
  SlugCollisionException,
  TaxonomyInUseException,
} from "../catalog.errors.js";
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateCountryDto,
  UpdateCountryDto,
  CreateDjDto,
  UpdateDjDto,
} from "../dto/taxonomy.dto.js";

@Injectable()
export class TaxonomyService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly audit: AuditService,
  ) {}

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  async createCategory(dto: CreateCategoryDto, actorId: string): Promise<CategoryRecord> {
    return await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(categoriesTable)
        .where(
          sql`lower(${categoriesTable.slug}) = lower(${dto.slug}) OR lower(${categoriesTable.name}) = lower(${dto.name})`,
        )
        .limit(1);

      if (existing.length > 0) {
        throw new SlugCollisionException("Category name or slug already exists");
      }

      const [record] = await tx
        .insert(categoriesTable)
        .values({
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        })
        .returning();

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_CREATE",
        resourceType: "category",
        resourceId: record!.id,
        metadata: { name: record!.name, slug: record!.slug },
        failClosed: true,
      });

      return record!;
    });
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    actorId: string,
  ): Promise<CategoryRecord> {
    return await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, id))
        .limit(1);

      if (!existing) {
        throw new ContentNotFoundException("Category not found");
      }

      if (dto.slug && dto.slug.toLowerCase() !== existing.slug.toLowerCase()) {
        const conflict = await tx
          .select()
          .from(categoriesTable)
          .where(sql`lower(${categoriesTable.slug}) = lower(${dto.slug})`)
          .limit(1);
        if (conflict.length > 0 && conflict[0]?.id !== id) {
          throw new SlugCollisionException("Category with this slug already exists");
        }
      }

      const [updated] = await tx
        .update(categoriesTable)
        .set({
          name: dto.name ?? existing.name,
          slug: dto.slug ?? existing.slug,
          description: dto.description !== undefined ? dto.description : existing.description,
          displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : existing.displayOrder,
          isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(categoriesTable.id, id))
        .returning();

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_UPDATE",
        resourceType: "category",
        resourceId: id,
        metadata: { name: updated!.name, slug: updated!.slug },
        failClosed: true,
      });

      return updated!;
    });
  }

  async deactivateCategory(id: string, actorId: string): Promise<CategoryRecord> {
    return await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(categoriesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(categoriesTable.id, id))
        .returning();

      if (!updated) {
        throw new ContentNotFoundException("Category not found");
      }

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_DEACTIVATE",
        resourceType: "category",
        resourceId: id,
        metadata: { name: updated.name, isActive: false },
        failClosed: true,
      });

      return updated;
    });
  }

  async deleteCategory(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const refs = await tx
        .select({ count: count() })
        .from(contentCategoriesTable)
        .where(eq(contentCategoriesTable.categoryId, id));

      const refCount = Number(refs[0]?.count ?? 0);
      if (refCount > 0) {
        throw new TaxonomyInUseException(
          `Cannot delete category because it is referenced by ${refCount} catalog item(s). Deactivate it instead.`,
        );
      }

      await tx.delete(categoriesTable).where(eq(categoriesTable.id, id));

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_DELETE",
        resourceType: "category",
        resourceId: id,
        failClosed: true,
      });
    });
  }

  // =========================================================================
  // COUNTRIES
  // =========================================================================

  async createCountry(dto: CreateCountryDto, actorId: string): Promise<CountryRecord> {
    return await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(countriesTable)
        .where(
          sql`upper(${countriesTable.code}) = upper(${dto.code}) OR lower(${countriesTable.name}) = lower(${dto.name})`,
        )
        .limit(1);

      if (existing.length > 0) {
        throw new SlugCollisionException("Country code or name already exists");
      }

      const [record] = await tx
        .insert(countriesTable)
        .values({
          code: dto.code.toUpperCase(),
          name: dto.name,
          flagEmoji: dto.flagEmoji ?? null,
          isActive: dto.isActive ?? true,
        })
        .returning();

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_CREATE",
        resourceType: "country",
        resourceId: record!.id,
        metadata: { code: record!.code, name: record!.name },
        failClosed: true,
      });

      return record!;
    });
  }

  async updateCountry(
    id: string,
    dto: UpdateCountryDto,
    actorId: string,
  ): Promise<CountryRecord> {
    return await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(countriesTable)
        .where(eq(countriesTable.id, id))
        .limit(1);

      if (!existing) {
        throw new ContentNotFoundException("Country not found");
      }

      const [updated] = await tx
        .update(countriesTable)
        .set({
          code: dto.code ? dto.code.toUpperCase() : existing.code,
          name: dto.name ?? existing.name,
          flagEmoji: dto.flagEmoji !== undefined ? dto.flagEmoji : existing.flagEmoji,
          isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(countriesTable.id, id))
        .returning();

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_UPDATE",
        resourceType: "country",
        resourceId: id,
        metadata: { code: updated!.code, name: updated!.name },
        failClosed: true,
      });

      return updated!;
    });
  }

  async deactivateCountry(id: string, actorId: string): Promise<CountryRecord> {
    return await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(countriesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(countriesTable.id, id))
        .returning();

      if (!updated) {
        throw new ContentNotFoundException("Country not found");
      }

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_DEACTIVATE",
        resourceType: "country",
        resourceId: id,
        metadata: { code: updated.code, isActive: false },
        failClosed: true,
      });

      return updated;
    });
  }

  async deleteCountry(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const refs = await tx
        .select({ count: count() })
        .from(contentCountriesTable)
        .where(eq(contentCountriesTable.countryId, id));

      const refCount = Number(refs[0]?.count ?? 0);
      if (refCount > 0) {
        throw new TaxonomyInUseException(
          `Cannot delete country because it is referenced by ${refCount} catalog item(s). Deactivate it instead.`,
        );
      }

      await tx.delete(countriesTable).where(eq(countriesTable.id, id));

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_DELETE",
        resourceType: "country",
        resourceId: id,
        failClosed: true,
      });
    });
  }

  // =========================================================================
  // DJ / VOICE ARTISTS
  // =========================================================================

  async createDj(dto: CreateDjDto, actorId: string): Promise<DjVoiceArtistRecord> {
    return await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(djVoiceArtistsTable)
        .where(sql`lower(${djVoiceArtistsTable.slug}) = lower(${dto.slug})`)
        .limit(1);

      if (existing.length > 0) {
        throw new SlugCollisionException("DJ slug already exists");
      }

      const [record] = await tx
        .insert(djVoiceArtistsTable)
        .values({
          name: dto.name,
          stageName: dto.stageName,
          slug: dto.slug,
          avatarUrl: dto.avatarUrl ?? null,
          bio: dto.bio ?? null,
          colorHex: dto.colorHex ?? null,
          isActive: dto.isActive ?? true,
        })
        .returning();

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_CREATE",
        resourceType: "dj_voice_artist",
        resourceId: record!.id,
        metadata: { stageName: record!.stageName, slug: record!.slug },
        failClosed: true,
      });

      return record!;
    });
  }

  async updateDj(
    id: string,
    dto: UpdateDjDto,
    actorId: string,
  ): Promise<DjVoiceArtistRecord> {
    return await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(djVoiceArtistsTable)
        .where(eq(djVoiceArtistsTable.id, id))
        .limit(1);

      if (!existing) {
        throw new ContentNotFoundException("DJ voice artist not found");
      }

      if (dto.slug && dto.slug.toLowerCase() !== existing.slug.toLowerCase()) {
        const conflict = await tx
          .select()
          .from(djVoiceArtistsTable)
          .where(sql`lower(${djVoiceArtistsTable.slug}) = lower(${dto.slug})`)
          .limit(1);
        if (conflict.length > 0 && conflict[0]?.id !== id) {
          throw new SlugCollisionException("DJ with this slug already exists");
        }
      }

      const [updated] = await tx
        .update(djVoiceArtistsTable)
        .set({
          name: dto.name ?? existing.name,
          stageName: dto.stageName ?? existing.stageName,
          slug: dto.slug ?? existing.slug,
          avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : existing.avatarUrl,
          bio: dto.bio !== undefined ? dto.bio : existing.bio,
          colorHex: dto.colorHex !== undefined ? dto.colorHex : existing.colorHex,
          isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(djVoiceArtistsTable.id, id))
        .returning();

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_UPDATE",
        resourceType: "dj_voice_artist",
        resourceId: id,
        metadata: { stageName: updated!.stageName },
        failClosed: true,
      });

      return updated!;
    });
  }

  async deactivateDj(id: string, actorId: string): Promise<DjVoiceArtistRecord> {
    return await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(djVoiceArtistsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(djVoiceArtistsTable.id, id))
        .returning();

      if (!updated) {
        throw new ContentNotFoundException("DJ voice artist not found");
      }

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_DEACTIVATE",
        resourceType: "dj_voice_artist",
        resourceId: id,
        metadata: { stageName: updated.stageName, isActive: false },
        failClosed: true,
      });

      return updated;
    });
  }

  async deleteDj(id: string, actorId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const editionRefs = await tx
        .select({ count: count() })
        .from(movieEditionsTable)
        .where(eq(movieEditionsTable.djId, id));

      const seriesRefs = await tx
        .select({ count: count() })
        .from(seriesMetadataTable)
        .where(eq(seriesMetadataTable.leadDjId, id));

      const episodeRefs = await tx
        .select({ count: count() })
        .from(episodesTable)
        .where(eq(episodesTable.djId, id));

      const totalRefs =
        Number(editionRefs[0]?.count ?? 0) +
        Number(seriesRefs[0]?.count ?? 0) +
        Number(episodeRefs[0]?.count ?? 0);

      if (totalRefs > 0) {
        throw new TaxonomyInUseException(
          `Cannot delete DJ voice artist because they are referenced by ${totalRefs} catalog edition(s)/series/episode(s). Deactivate instead.`,
        );
      }

      await tx.delete(djVoiceArtistsTable).where(eq(djVoiceArtistsTable.id, id));

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "TAXONOMY_DELETE",
        resourceType: "dj_voice_artist",
        resourceId: id,
        failClosed: true,
      });
    });
  }
}
