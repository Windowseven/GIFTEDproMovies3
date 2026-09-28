export type MediaContentStatus = 'DRAFT' | 'READY_FOR_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export type MediaContentType = 'MOVIE' | 'SERIES';

export type MediaReadinessStatus = 'ready' | 'processing' | 'needs_attention' | 'not_available';

export type MediaAssetKind =
  | 'STREAMING_VIDEO'
  | 'DOWNLOAD_FILE'
  | 'POSTER'
  | 'BACKDROP'
  | 'TRAILER';

export interface MediaTeamMetrics {
  totalMovies: number;
  publishedMovies: number;
  totalSeries: number;
  totalEpisodes: number;
  draftCount: number;
  readyForReviewCount: number;
  needsAttentionCount: number;
  activeDjsCount: number;
}

export type AttentionIssueType =
  | 'missing_poster'
  | 'missing_backdrop'
  | 'missing_description'
  | 'missing_category'
  | 'missing_country'
  | 'missing_dj'
  | 'missing_streaming_media'
  | 'missing_download_media'
  | 'media_processing_failed'
  | 'draft_needs_review';

export interface AttentionItem {
  id: string;
  contentId: string;
  contentTitle: string;
  originalTitle?: string;
  contentType: 'movie' | 'series' | 'episode';
  issueType: AttentionIssueType;
  description: string;
  severity: 'error' | 'warning' | 'info';
  timeFormatted: string;
  posterUrl: string;
  actionUrl: string;
  resolved: boolean;
}

export interface MovieVersionItem {
  id: string;
  djId: string;
  djName: string;
  versionLabel?: string;
  streamingFileName?: string;
  streamingStatus: MediaReadinessStatus;
  downloadFileName?: string;
  downloadStatus: MediaReadinessStatus;
  readinessStatus: 'ready' | 'draft' | 'needs_attention';
  streamingPriceTsh?: number;
  downloadPriceTsh?: number;
}

export interface ContentReadinessChecklist {
  basicInfo: boolean; // title, description, release year, duration
  poster: boolean;
  backdrop: boolean;
  trailer: boolean;
  categories: boolean;
  countries: boolean;
  djAssigned: boolean;
  streamingMedia: boolean;
  downloadMedia: boolean;
}

export interface MediaContentItem {
  id: string;
  slug: string;
  codeId: string; // e.g. #GF-9042
  title: string;
  originalTitle: string;
  contentType: 'MOVIE';
  releaseYear: number;
  durationMinutes: number;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  categoryNames: string[];
  countryNames: string[];
  versions: MovieVersionItem[];
  streamingStatus: MediaReadinessStatus;
  downloadStatus: MediaReadinessStatus;
  completenessPercent: number;
  checklist: ContentReadinessChecklist;
  status: MediaContentStatus;
  updatedAt: string;
  lastEditedBy?: string;
}

export interface EpisodeItem {
  id: string;
  episodeNumber: number;
  title: string;
  durationMinutes: number;
  description: string;
  thumbnailUrl?: string;
  djName?: string;
  streamingStatus: MediaReadinessStatus;
  downloadStatus: MediaReadinessStatus;
  status: MediaContentStatus;
}

export interface SeasonItem {
  id: string;
  seasonNumber: number;
  title: string;
  episodes: EpisodeItem[];
  status: MediaContentStatus;
}

export interface SeriesContentItem {
  id: string;
  slug: string;
  codeId: string;
  title: string;
  originalTitle: string;
  contentType: 'SERIES';
  releaseYear: number;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  categoryNames: string[];
  countryNames: string[];
  description: string;
  seasons: SeasonItem[];
  totalEpisodes: number;
  completenessPercent: number;
  status: MediaContentStatus;
  updatedAt: string;
}

export interface MediaAssetItem {
  id: string;
  title: string;
  fileName: string;
  fileSizeMb: number;
  assetKind: MediaAssetKind;
  associatedTitle: string;
  status: MediaReadinessStatus;
  uploadedAt: string;
}

export type UploadLifecycleState =
  | 'IDLE'
  | 'PREPARING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface UploadSession {
  id: string;
  state: UploadLifecycleState;
  fileName: string;
  fileSizeMb: number;
  progressPercent: number;
  assetKind: MediaAssetKind;
  targetTitle?: string;
  errorMessage?: string | null;
}
