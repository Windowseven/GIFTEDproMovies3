# GIFTEDproMovies — Media Team Experience & Content Operations Specification

**Document ID:** MD-21
**File:** `21_MEDIA_TEAM_UI.md`
**Version:** 1.0
**Status:** Frontend Specification
**Scope:** Frontend only

---

# 1. Purpose

This document defines the complete **Media Team experience** for GIFTEDproMovies.

The Media Team exists to handle the platform's content operations, including:

* Movies
* Series
* Seasons
* Episodes
* Posters
* Backdrops
* Trailers
* Streaming media
* Download media
* Categories
* Countries
* DJs / Translators
* Movie versions
* Content metadata

The Media Team experience must be optimized for **fast, accurate content production and management**.

It must not feel like a restricted copy of the Admin dashboard.

---

# 2. Media Team Role

The Media Team is a **content-management role**.

Its primary responsibility is:

> Prepare, organize, update and manage platform content.

The Media Team does not manage the business's financial operations.

---

# 3. Media Team Permissions

The Media Team may manage:

```text id="6v8f3q"
Movies
Series
Seasons
Episodes
Media Assets
Categories
Countries
DJs / Translators
Movie Versions
Content Metadata
```

The Media Team must not access:

```text id="7k2m9c"
Revenue
Sales
Payments
Financial Reports
Sensitive Financial Information
```

---

# 4. Media Team vs Admin

The role separation is:

```text id="h1n4sa"
ADMIN
│
├── Full platform control
├── Content management
├── Users
├── Media Team
├── Pricing
├── Subscriptions
├── Orders
├── Payments
├── Sales
├── Revenue
├── Featured
├── Trending
└── Settings


MEDIA TEAM
│
├── Movies
├── Series
├── Seasons
├── Episodes
├── Media Assets
├── Categories
├── Countries
├── DJs / Translators
└── Content Metadata
```

The Media Team must never inherit Admin functionality simply because both roles work with content.

---

# 5. Media Team Route

Primary route:

```text id="z5o6v1"
/media-team
```

Implemented content operations routes:

```text id="q8m3sd"
/media-team                  → Content Dashboard & KPIs
/media-team/movies           → Movies Library & Ingestion Studio
/media-team/series           → Series & Episodic Studio
/media-team/review           → Review Queue (Pending Admin Approval)
/media-team/qc               → Quality Control & 9-Point Readiness Checklist
/media-team/metadata         → Metadata & Synopsis Management
/media-team/assets           → Artwork (Posters, Backdrops, Trailers)
/media-team/transcoding      → Transcoding Pipeline Monitor
/media-team/stems            → DJ Audio Stems & Version Linking
/media-team/djs              → DJ / Voice Artist Catalog
/media-team/categories       → Taxonomy Categories
/media-team/countries        → Taxonomy Countries
```

---

# 6. Media Team Navigation & Workflow

Implemented sidebar navigation:

```text id="3m1q7w"
MEDIA TEAM STUDIO

Overview
  └── Dashboard (/media-team)

Content Operations
  ├── Movies & DJ Editions (/media-team/movies)
  ├── Series Studio (/media-team/series)
  └── Review Queue (/media-team/review)

Quality & Assets
  ├── Quality Control & Audits (/media-team/qc)
  ├── Metadata Editor (/media-team/metadata)
  ├── Media Assets (/media-team/assets)
  ├── Transcoding Monitor (/media-team/transcoding)
  └── Audio Stems (/media-team/stems)

Taxonomies
  ├── DJs / Translators (/media-team/djs)
  ├── Categories (/media-team/categories)
  └── Countries (/media-team/countries)
```

Do not display Admin-only navigation items.

---

# 7. Media Team Dashboard

Route:

```text id="p0s4ax"
/media-team
```

The dashboard should answer:

1. What content am I managing?
2. What content needs attention?
3. What have I recently updated?
4. What uploads are in progress?
5. What content is incomplete?

It should not become a financial dashboard.

---

# 8. Dashboard Overview

Useful operational metrics include:

* Movies managed
* Series managed
* Draft content
* Published content
* Recently updated content
* Incomplete content
* Uploads in progress
* Content requiring attention

These metrics are content-oriented.

Do not show:

* revenue
* sales
* payment totals
* customer spending
* financial charts

---

# 9. Media Team Dashboard Visual Direction

The visual style should remain consistent with GIFTEDproMovies.

Use the global design system:

```text id="zj8x3p"
Background:       #08090C
Surface:           #111318
Elevated Surface:  #181A21
Crimson:           #B11226
Gold:              #D6A84F
Primary Text:      #F5F5F5
Secondary Text:    #A6A8B0
Muted:             #70737C
Border:            #262932
Subtle Border:     #1C1E25
```

However, the Media Team interface should prioritize:

**speed + clarity + content production**

over cinematic decoration.

---

# 10. Recent Content

The dashboard may display recently modified content.

Example:

```text id="6g3vbc"
Poster
Movie Title
Updated 12 minutes ago
Draft
Edit →
```

This gives the Media Team an immediate continuation point.

---

# 11. Content Requiring Attention

The dashboard may identify incomplete content.

Examples:

```text id="9x2r1m"
Missing poster
Missing category
Missing DJ/Translator
Missing stream media
Missing download media
Incomplete description
```

The purpose is to help the Media Team finish content efficiently.

---

# 12. Quick Actions

Useful actions:

```text id="h8c4nz"
+ Add Movie
+ Add Series
Manage Movies
Manage Series
```

Avoid unnecessary dashboard actions.

---

# 13. Movie Management

Route:

```text id="0r6x4k"
/media-team/movies
```

The movie management page should support:

* search
* filtering
* sorting
* pagination
* create
* edit
* status visibility

---

# 14. Movie List

Recommended information:

```text id="y2g7kq"
Poster
Title
Category
Country
DJ / Translator
Status
Updated
Actions
```

Financial information must not appear.

Do not display:

* sale amount
* revenue
* payment information
* customer purchase totals

unless a future requirement explicitly authorizes non-sensitive performance metrics.

---

# 15. Movie Search

Media Team should be able to search movies by:

* title
* slug
* DJ/Translator

Search should be fast and contextual.

---

# 16. Movie Filters

Useful filters:

* status
* category
* country
* DJ/Translator

Possible status values:

```text id="j2p5w0"
DRAFT
PUBLISHED
ARCHIVED
```

If a future approval state is adopted, additional states can be introduced without redesigning the entire page.

---

# 17. Create Movie

Route:

```text id="4c1m8r"
/media-team/movies/new
```

The creation workflow should be structured rather than presenting one massive form.

Recommended sections:

```text id="0j7x9q"
1. Basic Information
2. Visual Assets
3. Classification
4. DJ / Translator
5. Versions
6. Media
7. Publishing
```

---

# 18. Basic Movie Information

Fields:

* Title
* Description
* Release year
* Duration
* Slug

The UI must provide clear validation.

---

# 19. Visual Assets

The Media Team should be able to manage:

* poster
* backdrop
* trailer

The interface should provide:

* preview
* replacement
* removal
* upload progress
* validation feedback

Actual storage implementation belongs to the future backend.

---

# 20. Classification

Movie classification should support:

* categories
* countries

Selections should use reusable searchable controls when the dataset is large.

---

# 21. DJ / Translator Assignment

The Media Team should be able to associate the appropriate DJ/Translator with a movie version.

A movie may have multiple versions.

Example:

```text id="j3s7ap"
Movie
└── Versions
    ├── DJ Mack
    ├── DJ John
    └── DJ Peter
```

---

# 22. Movie Version Management

Each version should conceptually contain:

* DJ/Translator
* version name
* streaming media
* download media
* streaming price
* download price
* access duration
* status

The frontend must preserve the relationship between the movie and its versions.

---

# 23. Pricing Visibility

The Media Team may need to interact with content forms that contain pricing fields because versions are part of content configuration.

However, pricing authority belongs to the Admin.

Therefore the exact Media Team pricing permission remains a business decision.

Do not automatically assume:

```text id="q2w9eb"
Media Team can change prices
```

or:

```text id="4m0zqc"
Media Team cannot see price fields
```

unless this is explicitly finalized.

If pricing remains Admin-controlled, the frontend should represent those fields as read-only or omit them from Media Team editing.

---

# 24. Access Duration

Access duration is configurable.

The Media Team must not hard-code a duration.

If access duration is exposed in a Media Team workflow, it must come from the shared typed model and business configuration.

---

# 25. Publishing Status

Media Team content may use:

```text id="1k4s9f"
DRAFT
PUBLISHED
ARCHIVED
```

However, whether Media Team can directly publish content is currently unresolved.

---

# 26. Publishing Approval — Pending Decision

The business has not finalized whether Media Team content requires Admin approval.

The architecture must therefore support both possibilities.

### Option A — Direct Publishing

```text id="u9p3w2"
Media Team
   ↓
Draft
   ↓
Publish
```

### Option B — Admin Approval

```text id="b4r7ny"
Media Team
   ↓
Draft
   ↓
Submit for Review
   ↓
Admin Review
   ↓
Publish
```

Do not permanently implement either business rule until confirmed.

---

# 27. Series Management

Route:

```text id="s7m3qd"
/media-team/series
```

Series hierarchy:

```text id="x0c4ba"
Series
 ├── Season 1
 │    ├── Episode 1
 │    ├── Episode 2
 │    └── Episode 3
 │
 └── Season 2
      ├── Episode 1
      └── Episode 2
```

The Media Team must be able to manage this hierarchy.

---

# 28. Create Series

Route:

```text id="k5p1vf"
/media-team/series/new
```

Series creation should support:

* title
* description
* release information
* poster
* backdrop
* trailer
* categories
* countries
* seasons

---

# 29. Season Management

A series editing experience should allow:

* add season
* edit season
* reorder seasons
* archive season where supported

Season numbering must remain consistent.

---

# 30. Episode Management

The Media Team should be able to:

* create episode
* edit episode
* reorder episodes
* manage metadata
* upload episode media
* change episode status

Episode information may include:

* episode number
* title
* description
* duration
* thumbnail
* streaming media
* download media

---

# 31. Episode Ordering

Episode order must be deterministic.

Example:

```text id="n0g7f2"
Episode 1
Episode 2
Episode 3
Episode 4
```

The UI should provide an intuitive mechanism for reordering where required.

Do not rely on arbitrary database ordering.

---

# 32. Media Upload Experience

Uploading is one of the Media Team's primary workflows.

The upload UI should support:

* drag and drop where appropriate
* file selection
* file validation
* preview where possible
* progress
* success
* failure
* retry
* cancel

---

# 33. Upload States

Use explicit states:

```text id="5c2m9x"
IDLE
PREPARING
UPLOADING
PROCESSING
COMPLETED
FAILED
CANCELLED
```

The UI must not simply show an indefinite spinner.

---

# 34. Upload Progress

Where progress information is available, show:

```text id="k9s2qd"
Poster.jpg
Uploading
67%
██████████████░░░░░
```

For large media files, the interface should make it clear whether the file is:

* uploading
* processing
* ready

---

# 35. Upload Failure

Failure state should provide recovery.

Example:

```text id="f7r4ad"
Upload failed.

The media could not be uploaded.

Retry
Remove
```

Avoid vague:

> Something went wrong.

when a useful explanation is available.

---

# 36. Media Validation

Frontend validation may check appropriate properties such as:

* file selected
* supported format
* file size when known
* required asset type

Do not pretend frontend validation replaces backend media validation.

---

# 37. Media Preview

Where technically possible, provide previews for:

* posters
* backdrops
* trailers
* supported video assets

Preview should help the Media Team confirm the correct asset before saving.

---

# 38. Content Completeness

The Media Team UI may display a content completeness indicator.

Example:

```text id="3z8n1w"
Movie Setup

████████████████░░ 80%

✓ Basic information
✓ Poster
✓ Category
✓ Country
✓ DJ version
⚠ Download media
```

This is a productivity feature, not a replacement for backend validation.

---

# 39. Draft Workflow

The Media Team should be able to save incomplete work as Draft where permitted.

Drafts are useful for:

* partially configured movies
* partially uploaded media
* incomplete series
* unfinished episodes

Do not force publication before content is ready.

---

# 40. Autosave

Automatic draft saving may be introduced later if needed.

It is **not a mandatory requirement** for the current frontend phase.

Do not implement complex autosave behavior merely because it sounds useful.

---

# 41. Categories

If Media Team is allowed to manage categories, provide a dedicated interface.

Otherwise categories should be presented as selectable existing content classifications.

The exact authority remains aligned with the Admin business model.

Do not duplicate category management logic.

---

# 42. Countries

Country selection should use the shared country dataset.

Avoid free-form country strings where structured country data is expected.

This keeps discovery consistent.

---

# 43. DJs / Translators

DJ/Translator data should use the shared domain model.

The Media Team may:

* select existing DJs/Translators
* associate them with versions
* view relevant information

Creation/edit permissions should follow the finalized business permission model.

Do not duplicate DJ records locally inside movie forms.

---

# 44. Content Relationship Integrity

The UI must preserve relationships:

```text id="g8v3p0"
Movie
 ↓
Movie Version
 ↓
DJ / Translator
 ↓
Stream Asset
 ↓
Download Asset
```

and:

```text id="n3x7yc"
Series
 ↓
Season
 ↓
Episode
 ↓
Media Assets
```

A component must not silently break these relationships.

---

# 45. Media Team Content Table

The table should prioritize operational information.

Recommended:

| Field   | Purpose               |
| ------- | --------------------- |
| Poster  | Visual identification |
| Title   | Content identity      |
| Type    | Movie / Series        |
| Status  | Workflow state        |
| Updated | Recent activity       |
| Actions | Edit/manage           |

Additional metadata can appear in the details experience.

---

# 46. Actions

Common actions:

* Edit
* View
* Duplicate where explicitly useful
* Archive
* Continue editing

Destructive actions require confirmation.

---

# 47. Preview

The Media Team should be able to preview content as it will appear to customers where practical.

This helps identify:

* broken imagery
* incorrect metadata
* wrong category
* incorrect version
* missing media

A preview should not accidentally grant access to protected content beyond the intended mock experience.

---

# 48. Customer-Facing Preview

Where supported, an Admin/Media Team preview may show:

```text id="c4n7ha"
Poster
Title
Description
Category
Country
DJ / Translator
Version
Availability
```

The preview is for content QA.

It must not bypass actual entitlement rules in the future system.

---

# 49. No Financial Dashboard

The Media Team dashboard must never contain:

```text id="0x7k1v"
Revenue
Sales
Payment Volume
Customer Spending
Payment Failures
Financial Reports
```

If financial information accidentally enters a Media Team view model, that is an architecture defect.

---

# 50. No Customer Data Expansion

The Media Team should not receive unnecessary customer information.

Content operations do not require access to:

* customer payment details
* customer financial history
* other customers' purchases

Only data required for legitimate content operations should be represented.

---

# 51. Responsive Media Team

The Media Team interface must be designed mobile-first.

Desktop:

```text id="8k1w6b"
Sidebar
Content Table
Filters
Actions
```

Mobile:

```text id="5q2m9a"
Header
↓
Filters
↓
Content Cards
↓
Actions
```

---

# 52. Mobile Upload

Mobile upload must be considered explicitly.

The UI should support:

* file picker
* upload progress
* retry
* cancel
* media preview where supported

Do not assume Media Team users will always work from desktop.

---

# 53. Responsive Forms

Desktop forms may use multiple columns where useful.

Mobile forms should transform into:

```text id="3d8f2s"
Basic Information
   ↓
Media
   ↓
Classification
   ↓
Versions
   ↓
Publishing
```

Avoid horizontal scrolling for essential form fields.

---

# 54. Motion

Media Team motion should be subtle and purposeful.

Useful animations:

* upload progress
* status transitions
* dialog opening
* content reorder
* successful save
* error feedback
* navigation transitions

Avoid cinematic transitions that slow down repeated content operations.

---

# 55. Accessibility

The Media Team UI must support:

* keyboard navigation
* visible focus
* semantic form controls
* accessible upload areas
* accessible progress indicators
* accessible dialogs
* accessible error messages
* sufficient contrast
* logical focus management

Upload status must not be communicated visually only.

---

# 56. Loading States

Examples:

```text id="5n9v4b"
Movie list skeleton
Series list skeleton
Form loading
Media preview loading
Upload progress
```

Never leave the Media Team staring at a blank page during data loading.

---

# 57. Empty States

Examples:

```text id="j6p0kc"
No movies yet.

Create your first movie.
```

Filtered:

```text id="z8q1nm"
No content matches your filters.

Clear filters
```

---

# 58. Error States

Errors should provide recovery.

Examples:

```text id="m4x9qd"
Unable to load movies.

Try again
```

or:

```text id="p7s2ca"
Could not save this movie.

Review the highlighted fields and try again.
```

---

# 59. Data Architecture

Media Team UI must follow:

```text id="6xv8p3"
Media Team UI
      ↓
Content Controller / Hook
      ↓
Content Repository
      ↓
Typed Mock Data
```

Future:

```text id="g3m9qa"
Media Team UI
      ↓
Content Controller / Hook
      ↓
Content Repository
      ↓
Future API
```

Components must not directly mutate mock datasets.

---

# 60. Mock Media Team Sessions

Mock sessions should include Media Team users.

The frontend should be able to demonstrate:

```text id="7q4n2c"
ADMIN
MEDIA_TEAM
CUSTOMER
```

with different navigation and data visibility.

---

# 61. Role Isolation Test

A Media Team mock session should demonstrate that:

```text id="5k8p0m"
Revenue → unavailable
Sales → unavailable
Payments → unavailable
Orders → unavailable
```

while:

```text id="2n6v9x"
Movies → available
Series → available
Media → available
Content metadata → available
```

---

# 62. Future API Boundary

The Media Team must not depend on the shape of mock arrays.

Repository interfaces should allow future replacement with API calls.

Example conceptual interface:

```text id="m8q3sd"
listMovies()
getMovie()
createMovie()
updateMovie()
archiveMovie()

listSeries()
getSeries()
createSeries()
updateSeries()
```

Exact implementation belongs to the codebase architecture.

---

# 63. No Backend Implementation

This document does not authorize:

* database
* API
* authentication backend
* storage service
* real media upload service
* payment integration
* authorization backend

All behavior remains mocked during the frontend phase.

---

# 64. Security Boundary

The frontend must not treat Media Team route hiding as security.

Future backend authorization must enforce:

```text id="0p6s2x"
Media Team → Content operations
Admin → Full operations
Customer → Customer operations
```

The frontend only represents the expected experience.

---

# 65. No Raw Protected Media Exposure

The frontend must not unnecessarily expose:

* private storage credentials
* secret upload credentials
* unrestricted protected media URLs
* payment credentials
* backend secrets

Mock URLs may be used strictly for development where appropriate.

---

# 66. Publishing Safety

If publishing is available to Media Team, the UI should provide a clear status transition.

If Admin approval becomes mandatory, the UI must instead provide:

```text id="r3y8nm"
Save Draft
Submit for Review
```

rather than pretending the Media Team can publish directly.

This behavior must follow the final business decision.

---

# 67. Component Architecture

Recommended Media Team components:

```text id="c7m2pa"
MediaTeamSidebar
MediaTeamHeader
MediaTeamMetric
ContentTable
ContentCard
ContentStatusBadge
MovieForm
SeriesForm
SeasonManager
EpisodeManager
MovieVersionEditor
MediaUpload
MediaPreview
ContentCompleteness
PublishingControls
```

Reuse shared UI primitives from the global component system.

---

# 68. Avoid Mega Components

Do not create:

```text id="a6z0xp"
MediaTeamEverything.tsx
```

containing:

* navigation
* dashboard
* movie form
* upload
* series management
* permissions
* tables
* dialogs

Separate by responsibility.

---

# 69. Business Logic Separation

Components should not independently calculate:

* entitlement
* payment state
* subscription validity
* financial values
* trending rankings

The Media Team only manages content-facing information.

---

# 70. Performance

Media management can involve heavy assets.

Therefore:

* lazy-load previews
* avoid loading full videos unnecessarily
* use appropriate thumbnail sizes
* avoid unnecessary re-renders
* keep upload progress updates efficient
* clean up temporary object URLs
* avoid loading every media asset simultaneously

---

# 71. Content Operations Principle

The Media Team experience should optimize:

```text id="j9v3xa"
Find
 ↓
Edit
 ↓
Upload
 ↓
Validate
 ↓
Save
 ↓
Publish / Submit
```

The fewer unnecessary steps, the better.

---

# 72. Media Team Quality Bar

The completed experience should feel like a serious **content operations workspace**.

A Media Team user should immediately understand:

* what content exists
* what needs attention
* how to add content
* how to edit content
* how to manage versions
* how to upload media
* how to manage series
* what their permissions are
* what they cannot access

without needing to understand the backend.

---

# 73. Anti-Patterns

Do not implement:

* Admin dashboard clone
* revenue cards
* payment pages
* sales reports
* customer financial data
* unnecessary customer management
* unrestricted publishing assumptions
* hard-coded approval workflow
* hard-coded pricing authority
* giant content forms
* giant upload components
* fake storage backend
* fake payment backend
* client-side security claims
* desktop-only design
* excessive animation
* duplicate domain models
* duplicated category/country/DJ data
* generic CRUD styling

---

# 74. AI Coding Agent Directive

When implementing this document:

1. Read `00_PROJECT_RULES.md`.
2. Read `01_TECH_STACK.md`.
3. Read `02_DESIGN_SYSTEM.md`.
4. Read `03_VISUAL_LANGUAGE.md`.
5. Read `04_MOTION_SYSTEM.md`.
6. Read `05_FRONTEND_ARCHITECTURE.md`.
7. Read `06_ROUTE_MAP.md`.
8. Read `07_COMPONENT_ARCHITECTURE.md`.
9. Read `08_DATA_MODELS.md`.
10. Read `09_MOCK_DATA_CONTRACT.md`.
11. Read `20_ADMIN_UI.md`.
12. Then implement the Media Team experience.

Do not invent Media Team permissions.

Do not expose financial information.

Do not create backend functionality.

Do not create fake APIs.

Do not silently decide the publishing approval workflow.

Do not silently decide whether Media Team can modify pricing.

If an unresolved business decision affects implementation, preserve the architecture so the decision can be introduced later without major refactoring.

---

# 75. Definition of Done

MD-21 is complete when:

* `/media-team` exists
* Media Team navigation is isolated
* dashboard is operational
* content-focused metrics exist
* movies management exists
* series management exists
* seasons are manageable
* episodes are manageable
* media assets are manageable conceptually
* movie versions are supported
* DJ/Translator relationships are supported
* categories/countries are supported according to permission model
* uploads have explicit states
* media previews exist where appropriate
* content completeness can be represented
* draft workflow exists
* publishing workflow remains configurable
* financial information is inaccessible
* customer financial data is inaccessible
* responsive behavior is intentional
* mobile upload is considered
* accessibility is implemented
* motion follows the global system
* loading/empty/error states exist
* typed mock repositories are used
* backend is not implemented
* security is not falsely claimed
* unresolved business rules are not invented

---

# 76. Final Product Principle

The Media Team should feel:

> **“I can manage the content quickly, correctly, and confidently.”**

GIFTEDproMovies should have a clear separation:

```text id="e7x2q1"
ADMIN
Control the business.

MEDIA TEAM
Build and maintain the content.

CUSTOMER
Discover and consume the content.
```

That separation is fundamental to the product architecture.

---

## Next Document

```text id="d8k4m2"
MD-22
22_RESPONSIVENESS.md
```

This document will define the **complete responsive architecture** across:

* Customer
* Admin
* Media Team
* Homepage
* Search
* Movie details
* Series
* Checkout
* Player
* Library
* Downloads
* Subscriptions
* Navigation
* Tables
* Forms
* Modals
* Bottom sheets
* Mobile interactions
* Tablet transformations
* Desktop layouts
* Touch behavior
* Responsive typography
* Responsive spacing
* Image behavior
* Performance considerations
* Accessibility across screen sizes
