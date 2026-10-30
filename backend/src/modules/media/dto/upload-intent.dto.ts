import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateUploadIntentDto {
  @IsIn(["movie", "episode"])
  contentKind!: "movie" | "episode";

  @IsUUID("4")
  contentId!: string;

  @IsOptional()
  @IsUUID("4")
  editionId?: string;

  @IsOptional()
  @IsUUID("4")
  djId?: string;

  @IsIn(["streaming", "download"])
  fileType!: "streaming" | "download";

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024 * 1024) // 100 GB max
  contentLengthBytes!: number;
}

export interface UploadIntentResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  headers?: Record<string, string>;
}
