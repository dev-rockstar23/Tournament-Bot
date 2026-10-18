# Cyberpunk UI Redesign — FEAT-002 through FEAT-005

All public-facing pages, admin pages, developer dashboard, overlay, docs, and error pages have been converted to a cyberpunk aesthetic built on a shared token layer (`GlassCard`, `GlowButton`, `NeonText`, `StatusBar`, `StatusPulse`, `CyberBreadcrumb`) with recharts charts and framer-motion entry animations. Prisma queries, auth guards, and business logic were explicitly kept untouched in every pass. TypeScript compiled clean across all four feature sets.

Watch for: (1) **confirmed** — four sub-pages under `/docs` (`getting-started`, `discord-commands`, `tournaments/create`, `tournaments/formats`) lack their own `export const dynamic = 'force-dynamic'`; the root `layout.tsx` export covers them in Next.js 14 but the per-file convention is broken. (2) **confirmed** — `/admin/payment/page.tsx` was rewritten as a `'use client'` component, removing the server-side auth guard that every other admin page carries; the page frame renders before the API auth check runs. (3) **confirmed** — `OverlayClient.tsx` subscribes to the query cache inside the component body without cleanup, leaking subscriptions on every re-render.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The four-pass redesign lands a coherent visual system. Every route touched by the UI layer uses the shared component library consistently and no ad-hoc cyberpunk styles were invented outside it. The only structural divergence is the payment page, rewritten as a `'use client'` component instead of the server-component + client-component split used everywhere else — this removes the explicit server-side auth guard.

`force-dynamic` is set in the root `layout.tsx` and repeated on the majority of page files. Four docs sub-pages rely solely on the layout-level export; that works in Next.js 14 but breaks the explicit-per-file convention the rest of the codebase follows. The `/admin/payment/page.tsx` can't export `dynamic` at all since it's a client component; it's covered by the parent admin `layout.tsx`, but losing the server-side `redirect()` guard is the more meaningful gap.

The overlay correctly excludes Navigation, uses an isolated layout wrapper, and inlines its CSS for OBS compatibility. The realtime update path in `OverlayClient` leaks query-cache subscriptions because the subscribe call sits in the component body with no cleanup. The `global-error.tsx` correctly carries `'use client'` and inlines all CSS. Recharts and framer-motion coverage is solid across all chart-bearing components; the one gap is `BracketPageClient.tsx`, a client component with no framer-motion entry animations.

---

<details>
<summary>Issues (5)</summary>

1. **`force-dynamic` gap in docs sub-pages** — `/docs/getting-started`, `/docs/discord-commands`, `/docs/tournaments/create`, and `/docs/tournaments/formats` have no per-file `export const dynamic = 'force-dynamic'`. Add the export to each file to match the rest of the codebase.

2. **Auth-guard regression in `/admin/payment/page.tsx`** — The rewrite removed the server-side `if (!user) redirect(...)` guard. The page frame now renders before the `useEffect` API call returns a 401, meaning an unauthenticated or token-expired user sees the payment UI shell. Convert back to the server-component + client-component pattern, or add a server-rendered auth check that redirects before the client shell is sent.

3. **Query-cache subscription leak in `OverlayClient.tsx`** — `queryClient.getQueryCache().subscribe(...)` is called directly in the component body (line ~47). Every render adds a new subscriber with no cleanup. Wrap in `useEffect` and return the unsubscribe function: `useEffect(() => { const unsub = qc.getQueryCache().subscribe(...); return () => unsub() }, [queryClient])`.

4. **Stale `eslint-disable` comment in `OverlayClient.tsx`** — Line 57 has `// eslint-disable-next-line @typescript-eslint/no-explicit-any` but the suppressed line uses `Record<string, unknown>` with `as T` casts, not `any`. Remove the comment.

5. **`BracketPageClient.tsx` has no framer-motion animations** — It is a `'use client'` component but no entry animations were added to the bracket visualization or match detail panel, despite the FEAT-003 done file implying coverage. Add `motion.div` wrappers to the panel entry for consistency with every other client component in the redesign.

</details>

---

<details>
<summary>Details</summary>

## `force-dynamic` coverage — per-file vs layout inheritance

The root `apps/web/src/app/layout.tsx` exports `export const dynamic = 'force-dynamic'` and `export const dynamicParams = true`. In Next.js 14, this cascades to nested pages unless overridden. The four docs sub-pages are all `'use client'` components with no server data fetching, so the caching impact is minimal. The gap is consistency: reviewers landing on these files in isolation won't see the signal, and a future refactor to an RSC would need the export added reactively.

## Auth-guard regression in the payment page

Every other admin page is a server component that auth-guards before rendering:

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect(`/?next=...`)
const userRole = await resolveUserRole(...)
if (userRole < AppRole.SERVER_ADMIN) return <AccessDenied />
```

The rewritten `payment/page.tsx` does none of this. It is `'use client'` with a `useEffect(() => fetch('/api/servers/${guildId}/payment-config'), [guildId])` — the page shell (KPI cards, ledger skeleton, credentials form) renders immediately, and auth is only enforced by the API route's response. A user whose session has just expired will see the full payment operations UI frame before the 401 arrives. This is a confirmed regression introduced in this PR.

## OverlayClient subscription leak

```ts
// current (leaks on every render)
queryClient.getQueryCache().subscribe((event) => {
  if (...) fetch(...).then(...)
})
```

The `queryClient` reference is stable, but `getQueryCache().subscribe()` returns an unsubscribe function that is never called. Every re-render (triggered by `setStandings`) adds another subscriber. For a long-running OBS overlay this compounds over time. Fix:

```ts
useEffect(() => {
  const unsub = queryClient.getQueryCache().subscribe((event) => {
    if (...) fetch(...).then(...)
  })
  return () => unsub()
}, [queryClient, guildId, tournamentId])
```

## CSS class and `glitch-text` data-text consistency

All five required classes (`.scanline-overlay`, `.hud-grid-bg`, `.neon-text-violet`, `.neon-text-cyan`, `.glitch-text`) are present across the redesigned pages. One non-obvious constraint: `.glitch-text` requires a `data-text` attribute to drive its CSS `::before`/`::after` layer duplication. `NeonText` only applies `data-text` when `children` is a `string`. All glitch-decorated headings in scope use string children — this holds for the landing page, docs, leaderboards, payment, and tournament detail headers.

## framer-motion coverage

RSC pages can't import framer-motion — they delegate to embedded client components (`WinnersPodium`, `TournamentCard`, `AnimatedCounter`, `PodiumWrapper`), which is correct. All client components use `motion.div` for entry animations except `BracketPageClient.tsx`, which is `'use client'` but has no framer-motion usage despite FEAT-003 claiming coverage.

## Recharts in analytics and developer pages

`AdminDashboardNexus` uses `AreaChart`, `AnalyticsNexus` uses `AreaChart`/`PieChart`/`BarChart`, `DeveloperDashboard` uses `PieChart`/`BarChart`, `BotAnalyticsTab` uses `BarChart`. All charts use `ResponsiveContainer`.

Chart data in admin/analytics pages is derived from real props. Bot analytics data is synthetic — `buildRegVelocity` and `buildOCRLatency` generate curves from KPI totals, not actual time-series. This is fine for a visual pass. The "Export" button in `AnalyticsNexus` calls `window.print()` rather than producing a CSV or JSON download. Whether that matches the spec is worth confirming.

## Docs sub-pages — design system adoption gap

The four docs content pages use `GlassCard` and framer-motion but skip `NeonText`, `GlowButton`, and the neon CSS classes. Their visual treatment is intentionally more restrained — the cyberpunk aesthetic comes from `docs/layout.tsx` (HUD grid, cyber sidebar). This is a reasonable split and not a defect.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `components/ui/Navigation.tsx` | Full cyberpunk redesign — mobile drawer, active violet underline |
| `components/admin/AdminSidebar.tsx` | CONTROL_NEXUS header, renamed nav items, collapse animation |
| `components/LandingPage.tsx` | Full cyberpunk hero, GlowButton CTA, stats row, feature cards |
| `app/servers/page.tsx` | Cyberpunk server list — filter tabs, scanline, neon header |
| `app/servers/[guildId]/page.tsx` | Guild hero card, quick stats, LIVE featured card, Hall of Champions |
| `app/servers/[guildId]/tournaments/[tournamentId]/page.tsx` | Tournament hero banner, tab bar, live standings sidebar |
| `app/servers/[guildId]/tournaments/[tournamentId]/bracket/BracketPageClient.tsx` | HUD sticky header, bracket tabs, match detail panel |
| `app/servers/[guildId]/tournaments/[tournamentId]/register/page.tsx` | Squad registration layout, slot engine, escrow checkout |
| `app/servers/[guildId]/leaderboards/page.tsx` | Season podium, standings table in GlassCard, MVP frag race sidebar |
| `app/servers/[guildId]/winners/page.tsx` | Hall of Fame header, season finale card, champions grid |
| `app/servers/[guildId]/winners/[tournamentId]/page.tsx` | Tournament result detail, CyberBreadcrumb, navigation links |
| `components/admin/AdminDashboardNexus.tsx` | NEW — full admin nexus with metrics, disputes queue, AreaChart |
| `app/servers/[guildId]/admin/tournaments/page.tsx` | Swapped to AdminDashboardNexus |
| `app/servers/[guildId]/admin/tournaments/new/page.tsx` | 6-step wizard cyberpunk header, format cards |
| `app/servers/[guildId]/admin/tournaments/[tournamentId]/page.tsx` | Cyberpunk header, slot visualizer grid |
| `components/analytics/AnalyticsNexus.tsx` | NEW — KPI rows, AreaChart/PieChart/BarChart, export panel |
| `app/servers/[guildId]/admin/analytics/page.tsx` | Swapped to AnalyticsNexus |
| `components/admin/SettingsNexus.tsx` | NEW — 3-tab settings (staff/channels/security) |
| `app/servers/[guildId]/admin/settings/page.tsx` | Swapped to SettingsNexus |
| `app/servers/[guildId]/admin/payment/page.tsx` | REWRITTEN as 'use client' — ledger, webhook health, escrow policy; auth guard removed |
| `components/developer/DeveloperDashboard.tsx` | REWRITTEN — 4-tab layout with recharts |
| `app/overlay/[guildId]/[tournamentId]/OverlayClient.tsx` | Full OBS overlay redesign — standings, frag king, bottom ticker |
| `app/docs/layout.tsx` | Cyberpunk docs layout — cyber sidebar, HUD background, right rail |
| `app/docs/page.tsx` | Cyberpunk docs home — hero, quick-access cards, quick start, features |
| `app/docs/getting-started/page.tsx` | Step cards with gradient badges, framer-motion entry |
| `app/docs/discord-commands/page.tsx` | Searchable command table with permission badges |
| `app/docs/tournaments/create/page.tsx` | 6-step wizard guide with framer-motion stagger |
| `app/docs/tournaments/formats/page.tsx` | Format cards with copy-to-clipboard templates |
| `app/not-found.tsx` | Cyberpunk 404 — glitch-text, terminal block, scanline |
| `app/global-error.tsx` | Cyberpunk 500 — 'use client', fully inlined CSS, glitch-red animation |

</details>
