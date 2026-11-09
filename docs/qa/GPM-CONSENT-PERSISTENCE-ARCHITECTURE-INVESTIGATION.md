# GIFTEDproMovies3 — Customer Consent Persistence Architecture Investigation

**Document Reference:** `docs/qa/GPM-CONSENT-PERSISTENCE-ARCHITECTURE-INVESTIGATION.md`  
**Mission ID:** `GPM-CONSENT-PERSISTENCE-INVESTIGATION`  
**Authority:** Product Owner  
**Execution Mode:** STRICT READ-ONLY ARCHITECTURAL INVESTIGATION  
**Implementation Authorization:** NONE (Investigation & Technical Design Only)  
**Date:** November 2026  
**Auditor / Investigator:** Antigravity (Lead Architectural Auditor)  
**Status:** FORMAL ARCHITECTURAL REPORT & RECOMMENDATION  

---

# 1. EXECUTIVE SUMMARY & INVESTIGATION MANDATE

Following the Phase 7 Independent Frontend Acceptance Audit (`GPM-PHASE7-INDEPENDENT-ACCEPTANCE-AUDIT`), an architectural investigation was commissioned to examine the gap between customer-facing consent collection and server-side consent persistence:

- **The Observed Gap:** The customer frontend (`src/components/auth/RegisterForm.tsx`) strictly enforces an affirmative 18+ age declaration and mandatory Terms of Service and Privacy Policy acceptance (preventing submission if unchecked). However, the backend endpoint (`POST /api/v1/auth/register` via `RegisterDto`) accepts only `{ email, password }`, does not validate legal consent server-side, and persists no age or policy agreement records to the database.
- **The Core Constraint:** Migrations `0000`–`0013` remain frozen. Exactly 14 migration files must remain present. Migration `0014` is **NOT AUTHORIZED**. Architectural invariants (including ARCH-19) must be preserved without modification.
- **Investigation Objective:** Determine the safest, most auditable, and maintainable architecture for enforceable consent and age declaration persistence without violating frozen migration boundaries.

### Key Investigation Findings

1. **Direct API Bypass Exists:** Any client (curl, Postman, automated bot, or script) can issue a direct HTTP `POST /api/v1/auth/register` containing only `{ email, password }` and successfully create an account, completely bypassing the 18+ age declaration and legal consent requirements.
2. **No Dedicated Consent Entity Exists:** An exhaustive scan across all 25 database schema files and 27 relational tables confirmed that no dedicated consent, agreement, or legal entity exists in the PostgreSQL schema.
3. **Existing Immutable Audit Mechanism is Capable (Zero-Migration Solution):** The platform already possesses an append-only, tamper-resistant `audit_events` table (created in Migration `0000_hard_exiles.sql`) equipped with `actor_id`, `action`, `resource_type`, `resource_id`, `metadata` (`jsonb`), `ip_address`, `user_agent`, and `created_at`.
4. **Schema Changes Are NOT Genuinely Required for Compliance:** By utilizing the existing `audit_events` mechanism inside the registration database transaction, the platform can achieve 100% legal auditability, tamper resistance, and compliance **without creating Migration 0014 and without modifying `usersTable`**.
5. **Future Dedicated Table Roadmap:** If high-frequency relational querying of consent state is required in future milestones (e.g., when introducing formal re-consent triggers upon policy updates), a dedicated `user_consents` table can be scheduled as a formal, Product Owner-authorized post-frozen migration.

---

# 2. CURRENT REPOSITORY ARCHITECTURE & CODEBASE EVIDENCE

### 2.1 Backend Registration Contract & DTO
- **File Reference:** [`backend/src/modules/identity/dto/index.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/src/modules/identity/dto/index.ts#L3-L15)
- **Current Source Code:**
  ```typescript
  export class RegisterDto {
    @IsEmail({}, { message: "Must be a valid email address" })
    @IsNotEmpty({ message: "Email is required" })
    email!: string;

    @IsString({ message: "Password must be a string" })
    @MinLength(8, { message: "Password must be at least 8 characters long" })
    @MaxLength(128, { message: "Password must not exceed 128 characters" })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    })
    password!: string;
  }
  ```
- **Evidence:** `RegisterDto` contains only `email` and `password`. It contains no fields for `ageDeclared`, `termsAccepted`, or `policyVersion`.

### 2.2 Backend Authentication Controller
- **File Reference:** [`backend/src/modules/identity/controllers/auth.controller.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/src/modules/identity/controllers/auth.controller.ts#L59-L68)
- **Current Source Code:**
  ```typescript
  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<{ message: string; user: SafeUser }> {
    const user = await this.authService.register(dto.email, dto.password);
    return {
      message: "Registration successful. Please check your email to verify your account.",
      user,
    };
  }
  ```
- **Evidence:** The controller receives only `dto.email` and `dto.password`, ignoring client IP and user agent for the registration action.

### 2.3 Backend Authentication Service
- **File Reference:** [`backend/src/modules/identity/services/auth.service.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/src/modules/identity/services/auth.service.ts#L94-L157)
- **Current Execution Flow:**
  1. Checks if normalized email already exists (throws `ConflictException` if present).
  2. Hashes password using Argon2id (`this.passwordHasher.hashPassword`).
  3. Executes an atomic database transaction (`this.executeInTransaction`):
     - Inserts record into `usersTable` with `role = 'customer'` and `status = 'pending_verification'`.
     - Generates 32-byte secure email verification token, hashes it, and inserts into `authTokensTable`.
     - Enqueues verification email in `emailOutboxTable` with client payload encrypted under AES-256-GCM.
     - Commits transaction.
  4. Calls audit logger outside the transaction:
     ```typescript
     await this.audit.recordEvent({
       actorId: createdUser.id,
       action: "auth.register",
       resourceType: "user",
       resourceId: createdUser.id,
       metadata: { email: normalizedEmail },
     });
     ```
  5. Returns sanitized user profile.
- **Evidence:** The audit event recorded on registration records only `{ email: normalizedEmail }` in its metadata. It does not record age confirmation, Terms acceptance, Privacy acceptance, policy versions, client IP, or user agent. Furthermore, the audit event is emitted *after* transaction commit rather than atomically bound with user creation.

### 2.4 User Database Table Schema
- **File Reference:** [`backend/src/infrastructure/database/schemas/users.schema.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/src/infrastructure/database/schemas/users.schema.ts#L3-L16)
- **Current Source Code:**
  ```typescript
  export const usersTable = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash"),
    role: varchar("role", { length: 32 }).notNull().default("customer"),
    status: varchar("status", { length: 32 }).notNull().default("pending_verification"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  });
  ```
- **Evidence:** `usersTable` contains exactly 8 columns. No fields exist for age attestation, legal terms timestamps, or policy version identifiers.

### 2.5 Existing Audit Events Table Schema
- **File Reference:** [`backend/src/infrastructure/database/schemas/audit-events.schema.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/src/infrastructure/database/schemas/audit-events.schema.ts#L3-L24)
- **Created in Migration:** `backend/drizzle/migrations/0000_hard_exiles.sql` (lines 68–97)
- **Current Table Structure:**
  ```typescript
  export const auditEventsTable = pgTable(
    "audit_events",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      actorId: uuid("actor_id"),
      action: varchar("action", { length: 128 }).notNull(),
      resourceType: varchar("resource_type", { length: 64 }).notNull(),
      resourceId: varchar("resource_id", { length: 128 }),
      metadata: jsonb("metadata"),
      ipAddress: varchar("ip_address", { length: 45 }),
      userAgent: text("user_agent"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      index("audit_events_actor_id_idx").on(table.actorId),
      index("audit_events_action_idx").on(table.action),
      index("audit_events_resource_idx").on(table.resourceType, table.resourceId),
      index("audit_events_created_at_idx").on(table.createdAt),
    ],
  );
  ```
- **Audit Service Implementation:** [`backend/src/modules/audit/audit.service.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/src/modules/audit/audit.service.ts#L58-L109)
  - Method `recordEvent(input: RecordAuditEventInput)` accepts:
    - `actorId?: string | null`
    - `action: string`
    - `resourceType: string`
    - `resourceId?: string | null`
    - `metadata?: Record<string, unknown> | null` (sanitized against secret leaks)
    - `ipAddress?: string | null`
    - `userAgent?: string | null`
    - `failClosed?: boolean` (throws on error if critical security event)
    - `tx?: DatabaseClient` (participates in active database transaction!)
- **Evidence:** The database persistence layer **already contains** an append-only, indexed, transaction-capable audit logging table designed specifically for security, regulatory defense, and compliance records.

### 2.6 Frontend Registration & Client Transmission
- **File Reference:** [`src/components/auth/RegisterForm.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/auth/RegisterForm.tsx#L96-L111)
  - Validates `isAgeDeclared` (must be `true`).
  - Validates `isTermsAccepted` (must be `true`).
  - If either is `false`, sets validation error and halts execution.
  - Calls `register({ username, email, password, confirmPassword })`.
- **File Reference:** [`src/services/authRepository.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/services/authRepository.ts#L86-L92)
  - Invokes `authApi.register(credentials.email, credentials.password)`.
- **File Reference:** [`src/lib/api/authApi.ts`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/lib/api/authApi.ts#L5-L10)
  - Issues `POST /auth/register` with `body: { email, password }`.
- **Evidence:** The frontend collects the 18+ declaration and legal acceptance, but drops them during client payload generation. It transmits only `{ email, password }` to the server.

---

# 3. BACKEND ENFORCEMENT & DIRECT API BYPASS ANALYSIS

### 3.1 What the Frontend Sends vs. What the Backend Expects

| Lifecycle Stage | Frontend Behavior | Backend Behavior | Result |
| :--- | :--- | :--- | :--- |
| **Input Collection** | Checkbox 1: 18+ Age Declaration.<br>Checkbox 2: Terms & Privacy Acceptance. | None. Fields do not exist on `RegisterDto`. | Frontend collects; backend does not expect. |
| **Client Validation** | Halts if checkboxes are unchecked. | None. No class-validator decorators for consent. | Gating is entirely client-side. |
| **Payload Assembly** | Drops checkboxes; packages `{ email, password }`. | Expects `{ email, password }`. | Complete mismatch between UI promise and wire payload. |
| **Network Request** | `POST /api/v1/auth/register` with `{ email, password }`. | `RegisterDto` parses `{ email, password }`. | Passes validation cleanly. |
| **Persistence** | None (stateless client). | Writes to `usersTable` (`id, email, password_hash, role, status`). | Zero legal or age records stored. |
| **Audit Log** | None. | Writes `auth.register` with `{ email }`. | No legal attribution recorded. |

### 3.2 The Direct API Bypass Attack Vector

Because the backend relies exclusively on `RegisterDto` with no validation of consent or age fields, a direct API request demonstrates the vulnerability:

```bash
# Direct API registration request bypassing all frontend legal gates:
curl -X POST https://api.giftedpromovies.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "minor_user@example.com",
    "password": "Password123!"
  }'
```

**Observed Server Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "e4b1c2a0-7f39-4d61-9c88-6b8c1d5e3f2a",
      "email": "minor_user@example.com",
      "role": "customer",
      "status": "pending_verification"
    }
  }
}
```

### 3.3 Forensic Retrievability Assessment
If a customer, regulator (e.g., Tanzanian Personal Data Protection Commission — PDPC), or court requests proof of consent:
- **Can the platform prove the user affirmed they were 18+?** **NO.**
- **Can the platform prove the user accepted the Terms of Service?** **NO.**
- **Can the platform prove which version of the Privacy Policy was accepted?** **NO.**
- **Can the platform produce the client IP or User-Agent at time of registration?** **NO.** (The current `auth.register` audit event records only `{ email }`).

### 3.4 Server-Side Validation Necessity
Under fundamental computer security and contractual principles:
1. **Client-side checks are for user experience; server-side checks are for security and enforceability.**
2. A contractual agreement (Terms of Service, digital delivery waiver) cannot be legally defended if the server endpoint does not require affirmative assent as a prerequisite to contract creation.
3. Therefore, server-side validation and persistence of age declaration and legal consent are **mandatory**.

---

# 4. ARCHITECTURAL ALTERNATIVES EVALUATION

Four architectural alternatives were evaluated across eleven technical and regulatory dimensions:

- **Alternative A:** Reuse the existing immutable `audit_events` mechanism.
- **Alternative B:** Extend an existing consent-related entity.
- **Alternative C:** Introduce a dedicated `user_consents` relational table.
- **Alternative D:** Add consent columns directly to `usersTable`.

### 4.1 Evaluation Matrix

| Evaluation Dimension | Alternative A: Existing `audit_events` | Alternative B: Extend Existing Entity | Alternative C: Dedicated `user_consents` Table | Alternative D: Add Columns to `usersTable` |
| :--- | :--- | :--- | :--- | :--- |
| **1. Data Integrity** | **HIGH.** Atomic transactional write via `tx` parameter in `AuditService`. | **N/A.** No consent entity exists in schema. | **HIGH.** Foreign key constraint to `users.id` with relational typing. | **MODERATE.** Single-row update; risks partial writes. |
| **2. Immutability** | **MAXIMUM.** `audit_events` is append-only by design; no update/delete queries exist in codebase. | **N/A.** | **HIGH.** Can enforce append-only rules via trigger or service logic. | **POOR.** `usersTable` is mutable (`updated_at`, status changes, password changes). |
| **3. User Attribution** | **HIGH.** Explicit `actor_id = createdUser.id` and `resource_id = createdUser.id`. | **N/A.** | **HIGH.** Explicit `user_id` foreign key. | **INTRINSIC.** Belongs to the user record. |
| **4. Policy Versioning** | **HIGH.** Metadata JSONB stores explicit version strings (e.g., `termsVersion: "2026.1"`). | **N/A.** | **MAXIMUM.** Dedicated `policy_version` column with unique index. | **POOR.** Stores only the latest accepted version; overwrites previous. |
| **5. Timestamp Reliability** | **MAXIMUM.** Server-generated `created_at` timestamp with timezone (`defaultNow()`). | **N/A.** | **MAXIMUM.** Server-generated `declared_at` timestamp with timezone. | **MODERATE.** Re-consent overwrites initial timestamp unless history table added. |
| **6. Historical Changes** | **MAXIMUM.** Future re-consent simply appends a new audit row without destroying past evidence. | **N/A.** | **MAXIMUM.** Append-only history of every consent event across user lifecycle. | **POOR.** Destroys historical record; cannot prove what was agreed to at purchase date. |
| **7. Privacy & Minimization** | **HIGH.** Stores only consent booleans, version strings, IP, and UA. | **N/A.** | **HIGH.** Isolated table; easily pseudonymized or purged. | **MODERATE.** Mixes consent timestamps with identity and credential attributes. |
| **8. Retention & Deletion** | **HIGH.** Aligns with 36-month security audit retention (ADR-027). | **N/A.** | **HIGH.** Can define independent retention schedules. | **POOR.** Hard delete of user removes all historical consent defense. |
| **9. Queryability** | **MODERATE.** Queryable via `audit_events_actor_id_idx` and JSONB operators. | **N/A.** | **MAXIMUM.** Direct SQL queries (`WHERE user_id = $1 AND policy_type = $2`). | **HIGH for current; ZERO for historical.** |
| **10. Testing Complexity** | **LOW.** Existing integration test suite already supports `auditEventsTable`. | **N/A.** | **MODERATE.** Requires new schema, repository, DTOs, and test fixtures. | **LOW.** Requires modifying existing user repository tests. |
| **11. Migration Impact** | **ZERO (0) MIGRATIONS.** 100% compliant with frozen boundary `0000`–`0013`. | **N/A.** | **VIOLATION.** Requires Migration `0014` (Unauthorized). | **VIOLATION.** Requires Migration `0014` (Unauthorized). |

---

# 5. RECOMMENDED ARCHITECTURAL SOLUTION

### 5.1 Primary Recommendation: Two-Phase Strategy

Based on the evidence, the safest, most maintainable, and legally defensible strategy is a **Two-Phase Architecture**:

```
[Phase 7 Remediation — Zero Schema Changes]
Client Register Payload (with Consent) 
       │
       ▼
Backend RegisterDto (Validates Age + Consent + Versions)
       │
       ▼
Atomic Database Transaction (executeInTransaction)
       ├── 1. Insert usersTable (customer, pending_verification)
       ├── 2. Insert authTokensTable (email_verification)
       ├── 3. Insert emailOutboxTable (encrypted notification)
       └── 4. Insert auditEventsTable (actorId, action='auth.consent_recorded', metadata)
       │
       ▼
Commit (All-or-Nothing Guarantee)

[Future Phase — Dedicated Relational Schema (When Authorized)]
Migration 0014: CREATE TABLE user_consents (...)
```

### 5.2 Phase 1: Zero-Migration Audit Events Integration (Immediate Compliance)
- **Why Alternative A is Superior Today:**
  1. It requires **zero migrations**, preserving the frozen migrations invariant (`0000`–`0013`) and ARCH-19.
  2. The `audit_events` table already contains all required columns: `actor_id`, `action`, `resource_type`, `resource_id`, `metadata` (JSONB), `ip_address`, `user_agent`, and `created_at`.
  3. `AuditService` already supports running inside the caller's active database transaction (`tx` parameter) and failing closed (`failClosed: true`).
  4. It provides tamper resistance and immutability out of the box.

### 5.3 Detailed Component Architecture for Alternative A

#### A. Wire Contract & `RegisterDto` Update
```typescript
export class RegisterDto {
  @IsEmail({}, { message: "Must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @IsString({ message: "Password must be a string" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(128, { message: "Password must not exceed 128 characters" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password!: string;

  @IsBoolean({ message: "Age declaration must be a boolean" })
  @Equals(true, { message: "You must confirm that you are at least 18 years of age" })
  ageDeclared!: boolean;

  @IsBoolean({ message: "Terms acceptance must be a boolean" })
  @Equals(true, { message: "You must accept the Terms of Service and Privacy Policy" })
  termsAccepted!: boolean;

  @IsString({ message: "Policy version must be a string" })
  @IsNotEmpty({ message: "Policy version is required" })
  @MaxLength(32)
  policyVersion!: string;
}
```

#### B. Controller Telemetry Capture
In `AuthController.register()`:
Capture `request.ip` and `request.headers["user-agent"]` and pass them alongside `dto` to `authService.register()`.

#### C. Atomic Transactional Persistence
In `AuthService.register()`:
Execute the consent event inside `executeInTransaction`:
```typescript
// Atomically inside tx:
await this.audit.recordEvent({
  actorId: user.id,
  action: "auth.consent_recorded",
  resourceType: "legal_agreement",
  resourceId: user.id,
  ipAddress,
  userAgent,
  metadata: {
    ageDeclared: true,
    minAge: 18,
    termsAccepted: true,
    privacyAccepted: true,
    policyVersion: dto.policyVersion,
    consentType: "REGISTRATION_MANDATORY",
  },
  failClosed: true,
  tx,
});
```

### 5.4 Phase 2: Future Dedicated Table Proposal (`user_consents`)

When the Product Owner formally authorizes post-frozen database migrations, a dedicated table can be introduced via Migration `0014`:

```sql
-- PROPOSAL ONLY — NOT AUTHORIZED FOR IMPLEMENTATION
CREATE TABLE "user_consents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "consent_type" VARCHAR(64) NOT NULL, -- 'TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'AGE_ATTESTATION'
    "policy_version" VARCHAR(32) NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "user_consents_user_id_idx" ON "user_consents" ("user_id");
CREATE INDEX "user_consents_type_version_idx" ON "user_consents" ("consent_type", "policy_version");
CREATE INDEX "user_consents_created_at_idx" ON "user_consents" ("created_at");
```

---

# 6. SECURITY & REGULATORY ANALYSIS

### 6.1 Age Declaration Limitations & Legal Reality
- **Attestation vs. Proof:** An unchecked checkbox declaring "I am at least 18 years old" does **not** prove legal age, physical identity, or maturity.
- **Contractual Significance:** Under contract law and Tanzania's Law of the Child Act (2009), the checkbox constitutes an **affirmative contractual warranty and representation** by the user. If a minor misrepresents their age, the platform is shielded by demonstrating it took reasonable, industry-standard measures to restrict access to adults.
- **Data Minimization:** Collecting government identity cards (such as NIDA cards) at general registration would violate Section 28 of the Tanzania PDPA 2022 (Principle of Data Minimization). Self-attestation backed by server-side audit logging represents the balanced, proportionate compliance posture for V1.

### 6.2 Timestamp Integrity
- Client-provided timestamps cannot be trusted, as client clocks can be skewed, backdated, or manipulated.
- All consent events must be stamped exclusively by PostgreSQL server time (`DEFAULT NOW()` / `CURRENT_TIMESTAMP`).

### 6.3 Policy Versioning & Re-Consent Triggers
- When the Terms of Service or Privacy Policy are materially updated (e.g., from `2026.1` to `2027.1`):
  1. The platform configures `CURRENT_LEGAL_VERSION = "2027.1"`.
  2. Upon subsequent login, the session discovery endpoint (`GET /api/v1/auth/me`) checks the user's latest consent record.
  3. If outdated, the frontend presents a blocking modal requiring re-acceptance before granting access to catalog or downloads.
  4. Re-acceptance emits a new `auth.consent_recorded` audit event with the new `policyVersion`.

### 6.4 Consent Withdrawal & Account Deletion
- Under PDPA 2022 Section 34 and GDPR Article 17:
  - Acceptance of Terms and Privacy is a **contractual necessity** for account provision.
  - If a user withdraws consent to essential terms, the contract cannot be performed; the account must be scheduled for deactivation or deletion pursuant to [`docs/legal/ACCOUNT_AND_DATA_DELETION_POLICY_DRAFT.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/legal/ACCOUNT_AND_DATA_DELETION_POLICY_DRAFT.md).
  - Financial transaction logs and commercial policy snapshots continue to be preserved for 7 years under Section 35 of the Tax Administration Act, 2015.

---

# 7. PROPOSED TEST STRATEGY

When authorization to implement is granted, the following automated test cases must be added:

1. **Direct API Rejection Tests (`backend/tests/auth-http.integration.test.ts`):**
   - Attempt `POST /api/v1/auth/register` without `ageDeclared` $\rightarrow$ Expect `400 Bad Request`.
   - Attempt `POST /api/v1/auth/register` with `ageDeclared = false` $\rightarrow$ Expect `400 Bad Request`.
   - Attempt `POST /api/v1/auth/register` without `termsAccepted` $\rightarrow$ Expect `400 Bad Request`.
   - Attempt `POST /api/v1/auth/register` with `termsAccepted = false` $\rightarrow$ Expect `400 Bad Request`.
   - Attempt `POST /api/v1/auth/register` without `policyVersion` $\rightarrow$ Expect `400 Bad Request`.
2. **Audit Persistence Verification Test:**
   - Execute successful registration with all valid fields.
   - Query `audit_events` where `actor_id = newUser.id` and `action = 'auth.consent_recorded'`.
   - Verify `metadata.ageDeclared === true`, `metadata.termsAccepted === true`, and `metadata.policyVersion` matches expected version.
   - Verify `ip_address` and `user_agent` are recorded.
3. **Transactional Rollback Test:**
   - Induce an error during the registration transaction (e.g., simulated failure during audit insert with `failClosed: true`).
   - Verify that neither the user record nor the tokens nor the audit events are committed (atomicity verification).

---

# 8. OPEN LEGAL & BUSINESS DECISIONS

The Product Owner and legal counsel must resolve the following decisions prior to implementation:

1. **Policy Version Naming Scheme:**
   - Should policy versions follow dates (`2026-10-DRAFT`, `2026-11-V1`) or semantic versions (`1.0.0`)?
   - *Recommendation:* Date-based naming (e.g., `2026.11-V1`), matching commercial contracts.
2. **Re-Consent Policy Threshold:**
   - Which policy updates trigger mandatory blocking re-consent vs. notice-only emails?
   - *Recommendation:* Material changes to dispute resolution, pricing, download licensing, or data sharing require blocking re-consent; typo corrections do not.
3. **Phase Allocation of Migration 0014:**
   - Will the Product Owner authorize Alternative A (Zero-Migration `audit_events`) as the permanent V1/V2 architecture, or does the Product Owner want Migration 0014 scheduled for a dedicated `user_consents` table in a future phase?

---

# 9. EXPLICIT AUTHORIZATION REQUIRED

In strict compliance with this mission's READ-ONLY mode:
- **Zero source code files were modified.**
- **Zero database tables or rows were altered.**
- **Zero migrations were created or scheduled.**
- **Zero git operations were performed.**

**Next Action:** Awaiting formal Product Owner review of this architecture investigation. Implementation of the recommended Zero-Migration Consent Persistence solution requires explicit Product Owner authorization.

---
*Authored and Published by:*  
**Antigravity**  
*Lead Architectural Auditor & Engineering Agent*  
*November 2026*
