# Implementation Plan — Tournament Detail Admin Dashboard

## Background

The admin panel already has: tournament list (`/admin/tournaments`), create wizard (`/admin/tournaments/new`), participants page (`/admin/tournaments/[tournamentId]/participants`), matches page (`/admin/tournaments/[tournamentId]/matches`), and finalize page (`/admin/tournaments/[tournamentId]/finalize`). The navigation in `TournamentAdminTable` already links to `/servers/[guildId]/admin/tournaments/[tournamentId]` (View) and `/servers/[guildId]/admin/tournaments/[tournamentId]/edit` — but neither page exists. This plan creates the detail page (the hub) as a tabbed dashboard. There is no separate edit page; editing is handled inside the Settings tab of the detail page.

## Decisions

- **Single hub page with tabs** (not separate /overview, /settings routes) — all four sections are quick interactions; a single URL is simpler to navigate and link to from the tournaments list.
- **Server component + one client component** — page.tsx is a server component (same pattern as every other admin page in this codebase); TournamentDetailPanel.tsx is the single 'use client' component that owns all interactivity.
- **@radix-ui/react-tabs for tabs** — already installed and used in ParticipantsTable.tsx; consistent choice.
- **Reuse ParticipantsTable inside Registrations tab** — already handles approve/reject/correction with tabs by status; no need to rebuild that UI.
- **New admin-namespaced registration route** — FEAT-001 adds `/api/servers/[guildId]/admin/tournaments/[tournamentId]/registrations/[registrationId]` as a scoped endpoint with the extra tournamentId guard. ParticipantsTable's existing PATCH URL (`/api/servers/[guildId]/registrations/[registrationId]`) continues to work unchanged.
- **react-hook-form for settings form** — already installed; used in the wizard steps.

---

- [ ] 1. Create the admin registration management API route.
      Create `apps/web/src/app/api/servers/[guildId]/admin/tournaments/[tournamentId]/registrations/[registrationId]/route.ts`.
      Export `PATCH` via `withPermission(AppRole.TOURNAMENT_MANAGER, ...)`. Validate body `{ action: 'approve'|'reject'|'request_correction', reason?: string }`. Fetch registration scoped to `registrationId + guildId + tournamentId` (reject 404 if tournamentId does not match). Execute approve (transaction: SELECT FOR UPDATE tournament, check capacity, slotNumber=acceptedCount+1, increment acceptedCount, AuditLog+OutboxEvent), reject (status=REJECTED, AuditLog+OutboxEvent), request_correction (status=PENDING, AuditLog). Return serialized registration.
      Files: `apps/web/src/app/api/servers/[guildId]/admin/tournaments/[tournamentId]/registrations/[registrationId]/route.ts`
      Verify: `cd "d:\Discord Projects\Tournament-Bot\esports-platform\apps\web" && npm run type-check` — exits 0.

- [ ] 2. Create the TournamentDetailPanel client component with 4 tabs.
      Create `apps/web/src/components/admin/TournamentDetailPanel.tsx` with `'use client'`. Define `TournamentDetail` interface (all tournament fields, stages with matches, registrations with team). Implement with `@radix-ui/react-tabs`:
      - **Overview tab**: GlassCard metadata grid (name, game, mode, status Badge, capacity bar, key dates). Action buttons: Publish (DRAFT only → POST publish), Cancel (non-terminal → inline reason → POST cancel), Finalize link (LIVE → router.push to finalize page). All calls toast on success/error, then router.refresh().
      - **Registrations tab**: render `<ParticipantsTable>` with serialized initialData from tournament.registrations.
      - **Matches tab**: summary table of stages→matches (stage, count, first start) + GlowButton linking to `/admin/tournaments/[tournamentId]/matches`.
      - **Settings tab**: react-hook-form with all editable fields (name, description, visibility, capacity, roster sizes, all date fields as datetime-local). PATCH `/api/servers/[guildId]/admin/tournaments/[tournamentId]` on submit; toast success/error.
      Files: `apps/web/src/components/admin/TournamentDetailPanel.tsx`
      Verify: `npm run type-check` — exits 0.

- [ ] 3. Create the tournament detail admin page (server component).
      Create `apps/web/src/app/servers/[guildId]/admin/tournaments/[tournamentId]/page.tsx`.
      Auth guard (same pattern as `participants/page.tsx`): createClient → getUser → redirect if no user; resolveUserRole; redirect if < TOURNAMENT_MANAGER. Prisma fetch: `findFirst({ where: { id: tournamentId, guildId }, include: { stages: { include: { matches } }, registrations: { include: { team, _count: { members } } } } })`. Serialize all Date fields to ISO strings. Render `<TournamentDetailPanel guildId={guildId} tournament={serialized} />`. Export `dynamic = 'force-dynamic'`.
      Files: `apps/web/src/app/servers/[guildId]/admin/tournaments/[tournamentId]/page.tsx`
      Verify: `npm run type-check && npm run lint` — both exit 0.

---

## Files created

| File | Type |
|---|---|
| `apps/web/src/app/api/servers/[guildId]/admin/tournaments/[tournamentId]/registrations/[registrationId]/route.ts` | New API route |
| `apps/web/src/components/admin/TournamentDetailPanel.tsx` | New client component |
| `apps/web/src/app/servers/[guildId]/admin/tournaments/[tournamentId]/page.tsx` | New page (server component) |

## Files NOT modified

All existing files (ParticipantsTable, FinalizeButton, MatchScheduler, TournamentAdminTable, admin API routes) remain unchanged. The plan reuses them as-is.
