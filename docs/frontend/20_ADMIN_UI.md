# GIFTEDproMovies — Admin Dashboard & Management Experience Specification

**Document ID:** MD-20  
**File:** `20_ADMIN_UI.md`  
**Version:** 2.0  
**Status:** Implemented & Verified Specification  
**Scope:** Frontend Only (`/admin/*`)  

---

## 1. Purpose & Core Product Identity

This document defines the complete **Admin experience** for **GIFTEDproMovies**.

The GIFTEDproMovies Admin is a:

> **Premium content, customer, commerce, and platform management workspace.**

It is **NOT**:
* a telecom operations dashboard (no gateway latencies, network ping, or telco uptime monitoring)
* a banking operations console (no BOT clearing accounts, bank reconciliation drawers, or settlement batches)
* an accounting/tax system (no TRA EFD machine codes, VAT calculations, or fiscalization queues)
* a DevOps dashboard (no server racks, container orchestration, or memory/CPU telemetry)
* a CDN monitoring console (no cache purge buttons or edge latency graphs)
* a media encoding console (no FFmpeg NVENC commands, codecs, bitrate ladders, or LUFS audio ducking — these belong strictly to `/media-team`)
* an infrastructure monitoring system

The Admin sees information that helps them **make business decisions, manage catalog releases, curate discovery, support customers, and review commercial performance**.

Technical implementation details remain behind system boundaries unless they directly require Admin operational action.

---

# 2. Language Rule: 100% English

## THE ADMIN UI MUST BE 100% ENGLISH.

English is mandatory for:
* Navigation items and sidebar group headers
* Page titles, subtitles, and section headers
* Action buttons, form labels, and placeholder text
* Table column headers, rows, and empty states
* Status badges, notification alerts, and drawer panels
* Commercial analytics, charts, and filter dropdowns
* Platform settings and policy configurations

Do NOT translate the Admin interface into Swahili.

Avoid mixed-language interfaces.

The Admin workspace must feel like a serious, world-class international SaaS and media-management platform. Swahili is reserved for customer-facing public streaming experiences where appropriate.

---

# 3. Technical & Infrastructure Exclusion Rules

To maintain focus and avoid operational distraction, the Admin interface explicitly forbids:
* Bank of Tanzania (BOT) compliance badges and settlement accounts
* Tanzania Revenue Authority (TRA) EFD machine codes, VAT calculations, and tax auto-deduction toggles
* Telecom gateway latency metrics (e.g. 1.2s, 3.4s) and telco network status indicators
* DSP audio mastering parameters (ducking ratios, LUFS, audio sync drift offsets)
* Raw encoding pipeline details (codecs, HLS chunks, bitrate ladders, FFmpeg CLI)
* Raw customer IP addresses and device MAC addresses
* Server racks, database connection strings, and CDN cache purging buttons

---

# 4. Admin Role & Conceptual Authority

## 4.1 Admin Responsibility
The Admin has the highest operational authority within the frontend experience, managing:
* Content (Movies, Series, Seasons, Episodes, Categories, Countries, DJs / Translators)
* Discovery (Featured Billboard Curation, Trending Content Promotion)
* Customers (Customer Directory, VIP Entitlements, Devices)
* Media Team (Staff Roster, Roles, Permissions, Publishing Approvals)
* Commerce (Orders Feed, Payments Ledger, PPV Rates, Subscriptions)
* Analytics (Sales Trends, Content Performance Leaderboard)
* Platform Settings (Branding Defaults, Pricing Baselines, Maintenance Mode)

## 4.2 One-Admin Concept
The platform defines **one Admin conceptually**. Do not introduce multi-admin hierarchies, super-admin roles, or admin-to-admin permission matrices.

---

# 5. Implemented Navigation Architecture & Route Map

The Admin workspace is structured into six clean operational domains:

```text
GIFTEDproMovies (Admin Workspace)
│
├── Overview (Dashboard)              → /admin
│
├── CONTENT
│   ├── Movies                        → /admin/movies
│   ├── Series                        → /admin/series
│   ├── Categories                    → /admin/categories
│   ├── Countries                     → /admin/countries
│   └── DJs / Translators             → /admin/djs
│
├── DISCOVERY
│   ├── Featured Curation             → /admin/featured
│   └── Trending Content              → /admin/trending
│
├── USER MANAGEMENT
│   ├── Customers                     → /admin/users
│   └── Media Team Staff              → /admin/media-team
│
├── COMMERCE
│   ├── Orders Feed                   → /admin/orders
│   ├── Payments Ledger               → /admin/payments
│   ├── Pricing (PPV)                 → /admin/pricing
│   └── Subscriptions                 → /admin/subscriptions
│
├── ANALYTICS
│   ├── Sales Trends                  → /admin/sales
│   └── Content Performance           → /admin/content-performance
│
└── SYSTEM
    └── Platform Settings             → /admin/settings
```

A compatibility route `/admin/transactions` exists to provide a unified ledger and cleanly cross-link between `/admin/orders` and `/admin/payments`.

---

# 6. Admin Overview Dashboard (The 5 Core Questions)

Route:
```text
/admin
```

The Overview Dashboard is designed around five essential business questions:

1. **How is the platform performing?**
   - Gross Revenue (Month), Revenue Growth %, Total Orders, Success Rate %, Active Subscriptions, Customers, Catalog Size.
2. **What content is performing?**
   - Top grossing and most streamed titles leaderboard, stream counts, completion rates, lead DJ.
3. **What requires attention?**
   - Actionable alert queue: Movies awaiting publishing review, incomplete talent profiles, expiring customer passes.
4. **What are customers doing?**
   - ARPU, customer retention rate, churn rate, and device distribution (Mobile, Smart TV, Tablet, Desktop).
5. **What commercial activity is happening?**
   - Live orders stream showing Order ID, Customer, Content/Pass, Type, Amount (TZS), Payment Method, Status, and Receipt inspection drawer.

---

# 7. Dashboard KPI Overview

The dashboard should support the following metrics.

### Content

* Total Movies
* Total Series
* Total Episodes

### Audience

* Total Customers
* Active Customers

### Commerce

* Sales
* Revenue
* Orders

### Engagement

* Views
* Downloads

### Subscription

* Active Subscriptions
* Expiring Subscriptions

### Payments

* Successful Payments
* Failed Payments
* Pending Payments

The exact displayed KPIs can be prioritized depending on screen size.

---

# 7.1 Financial Data Visibility (Strict Admin Confidentiality)

Financial information is strictly Admin-only.

This includes:

* revenue
* sales totals
* payment amounts
* transaction information
* failed payment financial information
* order values
* subscription revenue
* payment provider information where sensitive
* financial reports

Media Team must never receive access to these sections.

Customers must never receive access to these sections.

Frontend visibility must reflect this separation, while the future backend remains the actual security authority.

---

# 8. Dashboard Visual Direction

The dashboard must **not look like a generic business SaaS dashboard**.

Avoid:

```text
[Users] [Revenue] [Orders] [Products]
```

with endless white cards and generic charts.

Instead, create a:

> **Premium media-content command center.**

The visual language should combine:

* cinematic content imagery
* dark surfaces
* restrained crimson
* premium gold
* content performance
* compact analytics
* clear hierarchy

The existing brand system remains authoritative.

Use:

```text
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

Do not introduce a new dashboard color system.

---

# 9. Dashboard Composition

Recommended structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Admin Header                                      Account     │
├───────────────┬──────────────────────────────────────────────┤
│               │                                               │
│ Navigation    │ Overview                                      │
│               │                                               │
│               │ KPI Overview                                  │
│               │                                               │
│               │ Revenue / Sales Performance                    │
│               │                                               │
│               │ Content Performance                            │
│               │                                               │
│               │ Recent Transactions                            │
│               │                                               │
│               │ Trending / Featured                            │
│               │                                               │
│               │ Quick Actions                                 │
└───────────────┴──────────────────────────────────────────────┘
```

The exact arrangement may change responsively.

---

# 10. Revenue & Sales Analytics

The Admin dashboard may include visual summaries of:

* revenue
* sales
* orders
* subscription performance
* individual purchases
* payment success/failure

Charts should be purposeful.

Possible visualizations:

* revenue trend
* sales volume
* payment status distribution
* content revenue performance

Do not add charts merely because a dashboard is expected to have charts.

Every chart must communicate a useful business insight.

---

# 11. Content Performance

The Admin should be able to quickly identify high-performing content.

Possible metrics:

* views
* purchases
* downloads
* engagement
* revenue contribution

Content performance should be visually connected to actual movies or series.

Example:

```text
#1  Movie Poster   Movie Name
                  12.4K views
                  1,240 purchases
                  890 downloads
```

This creates a media-business feeling rather than an abstract analytics dashboard.

---

# 12. Recent Transactions

The dashboard should show recent commerce activity.

Example information:

```text
Customer
Content
Purchase Type
Amount
Payment Status
Date
```

Possible states:

* Successful
* Pending
* Failed
* Cancelled

The dashboard should not expose unnecessary customer-sensitive information.

---

# 13. Trending Content

The dashboard may show:

* current trending movies
* rapidly rising content
* highly viewed content
* highly purchased content

The Admin should be able to navigate directly to:

```text
/admin/trending
```

for management.

---

# 14. Featured Content

Featured content should be visible from the dashboard where useful.

Admin can navigate to:

```text
/admin/featured
```

Featured content is distinct from automatic trending.

---

# 15. Quick Actions

The dashboard should provide useful actions such as:

```text
+ Add Movie
+ Add Series
Manage Trending
Manage Featured
View Orders
View Payments
```

Quick actions should prioritize frequent operational tasks.

---

# 16. Movie Management

Route:

```text
/admin/movies
```

The movie management area must support:

* viewing movies
* searching
* filtering
* sorting
* creating movies
* editing movies
* changing status
* managing versions
* managing pricing
* managing media assets

---

# 17. Movie List

Movie list should display useful content information.

Possible columns:

```text
Poster
Title
Country
Category
DJ / Translator
Status
Price
Views
Updated
Actions
```

Do not overload the table with every possible field.

Less frequently used information can appear inside the movie detail/edit experience.

---

# 18. Movie Search & Filtering

Admin movie management should support:

* title search
* status
* category
* country
* DJ/Translator
* featured state
* trending state

Filtering should be URL-addressable where appropriate.

Example:

```text
/admin/movies?status=published&category=action
```

---

# 19. Movie Status

Supported frontend statuses:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Visual status must be immediately recognizable.

Publishing and archiving are consequential actions and should require appropriate confirmation where necessary.

---

# 20. Movie Creation & Editing

The movie form should support:

### Basic Information

* Title
* Description
* Release year
* Duration
* Slug

### Visual Assets

* Poster
* Backdrop
* Trailer

### Classification

* Categories
* Countries

### Localization / Versioning

* DJs / Translators
* Movie versions

### Commerce

* Streaming price
* Download price
* Access duration

### Publishing

* Draft
* Published
* Archived

---

# 21. Movie Versions

Because one movie may have multiple DJ/Translator versions, version management is a first-class Admin responsibility.

Example:

```text
Movie:
The Example Movie

Versions:
────────────────────────────
DJ Mack
Stream: TZS 2,000
Download: TZS 4,000

DJ John
Stream: TZS 2,500
Download: TZS 4,500
```

Each version may have its own:

* DJ/Translator
* version name
* stream asset
* download asset
* stream price
* download price
* access duration
* availability status

The Admin must not accidentally create a single global price where version-specific pricing is required.

---

# 22. Access Duration

Access duration is configurable by Admin.

Do not hard-code:

```text
7 days
```

or any other duration.

The interface should allow supported duration configuration such as:

```text
3 Days
7 Days
14 Days
30 Days
```

The exact allowed values remain a business configuration decision.

---

# 23. Series Management

Route:

```text
/admin/series
```

Series management must support:

```text
Series
  └── Seasons
        └── Episodes
```

The Admin should be able to:

* create series
* edit series
* create seasons
* reorder seasons
* create episodes
* reorder episodes
* edit episode metadata
* manage episode media
* configure pricing

---

# 24. Series Pricing

The platform currently supports configurable series pricing concepts:

```text
PER_EPISODE
PER_SEASON
FULL_SERIES
COMBINATION
```

The final business model remains pending.

The frontend must therefore be architected so pricing can change without rewriting the entire series experience.

Do not silently select one pricing model as the final business rule.

---

# 25. Episode Management

Episode management should support:

* episode number
* title
* description
* duration
* poster/thumbnail
* stream media
* download media
* status
* availability

Episode ordering must be deterministic.

---

# 26. Categories Management

Route:

```text
/admin/categories
```

Admin can:

* create categories (name, description, display priority order)
* edit category details and display order
* toggle active/inactive status (hides from customer discovery without breaking existing relationships)
* manage category names and descriptions
* view associated content count (`contentCount`)

### Smart Delete Safeguard
Deleting a category is protected by a safety barrier:
- If `contentCount === 0`: Category can be permanently removed with standard confirmation.
- If `contentCount > 0`: Hard deletion triggers a smart safeguard modal warning that movies/series are linked to this taxonomy. The modal provides a 1-click **"Deactivate Instead"** option, which deactivates the category from discovery rails while keeping existing catalog relationships intact.

---

# 27. Countries Management

Route:

```text
/admin/countries
```

Admin can:

* create countries
* edit countries
* archive countries
* manage names
* manage slugs
* associate content

Country information powers:

* country discovery
* filters
* movie details
* search
* content collections

---

# 28. DJs / Translators Management

Route:

```text
/admin/djs
```

Admin can manage:

* DJ/Translator name
* slug
* profile/identity image where applicable
* description where applicable
* associated movie versions
* associated content

DJs/Translators are part of the platform's discovery model, not merely metadata.

---

# 29. Customer Management

Route:

```text
/admin/users
```

The Admin can view and manage customers.

Possible information:

* name
* email
* account status
* registration date
* subscription status
* purchase activity summary
* content access summary

Financial information remains Admin-only.

Avoid exposing passwords or sensitive authentication data.

---

# 30. Media Team Management

Route:

```text
/admin/media-team
```

Admin controls the Media Team.

The Admin should be able to:

* view Media Team members
* add Media Team members where supported
* activate/deactivate members
* review their content activity
* manage their access
* manage their operational role

Media Team members must not access:

* revenue
* sales
* payment records
* financial analytics
* sensitive financial information

---

# 31. Media Team Publishing Approval

The business has **not yet finalized** whether Media Team uploads require Admin approval before publishing.

Therefore the frontend must not permanently hard-code either:

```text
Media Team uploads → immediately published
```

or:

```text
Media Team uploads → mandatory Admin approval
```

Instead, the architecture must support a future workflow such as:

```text
Draft
   ↓
Submitted
   ↓
Admin Review
   ↓
Published
```

if the business selects an approval workflow.

Until that decision is finalized, implement only the agreed status model and keep the approval mechanism configurable.

---

# 32. Subscription Management

Route:

```text
/admin/subscriptions
```

Admin manages subscription plans.

The interface should support:

* plan name
* price
* duration
* scope
* streaming access
* download access
* included content
* status
* display/featured state where required

Subscription configuration must remain consistent with:

`19_SUBSCRIPTION_UI.md`

---

# 33. Pricing Management

Route:

```text
/admin/pricing
```

Pricing is a business control surface.

Admin may configure:

* streaming prices
* download prices
* subscription prices
* subscription durations
* access durations
* series pricing configuration

Prices must use:

```text
TZS
```

Do not hard-code business prices into UI components.

---

# 34. Orders

Route:

```text
/admin/orders
```

Orders provide an operational view of purchases.

Possible information:

```text
Order ID
Customer
Content
Purchase Type
Amount
Status
Date
```

Admin can inspect order details.

Orders should remain distinct from payment records.

---

# 35. Payments

Route:

```text
/admin/payments
```

Payment management is Admin-only.

Supported frontend payment statuses include:

```text
PENDING
SUCCESSFUL
FAILED
CANCELLED
```

Payment provider configuration remains pending.

Do not invent a final list of Tanzanian Mobile Money providers.

---

# 36. Sales & Revenue

Route:

```text
/admin/sales
```

This section is dedicated to business performance.

It may include:

* total sales
* revenue
* sales by content
* sales by purchase type
* subscription revenue
* individual purchase revenue
* time-based performance

Financial information must never be rendered in Media Team interfaces.

---

# 37. Featured Content

Route:

```text
/admin/featured
```

Admin can manually control featured content.

The interface should make it clear that:

> Featured ≠ Trending.

Featured content represents intentional editorial/business promotion.

---

# 38. Trending Management

Route:

```text
/admin/trending
```

Trending has two mechanisms.

### Automatic Trending

Based on platform activity such as:

* views
* searches
* purchases
* downloads
* recent engagement

### Manual Override

Admin can intentionally promote content as Trending.

The UI should clearly distinguish:

```text
Automatically Trending
```

from:

```text
Admin Promoted
```

Do not replace the automatic ranking system with a static manual list.

---

# 39. Content Performance

Admin content management should surface useful performance signals.

Possible metrics:

* views
* searches
* purchases
* downloads
* revenue
* recent activity

Performance indicators should help Admin make decisions about:

* featured content
* trending content
* pricing
* content promotion

The actual ranking algorithm belongs to the future backend/business logic.

The frontend only needs to represent the resulting data.

---

# 40. Media Asset Management

Admin and Media Team content forms should support media assets conceptually including:

* poster
* backdrop
* trailer
* streaming media
* download media

The frontend should provide:

* upload area
* drag-and-drop where appropriate
* preview
* replacement
* removal
* validation feedback
* upload progress states

The actual storage/upload backend is outside this frontend phase.

---

# 41. Data Tables

Admin tables should support where appropriate:

* search
* filtering
* sorting
* pagination
* row actions
* status indicators
* bulk selection

Do not automatically add every capability to every table.

Use only what makes the specific workflow better.

---

# 42. Bulk Actions

Bulk actions may be used for operationally safe tasks such as:

* archive selected content
* publish selected content
* assign category
* assign country
* feature/unfeature content

Destructive bulk actions must require confirmation.

Avoid building a complicated bulk-action framework if the specific management page does not need it.

---

# 43. Detail Drawers vs Full Routes

Use a full route when the Admin needs:

* complex editing
* many fields
* media management
* structured content configuration
* deep relationships

Use drawers/dialogs for:

* quick inspection
* lightweight status information
* simple confirmation
* compact contextual actions

Do not create giant modal forms for complex content editing.

---

# 44. Forms

Admin forms must have:

* clear labels
* grouped sections
* required-field indicators
* validation
* useful error messages
* loading states
* disabled submit during submission
* success feedback
* preservation of user input where possible

Complex forms should be divided into logical sections.

Example:

```text
Basic Information
Media
Classification
Versions
Pricing
Publishing
```

---

# 45. Destructive Actions

Actions such as:

* delete
* archive
* remove media
* deactivate user
* deactivate Media Team member

must not happen accidentally.

Use confirmation dialogs when the action has meaningful consequences.

Confirmation should clearly communicate:

* what will happen
* what item is affected
* whether the action can be reversed

Do not use generic:

> Are you sure?

without context.

---

# 46. Loading States

Every Admin data-driven experience must have an intentional loading state.

Examples:

* table skeleton
* metric skeleton
* content preview skeleton
* form loading
* upload progress
* dashboard loading

Avoid blank screens while data is loading.

---

# 47. Empty States

Examples:

```text
No movies yet.
Add your first movie to start building the catalog.
```

For filtered results:

```text
No movies match these filters.
Try clearing one or more filters.
```

Empty states should provide a useful next action when appropriate.

---

# 48. Error States

Admin interfaces must distinguish between:

* failed loading
* failed submission
* failed upload
* unavailable content
* invalid form
* unauthorized access

Errors should provide recovery actions where possible.

Example:

```text
Unable to load movies.

Try again
```

---

# 49. Admin Authentication & Protection

Admin routes are protected.

The frontend may use a mock session to determine which UI to render during the frontend phase.

However:

> Client-side role checks are not the security authority.

The future backend must enforce actual authorization.

Never claim that hiding an Admin route from the frontend provides security.

---

# 50. Role Isolation

The application must maintain clear role boundaries:

```text
ADMIN
  ↓
Full management + financial information

MEDIA_TEAM
  ↓
Content management only

CUSTOMER
  ↓
Public/customer experience
```

A Media Team interface must never simply hide financial cards while still loading financial data into the client.

Sensitive data should not be part of the Media Team mock dataset/view model unless explicitly necessary for testing isolation.

---

# 51. Admin Responsive Design

Admin is not desktop-only.

The interface must support:

* desktop
* laptop
* tablet
* mobile

However, responsive behavior must not simply shrink desktop tables until they become unusable.

---

# 52. Mobile Admin & Navigation Rules

### 52.1 Strict Rule: NO Bottom Navigation Bar in Admin
Unlike consumer-facing mobile streaming applications, the Admin workspace has dense tables, complex filters, operational slide-over drawers, and modals.
* **A persistent bottom navigation bar is strictly FORBIDDEN in `/admin/*`.**
* Bottom navigation bars in Admin waste critical vertical screen height, obscure pagination controls, and collide with action drawers and floating confirmations.
* Any previous `AdminMobileNav` component has been removed. Content layout uses standard padding (`pb-10` to `pb-12`).

### 52.2 Mobile Navigation Architecture: Top Header Toggle + Drawer
All mobile navigation on viewports `< 1024px` (`lg` breakpoint) is driven exclusively by the top sticky header:
* **Header Hamburger Button:** The top `AdminHeader` renders an accessible toggle button (`Menu` / `X` icon).
* **Slide-Over Navigation Drawer:** Clicking the toggle animates the full navigation sidebar (`AdminSidebar`) over the page with a backdrop blur (`bg-black/80 backdrop-blur-sm`).
* **Dedicated Close Action:** The mobile drawer displays a prominent header with platform branding, active Admin indicator, and an explicit close button (`X`).
* **Auto-Close on Navigate:** Tapping any route link in the 6 domains automatically closes the drawer and navigates to the selected route.
* **Desktop Persistence:** On viewports `≥ 1024px`, the drawer automatically reverts to a fixed, persistent left sidebar (`w-64`).

### 52.3 Responsive Data Views on Mobile
* **Tables:** Tables wrap inside horizontal overflow containers (`overflow-x-auto`) or collapse into structured cards with essential metadata.
* **Action Menus & Detail Drawers:** Row action triggers open slide-over detail drawers (e.g. `OrderDetailDrawer`, `CustomerDetailDrawer`) from the right/bottom rather than nested desktop popups.
* **Forms:** Multi-column grid forms fold cleanly into single-column vertical stacks.
* **Financial Summaries:** KPI cards switch from multi-column grid (`grid-cols-4`) to a 2-column or 1-column stack.

Example:

Desktop:

```text
Poster | Title | Category | Status | Views | Actions
```

Mobile:

```text
┌──────────────────────┐
│ Poster               │
│ Movie Title          │
│ Published            │
│ 12.4K views          │
│                      │
│        Actions ⋯     │
└──────────────────────┘
```

---

# 53. Accessibility

Admin must support:

* keyboard navigation
* visible focus states
* accessible labels
* semantic controls
* accessible dialogs
* accessible tables
* sufficient contrast
* screen-reader-friendly status messages
* logical focus movement

Do not sacrifice accessibility for visual polish.

---

# 54. Admin Motion

Admin motion should remain consistent with:

`04_MOTION_SYSTEM.md`

Use motion to communicate:

* navigation changes
* modal opening
* filter changes
* upload progress
* status changes
* success/failure
* content reordering

Avoid excessive animation.

Admin is a productivity environment; motion must never slow down repeated operations.

---

# 55. Dashboard Animation

Dashboard analytics may use subtle entrance motion.

Examples:

* metric values reveal
* charts draw in
* content cards fade upward
* recent transactions appear progressively

Avoid dramatic cinematic animation inside every KPI card.

The customer experience can be more cinematic than the Admin experience.

---

# 56. Admin Performance

Admin interfaces must remain responsive even with large mock datasets.

Requirements:

* avoid unnecessary re-renders
* paginate large collections
* lazy-load heavy areas
* avoid loading every image at once
* optimize poster thumbnails
* avoid unnecessary client-side state
* keep expensive calculations outside render paths where appropriate

---

# 57. Admin Data Architecture

The Admin UI must follow:

```text
Admin UI
   ↓
Admin Controller / Hook
   ↓
Admin Repository
   ↓
Typed Mock Data
```

Future:

```text
Admin UI
   ↓
Admin Controller / Hook
   ↓
Admin Repository
   ↓
Future API
```

The UI must not directly manipulate mock arrays throughout components.

---

# 58. Mock Admin Repository

During the frontend phase, repositories may simulate:

* list
* search
* filter
* sort
* create
* update
* archive
* status changes
* mock upload states
* mock payment states
* mock subscription states

These operations are for UI development only.

Do not build a fake database.

---

# 59. Domain Models vs View Models

Admin pages should use domain models from:

`08_DATA_MODELS.md`

When the UI requires a specialized representation, create a view model.

Example:

```text
Movie
   ↓
AdminMovieListItem
```

Do not distort the core Movie model simply to satisfy one table.

---

# 60. URL State

Admin search/filter state should use URL parameters when it improves:

* refresh persistence
* browser navigation
* shareability
* debugging
* reproducibility

Example:

```text
/admin/movies?status=draft
```

Do not put every temporary UI state into the URL.

---

# 61. System Settings

Route:

```text
/admin/settings
```

System Settings is an operational policy and platform baseline configuration workspace.

Settings are strictly focused on business rules, catalog defaults, device security policies, and service availability. Technical infrastructure parameters remain outside this surface.

### 61.1 Implemented Settings Modules

1. **General Information & Support Contact**
   * Platform Brand Name (`GIFTEDproMovies`)
   * Default Commercial Currency (`TZS - Tanzanian Shilling`, fixed baseline)
   * Support Contact Email (`support@giftedpromovies.com`)
   * Support Helpline Number (Tanzanian customer support contact)

2. **Content Baselines & Entitlements**
   * Default PPV Streaming Price (`TZS 1,500`)
   * Default PPV Download Price (`TZS 2,500`)
   * Default PPV Access Window (`48 Hours` duration)

3. **Operational & Security Policies**
   * Maximum Registered Devices Per Customer (e.g. 1, 2, 3 [Standard], 5 devices to prevent household account sharing)
   * Require Admin Approval for Catalog Releases (toggle: when enabled, content verified by Media Team stays in Pending Approval until Admin authorizes release)
   * Allow Protected Offline Downloads (toggle: authorizes mobile client DRM encryption for local playback)

4. **Scheduled Maintenance & Platform Controls**
   * Platform Maintenance Mode (toggle: temporarily locks public streaming and checkout flows while preserving full Admin workspace functionality)
   * Custom Maintenance Message (informative customer announcement shown on locked pages)

### 61.2 Explicit Infrastructure Exclusions
To maintain strict architectural boundaries, the Admin Settings page **explicitly forbids**:
* Database connection URLs, pool sizes, or migrations
* Redis cluster nodes, eviction policies, or cache purges
* Cloud server instance types, Kubernetes pods, or CPU/RAM alarms
* FFmpeg transcode flags, NVENC GPU encoder slots, or LUFS audio ducking parameters
* Telecom SMPP / USSD gateways or BOT settlement clearing rules

---

# 62. Audit & Operational History

An operational history/audit area may be useful for Admin actions such as:

* content updates
* publishing changes
* pricing changes
* Media Team actions
* account status changes

However, a full audit system is not a requirement of the current frontend phase.

If represented, it must be clearly treated as an operational feature rather than a replacement for backend audit logging.

The backend will eventually be authoritative for real audit records.

---

# 63. Customer Financial Privacy

The Admin UI may display financial information because Admin is authorized to see it.

The following must never appear in:

* Customer UI
* Media Team UI

unless explicitly required later:

* total platform revenue
* other customers' purchase values
* platform sales analytics
* payment reports
* financial dashboards

---

# 64. Content Publishing Flow

The frontend architecture should support the following conceptual flow:

```text
Create Content
      ↓
Draft
      ↓
Edit / Configure
      ↓
Ready for Publishing
      ↓
Published
      ↓
Archived
```

When Media Team approval is active (`publishingRequiresApproval === true` in `/admin/settings`):

```text
Media Team
    ↓
Draft (Catalog Intake Wizard)
    ↓
Submitted for Review ('pending_review' / 'READY_FOR_REVIEW')
    ↓
Admin Review Queue (/admin/movies or /admin/series)
    ↓
Approve & Publish ('published' / 'PUBLISHED')
```

This workflow is fully implemented and governed by `adminPlatformSettings.publishingRequiresApproval`. If disabled, the Media Team can publish directly to live status. Administrators retain override authority to publish, unpublish, or archive any title at any time.

---

# 65. Admin Navigation Persistence

The Admin navigation should maintain context where possible.

Example:

```text
Movies
  → Movie
  → Edit
  → Back
```

Returning to Movies should ideally preserve:

* search
* filters
* sort
* pagination

when technically appropriate.

---

# 66. Admin Search

Admin search should be contextual.

Examples:

```text
Search movies...
Search customers...
Search orders...
Search payments...
```

Avoid one giant universal Admin search unless a genuine cross-entity requirement exists.

---

# 67. Admin Notifications

The interface may provide contextual alerts for important operational events.

Examples:

```text
3 failed payments require attention.
2 content items are awaiting review.
5 subscriptions expire soon.
```

These should be based on available mock data.

Do not create a complicated notification center unless required.

---

# 68. Quick Operational Priorities

The dashboard should prioritize actions based on operational relevance.

Potential priority hierarchy:

```text
Critical
  Failed payments
  System/content errors

Attention
  Pending items
  Expiring subscriptions

Performance
  Sales
  Revenue
  Trending content

Management
  Content
  Users
  Media Team
```

This creates a more intelligent Admin experience than a static dashboard.

---

# 69. Visual Content in Admin

Posters and content imagery should be used strategically.

Good use:

* movie list thumbnails
* performance ranking
* featured content
* trending content
* content preview
* media upload preview

Avoid turning every table into a giant poster gallery.

---

# 70. Admin Design Language

The Admin interface should communicate:

> Control, clarity, confidence.

It should feel:

* premium
* focused
* fast
* professional
* content-aware
* business-ready

It should not feel:

* playful
* overly cinematic
* cluttered
* generic
* template-generated

---

# 71. Component Reuse

Admin should reuse shared components where appropriate:

```text
Button
Input
Select
Dialog
Sheet
Tabs
Badge
Dropdown
Search
Pagination
Skeleton
Toast
```

Product-specific components may include:

```text
AdminSidebar
AdminHeader
MetricCard
AdminDataTable
ContentStatusBadge
MovieAdminCard
MovieForm
SeriesForm
MediaUpload
PricingEditor
PaymentStatusBadge
RevenueChart
ContentPerformanceCard
```

Do not create duplicate versions of generic UI primitives.

---

# 72. Admin Component Ownership

A component belongs to the lowest level that can logically own it.

Examples:

```text
Button
→ shared UI

AdminDataTable
→ admin shared

MovieForm
→ movie/admin feature

PaymentStatusBadge
→ commerce feature

RevenueChart
→ admin/commerce feature
```

Avoid putting all Admin components inside one giant folder with no feature boundaries.

---

# 73. Admin State Ownership

State should live at the smallest appropriate level.

Examples:

```text
Search query
→ URL / page controller

Dialog open state
→ local component

Movie form
→ form controller

Selected filters
→ page/discovery controller

Dashboard data
→ repository/controller
```

Do not create global state simply because multiple Admin components exist.

---

# 74. Business Logic Boundary

The frontend may display business rules but must not become the authoritative source of them.

Examples:

```text
Price calculation
Access entitlement
Subscription validity
Payment confirmation
Revenue calculation
Trending ranking
Authorization
```

The frontend may simulate these behaviors using mock data.

Future backend logic will become authoritative.

---

# 75. Security Boundary

The frontend must never:

* expose secrets
* expose payment credentials
* expose private storage credentials
* trust client-side role checks as authorization
* treat hidden UI as security
* expose sensitive Admin data to Media Team mock sessions
* expose raw protected media URLs unnecessarily

---

# 76. No Backend During Frontend Phase

This document does not authorize implementation of:

* database
* MySQL
* Prisma
* backend API
* payment gateway
* real authentication server
* storage backend
* real media upload service
* real financial processing

Use typed repositories and mock data only.

---

# 77. No Fake Production Security

The frontend may simulate:

```text
Admin session
Media Team session
Customer session
```

but must never claim that these mocks provide real security.

Similarly:

```text
Mock payment success
```

must not be presented as a real completed transaction in production.

---

# 78. Responsive Admin Architecture

Responsive transformation should be intentional:

```text
Desktop (≥ 1024px)
Fixed vertical sidebar + dense multi-column data views

Tablet (768px - 1023px)
Collapsible navigation drawer + adaptive tables / horizontal scroll

Mobile (< 768px)
Header toggle drawer (NO bottom nav bar) + card-based data + stacked forms
```

Do not simply reduce font sizes and spacing.

---

# 79. Admin Loading / Error / Empty Matrix

Every major Admin feature should define:

| Feature       | Loading        | Empty            | Error       |
| ------------- | -------------- | ---------------- | ----------- |
| Movies        | Skeleton table | Add first movie  | Retry       |
| Series        | Skeleton       | Add first series | Retry       |
| Users         | Skeleton       | No customers     | Retry       |
| Orders        | Skeleton       | No orders        | Retry       |
| Payments      | Skeleton       | No payments      | Retry       |
| Sales         | Chart skeleton | No sales         | Retry       |
| Subscriptions | Skeleton       | No plans         | Create plan |
| Media Team    | Skeleton       | No members       | Add member  |

---

# 80. Resolved Operational & Governance Rules

The primary governance decisions have been finalized and implemented in the Admin control panel:

### 1. Media Team Approval (RESOLVED & IMPLEMENTED)

Governed dynamically via `adminPlatformSettings.publishingRequiresApproval` (toggleable in `/admin/settings`):
- When `true`, titles uploaded by Media Team enter `'pending_review'` (`READY_FOR_REVIEW`) and require Administrator sign-off via "Approve & Publish" in `/admin/movies` or `/admin/series`.
- When `false`, Media Team can publish directly to live status.

### 2. Series Pricing (RESOLVED & IMPLEMENTED)

Governed via `AdminSeries.pricingModel` (`'per_episode' | 'per_season' | 'full_series' | 'combination'`), supported by `AdminSeason.seasonPassPriceTsh` (default 3,500 TSh) and `AdminEpisode.streamPriceTsh` / `downloadPriceTsh`.

### 3. Payment Providers (RESOLVED & IMPLEMENTED)

Supported payment providers in `PaymentMethod`:
- M-Pesa (Vodacom)
- Tigo Pesa (Yas / Tigo)
- Airtel Money
- HaloPesa
- Credit / Debit Cards

### 4. Maximum Active Devices (RESOLVED & IMPLEMENTED)

Controlled centrally in `/admin/settings` via `adminPlatformSettings.maxActiveDevicesPerUser` (default: 3 devices) and tracked dynamically per customer in `CustomerDevice`.

---

# 81. Admin Customer Journey

Example:

```text
Admin Login
    ↓
Dashboard
    ↓
Sees recent performance
    ↓
Notices failed payments
    ↓
Opens Payments
    ↓
Filters Failed
    ↓
Inspects transaction
```

---

# 82. Admin Content Journey

```text
Dashboard
    ↓
Add Movie
    ↓
Basic Information
    ↓
Upload Poster / Backdrop
    ↓
Assign Category
    ↓
Assign Country
    ↓
Add DJ/Translator Version
    ↓
Configure Stream Price
    ↓
Configure Download Price
    ↓
Configure Access Duration
    ↓
Save Draft
    ↓
Publish when appropriate
```

---

# 83. Admin Performance Journey

```text
Dashboard
    ↓
Content Performance
    ↓
Identify high-performing movie
    ↓
Inspect views / purchases / downloads
    ↓
Promote as Featured or Trending
```

---

# 84. Admin Quality Bar

The finished Admin experience should feel like a product that could realistically operate a serious digital media business.

A developer should be able to answer:

* Where do I manage movies?
* Where do I manage versions?
* Where do I manage series?
* Where do I manage customers?
* Where do I manage Media Team?
* Where do I manage subscriptions?
* Where do I see payments?
* Where do I see revenue?
* Where do I control featured content?
* Where do I control trending?
* Which information is sensitive?
* Which rules are still pending?

without guessing.

---

# 85. Anti-Patterns

Do not implement:

* generic SaaS dashboard templates
* excessive KPI cards
* financial data visible to Media Team
* fake multi-admin systems
* giant CRUD pages
* giant modal forms
* unexplained charts
* hard-coded prices
* hard-coded access duration
* hard-coded payment providers
* fake payment integrations
* frontend-only authorization
* unnecessary global state
* duplicate components
* desktop-only Admin
* unreadable mobile tables
* bottom navigation bar in the Admin workspace (forbidden: use header hamburger toggle + full drawer)
* Swahili or mixed-language interface in Admin (forbidden: Admin is 100% English)
* exposing telecom, banking, tax, or encoding telemetry in Admin (BOT clearing, TRA EFD codes, telco latency, FFmpeg commands, LUFS ducking, customer IP addresses)
* excessive animation
* red everywhere
* generic white dashboard styling
* invented business rules

---

# 86. AI Coding Agent Directive

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
11. Read `10_PUBLIC_EXPERIENCE.md` through `19_SUBSCRIPTION_UI.md` where relevant.
12. Then implement this Admin specification.

Do not reinterpret requirements.

Do not invent unresolved business rules.

Do not implement backend functionality.

Do not create fake API endpoints.

Do not expose sensitive financial mock data to Media Team or Customer interfaces.

Do not introduce a second Admin concept.

If an implementation decision is genuinely unspecified and materially affects architecture, stop and request clarification rather than silently choosing a business rule.

---

# 87. Definition of Done

MD-20 is complete when:

* `/admin` exists
* Admin navigation is structured
* Dashboard is operational and responsive
* KPI system exists
* Financial visibility is Admin-only
* Movies management is defined
* Movie versions are supported
* Series management is defined
* Seasons and episodes are supported
* Categories are supported
* Countries are supported
* DJs/Translators are supported
* Customers are supported
* Media Team management is supported
* Subscription management is supported
* Pricing management is supported
* Orders are supported
* Payments are supported
* Sales/revenue are supported
* Featured management is supported
* Trending management is supported
* Automatic vs manual trending is represented
* Media assets are supported conceptually
* Forms are validated
* Destructive actions are protected
* Loading/empty/error states exist
* Responsive behavior is intentionally designed
* Accessibility is addressed
* Motion follows the global motion system
* Mock repositories are used
* Domain models remain typed
* No backend is implemented
* No financial data leaks to unauthorized roles
* No unresolved business decision has been silently invented

---

# 88. Final Product Principle

The Admin experience should make the operator feel:

> **“I understand what is happening on GIFTEDproMovies, and I can control it without fighting the interface.”**

The platform is a **media business**, not a generic CRUD application.

Therefore the Admin UI must combine:

**Operational clarity + Content management + Commerce visibility + Media intelligence + Premium brand identity.**

---

## Next Document

```text
MD-21
21_MEDIA_TEAM_UI.md
```

This document will define the dedicated **Media Team experience**, including:

* Media Team dashboard
* content management
* movie uploads
* series uploads
* episode management
* media asset workflow
* permissions
* publishing state
* Admin relationship
* approval workflow handling
* restricted financial visibility
* responsive Media Team UX
* mock data/repository boundaries
* Media Team-specific acceptance criteria
