# GIFTEDproMovies3 — Database Backup, Point-in-Time Recovery, and Disaster Recovery Runbook

> **Document ID:** RUNBOOK-OPS-001  
> **Classification:** Operational Runbook  
> **Status:** ACTIVE  
> **Governing Specifications:** ARCH-014 §10, ARCH-017 §318, ARCH-002, ARCH-010 §20–22  
> **Target Recovery Objectives:** RPO < 15 minutes, RTO < 30 minutes  

---

## 1. Executive Summary & Governance

This operational runbook defines the standard operating procedures (SOP) for PostgreSQL backups, continuous WAL archiving, point-in-time recovery (PITR), isolated non-production disaster recovery drills, and RPO/RTO verification for GIFTEDproMovies3.

### Production Exit-Gate Distinction & Human-Intervention Gate
Per `MASTER_REMEDIATION_CHECKLIST.md` and `ARCH-014 §10`:
- **Code & Test Status:** Application schema, transactional durability, write-ahead locking, auditable supersession, and download accounting are fully implemented and verified in software tests.
- **Operational Reality Gate (Human Intervention Required):** Formal exit gate certification for Phase 8 Operations **cannot be claimed autonomously by an AI agent or test runner**. It strictly requires human operations personnel to:
  1. Provision production cloud infrastructure and dedicated backup storage (S3/GCS/R2).
  2. Configure production WAL streaming and encryption key management (KMS).
  3. Execute a physical restore drill against an isolated staging environment using production-equivalent datasets.
  4. Measure and sign off on empirical RPO and RTO metrics.

---

## 2. Recovery Objectives Definition

| Metric | Target | Definition | Verification Method |
| :--- | :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **< 15 minutes** | Maximum allowable data loss window prior to incident | WAL archive interval + continuous WAL streaming latency |
| **RTO (Recovery Time Objective)** | **< 30 minutes** | Maximum elapsed duration from disaster declaration to service restoration | Timed restore execution drill on staging cluster |

### RPO & RTO Mathematical Formulations

$$\text{RPO} = t_{\text{disaster}} - t_{\text{last\_archived\_wal}}$$

Where:
- $t_{\text{disaster}}$ is the exact UTC timestamp of primary database unavailability.
- $t_{\text{last\_archived\_wal}}$ is the UTC timestamp of the latest successfully committed WAL segment transferred to offsite immutable storage.
- Continuous WAL streaming with `archive_timeout = 300s` guarantees:
  $$\text{RPO}_{\text{max}} = 300\text{ seconds} + \text{network upload latency} \le 15\text{ minutes (target)}$$

$$\text{RTO} = t_{\text{service\_ready}} - t_{\text{incident\_declared}}$$

Where:
- $t_{\text{incident\_declared}}$ is the moment recovery is triggered.
- $t_{\text{service\_ready}}$ is when the recovery PostgreSQL cluster completes WAL replay, passes application health checks (`/api/v1/health`), and accepts authenticated traffic.
- $\text{RTO}$ breakdown:
  $$\text{RTO} = T_{\text{provision}} + T_{\text{fetch\_base\_backup}} + T_{\text{replay\_wal}} + T_{\text{health\_check}} \le 30\text{ minutes (target)}$$

---

## 3. PostgreSQL Backup Architecture & Policy

### 3.1 Primary Backup Storage Architecture
- **Base Backups:** Daily full physical backups using `pg_basebackup` (compressed with zstd, encrypted at rest via AES-256-GCM / KMS).
- **WAL Archiving:** Continuous streaming of Write-Ahead Logs (WAL) to an independent, geographically separate object bucket with Object Lock (WORM policy enabled for 30 days).
- **Retention Schedule:**
  - Base backups retained for 30 days.
  - WAL segments retained for 35 days (allowing PITR to any second within the past 30 days).

### 3.2 Required PostgreSQL Server Configuration (`postgresql.conf`)
```ini
# WAL & Archiving Configuration
wal_level = replica
archive_mode = on
archive_command = 'wal-g wal-push %p'
archive_timeout = 300               # Forces WAL rotation every 5 minutes to guarantee RPO < 15m
max_wal_senders = 10
checkpoint_completion_target = 0.9
```

---

## 4. Disaster Recovery Procedure: Point-in-Time Recovery (PITR)

### Step 1: Incident Assessment & Freeze
1. Declare incident and record $t_{\text{incident\_declared}}$.
2. Terminate any runaway or compromised application connections to prevent split-brain:
   ```bash
   # Terminate existing backend application pods
   kubectl scale deployment backend-api --replicas=0 -n production
   ```

### Step 2: Provision Isolated Recovery Target
Create a fresh, isolated compute instance / Kubernetes namespace with identical PostgreSQL version (v18+). Never restore over an active production cluster.

### Step 3: Fetch and Extract Latest Base Backup
```bash
# Export recovery credentials securely (from operational secrets vault)
export WALE_S3_PREFIX="s3://giftedpro-backups-immutable/wal"
export AWS_ACCESS_KEY_ID="${BACKUP_RO_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${BACKUP_RO_SECRET_KEY}"

# Stop PostgreSQL service on target
sudo systemctl stop postgresql

# Clean data directory
rm -rf /var/lib/postgresql/data/*

# Fetch latest base backup prior to target recovery time
wal-g backup-fetch /var/lib/postgresql/data LATEST
```

### Step 4: Configure Recovery Signal & Target Time
Create `/var/lib/postgresql/data/recovery.signal` and append recovery parameters to `postgresql.conf` (or `postgresql.auto.conf`):
```ini
restore_command = 'wal-g wal-fetch %f %p'
recovery_target_time = '2026-10-29 01:00:00+00' # Exact UTC disaster timestamp
recovery_target_action = 'promote'
```

### Step 5: Start Database and Monitor Replay
```bash
# Set appropriate file ownership
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data

# Start PostgreSQL service
sudo systemctl start postgresql

# Monitor replay progress
tail -f /var/log/postgresql/postgresql-18-main.log
```
Look for:
`LOG: archive recovery complete`
`LOG: database system was not properly shut down; automatic recovery in progress`
`LOG: redo starts at ...`
`LOG: recovery stopping at restore point ...`
`LOG: database system is ready to accept connections`

---

## 5. Post-Restore Data Integrity Verification Checklist

Before redirecting traffic to the recovered database, execute this automated verification script:

```sql
-- 1. Verify schema migration version matches codebase expectation (migration 0013)
SELECT id, hash, created_at FROM "__drizzle_migrations" ORDER BY id DESC LIMIT 5;

-- 2. Verify frozen historical migrations integrity (0000 - 0012)
SELECT COUNT(*) = 14 as migrations_complete FROM "__drizzle_migrations";

-- 3. Verify user and administrative access invariants
SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active';

-- 4. Verify financial consistency: orders vs entitlement order effects
SELECT 
  COUNT(o.id) as paid_orders_count,
  COUNT(eoe.id) as entitlement_effects_count
FROM orders o
LEFT JOIN entitlement_order_effects eoe ON eoe.order_id = o.id
WHERE o.status = 'PAID';

-- 5. Verify Model B supersession triggers are intact and active
SELECT tgname, tgenabled, relname 
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE tgname IN ('trg_movie_editions_supersession_guard', 'trg_episodes_supersession_guard');

-- 6. Verify download attempts ledger integrity
SELECT status, COUNT(*) FROM download_attempts GROUP BY status;
```

---

## 6. Periodic Exercise Cadence & Compliance Gate

| Cadence | Exercise Description | Responsible Party | Verification Artifact |
| :--- | :--- | :--- | :--- |
| **Weekly** | Automated backup creation and integrity hash check | DevOps / Automation | S3 CloudWatch Metric / Alert |
| **Monthly** | Non-production isolated restore drill & schema check | Lead Systems Engineer | Staging PITR log & checklist |
| **Quarterly** | End-to-end full failover exercise with RPO/RTO timing | Lead Architect & SecOps | Signed DR Drill Report |

---

## 7. Sign-off and Human Gate Acceptance Block

> [!WARNING]
> This runbook documents the complete technical requirements and operational procedure. Phase 8 Operational Exit Gate is **NOT certified** until an operational engineer completes Section 4 and Section 5 against actual production cloud infrastructure and attaches the execution log below.

- **DR Drill Date:** `[PENDING OPERATIONAL DRILL]`
- **Measured RPO:** `[PENDING MEASUREMENT]`
- **Measured RTO:** `[PENDING MEASUREMENT]`
- **Operations Engineer Sign-off:** `[PENDING HUMAN SIGN-OFF]`
