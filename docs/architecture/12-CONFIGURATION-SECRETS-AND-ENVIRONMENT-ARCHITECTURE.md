# Configuration, Secrets, and Environment Architecture

> **Document ID:** ARCH-012 · **Status:** Architecture guidance · **Depends on:** ARCH-001–011

## Configuration ownership

Configuration controls deployment-specific behavior; business rules with audit or customer impact belong in domain-owned policy/configuration, not arbitrary environment variables. Environment configuration covers process mode, service URLs, database connectivity, allowed origins, logging level, provider enablement, timeouts, and operational limits. Each setting needs an owner, type, safe default or explicit required marker, and documentation of whether restart is required.

The application validates required configuration at startup and fails fast with a redacted, actionable error. Parse and validate values once into typed configuration; do not read raw environment values throughout domain services. Never silently substitute insecure defaults for production credentials, session/signing secrets, database URLs, or provider credentials.

## Environment separation

Maintain logically isolated development, test, staging, and production configuration and credentials. Staging should use test/sandbox providers and synthetic data where available. Production secrets and data must not be copied into local/test environments. Exact environment topology and whether staging is available are **REQUIRES VALIDATION**; names here describe configuration profiles, not a required hosting platform.

Test configuration must make accidental live provider calls difficult (disabled by default or explicit opt-in with safe destinations). Local development may use documented non-secret placeholders only when they cannot authenticate to real services.

## Secrets and rotation

Secrets include PostgreSQL credentials, payment provider keys, webhook signing secrets, object storage credentials, media signing keys, session-cookie secrets/keys, email credentials, verification/password-recovery token signing or hashing material where applicable, and encryption keys if any are adopted. SMS credentials are not required for current scope. Keep secrets out of source control, documentation examples, frontend bundles, logs, build artifacts, and ordinary database rows. Prefer a managed secret store or protected deployment injection mechanism selected by operations; no vendor is chosen.

Grant least privilege and separate credentials by environment and provider function. Rotation must permit overlap or controlled cutover where supported, with an owner, verification, rollback, and audit trail. Rotation cadence is **REQUIRES VALIDATION** based on provider capability and risk. Do not rotate cryptographic keys without considering active sessions, signed media URLs, encrypted data, and verification of old key IDs during migration.

## Sensitive configuration classes

* **Database:** least-privileged application account, TLS/connection options where supported, pool cap coordinated with total instance count.
* **Cookies/sessions:** opaque cookie and database-backed session policy; inactivity/absolute timeout values are configuration/security-policy values with server-side enforcement (ARCH-003). Session identifiers do not embed complete authentication state in client-readable data.
* **Payments:** separate initiation credentials and webhook verification secrets where provider supports; restrict console access.
* **Media/storage:** narrowly scoped upload/signing credentials; application never hands long-lived credentials to clients.
* **Notifications:** confirmed email channel credentials isolated from application logs and frontend; in-app persistence is database-owned and does not require an external delivery secret. Push remains deferred and SMS is not currently required.
* **Encryption:** only adopt key material where a defined data-at-rest/application encryption need exists; do not invent custom cryptography.

## Runtime behavior and configuration change

Core infrastructure and security configuration is validated before accepting traffic. Runtime changes should be explicit, audited if business-affecting, and consistent across horizontally scaled instances. Do not rely on one node's in-memory setting as a source of truth. Document restart/reload semantics and safe rollout when a key or provider endpoint changes.

## Related documents

ARCH-001 stateless application · ARCH-003 security · ARCH-006 payment adapters · ARCH-010 redaction · ARCH-013 deployment.
