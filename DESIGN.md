# ðŸŽ® LEGENDARY ESPORTS PLATFORM
## Master Design & Documentation Bible
### Version 1.0 â€” Complete Build Reference

---

# PART 1 â€” PLATFORM OVERVIEW

**Name:** Legendary Esports  
**Live URL:** https://shadow-tournaments.vercel.app  
**Stack:** Next.js 14 Â· TypeScript Â· Prisma Â· Neon DB Â· Supabase Auth Â· Discord.js Â· Railway  
**Purpose:** Discord-native esports tournament management for BGMI, Free Fire & COD Mobile  
**Bot Name:** SHADÃ˜W  
**Bot Invite:** https://discord.com/oauth2/authorize?client_id=1560641364646035470&scope=bot+applications.commands

---

# PART 2 â€” DESIGN SYSTEM

## 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `void` | `#050508` | Page background |
| `deep` | `#0d0d18` | Secondary background |
| `elevated` | `#111127` | Cards, panels |
| `violet` | `#7c3aed` | Primary CTA, active |
| `violet-dim` | `rgba(124,58,237,0.15)` | Card tints |
| `cyan` | `#06b6d4` | Info, secondary |
| `red` | `#ef4444` | Danger, live, errors |
| `green` | `#22c55e` | Success, approved |
| `amber` | `#f59e0b` | Warning, pending |
| `gold` | `#f59e0b` â†’ `#fbbf24` | Champions, winners |
| `text-1` | `#f8fafc` | Headlines |
| `text-2` | `#94a3b8` | Body text |
| `text-3` | `#475569` | Captions |
| `border` | `rgba(255,255,255,0.08)` | Card borders |
| `border-glow` | `rgba(124,58,237,0.4)` | Active borders |

## 2.2 Typography

| Role | Font | Weight | Where |
|------|------|--------|-------|
| Display | **Orbitron** | 900 | Page titles, tournament names, HUD text |
| Code/Mono | **JetBrains Mono** | 400/700 | IDs, stats, countdowns, terminal |
| Body | **Inter** | 400/600 | Everything else |

## 2.3 Neon Glow System

```css
/* Violet primary glow */
--glow-violet: 0 0 20px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.2);

/* Cyan secondary glow */
--glow-cyan: 0 0 20px rgba(6,182,212,0.6), 0 0 60px rgba(6,182,212,0.2);

/* Red live/danger glow */
--glow-red: 0 0 20px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.2);

/* Green success glow */
--glow-green: 0 0 20px rgba(34,197,94,0.6), 0 0 60px rgba(34,197,94,0.2);

/* Gold winner glow */
--glow-gold: 0 0 30px rgba(251,191,36,0.8), 0 0 80px rgba(251,191,36,0.3);

/* Glass surface */
--glass: rgba(255,255,255,0.03);
--glass-border: 1px solid rgba(255,255,255,0.08);
--glass-blur: backdrop-filter: blur(12px);
```

## 2.4 Animation Library (Framer Motion)

```typescript
// Page entrance â€” every page
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } }
}

// Stagger children
const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } }
}

// Card hover
const cardHover = {
  whileHover: { y: -2, boxShadow: "var(--glow-violet)" },
  transition: { duration: 0.15 }
}

// Number counter
const useCountUp = (target, duration = 1500) => { /* animates 0 â†’ target */ }

// Glow pulse (CSS keyframe)
@keyframes glowPulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

// Scan line (hero sections)
@keyframes scanLine {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

// Glitch (IDs, codes)
@keyframes glitch {
  0%  { clip-path: inset(40% 0 61% 0); transform: translate(-2px) }
  20% { clip-path: inset(92% 0 1% 0);  transform: translate(1px) }
  100%{ clip-path: inset(40% 0 61% 0); transform: translate(0) }
}
```

## 2.5 3D & Three.js Effects

```typescript
// Hero particle field (Landing page)
// â€” 3000 floating particles forming a grid
// â€” Neon color: violet/cyan mix
// â€” Mouse parallax: particles shift on cursor move
// â€” Depth: z-layers for 3D feel

// Trophy 3D model (Winners pages)
// â€” GLTF trophy model
// â€” Rotate on scroll, glow material
// â€” Gold emission shader

// Bracket connector lines (Bracket page)
// â€” SVG paths with neon stroke
// â€” Drawn with stroke-dashoffset animation
// â€” Glow filter on SVG

// Podium 3D (Leaderboards)
// â€” CSS 3D perspective podium
// â€” Platforms rise on page load
// â€” Gold/silver/bronze gradient platforms
```

---

# PART 3 â€” COMPLETE SITEMAP

```
LEGENDARY ESPORTS â€” shadow-tournaments.vercel.app
â”‚
â”œâ”€â”€ / ......................................... Landing Page
â”œâ”€â”€ /servers .................................. Your Servers Hub
â”‚
â”œâ”€â”€ /servers/:guildId ......................... Server Home
â”‚   â”œâ”€â”€ /tournaments .......................... Tournament Catalogue
â”‚   â”‚   â””â”€â”€ /:tournamentId .................... Tournament Detail
â”‚   â”‚       â”œâ”€â”€ /register ..................... Register Form
â”‚   â”‚       â””â”€â”€ /bracket ...................... Live Bracket
â”‚   â”œâ”€â”€ /leaderboards ......................... Leaderboards
â”‚   â”œâ”€â”€ /winners .............................. Winners Hall
â”‚   â”‚   â””â”€â”€ /:tournamentId .................... Victory Page
â”‚   â”œâ”€â”€ /dashboard ............................ Public Stats
â”‚   â”‚
â”‚   â”œâ”€â”€ /admin ................................ [ADMIN PANEL â€” needs REFEREE+]
â”‚   â”‚   â”œâ”€â”€ /tournaments ...................... Manage Tournaments
â”‚   â”‚   â”‚   â”œâ”€â”€ /new .......................... Create Tournament Wizard
â”‚   â”‚   â”‚   â””â”€â”€ /:tournamentId ................ Tournament Control Room
â”‚   â”‚   â”‚       â”œâ”€â”€ /participants ............. Participants Manager
â”‚   â”‚   â”‚       â”œâ”€â”€ /matches .................. Match Manager
â”‚   â”‚   â”‚       â””â”€â”€ /finalize ................. Finalize & Crown Winners
â”‚   â”‚   â”œâ”€â”€ /matches .......................... All Matches Overview
â”‚   â”‚   â”œâ”€â”€ /results .......................... Results Review Queue
â”‚   â”‚   â”œâ”€â”€ /analytics ........................ Admin Analytics
â”‚   â”‚   â”œâ”€â”€ /settings ......................... Server Configuration
â”‚   â”‚   â””â”€â”€ /payment .......................... Payment Settings (Razorpay)
â”‚   â”‚
â”‚   â””â”€â”€ /developer ............................ [DEV DASHBOARD â€” needs SERVER_ADMIN]
â”‚       â”œâ”€â”€ Bot Analytics Tab
â”‚       â”œâ”€â”€ Bot Errors Tab
â”‚       â”œâ”€â”€ Bridge Health Tab
â”‚       â””â”€â”€ Website Errors Tab
â”‚
â”œâ”€â”€ /overlay/:guildId/:tournamentId ........... OBS Stream Overlay
â”‚
â”œâ”€â”€ /docs ..................................... Documentation Hub
â”‚   â”œâ”€â”€ /getting-started ...................... Setup Guide
â”‚   â”œâ”€â”€ /discord-commands ..................... Command Reference
â”‚   â””â”€â”€ /tournaments
â”‚       â”œâ”€â”€ /create ........................... Create Tournament Guide
â”‚       â””â”€â”€ /formats .......................... Tournament Formats
â”‚
â””â”€â”€ /api ...................................... REST API
    â”œâ”€â”€ /auth/login ........................... Discord OAuth start
    â”œâ”€â”€ /auth/callback ........................ OAuth callback
    â”œâ”€â”€ /auth/logout .......................... Sign out
    â”œâ”€â”€ /auth/me .............................. Current user
    â”œâ”€â”€ /servers .............................. Server list
    â”œâ”€â”€ /servers/:guildId ..................... Server info
    â”œâ”€â”€ /servers/:guildId/tournaments ......... Tournament CRUD
    â”œâ”€â”€ /servers/:guildId/admin/* ............. Admin operations
    â”œâ”€â”€ /developer/metrics .................... Platform metrics
    â”œâ”€â”€ /developer/errors ..................... Error logs
    â”œâ”€â”€ /developer/bridge-health .............. Bot-web bridge
    â”œâ”€â”€ /developer/bot-analytics .............. Bot usage stats
    â””â”€â”€ /developer/website-errors ............. Website error logs
```

---

# PART 4 â€” PAGE DESIGNS (ALL 30 PAGES)

---

## ðŸ  PUBLIC PAGES

---

### PAGE 01 Â· `/` â€” LANDING PAGE
**Access:** Public  
**Purpose:** Convert visitors. First impression.

**Layout â€” Full page, no sidebar**

**SECTION A â€” HERO (100vh)**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [3D Particle Canvas â€” full background]         â”‚
â”‚  Floating violet/cyan particles + grid lines    â”‚
â”‚  Mouse parallax â€” particles follow cursor       â”‚
â”‚                                                 â”‚
â”‚         LEGENDARY                               â”‚ â† Orbitron 900, glitch reveal
â”‚           ESPORTS                               â”‚   on load, scanline sweep
â”‚                                                 â”‚
â”‚  Discord-native tournament management           â”‚ â† Inter 400, fade in
â”‚  BGMI  Â·  FREE FIRE  Â·  COD MOBILE             â”‚   stagger 0.2s
â”‚                                                 â”‚
â”‚  [Login with Discord]  [View Docs]              â”‚ â† GlowButton violet + ghost
â”‚                                                 â”‚
â”‚  â†“ (bouncing chevron)                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Background: `Three.js PointCloud` â€” 3000 particles, violet/cyan
- Title: letter-by-letter reveal + glitch effect + persistent glow
- CTA hover: intense violet bloom

**SECTION B â€” LIVE STATS BAR**
```
  1,247 Tournaments  Â·  48,392 Players  Â·  892 Servers  Â·  â‚¹24L Prize Pool
```
- Count-up animation from 0 on scroll enter
- Neon `Â·` separators with pulse
- JetBrains Mono font

**SECTION C â€” FEATURE CARDS (3-col)**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸŽ®  3D icon â”‚ â”‚  âš¡  3D icon â”‚ â”‚  ðŸ”„  3D icon â”‚
â”‚  Discord     â”‚ â”‚  Multi-Game  â”‚ â”‚  Real-Time   â”‚
â”‚  Native      â”‚ â”‚  Support     â”‚ â”‚  Sync        â”‚
â”‚  Description â”‚ â”‚  Description â”‚ â”‚  Description â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Icons: Lottie animated or CSS keyframe 3D rotation
- Card hover: lifts 4px, violet border glows, background brightens
- Stagger animate in on scroll

**SECTION D â€” GAMES SHOWCASE**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [BGMI]     â”‚  â”‚ [FREE FIRE] â”‚  â”‚ [COD MOBILE]â”‚
â”‚  Violet BG  â”‚  â”‚   Red BG    â”‚  â”‚   Green BG  â”‚
â”‚  ðŸ‡®ðŸ‡³ BRÂ·CS  â”‚  â”‚ ðŸ”¥ BRÂ·CSÂ·LWâ”‚  â”‚ ðŸ’¥ MPÂ·BR   â”‚
â”‚  24K teams  â”‚  â”‚ 18K teams   â”‚  â”‚ 12K teams  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Animated gradient backgrounds (shifting hue)
- Game logos with parallax depth on hover
- Hover: particle burst from card center

**SECTION E â€” HOW IT WORKS**
- 3 steps connected by animated SVG line
- Line draws itself as user scrolls down
- Step circles glow when line reaches them
- Icons inside circles animate on activation

**SECTION F â€” FINAL CTA**
- "Join 892 servers" counter
- Large `Get Started Free` button with aurora glow
- Background: subtle grid pattern

**SECTION G â€” FOOTER**
- Dark panel `#030305`
- Logo, links, social icons
- Neon separator line at top

---

### PAGE 02 Â· `/servers` â€” YOUR SERVERS HUB
**Access:** Authenticated  
**Purpose:** Navigate to your Discord servers.

**Layout â€” Full page, no sidebar**

**Header:**
- "YOUR SERVERS" â€” Orbitron, with subtitle
- Animated hex grid background (CSS)

**Sections (3 groups with animated headers):**

**GROUP 1 â€” CONNECTED SERVERS**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [Server Icon]   ROCKSTAR DEVELOPMENT  â”‚
â”‚  ðŸŸ¢ Bot Active                         â”‚
â”‚  3 LIVE  Â·  12 UPCOMING                â”‚
â”‚                        [Open Server â†’] â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Animated green pulse dot
- Tournament count badges (red for live, cyan for upcoming)
- Hover: violet border + card lift

**GROUP 2 â€” ADD BOT**
- Same card style but dashed violet border
- "+" icon with slow spin animation
- "Add Bot" opens Discord OAuth in new tab

**GROUP 3 â€” OTHER SERVERS**
- Greyed out, 50% opacity
- "View Only" badge
- No hover glow effect

**Empty States:**
- Animated floating trophy illustration (SVG/Lottie)
- "No servers yet" with Discord invite CTA

---

## ðŸ–¥ï¸ SERVER PAGES

---

### PAGE 03 Â· `/servers/:guildId` â€” SERVER HOME
**Access:** Public  
**Purpose:** Server landing â€” show tournaments to players.

**Layout â€” Full page, Navigation bar**

**HERO HEADER:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [80px Server Icon â€” glowing ring]               â”‚
â”‚  ROCKSTAR DEVELOPMENT            [âš™ï¸ Admin]      â”‚
â”‚  Asia/Kolkata  Â·  1,248 members                  â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  [Leaderboards] [Tournaments] [Winners] [Stats]  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Server icon: colored ring border (server accent color)
- Admin button: only visible to server owner/admin
- Quick nav: pill buttons, animated underline on active

**LIVE TOURNAMENTS:**
- `ðŸ”´ LIVE` badge with red pulse animation
- Horizontal card scroll on mobile, 3-col grid desktop
- Each card: countdown timer (flip animation), team count progress bar, `JOIN LOBBY` CTA

**UPCOMING TOURNAMENTS:**
- `ðŸ“… UPCOMING` with animated calendar icon
- Cards: registration deadline countdown, capacity fill bar, `REGISTER` CTA
- "Starts in X days" computed dynamically

**RECENT CHAMPIONS:**
- Horizontal podium strip: ðŸ¥‡ ðŸ¥ˆ ðŸ¥‰
- Names with gold/silver/bronze text glow
- Linking to full winners page

**Functions:** SSR with 60s revalidate, accent color from server settings, admin detection

---

### PAGE 04 Â· `/servers/:guildId/tournaments` â€” TOURNAMENT CATALOGUE
**Access:** Public  
**Purpose:** Browse all tournaments.

**FILTER BAR (sticky):**
```
[ALL] [BGMI] [FREE FIRE] [COD MOBILE]   Status: [LIVEâ–¼]   Sort: [Latestâ–¼]
[ðŸ” Search tournaments...]
```
- Filter chips: pill shape, active = violet bg + glow
- Dropdowns: dark themed, animated open
- Search: real-time debounced filter

**TOURNAMENT GRID (3-col desktop, 1-col mobile):**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸŽ® BGMI  Â·  BR Â· Solo       [LIVE ðŸ”´]  â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚  SUMMER CHAMPIONSHIP 2025                â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚  ðŸ“… Jan 15  â”‚  ðŸ‘¥ 48/64  â”‚  ðŸ’° â‚¹5,000   â”‚
â”‚  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘  75% full             â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  [VIEW DETAILS â†’]    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- LIVE badge: red bg + pulse dot animation
- OPEN: green bg
- UPCOMING: amber bg + countdown
- COMPLETED: grey bg
- Capacity bar: gradient greenâ†’yellowâ†’red
- Hover: card lifts 3px, border glows in game color

**Empty state:** Animated search icon, "No tournaments found"

---

### PAGE 05 Â· `/servers/:guildId/tournaments/:tournamentId` â€” TOURNAMENT DETAIL
**Access:** Public  
**Purpose:** Full tournament info + registration.

**HERO BANNER:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [Full-width banner or animated gradient]        â”‚
â”‚                                                  â”‚
â”‚  [BGMI] [SOLO] [LIVE ðŸ”´]                        â”‚
â”‚                                                  â”‚
â”‚  SUMMER CHAMPIONSHIP 2025                        â”‚ â† Massive Orbitron
â”‚                                                  â”‚
â”‚  ðŸ’° Prize: â‚¹50,000   ðŸ‘¥ 48/64 teams             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Gradient fallback: game-specific color (BGMI=violet, FF=red, COD=green)
- Game watermark logo in background (30% opacity)
- Status badge with live pulse

**INFO GRID:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   FORMAT     â”‚   CAPACITY   â”‚   ENTRY FEE  â”‚  START DATE  â”‚
â”‚  BR Â· Solo   â”‚ 48/64 Teams  â”‚    â‚¹100      â”‚  Jan 15, 2025â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Glass cards for each metric
- Animated count-up for numbers on first load

**TABS (animated underline indicator):**
- `OVERVIEW` â€” description, rules, prize breakdown table, schedule
- `PARTICIPANTS` â€” list of registered teams with status
- `BRACKET` â€” visual bracket (see Page 11)
- `STANDINGS` â€” live ranked table

**REGISTRATION BLOCK:**
- Open: `[REGISTER NOW]` violet glow button + countdown to close
- Registered + Pending: amber status card, "Awaiting approval"
- Registered + Approved: green card, "You're in! Check bracket"
- Rejected: red card with reason
- Full: "Tournament full â€” join waitlist"
- Closed: grey state, registration ended message

---

### PAGE 06 Â· `/servers/:guildId/tournaments/:tournamentId/register` â€” REGISTER
**Access:** Authenticated  
**Purpose:** Team registration flow.

**Multi-Step Wizard:**
```
[â—â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â—‹â”â”â”â”â”â”â”â”â”â”â”â”â—‹â”â”â”â”â”â”â”â”â”â”â”â”â—‹]
STEP 1           STEP 2            STEP 3          STEP 4
Team Info      Player Details     Payment         Confirm
```
- Progress bar: animated violet fill
- Steps slide in from right (Framer Motion `x: 50 â†’ 0`)

**STEP 1 â€” TEAM INFO:**
- Team name input (with live character count)
- Team tag: 4-char input with border highlight
- Logo upload: drag & drop zone with preview
- Neon dashed border on drag-over

**STEP 2 â€” PLAYER DETAILS:**
- IGN (In-Game Name)
- UID / Player ID  
- Device: Mobile / Emulator (radio pills)
- Discord: pre-filled from auth

**STEP 3 â€” PAYMENT (if paid):**
- Entry fee display card
- Razorpay branded button
- Secure payment badge
- "Amount will be charged: â‚¹100"

**STEP 4 â€” CONFIRMATION:**
- Summary card: team name, player, tournament
- Green checkmark burst animation (Framer Motion scale + opacity)
- "What happens next" explainer
- `[View Tournament]` CTA

**Validation:** Red shake animation on error, inline error messages

---

### PAGE 07 Â· `/servers/:guildId/tournaments/:tournamentId/bracket` â€” BRACKET
**Access:** Public  
**Purpose:** Live tournament bracket.

**HEADER:**
- "TOURNAMENT BRACKET" in Orbitron
- Round indicators (Round 1 / QF / SF / Final)
- `ðŸ”´ LIVE` if active matches, auto-refresh timer

**BRACKET VISUALIZATION:**
```
Round 1          Round 2         Semi-Final      Final
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Alpha  â”‚â”€â”€â”
â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚           â”‚
â”‚  Beta  â”‚â”€â”€â”˜           â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚            â”‚
            â”‚ Alpha  â”‚â”€â”€â”˜            â”œâ”€â”€â–º CHAMPION
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”  â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚
â”‚ Gamma  â”‚â”€â”€â”                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”             â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚           â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â”‚ Delta  â”‚â”€â”€â”˜           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚ Gamma  â”‚
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- SVG connectors with neon stroke + glow filter
- Lines draw from leftâ†’right with `stroke-dashoffset` animation
- Winner: green highlight + checkmark
- Loser: greyed, 40% opacity
- Active match: amber pulsing border
- Click match â†’ modal with full match details

**Mobile:** Horizontal scroll, zoom controls

---

### PAGE 08 Â· `/servers/:guildId/leaderboards` â€” LEADERBOARDS
**Access:** Public  
**Purpose:** Server-wide player rankings.

**TOP 3 PODIUM (animated):**
```
          â”Œâ”€â”€â”€â”€â”€â”€â”
          â”‚ ðŸ¥‡ 1 â”‚  â† tallest, gold glow
   â”Œâ”€â”€â”€â”€â” â”‚      â”‚ â”Œâ”€â”€â”€â”€â”
   â”‚ ðŸ¥ˆ â”‚ â”‚      â”‚ â”‚ ðŸ¥‰ â”‚
   â”‚ 2  â”‚ â”‚      â”‚ â”‚ 3  â”‚
   â””â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”˜
```
- Platforms rise up from y: 100 â†’ 0 on load
- Player avatars with crown on 1st
- Particle confetti burst on load
- Name in game-accurate colored text

**LEADERBOARD TABLE:**
| # | Change | Player | Points | Wins | K/D | Tournaments |
|---|--------|--------|--------|------|-----|-------------|
| ðŸ¥‡ | â€” | ProPlayer99 | 4,820 | 12 | 4.2 | 18 |
| ðŸ¥ˆ | â†‘2 | NightHawk | 4,210 | 9 | 3.8 | 15 |
| #3 | â†“1 | ShadowKing | 3,940 | 8 | 3.1 | 21 |

- Rank change arrows: green â†‘ / red â†“ / grey â€”
- Top 3 rows: subtle gold/silver/bronze tint
- Row hover: violet left border + row highlight
- Infinite scroll pagination

**FILTERS:**
- Game: ALL / BGMI / FREE FIRE / COD MOBILE
- Period: All Time / This Month / This Week
- Mode: Solo / Duo / Squad

---

### PAGE 09 Â· `/servers/:guildId/winners` â€” WINNERS HALL
**Access:** Public  
**Purpose:** All-time champions trophy room.

**HEADER:**
- `ðŸ† HALL OF CHAMPIONS` in Orbitron with gold glow
- Animated gold particle floaties in background

**WINNER CARDS GRID:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [BGMI] [JAN 2025]               â”‚
â”‚                                  â”‚
â”‚      ðŸ†                          â”‚ â† gold shimmer animation
â”‚                                  â”‚
â”‚  SUMMER CHAMPIONSHIP 2025        â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚  ðŸ‘‘ Team FireStorm                â”‚ â† gold text glow
â”‚  64 teams Â· 3 rounds             â”‚
â”‚  [ðŸ¥‡ View Bracket]               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Card hover: flip animation revealing match stats on back
- Trophy icon: continuous shimmer keyframe
- Filter by game / date range

---

### PAGE 10 Â· `/servers/:guildId/winners/:tournamentId` â€” VICTORY PAGE
**Access:** Public  
**Purpose:** Cinematic victory celebration.

**Full-screen victory experience:**
- Black void background
- On load: burst of gold/violet confetti particles
- Rising `ðŸ†` with bloom glow growing over 1 second
- `CHAMPION` text letter-by-letter reveal
- Winner team name in massive Orbitron with gold glow

**PODIUM:**
```
            [AVATAR]
            TEAM NAME
              ðŸ¥‡
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
[AVATAR] â”‚          â”‚ [AVATAR]
TEAM 2nd â”‚  1ST     â”‚ TEAM 3rd
  ðŸ¥ˆ     â”‚  PLACE   â”‚   ðŸ¥‰
â”Œâ”€â”€â”€â”€â”€â”€â” â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”Œâ”€â”€â”€â”€â”€â”€â”
â”‚  2nd â”‚              â”‚  3rd â”‚
â””â”€â”€â”€â”€â”€â”€â”˜              â””â”€â”€â”€â”€â”€â”€â”˜
```

**STATS ROW:**
```
  64 Teams   Â·   18 Matches   Â·   3 Rounds   Â·   â‚¹50,000 Prize
```

**SHARE:** `[ðŸ“‹ Copy Link]` `[ðŸ¦ Twitter]` `[ðŸ“¸ Screenshot]`

---

### PAGE 11 Â· `/servers/:guildId/dashboard` â€” PUBLIC STATS
**Access:** Public  
**Purpose:** Server performance overview.

**KPI ROW (4 cards, animated counters):**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   ðŸ†     â”‚ â”‚   ðŸ‘¥     â”‚ â”‚   âš”ï¸     â”‚ â”‚   ðŸŽ¯     â”‚
â”‚    24    â”‚ â”‚  1,248   â”‚ â”‚   342    â”‚ â”‚   18     â”‚
â”‚Tournamentsâ”‚ â”‚ Players  â”‚ â”‚ Matches  â”‚ â”‚   Live   â”‚
â”‚â†‘12% monthâ”‚ â”‚â†‘8% month â”‚ â”‚â†‘5% month â”‚ â”‚          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**CHARTS:**
- Tournament activity: area chart, neon violet fill
- Game distribution: animated donut, game colors
- Registration timeline: bar chart, grouped by game

**RECENT ACTIVITY FEED:**
- Live events streaming: new registrations, match results, tournaments
- Each item: icon + description + time ago
- Subtle slide-in animation for new items

---

## âš™ï¸ ADMIN PANEL

**Common Admin Layout:**
- Left sidebar (16rem) with collapse toggle
- Right: main content area
- Top: breadcrumb navigation

---

### PAGE 12 Â· `/servers/:guildId/admin/tournaments` â€” TOURNAMENT LIST
**Access:** TOURNAMENT_MANAGER+

**HEADER:**
```
TOURNAMENT MANAGEMENT                [+ CREATE TOURNAMENT]
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
[ALL] [LIVE] [OPEN] [DRAFT] [COMPLETED]
```

**TABLE:**
```
NAME              â”‚ GAME      â”‚ STATUS      â”‚ TEAMS  â”‚ DATE     â”‚ ACTIONS
Summer Cup        â”‚ ðŸŽ® BGMI   â”‚ ðŸŸ¢ LIVE     â”‚ 48/64  â”‚ Jan 15   â”‚ [Manageâ–¼]
Winter Series     â”‚ ðŸ”¥ FF     â”‚ ðŸŸ¡ OPEN     â”‚ 12/32  â”‚ Jan 20   â”‚ [Manageâ–¼]
Draft #3          â”‚ ðŸ’¥ COD    â”‚ âšª DRAFT    â”‚  0/16  â”‚ Feb 1    â”‚ [Manageâ–¼]
```
- Sortable by clicking column header (arrow indicator)
- Manage dropdown: Edit / View / Publish / Cancel / Delete
- Bulk select with checkbox column
- Bulk actions toolbar appears when rows selected

---

### PAGE 13 Â· `/servers/:guildId/admin/tournaments/new` â€” CREATE WIZARD
**Access:** TOURNAMENT_MANAGER+

**5-STEP WIZARD:**
```
[â‘ â”â”â”â”â”â”â‘¡â”â”â”â”â”â”â‘¢â”â”â”â”â”â”â‘£â”â”â”â”â”â”â‘¤]
Basics  Format  Schedule  Entry  Preview
```

**STEP 1 â€” BASICS:**
- Tournament name (large input, Orbitron style)
- Game selector: 3 visual cards (click to select, glow border on selection)
- Description: textarea with character count
- Banner: drag & drop upload, live preview

**STEP 2 â€” FORMAT:**
- Mode chips: `SOLO` `DUO` `SQUAD`
- Format: `Single Elimination` `Double Elimination` `Round Robin` with visual diagram
- Capacity slider: 8 / 16 / 32 / 64 (snaps to power of 2)

**STEP 3 â€” SCHEDULE:**
- All datetime pickers: dark themed, violet accent calendar
- Start / End / Registration Open / Registration Close / Check-in Window

**STEP 4 â€” ENTRY:**
- Toggle: `FREE â—‹â”€â”€â”€â”€â— PAID`
- If paid: entry fee input (â‚¹), currency formatted
- Auto-approve toggle: "Approve registrations automatically"
- Max team size per registration

**STEP 5 â€” PREVIEW:**
- Full tournament card exactly as players will see it
- `[Save as Draft]` ghost button + `[Publish Now]` violet glow button
- "Back to edit" link

---

### PAGE 14 Â· `/servers/:guildId/admin/tournaments/:tournamentId` â€” CONTROL ROOM
**Access:** TOURNAMENT_MANAGER+

**HEADER:**
```
â† Back to Tournaments
SUMMER CUP 2025                    [PUBLISH] [CANCEL] [FINALIZE]
BGMI Â· Solo Â· 48/64 teams Â· Jan 15
```
- PUBLISH: green glow (only in DRAFT)
- CANCEL: red glow (with confirmation modal)
- FINALIZE: violet glow (only when all matches done)

**4 TABS:**

**TAB: OVERVIEW**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  48     â”‚ â”‚  36     â”‚ â”‚   12    â”‚ â”‚ Jan 15  â”‚
â”‚ Teams   â”‚ â”‚Approved â”‚ â”‚ Pending â”‚ â”‚  Date   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Registration progress bar
- Status history timeline (DRAFT â†’ OPEN â†’ LIVE â†’ COMPLETED)
- Recent activity feed

**TAB: REGISTRATIONS**
```
[ðŸ” Search team...]  [Bulk Approve] [Bulk Reject] [Export CSV]

TEAM          â”‚ PLAYERS â”‚ STATUS      â”‚ REGISTERED  â”‚ ACTIONS
Team Alpha    â”‚    4    â”‚ â³ PENDING  â”‚ 2h ago      â”‚ [âœ“] [âœ—] [â†’]
Team Beta     â”‚    4    â”‚ âœ… APPROVED â”‚ 1d ago      â”‚ [Revoke]
Team Gamma    â”‚    4    â”‚ âŒ REJECTED â”‚ 3d ago      â”‚ [Restore] [â†’]
```
- Status filter chips above table
- Click team row â†’ drawer with full player details
- Approve/Reject with optional message

**TAB: MATCHES**
- Match schedule grid
- Room ID/password (blurred, click to reveal)
- Enter Results button per match
- Disputed matches: amber border + exclamation badge

**TAB: SETTINGS**
- Edit all tournament fields (react-hook-form)
- All same fields as creation wizard
- Auto-save indicator

---

### PAGE 15 Â· `/servers/:guildId/admin/tournaments/:tournamentId/participants`
**Access:** TOURNAMENT_MANAGER+

- Full participant list with search
- Each row: team name, all player IGNs/UIDs, registration date, status
- Filter by status
- Export to CSV button
- Bulk status update

---

### PAGE 16 Â· `/servers/:guildId/admin/tournaments/:tournamentId/matches`
**Access:** REFEREE+

**Match Cards Grid:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  MATCH #12 Â· Round 2 Â· Jan 15 4PM  â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  Team Alpha      VS      Team Beta  â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  Room: MK4892  Pass: â€¢â€¢â€¢â€¢â€¢ [Show]  â”‚
â”‚  Status: [ðŸŸ¡ Scheduled]             â”‚
â”‚  [Enter Results]  [Dispute]         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- "Enter Results" â†’ modal with score/placement/kills inputs
- Room credentials revealed on click (security)
- Status: Scheduled â†’ Live â†’ Completed â†’ Disputed

---

### PAGE 17 Â· `/servers/:guildId/admin/tournaments/:tournamentId/finalize`
**Access:** TOURNAMENT_MANAGER+

**FINALIZE SCREEN:**
- Final standings preview with podium
- Winner confirmation: drag to reorder top 3
- Prize distribution summary
- Discord announcement preview (how it'll look in the channel)
- `[FINALIZE & ANNOUNCE]` â€” large action button with confirmation

---

### PAGE 18 Â· `/servers/:guildId/admin/matches` â€” ALL MATCHES
**Access:** REFEREE+

- Filter: by tournament / round / status / date
- Inline result entry without navigating
- Disputed matches section (amber highlight row)
- Quick room credential copy buttons

---

### PAGE 19 Â· `/servers/:guildId/admin/results` â€” RESULTS QUEUE
**Access:** REFEREE+

**Split-pane review interface:**
```
LEFT PANEL                    â”‚  RIGHT PANEL
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Match #12 Â· Team Alpha        â”‚  [Screenshot preview]
Submitted by: PlayerXYZ       â”‚
2 hours ago                   â”‚  Score: 15 kills
                              â”‚  Placement: 1st
                              â”‚
[Approve âœ“] [Dispute âš ] [â†’]  â”‚  [Request Correction]
```
- Queue number badge on sidebar nav item
- Approve triggers standings recalculation
- Dispute opens chat thread

---

### PAGE 20 Â· `/servers/:guildId/admin/analytics` â€” ADMIN ANALYTICS
**Access:** REFEREE+

**ANALYTICS SUITE:**

**Row 1 â€” Revenue KPIs:**
```
[â‚¹24,500 Collected] [â‚¹18,200 Settled] [6,300 Pending] [42 Transactions]
```

**Row 2 â€” Charts:**
- Revenue over time: area chart (30/60/90 day toggle)
- Game popularity: animated donut
- Registration trends: multi-line chart by game

**Row 3 â€” Advanced:**
- Retention: new vs returning players (stacked bar)
- Peak hours heatmap: activity by hour Ã— day of week
- Tournament completion rate: funnel chart

**EXPORT:** `[Export CSV]` `[Export PDF Report]`

---

### PAGE 21 Â· `/servers/:guildId/admin/settings` â€” SERVER CONFIG
**Access:** SERVER_ADMIN

**SETTINGS SECTIONS:**

**General:**
- Server display name, description
- Timezone: searchable dropdown with UTC offset
- Server accent color: color picker (updates live preview)

**Discord Channels:**
- Bind: Announcement / Results / Disputes / Admin / Check-in
- Each: discord channel selector

**Role Mapping:**
- Map Discord roles â†’ REFEREE / TOURNAMENT_MANAGER / SERVER_ADMIN
- "Who has access" explainer per role level

**Branding:**
- Logo upload (SVG/PNG)
- Banner image
- Custom accent color

**Notifications:**
- Toggle each event type for Discord announcements

**Danger Zone:**
- "Reset all settings" â€” red button with double-confirm
- "Deactivate bot" â€” removes server from platform

---

### PAGE 22 Â· `/servers/:guildId/admin/payment` â€” RAZORPAY SETTINGS
**Access:** SERVER_ADMIN

**CONNECTION CARD:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  RAZORPAY INTEGRATION                    â”‚
â”‚  Status: âœ… Connected & Verified         â”‚
â”‚  Key ID: rzp_live_â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢           â”‚
â”‚  Mode: ðŸŸ¢ LIVE                           â”‚
â”‚                        [Reconfigure]     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**CONFIGURATION FORM:**
- Razorpay Key ID + Key Secret
- Webhook secret
- Webhook URL (copy button)
- `[Test Connection]` â†’ shows âœ… / âŒ with details
- Live/Test mode toggle

**TRANSACTIONS TABLE:**
| Date | Tournament | Team | Amount | Status |
|------|-----------|------|--------|--------|
| Jan 15 | Summer Cup | Team Alpha | â‚¹100 | âœ… |

---

## ðŸ› ï¸ DEVELOPER DASHBOARD

---

### PAGE 23 Â· `/servers/:guildId/developer` â€” DEV DASHBOARD
**Access:** SERVER_ADMIN only

**Purpose:** Technical observability for server owners and platform developers.

**Layout:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [âš™ï¸ BOT ANALYTICS] [âŒ BOT ERRORS] [ðŸ”— BRIDGE]    â”‚
â”‚  [ðŸŒ WEBSITE ERRORS]                                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

**TAB 1 â€” BOT ANALYTICS**

**Purpose:** Track how users are using the Discord bot.

**KPI Cards:**
```
[Commands Today: 247] [Active Users: 84] [Errors: 3] [Uptime: 99.8%]
```

**Charts:**
- Command usage over time: bar chart by command name
- Most used commands: horizontal bar chart ranking
  ```
  /register   â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ  248 uses
  /result     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ      156 uses
  /setup      â–ˆâ–ˆâ–ˆâ–ˆ              48 uses
  /create     â–ˆâ–ˆâ–ˆ               36 uses
  ```
- Command success rate: donut chart (success vs error)
- Peak usage hours: heatmap by hour

**Command Log Table:**
| Time | User | Command | Status | Duration |
|------|------|---------|--------|----------|
| 4:23 PM | PlayerXYZ | /register | âœ… | 234ms |
| 4:21 PM | AdminABC | /create | âœ… | 891ms |
| 4:18 PM | PlayerDEF | /result | âŒ | 45ms |

- Click row â†’ full command execution trace

---

**TAB 2 â€” BOT ERRORS**

**Purpose:** Monitor and debug bot command failures.

**Error Queue:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  âŒ CommandError Â· /result Â· 4:18 PM                â”‚
â”‚  Error: Invalid prisma.match.findUnique() invocationâ”‚
â”‚  User: PlayerDEF Â· Guild: Rockstar Dev              â”‚
â”‚  [View Stack Trace â†“]    [Mark Resolved âœ“]          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Filters:**
- By severity: ERROR / WARNING / INFO
- By command name
- By time range
- By user

**Error Detail Drawer:**
- Full stack trace with syntax highlighting
- Error type, message, user, guild, timestamp
- "Occurred X times in last 24h"
- Mark as resolved / snooze

**Error Rate Chart:**
- Errors per hour over 24h
- Red spike indicators

---

**TAB 3 â€” BRIDGE HEALTH**

**Purpose:** Monitor the connection between the Discord bot and the web platform.

**SYSTEM STATUS CARD:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  BRIDGE HEALTH MONITOR                              â”‚
â”‚                                                     â”‚
â”‚  ðŸŸ¢ Database Connection    Â·  Connected              â”‚
â”‚  ðŸŸ¢ Discord Bot            Â·  Online (Railway)      â”‚
â”‚  ðŸŸ¡ Redis Cache            Â·  Degraded (64ms)       â”‚
â”‚  ðŸŸ¢ Web Platform           Â·  Healthy (Vercel)      â”‚
â”‚                                                     â”‚
â”‚  Last Sync: 2 minutes ago                           â”‚
â”‚  Outbox Backlog: 3 items                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**METRICS:**
- Ping latency chart (botâ†’dbâ†’web)
- Message queue depth over time
- Sync success rate: 99.7%
- Last 10 sync events with status

**CONNECTION DETAILS:**
| Service | Status | Latency | Region | Last Check |
|---------|--------|---------|--------|------------|
| Neon DB | ðŸŸ¢ | 12ms | US-East-2 | 30s ago |
| Railway Bot | ðŸŸ¢ | â€” | US-East | 30s ago |
| Vercel Web | ðŸŸ¢ | 8ms | Mumbai | 30s ago |
| Upstash Redis | ðŸŸ¡ | 64ms | US-East-1 | 30s ago |

---

**TAB 4 â€” WEBSITE ERRORS**

**Purpose:** Monitor Next.js app errors, 404s, 500s, API failures.

**ERROR SUMMARY:**
```
[12 Total Today] [0 Critical] [8 Warnings] [4 Info]
```

**Error Types Section:**
- 500 Errors: API route failures
- 404 Errors: missing pages/resources
- Auth Errors: OAuth failures
- DB Errors: Prisma query failures
- Client Errors: React component crashes

**Error Log Table:**
| Time | Type | Route | Message | Count |
|------|------|-------|---------|-------|
| 4:23 | 500 | /api/servers | Prisma timeout | 3 |
| 4:15 | 404 | /servers/xyz | Server not found | 1 |
| 3:52 | Auth | /api/auth | Token expired | 2 |

- Color coded by type
- Click â†’ drawer with full error details
- `[Export Logs]` button

---

## ðŸŽ¥ SPECIAL PAGES

---

### PAGE 24 Â· `/overlay/:guildId/:tournamentId` â€” STREAM OVERLAY
**Access:** Public (token protected)  
**Purpose:** OBS browser source for streamers.

**Design:**
- `background: transparent` â€” no background at all
- Top strip: tournament name + round indicator
- Left side: top 5 standings ticker
- Right side: current match (Team A vs Team B with scores)
- Bottom strip: next match countdown

**Customization via URL params:**
```
?position=top     â€” overlay position
?theme=violet     â€” color theme
?show=standings   â€” what to display
?size=compact     â€” compact mode
```

**Auto-updates:** WebSocket connection, no page reload

---

## ðŸ“š DOCUMENTATION PAGES

---

### PAGE 25 Â· `/docs` â€” DOCS HOME
**Access:** Public

**Layout:**
- Left sidebar: doc tree navigation (250px, sticky)
- Right: content area with search
- Top: search bar "Search documentation..."

**Cards Grid:**
- Getting Started
- Discord Commands
- Tournament Management
- Payment Setup
- API Reference

---

### PAGE 26 Â· `/docs/getting-started`

**Content:**
1. Invite the bot (button with direct invite link)
2. Run `/setup` in your server
3. Configure channels with `/setup`
4. Create your first tournament
5. Invite players to register

**Design:**
- Numbered steps with glowing circle indicators
- Code blocks: dark terminal style
  ```
  /setup           â† Step 1: Configure timezone
  /tournament create  â† Step 2: Create tournament
  ```
- Tip/warning callout boxes

---

### PAGE 27 Â· `/docs/discord-commands`

**Full command reference:**
| Command | Description | Min Permission | Options |
|---------|-------------|----------------|---------|
| `/setup` | Server setup wizard | Manage Server | â€” |
| `/tournament create` | Create tournament | Manager | â€” |
| `/tournament list` | List tournaments | Player | game, status |
| `/tournament info` | Tournament details | Player | id |
| `/register` | Register for tournament | Player | tournament |
| `/result` | Submit match result | Player | match, score |
| `/checkin` | Check in for match | Player | match |
| `/bracket` | View bracket | Player | tournament |
| `/standings` | View standings | Player | tournament |
| `/approve` | Approve result | Referee | result |
| `/dispute` | Dispute result | Player | match |
| `/room` | Get room credentials | Player | match |
| `/schedule` | View match schedule | Player | tournament |
| `/cancel` | Cancel tournament | Manager | tournament |
| `/finalize` | Finalize tournament | Manager | tournament |
| `/winners` | View winners | Player | tournament |
| `/analytics` | Server analytics | Manager | â€” |
| `/status` | Bot health check | Manager | â€” |

---

### PAGE 28 Â· `/docs/tournaments/create`

Step-by-step guide with:
- Screenshots (or mockups) of each wizard step
- Field explanations
- Common mistakes to avoid
- FAQ section

---

### PAGE 29 Â· `/docs/tournaments/formats`

**Visual diagrams:**
- Single Elimination: tree diagram
- Double Elimination: winner + loser bracket
- Round Robin: full grid
- Swiss System: pairing explanation

Each with: when to use, pros/cons, capacity recommendations

---

# PART 5 â€” COMPONENT LIBRARY

## Navigation Bar
```
[LEGENDARY ESPORTS]    [Docs]    [Servers]    [Login with Discord]
```
- Sticky, `backdrop-blur-md bg-black/20`
- Logo: glitch effect on hover
- Active route: violet underline with glow
- Login: GlowButton primary
- Logged in: avatar circle + dropdown (Servers / Sign Out)
- Mobile: hamburger â†’ full-screen dark drawer

## Admin Sidebar
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ [Icon] SERVER NAME â”‚  â† server header
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ [ðŸ”„] Sync: âœ…      â”‚  â† sync status badge
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ â˜° Overview         â”‚
â”‚ ðŸ† Tournaments     â”‚  â† active: violet left border
â”‚ ðŸ‘¥ Participants    â”‚
â”‚ âš”ï¸ Matches         â”‚
â”‚ âœ… Results         â”‚
â”‚ ðŸ“Š Analytics       â”‚
â”‚ âš™ï¸ Settings        â”‚
â”‚ ðŸ’³ Payments        â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ [âš™ï¸] Dev Panel    â”‚  â† only for SERVER_ADMIN
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚ [Avatar] Username  â”‚
â”‚ [Role Badge]       â”‚
â”‚               [â†’]  â”‚  â† logout
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```
- Collapse to 4rem icon-only mode
- Collapse toggle: floating button on edge

## GlowButton Variants
| Variant | Background | Hover Effect |
|---------|------------|--------------|
| `primary` | Violet gradient | Violet neon bloom |
| `secondary` | Cyan gradient | Cyan neon bloom |
| `destructive` | Red gradient | Red neon bloom |
| `ghost` | Transparent | White border brightens |

## Badge / Status
| Badge | Style |
|-------|-------|
| `LIVE` | `bg-red-500/20 text-red-400` + pulse dot |
| `OPEN` | `bg-green-500/20 text-green-400` |
| `DRAFT` | `bg-gray-500/20 text-gray-400` |
| `UPCOMING` | `bg-amber-500/20 text-amber-400` |
| `COMPLETED` | `bg-blue-500/20 text-blue-400` |
| `CANCELLED` | `bg-red-900/20 text-red-600` |

## GlassCard
```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.08);
backdrop-filter: blur(12px);
border-radius: 12px;
transition: border-color 200ms, box-shadow 200ms;

&:hover {
  border-color: rgba(124,58,237,0.4);
  box-shadow: 0 0 20px rgba(124,58,237,0.1);
}
```

## Modals / Dialogs
- Overlay: `bg-black/60 backdrop-blur-sm`
- Mobile: slides up from bottom
- Desktop: fades + scales from center
- Danger: red-tinted border + icon

## Toast Notifications
- Top-right stack, slide from right
- Progress bar countdown
- Success=green, Error=red, Info=violet, Warning=amber

## Loading Skeletons
```tsx
<Skeleton className="h-4 w-3/4 rounded" />  // shimmer animation
```
- Matches exact layout of loaded content
- Never show blank white or spinner

## Charts (Recharts â€” dark theme)
```typescript
const chartColors = {
  primary: '#7c3aed',
  secondary: '#06b6d4',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  grid: 'rgba(255,255,255,0.05)',
  tooltip: { bg: '#0d0d18', border: 'rgba(255,255,255,0.1)' }
}
```

---

# PART 6 â€” RESPONSIVE DESIGN

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| `xs` | < 375px | Single column, compact nav |
| `sm` | 375â€“640px | Mobile layout, bottom tabs |
| `md` | 640â€“768px | 2-column grid |
| `lg` | 768â€“1024px | Tablet, collapsible sidebar |
| `xl` | 1024â€“1280px | Full desktop |
| `2xl` | > 1280px | Wide, max-width centered |

---

# PART 7 â€” PERFORMANCE & SEO

## Performance Targets
- **LCP:** < 2.5s
- **FID:** < 100ms  
- **CLS:** < 0.1
- **TTI:** < 3.5s
- Initial JS bundle: < 150KB

## Optimization Techniques
- `next/image` for all images (WebP, lazy load)
- `next/font` for custom fonts (subset, preload)
- API routes: `no-store` for real-time, `revalidate: 60` for semi-static
- Prisma: connection pooling via Neon
- Three.js: lazy loaded, not on mobile

## SEO
- Dynamic OG images for tournament/winner pages
- `<title>` and `<description>` per page
- Structured data for tournaments (Schema.org Event)

---

# PART 8 â€” AUTHENTICATION & PERMISSIONS

## Auth Flow
```
[Login with Discord] â†’ Discord OAuth â†’ Supabase Auth
      â†“
/api/auth/callback â†’ Set session cookie
      â†“
/servers â†’ User sees their servers
      â†“
Admin pages â†’ resolveUserRole() checks:
    1. Server owner? â†’ SERVER_ADMIN
    2. Has mapped Discord role? â†’ TOURNAMENT_MANAGER / REFEREE
    3. Otherwise â†’ VIEWER
```

## Role Hierarchy
| Role | Level | Access |
|------|-------|--------|
| `VIEWER` | 1 | Public pages only |
| `PLAYER` | 2 | Register for tournaments |
| `REFEREE` | 3 | Match management, results |
| `TOURNAMENT_MANAGER` | 4 | Full tournament CRUD |
| `SERVER_ADMIN` | 5 | All + settings + dev panel |

---

*Legendary Esports Â· shadow-tournaments.vercel.app*  
*Bot: SHADÃ˜W (ID: 1560641364646035470)*  
*Stack: Next.js 14 Â· TypeScript Â· Prisma Â· Neon Â· Supabase Â· Discord.js Â· Railway*

