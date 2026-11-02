import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class DownloadHistoryQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "page must be an integer" })
  @Min(1, { message: "page must be at least 1" })
  page: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(50, { message: "limit must not exceed 50" })
  limit: number = 20;

  @IsOptional()
  @IsIn(["COMPLETED", "PENDING", "FAILED"], {
    message: "status must be one of: COMPLETED, PENDING, FAILED",
  })
  status?: "COMPLETED" | "PENDING" | "FAILED";
}

export interface DownloadHistoryItem {
  attemptId: string;
  orderId: string;
  entitlementId: string;
  contentKind: string;
  contentId: string;
  title: string;
  slug: string;
  editionId?: string | null;
  episodeId?: string | null;
  djName?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  status: string;
  attemptNumber: number;
  completedAt?: string | null;
  tokenExpiresAt: string;
  retryGraceExpiresAt: string;
  isRetryEligible: boolean;
  downloadLimit: number | null;
  downloadLimitType: string | null;
  quotaRemaining: number | null;
  failureReason?: string | null;
  createdAt: string;
}

export interface DownloadHistoryResponse {
  downloads: DownloadHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DownloadLicenseItem {
  entitlementId: string;
  orderId: string;
  targetKind: string;
  contentId: string;
  title: string;
  slug: string;
  posterUrl?: string | null;
  startsAt: string;
  expiresAt: string;
  downloadLimit: number | null;
  downloadLimitType: string | null;
  quotaRemaining: number | null;
  hasCompletedDownload: boolean;
  latestAttemptStatus?: string | null;
}

export interface DownloadLicensesResponse {
  licenses: DownloadLicenseItem[];
}
