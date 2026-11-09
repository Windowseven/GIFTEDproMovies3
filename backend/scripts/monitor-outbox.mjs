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

// Operational thresholds
const MAX_FAILED_THRESHOLD = 5;
const MAX_BACKLOG_THRESHOLD = 50;
const MAX_AGE_SECONDS_THRESHOLD = 300; // 5 minutes

async function monitorOutbox() {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    const summaryRes = await pool.query(`
      SELECT 
        status, 
        COUNT(*)::int AS count 
      FROM email_outbox 
      GROUP BY status
    `);

    const counts = {
      pending: 0,
      processing: 0,
      provider_accepted: 0,
      failed: 0,
      expired: 0,
      cancelled: 0,
    };

    for (const row of summaryRes.rows) {
      if (row.status in counts) {
        counts[row.status] = row.count;
      }
    }

    // Check oldest pending job
    const oldestPendingRes = await pool.query(`
      SELECT 
        EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age_seconds
      FROM email_outbox
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `);

    const oldestAgeSeconds = oldestPendingRes.rows[0]?.age_seconds ?? 0;

    const isFailedBreached = counts.failed > MAX_FAILED_THRESHOLD;
    const isBacklogBreached = counts.pending > MAX_BACKLOG_THRESHOLD;
    const isAgeBreached = oldestAgeSeconds > MAX_AGE_SECONDS_THRESHOLD;

    const isHealthy = !isFailedBreached && !isBacklogBreached && !isAgeBreached;

    const report = {
      timestamp: new Date().toISOString(),
      status: isHealthy ? "HEALTHY" : "ALERT",
      thresholds: {
        maxFailedAllowed: MAX_FAILED_THRESHOLD,
        maxBacklogAllowed: MAX_BACKLOG_THRESHOLD,
        maxAgeSecondsAllowed: MAX_AGE_SECONDS_THRESHOLD,
      },
      metrics: {
        failedJobs: counts.failed,
        pendingBacklog: counts.pending,
        processingJobs: counts.processing,
        acceptedJobs: counts.provider_accepted,
        oldestPendingAgeSeconds: oldestAgeSeconds,
      },
      breaches: {
        failedThresholdBreached: isFailedBreached,
        backlogThresholdBreached: isBacklogBreached,
        ageThresholdBreached: isAgeBreached,
      },
    };

    process.stdout.write(JSON.stringify(report, null, 2) + "\n");

    if (!isHealthy) {
      process.stderr.write(
        `\n[OPERATIONAL ALERT] Email Outbox Threshold Breached! Failed: ${counts.failed}/${MAX_FAILED_THRESHOLD}, Backlog: ${counts.pending}/${MAX_BACKLOG_THRESHOLD}\n`
      );
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    process.stderr.write(`Monitoring probe failed: ${err.message}\n`);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

monitorOutbox();
