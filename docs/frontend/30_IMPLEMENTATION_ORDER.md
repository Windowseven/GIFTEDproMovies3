# GIFTEDproMovies

## Frontend Implementation Order & Execution Roadmap

**Document ID:** MD-30
**File:** `docs/30_IMPLEMENTATION_ORDER.md`
**Version:** 1.0
**Status:** Final Frontend Implementation Contract
**Scope:** Frontend only
**Product:** GIFTEDproMovies

---

# 1. Purpose

This document defines the exact implementation sequence for the GIFTEDproMovies frontend.

The goal is to prevent:

* random feature development;
* premature backend work;
* duplicated components;
* inconsistent UI;
* broken dependencies;
* unfinished flows;
* AI-generated architecture drift;
* implementing advanced features before foundational systems are ready.

The implementation must follow the dependency order defined in this document unless an explicit architectural reason requires a documented change.

---

# 2. Final Frontend Scope

The frontend implementation includes:

* public discovery;
* homepage;
* search;
* filters;
* movies;
* series;
* seasons;
* episodes;
* DJ/Translator discovery;
* authentication UI;
* customer account;
* Library;
* purchases;
* downloads;
* streaming UI;
* subscriptions;
* checkout;
* payment states;
* Admin experience;
* Media Team experience;
* responsive design;
* accessibility;
* animation;
* performance;
* error/loading/empty states;
* mock data;
* repository boundary;
* QA.

It does **not** include:

* production backend;
* database;
* real authentication backend;
* real payment integration;
* payment webhooks;
* production storage;
* production streaming infrastructure;
* production download infrastructure;
* DRM implementation;
* server-side entitlement enforcement.

---

# 3. Implementation Philosophy

The frontend must be built from the inside out:

```text id="4o5d8k"
Foundation
    ↓
Design System
    ↓
Architecture
    ↓
Shared Components
    ↓
Mock Data + Repositories
    ↓
Public Experience
    ↓
Customer Experience
    ↓
Commerce
    ↓
Playback / Downloads
    ↓
Admin
    ↓
Media Team
    ↓
Responsive + Accessibility + Performance
    ↓
QA
    ↓
Final Polish
```

Do not reverse this order without a documented reason.

---

# 4. Phase 0 — Project Bootstrap

## Objective

Create a clean, production-quality Next.js frontend foundation.

Implement:

* Next.js App Router;
* React;
* TypeScript strict mode;
* Tailwind CSS;
* pnpm;
* ESLint;
* Prettier;
* Git configuration;
* basic project scripts.

Establish:

```text id="d1t0ny"
app/
components/
features/
data/
lib/
hooks/
styles/
docs/
```

Verify:

* project starts;
* development server works;
* production build works;
* TypeScript works;
* lint works;
* formatting works.

### Exit Gate

Do not continue until the base project is clean and builds successfully.

---

# 5. Phase 1 — Design Tokens & Global Foundation

Implement the Design System.

Establish:

* colors;
* typography;
* spacing;
* radius;
* borders;
* elevation;
* container;
* breakpoints;
* focus states;
* disabled states;
* button foundations;
* input foundations;
* modal foundations;
* sheet foundations;
* badge/pill foundations.

Brand palette:

```text id="h3r6sj"
Background       #08090C
Surface          #111318
Elevated         #181A21
Crimson          #B11226
Gold             #D6A84F
Primary Text     #F5F5F5
Secondary Text   #A6A8B0
Muted            #70737C
Border           #262932
Subtle Border    #1C1E25
```

### Exit Gate

Every new UI element must be capable of using the established design tokens instead of introducing random values.

---

# 6. Phase 2 — Global Layout & Navigation

Build:

* root layout;
* desktop header;
* mobile header;
* navigation;
* mobile navigation;
* account menu;
* global container;
* page shell;
* footer;
* basic route transitions.

Navigation must support:

* public routes;
* customer routes;
* Admin routes;
* Media Team routes.

Role-specific navigation must remain isolated.

### Exit Gate

All major route groups can render inside the common application shell.

---

# 7. Phase 3 — Core UI Primitives

Implement reusable primitives first.

Examples:

* Button;
* IconButton;
* Input;
* SearchInput;
* Select;
* Badge;
* Pill;
* Dialog;
* BottomSheet;
* Dropdown;
* Tabs;
* Skeleton;
* EmptyState;
* ErrorState;
* LoadingState;
* Toast;
* Progress;
* Tooltip;
* Avatar;
* Poster.

These must follow accessibility requirements from the beginning.

### Rule

Do not create multiple visually different versions of the same primitive without a documented need.

---

# 8. Phase 4 — Core Media Components

Build the components that define the product visually.

Priority:

1. Poster
2. MovieCard
3. SeriesCard
4. ContentRail
5. SectionHeader
6. Hero
7. Metadata
8. Rating/Status presentation where required
9. MovieVersionSelector
10. Watch CTA
11. Download CTA
12. LIPA CTA

MovieCard is a critical product component.

It must support:

* desktop hover;
* mobile interaction;
* poster;
* title;
* metadata;
* version information where needed;
* price;
* Watch;
* Download;
* state variations.

### Exit Gate

A single MovieCard implementation should be reusable throughout public discovery, search, categories, countries, DJs, Library, and related content.

---

# 9. Phase 5 — Mock Data & Repository Layer

Before implementing complex product flows, establish the data architecture.

Implement:

```text id="4s2y73"
Typed Domain Models
        ↓
Mock Data
        ↓
Repositories
        ↓
Controllers / Hooks
        ↓
UI
```

Create the mock datasets defined in MD-09.

Implement repositories for:

* movies;
* movie versions;
* series;
* seasons;
* episodes;
* categories;
* countries;
* DJs/Translators;
* users;
* subscriptions;
* orders;
* payments;
* entitlements;
* downloads;
* devices;
* metrics.

### Critical Rule

UI components must not directly depend on raw mock datasets.

### Exit Gate

The UI must be able to consume typed domain data through repositories.

---

# 10. Phase 6 — Homepage & Public Discovery

Build the homepage.

Required order:

```text id="r6yq7j"
Trending Movies
Featured Movies
New Releases
Popular Movies
Movies by Categories
Movies by Country
DJs / Translators Collection
```

Implement:

* cinematic content presentation;
* hero;
* content rails;
* MovieCard;
* SeriesCard where applicable;
* category discovery;
* country discovery;
* DJ discovery;
* responsive behavior;
* loading states;
* empty states.

### Exit Gate

A guest can enter GIFTEDproMovies and discover meaningful content without authentication.

---

# 11. Phase 7 — Search & Discovery System

Implement:

* search input;
* suggestions;
* `/search`;
* query parameters;
* search results;
* content type filters;
* category filters;
* country filters;
* DJ/Translator filters;
* combined filtering;
* active filter state;
* clear filters;
* no-results state.

Required filter logic:

```text id="5y7z0v"
OR within same filter dimension
AND across different dimensions
```

Search state should remain URL-addressable.

### Exit Gate

A user can discover a specific movie using:

* title;
* series;
* category;
* country;
* DJ/Translator;
* combined filters.

---

# 12. Phase 8 — Movie Details

Implement:

* movie hero;
* poster;
* backdrop;
* title;
* metadata;
* description;
* trailer;
* categories;
* countries;
* DJ/Translator;
* versions;
* streaming price;
* download price;
* access duration;
* Watch;
* Download;
* LIPA;
* related content.

Implement version-aware state.

Example:

```text id="1ce64x"
Select DJ Mack
      ↓
DJ Mack Version
      ↓
Price updates
      ↓
Watch / Download
```

### Exit Gate

The movie detail experience is capable of taking a customer from discovery to an intended purchase/watch/download action.

---

# 13. Phase 9 — Series Experience

Implement:

* series details;
* seasons;
* season selector;
* episode list;
* EpisodeCard;
* episode details;
* previous/next episode;
* progress;
* continue watching;
* DJ/Translator/version handling.

Support the frontend representation of:

* per episode;
* per season;
* full series;
* combination.

Do not permanently hard-code one pricing model.

### Exit Gate

A customer can navigate:

```text id="h8y1p6"
Series
 ↓
Season
 ↓
Episode
 ↓
Watch / Download / LIPA
```

---

# 14. Phase 10 — Authentication UI

Implement:

* Login;
* Register;
* Forgot Password;
* Reset Password;
* Logout;
* session state;
* session expired state;
* unauthorized state.

Authentication uses:

**Email + Password**

Implement mock authentication only.

Support return-to context:

```text id="s6d2px"
Movie
 ↓
WATCH
 ↓
Login
 ↓
Return to Movie
 ↓
Continue intended action
```

### Exit Gate

Authentication must not destroy the user's original product context.

---

# 15. Phase 11 — Customer Account & Library

Implement:

* `/account`;
* `/library`;
* `/purchases`;
* `/downloads`;
* `/account/subscription`.

Library sections:

```text id="5k1lq7"
Continue Watching
Recently Added
Your Movies
Your Series
Downloads
```

Implement:

* progress;
* expiration;
* Expiring Soon;
* expired access;
* subscription content;
* individual purchases;
* series progress;
* version ownership.

### Exit Gate

A customer can understand what content they currently have access to and what actions are available.

---

# 16. Phase 12 — Purchase & Checkout

Implement:

* purchase summary;
* Watch vs Download selection;
* version selection;
* pricing;
* access duration;
* authentication requirement;
* LIPA CTA;
* payment method selection;
* payment pending;
* payment success;
* payment failed;
* payment cancelled;
* retry.

Tanzania Mobile Money remains the payment category.

Exact providers must not be invented before confirmed.

### Exit Gate

The entire purchase journey works through deterministic mock states.

---

# 17. Phase 13 — Subscription Experience

Implement:

* subscription discovery;
* plan cards;
* plan comparison;
* duration;
* scope;
* streaming/download access;
* Subscribe;
* LIPA;
* checkout;
* pending;
* success;
* failure;
* active subscription;
* expiring subscription;
* expired subscription.

Critical rule:

```text id="2l6t8y"
Subscription
    ≠
Individual Purchase
```

Individual purchases remain independent.

### Exit Gate

The UI clearly communicates the difference between subscription access and individual ownership.

---

# 18. Phase 14 — Streaming Experience

Implement the playback interface.

Build:

* player shell;
* play/pause;
* progress;
* volume;
* mute;
* fullscreen;
* quality;
* subtitles;
* audio;
* next episode;
* previous episode;
* buffering;
* errors;
* resume;
* start over;
* completion;
* access states.

Playback should use a media adapter/repository boundary rather than embedding future streaming infrastructure directly into UI components.

### Exit Gate

The player correctly represents every documented playback state using mock media behavior.

---

# 19. Phase 15 — Download Experience

Implement:

* Downloads page;
* download manager UI;
* progress;
* pause;
* resume;
* cancel;
* retry;
* completed;
* failed;
* expired;
* unavailable.

Use protected-download concepts.

Do not implement unrestricted public media URLs.

### Exit Gate

Download behavior is clearly separated from streaming and respects entitlement states in the frontend model.

---

# 20. Phase 16 — Admin Experience

Implement Admin after the public/customer foundation is stable.

Build:

### Dashboard

* movies;
* series;
* episodes;
* customers;
* sales;
* revenue;
* orders;
* views;
* downloads;
* subscriptions;
* payment states.

### Management

* movies;
* series;
* seasons;
* episodes;
* categories;
* countries;
* DJs;
* users;
* Media Team;
* subscriptions;
* pricing;
* orders;
* payments;
* sales;
* featured;
* trending;
* settings.

### Content Management

Implement:

* create;
* edit;
* draft;
* publish;
* archive;
* media assets;
* versions;
* pricing;
* access duration.

### Exit Gate

Admin can operate the business-side UI without exposing Admin capabilities to other roles.

---

# 21. Phase 17 — Media Team Experience

Implement:

* Media Team dashboard;
* movies;
* series;
* seasons;
* episodes;
* upload;
* edit;
* preview;
* drafts;
* publishing state.

Content workflow:

```text id="8j5qz0"
Basic Information
 ↓
Visual Assets
 ↓
Classification
 ↓
DJ / Translator
 ↓
Versions
 ↓
Media
 ↓
Publishing
```

Financial information must remain unavailable.

Publishing approval must remain configurable until the business decision is finalized.

### Exit Gate

Media Team can perform content operations without becoming an Admin.

---

# 22. Phase 18 — Motion Implementation

After functional flows exist, implement the complete motion system.

Priority:

1. MovieCard;
2. Hero;
3. ContentRail;
4. buttons;
5. version selector;
6. search/filter;
7. sheets/dialogs;
8. checkout;
9. success/error;
10. player controls;
11. upload/download;
12. page transitions.

Motion must not delay core functionality.

### Rule

No animation should exist solely because “the page needs more animation.”

---

# 23. Phase 19 — Responsive Hardening

Perform a dedicated responsive pass across the complete application.

Test:

* 320px;
* 375px;
* 390px;
* 430px;
* tablet;
* laptop;
* desktop;
* wide desktop.

Review every major route.

Focus on:

* navigation;
* hero;
* MovieCard;
* rails;
* search;
* filters;
* movie details;
* series;
* checkout;
* player;
* Library;
* Admin;
* Media Team.

### Exit Gate

No important feature should require desktop-only interaction.

---

# 24. Phase 20 — Accessibility Hardening

Perform a complete accessibility pass.

Test:

* keyboard;
* focus;
* screen reader;
* labels;
* headings;
* landmarks;
* forms;
* dialogs;
* bottom sheets;
* player controls;
* filters;
* search;
* status announcements;
* reduced motion.

Fix accessibility problems before final QA.

---

# 25. Phase 21 — Performance Hardening

Review:

* bundle size;
* Client Components;
* image loading;
* lazy loading;
* hero priority;
* DOM size;
* re-renders;
* animation performance;
* blur effects;
* player resources;
* download progress;
* upload progress;
* Admin tables;
* charts.

Verify Core Web Vitals and other relevant performance metrics.

### Rule

Do not optimize blindly.

Profile first, then optimize the actual bottleneck.

---

# 26. Phase 22 — Security Review

Perform frontend security review.

Verify:

* no secrets;
* no sensitive credentials;
* no private keys;
* no raw private media URLs;
* no unsafe HTML;
* no open redirects;
* safe URL handling;
* safe browser storage;
* role isolation;
* financial data isolation;
* upload validation UX;
* customer data isolation.

Remember:

> Frontend security is not backend authorization.

---

# 27. Phase 23 — Full QA

Execute MD-29.

Run:

* static checks;
* functional tests;
* route tests;
* customer journeys;
* Admin journeys;
* Media Team journeys;
* responsive tests;
* accessibility tests;
* motion tests;
* performance tests;
* security checks;
* mock data integrity checks;
* regression tests.

No major feature should be accepted based only on visual inspection.

---

# 28. Phase 24 — Visual Polish

Only after functionality and QA are stable, perform the final visual refinement.

Review:

* spacing;
* typography;
* hierarchy;
* image cropping;
* card density;
* gradients;
* shadows;
* borders;
* crimson usage;
* gold usage;
* animation timing;
* transitions;
* empty states;
* loading states;
* micro-interactions.

The final result should feel:

**cinematic + premium + intelligent + modern + intentional.**

Not:

**generic Tailwind dashboard + Netflix clone.**

---

# 29. Phase 25 — Final Regression

Repeat the critical smoke suite after final polish.

At minimum:

```text id="w3v6oa"
Homepage
Search
Movie Details
Series
Episode
Login
Library
Purchase
Checkout
Subscription
Player
Downloads
Admin
Media Team
Responsive
Accessibility
Build
```

Visual improvements must not break functionality.

---

# 30. Dependency Rule

A later phase must not become the foundation for an earlier phase.

Example:

Bad:

```text id="8n9xcz"
Build Checkout
 ↓
Create random MovieCard
 ↓
Create another button
 ↓
Create another modal
```

Correct:

```text id="v8y1ec"
Design System
 ↓
Shared Components
 ↓
MovieCard
 ↓
Commerce Components
 ↓
Checkout
```

Build reusable foundations before feature-specific duplication.

---

# 31. Feature Completion Rule

Every phase must satisfy:

```text id="f6g4kr"
IMPLEMENT
   ↓
TYPE CHECK
   ↓
FUNCTIONAL TEST
   ↓
RESPONSIVE CHECK
   ↓
ACCESSIBILITY CHECK
   ↓
VISUAL CHECK
   ↓
COMMIT / CHECKPOINT
```

Do not accumulate hundreds of unfinished features before testing.

---

# 32. Commit & Checkpoint Strategy

Create logical Git checkpoints after major phases.

Suggested checkpoints:

```text id="l3k9xq"
01-project-bootstrap
02-design-system
03-layout-navigation
04-ui-primitives
05-media-components
06-mock-data-repositories
07-homepage-discovery
08-search
09-movie-details
10-series
11-auth
12-library
13-checkout
14-subscriptions
15-streaming
16-downloads
17-admin
18-media-team
19-motion
20-responsive
21-accessibility
22-performance-security
23-final-qa
24-release-candidate
```

Commit messages should describe actual completed work.

Avoid giant commits covering unrelated features.

---

# 33. Documentation Update Rule

If implementation changes an architectural decision:

1. Stop.
2. Identify the affected document.
3. Update the documentation.
4. Record the reason.
5. Update dependent documents if necessary.
6. Only then continue implementation.

Code must not silently become the new source of truth.

---

# 34. Ambiguity Stop Rule

If the agent encounters an unresolved business decision, it must stop and ask.

Known unresolved areas include:

* Media Team publishing approval;
* Media Team pricing authority;
* exact Mobile Money providers;
* series pricing model;
* maximum active devices;
* exact protected download implementation;
* final backend/API contract.

The agent must not invent answers.

---

# 35. No Scope Creep

During implementation, the agent must not spontaneously add:

* social network features;
* reviews;
* comments;
* ratings;
* referral systems;
* loyalty systems;
* unnecessary AI recommendations;
* chat;
* unnecessary analytics;
* unnecessary CMS functionality;
* unnecessary backend services.

A feature may be added only when:

* documented;
* explicitly requested;
* or required to satisfy an existing documented requirement.

---

# 36. Backend Boundary

The frontend implementation must end at:

```text id="4k6x9z"
Frontend
   ↓
Repository
   ↓
Mock Data
```

Future architecture:

```text id="0j3s7d"
Frontend
   ↓
Repository
   ↓
API Client
   ↓
Backend
   ↓
Database / Storage / Payment / Media Infrastructure
```

Do not cross this boundary during frontend implementation.

---

# 37. Backend Handoff Package

When frontend implementation is complete, prepare a handoff containing:

### Product

* completed routes;
* completed user journeys;
* business rules;
* unresolved decisions.

### Frontend Architecture

* component architecture;
* feature architecture;
* repositories;
* domain models;
* view models;
* mock data contracts.

### Commerce

* purchase flow;
* subscription flow;
* payment states;
* entitlement concepts;
* access duration;
* Watch vs Download.

### Media

* movie versions;
* DJs/Translators;
* series hierarchy;
* playback requirements;
* download requirements.

### Roles

* Admin;
* Media Team;
* Customer.

### Security

* frontend security boundary;
* required backend authorization;
* financial data protection;
* entitlement enforcement;
* media protection.

The backend should be designed from this handoff rather than reverse-engineered from random frontend code.

---

# 38. Final Frontend Architecture

At completion, the intended architecture is:

```text id="1b4m8y"
                     GIFTEDproMovies
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       PUBLIC              CUSTOMER          OPERATIONS
          │                   │             ┌─────┴─────┐
          │                   │             │           │
     Discovery             Account        ADMIN     MEDIA TEAM
          │                   │
     Search                 Library
     Movies                Purchases
     Series                Downloads
     Categories            Subscription
     Countries
     DJs
          │
          └──────────────┬──────────────┘
                         │
                  Feature Components
                         │
                  Controllers / Hooks
                         │
                     Repositories
                         │
                     Mock Data
```

---

# 39. Final Implementation Dependency Graph

```text id="8t6v2n"
PROJECT BOOTSTRAP
       │
       ▼
DESIGN SYSTEM
       │
       ▼
GLOBAL LAYOUT
       │
       ▼
UI PRIMITIVES
       │
       ▼
MEDIA COMPONENTS
       │
       ▼
MOCK DATA + REPOSITORIES
       │
       ▼
PUBLIC DISCOVERY
       │
       ├──────────────► SEARCH
       │
       ▼
MOVIE DETAILS
       │
       ├──────────────► SERIES
       │                    │
       │                    └──► EPISODES
       │
       ▼
AUTH
       │
       ▼
CUSTOMER ACCOUNT + LIBRARY
       │
       ▼
CHECKOUT / PURCHASE
       │
       ├──────────────► SUBSCRIPTION
       │
       ├──────────────► STREAMING
       │
       └──────────────► DOWNLOADS
       │
       ▼
ADMIN
       │
       ▼
MEDIA TEAM
       │
       ▼
MOTION HARDENING
       │
       ▼
RESPONSIVENESS
       │
       ▼
ACCESSIBILITY
       │
       ▼
PERFORMANCE
       │
       ▼
SECURITY
       │
       ▼
QA
       │
       ▼
FINAL POLISH
       │
       ▼
FRONTEND RELEASE CANDIDATE
       │
       ▼
BACKEND HANDOFF
```

---

# 40. AI Coding Agent Execution Protocol

The coding agent must work in this order:

### Step 1

Read all documentation from:

```text
00_PROJECT_RULES.md
```

through:

```text
30_IMPLEMENTATION_ORDER.md
```

### Step 2

Identify:

* confirmed requirements;
* architecture;
* unresolved decisions;
* dependencies.

### Step 3

Implement only the current phase.

### Step 4

Run relevant checks.

### Step 5

Fix discovered issues.

### Step 6

Perform the phase exit gate.

### Step 7

Create a Git checkpoint.

### Step 8

Move to the next phase.

The agent must not skip foundational phases simply because a later feature appears more visually interesting.

---

# 41. Agent Stop Conditions

The agent must stop and ask for clarification when:

* a business rule is ambiguous;
* two documents conflict;
* an implementation requires inventing an API;
* an implementation requires inventing payment providers;
* a security requirement cannot be satisfied within the current boundary;
* a component requires a new architectural pattern;
* a new dependency becomes necessary for unclear reasons;
* a requirement would cause significant scope expansion.

The agent must not silently choose the easiest interpretation.

---

# 42. Final Frontend Completion Gate

The frontend is complete only when:

```text id="9p4s7m"
[ ] All required routes implemented
[ ] Public experience complete
[ ] Search complete
[ ] Movie experience complete
[ ] Series experience complete
[ ] Authentication UI complete
[ ] Customer account complete
[ ] Library complete
[ ] Purchase flow complete
[ ] Checkout complete
[ ] Subscription UI complete
[ ] Streaming UI complete
[ ] Download UI complete
[ ] Admin UI complete
[ ] Media Team UI complete
[ ] Mock data complete
[ ] Repository boundary complete
[ ] Responsive behavior verified
[ ] Accessibility verified
[ ] Motion verified
[ ] Performance reviewed
[ ] Security reviewed
[ ] Loading states complete
[ ] Empty states complete
[ ] Error states complete
[ ] Pending/expired/unavailable states complete
[ ] Role isolation verified
[ ] Financial data isolation verified
[ ] Core customer journeys verified
[ ] Admin journey verified
[ ] Media Team journey verified
[ ] Production build passes
[ ] QA passes
[ ] No P0/P1 defects remain
[ ] Documentation matches implementation
```

---

# 43. What "Frontend Complete" Means

Frontend completion does **not** mean:

> Every possible feature has been added.

It means:

> Every documented frontend requirement has been intentionally implemented, tested, and verified.

The product must be ready for backend integration without requiring the backend team to reverse-engineer the frontend's business assumptions.

---

# 44. Final Product Principle

GIFTEDproMovies must be built as:

> **A cinematic content platform with commerce, discovery, customer access, and professional content operations.**

Not as:

> **A collection of pages connected by buttons.**

The implementation must preserve the relationship between:

```text id="5n8x2q"
CONTENT
   +
DISCOVERY
   +
COMMERCE
   +
ENTITLEMENT
   +
PLAYBACK
   +
DOWNLOAD
   +
OPERATIONS
   +
SECURITY
   +
UX
```

These are one product, not isolated screens.

---

# 45. Documentation Complete

The frontend documentation sequence is now complete:

```text id="4c7y1m"
00  Project Rules
01  Tech Stack
02  Design System
03  Visual Language
04  Motion System
05  Frontend Architecture
06  Route Map
07  Component Architecture
08  Data Models
09  Mock Data Contract
10  Public Experience
11  Search & Discovery
12  Movie Details
13  Series Experience
14  Authentication UI
15  Customer Library
16  Purchase Flow
17  Streaming UI
18  Download UI
19  Subscription UI
20  Admin UI
21  Media Team UI
22  Responsiveness
23  Accessibility
24  Performance
25  Animation Implementation
26  Error / Empty / Loading States
27  Frontend Security Rules
28  Mock API Boundary
29  QA & Acceptance
30  Implementation Order
```

**This is the final frontend blueprint.**

The next major documentation stage should be the **backend architecture and API contract**, but only after the frontend has been implemented and the actual UI/data requirements have been validated against the finished experience.
