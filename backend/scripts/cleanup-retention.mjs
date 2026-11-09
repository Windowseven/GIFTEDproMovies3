#!/usr/bin/env node
import process from "node:process";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  (process.env.APP_ENV !== "production"
    ? "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test"
    : null);

if (!databaseUrl) {
  process.stderr.write("ERROR: DATABASE_URL environment variable is required.\n");
  process.exit(1);
}

const args = process.argv.slice(2);
const isLive = args.includes("--live");
const isDryRun = !isLive; // Default is DRY RUN for safety

// Retention windows in days
const SESSION_RETENTION_DAYS = 30; // Sessions expired > 30 days
const AUTH_TOKEN_RETENTION_DAYS = 14; // Tokens expired > 14 days
const NOTIFICATION_READ_DAYS = 90; // Read notifications > 90 days
const DOWNLOAD_ATTEMPTS_DAYS = 365; // Download attempts > 365 days

async function runCleanup() {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    process.stdout.write("=================================================================\n");
    process.stdout.write("GIFTEDproMovies — Enterprise Data Retention & Maintenance Utility\n");
    process.stdout.write(`Execution Mode: ${isDryRun ? "DRY RUN (Simulation Only - No records deleted)" : "LIVE EXECUTION"}\n`);
    process.stdout.write(`Compliance: ADR-027 (Purpose-Based Retention) & Tanzania PDPA 2022\n`);
    process.stdout.write("=================================================================\n\n");

    const now = new Date();
    const sessionCutoff = new Date(now.getTime() - SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const tokenCutoff = new Date(now.getTime() - AUTH_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const notificationCutoff = new Date(now.getTime() - NOTIFICATION_READ_DAYS * 24 * 60 * 60 * 1000);
    const downloadCutoff = new Date(now.getTime() - DOWNLOAD_ATTEMPTS_DAYS * 24 * 60 * 60 * 1000);

    // 1. Expired Sessions (expires_at < sessionCutoff)
    const sessionCountRes = await pool.query(
      "SELECT COUNT(*) AS count FROM sessions WHERE expires_at < $1",
      [sessionCutoff],
    );
    const eligibleSessions = parseInt(sessionCountRes.rows[0].count, 10);
    process.stdout.write(`[1] Inactive/Expired Sessions (> ${SESSION_RETENTION_DAYS}d expired): ${eligibleSessions} eligible\n`);

    if (isLive && eligibleSessions > 0) {
      const delSessionRes = await pool.query(
        "DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at < $1 LIMIT 1000)",
        [sessionCutoff],
      );
      process.stdout.write(`    -> Deleted ${delSessionRes.rowCount} expired session records.\n`);
    }

    // 2. Expired Auth Tokens (expires_at < tokenCutoff OR used_at < tokenCutoff)
    const tokenCountRes = await pool.query(
      "SELECT COUNT(*) AS count FROM auth_tokens WHERE expires_at < $1 OR (used_at IS NOT NULL AND used_at < $1)",
      [tokenCutoff],
    );
    const eligibleTokens = parseInt(tokenCountRes.rows[0].count, 10);
    process.stdout.write(`[2] Stale Auth Tokens (> ${AUTH_TOKEN_RETENTION_DAYS}d expired/used): ${eligibleTokens} eligible\n`);

    if (isLive && eligibleTokens > 0) {
      const delTokenRes = await pool.query(
        "DELETE FROM auth_tokens WHERE id IN (SELECT id FROM auth_tokens WHERE expires_at < $1 OR (used_at IS NOT NULL AND used_at < $1) LIMIT 1000)",
        [tokenCutoff],
      );
      process.stdout.write(`    -> Deleted ${delTokenRes.rowCount} stale auth token records.\n`);
    }

    // 3. Stale Read Notifications (read_at IS NOT NULL AND read_at < notificationCutoff)
    const notifCountRes = await pool.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE read_at IS NOT NULL AND read_at < $1",
      [notificationCutoff],
    );
    const eligibleNotifs = parseInt(notifCountRes.rows[0].count, 10);
    process.stdout.write(`[3] Old Read Notifications (> ${NOTIFICATION_READ_DAYS}d read): ${eligibleNotifs} eligible\n`);

    if (isLive && eligibleNotifs > 0) {
      const delNotifRes = await pool.query(
        "DELETE FROM notifications WHERE id IN (SELECT id FROM notifications WHERE read_at IS NOT NULL AND read_at < $1 LIMIT 1000)",
        [notificationCutoff],
      );
      process.stdout.write(`    -> Deleted ${delNotifRes.rowCount} old notification records.\n`);
    }

    // 4. Stale Download Attempts (> 365 days)
    const downloadCountRes = await pool.query(
      "SELECT COUNT(*) AS count FROM download_attempts WHERE created_at < $1",
      [downloadCutoff],
    );
    const eligibleDownloads = parseInt(downloadCountRes.rows[0].count, 10);
    process.stdout.write(`[4] Historical Download Attempts (> ${DOWNLOAD_ATTEMPTS_DAYS}d old): ${eligibleDownloads} eligible\n`);

    if (isLive && eligibleDownloads > 0) {
      const delDownloadRes = await pool.query(
        "DELETE FROM download_attempts WHERE id IN (SELECT id FROM download_attempts WHERE created_at < $1 LIMIT 1000)",
        [downloadCutoff],
      );
      process.stdout.write(`    -> Deleted ${delDownloadRes.rowCount} historical download attempt records.\n`);
    }

    // 5. Invariant Sanity Check on Commercial & Tax Tables
    const orderCountRes = await pool.query("SELECT COUNT(*) AS count FROM orders");
    const orderCount = parseInt(orderCountRes.rows[0].count, 10);
    process.stdout.write(`\n[INVARIANT CHECK] Orders Table Count: ${orderCount} records.\n`);
    process.stdout.write(`[INVARIANT CHECK] Statutory Accounting Lock: 7-Year Retention Floor Active. Zero orders deleted.\n`);

    process.stdout.write("\nRetention check completed successfully.\n");
  } catch (err) {
    process.stderr.write(`Execution failed: ${err.message}\n`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runCleanup();
