# 🎮 LEGENDARY ESPORTS — Complete Design System
### Cyberpunk / Dark Futuristic UI/UX Specification
> Production URL: https://shadow-tournaments.vercel.app

---

## 🎨 DESIGN PHILOSOPHY

**Theme:** Neo-cyberpunk esports — dark neon, glitch aesthetics, holographic glass, electric energy.  
**Vibe:** Professional esports organization meets underground hacker terminal.  
**Feel:** Every interaction should feel like you're inside a high-tech tournament command center.

---

## 🖌️ GLOBAL DESIGN TOKENS

### Color Palette
```
Background Primary:    #050508   — near-black void
Background Secondary:  #0d0d18   — deep navy-black
Background Tertiary:   #111127   — elevated surface
Card Surface:          rgba(255,255,255,0.03) + border rgba(255,255,255,0.08)

Accent Primary:        #7c3aed   — electric violet
Accent Secondary:      #06b6d4   — cyber cyan
Accent Danger:         #ef4444   — neon red
Accent Success:        #22c55e   — matrix green
Accent Warning:        #f59e0b   — amber

Neon Glow Violet:      0 0 20px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.2)
Neon Glow Cyan:        0 0 20px rgba(6,182,212,0.6),  0 0 60px rgba(6,182,212,0.2)
Neon Glow Red:         0 0 20px rgba(239,68,68,0.6),  0 0 60px rgba(239,68,68,0.2)
Neon Glow Green:       0 0 20px rgba(34,197,94,0.6),  0 0 60px rgba(34,197,94,0.2)

Text Primary:          #f8fafc
Text Secondary:        #94a3b8
Text Tertiary:         #475569
Text Accent:           #a78bfa
```

### Typography
```
Display Font:   Orbitron (all-caps headers, tournament names, scores)
Mono Font:      JetBrains Mono (IDs, codes, stats, terminal text)
Body Font:      Inter (descriptions, body copy)
```

### Spacing & Borders
```
Border Radius:  4px (sharp/angular), 8px (cards), 12px (panels), 9999px (badges/pills)
Border Style:   1px solid rgba(255,255,255,0.08) — subtle glass edges
Card Glow:      box-shadow: 0 0 0 1px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.05)
```

### Animation Presets (Framer Motion)
```
Page Enter:     { opacity: 0, y: 20 } → { opacity: 1, y: 0 } — duration 0.4s ease-out
Stagger:        0.05s delay between list items
Hover Scale:    scale: 1.02, transition: 0.15s
Card Hover:     translateY(-2px) + increase glow intensity
Number Count:   Animated counter from 0 to value on mount
Glow Pulse:     keyframe animation, opacity 0.6→1→0.6, 2s infinite
Scanline:       subtle horizontal scan effect on hero sections
Glitch Text:    random character swap on hover for IDs/codes
```

---

## 📄 PAGE-BY-PAGE DESIGN SPECS

---

### 1. `/` — LANDING PAGE
**URL:** https://shadow-tournaments.vercel.app/

**Design Concept:** Full-screen cinematic hero with animated 3D background

**Hero Section:**
- Animated `<canvas>` or Three.js background: floating geometric particles + grid lines converging to a point
- Large `LEGENDARY ESPORTS` title with glitch animation on load
- Subtitle: "Discord-native tournament management for BGMI · Free Fire · COD Mobile"
- Two CTAs: `[Login with Discord]` (violet glow) + `[View Docs]` (ghost)
- Animated stat counters below fold: `1,247 Tournaments` / `48,392 Players` / `892 Servers`
- Scroll indicator: animated bouncing chevron

**Features Section:**
- 3-column grid of glass cards with neon icon backgrounds
- Hover: card lifts + border glow activates
- Icons animated with CSS keyframes (pulse, spin, float)

**Games Section:**
- BGMI card: violet gradient + animated rank insignia
- Free Fire card: red/orange gradient + animated flame
- COD Mobile card: green gradient + animated crosshair
- Each card: hover triggers a subtle particle burst

**How It Works:**
- 3-step process with animated connecting line between steps
- Step numbers in glowing circles
- Line draws itself on scroll (SVG stroke-dashoffset animation)

**Footer:**
- Dark panel, minimal links
- Social icons with neon hover states
- "Built for competitive communities" tagline

---

### 2. `/servers` — YOUR SERVERS
**URL:** /servers

**Design Concept:** Command center overview of all Discord servers

**Header:**
- "YOUR SERVERS" in Orbitron, with subtitle
- Animated background: subtle hexagonal grid pattern

**Server Cards Grid:**
- 3-column responsive grid
- Each card: server icon (glowing ring), server name, live/upcoming tournament counts
- Status indicator: green pulse dot if bot is active
- Hover: entire card lifts + violet border appears
- "Add Bot" cards: dashed border, "+" icon, greyed out but interactive

**Sections:**
```
┌─────────────────────────────┐
│ 🟢 CONNECTED SERVERS        │  ← your active servers
├─────────────────────────────┤
│ ➕ ADD BOT TO SERVER        │  ← eligible servers you admin
├─────────────────────────────┤
│ 🔒 OTHER SERVERS            │  ← servers you're in but don't manage
└─────────────────────────────┘
```
- Section headers with animated underline on load
- Empty state: animated illustration + "No servers yet" message

---

### 3. `/servers/[guildId]` — SERVER HOME PAGE
**URL:** /servers/:guildId

**Design Concept:** Server command center with live tournament data

**Header:**
- Server icon (large, glowing ring in server accent color)
- Server name in Orbitron
- Timezone badge + member count
- ⚙️ Admin Dashboard button (top-right, violet, only for admins)

**Live Tournaments Section:**
- Red `🔴 LIVE` badge with pulse animation
- Cards: tournament name, game icon, time remaining countdown
- Countdown timer: animated flip numbers (HH:MM:SS)

**Upcoming Tournaments:**
- Cards with registration countdown
- Progress bar: slots filled / total capacity
- `REGISTER NOW` CTA button on each card

**Recent Champions:**
- Podium-style display: 🥇🥈🥉
- Winner's name in gold/silver/bronze glow
- Tournament name underneath

**Quick Links Bar:**
```
[📊 Leaderboards] [🏆 Tournaments] [🎯 Winners] [📋 Dashboard]
```

---

### 4. `/servers/[guildId]/tournaments` — TOURNAMENT CATALOGUE
**URL:** /servers/:guildId/tournaments

**Design Concept:** Tournament browser with filter/search

**Filter Bar:**
- Game filter chips: `ALL` `BGMI` `FREE FIRE` `COD MOBILE`
- Status filter: `LIVE` `UPCOMING` `COMPLETED`
- Search input with neon focus ring
- Sort: Latest / Prize Pool / Capacity

**Tournament Cards:**
```
┌──────────────────────────────────────┐
│ [GAME ICON]  TOURNAMENT NAME    [STATUS BADGE] │
│ ─────────────────────────────────── │
│ 📅 Jan 15, 2025  👥 32/64 teams      │
│ 🎮 Battle Royale  💰 ₹5,000 prize   │
│ ████████░░░░  50% full              │
│                     [VIEW DETAILS →] │
└──────────────────────────────────────┘
```
- Status badges: `LIVE` (red pulse), `OPEN` (green), `CLOSED` (yellow), `COMPLETED` (grey)
- Capacity bar with color: green < 50%, yellow 50-80%, red > 80%
- Hover: card glow + slight scale

**Empty State:**
- Animated trophy icon
- "No tournaments yet. Check back soon!"

---

### 5. `/servers/[guildId]/tournaments/[tournamentId]` — TOURNAMENT DETAIL
**URL:** /servers/:guildId/tournaments/:tournamentId

**Design Concept:** Tournament command center — all info at a glance

**Hero Banner:**
- Full-width banner image (or animated gradient if no image)
- Tournament name in massive Orbitron text
- Game logo watermark (background)
- Status badge (animated for LIVE)
- Prize pool prominent display

**Info Grid:**
```
┌──────────┬──────────┬──────────┬──────────┐
│ FORMAT   │ CAPACITY │ ENTRY    │ STARTS   │
│ BR Solo  │ 64 Teams │ ₹100     │ Jan 15   │
└──────────┴──────────┴──────────┴──────────┘
```

**Tabs:**
- `OVERVIEW` — description, rules, schedule
- `PARTICIPANTS` — registered teams list
- `BRACKET` — live bracket visualization
- `STANDINGS` — live leaderboard

**Registration CTA:**
- Big glowing `REGISTER NOW` button when open
- Countdown to registration close
- Already registered: shows team status

---

### 6. `/servers/[guildId]/tournaments/[tournamentId]/register` — REGISTRATION
**URL:** /servers/:guildId/tournaments/:tournamentId/register

**Design Concept:** Mission briefing — you're about to enter the arena

**Header:**
- "TOURNAMENT REGISTRATION" in terminal font
- Tournament name + game icon
- Registration deadline countdown

**Form Design:**
```
┌─────────────────────────────────────┐
│  STEP 1: TEAM INFORMATION           │
│  Team Name: [________________]      │
│  Team Tag:  [____]                  │
├─────────────────────────────────────┤
│  STEP 2: PLAYER DETAILS             │
│  IGN: [________________]            │
│  UID: [________________]            │
│  Device: [Mobile ▼]                 │
├─────────────────────────────────────┤
│  STEP 3: PAYMENT (if required)      │
│  Entry Fee: ₹100                    │
│  [Pay with Razorpay]                │
└─────────────────────────────────────┘
```
- Multi-step form with animated progress bar
- Each step slides in from right
- Validation: red border + shake animation on error
- Success: green checkmark explosion animation

---

### 7. `/servers/[guildId]/tournaments/[tournamentId]/bracket` — BRACKET
**URL:** /servers/:guildId/tournaments/:tournamentId/bracket

**Design Concept:** Live war room — see the battles unfold

**Bracket Visualization:**
- SVG-based bracket tree
- Neon connector lines between matches
- Winner highlighted in green glow
- Loser greyed out
- Current match: pulsing amber border
- Animated line draws when bracket updates

**Match Cards:**
```
┌─────────────────────┐
│ Team Alpha    [12]  │  ← winner in green
│ ─────────────────── │
│ Team Beta     [8]   │  ← loser in grey
│         Round 2     │
└─────────────────────┘
```

**Live Indicator:**
- "LIVE" badge with red pulse on active matches
- Auto-refresh every 30 seconds

---

### 8. `/servers/[guildId]/leaderboards` — LEADERBOARDS
**URL:** /servers/:guildId/leaderboards

**Design Concept:** Hall of fame — the wall of legends

**Top 3 Podium:**
- Animated podium: 2nd place (silver), 1st place (gold, tallest), 3rd place (bronze)
- Player avatars on podium with crown on 1st
- Fireworks/particle animation on load

**Full Leaderboard Table:**
```
RANK │ PLAYER          │ POINTS │ WINS │ K/D  │ TOURNAMENTS
─────┼─────────────────┼────────┼──────┼──────┼────────────
 🥇  │ ProPlayer99     │ 4,820  │  12  │ 4.2  │     18
 🥈  │ NightHawk       │ 4,210  │   9  │ 3.8  │     15
 #3  │ ShadowKing      │ 3,940  │   8  │ 3.1  │     21
```
- Top 3: gold/silver/bronze row tint
- Rank change indicators: ↑ green, ↓ red, — grey
- Filter by: Game / Time Period / Tournament
- Hover row: highlight + expand player stats card

---

### 9. `/servers/[guildId]/winners` — WINNERS HALL
**URL:** /servers/:guildId/winners

**Design Concept:** Trophy room — celebrating champions

**Layout:**
- Masonry or grid of winner cards
- Each tournament result displayed as a "trophy card"
- Winner photo/avatar + team name + tournament name
- Game badge + date

**Winner Card:**
```
┌──────────────────────────────┐
│  🏆  BGMI CHAMPIONSHIP       │
│  ──────────────────────────  │
│  [AVATAR] Team FireStorm      │
│  Jan 15, 2025 · 64 teams     │
│  [GOLD BADGE] 1st Place      │
└──────────────────────────────┘
```
- Gold shimmer animation on trophy icon
- Hover: card flip reveals match stats on back

---

### 10. `/servers/[guildId]/winners/[tournamentId]` — WINNER DETAIL
**URL:** /servers/:guildId/winners/:tournamentId

**Design Concept:** Victory screen — cinematic celebration

**Full-screen victory panel:**
- Animated confetti/particle burst
- Large trophy icon with gold glow
- Winner's name in massive text
- Complete podium: 1st, 2nd, 3rd
- Tournament stats grid
- Share button: copy link / screenshot

---

### 11. `/servers/[guildId]/dashboard` — SERVER DASHBOARD
**URL:** /servers/:guildId/dashboard

**Design Concept:** Analytics command center

**KPI Cards Row:**
```
[🏆 24 Tournaments] [👥 1,248 Players] [⚔️ 342 Matches] [🎯 18 Live Now]
```
- Animated number counters on load
- Trend arrows: ↑12% this month

**Charts:**
- Tournament activity: area chart (last 30 days)
- Game distribution: animated donut chart
- Registration timeline: bar chart
- All charts: dark theme, neon accent colors

**Recent Activity Feed:**
- Live updating feed of events
- Icons per event type
- Timestamps in relative format ("2 hours ago")

---

### 12. `/servers/[guildId]/admin/tournaments` — ADMIN: TOURNAMENTS LIST
**URL:** /servers/:guildId/admin/tournaments

**Design Concept:** Tournament control room

**Header:**
- "TOURNAMENT MANAGEMENT" in Orbitron
- `[+ CREATE TOURNAMENT]` button (violet, prominent)

**Table:**
```
NAME          │ GAME      │ STATUS      │ TEAMS  │ DATE     │ ACTIONS
──────────────┼───────────┼─────────────┼────────┼──────────┼─────────
Summer Cup    │ BGMI      │ 🟢 LIVE     │ 48/64  │ Jan 15   │ [Manage]
Winter Series │ Free Fire │ 🟡 OPEN     │ 12/32  │ Jan 20   │ [Manage]
Clash Royale  │ COD       │ ⚪ DRAFT    │ 0/16   │ Feb 1    │ [Manage]
```
- Sortable columns
- Status filter tabs at top
- Bulk actions: publish, cancel, delete (with confirmation modal)

---

### 13. `/servers/[guildId]/admin/tournaments/new` — CREATE TOURNAMENT
**URL:** /servers/:guildId/admin/tournaments/new

**Design Concept:** Mission briefing creator — build your arena

**Multi-step wizard:**
```
[1. BASICS] → [2. FORMAT] → [3. SCHEDULE] → [4. ENTRY] → [5. PREVIEW]
```

**Step 1 — Basics:**
- Tournament name, game selection (visual cards)
- Description (rich text)
- Banner image upload (drag & drop with preview)

**Step 2 — Format:**
- Game mode selection
- Format: Solo / Duo / Squad
- Team capacity slider
- Bracket type: Single Elimination / Double / Round Robin

**Step 3 — Schedule:**
- Start date/time picker (custom styled, dark)
- Registration open/close dates
- Check-in window

**Step 4 — Entry:**
- Free or Paid toggle
- Entry fee amount
- Auto-approve toggle

**Step 5 — Preview:**
- Full tournament card preview
- `[PUBLISH NOW]` or `[SAVE AS DRAFT]` buttons

---

### 14. `/servers/[guildId]/admin/tournaments/[tournamentId]` — TOURNAMENT DETAIL ADMIN
**URL:** /servers/:guildId/admin/tournaments/:tournamentId

**Tabs:**
- **OVERVIEW** — tournament stats, action buttons (Publish/Cancel/Finalize)
- **REGISTRATIONS** — team list with approve/reject controls
- **MATCHES** — match schedule, results entry
- **SETTINGS** — edit tournament details

**Action Buttons:**
- `[PUBLISH]` — green glow, opens registration
- `[CANCEL]` — red, with confirm modal
- `[FINALIZE]` — violet, records winners

**Registrations Tab:**
```
TEAM NAME     │ PLAYERS │ STATUS      │ REGISTERED  │ ACTIONS
──────────────┼─────────┼─────────────┼─────────────┼──────────
Team Alpha    │    4    │ ⏳ PENDING  │ 2h ago      │ [✓] [✗]
Team Beta     │    4    │ ✅ APPROVED │ 1d ago      │ [Revoke]
Team Gamma    │    4    │ ❌ REJECTED │ 3d ago      │ [Restore]
```

---

### 15. `/servers/[guildId]/admin/tournaments/[tournamentId]/participants` — PARTICIPANTS
**URL:** /servers/:guildId/admin/tournaments/:tournamentId/participants

- Full participant list with player details
- Search/filter by team name, status
- Export to CSV button
- Bulk approve/reject

---

### 16. `/servers/[guildId]/admin/tournaments/[tournamentId]/matches` — MATCH MANAGEMENT
**URL:** /servers/:guildId/admin/tournaments/:tournamentId/matches

**Match Cards:**
- Match number, round, scheduled time
- Team A vs Team B
- Room ID + Password (hidden by default, click to reveal)
- `[Enter Results]` button
- Status: Scheduled / Live / Completed / Disputed

**Results Entry Modal:**
- Score inputs per team
- Placement dropdowns for BR mode
- Kill count inputs
- `[Submit Results]` with confirmation

---

### 17. `/servers/[guildId]/admin/tournaments/[tournamentId]/finalize` — FINALIZE
**URL:** /servers/:guildId/admin/tournaments/:tournamentId/finalize

- Final standings review
- Winner confirmation (drag to reorder if needed)
- `[FINALIZE & ANNOUNCE]` — big action button
- Preview of announcement that will be posted to Discord

---

### 18. `/servers/[guildId]/admin/matches` — ALL MATCHES
**URL:** /servers/:guildId/admin/matches

- Across all tournaments
- Filter by tournament, status, date
- Quick result entry inline
- Disputed matches highlighted in amber

---

### 19. `/servers/[guildId]/admin/results` — RESULTS QUEUE
**URL:** /servers/:guildId/admin/results

- Pending result submissions from players
- Screenshot previews
- Approve / Dispute / Request Correction buttons
- Split-screen: submission on left, review on right

---

### 20. `/servers/[guildId]/admin/analytics` — ADMIN ANALYTICS
**URL:** /servers/:guildId/admin/analytics

**Full analytics suite:**
- Revenue chart (entry fees collected)
- Registration trends
- Player retention: new vs returning
- Game popularity over time
- Peak activity hours heatmap
- Export data button

---

### 21. `/servers/[guildId]/admin/settings` — SERVER SETTINGS
**URL:** /servers/:guildId/admin/settings

**Sections:**
- General: server name, timezone, accent color picker
- Channels: bind announcement/results/disputes channels
- Roles: map Discord roles → app roles
- Branding: logo upload, banner, accent color
- Danger Zone: reset settings, deactivate bot

---

### 22. `/servers/[guildId]/admin/payment` — PAYMENT SETTINGS
**URL:** /servers/:guildId/admin/payment

- Razorpay credentials form
- API key / Secret / Webhook secret
- Connection test button
- Transaction history table
- Payout settings

---

### 23. `/overlay/[guildId]/[tournamentId]` — STREAM OVERLAY
**URL:** /overlay/:guildId/:tournamentId

**Design Concept:** OBS-ready transparent overlay for streamers

- Transparent background (for OBS browser source)
- Live standings ticker
- Current match info
- Team logos / names
- Score display
- Animated updates when scores change
- Customizable: show/hide elements via URL params

---

### 24. `/docs` — DOCUMENTATION HOME
**URL:** /docs

- Clean docs layout with sidebar navigation
- Search bar at top
- Cards for each doc section
- Dark theme, code blocks with syntax highlighting

---

### 25. `/docs/getting-started` — GETTING STARTED
**URL:** /docs/getting-started

- Step-by-step setup guide
- Code blocks for slash commands
- Screenshots/mockups
- Checklist format

---

### 26. `/docs/discord-commands` — DISCORD COMMANDS
**URL:** /docs/discord-commands

- Full command reference table
- Command name, description, permissions, example
- Filter by category

---

### 27. `/docs/tournaments/create` — HOW TO CREATE TOURNAMENTS
**URL:** /docs/tournaments/create

- Tutorial with animated step indicators
- Screenshots of each step
- Code examples

---

### 28. `/docs/tournaments/formats` — TOURNAMENT FORMATS
**URL:** /docs/tournaments/formats

- Explanation of each format
- Visual diagrams of bracket types
- When to use each format

---

## 🧩 SHARED COMPONENTS

### Navigation Bar (all pages)
- Sticky, backdrop-blur
- Logo left, links center, Login/User right
- Mobile: hamburger → slide-in drawer
- Active link: violet underline glow

### Loading States
- Skeleton screens with shimmer animation (not spinners)
- Skeleton matches exact layout of loaded content

### Error States
- 404: glitch animation on "404", "Lost in the Grid" message
- 500: "System Failure" terminal-style error
- Empty: illustrated empty state with CTA

### Modals / Dialogs
- Dark overlay (backdrop-blur)
- Card slides up from bottom on mobile
- Card fades+scales in on desktop
- Danger actions: red-tinted modal

### Toast Notifications
- Top-right corner
- Slide in from right
- Color coded: success (green), error (red), info (violet)
- Auto-dismiss after 4s with progress bar

### Buttons (GlowButton variants)
```
primary     — violet gradient + neon glow on hover
secondary   — cyan gradient + cyan glow
destructive — red gradient + red glow
ghost       — transparent + white border, glow on hover
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
Mobile:   < 640px  — single column, bottom nav bar
Tablet:   640-1024px — 2 columns, collapsible sidebar
Desktop:  > 1024px — full layout, expanded sidebar
```

---

## ⚡ ANIMATION STRATEGY

1. **Page transitions** — fade+slide using Framer Motion `<AnimatePresence>`
2. **Scroll reveals** — elements fade in as they enter viewport (`useInView`)
3. **Number counters** — count up from 0 on first render
4. **Live data** — smooth number transitions when values update
5. **Hover effects** — all interactive elements have hover states
6. **Loading** — skeleton shimmer, never blank white flash
7. **Success/Error** — micro-animations on form submissions

---

## 🔧 TECH STACK FOR DESIGN

```
Framer Motion      — page transitions, hover animations, scroll reveals
Three.js / R3F     — 3D particle backgrounds on landing page
Recharts           — dashboard charts (dark themed)
Tailwind CSS       — utility classes
CSS Custom Props   — design tokens
next/font          — Orbitron + JetBrains Mono + Inter
```

---

*Last updated: October 2026*
*Platform: shadow-tournaments.vercel.app*
