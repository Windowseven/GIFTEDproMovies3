# GIFTEDproMovies — Search & Discovery Architecture

**Document ID:** MD-11
**Filename:** `11_SEARCH_DISCOVERY.md`
**Version:** 1.0
**Status:** Frontend Implementation Contract
**Product:** GIFTEDproMovies
**Scope:** Search, Suggestions, Filtering & Discovery UX
**Backend:** Not implemented
**Database:** Not implemented

---

# 1. Purpose

This document defines how customers discover movies and series through search and filtering.

Search is a core product capability.

GIFTEDproMovies must not behave like a basic website where a customer types a title and receives a static list.

The discovery experience must support:

* Movies
* Series
* DJs/Translators
* Categories
* Countries
* Combined filters
* Search suggestions
* Recent searches
* Empty states
* Clear filters
* URL-persistent discovery state
* Mobile-friendly filtering
* Fast and intuitive interaction

The frontend must provide a realistic discovery experience using typed mock data.

---

# 2. Core Discovery Principle

The goal is:

```text
SEARCH
   ↓
UNDERSTAND
   ↓
REFINE
   ↓
DISCOVER
   ↓
OPEN CONTENT
```

Search should reduce the amount of work required from the customer.

The customer should not need to know the exact title of a movie to discover relevant content.

---

# 3. Discovery Sources

Customers can discover content through:

```text
Homepage
Search
Categories
Countries
DJs / Translators
Trending
Featured
New Releases
Popular
Related Content
Direct Links
```

Search and filtering must connect naturally with these discovery surfaces.

---

# 4. Search Entry Points

Search must be accessible from:

### Desktop

Global header.

### Mobile

Dedicated search action in the mobile header/navigation.

### Search Page

Dedicated route:

```text
/search
```

### Optional contextual search

Search may also be initiated from:

* Category pages
* Country pages
* DJ/Translator pages
* Movies page
* Series page

The same search architecture should be reused.

---

# 5. Search Input

The primary search input should communicate what the customer can search.

Example placeholder:

```text
Search movies, series, DJs, categories...
```

The search input should support:

* Text entry
* Clear action
* Keyboard submission
* Search icon
* Focus state
* Loading state
* Mobile keyboard-friendly interaction

Do not make the input visually oversized without purpose.

---

# 6. Search Behavior

Search should be tolerant of normal user behavior.

The frontend search experience should support:

* Partial words
* Partial titles
* DJ names
* Category names
* Country names
* Case-insensitive matching
* Basic whitespace normalization

Example:

```text
"mack"
```

may match:

```text
DJ Mack
Movie translated by DJ Mack
```

---

# 7. Searchable Entities

The discovery system should search across:

```text
Movies
Series
DJs / Translators
Categories
Countries
```

The customer should be able to understand what type of result they are seeing.

---

# 8. Search Suggestions

Search suggestions appear while the customer types.

Example:

```text
┌─────────────────────────────────────────────┐
│ 🔍 mack                                      │
├─────────────────────────────────────────────┤
│                                             │
│ MOVIES                                      │
│  Movie A                                    │
│  Movie B                                    │
│                                             │
│ DJs / TRANSLATORS                           │
│  DJ Mack                                    │
│                                             │
│ CATEGORIES                                  │
│  Action                                     │
│                                             │
│ View all results →                          │
└─────────────────────────────────────────────┘
```

Suggestions must remain concise.

The dropdown should not become a second search-results page.

---

# 9. Suggestion Priority

Suggested results should prioritize likely intent.

Conceptually:

```text
Exact title match
        ↓
Strong partial title match
        ↓
DJ/Translator match
        ↓
Category match
        ↓
Country match
        ↓
Other relevant match
```

The final ranking algorithm belongs to the backend/data layer.

The frontend must simply present the ranking it receives from the repository/data source.

---

# 10. Minimum Query Length

The frontend may avoid searching immediately for extremely short queries.

Recommended behavior:

```text
0 characters
→ no search suggestions

1 character
→ minimal/no suggestions

2+ characters
→ suggestions
```

This is an implementation default, not a business rule.

It may be adjusted if usability testing shows otherwise.

---

# 11. Search Submission

Pressing Enter or selecting:

```text
View all results
```

should navigate to:

```text
/search?q=<query>
```

The search query must be represented in the URL.

Example:

```text
/search?q=spiderman
```

---

# 12. URL as Discovery State

Search state should be URL-addressable.

Example:

```text
/search?q=spiderman
```

With filters:

```text
/search?q=spiderman&type=movie&country=india&dj=dj-mack
```

The exact query parameter naming may be implemented consistently with the project's routing conventions.

The principle is mandatory:

> Important discovery state must be recoverable from the URL.

---

# 13. Why URL State Matters

URL state enables:

* Browser Back
* Browser Forward
* Refresh
* Shareable searches
* Deep linking
* Bookmarking
* Preserving discovery state

Example:

```text
Search
   ↓
Apply filters
   ↓
Open Movie
   ↓
Back
   ↓
Same search + filters
```

---

# 14. Search Results Page

Route:

```text
/search
```

Example:

```text
SEARCH RESULTS

Search:
[ spiderman                         🔍 ]

Filters:
[ Movie ] [ India ] [ DJ Mack ]

24 results

[Card] [Card] [Card] [Card]
[Card] [Card] [Card] [Card]
```

The page should clearly communicate:

* Current query
* Active filters
* Number of results
* Content type
* Results grid

---

# 15. Search Result Types

Results may contain:

### Movies

Displayed using MovieCard.

### Series

Displayed using SeriesCard.

### DJs / Translators

Displayed using appropriate profile/collection component.

### Categories

Displayed using category navigation cards.

### Countries

Displayed using country navigation cards.

The interface must visually distinguish these types.

---

# 16. Content Type Filter

Required filter:

```text
Content Type
```

Options:

```text
All
Movies
Series
```

Default:

```text
All
```

Selecting Movie:

```text
/search?q=...&type=movie
```

Selecting Series:

```text
/search?q=...&type=series
```

---

# 17. Category Filter

Customers should be able to filter results by category.

Example:

```text
Category

Action
Christian
Cartoon
Horror
Superhero
Drama
Comedy
Romance
```

Categories come from typed data.

Do not hard-code category names inside filtering components.

---

# 18. Country Filter

Customers can filter by country.

Example:

```text
Country

Nigeria
India
Tanzania
USA
UK
South Africa
...
```

A movie associated with multiple countries may match multiple country filters according to the future data contract.

---

# 19. DJ / Translator Filter

Customers can filter by DJ/Translator.

Example:

```text
DJ / Translator

DJ Mack
DJ X
DJ Y
...
```

This is particularly important because multiple versions of the same movie may exist.

---

# 20. Combined Filtering

Filters must work together.

Example:

```text
Movie
+
India
+
DJ Mack
```

means:

> Show movie content associated with India and DJ Mack.

Another example:

```text
Series
+
Christian
```

means:

> Show series matching the Christian category.

The frontend must apply filters consistently against the typed mock repository.

---

# 21. Filter Logic

Conceptually:

```text
Query
   ↓
Content Type
   ↓
Category
   ↓
Country
   ↓
DJ / Translator
   ↓
Filtered Results
```

Within a filter category, values generally behave as **OR**.

Across different filter categories, values behave as **AND**.

Example:

```text
Country = India
Category = Action
DJ = DJ Mack
```

means:

```text
India
AND
Action
AND
DJ Mack
```

This rule must be consistent throughout the public discovery experience.

---

# 22. Active Filters

Active filters must always be visible.

Example:

```text
ACTIVE FILTERS

[ Movie × ]
[ India × ]
[ DJ Mack × ]
```

The customer should be able to remove each filter independently.

---

# 23. Clear All

When filters exist:

```text
[ Clear all ]
```

should be available.

Selecting Clear All should:

* Remove all filters
* Preserve the search query where appropriate
* Update URL state
* Refresh displayed results

Example:

```text
/search?q=spiderman
```

instead of:

```text
/search?q=spiderman&type=movie&country=india&dj=dj-mack
```

---

# 24. Mobile Filter Experience

Filters should not occupy half the mobile screen permanently.

Recommended:

```text
[ FILTERS ]
```

opens a bottom sheet or dedicated filter surface.

Example:

```text
┌───────────────────────────────┐
│ Filters                  Done │
├───────────────────────────────┤
│                               │
│ Content Type                  │
│ ○ All                         │
│ ○ Movies                      │
│ ○ Series                      │
│                               │
│ Category                      │
│ ○ Action                      │
│ ○ Christian                   │
│ ○ Horror                      │
│                               │
│ Country                       │
│ ○ India                       │
│ ○ Nigeria                     │
│                               │
│ DJ / Translator               │
│ ○ DJ Mack                     │
│                               │
│ [ CLEAR ALL ] [ APPLY ]       │
└───────────────────────────────┘
```

The final visual style follows the Design System and Motion System.

---

# 25. Desktop Filter Experience

Desktop may display filters:

### Option A

Horizontal filter controls:

```text
[ Content Type ▾ ]
[ Category ▾ ]
[ Country ▾ ]
[ DJ / Translator ▾ ]
```

### Option B

Sidebar filtering:

```text
┌──────────────┬────────────────────────────┐
│ FILTERS       │ RESULTS                    │
│               │                            │
│ Type          │ [Card] [Card] [Card]       │
│ Category      │ [Card] [Card] [Card]       │
│ Country       │ [Card] [Card] [Card]       │
│ DJ            │                            │
└──────────────┴────────────────────────────┘
```

The final implementation should select the approach that produces the cleanest responsive experience.

Do not implement both unnecessarily.

---

# 26. Search + Filter Interaction

Changing a filter must not unexpectedly erase the search query.

Example:

```text
Query:
spiderman

Filter:
Country → India

Result:
spiderman + India
```

The customer should always understand why the result set changed.

---

# 27. Result Count

Display result count when useful.

Example:

```text
24 movies found
```

or:

```text
8 results
```

Do not show fake counts that are unrelated to the actual mock dataset.

---

# 28. No Results

If no content matches:

```text
No results found

Try a different title, DJ, country, or category.

[ CLEAR FILTERS ]
```

If a query caused the empty state:

```text
No results for "xyz"

Try:
• Checking the spelling
• Searching by category
• Searching by DJ / Translator
• Removing filters
```

The empty state should help the customer continue discovering content.

---

# 29. Recent Searches

Recent searches may be stored locally for guests.

Example:

```text
RECENT SEARCHES

spiderman
christian movies
DJ Mack
```

Each item can be selected to repeat the search.

A clear action may be provided:

```text
Clear recent searches
```

Recent searches are not account purchase history.

---

# 30. Search Persistence

The frontend may persist recent searches using browser-local storage.

It must not store:

* Passwords
* Payment information
* Authentication tokens
* Sensitive financial information

---

# 31. Search Suggestions on Mobile

Mobile suggestion results should prioritize:

1. Exact content
2. Relevant title
3. DJ/Translator
4. Category
5. Country

The suggestion surface should not prevent the customer from accessing the keyboard.

---

# 32. Search Keyboard Behavior

Desktop:

```text
Typing
→ suggestions

Enter
→ results page

Escape
→ close suggestions

Arrow keys
→ optionally navigate suggestions
```

Mobile:

```text
Typing
→ suggestions

Search/Enter
→ results
```

Keyboard support must not compromise accessibility.

---

# 33. Search Loading State

When searching:

```text
Searching...
```

or skeleton result placeholders may be displayed.

Avoid aggressive loading indicators for extremely fast local/mock filtering.

The UI should feel responsive.

---

# 34. Filter Loading State

When filter options themselves are unavailable:

```text
Loading filters...
```

The interface should not appear broken.

For the current frontend mock implementation, filter datasets should normally load deterministically.

---

# 35. Search Error State

If the repository/data source fails:

```text
Couldn't load search results.

Please try again.

[ TRY AGAIN ]
```

The UI must not expose raw technical errors.

---

# 36. Search Result Card Behavior

Search results should use the existing product components.

Do not create a completely separate movie-card design for search.

Use:

```text
MovieCard
SeriesCard
DJTranslatorCard
CategoryCard
CountryCard
```

where appropriate.

This maintains visual consistency.

---

# 37. Discovery by DJ

Selecting a DJ/Translator from search should navigate to:

```text
/djs/[slug]
```

The page should display relevant content.

The customer can then continue into movie details.

---

# 38. Discovery by Category

Selecting a category result should navigate to:

```text
/categories/[slug]
```

The page becomes a focused discovery collection.

---

# 39. Discovery by Country

Selecting a country result should navigate to:

```text
/countries/[slug]
```

The customer can browse relevant content.

---

# 40. Discovery by Movie

Selecting a movie result navigates to:

```text
/movies/[slug]
```

The customer enters the full movie detail experience defined in `10_PUBLIC_EXPERIENCE.md`.

---

# 41. Discovery by Series

Selecting a series result navigates to:

```text
/series/[slug]
```

The customer enters the series experience.

---

# 42. Related Discovery

Movie detail pages should allow customers to continue discovering content.

Possible collections:

```text
More from this DJ
Similar Movies
More from this Country
More in this Category
```

These are discovery surfaces.

They must not be implemented as unrelated random cards.

---

# 43. Discovery Loop

A strong discovery loop is:

```text
Search
   ↓
Movie
   ↓
Movie Details
   ↓
Related Content
   ↓
Another Movie
   ↓
Related Content
   ↓
Continue Browsing
```

The customer should rarely reach a dead end.

---

# 44. Search Result Ranking Presentation

The frontend may visually emphasize stronger matches.

Example:

```text
EXACT MATCH

Spider-Man

OTHER RESULTS

Spider-Man: Homecoming
Spider-Man: Far From Home
```

However, the frontend must not invent a sophisticated ranking algorithm.

Ranking is a future data/service concern.

---

# 45. Trending vs Search

Trending and search have different purposes.

### Trending

Answers:

> What is popular right now?

### Search

Answers:

> What am I looking for?

The UI should not confuse these concepts.

---

# 46. Popular vs Search

Popular content may appear within search discovery, but it should not override the customer's intent.

If the customer searches:

```text
"Christian"
```

the interface should prioritize relevant Christian content rather than unrelated globally popular movies.

---

# 47. Search Query Normalization

The frontend may normalize:

```text
"  Spider Man  "
```

into:

```text
"Spider Man"
```

for consistent presentation.

Normalization should not unexpectedly alter what the customer sees.

---

# 48. Search Case Handling

These should be treated equivalently:

```text
spiderman
SpiderMan
SPIDERMAN
SpiderMan
```

The search experience should be case-insensitive.

---

# 49. Search Data Boundary

Search should consume data through the repository/data boundary.

Architecture:

```text
Search UI
    ↓
Search Controller / Hook
    ↓
Discovery Repository
    ↓
Typed Mock Data
```

Future:

```text
Search UI
    ↓
Search Controller / Hook
    ↓
Discovery Repository
    ↓
API
    ↓
Backend Search
```

The UI should not directly manipulate raw mock arrays throughout multiple components.

---

# 50. Mock Search Behavior

The mock implementation should provide deterministic behavior.

It should support:

* Text search
* Entity type filtering
* Category filtering
* Country filtering
* DJ filtering
* Combined filters
* Empty results
* Result counts

Mock search should behave like a simplified version of the future real system.

---

# 51. No Fake Backend Search

Do not create:

```text
/api/search
```

during the frontend-only phase.

Do not simulate a server.

Do not introduce:

* Database
* Prisma
* SQL
* Elasticsearch
* Algolia
* Meilisearch
* External search service

unless separately approved in a future technical document.

---

# 52. Search State Ownership

Search state should have clear ownership.

### URL owns:

* Query
* Filters
* Search mode/state that must survive navigation

### UI state owns:

* Suggestion visibility
* Focus
* Temporary filter-sheet state
* Loading presentation

### Repository owns:

* Data retrieval
* Filtering/search implementation against mock data

Do not duplicate the same state across multiple layers unnecessarily.

---

# 53. Search Page Responsiveness

### Desktop

Prioritize:

* Search visibility
* Efficient filter access
* Multi-column results
* Keyboard navigation

### Tablet

Prioritize:

* Flexible result grid
* Compact filters
* Touch interaction

### Mobile

Prioritize:

* Search first
* Filter button
* Swipe-friendly content
* Large touch targets
* Minimal chrome

---

# 54. Accessibility

Search must support:

* Proper `<label>` association
* Keyboard navigation
* Focus management
* Screen-reader announcements where appropriate
* Accessible filter controls
* Visible focus state
* Escape behavior
* Clear button labels
* Accessible result links

Do not rely solely on icons.

For example:

```text
❌ icon only

✅ Search
```

where necessary.

---

# 55. Motion

Search motion must follow:

`04_MOTION_SYSTEM.md`

Appropriate motion includes:

* Suggestion dropdown entrance
* Filter sheet entrance
* Active filter transition
* Result-state transition
* Loading transition
* Clear-filter transition

Motion must not slow down search.

---

# 56. Performance

Search is an interaction that should feel immediate.

Frontend implementation should:

* Avoid unnecessary rerenders
* Avoid expensive calculations on every keystroke
* Use memoization only where justified
* Keep search components lightweight
* Avoid loading unnecessary media
* Lazy-load result imagery where appropriate

Do not optimize prematurely with complicated architecture.

---

# 57. Discovery Analytics Boundary

The future system may track:

* Search queries
* Result clicks
* Filter usage
* Content selection
* Search-to-purchase conversion
* Popular search terms

This document does not require analytics implementation.

The frontend should simply avoid architecture that prevents future tracking.

---

# 58. Security Boundary

Search results must never expose private information.

Never include in public search:

* Customer email addresses
* Customer purchases
* Payment records
* Internal admin data
* Private media URLs
* Private download URLs
* Internal financial metrics

---

# 59. Search and Entitlements

Search may show content the customer does not currently own.

Example:

```text
Movie A
Streaming: TZS 2,000
Download: TZS 4,000
```

The search experience does not need to hide purchasable content because the customer has not purchased it.

For authenticated customers, ownership/access state may be reflected where useful:

```text
Available
Purchased
Active
Expired
```

Actual entitlement status remains backend-authoritative.

---

# 60. Search and Subscription

Subscription-accessible content may still appear in normal search.

The UI may communicate:

```text
Included with subscription
```

when this information is available from the data layer.

Do not assume every subscription includes every movie.

Subscription scope is configurable.

---

# 61. Search and Version Selection

Search may identify that multiple DJ/Translator versions exist.

Example:

```text
Spider-Man

Available versions:
DJ Mack
DJ X
Original
```

The customer still enters the movie detail page to select the actual version.

Search should not become a replacement for the version-selection experience.

---

# 62. Complete Discovery Example

Example customer intent:

```text
Customer searches:

"DJ Mack"
        ↓
Suggestion:
DJ Mack
        ↓
Open DJ page
        ↓
Filter:
India
        ↓
Movie results
        ↓
Select Spider-Man
        ↓
Movie Details
        ↓
Select DJ Mack version
        ↓
Choose Watch
        ↓
LIPA
```

The system should support this journey naturally.

---

# 63. Another Discovery Example

```text
Customer searches:

"Christian"
        ↓
Results:
Christian Movies
Christian Series
Christian Category
        ↓
Select Category
        ↓
Browse Content
        ↓
Open Movie
        ↓
Choose Version
        ↓
Watch / Download
```

---

# 64. Another Discovery Example

```text
Customer wants Indian movies translated by DJ Mack.

Search:
"Indian"

        ↓

Filter:
Content Type = Movie
Country = India
DJ = DJ Mack

        ↓

Results
        ↓

Movie Details
```

This combined discovery use case is a required quality scenario.

---

# 65. Search Quality Checklist

The implementation should answer:

* Can I search from the homepage?
* Can I search movies?
* Can I search series?
* Can I search DJs/Translators?
* Can I search categories?
* Can I search countries?
* Do suggestions appear?
* Can I open a suggestion?
* Can I view all results?
* Can I filter by content type?
* Can I filter by category?
* Can I filter by country?
* Can I filter by DJ/Translator?
* Can I combine filters?
* Can I remove individual filters?
* Can I clear all filters?
* Does search state survive browser navigation?
* Can I share a search URL?
* Does mobile filtering work?
* Is empty search handled?
* Is no-results handled?
* Is error handling intentional?
* Is the experience accessible?
* Does it reuse existing product components?

---

# 66. AI Coding Agent Directive

The coding agent MUST treat search as a **product discovery system**, not merely an input field.

The agent MUST:

1. Read all previous project documents.
2. Reuse the existing data models.
3. Reuse the existing mock data contract.
4. Reuse MovieCard/SeriesCard and shared components.
5. Keep discovery state predictable.
6. Keep important state URL-addressable.
7. Preserve search state through navigation.
8. Support combined filtering.
9. Keep mobile filtering touch-friendly.
10. Maintain accessibility.
11. Follow the Motion System.
12. Keep search architecture ready for future API replacement.

The agent MUST NOT:

* Invent a backend search engine.
* Create `/api/search`.
* Introduce a database.
* Introduce Elasticsearch/Algolia/Meilisearch without approval.
* Hard-code categories/countries/DJs into UI logic.
* Duplicate search logic across pages.
* Create unrelated card designs.
* Hide purchasable content from guests.
* Invent entitlement rules.
* Invent subscription scope.
* Invent pricing.
* Invent ranking algorithms and present them as final business logic.

---

# 67. Definition of Done

MD-11 is complete when the frontend supports:

```text
SEARCH
  ↓
SUGGESTIONS
  ↓
RESULTS
  ↓
FILTER
  ↓
REFINE
  ↓
OPEN CONTENT
  ↓
CONTINUE DISCOVERY
```

with:

* Typed data
* Deterministic mock behavior
* URL state
* Responsive UI
* Accessible controls
* Intentional loading/empty/error states
* Reusable components
* Clean repository boundary
* No backend implementation

---

# 68. Final Product Principle

The search experience should make GIFTEDproMovies feel intelligent.

The customer should be able to discover content using different mental models:

```text
"I know the movie"
        ↓
Search title


"I know the DJ"
        ↓
Search DJ


"I know the country"
        ↓
Country discovery


"I know the genre"
        ↓
Category discovery


"I know multiple things"
        ↓
Combined filters


"I don't know what I want"
        ↓
Trending / Featured / Popular
```

This is the difference between a **movie listing website** and a **content discovery platform**.

The frontend must make all of these journeys feel like one coherent product.

---

## Next Document

Proceed to:

**MD-12 — `12_MOVIE_DETAILS.md`**

This document will define the movie detail experience in much greater depth, including the cinematic detail layout, metadata hierarchy, trailer behavior, DJ/Translator version selection, Watch/Download decisions, pricing presentation, access duration, related content, and conversion flow.
