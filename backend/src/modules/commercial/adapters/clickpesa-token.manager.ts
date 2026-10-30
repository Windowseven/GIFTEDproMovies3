export interface ClickPesaTokenManagerConfig {
  clientId: string;
  apiKey: string;
  tokenEndpointUrl?: string;
  refreshThresholdMs?: number;
  requestTimeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface ClickPesaTokenResponse {
  success?: boolean;
  token?: string;
  error?: string;
  message?: string;
}

export class ClickPesaTokenManager {
  private readonly clientId: string;
  private readonly apiKey: string;
  private readonly tokenEndpointUrl: string;
  private readonly refreshThresholdMs: number;
  private readonly requestTimeoutMs: number;
  private readonly fetchFn: typeof fetch;

  private cachedToken: string | null = null;
  private expiresAtMs = 0;
  private inFlightRefresh: Promise<string> | null = null;

  constructor(config: ClickPesaTokenManagerConfig) {
    if (!config.clientId || config.clientId.trim() === "") {
      throw new Error("ClickPesaTokenManager: clientId is required");
    }
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new Error("ClickPesaTokenManager: apiKey is required");
    }

    this.clientId = config.clientId.trim();
    this.apiKey = config.apiKey.trim();
    this.tokenEndpointUrl =
      config.tokenEndpointUrl ?? "https://api.clickpesa.com/third-parties/generate-token";
    // Default: 50 minutes proactive refresh for 60-minute token
    this.refreshThresholdMs = config.refreshThresholdMs ?? 50 * 60 * 1000;
    this.requestTimeoutMs = config.requestTimeoutMs ?? 10_000;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  /**
   * Retrieves an active Bearer token, reusing the valid cached token if fresh,
   * or safely initiating a single-flight refresh across all concurrent callers.
   */
  async getBearerToken(): Promise<string> {
    const now = Date.now();

    // Check if current cached token is still within proactive validity window
    if (this.cachedToken && this.expiresAtMs - now > 0) {
      return this.cachedToken;
    }

    // Single-flight pattern: if a refresh is already in progress, await it
    if (this.inFlightRefresh) {
      return await this.inFlightRefresh;
    }

    // Launch single-flight refresh
    this.inFlightRefresh = this.executeTokenRefresh()
      .finally(() => {
        this.inFlightRefresh = null;
      });

    return await this.inFlightRefresh;
  }

  /**
   * Directly executes token exchange against ClickPesa API with timeout and error shielding.
   */
  private async executeTokenRefresh(): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await this.fetchFn(this.tokenEndpointUrl, {
        method: "POST",
        headers: {
          "client-id": this.clientId,
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `ClickPesa token generation failed with HTTP status ${response.status}`,
        );
      }

      const body = (await response.json()) as ClickPesaTokenResponse;

      if (!body || typeof body.token !== "string" || body.token.trim() === "") {
        throw new Error(
          `ClickPesa token generation returned empty or malformed token payload: ${body?.message ?? body?.error ?? "unknown error"}`,
        );
      }

      let token = body.token.trim();
      // ClickPesa token responses often include "Bearer " prefix. Ensure normalized token format.
      if (!token.startsWith("Bearer ")) {
        token = `Bearer ${token}`;
      }

      this.cachedToken = token;
      // Set proactive expiration window (default 50 minutes)
      this.expiresAtMs = Date.now() + this.refreshThresholdMs;

      return token;
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === "AbortError") {
        throw new Error(
          `ClickPesa token generation timed out after ${this.requestTimeoutMs}ms`,
          { cause: err },
        );
      }
      throw new Error(`ClickPesa token generation error: ${error.message ?? "unknown"}`, {
        cause: err,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * For testing or forced invalidation: clears the active cache.
   */
  clearCache(): void {
    this.cachedToken = null;
    this.expiresAtMs = 0;
  }

  /**
   * Returns current cache state for telemetry/testing without exposing token secret.
   */
  getCacheState(): { hasCachedToken: boolean; ttlRemainingMs: number } {
    const remaining = Math.max(0, this.expiresAtMs - Date.now());
    return {
      hasCachedToken: this.cachedToken !== null && remaining > 0,
      ttlRemainingMs: remaining,
    };
  }
}
