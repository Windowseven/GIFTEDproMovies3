import { IsOptional, IsUUID } from "class-validator";

export class DownloadAuthorizeDto {
  @IsOptional()
  @IsUUID("4")
  contentId?: string;

  @IsOptional()
  @IsUUID("4")
  episodeId?: string;

  @IsOptional()
  @IsUUID("4")
  editionId?: string;

  @IsOptional()
  @IsUUID("4")
  djId?: string;
}

export interface DownloadAuthorizeResult {
  authorized: boolean;
  downloadUrl: string;
  downloadToken: string;
  expiresAt: string;
  targetKind: "movie" | "episode";
  contentId: string;
  editionId?: string;
  djId?: string;
  downloadLimit: number | null;
  downloadLimitType: string | null;
  attemptId?: string;
  isRetry?: boolean;
}
