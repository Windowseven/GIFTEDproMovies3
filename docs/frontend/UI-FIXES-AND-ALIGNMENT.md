# Frontend UI Fixes and Architecture Alignment

> **Status:** Tracking document for future frontend integration/alignment. This document records required alignment; it does not authorize or implement frontend changes.
> **Authority:** Accepted product decisions and `docs/architecture/01`–`16`.

## Purpose

Record frontend contradictions that must be addressed during a separately authorized frontend/backend integration pass. Preserve the existing frontend as product evidence, but treat mock repositories, local state, hardcoded values, and sample media/payment flows as non-authoritative implementation details. Backend responses and authorization decisions are authoritative.

## Required alignment

| Area | Required future UI behavior |
| --- | --- |
| Purchase authentication | Remove guest checkout paths. Require authenticated customer before any movie, episode, season, full-series, download, or subscription purchase. |
| Subscription renewal | Describe one-time/manual renewal. Do not imply automatic recurring billing. |
| Subscription benefits | Explain unlimited streaming only for eligible catalog content during active validity; downloads remain limited by the applicable configured policy. |
| Commercial values | Load prices, currency, subscription duration, eligibility, download limit/type, device limit, and concurrent-stream limit from backend/Admin-owned policy. Do not retain hardcoded commercial limits as authority. |
| Purchased subscription terms | Where shown, represent the terms captured for that purchase period. Later Admin plan edits do not rewrite existing subscription rights; manual renewal uses current terms. |
| Payment result | Treat frontend redirect/callback as informational. Show payment succeeded separately from access processing, access available, and fulfillment recovery required. Never require another payment solely because browser redirect or fulfillment processing failed. |
| Payment/download mock flows | Replace fake payment confirmation and fake media/download behavior during integration with backend/provider-mediated flows. |
| Notifications | Replace static/toast-only notification assumptions with backend-owned persistent in-app history/read state and confirmed email flows. Toasts remain transient feedback. |
| Authentication | Replace mock/local authentication with backend email/password, required email verification, separate email password recovery, and backend-authoritative session state. Reflect session expiry and reauthentication. |
| Session management | Support logout and logout-all; future active-session management must reflect independently revocable sessions and must not conflate sessions with devices or active streams. |
| Device management | Show recognized/registered devices separately from sessions and active streams. At device capacity require explicit removal/revocation; do not silently replace another device. Removing a device invalidates its sessions, not purchased entitlements. |
| Streaming limits | Show active playback devices/sessions where appropriate. Distinguish stream-limit errors from device-limit errors. Playback UI state such as `isPlaying` is not authorization. |
| Download quota | Display backend-reported quota and usage. Do not calculate or enforce quota in the UI. A click alone does not consume quota; backend-authorized protected download attempts use atomic `UNIQUE_TITLES` or `DOWNLOAD_ACTIONS` policy. |
| Media authorization | Request backend authorization for each streaming/download operation. Do not expose public media URLs or assume short-lived access is DRM/anti-copy protection. Streaming should permit normal seeking/resume Range requests during valid access. |
| Media Team pricing | Remove Media Team price-edit capability. Media Team may view commercial metadata only where authorized; pricing is Admin-only. |
| Taxonomy | Replace direct Media Team creation of canonical taxonomy with Media Team request → Admin review/approval, represented by persistent Admin notification. |
| Publishing permissions | Reflect member-specific publishing capability. A user without it prepares content for review; publication requires backend readiness validation at 100%. UI readiness is not authoritative. |
| Content readiness | Align the step-by-step wizard with fixed backend-defined, per-content-type readiness rules, including `NOT_APPLICABLE` where returned by backend. Publishing is revalidated server-side. |
| Content lifecycle | Distinguish unpublish, archive, delete, and exceptional access revocation. Unpublish/archive remove public/active catalog availability but preserve valid entitlements. Delete must not silently destroy commercial/audit history. |
| Access status | Do not equate “content unavailable” with “entitlement expired/revoked.” Show catalog status and customer access status as separate facts. Access revocation requires an authorized audited action and customer notification. |

## Implementation boundary

This list is for a future UI alignment task. It does not specify route paths, visual design, endpoint contracts, or additional notification triggers. Exact endpoint contracts are defined separately in ARCH-004; pending media/download/session/notification policies remain pending in ARCH-016. Do not invent download retry semantics, email templates, token lifetimes, or refund behavior in the UI.

## Future UI & Interaction References

### Dqnamo Receipt Printer
- **Reference:** [https://www.dqnamo.com/experiments/receipt-printer](https://www.dqnamo.com/experiments/receipt-printer)
- **Component:** Dqnamo Receipt Printer
- **Context & Future Role:** Future UI/interaction reference for a receipt-printing simulation, especially where a relevant checkout or payment-success experience exists in GIFTEDproMovies.
- **Demonstrated Features:**
  - A simulated receipt printer and receipt-paper animation.
  - Processing, printing, and completion states.
  - An itemized receipt and payment confirmation.
  - An animated interaction that makes the payment-success experience more tangible.
- **Status & Important Constraints:**
  - **Marked as a future consideration only — not approved for implementation yet.**
  - Must not expand the current task's scope.
  - This is currently a design reference only. Do not assume it provides actual physical-printer integration.
  - Do not install, copy, or integrate it during this task.
  - Review its implementation compatibility and reuse/licensing terms before adopting any code.
