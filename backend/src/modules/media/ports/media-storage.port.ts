export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  headers?: Record<string, string>;
}

export interface MediaStoragePort {
  readonly providerName: string;
  generatePresignedUploadUrl(params: {
    storageKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<PresignedUploadResult>;
  verifyObjectExists(storageKey: string): Promise<boolean>;
  deleteObject(storageKey: string): Promise<void>;
  getPlaybackUrl(storageKey: string): string;
  generatePresignedDownloadUrl(params: {
    storageKey: string;
    expiresInSeconds?: number;
  }): Promise<string>;
}
