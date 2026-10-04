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
const isDryRun = args.includes("--dry-run");
const daysArg = args.find((a) => a.startsWith("--days="));
const retentionDays = daysArg ? parseInt(daysArg.split("=")[1], 10) : 30;

const includeFailedArg = args.find((a) => a.startsWith("--include-failed-older-than-days="));
const failedRetentionDays = includeFailedArg ? parseInt(includeFailedArg.split("=")[1], 10) : null;

if (isNaN(retentionDays) || retentionDays < 1) {
  process.stderr.write("ERROR: --days must be a positive integer.\n");
  process.exit(1);
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    process.stdout.write("===================================================\n");
    process.stdout.write("GIFTEDproMovies — Outbox Retention Maintenance\n");
    process.stdout.write(`Mode: ${isDryRun ? "DRY RUN (no deletions)" : "LIVE EXECUTION"}\n`);
    process.stdout.write(`Retention Window (Accepted / Expired / Cancelled): ${retentionDays} days\n`);
    process.stdout.write(`Failed Jobs Retention: ${failedRetentionDays ? `${failedRetentionDays} days` : "RETAINED (indefinite audit preservation)"}\n`);
    process.stdout.write("===================================================\n\n");

    const cutoffAccepted = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // 1. Accepted jobs
    const countAcceptedResult = await pool.query(
      "SELECT COUNT(*) AS count FROM email_outbox WHERE status = 'provider_accepted' AND completed_at < $1",
      [cutoffAccepted],
    );
    const countAccepted = parseInt(countAcceptedResult.rows[0].count, 10);

    // 2. Expired or cancelled jobs
    const countExpiredResult = await pool.query(
      "SELECT COUNT(*) AS count FROM email_outbox WHERE status IN ('expired', 'cancelled') AND updated_at < $1",
      [cutoffAccepted],
    );
    const countExpired = parseInt(countExpiredResult.rows[0].count, 10);

    // 3. Failed jobs summary
    const countFailedResult = await pool.query(
      "SELECT COUNT(*) AS count FROM email_outbox WHERE status = 'failed'",
    );
    const countFailed = parseInt(countFailedResult.rows[0].count, 10);

    process.stdout.write(`Found ${countAccepted} historical 'provider_accepted' jobs older than ${retentionDays} days.\n`);
    process.stdout.write(`Found ${countExpired} superseded 'expired'/'cancelled' jobs older than ${retentionDays} days.\n`);
    process.stdout.write(`Found ${countFailed} total 'failed' jobs currently preserved in outbox.\n\n`);

    if (isDryRun) {
      process.stdout.write("DRY RUN completed. Zero rows deleted.\n");
    } else {
      let deletedAccepted = 0;
      let deletedExpired = 0;
      let deletedFailed = 0;

      if (countAccepted > 0) {
        const delRes = await pool.query(
          "DELETE FROM email_outbox WHERE status = 'provider_accepted' AND completed_at < $1",
          [cutoffAccepted],
        );
        deletedAccepted = delRes.rowCount || 0;
      }

      if (countExpired > 0) {
        const delRes = await pool.query(
          "DELETE FROM email_outbox WHERE status IN ('expired', 'cancelled') AND updated_at < $1",
          [cutoffAccepted],
        );
        deletedExpired = delRes.rowCount || 0;
      }

      if (failedRetentionDays && failedRetentionDays > 0) {
        const cutoffFailed = new Date(Date.now() - failedRetentionDays * 24 * 60 * 60 * 1000);
        const delRes = await pool.query(
          "DELETE FROM email_outbox WHERE status = 'failed' AND updated_at < $1",
          [cutoffFailed],
        );
        deletedFailed = delRes.rowCount || 0;
      }

      process.stdout.write(`✓ Successfully purged ${deletedAccepted} 'provider_accepted' records.\n`);
      process.stdout.write(`✓ Successfully purged ${deletedExpired} 'expired'/'cancelled' records.\n`);
      if (failedRetentionDays) {
        process.stdout.write(`✓ Purged ${deletedFailed} 'failed' records older than ${failedRetentionDays} days.\n`);
      } else {
        process.stdout.write(`ℹ Preserved all ${countFailed} 'failed' records for ongoing audit & incident investigation.\n`);
      }
    }

    process.stdout.write("===================================================\n");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal error during outbox maintenance: ${err.message}\n`);
  process.exit(1);
});
