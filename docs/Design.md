# SHADØW Tournaments — Complete Web Interface Design Specification
### For Google Stitch · Version 2.0 · Full Detail

---

## PART 1 — DESIGN FOUNDATION

---

### 1.1 Design Philosophy

**Minimal. Confident. Cinematic.**

This is not a loud esports site. Think high-end sneaker drop page meets Bloomberg Terminal. Every element earns its place. Negative space is a weapon. The palette is restrained — three colors, zero exceptions. Animations are purposeful, not decorative.

> Reference mood: Apple × Vercel × Nike × Bloomberg Terminal × Cyberpunk HUD

Three words to feel every time you open a page: **Premium. Sharp. Alive.**

---

### 1.2 Color System — 3 Colors Only

No purple. No cyan. No blue. No green. Ever.

```
Background Family
  --black:          #070708    Page bg, deepest layer
  --black-mid:      #0f0f12    Cards, nav when scrolled, panels
  --black-high:     #1a1a1f    Hover surfaces, input bg, elevated panels
  --black-raised:   #22222a    Tooltips, dropdowns, highest surface

Gold Family (Primary Accent)
  --gold:           #c9a84c    CTAs, active states, borders, headings
  --gold-light:     #e8c46a    Hover state on gold
  --gold-bright:    #f0d080    Text on very dark bg, shimmer highlight
  --gold-dim:       rgba(201,168,76,0.12)   Low-opacity fills, badge bg
  --gold-faint:     rgba(201,168,76,0.06)   Subtle background tints
  --gold-border:    rgba(201,168,76,0.20)   Card borders, dividers
  --gold-glow:      rgba(201,168,76,0.40)   Box shadow glows

Red Family (Danger, Live, Destructive)
  --red:            #c0392b    LIVE status, danger, errors
  --red-light:      #e74c3c    Hover state
  --red-dim:        rgba(192,57,43,0.12)    Badge fills, tinted bg
  --red-border:     rgba(192,57,43,0.25)    Red bordered elements

White / Text
  --white:          #f5f0e8    Primary text, headlines
  --white-80:       rgba(245,240,232,0.80)  Strong secondary text
  --white-50:       rgba(245,240,232,0.50)  Body paragraphs
  --white-30:       rgba(245,240,232,0.30)  Muted labels, placeholders
  --white-10:       rgba(245,240,232,0.10)  Dividers, subtle borders
  --white-05:       rgba(245,240,232,0.05)  Ultra-subtle borders
```

---

### 1.3 Typography

**Three fonts. No substitutions.**

| Role | Font | Weight | Use case |
|---|---|---|---|
| Display | Orbitron | 900 Black | Page H1, hero titles, tournament names |
| Heading | Orbitron | 700 Bold | Section headers, card titles, nav brand, stat numbers |
| Heading Light | Orbitron | 400 Regular | Sub-headings where bold is too heavy |
| Body | Inter | 400 Regular | Paragraphs, descriptions, form labels |
| Body Medium | Inter | 500 Medium | Secondary labels, metadata |
| Body Bold | Inter | 600 SemiBold | Button labels, emphasis, table headers |
| Mono | JetBrains Mono | 400 Regular | IDs, timestamps, codes, step numbers, status tags |
| Mono Bold | JetBrains Mono | 700 Bold | Important mono labels |

**Type Scale (px → rem):**
```
Hero H1:        clamp(2.8rem, 7vw, 5.5rem)   Orbitron 900, lh 1.0, ls -0.02em
Page H1:        clamp(1.8rem, 3.5vw, 2.8rem) Orbitron 700, lh 1.1
Section H2:     clamp(1.4rem, 2.5vw, 2.0rem) Orbitron 700, lh 1.15
Card title:     1.125rem (18px)               Orbitron 700
Sub-title:      0.9375rem (15px)              Orbitron 400
Body large:     1.0625rem (17px)              Inter 400, lh 1.7
Body base:      0.875rem (14px)               Inter 400, lh 1.65
Body small:     0.8125rem (13px)              Inter 400, lh 1.6
Caption:        0.75rem (12px)                Inter 500, lh 1.5
Mono label:     0.6875rem (11px)              JetBrains Mono, ls 0.15em
Mono tiny:      0.625rem (10px)               JetBrains Mono, ls 0.20em, ALL CAPS
```

---

### 1.4 Spacing System

Base unit: 4px

```
4px    xs    — icon gaps, tight padding
8px    sm    — internal card spacing
12px   md-   — between label and value
16px   md    — standard element padding
20px   md+   — card padding small
24px   lg    — card padding standard
32px   xl    — section internal padding
40px   2xl   — between content blocks
48px   3xl   — section padding mobile
64px   4xl   — section padding tablet
80px   5xl   — section padding desktop
96px   6xl   — hero vertical padding
128px  7xl   — maximum section gap
```

---

### 1.5 Geometry — Border Radius

```
2px   — thin accent bars, progress fills
4px   — tags, mono labels, tiny chips
6px   — buttons
8px   — icon containers, small cards, dropdowns
10px  — inputs, select menus
12px  — small panels, tooltips
14px  — overlay drawers
16px  — standard cards
18px  — tournament cards
20px  — larger panels
24px  — banners, CTA panels
28px  — hero containers, final CTA
9999px — pill badges, toggles
```

---

### 1.6 Motion System

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` for all primary entrances
**Micro-interaction easing:** `cubic-bezier(0.4, 0, 0.2, 1)` for hover state changes

#### Animation Catalog

| ID | Name | Trigger | Description | Duration |
|---|---|---|---|---|
| A01 | `page-enter` | Route change | Opacity 0→1, Y +24px→0 | 600ms |
| A02 | `card-appear` | IntersectionObserver | Opacity 0→1, Y +28px→0, scale 0.97→1 | 480ms |
| A03 | `hero-word-reveal` | Page load | Each word slides up from `clip-path: inset(0 0 100% 0)` | 600ms, 40ms stagger per word |
| A04 | `gold-shimmer` | Hover on gold surface | White gradient sweeps left→right inside element | 500ms |
| A05 | `live-pulse` | Continuous on LIVE dot | scale 1→1.5→1, opacity 1→0.4→1 | 1.4s, infinite |
| A06 | `conic-spin` | Hover on tournament card | `::before` conic gradient rotates 360° | 4s, linear, infinite |
| A07 | `float` | Continuous on 3D emblem | translateY 0→−14px→0 | 3.5s, ease-in-out, infinite |
| A08 | `scanline` | Continuous on HUD panels | 2px bar sweeps top→bottom at 4% opacity | 10s, linear, infinite |
| A09 | `counter-up` | IntersectionObserver on stat | Number ticks from 0 → target | 1.2s, ease-out |
| A10 | `magnetic-tilt` | Mouse move over card | 3D rotateX/Y ±6deg, spring stiffness 200 damping 22 | Continuous |
| A11 | `underline-grow` | Nav link hover | `::after` scaleX 0→1, origin left | 220ms |
| A12 | `stagger-list` | IntersectionObserver | Children enter with 80ms stagger, each A02 | Per child |
| A13 | `sidebar-collapse` | Click toggle | Width 200px→56px, AnimatePresence on labels | 300ms |
| A14 | `tab-indicator` | Tab click | Pill slides to active tab via layoutId | Spring, stiffness 300 damping 30 |
| A15 | `step-connector` | Scroll | Line draws from left→right via scaleX | 600ms, delayed |
| A16 | `accordion-open` | Click | Height auto, clip-path reveal | 280ms |
| A17 | `toast-slide` | Action complete | Slides in from bottom-right | 350ms |
| A18 | `modal-scale` | Open trigger | Scale 0.92→1, opacity 0→1 | 300ms |
| A19 | `progress-fill` | Mount | scaleX 0→fill%, origin left | 800ms, ease-out |
| A20 | `breadcrumb-enter` | Route change | Each crumb fades in, 60ms stagger | 300ms |

#### Reduced Motion
All keyframe animations removed. Transition durations set to 0.01ms. `spring` animations replaced with instant. Framer Motion `reducedMotion: "user"` globally.

---

### 1.7 Layout Grid

```
Max content width:    1320px
Outer page padding:   clamp(1.25rem, 5vw, 5rem)
Column gap:           24px (cards)
Section gap:          32px (between major sections inside a page)
Page section padding: clamp(4rem, 8vw, 8rem) vertical
```

---

### 1.8 Shadows

```
--shadow-xs:  0 1px 3px rgba(0,0,0,0.4)
--shadow-sm:  0 2px 8px rgba(0,0,0,0.5)
--shadow-md:  0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)
--shadow-lg:  0 8px 32px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)
--shadow-xl:  0 16px 48px rgba(0,0,0,0.6)
--shadow-gold: 0 0 24px rgba(201,168,76,0.35)
--shadow-red:  0 0 16px rgba(192,57,43,0.4)
--shadow-card: 0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,76,0.08)
```

---

### 1.9 3D Scene Specification (Three.js / R3F)

Used **only** on the Landing Page hero. No other page has a 3D canvas.

**Canvas:** Right half of hero, 500px tall, transparent background, `dpr={[1, 1.5]}`

**Geometry:**
- Core: `IcosahedronGeometry(1.4, 1)` — solid, `MeshStandardMaterial`, color `#c9a84c`, metalness 0.95, roughness 0.05, emissive `#8a6820` intensity 0.4
- Inner spin: `OctahedronGeometry(1.0)` — wireframe, color `#c0392b`, counter-rotates on X+Z
- Outer shell: `IcosahedronGeometry(2.2, 1)` — wireframe, color `#f5f0e8` at 12% opacity
- Ring 1: `TorusGeometry(2.5, 0.022, 8, 96)` — gold, 50% opacity, rotates X
- Ring 2: `TorusGeometry(3.1, 0.016, 8, 96)` — red, 30% opacity, rotates Y
- Ring 3: `TorusGeometry(3.7, 0.012, 8, 128)` — white, 15% opacity, rotates X+Y
- Particles: 1000 points, gold `#c9a84c`, spherical spread r=4–12, slow drift + global Y rotation

**Lighting:**
- `AmbientLight` intensity 0.08
- `PointLight` [6,6,6] intensity 3.0 color `#c9a84c`
- `PointLight` [−6,−4,4] intensity 2.0 color `#c0392b`

**Post-processing:**
- `Bloom` luminanceThreshold 0.2, intensity 1.5, radius 0.55
- No ChromaticAberration (keeps the minimal feel)

**HUD overlay (HTML, positioned over canvas):**
- Four 14×14px corner brackets in gold stroke
- Bottom bar: `SHADØW / CORE v2.0` (left) and `01 — BUILT TO COMPETE` (right), JetBrains Mono 9px, white 20%
- Bottom fade: `linear-gradient(180deg, transparent 55%, #070708 100%)`

---

## PART 2 — GLOBAL COMPONENTS

---

### 2.1 Navigation Bar (appears on every page)

**File:** `apps/web/src/components/ui/Navigation.tsx`

**Behavior states:**
1. **Landing transparent:** `background: transparent`, no border, no blur
2. **Scrolled / any inner page:** `background: rgba(7,7,8,0.92)`, `backdrop-filter: blur(20px)`, `border-bottom: 1px solid rgba(201,168,76,0.10)`, `box-shadow: 0 4px 24px rgba(0,0,0,0.5)`
3. **Admin pages:** same as scrolled but with admin indicator

**Height:** 72px fixed. `position: fixed`, `z-index: 50`.

**Inner layout (1320px container, 3 zones):**

```
LEFT                    CENTER                          RIGHT
────────────────────────────────────────────────────────────
[◇ SHADØW               [Platform  Tournaments          [Browse Servers]  [Login →]
   TOURNAMENTS]          Teams  Docs]
```

**Logo mark:**
- SVG diamond/hexagon, gold stroke 1.5px, no fill, 26×26px
- "SHADØW" Orbitron 700, 14px, `#f5f0e8`
- "TOURNAMENTS" JetBrains Mono 400, 7px, `#c9a84c`, tracking 0.20em
- Hover: diamond SVG gets `filter: drop-shadow(0 0 6px rgba(201,168,76,0.7))`
- Click → `/`

**Nav links (center):**
- Inter 600, 12px, `rgba(245,240,232,0.45)`
- Hover: color → `#f5f0e8` + gold `::after` underline grows scaleX 0→1 (220ms)
- Active: `#c9a84c` + permanent underline
- Links: Platform / Tournaments / Teams / Docs

**Browse Servers (ghost):**
- Transparent bg, `rgba(245,240,232,0.06)` border, white-50 text, 12px
- Hover: border → `rgba(201,168,76,0.25)`, text → white-80

**Login with Discord (gold CTA):**
- `background: #c9a84c`, text `#070708`, Inter 600, 13px, height 40px, padding 0 20px, border-radius 6px
- Hover: `background: #e8c46a` + `box-shadow: 0 0 24px rgba(201,168,76,0.4)` + shimmer sweep
- Shows when logged out

**User avatar + dropdown (when logged in):**
- 32px avatar circle, `border: 1.5px solid rgba(201,168,76,0.35)`
- Role tag next to name (SERVER_ADMIN=red, TOURNAMENT_MANAGER=gold, REFEREE=white-50)
- Click → dropdown: My Servers / Log Out
- Dropdown: `background: #0f0f12`, `border: 1px solid rgba(201,168,76,0.15)`, shadow-lg, `border-radius: 10px`

**Notification bell:**
- White-30, hover white-80
- Unread dot: 6px, gold, pulses (A05 behavior but gold)
- Dropdown: same style as user dropdown

**Mobile (< 768px):**
- Logo + hamburger icon only
- Hamburger tap → drawer slides down, full width, dark bg
- Drawer items: vertical list, gold left border on active

**Entrance animation:** `translateY(-72px) → 0`, opacity 0→1, 600ms, A01 easing. Runs once on page load.

---

### 2.2 Status Bar (HUD footer strip)

**File:** `apps/web/src/components/ui/StatusBar.tsx`

Sticky bottom bar, 36px tall, only on admin/dashboard pages.

```
[● SHARD AP-SOUTH-1 ONLINE]   [UTC CLOCK: 14:23:07]   [TICK 60Hz · P2P]
```

- `background: rgba(4,4,8,0.97)`, `border-top: 1px solid rgba(201,168,76,0.08)`
- All text JetBrains Mono 9px, white-30
- Green dot = online, red dot = offline
- Clock ticks every second (live JS)
- A08 scanline runs across it

---

### 2.3 Breadcrumb

**File:** `apps/web/src/components/ui/CyberBreadcrumb.tsx`

Used on all inner pages below the nav.

```
SHADØW  /  Legendary Arena  /  Tournaments  /  Nightfall Series
```

- JetBrains Mono 10px, ALL CAPS, tracking 0.18em
- Items: white-30
- Separators `/`: white-10
- Current page: gold, no link
- Hover on links: white-60
- Entrance: A20 stagger

---

### 2.4 Page Transition Wrapper

**File:** `apps/web/src/components/ui/PageTransition.tsx`

Every page is wrapped. On route change: current page fades + slides out (Y+20px, 250ms), new page fades + slides in (A01).

---

## PART 3 — PAGE SPECIFICATIONS (31 Pages)

---

## GROUP A — PUBLIC PAGES (no login required)

---

### PAGE 01 — Landing Page `/`

**File:** `apps/web/src/app/page.tsx` + `components/LandingPage.tsx`
**Layout:** Root layout only (no sidebar)

**Purpose:** Convert visitors into Discord-authenticated users. Showcase the platform.

---

#### SECTION 1 — Navigation
→ See 2.1. Transparent state.

---

#### SECTION 2 — Hero

**Full viewport height (100svh). No scroll inside it.**

```
┌─────────────────────────────────────────────────────────────┐
│                                           │                  │
│  [Status chip]                            │                  │
│                                           │  THREE.JS        │
│  YOUR SERVER.                             │  CANVAS          │
│  YOUR ARENA.  ← gold glow                │  500px tall      │
│  YOUR LEGACY.                             │                  │
│                                           │  HUD corners     │
│  [Body text 17px]                         │  + caption       │
│                                           │                  │
│  [Login CTA]  [Explore →]                 │                  │
│                                           │                  │
│  ✓ Free   ✓ Discord identity              │                  │
│  BGMI / FREE FIRE / COD MOBILE            │                  │
│                                           │                  │
└─────────────────────────────────────────────────────────────┘
```

**Status chip:** JetBrains Mono 10px, gold text, `border: 1px solid rgba(201,168,76,0.25)`, border-radius 4px, no fill, padding 4px 10px
Text: `DISCORD-NATIVE · COMPETITION-READY`

**H1:** Orbitron 900, `clamp(2.8rem,7vw,5.5rem)`, white. "YOUR ARENA." on its own line in `#c9a84c` with `text-shadow: 0 0 32px rgba(201,168,76,0.45)`. Each word enters with A03 hero-word-reveal.

**Body:** Inter 400, 17px, white-50, line-height 1.7, max-width 520px

**CTAs:**
- Primary: gold bg `#c9a84c`, black text `#070708`, "Login with Discord", Inter 600, 14px, height 52px, px-7, border-radius 6px. Has discord gamepad icon left. Hover: shimmer A04 + glow.
- Secondary: transparent, `border: 1px solid rgba(245,240,232,0.10)`, white-60 text, "Explore the platform →". Hover: border → `rgba(201,168,76,0.2)`, text white-80.

**Trust row:** Two items, JetBrains Mono 11px, white-30. Dot before each: 5px, gold.

**Right 3D zone:**
- Container: `border: 1px solid rgba(201,168,76,0.14)`, `border-radius: 16px`, height 500px, `background: rgba(8,8,12,0.5)`, `box-shadow: 0 0 80px rgba(201,168,76,0.08)`
- HUD corner brackets (see 1.9)
- A07 float on the canvas container div

**Scroll behavior:** Entire section `opacity` fades from 1→0, `y` shifts 0→−60px over first 60% of hero scroll depth (Framer Motion `useScroll` + `useTransform`).

---

#### SECTION 3 — Marquee Strip

56px tall strip immediately below hero.
- `background: rgba(201,168,76,0.03)`, borders top+bottom `rgba(201,168,76,0.08)`
- Text: Orbitron 700, 13px. Pattern: `BGMI  ✦  FREE FIRE  ✦  COD MOBILE  ✦` repeating
- Colors: cycle gold / white-30 / red per game
- `✦` divider: white-10
- Fade mask: 120px on each side, `linear-gradient(to right, #070708, transparent)` and reverse
- Scroll: infinite loop, pausable on hover (A04 variant)

---

#### SECTION 4 — Features / Platform

**Eyebrow:** JetBrains Mono, `01 / THE COMPETITIVE ADVANTAGE`, gold, 10px, ALL CAPS, tracking 0.25em
**H2:** "LESS CHAOS. MORE GAME."
**Sub:** Inter 400, 14px, white-40, max-width 520px

**3-column card grid (24px gap):**

Each feature card:
```
┌──────────────────────────────┐
│ [Gold top accent line]        │
│ [Icon box 44×44]              │
│                              │
│ Card Title  ← Orbitron 700   │
│                              │
│ Description text 13px        │
│                              │
│ Learn more →  ← gold         │
└──────────────────────────────┘
```
- `background: #0f0f12`, `border: 1px solid rgba(245,240,232,0.05)`, `border-radius: 16px`, padding 28px
- Top accent bar: 1px, `linear-gradient(90deg, #c9a84c, transparent)`, opacity 0 by default → 1 on hover
- Hover: gold radial glow from top center, magnetic tilt A10
- Icon container: 44×44px, `border-radius: 10px`, `background: rgba(201,168,76,0.08)`, `border: 1px solid rgba(201,168,76,0.20)`, Lucide icon 20px gold
- On icon hover: `filter: drop-shadow(0 0 8px rgba(201,168,76,0.8))`
- "Learn more →": Inter 600, 12px, gold, hover underline

**3 feature cards:**
1. Icon: Network — "Multi-Server" — "Every server gets its own isolated arena."
2. Icon: Radio — "Live Tournaments" — "Match-day hub with live standings and check-ins."
3. Icon: MessageSquare — "Discord-Native" — "One identity, slash commands, real-time announcements."

All cards enter with A12 stagger.

---

#### SECTION 5 — Games

**Eyebrow:** `02 / PICK YOUR BATTLEGROUND`
**H2:** "THREE GAMES. LIMITLESS LEGENDS."

**3-column image grid:**

Each game tile:
```
┌──────────────────────────────┐
│                              │
│  [Game image 340px tall]     │
│       object-fit: cover      │
│                              │
│  [Gradient overlay]          │
│  GAME NAME ← bottom-left     │
│  Mode ← 12px white-40        │
└──────────────────────────────┘
```
- `border-radius: 16px`, `overflow: hidden`
- Gradient: `linear-gradient(180deg, transparent 35%, #070708 100%)`
- Game name: Orbitron 900, 22px, white, `text-shadow: 0 2px 12px rgba(0,0,0,0.8)`
- Top-right status dot: 8px, gold (BGMI), red (COD Mobile), gold (Free Fire), `box-shadow: 0 0 10px color`
- Hover: image scale 1.06 (700ms), inset gold ring `box-shadow: inset 0 0 0 1.5px rgba(201,168,76,0.6)`

---

#### SECTION 6 — How It Works

**Eyebrow:** `03 / FROM COMMUNITY TO COMPETITION`
**H2:** "THREE STEPS. YOU'RE IN."

**3-column layout:**

Each step:
```
  01 ─────────────────
  ════════════════════ ← border-top 2px gold 25%

  Login
  
  Connect with Discord.
  Your identity comes
  with you.

                    1  ← ghost Orbitron 900 80px white-03% absolute bottom-right
```

- Step number: JetBrains Mono 13px, gold, format `01 ─────────`
- Top border: `border-top: 2px solid rgba(201,168,76,0.25)`
- Title: Orbitron 700, 22px, white
- Body: Inter 400, 14px, white-50
- Ghost number: absolute, Orbitron 900, 80px, white 3% opacity, bottom-right corner
- Connector: horizontal 1px line between steps, `linear-gradient(90deg, rgba(201,168,76,0.3), rgba(192,57,43,0.3))`, draws with A15

**3 steps:**
1. Login — Connect with Discord. Your identity comes with you.
2. Select Server — Pick your community and see what's live or next.
3. Compete — Register your squad, check in on match day, chase the podium.

---

#### SECTION 7 — Discord Integration Story

Full-width 2-column panel.

```
┌─────────────────────────────────────────────────────────────┐
│                            │                                 │
│  [Gold status chip]        │  ┌──────────────────────────┐  │
│                            │  │ ◇ SHADØW  BOT · Today    │  │
│  YOUR COMMUNITY.           │  │                          │  │
│  NOT ANOTHER               │  │ ┌─ Nightfall Series ─┐   │  │
│  LOGIN.  ← gold            │  │ │ Room: NFSR-4429     │   │  │
│                            │  │ │ Pass: shadow88      │   │  │
│  [Body text]               │  │ │ Closes in 5 min     │   │  │
│                            │  │ └────────────────────┘   │  │
│  • Role-based access       │  │                          │  │
│  • Live announcements      │  │ [Check In] [Bracket] ... │  │
│  • Room creds via bot      │  │                          │  │
│                            │  │ ⚡ 12  🎮 8  🏆 5        │  │
│  [Read the guide →]        │  └──────────────────────────┘  │
│                            │                                 │
└─────────────────────────────────────────────────────────────┘
```

**Panel outer:** `background: rgba(12,12,18,0.8)`, `border: 1px solid rgba(201,168,76,0.18)`, `border-radius: 24px`, `backdrop-filter: blur(24px)`, HUD corners gold

**Left column:**
- Gold chip: "ONE SERVER. ONE SOURCE OF TRUTH."
- H2: white, "NOT ANOTHER LOGIN." in gold
- Body: Inter 400, 14px, white-50
- Bullet list: 6px gold dots, Inter 400 13px white-70
- CTA: transparent, white-06 bg, white-60 text, hover gold border

**Right column — bot embed:**
- Outer: `background: #070708`, `border-radius: 14px`, `border: 1px solid rgba(245,240,232,0.05)`
- Bot row: diamond icon + "SHADØW" Orbitron 700 + "BOT" JetBrains mono gold tag
- Embed box: `border-left: 3px solid #c9a84c`, dark bg, monospaced fields for Room ID + Password + countdown
- Buttons: first gold bg, others `rgba(255,255,255,0.05)`
- Reactions: small pill row, gold-dim bg

---

#### SECTION 8 — Live & Next Up

**Eyebrow:** `ON THE BATTLEGROUND`
**H2:** "LIVE & NEXT UP"
**Sub:** "Catch the action, or make sure your squad is in the next drop."
**"All tournaments →":** top-right, ghost CTA

**3-column tournament card grid** → see Component 4.1 (TournamentCard)

---

#### SECTION 9 — Stats Bar

4 equal columns, full-width, no outer margin.

```
┌─────────┬─────────┬─────────┬─────────┐
│  3,400+ │   128   │  99.9%  │   ∞     │
│  ACTIVE │TOURNA-  │ UPTIME  │  FREE   │
│ PLAYERS │ MENTS   │  SLA    │ FOREVER │
└─────────┴─────────┴─────────┴─────────┘
```

- `background: rgba(201,168,76,0.03)`, `border: 1px solid rgba(201,168,76,0.10)`, `border-radius: 18px`
- Numbers: Orbitron 900, 40px — col 1 gold, col 2 white, col 3 red, col 4 gold
- Labels: JetBrains Mono 9px, white-30, ALL CAPS
- Counter animation A09 on scroll enter
- Vertical dividers `1px solid rgba(245,240,232,0.05)`

---

#### SECTION 10 — Final CTA Banner

```
┌─────────────────────────────────────────────────────────────┐
│ ············ dot grid overlay at 3% ······················  │
│                                                             │
│               ○ glow orb behind (500px blur)               │
│                                                             │
│             [DISCORD-NATIVE chip]                           │
│                                                             │
│          READY TO                                           │
│          COMPETE?  ← gold                                   │
│                                                             │
│    Thousands of players running tournaments on Discord.     │
│                                                             │
│       [Login with Discord — It's Free]  [Browse Servers]   │
│                                                             │
│           NO CREDIT CARD · NO ADS · NO BS                  │
└─────────────────────────────────────────────────────────────┘
```

- `border-radius: 28px`, `border: 1px solid rgba(201,168,76,0.16)`
- Background: `radial-gradient(ellipse 90% 100% at 50% 0%, rgba(201,168,76,0.14), rgba(7,7,8,0.98))`
- Glow orb: 500px blurred circle, gold, top-center, opacity 20%
- Dot grid: `background-image: radial-gradient(circle at 1px 1px, rgba(201,168,76,0.15) 1px, transparent 0)`, `background-size: 28px 28px`
- H2: Orbitron 900, `clamp(2.2rem,6vw,4rem)`, white with "COMPETE?" in gold
- Primary CTA: largest version — height 56px, px-9, gold bg, black text, Orbitron 700, outer gold glow on hover
- HUD corners: gold

---

#### SECTION 11 — Footer

```
[◇ SHADØW · © 2026]    [Privacy  Terms  Docs  Discord  GitHub]    [BGMI / FREE FIRE / COD MOBILE]
```

- `border-top: 1px solid rgba(245,240,232,0.05)`, height 80px
- All text white-20, Inter 400, 12px
- Links hover → white-50
- Game tags: JetBrains Mono 9px, white-15, tracking widest

---

### PAGE 02 — Server Selector `/servers`

**File:** `apps/web/src/app/servers/page.tsx`
**Auth:** Required. Redirect to login if not authenticated.

**Purpose:** Show all Discord servers the user is in, grouped by whether the bot is installed.

---

**Layout:**

```
NAV (scrolled state)
BREADCRUMB: SHADØW / YOUR SERVERS

[Page Header]
  H1: YOUR SERVERS
  Sub: Select a community to manage or play in.

[With bot — Section label]
  [ServerCard grid — 3 columns]

[Add bot — Section label]
  [ServerCard grid — 3 columns, dimmed state]
```

**Section labels:** JetBrains Mono 10px, gold, ALL CAPS, tracking 0.20em, `border-bottom: 1px solid rgba(201,168,76,0.10)` below

**Empty state (no servers at all):**
- Centered, large diamond icon in gold
- "No servers found" Orbitron 700
- "Make sure you're in a Discord server and have admin permissions." Inter 400 14px white-40
- "Add SHADØW to Discord →" gold CTA

---

**ServerCard Component — Full Spec:**
```
┌──────────────────────────────────────────┐
│ [Server icon 56px]  [Name]               │
│                     ● Bot installed       │ ← green or grey
│                                          │
│ [LIVE 2]  [3 Upcoming]                   │ ← badges
│                                          │
│ ─────────────────────────────────────────│
│ ↗ Click to manage           ID: …f4a2   │ ← or "Add SHADØW Bot" CTA
└──────────────────────────────────────────┘
```

- `background: #0f0f12`, `border-radius: 20px`, `border: 1px solid rgba(245,240,232,0.05)`, padding 20px
- 3D magnetic tilt A10 on hover
- Spinning conic border A06 on hover
- Server icon: 56px, `border-radius: 14px`, `border: 1.5px solid rgba(201,168,76,0.2)`. Fallback: gradient square with initial letter, Orbitron 900
- Online dot: 12px bottom-right of icon. Green + `box-shadow: 0 0 8px #22c55e` if bot installed. Grey if not.
- Name: Orbitron 700, 14px, white
- Status: "● Bot installed" green 11px / "○ Not installed" white-30 11px
- LIVE badge: red-dim bg, red text, 5px red pulse dot
- Upcoming badge: gold-dim bg, gold text
- Footer: JetBrains Mono 10px, white-20. If connected: "↗ Click to manage". If not: full gold "Add SHADØW Bot" CTA
- `cursor: pointer` if connected, `cursor: default` if not
- Entrance: A12 stagger

---

## GROUP B — SERVER HUB PAGES (post-login, server-scoped)

Layout: Server layout (`/servers/[guildId]/layout.tsx`) — top NAV only, no sidebar. Public-facing.

---

### PAGE 03 — Server Home `/servers/[guildId]`

**Purpose:** Public landing page for a specific Discord server's tournament hub.

```
NAV
BREADCRUMB

[Server Banner — 260px tall]
  ┌──────────────────────────────────────────────┐
  │ [background image or gradient]               │
  │                                              │
  │ [Server icon 70px]  SERVER NAME              │
  │                     Members · Games · Region │
  │                                              │
  │  [Join Discord ↗]  [Browse Tournaments]      │
  └──────────────────────────────────────────────┘

[Stats Row — 4 panels]
  ┌──────┬──────┬──────┬──────┐
  │  01  │  04  │ 128  │ IST  │
  │ LIVE │ NEXT │ TEAMS│ ZONE │
  └──────┴──────┴──────┴──────┘

[LIVE & NEXT UP heading + All → link]
  [Tournament card 1]  [Tournament card 2]  [Tournament card 3]
```

**Server banner:**
- Height 260px, `border-radius: 20px`, `overflow: hidden`
- If banner image exists: `object-fit: cover`, gold overlay `rgba(201,168,76,0.04)` + bottom gradient
- If no image: `background: linear-gradient(135deg, rgba(201,168,76,0.12), #0f0f12)`
- Server icon: 70px circle, `border: 2px solid rgba(201,168,76,0.35)`, left-bottom positioned with 24px margin
- Name: Orbitron 900, 36px, white, `text-shadow: 0 2px 20px rgba(0,0,0,0.8)`
- Sub-info: JetBrains Mono 12px, white-40, `2,486 members · BGMI, Free Fire · India`
- "Join Discord ↗": gold CTA, height 40px
- "Browse Tournaments": ghost CTA same height

**Stats row:**
- 4-column grid, `gap: 16px`
- Each panel: `background: #0f0f12`, `border: 1px solid rgba(245,240,232,0.05)`, `border-radius: 14px`, padding 20px
- Number: Orbitron 900, 28px, gold (text-shadow glow)
- Label: JetBrains Mono 9px, white-30, ALL CAPS

**Tournament cards section:**
- Same as Landing hero tournament preview
- "All tournaments →" ghost CTA top-right of heading

---

### PAGE 04 — Tournament Catalogue `/servers/[guildId]/tournaments`

**Purpose:** Browse all tournaments for this server.

```
NAV
BREADCRUMB

[H1: TOURNAMENTS]  [Status: N LIVE]

[Filter tabs: All | Live | Reg Open | Upcoming | Completed]
[Search input]                    [Game dropdown]  [Grid/List]

[Result count: N results]

[Tournament card grid — 3 columns]

OR

[Empty state]
```

**Filter tabs:** Pill buttons
- Active: `background: rgba(201,168,76,0.12)`, gold text, `border: 1px solid rgba(201,168,76,0.30)`, `box-shadow: 0 0 14px rgba(201,168,76,0.12)`
- Inactive: `background: rgba(245,240,232,0.03)`, white-40 text, `border: 1px solid rgba(245,240,232,0.06)`
- Animated indicator slides between active tabs (layoutId A14)
- LIVE tab has red pulsing dot A05

**Search input:**
- `background: #0f0f12`, `border: 1px solid rgba(245,240,232,0.07)`, `border-radius: 8px`, height 38px
- Left: Search icon (Lucide), white-20
- Focus: `border-color: rgba(201,168,76,0.4)`, `box-shadow: 0 0 0 3px rgba(201,168,76,0.10)`

**Game dropdown:**
- Same dark style as search, chevron right

**Grid/List toggle:**
- Two icon buttons (LayoutGrid / List), gold when active

**Cards:** A12 stagger, AnimatePresence between filter states

**Empty state:**
- `border: 1px dashed rgba(201,168,76,0.15)`, `border-radius: 20px`, centered, 280px tall
- SlidersHorizontal icon gold 32px
- "No tournaments match" Orbitron 700 18px
- Sub-text white-40 14px

---

### PAGE 05 — Tournament Detail `/servers/[guildId]/tournaments/[tournamentId]`

**Purpose:** Full info page for a single tournament.

```
NAV
BREADCRUMB

[Tournament Banner — 300px hero image]
  [Status badge overlay top-right]
  [Game badge overlay top-left]
  [Name overlay bottom-left]
  [Mode + date]
  [Capacity bar]

[Tab bar: Overview | Bracket | Participants | Results]

[Tab content below]
```

**Tournament banner:**
- Full width, 300px tall, `border-radius: 20px`, `overflow: hidden`
- Gradient: `linear-gradient(180deg, transparent 40%, rgba(7,7,8,0.97) 100%)`
- Status badge: top-right, pill, gold/red/white based on status
- Game tag: top-left, JetBrains Mono, gold-dim bg
- Name: Orbitron 900, `clamp(1.6rem,4vw,3rem)`, white, bottom-left
- Mode + date: JetBrains Mono 11px, white-40 below name
- Capacity bar: 3px gold fill at bottom edge, full width, shows X/Y teams

**Tab bar:**
- Gold border-bottom indicator on active tab (layoutId animation)
- Tabs: Overview / Bracket / Participants / Results
- Orbitron 700, 12px, ALL CAPS

**Overview tab:**
- Left: description, rules, prize, entry type
- Right: key info card (Game, Mode, Dates, Entry Fee, Organizer)

**Bracket tab:**
- Full bracket visualization (see Component 4.5)
- Zoom controls top-right

**Participants tab:**
- Table of registered teams: rank, name, status (Approved/Pending/Rejected)
- Search input

**Results tab:**
- Match results cards, score vs team
- Dispute status badges

**Registration CTA (when REGISTRATION_OPEN):**
- Floating sticky CTA bar at bottom: gold bg, "Register Your Team →", Inter 700

---

### PAGE 06 — Bracket `/servers/[guildId]/tournaments/[tournamentId]/bracket`

**Purpose:** Full-screen bracket visualization.

```
NAV
BREADCRUMB

[Bracket title + controls]

[Horizontal bracket — scroll overflow-x]
  Round 1      Round 2      Semi     Final
  ────────     ────────     ─────    ─────
  Match        Match         Match    Match
  cards        cards         card     card
```

**Bracket area:**
- `overflow-x: auto`, horizontal scroll
- Rounds are vertical columns, matches are stacked within
- Connector lines between matches: SVG path, gold 1px
- Completed match winner highlighted in gold
- Live match: red pulsing left border on match card
- Zoom in/out: +/- buttons top-right, scale transform on bracket container

**Match card (bracket):**
- `background: #0f0f12`, `border: 1px solid rgba(245,240,232,0.06)`, `border-radius: 8px`, width 200px
- Team row: Inter 600, 13px, score on right, JetBrains Mono
- Winner row: gold text + bold
- Loser row: white-30

---

### PAGE 07 — Registration `/servers/[guildId]/tournaments/[tournamentId]/register`

**Purpose:** Register a team for the tournament.

```
NAV
BREADCRUMB

[Tournament mini-banner — 100px, condensed]

[Multi-step form]
  [Step indicator: 1──2──3]

  Step 1: Team Information
    Team Name, Tag, Game IGN fields

  Step 2: Roster
    Player rows (add/remove players)

  Step 3: Payment (if PAID)
    Razorpay embed / fee summary

  [Back] [Next →]  or  [Submit Registration]
```

**Step indicator:**
- Horizontal bar of numbered circles connected by lines
- Done: gold fill, white number
- Active: gold border, gold number
- Future: `rgba(245,240,232,0.10)` fill, white-30 number
- Lines: `background: linear-gradient(90deg, gold, white-10)` for done → active

**Form fields:**
- Label: Inter 600, 12px, white-50, mb-8px
- Input: `background: #0f0f12`, `border: 1px solid rgba(245,240,232,0.08)`, `border-radius: 10px`, height 44px, padding 12px 16px, Inter 400, 14px, white
- Focus: gold border + `box-shadow: 0 0 0 3px rgba(201,168,76,0.12)`
- Error: `border-color: #c0392b`, red error text below, 12px

**Roster rows:**
- Player tag field + role dropdown per row
- "Add Player +" in gold, ghost style
- Remove: X icon, white-20, hover red

**Submit:**
- Full-width gold button, "Submit Registration", height 52px, Orbitron 700, border-radius 8px
- Loading state: gold spinner inside button, text "Submitting…"
- Success: green check + "Registration submitted!" message

---

## GROUP C — ADMIN PAGES

Layout: Admin layout (`/servers/[guildId]/admin/layout.tsx`) — sidebar + content area + status bar.

---

### ADMIN LAYOUT

```
┌────────────────┬────────────────────────────────────────────┐
│                │                                            │
│  SIDEBAR       │  NAV (full width, fixed)                   │
│  200px         │                                            │
│  (or 56px      ├────────────────────────────────────────────┤
│   collapsed)   │  BREADCRUMB                                │
│                │                                            │
│                │  MAIN CONTENT                              │
│                │  max-width 1120px, padding 32px            │
│                │                                            │
│                │                                            │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
│  STATUS BAR (36px, sticky bottom)                           │
└─────────────────────────────────────────────────────────────┘
```

---

### Admin Sidebar — Full Spec

**File:** `components/admin/AdminSidebar.tsx`

**States:** Expanded (200px) ↔ Collapsed (56px). Toggle: `<` / `>` floating button at right edge, −12px from sidebar.

**Expanded layout:**

```
┌──────────────────────┐
│ ◇ SHADØW             │  ← Brand header, 48px tall
│   ADMIN CONSOLE      │
├──────────────────────┤
│ [Icon] [Server name] │  ← Guild info, 56px
│ SHARD-F4A2           │
├──────────────────────┤
│ [Sync badge]         │  ← SyncStatusBadge component
├──────────────────────┤
│ ⬛ OVERVIEW          │  ← Nav item
│ ◐ TOURNAMENTS        │
│ ▦ ANALYTICS          │
│ ₿ PAYMENT OPS        │
│ ⚙ SETTINGS           │
├──────────────────────┤
│ [🔑 KEYS SECURE]     │  ← Badge
├──────────────────────┤
│ [Avatar] Username    │  ← User footer
│          ⚔ ROLE      │
│                  [↗] │
└──────────────────────┘
```

**Brand header:**
- `border-bottom: 1px solid rgba(201,168,76,0.08)`, padding 16px
- "SHADØW": Orbitron 700, 11px, `#c9a84c`, `text-shadow: 0 0 10px rgba(201,168,76,0.7)`, tracking 0.22em
- "ADMIN CONSOLE": JetBrains Mono 8px, white-20, tracking 0.15em

**Guild info:**
- Icon: 32px, `border-radius: 8px`, `border: 1px solid rgba(201,168,76,0.3)`
- Name: Inter 600, 11px, white
- Shard: JetBrains Mono 8px, gold, tracking 0.15em

**Nav items:**
- Padding: 10px 10px 10px 12px, `border-radius: 8px`
- Icon: 13px, from Lucide
- Label: JetBrains Mono 9px, tracking 0.18em, ALL CAPS
- Inactive: icon white-25, text white-25
- Hover: icon white-60, text white-60, `background: rgba(245,240,232,0.04)`
- Active: `border-left: 2px solid #c9a84c`, `background: rgba(201,168,76,0.08)`, icon gold, text gold, icon `filter: drop-shadow(0 0 4px rgba(201,168,76,0.7))`
- Entrance: A12 stagger, 50ms per item

**Active items per role:**
- REFEREE: Overview, Analytics
- TOURNAMENT_MANAGER: Overview, Tournaments, Analytics, Payment Ops
- SERVER_ADMIN: all 5

**Keys badge:**
- `background: rgba(34,211,238,0.05)` but uses GOLD not cyan in this design system
- `background: rgba(201,168,76,0.05)`, `border: 1px solid rgba(201,168,76,0.15)`, `border-radius: 6px`, 10px 12px
- KeySquare icon 9px gold + "KEYS SECURE" JetBrains Mono 8px gold

**User footer:**
- Avatar 28px, `border: 1px solid rgba(201,168,76,0.35)`
- Name: Inter 500, 11px, white
- Role badge: Shield icon (9px, role-color) + role name JetBrains Mono 9px, role-color
- Role colors: SERVER_ADMIN=`#c0392b`, TOURNAMENT_MANAGER=`#c9a84c`, REFEREE=white-60, others=white-30
- Log out → icon button, white-25, hover red

**Collapsed state (56px):**
- Only icons, centered
- Logo mark only (no text)
- Tooltips on hover: JetBrains Mono 10px, dark floating label

---

### PAGE 08 — Admin Dashboard `/servers/[guildId]/dashboard`

**File:** `components/admin/AdminDashboardNexus.tsx`

**Purpose:** High-level overview for organizers.

```
BREADCRUMB: SHADØW / Server / Dashboard

[H1: COMMAND CENTER]
[Sync status badge row]

[KPI strip — 4 metrics]
  Live · Upcoming · Total Teams · Revenue

[Live tournaments column (left)]  [Quick actions column (right)]

[Recent results]  [Recent registrations]
```

**KPI strip:**
- 4 glass panels in a row, same style as stats bar
- Metric: Orbitron 900, 32px — live=red, upcoming=gold, teams=white, revenue=gold
- Label: JetBrains Mono 9px, white-30

**Live tournaments section:**
- H3: "LIVE NOW" + red pulsing dot
- TournamentCard cards in condensed form (no image, horizontal layout)

**Quick actions:**
- "Create Tournament" — gold CTA
- "Review Results" — ghost
- "Manage Settings" — ghost
- Each 100% width, stacked

**SyncStatusBadge:**
- Shows Discord bot sync health
- Green/gold/red dot + timestamp
- Expandable to show details

---

### PAGE 09 — Admin Tournaments `/servers/[guildId]/admin/tournaments`

**Purpose:** Manage all tournaments for this server.

```
BREADCRUMB

[H1: TOURNAMENTS]  [+ Create Tournament] ← gold button

[TournamentAdminTable]
  Status filter tabs
  Search
  Table rows with actions
```

**TournamentAdminTable:**
- Dark table, `border-radius: 16px`, overflow hidden
- Headers: JetBrains Mono 10px, ALL CAPS, white-30, tracking 0.15em
- Rows: `border-bottom: 1px solid rgba(245,240,232,0.04)`, hover gold-faint bg
- Status: Badge component with appropriate variant
- Actions column: "View", "Edit", dropdown with Manage/Archive/Delete
- Pagination: bottom, gold active page dot

---

### PAGE 10 — Create Tournament (Wizard) `/servers/[guildId]/admin/tournaments/new`

**File:** `components/admin/tournament-wizard/TournamentWizard.tsx`

**Purpose:** 6-step wizard to create a tournament.

```
[Wizard step indicator — top]
1 ─── 2 ─── 3 ─── 4 ─── 5 ─── 6
Gen   Reg   Sched Score Award Discord

[Step content area]

[Back] [Save Draft] [Next →]
```

**Step indicator (WizardStepIndicator.tsx):**
- Horizontal strip, 64px tall
- Each step: circle (done=gold filled, active=gold border+number, future=white-10 border)
- Connecting lines: done segments gold, future segments white-08
- Step label below circle: JetBrains Mono 9px, white-30 (future) / gold (active) / white-50 (done)

**Step 1 — General:**
- Tournament Name: large text input
- Game: 3 tile buttons (BGMI / Free Fire / COD Mobile) — tap to select, selected gets gold border + glow
- Game Mode: sub-options appear after game selection (Battle Royale / Clash Squad / Multiplayer)
- Description: textarea, dark, gold focus
- Banner: upload zone — dashed gold border, "Drop image or click to upload"

**Step 2 — Registration:**
- Max Teams: number input with +/- buttons
- Roster Size: number input
- Registration Format: select (Open / Invite-only)
- Entry Fee toggle: switch (Off=grey, On=gold)
- If fee on: amount input + currency label

**Step 3 — Schedule:**
- Registration Opens: datetime picker, dark style
- Registration Closes: datetime picker
- Tournament Start: datetime picker
- Tournament End: datetime picker
- Stage structure: pre-set options (Single Elimination / Round Robin / etc.)

**Step 4 — Scoring:**
- Kill Points: number input
- Placement Points: table (Rank 1 = X, Rank 2 = Y, etc.) — editable rows
- Preset buttons: BGMI Official / Custom — tap a preset to prefill table

**Step 5 — Awards:**
- Award toggle cards: Champion / Runner-Up / Third Place / MVP / Top Fragger / etc.
- Each toggleable gold card
- Custom label input per award

**Step 6 — Discord:**
- Announcement channel: Discord channel select (dropdown)
- Role mappings: which Discord role gets which app role
- Preview of announcement embed (bot mockup)
- Final buttons: "Save as Draft" (ghost) + "Publish Tournament" (gold, large)

**Form field style (all steps):**
Same as Registration Page fields: dark input, gold focus ring, label Inter 600 12px white-50.

---

### PAGE 11 — Tournament Admin Detail `/servers/[guildId]/admin/tournaments/[tournamentId]`

**File:** `components/admin/TournamentDetailPanel.tsx`

**Purpose:** Full admin control panel for a single tournament.

```
BREADCRUMB

[Tournament header bar — name + status + quick actions]

[Tab bar: Overview | Participants | Matches | Results | Settings]

[Tab content]
```

**Header bar:**
- Tournament name: Orbitron 700, 24px, white
- Status badge
- "Edit" ghost button + "Finalize" gold button (only when conditions met)
- Tournament code: JetBrains Mono badge, gold-dim

**Overview tab:**
- Stats: registered teams, approved, pending, rejected — 4 small KPI tiles
- Timeline: registration open/close, start, end — visual horizontal timeline in gold

**Participants tab:** → same as PAGE 05 participants, with admin approve/reject actions

---

### PAGE 12 — Participants `/servers/[guildId]/admin/tournaments/[tournamentId]/participants`

**File:** `components/admin/ParticipantsTable.tsx`

**Table:**
- Team name / Tag / Members / Status / Entry Type / Actions
- Status cells: Badge component
- Bulk actions: "Approve All Pending" gold CTA
- Per-row: Approve (green) / Reject (red) inline buttons
- Search top-right
- Filter tabs: All / Pending / Approved / Rejected

---

### PAGE 13 — Match Scheduler `/servers/[guildId]/admin/tournaments/[tournamentId]/matches`

**File:** `components/admin/MatchScheduler.tsx`

**Layout:**

```
[H2: MATCH SCHEDULE]  [Schedule New Match ↗]

[Match cards — grouped by round]
  Round 1
  ├── Match 1: Team A vs Team B  [Scheduled 14:00]  [Status]  [Actions]
  └── Match 2: Team C vs Team D  [Scheduled 15:00]  [Status]  [Actions]

  Round 2
  └── ...
```

**Match card:**
- `background: #0f0f12`, `border-radius: 12px`, `border: 1px solid rgba(245,240,232,0.05)`, padding 16px 20px
- Horizontal: team A (left) — VS (center, JetBrains Mono gold) — team B (right)
- Below: date/time, room credentials (eye icon to reveal), status badge
- Actions: Edit / Post Credentials / View Result
- LIVE match: left `border-left: 2px solid #c0392b`, red pulsing dot

**Schedule form (modal or inline):**
- Team A select / Team B select / Date+Time / Round number
- Room ID + Password fields (mono inputs)
- "Create Match" gold CTA

---

### PAGE 14 — Stage Builder `/servers/[guildId]/admin/tournaments/[tournamentId]/stages`

**File:** `components/admin/StageBuilderClient.tsx`

**Visual:**
- Canvas-like area showing stage flow
- Add Stage: button creates a new stage card
- Stage card: dark panel, drag to reorder, Orbitron 700 name, type dropdown
- Stages connected by vertical arrows (gold SVG line + arrowhead)
- Preview bracket button → links to bracket view

---

### PAGE 15 — Finalize Tournament `/servers/[guildId]/admin/tournaments/[tournamentId]/finalize`

**File:** `components/admin/FinalizeButton.tsx`

**Full-page confirmation:**

```
[Warning banner — gold border]
  "Finalizing is permanent. Assign winners before continuing."

[Podium assignment — 3 slots]
  [1ST PLACE]   [2ND PLACE]   [3RD PLACE]
  Team select   Team select   Team select

[MVP / Top Fragger / Other awards]
  Each: award name + team select dropdown

[Finalize Tournament]  ← large gold CTA
[Cancel]               ← ghost
```

- Warning: `background: rgba(201,168,76,0.06)`, `border: 1px solid rgba(201,168,76,0.25)`, `border-radius: 12px`
- Podium slots: gold-bordered panels, 1st slot taller, trophy icon

---

### PAGE 16 — Admin Matches `/servers/[guildId]/admin/matches`

**File:** Uses `MatchSchedulerPanel.tsx`

Same design as PAGE 13 but shows ALL matches across ALL tournaments for this server. Additional tournament filter dropdown at top.

---

### PAGE 17 — Results Queue `/servers/[guildId]/admin/results`

**File:** `components/admin/ResultsQueue.tsx`

```
[H1: RESULTS QUEUE]  [N Pending badge]

[ResultReviewCard × N]
```

**ResultReviewCard:**
```
┌────────────────────────────────────────────────────────┐
│ [Tournament name] · [Match #] · [Game]                 │
│                                                        │
│ Team A: [Result claim — kills, placement]              │
│ Team B: [Result claim — kills, placement]              │
│                                                        │
│ [Evidence or screenshot if attached]                   │
│                                                        │
│          [Reject ✗]  [Request Info]  [Approve ✓]       │
└────────────────────────────────────────────────────────┘
```

- Card: `background: #0f0f12`, `border-radius: 16px`, full-width, padding 24px
- `border-left: 3px solid #c9a84c` (pending) / `#c0392b` (disputed) / `#22c55e` (approved, faded)
- Approve button: `background: rgba(34,197,94,0.12)`, green text
- Reject button: `background: rgba(192,57,43,0.12)`, red text
- Request Info: ghost

---

### PAGE 18 — Analytics `/servers/[guildId]/admin/analytics`

**File:** `components/analytics/AnalyticsNexus.tsx`

```
[H1: ANALYTICS]

[Date range selector]  [Game filter]

[KPI row: Registrations · Completion Rate · Avg Teams · Revenue]

[Chart: Tournament Activity — bar chart, gold bars]
[Chart: Registration Trend — line chart, gold line]
[Chart: Game Distribution — donut, gold/red/white segments]

[Top Teams table]
```

**Charts:**
- Library: Recharts
- All colors from palette: gold, red, white
- Tooltip: `background: #0f0f12`, `border: 1px solid rgba(201,168,76,0.2)`, dark style
- Grid lines: white-05
- No colored fills except gold, red, white

---

### PAGE 19 — Payment Config `/servers/[guildId]/admin/payment`

**File:** `components/admin/PaymentConfigPanel.tsx`

```
[H1: PAYMENT CONFIGURATION]

[PAYMENTS_ENABLED toggle]

[API Credentials panel (conditional)]
  Razorpay Key ID: ████ field
  Razorpay Secret: ████ field
  [Save Credentials]

[Default entry fee: currency + amount]

[Test payment button]
```

- Sensitive fields: password type, `font-family: JetBrains Mono`
- "Payments disabled" banner if `PAYMENTS_ENABLED=false`
- Toggle: gold when on, white-20 when off

---

### PAGE 20 — Payments Overview `/servers/[guildId]/admin/payments`

Order history, balance, payout controls. Same dark table style as tournament admin.

---

### PAGE 21 — Settings `/servers/[guildId]/admin/settings`

**File:** `components/admin/SettingsNexus.tsx`

**Tabs:** General / Staff / Notifications / Danger Zone

**General tab:**
- Server name override
- Server timezone
- Default game
- Public / Private visibility toggle

**Staff tab:**
- Table of Discord users with role assignments
- "Add Staff Member" input + role select + Add button
- Per-row: role dropdown, remove button

**Notifications tab:**
- Per-event toggles: Registration opens / Check-in reminder / Match starts / Results approved
- Discord channel selector per event

**Danger Zone tab:**
- "Archive all tournaments" — red ghost button
- "Remove bot from server" — red solid button
- Each action requires typing server name to confirm (modal)

---

## GROUP D — PUBLIC SERVER PAGES (continued)

---

### PAGE 22 — Leaderboards `/servers/[guildId]/leaderboards`

**File:** `components/tournament/LeaderboardsClient.tsx`

```
NAV
BREADCRUMB

[H1: LEADERBOARDS]

[Game tabs: All | BGMI | Free Fire | COD Mobile]

[Top 3 hero cards]

[Full standings table]
```

**Top 3 hero row:**
- 3 cards, first-place card is larger / centered-tallest
- Medal emoji + team name (Orbitron 700) + points in gold
- `background: rgba(201,168,76,0.06)` for 1st, dimmer for 2nd/3rd
- `border: 1px solid rgba(201,168,76,0.2)` 1st place
- 1st place: `box-shadow: 0 0 28px rgba(201,168,76,0.15)`

**Table:**
- Headers: JetBrains Mono, tracking 0.15em
- Top 3 rows: gold number in Points column
- Medal emojis for rank 1/2/3
- Hover: `background: rgba(201,168,76,0.03)`
- Animated entrance: rows stagger in with A12

---

### PAGE 23 — Winners Hall `/servers/[guildId]/winners`

**Purpose:** Trophy room — lists all completed tournaments with their winners.

```
NAV
BREADCRUMB

[H1: WINNERS HALL]

[Tournament winner cards — grid]
  Each: Tournament banner + 1st 2nd 3rd place teams + trophy badge
```

**Winner card:**
- 300px banner image header
- Gold gradient overlay
- Trophy icon top-right
- Below image: 3 inline placements (🥇 Team / 🥈 Team / 🥉 Team)
- "View Full Results →" gold link

---

### PAGE 24 — Winner Detail `/servers/[guildId]/winners/[tournamentId]`

**File:** `components/tournament/WinnerDetailPodium.tsx`

```
NAV
BREADCRUMB

[Tournament name + game badge]

[CINEMATIC PODIUM]

[AWARDS section]

[FULL STANDINGS table]
```

**Cinematic podium:**

```
              🥇
          [Trophy icon]
          [Team Name]
      ┌──────────────────┐
      │   1st            │ ← 220px tall, gold border glow, scanline
      │   PLACE          │
  🥈  │                  │  🥉
[Name]│                  │[Name]
  ┌───┤                  ├───┐
  │2nd│                  │3rd│ ← 160px/120px
  └───┘                  └───┘
```

- Center pillar: `border: 1px solid rgba(201,168,76,0.4)`, `box-shadow: 0 0 40px rgba(201,168,76,0.2)`, `border-radius: 12px 12px 0 0`, A07 float
- Left pillar (2nd): `border: 1px solid rgba(148,163,184,0.2)`, no fill, similar shape, 160px
- Right pillar (3rd): `border: 1px solid rgba(178,112,38,0.2)`, 120px
- Stage floor: full-width, 3px, `background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)`, A08 scanline above it
- Radial glow behind: `radial-gradient(ellipse 60% 50% at 50% 100%, rgba(201,168,76,0.12), transparent)`

**Awards section:**
- 3-column card grid
- Per award: icon (trophy/star/flame/etc.) + award name + team name
- Gold-accented for champion, red-accented for MVP/fragger
- `border: 1px solid rgba(201,168,76,0.15)`, `background: rgba(201,168,76,0.04)` for champion

**Standings table:**
- Same as Leaderboards full table

---

## GROUP E — DEVELOPER DASHBOARD

---

### PAGE 25 — Developer Dashboard `/servers/[guildId]/developer`

**File:** `components/developer/DeveloperDashboard.tsx`

**Auth:** Requires SERVER_ADMIN or higher

```
NAV
BREADCRUMB

[H1: DEVELOPER DASHBOARD]

[Tab bar: Bot Analytics | Bot Errors | Website Errors | Bridge Health]

[Tab content]
```

**Tabs style:** Same as main tabs. Gold active.

**Bot Analytics tab (BotAnalyticsTab.tsx):**
- Bar chart: Top slash commands by usage
- Gold bars, dark bg chart
- Below: table of command / count / avg latency

**Bot Errors tab (BotErrorsTab.tsx):**
- Table: timestamp / command / error message / count
- Error message: monospace, truncated, expands on click
- Red badge for new errors

**Website Errors tab (WebsiteErrorsTab.tsx):**
- Same layout as bot errors
- URL / status code / message / timestamp

**Bridge Health tab (BridgeHealthTab.tsx):**
- List of health check results
- Each: endpoint name + status dot (green/red) + latency (JetBrains Mono, gold if fast, red if slow) + last checked
- Refresh button: gold, top-right

---

## GROUP F — OBS OVERLAY

---

### PAGE 26 — Stream Overlay `/overlay/[guildId]/[tournamentId]`

**Layout:** Overlay layout (minimal, no nav, no sidebar). Designed to be captured by OBS.

**Purpose:** A live scoreboard / tournament widget for streamers.

```
[Tournament name — top center bar]
[Live standings grid — 6–8 teams max]
  Rank | Team | Points | Kills
```

**Style:**
- Transparent background (for OBS chroma key or transparency)
- Text: white with `text-shadow` for visibility over gameplay
- Gold rank numbers
- Red glow for 1st place team
- Animated on data change

---

## GROUP G — DOCUMENTATION PAGES

---

### PAGE 27 — Docs Index `/docs`

**Layout:** `app/docs/layout.tsx` — two-column: sidebar nav + content

```
NAV
BREADCRUMB

┌──────────────────┬──────────────────────────────────────────┐
│ DOCUMENTATION    │                                          │
│                  │  [H1: Welcome to SHADØW Docs]            │
│ Getting Started  │                                          │
│ Discord Commands │  [Quick start cards — 3 grid]            │
│ Tournaments      │                                          │
│   Create         │  [Links to sections]                     │
│   Formats        │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

**Docs sidebar:**
- 220px wide, sticky
- Section titles: JetBrains Mono 9px, gold, ALL CAPS
- Links: Inter 400, 14px, white-50, hover white-80
- Active: gold text, `border-left: 2px solid gold`

**Quick start cards:**
- 3-col grid, `border: 1px solid rgba(201,168,76,0.12)`, `border-radius: 14px`, dark bg, 20px padding
- Icon top (Lucide), title Orbitron 700, description Inter 400 14px

---

### PAGE 28 — Getting Started `/docs/getting-started`

Long-form documentation page. Same docs layout.

**Content:** Step-by-step prose with:
- Code blocks: dark `#070708` bg, `border: 1px solid rgba(201,168,76,0.12)`, JetBrains Mono 13px, copy button (gold, top-right)
- Inline code: `background: rgba(201,168,76,0.08)`, gold text, `border-radius: 4px`, mono font
- Note callouts: `background: rgba(201,168,76,0.05)`, `border-left: 3px solid rgba(201,168,76,0.4)`, `border-radius: 0 8px 8px 0`
- Headers: Orbitron 700

---

### PAGE 29 — Discord Commands `/docs/discord-commands`

Same docs layout. Content is a searchable table of slash commands.

**Command table:**
- `/command name`: JetBrains Mono gold
- Description: Inter 400, 14px, white-70
- Required Role: Badge component
- Parameters: expandable row

---

### PAGE 30 — Create Tournament Guide `/docs/tournaments/create`

Same docs layout. Step-by-step with screenshots and callouts.

---

### PAGE 31 — Tournament Formats `/docs/tournaments/formats`

Same docs layout. Comparison tables for Single Elimination / Round Robin / etc.

---

## PART 4 — COMPONENT LIBRARY

---

### 4.1 TournamentCard

**File:** `components/tournament/TournamentCard.tsx`

```
┌──────────────────────────────────────┐
│ [Banner image 200px]                 │
│   [Game tag — top-left]              │
│   [Status badge — top-right]         │
│   [Bottom fade]                      │
├──────────────────────────────────────┤
│ TOURNAMENT NAME — Orbitron 700       │
│ Mode · Date                          │
│                                      │
│ ████████████░░░  8/32 teams          │ ← capacity bar
│                                      │
│ [Register Now →] or [View Details]   │
└──────────────────────────────────────┘
```

- Outer: `background: #0f0f12`, `border: 1px solid rgba(245,240,232,0.05)`, `border-radius: 18px`, `overflow: hidden`
- Hover: `translateY(-6px)`, conic border spins A06
- Banner: 200px, `object-fit: cover`. Fallback: game-color gradient
- Game tag: top-left, JetBrains Mono 10px, gold-dim bg, gold text
- Status badges: see 4.2
- Name: Orbitron 700, 15px, white, 2-line clamp
- Mode: Inter 400, 11px, white-40
- Date: JetBrains Mono 11px, white-30
- Capacity bar: 3px, `border-radius: 2px`, gold fill → glow red if >90%
- CTA: Registration Open → full gold; otherwise → `rgba(245,240,232,0.04)` ghost
- Entrance: A02 card-appear

---

### 4.2 Badge

**File:** `components/ui/Badge.tsx`

| Variant | Background | Text | Ring | Extra |
|---|---|---|---|---|
| `live` | red-dim | `#e74c3c` | red-border | red pulse dot |
| `reg-open` | gold-dim | `#c9a84c` | gold-border | gold pulse dot |
| `check-in` | gold-dim | `#c9a84c` | gold-border | gold pulse dot |
| `upcoming` | white-05 | white-50 | white-10 | — |
| `completed` | white-05 | white-30 | white-05 | — |
| `cancelled` | red-dim | red-light at 60% | red-border 50% | — |
| `draft` | white-05 | white-30 | white-05 | — |

- All: `border-radius: 9999px`, height 22px, padding 4px 10px, JetBrains Mono 10px, ALL CAPS, tracking 0.15em
- Pulse dots: 5px, animate A05

---

### 4.3 GlowButton / LiquidButton

**File:** `components/ui/GlowButton.tsx`, `LiquidButton.tsx`

**Primary (gold):**
- `background: #c9a84c`, `color: #070708`, Inter 600, `border-radius: 6px`
- Hover: `background: #e8c46a`, shimmer A04, `box-shadow: 0 0 24px rgba(201,168,76,0.4)`
- Active: scale 0.97

**Cyber (gold outlined):**
- Transparent bg, `border: 1.5px solid rgba(201,168,76,0.4)`, gold text
- Hover: `background: rgba(201,168,76,0.1)`, glow

**Ghost:**
- Transparent, `border: 1px solid rgba(245,240,232,0.10)`, white-60 text
- Hover: border → white-25, text white-80

**Danger:**
- Transparent, `border: 1px solid rgba(192,57,43,0.35)`, red text
- Hover: `background: rgba(192,57,43,0.10)`, red glow

**Sizes:** sm (h32 px4 text12), md (h40 px5 text13), lg (h48 px6 text14), xl (h56 px8 text15)

**Liquid shimmer:** `::after` pseudo, gradient sweep left→right on hover, 500ms (A04)

---

### 4.4 GlassCard / LiquidCard

**File:** `components/ui/GlassCard.tsx`, `LiquidCard.tsx`

- `background: rgba(15,15,18,0.70)`, `backdrop-filter: blur(20px)`, `border-radius: 16px`
- `border: 1px solid rgba(245,240,232,0.06)`
- `box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,76,0.06)`
- Hover: `border-color: rgba(201,168,76,0.20)`, `box-shadow` adds gold glow
- LiquidCard: adds rotating conic gradient border on hover (A06), magnetic tilt A10

---

### 4.5 Bracket Visualization

**File:** `components/tournament/BracketVisualization.tsx`

**Layout:** Horizontal scroll container. Rounds are columns. Each column is a flex-column of match cards.

**Match card (within bracket):**
- Width: 200px
- Team A row + Team B row
- Each team: name (Inter 600, 13px) + score (JetBrains Mono, right-aligned)
- Winner: gold text + bold
- Loser: white-25
- `background: #0f0f12`, `border: 1px solid rgba(245,240,232,0.06)`, `border-radius: 8px`

**Connector lines:**
- SVG elements with `stroke: rgba(201,168,76,0.3)`, `stroke-width: 1`
- Tournament champion match: `stroke: #c9a84c`, `stroke-width: 1.5`

**Zoom controls:**
- Top-right, `+` and `-` buttons, `border: 1px solid rgba(245,240,232,0.08)`, gold icon
- Scale the entire bracket container

**Round labels:**
- "ROUND 1", "SEMI FINALS", "FINALS" — JetBrains Mono 10px, gold, tracking widest, above each column

---

### 4.6 AnimatedCounter

**File:** `components/ui/AnimatedCounter.tsx`

- Counts from 0 → target over 1.2s, ease-out
- Framer Motion `useMotionValue` + `animate`
- Triggers on IntersectionObserver enter
- Displays Orbitron 900 number, color matches parent

---

### 4.7 Skeleton Loaders

**File:** `components/ui/Skeleton.tsx`

- `background: linear-gradient(90deg, rgba(201,168,76,0.04), rgba(201,168,76,0.08), rgba(201,168,76,0.04))`
- `background-size: 200% 100%`, animation shimmer left→right 1.6s infinite
- `border-radius` matches the element it represents

**Variants:**
- `SkeletonText`: full-width bars, 16px tall, `border-radius: 4px`
- `SkeletonCard`: 200px tall block, matches card `border-radius: 18px`
- `SkeletonGrid`: 3-column grid of SkeletonCards

---

### 4.8 Breadcrumb

**File:** `components/ui/CyberBreadcrumb.tsx`

- JetBrains Mono 10px, ALL CAPS, tracking 0.18em
- Crumbs: white-30, separator `/`: white-10
- Final crumb: gold, not clickable
- Hover on link crumbs: white-60
- Entrance: stagger A20

---

### 4.9 ErrorBoundary

**File:** `components/ui/ErrorBoundary.tsx`

**Error state UI:**
```
┌────────────────────────────────────────┐
│                                        │
│  ⚠  SYSTEM ERROR                       │
│                                        │
│  Something went wrong in this section  │
│                                        │
│  [Error ID: xxxxxxxxxxx] mono small    │
│                                        │
│  [Try Again]  [Go Home]                │
│                                        │
└────────────────────────────────────────┘
```

- `border: 1px solid rgba(192,57,43,0.3)`, `background: rgba(192,57,43,0.04)`, `border-radius: 16px`
- "SYSTEM ERROR": Orbitron 700, 18px, red
- Error ID: JetBrains Mono 11px, white-25

---

### 4.10 NeonText

**File:** `components/ui/NeonText.tsx`

Polymorphic text component (`as` prop). Gold variant: `color: #c9a84c`, `text-shadow: 0 0 6px rgba(201,168,76,0.9), 0 0 20px rgba(201,168,76,0.6), 0 0 40px rgba(201,168,76,0.3)`. Red variant: same pattern with red.

---

### 4.11 PageTransition

**File:** `components/ui/PageTransition.tsx`

Wraps every page. Route change → current exits (opacity 0, Y +20px, 250ms), new page enters (A01, 600ms). Uses Framer Motion `AnimatePresence`.

---

### 4.12 StatusPulse

**File:** `components/ui/StatusPulse.tsx`

Small colored dot with pulse animation. Variants: `synced`=green, `live`=red, `pending`=gold, `offline`=white-20.

---

## PART 5 — WORKFLOW DIAGRAMS

---

### 5.1 User Authentication Flow

```
Landing (/)
    │
    ▼
Click "Login with Discord"
    │
    ▼
/api/auth/login
    │
    ▼
Discord OAuth2 (external)
    │
    ├── Success ──────────────────────────────┐
    │                                         │
    ▼                                         ▼
/api/auth/callback               /api/auth/callback?error=...
    │                                         │
    ▼                                         ▼
Supabase session created             Error page / retry
    │
    ▼
/servers  ← post-login landing
    │
    ▼
Select server from ServerCard list
    │
    ├── Bot installed ──────► /servers/[guildId]    (Server Home)
    │
    └── Bot not installed ──► Discord bot invite URL (external)
```

---

### 5.2 Tournament Creation Workflow

```
Admin: /servers/[guildId]/admin/tournaments
    │
    ▼
Click "+ Create Tournament"
    │
    ▼
/admin/tournaments/new
    │
    ├── Step 1: General (name, game, mode, banner)
    │         [Save Draft] ──────────────────────────────────► Draft saved, stay on step 1
    │         [Next →]
    │
    ├── Step 2: Registration (capacity, entry fee)
    │         [Next →]
    │
    ├── Step 3: Schedule (dates, format)
    │         [Next →]
    │
    ├── Step 4: Scoring (kill pts, placement pts, presets)
    │         [Next →]
    │
    ├── Step 5: Awards (toggle award types)
    │         [Next →]
    │
    └── Step 6: Discord (channels, roles)
              │
              ├── [Save as Draft] ──────────────────────────► DRAFT status, /admin/tournaments
              │
              └── [Publish Tournament] ──────────────────────► REGISTRATION_OPEN, /admin/tournaments/[id]
```

---

### 5.3 Player Registration Workflow

```
Tournament Detail (/servers/[guildId]/tournaments/[id])
    │
    ├── Status: REGISTRATION_OPEN
    │         [Register Your Team] sticky CTA
    │
    ▼
/tournaments/[id]/register
    │
    ├── Step 1: Team Info (name, tag, captain IGN)
    │         [Next →]
    │
    ├── Step 2: Roster (player IGNs + roles)
    │         [Next →]
    │
    └── Step 3: Payment (if PAID entry)
              │
              ├── PAID: Razorpay checkout ──► Payment success ──► Submit
              │
              └── FREE: Skip directly ──────────────────────────► Submit
                            │
                            ▼
                  Registration created (PENDING status)
                            │
                            ▼
                  Admin reviews in Participants panel
                            │
                            ├── Approve ──► Status: APPROVED
                            │               Bot DMs team captain
                            │
                            └── Reject ───► Status: REJECTED
                                            Bot notifies captain
```

---

### 5.4 Match Day Workflow

```
Tournament status: LIVE
    │
Admin:
    ├── Create match in scheduler (team A vs team B, time, round)
    ├── Add room credentials (Room ID + Password)
    └── Post credentials → Discord bot sends embed to server channel
                │
                ▼
Players receive: Bot embed with room ID, password, check-in button
                │
                ▼
Check-in window opens
    ├── Players click "Check In" in Discord embed
    └── Admin sees check-in status in participants table
                │
                ▼
Match starts
                │
                ▼
Match ends → Teams submit results via Discord bot (/submit-result)
                │
                ▼
Results Queue (/admin/results)
    ├── Admin reviews both result claims
    ├── If matching → Approve → Standings auto-update
    └── If disputed → "Request Info" or override manually
```

---

### 5.5 Finalize & Winners Flow

```
All matches completed
    │
Admin: Tournament Detail → [Finalize]
    │
    ▼
Finalize page (/finalize)
    ├── Assign 1st / 2nd / 3rd place teams
    ├── Assign individual awards (MVP, Top Fragger)
    └── Click "Finalize Tournament"
                │
                ▼
        Tournament status: COMPLETED
                │
                ├── Winners Hall updated (/winners)
                ├── Leaderboards updated
                └── Discord bot posts results to server channel
```

---

### 5.6 Navigation State Map

```
Anonymous user:
  / (Landing) → /api/auth/login

Authenticated, no guild selected:
  /servers → select guild

Server member (no admin):
  /servers/[guildId]                 Server Home
  /servers/[guildId]/tournaments     Catalogue
  /servers/[guildId]/tournaments/[id] Detail + register
  /servers/[guildId]/leaderboards
  /servers/[guildId]/winners
  /servers/[guildId]/winners/[id]

Referee+:
  + /servers/[guildId]/dashboard

Tournament Manager+:
  + /servers/[guildId]/admin/tournaments
  + /servers/[guildId]/admin/tournaments/new
  + /servers/[guildId]/admin/tournaments/[id]
  + /servers/[guildId]/admin/tournaments/[id]/participants
  + /servers/[guildId]/admin/tournaments/[id]/matches
  + /servers/[guildId]/admin/tournaments/[id]/stages
  + /servers/[guildId]/admin/tournaments/[id]/finalize
  + /servers/[guildId]/admin/matches
  + /servers/[guildId]/admin/results
  + /servers/[guildId]/admin/payment

Server Admin:
  + /servers/[guildId]/admin/analytics
  + /servers/[guildId]/admin/payments
  + /servers/[guildId]/admin/settings
  + /servers/[guildId]/developer

Special:
  /overlay/[guildId]/[id]           OBS overlay (no auth, token-based)
  /docs/*                            Public documentation
```

---

## PART 6 — INTERACTION STATES

---

### 6.1 Loading States

Every data-fetching page/component shows skeletons (4.7) while loading. No spinner-only. Skeleton matches the exact shape of the content.

**Page-level:** Full-page skeleton matching the expected layout. Shimmer with gold tint.

**Table rows:** Each row replaced by a SkeletonText bar.

**Cards:** SkeletonCard with same dimensions and border-radius as real card.

**Inline (button):** Spinner icon replaces button label, button dims to 70% opacity.

---

### 6.2 Error States

Every data-fetch has an error state:
- Small component errors → inline red banner with retry button
- Page-level errors → ErrorBoundary 4.9 card
- 404 → Custom not-found page: Orbitron 900 "404", red glow, "PAGE NOT FOUND", home link
- 500 → Similar, "SYSTEM ERROR"

---

### 6.3 Empty States

Always include icon + heading + sub-text + optional CTA:
- Icon: appropriate Lucide icon, gold, 32px
- Heading: Orbitron 700, 18px
- Sub: Inter 400, 14px, white-40
- CTA: gold (if actionable) or ghost

---

### 6.4 Toast Notifications

Framer Motion `AnimatePresence`. Slide up from bottom-right.

```
┌─────────────────────────────────────────┐
│ ✓  Registration submitted!              │  ← green checkmark
│    Your team is now pending approval.   │
└─────────────────────────────────────────┘
```

- `background: #0f0f12`, `border: 1px solid rgba(201,168,76,0.25)`, `border-radius: 12px`, `box-shadow: shadow-lg`
- Icon: gold (success), red (error)
- Auto-dismiss after 4s
- Manual dismiss: X top-right

---

### 6.5 Modal Dialogs

- Overlay: `background: rgba(7,7,8,0.85)`, `backdrop-filter: blur(8px)`
- Modal panel: `background: #0f0f12`, `border: 1px solid rgba(201,168,76,0.15)`, `border-radius: 20px`, `max-width: 560px`, `box-shadow: shadow-xl`
- Entrance: A18 scale-in
- Close: X button top-right, white-30, hover white-80
- Confirm dangerous action: input must type name to enable CTA

---

## PART 7 — RESPONSIVE DESIGN

---

### 7.1 Breakpoint System

```
xs:  < 480px   Mobile portrait
sm:  480–639px  Mobile landscape
md:  640–767px  Large mobile / small tablet
lg:  768–1023px Tablet portrait
xl:  1024–1279px Tablet landscape / small desktop
2xl: 1280–1535px Desktop
3xl: ≥ 1536px   Wide desktop
```

### 7.2 Landing Page — Responsive

| Section | Mobile | Tablet | Desktop |
|---|---|---|---|
| Hero | Stacked, no 3D canvas | Stacked, small 3D canvas | Side-by-side, full 3D |
| Features | 1-col | 2-col | 3-col |
| Games | 1-col scroll | 2-col | 3-col |
| How It Works | 1-col | 2-col | 3-col |
| Discord | Stacked | Stacked | Side-by-side |
| Tournament preview | 1-col | 2-col | 3-col |
| Stats | 2×2 grid | 2×2 grid | 4-col row |
| Final CTA | Full width, text center | Full width | Full width |

### 7.3 Admin Layout — Responsive

| Breakpoint | Sidebar | Content |
|---|---|---|
| < 768px | Drawer overlay (closed by default, hamburger opens) | Full width |
| 768–1023px | Collapsed (56px) | Remaining width |
| ≥ 1024px | Expanded (200px) | Remaining width |

### 7.4 Navigation — Responsive

| Breakpoint | Behavior |
|---|---|
| < 768px | Logo + hamburger only. Tap → drawer slides down. |
| 768–1279px | Logo + 2 most important links + Login |
| ≥ 1280px | Full nav |

---

## PART 8 — ACCESSIBILITY REQUIREMENTS

- **Focus rings:** All interactive elements — `outline: 2px solid #c9a84c`, `outline-offset: 2px`. Never remove outline.
- **Color contrast:** `#c9a84c` on `#070708` = 4.7:1 (passes AA for large text). `#f5f0e8` on `#070708` = 17.3:1 (passes AAA).
- **Screen readers:** All icon-only buttons have `aria-label`. Status dots always paired with visible text. `aria-live="polite"` on dynamic content areas.
- **Keyboard nav:** All interactive elements reachable and operable via keyboard. Tab order logical. Skip-to-content link first in DOM.
- **ARIA roles:** `role="progressbar"` on capacity bars. `aria-selected` on tabs. `role="dialog"` on modals. `role="status"` on toasts. `aria-expanded` on dropdowns.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` — disable all `@keyframes`, set `transition-duration: 0.01ms`, disable Framer Motion animations via `reducedMotion: "user"`.
- **Form errors:** Associated with inputs via `aria-describedby`. Error messages have `role="alert"`.

---

## PART 9 — DEVELOPER HANDOFF NOTES

### Tailwind Config

```js
// tailwind.config.ts
colors: {
  gold:  { DEFAULT: '#c9a84c', light: '#e8c46a', bright: '#f0d080',
           dim: 'rgba(201,168,76,0.12)', faint: 'rgba(201,168,76,0.06)',
           border: 'rgba(201,168,76,0.20)', glow: 'rgba(201,168,76,0.40)' },
  red:   { DEFAULT: '#c0392b', light: '#e74c3c',
           dim: 'rgba(192,57,43,0.12)', border: 'rgba(192,57,43,0.25)' },
  black: { DEFAULT: '#070708', mid: '#0f0f12',
           high: '#1a1a1f', raised: '#22222a' },
  cream: { DEFAULT: '#f5f0e8' },
},
fontFamily: {
  display: ['Orbitron', 'sans-serif'],
  body:    ['Inter', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
},
borderRadius: {
  'btn': '6px', 'input': '10px', 'card': '16px',
  'card-lg': '20px', 'panel': '24px', 'banner': '28px',
},
boxShadow: {
  'gold': '0 0 24px rgba(201,168,76,0.35)',
  'red': '0 0 16px rgba(192,57,43,0.4)',
  'card': '0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,76,0.08)',
},
```

### CSS Custom Properties Required

```css
:root {
  --gold: #c9a84c;
  --gold-light: #e8c46a;
  --gold-dim: rgba(201,168,76,0.12);
  --red: #c0392b;
  --red-light: #e74c3c;
  --red-dim: rgba(192,57,43,0.12);
  --black: #070708;
  --black-mid: #0f0f12;
  --black-high: #1a1a1f;
  --white: #f5f0e8;
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

---

## PART 10 — PAGE INVENTORY SUMMARY

| # | Route | Title | Auth | Layout |
|---|---|---|---|---|
| 01 | `/` | Landing | Public | Root |
| 02 | `/servers` | Server Selector | Required | Root + Nav |
| 03 | `/servers/[g]` | Server Home | Optional | Server |
| 04 | `/servers/[g]/tournaments` | Tournament Catalogue | Optional | Server |
| 05 | `/servers/[g]/tournaments/[t]` | Tournament Detail | Optional | Server |
| 06 | `/servers/[g]/tournaments/[t]/bracket` | Bracket View | Optional | Server |
| 07 | `/servers/[g]/tournaments/[t]/register` | Registration Form | Required | Server |
| 08 | `/servers/[g]/dashboard` | Dashboard | Referee+ | Server |
| 09 | `/servers/[g]/leaderboards` | Leaderboards | Optional | Server |
| 10 | `/servers/[g]/winners` | Winners Hall | Optional | Server |
| 11 | `/servers/[g]/winners/[t]` | Winner Detail | Optional | Server |
| 12 | `/servers/[g]/developer` | Developer Dashboard | Admin | Server |
| 13 | `/servers/[g]/admin/tournaments` | Admin Tournaments | Manager+ | Admin |
| 14 | `/servers/[g]/admin/tournaments/new` | Create Tournament | Manager+ | Admin |
| 15 | `/servers/[g]/admin/tournaments/[t]` | Tournament Admin | Manager+ | Admin |
| 16 | `/servers/[g]/admin/tournaments/[t]/participants` | Participants | Manager+ | Admin |
| 17 | `/servers/[g]/admin/tournaments/[t]/matches` | Match Scheduler | Manager+ | Admin |
| 18 | `/servers/[g]/admin/tournaments/[t]/stages` | Stage Builder | Manager+ | Admin |
| 19 | `/servers/[g]/admin/tournaments/[t]/finalize` | Finalize | Manager+ | Admin |
| 20 | `/servers/[g]/admin/matches` | All Matches | Manager+ | Admin |
| 21 | `/servers/[g]/admin/results` | Results Queue | Manager+ | Admin |
| 22 | `/servers/[g]/admin/analytics` | Analytics | Admin | Admin |
| 23 | `/servers/[g]/admin/payment` | Payment Config | Admin | Admin |
| 24 | `/servers/[g]/admin/payments` | Payment Overview | Admin | Admin |
| 25 | `/servers/[g]/admin/settings` | Settings | Admin | Admin |
| 26 | `/overlay/[g]/[t]` | OBS Overlay | Token | Overlay |
| 27 | `/docs` | Docs Home | Public | Docs |
| 28 | `/docs/getting-started` | Getting Started | Public | Docs |
| 29 | `/docs/discord-commands` | Discord Commands | Public | Docs |
| 30 | `/docs/tournaments/create` | Create Guide | Public | Docs |
| 31 | `/docs/tournaments/formats` | Formats Guide | Public | Docs |

**Total: 31 pages across 5 layout types**

---

### Do's and Don'ts

#### ✅ Do
- Gold only where it earns attention — max 2–3 gold elements per viewport
- Embrace negative space — dark pages should feel spacious, not dense
- Every animation serves a purpose — guide attention, confirm action, show state
- Use Orbitron only for titles, labels, numbers — never body copy
- Keep border-radius consistent: 6px buttons, 10px inputs, 16px cards, 20px panels, 28px banners
- All interactive elements must be keyboard accessible with visible focus ring

#### ❌ Don't
- No purple, cyan, blue, green, or any color outside black / gold / red
- No white backgrounds — ever
- No more than 2 font-sizes on a single card
- No decorative animations without functional purpose
- No gradients mixing more than 2 palette colors
- No gold-on-gold (text on gold bg must be black)
- No rounded corners above 28px except full-pill elements
- No placeholder images — use generative gradients as fallbacks

---

*End of Design.md — SHADØW Tournaments v2.0*
*31 pages · 5 layouts · 20 animations · 12 core components*
*Ready for Google Stitch · Black + Gold + Red · Minimal · Confident · Cinematic*
