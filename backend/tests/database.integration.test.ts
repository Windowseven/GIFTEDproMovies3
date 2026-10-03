import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const configuredUrl = process.env.PHASE1_TEST_DATABASE_URL;

test(
  "PostgreSQL fixture migration applies repeatably and supports basic typed database access",
  { skip: configuredUrl === undefined ? "PHASE1_TEST_DATABASE_URL is not configured" : false },
  async () => {
    assert.ok(configuredUrl);
    const url = new URL(configuredUrl);
    assert.equal(url.protocol === "postgres:" || url.protocol === "postgresql:", true);
    assert.equal(
      url.pathname,
      "/giftedpro_phase1_test",
      "the integration test may only use the explicitly named disposable database",
    );
    assert.notEqual(process.env.APP_ENV, "production");

    const pool = new Pool({
      connectionString: configuredUrl,
      max: 2,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
    });

    try {
      const connected = await pool.query<{ database_name: string }>(
        "SELECT current_database() AS database_name",
      );
      assert.equal(connected.rows[0]?.database_name, "giftedpro_phase1_test");

      const database = drizzle(pool);
      const migrationsFolder = join(
        dirname(fileURLToPath(import.meta.url)),
        "fixtures/migrations",
      );
      await migrate(database, { migrationsFolder });
      await migrate(database, { migrationsFolder });

      const marker = `phase1-${randomUUID()}`;
      const inserted = await pool.query<{ id: number; marker: string }>(
        "INSERT INTO phase1_migration_probe (marker) VALUES ($1) RETURNING id, marker",
        [marker],
      );
      assert.equal(inserted.rows[0]?.marker, marker);
      assert.ok(Number.isInteger(inserted.rows[0]?.id));
      await pool.query("DELETE FROM phase1_migration_probe WHERE id = $1", [
        inserted.rows[0]?.id,
      ]);
    } finally {
      await pool.end();
    }
  },
);
