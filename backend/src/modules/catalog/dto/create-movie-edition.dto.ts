import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateMovieEditionDto {
  @IsNotEmpty()
  @IsUUID("4")
  djId!: string;

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
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
