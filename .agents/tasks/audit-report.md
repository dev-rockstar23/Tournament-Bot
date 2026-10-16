# 🔍 Esports Tournament Platform — Complete Audit Report

**Audit Date:** 2025-01-27
**Codebase:** d:/Discord Projects/Tournament-Bot/esports-platform/
**Auditor:** Kiro AI

---

## Executive Summary

The esports tournament platform has been comprehensively audited against the PLAN.md specification. The codebase structure is solid with a well-organized monorepo, complete Prisma schema, working authentication system, and functional Discord bot. However, there are several missing implementations, incomplete features, and potential runtime issues that need to be addressed before the platform can be considered production-ready.

### Severity Breakdown

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 12 | Blocks core functionality, causes runtime crashes, or creates security vulnerabilities |
| **HIGH** | 18 | Missing key features from PLAN.md or causes poor user experience |
| **MEDIUM** | 25 | Missing secondary features, optimization opportunities, or code quality issues |
| **LOW** | 15 | Nice-to-have improvements, minor UX enhancements |

**Total Issues:** 70

---

## CRITICAL Issues (12)

### C001 — Missing Null Check on Prisma findUnique Calls
**Files:** Multiple files across apps and packages
**Issue:** Many `await prisma.*.findUnique()` calls do not check for null results, which will cause runtime crashes when records are not found.

**Affected Files:**
- `packages/payments/src/webhooks.ts` (lines 61-64)
- `packages/permissions/src/withPermission.ts` (line 78)
- `apps/discord-bot/src/commands/match/room.ts` (line 61)
- `apps/discord-bot/src/commands/server/setup.ts` (line 54)
- `apps/worker/src/processors/outbox.ts` (multiple locations)
- `apps/worker/src/processors/scheduler.ts` (multiple locations)
- `apps/web/src/app/api/servers/[guildId]/route.ts` (line 20)

**Fix:** Add null checks immediately after each findUnique call:
```typescript
const record = await prisma.entity.findUnique({ where: { id } })
if (!record) throw new NotFoundError('Entity not found')
```

---

### C002 — Missing DM Notification System
**Files:** None (feature not implemented)
**Issue:** PLAN.md Section 20 specifies a player DM notification system with configurable timing (24h, 30min, 5min before match, check-in reminders). The database schema has `dm_notification_config` in `server_settings`, but no implementation exists in the worker processors.

**Fix:** Implement DM notification handlers in `apps/worker/src/processors/scheduler.ts`:
- Create `handlePlayerDMNotification` function
- Send direct messages to all registered players based on `dm_notification_config`
- Handle user privacy settings (some users block DMs from bots)
- Log failures and retry with fallback to channel mentions

---

### C003 — Missing State Machine Enforcement in Payment Transitions
**Files:** `packages/payments/src/webhooks.ts`
**Issue:** Payment status transitions do not use a state machine guard similar to tournament and match transitions. Invalid transitions could occur without validation.

**Fix:** Create `packages/payments/src/state-machine.ts`:
```typescript
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PAID', 'FAILED', 'EXPIRED'],
  PAID: ['DISPUTED', 'REFUNDED'],
  FAILED: ['REFUNDED'],
  EXPIRED: [],
  DISPUTED: ['REFUNDED'],
  REFUNDED: []
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  const allowed = PAYMENT_TRANSITIONS[from]
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to, allowed)
  }
}
```
Then call in `webhooks.ts` before each status update.

---

### C004 — Missing Error Boundaries in Next.js App
**Files:** `apps/web/src/app/` (multiple layouts)
**Issue:** No React error boundaries exist in the Next.js app. Unhandled component errors will crash the entire page instead of showing a graceful fallback.

**Fix:** Create `apps/web/src/components/ui/ErrorBoundary.tsx` and wrap all route segments:
```tsx
'use client'
import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>
    }
    return this.props.children
  }
}
```
Wrap in `apps/web/src/app/servers/[guildId]/layout.tsx` and admin layout.

---

### C005 — Missing Tournament Delay & Re-Registration Logic
**Files:** None (PLAN.md Section 19 not implemented)
**Issue:** PLAN.md Section 19 specifies:
- Ability to delay tournaments by X days
- Re-open registration after delay (phase: REOPENED)
- Track `registration_phase` and `extension_count`
- Limit extensions to `max_delay_days` from server settings

**Fix:** Implement in `packages/tournament-engine/src/delay.ts`:
```typescript
export async function delayTournament(prisma, tournamentId, delayDays, userId) {
  // Validate against max_delay_days
  // Update tournament dates
  // Set registration_phase to REOPENED
  // Increment extension_count
  // Reschedule all match jobs
  // Create outbox event for Discord announcement
  // Write to audit log
}
```

---

### C006 — Missing Slot System & Force-Fill Logic
**Files:** None (PLAN.md Section 24 not implemented)
**Issue:** PLAN.md Section 24 specifies:
- Numbered slots (1-64) assigned on approval
- Force-fill: admin can manually fill vacant slots
- Display slot numbers in all views
- Slot vacancies visible in admin participant list

**Fix:** Add to `packages/tournament-engine/src/registration.ts`:
```typescript
export async function approveRegistration(prisma, registrationId, approverId) {
  // Find next available slot number
  // Assign to registration.slotNumber
  // Increment tournament.acceptedCount
  // Create outbox event
}

export async function forceFillSlot(prisma, tournamentId, slotNumber, teamId, adminId) {
  // Validate slot is vacant
  // Create approved registration with specific slotNumber
  // Audit log
}
```

---

### C007 — Missing Map Pool Configuration UI
**Files:** Web UI not implemented (PLAN.md Section 25)
**Issue:** Database schema has `mapPool` JSON field, shared-types has schema, but no UI exists to configure map pools per game in the tournament creation wizard.

**Fix:** Add Step 4 in `apps/web/src/app/servers/[guildId]/admin/tournaments/new/page.tsx`:
- Multi-select or tag input for maps
- Pre-filled options per game (BGMI: Erangel, Miramar, etc.)
- Map rotation type selector (FIXED, SEQUENTIAL, CUSTOM)
- Validation: at least 1 map required for BR, at least 3 for series

---

### C008 — Missing Draft Auto-Expiry Logic
**Files:** None (PLAN.md Section 26 not implemented)
**Issue:** PLAN.md Section 26: drafts older than 30 days should auto-archive. No scheduled job or worker processor implements this.

**Fix:** Add to `apps/worker/src/processors/cleanup.ts`:
```typescript
export async function archiveOldDrafts() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await prisma.tournament.updateMany({
    where: {
      status: 'DRAFT',
      createdAt: { lt: thirtyDaysAgo }
    },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date()
    }
  })
}
```
Schedule as a BullMQ repeatable job (daily at 3 AM).

---

### C009 — Missing Admin Panel Brute-Force Protection
**Files:** Partially implemented (PLAN.md Section 27)
**Issue:** Database has `admin_bans` table, but no middleware enforces attempt tracking or temporary bans. Unauthorized users can repeatedly attempt admin access without penalty.

**Fix:** Complete implementation in `packages/permissions/src/brute-force.ts`:
```typescript
export async function trackAdminAccessAttempt(prisma, userId, guildId, wasAllowed: boolean) {
  if (wasAllowed) return // Only track failed attempts
  
  const ban = await prisma.adminBan.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: { attemptCount: { increment: 1 } },
    create: { guildId, userId, attemptCount: 1 }
  })
  
  // 5 failed attempts → ban for 1 hour
  if (ban.attemptCount >= 5 && !ban.bannedUntil) {
    await prisma.adminBan.update({
      where: { id: ban.id },
      data: { bannedUntil: new Date(Date.now() + 60 * 60 * 1000) }
    })
  }
}
```
Call in `withPermission` before role resolution.

---

### C010 — Missing Timezone-First Setup
**Files:** Bot command incomplete (PLAN.md Section 22)
**Issue:** PLAN.md Section 22: first bot interaction should ask for timezone if `timezone_configured = false`. Current `/server setup` does not enforce this.

**Fix:** Modify `apps/discord-bot/src/commands/server/setup.ts`:
- Check `settings.timezone_configured` on command start
- If false, show timezone modal FIRST before any other setup
- Set `timezone_configured = true` after selection
- All subsequent match times display in configured timezone

---

### C011 — Missing Registration Format Templates
**Files:** Frontend UI incomplete (PLAN.md Section 23)
**Issue:** Database has `registration_format` enum with 6 templates. UI should show template selector in tournament creation wizard Step 2, but this is not implemented.

**Fix:** Add to `apps/web/src/app/servers/[guildId]/admin/tournaments/new/page.tsx` Step 2:
```tsx
<Select value={format} onChange={setFormat}>
  <option value="SIMPLE_MENTIONS">Simple Mentions — @player1 @player2 @player3</option>
  <option value="CAPTAIN_BASED">Captain Based — Captain assigns roster later</option>
  <option value="FULL_PLAYER_DETAILS">Full Player Details — IGN + UID required</option>
  <option value="TEAM_WITH_SUBSTITUTE">With Substitute — 4 main + 1 sub</option>
  <option value="CODM_FIVE_PLAYER">COD Mobile 5v5 — 5 main players</option>
  <option value="FULL_WITH_SUBSTITUTE">Full (default) — All details + substitute</option>
</Select>
```
Template selection affects which fields are required in registration form.

---

### C012 — Missing Revised Payment Rules Implementation
**Files:** `packages/payments/src/webhooks.ts` incomplete (PLAN.md Section 29)
**Issue:** PLAN.md Section 29 specifies:
- Refunds ONLY on payment failure or chargeback
- No admin-initiated refunds for successful payments
- Tournament cancellation does NOT trigger refunds by default (controlled by `server_settings.refund_on_cancel`)

Current implementation does not enforce these rules.

**Fix:** Modify `packages/payments/src/webhooks.ts`:
```typescript
// Remove any admin refund endpoints
// On payment.failed webhook → auto-refund via Razorpay
// On payment.dispute webhook → mark order as DISPUTED, await manual review
// On tournament cancel → check refund_on_cancel flag, create orders only if true
```

---

## HIGH Priority Issues (18)

### H001 — Missing Tournament Lifecycle Auto-Archive
**Files:** None (PLAN.md Section 21)
**Issue:** Completed tournaments should auto-archive after 90 days. No worker job implements this.

**Fix:** Add scheduled job in worker:
```typescript
export async function archiveCompletedTournaments() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  await prisma.tournament.updateMany({
    where: {
      status: 'COMPLETED',
      completedAt: { lt: ninetyDaysAgo },
      archivedAt: null
    },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date()
    }
  })
}
```

---

### H002 — Missing Room Credential Release Scheduler
**Files:** `apps/worker/src/processors/scheduler.ts` (incomplete)
**Issue:** PLAN.md specifies room credentials should be delivered at `room_release_at` timestamp. Current scheduler has placeholder but no delivery logic.

**Fix:** Complete `handleRoomCredentialRelease` in scheduler processor with proper DM delivery and fallback logic.

---

### H003 — Missing Result Deadline Enforcement
**Files:** Match state machine incomplete
**Issue:** Matches should auto-transition to a warning state if result_deadline passes without submission. No logic enforces this.

**Fix:** Add scheduled job that checks matches where `result_deadline < now()` and `status = AWAITING_RESULT`, then creates admin alerts.

---

### H004 — Missing Dispute Resolution Workflow
**Files:** No admin UI for dispute management
**Issue:** Database has disputes table, bot has `/match dispute` command, but no admin UI exists to view, assign, and resolve disputes.

**Fix:** Create `apps/web/src/app/servers/[guildId]/admin/disputes/page.tsx` with:
- List of open disputes
- Assignment to referee
- Evidence viewer
- Resolution form (approve original, approve alternate, reject both)

---

### H005 — Missing Winner Record Versioning
**Files:** Database ready, logic incomplete
**Issue:** `winner_records` table has `version` and `is_superseded` fields for corrections, but no API endpoint or UI exists to supersede winners.

**Fix:** Add `/api/servers/[guildId]/tournaments/[id]/winners/correct` endpoint that:
- Marks current winner record as superseded
- Creates new record with incremented version
- Writes detailed audit log
- Creates Discord announcement of correction

---

### H006 — Missing Award Fulfillment Tracking
**Files:** Admin UI incomplete
**Issue:** `awards` table has `fulfillment_status` field, but no UI exists for admins to mark awards as fulfilled.

**Fix:** Add awards management page in admin panel with status toggle and fulfillment notes.

---

### H007 — Missing Waitlist Promotion Logic
**Files:** `packages/tournament-engine/src/registration.ts` incomplete
**Issue:** When a team withdraws or is rejected, next waitlisted team should auto-promote. Not implemented.

**Fix:** Add `promoteFromWaitlist` function that finds oldest waitlisted registration and approves it when a slot becomes available.

---

### H008 — Missing Check-In Reminder Logic
**Files:** Worker scheduler incomplete
**Issue:** PLAN.md specifies check-in reminder 15 minutes before check-in window closes. Not implemented.

**Fix:** Add scheduled job keyed to `check_in_close_at - 15min` that pings team captains who haven't checked in.

---

### H009 — Missing Match Postponement Rescheduling
**Files:** API endpoint incomplete
**Issue:** Admin can mark match as POSTPONED, but no API endpoint exists to reschedule postponed matches.

**Fix:** Add `PATCH /api/servers/[guildId]/matches/[id]/reschedule` endpoint that:
- Validates new datetime
- Cancels old scheduled jobs
- Creates new scheduled jobs
- Updates match status from POSTPONED to SCHEDULED
- Creates Discord announcement

---

### H010 — Missing Score Event Corrections UI
**Files:** Admin UI missing
**Issue:** Database has `score_events.correction_of` field for fixing submitted scores, but no UI exists for admins to create corrections.

**Fix:** Add correction form in result review page that creates new score_event with `type: CORRECTION` and references original event ID.

---

### H011 — Missing Overlay OBS Integration
**Files:** `/overlay/[guildId]/[tournamentId]` route incomplete
**Issue:** PLAN.md Section 8 specifies OBS browser source overlay with live standings. Route exists but returns minimal content.

**Fix:** Complete overlay page with:
- Real-time standings via Supabase Realtime
- Auto-refresh on score updates
- Transparent background
- Customizable colors from server settings
- Token-based authentication

---

### H012 — Missing Analytics Export
**Files:** CSV export endpoint incomplete
**Issue:** PLAN.md Section 12 specifies CSV export for tournaments, registrations, results, audit logs. Endpoint exists but returns placeholder.

**Fix:** Complete `GET /api/servers/[guildId]/analytics/export` with proper CSV generation for each entity type.

---

### H013 — Missing Three.js Hero Scene
**Files:** `apps/web/src/components/three/HeroScene.tsx` missing
**Issue:** PLAN.md Section 7 specifies a 3D Three.js hero scene on landing page. Component does not exist.

**Fix:** Create HeroScene component with:
- Rotating icosahedron with wireframe
- Particle field (500 instances)
- Violet and cyan point lights
- Bloom post-processing
- Lazy-loaded with next/dynamic
- Hidden when prefers-reduced-motion

---

### H014 — Missing Game Engine Implementations
**Files:** `packages/game-rules/src/` incomplete
**Issue:** PLAN.md Section 10 specifies separate scoring modules for:
- BGMI Battle Royale
- Free Fire Battle Royale
- Free Fire Clash Squad
- COD Mobile Multiplayer
- COD Mobile Battle Royale

Only stub files exist with no actual scoring logic.

**Fix:** Implement each game module as pure functions following the GameRuleModule interface:
```typescript
interface GameRuleModule {
  defaultScoringConfig(): ScoringConfig
  validateScoringConfig(config: unknown): ScoringConfig
  calculateMatchScore(params: MatchScoreParams): number
  calculateStandings(matches: ApprovedMatch[], rules: ScoringConfig): TeamStanding[]
  applyTiebreakers(tied: TeamStanding[], rules: ScoringConfig): TeamStanding[]
}
```

---

### H015 — Missing Scoring Package Tiebreaker Logic
**Files:** `packages/scoring/src/tiebreakers.ts` incomplete
**Issue:** Tiebreakers are critical for final placements but not fully implemented.

**Fix:** Implement tie-breaker chain:
1. Total Points
2. Total Kills
3. Best Single-Match Placement
4. Most Match Wins
5. Head-to-head (if applicable)

---

### H016 — Missing Notification Package Templates
**Files:** `packages/notifications/src/templates/` incomplete
**Issue:** PLAN.md specifies reusable Discord embed templates for all event types. Only basic embeds exist.

**Fix:** Create template for each outbox event type with proper branding, emojis, and action buttons.

---

### H017 — Missing Docs Page
**Files:** `/docs` route incomplete (PLAN.md Section 28)
**Issue:** PLAN.md Section 28 specifies a documentation page with:
- Getting Started guide
- Tournament creation walkthrough
- Bot commands reference
- API documentation
- FAQ

Route exists but content is placeholder.

**Fix:** Write comprehensive documentation covering all features, commands, and workflows.

---

### H018 — Missing Multi-Tournament Bracket System
**Files:** Bracket UI incomplete (user request)
**Issue:** User explicitly requested "advance brackets system for multiple tournaments and tournament matches" for better UI/UX. Current bracket command shows ASCII art for small tournaments but lacks interactive multi-tournament bracket view.

**Fix:** Create `apps/web/src/app/servers/[guildId]/tournaments/[id]/bracket/page.tsx` with:
- Interactive bracket visualization using React Flow or similar
- Support for single elimination, double elimination, round-robin, Swiss
- Mobile-responsive design
- Real-time updates via Supabase Realtime
- Link from Discord bot's bracket button

---

## MEDIUM Priority Issues (25)

### M001 — Missing Comprehensive Test Coverage
**Files:** `tests/` directory mostly empty
**Issue:** PLAN.md specifies unit tests, integration tests, and e2e tests. Minimal tests exist.

**Fix:** Add test coverage for:
- State machine transitions (unit)
- Permission resolution (unit)
- Tournament lifecycle (integration)
- Registration flow (integration)
- Payment webhooks (integration)
- Critical user paths (e2e with Playwright)

Target: 70%+ coverage on packages, 50%+ on apps.

---

### M002 — Missing Sentry Integration
**Files:** Error tracking not configured
**Issue:** `.env.example` has SENTRY_DSN variables but no Sentry SDK initialization exists in any app.

**Fix:** Add Sentry SDK to:
- `apps/web/src/instrumentation.ts` (Next.js)
- `apps/discord-bot/src/index.ts`
- `apps/worker/src/index.ts`

Configure with environment-specific DSNs.

---

### M003 — Missing Database Indexes for Performance
**Files:** `packages/database/prisma/schema.prisma`
**Issue:** Schema has some indexes but missing several recommended by PLAN.md audit checklist.

**Recommended Indexes:**
```prisma
@@index([guildId, createdAt]) on audit_logs
@@index([tournamentId, status]) on registrations
@@index([matchId, status]) on result_submissions
@@index([guildId, timestamp]) on system_metrics
@@index([source, timestamp]) on error_logs
```

---

### M004 — Missing Rate Limiting on API Routes
**Files:** No rate limiter middleware
**Issue:** Sensitive endpoints (registration, order creation, result submission) have no rate limiting. Vulnerable to spam.

**Fix:** Add Upstash Rate Limit middleware:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

export async function ratelimitMiddleware(req) {
  const identifier = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await ratelimit.limit(identifier)
  if (!success) {
    return new Response('Too many requests', { status: 429 })
  }
}
```

Apply to registration, order, and result submission routes.

---

### M005 — Missing Input Validation on API Routes
**Files:** Multiple API routes
**Issue:** Some routes use Zod schemas, others have manual validation or none at all. Inconsistent.

**Fix:** Ensure every POST/PATCH/PUT route validates request body with Zod schema before processing.

---

### M006 — Missing CORS Configuration
**Files:** Next.js API routes
**Issue:** No explicit CORS headers. May block legitimate cross-origin requests (e.g., from OBS overlay).

**Fix:** Add CORS middleware in `apps/web/src/middleware.ts` for `/api/*` routes:
```typescript
if (req.nextUrl.pathname.startsWith('/api/')) {
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
}
```

---

### M007 — Missing Webhook Signature Verification Test
**Files:** `packages/payments/src/webhooks.ts`
**Issue:** Razorpay webhook signature verification exists but has no unit test to confirm HMAC logic is correct.

**Fix:** Add unit test with known signature from Razorpay docs.

---

### M008 — Missing Tournament Search Functionality
**Files:** Web UI incomplete
**Issue:** Tournament catalogue page has placeholder search input but no backend search implementation.

**Fix:** Add full-text search on tournament name and description using Prisma `contains` or PostgreSQL `to_tsvector`.

---

### M009 — Missing Player Profile Pages
**Files:** `/servers/[guildId]/players` route incomplete
**Issue:** PLAN.md Section 8 specifies player profile pages showing:
- Game profiles (IGN, UID per game)
- Teams joined
- Tournament history
- Win rate
- Total kills/points

Route exists but returns placeholder.

**Fix:** Implement player detail page with aggregated stats.

---

### M010 — Missing Team Directory
**Files:** `/servers/[guildId]/teams` route incomplete
**Issue:** PLAN.md specifies team directory showing all teams in a server with roster, captain, and tournament history. Route exists but incomplete.

**Fix:** Implement team list and detail pages.

---

### M011 — Missing Leaderboards Page
**Files:** `/servers/[guildId]/leaderboards` route incomplete
**Issue:** PLAN.md specifies leaderboards showing:
- Top teams by tournament wins
- Top players by kills
- Top players by MVP awards
- Per-game leaderboards

Route exists but incomplete.

**Fix:** Implement leaderboard queries and UI.

---

### M012 — Missing Winners Gallery
**Files:** `/servers/[guildId]/winners` route incomplete
**Issue:** PLAN.md specifies winners gallery showing champion teams from all completed tournaments with photos, roster, and awards.

Route exists but incomplete.

**Fix:** Implement winners gallery with filtering by game and time period.

---

### M013 — Missing Admin Dashboard KPI Real-Time Updates
**Files:** Dashboard page static
**Issue:** Admin dashboard KPIs load on page load but don't update in real-time as events occur.

**Fix:** Add Supabase Realtime subscriptions to relevant tables and update KPI cards on insert/update.

---

### M014 — Missing Match Schedule Countdown Timers
**Files:** Match list UI incomplete
**Issue:** Match schedules should show live countdown timers (e.g., "Starts in 2h 35m") instead of static timestamps.

**Fix:** Add React hook that updates countdown every second for matches starting within 24 hours.

---

### M015 — Missing Registration Capacity Animation
**Files:** Tournament detail page
**Issue:** PLAN.md specifies animated fill bar showing registration progress. Currently static.

**Fix:** Add Framer Motion animated width transition on capacity bar.

---

### M016 — Missing Discord Message Update Logic
**Files:** Outbox processor incomplete
**Issue:** When tournament/match state changes, existing Discord messages should be edited, not just new ones posted. Current logic always creates new messages.

**Fix:** Modify outbox handlers to:
1. Check `discord_message_bindings` for existing message
2. If found, edit message
3. If not found or edit fails, post new message
4. Update binding record

---

### M017 — Missing Persistent Control Panel Update
**Files:** `apps/discord-bot/src/services/control-panel.ts` incomplete
**Issue:** PLAN.md Section 7 specifies persistent control panel in admin channel with live counts. Current implementation is stub.

**Fix:** Complete control panel with:
- Buttons: Live Events, Pending Results, Open Disputes, Upcoming Matches, Integration Health
- Auto-update on relevant database changes via outbox events

---

### M018 — Missing Bot Personality Templates
**Files:** `apps/discord-bot/src/utils/responses.ts` minimal
**Issue:** PLAN.md Section 17 specifies warm, esports-native personality with custom emojis on every response. Current responses are generic.

**Fix:** Expand response templates with:
- Greeting variations
- Success messages with emojis
- Error messages with helpful suggestions
- Encouragement messages

---

### M019 — Missing Accessibility (ARIA) Labels
**Files:** Multiple React components
**Issue:** Many interactive elements lack aria-label, aria-labelledby, or role attributes.

**Fix:** Audit all buttons, form inputs, and interactive divs for ARIA compliance. Add labels for screen readers.

---

### M020 — Missing Dark Mode Support
**Files:** CSS variables defined but not switchable
**Issue:** Design system has dark color tokens but no theme switcher exists.

**Fix:** Add theme toggle in user menu that sets `data-theme` attribute on `<html>` and stores preference in localStorage.

---

### M021 — Missing Mobile Navigation
**Files:** Web UI responsive but navigation incomplete
**Issue:** Admin panel sidebar collapses at 1024px but no mobile-friendly bottom navigation is implemented as specified in PLAN.md.

**Fix:** Add bottom nav component that shows on mobile with icons for Overview, Tournaments, Matches, Results, Settings.

---

### M022 — Missing ISR Revalidation Tags
**Files:** Public pages use time-based ISR
**Issue:** PLAN.md specifies ISR with 60s revalidation, but Next.js on-demand revalidation by tag would be more efficient.

**Fix:** Add revalidation tags to public pages:
```typescript
export const revalidate = 60
export const tags = [`tournament:${tournamentId}`]
```
Then call `revalidateTag` on tournament updates.

---

### M023 — Missing OG Image Generation
**Files:** `/api/og` route incomplete
**Issue:** PLAN.md Section 8 specifies dynamic OG images via `@vercel/og`. Route exists but returns placeholder.

**Fix:** Implement dynamic OG image generation for tournaments showing:
- Tournament name
- Game badge
- Status
- Team count
- Dates

---

### M024 — Missing Webhook Retry Logic
**Files:** Payment webhook has retry but no admin notification
**Issue:** After 5 failed webhook deliveries, outbox event is marked FAILED but admin is not notified through a user-facing channel.

**Fix:** When outbox event fails, post alert to configured admin channel (not just create outbox event for alert, which could also fail).

---

### M025 — Missing Environment Variable Validation
**Files:** No startup validation
**Issue:** Apps will crash at runtime if critical env vars are missing. No validation on startup.

**Fix:** Add env validation in each app's `index.ts`:
```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DISCORD_BOT_TOKEN: z.string().min(1),
  // ... all required vars
})

envSchema.parse(process.env)
```

---

## LOW Priority Issues (15)

### L001 — Missing Code Comments
**Files:** Multiple
**Issue:** Complex logic (state machines, scoring calculations, payment webhooks) lacks explanatory comments.

**Fix:** Add JSDoc comments to all exported functions explaining purpose, parameters, and edge cases.

---

### L002 — Missing API Response Types
**Files:** API routes return generic NextResponse
**Issue:** No shared response types, making it harder for frontend to consume APIs type-safely.

**Fix:** Create `packages/shared-types/src/api-responses.ts` with Zod schemas for all API responses.

---

### L003 — Missing Loading Skeletons
**Files:** React components show "Loading..." text
**Issue:** PLAN.md specifies shimmer loading skeletons matching card layouts. Most components show generic text.

**Fix:** Replace loading text with proper skeleton components from `components/ui/Skeleton.tsx`.

---

### L004 — Missing Animation Variants
**Files:** Only basic fade animations exist
**Issue:** PLAN.md Section 7 specifies `fadeUp`, `staggerChildren`, `slideInLeft`, `scaleIn`, `glowPulse` variants. Not all are implemented.

**Fix:** Complete `lib/motion.ts` with all specified variants.

---

### L005 — Missing Toast Notifications
**Files:** No toast system
**Issue:** User actions (save, delete, approve) have no visual feedback other than page reload.

**Fix:** Add toast notification system using Sonner or similar:
```typescript
import { toast } from 'sonner'
toast.success('Registration approved')
```

---

### L006 — Missing Confirmation Dialogs
**Files:** Destructive actions have no confirmation
**Issue:** Actions like cancel tournament, reject registration, delete team have no "Are you sure?" prompt.

**Fix:** Add confirmation dialog component and wrap destructive actions.

---

### L007 — Missing Breadcrumbs
**Files:** Admin panel pages
**Issue:** Deep navigation paths (e.g., `/servers/[guildId]/admin/tournaments/[id]/edit`) have no breadcrumbs.

**Fix:** Add breadcrumb component in admin layout showing navigation path.

---

### L008 — Missing Pagination on Large Lists
**Files:** Tournament list, registration list, audit log
**Issue:** Lists load all records at once, which will cause performance issues with 100+ items.

**Fix:** Add cursor-based pagination using Prisma `cursor` and `take`:
```typescript
const results = await prisma.tournament.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastId },
})
```

---

### L009 — Missing Search Debounce
**Files:** Tournament catalogue search
**Issue:** Search input triggers query on every keystroke without debounce.

**Fix:** Add 300ms debounce using `useDebouncedValue` hook.

---

### L010 — Missing Copy-to-Clipboard Buttons
**Files:** Room credentials, tournament links
**Issue:** Users must manually select and copy. No copy button provided.

**Fix:** Add copy button with clipboard API and toast confirmation.

---

### L011 — Missing Keyboard Shortcuts
**Files:** No keyboard navigation
**Issue:** Power users cannot navigate admin panel with keyboard shortcuts.

**Fix:** Add keyboard shortcuts for common actions:
- `Ctrl+K`: Open command palette
- `N`: New tournament
- `E`: Edit selected item
- `Delete`: Delete selected item

---

### L012 — Missing Audit Log Filtering
**Files:** Audit log page shows all events
**Issue:** No filters by action type, date range, or actor.

**Fix:** Add filter UI with dropdowns and date picker.

---

### L013 — Missing User Preferences
**Files:** No user settings page
**Issue:** Users cannot customize notifications, timezone display, or date format.

**Fix:** Add user settings page at `/settings` with preferences stored in `user_preferences` table.

---

### L014 — Missing Admin Onboarding
**Files:** No first-time setup wizard
**Issue:** New server admins land on empty dashboard with no guidance.

**Fix:** Add onboarding checklist overlay:
1. Run `/server setup` in Discord
2. Create your first tournament
3. Invite players
4. Configure notifications

---

### L015 — Missing Bot Status Badge in UI
**Files:** Server selector shows static badge
**Issue:** Bot online/offline status is not updated in real-time on the web UI.

**Fix:** Add WebSocket or polling to check bot presence via `/api/health` and update badge color.

---

## Verification Plan

After fixing issues, verify with:

1. **Build Verification:**
   ```bash
   cd esports-platform
   pnpm install
   pnpm type-check  # Should pass with 0 errors
   pnpm lint        # Should pass with 0 warnings
   pnpm build       # All apps and packages should build successfully
   ```

2. **Database Verification:**
   ```bash
   cd packages/database
   pnpm prisma validate  # Should pass
   pnpm prisma generate  # Should generate client with no errors
   pnpm db:migrate       # Should apply migrations successfully
   ```

3. **Runtime Verification:**
   - Start all services: web, discord-bot, worker
   - Test critical paths:
     - User login → Server selection → Tournament creation → Registration → Match scheduling → Result submission → Winner announcement
   - Verify no runtime crashes on null values
   - Verify state machine transitions are enforced
   - Verify Discord messages are posted correctly
   - Verify payment webhooks are processed (in test mode)

4. **Integration Verification:**
   - Create tournament in web UI → Verify Discord announcement
   - Create tournament in Discord → Verify web UI update
   - Submit match result in Discord → Verify web UI standings update
   - Approve registration on web → Verify Discord DM sent

5. **User Acceptance:**
   - All features from PLAN.md sections 19-29 are implemented
   - Multi-tournament bracket system is functional
   - Developer dashboard shows bridge health, bot analytics, error logs
   - No console errors in production build
   - Lighthouse score ≥ 90 on landing page

---

## Recommendations

### Immediate Actions (Before Production Launch)

1. **Fix all CRITICAL issues** — These will cause runtime crashes or security vulnerabilities
2. **Implement missing state machine enforcement** — Prevents invalid state transitions
3. **Add null checks on all Prisma queries** — Prevents undefined access errors
4. **Complete error boundaries** — Graceful error handling in React
5. **Finish DM notification system** — Core user experience feature

### Short-Term (Next Sprint)

1. **Complete all HIGH priority features** — These are user-facing features from PLAN.md
2. **Add comprehensive test coverage** — Unit + integration tests
3. **Implement rate limiting** — Protect against abuse
4. **Complete game engine implementations** — Required for accurate scoring

### Medium-Term (Next Month)

1. **Address MEDIUM priority issues** — UX improvements and optimizations
2. **Complete documentation** — User guides and API docs
3. **Add monitoring and alerting** — Sentry integration, error tracking
4. **Performance optimization** — Database indexes, caching, CDN

### Long-Term (Ongoing)

1. **Address LOW priority issues** — Nice-to-have improvements
2. **User feedback loop** — Gather feedback and iterate
3. **Feature expansion** — New games, tournament formats, integrations

---

## Conclusion

The esports tournament platform has a solid foundation with well-structured code, comprehensive database schema, and functional core features. However, several critical gaps exist that must be addressed before production launch:

- **12 CRITICAL issues** block core functionality or create security risks
- **18 HIGH issues** represent missing features explicitly specified in PLAN.md
- **25 MEDIUM issues** affect user experience and code quality
- **15 LOW issues** are nice-to-have improvements

**Priority:** Fix all CRITICAL and HIGH issues before considering this platform production-ready. The current state is "feature-incomplete" rather than "buggy" — the code that exists is generally well-written, but significant portions of the specification are not yet implemented.

**Estimated Effort:**
- CRITICAL fixes: 3-4 days
- HIGH priority features: 7-10 days
- MEDIUM improvements: 5-7 days
- LOW enhancements: 3-5 days

**Total estimated effort:** 18-26 days for a solo developer to reach production-ready state.

---

**Audit completed by Kiro AI on 2025-01-27**
