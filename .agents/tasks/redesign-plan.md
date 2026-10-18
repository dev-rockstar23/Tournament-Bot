# Cyberpunk UI Redesign — Implementation Plan

**Repository root:** `d:\Discord Projects\Tournament-Bot\esports-platform`  
**Web app source:** `apps/web/src/`  
**Build command:** `pnpm --filter web build`  
**Verification:** `pnpm --filter web type-check && pnpm --filter web lint`  
**Full build check (end of task):** `pnpm --filter web build`

> All Prisma queries, auth guards, role checks, API fetch/mutation calls, realtime hooks, and existing prop interfaces must be preserved **exactly**. Only JSX structure, CSS classes, and animation layers change.

---

## Key codebase facts discovered during exploration

- **globals.css** already defines: `glass-card`, `tournament-card-glow` (conic gradient border animation), `live-indicator` (pulsing ::before dot), `.podium-first/second/third` (float animation), `rank-changed-up/down`, `pulse-glow`, `shimmer`, `gradient-spin` keyframes.
- **tailwind.config.ts** already has `obsidian`, `graphite`, `deep-violet`, `electric`, `cyan`, `silver` colour palettes and `shimmer`, `glow-pulse`, `spin-slow` animations.
- **lib/motion.ts** already has `fadeUp`, `fadeIn`, `staggerChildren`, `slideInLeft`, `slideInRight`, `scaleIn`, `glowPulse`, `podiumEntry`, `cardTilt`, `rankChange`.
- **All three Google Fonts** (Orbitron, Inter, JetBrains Mono) are loaded via `next/font/google` in `layout.tsx` and available as CSS vars `--font-orbitron`, `--font-inter`, `--font-jetbrains`.
- `@radix-ui/react-slot` is **not** installed — `GlowButton` `asChild` uses a `<span>` wrapper.
- Three.js scene (`HeroScene.tsx`) is already functional with particles, rotating icosahedron, floating rings, and bloom post-processing.
- `Recharts` is available for charts in `AnalyticsDashboard`.
- `AnimatedCounter`, `StatusPulse`, `GlassCard`, `GlowButton`, `Badge` are the core UI primitives.
- `ServerBrandingContext` provides per-server `--color-accent` CSS var override.

---

## Phase 1 — Global design tokens (FEAT-001)

**Goal:** Deepen the cyberpunk token set, extend tailwind config, add new shared UI primitives.

- [ ] 1. **Update `globals.css` design tokens**  
  Change `--color-bg-primary` → `#050508`, `--color-bg-secondary` → `#0d0d18`, `--color-bg-card` → `#111127`. Add `--color-bg-hud`, `--color-neon-violet/cyan/red/green/amber`. Add `@keyframes`: `glitch-clip`, `scanline`, `grid-scroll`, `hud-slide-in`, `data-flicker`. Add utility classes: `.scanline-overlay`, `.hud-grid-bg`, `.neon-text-violet`, `.neon-text-cyan`, `.neon-border-violet`, `.neon-border-cyan`, `.glitch-text`.  
  **Files:** `apps/web/src/app/globals.css`  
  **Verify:** `pnpm --filter web type-check`

- [ ] 2. **Extend `tailwind.config.ts`**  
  Add `keyframes` entries for `glitch-clip`, `scanline`, `hud-slide-in`, `data-flicker`, `grid-scroll`. Add `animation` aliases: `glitch`, `scanline`, `hud-slide-in`, `data-flicker`. Add `boxShadow` aliases for `text-glow` and `border-glow`.  
  **Files:** `apps/web/tailwind.config.ts`  
  **Verify:** `pnpm --filter web lint`

- [ ] 3. **Upgrade GlassCard** — add `neonColor`, `scanline`, `hud` props.  
  **Files:** `apps/web/src/components/ui/GlassCard.tsx`

- [ ] 4. **Upgrade GlowButton** — add `'cyber'` variant (cyan gradient, mono font), shimmer span inside primary/cyber.  
  **Files:** `apps/web/src/components/ui/GlowButton.tsx`

- [ ] 5. **Upgrade Badge** — add `'cyber'` and `'warning'` variants; fix `'live'` to use `.live-indicator` CSS class.  
  **Files:** `apps/web/src/components/ui/Badge.tsx`

- [ ] 6. **Upgrade AnimatedCounter** — add `monospace` prop; wrap output in scale-pop motion on complete.  
  **Files:** `apps/web/src/components/ui/AnimatedCounter.tsx`

- [ ] 7. **Upgrade StatusPulse** — add `'critical'` (red, fast pulse) and `'warning'` (amber) variants.  
  **Files:** `apps/web/src/components/ui/StatusPulse.tsx`

- [ ] 8. **Create CyberBreadcrumb** — client component, reads `usePathname()`, renders chevron-separated crumb trail with neon cyan active crumb, Orbitron font.  
  **Files:** `apps/web/src/components/ui/CyberBreadcrumb.tsx` (new)

- [ ] 9. **Create StatusBar** — fixed HUD strip (bottom-0) with SHARD StatusPulse, TICK counter (setInterval, 6-digit mono), SYNCED indicator, UTC time. Uses `.hud-grid-bg` and neon-border-cyan top border.  
  **Files:** `apps/web/src/components/ui/StatusBar.tsx` (new)

- [ ] 10. **Create NeonText** — presentational component, `as`/`color`/`glitch`/`className` props; Orbitron for headings, JetBrains Mono for span/p.  
  **Files:** `apps/web/src/components/ui/NeonText.tsx` (new)

- [ ] 11. **Extend `lib/motion.ts`** — add `glitchReveal`, `scanIn` (clip-path reveal), `counterPop` (spring scale) variants.  
  **Files:** `apps/web/src/lib/motion.ts`  
  **Verify:** `pnpm --filter web type-check && pnpm --filter web lint`

---

## Phase 2 — Core layout components + Landing page (FEAT-002)

**Goal:** Upgrade Navigation, AdminSidebar, and LandingPage with cyberpunk aesthetics.

- [ ] 12. **Redesign Navigation** — cyan bottom border, violet top stripe, NeonText glitch logo, SERVERS/TOURNAMENTS links added, neon active link style, scan-line entrance animation. Keep all auth fetch logic.  
  **Files:** `apps/web/src/components/ui/Navigation.tsx`

- [ ] 13. **Redesign AdminSidebar** — `#050508` bg, neon active border-left glow, staggered mount animation on icons, StatusBar in footer, role badge with `Badge 'cyber'`, guild icon neon ring.  
  **Files:** `apps/web/src/components/admin/AdminSidebar.tsx`

- [ ] 14. **Rebuild LandingPage** — NeonText glitch hero title, JetBrains Mono subtitle, stats counter row (static 120+/1400+/28000+), scrolling ticker tape (CSS marquee, neon cyan), feature cards with `neonColor='violet' scanline`, game cards with `tournament-card-glow`, step badges with neon rings, footer version string.  
  **Files:** `apps/web/src/components/LandingPage.tsx`  
  **Verify:** `pnpm --filter web type-check && pnpm --filter web lint`

---

## Phase 3 — Public pages (FEAT-003)

**Goal:** Cyberpunk styling across all public-facing pages and their components.

- [ ] 15. **Upgrade `/servers` page + ServerCard** — NeonText header, CyberBreadcrumb, neon ServerCard with `tournament-card-glow`, live count Badge.  
  **Files:** `apps/web/src/app/servers/page.tsx`, `apps/web/src/components/server/ServerCard.tsx`

- [ ] 16. **Upgrade `/servers/[guildId]` (server hub)** — neon server icon ring, NeonText section headers, live-indicator on live section, upgraded inline TournamentCard, stat strip, CyberBreadcrumb.  
  **Files:** `apps/web/src/app/servers/[guildId]/page.tsx`

- [ ] 17. **Upgrade tournament catalogue + TournamentCard component** — NeonText header, filter tabs as GlowButton toggles, TournamentCard gets `tournament-card-glow`, game-coloured top stripe, neon progress bar, mono date.  
  **Files:** `apps/web/src/app/servers/[guildId]/tournaments/page.tsx`, `apps/web/src/components/tournament/TournamentCard.tsx`

- [ ] 18. **Upgrade tournament detail page** — NeonText glitch title in hero, neon shimmer progress bar, match schedule table with neon row highlights and live-indicator, podium-styled top-3 standings, CyberBreadcrumb.  
  **Files:** `apps/web/src/app/servers/[guildId]/tournaments/[tournamentId]/page.tsx`

- [ ] 19. **Upgrade bracket page + Bracket component** — NeonText header, CyberBreadcrumb, neon violet bracket lines, `GlassCard neonColor='violet'` match boxes, green/red winner/loser highlight.  
  **Files:** `apps/web/src/app/servers/[guildId]/tournaments/[tournamentId]/bracket/page.tsx`, `apps/web/src/components/tournament/Bracket.tsx`

- [ ] 20. **Upgrade register page + RegistrationForm** — GlassCard hud field groups, neon input focus rings, GlowButton primary submit, NeonText header.  
  **Files:** `apps/web/src/app/servers/[guildId]/tournaments/[tournamentId]/register/page.tsx`, `apps/web/src/components/tournament/RegistrationForm.tsx`

- [ ] 21. **Upgrade leaderboards + LeaderboardsClient** — NeonText glitch header, game filter tabs, rank-specific neon rows (gold/silver/bronze), AnimatedCounter on points, top-3 podium graphic.  
  **Files:** `apps/web/src/app/servers/[guildId]/leaderboards/page.tsx`, `apps/web/src/components/tournament/LeaderboardsClient.tsx`

- [ ] 22. **Upgrade winners/Hall of Fame + WinnersPodium** — NeonText 'HALL OF FAME' glitch, podium platform heights with float animation classes, `tournament-card-glow` on results links.  
  **Files:** `apps/web/src/app/servers/[guildId]/winners/page.tsx`, `apps/web/src/components/tournament/WinnersPodium.tsx`

- [ ] 23. **Upgrade winner detail + WinnerDetailPodium** — full podium with neon placement badges, CSS confetti burst on load, NeonText tournament name, CyberBreadcrumb.  
  **Files:** `apps/web/src/app/servers/[guildId]/winners/[tournamentId]/page.tsx`, `apps/web/src/components/tournament/WinnerDetailPodium.tsx`  
  **Verify:** `pnpm --filter web type-check && pnpm --filter web lint`

---

## Phase 4 — Dashboard (FEAT-004 step 1)

- [ ] 24. **Upgrade dashboard page** — KPI cards with neon colour by type, `counterPop` stagger animation, NeonText heading, live KPI StatusPulse dot, CyberBreadcrumb.  
  **Files:** `apps/web/src/app/servers/[guildId]/dashboard/page.tsx`  
  **Verify:** `pnpm --filter web type-check`

---

## Phase 5 — Admin pages (FEAT-004 steps 2–11)

- [ ] 25. **Upgrade TournamentAdminTable** — GlassCard hud table container, neon header border, neon sort indicator, upgraded status Badge, neon row hover, GlowButton action variants, 'NEW TOURNAMENT' cyber CTA.  
  **Files:** `apps/web/src/components/admin/TournamentAdminTable.tsx`

- [ ] 26. **Upgrade TournamentDetailPanel** — Radix Tabs with neon active indicator, GlassCard hud sections, NeonText headers, live-indicator on live matches.  
  **Files:** `apps/web/src/components/admin/TournamentDetailPanel.tsx`

- [ ] 27. **Upgrade TournamentWizard + 6 Step components** — WizardStepIndicator neon active/completed states, GlassCard neonColor per step, neon input focus rings, GlowButton nav, `.hud-grid-bg` wizard container, NeonText header.  
  **Files:** `apps/web/src/components/admin/tournament-wizard/TournamentWizard.tsx`, `WizardStepIndicator.tsx`, `Step1General.tsx`, `Step2Registration.tsx`, `Step3Schedule.tsx`, `Step4Scoring.tsx`, `Step5Awards.tsx`, `Step6Discord.tsx`

- [ ] 28. **Upgrade ParticipantsTable** — GlassCard hud, neon header/hover, GlowButton approve/reject.  
  **Files:** `apps/web/src/components/admin/ParticipantsTable.tsx`

- [ ] 29. **Upgrade MatchSchedulerPanel** — tournament accordion with neon arrows, match rows colour-coded by status left border, neon datetime inputs.  
  **Files:** `apps/web/src/components/admin/MatchSchedulerPanel.tsx`

- [ ] 30. **Upgrade ResultsQueue + ResultReviewCard** — `GlassCard neonColor='red'` for disputed, `neonColor='cyan'` for review, GlowButton approve/reject, mono scorecard display.  
  **Files:** `apps/web/src/components/admin/ResultsQueue.tsx`, `apps/web/src/components/admin/ResultReviewCard.tsx`

- [ ] 31. **Upgrade AnalyticsDashboard** — Recharts neon palette (violet/cyan/green/red), GlassCard hud chart containers, dark tooltips, neon filter controls, GlowButton export.  
  **Files:** `apps/web/src/components/analytics/AnalyticsDashboard.tsx`

- [ ] 32. **Upgrade ServerSettingsPanel** — GlassCard hud sections, NeonText headers, neon focus rings, live accent colour preview, GlowButton cyber for overlay token, GlowButton primary save, GlowButton destructive for dangerous actions.  
  **Files:** `apps/web/src/components/admin/ServerSettingsPanel.tsx`

- [ ] 33. **Upgrade Payment pages** — PaymentConfigPanel GlassCard hud, neon focus rings, PaymentsTabs neon active indicator, order table neon status badges.  
  **Files:** `apps/web/src/app/servers/[guildId]/admin/payment/page.tsx`, `apps/web/src/app/servers/[guildId]/admin/payments/PaymentsTabs.tsx`, `apps/web/src/components/admin/PaymentConfigPanel.tsx`

- [ ] 34. **Upgrade FinalizeButton** — GlowButton destructive, state-controlled confirmation modal as `GlassCard neonColor='red'` overlay (replace `window.confirm` if present).  
  **Files:** `apps/web/src/components/admin/FinalizeButton.tsx`  
  **Verify:** `pnpm --filter web type-check && pnpm --filter web lint`

---

## Phase 6 — Developer dashboard (FEAT-004 step 12)

- [ ] 35. **Upgrade DeveloperDashboard + 4 tab components** — NeonText glitch header, StatusBar at top, Radix Tabs with per-tab neon colours, BridgeHealthTab GlassCard status rows, BotAnalyticsTab neon bar chart divs, BotErrorsTab/WebsiteErrorsTab neon red error cards with mono stack traces.  
  **Files:** `apps/web/src/components/developer/DeveloperDashboard.tsx`, `BridgeHealthTab.tsx`, `BotAnalyticsTab.tsx`, `BotErrorsTab.tsx`, `WebsiteErrorsTab.tsx`  
  **Verify:** `pnpm --filter web type-check && pnpm --filter web lint`

---

## Phase 7 — Broadcast overlay (FEAT-005 steps 1–2)

**Animation notes:** scanIn clip-path reveal entrance; standings table with neon rank borders; data-scroll CSS keyframe for >8 rows; no Navigation/StatusBar (OBS capture surface).

- [ ] 36. **Upgrade OverlayClient** — read full file (offset 60+). Dark translucent panel, neon rank borders, Orbitron team names, mono stats, scanIn entrance, live match badge.  
  **Files:** `apps/web/src/app/overlay/[guildId]/[tournamentId]/OverlayClient.tsx`

- [ ] 37. **Upgrade overlay layout** — transparent background for OBS chroma key.  
  **Files:** `apps/web/src/app/overlay/[guildId]/[tournamentId]/layout.tsx`  
  **Verify:** `pnpm --filter web type-check`

---

## Phase 8 — Docs pages (FEAT-005 steps 3–4)

- [ ] 38. **Upgrade docs layout** — `#050508` sidebar, neon active link, JetBrains Mono section labels, CyberBreadcrumb in main.  
  **Files:** `apps/web/src/app/docs/layout.tsx`

- [ ] 39. **Upgrade docs pages** — NeonText heroes, GlassCard neonColor step/feature cards, mono code blocks with `neon-border-cyan`.  
  **Files:** `apps/web/src/app/docs/page.tsx`, `apps/web/src/app/docs/getting-started/page.tsx`, `apps/web/src/app/docs/discord-commands/page.tsx`, `apps/web/src/app/docs/tournaments/create/page.tsx`, `apps/web/src/app/docs/tournaments/formats/page.tsx`  
  **Verify:** `pnpm --filter web type-check`

---

## Phase 9 — Error pages + StatusBar wiring (FEAT-005 steps 5–7)

- [ ] 40. **Cyberpunk 404 page** — NeonText glitch '404', mono 'SECTOR NOT FOUND', scanline-overlay, GlowButton primary back to home, HeroSceneWrapper background.  
  **Files:** `apps/web/src/app/not-found.tsx`

- [ ] 41. **Cyberpunk 500/global-error page** — NeonText glitch 'SYSTEM ERROR', mono description, GlowButton destructive reload. No Three.js.  
  **Files:** `apps/web/src/app/global-error.tsx`

- [ ] 42. **Wire StatusBar into root layout** — dynamic import (ssr:false), render just before `</body>`. Do not touch metadata, fonts, or Providers.  
  **Files:** `apps/web/src/app/layout.tsx`  
  **Verify:** `pnpm --filter web type-check && pnpm --filter web lint && pnpm --filter web build`

---

## Prisma queries referenced per phase

| Phase | Queries |
|-------|---------|
| Dashboard | `tournament.count` ×4, `registration.count`, `match.count`, `dispute.count`, `registrationMember.findMany` (distinct userId), `tournament.findMany` (fill rate) |
| Public server page | `discordServer.findUnique`, `tournament.findMany` ×2, `winnerRecord.findMany` |
| Tournament detail | `tournament.findFirst` (with stages/matches/registrations include), `scoreEvent.findMany` |
| Leaderboards | `scoreEvent.findMany` (nested stage/tournament include) |
| Winners | `winnerRecord.findMany`, `tournament.findMany` |
| Admin tournaments | `tournament.findMany` (50, ordered by createdAt desc) |
| Admin matches | `tournament.findMany` (with stages.matches) |
| Admin results | `match.findMany` ×2 (AWAITING_RESULT, UNDER_REVIEW), `dispute.findMany` |
| Analytics | via `/api/servers/[guildId]/analytics` route |
| Settings | `discordServer.findUnique`, `serverSettings.findUnique` |
| Developer | via `/api/developer/*` routes (5 parallel fetches) |
| Overlay | `serverSettings.findFirst` (token), `computeTournamentStandings` (scoring package), `team.findMany`, `match.findFirst` ×2 |

---

## Animation summary per phase

| Component | Animation |
|-----------|-----------|
| Nav logo | `glitch-clip` on hover |
| Nav scan-line | `hud-slide-in` once on load |
| Landing hero title | `glitch-text` CSS class (persistent subtle glitch) |
| Landing stats counters | Framer Motion `counterPop` (spring scale) |
| Landing ticker tape | CSS `marquee` / `translateX(-100%)` infinite |
| Tournament cards | `gradient-spin` conic border on hover (existing) |
| KPI cards | `counterPop` stagger |
| Leaderboard rows | `rank-changed-up/down` on data change (existing) |
| Podium | `podium-first/second/third` float (existing) |
| Overlay entrance | Framer Motion `scanIn` (clip-path) |
| Breadcrumb | `fadeIn` on mount |
| Sidebar icons | `scaleIn` stagger on mount |
| Wizard step indicator | `pulse-glow` on active step |
| 404 page | `glitch-clip` on '404' heading |
