import { isIP } from "node:net";

export type AppEnvironment = "development" | "test" | "production";
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug";

export interface EnvironmentConfig {
  readonly appEnvironment: AppEnvironment;
  readonly port: number;
  readonly databaseUrl: string;
  readonly databasePoolMax: number;
  readonly corsOrigins: readonly string[];
  readonly trustedProxyCidrs: readonly string[];
  readonly requestBodyLimitBytes: number;
  readonly logLevel: LogLevel;
  readonly resendApiKey?: string;
  readonly emailFrom: string;
  readonly emailProvider: "resend" | "in_memory";
  readonly googleClientId?: string;
  readonly googleClientSecret?: string;
  readonly googleCallbackUrl: string;
  readonly frontendUrl: string;
  readonly emailOutboxEncryptionKey: string;
  readonly emailWorkerEnabled: boolean;
  readonly emailWorkerPollIntervalMs: number;
  readonly emailWorkerLeaseMs: number;
  readonly emailWorkerMaxAttempts: number;
  readonly emailWorkerBaseBackoffMs: number;
  readonly emailWorkerMaxBackoffMs: number;
  readonly emailWorkerJitterMs: number;
}

export class InvalidEnvironmentError extends Error {
  constructor(readonly variable: string, message: string) {
    super(`${variable}: ${message}`);
    this.name = "InvalidEnvironmentError";
  }
}

const DEFAULT_DEVELOPMENT_ORIGIN = "http://localhost:3000";
const DEFAULT_BODY_LIMIT_BYTES = 1_048_576;
const DEFAULT_DEVELOPMENT_POOL_MAX = 5;

function parseInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number | undefined,
  min: number,
  max: number,
): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === "") {
    if (fallback !== undefined) return fallback;
    throw new InvalidEnvironmentError(key, "is required");
  }

  if (!/^\d+$/.test(raw)) {
    throw new InvalidEnvironmentError(key, "must be a whole number");
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new InvalidEnvironmentError(key, `must be between ${min} and ${max}`);
  }
  return parsed;
}

function parseOrigins(
  env: NodeJS.ProcessEnv,
  appEnvironment: AppEnvironment,
): readonly string[] {
  const raw = env.CORS_ORIGINS;
  if (raw === undefined || raw.trim() === "") {
    if (appEnvironment === "production") {
      throw new InvalidEnvironmentError(
        "CORS_ORIGINS",
        "must list at least one trusted browser origin in production",
      );
    }
    return [DEFAULT_DEVELOPMENT_ORIGIN];
  }

  const origins = raw.split(",").map((origin) => origin.trim());
  if (origins.some((origin) => origin.length === 0)) {
    throw new InvalidEnvironmentError(
      "CORS_ORIGINS",
      "must be a comma-separated list without empty entries",
    );
  }

  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new InvalidEnvironmentError(
        "CORS_ORIGINS",
        "each origin must be an absolute HTTP or HTTPS origin",
      );
    }
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.origin !== origin
    ) {
      throw new InvalidEnvironmentError(
        "CORS_ORIGINS",
        "each value must contain only an HTTP or HTTPS origin",
      );
    }
  }
  return [...new Set(origins)];
}

function isValidCidr(value: string): boolean {
  const [address, prefix, extra] = value.split("/");
  if (extra !== undefined || address === undefined) return false;
  const addressType = isIP(address);
  if (addressType === 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;
  const prefixNumber = Number(prefix);
  return prefixNumber >= 0 && prefixNumber <= (addressType === 4 ? 32 : 128);
}

function parseTrustedProxyCidrs(env: NodeJS.ProcessEnv): readonly string[] {
  const raw = env.TRUSTED_PROXY_CIDRS;
  if (raw === undefined || raw.trim() === "") return [];

  const cidrs = raw.split(",").map((cidr) => cidr.trim());
  if (cidrs.some((cidr) => !isValidCidr(cidr))) {
    throw new InvalidEnvironmentError(
      "TRUSTED_PROXY_CIDRS",
      "must contain valid IP addresses or CIDR ranges; empty means trust no proxy",
    );
  }
  return [...new Set(cidrs)];
}

function parseLogLevel(value: string | undefined): LogLevel {
  const allowed: readonly LogLevel[] = ["fatal", "error", "warn", "info", "debug"];
  const level = value ?? "info";
  if (!allowed.includes(level as LogLevel)) {
    throw new InvalidEnvironmentError(
      "LOG_LEVEL",
      `must be one of ${allowed.join(", ")}`,
    );
  }
  return level as LogLevel;
}

function parseEmailFrom(
  env: NodeJS.ProcessEnv,
  appEnvironment: AppEnvironment,
): string {
  const raw = env.EMAIL_FROM?.trim();
  if (appEnvironment === "production") {
    if (!raw || raw.length === 0) {
      throw new InvalidEnvironmentError(
        "EMAIL_FROM",
        "is required in production and must specify a verified project-owned sending domain email",
      );
    }
    if (raw.toLowerCase().includes("@resend.dev")) {
      throw new InvalidEnvironmentError(
        "EMAIL_FROM",
        "cannot use development sender (@resend.dev) in production; configure a verified project-owned sending domain",
      );
    }
    return raw;
  }
  return raw && raw.length > 0 ? raw : "onboarding@resend.dev";
}

function parseEmailProvider(
  env: NodeJS.ProcessEnv,
): "resend" | "in_memory" {
  const explicit = env.EMAIL_PROVIDER?.trim();
  if (explicit === "resend" || explicit === "in_memory") {
    return explicit;
  }
  if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim().length > 0) {
    return "resend";
  }
  return "in_memory";
}

function parseAbsoluteUrl(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: string,
): string {
  const raw = env[key]?.trim();
  const candidate = raw && raw.length > 0 ? raw : fallback;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Protocol must be http or https");
    }
    return candidate;
  } catch {
    throw new InvalidEnvironmentError(
      key,
      "must be a valid absolute HTTP or HTTPS URL",
    );
  }
}

function parseFrontendUrl(
  env: NodeJS.ProcessEnv,
  appEnvironment: AppEnvironment,
  corsOrigins: readonly string[],
): string {
  const raw = env.FRONTEND_URL?.trim();

  // 1. Missing or empty handling
  if (!raw || raw.length === 0) {
    if (appEnvironment === "production") {
      throw new InvalidEnvironmentError(
        "FRONTEND_URL",
        "is required in production and must be a trusted HTTPS origin",
      );
    }
    return DEFAULT_DEVELOPMENT_ORIGIN;
  }

  // 2. Reject dangerous schemes or control characters
  if (
    /^(javascript|data|vbscript|file|about):/i.test(raw) ||
    raw.startsWith("//") ||
    raw.includes("\r") ||
    raw.includes("\n")
  ) {
    throw new InvalidEnvironmentError(
      "FRONTEND_URL",
      "contains an invalid or dangerous URL scheme or characters",
    );
  }

  // 3. Absolute URL parsing
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new InvalidEnvironmentError(
      "FRONTEND_URL",
      "must be a valid absolute HTTP or HTTPS URL",
    );
  }

  // 4. Scheme validation
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidEnvironmentError(
      "FRONTEND_URL",
      "protocol must be http: or https:",
    );
  }

  // 5. Reject credentials
  if (parsed.username || parsed.password) {
    throw new InvalidEnvironmentError(
      "FRONTEND_URL",
      "cannot contain username or password credentials",
    );
  }

  // 6. Reject query parameters and fragments
  if (parsed.search || parsed.hash) {
    throw new InvalidEnvironmentError(
      "FRONTEND_URL",
      "cannot contain query strings or URL fragments",
    );
  }

  // 7. Reject sub-paths (must be pure origin)
  if (parsed.pathname !== "" && parsed.pathname !== "/") {
    throw new InvalidEnvironmentError(
      "FRONTEND_URL",
      "must be an origin URL without sub-paths",
    );
  }

  // 8. Production security constraints
  if (appEnvironment === "production") {
    if (parsed.protocol !== "https:") {
      throw new InvalidEnvironmentError(
        "FRONTEND_URL",
        "must use HTTPS in production",
      );
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local")
    ) {
      throw new InvalidEnvironmentError(
        "FRONTEND_URL",
        "cannot point to localhost or loopback in production",
      );
    }

    if (!corsOrigins.includes(parsed.origin)) {
      throw new InvalidEnvironmentError(
        "FRONTEND_URL",
        `origin ${parsed.origin} must be included in CORS_ORIGINS in production`,
      );
    }
  }

  return parsed.origin;
}

const TEST_OUTBOX_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function parseOutboxEncryptionKey(
  env: NodeJS.ProcessEnv,
  appEnvironment: AppEnvironment,
): string {
  const raw = env.EMAIL_OUTBOX_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length === 0) {
    if (appEnvironment === "test") {
      return TEST_OUTBOX_ENCRYPTION_KEY;
    }
    throw new InvalidEnvironmentError(
      "EMAIL_OUTBOX_ENCRYPTION_KEY",
      `is required in ${appEnvironment}; must be a 64-character hexadecimal string (256-bit key)`,
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new InvalidEnvironmentError(
      "EMAIL_OUTBOX_ENCRYPTION_KEY",
      "must be exactly 64 hexadecimal characters (256-bit key)",
    );
  }

  return raw.toLowerCase();
}

function parseBoolean(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean,
): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new InvalidEnvironmentError(key, "must be a boolean (true or false)");
}

export function loadEnvironment(
  env: NodeJS.ProcessEnv,
): EnvironmentConfig {
  const rawEnvironment = env.APP_ENV ?? "development";
  if (
    rawEnvironment !== "development" &&
    rawEnvironment !== "test" &&
    rawEnvironment !== "production"
  ) {
    throw new InvalidEnvironmentError(
      "APP_ENV",
      "must be development, test, or production",
    );
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new InvalidEnvironmentError("DATABASE_URL", "is required");
  }
  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new InvalidEnvironmentError("DATABASE_URL", "must be a valid URL");
  }
  if (
    parsedDatabaseUrl.protocol !== "postgres:" &&
    parsedDatabaseUrl.protocol !== "postgresql:"
  ) {
    throw new InvalidEnvironmentError(
      "DATABASE_URL",
      "must use the PostgreSQL protocol",
    );
  }

  const emailProvider = parseEmailProvider(env);
  const resendApiKey = env.RESEND_API_KEY?.trim() || undefined;

  const googleClientId = env.GOOGLE_CLIENT_ID?.trim() || undefined;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim() || undefined;
  const googleCallbackUrl = parseAbsoluteUrl(
    env,
    "GOOGLE_CALLBACK_URL",
    "http://localhost:8000/api/v1/auth/google/callback",
  );

  if (rawEnvironment === "production") {
    if (googleClientId && !googleClientSecret) {
      throw new InvalidEnvironmentError(
        "GOOGLE_CLIENT_SECRET",
        "is required in production when GOOGLE_CLIENT_ID is provided",
      );
    }
    if (googleClientSecret && !googleClientId) {
      throw new InvalidEnvironmentError(
        "GOOGLE_CLIENT_ID",
        "is required in production when GOOGLE_CLIENT_SECRET is provided",
      );
    }
    if (googleClientId && !googleCallbackUrl.startsWith("https://")) {
      throw new InvalidEnvironmentError(
        "GOOGLE_CALLBACK_URL",
        "must use HTTPS in production",
      );
    }
  }

  const corsOrigins = parseOrigins(env, rawEnvironment);
  const databasePoolMax = parseInteger(
    env,
    "DB_POOL_MAX",
    rawEnvironment === "production" ? undefined : DEFAULT_DEVELOPMENT_POOL_MAX,
    1,
    100,
  );
  const frontendUrl = parseFrontendUrl(env, rawEnvironment, corsOrigins);
  const emailOutboxEncryptionKey = parseOutboxEncryptionKey(env, rawEnvironment);
  const emailFrom = parseEmailFrom(env, rawEnvironment);

  if (rawEnvironment === "production") {
    if (emailProvider === "in_memory") {
      throw new InvalidEnvironmentError(
        "EMAIL_PROVIDER",
        "cannot be 'in_memory' in production; must configure a valid email provider (resend)",
      );
    }
    if (emailProvider === "resend" && !resendApiKey) {
      throw new InvalidEnvironmentError(
        "RESEND_API_KEY",
        "is required in production when email provider is resend",
      );
    }
  }

  return {
    appEnvironment: rawEnvironment,
    port: parseInteger(env, "PORT", 8000, 1, 65_535),
    databaseUrl,
    corsOrigins,
    databasePoolMax,
    trustedProxyCidrs: parseTrustedProxyCidrs(env),
    requestBodyLimitBytes: parseInteger(
      env,
      "REQUEST_BODY_LIMIT_BYTES",
      DEFAULT_BODY_LIMIT_BYTES,
      1_024,
      10_485_760,
    ),
    logLevel: parseLogLevel(env.LOG_LEVEL),
    resendApiKey,
    emailFrom,
    emailProvider,
    googleClientId,
    googleClientSecret,
    googleCallbackUrl,
    frontendUrl,
    emailOutboxEncryptionKey,
    emailWorkerEnabled: parseBoolean(
      env,
      "EMAIL_WORKER_ENABLED",
      rawEnvironment !== "test",
    ),
    emailWorkerPollIntervalMs: parseInteger(
      env,
      "EMAIL_WORKER_POLL_INTERVAL_MS",
      2000,
      100,
      60_000,
    ),
    emailWorkerLeaseMs: parseInteger(
      env,
      "EMAIL_WORKER_LEASE_MS",
      300_000,
      5_000,
      1_800_000,
    ),
    emailWorkerMaxAttempts: parseInteger(
      env,
      "EMAIL_WORKER_MAX_ATTEMPTS",
      5,
      1,
      20,
    ),
    emailWorkerBaseBackoffMs: parseInteger(
      env,
      "EMAIL_WORKER_BASE_BACKOFF_MS",
      2000,
      500,
      60_000,
    ),
    emailWorkerMaxBackoffMs: parseInteger(
      env,
      "EMAIL_WORKER_MAX_BACKOFF_MS",
      60_000,
      1000,
      600_000,
    ),
    emailWorkerJitterMs: parseInteger(
      env,
      "EMAIL_WORKER_JITTER_MS",
      500,
      0,
      5000,
    ),
  };
}
