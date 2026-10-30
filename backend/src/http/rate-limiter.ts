import type { FastifyRequest, FastifyReply } from "fastify";
import type { EnvironmentConfig } from "../config/environment.js";

export interface RateLimitRule {
  readonly method: string;
  readonly path: string;
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface RateLimitCheckResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetEpochSeconds: number;
  readonly retryAfterSeconds?: number;
  readonly isShedding?: boolean;
}

interface RateLimitBucket {
  timestamps: number[];
  lastAccess: number;
  windowMs: number;
}

export const MAX_RATE_LIMITER_KEYS = 10_000;
export const RATE_LIMITER_CLEANUP_INTERVAL_MS = 60_000;

export const AUTH_RATE_LIMIT_RULES: readonly RateLimitRule[] = [
  {
    method: "POST",
    path: "/api/v1/auth/login",
    windowMs: 60_000,
    maxRequests: 5,
  },
  {
    method: "POST",
    path: "/api/v1/auth/register",
    windowMs: 60_000,
    maxRequests: 5,
  },
  {
    method: "POST",
    path: "/api/v1/auth/request-password-reset",
    windowMs: 900_000, // 15 minutes
    maxRequests: 3,
  },
  {
    method: "POST",
    path: "/api/v1/auth/resend-verification",
    windowMs: 900_000, // 15 minutes
    maxRequests: 3,
  },
  {
    method: "POST",
    path: "/api/v1/auth/reset-password",
    windowMs: 900_000, // 15 minutes
    maxRequests: 5,
  },
  {
    method: "POST",
    path: "/api/v1/auth/change-password",
    windowMs: 60_000,
    maxRequests: 5,
  },
];

export const GLOBAL_API_RULE: RateLimitRule = {
  method: "*",
  path: "/api/v1",
  windowMs: 60_000,
  maxRequests: 100,
};

export class RateLimiter {
  private readonly store = new Map<string, RateLimitBucket>();
  private readonly cleanupTimer: NodeJS.Timeout | null = null;
  private readonly maxKeys: number;
  private readonly rules: readonly RateLimitRule[];
  private readonly globalRule: RateLimitRule;

  constructor(options?: {
    maxKeys?: number;
    rules?: readonly RateLimitRule[];
    globalRule?: RateLimitRule;
    enableCleanupTimer?: boolean;
  }) {
    this.maxKeys = options?.maxKeys ?? MAX_RATE_LIMITER_KEYS;
    this.rules = options?.rules ?? AUTH_RATE_LIMIT_RULES;
    this.globalRule = options?.globalRule ?? GLOBAL_API_RULE;

    if (options?.enableCleanupTimer !== false) {
      this.cleanupTimer = setInterval(() => {
        this.sweepExpired(Date.now());
      }, RATE_LIMITER_CLEANUP_INTERVAL_MS);
      this.cleanupTimer.unref();
    }
  }

  public getStoreSize(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
  }

  public destroy(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
  }

  public sweepExpired(now = Date.now()): number {
    let swept = 0;
    for (const [key, bucket] of this.store.entries()) {
      const activeTimestamps = bucket.timestamps.filter(
        (t) => t > now - bucket.windowMs,
      );
      if (activeTimestamps.length === 0) {
        this.store.delete(key);
        swept++;
      } else {
        bucket.timestamps = activeTimestamps;
      }
    }
    return swept;
  }

  public static normalizePath(rawUrl: string): string {
    const [pathOnly] = rawUrl.split("?");
    const trimmed = (pathOnly || "/").trim();
    if (trimmed.length > 1 && trimmed.endsWith("/")) {
      return trimmed.slice(0, -1).toLowerCase();
    }
    return trimmed.toLowerCase();
  }

  public static isHealthRoute(method: string, path: string): boolean {
    if (method.toUpperCase() !== "GET") return false;
    const normalized = RateLimiter.normalizePath(path);
    return normalized === "/health/live" || normalized === "/health/ready";
  }

  public findEndpointRule(method: string, path: string): RateLimitRule | null {
    const normPath = RateLimiter.normalizePath(path);
    const upperMethod = method.toUpperCase();

    for (const rule of this.rules) {
      if (
        rule.method.toUpperCase() === upperMethod &&
        rule.path.toLowerCase() === normPath
      ) {
        return rule;
      }
    }
    return null;
  }

  public check(
    ip: string,
    method: string,
    rawPath: string,
    now = Date.now(),
  ): RateLimitCheckResult {
    const normalizedPath = RateLimiter.normalizePath(rawPath);
    const upperMethod = method.toUpperCase();

    // 1. Health check routes are unconditionally exempt
    if (RateLimiter.isHealthRoute(upperMethod, normalizedPath)) {
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetEpochSeconds: Math.ceil((now + 60_000) / 1000),
      };
    }

    // Check if path is an API route under /api/v1
    const isApiRoute =
      normalizedPath === "/api/v1" || normalizedPath.startsWith("/api/v1/");
    if (!isApiRoute) {
      // Non-API routes (if any) are not covered by API rate limiting
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetEpochSeconds: Math.ceil((now + 60_000) / 1000),
      };
    }

    const endpointRule = this.findEndpointRule(upperMethod, normalizedPath);
    const endpointKey = endpointRule
      ? `${ip}:endpoint:${upperMethod}:${endpointRule.path}`
      : null;
    const globalKey = `${ip}:global`;

    // 2. Capacity & defensive shedding verification
    // Verify whether any required keys need to be created
    const keysToCreate: string[] = [];
    if (endpointKey && !this.store.has(endpointKey)) {
      keysToCreate.push(endpointKey);
    }
    if (!this.store.has(globalKey)) {
      keysToCreate.push(globalKey);
    }

    if (keysToCreate.length > 0 && this.store.size + keysToCreate.length > this.maxKeys) {
      // Run sweep to free expired keys
      this.sweepExpired(now);
      if (this.store.size + keysToCreate.length > this.maxKeys) {
        // High-cardinality saturation: shed untracked requests to preserve memory & invariants
        return {
          allowed: false,
          limit: this.globalRule.maxRequests,
          remaining: 0,
          resetEpochSeconds: Math.ceil((now + 60_000) / 1000),
          retryAfterSeconds: 60,
          isShedding: true,
        };
      }
    }

    // 3. Evaluate endpoint bucket (if applicable)
    let endpointActiveTimestamps: number[] = [];
    if (endpointRule && endpointKey) {
      const existing = this.store.get(endpointKey);
      endpointActiveTimestamps = existing
        ? existing.timestamps.filter((t) => t > now - endpointRule.windowMs)
        : [];

      if (endpointActiveTimestamps.length >= endpointRule.maxRequests) {
        const oldest = endpointActiveTimestamps[0]!;
        const resetMs = oldest + endpointRule.windowMs - now;
        const retryAfter = Math.max(1, Math.ceil(resetMs / 1000));
        const resetEpoch = Math.ceil((oldest + endpointRule.windowMs) / 1000);

        // Neither bucket is modified!
        return {
          allowed: false,
          limit: endpointRule.maxRequests,
          remaining: 0,
          resetEpochSeconds: resetEpoch,
          retryAfterSeconds: retryAfter,
        };
      }
    }

    // 4. Evaluate global bucket
    const existingGlobal = this.store.get(globalKey);
    const globalActiveTimestamps = existingGlobal
      ? existingGlobal.timestamps.filter((t) => t > now - this.globalRule.windowMs)
      : [];

    if (globalActiveTimestamps.length >= this.globalRule.maxRequests) {
      const oldest = globalActiveTimestamps[0]!;
      const resetMs = oldest + this.globalRule.windowMs - now;
      const retryAfter = Math.max(1, Math.ceil(resetMs / 1000));
      const resetEpoch = Math.ceil((oldest + this.globalRule.windowMs) / 1000);

      // Neither bucket is modified!
      return {
        allowed: false,
        limit: this.globalRule.maxRequests,
        remaining: 0,
        resetEpochSeconds: resetEpoch,
        retryAfterSeconds: retryAfter,
      };
    }

    // 5. Both buckets have capacity! Atomically commit the request timestamp to both buckets
    if (endpointRule && endpointKey) {
      endpointActiveTimestamps.push(now);
      this.store.set(endpointKey, {
        timestamps: endpointActiveTimestamps,
        lastAccess: now,
        windowMs: endpointRule.windowMs,
      });
    }

    globalActiveTimestamps.push(now);
    this.store.set(globalKey, {
      timestamps: globalActiveTimestamps,
      lastAccess: now,
      windowMs: this.globalRule.windowMs,
    });

    // Determine primary headers to report
    if (endpointRule && endpointKey) {
      const remaining = endpointRule.maxRequests - endpointActiveTimestamps.length;
      const oldest = endpointActiveTimestamps[0]!;
      const resetEpoch = Math.ceil((oldest + endpointRule.windowMs) / 1000);
      return {
        allowed: true,
        limit: endpointRule.maxRequests,
        remaining: Math.max(0, remaining),
        resetEpochSeconds: resetEpoch,
      };
    }

    const remaining = this.globalRule.maxRequests - globalActiveTimestamps.length;
    const oldest = globalActiveTimestamps[0]!;
    const resetEpoch = Math.ceil((oldest + this.globalRule.windowMs) / 1000);
    return {
      allowed: true,
      limit: this.globalRule.maxRequests,
      remaining: Math.max(0, remaining),
      resetEpochSeconds: resetEpoch,
    };
  }
}

/**
 * Creates Fastify onRequest hook plugin for process-local rate limiting.
 */
export function createRateLimiterHook(
  _environment: EnvironmentConfig,
  rateLimiterInstance?: RateLimiter,
) {
  const rateLimiter = rateLimiterInstance ?? new RateLimiter();

  return async function rateLimiterHook(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const ip = request.ip;
    const method = request.method;
    const rawUrl = request.raw.url ?? request.url;

    const result = rateLimiter.check(ip, method, rawUrl);

    if (result.limit !== Infinity) {
      reply.header("x-ratelimit-limit", String(result.limit));
      reply.header("x-ratelimit-remaining", String(result.remaining));
      reply.header("x-ratelimit-reset", String(result.resetEpochSeconds));
    }

    if (!result.allowed) {
      const retryAfter = result.retryAfterSeconds ?? 60;
      reply.header("retry-after", String(retryAfter));

      const message = result.isShedding
        ? "Traffic threshold exceeded. Please retry later."
        : "Too many requests. Please try again later.";

      if (result.isShedding) {
        request.log.warn(
          { ip, method, url: rawUrl, storeSize: rateLimiter.getStoreSize() },
          "RateLimiter capacity saturated (10000 active keys). Shedding untracked request.",
        );
      }

      await reply.status(429).send({
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message,
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      });
    }
  };
}
