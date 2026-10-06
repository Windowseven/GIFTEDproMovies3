import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateMovieEditionDto {
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
}
