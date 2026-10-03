# GIFTEDproMovies — Documentation Directory

This directory contains the complete technical and product documentation for the **GIFTEDproMovies** platform, organized into clear, decoupled domains:

```text
docs/
├── frontend/                               # Frontend Architecture & UI Specifications
│   ├── 00_PROJECTS_RULE.md                 # Constitution & non-negotiable rules
│   ├── 01_TECHSTACK.md                     # Next.js, Tailwind v4, TypeScript
│   ├── 02_DESIGN_SYSTEM.md                 # Typography, colors, glassmorphism tokens
│   ├── 05_FRONTEND_ARCHITECTURE.md         # Component boundaries, layers, data flow
│   ├── 06_ROUTE_MAP.md                     # App Router navigation, routes & guards
│   ├── 07_COMPONENT_ARCHITECTURE.md        # UI component composition & hierarchy
│   ├── 08_DATA_MODELS.md                   # Canonical frontend domain types
│   ├── 09_MOCK_DATA_CONTRACT.md            # Modular mock repositories & schemas
│   ├── 12_MOVIE_DETAILS.md                 # Movie details & version selection flow
│   ├── 13_SERIES_EXPERIENCE.md             # Series, seasons & episode discovery
│   ├── 14_AUTH_UI.md                       # Login, register, password recovery
│   ├── 15_CUSTOMER_LIBRARY.md              # Continue watching, passes, downloads
│   ├── 16_PURCHASE_FLOW.md                 # LipaModal mobile money checkout flow
│   ├── 17_STREAMING_UI.md                  # /watch/[slug] theater cinema player
│   ├── 18_DOWNLOAD_UI.md                   # Offline package downloads management
│   ├── 20_ADMIN_UI.md                      # 16 Admin governance & ledger views
│   ├── 21_MEDIA_TEAM_UI.md                 # 12 Media intake, QC & stem tools
│   ├── 28_MOCK_API_BOUNDARY.md             # Repositories & API replacement contracts
│   └── [22-30 Quality, Performance, etc.]
│
├── architecture/                           # Backend System Architecture & ADRs
│   ├── 01-SYSTEM-ARCHITECTURE-AND-ENGINEERING-PRINCIPLES.md
│   └── [Upcoming Backend Architecture Documents]
│
├── SYSTEM_BUSINESS_LOGIC_AND_MODULES.md    # 12 Operational System Modules & Business Logic
└── BACKEND_INTEGRATION_GUIDE.md            # Relational ERD, API specs & CDN architecture
```

---

## Navigation Guide

1. **For Frontend Developers:** Browse [`docs/frontend/`](./frontend/) for component hierarchies, design tokens, route maps, and UI state contracts.
2. **For Backend Engineers:** Start with [`docs/SYSTEM_BUSINESS_LOGIC_AND_MODULES.md`](./SYSTEM_BUSINESS_LOGIC_AND_MODULES.md) to understand the business rules, followed by [`docs/BACKEND_INTEGRATION_GUIDE.md`](./BACKEND_INTEGRATION_GUIDE.md) and [`docs/architecture/`](./architecture/).
