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

function parseEmailFrom(env: NodeJS.ProcessEnv): string {
  const raw = env.EMAIL_FROM?.trim();
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

  if (rawEnvironment === "production" && emailProvider === "resend" && !resendApiKey) {
    throw new InvalidEnvironmentError(
      "RESEND_API_KEY",
      "is required in production when email provider is resend",
    );
  }

  return {
    appEnvironment: rawEnvironment,
    port: parseInteger(env, "PORT", 8000, 1, 65_535),
    databaseUrl,
    corsOrigins: parseOrigins(env, rawEnvironment),
    databasePoolMax: parseInteger(
      env,
      "DB_POOL_MAX",
      rawEnvironment === "production" ? undefined : DEFAULT_DEVELOPMENT_POOL_MAX,
      1,
      100,
    ),
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
    emailFrom: parseEmailFrom(env),
    emailProvider,
  };
}
