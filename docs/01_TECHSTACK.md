# GIFTEDproMovies.com

## Technology Stack & Development Environment

**Document ID:** MD-02
**Version:** 1.0
**Status:** LOCKED FOUNDATION
**Phase:** Frontend Development Only
**Product:** GIFTEDproMovies.com

---

# 1. PURPOSE

This document defines the approved technology stack and development environment for the GIFTEDproMovies.com frontend.

Its purpose is to prevent developers or AI coding agents from:

* Choosing technologies arbitrarily
* Installing unnecessary dependencies
* Mixing incompatible frameworks
* Introducing backend technologies prematurely
* Changing the project architecture without approval
* Using outdated project patterns
* Creating unnecessary technical complexity

This document works together with:

```text
00_PROJECT_RULES.md
```

MD-01 defines the project constitution.

MD-02 defines the technical foundation.

---

# 2. TECHNOLOGY PHILOSOPHY

The frontend must be built using a modern, maintainable and production-oriented stack.

The stack should prioritize:

```text
Performance
+
Developer Experience
+
Type Safety
+
Maintainability
+
Responsive UI
+
Scalability
+
Accessibility
```

The project should avoid technology for technology's sake.

A library must solve a real problem.

---

# 3. APPROVED CORE STACK

The core frontend stack is:

```text
Framework:
Next.js

UI:
React

Language:
TypeScript

Styling:
Tailwind CSS

Package Manager:
pnpm

Architecture:
Next.js App Router

Code Quality:
ESLint

Formatting:
Prettier

Version Control:
Git
```

These technologies form the baseline of the project.

---

# 4. NEXT.JS

## 4.1 Approved Framework

The project MUST use:

**Next.js**

The project MUST use the:

**App Router**

and MUST NOT use the legacy Pages Router for new application routes.

Next.js officially documents the App Router as the newer router supporting modern React capabilities and Server Components.

---

## 4.2 Why Next.js

Next.js provides the project with:

* File-system routing
* Layouts
* Server Components
* Client Components
* Image optimization
* Font optimization
* Metadata support
* Streaming capabilities
* Error handling conventions
* SEO capabilities
* Production build tooling

The platform will eventually contain:

```text
Public discovery
Movie pages
Series pages
Authentication
Customer library
Streaming
Commerce
Admin
Media Team
```

Next.js provides a suitable foundation for these experiences.

---

# 5. REACT

React is the UI foundation.

React will be used for:

* Components
* Interactive interfaces
* Client-side state
* UI composition
* Forms
* Interactive media experiences
* Dynamic content presentation

React components should be small enough to understand and reusable where appropriate.

Avoid creating giant components that contain:

```text
Data fetching
Business logic
UI
Animation
Form logic
Navigation
Validation
```

all inside one file.

---

# 6. TYPESCRIPT

The project MUST use:

**TypeScript**

JavaScript-only source files should NOT be introduced for application code unless there is a specific technical reason and it is approved.

Preferred file types:

```text
.ts
.tsx
```

---

# 7. TYPESCRIPT STRICTNESS

TypeScript strict mode MUST be enabled.

The project should prioritize compile-time correctness.

Avoid:

```tsx
any
```

unless there is a documented and justified reason.

Prefer:

```text
unknown
```

with proper narrowing when the type is genuinely unknown.

---

# 8. TYPE-FIRST DEVELOPMENT

Important product entities must have explicit types.

Examples:

```text
Movie
Series
Season
Episode
Category
Country
DJ
Translator
User
Subscription
Purchase
Payment
```

Example:

```ts
type Movie = {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  countryIds: string[];
  categoryIds: string[];
};
```

The exact domain models will be defined later in:

```text
09_DATA_MODELS.md
```

This document only establishes the principle.

---

# 9. TAILWIND CSS

The project MUST use:

**Tailwind CSS**

for the primary styling system.

Tailwind integrates naturally with Next.js and supports utility-based styling directly within React components. Next.js documentation also supports Tailwind as a standard styling approach.

---

# 10. TAILWIND USAGE RULE

Tailwind should be used consistently.

Do not randomly mix:

```text
Tailwind
+
inline styles
+
CSS Modules
+
styled-components
+
Emotion
+
Sass
```

without a specific reason.

The default styling strategy is:

```text
Tailwind CSS
```

CSS Modules may be used only where they provide a genuine advantage for specialized styling.

---

# 11. DESIGN TOKENS

The application MUST NOT scatter brand values throughout the codebase.

Avoid:

```tsx
className="bg-[#B11226]"
```

repeated throughout dozens of files.

The project should establish centralized design tokens for:

```text
Colors
Typography
Spacing
Radius
Shadows
Motion
Breakpoints
Surfaces
```

The exact implementation will be defined in:

```text
03_DESIGN_SYSTEM.md
```

---

# 12. PACKAGE MANAGER

The preferred package manager is:

**pnpm**

The official Next.js learning documentation currently recommends pnpm for creating and managing its example projects.

The repository MUST contain the appropriate pnpm lockfile:

```text
pnpm-lock.yaml
```

Do not switch between:

```text
npm
yarn
pnpm
bun
```

during normal project development.

---

# 13. PACKAGE MANAGER CONSISTENCY

All developers and AI coding agents working on the project should use the same package manager.

Preferred commands:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

Do not introduce:

```bash
npm install
yarn install
```

unless specifically required for a documented reason.

---

# 14. NODE.JS

The project should use a currently supported Node.js LTS release compatible with the selected Next.js version.

The exact Node.js version MUST be pinned after the project is initialized.

The repository should contain an appropriate version-management file such as:

```text
.nvmrc
```

or an equivalent project-level configuration.

Do not develop against arbitrary Node.js versions.

---

# 15. NEXT.JS VERSION POLICY

The project should use the latest stable Next.js release that is appropriate for the project at initialization time.

Do NOT automatically upgrade Next.js during development.

A major version upgrade requires:

```text
Review
+
Compatibility check
+
Testing
+
Explicit approval
```

The version actually selected during project initialization becomes part of the project's technical baseline.

---

# 16. REACT VERSION POLICY

React version must remain compatible with the selected Next.js App Router version.

Do not manually upgrade React independently simply because a newer React version exists.

React and Next.js versions must be treated as a compatibility pair.

---

# 17. TAILWIND VERSION POLICY

Use the current stable Tailwind CSS release compatible with the selected Next.js version.

Do not blindly copy configuration from older Tailwind tutorials.

Configuration must follow the version actually installed in the project.

---

# 18. VERSION LOCKING

Once the initial project is created and verified:

```text
Next.js version
React version
TypeScript version
Tailwind version
Node.js version
pnpm version
```

must be recorded in project documentation.

Do not allow an AI coding agent to silently upgrade these versions.

---

# 19. ESLINT

ESLint MUST be used.

Its purpose is to catch:

* Code-quality issues
* Incorrect patterns
* Unused variables
* React-related issues
* Potential bugs
* Inconsistent implementation

The project should use the ESLint configuration appropriate for the selected Next.js version.

Do not disable linting globally to make errors disappear.

---

# 20. PRETTIER

Prettier should be used for consistent formatting.

Formatting should not become a personal preference battle between developers.

The repository should have a shared configuration.

Potential files:

```text
.prettierrc
.prettierignore
```

The exact formatting rules will be established during project initialization.

---

# 21. GIT

Git MUST be used for source control.

The project should have a clean repository history.

Commits should represent meaningful changes.

Avoid commits such as:

```text
fix
test
stuff
changes
final
final2
final-final
```

Prefer meaningful descriptions such as:

```text
feat: add cinematic homepage hero
feat: add movie discovery rail
fix: correct mobile navigation behavior
refactor: extract reusable movie card
```

---

# 22. PROJECT INITIALIZATION

The project should be initialized using the official Next.js project scaffolding rather than manually assembling the entire framework setup.

The initialization should establish:

```text
Next.js
React
TypeScript
ESLint
Tailwind CSS
App Router
```

The exact initialization command should be executed using the selected package manager.

Do not manually recreate framework configuration if the official project initializer already provides it.

---

# 23. INITIAL PROJECT BASELINE

After initialization, the project should be verified using:

```bash
pnpm install
pnpm dev
```

Then:

```bash
pnpm lint
```

and:

```bash
pnpm build
```

All must work before major feature development begins.

---

# 24. EXPECTED ROOT STRUCTURE

The project should eventually follow a structure similar to:

```text
GIFTEDproMovies/
│
├── app/
├── components/
├── features/
├── data/
├── lib/
├── hooks/
├── public/
├── styles/
│
├── docs/
│
├── .env.example
├── .gitignore
├── eslint.config.*
├── next.config.*
├── package.json
├── pnpm-lock.yaml
├── postcss.config.*
├── tsconfig.json
└── README.md
```

This is the intended architectural direction.

The final structure will be locked in:

```text
06_FRONTEND_ARCHITECTURE.md
```

---

# 25. APP DIRECTORY

The `app/` directory is reserved for:

* Routes
* Layouts
* Loading states
* Error states
* Route-level metadata
* Route-specific composition

Next.js uses file-system routing where folders represent route segments and files such as `page.tsx` define accessible routes.

Do not turn `app/` into a dumping ground for every component in the application.

---

# 26. COMPONENTS DIRECTORY

The `components/` directory is intended for reusable UI primitives and shared components.

Examples:

```text
components/
├── ui/
├── navigation/
├── cinematic/
└── media/
```

Examples of shared components:

```text
Button
Modal
Dialog
Badge
Input
MovieCard
ContentRail
Navbar
Footer
```

The final component architecture will be defined later.

---

# 27. FEATURES DIRECTORY

Feature-specific functionality should live within feature domains.

Expected feature areas:

```text
features/
├── discovery/
├── movies/
├── series/
├── player/
├── commerce/
├── library/
├── auth/
├── admin/
└── media-team/
```

The feature directory should contain logic belonging specifically to that feature.

---

# 28. LIB DIRECTORY

`lib/` should contain reusable application-level utilities and infrastructure.

Examples:

```text
lib/
├── utils/
├── constants/
├── services/
├── repositories/
└── validation/
```

Do not use `lib/` as a random folder for code that has nowhere else to go.

---

# 29. DATA DIRECTORY

Mock and static data should be separated from UI components.

Expected direction:

```text
data/
└── mock/
```

For example:

```text
data/mock/movies.ts
data/mock/series.ts
data/mock/categories.ts
data/mock/countries.ts
data/mock/djs.ts
data/mock/subscriptions.ts
```

The exact structure will be defined in:

```text
10_MOCK_DATA_CONTRACT.md
```

---

# 30. PUBLIC DIRECTORY

`public/` is intended for static assets that need direct public access.

Potential examples:

```text
public/
├── images/
├── icons/
├── logos/
└── fonts/
```

Do not place sensitive assets here.

Anything inside `public/` should be assumed to be publicly accessible.

---

# 31. ENVIRONMENT VARIABLES

Environment variables may be used for configuration.

Example:

```text
.env.local
.env.example
```

The repository MUST NOT contain real secrets.

Never commit:

```text
API keys
Private tokens
Payment credentials
Database passwords
Authentication secrets
Cloud credentials
```

---

# 32. ENVIRONMENT FILE RULE

The repository should include:

```text
.env.example
```

with placeholder values only.

Example:

```env
NEXT_PUBLIC_APP_NAME=GIFTEDproMovies.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Real local values belong in:

```text
.env.local
```

which must not be committed.

---

# 33. PUBLIC VS PRIVATE ENVIRONMENT VARIABLES

Any variable prefixed with:

```text
NEXT_PUBLIC_
```

must be treated as publicly exposed to the browser.

Never place secrets inside:

```text
NEXT_PUBLIC_*
```

Example of BAD usage:

```env
NEXT_PUBLIC_PAYMENT_SECRET=...
```

This is prohibited.

---

# 34. BACKEND ENVIRONMENT VARIABLES

During the frontend-only phase, do not create real backend secrets or production backend configuration.

The frontend may define placeholder configuration where required for architecture testing.

However:

```text
No database credentials
No payment credentials
No production API secrets
```

belong in the current project.

---

# 35. API CLIENT RULE

Do not scatter direct API calls throughout UI components.

Bad:

```tsx
useEffect(() => {
  fetch("/api/movies")
}, []);
```

inside every component.

Preferred architecture:

```text
Component
    ↓
Feature Service
    ↓
Repository
    ↓
Mock Data
```

Later:

```text
Component
    ↓
Feature Service
    ↓
Repository
    ↓
Real Backend API
```

The exact implementation belongs in:

```text
29_MOCK_API_BOUNDARY.md
```

---

# 36. STATE MANAGEMENT POLICY

Do NOT immediately introduce a global state-management library.

Start with:

```text
React state
+
Context where genuinely appropriate
+
URL state
+
Server/client data patterns
```

A library such as Zustand, Redux Toolkit, Jotai, or another state solution may only be introduced if the actual application requirements demonstrate the need.

The agent MUST NOT install a state library merely because it is familiar with it.

---

# 37. DATA FETCHING POLICY

During frontend-only development, data should primarily come from:

```text
Typed mock repositories
```

The UI must be designed so that these repositories can later be replaced by real API implementations.

Do not make mock data behavior fundamentally different from expected production data behavior.

---

# 38. FORM MANAGEMENT POLICY

Forms should use native React/HTML capabilities where sufficient.

A form library may be introduced if the project genuinely requires:

* Complex validation
* Large multi-step forms
* Dynamic field arrays
* Complex form state

Do not install a form library for a simple login form without justification.

---

# 39. VALIDATION POLICY

Validation should exist at the UI level where appropriate.

Examples:

```text
Required fields
Email format
Password requirements
Price input format
Content metadata
```

However, frontend validation must never be treated as the final security boundary.

Backend validation will be required later.

---

# 40. ICON SYSTEM

The project should use one consistent icon library.

The preferred direction is:

**Lucide Icons**

Do not mix:

```text
Lucide
Font Awesome
Heroicons
Random SVG packs
Emoji
```

for the same UI system unless there is a clear reason.

Icons should communicate meaning rather than decorate every element.

---

# 41. IMAGE HANDLING

Movie and series imagery is central to the product.

Images must be handled intentionally.

Use Next.js image optimization capabilities where appropriate.

Avoid:

```text
<img>
```

everywhere when the optimized Next.js image component is more appropriate.

The image strategy will be detailed later.

---

# 42. FONT HANDLING

Fonts should be intentionally selected and loaded.

Do not import random fonts from multiple external sources.

The project should use the appropriate Next.js font optimization approach where practical.

Typography decisions belong in:

```text
03_DESIGN_SYSTEM.md
04_VISUAL_LANGUAGE.md
```

---

# 43. ANIMATION TECHNOLOGY

Animation should begin with:

```text
CSS transitions
CSS animations
Tailwind utilities
Native browser capabilities
```

before introducing additional animation libraries.

For advanced interactions, a dedicated motion library may be introduced if justified.

Potential use cases:

```text
Shared transitions
Complex gestures
Spring motion
Drag interactions
Advanced cinematic transitions
```

The exact animation implementation will be defined in:

```text
05_MOTION_SYSTEM.md
26_ANIMATION_IMPLEMENTATION.md
```

---

# 44. DO NOT INSTALL ANIMATION LIBRARIES PREMATURELY

Do not install multiple animation libraries.

Never create a stack such as:

```text
Framer Motion
+
GSAP
+
React Spring
+
AOS
```

without a documented reason.

One coherent motion strategy is preferred.

---

# 45. UI LIBRARY POLICY

The project may use selected components from a UI library such as shadcn/ui where appropriate.

However:

> The project's visual identity must NOT become the default visual identity of the UI library.

Generic component-library styling must be adapted to the GIFTEDproMovies design system.

The platform should never look like a collection of copied shadcn examples.

---

# 46. NO GENERIC DASHBOARD TEMPLATES

Admin and Media Team interfaces must be custom-designed around GIFTEDproMovies workflows.

Do not install a generic dashboard template and simply change:

```text
Logo
Colors
Text
```

The actual information architecture will be defined later in:

```text
21_ADMIN_UI.md
22_MEDIA_TEAM_UI.md
```

---

# 47. TESTING DIRECTION

Testing will be introduced progressively.

The project should eventually support appropriate testing for:

```text
Components
Utilities
Feature logic
User flows
Critical interactions
```

Testing tools should not be installed randomly before the test strategy is defined.

The QA strategy will be finalized in:

```text
30_QA_ACCEPTANCE.md
```

---

# 48. BUILD AND DEPLOYMENT PRINCIPLE

The application must be capable of producing a production build using:

```bash
pnpm build
```

The build MUST complete without fatal errors before a feature is considered complete.

The project should not rely on:

```text
development-only hacks
local-only files
manual browser modifications
```

to function.

---

# 49. DEVELOPMENT COMMANDS

The project should expose a predictable command set.

Expected baseline:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

Additional commands may be introduced later for:

```text
Testing
Formatting
Type checking
Validation
```

but they must be documented.

---

# 50. TYPE CHECKING

The project should support explicit TypeScript validation.

Preferred command:

```bash
pnpm tsc --noEmit
```

or an equivalent project script.

Type errors MUST NOT be ignored simply because the UI appears to work.

---

# 51. QUALITY GATE

Before a feature is considered complete:

```text
pnpm lint
```

must pass.

Type checking should pass.

Production build should pass:

```text
pnpm build
```

Critical UI flows must also be manually checked.

---

# 52. DEPENDENCY RULE

Every dependency must answer:

> What real problem does this dependency solve?

If the answer is unclear, do not install it.

Avoid dependency accumulation.

The project should remain as lightweight as reasonably possible.

---

# 53. DEPENDENCY REVIEW

Before adding a new package, evaluate:

```text
1. Is it actually necessary?
2. Can native React solve this?
3. Can Next.js solve this?
4. Can Tailwind solve this?
5. Can a small internal utility solve this?
6. Is the package actively maintained?
7. Does it introduce unnecessary bundle weight?
8. Does it create architectural coupling?
9. Is it compatible with the current Next.js/React version?
```

Only then should it be added.

---

# 54. NO DUPLICATE LIBRARIES

Do not install two libraries that solve the same problem.

Examples:

```text
Two icon libraries
Two animation libraries
Two date libraries
Two state libraries
Two form libraries
Two utility CSS frameworks
```

unless there is an explicitly documented reason.

---

# 55. NO BACKEND TECHNOLOGY

The following are explicitly outside MD-02's frontend scope:

```text
Prisma
Drizzle ORM
MySQL
PostgreSQL
MongoDB
Redis
Express
FastAPI
NestJS
Laravel
Django
Docker backend services
Payment SDK backend integrations
Object storage backend infrastructure
```

They may become relevant in the backend phase.

They must NOT be introduced into the frontend project prematurely.

---

# 56. NO DATABASE

There must be no database setup during this frontend phase.

Do not create:

```text
schema
migrations
seed database
ORM models
database connection
database credentials
```

Mock data is sufficient.

---

# 57. NO REAL PAYMENT INTEGRATION

The frontend may simulate payment states.

Examples:

```text
Payment pending
Payment successful
Payment failed
Payment cancelled
```

But no real payment provider should be integrated at this stage.

The final payment architecture will be defined after frontend completion.

---

# 58. NO REAL AUTHENTICATION BACKEND

Authentication screens may be fully implemented visually and behaviorally using mock state.

However, do not implement:

```text
JWT backend
OAuth server
Session database
Password hashing backend
Email verification backend
Password reset backend
```

during this phase.

---

# 59. FRONTEND SIMULATION RULE

Frontend simulations must be clearly structured.

For example:

```text
MockAuthService
MockPaymentService
MockMovieRepository
MockSubscriptionRepository
```

are acceptable.

Hardcoding fake behavior directly into random components is not.

---

# 60. SEO DIRECTION

Because the public platform contains discoverable movie and series pages, SEO must be considered during frontend architecture.

Next.js metadata capabilities should be used appropriately.

However, SEO implementation details belong to the relevant later documentation.

Do not create random metadata on every page.

---

# 61. ROUTING DIRECTION

Routing will use:

**Next.js App Router**

Routes should be designed around product domains.

Potential route groups include:

```text
/
 /movies
 /series
 /search
 /categories
 /countries
 /djs
 /movie/[slug]
 /series/[slug]
 /watch/[id]
 /download/[id]
 /login
 /register
 /library
 /subscription
 /admin
 /media-team
```

These are directional examples only.

The official route map will be defined in:

```text
07_ROUTE_MAP.md
```

Do not implement routes not yet approved.

---

# 62. SERVER VS CLIENT COMPONENTS

The project should use Next.js Server Components by default where appropriate.

Client Components should be introduced when the UI requires client-side capabilities such as:

```text
State
Effects
Browser APIs
Event-heavy interaction
Interactive player controls
Client-side gestures
```

Do not add:

```tsx
"use client";
```

to every component automatically.

Use Client Components intentionally.

---

# 63. BROWSER-ONLY LOGIC

Browser-specific APIs must not be executed where server rendering cannot support them.

Examples include:

```text
window
document
localStorage
navigator
Media APIs
```

Such logic must be isolated appropriately.

---

# 64. ROUTE-LEVEL LOADING

Next.js route-level loading patterns should be used where appropriate.

Loading UI should not be an afterthought.

Important routes should provide meaningful loading states rather than blank screens.

---

# 65. ERROR HANDLING

The application should use Next.js error-handling conventions appropriately.

Errors should be represented using the GIFTEDproMovies visual language.

Do not expose:

```text
stack traces
raw API errors
database errors
internal paths
```

to customers.

---

# 66. ACCESSIBILITY TECHNOLOGY

Accessibility should be built into the technology choices.

Use:

```text
Semantic HTML
ARIA where necessary
Keyboard interactions
Focus management
Accessible dialogs
Accessible forms
Reduced-motion support
```

Do not use ARIA as a replacement for semantic HTML when native HTML already solves the problem.

---

# 67. BROWSER SUPPORT

The application should target modern browsers used by the platform's customers.

Primary targets:

```text
Chrome
Safari
Firefox
Edge
Modern Android browsers
Modern iOS browsers
```

Do not add legacy browser complexity unless a real requirement exists.

---

# 68. MOBILE-FIRST ENGINEERING

The UI should be developed with mobile constraints in mind.

This includes:

```text
Touch targets
Viewport behavior
Safe areas
Scrolling
Content density
Image sizes
Navigation
Player controls
Bottom sheets
```

Desktop should enhance the experience rather than define all interaction behavior.

---

# 69. PERFORMANCE PRIORITIES

Performance-sensitive areas include:

```text
Homepage
Movie rails
Hero imagery
Search
Movie detail pages
Video player
Admin tables
Mobile navigation
```

Avoid unnecessary JavaScript.

Prefer framework and browser capabilities where appropriate.

---

# 70. DOCUMENTATION AS CODEBASE CONTRACT

The `/docs` directory is part of the project.

AI coding agents MUST read relevant documentation before making significant changes.

The documentation is not optional reference material.

It is a development contract.

---

# 71. OPEN-CODE / AI AGENT RULE

Before implementation, an AI coding agent must identify:

```text
Current task
Relevant MD
Relevant architecture
Relevant component contract
Relevant data contract
```

Then implement only what is authorized.

The agent must not say:

> "I thought this would be better."

and silently change the architecture.

If a better alternative is discovered, it must be proposed separately.

---

# 72. TECHNICAL DECISION RULE

When two technical solutions are possible, choose the one that best satisfies:

```text
1. Existing project architecture
2. Simplicity
3. Maintainability
4. Performance
5. Type safety
6. Accessibility
7. Future backend integration
```

Do not choose based on personal preference alone.

---

# 73. WHAT THIS DOCUMENT LOCKS

This document locks the following baseline:

```text
Framework:
Next.js

Router:
App Router

UI:
React

Language:
TypeScript

Styling:
Tailwind CSS

Package Manager:
pnpm

Linting:
ESLint

Formatting:
Prettier

Version Control:
Git

Data during frontend phase:
Typed mock data

Backend:
NOT IMPLEMENTED

Database:
NOT IMPLEMENTED

Real Payments:
NOT IMPLEMENTED

Real Authentication Backend:
NOT IMPLEMENTED
```

---

# 74. WHAT THIS DOCUMENT DOES NOT LOCK

The following will be defined in later documents:

```text
Exact package versions
Final folder architecture
Design tokens
Typography
Colors implementation
Motion tokens
Routes
Component architecture
Data models
Mock data structures
Search algorithms
Movie page UX
Series UX
Authentication UX
Customer library
Purchase flow
Streaming UI
Download UI
Subscription UI
Admin UI
Media Team UI
Accessibility details
Performance strategy
QA strategy
Implementation sequence
```

Those decisions must not be invented prematurely.

---

# 75. TECH STACK DECISION SUMMARY

The approved technical foundation is:

```text
                 GIFTEDproMovies.com
                         │
                         ▼
                    Next.js
                  App Router
                         │
                         ▼
                     React
                         │
                         ▼
                   TypeScript
                         │
                         ▼
                  Tailwind CSS
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        Typed Mock Data       Feature Services
              │                     │
              └──────────┬──────────┘
                         ▼
                 Future API Boundary
                         │
                         ▼
                    BACKEND
                  (Later Phase)
```

---

# 76. FINAL IMPLEMENTATION DIRECTIVE

The developer or AI coding agent MUST treat this document as the technical foundation.

Do not:

```text
Change the framework
Change the router
Change the language
Change the styling foundation
Add a database
Add backend services
Add real payment integration
Add real authentication backend
Install unnecessary libraries
Invent architecture
```

without explicit approval.

The goal is a frontend that is:

> **Modern, type-safe, maintainable, responsive, performant, scalable and ready for a real production backend.**

---

# DOCUMENT STATUS

**MD-02 — Technology Stack & Development Environment**

```text
STATUS: LOCKED FOUNDATION
PHASE: FRONTEND ONLY
NEXT DOCUMENT: MD-03
```

The next document is:

```text
03_DESIGN_SYSTEM.md
```

It will define the actual visual system of GIFTEDproMovies.com, including:

* Color tokens
* Typography
* Font hierarchy
* Spacing system
* Border radius
* Shadows
* Surfaces
* Buttons
* Inputs
* Badges
* Cards
* Navigation
* Responsive tokens
* Accessibility states
* Component visual rules

No visual component should invent its own design language outside that system.
