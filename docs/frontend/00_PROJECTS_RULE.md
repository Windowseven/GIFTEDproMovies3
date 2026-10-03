# GIFTEDproMovies

## Frontend Project Constitution & Non-Negotiable Rules

**Document ID:** MD-01
**Version:** 1.0
**Status:** LOCKED FOUNDATION
**Phase:** Frontend Development Only
**Product:** GIFTEDproMovies

---

# 1. PURPOSE OF THIS DOCUMENT

This document is the **constitution of the GIFTEDproMovies frontend project**.

Its purpose is to prevent developers, AI coding agents, including OpenCode, from inventing requirements, changing product decisions, creating unnecessary features, or making assumptions that were not approved.

This document defines the rules that must be followed throughout frontend development.

Any future frontend implementation must comply with this document and the subsequent project documentation.

---

# 2. PRODUCT IDENTITY

The official product name is:

**GIFTEDproMovies**

The exact spelling and capitalization MUST be preserved.

```text
GIFTEDproMovies
```

Do NOT change it to:

```text
GiftedProMovies
Giftedpromovies
GIFTEDPROMOVIES
GIFTED Pro Movies
Gifted Pro Movies
```

The brand name must always appear exactly as:

**GIFTEDproMovies**

---

# 3. PRODUCT TYPE

GIFTEDproMovies is a modern digital movie and series platform focused on:

* Movie discovery
* Series discovery
* Streaming
* Download access
* Individual content purchases
* Subscriptions
* DJ/Translator versions
* Smart content discovery
* Personalized customer experience
* Content management
* Media Team management
* Administrative management

The frontend must feel like a **real commercial streaming platform**, not a simple movie-download website.

---

# 4. CURRENT DEVELOPMENT PHASE

## FRONTEND ONLY

The current development phase is strictly limited to frontend development.

The frontend MUST be developed independently from the backend.

### The following are NOT part of the current implementation:

* Backend server
* Database
* MySQL
* PostgreSQL
* Prisma
* SQLAlchemy
* Real API implementation
* Real authentication backend
* Real payment gateway
* Real mobile-money integration
* Real file storage
* Real video storage
* Backend authorization
* Backend business logic
* Server-side payment verification
* Production media processing

These will be addressed in the backend phase.

---

# 5. FRONTEND-BACKEND BOUNDARY

The frontend must be designed so that a real backend can be connected later without redesigning the entire UI.

The architecture should conceptually follow:

```text
                    GIFTEDproMovies
                           │
                           ▼
                     FRONTEND UI
                           │
                           ▼
                  Typed Data / Services
                           │
                           ▼
                  Repository / API Layer
                           │
                    FUTURE BACKEND
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Database       Payments       Storage
```

During the frontend phase, the final backend layer does not exist.

Mock data and frontend services must therefore simulate the expected product behavior without pretending that a real backend exists.

---

# 6. PRIMARY TECHNOLOGY DIRECTION

The frontend technology direction is:

* Next.js
* React
* TypeScript
* Tailwind CSS

Additional libraries may be introduced only when there is a clear architectural or UX reason.

A dependency MUST NOT be added simply because it is popular or because an AI coding agent prefers it.

The detailed technology stack, versions, dependencies, configuration, and project structure will be defined in:

```text
02_TECH_STACK.md
```

---

# 7. SOURCE-OF-TRUTH HIERARCHY

When implementing the project, requirements must be interpreted according to the following priority:

```text
1. Explicitly approved project decisions
2. Current MD document being implemented
3. Previously locked MD documents
4. Existing project requirements
5. Existing code
6. Reasonable engineering judgment
7. Assumption
```

**Assumptions must never override explicit requirements.**

If an explicit requirement conflicts with existing code, the requirement takes priority.

If two documents conflict, stop implementation and report the conflict instead of silently choosing one.

---

# 8. NO INVENTION RULE

This is one of the most important rules of the project.

The developer or AI coding agent MUST NOT invent:

* New product features
* New user roles
* New pricing rules
* New payment providers
* New subscription rules
* New access rules
* New business models
* New pages
* New navigation items
* New categories
* New content types
* New permissions
* New backend endpoints
* New API contracts
* New financial logic
* New product behavior

unless explicitly approved.

For example:

If the requirements say:

```text
Customer can purchase a movie.
```

Do NOT automatically invent:

```text
Gift movie
Share movie
Refund movie
Rent movie
Buy for friend
Group watching
Referral system
Wallet
Points
Coupons
```

Those may be good ideas, but they are not automatically part of the product.

---

# 9. WHEN REQUIREMENTS ARE UNCLEAR

If an implementation decision cannot be determined from the approved documentation:

### DO NOT GUESS.

The agent must:

1. Identify the ambiguity.
2. Explain what decision is missing.
3. Stop the affected implementation.
4. Ask for clarification.

Example:

```text
The requirements define that series can be purchased,
but do not yet define whether pricing is per episode,
per season, or as a complete series package.

Do not invent the pricing model.
Request clarification before implementing the purchase logic.
```

This rule is especially important for:

* Payments
* Pricing
* Access duration
* Subscription behavior
* Content ownership
* User permissions
* Download restrictions
* Device access
* Series purchasing
* Media Team publishing
* Admin controls

---

# 10. DO NOT MODIFY LOCKED REQUIREMENTS

Once a project decision has been approved and documented, it becomes part of the project's source of truth.

The developer/AI MUST NOT silently change it.

Examples:

If the approved requirement says:

```text
User account = Email + Password
```

Do not replace it with:

```text
Phone + OTP
```

If the approved requirement says:

```text
Streaming price and Download price are separate.
```

Do not combine them into one price.

If the approved requirement says:

```text
Admin is the only role with financial visibility.
```

Do not display revenue information inside the Media Team dashboard.

---

# 11. FRONTEND QUALITY STANDARD

The frontend must be developed to a professional production-level standard.

It must NOT look like:

* A generic Tailwind template
* A basic CRUD application
* A university assignment UI
* A simple movie-download website
* A generic AI-generated SaaS dashboard
* A Netflix clone
* A collection of unrelated cards
* A static HTML mockup

The target is:

> **A premium, modern, cinematic digital entertainment platform.**

The UI must demonstrate:

* Strong visual hierarchy
* Clear information architecture
* Consistent spacing
* Strong typography
* Responsive behavior
* Intentional animation
* Clear interaction states
* Reusable components
* Accessible controls
* Professional empty states
* Professional loading states
* Professional error states
* Cohesive branding

---

# 12. DESIGN MUST FOLLOW DOCUMENTATION

The UI must not be designed randomly while coding.

The following documents will define the visual and interaction system:

```text
03_DESIGN_SYSTEM.md
04_VISUAL_LANGUAGE.md
05_MOTION_SYSTEM.md
```

These documents will define:

* Colors
* Typography
* Spacing
* Components
* Cards
* Buttons
* Navigation
* Visual hierarchy
* Motion
* Interaction patterns
* Responsive behavior

Once those rules exist, developers must follow them.

---

# 13. BRANDING RULE

GIFTEDproMovies must have its own visual identity.

The platform must NOT imitate Netflix, Disney+, Apple TV, Prime Video, or another existing platform.

Research and inspiration from existing streaming platforms is allowed.

Copying their:

* Branding
* Logo treatment
* Exact UI
* Exact navigation
* Exact layouts
* Exact interaction patterns
* Brand colors

is NOT allowed.

The product should feel inspired by modern streaming UX while remaining visually distinct.

---

# 14. VISUAL DIRECTION

The intended visual direction is:

> **Premium + Cinematic + Modern + Intelligent + African-market aware**

The design should combine:

* Premium restraint
* Cinematic presentation
* Intelligent discovery
* Strong content imagery
* Modern interaction
* Clear commerce actions

The interface should not become visually noisy.

---

# 15. COLOR DISCIPLINE

The approved initial brand direction is:

```text
Primary Crimson / Wine:
#B11226

Background:
#08090C

Surface:
#111318

Elevated Surface:
#181A21

Primary Text:
#F5F5F5

Secondary Text:
#A6A8B0

Premium Gold:
#D6A84F
```

These values are the initial approved direction.

Do not randomly introduce additional brand colors.

Crimson should communicate important actions and brand identity.

Gold should communicate premium/business-related elements.

The interface should remain predominantly dark and neutral rather than becoming saturated red.

The final token implementation belongs in:

```text
03_DESIGN_SYSTEM.md
```

---

# 16. RESPONSIVE-FIRST RULE

The platform MUST work across:

```text
Mobile
Tablet
Laptop
Desktop
Large Desktop
```

Responsive design is not an afterthought.

Every feature must be evaluated at different screen sizes.

A desktop design MUST NOT simply be scaled down for mobile.

Mobile may require:

* Different navigation
* Different content density
* Different card behavior
* Different controls
* Bottom sheets
* Different interaction patterns
* Touch-friendly targets
* Different hero composition

---

# 17. MOBILE INTERACTION RULE

The product must never depend on hover for essential functionality.

Desktop may use:

* Hover
* Cursor movement
* Hover previews
* Magnetic interactions
* Card expansion

Mobile must have equivalent:

* Tap
* Press
* Swipe
* Scroll
* Bottom-sheet
* Detail-page interactions

A user must never be blocked from an important action because they do not have a mouse.

---

# 18. ACCESSIBILITY RULE

Accessibility is part of the implementation, not an optional enhancement.

The frontend should provide:

* Keyboard navigation
* Visible focus states
* Proper semantic HTML
* Accessible buttons
* Accessible forms
* Accessible labels
* Sufficient text contrast
* Screen-reader-friendly controls
* Meaningful error messages
* Reduced-motion support

Interactive elements must not rely only on color.

---

# 19. ANIMATION RULE

Animation must have a purpose.

The project follows this principle:

> **Everything moves because the interaction has meaning.**

Animations should communicate:

* What changed
* Where something came from
* Where something went
* What can be interacted with
* What action just happened
* What content is loading
* What state is active

Avoid decorative animation with no UX purpose.

---

# 20. PERFORMANCE RULE

Animation and visual effects must not compromise usability.

Prefer:

```text
transform
opacity
```

for frequently animated elements.

Avoid unnecessary:

```text
layout-triggering animations
continuous expensive effects
large unnecessary blur effects
heavy particle systems
constant JavaScript animation loops
```

Images and non-critical resources should be loaded intelligently.

The platform should feel fast even on average mobile hardware and connections.

---

# 21. REDUCED-MOTION SUPPORT

The application must respect:

```text
prefers-reduced-motion
```

Users who request reduced motion should receive a simplified motion experience.

Animations should degrade gracefully rather than breaking the interface.

---

# 22. COMPONENT REUSE RULE

Repeated UI must be componentized.

Do not duplicate large blocks of JSX for visually or behaviorally similar elements.

Examples of likely reusable components include:

```text
MovieCard
SeriesCard
ContentRail
SectionHeader
Hero
Navbar
SearchBar
FilterBar
PriceDisplay
Badge
Button
Modal
BottomSheet
PlayerControls
EmptyState
LoadingState
ErrorState
```

Exact component architecture will be defined later.

---

# 23. NO HARD-CODED REPEATED CONTENT

Repeated content must not be manually duplicated throughout JSX.

Bad:

```tsx
<div>Movie 1</div>
<div>Movie 2</div>
<div>Movie 3</div>
<div>Movie 4</div>
```

Prefer typed data:

```text
Typed Data
    ↓
Reusable Component
    ↓
Rendered Collection
```

This makes the frontend ready for future API integration.

---

# 24. MOCK DATA RULE

During the frontend phase, mock data is allowed and expected.

Mock data must represent realistic product data.

Mock data should include examples of:

* Movies
* Series
* Seasons
* Episodes
* Categories
* Countries
* DJs/Translators
* Prices
* Access durations
* Featured content
* Trending content
* Popular content
* Users where required for UI
* Subscription plans
* Transactions where required for admin UI

Mock data must be typed.

Mock data must not be scattered randomly across components.

The complete mock-data contract will be defined later.

---

# 25. API BOUNDARY RULE

Components should not become tightly coupled to future backend implementation.

Avoid designs such as:

```text
Component → fetch() → unknown backend structure
```

Prefer:

```text
Component
    ↓
Feature Service
    ↓
Typed Repository
    ↓
Mock Implementation
```

Later:

```text
Component
    ↓
Feature Service
    ↓
Typed Repository
    ↓
Real API
```

This allows the backend to replace the mock implementation without rewriting the UI.

---

# 26. NO BACKEND PRETENDING

Do not create fake backend infrastructure and present it as production infrastructure.

For example, do not create:

```text
/api/login
/api/payment
/api/movies
/api/admin
```

and pretend they are real backend endpoints.

If frontend behavior needs an API abstraction, create a clearly defined mock/service boundary.

The frontend may simulate:

```text
Login success
Payment success
Payment failure
Purchase success
Subscription success
Content access
Download availability
```

but these remain frontend simulations until the backend phase.

---

# 27. ROLE DISCIPLINE

The currently approved roles are:

```text
ADMIN
MEDIA TEAM
CUSTOMER / USER
```

Do not create additional roles unless explicitly approved.

The frontend must respect role boundaries.

### ADMIN

Admin has full platform control and access to sensitive business information.

Admin may manage:

* Movies
* Series
* Seasons
* Episodes
* Categories
* Countries
* DJs/Translators
* Users
* Media Team
* Pricing
* Subscriptions
* Featured content
* Trending content
* Payments
* Sales
* Revenue
* System settings

### MEDIA TEAM

Media Team focuses on content management.

Media Team may manage:

* Movies
* Series
* Seasons
* Episodes
* Posters
* Descriptions
* Categories
* Countries
* DJs/Translators

Media Team must NOT have access to:

* Revenue
* Sales totals
* Payment analytics
* Sensitive financial information

### CUSTOMER / USER

Customer can:

* Browse
* Search
* Filter
* View content
* Select DJ/Translator version
* Watch/stream
* Download where entitled
* Purchase content
* Subscribe
* Access entitled content

---

# 28. AUTHENTICATION UI RULE

The approved customer account model is:

```text
Email + Password
```

Do not replace it with phone-only authentication or OTP-only authentication unless explicitly approved.

Public users should be able to discover content before authentication.

Authentication should be requested when an action requires an account.

Examples:

```text
Browse → Public

Search → Public

Movie Details → Public

Watch → Authentication may be required

Download → Authentication required

Purchase / LIPA → Authentication required

Subscribe → Authentication required
```

---

# 29. PUBLIC DISCOVERY RULE

GIFTEDproMovies does NOT require a traditional marketing landing page as the primary homepage.

The homepage itself is the platform's public discovery experience.

The homepage should allow guests to:

* Discover movies
* Discover series
* Search
* Filter
* View movie details
* View pricing
* View DJ/Translator versions
* Explore categories
* Explore countries
* Discover trending content

The exact homepage structure will be defined in the relevant frontend documentation.

---

# 30. BUSINESS RULE DISCIPLINE

Business rules must never be invented inside UI components.

Examples of business rules that must come from approved documentation:

* Pricing
* Purchase duration
* Subscription duration
* Content access
* Device access
* Download entitlement
* Series pricing
* DJ/version ownership
* Payment states
* Role permissions

UI components should display these rules rather than secretly defining them.

---

# 31. FINANCIAL INFORMATION RULE

Sensitive financial information belongs exclusively to the Admin experience.

Examples:

```text
Revenue
Sales totals
Payment analytics
Failed payment analytics
Financial reports
```

must not accidentally appear in:

```text
Customer UI
Media Team UI
Public UI
```

unless explicitly approved.

---

# 32. ERROR, EMPTY AND LOADING STATES

Every important data-driven UI must account for:

```text
Loading
Success
Empty
Error
```

Do not design only the successful state.

Examples:

```text
No search results
No trending movies
No purchased content
Payment failed
Movie unavailable
Series has no episodes
No subscription
Network error
Content expired
```

These states must be designed professionally rather than showing raw browser errors.

---

# 33. SECURITY-MINDED FRONTEND RULE

Frontend security must be treated seriously even though backend security is outside the current phase.

Do not expose or hardcode:

* API secrets
* Payment secrets
* Private credentials
* Database credentials
* Production tokens
* Sensitive financial information
* Private storage credentials

The frontend must never be treated as a trusted security boundary.

Actual authorization and payment verification will belong to the backend.

---

# 34. CODE QUALITY RULE

Code must be:

* Readable
* Typed
* Maintainable
* Modular
* Predictable
* Consistent
* Reusable

Avoid:

* Giant components
* Unnecessary abstractions
* Random utility files
* Duplicate logic
* Magic values
* Unclear naming
* Dead code
* Unused dependencies
* Temporary hacks left as permanent implementation

---

# 35. NAMING RULE

Names must describe purpose clearly.

Prefer:

```text
MovieCard
MovieDetails
MoviePurchaseSheet
SubscriptionCard
ContentRail
SearchResults
```

Avoid vague names such as:

```text
Box
Thing
Card2
SectionX
ComponentNew
FinalComponent
TestCard
```

Names must communicate intent.

---

# 36. FEATURE OWNERSHIP

Features should be organized around product domains rather than one giant global component structure.

The eventual architecture should make it possible to locate code by feature.

Expected domains include:

```text
Discovery
Movies
Series
Player
Commerce
Library
Authentication
Admin
Media Team
```

The exact folder and component architecture will be defined in:

```text
06_FRONTEND_ARCHITECTURE.md
08_COMPONENT_ARCHITECTURE.md
```

---

# 37. DOCUMENTATION-FIRST DEVELOPMENT

The project will be documented before major implementation.

The intended process is:

```text
Requirements
     ↓
Documentation
     ↓
Architecture
     ↓
Design System
     ↓
UX Flows
     ↓
Component Contracts
     ↓
Mock Data
     ↓
Implementation
     ↓
QA
```

Do not jump directly from an idea to random implementation.

---

# 38. DOCUMENT DEPENDENCY RULE

Later documents must build upon earlier documents.

The expected documentation sequence is:

```text
00_PROJECT_RULES.md
01_PRODUCT_SCOPE.md
02_TECH_STACK.md
03_DESIGN_SYSTEM.md
04_VISUAL_LANGUAGE.md
05_MOTION_SYSTEM.md
06_FRONTEND_ARCHITECTURE.md
07_ROUTE_MAP.md
08_COMPONENT_ARCHITECTURE.md
09_DATA_MODELS.md
10_MOCK_DATA_CONTRACT.md
11_PUBLIC_EXPERIENCE.md
12_SEARCH_DISCOVERY.md
13_MOVIE_DETAILS.md
14_SERIES_EXPERIENCE.md
15_AUTH_UI.md
16_CUSTOMER_LIBRARY.md
17_PURCHASE_FLOW.md
18_STREAMING_UI.md
19_DOWNLOAD_UI.md
20_SUBSCRIPTION_UI.md
21_ADMIN_UI.md
22_MEDIA_TEAM_UI.md
23_RESPONSIVENESS.md
24_ACCESSIBILITY.md
25_PERFORMANCE.md
26_ANIMATION_IMPLEMENTATION.md
27_ERROR_EMPTY_LOADING_STATES.md
28_SECURITY_FRONTEND_RULES.md
29_MOCK_API_BOUNDARY.md
30_QA_ACCEPTANCE.md
31_IMPLEMENTATION_ORDER.md
```

A later document must not contradict an earlier locked decision.

---

# 39. ONE DOCUMENT AT A TIME

Documentation must be developed sequentially.

Do not generate or implement all documents simultaneously.

For each document:

```text
Draft
 ↓
Review
 ↓
Approval / Lock
 ↓
Next Document
```

Once a document is locked, it becomes part of the project's source of truth.

---

# 40. AI CODING AGENT RULES

When using OpenCode or another AI coding agent, the agent must:

1. Read the relevant project documentation before implementation.
2. Follow locked requirements.
3. Never invent business requirements.
4. Never silently modify requirements.
5. Never create backend functionality during frontend phase.
6. Reuse existing components where appropriate.
7. Follow the approved design system.
8. Follow the approved architecture.
9. Keep mock data typed.
10. Keep frontend/backend boundaries clean.
11. Report conflicts instead of guessing.
12. Report missing requirements instead of inventing them.
13. Avoid unnecessary dependencies.
14. Avoid unnecessary refactoring.
15. Avoid changing unrelated files.
16. Verify the implementation against acceptance criteria.

---

# 41. CHANGE CONTROL

Any major change to the product must be explicit.

Examples:

```text
New role
New payment provider
New pricing model
New subscription behavior
New purchase model
New access rule
New homepage section
New feature
New technology
Major architecture change
```

must not be introduced silently.

A change should be documented before implementation when it affects product behavior or architecture.

---

# 42. NO SCOPE CREEP

The frontend must not gradually become a different product because the developer discovers additional ideas.

Examples of potential scope creep:

```text
Chat system
Referral program
Wallet
Rewards
Reviews
Social feed
Creator marketplace
Affiliate system
AI recommendations
Live streaming
```

These may be valuable future features, but they are outside the approved scope unless explicitly added.

---

# 43. NO PREMATURE OPTIMIZATION

Do not introduce complex architecture simply because it looks sophisticated.

Architecture should solve a real requirement.

Prefer:

```text
Simple + scalable + understandable
```

over:

```text
Complex + impressive + unnecessary
```

Every dependency and abstraction should have a reason.

---

# 44. NO PREMATURE BACKEND COUPLING

The frontend must remain replaceable.

Do not allow mock data structures to become accidental backend contracts without documentation.

The future API contract will be intentionally defined during the backend phase.

---

# 45. DESIGN IMPLEMENTATION PRINCIPLE

The UI should prioritize:

```text
Content
    ↓
Discovery
    ↓
Decision
    ↓
Action
```

For example:

```text
Movie
 ↓
Details
 ↓
DJ / Version
 ↓
Watch or Download
 ↓
LIPA
 ↓
Access
```

The interface should make this journey understandable without unnecessary friction.

---

# 46. PRODUCT FEEL

The product should feel:

* Cinematic
* Premium
* Fast
* Modern
* Confident
* Intelligent
* Content-first
* Commercially credible

It should NOT feel:

* Cheap
* Crowded
* Template-based
* Overly corporate
* Like an admin dashboard
* Like a basic WordPress movie site
* Like a Netflix copy
* Like an AI-generated prototype

---

# 47. DEFINITION OF DONE

A frontend feature is NOT considered complete simply because it renders.

A feature is considered complete only when it:

* Matches the approved requirements
* Uses the approved design system
* Works responsively
* Has appropriate loading state
* Has appropriate empty state
* Has appropriate error state
* Has appropriate interaction states
* Uses reusable components
* Uses typed data
* Respects accessibility requirements
* Respects motion rules
* Does not introduce unauthorized business logic
* Does not introduce backend dependencies
* Does not break existing functionality

---

# 48. FINAL AGENT DIRECTIVE

Before implementing anything, the AI coding agent must ask itself:

```text
1. Is this feature explicitly required?
2. Which document defines it?
3. Am I following the current locked requirements?
4. Am I inventing anything?
5. Does this belong to the frontend phase?
6. Does this follow the design system?
7. Does this follow the architecture?
8. Is the data typed?
9. Have loading, empty and error states been considered?
10. Does it work on mobile?
11. Does the interaction have a meaningful purpose?
12. Am I changing anything unrelated?
```

If the answer to any critical question is unclear:

> **STOP. DO NOT GUESS. REQUEST CLARIFICATION.**

---

# 49. CONSTITUTION SUMMARY

The core principles of GIFTEDproMovies frontend development are:

```text
DOCUMENT BEFORE IMPLEMENTATION

REQUIREMENTS BEFORE ASSUMPTIONS

REUSE BEFORE DUPLICATION

ARCHITECTURE BEFORE COMPLEXITY

CONTENT BEFORE DECORATION

UX BEFORE ANIMATION

PERFORMANCE BEFORE EFFECTS

ACCESSIBILITY BY DEFAULT

MOCK DATA BEFORE REAL API

FRONTEND NOW, BACKEND LATER

NO UNAUTHORIZED FEATURES

NO SILENT REQUIREMENT CHANGES

NO VIBE CODING
```

The goal is not simply to make the application work.

The goal is to build a frontend that is:

> **intentional, scalable, maintainable, responsive, cinematic, commercially credible, and ready for a real production backend.**

---

## DOCUMENT STATUS

**MD-01 — Frontend Project Constitution & Non-Negotiable Rules**

Status:

```text
FOUNDATION DOCUMENT
```

This document must be reviewed and approved before proceeding to:

```text
MD-02 — Technology Stack & Development Environment
```

No major frontend implementation should begin until the relevant documentation has been approved.
