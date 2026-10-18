# Implementation Plan — SHADØW TOURNAMENTS Rebrand + Bug Fixes

> Build command: `cd apps/web && npm run build` (runs `prisma generate` + `next build`)
> Type-check: `cd apps/web && npm run type-check`
> Lint: `cd apps/web && npm run lint`
> All commands run from `d:\Discord Projects\Tournament-Bot\esports-platform`

---

## Rebrand Tasks

- [ ] 1. Update root metadata and favicon in `layout.tsx`.

      Replace the `metadata` export with a full Open Graph + Twitter card object:
      - `title.template`: `'%s | SHADØW TOURNAMENTS'`
      - `title.default`: `'SHADØW TOURNAMENTS'`
      - `description`: keep existing text
      - `themeColor`: `'#0a0a0f'`
      - `icons`: `{ icon: '/shadow-logo.png', apple: '/shadow-logo.png' }`
      - `openGraph`: `{ title: 'SHADØW TOURNAMENTS', description, url: 'https://shadowtournaments.gg', siteName: 'SHADØW TOURNAMENTS', images: [{ url: '/shadow-banner.png', width: 1200, height: 630 }], locale: 'en_US', type: 'website' }`
      - `twitter`: `{ card: 'summary_large_image', title: 'SHADØW TOURNAMENTS', description, images: ['/shadow-banner.png'] }`

      Files: `apps/web/src/app/layout.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 2. Rebrand the Navigation component (logo text + aria-label + mobile active state fix).

      Three changes in one edit pass:
      a. **Logo text**: Replace the two `<span>` children of the home `<Link>` that render `LEGENDARY` and `ESPORTS` with a single `<span>` containing `SHADØW` (white) and a second `<span>` containing `TOURNAMENTS` (cyan). Update `aria-label` from `"Legendary Esports home"` to `"SHADØW TOURNAMENTS home"`.
      b. **Desktop active state**: The mobile drawer's `isActive` check is `pathname === link.href` (exact match) while the desktop links already use `pathname?.startsWith(link.href + '/')`. Fix the mobile drawer section to use the same `startsWith` logic so `/servers/123` correctly highlights the Servers link on mobile too.

      Files: `apps/web/src/components/ui/Navigation.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 3. Rebrand `LandingPage.tsx`.

      Two string replacements:
      - Line ~147: `LEGENDARY ESPORTS` → `SHADØW TOURNAMENTS` (inside the `<NeonText>` h1)
      - Line ~326: `© {new Date().getFullYear()} LEGENDARY ESPORTS — ALL RIGHTS RESERVED` → `© {new Date().getFullYear()} SHADØW TOURNAMENTS — ALL RIGHTS RESERVED`

      Files: `apps/web/src/components/LandingPage.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 4. Rebrand `global-error.tsx` page title.

      Replace `<title>System Failure — Legendary Esports</title>` with `<title>System Failure — SHADØW TOURNAMENTS</title>`.

      Files: `apps/web/src/app/global-error.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 5. Rebrand `docs/layout.tsx` header brand text.

      The `<Link href="/">` in the docs header renders two nodes: the text `LEGENDARY{' '}` and a `<span className="neon-text-violet">ESPORTS</span>`.
      Replace with: text node `SHADØW ` + `<span className="neon-text-violet">TOURNAMENTS</span>`.

      Files: `apps/web/src/app/docs/layout.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 6. Rebrand `docs/page.tsx` hero heading and step description.

      Two replacements:
      - In the `quickStartSteps` array, step 01 description: `'Add the Legendary Esports bot…'` → `'Add the SHADØW TOURNAMENTS bot…'`
      - In the hero `<h1>`: the two JSX nodes rendering `LEGENDARY{' '}<NeonText>ESPORTS</NeonText>` → `SHADØW{' '}<NeonText>TOURNAMENTS</NeonText>`

      Files: `apps/web/src/app/docs/page.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 7. Rebrand `docs/getting-started/page.tsx` body text.

      Replace: `'Visit the bot invite link and add Legendary Esports to your server…'` → `'Visit the bot invite link and add SHADØW TOURNAMENTS to your server…'`
      Replace: `'Follow these four steps to get Legendary Esports up and running…'` → `'Follow these four steps to get SHADØW TOURNAMENTS up and running…'`

      Files: `apps/web/src/app/docs/getting-started/page.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 8. Rebrand `overlay/[guildId]/[tournamentId]/layout.tsx` metadata title.

      Replace: `{ title: 'Overlay — Legendary Esports' }` → `{ title: 'Overlay — SHADØW TOURNAMENTS' }`

      Files: `apps/web/src/app/overlay/[guildId]/[tournamentId]/layout.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 9. Rebrand `OverlayClient.tsx` default prop.

      Replace: `serverName = 'LEGENDARY ESPORTS'` → `serverName = 'SHADØW TOURNAMENTS'`

      Files: `apps/web/src/app/overlay/[guildId]/[tournamentId]/OverlayClient.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 10. Final scan — confirm no remaining "Legendary"/"LEGENDARY" strings in `apps/web/src`.

       Run a ripgrep scan across `apps/web/src/**/*.{tsx,ts}` for case-insensitive `legendary` and confirm zero matches.

       Files: (read-only scan, no changes expected)
       Verify: `grep -ri "legendary" apps/web/src` returns no output.

---

## Bug Fix Tasks

- [ ] 11. Fix servers/page.tsx filter tabs — they already have state wiring.

      **Current state (confirmed by reading the file):** `activeTab` state and `filteredConnected`/`filteredEligible` logic are already implemented. The ARCHIVED tab shows `(0)` and the eligible section already gates on `activeTab !== 'connected'`. The tabs render with `aria-selected`. **No logic change needed here.** The one genuine gap: `activeTab === 'archived'` hides both sections and shows nothing — add an explicit "No archived servers" empty-state block inside the `{!loading && !error && data && ...}` branch, shown only when `activeTab === 'archived'`.

      Files: `apps/web/src/app/servers/page.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 12. Fix servers/[guildId]/page.tsx tournament filter tabs — wire to URL search params.

      The filter tabs row (ALL / LIVE / REGISTRATION OPEN / UPCOMING / COMPLETED) are currently static `<button>` elements with no state or URL effect. Convert this server component's filter to URL-based:
      a. Convert the component to a **client component** (`'use client'`) OR extract just the filter tabs into a small `TournamentFilterTabs` client component and pass `searchParams` from the server page to it.
      b. Preferred approach (less refactor): keep the server component, add `searchParams: { tab?: string }` to the page `PageProps`, read `searchParams.tab ?? 'ALL'` as the active tab, and turn the filter buttons into `<Link href={`?tab=${tab}`}>` elements. Filter the `operationsDeck` array on the server using the active tab value before rendering.

      **Note:** The `params` + `searchParams` approach avoids converting the entire server component to a client component, which is preferred since this page uses `prisma` and `createClient`. Active tab state lives in the URL (`?tab=LIVE`), which is shareable and works with Next.js server components.

      Concretely: add `searchParams: { tab?: string }` to the page props interface. Compute `activeTabValue = (searchParams?.tab ?? 'ALL').toUpperCase()`. Filter `operationsDeck` by status before passing to `TournamentOperationCard`. Render each tab button as `<Link href={`?tab=${tab.replace(' ', '_')}`}>` with an active style when `activeTabValue === tab`.

      Files: `apps/web/src/app/servers/[guildId]/page.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 13. Fix leaderboards/page.tsx game filter tabs — wire to URL search params.

      The game filter tabs (ALL GAMES / BGMI / FREE FIRE / COD MOBILE) are static buttons hardcoding `i === 0` for the active style. Apply the same URL param pattern as item 12:
      a. Add `searchParams: { game?: string }` to `PageProps`.
      b. Compute `activeGame = (searchParams?.game ?? 'ALL').toUpperCase()`.
      c. Filter the `rows` array passed to `<LeaderboardsClient rows={...}>` by matching `r.game` when `activeGame !== 'ALL'`. Map tab labels to game values: `ALL GAMES → ALL`, `BGMI → BGMI`, `FREE FIRE → FREE_FIRE`, `COD MOBILE → COD_MOBILE`.
      d. Render each tab as `<Link href={`?game=${gameParam}`}>` with active styling when `activeGame === gameValue`.
      e. Also pass the filtered `rows` to the MVP Frag Race and Server Records sidebar sections so they too reflect the selected game.

      Files: `apps/web/src/app/servers/[guildId]/leaderboards/page.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 14. Audit and fix the TournamentWizard API wiring end-to-end.

      **Reading the code confirms:**
      - `saveDraft` POSTs to `/api/servers/${guildId}/admin/tournaments` with `{ name, game, mode, description, visibility }` and stores the returned `tournament.id`.
      - `publish` first creates (same POST) if no `savedTournamentId`, then calls `POST /api/servers/${guildId}/tournaments/${tournamentId}/publish`.
      - Both handle errors and surface them in the `error` state.
      - The auto-save fires every 30 seconds and saves to localStorage regardless of API availability.

      **Gaps identified:**
      a. `publish` calls the wrong publish endpoint: it should be `/api/servers/${guildId}/admin/tournaments/${tournamentId}/publish` (under `/admin/`), not `/api/servers/${guildId}/tournaments/${tournamentId}/publish`. Fix this URL.
      b. When `publish` creates the tournament in the first `if (!tournamentId)` block, it calls `fetch(...)` then immediately calls `await res.json()` twice in sequence, but the second `fetch` for `pubRes` uses `tournamentId` which was just set — this is fine. However, `res.json()` is only called once and there's no double-consume bug. No change needed here.
      c. The `PATCH` in `saveDraft` sends only 5 fields. This is fine for a draft — no change needed.
      d. After redirect on success, `window.location.href` assignment works but in Next.js 14 it is better to use `useRouter().push(...)`. Import `useRouter` from `next/navigation` and replace `window.location.href = ...` with `router.push(...)`.

      Files: `apps/web/src/components/admin/tournament-wizard/TournamentWizard.tsx`
      Verify: `npm run type-check` — no new errors.

- [ ] 15. Run full type-check and lint to confirm all changes are clean.

      Files: (no new changes)
      Verify:
      - `cd apps/web && npm run type-check` — exits 0.
      - `cd apps/web && npm run lint` — exits 0 (fix any `next lint` auto-fixable issues with `npm run lint -- --fix` if needed).

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `apps/web/src/app/layout.tsx` | Metadata: title template, OG tags, twitter card, favicon (items 1) |
| `apps/web/src/components/ui/Navigation.tsx` | Logo rebrand + mobile active-state fix (items 2, Fix 8) |
| `apps/web/src/components/LandingPage.tsx` | H1 + footer copyright rebrand (item 3) |
| `apps/web/src/app/global-error.tsx` | Page title rebrand (item 4) |
| `apps/web/src/app/docs/layout.tsx` | Header brand rebrand (item 5) |
| `apps/web/src/app/docs/page.tsx` | Hero heading + step description rebrand (item 6) |
| `apps/web/src/app/docs/getting-started/page.tsx` | Body text rebrand (item 7) |
| `apps/web/src/app/overlay/[guildId]/[tournamentId]/layout.tsx` | Metadata title rebrand (item 8) |
| `apps/web/src/app/overlay/[guildId]/[tournamentId]/OverlayClient.tsx` | Default prop rebrand (item 9) |
| `apps/web/src/app/servers/page.tsx` | Archived empty state (Fix 1) |
| `apps/web/src/app/servers/[guildId]/page.tsx` | Filter tabs → URL search params (Fix 2) |
| `apps/web/src/app/servers/[guildId]/leaderboards/page.tsx` | Game filter tabs → URL search params (Fix 3) |
| `apps/web/src/components/admin/tournament-wizard/TournamentWizard.tsx` | Fix publish URL + use router.push (Fix 4) |

## Notes for implementer

- `not-found.tsx`: No "Legendary Esports" string found in this file after reading it — no change needed.
- `AdminSidebar.tsx`: No "Legendary Esports" string found — no change needed.
- The logo `/shadow-logo.png` and banner `/shadow-banner.png` are confirmed already present in `public/` — no file copy needed.
- The "Ø" character in SHADØW: use the literal Unicode character `Ø` (U+00D8) in all display strings. In metadata fields (OG, Twitter), `SHADØW TOURNAMENTS` is fine — Next.js handles encoding.
- For items 12 and 13, the URL-params approach keeps these pages as server components (no `'use client'` added), which preserves their Prisma/Supabase server-side data fetching.
- Fix 8 (Navigation active state) is folded into item 2 since it touches the same file and the desktop nav already uses `startsWith`; only the mobile drawer needs fixing.
