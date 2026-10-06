import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateEpisodeDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  episodeNumber!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsUUID("4")
  djId?: string;

  @IsOptional()
  @IsString()
  streamingFileKey?: string;

  @IsOptional()
  @IsString()
  downloadFileKey?: string;

  @IsOptional()
  @IsIn(["pending", "processing", "ready", "failed"])
  streamingStatus?: "pending" | "processing" | "ready" | "failed";

  @IsOptional()
  @IsIn(["pending", "processing", "ready", "failed"])
  downloadStatus?: "pending" | "processing" | "ready" | "failed";

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsIn(["draft", "published", "archived"])
  status?: "draft" | "published" | "archived";
}
