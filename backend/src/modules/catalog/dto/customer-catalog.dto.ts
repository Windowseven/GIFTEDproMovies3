import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export const CATALOG_CONTENT_TYPES = ["movie", "series"] as const;
export type CatalogContentType = (typeof CATALOG_CONTENT_TYPES)[number];

export class GetCatalogTitlesQueryDto {
  @IsOptional()
  @IsIn(CATALOG_CONTENT_TYPES, {
    message: "type must be either 'movie' or 'series'",
  })
  type?: CatalogContentType;

  @IsOptional()
  @IsUUID("4", { message: "categoryId must be a valid UUID v4" })
  categoryId?: string;

  @IsOptional()
  @IsUUID("4", { message: "countryId must be a valid UUID v4" })
  countryId?: string;

  @IsOptional()
  @IsUUID("4", { message: "djId must be a valid UUID v4" })
  djId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "genre must not exceed 50 characters" })
  genre?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(100, { message: "limit must not exceed 100" })
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(256, { message: "cursor must not exceed 256 characters" })
  cursor?: string;
}

export class SearchCatalogQueryDto {
  @IsNotEmpty({ message: "Search query q cannot be empty" })
  @IsString()
  @MinLength(1, { message: "Search query q must have at least 1 character" })
  @MaxLength(100, { message: "Search query q must not exceed 100 characters" })
  q!: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(100, { message: "limit must not exceed 100" })
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(256, { message: "cursor must not exceed 256 characters" })
  cursor?: string;
}
