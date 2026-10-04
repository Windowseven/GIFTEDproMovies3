# GIFTEDproMovies — Email Outbox & Delivery Operations Runbook

> **Authoritative Operational Reference**  
> **Phase:** Phase 2 Email Delivery & Verification Hardening  
> **Last Updated:** 2026-10-04  
> **Component:** PostgreSQL Transactional Outbox + Background Worker (`EmailOutboxWorker`)  

---

## 1. Production Resend Sending Domain Setup

### Overview
The GIFTEDproMovies backend separates email configuration strictly by environment:
- **Development & Test**: Defaults to `EMAIL_FROM=onboarding@resend.dev` (requires verified test recipient in Resend free tier).
- **Production**: Strictly requires a verified project-owned domain (e.g. `mail.giftedpromovies.com` or `giftedpromovies.com`). Fails closed at bootstrap if `EMAIL_FROM` is missing or points to `@resend.dev`.

### DNS & Resend Configuration Steps
To prepare a custom production sending domain:

1. **Add Domain in Resend Dashboard**:
   - Navigate to **Resend Console → Domains → Add Domain**.
   - Recommended sending subdomain: `mail.giftedpromovies.com` (or root `giftedpromovies.com`).
   - Region: Select region closest to primary database and backend cluster.

2. **Publish Required DNS Records**:
   Configure the following DNS records at your DNS registrar/provider (Cloudflare, Route53, Namecheap, etc.):
   
   | Type | Host / Name | Target / Value | Priority / TTL | Purpose |
   | :--- | :--- | :--- | :--- | :--- |
   | **TXT** | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...` | Auto / 300 | DKIM Public Key |
   | **MX** | `mail` | `feedback-smtp.resend.com` | 10 | Return-Path / Bounce Handling |
   | **TXT** | `mail` | `v=spf1 include:amazonses.com ~all` | Auto / 300 | SPF Authorization |
   | **TXT** | `_dmarc.mail` | `v=DMARC1; p=reject; rua=mailto:dmarc-reports@giftedpromovies.com` | Auto / 300 | DMARC Policy (reject) |

3. **Verify Domain in Resend**:
   - Click **Verify Records** in Resend.
   - Status must transition to `Verified`.

4. **Production Environment Declaration**:
   Supply the verified identity to the production environment:
   ```env
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_live_xxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=GIFTEDpro Movies <no-reply@mail.giftedpromovies.com>
   ```

---

## 2. Outbox Failure Visibility & Diagnostic Queries

The `email_outbox` table retains a permanent, audit-safe ledger of all email transactions. When jobs encounter transient issues, they retry with exponential backoff. When jobs exceed `max_attempts` or encounter terminal errors (e.g. invalid syntax, provider rejection), they transition to `status = 'failed'`.

### Identifying Permanently Failed Jobs
To inspect all failed email delivery jobs and their sanitized diagnostic reasons:

```sql
SELECT 
    id,
    event_type,
    recipient,
    attempts,
    max_attempts,
    failure_code,
    failure_reason,
    last_attempt_at,
    created_at
FROM email_outbox
WHERE status = 'failed'
ORDER BY last_attempt_at DESC;
```

### Identifying Jobs That Exceeded Max Attempts
```sql
SELECT 
    id,
    event_type,
    recipient,
    attempts,
    max_attempts,
    failure_code,
    last_attempt_at
FROM email_outbox
WHERE attempts >= max_attempts
ORDER BY last_attempt_at DESC;
```

### Monitoring Recent Provider Failures (Past 24 Hours)
```sql
SELECT 
    failure_code,
    COUNT(*) AS failure_count,
    MIN(last_attempt_at) AS first_seen,
    MAX(last_attempt_at) AS latest_seen
FROM email_outbox
WHERE status = 'failed'
  AND last_attempt_at >= NOW() - INTERVAL '24 hours'
GROUP BY failure_code
ORDER BY failure_count DESC;
```

### Inspecting Backlog / In-Flight Jobs
To verify whether the worker is keeping up with queue volume:

```sql
SELECT 
    status,
    COUNT(*) AS job_count,
    MIN(created_at) AS oldest_job,
    MAX(created_at) AS newest_job
FROM email_outbox
WHERE status IN ('pending', 'processing')
GROUP BY status;
```

---

## 3. Outbox Retention & Cleanup Maintenance

To prevent indefinite table growth without destroying operational evidence, GIFTEDproMovies enforces a partitioned retention policy:

### Retention Policy
- **`provider_accepted` (Successful)**: Retained for **30 days**. Provides ample window to correlate delivery with customer support inquiries or provider webhook audits.
- **`expired` / `cancelled` (Superseded)**: Retained for **30 days**. These represent tokens that were superseded by subsequent requests.
- **`failed` (Permanent Errors)**: **RETAINED INDEFINITELY BY DEFAULT** (or minimum 90–180 days). Failed records contain non-sensitive forensic evidence (`failure_code`, `attempts`) crucial for diagnosing delivery deliverability drops or configuration defects.

### Automated Cleanup Execution
Operators can run the built-in maintenance command manually or via a daily cron job:

```bash
# Dry run to inspect purge candidate volume without deleting:
pnpm run outbox:cleanup -- --dry-run

# Live execution purging records older than 30 days:
pnpm run outbox:cleanup --days=30

# Optional: purge failed jobs older than 90 days:
pnpm run outbox:cleanup --days=30 --include-failed-older-than-days=90
```

### Recommended Cron Setup
Add a nightly cron task to your orchestrator (Kubernetes CronJob, AWS ECS Scheduled Task, or systemd timer):

```bash
0 3 * * * cd /app/backend && pnpm run outbox:cleanup --days=30 >> /var/log/outbox-cleanup.log 2>&1
```

---

## 4. Encryption Key Rotation Procedure

### Cryptographic Context
Outbox payloads are encrypted at rest using **AES-256-GCM** with a 256-bit symmetric key (`EMAIL_OUTBOX_ENCRYPTION_KEY`). Each row stores:
- `encrypted_payload`: Ciphertext
- `payload_iv`: Unique 96-bit (12-byte) initialization vector per row
- `payload_tag`: 128-bit (16-byte) authentication tag for tamper resistance

### Known Operational Limitation: Zero-Downtime Rotation
> [!IMPORTANT]
> The current Phase 2 architecture utilizes a single active encryption key configured via the environment. The database does not maintain key-version IDs or a multi-key keyring. Consequently, **changing the environment variable while jobs are pending will cause in-flight pending rows to fail decryption (`PAYLOAD_DECRYPTION_FAILURE`)**.

### Recommended Key Rotation Procedure

To safely rotate `EMAIL_OUTBOX_ENCRYPTION_KEY` in production:

#### Step 1: Drain In-Flight Outbox Jobs
Before rotating the secret, ensure all active jobs have reached a terminal state (`provider_accepted`, `failed`, `expired`, `cancelled`):

```sql
SELECT COUNT(*) AS active_jobs
FROM email_outbox
WHERE status IN ('pending', 'processing');
```
*Wait until `active_jobs` is `0`.* Because the worker dispatches batches every 2 seconds, draining normally completes in under 15 seconds once new registrations are temporarily paused (or during a low-traffic maintenance window).

#### Step 2: Generate Fresh 256-bit Key
Generate a cryptographically secure 64-character hexadecimal key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 3: Update Secrets Manager
Update `EMAIL_OUTBOX_ENCRYPTION_KEY` in your production secrets store (e.g. AWS Secrets Manager, Doppler, Vault, GCP Secret Manager).

#### Step 4: Redeploy / Restart Application & Workers
Perform a rolling restart or deployment of all backend API containers and worker processes.

#### Step 5: Validate Encryption & Decryption
Run a synthetic check (e.g. a verification resend for a test account) to confirm:
1. New outbox row is inserted with unique IV and valid tag.
2. Worker claims and successfully decrypts the payload with the new key.
3. Outbox row transitions to `provider_accepted`.
4. No `PAYLOAD_DECRYPTION_FAILURE` appears in application logs.
