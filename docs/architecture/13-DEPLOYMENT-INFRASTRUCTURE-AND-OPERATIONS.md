# Deployment, Infrastructure, and Operations

> **Document ID:** ARCH-013 · **Status:** Architecture guidance · **Depends on:** ARCH-001–012

## Deployment shape

Deploy one backend modular monolith application with stateless compute and managed PostgreSQL. The frontend is a separate client/deployment boundary and communicates with the backend through the versioned API. Media storage, processing, and edge delivery are external managed capabilities behind adapters (ARCH-005). No cloud vendor, container platform, or deployment product is selected by this document.

The initial operational footprint should be the smallest deployment that satisfies availability, security, and measured performance. Do not introduce Kubernetes, service mesh, a dedicated API gateway, microservices, or separate fleets without an approved evidence-based architecture review. Horizontal replication may be used when traffic/reliability needs justify it; all instances share durable state outside process memory.

## Environment and traffic boundaries

Separate production from non-production credentials/data and provider accounts. Terminate HTTPS at a controlled edge/load balancer where available; enforce trusted origin, forwarded-header, and request-ID handling between edge and application. Do not trust arbitrary forwarding headers. Restrict database network access to application/operations paths and restrict admin/management interfaces appropriately.

The app serves JSON and small metadata, not raw media. Upload bytes go directly to storage and playback bytes from the media delivery network. Configure edge behavior so private playback assets require authorization and origin access is not public by accident.

## Startup, readiness, and graceful shutdown

At startup validate configuration, initialize essential adapters/pools, and fail before accepting traffic if required dependencies/configuration are unusable. Liveness indicates process responsiveness; readiness indicates ability to serve essential requests, including database connectivity. Startup/readiness checks must be bounded and low-cost (ARCH-010).

On shutdown, stop accepting new work, stop claiming jobs, allow in-flight HTTP/critical work to complete within a configured grace period, release/expire job claims safely, and close database/provider resources. Grace period and platform signal behavior are deployment-specific **REQUIRES VALIDATION**. Abrupt shutdown must still be safe through idempotent operations and durable jobs.

## Database changes and release strategy

Database migrations are reviewed release artifacts. Use expand/contract or another compatibility-aware sequence when old and new application versions may overlap. Back up or verify recovery posture before high-risk changes; avoid destructive schema changes in the same step that removes old application compatibility. Migration execution must be single-coordinated and observable, not run independently by every app instance. Rollback may require a forward fix where data transformation is irreversible; document this before release.

Deployments should support health-based traffic admission, rollback to a compatible application version, and clear release identity in logs. CI/CD should automate repeatable build, quality gates (ARCH-011), artifact provenance, and controlled environment promotion. Specific rollout style and approval gates are **REQUIRES VALIDATION**.

## Scaling, cost, and failure scenarios

Scale application instances horizontally only when statelessness, session strategy, pool budget, and job claiming support it. Aggregate connection limits across all instances, scheduled runners, migrations, and operational clients. Use a read replica only when measured read pressure justifies replication lag/complexity. Media egress belongs to managed delivery/CDN, not app compute. Cost review considers compute, database capacity, media storage/egress/transcoding, payment fees, and notification delivery; no provider economics are assumed.

Expected failure cases include app instance crash, database unavailable, provider timeout/outage, delayed webhook, media processing delay, storage authorization expiry, and deployment rollback. Domain state remains durable; retries/reconciliation occur through ARCH-007. When provider confirmation establishes payment success but fulfillment is delayed, customer/API state reports payment success separately from access processing or operational recovery; it must not imply payment failure or require another purchase. Runbooks and recovery actions are developed before production operations, with detailed recovery principles in ARCH-014.

## Related documents

ARCH-001 topology · ARCH-005 media boundaries · ARCH-007 durable work · ARCH-010 health · ARCH-011 quality gates · ARCH-012 configuration · ARCH-014 recovery.
