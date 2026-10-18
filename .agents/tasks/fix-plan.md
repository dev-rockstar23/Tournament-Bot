# Fix Plan — Post-Redesign Bug Fixes

**Commit:** `223794c` — pushed to `origin/main`  
**Branch:** `main`  
**Status:** ✅ All 8 bugs fixed and committed.

---

## 1. Build Verification

### Pre-existing build failure
`pnpm build:web` fails with:
```
Error: EPERM: operation not permitted, scandir 'C:\Users\Amey\Application Data'
> Build failed because of webpack errors
```
This is a **Windows machine-level issue** — a junction/symlink in the user profile directory that denies directory scanning during Next.js production build's asset glob phase. It is **not caused by our code changes** and existed before this fix set. The `watchOptions.ignored` in `next.config.js` only applies to dev-mode file watching, not production build scanning.

**Resolution needed (outside code):** Run the build as Administrator, or add `NEXT_IGNORE_PREFLIGHT_DIRS` / configure Next.js `outputFileTracingExcludes` to skip `C:\Users\*\Application Data`. The TypeScript compile (`tsc --noEmit`) passes with only pre-existing Prisma `dist` vs `src` type-mismatch errors unrelated to our changes.

---

## 2. Investigation Findings & Fix Details

### BUG #1 — P0 CRITICAL: `/api/auth/me` flat response vs `{ user: ... }` wrapper
**File:** `apps/web/src/app/api/auth/me/route.ts`  
**Problem:** Route returned `{ id, discordId, username, avatar }` flat. `Navigation.tsx` destructures `data?.user` — always `undefined`, user always shown as logged out.  
**Fix:** Wrapped response in `{ user: { id, username, avatar, discriminator, globalRole } }`.

### BUG #2 — P0 CRITICAL: `format(match.scheduledStart, …)` crash on null
**File:** `apps/web/src/app/servers/[guildId]/tournaments/[tournamentId]/page.tsx`  
**Problem:** `date-fns format()` throws if passed `null`. `scheduledStart` is nullable in the Prisma schema.  
**Fix:** Added null guard: `match.scheduledStart ? format(match.scheduledStart, 'PP p') : '—'`

### BUG #3 — P0 CRITICAL: Admin sidebar logout → 404, logout only handles POST
**Files:**
- `apps/web/src/app/api/auth/logout/route.ts` — added `GET` handler that calls `signOut()` and redirects to `/`
- `apps/web/src/components/admin/AdminSidebar.tsx` — changed logout `href` from `/auth/signout` (non-existent) to `/api/auth/logout`

### BUG #4 — P1: Navigation has 3 dead routes
**File:** `apps/web/src/components/ui/Navigation.tsx`  
**Problem:** `navLinks` array contained `/leaderboards`, `/winners` (root-level), and `/admin` — none of which exist as top-level app routes.  
**Fix:** Reduced `navLinks` to only confirmed existing routes:
```ts
{ href: '/servers', label: 'Servers' },
{ href: '/docs', label: 'Documentation' },
```

### BUG #5 — P1: AdminSidebar has 3 dead nav links
**File:** `apps/web/src/components/admin/AdminSidebar.tsx`  
**Problem:** Links to `/admin/rooms`, `/admin/disputes`, `/admin/broadcast` — routes that don't exist in the file system.  
**Fix:** Replaced `navItems` with confirmed existing routes only:
- `OVERVIEW` → `/servers/${guildId}/dashboard`
- `TOURNAMENTS` → `/servers/${guildId}/admin/tournaments`
- `ANALYTICS` → `/servers/${guildId}/admin/analytics`
- `PAYMENT OPS` → `/servers/${guildId}/admin/payment`
- `TENANT CONFIG` → `/servers/${guildId}/admin/settings`
- Replaced removed icons (`KeyRound`, `AlertTriangle`, `Radio`) with `BarChart2`, `CreditCard`

### BUG #6 — P2: Tournament detail tabs are decorative (no state)
**Files:**
- `apps/web/src/components/tournament/TournamentTabs.tsx` — **created new** client component with `useState<TabKey>('OVERVIEW')`, renders OVERVIEW / PARTICIPANTS / BRACKET / STANDINGS sections conditionally. BRACKET tab is a link to the bracket sub-page.
- `apps/web/src/app/servers/[guildId]/tournaments/[tournamentId]/page.tsx` — removed inline static tab markup and the content grid; replaced with `<TournamentTabs ...>`. Cleaned up stale imports (`GlassCard`, `GlowButton`, `StatusPulse`, `Link`, `matchStatusLabel`, `matchStatusVariant`, `ShareButton`, `formatDistanceToNow`, `format`).

### BUG #7 — P2: `GlowButton asChild` wraps in `<span>`, creates click dead zones
**File:** `apps/web/src/components/ui/GlowButton.tsx`  
**Problem:** `asChild` branch wrapped child in `<span>`, so `<Link>` inside it got a non-anchor wrapper — clicks on the shimmer overlay didn't propagate and the button element was non-semantic.  
**Fix:** Uses `React.cloneElement` to merge `baseClasses` directly onto the child's `className`, preserving the child's native element type:
```ts
const child = Children.only(children)
if (isValidElement(child)) {
  const childProps = child.props as { className?: string }
  return cloneElement(child, { ...childProps, className: cn(baseClasses, childProps.className) })
}
```

### BUG #8 — P3: Analytics SSR fetch strips auth cookies
**File:** `apps/web/src/app/servers/[guildId]/admin/analytics/page.tsx`  
**Problem:** `{ headers: { Cookie: '' } }` actively cleared the session cookie, causing the internal API call to always return 401 on first load.  
**Fix:** Imported `cookies` from `next/headers` and forwarded the actual cookie header:
```ts
import { cookies } from 'next/headers'
// ...
const cookieHeader = cookies().toString()
const res = await fetch(url, { headers: { Cookie: cookieHeader }, cache: 'no-store' })
```

---

## 3. Files Changed

| File | Change |
|------|--------|
| `apps/web/src/app/api/auth/me/route.ts` | Wrap response in `{ user: ... }` |
| `apps/web/src/app/api/auth/logout/route.ts` | Add GET handler for browser-navigation logout |
| `apps/web/src/components/admin/AdminSidebar.tsx` | Fix logout href + remove 3 dead nav links |
| `apps/web/src/components/ui/Navigation.tsx` | Remove 3 dead top-level nav links |
| `apps/web/src/components/ui/GlowButton.tsx` | Fix `asChild` to use `cloneElement` |
| `apps/web/src/components/tournament/TournamentTabs.tsx` | **New file** — client component with functional tab state |
| `apps/web/src/app/servers/[guildId]/tournaments/[tournamentId]/page.tsx` | Use TournamentTabs; add null-guard on scheduledStart; clean stale imports |
| `apps/web/src/app/servers/[guildId]/admin/analytics/page.tsx` | Forward real cookies to SSR fetch |

---

## 4. Remaining Pre-existing Issues (not in scope)

1. **EPERM build failure** — Windows filesystem junction in `C:\Users\Amey\Application Data` blocks Next.js production build glob scan. Requires machine-level fix.
2. **Prisma dist/src type mismatch** — `computeTournamentStandings` called with `dist`-typed PrismaClient where `src`-typed is expected. Affects 4 files. Requires package rebuild or type alignment.
3. **`/servers/${guildId}/leaderboards`** — referenced in TournamentTabs Quick Actions sidebar. This is a per-guild route that does exist (`apps/web/src/app/servers/[guildId]/leaderboards/`).
