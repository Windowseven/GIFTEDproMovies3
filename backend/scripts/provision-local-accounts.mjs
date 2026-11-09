#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import argon2 from "argon2";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
dotenv.config({ path: join(backendRoot, ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("DATABASE_URL is not set in backend/.env\n");
  process.exit(1);
}

const parsedUrl = new URL(databaseUrl);
if (process.env.APP_ENV === "production") {
  process.stderr.write("Refusing to provision test accounts in production environment.\n");
  process.exit(1);
}
if (parsedUrl.pathname === "/giftedpro_phase1_test") {
  process.stderr.write("Refusing to provision persistent development accounts in disposable test database.\n");
  process.exit(1);
}
if (parsedUrl.pathname !== "/giftedpro_dev") {
  process.stderr.write(`Target database must be giftedpro_dev, but got: ${parsedUrl.pathname}\n`);
  process.exit(1);
}

const argonOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

function generatePassword(role) {
  // 24 characters of cryptographically secure random characters with upper, lower, digits, symbols
  const bytes = randomBytes(16).toString("base64url");
  return `GPM#${role}_${bytes}!`;
}

async function run() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const dbIdentity = await pool.query("SELECT current_database() AS db_name");
    if (dbIdentity.rows[0]?.db_name !== "giftedpro_dev") {
      throw new Error(`Connected database is not giftedpro_dev: ${dbIdentity.rows[0]?.db_name}`);
    }

    const accounts = [
      {
        role: "customer",
        email: "tester@giftedpromovies.com",
        password: generatePassword("cust"),
        capabilities: [],
      },
      {
        role: "media_team",
        email: "media@giftedpromovies.com",
        password: generatePassword("media"),
        capabilities: ["MEDIA_PREVIEW", "CONTENT_UPLOAD", "CONTENT_CREATE", "CONTENT_EDIT"],
      },
      {
        role: "admin",
        email: "admin@giftedpromovies.com",
        password: generatePassword("admin"),
        capabilities: [],
      },
    ];

    const results = [];

    for (const acc of accounts) {
      const hash = await argon2.hash(acc.password, argonOptions);

      // Upsert user
      const userRes = await pool.query(
        `INSERT INTO users (email, password_hash, role, status, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'active', NOW(), NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET
           password_hash = $2,
           role = $3,
           status = 'active',
           email_verified_at = COALESCE(users.email_verified_at, NOW()),
           updated_at = NOW()
         RETURNING id, email, role, status, email_verified_at`,
        [acc.email, hash, acc.role],
      );

      const user = userRes.rows[0];

      // Insert capabilities if any
      if (acc.capabilities.length > 0) {
        for (const cap of acc.capabilities) {
          await pool.query(
            `INSERT INTO user_capabilities (user_id, capability, created_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, capability) DO NOTHING`,
            [user.id, cap],
          );
        }
      }

      results.push({
        id: user.id,
        role: user.role,
        email: user.email,
        password: acc.password,
        capabilities: acc.capabilities,
      });
    }

    // Save to gitignored credentials file
    const credsPath = join(backendRoot, ".local-test-credentials.json");
    await writeFile(
      credsPath,
      JSON.stringify(
        {
          environment: "local-development",
          database: "giftedpro_dev",
          generatedAt: new Date().toISOString(),
          accounts: results.map((r) => ({
            id: r.id,
            role: r.role,
            email: r.email,
            password: r.password,
            capabilities: r.capabilities,
          })),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );

    process.stdout.write(
      JSON.stringify(
        {
          status: "SUCCESS",
          message: "Local development test accounts provisioned successfully.",
          credentialsFile: credsPath,
          accounts: results.map((r) => ({
            id: r.id,
            role: r.role,
            email: r.email,
            password: r.password,
            capabilities: r.capabilities,
          })),
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  process.stderr.write(`Provisioning failed: ${err.message}\n`);
  process.exit(1);
});
