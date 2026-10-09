import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import pg from "pg";
import { URL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const backendDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const compiledTestsDirectory = join(backendDirectory, ".test-dist", "tests");
const defaultDatabaseUrl =
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";
const databaseTestFiles = new Set([
  "auth-phase3-integration.test.js",
  "catalog-concurrency.test.js",
  "catalog-database.integration.test.js",
  "catalog-functional-verification.test.js",
  "catalog-polymorphic-domain.integration.test.js",
  "catalog-security-attacks.test.js",
  "catalog-stage4-adversarial.test.js",
  "commercial-runtime.test.js",
  "database.integration.test.js",
  "google-auth-http.integration.test.js",
  "orders-concurrency.test.js",
  "orders-runtime.test.js",
]);


function getTestDatabaseUrl() {
  if (process.env.APP_ENV === "production") {
    throw new Error("Refusing to run tests while APP_ENV is production.");
  }

  const configuredUrl =
    process.env.PHASE1_TEST_DATABASE_URL ?? defaultDatabaseUrl;
  const url = new URL(configuredUrl);
  const host = url.hostname.replace(/^\[|\]$/g, "");

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.pathname !== "/giftedpro_phase1_test" ||
    !["localhost", "127.0.0.1", "::1"].includes(host)
  ) {
    throw new Error(
      "Test database resets require a loopback PostgreSQL URL for giftedpro_phase1_test via PHASE1_TEST_DATABASE_URL.",
    );
  }

  return url.toString();
}

async function resetTestDatabase(databaseUrl, applyMigrations) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const identity = await pool.query(
      "SELECT current_database() AS database_name",
    );
    if (identity.rows[0]?.database_name !== "giftedpro_phase1_test") {
      throw new Error("Connected database is not the approved test database.");
    }

    await pool.query("DROP SCHEMA public CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.query("CREATE SCHEMA public AUTHORIZATION CURRENT_USER");
  } finally {
    await pool.end();
  }

  if (applyMigrations) {
    const env = {
      ...process.env,
      APP_ENV: "test",
      DATABASE_URL: databaseUrl,
      PHASE1_TEST_DATABASE_URL: databaseUrl,
    };
    const result = await runProcess(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["exec", "drizzle-kit", "migrate", "--config=drizzle.config.ts"],
      { cwd: backendDirectory, env, stdio: "inherit" },
    );
    if (result !== 0) {
      throw new Error(`Drizzle migrations failed with exit code ${result}.`);
    }
  }
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    const forwardSignal = (signal) => child.kill(signal);
    const onInterrupt = () => forwardSignal("SIGINT");
    const onTerminate = () => forwardSignal("SIGTERM");
    process.once("SIGINT", onInterrupt);
    process.once("SIGTERM", onTerminate);

    child.once("error", (error) => {
      process.removeListener("SIGINT", onInterrupt);
      process.removeListener("SIGTERM", onTerminate);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      process.removeListener("SIGINT", onInterrupt);
      process.removeListener("SIGTERM", onTerminate);
      resolve(signal ? 1 : (code ?? 1));
    });
  });
}

async function main() {
  const databaseUrl = getTestDatabaseUrl();
  const availableFiles = (await readdir(compiledTestsDirectory))
    .filter((file) => file.endsWith(".test.js"))
    .sort();
  const requestedFiles = process.argv.slice(2);

  if (
    requestedFiles.some(
      (file) =>
        file !== file.split(/[\\/]/).at(-1) ||
        !availableFiles.includes(file),
    )
  ) {
    throw new Error(
      `Pass test file names from ${compiledTestsDirectory}; unknown test file requested.`,
    );
  }

  const testFiles = requestedFiles.length > 0 ? requestedFiles : availableFiles;
  const env = {
    ...process.env,
    APP_ENV: "test",
    DATABASE_URL: databaseUrl,
    PHASE1_TEST_DATABASE_URL: databaseUrl,
  };
  let failures = 0;

  for (const file of testFiles) {
    const needsDatabase = databaseTestFiles.has(file);
    const hasApplicationSchema = needsDatabase && file !== "database.integration.test.js";
    try {
      if (needsDatabase) {
        process.stdout.write(`\n[test-db] Resetting PostgreSQL state for ${file}\n`);
        await resetTestDatabase(databaseUrl, hasApplicationSchema);
      }

      const exitCode = await runProcess(
        process.execPath,
        ["--test", "--test-concurrency=1", join(compiledTestsDirectory, file)],
        { cwd: backendDirectory, env, stdio: "inherit" },
      );
      if (exitCode !== 0) {
        failures += 1;
      }
    } finally {
      if (needsDatabase) {
        await resetTestDatabase(databaseUrl, false);
      }
    }
  }

  if (failures > 0) {
    process.stderr.write(`\n${failures} test file(s) failed.\n`);
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `Test runner failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
