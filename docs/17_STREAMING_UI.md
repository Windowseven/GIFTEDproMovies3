# GIFTEDproMovies — Streaming UI & Playback Experience Specification

**Document ID:** MD-17
**File:** `17_STREAMING_UI.md`
**Version:** 1.0
**Status:** Frontend Specification
**Scope:** Frontend only
**Product:** GIFTEDproMovies

---

# 1. Purpose

This document defines the complete streaming/watch experience for GIFTEDproMovies.

The streaming experience must feel:

* Cinematic
* Immersive
* Fast
* Minimal
* Responsive
* Reliable
* Accessible
* Premium
* Content-first

The player must not feel like a generic HTML `<video>` element wrapped inside a dark container.

The experience should communicate:

> **The content is the hero. The interface disappears when it is not needed.**

This document defines frontend behavior only.

It does not implement:

* Backend media authorization
* Real entitlement verification
* Media storage
* Video transcoding
* CDN infrastructure
* DRM/license servers
* Real streaming APIs
* Playback authorization APIs
* Database persistence

---

# 2. Streaming Routes

Movie playback:

```text
/watch/movie/[slug]
```

Series episode playback:

```text
/watch/series/[seriesSlug]/season/[seasonNumber]/episode/[episodeNumber]
```

These routes represent the customer playback experience.

---

# 3. Core Streaming Principle

The player must follow this hierarchy:

```text
CONTENT
  ↓
PLAYBACK
  ↓
ESSENTIAL CONTROLS
  ↓
SECONDARY CONTROLS
```

The interface must never compete visually with the movie.

During active playback:

```text
Video > Controls > Metadata > Everything else
```

---

# 4. Playback Entry Points

A customer may enter the player from:

* Movie Details
* Series Details
* Library
* Continue Watching
* Search
* Purchase Success
* Subscription Access
* Recently Viewed
* Episode navigation
* Direct playback URL

Every entry point must preserve the correct content context.

---

# 5. Playback Authorization Concept

Before playback begins, the application conceptually checks:

```text
Customer
   ↓
Authentication
   ↓
Content
   ↓
Selected Version
   ↓
Entitlement
   ↓
Access Type
   ↓
Playback Authorization
   ↓
Player
```

The frontend may represent these states.

The backend will eventually determine whether playback is actually authorized.

---

# 6. Access Types

Playback may be granted through:

### Individual Purchase

Customer purchased the selected movie/version.

### Subscription

Customer has an active subscription that includes the selected content.

### Other Future Entitlement

Future business models may introduce additional access mechanisms.

The frontend must remain extensible.

---

# 7. Access Validation States

The player should support:

```text
AUTHENTICATING
CHECKING_ACCESS
ACCESS_GRANTED
ACCESS_DENIED
ACCESS_EXPIRED
CONTENT_UNAVAILABLE
PLAYBACK_UNAVAILABLE
```

These states should not be confused.

---

# 8. Access Granted

When access is valid:

```text
Checking access...
        ↓
Access granted
        ↓
Player loads
        ↓
Playback begins
```

The customer should not experience unnecessary intermediate screens.

Where possible, authorization checks should happen quickly and the player should transition smoothly into playback.

---

# 9. Access Denied

If the customer does not have access:

```text
This content requires access.

[ PURCHASE ACCESS ]
```

For subscription content:

```text
This content is available with a subscription.

[ VIEW SUBSCRIPTION ]
```

The UI must use the actual available purchase/subscription options.

---

# 10. Expired Access

If access has expired:

```text
Your access has expired.

You can purchase access again to continue watching.

[ PURCHASE ACCESS ]
```

Do not display the player as if the customer still owns the content.

---

# 11. Player Layout

Desktop conceptual structure:

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                        VIDEO                                 │
│                                                              │
│                                                              │
│                 ▶                                           │
│                                                              │
│                                                              │
│ ──────────────────────────────────────────────────────────── │
│  01:24 / 02:10      🔊    ⚙    CC    ⛶                     │
└──────────────────────────────────────────────────────────────┘
```

The player should occupy the dominant visual area.

Below the player:

```text
Title
Metadata
Version
Progress / Episode context
Actions
Related content
```

---

# 12. Cinematic Player Environment

The player should use the GIFTEDproMovies dark visual language.

Recommended:

* Near-black surroundings
* Minimal chrome
* Strong contrast
* Soft gradients behind controls
* Subtle crimson interaction states
* Gold reserved for premium/contextual accents

Do not flood the player with red.

---

# 13. Player Controls

Core controls:

* Play/Pause
* Progress bar
* Current time
* Duration
* Volume
* Mute
* Fullscreen
* Settings

Depending on content and browser support:

* Subtitle/CC
* Audio track
* Quality
* Playback speed
* Picture-in-picture
* Next episode

Not every control must appear simultaneously.

---

# 14. Control Visibility

During playback:

```text
Visible
   ↓
User inactive
   ↓
Controls fade
   ↓
Video becomes immersive
```

When the customer:

* Moves mouse
* Taps screen
* Presses keyboard
* Pauses
* Seeks
* Opens a menu

controls should reappear.

---

# 15. Auto-Hide Controls

Controls should automatically hide after a short period of inactivity during active playback.

They should remain visible when:

* Video is paused
* A settings menu is open
* A subtitle menu is open
* A quality menu is open
* A playback error is displayed
* The player is buffering

---

# 16. Play/Pause

Primary control:

```text
▶
```

or:

```text
Ⅱ
```

Clicking/tapping the video surface may toggle playback.

However, clicking interactive controls must not unintentionally toggle playback.

---

# 17. Center Play Button

When paused, a central play button may appear.

Conceptually:

```text
             ┌───────┐
             │   ▶   │
             └───────┘
```

The control should be visually prominent but not oversized.

On mobile, the touch target must be comfortably tappable.

---

# 18. Progress Bar

The progress bar communicates:

* Current playback position
* Total duration
* Buffered position
* Playback progress

Conceptually:

```text
Played          Buffered
███████████░░░░░░░░░░░░░
0:42                    2:10
```

The progress indicator should remain visually simple.

---

# 19. Seeking

Desktop:

* Click progress bar
* Drag playhead
* Keyboard shortcuts where supported

Mobile:

* Tap
* Drag
* Optional touch-friendly seeking interaction

Seeking should feel responsive.

The player should avoid unnecessary UI jumps while seeking.

---

# 20. Seek Preview

Where future media infrastructure provides thumbnails, the player may display a preview thumbnail while the customer scrubs.

Example:

```text
        ┌─────────────┐
        │   PREVIEW   │
        │   FRAME     │
        └─────────────┘
              ▲
──────────────●────────────
```

This is optional until the backend/media pipeline supports it.

Do not create fake previews from unrelated images.

---

# 21. Buffered State

The player should communicate buffering without overwhelming the customer.

Preferred:

```text
Subtle loading indicator
```

Avoid:

```text
BUFFERING...
BUFFERING...
BUFFERING...
```

large text overlays unless necessary.

---

# 22. Buffering Experience

During temporary buffering:

```text
Video pauses
       ↓
Subtle spinner
       ↓
Playback resumes
       ↓
Spinner disappears
```

If buffering persists, the UI may communicate:

```text
Connection is taking longer than expected.
```

with a recovery action where appropriate.

---

# 23. Playback Error

Example:

```text
Playback unavailable

We couldn't continue playing this video.

[ Try Again ]
```

Do not expose internal technical errors such as raw:

```text
MEDIA_ERR_DECODE
403 CDN TOKEN INVALID
```

to customers.

---

# 24. Network Error

Network problems should be distinguishable from content problems where possible.

Example:

```text
Connection interrupted.

Check your connection and try again.

[ Retry ]
```

---

# 25. Content Unavailable

If content itself becomes unavailable:

```text
This content is currently unavailable.

Please try again later.
```

The customer should not be told that payment failed unless payment actually failed.

---

# 26. Resume Playback

The platform must support Continue Watching.

When the customer returns to content:

```text
Continue Watching

Resume from 01:24?
```

Possible actions:

```text
[ Resume ]
[ Start Over ]
```

---

# 27. Resume Position

The frontend should represent:

```text
currentPosition
duration
progressPercentage
```

The backend will eventually persist the authoritative progress.

During frontend development, progress may be stored in mock/local state.

---

# 28. Progress Saving

Conceptually:

```text
Player
 ↓
Playback Progress Controller
 ↓
Progress Repository
 ↓
Mock Data
```

Future:

```text
Player
 ↓
Playback Progress Controller
 ↓
API
 ↓
Backend
```

The UI should not be tightly coupled to how progress is stored.

---

# 29. Progress Update Frequency

The frontend should not send progress updates continuously on every video frame.

Use controlled updates such as:

* Periodic checkpoints
* Significant playback changes
* Pause
* Page exit
* Playback completion

Exact backend synchronization strategy will be defined later.

---

# 30. Start Over

The customer should be able to restart content from the beginning.

Example:

```text
[ Start Over ]
```

If a resume position exists, the UI may ask:

```text
Continue from 01:24?

[ Resume ]   [ Start Over ]
```

---

# 31. Playback Completion

When a movie finishes:

```text
Video complete
        ↓
Completion state
        ↓
Related content
```

For movies, show:

* Completion state
* Related movies
* Replay
* Back to details
* Library

For episodes:

* Next episode
* Replay
* Series details

---

# 32. Series Next Episode

For series, the player should support:

```text
Episode ends
     ↓
Next Episode
     ↓
Countdown / Confirmation
     ↓
Next episode
```

Autoplay behavior should be configurable.

The frontend must not force autoplay if browser restrictions prevent it.

---

# 33. Next Episode UI

Example:

```text
Up Next

Episode 5
The Journey Continues

[ Play Next ]
```

A short countdown may be used.

Example:

```text
Next episode in 5

[ Play Now ]    [ Cancel ]
```

---

# 34. Autoplay

Autoplay should never be assumed to work universally.

The frontend must gracefully handle browser autoplay restrictions.

If autoplay is blocked:

```text
[ Play Next ]
```

should remain available.

Do not repeatedly attempt autoplay in a loop.

---

# 35. Episode Navigation

During playback, customers should be able to access episode navigation where appropriate.

Possible control:

```text
Episodes
```

Opening it may reveal:

```text
Season 1

Episode 1
Episode 2
Episode 3
Episode 4
...
```

The current episode must be clearly indicated.

---

# 36. Previous / Next Episode

Series playback may expose:

```text
Previous Episode
Next Episode
```

These controls should be hidden or disabled where no adjacent episode exists.

---

# 37. Episode Context

Below or around the player:

```text
Example Series

Season 1 · Episode 4

The Journey Continues

Description...
```

The player should preserve the context of the series.

---

# 38. Movie Context

For movies:

```text
The Example Movie

2026 · 2h 10m · Action

DJ Mack
```

The customer should know what they are watching without requiring the full movie details page.

---

# 39. Version Context

If the customer purchased a specific DJ/Translator version, the watch page should reflect it.

Example:

```text
Version
DJ Mack
```

The UI must never silently switch to another version.

---

# 40. Version Switching

If the business later allows switching between owned versions, the UI may provide:

```text
Version

DJ Mack ✓
DJ John
```

However, switching must respect entitlement.

If the customer does not own another version:

```text
DJ John
Purchase required
```

The exact switching behavior remains dependent on backend entitlement rules.

---

# 41. Audio Controls

Where multiple audio tracks exist, provide:

```text
Audio

English
Swahili
Original
```

The actual available tracks come from media metadata.

Do not show languages that do not exist.

---

# 42. Subtitle Controls

Where subtitles exist:

```text
Subtitles

Off
English
Swahili
```

The player should clearly indicate the active subtitle.

Example:

```text
English ✓
```

---

# 43. Subtitle Presentation

Subtitles should be:

* High contrast
* Readable
* Positioned safely
* Responsive
* Not obscured by controls
* Consistent across screen sizes

Avoid excessive styling.

The content remains the focus.

---

# 44. Subtitle Accessibility

Subtitle settings should be accessible through:

* Mouse
* Touch
* Keyboard
* Screen reader

The active state must not rely only on color.

---

# 45. Quality Selection

The player may expose:

```text
Quality

Auto
1080p
720p
480p
360p
```

The exact available resolutions depend on the future media pipeline.

The frontend must render only quality options supplied by media metadata.

---

# 46. Auto Quality

Recommended default:

```text
Auto
```

The actual adaptive bitrate behavior belongs to the media delivery system.

The frontend should not pretend to implement adaptive streaming itself if the backend/CDN pipeline has not been implemented.

Modern web streaming can use Media Source Extensions as a foundation for adaptive streaming approaches such as HLS/DASH.

---

# 47. Playback Speed

Optional control:

```text
Speed

0.75x
1x
1.25x
1.5x
2x
```

This should be available only if it makes sense for the content and product direction.

It is not mandatory for the first implementation.

---

# 48. Volume

Desktop:

* Volume button
* Slider

Mobile:

* Mute/unmute
* System volume controls
* Optional compact slider

Do not force a large volume slider onto small screens.

---

# 49. Fullscreen

Fullscreen should be supported where browser/device capabilities allow it.

Control:

```text
⛶
```

Behavior:

```text
Normal
 ↓
Fullscreen
 ↓
Exit Fullscreen
```

The player UI should adapt to the larger viewport.

---

# 50. Mobile Fullscreen

On mobile, fullscreen should maximize the viewing experience while preserving:

* Playback controls
* Orientation behavior
* Exit mechanism
* Accessibility

Do not assume every device behaves identically.

---

# 51. Picture-in-Picture

Picture-in-picture may be supported where browser/device capabilities permit.

It is an optional enhancement.

If implemented, the UI should not claim support where the browser does not provide it.

---

# 52. Theater Mode

A desktop theater mode may be considered:

```text
Normal
Theater
Fullscreen
```

However, theater mode should not be implemented simply because it is available elsewhere.

It should only exist if it improves the GIFTEDproMovies experience.

---

# 53. Keyboard Shortcuts

Desktop playback may support:

```text
Space / K   Play / Pause
← / →       Seek
M            Mute
F            Fullscreen
Esc          Exit overlay/fullscreen
```

Exact shortcut behavior must avoid conflicts with focused form elements.

Shortcuts should not interfere with typing.

---

# 54. Keyboard Focus

When navigating the player using a keyboard:

* Focus must be visible
* Controls must have logical order
* Menus must be keyboard navigable
* Escape must close overlays/menus
* Focus must not become trapped unexpectedly

---

# 55. Mobile Touch Interaction

Mobile playback must not depend on hover.

Supported interaction should include:

* Tap play/pause
* Tap to reveal controls
* Drag progress
* Tap settings
* Tap subtitles
* Tap fullscreen
* Swipe/scroll outside player where appropriate

---

# 56. Mobile Control Layout

Mobile controls may use:

```text
Progress
────────────────────────

◀  ▶  ▶|        ⚙  ⛶
```

or another compact arrangement.

The exact arrangement should be optimized through implementation testing.

Controls must remain easy to tap.

---

# 57. Touch Target Size

Interactive player controls should provide sufficiently large touch targets.

Do not create tiny icons that require precision tapping.

Visual icons may be small while the actual interactive hit area is larger.

---

# 58. Player Orientation

The player should support responsive portrait and landscape experiences.

Landscape should prioritize immersion.

Portrait should preserve usable controls and content context.

---

# 59. Player Header

A minimal player header may include:

```text
←    The Example Movie
```

For series:

```text
←    Example Series · S1 E4
```

The header should disappear with other controls during playback where appropriate.

---

# 60. Exit Playback

The customer must have an obvious way to leave playback.

Possible:

```text
←
```

or browser back.

Leaving playback should not automatically erase progress.

---

# 61. Back Navigation

When the customer exits:

```text
Player
 ↓
Previous Context
```

Examples:

```text
Movie Details
```

or:

```text
Series Details
```

or:

```text
Library
```

The app should preserve sensible navigation context.

---

# 62. Player + Library Integration

Playback should update the customer's library experience.

Example:

```text
Watch 42 minutes
        ↓
Library
        ↓
Continue Watching
        ↓
Resume at 42:00
```

The player and Library must use compatible progress models.

---

# 63. Continue Watching Card

The Library may display:

```text
[ POSTER ]

The Example Movie

42% watched

Continue
```

The progress bar should be subtle.

---

# 64. Episode Progress

For series:

```text
Example Series

Season 1

Episode 4
████████░░ 82%

Episode 5
Not Started
```

Series progress should be derived from episode progress.

---

# 65. Playback Completion Threshold

A backend/product rule may later define when content counts as “completed.”

The frontend should not permanently hard-code a completion percentage without product confirmation.

---

# 66. Player Metadata

The player may consume:

```text
PlaybackMetadata
├── contentId
├── contentType
├── title
├── subtitle
├── poster
├── duration
├── version
├── streamUrl / streamSource
├── audioTracks
├── subtitleTracks
├── availableQualities
├── entitlement
└── progress
```

Actual stream URLs must eventually come from an authorized backend/media delivery mechanism.

---

# 67. Mock Playback Data

Frontend development may use mock playback sources.

Example conceptual data:

```text
{
  contentId: "movie-001",
  title: "Example Movie",
  duration: 7800,
  version: "DJ Mack",
  streamStatus: "READY",
  progress: 1240
}
```

The exact implementation must follow the domain models defined in previous documents.

---

# 68. No Fake Production Streaming

Mock video assets are acceptable for frontend development.

However, the implementation must not claim:

```text
Protected streaming
```

if it is simply loading a publicly accessible MP4.

Mock playback is for UI development only.

---

# 69. Protected Playback Boundary

For a commercial streaming platform, protected playback must eventually be handled by the backend/media infrastructure.

Potential future technologies may include:

* Signed playback URLs
* Short-lived playback tokens
* HLS/DASH delivery
* Encrypted media
* DRM where commercially and technically appropriate

Encrypted Media Extensions provide a browser API for interacting with protected/encrypted media, but EME itself does not define a complete DRM system.

Therefore:

```text
Frontend Player
        ↓
Authorized Playback Session
        ↓
Media Delivery Layer
        ↓
Protected Stream
```

The frontend must not independently implement a fake DRM system.

---

# 70. Stream URL Security

The frontend should never assume that hiding a URL makes video secure.

Do not rely on:

```text
obfuscated URL
```

or:

```text
hidden video element
```

as a security mechanism.

Actual authorization must be enforced server-side.

---

# 71. Download vs Streaming Separation

Streaming access and download access are separate.

A customer watching a movie does not automatically receive an unrestricted downloadable file.

Likewise:

```text
Download entitlement
```

does not necessarily mean:

```text
Unlimited streaming forever
```

The frontend should reflect the actual entitlement returned by the future backend.

---

# 72. Expiration During Playback

If an entitlement expires while the customer is watching, the final behavior must be determined by backend policy.

Possible future state:

```text
Your access has expired.

Playback can no longer continue.

[ Renew Access ]
```

The frontend must not invent whether an already-started session continues indefinitely.

---

# 73. Session Loss

If authentication expires during playback:

```text
Your session has expired.

Please sign in again to continue.

[ Sign In ]
```

After successful authentication, the player should attempt to restore context where safe.

---

# 74. Authorization Failure During Playback

If the playback authorization becomes invalid:

```text
Playback authorization expired.

[ Try Again ]
```

Avoid showing internal authorization details.

---

# 75. Player Loading Sequence

Recommended:

```text
Open Watch Page
      ↓
Load playback metadata
      ↓
Check access
      ↓
Load player
      ↓
Load poster/preview
      ↓
Load media
      ↓
Buffer
      ↓
Play
```

The UI should communicate meaningful progress without showing every internal operation.

---

# 76. Poster Placeholder

Before video becomes ready:

```text
[ BACKDROP / POSTER ]

          ○
       Loading
```

The poster should transition smoothly into playback.

Avoid an abrupt black flash where possible.

---

# 77. Player Transition

From Movie Details:

```text
Movie Details
      ↓
Watch
      ↓
Poster / Hero
      ↓
Player
```

A shared-element-inspired transition may be used where technically stable.

The transition should visually connect:

```text
Poster
```

to:

```text
Video
```

without delaying playback.

---

# 78. Player Motion

Motion should be purposeful.

Recommended:

* Controls fade in/out
* Menus slide/fade
* Poster transitions into video
* Loading indicator appears subtly
* Success/completion state transitions smoothly
* Next episode panel enters from the bottom

Avoid:

* Constant background movement
* Excessive glow
* Large player scaling
* Continuous decorative effects

---

# 79. Reduced Motion

If the user has enabled:

```text
prefers-reduced-motion
```

reduce:

* Transitions
* Animated overlays
* Parallax
* Scaling
* Decorative movement

Core playback functionality must remain unchanged.

---

# 80. Player Settings Menu

Settings may contain:

```text
Settings

Quality
Audio
Subtitles
Speed
```

Only show options actually supported by the playback metadata.

---

# 81. Settings Interaction

Opening settings should:

* Pause control auto-hide
* Maintain playback unless the selected setting requires otherwise
* Clearly indicate current selection
* Allow easy dismissal

Mobile may use a bottom sheet.

Desktop may use a compact popover/panel.

---

# 82. Subtitles Menu

Example:

```text
Subtitles

Off
English
Swahili

             ✓
```

The active option must be visually and semantically clear.

---

# 83. Quality Menu

Example:

```text
Quality

Auto             ✓
1080p
720p
480p
```

The menu should not claim qualities unavailable for the current media.

---

# 84. Audio Menu

Example:

```text
Audio

Original         ✓
Swahili
English
```

Only available tracks should be listed.

---

# 85. Error Recovery

Each major playback error should have an appropriate action.

Examples:

```text
Buffering
→ Wait / Retry

Network error
→ Retry

Access expired
→ Purchase

Not authenticated
→ Sign In

Content unavailable
→ Back / Browse

Unknown playback error
→ Retry / Back
```

---

# 86. Related Content

Below playback, show related content where appropriate.

For movies:

```text
You May Also Like
```

For series:

```text
More From This Series
```

and:

```text
You May Also Like
```

Related content should not interfere with active playback.

---

# 87. Discovery After Playback

The end of playback should continue the discovery loop.

Example:

```text
Movie Complete

Watch Again
Go to Details
More Like This
Back to Library
```

For series:

```text
Next Episode
More Episodes
Series Details
More Like This
```

---

# 88. Player Page Structure

Recommended:

```text
WatchPage
├── PlayerShell
│   ├── PlayerHeader
│   ├── VideoSurface
│   ├── PlayerControls
│   ├── SettingsMenus
│   └── PlaybackOverlay
│
├── PlaybackInfo
│   ├── Title
│   ├── Metadata
│   ├── Version
│   └── Description
│
├── EpisodeContext (Series only)
│
├── RelatedContent
└── Recommendations
```

---

# 89. Component Architecture

Suggested reusable components:

```text
PlayerShell
VideoSurface
PlayerControls
PlayPauseButton
SeekBar
VolumeControl
FullscreenButton
SettingsButton
SettingsMenu
QualitySelector
AudioSelector
SubtitleSelector
PlaybackStatus
BufferingIndicator
PlaybackError
AccessGate
ResumePrompt
NextEpisodePanel
EpisodeNavigator
PlaybackInfo
```

Not every component needs to exist as an independent file immediately.

Component boundaries should follow actual reuse and responsibility.

---

# 90. Player State Ownership

The player may maintain UI state such as:

* Controls visible
* Settings open
* Current menu
* Local volume
* Local playback UI state
* Hover/touch state

Playback authority should come from the media element/player abstraction.

Entitlement authority belongs to the backend.

---

# 91. Playback Controller

Recommended abstraction:

```text
Player UI
   ↓
Playback Controller
   ↓
Media Adapter
   ↓
HTMLVideoElement / Streaming Library
```

This prevents every component from directly manipulating the `<video>` element.

---

# 92. Media Adapter

The media adapter may abstract:

* Play
* Pause
* Seek
* Volume
* Fullscreen
* Playback rate
* Quality
* Audio
* Subtitles
* Current time
* Duration
* Buffering
* Error

This allows the underlying media implementation to evolve.

---

# 93. Future Streaming Technology Boundary

The frontend should not permanently lock itself to one media delivery technology.

Possible future implementation may use:

```text
Native HTML Video
```

or:

```text
HLS
```

or:

```text
DASH
```

or another appropriate delivery mechanism.

Media Source Extensions can provide JavaScript-controlled media buffering and form the foundation for adaptive streaming implementations.

The final backend/media architecture will determine the correct production implementation.

---

# 94. Browser Compatibility

The player must account for differences between:

* Chrome
* Safari
* Firefox
* Edge
* Mobile browsers

Do not assume one browser's playback behavior represents every environment.

---

# 95. Safari / Native Playback

Where browser-native streaming support is available, the player abstraction should allow it.

The application should not force a JavaScript streaming library when native browser capabilities are sufficient.

---

# 96. Performance

Streaming UI must prioritize:

* Fast initial player render
* Minimal unnecessary JavaScript
* Efficient event listeners
* Avoiding excessive React state updates
* Efficient progress updates
* Lazy loading noncritical content
* Poster optimization
* Proper media preloading strategy
* No unnecessary animation loops

---

# 97. Player Event Handling

Player events should be handled through a controlled abstraction.

Relevant events may include:

* `play`
* `pause`
* `timeupdate`
* `loadedmetadata`
* `canplay`
* `waiting`
* `playing`
* `ended`
* `error`
* `volumechange`
* `seeking`
* `seeked`

Do not update the entire React tree unnecessarily on every `timeupdate`.

---

# 98. React Performance Rule

Playback time changes frequently.

Therefore, avoid architecture such as:

```text
Every timeupdate
    ↓
Global React state
    ↓
Entire Watch Page rerenders
```

Prefer localized player state or throttled progress synchronization.

---

# 99. Memory Management

The player must clean up:

* Event listeners
* Timers
* Media instances
* Streaming library instances
* Object URLs where used
* Subscriptions

when the player unmounts or content changes.

---

# 100. Content Switching

When moving:

```text
Episode 4
 ↓
Episode 5
```

the player should cleanly transition to the new media source.

Avoid:

* Multiple active media instances
* Previous audio continuing in background
* Old subtitles remaining
* Old progress being applied to new content

---

# 101. Progress Isolation

Progress must be scoped to:

```text
Customer
+
Content
+
Version
+
Episode where applicable
```

Example:

```text
Customer A
Movie X
DJ Mack
Progress = 42%
```

must not become:

```text
Movie X
DJ John
Progress = 42%
```

unless the business explicitly defines shared progress.

---

# 102. Customer Isolation

Mock and future production architecture must never allow:

```text
Customer A
    ↓
Customer B's progress
```

or:

```text
Customer A
    ↓
Customer B's entitlement
```

The frontend must model customer-specific state correctly.

---

# 103. Accessibility

The player must support:

* Keyboard navigation
* Screen readers
* Visible focus
* Captions/subtitles
* Accessible labels
* Accessible menus
* Accessible status messages
* Reduced motion
* Sufficient contrast

Player controls must have meaningful accessible labels such as:

```text
Play
Pause
Mute
Fullscreen
Settings
Subtitles
```

rather than:

```text
Button 1
Button 2
```

---

# 104. Screen Reader Status

Important changes should be communicated appropriately:

```text
Playing
Paused
Playback buffering
Playback complete
Payment access expired
```

Do not overwhelm assistive technology with every tiny playback event.

---

# 105. Focus Management

When opening a settings menu:

```text
Settings button
 ↓
Settings panel
 ↓
First menu item receives focus
```

When closing:

```text
Settings panel
 ↓
Focus returns to Settings button
```

This provides predictable keyboard interaction.

---

# 106. Mobile Accessibility

Mobile must provide:

* Large enough touch targets
* Readable labels
* Clear contrast
* No hover-only information
* No essential control hidden behind gestures only

Gestures may enhance the experience but must not be the only way to perform essential actions.

---

# 107. Security UI Rules

The frontend must never display:

* Raw authorization tokens
* Signed URLs unnecessarily
* DRM license information
* Internal media-server addresses
* Internal error traces

The UI should receive only the data necessary for playback.

---

# 108. Content Protection Principle

The platform should assume that valuable media requires protection.

Frontend principles:

```text
Do not expose storage architecture.
Do not expose permanent public media URLs.
Do not treat obscurity as security.
Do not trust frontend entitlement state.
```

Actual protection belongs to the backend/media infrastructure.

---

# 109. No Screenshot/Recording Claims

The frontend must not claim:

```text
Screen recording is impossible.
```

Browser-level content protection cannot guarantee that a customer cannot record a screen using another device.

Use realistic security language.

---

# 110. Watch Page Metadata

The page may expose:

* Title
* Description
* Episode number
* Season
* Version
* Category
* Country
* Duration

But sensitive customer entitlement details should not become public metadata.

---

# 111. URL Rules

Movie:

```text
/watch/movie/[slug]
```

Series:

```text
/watch/series/[seriesSlug]/season/[seasonNumber]/episode/[episodeNumber]
```

The URL should identify content, not expose sensitive customer information.

---

# 112. Deep Linking

A valid playback URL may be opened directly.

The application should:

```text
Load route
 ↓
Load content
 ↓
Authenticate if required
 ↓
Check access
 ↓
Open player
```

If access is unavailable:

```text
Access required
```

with appropriate purchase/subscription actions.

---

# 113. Invalid Playback Route

Example:

```text
Episode not found.

This episode may have been removed or is unavailable.

[ Back to Series ]
```

Do not crash the page.

---

# 114. Missing Media

If content exists but media is unavailable:

```text
This video is currently unavailable.

Please try again later.
```

For Media Team/Admin mock interfaces, this state may be represented differently.

Customer-facing UI should remain simple.

---

# 115. Customer vs Admin Playback

Admin and Media Team may preview content through different interfaces in the future.

Do not automatically reuse customer entitlement logic for administrative preview.

The customer player is an access-controlled consumption experience.

Administrative preview is a separate concern.

---

# 116. Subscription Playback

If content is accessed through subscription:

```text
Included with your subscription
```

may appear in playback information.

The player itself should not repeatedly advertise purchase options while access is active.

---

# 117. Individual Purchase Playback

If content was individually purchased:

```text
Purchased
```

may appear subtly.

Example:

```text
The Example Movie
DJ Mack
Purchased · Access until 12 Sep
```

The exact presentation should remain subtle.

---

# 118. Expiring Soon

If the backend returns an expiration date approaching:

```text
Access expires soon
```

may be shown outside the player.

Do not constantly interrupt playback.

---

# 119. Expiration Messaging

Use clear language:

```text
Access expires in 2 days.
```

rather than vague:

```text
Limited access.
```

when the exact information is available.

---

# 120. Watch Page Empty State

A watch page should not normally be empty.

If playback metadata cannot be loaded:

```text
Unable to load this content.

[ Try Again ]
```

---

# 121. Watch Page Error Recovery

Recovery hierarchy:

```text
Try Again
↓
Return to Content
↓
Browse
```

Do not send the customer to an unrelated page.

---

# 122. Player Overlay Philosophy

Overlays should communicate:

* State
* Action
* Context

Examples:

```text
Paused
```

```text
Loading
```

```text
Playback unavailable
```

```text
Next Episode
```

Do not use overlays for unnecessary promotional messages while the customer is actively watching.

---

# 123. Promotional Interruptions

GIFTEDproMovies should not interrupt purchased playback with unrelated promotional overlays unless a future business decision explicitly requires it.

The customer paid for a focused viewing experience.

---

# 124. Related Content Placement

Recommended:

```text
Player
 ↓
Playback Information
 ↓
Episode Navigation / Related Content
 ↓
Recommendations
```

Do not place large recommendation sections above the player.

---

# 125. Mobile Content Order

Mobile:

```text
Player
 ↓
Title
 ↓
Metadata
 ↓
Version
 ↓
Episode controls
 ↓
Description
 ↓
Related content
```

The player remains first.

---

# 126. Desktop Content Order

Desktop:

```text
Player
 ↓
Playback Information
 ↓
Episode / Series Context
 ↓
Related Content
 ↓
Recommendations
```

---

# 127. Player Full-Width Strategy

The player may use a wider cinematic container than normal content sections.

Example:

```text
Normal Content
max-width: 1440px

Player
may approach full viewport width
```

The exact implementation should balance immersion and usability.

---

# 128. Background Treatment

The watch page may use a subtle dark background.

Potentially:

```text
Near Black
+
Very subtle backdrop gradient
```

Do not use a strong poster background that reduces subtitle/control readability.

---

# 129. Poster Backdrop

If a poster/backdrop is used behind the player, it should:

* Be heavily darkened
* Have reduced contrast
* Avoid competing with the video
* Never reduce control readability

---

# 130. Player Border Radius

Desktop may use subtle rounding.

Mobile may use reduced or no rounding depending on viewport.

Do not force large rounded corners that make the player resemble a generic SaaS card.

---

# 131. Player Shadow

Use restrained depth.

The player should feel integrated into the cinematic page rather than floating as a giant card.

---

# 132. Motion Performance

Animations must primarily use:

```text
transform
opacity
```

Avoid animating layout-heavy properties repeatedly during playback.

---

# 133. No Continuous Decorative Animation

Do not animate:

* Background gradients continuously
* Player borders continuously
* Glow effects continuously
* Poster scale continuously

Playback itself is already dynamic.

---

# 134. Player Loading Skeleton

Before player metadata loads:

```text
┌──────────────────────────────┐
│                              │
│            ○                 │
│                              │
└──────────────────────────────┘
```

The loading state should resemble the eventual player structure.

---

# 135. Player State Machine

The frontend may conceptually model:

```text
IDLE
 ↓
LOADING
 ↓
CHECKING_ACCESS
 ↓
READY
 ↓
PLAYING
 ↓
PAUSED
 ↓
BUFFERING
 ↓
PLAYING
 ↓
COMPLETED
```

Error branches:

```text
LOADING
 ↓
ERROR

CHECKING_ACCESS
 ↓
ACCESS_DENIED

PLAYING
 ↓
PLAYBACK_ERROR
```

This state model should guide implementation.

---

# 136. State Priority

When multiple states occur simultaneously, prioritize:

```text
Critical Error
    ↓
Access State
    ↓
Buffering
    ↓
Playback State
    ↓
UI Controls
```

For example, if playback is buffering, a hidden control state should not prevent the buffering indicator from appearing.

---

# 137. Player Data Boundary

Recommended architecture:

```text
Watch Page
      ↓
Playback Controller
      ↓
Playback Repository
      ↓
Typed Mock Data
```

Future:

```text
Watch Page
      ↓
Playback Controller
      ↓
Playback Repository
      ↓
Backend / Media Service
```

The page should not directly call future APIs everywhere.

---

# 138. Mock Playback Repository

Possible conceptual methods:

```text
getPlaybackMetadata()
getPlaybackAccess()
getPlaybackProgress()
savePlaybackProgress()
getAvailableTracks()
getAvailableQualities()
```

These are abstractions, not mandatory exact function names.

---

# 139. No Backend API

During this frontend phase:

Do not implement:

```text
/api/playback
/api/stream
/api/entitlement
/api/progress
```

unless explicitly required by a future document.

Use the repository boundary instead.

---

# 140. Testing States

The frontend must be able to demonstrate:

```text
Movie Ready
Movie Loading
Movie Buffering
Movie Error
Access Granted
Access Expired
Access Denied
Series Episode Ready
Next Episode
No Media
Network Error
```

This is essential for QA.

---

# 141. Responsive Acceptance

The player must be tested at:

* Small mobile
* Large mobile
* Tablet portrait
* Tablet landscape
* Laptop
* Desktop
* Large desktop

The player must remain usable at every supported breakpoint.

---

# 142. Accessibility Acceptance

Before completion:

* [ ] Keyboard navigation works
* [ ] Focus states are visible
* [ ] Controls have accessible names
* [ ] Menus are keyboard accessible
* [ ] Captions/subtitles are accessible
* [ ] Status changes are communicated
* [ ] Reduced-motion behavior works
* [ ] Color is not the only state indicator
* [ ] Touch targets are sufficiently large

---

# 143. Performance Acceptance

Before completion:

* [ ] Player loads efficiently
* [ ] No unnecessary global rerenders
* [ ] Progress updates are controlled
* [ ] Event listeners are cleaned up
* [ ] Streaming instances are cleaned up
* [ ] No unnecessary animation loops
* [ ] Related content is lazy-loaded where appropriate
* [ ] Large assets are optimized
* [ ] Mobile performance is acceptable

---

# 144. Security Acceptance

Before completion:

* [ ] No payment credentials stored
* [ ] No raw sensitive tokens displayed
* [ ] No fake DRM implementation
* [ ] No claim that frontend state proves entitlement
* [ ] No permanent public playback URL assumption
* [ ] No cross-user progress leakage
* [ ] No cross-user entitlement leakage
* [ ] Version access remains isolated
* [ ] Backend remains the authoritative access layer

---

# 145. Customer Journey — Movie

Complete flow:

```text
Movie Details
      ↓
Watch
      ↓
Authentication if required
      ↓
Check Access
      ↓
Player Loading
      ↓
Playback
      ↓
Pause / Seek / Settings
      ↓
Resume Later
      ↓
Library → Continue Watching
      ↓
Complete
      ↓
Related Movies
```

---

# 146. Customer Journey — Purchased Movie

```text
Purchase Success
      ↓
Watch Now
      ↓
Access Granted
      ↓
Player
      ↓
Playback
```

The transition should be immediate and intentional.

---

# 147. Customer Journey — Subscription

```text
Subscription Active
      ↓
Movie Details
      ↓
Watch
      ↓
Access Granted
      ↓
Player
```

No unnecessary second purchase should be required if the content is included.

---

# 148. Customer Journey — Series

```text
Series Details
      ↓
Season
      ↓
Episode
      ↓
Watch
      ↓
Playback
      ↓
Episode Complete
      ↓
Next Episode
```

---

# 149. Customer Journey — Resume

```text
Library
 ↓
Continue Watching
 ↓
Movie
 ↓
Resume
 ↓
Playback at saved position
```

---

# 150. Customer Journey — Expired Access

```text
Library
 ↓
Expired Content
 ↓
Watch
 ↓
Access Expired
 ↓
Purchase Access
 ↓
Checkout
```

---

# 151. Anti-Patterns

Do not build:

* Generic HTML5 controls only
* Giant red player controls
* Netflix clone
* Excessive glassmorphism
* Permanent visible controls
* Tiny mobile controls
* Hover-only mobile interactions
* Fake DRM
* Fake payment authorization
* Raw storage URLs
* Hard-coded entitlement durations
* Hard-coded device limits
* Hard-coded subscription access
* Cross-version access
* Cross-user progress
* Continuous decorative animations
* Player pages dominated by recommendations
* Giant promotional banners above playback

---

# 152. Visual Quality Bar

The final player should feel:

**Cinematic**

not:

**Dashboard-like**

It should feel:

**Premium**

not:

**Over-designed**

It should feel:

**Simple**

not:

**Basic**

It should feel:

**Powerful**

without showing every capability at once.

---

# 153. Technical Principle

The player should follow:

```text
Simple UI
+
Strong abstraction
+
Authoritative backend
+
Efficient media layer
=
Professional streaming experience
```

The UI should remain clean even if the underlying media infrastructure becomes complex.

---

# 154. AI Coding Agent Directive

An AI coding agent implementing this document MUST:

1. Read all preceding frontend documents.
2. Treat this document as the streaming source of truth.
3. Preserve the GIFTEDproMovies visual language.
4. Never create a Netflix clone.
5. Never rely on hover for essential mobile interactions.
6. Never expose sensitive playback information.
7. Never implement fake DRM.
8. Never treat client state as authoritative entitlement.
9. Never hard-code access durations.
10. Never hard-code device limits.
11. Never silently switch DJ/Translator versions.
12. Never expose unrestricted protected media URLs.
13. Never create a fake production payment/access flow.
14. Keep playback logic behind a controller/adapter boundary.
15. Keep media access behind a repository boundary.
16. Keep playback progress isolated by customer/content/version/episode.
17. Implement loading, buffering, error, access-denied, and expiration states.
18. Implement responsive desktop and mobile behavior.
19. Implement keyboard accessibility.
20. Respect reduced motion.
21. Avoid unnecessary global React state updates on frequent playback events.
22. Clean up media/event resources.
23. Use mock playback data during frontend development.
24. Do not invent unsupported subtitle, audio, or quality options.
25. Do not invent final streaming infrastructure.
26. Do not implement backend services.
27. Ask for clarification if an unresolved business rule materially affects the UI.
28. Do not silently change established product rules.

---

# 155. Definition of Done

MD-17 is complete when a customer can experience:

```text
Open Content
     ↓
Check Access
     ↓
Open Player
     ↓
Play
     ↓
Pause
     ↓
Seek
     ↓
Adjust Volume
     ↓
Fullscreen
     ↓
Settings
     ├── Quality
     ├── Audio
     └── Subtitles
     ↓
Resume Later
     ↓
Continue Watching
     ↓
Complete
     ↓
Next Episode / Related Content
```

And the experience correctly handles:

```text
Loading
Buffering
Network Error
Playback Error
Access Denied
Access Expired
Content Unavailable
Authentication Expired
Series Navigation
Mobile Interaction
Desktop Interaction
Reduced Motion
Accessibility
```

---

# 156. Final Product Principle

The GIFTEDproMovies player should follow one simple rule:

> **When the customer is watching, the interface should get out of the way.**

Controls appear when needed.

Information appears when useful.

Errors explain what happened.

Access states explain what the customer can do next.

The movie remains the hero.

---

# 157. Next Document

The next document is:

`18_DOWNLOAD_UI.md`

It will define:

* Download experience
* Download eligibility
* Download CTA
* Download states
* Download progress
* Download library
* Download history
* Expiring downloads
* Protected download UX
* Device context
* Download failure/retry
* Offline/download presentation
* Mobile download behavior
* Desktop download behavior
* Access expiration
* Download vs streaming separation
* Customer library integration
* Security boundaries
* Mock download architecture
* Accessibility
* Performance
* AI coding-agent rules
* Definition of Done
