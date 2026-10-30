import { IsOptional, IsUUID } from "class-validator";

export class PlaybackAuthorizeDto {
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

export interface PlaybackAuthorizeResult {
  authorized: boolean;
  streamUrl: string;
  playbackToken: string;
  expiresAt: string;
  targetKind: "movie" | "episode";
  contentId: string;
  editionId?: string;
  djId?: string;
}
