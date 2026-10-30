export interface StaffPreviewTokenResult {
  authorized: boolean;
  streamUrl: string;
  previewToken: string;
  expiresAt: string;
  targetKind: "movie" | "episode";
  contentId: string;
  editionId?: string | null;
  djId?: string | null;
}
