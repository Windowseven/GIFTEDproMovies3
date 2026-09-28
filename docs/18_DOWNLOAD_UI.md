# GIFTEDproMovies — Download Experience & Protected Download UI Specification

**Document ID:** MD-18
**Version:** 1.0
**Status:** Frontend Specification
**Scope:** Frontend only
**Next Document:** `19_SUBSCRIPTION_UI.md`

---

# 1. Purpose

This document defines the complete download experience for GIFTEDproMovies.

It covers:

* Download entry points
* Download eligibility UI
* Download preparation
* Download progress
* Download states
* Download management
* Completed downloads
* Failed and interrupted downloads
* Expired downloads
* Protected download concepts
* Library integration
* Mobile and desktop behavior
* Download-related accessibility
* Motion
* Performance
* Security boundaries
* Mock download architecture

This document does **not** implement backend download authorization, DRM, storage infrastructure, signed URLs, encryption, or payment verification.

---

# 2. Core Product Principle

GIFTEDproMovies must never present downloading as:

```text
Click Download
↓
Get raw MP4 URL
```

The product experience should instead communicate:

```text
User
 ↓
Select content/version
 ↓
Choose DOWNLOAD
 ↓
Confirm entitlement
 ↓
Prepare download
 ↓
Download begins
 ↓
Track progress
 ↓
Download completed
 ↓
Access through Downloads
```

The customer should feel that the download is an **owned/authorized content action**, not a publicly exposed media file.

---

# 3. Download vs Streaming

Streaming and downloading are separate product actions.

| Action   | Purpose                                |
| -------- | -------------------------------------- |
| WATCH    | Watch content online                   |
| DOWNLOAD | Obtain authorized downloadable content |

They may have different prices.

Example:

```text
WATCH
TZS 2,000
30 days access

DOWNLOAD
TZS 4,000
30 days access
```

The exact price and access duration must come from configurable product data.

The frontend must never hard-code business pricing.

---

# 4. Download Entry Points

Customers may initiate downloads from:

### Movie Details

```text
┌───────────────────────────────────┐
│ Movie Poster                      │
│                                   │
│ Movie Title                       │
│ Description                       │
│                                   │
│ [ ▶ WATCH ]  [ ↓ DOWNLOAD ]      │
└───────────────────────────────────┘
```

### Movie Version Selector

If multiple DJ/Translator versions exist:

```text
Choose Version

● DJ Mack
  Download — TZS 4,000

○ DJ John
  Download — TZS 3,500

○ Original
  Download — TZS 5,000
```

The selected version must remain attached to the download transaction.

Buying one version must not unlock another version.

---

# 5. Download Eligibility

Before the actual download starts, the UI should conceptually verify:

```text
Is user authenticated?
        ↓
Does user have download entitlement?
        ↓
Is entitlement still active?
        ↓
Is selected version authorized?
        ↓
Is content available?
        ↓
Can download begin?
```

Possible results:

```text
ELIGIBLE
NOT_AUTHENTICATED
NOT_PURCHASED
ACCESS_EXPIRED
VERSION_NOT_ENTITLED
CONTENT_UNAVAILABLE
DOWNLOAD_UNAVAILABLE
```

The frontend may simulate these states during development.

The backend will become the final authority.

---

# 6. Authentication Flow

A guest may browse freely.

When a guest selects:

```text
DOWNLOAD
```

the system should trigger authentication.

Recommended flow:

```text
Movie Details
     ↓
Download
     ↓
Login / Register
     ↓
Return to Movie
     ↓
Restore selected version
     ↓
Restore download intent
     ↓
Continue purchase/download flow
```

The selected movie, version and intended action must not be silently lost.

---

# 7. Purchased Download

If the customer already owns an active download entitlement:

```text
[ ↓ DOWNLOAD ]
```

should start the download flow directly.

The UI may show:

```text
Download access
Expires in 12 days
```

or:

```text
Download access
Expires: 24 Sep 2026
```

The exact date should be derived from entitlement data.

---

# 8. Download Access Duration

Download access duration is configurable by Admin.

Examples:

```text
3 Days
7 Days
14 Days
30 Days
90 Days
```

The frontend must never assume one fixed duration.

The UI should receive:

```text
accessDuration
expiresAt
status
```

from the data layer.

---

# 9. Protected Download Concept

The platform should not expose a permanent public media URL as the primary customer-facing download mechanism.

Conceptually:

```text
Customer
   ↓
Authenticated session
   ↓
Authorized download request
   ↓
Backend validation
   ↓
Temporary/protected media access
   ↓
Download
```

The exact implementation belongs to the backend architecture.

Possible future mechanisms may include:

* short-lived authorized URLs
* authenticated media requests
* entitlement-aware download endpoints
* protected media storage
* encrypted/offline content
* controlled device access

The frontend must not pretend to provide security that only the backend can enforce.

---

# 10. Important Security Boundary

The following must **NOT** be treated as security:

```text
Hidden download URL
```

```text
Obfuscated JavaScript
```

```text
Disabled right-click
```

```text
Frontend-only entitlement checks
```

```text
Hidden buttons
```

```text
Renamed MP4 files
```

These may affect UX but do not establish authorization.

The frontend is responsible for:

* presenting access state
* preventing obviously invalid UI actions
* handling download state
* showing entitlement information
* handling errors
* maintaining user experience

The backend will ultimately enforce:

* authorization
* entitlement
* access duration
* download permissions
* device rules
* protected media access
* signed access
* rate limits
* abuse prevention

---

# 11. No Raw Media URLs

The frontend architecture must not depend on hard-coded permanent URLs such as:

```text
https://server.com/movies/movie.mp4
```

inside components.

Instead use an abstraction:

```text
Download UI
    ↓
Download Controller
    ↓
Download Repository
    ↓
Future Protected Download API
```

Mock implementation:

```text
Download Repository
        ↓
Typed Mock Download Data
```

Future implementation:

```text
Download Repository
        ↓
Backend API
        ↓
Protected Media Infrastructure
```

---

# 12. Download States

Every download must support a clear state machine.

Recommended states:

```text
IDLE
  ↓
PREPARING
  ↓
STARTING
  ↓
DOWNLOADING
  ↓
COMPLETED
```

Alternative states:

```text
PAUSED
FAILED
CANCELLED
EXPIRED
UNAVAILABLE
```

---

# 13. Download State Machine

```text
                 ┌──────────────┐
                 │     IDLE     │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │  PREPARING   │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │   STARTING   │
                 └──────┬───────┘
                        ↓
               ┌─────────────────┐
               │   DOWNLOADING   │
               └────┬──────┬─────┘
                    ↓       ↓
               COMPLETED   FAILED
                    │         │
                    │         ↓
                    │       RETRY
                    │
                    ↓
                AVAILABLE

DOWNLOADING
     │
     ├── PAUSED
     │
     └── CANCELLED

ENTITLEMENT EXPIRES
     ↓
   EXPIRED
```

---

# 14. Preparing State

When the user starts a download:

```text
Preparing your download...

Movie Title
DJ Mack Version

Checking access...
Preparing secure download...
```

Do not immediately show `0%`.

The system may need a preparation phase before bytes begin transferring.

---

# 15. Starting State

Example:

```text
Starting download...

The Dark Journey
DJ Mack

Preparing file...
```

The transition should be short and subtle.

---

# 16. Downloading State

The active download should communicate:

* movie title
* poster
* selected version
* progress
* downloaded size
* total size when available
* current state
* estimated remaining time when reliable
* pause/cancel actions where supported

Example:

```text
┌────────────────────────────────────────────┐
│  [Poster]  The Dark Journey                │
│            DJ Mack                         │
│                                            │
│            67%                             │
│            █████████████░░░░░              │
│                                            │
│            1.8 GB / 2.7 GB                 │
│            About 4 min remaining           │
│                                            │
│            [ Pause ]       [ Cancel ]      │
└────────────────────────────────────────────┘
```

Do not display fake speed or remaining time when reliable information is unavailable.

---

# 17. Progress Representation

Use:

* progress bar
* percentage
* downloaded bytes
* total bytes where available

Example:

```text
67%
1.8 GB / 2.7 GB
```

If total size is unknown:

```text
Downloading...
1.8 GB received
```

Do not invent total file size.

Modern browser streaming APIs can expose response data incrementally, which can support progress-oriented interfaces when the underlying response provides enough information.

---

# 18. Completed State

After successful completion:

```text
✓ Download complete

The Dark Journey
DJ Mack

2.7 GB

[ Open Downloads ]
[ Watch Now ]
```

The exact available action depends on the implementation.

The interface should make completion visually obvious but not excessively animated.

---

# 19. Download Completion Feedback

Recommended:

```text
✓ Download complete
```

with:

* subtle check animation
* progress bar completion
* small success transition

Avoid:

* confetti
* full-screen celebration
* loud animation
* unnecessary sound

The download is a normal product action, not a gamified event.

---

# 20. Failed Download

Example:

```text
Download failed

The Dark Journey

Your download could not be completed.

[ Retry ]
[ Cancel ]
```

Possible reasons:

* network interruption
* server unavailable
* content unavailable
* authorization failure
* expired access
* browser limitation
* interrupted transfer

Do not expose internal server errors to customers.

---

# 21. Network Failure

If connection is lost:

```text
Connection interrupted

Your download has been interrupted.

[ Retry ]
```

If resumable downloads are supported later:

```text
Connection interrupted

72% downloaded

[ Resume ]
[ Restart ]
```

The UI should not claim resumability unless the underlying implementation actually supports it.

---

# 22. Pause and Resume

Pause/resume should only appear when supported.

Possible UI:

```text
Downloading
██████████████░░░░ 72%

[ Pause ]
```

After pause:

```text
Paused
██████████████░░░░ 72%

[ Resume ]
```

Do not build fake pause behavior that merely stops the progress animation while the network transfer continues.

---

# 23. Cancel Download

Cancel action should require lightweight confirmation for large/long downloads.

Example:

```text
Cancel download?

72% of this movie has been downloaded.

[ Keep Downloading ]
[ Cancel ]
```

For very quick downloads, confirmation may be unnecessary.

---

# 24. Downloads Page

Primary route:

```text
/downloads
```

This page is the customer's download management space.

Recommended structure:

```text
Downloads

┌──────────────────────────────┐
│ Active Downloads             │
└──────────────────────────────┘

[ Download Card ]
[ Download Card ]


┌──────────────────────────────┐
│ Completed                    │
└──────────────────────────────┘

[ Download Card ]
[ Download Card ]


┌──────────────────────────────┐
│ Expired / Unavailable        │
└──────────────────────────────┘
```

Sections should only appear when they contain relevant content.

---

# 25. Active Downloads Section

Shows:

* currently downloading
* preparing
* paused
* retryable failed downloads

Example:

```text
ACTIVE DOWNLOADS

The Dark Journey
DJ Mack
72%
1.8 GB / 2.7 GB

[ Pause ] [ Cancel ]
```

Multiple downloads may be shown when supported.

---

# 26. Completed Downloads

Completed cards should show:

* poster
* title
* DJ/version
* file size if known
* completion state
* access status
* available action

Example:

```text
The Dark Journey
DJ Mack

Downloaded
2.7 GB

Access expires in 12 days

[ Open ] [ Watch ]
```

---

# 27. Expired Downloads

Expiration must be communicated clearly.

Example:

```text
Access expired

The Dark Journey
DJ Mack

Your download access expired on
24 Sep 2026.

[ Purchase Again ]
```

Do not silently delete the user's item from the interface.

The user should understand **why access changed**.

---

# 28. Expired vs Removed Content

These are different states.

### Expired

The user's entitlement expired.

```text
ACCESS EXPIRED
```

### Removed

The content may no longer be available because it was removed/archived/unavailable.

```text
CONTENT UNAVAILABLE
```

Do not represent both with the same generic error.

---

# 29. Download Card

Core reusable component:

```text
DownloadCard
```

Responsibilities:

* poster
* title
* version
* status
* progress
* file size
* expiry information
* contextual actions

Variants may include:

```text
active
paused
completed
failed
expired
unavailable
```

Avoid creating six unrelated card components.

Use one domain component with controlled variants.

---

# 30. Download Card Visual Hierarchy

Priority:

```text
Poster
 ↓
Movie Title
 ↓
Version
 ↓
Download Status
 ↓
Progress / Access Information
 ↓
Primary Action
 ↓
Secondary Action
```

The card must remain readable at small mobile widths.

---

# 31. Mobile Download Experience

Mobile is a first-class experience.

Example:

```text
Downloads

Active
────────────────────────

[Poster]
The Dark Journey
DJ Mack

72%
1.8 GB / 2.7 GB

[ Pause ]

────────────────────────

Completed
...
```

Avoid dense desktop tables.

Use:

* stacked cards
* larger touch targets
* bottom sheets for secondary actions
* compact metadata

---

# 32. Desktop Download Experience

Desktop may use wider cards or a two-column layout.

Example:

```text
┌───────────────────────────────────────────────────────┐
│ Downloads                                             │
│                                                       │
│ Active Downloads                                      │
│                                                       │
│ [Poster]  The Dark Journey       72%                  │
│           DJ Mack                1.8 / 2.7 GB         │
│                                  [Pause] [Cancel]     │
└───────────────────────────────────────────────────────┘
```

Do not turn the page into an administrative dashboard.

This remains a customer media experience.

---

# 33. Download Queue

A download queue may be supported if the product eventually allows multiple simultaneous download requests.

However, do not over-engineer queue management during the frontend MVP.

Preferred MVP:

```text
Active Downloads
Completed Downloads
```

If queue behavior is implemented later, the UI may expose:

```text
Downloading
Queued
Paused
Completed
Failed
```

Queue ordering should be explicit.

---

# 34. File Naming

Downloaded files should have meaningful names.

Recommended conceptual format:

```text
GIFTEDproMovies - Movie Title - DJ Mack.mp4
```

or:

```text
Movie Title - DJ Mack.mp4
```

The final filename will ultimately be controlled by the download response and browser behavior.

The HTML `download` mechanism can suggest a filename, but browser behavior varies and server headers can affect the resulting filename.

Do not rely on the frontend filename alone for security.

---

# 35. File Size

If file size is available:

```text
2.7 GB
```

If unavailable:

```text
Size unavailable
```

Never invent file size.

---

# 36. Download Metadata

A download view model may contain:

```text
id
contentId
contentType
title
poster
versionId
versionName
fileName
fileSize
downloadStatus
progress
downloadedBytes
totalBytes
startedAt
completedAt
expiresAt
errorCode
```

The exact domain model must remain compatible with `08_DATA_MODELS.md`.

---

# 37. Download Repository

Recommended boundary:

```text
Download UI
      ↓
Download Controller / Hook
      ↓
Download Repository
      ↓
Typed Mock Data
```

Future:

```text
Download UI
      ↓
Download Controller / Hook
      ↓
Download Repository
      ↓
Protected Backend API
      ↓
Media Storage
```

Components must not directly perform raw network requests.

---

# 38. Mock Download Repository

During frontend development, mock downloads should simulate:

```text
PREPARING
STARTING
DOWNLOADING
PAUSED
COMPLETED
FAILED
EXPIRED
CANCELLED
UNAVAILABLE
```

Mock progress should be deterministic enough for QA.

Example:

```text
download-001
status: DOWNLOADING
progress: 67
downloadedBytes: ...
totalBytes: ...
```

---

# 39. Mock Progress

Mock progress may simulate:

```text
0%
18%
42%
67%
85%
100%
```

But the application should not depend on arbitrary timers.

The mock controller should behave as a predictable development abstraction.

---

# 40. Download Persistence

The UI should conceptually support restoring download state after navigation.

For example:

```text
Movie Details
 ↓
Download
 ↓
Downloads
```

The active download should remain represented.

The frontend may use local application state during MVP development.

Future persistence strategy may be determined when backend/media architecture is implemented.

---

# 41. Browser Download Boundary

A standard browser download can be initiated using browser-supported mechanisms, but the exact behavior varies between browsers and user settings.

Therefore:

**Do not design the product around assumptions such as:**

```text
Browser always saves immediately
```

or:

```text
Browser always shows progress inside our page
```

Instead, GIFTEDproMovies should provide its own download state experience where the technical implementation supports it.

---

# 42. Large File Handling

Movie files may be large.

Frontend architecture must avoid blindly loading an entire movie into JavaScript memory before saving it.

Where appropriate, streaming APIs can process network response data incrementally rather than waiting for the entire resource to be loaded first.

The actual implementation must be evaluated against:

* browser support
* memory usage
* mobile limitations
* file size
* protected media architecture
* backend response behavior

---

# 43. File System APIs

Future implementations may consider browser file-system capabilities for suitable environments.

However:

* browser support varies
* HTTPS/security context requirements apply to relevant APIs
* user permission may be required
* the website must not assume unrestricted filesystem access

The File System API can support browser-based file handling and saving workflows, but it does not automatically give a web application unrestricted access to the user's filesystem.

Therefore these APIs remain an implementation decision for the future backend/frontend integration phase.

---

# 44. Protected Offline Content

If GIFTEDproMovies eventually supports protected offline playback, the experience may evolve from:

```text
Download MP4
```

toward:

```text
Download for Offline Viewing
```

Conceptually:

```text
Purchase
 ↓
Authorize Device
 ↓
Download Protected Content
 ↓
Store Locally
 ↓
Open Through GIFTEDproMovies
 ↓
Validate Offline Entitlement
 ↓
Play
```

This is a future architecture decision.

The frontend must not claim to provide protected offline playback until the underlying implementation exists.

---

# 45. Device Access

Device access rules are currently configurable/product-policy dependent.

The UI should be capable of displaying:

```text
Download available on this device
```

or, if the future backend enforces a device limit:

```text
Device limit reached

Manage your devices to continue.
```

The exact maximum number of active devices remains a business/backend decision.

Do not hard-code:

```text
Maximum 2 devices
```

unless that policy is formally approved.

---

# 46. Expiration Handling

If an entitlement expires while a download is active, the UI should transition into an appropriate state.

Example:

```text
Download access expired

This download can no longer continue.

[ View Movie ]
```

The backend remains authoritative for the actual authorization decision.

---

# 47. Subscription Downloads

Subscription-based download access must be supported separately from individual purchases.

Example:

```text
Included with Premium

Download
```

The customer may download while the subscription grants the required access.

However, subscription expiry must not automatically be treated as cancellation of independently purchased content.

The entitlement source must be represented explicitly.

---

# 48. Individual Purchase Independence

If a customer purchased a movie individually:

```text
Individual Purchase
```

that entitlement remains independent from subscription status.

Example:

```text
Subscription expired

Movie access:
✓ Individually purchased
✓ Active until 30 Sep 2026
```

The UI must communicate the actual entitlement state rather than simply checking subscription status.

---

# 49. DJ/Translator Version Isolation

Download access belongs to the selected version.

Example:

```text
Purchased:
The Dark Journey
DJ Mack
```

Customer must not automatically receive:

```text
DJ John
Original
DJ Hassan
```

Download cards must therefore show the version clearly.

---

# 50. Download CTA States

The main CTA may change depending on entitlement.

### Not purchased

```text
[ ↓ DOWNLOAD — TZS 4,000 ]
```

### Preparing

```text
[ Preparing... ]
```

### Downloading

```text
[ Downloading 67% ]
```

### Completed

```text
[ ✓ Downloaded ]
```

### Expired

```text
[ Access Expired ]
```

### Unavailable

```text
[ Download Unavailable ]
```

The CTA must never falsely imply that the user owns content.

---

# 51. Checkout Success → Download

After successful purchase:

```text
Payment Successful
        ↓
Purchase Confirmed
        ↓
Download Available
```

Example:

```text
✓ Payment successful

The Dark Journey
DJ Mack

Download access is now active.

[ ↓ Download Now ]
[ Watch Instead ]
```

This provides a clear post-payment action.

---

# 52. Download from Library

The Library may expose:

```text
Your Downloads
```

or individual content cards with:

```text
[ Download ]
```

The dedicated `/downloads` route remains the main download-management destination.

This keeps:

```text
/library
```

focused on the user's content universe while:

```text
/downloads
```

focuses specifically on download operations.

---

# 53. Empty Downloads State

If there are no downloads:

```text
No downloads yet

Movies and series you download will appear here.

[ Explore Movies ]
```

The state should feel intentional, not like a broken page.

---

# 54. Failed Downloads State

If all downloads failed:

```text
No active downloads

Your previous downloads could not be completed.

[ Retry Failed ]
```

Only show actions that are actually supported.

---

# 55. Search Within Downloads

Do not add download search by default.

The MVP should remain focused.

If the download library becomes large enough, introduce:

```text
Search downloads
```

and filters such as:

```text
All
Movies
Series
Completed
Expired
```

This should be justified by real product scale.

---

# 56. Download Actions

Supported actions may include:

```text
Pause
Resume
Cancel
Retry
Open
Watch
Remove
Purchase Again
```

Actions must be state-dependent.

Never show every action simultaneously.

---

# 57. Remove vs Delete

The UI should distinguish:

```text
Remove from Downloads
```

from:

```text
Delete Account Content
```

A customer removing a download record must not imply that the underlying purchase entitlement has been deleted.

Likewise:

```text
Remove Download
```

must not revoke ownership.

---

# 58. Accessibility

Download controls must support:

* keyboard navigation
* visible focus
* accessible names
* progress semantics
* screen-reader-friendly status updates
* sufficient contrast
* touch-friendly controls
* non-color-only state communication

Progress must not be communicated only through color.

Example:

```text
Downloading — 67%
```

is preferable to:

```text
Red progress bar
```

without textual information.

---

# 59. Motion

Download motion should communicate state.

### Start

```text
Idle → Preparing
```

Subtle fade/scale.

### Progress

Progress bar transitions smoothly.

### Complete

```text
Progress → Checkmark
```

Subtle success transition.

### Failure

Small status transition to error state.

Avoid:

* looping decorative animations
* excessive glow
* bouncing cards
* aggressive progress effects

Follow `04_MOTION_SYSTEM.md`.

---

# 60. Reduced Motion

When:

```text
prefers-reduced-motion: reduce
```

the download experience must minimize or remove:

* progress animation smoothing
* card movement
* status transitions
* large-scale transformations

State information must remain fully understandable without motion.

---

# 61. Performance

Download UI must avoid unnecessary rendering.

Important principles:

* isolate active download state
* avoid re-rendering the entire Downloads page for every progress tick
* memoize expensive components where justified
* avoid unnecessary polling
* avoid storing large binary data in React state
* avoid converting large movie files to giant in-memory blobs unnecessarily
* use efficient progress updates
* clean up listeners/controllers when downloads finish or cancel

---

# 62. Memory Safety

Never store movie binary content inside:

```text
React state
```

or:

```text
Redux/global application state
```

The application state should contain metadata and status, not the full movie file.

Example:

```text
✓ Good

{
  status: "DOWNLOADING",
  progress: 67,
  downloadedBytes: 1800000000
}
```

Avoid:

```text
{
  movieBlob: <entire 2.7GB movie>
}
```

---

# 63. Abort / Cancellation

Where the implementation uses Fetch/streaming-based download control, cancellation may be implemented through appropriate abort mechanisms.

The UI must reflect the result:

```text
Cancel requested
↓
Download cancelled
```

rather than instantly pretending the network operation has stopped.

Browser stream handling supports cancellation patterns such as `AbortController` for fetch-based streaming workflows.

---

# 64. Error Mapping

Internal errors should map to user-friendly states.

Example:

```text
INTERNAL_AUTH_ERROR
```

becomes:

```text
We couldn't verify your access.
Please try again.
```

Example:

```text
NETWORK_TIMEOUT
```

becomes:

```text
Connection timed out.
Please try again.
```

Never expose:

```text
500
JWT_ERROR
S3_SIGNATURE_INVALID
DATABASE_EXCEPTION
```

to normal customers.

---

# 65. Security-Sensitive Information

Never display:

* access tokens
* signed URLs
* internal storage paths
* bucket names
* internal server identifiers
* payment credentials
* private API keys
* authorization headers

The frontend should receive only the information required for the current operation.

---

# 66. Download UI Architecture

Recommended structure:

```text
features/
└── downloads/
    ├── components/
    │   ├── DownloadCard.tsx
    │   ├── DownloadProgress.tsx
    │   ├── DownloadStatus.tsx
    │   ├── DownloadActions.tsx
    │   └── DownloadEmptyState.tsx
    │
    ├── hooks/
    │   ├── useDownloads.ts
    │   └── useDownloadController.ts
    │
    ├── services/
    │   └── downloadRepository.ts
    │
    ├── types/
    │   └── download.types.ts
    │
    └── utils/
        └── downloadFormatters.ts
```

Exact structure may follow the architecture defined in MD-06/MD-07.

---

# 67. Component Ownership

### `DownloadCard`

Owns:

* visual representation
* progress
* status
* contextual actions

### `DownloadProgress`

Owns:

* progress bar
* percentage
* byte information
* optional remaining time

### `DownloadActions`

Owns:

* pause
* resume
* cancel
* retry
* open
* watch

### `useDownloadController`

Owns:

* start
* pause
* resume
* cancel
* retry
* state transitions

### `downloadRepository`

Owns:

* download data access
* future backend boundary

Components should not own business authorization logic.

---

# 68. URL State

The primary download-management page is:

```text
/downloads
```

Optional future query states may include:

```text
/downloads?status=active
/downloads?status=completed
```

Do not introduce unnecessary URL complexity during MVP.

---

# 69. Deep Linking

A customer should be able to navigate directly to:

```text
/downloads
```

and see their current download state.

Invalid download identifiers should produce a useful state rather than a broken page.

---

# 70. Browser Navigation

The experience must behave correctly with:

```text
Back
Forward
Refresh
Open in new tab
```

An active download must not cause navigation controls to behave unpredictably.

---

# 71. Download + Watch Relationship

After download completion:

```text
[ Watch ]
```

may be offered when the customer also has streaming access.

However, downloading and watching must remain separate operations.

Do not automatically start playback after download.

---

# 72. Download + Purchase Relationship

The download button should clearly communicate whether the customer needs to purchase first.

Example:

```text
Download
TZS 4,000
```

After purchase:

```text
Download
Available
```

Avoid ambiguous labels such as:

```text
Get
```

when the customer is actually purchasing downloadable access.

---

# 73. Download + LIPA

For customers without download entitlement:

```text
[ ↓ DOWNLOAD — TZS 4,000 ]
```

may transition into checkout.

If the product uses the branded payment CTA:

```text
LIPA
```

the checkout experience should make it clear that payment is required.

Example:

```text
Download
TZS 4,000

[ LIPA ]
```

Do not imply that clicking `Download` itself completes payment.

---

# 74. Customer Journey — New Download Purchase

```text
Movie Details
      ↓
Select DJ/Version
      ↓
DOWNLOAD
      ↓
Login/Register
      ↓
Checkout
      ↓
LIPA
      ↓
Payment Success
      ↓
Download Available
      ↓
Preparing
      ↓
Downloading
      ↓
Completed
      ↓
Downloads
```

---

# 75. Customer Journey — Existing Entitlement

```text
Movie Details
      ↓
Select Version
      ↓
DOWNLOAD
      ↓
Check entitlement
      ↓
Preparing
      ↓
Downloading
      ↓
Completed
```

---

# 76. Customer Journey — Expired

```text
Downloads
      ↓
Expired Download
      ↓
Access Expired
      ↓
View Movie
      ↓
Purchase Again
```

---

# 77. Customer Journey — Subscription

```text
Subscription Active
      ↓
Eligible Movie
      ↓
DOWNLOAD
      ↓
Check subscription entitlement
      ↓
Download
```

If subscription expires:

```text
Subscription Expired
      ↓
Download entitlement re-evaluated
      ↓
Access depends on actual entitlement
```

---

# 78. Customer Journey — Failed Download

```text
Download
    ↓
Preparing
    ↓
Downloading
    ↓
Network Failure
    ↓
Failed
    ↓
Retry
    ↓
Downloading
```

---

# 79. Customer Journey — Cancelled

```text
Downloading
    ↓
Cancel
    ↓
Confirmation
    ↓
Cancelled
    ↓
Downloads page
```

---

# 80. Visual Quality Bar

The download experience must feel like part of the same premium product as:

* movie details
* streaming
* library
* subscriptions
* checkout

It must not look like a generic browser file manager.

Use:

* cinematic dark surfaces
* strong poster imagery
* controlled crimson
* premium gold where appropriate
* subtle borders
* clear progress
* restrained motion
* excellent spacing

---

# 81. Anti-Patterns

Do not build:

* generic Bootstrap download tables
* plain browser-link download page
* raw MP4 URL cards
* fake progress bars
* fake pause/resume
* permanent signed URLs inside mock data
* hard-coded expiration dates
* hard-coded download prices
* hard-coded device limits
* excessive progress animations
* huge dashboard widgets
* unnecessary download queue complexity
* download state stored as arbitrary local component fragments
* binary movie data inside React state
* fake DRM
* frontend-only authorization

---

# 82. Frontend Security Rule

The frontend may **display** authorization state.

The frontend must never be treated as the ultimate authority for authorization.

```text
Frontend:
"User appears eligible"

Backend:
"User is actually authorized"
```

The future backend must revalidate:

* identity
* entitlement
* selected version
* content availability
* expiration
* device policy
* download permission

---

# 83. Backend Replacement Boundary

The final architecture must allow this:

```text
CURRENT

Download UI
   ↓
Mock Download Repository


FUTURE

Download UI
   ↓
Download Repository
   ↓
Backend API
   ↓
Authorization Service
   ↓
Protected Media Storage
```

The UI should not need to be redesigned when the real backend is introduced.

---

# 84. No Backend During Frontend Phase

Do NOT implement:

* database
* Prisma
* MySQL
* storage bucket
* real payment
* real download authorization
* signed URLs
* DRM
* real user entitlement validation
* real device registration
* real media CDN

Those belong to the backend/integration phase.

---

# 85. Testing States

The frontend must be tested against at least:

```text
No downloads
One active download
Multiple downloads
Paused download
Completed download
Failed download
Retryable download
Cancelled download
Expired download
Unavailable content
Large file
Unknown file size
Slow connection
Interrupted connection
Subscription-based download
Individually purchased download
Multiple DJ versions
Mobile viewport
Desktop viewport
Reduced motion
Unauthenticated customer
Authenticated customer
```

---

# 86. Acceptance Criteria

MD-18 is complete only when:

* `/downloads` exists
* active downloads are represented clearly
* completed downloads are represented clearly
* expired downloads are represented clearly
* failed downloads are represented clearly
* progress UI exists
* download status is typed
* version identity is visible
* access duration is visible where relevant
* Watch and Download remain distinct
* download CTA changes according to state
* checkout integration is represented
* library integration is represented
* authentication flow is represented
* mobile experience is intentionally designed
* desktop experience is intentionally designed
* empty states exist
* error states exist
* loading states exist
* motion follows MD-05
* accessibility follows MD-03
* performance rules are respected
* no raw permanent media URLs are embedded
* no frontend-only security claims are made
* no real backend is implemented
* mock repository exists behind a clear boundary
* components are reusable
* no fake pause/resume behavior exists
* no binary movie data is stored in React state
* AI coding agents cannot invent missing business rules

---

# 87. AI Coding Agent Directive

The implementation agent MUST treat this document as a binding frontend specification.

The agent MUST NOT:

* invent download business rules
* invent access durations
* invent device limits
* invent payment providers
* invent DRM
* invent backend authorization
* expose raw media URLs
* create fake secure-download claims
* silently change download states
* create fake progress
* implement backend services
* replace the repository boundary with direct network calls

If a requirement is not defined:

```text
STOP
↓
Identify the ambiguity
↓
Ask for clarification
```

Do not guess.

---

# 88. Final Technical Principle

GIFTEDproMovies should make downloading feel simple to the customer:

```text
Choose
 ↓
Pay
 ↓
Download
 ↓
Enjoy
```

But internally, the product architecture must remain disciplined:

```text
Customer Action
      ↓
Download UX
      ↓
Typed Download Controller
      ↓
Download Repository
      ↓
Future Authorization Layer
      ↓
Future Protected Media Infrastructure
```

The customer should experience **simplicity**.

The architecture should maintain **control**.

That is the download philosophy of GIFTEDproMovies.

---

# 89. Next Document

Proceed to:

```text
19_SUBSCRIPTION_UI.md
```

Next document will define:

* subscription discovery
* subscription plans
* pricing
* duration
* included content
* subscription purchase
* active subscription
* expired subscription
* renewal
* subscription vs individual purchases
* streaming access
* download access
* subscription-aware library
* account subscription page
* customer states
* mobile/desktop UX
* mock subscription architecture
* frontend security boundaries
* acceptance criteria
