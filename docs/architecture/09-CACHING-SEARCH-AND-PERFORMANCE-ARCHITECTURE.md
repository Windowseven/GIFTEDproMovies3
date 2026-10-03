# Caching, Search, and Performance Architecture

> **Document ID:** ARCH-009 · **Status:** Architecture guidance · **Depends on:** ARCH-001–008

## Performance principles

Optimize measured user-visible and operational bottlenecks across client, network, API, database, and media delivery. Do not add infrastructure as the first response. No latency, throughput, bitrate, or availability guarantee is declared here; targets require representative workload and production telemetry (ARCH-001).

Prioritize selective projections, bounded pagination, indexed predicates, avoiding N+1 loads, minimizing round trips, stable serializers, compressed JSON where beneficial, direct-to-storage uploads, and CDN media delivery. Never block the Node event loop with synchronous CPU work or serialize unnecessarily deep object graphs.

## Caching policy

Caching is an optimization with explicit correctness and privacy rules. The initial strategy is HTTP caching for suitable public catalog data, CDN caching for public static assets and provider-managed media, PostgreSQL query/index efficiency, and request-local reuse where safe. Standalone Redis/application cache fleets remain **DEFERRED** unless telemetry shows a need.

| Data | Initial posture |
| --- | --- |
| Public published catalog | Candidate for bounded public cache and validators where publication freshness permits. |
| Artwork/static public assets | Long-lived immutable caching only when URL/version changes on replacement. |
| User profile, orders, library, entitlements | Private/no shared cache by default; avoid stale authorization. |
| Payment status and admin operations | No shared cache; freshness and access control dominate. |
| Playback authorization/token | Do not cache across users or beyond the authorization window. |
| Download quota, usage, and authorization | Never rely on stale/shared cache; backend authorization and atomic quota decision are required for every download request. |
| Session/device/active stream state | Do not use shared stale cache as the authority for revocation, device limits, or atomic concurrent-stream enforcement. |
| In-app notification history/read state | User-scoped and current; no shared cache for read state or inbox ownership. |
| Search results | Cache only if query identity, publication updates, and freshness are explicit. |

Do not invent TTLs. Choose cache directives from the tolerated staleness and invalidation path. Where a changed item can remain stale, document the consequence. Authorization checks cannot rely on cache entries whose revocation/expiry state may have changed. Each download request performs current backend authorization and an atomic quota operation; frontend state and cache cannot enforce usage. Stream leases, device registration limits, and session revocation likewise require authoritative state transitions, not stale cache reads.

## Invalidation and CDN behavior

Prefer versioned asset URLs for immutable artwork/media outputs. For mutable catalog resources, use validators such as ETags or Last-Modified when stable representation versioning can be produced. Publishing, unpublishing, asset replacement, taxonomy changes, and access-policy changes must trigger or tolerate cache invalidation according to explicit freshness policy. Private media manifests and protected downloads must not become public through CDN configuration. CDN invalidation capabilities and cost are provider-validation items.

## PostgreSQL query and connection efficiency

Design SQL around actual bounded access patterns. Index foreign keys and uniqueness requirements, align composites with filter and ordering combinations, consider partial indexes only for immutable predicates, and validate plans against representative data. Avoid loading full media hierarchies for cards, fetching unused relations, or issuing per-row lookups. Use cursor pagination for deep result sets with deterministic order and indexed cursor keys. Set pool size based on database limits and total application instances; do not multiply a per-instance default beyond capacity. Keep transactions short and exclude provider calls.

PostgreSQL full-text search (`tsvector`/GIN) is the accepted initial option (ARCH-001). Searchable fields, language configuration, stemming, accent handling, ranking, typo tolerance, and taxonomy weighting require content/product validation. Use allowlisted filters and deterministic sort keys. A dedicated search engine is **DEFERRED** until demonstrated limitations justify operational cost.

## HTTP and payload efficiency

Return only view-needed fields. Listing/card data should remain smaller than detail/episode data; do not include raw vendor metadata or audit fields in public contracts. Enforce maximum page sizes, explicit response schemas, and compression thresholds selected from measured payloads. HTTP/2/3 can be terminated at an edge where deployment supports it; this is not an application-level correctness dependency.

Use lazy loading for secondary hierarchies and artwork variants when it reduces transfer/work without creating sequential authorization/database query chains. Critical authorization should use an efficient bounded query/path, not repeated lazy lookups. Defer expensive noncritical work through durable jobs (ARCH-007).

## Budgets and measurement

Performance is measured and managed, not based on unsupported promises. Instrument API latency, throughput, error rate, request/response size and expensive-operation behavior; database query plans, latency, pool/resource use and transaction cost; frontend/network requests and payloads; media startup/delivery; and async job age/retry/failure. Use bounded pagination, request/payload limits, rate limits, and protections against unbounded or expensive operations. Targets/budgets are established from observed workload and production requirements and revisited as the system evolves; no universal latency or SLA number is asserted. Set concrete budgets where they materially improve engineering decisions, based on representative workloads and telemetry. Optimize through query/index quality, avoiding N+1 and unnecessary requests/data, code splitting/lazy loading where useful, compression/caching, efficient serialization, and CDN delivery before adding infrastructure.

## Related documents

ARCH-001 performance principles · ARCH-002 database/search · ARCH-004 API response/pagination · ARCH-005 CDN/media · ARCH-007 deferred work · ARCH-010 metrics.
