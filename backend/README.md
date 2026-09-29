# GIFTEDproMovies — Backend Workspace

Welcome to the backend workspace for **GIFTEDproMovies**.

---

## 1. Workspace Status

* **Status:** Workspace Initialized (Pre-Implementation Phase).
* **Implementation:** Backend implementation has **not started yet**.
* **Technology Selection:** Framework, database, ORM, authentication libraries, storage SDKs, queue systems, and runtime choices have **not yet been decided**.

---

## 2. Upcoming Phase: Architecture & Technology Evaluation

Before any backend code is written, a dedicated **Backend Architecture & Technology Evaluation** will be conducted. This evaluation will analyze:
* System scale, concurrency requirements, and regional network latency (East Africa / diaspora).
* High-volume video streaming and secure signed HLS distribution.
* Mobile money payment webhooks and idempotent transaction reconciliation.
* Cloud object storage architectures and presigned direct-upload mechanisms.
* Technology-neutral evaluation of runtimes, web frameworks, relational databases, and infrastructure providers.

---

## 3. Business Requirements & System Specifications

All backend business logic, domain boundaries, state transitions, and entity models are formally documented in the central project documentation repository:
* **System Business Logic & Modules Specification:** [`../docs/SYSTEM_BUSINESS_LOGIC_AND_MODULES.md`](../docs/SYSTEM_BUSINESS_LOGIC_AND_MODULES.md)
* **Backend Architecture & Integration Guide:** [`../docs/BACKEND_INTEGRATION_GUIDE.md`](../docs/BACKEND_INTEGRATION_GUIDE.md)

Key domain realities governing the future backend include:
* **Embedded DJ Audio Editions:** Swahili voiceover commentators (DJs) have their audio stems physically hard-muxed into video files. Each movie container holds one or more discrete DJ video editions.
* **12 Operational System Modules:** Spanning Public Discovery, Episodic Series, In-Flow Media Intake, DJ Editions Manager, Admin Publishing Gate, Mobile Money Payments (M-Pesa/Tigo/Airtel), Video Playback Security, Role-Based Access Control (RBAC), and Notification Engine.

---

## 4. Architectural Separation & Integration Boundary

The frontend and backend of GIFTEDproMovies are intentionally developed as **independent, decoupled workspaces**:
* There are no source-level imports or filesystem dependencies between frontend and backend.
* The frontend relies on typed contracts and repository abstractions.
* Integration between frontend and backend will occur strictly over the HTTP/REST or GraphQL API boundary once the backend reaches an integration-ready state.

```text
+-----------------------+
|   FRONTEND CLIENT     |
|  (Next.js App Router) |
+-----------+-----------+
            |
            | HTTP / REST API Contract
            v
+-----------------------+
|   BACKEND SERVICE     |
| (Workspace: backend/) |
+-----------------------+
```

---

## 5. Directory Layout

```text
backend/
├── src/            # Reserved for backend application source code
├── tests/          # Reserved for backend unit, integration, and e2e test suites
├── docs/           # Reserved for backend-specific technical & architecture documents
├── scripts/        # Reserved for development, database migration, or maintenance scripts
├── .env.example    # Technology-neutral environment variable template
├── .gitignore      # Backend-specific ignore rules (secrets, dependencies, logs)
└── README.md       # This workspace overview
```
