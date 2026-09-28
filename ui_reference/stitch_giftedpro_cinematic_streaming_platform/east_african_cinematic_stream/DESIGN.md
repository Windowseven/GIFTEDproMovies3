---
name: East African Cinematic Stream
colors:
  surface: '#121317'
  surface-dim: '#121317'
  surface-bright: '#38393e'
  surface-container-lowest: '#0d0e12'
  surface-container-low: '#1a1b20'
  surface-container: '#1f1f24'
  surface-container-high: '#292a2e'
  surface-container-highest: '#343439'
  on-surface: '#e3e2e8'
  on-surface-variant: '#e9bcb6'
  inverse-surface: '#e3e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#af8782'
  outline-variant: '#5e3f3b'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#690003'
  primary-container: '#e50914'
  on-primary-container: '#fff7f6'
  inverse-primary: '#c0000c'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#a7c8ff'
  on-tertiary: '#003061'
  tertiary-container: '#0072d7'
  on-tertiary-container: '#f8f9ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930007'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#a7c8ff'
  on-tertiary-fixed: '#001b3c'
  on-tertiary-fixed-variant: '#004689'
  background: '#121317'
  on-background: '#e3e2e8'
  surface-variant: '#343439'
typography:
  display-hero:
    fontFamily: Bebas Neue
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 56px
  display-hero-mobile:
    fontFamily: Bebas Neue
    fontSize: 38px
    fontWeight: '400'
    lineHeight: 40px
  headline-xl:
    fontFamily: Bebas Neue
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 38px
  headline-xl-mobile:
    fontFamily: Bebas Neue
    fontSize: 26px
    fontWeight: '400'
    lineHeight: 30px
  headline-lg:
    fontFamily: Bebas Neue
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 28px
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-dj:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
  label-badge:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
  label-price:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-voltage, cinematic streaming experience engineered specifically for East African audiences and Swahili video jockey (DJ translator) action cinema culture. The interface bridges the polished, content-forward darkness of global entertainment platforms with localized, community-anchored cues tailored to East African viewership.

### Brand Personality & Emotional Impact
- **Cinematic Urgency:** Immersive OLED backdrops pull the eye instantly toward content artwork, while electric crimson highlights evoke theatrical excitement and premium adrenaline.
- **Street Authority & Localization:** Prominent DJ tagging honors the cultural prestige of localized commentary (such as DJ Afro, DJ Murphy, DJ Smith, and DJ Black). Vibrant gold/amber VIP and translator insignias convey exclusivity, credibility, and grassroots stardom.
- **Frictionless Trust:** Clear Tanzanian Shilling (TSh) micro-pricing, rapid download options, and tactile mobile-money payment cues foster absolute transparency and trust for high-velocity local transactions.

### Aesthetic Foundation
The aesthetic operates as a fusion of **OLED Dark Minimalism** and **Neon-Infused Glassmorphism**. UI elements emerge organically from deep charcoal and absolute black canvas layers. Cards and panels rely on delicate light refraction, high-contrast badges, micro-borders with crimson undertones, and tactile pill shapes configured for intuitive thumb-reach ergonomics on mobile devices.

## Colors

The palette is tuned specifically for low-light, high-contrast viewing on OLED mobile screens and television monitors, while ensuring high legibility for localized metadata, DJ identities, and transactional pricing.

### Core Roles & Tokens
- **Primary Canvas & Surfaces:**
  - `canvas-pitch`: `#000000` (Hero backdrops, edge bleed, full-screen playback chrome)
  - `surface-base`: `#0B0C10` (Root view background, deep obsidian tone)
  - `surface-card`: `#121216` (Content tiles, movie cards, bottom sheets)
  - `surface-raised`: `#1A1B22` (Modals, popovers, active selection states)
  - `surface-overlay`: `rgba(11, 12, 16, 0.82)` (Frosted glass backdrops with 16px blur)

- **Primary Accent (Crimson Core):**
  - `primary-default`: `#E50914` (Watch CTA, active tabs, progress bars, trailer triggers)
  - `primary-hover`: `#FF1E27` (Hover states, illuminated border edges, focus rings)
  - `primary-glow`: `rgba(229, 9, 20, 0.28)` (Subtle backlighting around active cards and primary CTAs)

- **Secondary Accent (DJ Gold & VIP):**
  - `secondary-gold`: `#F59E0B` (DJ badge accents, VIP Translator tags, seasonal subscriptions)
  - `secondary-gold-glow`: `rgba(245, 158, 11, 0.25)` (Spotlight ring for premier releases)

- **Functional & Local Commerce:**
  - `commercial-green`: `#10B981` (TSh pricing tags, M-Pesa / Tigopesa / Airtel Money instant success indicators)
  - `text-high`: `#FFFFFF` (Headings, active icons, titles)
  - `text-medium`: `#A1A1AA` (Durations, genre tags, localized audio credits)
  - `text-muted`: `#646470` (Inactive tabs, auxiliary timestamps, legal copy)
  - `border-glass`: `rgba(255, 255, 255, 0.08)` (Subtle hairline separation)

## Typography

The type scale combines dramatic condensed theatrical impact with precise, legible metadata designed to render clearly on diverse mobile displays under varying outdoor and indoor lighting conditions.

### Architectural Hierarchy
- **Theatrical Titles (Bebas Neue):** Reserved for movie titles, billboard carousels, section titles, and high-impact category banners. Its condensed vertical rhythm evokes cinema marquees and action movie posters without consuming excessive horizontal space.
- **Narrative & UI (Manrope):** Delivers clean humanist geometric clarity for movie synopses, actor/director lists, and transactional flow descriptions. Its open counters ensure readability at small sizes.
- **Technical & Commerce Tokens (Space Grotesk):** Provides structured, monospace-leaning legibility for audio stream specifications (e.g., `SWAHILI STEREO`, `ENGLISH DUAL`), resolution pills (`4K UHD`, `FHD 1080p`), DJ metadata tags (`DJ AFRO`), and currency figures (`TSh 1,000 / Pakua`).

## Layout & Spacing

The layout is built around a dynamic fluid grid engineered for horizontal media rails and vertical thumb navigation.

### Viewport Behavior
- **Mobile (< 768px):** 4-column layout with `margin-mobile: 1rem` and `gutter-mobile: 0.75rem`. Media feeds snap horizontally with partial card cutoffs (2.2 cards visible) to prompt horizontal discovery. Key user interactions anchor to the bottom 40% of the screen.
- **Tablet (768px - 1024px):** 8-column layout with 3.5 to 4 visible cards per carousel row, expanding padding for quick touch scrubbing.
- **Desktop & Smart TV (> 1024px):** 12-column layout bounded by a max-width of `1600px`. Standard row displays 6 cards with edge gradient masks indicating continuous scroll.

### Horizontal Carousels & Rails
Poster card carousels use a gap of `space-sm` on mobile and `space-md` on larger screens. Rail margins align directly with outer canvas margins so cards bleed off-screen smoothly, reinforced by zero-opacity radial fades at viewport boundaries.

## Elevation & Depth

Rather than conventional drop shadows, depth is communicated through light concentration, selective blur, and glowing borders set against pitch-black canvas tiers.

### Depth Stratification
- **Tier 0 (Base Void):** Flat `#000000` to `#0B0C10`. Absolute background layer for minimal battery draw on OLED panels.
- **Tier 1 (Resting Tiles & Cards):** `#121216` with a hairline top border of `1px solid rgba(255, 255, 255, 0.06)`. No outer shadow.
- **Tier 2 (Card Hover & Focused Row):** Scaled `1.04x` with an outer crimson luminescence: `box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.9), 0 0 16px -2px rgba(229, 9, 20, 0.45)` and border transition to `rgba(229, 9, 20, 0.6)`.
- **Tier 3 (Floating Chrome & Modals):** Frosted glass surfaces with `backdrop-filter: blur(20px)` and background `rgba(18, 18, 22, 0.75)`, capped with a hairline border `rgba(255, 255, 255, 0.12)`.
- **Tier 4 (Critical Checkout & Player Overlays):** `#181820` with a sharp amber or crimson halo ring signifying active mobile transactions or full-screen audio routing.

## Shapes

The design system maintains a **Soft** shape rhythm (`roundedness: 1`), balancing the razor-sharp edge of high-octane cinema with tactile, thumb-friendly interfaces.

### Corner Radius System
- **Poster Cards & Media Tiles:** `0.25rem` (`4px`). Tight corner radii keep thumbnail posters looking crisp, cinematic, and true to studio framing without clipping title art.
- **Buttons & Action Triggers:** `0.25rem` to `0.5rem` (`4px` to `8px`). Preserves an assertive, geometric presence for "Watch Now" and "Download" buttons.
- **DJ & Technical Chips:** Fully rounded pill format (`9999px`) reserved strictly for micro-meta tags (e.g., DJ identity, resolution, audio track) to distinctly separate metadata from clickable content cards.
- **Bottom Sheets & Modal Dialogs:** Top-left and top-right corners styled at `1rem` (`16px`), creating a natural organic drape as panels slide up from the bottom mobile bezel.

## Components

### 1. Action Buttons
- **Primary CTA ("Tazama Sasa / Watch"):** High-intensity `#E50914` background, pure white bold text, subtle inner top edge highlight (`inset 0 1px 0 rgba(255,255,255,0.2)`). On press, scales to `0.98` with crimson radiance.
- **Secondary CTA ("Pakua / Download"):** Translucent background `rgba(255, 255, 255, 0.08)`, white text, hairline border `rgba(255, 255, 255, 0.16)`. Hover triggers surface illumination to `rgba(255, 255, 255, 0.15)`.
- **Mobile Sticky Action Bar:** Fixed to viewport bottom with dual buttons: a quick stream trigger alongside an offline download trigger with integrated TSh pricing.

### 2. DJ Identifier & Media Chips
- **DJ Pills:** Pill-shaped badge featuring a high-contrast black fill with an electric amber border (`1px solid #F59E0B`) and amber typography. Accompanied by a mini soundwave or mic icon for verified translator profiles (e.g., `DJ AFRO`, `DJ MURPHY`).
- **Format Badges:** Micro-rectangles (`roundedness: 0px` to `2px`) with semi-opaque charcoal backgrounds and ultra-crisp white technical typography: `4K`, `HD`, `DUAL AUDIO`.

### 3. Movie Poster Cards
- **Aspect Ratio:** Vertical `2:3` standard poster ratio.
- **Card Framing:** Micro-border `1px solid rgba(255, 255, 255, 0.05)` at rest. Bottom gradient vignette (`linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)`) housing the localized title, the DJ badge on the top-left, and the TSh purchase/free status on the top-right.

### 4. Bottom Sheets & Checkout Modals
- **Triggered Experience:** Slide-up sheet with persistent drag handle (`36px x 4px`, `rgba(255, 255, 255, 0.2)`).
- **Payment Providers:** Modular tactile cards for M-Pesa, Tigo Pesa, Airtel Money, and Halopesa. Selected payment card receives a vibrant emerald green micro-border (`#10B981`) and auto-focuses the phone number input field.

### 5. Input Fields
- **Design:** Dark fill (`#121216`), inset border `1px solid rgba(255, 255, 255, 0.12)`, typed text in `#FFFFFF`, and helper labels in `Space Grotesk` (`12px`). Focus triggers a sharp `#E50914` border outline with zero elevation bleed.