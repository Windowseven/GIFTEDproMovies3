# GIFTEDproMovies — Phase 3C Stage 1: Refined Architectural Design Specification

> **Document ID:** ARCH-019-PHASE-3C-STAGE-1-REFINED  
> **File:** `docs/architecture/PHASE_3C_STAGE_1_REFINED_DESIGN.md`  
> **Status:** PHASE 3C STAGE 1 — REVISED DESIGN AWAITING PRODUCT OWNER REVIEW  
> **Authority:** Product Owner Decisions, ADR-001 through ADR-034, ARCH-001 through ARCH-018  
> **Implementation State:** Design Refinement Only (NO production code, NO migrations, NO schema changes)

---

## Executive Summary

Following initial Product Owner review of the Phase 3C Stage 0 & Stage 1 Architectural Design Package, this refined specification resolves four critical engineering review items:

1. **Review Item A (Concurrency & Transaction Locking):**  
   Evaluates PostgreSQL row-locking modes (`FOR KEY SHARE` vs `FOR UPDATE`) across all catalog boundaries. Exploit the domain invariant that `content.content_type` is strictly immutable after creation. Establishes a hierarchical top-down lock acquisition protocol (`content` $\rightarrow$ `seasons` $\rightarrow$ `episodes` / `movie_editions`) and deterministic ascending ID ordering to eliminate database deadlocks under high concurrency.
2. **Review Item B (Audit Atomicity & Failure Semantics):**  
   Establishes that audit events for state-changing catalog mutations MUST be executed inside the database transaction (`tx.insert(auditEventsTable)`) with strict fail-closed semantics (`failClosed: true`). Resolves the interface gap in `AuditService` by adding an optional transaction client parameter (`tx?: ApplicationTransactionClient`), guaranteeing that business mutations and audit records commit or roll back together.
3. **Review Item C (Scope Verification Matrix):**  
   Performs an exhaustive audit of all proposed Phase 3 capabilities, categorizing every capability into: **Phase 3C Scope**, **Supporting Behavior**, **Existing Behavior to Preserve**, **Future Phase (Out of Scope)**, and **Open Decisions**. Re-affirms strict decoupling from Commerce (Phase 4), Payments (Phase 5), Media Processing (Phase 6), Playback DRM (Phase 7), and Public Storefront APIs (Phase 3D).
4. **Review Item D (API Error Safety & Envelope Compliance):**  
   Aligns domain exceptions with the established Phase 1 `ApiExceptionFilter` (`{ success: false, error: { code, message } }`), specifies zero internal SQL/schema disclosure guarantees, defines the canonical Phase 3C error codes, and establishes clear HTTP 422 vs 400 semantic boundaries.

---

## Section 1: Concurrency and Transaction Locking Architecture

### 1.1 Lock Mode Selection Rationale

In PostgreSQL, row-level locks vary significantly in their concurrency characteristics:

* **`FOR UPDATE`:** The strongest lock mode. Blocks concurrent `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`, and any concurrent `UPDATE` or `DELETE` on the row.
* **`FOR NO KEY UPDATE`:** Similar to `FOR UPDATE`, but does not block `FOR KEY SHARE`. Used when modifying non-key columns.
* **`FOR SHARE`:** Shared lock. Blocks concurrent `FOR UPDATE` and `FOR NO KEY UPDATE`, but allows concurrent `FOR SHARE` and `FOR KEY SHARE`.
* **`FOR KEY SHARE`:** Weakest row lock mode. Blocks only `FOR UPDATE` and `DELETE` (or key-modifying `UPDATE`). Crucially, **it does not block concurrent `FOR KEY SHARE`, `FOR SHARE`, or `FOR NO KEY UPDATE`**.

#### The Core Domain Invariant: `content.content_type` Immutability
In GIFTEDproMovies, once a `content` record is inserted with `content_type = 'movie'` or `content_type = 'series'`, its `content_type` is **strictly immutable**. A movie cannot transform into a series, nor can a series become a movie.

Because `content_type` cannot be mutated after creation:
1. Child attachment operations only need to verify that the parent `content` row exists, has the matching `content_type`, and will not be concurrently deleted.
2. Therefore, child attachments do NOT require an exclusive `FOR UPDATE` lock on `content`. Locking `content` with `FOR UPDATE` would artificially serialize all concurrent child operations (e.g., uploading two different DJ editions for the same movie simultaneously would needlessly block each other).
3. Instead, `content` is locked with **`FOR KEY SHARE`**. This guarantees that the parent row cannot be deleted or have its primary key modified during the transaction, while permitting unlimited concurrent child additions and concurrent read queries.

### 1.2 Lock Mode Matrix by Operation

| Operation | Target Rows | Lock Mode | Rationale |
| :--- | :--- | :--- | :--- |
| **Attach Movie Edition** | `content` (parent) | `FOR KEY SHARE` | Verifies `content_type = 'movie'`; prevents parent deletion; allows concurrent edition uploads. |
| | `movie_editions` (existing default, if promoting new edition to default) | `FOR UPDATE` | Modifies existing default edition row (`is_default = false`). |
| **Attach Series Metadata** | `content` (parent) | `FOR KEY SHARE` | Verifies `content_type = 'series'`; prevents parent deletion; 1-to-1 uniqueness enforced by DB. |
| **Attach Season** | `content` (parent) | `FOR KEY SHARE` | Verifies `content_type = 'series'`; prevents parent deletion; allows concurrent season creation. |
| **Attach Episode** | `content` (series) | `FOR KEY SHARE` | Verifies series existence and type; prevents series deletion. |
| | `seasons` (season) | `FOR KEY SHARE` | Verifies season existence and ownership; prevents season deletion; allows concurrent episode creation. |
| **Content Lifecycle Transition** | `content` (target) | `FOR UPDATE` | Exclusively serializes state mutation (`status`, `published_at`, `approved_by`, `rejection_reason`). |
| **Publish Readiness Check (Movie)** | `content` | `FOR UPDATE` | Target of the publish transition. |
| | `movie_editions` (default) | `FOR KEY SHARE` | Verifies default edition readiness (`streaming_status`, `download_status`) without blocking reads. |
| **Publish Readiness Check (Series)** | `content` | `FOR UPDATE` | Target of the publish transition. |
| | `seasons` (Season 1) | `FOR KEY SHARE` | Verifies Season 1 presence. |
| | `episodes` (Episode 1) | `FOR KEY SHARE` | Verifies Episode 1 readiness without blocking reads. |
| **Movie Default Edition Outage** (Case A: Re-point Default) | `content` | `FOR UPDATE` | Serializes outage handling against concurrent publishing/unpublishing. |
| | `movie_editions` (all editions for movie) | `FOR UPDATE` | Mutates `is_default` and `is_available` flags; deterministic ID order. |
| **Movie Default Edition Outage** (Case B: Unpublish Movie) | `content` | `FOR UPDATE` | Mutates `content.status = 'unpublished'`. |
| | `movie_editions` (failing edition) | `FOR UPDATE` | Mutates `is_available = false`. |
| **Taxonomy Deletion Safeguard** | `categories` / `countries` / `dj_voice_artists` | `FOR UPDATE` | Serializes deletion/deactivation check against concurrent content junction creation. |

### 1.3 Lock Acquisition Order & Deadlock Prevention

#### The Hierarchy-Depth Rule
A database deadlock occurs when Transaction 1 holds Lock A and requests Lock B, while Transaction 2 holds Lock B and requests Lock A.

To guarantee zero deadlocks across all concurrent catalog transactions:
1. **Vertical Hierarchy Ordering:** All transactions locking multiple entities across the domain hierarchy MUST acquire locks in strict top-down order:
   $$\text{Level 1 (Top): } content \longrightarrow \text{Level 2: } seasons \text{ / } movie\_editions \longrightarrow \text{Level 3 (Bottom): } episodes$$
2. **Horizontal Deterministic Ordering:** Whenever multiple rows within the *same* table are locked in a single transaction (e.g. locking all editions for a movie during failover), rows MUST be locked in deterministic ascending primary key order:
   $$\text{ORDER BY } id \text{ ASC}$$

#### Analysis of `attachEpisode` Lock Ordering
Consider an `attachEpisode(seasonId, episodeData)` operation:
* If `attachEpisode` locks `seasons` first, and then resolves and locks `content`, a concurrent `publishSeries(seriesId)` operation (which locks `content` first, then inspects `seasons`) will enter a **cyclic deadlock**!
* **Resolution:** `attachEpisode` MUST resolve and lock `content` **FIRST**.

**Exact Step-by-Step SQL Protocol for `attachEpisode`:**
```sql
-- Step 1: Resolve series_id from seasons via non-locking probe (or index lookup)
SELECT series_id FROM seasons WHERE id = $season_id;
-- If not found -> throw NotFoundException('Season not found');

-- Step 2: Acquire Level 1 lock on parent content (Series)
SELECT id, content_type, status 
FROM content 
WHERE id = $series_id 
FOR KEY SHARE;
-- Verify content.content_type == 'series' -> if mismatch throw UnprocessableEntityException('INVALID_CONTENT_TYPE');

-- Step 3: Acquire Level 2 lock on parent season
SELECT id, series_id 
FROM seasons 
WHERE id = $season_id 
FOR KEY SHARE;
-- Verify season.series_id == content.id -> if mismatch throw UnprocessableEntityException('INVALID_HIERARCHY');

-- Step 4: Insert episode (Level 3)
INSERT INTO episodes (season_id, episode_number, title, duration_minutes, dj_id, ...)
VALUES ($season_id, $episode_number, $title, ...);

-- Step 5: Insert atomic audit record in same transaction
INSERT INTO audit_events (actor_id, action, resource_type, resource_id, metadata, ...)
VALUES ($actor_id, 'EPISODE_ATTACH', 'episode', $new_episode_id, ...);
```

#### Complete Multi-Row Transaction Lock Order Registry

| Transaction Boundary | Lock Step 1 (Level 1) | Lock Step 2 (Level 2) | Lock Step 3 (Level 3) |
| :--- | :--- | :--- | :--- |
| `createMovieEdition` | `content` (`FOR KEY SHARE`) | `movie_editions` (old default `FOR UPDATE` if `is_default=true`) | N/A |
| `createSeason` | `content` (`FOR KEY SHARE`) | N/A (inserts into `seasons`) | N/A |
| `attachEpisode` | `content` (`FOR KEY SHARE` via season probe) | `seasons` (`FOR KEY SHARE`) | N/A (inserts into `episodes`) |
| `publishMovie` | `content` (`FOR UPDATE`) | `movie_editions` (`WHERE is_default=true FOR KEY SHARE`) | N/A |
| `publishSeries` | `content` (`FOR UPDATE`) | `seasons` (`WHERE season_number=1 FOR KEY SHARE`) | `episodes` (`WHERE season_id=$s1 AND episode_number=1 FOR KEY SHARE`) |
| `handleMovieEditionFailure` | `content` (`FOR UPDATE`) | `movie_editions` (`WHERE movie_id=$m ORDER BY id ASC FOR UPDATE`) | N/A |
| `restoreArchivedContent` | `content` (`FOR UPDATE`) | N/A | N/A |

---

## Section 2: Transactional Audit Architecture

### 2.1 Audit Write Placement: In-Transaction vs Out-of-Transaction

Under ARCH-003 and ARCH-010, the audit trail is a foundational security control. In catalog management, an audit record proves who created, submitted, published, unpublished, archived, or rejected commercial media assets.

* **If audit writes are executed outside the business transaction:**
  * Scenario 1 (Audit After Commit): The business transaction commits `status = 'published'`, but an intermittent database connection drop or out-of-memory error causes the subsequent audit write to fail. The catalog item is now live in production with **zero record of who authorized the publication**.
  * Scenario 2 (Audit Before Commit): The audit write commits in a separate connection, but the subsequent business transaction aborts due to a serialization conflict. The audit trail now falsely records that a title was published when it remains in draft.
* **If audit writes are executed inside the business transaction (`tx.insert(auditEventsTable)`):**
  * The business state changes and the audit record commit atomically as a single database unit of work.
  * If the audit insert fails (e.g. database disk full, connection drop, constraint error), the entire transaction rolls back.
  * **Guarantee:** Zero orphan audit records, and zero un-audited state mutations.

**Conclusion:** All state-changing catalog mutations in Phase 3C MUST write audit events **inside the database transaction**.

### 2.2 Audit Failure Semantics by Operation

| Operation Type | Operations | Audit Failure Semantic | Behavior on Audit Write Failure |
| :--- | :--- | :--- | :--- |
| **Catalog Lifecycle Mutations** | `createContent`, `updateContentMetadata`, `submitForReview`, `publishContent`, `unpublishContent`, `archiveContent`, `restoreArchivedContent`, `rejectContent` | **Fail-Closed** (`failClosed: true`) | Transaction rolls back immediately. Business state does NOT change. Error 500 returned to client. |
| **Hierarchy & Edition Mutations** | `createMovieEdition`, `repointDefaultEdition`, `handleMovieEditionFailure`, `createSeason`, `createEpisode`, `updateEpisodeAvailability` | **Fail-Closed** (`failClosed: true`) | Transaction rolls back immediately. Child entity is NOT created/modified. |
| **Taxonomy Governance** | `createCategory`, `updateCategory`, `deactivateCategory`, `deleteCategory`, `createCountry`, `updateCountry`, `deleteCountry`, `createDj`, `updateDj`, `deleteDj` | **Fail-Closed** (`failClosed: true`) | Transaction rolls back immediately. Taxonomy mutation is aborted. |
| **Dynamic Configuration** | `updateSystemSetting` (`publishingRequiresApproval`) | **Fail-Closed** (`failClosed: true`) | Transaction rolls back immediately. Platform setting is NOT updated. |
| **Read Operations** | Storefront browse, catalog search, item details | **N/A (No Audit Write)** | Read operations emit structured Pino logs, not persistent `audit_events` rows. |
| **Authorization Denials** | 401 Unauthorized, 403 Forbidden | **Fail-Open (Log only)** | Handled by NestJS Guards (`SessionAuthGuard`, `CapabilitiesGuard`) emitting Pino security warnings. No business transaction exists to roll back. |
| **Editorial Rejection In-App Notifications** | Dispatching in-app notification to `assigned_to` / `created_by` on admin rejection | **Decoupled (Fail-Open for Notification)** | The rejection review note and status transition commit atomically with audit. Notification dispatch is enqueued post-commit; notification failure cannot roll back the rejection. |

### 2.3 Required `AuditService` Interface Adjustment

Inspection of `backend/src/modules/audit/audit.service.ts` reveals that `AuditService.recordEvent()` currently binds directly to `this.db.insert(auditEventsTable)` and does not support receiving a transaction client:

```typescript
// Existing implementation (backend/src/modules/audit/audit.service.ts)
@Injectable()
export class AuditService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
  ) {}

  async recordEvent(input: RecordAuditEventInput): Promise<void> {
    // Uses this.db directly — cannot participate in caller's Drizzle transaction!
    await this.db.insert(auditEventsTable).values({ ... });
  }
}
```

#### Specification for Phase 3C Adjustment

To support transactional audit atomicity without breaking existing Phase 2 callers, `RecordAuditEventInput` will be extended with an optional `tx?: ApplicationTransactionClient` parameter:

```typescript
// Target contract for AuditService (backend/src/modules/audit/audit.service.ts)
import type { 
  ApplicationDatabase, 
  ApplicationTransactionClient 
} from "../../infrastructure/database/database.module.js";

export interface RecordAuditEventInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  failClosed?: boolean;
  tx?: ApplicationTransactionClient; // Optional transactional client
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
  ) {}

  async recordEvent(input: RecordAuditEventInput): Promise<void> {
    const sanitizedMeta = input.metadata
      ? (sanitizeMetadata(input.metadata) as Record<string, unknown>)
      : null;

    // Use transaction client if provided, otherwise default to pool client
    const executor = input.tx ?? this.db;

    try {
      await executor.insert(auditEventsTable).values({
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: sanitizedMeta,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (error: unknown) {
      if (input.failClosed ?? true) { // Default failClosed to true for transactional safety
        throw new Error(
          `Audit logging failed for critical event [${input.action}]: ${
            error instanceof Error ? error.message : "Database error"
          }`,
          { cause: error },
        );
      }
    }
  }
}
```

---

## Section 3: Phase 3C Capability Scope Matrix

Every proposed capability has been systematically audited against approved architectural documents (ARCH-001 through ARCH-018) and Product Owner decisions.

| Capability / Feature | Category | Authoritative Justification / Destination |
| :--- | :--- | :--- |
| **5-State Content Lifecycle Engine** (`draft`, `pending_review`, `published`, `unpublished`, `archived`) | **Phase 3C Scope** | Mandatory core state machine for movies and series (ARCH-018 Section 5). |
| **Archive Restoration Multi-Step Re-entry** (`ARCHIVED` $\rightarrow$ `DRAFT`) | **Phase 3C Scope** | Approved Product Owner final decision; direct publish strictly rejected. |
| **Dynamic Publishing Approval Gate** (`publishingRequiresApproval`) | **Phase 3C Scope** | Reads `system_settings` to route submissions between review queue and auto-publish. |
| **9-Point Publication Readiness Engine** | **Phase 3C Scope** | Authoritative server-side gate evaluated in publish transaction (ARCH-018 Section 6). |
| **Series Publication Gate** (Season 1 + Episode 1 ready) | **Phase 3C Scope** | Approved Product Owner final decision; series cannot publish as empty announcement. |
| **Movie Default Edition Outage Engine** (Case A & Case B) | **Phase 3C Scope** | Approved Product Owner final decision; guarantees continuous default availability. |
| **Polymorphic Domain Enforcement** (Option C) | **Phase 3C Scope** | ADR-034 accepted decision; service-level transaction validation of cross-type FKs. |
| **Taxonomy Governance Services** (Categories, Countries, DJs) | **Phase 3C Scope** | Authoritative CRUD services enforcing smart deletion safeguard (`ON DELETE RESTRICT`). |
| **Content Review Notes & Rejection History** | **Phase 3C Scope** | Append-only review history capturing rejection reasons across state transitions. |
| **Content Code ID Generator** (`#GF-XXXX`) | **Phase 3C Scope** | Concurrency-safe unique business identifier generator. |
| **Transactional Audit Logging for Catalog** | **Phase 3C Scope** | Within-transaction audit persistence guaranteeing audit atomicity. |
| **In-App Notification Trigger on Rejection** | **Supporting Behavior** | Secondary notification dispatched asynchronously post-commit to notify creators. |
| **`AuditService` Transactional Client Extension** | **Supporting Behavior** | Extending `RecordAuditEventInput` with optional `tx` parameter. |
| **System Settings Management Service** | **Supporting Behavior** | Service for managing platform operational flags (`publishingRequiresApproval`). |
| **Slug Generation & Collision Handling** | **Supporting Behavior** | Generates URL-safe slugs with case-insensitive uniqueness verification. |
| **Phase 1 HTTP Foundation & Exception Filtering** | **Existing Behavior to Preserve** | Global filters, interceptors, request IDs, CORS, Helmet security headers. |
| **Phase 2 Cookie Session Management** (`gifted_session`) | **Existing Behavior to Preserve** | Database-backed sessions with SHA-256 tokens and privilege rotation. |
| **Phase 2 Staff Authorization & RBAC** | **Existing Behavior to Preserve** | `RolesGuard`, `CapabilitiesGuard` (`CONTENT_PUBLISH`, etc.), customer barrier. |
| **Phase 2 Transactional Outbox & Worker** | **Existing Behavior to Preserve** | Outbox pattern with AES-256-GCM encryption for asynchronous jobs. |
| **Direct-SQL Integrity Triggers** | **Future Phase (Out of Scope)** | **REJECTED** in Phase 3B audit / ADR-034 in favor of Option C application validation. |
| **Commerce, Pricing Models, Passes, Offers** | **Future Phase (Out of Scope)** | Belongs strictly to **Phase 4 (Commerce & Entitlements)**. |
| **Payment Gateways & Mobile Money Settlement** | **Future Phase (Out of Scope)** | Belongs strictly to **Phase 5 (Payments & Settlement)**. |
| **Direct Media Uploads, Presigned URLs, Transcoding** | **Future Phase (Out of Scope)** | Belongs strictly to **Phase 6 (Media Intake & Processing)**. |
| **Playback Authorization, Range Headers, DRM** | **Future Phase (Out of Scope)** | Belongs strictly to **Phase 7 (Playback & Stream Delivery)**. |
| **Public Storefront Catalog Read APIs** | **Future Phase (Out of Scope)** | Belongs strictly to **Phase 3D (Public Storefront & Discovery APIs)**. |
| **Unresolved Open Decisions** | **None (0 Open Decisions)** | All domain rules are fully locked by Product Owner decisions and ADR-001–034. |

---

## Section 4: API Error Architecture and Canonical Error Codes

### 4.1 Envelope Compliance and Zero-Leakage Guarantee

Every error response returned by Phase 3C endpoints MUST strictly conform to the project's standard error envelope defined in `backend/src/http/api-exception.filter.ts`:

```json
{
  "success": false,
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable explanation.",
    "details": [],
    "timestamp": "2026-10-05T01:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Zero Internal Disclosure Guarantee
Under ARCH-003, no internal system details may ever be disclosed to clients:
1. **Zero PostgreSQL Error Codes:** Codes such as `23505` (unique_violation), `23503` (foreign_key_violation), or `23514` (check_violation) MUST be intercepted at the service/repository layer and translated into canonical domain exceptions.
2. **Zero Schema Leakage:** Internal table names (`content`, `movie_editions`, `series_metadata`, `system_settings`) and column names (`lead_dj_id`, `streaming_file_key`, `created_by`) MUST NOT appear in client-facing error messages.
3. **500 Sanitization:** Any unhandled exception or database failure automatically yields HTTP 500 with `code: "INTERNAL_ERROR"` and message `"An unexpected error occurred."`. Diagnostic error details and stack traces are logged exclusively to server-side Pino structured logs tagged with `requestId`.

### 4.2 Canonical Phase 3C Error Codes Table

| Error Code | HTTP Status | Trigger Condition | Public Message | Details Payload |
| :--- | :--- | :--- | :--- | :--- |
| `INVALID_CONTENT_TYPE` | 422 Unprocessable | Attempting to attach movie edition to series, or series metadata/season to movie. | "The specified content item does not support this operation." | `{ expectedType: "movie", actualType: "series" }` |
| `INVALID_HIERARCHY` | 422 Unprocessable | Attempting to attach an episode to a season of a different series, or invalid season numbering. | "The parent entity does not match the required catalog hierarchy." | `{ seasonId: "...", seriesId: "..." }` |
| `INVALID_LIFECYCLE_TRANSITION` | 400 Bad Request | Attempting an illegal status change (e.g. `archived` $\rightarrow$ `published`, or `published` $\rightarrow$ `draft`). | "The requested status transition is not permitted from the current state." | `{ currentStatus: "archived", targetStatus: "published" }` |
| `PUBLICATION_READINESS_FAILED` | 422 Unprocessable | Content fails 1 or more of the 9-point publication readiness checklist items. | "Content is not ready for publication." | Array of unmet criteria (e.g. `["missing_poster", "default_edition_media_not_ready"]`) |
| `DEFAULT_EDITION_REQUIRED` | 422 Unprocessable | Publishing a movie without a ready default edition, or removing the only default edition. | "A published movie must have an active, verified default edition." | `{ movieId: "..." }` |
| `SERIES_INITIAL_CONTENT_REQUIRED` | 422 Unprocessable | Attempting to publish a series that lacks Season 1 or Episode 1 with ready media. | "Initial series publication requires Season 1 and Episode 1 with ready media." | `{ missing: ["season_1", "episode_1_media"] }` |
| `REJECTION_REASON_REQUIRED` | 400 Bad Request | An administrator attempts to reject content without providing a non-empty written reason. | "A written rejection reason is required." | N/A |
| `TAXONOMY_IN_USE` | 409 Conflict | Attempting to delete a category, country, or DJ referenced by existing catalog content. | "Cannot delete taxonomy item because it is referenced by catalog content. Deactivate it instead." | `{ referenceCount: 14 }` |
| `SLUG_ALREADY_EXISTS` | 409 Conflict | Creating or updating content, category, or DJ with a slug that conflicts (case-insensitive). | "A catalog item with this slug already exists." | `{ slug: "action-movies" }` |
| `CODE_ID_COLLISION` | 409 Conflict | Generated or supplied `code_id` conflicts with existing catalog item. | "A catalog item with this code ID already exists." | `{ codeId: "#GF-1042" }` |
| `CONTENT_NOT_FOUND` | 404 Not Found | Referenced content ID does not exist. | "The requested catalog item was not found." | N/A |
| `SEASON_NOT_FOUND` | 404 Not Found | Referenced season ID does not exist. | "The requested season was not found." | N/A |
| `EPISODE_NOT_FOUND` | 404 Not Found | Referenced episode ID does not exist. | "The requested episode was not found." | N/A |
| `EDITION_NOT_FOUND` | 404 Not Found | Referenced movie edition ID does not exist. | "The requested movie edition was not found." | N/A |
| `TAXONOMY_NOT_FOUND` | 404 Not Found | Referenced category, country, or DJ ID does not exist. | "The requested taxonomy item was not found." | N/A |
| `UNAUTHORIZED` | 401 Unauthorized | Request lacks valid staff authentication session. | "Authentication required." | Handled by `SessionAuthGuard` |
| `INSUFFICIENT_CAPABILITY` | 403 Forbidden | Authenticated staff user lacks the required permission (e.g. `CONTENT_PUBLISH`). | "You do not have permission to perform this catalog operation." | Handled by `CapabilitiesGuard` |

### 4.3 Error Classification & Filter Enhancement Specification

#### 422 vs 400 Semantic Boundary
* **HTTP 400 Bad Request:** Syntactic errors, malformed request bodies, missing required DTO parameters, or requests that violate the formal state-machine protocol (e.g. attempting an impossible transition like `ARCHIVED` $\rightarrow$ `PUBLISHED`, or omitting the mandatory written rejection reason).
* **HTTP 422 Unprocessable Entity:** Semantically valid payloads where the client provided well-formed JSON, but internal business domain invariants reject execution (e.g. polymorphic type mismatches, hierarchy mismatches, publication readiness check failures, or missing default editions).

#### `ApiExceptionFilter` Modernization Contract
In Phase 1, `ApiExceptionFilter` utilized a static `STATUS_DETAILS` lookup table. To support rich domain error codes while maintaining the strict envelope:
* When an `HttpException` provides an object response containing `code` and `message` (and optional `details`), `ApiExceptionFilter` will extract and emit those fields directly:
  ```typescript
  // ApiExceptionFilter extraction logic
  const response = exception instanceof HttpException ? exception.getResponse() : null;
  const isCustomDomainResponse = 
    typeof response === "object" && response !== null && "code" in response;

  const code = isCustomDomainResponse 
    ? (response as any).code 
    : statusDetails?.code ?? (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_REJECTED");

  const message = isCustomDomainResponse 
    ? (response as any).message 
    : statusDetails?.message ?? (statusCode >= 500 ? "An unexpected error occurred." : "The request was rejected.");
  ```
* This allows services to throw standard NestJS exceptions (e.g. `new UnprocessableEntityException({ code: 'INVALID_CONTENT_TYPE', message: '...' })`) which are cleanly serialized into the standard envelope without any SQL disclosure.

---

## Section 5: Implementation Readiness Checklist

### 5.1 Verified Prerequisites
- [x] **Phase 3B Persistence Complete:** Schemas, indexes, partial unique constraints, and migrations (`0003`, `0004`) verified in PostgreSQL.
- [x] **ADR-034 Formally Accepted:** Option C (Transactional Domain Enforcement) formally approved by Product Owner; direct-SQL residual risk documented.
- [x] **Automated Regression Suite 100% Green:** 161 automated backend tests passing against isolated PostgreSQL cluster.
- [x] **Quality Gates Passing:** TypeScript strict compilation, ESLint, and Fastify HTTP build all passing with zero errors.
- [x] **Concurrency & Deadlock Prevention Architected:** SQL-level row-locking patterns (`FOR KEY SHARE` vs `FOR UPDATE`) and hierarchical top-down lock ordering defined.
- [x] **Transactional Audit Model Architected:** In-transaction audit persistence and `AuditService` interface adjustment specified.
- [x] **Scope Boundaries Formally Locked:** 5-category scope matrix fully documented; zero commerce, payment, or playback leakage.
- [x] **API Error Contracts Standardized:** Canonical error table and envelope compliance fully specified.

### 5.2 Remaining Gates Before Stage 2 Execution
- [ ] **Product Owner Approval:** Human Product Owner review and formal sign-off of this Refined Design Specification (`ARCH-019-PHASE-3C-STAGE-1-REFINED`).
- [ ] **Stage 2 Authorization:** Explicit authorization from Product Owner to proceed to Stage 2 implementation (Services, State Machines, Controllers, Integration Tests).

---

> **CRITICAL DIRECTIVE:**  
> This specification represents a completed design refinement. Zero production code, migrations, or runtime schema changes have been implemented. Execution remains halted at **PHASE 3C STAGE 1 — REVISED DESIGN AWAITING PRODUCT OWNER REVIEW** awaiting explicit human authorization.
