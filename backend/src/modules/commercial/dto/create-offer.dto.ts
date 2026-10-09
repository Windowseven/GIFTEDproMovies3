import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateIf,
} from "class-validator";

export type OfferTargetKind = "MOVIE" | "SERIES" | "SEASON" | "EPISODE" | "CATALOG";
export type OfferPolicyType = "ALL_CATALOG" | "CATEGORY_SET" | "CONTENT_SET";
export type OfferStatus = "draft" | "active" | "inactive" | "archived";

export class CreateOfferDto {
  @Type(() => String)
  @IsString()
  @Length(1, 64)
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,63}$/u, {
    message: "Offer code must use safe uppercase alphanumeric characters and optional underscores or hyphens.",
  })
  code!: string;

  @Type(() => String)
  @IsString()
  @Length(1, 255)
  name!: string;

  @Type(() => String)
  @IsOptional()
  @IsIn(["draft", "active", "inactive", "archived"])
  status?: OfferStatus;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  endsAt?: Date | null;

  @Type(() => String)
  @IsString()
  @IsIn(["MOVIE", "SERIES", "SEASON", "EPISODE", "CATALOG"])
  targetKind!: OfferTargetKind;

  @Type(() => String)
  @IsOptional()
  @IsString()
  targetMovieContentId?: string | null;

  @Type(() => String)
  @IsOptional()
  @IsString()
  targetSeriesContentId?: string | null;

  @Type(() => String)
  @IsOptional()
  @IsString()
  targetSeasonId?: string | null;

  @Type(() => String)
  @IsOptional()
  @IsString()
  targetEpisodeId?: string | null;

  @Type(() => String)
  @IsString()
  planVersionId!: string;

  @IsInt()
  @Min(0)
  priceTzs!: number;

  @Type(() => String)
  @IsOptional()
  @IsString()
  @IsIn(["ALL_CATALOG", "CATEGORY_SET", "CONTENT_SET"])
  catalogPolicyType?: OfferPolicyType | null;

  @Type(() => String)
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  @ValidateIf((_, value) => value !== undefined)
  categoryIds?: string[];

  @Type(() => String)
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  @ValidateIf((_, value) => value !== undefined)
  contentIds?: string[];
}
