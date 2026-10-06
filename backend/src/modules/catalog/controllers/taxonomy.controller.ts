import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SessionAuthGuard } from "../../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../../identity/guards/roles.guard.js";
import { CapabilitiesGuard } from "../../identity/guards/capabilities.guard.js";
import { Roles, RequireCapability, CurrentUser } from "../../identity/decorators/index.js";
import { TaxonomyService } from "../services/taxonomy.service.js";
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateCountryDto,
  UpdateCountryDto,
  CreateDjDto,
  UpdateDjDto,
} from "../dto/taxonomy.dto.js";
import type { CategoryRecord } from "../../../infrastructure/database/schemas/categories.schema.js";
import type { CountryRecord } from "../../../infrastructure/database/schemas/countries.schema.js";
import type { DjVoiceArtistRecord } from "../../../infrastructure/database/schemas/dj-voice-artists.schema.js";

@Controller("staff/taxonomies")
@UseGuards(SessionAuthGuard, RolesGuard, CapabilitiesGuard)
@Roles("media_team", "admin")
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  @Post("categories")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("TAXONOMY_MANAGE")
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser("id") actorId: string,
  ): Promise<CategoryRecord> {
    return await this.taxonomy.createCategory(dto, actorId);
  }

  @Patch("categories/:id")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("TAXONOMY_MANAGE")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser("id") actorId: string,
  ): Promise<CategoryRecord> {
    return await this.taxonomy.updateCategory(id, dto, actorId);
  }

  @Post("categories/:id/deactivate")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("TAXONOMY_MANAGE")
  async deactivateCategory(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<CategoryRecord> {
    return await this.taxonomy.deactivateCategory(id, actorId);
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireCapability("TAXONOMY_MANAGE")
  async deleteCategory(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<void> {
    await this.taxonomy.deleteCategory(id, actorId);
  }

  // =========================================================================
  // COUNTRIES
  // =========================================================================

  @Post("countries")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("TAXONOMY_MANAGE")
  async createCountry(
    @Body() dto: CreateCountryDto,
    @CurrentUser("id") actorId: string,
  ): Promise<CountryRecord> {
    return await this.taxonomy.createCountry(dto, actorId);
  }

  @Patch("countries/:id")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("TAXONOMY_MANAGE")
  async updateCountry(
    @Param("id") id: string,
    @Body() dto: UpdateCountryDto,
    @CurrentUser("id") actorId: string,
  ): Promise<CountryRecord> {
    return await this.taxonomy.updateCountry(id, dto, actorId);
  }

  @Post("countries/:id/deactivate")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("TAXONOMY_MANAGE")
  async deactivateCountry(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<CountryRecord> {
    return await this.taxonomy.deactivateCountry(id, actorId);
  }

  @Delete("countries/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireCapability("TAXONOMY_MANAGE")
  async deleteCountry(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<void> {
    await this.taxonomy.deleteCountry(id, actorId);
  }

  // =========================================================================
  // DJ / VOICE ARTISTS
  // =========================================================================

  @Post("djs")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("TAXONOMY_MANAGE")
  async createDj(
    @Body() dto: CreateDjDto,
    @CurrentUser("id") actorId: string,
  ): Promise<DjVoiceArtistRecord> {
    return await this.taxonomy.createDj(dto, actorId);
  }

  @Patch("djs/:id")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("TAXONOMY_MANAGE")
  async updateDj(
    @Param("id") id: string,
    @Body() dto: UpdateDjDto,
    @CurrentUser("id") actorId: string,
  ): Promise<DjVoiceArtistRecord> {
    return await this.taxonomy.updateDj(id, dto, actorId);
  }

  @Post("djs/:id/deactivate")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("TAXONOMY_MANAGE")
  async deactivateDj(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<DjVoiceArtistRecord> {
    return await this.taxonomy.deactivateDj(id, actorId);
  }

  @Delete("djs/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireCapability("TAXONOMY_MANAGE")
  async deleteDj(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<void> {
    await this.taxonomy.deleteDj(id, actorId);
  }
}
