import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../../identity/decorators/index.js";
import { SessionAuthGuard } from "../../identity/guards/session-auth.guard.js";
import {
  CustomerCatalogService,
  type CustomerMovieDetail,
  type CustomerSeriesDetail,
  type CustomerTitleCard,
  type PaginatedResult,
  type PublicTaxonomiesResponse,
} from "../services/customer-catalog.service.js";
import {
  GetCatalogTitlesQueryDto,
  SearchCatalogQueryDto,
} from "../dto/customer-catalog.dto.js";

@Controller("catalog")
@Public()
@UseGuards(SessionAuthGuard)
export class CustomerCatalogController {
  constructor(
    private readonly customerCatalogService: CustomerCatalogService,
  ) {}

  @Get("titles")
  @HttpCode(HttpStatus.OK)
  async listTitles(
    @Query() query: GetCatalogTitlesQueryDto,
  ): Promise<PaginatedResult<CustomerTitleCard>> {
    return await this.customerCatalogService.listTitles(query);
  }

  @Get("titles/:slug")
  @HttpCode(HttpStatus.OK)
  async getTitleBySlug(
    @Param("slug") slug: string,
  ): Promise<CustomerMovieDetail | CustomerSeriesDetail> {
    return await this.customerCatalogService.getTitleBySlug(slug);
  }

  @Get("taxonomies")
  @HttpCode(HttpStatus.OK)
  async getTaxonomies(): Promise<PublicTaxonomiesResponse> {
    return await this.customerCatalogService.getPublicTaxonomies();
  }

  @Get("search")
  @HttpCode(HttpStatus.OK)
  async searchTitles(
    @Query() query: SearchCatalogQueryDto,
  ): Promise<PaginatedResult<CustomerTitleCard>> {
    return await this.customerCatalogService.searchTitles(query);
  }
}
