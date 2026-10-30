import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class TranscodeWebhookDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsIn(["ready", "failed", "processing"])
  status!: "ready" | "failed" | "processing";

  @IsIn(["movie", "episode"])
  contentKind!: "movie" | "episode";

  @IsUUID("4")
  targetId!: string;

  @IsOptional()
  @IsString()
  streamingFileKey?: string;

  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  error?: string;
}
