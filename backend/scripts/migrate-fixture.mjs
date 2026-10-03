import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL } from "node:url";

const configuredUrl = process.env.PHASE1_TEST_DATABASE_URL;
if (!configuredUrl) {
  process.stderr.write(
    "PHASE1_TEST_DATABASE_URL is required; refusing to run the Phase 1 fixture migration.\n",
  );
  process.exit(2);
}

let databaseUrl;
try {
  databaseUrl = new URL(configuredUrl);
} catch {
  process.stderr.write("PHASE1_TEST_DATABASE_URL must be a valid URL.\n");
  process.exit(2);
}

if (
  !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
  databaseUrl.pathname !== "/giftedpro_phase1_test" ||
  process.env.APP_ENV === "production"
) {
  process.stderr.write(
    "Fixture migrations require a non-production PostgreSQL database named giftedpro_phase1_test.\n",
  );
  process.exit(2);
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  command,
  ["exec", "drizzle-kit", "migrate", "--config=drizzle.fixture.config.ts"],
  { stdio: "inherit", env: process.env },
);

if (result.error) {
  process.stderr.write(`Could not start Drizzle migration runner: ${result.error.name}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
