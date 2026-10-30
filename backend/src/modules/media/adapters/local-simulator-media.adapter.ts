import type {
  MediaStoragePort,
  PresignedUploadResult,
} from "../ports/media-storage.port.js";

export class LocalSimulatorMediaAdapter implements MediaStoragePort {
  readonly providerName = "simulator";
  private readonly objects = new Set<string>();
  private readonly basePlaybackUrl: string;

  constructor(options?: { basePlaybackUrl?: string }) {
    this.basePlaybackUrl = options?.basePlaybackUrl ?? "https://stream.giftedpro.test/hls";
  }

  async generatePresignedUploadUrl(params: {
    storageKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<PresignedUploadResult> {
    return {
      uploadUrl: `https://media-sim.giftedpro.test/upload/${params.storageKey}?token=sim-upload-${Date.now()}`,
      storageKey: params.storageKey,
      expiresInSeconds: params.expiresInSeconds ?? 3600,
      headers: {
        "content-type": params.contentType,
      },
    };
  }

  async verifyObjectExists(storageKey: string): Promise<boolean> {
    return this.objects.has(storageKey);
  }

  async deleteObject(storageKey: string): Promise<void> {
    this.objects.delete(storageKey);
  }

  getPlaybackUrl(storageKey: string): string {
    const cleanKey = storageKey.startsWith("/") ? storageKey.slice(1) : storageKey;
    return `${this.basePlaybackUrl}/${cleanKey}`;
  }

  /**
   * Test helper to simulate an object having been uploaded to the simulator.
   */
  simulateUpload(storageKey: string): void {
    this.objects.add(storageKey);
  }

  /**
   * Simulates the CDN/Origin edge request verification logic for protected manifests/segments.
   * Extracts token, verifies cryptographically, and enforces that unauthenticated requests fail.
   */
  async verifyOriginAccess(
    requestUrl: string,
    signer: { verifyPlaybackToken: (token: string) => Promise<unknown | null> },
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const url = new URL(requestUrl);
      const token = url.searchParams.get("token");
      if (!token) {
        return { allowed: false, reason: "MISSING_PLAYBACK_TOKEN" };
      }
      const claims = await signer.verifyPlaybackToken(token);
      if (!claims) {
        return { allowed: false, reason: "INVALID_OR_EXPIRED_TOKEN" };
      }
      return { allowed: true };
    } catch {
      return { allowed: false, reason: "MALFORMED_URL" };
    }
  }
}

