# SHADØW TOURNAMENTS — Rebrand & Bug-Fix Pass

The web frontend (`apps/web/src/`) has been fully rebranded from "Legendary Esports" to "SHADØW TOURNAMENTS". All brand-related metadata, navigation, landing page assets, error pages, and admin sidebar carry the new identity. Four functional fixes — server filter tabs, guild page tab routing, leaderboard game filtering, and the tournament wizard — are also present and wired correctly.

Watch for: (1) the OG/Twitter image URL is hardcoded to `shadow-tournaments.vercel.app` — if the production domain differs, social cards will break. (2) The mobile nav drawer uses exact-match `pathname === link.href` instead of `pathname.startsWith(href)`, so sub-pages under `/docs/...` won't highlight the Docs link on mobile. (3) Discord bot embeds (`apps/discord-bot/`) still carry "Legendary Esports" in footers and command descriptions — out of scope for this diff but a future bloat if the bot is public-facing.

**Verdict**: APPROVED

---

## High-level view

Every instance of the old brand name inside `apps/web/src/` is gone — confirmed by a full-tree grep returning zero hits. The root `layout.tsx` sets the title default/template, favicon, and all Open Graph and Twitter card fields correctly, with the one caveat that the OG image URL is a hardcoded production domain rather than a relative path or env var, making it fragile if the domain changes.

Brand assets (`/shadow-logo.png`, `/shadow-banner.png`) are present in `apps/web/public/` and referenced correctly: the logo appears in both `Navigation.tsx` and the `LandingPage.tsx` hero section; the banner is used as a fixed full-viewport background with 20% opacity on the landing page.

The servers list page (`servers/page.tsx`) uses `useState` with `onClick` for its filter tabs, which is appropriate since it is a client component that already fetches data client-side. The guild detail page (`servers/[guildId]/page.tsx`) uses URL `searchParams.tab` with `<Link>` elements — correct for a server component. The leaderboards page (`servers/[guildId]/leaderboards/page.tsx`) uses `searchParams.game` with `<Link>` elements and applies the filter server-side before passing rows to the client table component.

The `TournamentWizard` POSTs to `/api/servers/${guildId}/admin/tournaments` on both draft saves and final publish. The publish flow creates the tournament first if it hasn't been saved yet, then calls the separate `/publish` endpoint. Both paths include error handling and surface messages to the user.

`Navigation.tsx` uses `pathname?.startsWith(link.href)` for the desktop nav active state — correct. The mobile drawer uses `pathname === link.href` — a minor inconsistency that leaves sub-pages under `/docs/` without an active indicator on mobile.

---

<details>
<summary>Issues (3)</summary>

1. **Hardcoded OG image domain** — `og:image` and `twitter:image` in `layout.tsx` are set to `https://shadow-tournaments.vercel.app/shadow-banner.png`. If the deployment URL is different, social preview cards will serve a broken image. Use `NEXT_PUBLIC_SITE_URL` (or Next.js's `metadataBase`) so the URL is derived at build time.

2. **Mobile nav active state inconsistency** — The desktop nav uses `pathname?.startsWith(link.href)` (confirmed, line ~106 in Navigation.tsx) but the mobile drawer uses `pathname === link.href` (confirmed, ~248). Deep doc pages (e.g., `/docs/getting-started`) will have an active desktop link but no active mobile link. Align the mobile drawer to use `startsWith` as well.

3. **Discord bot brand residue (out of web scope, noted for follow-up)** — `apps/discord-bot/src/utils/responses.ts`, `embeds.ts`, and multiple command files still use "Legendary Esports" in embed footers and `/setup` command descriptions. This won't affect the web build but will surface the old brand name to Discord users. Should be addressed in a follow-up commit.

</details>

---

<details>
<summary>Details</summary>

### Rebrand completeness — web frontend

A full-tree grep across `apps/web/src/**/*.{ts,tsx}` returns zero matches for "Legendary Esports", "LEGENDARY ESPORTS", "legendary-esports", and "legendary esports" — **confirmed**. The targeted files (`layout.tsx`, `LandingPage.tsx`, `Navigation.tsx`, `AdminSidebar.tsx`, `not-found.tsx`, `global-error.tsx`, all docs pages) each carry only SHADØW TOURNAMENTS branding.

The Discord bot (`apps/discord-bot/src/`) is a different story: 12+ files still reference the old name in embed footers (`brandFooter`, `setFooter`) and in the `/setup` command's description string. These files are outside the stated review scope (`apps/web/src/`) but worth flagging as a known gap since they are visible to end users through Discord.

### Metadata and brand assets

`layout.tsx` sets all required metadata fields — confirmed:
- `title.default` / `title.template`: `'SHADØW TOURNAMENTS'` / `'%s | SHADØW TOURNAMENTS'`
- `icons.icon` and `icons.apple`: `/shadow-logo.png`
- `openGraph.title`, `.description`, `.url`, `.siteName`, `.type`: all present
- `openGraph.images[0].url`: `https://shadow-tournaments.vercel.app/shadow-banner.png` — **confirmed absolute URL, but hardcoded domain** (see Issues #1)
- `twitter.card`: `'summary_large_image'` ✓

Both `/shadow-logo.png` and `/shadow-banner.png` exist in `apps/web/public/` — confirmed via filesystem check.

### Navigation active state

Desktop nav (line ~106): `const isActive = pathname?.startsWith(link.href) ?? false` — **confirmed correct**.

Mobile drawer (~line 248): `const isActive = pathname === link.href` — **confirmed exact match**. With only two nav links (`/servers`, `/docs`), this means any URL under `/docs/getting-started`, `/docs/tournaments`, etc., will light up the desktop Docs link but not the mobile one.



</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `apps/web/src/app/layout.tsx` | Full metadata rebrand: title, OG, Twitter, favicon |
| `apps/web/src/components/LandingPage.tsx` | SHADØW brand in hero, logo + banner assets wired |
| `apps/web/src/components/ui/Navigation.tsx` | SHADØW logo + brand text; `startsWith` active state |
| `apps/web/src/components/admin/AdminSidebar.tsx` | SHADØW header text; no legacy brand present |
| `apps/web/src/app/not-found.tsx` | No legacy brand; SIGNAL LOST 404 page |
| `apps/web/src/app/global-error.tsx` | SHADØW TOURNAMENTS in page title |
| `apps/web/src/app/servers/page.tsx` | useState filter tabs for ALL/CONNECTED/ELIGIBLE/ARCHIVED |
| `apps/web/src/app/servers/[guildId]/page.tsx` | URL searchParams tab filtering with Link elements |
| `apps/web/src/app/servers/[guildId]/leaderboards/page.tsx` | URL searchParams game filtering server-side |
| `apps/web/src/components/admin/tournament-wizard/TournamentWizard.tsx` | POST/PATCH to API; publish flow; draft restore |

Full diff: `git diff main -- apps/web/src/`

</details>
