# SHADØW Tournaments — Web Interface Design Specification
### For Google Stitch · Complete Design Brief

---

## 01 · Design Philosophy

**Minimal. Confident. Cinematic.**

This is not a loud esports site. Think high-end sneaker drop page meets Bloomberg Terminal. Every element earns its place. Negative space is a weapon. The palette is restrained — three colors, no exceptions. Animations are purposeful, not decorative.

> Reference mood: Apple × Vercel × Nike × Bloomberg Terminal

---

## 02 · Color System

### Primary Palette — 3 Colors Only

| Token | Hex | Usage |
|---|---|---|
| `--black` | `#070708` | Page background, card backgrounds |
| `--black-mid` | `#0f0f12` | Elevated surfaces, nav bg |
| `--black-high` | `#1a1a1f` | Card hover state, input bg |
| `--gold` | `#c9a84c` | Primary accent, headlines, CTAs, borders |
| `--gold-light` | `#e8c46a` | Hover state of gold elements |
| `--gold-dim` | `#c9a84c20` | Gold fills at low opacity (badges, bg tints) |
| `--red` | `#c0392b` | Danger, LIVE status, destructive actions |
| `--red-light` | `#e74c3c` | Hover state of red elements |
| `--red-dim` | `#c0392b18` | Red fills at low opacity |
| `--white` | `#f5f0e8` | Body text, primary text |
| `--white-dim` | `#f5f0e840` | Secondary text, muted labels |
| `--white-faint` | `#f5f0e810` | Subtle borders, dividers |

### Never use
- Purple, cyan, blue, green, or any other hue
- Gradients that mix more than gold → black or red → black
- White backgrounds anywhere

---

## 03 · Typography

### Typeface Stack

| Role | Font | Weight | Usage |
|---|---|---|---|
| **Display** | `Orbitron` | 900 Black | Page titles, tournament names, hero H1 |
| **Heading** | `Orbitron` | 700 Bold | Section headers, card titles, nav brand |
| **Body** | `Inter` | 400 Regular | Paragraphs, descriptions, form labels |
| **Body Bold** | `Inter` | 600 SemiBold | Button labels, stat labels, emphasis |
| **Mono** | `JetBrains Mono` | 400 Regular | IDs, timestamps, code, status tags |

### Type Scale

```
Hero H1:      clamp(3rem, 7vw, 6rem)     — Orbitron 900, line-height 1.0, letter-spacing -0.02em
Section H2:   clamp(1.6rem, 3vw, 2.4rem) — Orbitron 700, line-height 1.1
Card title:   1rem–1.3rem                — Orbitron 700
Body large:   1.0625rem (17px)           — Inter 400, line-height 1.7
Body base:    0.875rem (14px)            — Inter 400, line-height 1.6
Caption/mono: 0.6875rem (11px)           — JetBrains Mono, letter-spacing 0.15em
```

---

## 04 · Motion System

### Principles
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — all primary transitions
- **Duration:** 400–700ms for entrances, 150–250ms for micro-interactions
- **Stagger:** 80ms between sibling items entering the viewport
- **Reduced motion:** All animations off when `prefers-reduced-motion: reduce`

### Animation Library

| Name | Trigger | Behavior |
|---|---|---|
| `page-enter` | Route change | Opacity 0→1, Y +24px→0, 600ms |
| `card-appear` | Scroll into view | Opacity 0→1, Y +28px→0, scale 0.97→1 |
| `hero-title` | Page load | Letters slide up from clip-path mask, stagger 40ms per word |
| `gold-shimmer` | Hover on gold element | Linear gradient sweep left→right, 500ms |
| `live-pulse` | Always on LIVE badge | Red dot scale 1→1.5→1, opacity 1→0.4→1, 1.4s loop |
| `conic-border` | Hover on tournament card | Conic gradient rotates 360° continuously, 4s loop |
| `float` | Hero 3D emblem | translateY 0→−14px→0, 3.5s ease-in-out loop |
| `scanline` | HUD panels | 2px horizontal line sweeps top→bottom, 10s loop, 4% opacity |
| `counter-up` | Stats entering view | Number increments from 0 to target over 1.2s |
| `magnetic-tilt` | Mouse over card | 3D rotateX/Y ±6deg following cursor, spring physics |
| `underline-slide` | Nav link hover | ScaleX 0→1 on ::after pseudo-element, origin left |
| `stagger-list` | List entering view | Children stagger 80ms, each fadeUp |

### 3D Scene (Three.js / R3F — Hero Section only)
The hero has a single Three.js canvas occupying the right half:

- **Central geometry:** Rotating icosahedron, solid gold-colored, metalness 0.95, roughness 0.05
- **Wireframe shell:** Outer icosahedron 1.6× scale, red wireframe, counter-rotates
- **Orbital rings:** 3 torus rings at 2.5 / 3.2 / 3.9 radius — gold, red, white at decreasing opacity
- **Particles:** 1000 points in gold (#c9a84c) scattered in spherical field, slow drift + rotation
- **Lighting:** Gold point light at [6,6,6], red point light at [−6,−4,4], weak ambient 0.1
- **Post-processing:** Bloom (threshold 0.2, intensity 1.6), subtle Vignette
- **Canvas bg:** Transparent, page black shows through

---

## 05 · Layout System

### Grid
```
Max content width:  1320px
Page padding:       clamp(1.5rem, 5vw, 5rem)
Column gap:         24px (cards), 32px (sections)
Section spacing:    clamp(5rem, 10vw, 10rem) top/bottom padding
```

### Spacing Scale
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96 / 128px`

---

## 06 · Component Specifications

---

### 06-A · Navigation Bar

**Behavior:** Transparent on load. On scroll > 40px → frosted glass.

**Layout:** `fixed top-0 full-width h-[72px]`

```
[SHADØW logo mark]   [Nav links: Platform · Tournaments · Teams · Docs]   [Login CTA]
```

**Logo mark:**
- Small diamond/hexagon shape, gold stroke only (no fill), 28×28px
- "SHADØW" in Orbitron 700, white, 14px
- Tag line "TOURNAMENTS" in JetBrains Mono, gold, 7px, letter-spacing 0.2em

**Nav links:**
- Inter 600, 12px, white at 50% opacity
- Hover: white 100% + gold 1px underline slide animation
- Active route: gold color + permanent underline

**Login CTA:**
- Background: `#c9a84c` (solid gold)
- Text: `#070708` (black), Inter 600, 13px
- Hover: scale 1.02 + gold shimmer sweep
- No border-radius over 6px

**Scrolled state:**
- `background: rgba(7,7,8,0.92)`, `backdrop-filter: blur(20px)`
- `border-bottom: 1px solid rgba(201,168,76,0.12)`

---

### 06-B · Hero Section

**Full viewport height.** Two-column layout on desktop, stacked on mobile.

**Left column (copy):**
- Status chip: `DISCORD-NATIVE · BATTLE-READY`, JetBrains Mono 10px, gold text, gold border 20% opacity, no fill
- H1: "YOUR SERVER. YOUR ARENA. YOUR LEGACY." — Orbitron 900, white. "YOUR ARENA." in gold with text-shadow glow
- Body: Inter 400, 17px, white 55%, max-width 520px
- Primary CTA: full gold bg, black text, height 52px
- Secondary CTA: transparent, white border 10%, same height
- Trust: `✓ Free Tournaments  ✓ Discord Identity` — Inter 400, 12px, white 30%

**Right column (3D):**
- Canvas container: `border: 1px solid rgba(201,168,76,0.15)`, height 500px, rounded-[16px]
- HUD corner brackets: 16×16px at each corner, gold stroke
- HUD caption: JetBrains Mono 9px, white 20%
- Bottom fade vignette

---

### 06-C · Marquee Strip

```
BGMI  ✦  FREE FIRE  ✦  COD MOBILE  ✦  (repeats)
```
- Height 56px, `background: rgba(201,168,76,0.04)`, top/bottom gold borders 8%
- Orbitron 700, 13px, alternating gold / white-30% / red
- Left/right fade masks
- Infinite scroll, pauses on hover

---

### 06-D · Feature Cards

3-column grid. Per card:
- `background: #0f0f12`, `border: 1px solid rgba(255,255,255,0.05)`, `border-radius: 16px`
- Top accent bar: gold gradient, hidden until hover
- Hover: gold radial glow from top + magnetic 3D tilt ±6deg
- Icon container: 44×44px, gold fill 8%, gold border 20%, Lucide icon gold
- Card title: Orbitron 700
- "Learn more →": Inter 600, gold, 12px

---

### 06-E · Game Tiles

3-column grid. Per tile:
- Image 340px tall, `border-radius: 16px`, cover
- Gradient overlay: `linear-gradient(180deg, transparent 40%, #070708 100%)`
- Game name: Orbitron 900, 22px, white overlay bottom-left
- Hover: image scale 1.05, inset gold border 1.5px
- Gold/red dot top-right with matching glow

---

### 06-F · How It Works — 3 Steps

Per step:
- `border-top: 2px solid rgba(201,168,76,0.25)`
- Step number: JetBrains Mono, gold, `01 ─────────`
- Title: Orbitron 700, 22px
- Ghost large number: Orbitron 900, 80px, white 3% opacity, absolute bottom-right
- Connector line between steps: horizontal 1px, gold→red gradient

---

### 06-G · Discord Integration Block

2-column: left copy + right bot embed mockup.
- Panel: `border: 1px solid rgba(201,168,76,0.2)`, dark elevated bg
- Bot embed: `border-left: 3px solid #c9a84c`, monospaced fields, 3 action buttons
- Left: gold status chip, H2 with gold second line, bullet list with gold dots

---

### 06-H · Tournament Cards

- `background: #0f0f12`, `border-radius: 18px`
- Hover: spinning conic gradient border (gold → red → gold), `translateY(-6px)`
- Status badges: LIVE = red pulsing, REG OPEN = gold, UPCOMING = white-dim
- Capacity bar: 3px, gold fill, glows red >90% full
- CTA: full gold when registration open

---

### 06-I · Stats Bar

- 4-column, `background: rgba(201,168,76,0.04)`, `border: 1px solid rgba(201,168,76,0.1)`
- Numbers: Orbitron 900, 40px, alternating gold / white / red / gold
- Labels: JetBrains Mono, 9px, white 30%
- Counter animation on scroll-enter

---

### 06-J · Final CTA Banner

- `border-radius: 24px`, `border: 1px solid rgba(201,168,76,0.18)`
- Radial gold glow orb centered top
- Grid dot overlay at 3% opacity
- Headline Orbitron 900, "COMPETE?" in gold
- Largest CTA button, gold glow on hover

---

### 06-K · Footer

- `border-top: 1px solid rgba(255,255,255,0.05)`
- Logo mark + links + game tags
- All text white 20–30%

---

### 06-L · Server Home (post-login)

- Banner 240px with gold overlay gradient
- Server icon 70px, name Orbitron 900 36px
- Stats row: 4 panels — Orbitron 900 number (gold) + JetBrains Mono label
- 3-col tournament card grid below

---

### 06-M · Admin Sidebar

- Collapsible: 56px (icons) → 200px (expanded)
- Per-item accent color with active gold border-left
- Role badge: SERVER_ADMIN=red, TOURNAMENT_MANAGER=gold, REFEREE=white60%, others=white30%

---

### 06-N · Tournament Catalogue

- Filter pills (gold active), search + game dropdown + grid/list toggle
- Staggered card grid, AnimatePresence filter transitions
- Empty state: large gold icon, Orbitron headline

---

### 06-O · Leaderboards

- Game tabs (gold active), top-3 hero cards, full table with liquid row hover
- Gold rank numbers for top 3

---

### 06-P · Winners Podium

- 3-column podium: 2nd/1st/3rd, heights 160/220/120px
- 1st place: gold glow + floating animation
- Pillar: gold stroke, no fill, scanline overlay
- Awards section: per-type accent cards below

---

### 06-Q · Registration Form

- Multi-step, step indicator bar in gold
- Dark inputs, gold focus ring
- Submit: full gold CTA with spinner state

---

## 07 · Page Wireframes (Text)

### Landing Page — Scroll Order
```
NAV (transparent → glass on scroll)
HERO — Copy left | 3D scene right (full viewport)
MARQUEE STRIP (56px)
FEATURES — 3 feature cards
GAMES — 3 image tiles
HOW IT WORKS — 3 steps
DISCORD INTEGRATION — 2-col panel
LIVE MATCHES — 3 tournament cards
STATS BAR — 4 columns
FINAL CTA — full-width banner
FOOTER
```

### Server Home
```
NAV
SERVER BANNER (image + identity, 280px)
STATS ROW — 4 panels
LIVE & NEXT UP — 3-col card grid
```

### Admin
```
SIDEBAR (200px or 56px) | MAIN CONTENT (full remaining width)
```

---

## 08 · Micro-interaction Details

### Button hover
1. Scale `1.0 → 1.025`, 150ms
2. Gold shimmer sweep left→right, 500ms
3. Box shadow `0 → 0 0 24px rgba(201,168,76,0.4)`, 200ms

### Card hover
1. `translateY(0 → -6px)`, 250ms
2. Border gold tint, 250ms
3. Spinning conic border activates (opacity 0→1, 300ms)
4. Magnetic tilt ±6deg spring

### Input focus
1. `border-color → rgba(201,168,76,0.4)`, 180ms
2. `box-shadow → 0 0 0 3px rgba(201,168,76,0.12)`, 180ms

### Nav scroll
1. `background: transparent → rgba(7,7,8,0.92)`, 300ms
2. `backdrop-filter: none → blur(20px)`, 300ms
3. `border-bottom → 1px solid rgba(201,168,76,0.12)`, 300ms

---

## 09 · Responsive Breakpoints

| Breakpoint | Width | Key changes |
|---|---|---|
| Mobile | < 640px | Single col, no 3D scene, hamburger nav |
| Tablet | 640–1024px | 2-col grids, stats 2×2, hero stacked |
| Desktop | > 1024px | Full layout, 3-col grids |
| Wide | > 1400px | Content capped 1320px |

---

## 10 · Accessibility

- Gold `#c9a84c` on black: AA compliant for large text
- Body `#f5f0e8` on black: AAA compliant
- `focus-visible` gold ring on all interactive elements
- Status dots always paired with text label
- `aria-label` on all icon-only buttons
- `role="progressbar"` on capacity bars
- `prefers-reduced-motion`: all animations off

---

## 11 · Tailwind Config (for Stitch)

```js
colors: {
  gold: { DEFAULT: '#c9a84c', light: '#e8c46a', dim: 'rgba(201,168,76,0.08)' },
  red:  { DEFAULT: '#c0392b', light: '#e74c3c', dim: 'rgba(192,57,43,0.08)' },
  black: { DEFAULT: '#070708', mid: '#0f0f12', high: '#1a1a1f' },
  cream: { DEFAULT: '#f5f0e8' },
}
fontFamily: {
  display: ['Orbitron', 'sans-serif'],
  body:    ['Inter', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
}
```

---

## 12 · Do's and Don'ts

### ✅ Do
- Use gold sparingly — it should feel earned
- Lean into negative space
- Every animation must have a purpose
- Use Orbitron ONLY for titles/labels
- Border-radius: 6px buttons, 10px inputs, 16px cards, 20px large panels, 28px banners

### ❌ Don't
- No purple, cyan, blue, or any color outside black/gold/red
- No white backgrounds anywhere
- No more than 2 font sizes per card
- No decorative spinning/bouncing without function
- No gradients mixing more than 2 colors
- No gold text on gold backgrounds

---

*End of Design.md · SHADØW Tournaments v1.0*
*Ready for Google Stitch · All measurements px/rem · All colors hex*
