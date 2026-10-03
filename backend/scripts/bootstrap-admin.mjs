#!/usr/bin/env node
import process from "node:process";
import { parseArgs } from "node:util";
import pg from "pg";
import argon2 from "argon2";
import dotenv from "dotenv";

dotenv.config();

const options = {
  email: { type: "string" },
  password: { type: "string" },
};

const { values } = parseArgs({ options, allowPositionals: true, strict: false });

const email = values.email ?? process.env.ADMIN_BOOTSTRAP_EMAIL;
const password = values.password ?? process.env.ADMIN_BOOTSTRAP_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  process.stderr.write(
    JSON.stringify({
      level: "error",
      event: "bootstrap_admin_failed",
      error: "DATABASE_URL environment variable is required",
    }) + "\n",
  );
  process.exit(1);
}

if (!email || !password) {
  process.stderr.write(
    JSON.stringify({
      level: "error",
      event: "bootstrap_admin_failed",
      error: "Both email and password are required via CLI flags (--email, --password) or environment variables",
    }) + "\n",
  );
  process.exit(1);
}

if (password.length < 8) {
  process.stderr.write(
    JSON.stringify({
      level: "error",
      event: "bootstrap_admin_failed",
      error: "Password must be at least 8 characters long",
    }) + "\n",
  );
  process.exit(1);
}

async function run() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const normalizedEmail = email.toLowerCase().trim();

    const query = `
      INSERT INTO users (email, password_hash, role, status, email_verified_at, created_at, updated_at)
      VALUES ($1, $2, 'admin', 'active', now(), now(), now())
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = $2,
        role = 'admin',
        status = 'active',
        updated_at = now()
      RETURNING id, email, role, status;
    `;

    const result = await pool.query(query, [normalizedEmail, passwordHash]);
    const user = result.rows[0];

    process.stdout.write(
      JSON.stringify({
        level: "info",
        event: "bootstrap_admin_success",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      }) + "\n",
    );
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  process.stderr.write(
    JSON.stringify({
      level: "error",
      event: "bootstrap_admin_failed",
      error: err instanceof Error ? err.message : String(err),
    }) + "\n",
  );
  process.exit(1);
});
