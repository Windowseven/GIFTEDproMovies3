import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./tests/fixtures/migration-schema.ts",
  out: "./tests/fixtures/migrations",
  dbCredentials: {
    // Generation uses the source schema only. The migration runner refuses to
    // use this local-only URL; execution requires an explicit disposable test DB.
    url:
      process.env.PHASE1_TEST_DATABASE_URL ??
      "postgresql://phase1:phase1@127.0.0.1:5432/giftedpro_phase1_test",
  },
});
