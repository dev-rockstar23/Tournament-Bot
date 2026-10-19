# 🏆 LEGENDARY ESPORTS — Complete Tournament Platform
## Production Implementation Plan & Task Book

> **Status:** Ready for implementation
> **Type:** Greenfield — full platform
> **Developer:** Solo
> **Last updated:** 2026

---

## 📋 Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Core Architecture](#2-core-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Database Schema](#5-database-schema)
6. [API Specification](#6-api-specification)
7. [Discord Bot Specification](#7-discord-bot-specification)
8. [Website Specification](#8-website-specification)
9. [Synchronization System](#9-synchronization-system)
10. [Game Engines](#10-game-engines)
11. [Payment Module](#11-payment-module)
12. [Analytics System](#12-analytics-system)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Security Model](#14-security-model)
15. [Phase Task Breakdown](#15-phase-task-breakdown)
16. [Acceptance Criteria](#16-acceptance-criteria)
17. [Bot Personality & UX Guidelines](#17-bot-personality--ux-guidelines)
18. [Website Visual Specification](#18-website-visual-specification)
19. [Tournament Delay & Re-Registration](#19-tournament-delay--re-registration)
20. [Player DM Notification System](#20-player-dm-notification-system)
21. [Tournament Lifecycle & Auto-Archive](#21-tournament-lifecycle--auto-archive)
22. [Timezone-First Setup](#22-timezone-first-setup)
23. [Registration Format Templates](#23-registration-format-templates)
24. [Slot System & Force-Fill](#24-slot-system--force-fill)
25. [Map Pools by Game](#25-map-pools-by-game)
26. [Draft Auto-Expiry (30-Day Rule)](#26-draft-auto-expiry-30-day-rule)
27. [Admin Panel Brute-Force Protection](#27-admin-panel-brute-force-protection)
28. [Docs Page](#28-docs-page)
29. [Revised Payment Rules](#29-revised-payment-rules)

---

## 1. Platform Overview

### Core Principle
**One server. One source of truth. Two control interfaces.**

Discord servers are the foundation — not an afterthought. Each Discord server is a **tenant**. The website and Discord bot are two equal interfaces to the same tournament engine. A change made on the website or in Discord updates the same backend and the other interface receives the update through an event-driven synchronization system.

### What Gets Built
- A **multi-server esports website** — server selection first, then Viewer/Player Panel and permission-aware Admin Control Center
- One **powerful tournament engine** — shared by BGMI, Free Fire, and COD Mobile with configurable formats, registration, rosters, match timing, scoring, standings, disputes, and winners
- A **fully integrated Discord bot** — tournament creation, editing, registration, match control, result verification, notifications, server settings, and recovery — all using the same source of truth as the website

### Multi-Tenancy Rule
A moderator in Server A must **never** get administrative access to Server B. Every database record belonging to a server carries that server's `guild_id`. This is enforced at the database level with foreign keys and at the API level with mandatory scope checks on every request.

---

## 2. Core Architecture

```
+------------------------------------------------------------------+
|                        CLIENT INTERFACES                          |
|                                                                   |
|   +---------------------------+   +---------------------------+   |
|   |     Next.js Website       |   |      Discord Bot          |   |
|   |  (Deployed on Vercel)     |   |  (Deployed on Render)     |   |
|   |                           |   |  Sapphire + discord.js    |   |
|   |  +--------+ +---------+   |   |                           |   |
|   |  | Viewer | |  Admin  |   |   |  Slash Commands           |   |
|   |  | Panel  | |  Panel  |   |   |  Buttons and Modals       |   |
|   |  +--------+ +---------+   |   |  Embeds and Components    |   |
|   +---------------------------+   +---------------------------+   |
+------------------+-------------------------------+----------------+
                   |                               |
                   v                               v
+------------------------------------------------------------------+
|              SHARED BACKEND API (Next.js API Routes)              |
|                                                                   |
|   Auth and Sessions  |  Permissions    |  Input Validation        |
|   Tournament Engine  |  Game Rules     |  Scoring Engine          |
|   Registration       |  Match Scheduler|  Audit Logging           |
+----------------------------+-------------------------------------+
                             |
           +-----------------+-----------------+
           v                 v                 v
  +---------------+  +---------------+  +------------------+
  |   Supabase    |  |   BullMQ +    |  |   Supabase       |
  |  PostgreSQL   |  | Upstash Redis |  |   Realtime       |
  |   (Prisma)    |  |   Worker      |  |   Broadcast      |
  |               |  | (on Render)   |  |                  |
  +---------------+  +---------------+  +------------------+
```

### Data Flow for Every Action
1. Action arrives (website form or Discord interaction)
2. Auth middleware validates session
3. Permissions layer verifies guild membership + application role
4. Tenant scope is asserted (`guild_id` locked to the request)
5. Business logic executes in the shared engine package
6. Database transaction commits state change + outbox event atomically
7. Worker picks up outbox event, delivers to Discord
8. Supabase Realtime broadcasts to website subscribers
9. Outcome written to audit log

---

## 3. Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Monorepo | pnpm workspaces | Best disk efficiency, native workspace protocol |
| Web framework | Next.js 14 App Router + TypeScript | Server components, API routes, middleware auth, ISR |
| Styling | Tailwind CSS | Design token system, responsive utilities |
| Animation | Framer Motion | Layout animations, entry transitions, gestures |
| 3D rendering | React Three Fiber + Drei + Three.js | Declarative WebGL, tree-shaken, selective loading |
| Database | Supabase PostgreSQL (free tier) | Managed Postgres, free tier, built-in auth |
| ORM | Prisma | Type-safe queries, migrations, transactions |
| Auth | Supabase Auth + Discord OAuth2 | Sessions, Discord provider, guilds scope |
| Bot framework | Sapphire Framework on discord.js | Preconditions, plugin system, structured command handling |
| Job queue | BullMQ + Upstash Redis (free tier) | Durable queues, scheduled jobs, idempotent keys, retries |
| Realtime | Supabase Realtime Broadcast | Authorized channels, live updates, free tier |
| File storage | Supabase Storage | Evidence uploads, banner images, free tier |
| Deployment web | Vercel (free tier) | Optimal for Next.js, edge middleware |
| Deployment bot+worker | Render Background Worker | Persistent process, no spin-down, free tier |
| Error tracking | Sentry | All three apps instrumented |
| Form validation | React Hook Form + Zod | Schema-first, shared types across packages |
| Charts | Recharts | Lightweight, tree-shaken, composable |

### Free Tier Limits to Monitor
- **Supabase:** 500MB database, 1GB storage, 2GB bandwidth, 50k Realtime messages/month
- **Upstash Redis:** 10k commands/day on free tier — use efficiently
- **Vercel:** 100GB bandwidth, unlimited deployments
- **Render:** 750 hours/month for background workers (enough for one always-on service)

---

## 4. Monorepo Structure

```
esports-platform/
├── apps/
│   ├── web/                          # Next.js 14 — public site + viewer + admin
│   │   ├── app/
│   │   │   ├── (public)/             # Landing, server selector
│   │   │   ├── servers/
│   │   │   │   └── [guildId]/
│   │   │   │       ├── page.tsx      # Server homepage
│   │   │   │       ├── tournaments/  # Catalogue + detail pages
│   │   │   │       ├── teams/        # Teams directory
│   │   │   │       ├── players/      # Player profiles
│   │   │   │       ├── leaderboards/ # Rankings
│   │   │   │       ├── winners/      # Champions
│   │   │   │       ├── dashboard/    # Admin overview
│   │   │   │       └── admin/        # Full admin panel
│   │   │   └── overlay/              # OBS browser source routes
│   │   ├── components/
│   │   │   ├── ui/                   # Design system primitives
│   │   │   ├── three/                # R3F scenes
│   │   │   ├── tournament/           # Tournament-specific components
│   │   │   ├── analytics/            # Chart components
│   │   │   └── admin/                # Admin panel components
│   │   └── lib/
│   │       ├── supabase.ts
│   │       ├── realtime.ts
│   │       └── hooks/
│   │
│   ├── discord-bot/                  # Sapphire bot
│   │   ├── src/
│   │   │   ├── index.ts              # SapphireClient setup
│   │   │   ├── commands/
│   │   │   │   ├── server/           # /server setup, status
│   │   │   │   ├── tournament/       # /tournament *
│   │   │   │   ├── match/            # /match *
│   │   │   │   ├── register/         # /register
│   │   │   │   ├── winners/          # /winners
│   │   │   │   └── analytics/        # /analytics
│   │   │   ├── listeners/
│   │   │   │   ├── guild-create.ts
│   │   │   │   └── guild-delete.ts
│   │   │   ├── preconditions/
│   │   │   │   ├── GuildOnly.ts
│   │   │   │   └── HasPermission.ts
│   │   │   ├── services/
│   │   │   │   ├── control-panel.ts
│   │   │   │   └── embed-builder.ts
│   │   │   └── utils/
│   │   │       ├── emojis.ts         # All custom emoji IDs
│   │   │       └── responses.ts      # Personality response templates
│   │   └── package.json
│   │
│   └── worker/                       # BullMQ worker process
│       ├── src/
│       │   ├── index.ts              # Worker startup
│       │   ├── processors/
│       │   │   ├── outbox.ts         # Outbox event processor
│       │   │   ├── notifications.ts  # Scheduled reminders
│       │   │   ├── scheduler.ts      # Match lifecycle jobs
│       │   │   └── payments.ts       # Payment expiry jobs
│       │   └── queues/
│       │       └── definitions.ts    # Queue and job type definitions
│       └── package.json
│
├── packages/
│   ├── database/                     # Prisma schema + repositories
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── repositories/         # One file per entity
│   │   │   ├── analytics.ts
│   │   │   └── test-utils.ts
│   │   └── package.json
│   │
│   ├── permissions/                  # Auth + authorization
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── guild-membership.ts
│   │   │   ├── role-resolver.ts
│   │   │   └── withPermission.ts
│   │   └── package.json
│   │
│   ├── tournament-engine/            # Shared lifecycle logic
│   │   ├── src/
│   │   │   ├── create.ts
│   │   │   ├── publish.ts
│   │   │   ├── cancel.ts
│   │   │   ├── finalize.ts
│   │   │   ├── scheduler.ts          # Multi-match generation
│   │   │   └── state-machine.ts
│   │   └── package.json
│   │
│   ├── game-rules/                   # Per-game configuration
│   │   ├── src/
│   │   │   ├── bgmi.ts
│   │   │   ├── free-fire.ts
│   │   │   └── codm.ts
│   │   └── package.json
│   │
│   ├── scoring/                      # Points + standings + tie-breakers
│   │   ├── src/
│   │   │   ├── battle-royale.ts
│   │   │   ├── series.ts
│   │   │   ├── standings.ts
│   │   │   └── tiebreakers.ts
│   │   └── package.json
│   │
│   ├── payments/                     # Feature-flagged payment module
│   │   ├── src/
│   │   │   ├── index.ts              # Feature flag gate
│   │   │   ├── orders.ts
│   │   │   ├── state-machine.ts
│   │   │   ├── webhooks.ts
│   │   │   └── refunds.ts
│   │   └── package.json
│   │
│   ├── notifications/                # Embed + notification templates
│   │   ├── src/
│   │   │   ├── discord-embeds.ts
│   │   │   ├── web-payloads.ts
│   │   │   └── templates/
│   │   └── package.json
│   │
│   └── shared-types/                 # Zod schemas + DTOs
│       ├── src/
│       │   ├── tournament.ts
│       │   ├── match.ts
│       │   ├── registration.ts
│       │   ├── scoring.ts
│       │   └── payment.ts
│       └── package.json
│
├── infrastructure/
│   ├── deployment/
│   │   ├── vercel.json
│   │   └── render.yaml
│   └── monitoring/
│       └── health-check.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│       └── playwright.config.ts
│
├── docs/
│   ├── architecture.md
│   ├── api-specification.md
│   ├── database-schema.md
│   └── operations-runbook.md
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
├── .env.example
└── PLAN.md                           # This file
```

---

## 5. Database Schema

### Full Entity List

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `discord_servers` | Server identity and bot installation | `guild_id`, `name`, `icon`, `installed_at`, `is_active` |
| `server_settings` | Per-server config | `guild_id`, `timezone`, `accent_color`, `logo_url`, channel mappings |
| `server_role_bindings` | Discord role to app role mapping | `guild_id`, `discord_role_id`, `app_role` — note: server owner bypasses this table entirely, always resolves to `SERVER_ADMIN` |
| `users` | Discord-linked accounts | `discord_id`, `username`, `avatar`, `created_at` |
| `game_profiles` | Per-game player identity | `user_id`, `game`, `ign`, `uid`, `is_verified` |
| `teams` | Team records | `guild_id`, `name`, `tag`, `captain_id`, `created_at` |
| `team_members` | Roster entries | `team_id`, `user_id`, `role`, `joined_at` |
| `tournaments` | Tournament config | `guild_id`, `name`, `game`, `mode`, `status`, `entry_type`, `entry_price`, `start_at`, `end_at` |
| `tournament_rule_versions` | Config snapshots | `tournament_id`, `version`, `rules_json`, `created_at` |
| `stages` | Tournament stages | `tournament_id`, `name`, `type`, `order`, `status` |
| `matches` | Individual matches | `stage_id`, `guild_id`, `number`, `status`, `scheduled_start`, `scheduled_end`, `map`, `mode` |
| `match_segments` | Rounds/maps in a series | `match_id`, `segment_number`, `map`, `mode`, `status` |
| `match_participants` | Teams in a match | `match_id`, `team_id`, `seeding` |
| `registrations` | Tournament entries | `tournament_id`, `guild_id`, `team_id`, `status`, `payment_status` |
| `registration_members` | Roster at registration | `registration_id`, `user_id`, `game_profile_id`, `status` |
| `room_credentials` | Private match access | `match_id`, `room_id`, `password`, `release_at`, `expires_at` |
| `result_submissions` | Submitted scorecards | `match_id`, `submitted_by`, `scorecard_json`, `evidence_url`, `status` |
| `score_events` | Point records | `match_id`, `team_id`, `type`, `points`, `kills`, `placement`, `correction_of` |
| `disputes` | Contested results | `match_id`, `raised_by`, `reason`, `status`, `resolved_by` |
| `winner_records` | Final placements | `tournament_id`, `team_id`, `placement`, `award_type` |
| `awards` | Event awards | `tournament_id`, `user_id`, `type`, `label`, `fulfillment_status` |
| `orders` | Payment orders | `registration_id`, `amount`, `currency`, `status`, `expires_at`, `provider_ref` |
| `payment_events` | Provider webhooks | `order_id`, `provider_event_id`, `type`, `payload_json`, `processed_at` |
| `refunds` | Refund records | `order_id`, `amount`, `status`, `authorized_by`, `provider_ref` |
| `discord_message_bindings` | Tournament to Discord message | `guild_id`, `channel_id`, `message_id`, `record_type`, `record_id`, `last_synced_at` |
| `outbox_events` | Pending Discord operations | `type`, `payload_json`, `status`, `retry_count`, `last_attempted_at` |
| `scheduled_jobs` | Timed actions | `job_key`, `type`, `payload_json`, `scheduled_for`, `status` |
| `audit_logs` | All admin actions | `guild_id`, `actor_id`, `action`, `target_type`, `target_id`, `reason`, `created_at` |

### Match State Machine
```
SCHEDULED -> CHECK_IN -> READY -> LIVE -> AWAITING_RESULT -> UNDER_REVIEW -> COMPLETED
                                       -> POSTPONED
                                       -> CANCELLED
                                       -> FORFEIT
                          UNDER_REVIEW -> DISPUTED -> COMPLETED (after resolution)
```

### Tournament State Machine
```
DRAFT -> REGISTRATION_OPEN -> REGISTRATION_CLOSED -> CHECK_IN -> LIVE -> COMPLETED
      -> CANCELLED (from any state except COMPLETED)
COMPLETED -> ARCHIVED
```

### Non-Negotiable Database Rules
1. Every server-owned table has `guild_id` as a non-nullable foreign key to `discord_servers`
2. Database constraints prevent cross-server record linking
3. Monetary amounts stored as `Decimal` (integer minor units) — never `Float`
4. All timestamps stored in UTC
5. Unique index on `payment_events.provider_event_id` for idempotency
6. Unique index on `scheduled_jobs.job_key` for deduplication
7. Unique composite index on `matches (stage_id, number)` for match numbering
8. Soft deletes only — no hard deletes on tournament, registration, or result records

---

## 6. API Specification

All routes under `/api/servers/:guildId/*` enforce:
1. Authentication check (valid Supabase session)
2. Guild membership verification (Discord API + cache)
3. Application role resolution
4. Permission assertion for the specific action
5. `guild_id` scope locked to `:guildId` parameter for all queries

### Auth Routes
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/me` | Current user identity |
| GET | `/api/auth/callback` | Discord OAuth2 callback |
| POST | `/api/auth/logout` | Clear session |

### Server Routes
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| GET | `/api/servers` | authenticated | List accessible servers |
| GET | `/api/servers/:guildId` | VIEWER+ | Server summary |
| GET | `/api/servers/:guildId/dashboard` | REFEREE+ | Admin dashboard KPIs |
| GET | `/api/servers/:guildId/sync-status` | TOURNAMENT_MANAGER+ | Outbox health |
| PATCH | `/api/servers/:guildId/settings` | SERVER_ADMIN | Update server settings |

### Tournament Routes
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| GET | `/api/servers/:guildId/tournaments` | VIEWER | List tournaments |
| POST | `/api/servers/:guildId/tournaments` | TOURNAMENT_MANAGER | Create tournament |
| GET | `/api/servers/:guildId/tournaments/:id` | VIEWER | Tournament detail |
| PATCH | `/api/servers/:guildId/tournaments/:id` | TOURNAMENT_MANAGER | Edit tournament |
| POST | `/api/servers/:guildId/tournaments/:id/publish` | TOURNAMENT_MANAGER | Publish |
| POST | `/api/servers/:guildId/tournaments/:id/cancel` | TOURNAMENT_MANAGER | Cancel |
| POST | `/api/servers/:guildId/tournaments/:id/finalize` | TOURNAMENT_MANAGER | Finalize + announce winners |
| GET | `/api/servers/:guildId/tournaments/:id/standings` | VIEWER | Current standings |

### Match Routes
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| GET | `/api/servers/:guildId/tournaments/:id/matches` | VIEWER | List matches |
| POST | `/api/servers/:guildId/tournaments/:id/matches/bulk` | TOURNAMENT_MANAGER | Generate multiple matches |
| GET | `/api/servers/:guildId/matches/:id` | VIEWER | Match detail |
| PATCH | `/api/servers/:guildId/matches/:id/schedule` | TOURNAMENT_MANAGER | Reschedule |
| POST | `/api/servers/:guildId/matches/:id/checkin` | PLAYER | Team check-in |
| POST | `/api/servers/:guildId/matches/:id/results` | PLAYER/REFEREE | Submit result |
| POST | `/api/servers/:guildId/matches/:id/approve` | REFEREE | Approve result |
| POST | `/api/servers/:guildId/matches/:id/dispute` | PLAYER/REFEREE | Raise dispute |

### Registration Routes
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| POST | `/api/servers/:guildId/tournaments/:id/registrations` | PLAYER | Register team |
| GET | `/api/servers/:guildId/tournaments/:id/registrations` | TOURNAMENT_MANAGER | List registrations |
| PATCH | `/api/servers/:guildId/registrations/:id` | TOURNAMENT_MANAGER | Approve/reject |

### Payment Routes
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| POST | `/api/servers/:guildId/orders` | PLAYER | Create order (feature-flagged) |
| GET | `/api/servers/:guildId/admin/payments` | SERVER_ADMIN | Payment operations |
| POST | `/api/payments/webhooks/razorpay` | none (signature verified) | Provider webhook |

### Analytics Routes
| Method | Route | Permission | Description |
|--------|-------|-----------|-------------|
| GET | `/api/servers/:guildId/analytics` | REFEREE+ | Server analytics with filters |
| GET | `/api/servers/:guildId/analytics/export` | TOURNAMENT_MANAGER+ | CSV export |
| GET | `/api/servers/:guildId/audit` | SERVER_ADMIN | Audit log |

---

## 7. Discord Bot Specification

### Bot Personality
*(See Section 17 for full guidelines)*
- Warm, professional, esports-native tone
- Custom emojis on every meaningful message
- Greeting messages on server join and command responses
- Never cold or robotic — always feels like a knowledgeable teammate

### Full Command List

#### Server Commands
| Command | Permission | Description |
|---------|-----------|-------------|
| `/server setup` | SERVER_ADMIN | Interactive server configuration wizard |
| `/server status` | TOURNAMENT_MANAGER+ | Integration health and connected channels |
| `/server branding` | SERVER_ADMIN | Set logo, accent color, custom templates |

#### Tournament Commands
| Command | Permission | Description |
|---------|-----------|-------------|
| `/tournament create` | TOURNAMENT_MANAGER | Multi-step modal tournament creation |
| `/tournament edit [id]` | TOURNAMENT_MANAGER | Edit tournament via action panel |
| `/tournament publish [id]` | TOURNAMENT_MANAGER | Publish with confirmation |
| `/tournament cancel [id]` | TOURNAMENT_MANAGER | Cancel with reason |
| `/tournament list` | VIEWER | View all tournaments for this server |
| `/tournament info [id]` | VIEWER | Tournament details embed |
| `/tournament participants [id]` | REFEREE+ | Paginated registrations with approve/reject buttons |
| `/tournament standings [id]` | VIEWER | Current leaderboard embed |

#### Match Commands
| Command | Permission | Description |
|---------|-----------|-------------|
| `/match schedule [id]` | VIEWER | View match schedule with countdowns |
| `/match checkin [id]` | PLAYER | Check team into match |
| `/match room [id]` | PLAYER (eligible) | Receive room credentials privately |
| `/match result [id]` | PLAYER/REFEREE | Submit result via modal |
| `/match approve [id]` | REFEREE | Approve or reject result |
| `/match dispute [id]` | PLAYER/REFEREE | Open dispute case |

#### Other Commands
| Command | Permission | Description |
|---------|-----------|-------------|
| `/register [tournament]` | PLAYER | Register team with modal form |
| `/winners [tournament]` | VIEWER | View finalized winners |
| `/analytics [game]` | TOURNAMENT_MANAGER+ | Server analytics summary |

### Sapphire Architecture
- All commands extend `Command` from `@sapphire/framework`
- All preconditions extend `Precondition` — `GuildOnly`, `HasPermission(role)`, `BotInstalled`
- `HasPermission` calls `packages/permissions/role-resolver.ts` — no duplicate logic in the bot
- Listeners: `GuildCreate`, `GuildDelete`, `InteractionCreate`, `Ready`
- Plugins: `@sapphire/plugin-logger`, `@sapphire/plugin-i18next`

### Persistent Control Panel
A pinned message in the configured admin channel with buttons:
- Live Events
- Pending Results
- Open Disputes
- Upcoming Matches
- Integration Health

Updates automatically via the outbox worker whenever any of these counts change.

### Room Credential Delivery
- Room credentials are **never** posted in a public channel embed
- Delivered via ephemeral message or configured private thread
- If private delivery fails, credentials stay on the website's authorized match page
- Admin is alerted if delivery fails after 3 attempts

---

## 8. Website Specification

### URL Structure
| Route | Page | Access |
|-------|------|--------|
| `/` | Landing page + login | Public |
| `/servers` | Discord server selector | Authenticated |
| `/servers/[guildId]` | Server tournament homepage | Public |
| `/servers/[guildId]/tournaments` | Tournament catalogue | Public |
| `/servers/[guildId]/tournaments/[id]` | Tournament detail | Public |
| `/servers/[guildId]/teams` | Teams directory | Public |
| `/servers/[guildId]/players` | Player profiles | Public |
| `/servers/[guildId]/leaderboards` | Rankings | Public |
| `/servers/[guildId]/winners` | Champions | Public |
| `/servers/[guildId]/tournaments/[id]/register` | Registration form | PLAYER |
| `/servers/[guildId]/dashboard` | Admin overview | REFEREE+ |
| `/servers/[guildId]/admin/tournaments` | Tournament management | TOURNAMENT_MANAGER+ |
| `/servers/[guildId]/admin/tournaments/new` | Creation wizard | TOURNAMENT_MANAGER+ |
| `/servers/[guildId]/admin/participants` | Registrations | TOURNAMENT_MANAGER+ |
| `/servers/[guildId]/admin/matches` | Match management | REFEREE+ |
| `/servers/[guildId]/admin/results` | Results and disputes | REFEREE+ |
| `/servers/[guildId]/admin/analytics` | Analytics dashboard | REFEREE+ |
| `/servers/[guildId]/admin/settings` | Server settings + Staff Management | SERVER_ADMIN |
| `/servers/[guildId]/admin/payments` | Payment operations | SERVER_ADMIN |
| `/overlay/[guildId]/[tournamentId]` | OBS browser source | Token auth |

### Tournament Creation Wizard Steps
1. **General Settings** — name, description, game, mode, organizer, visibility, banner, rules
2. **Registration and Participants** — capacity, roster limits, substitutes, IGN fields, eligibility, approval type, deadline, waitlist, entry type
3. **Schedule and Format** — dates, timezone, stage structure, match format
4. **Scoring and Tie-breakers** — game-specific scoring config, placement table, kill value, tie-breaker order
5. **Winners and Awards** — placements, MVP, custom awards, prize descriptions
6. **Discord Setup and Publish** — channel selectors, notification templates, role assignments, preview, publish

### Admin Dashboard KPIs
| Metric | Description |
|--------|-------------|
| Total Tournaments | Created events (draft + published separated) |
| Currently Live | Events in progress |
| Upcoming | Scheduled, not yet started |
| Total Registrations | Entries in selected period |
| Unique Players | Distinct accounts registered |
| Active Teams | Teams in eligible/ongoing events |
| Registration Fill Rate | Accepted slots / available slots |
| Check-in Rate | Checked-in / expected check-ins |
| No-show Rate | Absent / required to attend |
| Pending Results | Matches awaiting submission/confirmation |
| Open Disputes | Unresolved cases |
| Completion Rate | Completed / due to finish in cohort |

---

## 9. Synchronization System

### The Transactional Outbox Pattern

Every mutation that requires a Discord update:
1. Opens a database transaction
2. Updates the tournament/match/registration state
3. Writes an `outbox_events` record in the **same transaction**
4. Commits atomically — both succeed or both fail

The BullMQ worker:
1. Polls `outbox_events` for PENDING records
2. Executes the Discord API operation
3. Records the Discord message ID in `discord_message_bindings`
4. Marks the outbox event DELIVERED
5. On failure: increments `retry_count`, schedules retry with exponential backoff
6. After 5 failures: marks FAILED, creates admin alert

### Rate Limit Handling
- Worker reads `X-RateLimit-Remaining` and `X-RateLimit-Reset-After` headers
- On 429 response: reads `Retry-After`, uses BullMQ delay to reschedule — never busy-retries
- Global rate limit bucket is tracked across all queued operations

### Reconciliation
- A BullMQ repeatable job runs every 60 seconds
- Scans for `outbox_events` with `status = PENDING` and `created_at > 30 seconds ago`
- Re-enqueues any missed events (catches post-outage backlog)
- Unique BullMQ job ID = `outbox_event.id` — re-enqueueing is idempotent

### Scheduled Jobs
Each of these is a `scheduled_jobs` record and a BullMQ delayed job with a unique `job_key`:
- 24h before match: general reminder
- 15min before match: captain ping + check-in reminder
- At `room_credentials.release_at`: private credential delivery
- At match `result_deadline`: deadline reminder to pending captain
- At `orders.expires_at`: expire unpaid orders and release slot

When a match is rescheduled:
1. Old `scheduled_jobs` records for that match are marked CANCELLED
2. Old BullMQ jobs removed by key
3. New `scheduled_jobs` records created
4. New BullMQ jobs queued with new keys

### Integration Status Badge
`/api/servers/:guildId/sync-status` returns one of:
- `SYNCED` — no pending outbox events older than 2 minutes
- `PENDING` — outbox events in queue but no failures
- `DEGRADED` — one or more FAILED outbox events require attention

---

## 10. Game Engines

### Shared Interface (all engines implement)
```typescript
interface GameRuleModule {
  defaultScoringConfig(): ScoringConfig
  validateScoringConfig(config: unknown): ScoringConfig
  calculateMatchScore(params: MatchScoreParams): number
  calculateStandings(matches: ApprovedMatch[], rules: ScoringConfig): TeamStanding[]
  applyTiebreakers(tied: TeamStanding[], rules: ScoringConfig): TeamStanding[]
}
```

### BGMI — Battle Royale
- Placement points table (configurable, e.g. 1st=15, 2nd=12, ..., 16th=0)
- Kill value (configurable, e.g. 1 point per kill)
- Penalty deductions (configurable)
- Aggregates across all matches in the tournament
- Tie-breaker order: Total Points → Total Kills → Best Single-Match Placement → Most Match Wins
- Formula: `Match Points = Placement Points + (Kills × Kill Value) - Penalties`

### Free Fire — Battle Royale
- Same scoring model as BGMI with independent configurable tables
- Not shared with BGMI — separate config, separate validation

### Free Fire — Clash Squad
- Round-based: track round wins per team per map
- First to `threshold` round wins → series winner
- Forfeit: series win to non-forfeiting team
- Map selection rotation configurable

### COD Mobile — Multiplayer
- Best-of-N format (1/3/5 configurable)
- First to `ceil(N/2)` map wins → series winner
- Mode and map configurable per match segment
- Forfeit and walkover handling

### COD Mobile — Battle Royale
- Separate module from multiplayer, same scoring model as BGMI/FF BR

### Engine Rules
- All engines are **pure functions** — no database calls, no side effects
- Always called with the `tournament_rule_versions` snapshot, not live config
- Standings computed from approved `score_events`, never from raw submissions
- Corrections create new `score_events` with `type: CORRECTION` — full recalculation triggered

---

## 11. Payment Module

### Feature Flag
Every exported function in `packages/payments` begins with:
```typescript
if (!process.env.PAYMENTS_ENABLED || process.env.PAYMENTS_ENABLED !== 'true') {
  throw new PaymentsDisabledError('Payment module is disabled pending legal review.')
}
```
The free registration flow has **zero** dependency on this package.

### Payment States
```
pending  -> paid      (Razorpay webhook: payment.captured — verified, amount matched)
pending  -> failed    (Razorpay webhook: payment.failed)
pending  -> expired   (payment deadline passed, slot released automatically)
failed   -> refunded  (automatic — Razorpay initiates refund on failed capture)
paid     -> disputed  (Razorpay chargeback received — requires manual review)
disputed -> refunded  (chargeback upheld after review)
```

> **Refund Policy:** Refunds are **only** triggered by payment failure or a Razorpay chargeback. There is no manual "admin-initiated refund" for successful payments. A successful payment means the slot is confirmed. Organizers must communicate their refund policy clearly in the tournament rules before players register.

> **Strict Approval Rule:** Only orders with `status = paid` (verified by Razorpay webhook, not by browser callback) activate a registration. A browser claiming payment succeeded is never trusted.

### Order Flow (when enabled)
1. Captain hits register on a paid tournament
2. `POST /api/servers/:guildId/orders` — validate eligibility, atomically reserve slot, create order with `status: pending` and `expires_at: now + 15min`
3. Browser redirects to **Razorpay checkout** (UPI, cards, net banking, wallets — all supported)
4. `POST /api/payments/webhooks/razorpay` receives signed event from Razorpay server
5. Verify `X-Razorpay-Signature` HMAC-SHA256 — reject with 400 if invalid
6. Idempotency check: if `payment_events.provider_event_id` already exists → return 200, stop
7. Compare `amount` and `currency` from webhook against stored order — reject if mismatch
8. `payment.captured` → order to `paid`, registration activated, Discord confirmation sent
9. `payment.failed` → order to `failed`, slot released, Razorpay auto-initiates refund if any amount was held
10. Browser result is **ignored entirely** — only the server-to-server webhook activates registration

### Payment Logging
Every payment is logged in full detail in the `payment_events` table and visible in the admin **Payments** page:
- Discord username and ID
- Discord UID (numeric snowflake)
- Team name and tournament name
- Amount paid and currency
- Razorpay Order ID and Payment ID
- Date and time (in server's configured timezone)
- Payment status
- Device/IP metadata from webhook payload

The website Payments page (`/servers/[guildId]/admin/payments`) shows a full searchable, filterable log of all transactions with CSV export. No payment record is ever deleted — even for archived tournaments.

### Legal Compliance Notice
> ⚠️ **IMPORTANT — India Online Gaming Rules 2026:** The `PAYMENTS_ENABLED` flag defaults to `false`. Before enabling real-money entry fees or cash prizes, qualified Indian legal counsel must review the platform under the applicable rules. Do not enable this flag in production without that review. Reference: [Official Ministry of Electronics and IT guidance](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2254606)

---

## 12. Analytics System

### Metrics Computed Per Server (never cross-tenant)
All queries are scoped to `guild_id`. Analytics for Server A cannot return data from Server B.

### Filters
- Server (auto-scoped)
- Game (BGMI / Free Fire / COD Mobile / All)
- Mode
- Tournament (specific or all)
- Status
- Date range (preset: 7d / 30d / 90d / custom)

### Dashboard Tabs
- **BGMI** — BR-specific metrics, top teams, kill leaders
- **Free Fire** — BR + Clash Squad metrics separated
- **COD Mobile** — Multiplayer + BR metrics separated
- **All Games** — Combined operational totals only (never combined competitive rankings)

### Chart Types
- Registrations over time (line)
- Fill rate by tournament (bar)
- Match completion rate (donut)
- Top 10 teams by points (horizontal bar)
- Most active players (table)
- Tournament format distribution (pie)
- Reporting delay histogram
- Points trend over time per team (line)

### Exports
CSV export available for: tournaments, registrations, match results, audit log

---

## 13. Deployment Architecture

### Vercel (Web App)
- Auto-deploy on `main` branch push
- Environment: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `PAYMENTS_ENABLED=false`
- Next.js ISR for public tournament pages (60s revalidation)
- Edge middleware for auth protection on `/servers/*`

### Render (Bot + Worker)
- Two separate Render **background worker** services (not web service — persistent, no spin-down)
  - `discord-bot` — `apps/discord-bot`
  - `worker` — `apps/worker`
- Auto-deploy on `main` branch push

### Supabase (Database + Auth + Storage + Realtime)
- Free tier project
- Row Level Security enabled on all tenant tables
- Realtime enabled for `tournaments`, `matches`, `score_events` tables
- Storage buckets: `evidence` (private), `banners` (public), `avatars` (public)
- Automated daily backups

### Environment Variables Reference
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_REDIRECT_URI=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
PAYMENTS_ENABLED=false
SENTRY_DSN_WEB=
SENTRY_DSN_BOT=
SENTRY_DSN_WORKER=
NEXT_PUBLIC_APP_URL=
NODE_ENV=production
```

---

## 14. Security Model

### Two-Layer Permission Check
Every admin action is checked **twice**:
1. **UI layer:** hide controls the user cannot use (UX only, not security)
2. **API layer:** verify permissions server-side on every request regardless of UI state

### Application Roles
| Role | Capabilities |
|------|-------------|
| `VIEWER` | Read public tournament data |
| `PLAYER` | Register teams, submit results, check in |
| `REFEREE` | Approve/reject results, resolve disputes, view all registrations |
| `TOURNAMENT_MANAGER` | Create/edit/publish/cancel tournaments, manage participants, view analytics |
| `SERVER_ADMIN` | All above + server settings, role bindings, payment operations, audit logs |

---

### Admin Panel Access — Who Can Enter

#### Server Owner: Automatic Full Access
The Discord server owner (the account that created the Discord server) is **automatically granted `SERVER_ADMIN`** access to the admin panel the moment they log in. No setup required. The platform detects server ownership via the Discord `owner_id` field returned on the guild object and grants the highest role unconditionally.

- The server owner does **not** need to be assigned a role in `server_role_bindings`
- The server owner can never have their admin access revoked by other admins
- The server owner is the only person who can configure who else has admin access

#### Staff Members: Must Be Explicitly Assigned

Everyone else — including Discord moderators, admins, or trusted community members — **cannot access the admin panel until the server owner explicitly grants them a role.**

This is done in two places:
1. **Website:** `/servers/[guildId]/admin/settings` → **Staff Management** section
2. **Discord:** `/server setup` → role binding wizard (also accessible later via `/server roles`)

The server owner assigns access by mapping a **Discord role** to an **application role**:

```
Example mapping:
  Discord role "Head Admin"     → SERVER_ADMIN
  Discord role "Tournament Host"→ TOURNAMENT_MANAGER
  Discord role "Referee Team"   → REFEREE
```

Any Discord member who has one of these mapped roles in the server automatically inherits the corresponding app role on the website. When the server owner removes a Discord role from a member, that member's admin access is revoked immediately on their next request.

#### Staff Management UI (in Admin Settings)

The **Staff Management** page at `/servers/[guildId]/admin/settings` has two sections:

**Section 1 — Role Bindings**

A table showing all current Discord role → App role mappings:

| Discord Role | App Role Granted | Members with this Role | Actions |
|---|---|---|---|
| Head Admin | SERVER_ADMIN | 2 | Edit / Remove |
| Tournament Host | TOURNAMENT_MANAGER | 5 | Edit / Remove |
| Referee Team | REFEREE | 8 | Edit / Remove |

- "Add Binding" button opens a modal: search for a Discord role (live search from guild roles) → select app role → confirm
- Removing a binding immediately revokes admin access for all members who held that Discord role
- Only `SERVER_ADMIN` can manage role bindings

**Section 2 — Current Staff Overview**

A read-only list of every Discord member who currently has admin access, derived from the role bindings:

| Member | Discord Roles | App Role | Last Active |
|---|---|---|---|
| @AmeyXD | Head Admin | SERVER_ADMIN | 2 hours ago |
| @TourneyHost1 | Tournament Host | TOURNAMENT_MANAGER | 1 day ago |
| @Ref_Player | Referee Team | REFEREE | 3 days ago |

This gives the server owner a clear view of exactly who has access to their tournament admin panel at any time.

#### How Role Resolution Works (Technical)

When a user tries to access the admin panel:

```
1. User authenticates via Discord OAuth2
2. Backend fetches the user's current Discord roles for this guild
   (via Discord API: GET /guilds/{guild_id}/members/{user_id})
3. If user is the guild owner → grant SERVER_ADMIN, bypass step 4
4. Cross-reference with server_role_bindings table:
   - Find all discord_role_ids the user currently has
   - Find the highest app_role among matching bindings
   - If no match found → user is VIEWER (no admin access)
5. Role is re-resolved on every request — not cached on the user's session
   (role changes in Discord take effect immediately, not on next login)
```

> **Important:** Discord role changes take effect on the **next API request**, not the next login. A member who loses their Discord role loses admin panel access on their next page load or API call — they do not need to re-login for the revocation to work.

#### The `/server roles` Discord Command

After initial setup, the server owner and SERVER_ADMINs can manage staff roles directly from Discord without opening the website:

| Command | Description |
|---------|-------------|
| `/server roles list` | Show all current Discord role → app role mappings |
| `/server roles add` | Map a Discord role to an app role (modal: select role, select app role) |
| `/server roles remove` | Remove a role binding |
| `/server roles members` | Show which Discord members currently have admin access |

---

### Critical Security Rules
1. Never trust a client-supplied `guild_id` as proof of permission — always verify membership
2. Room credentials are never in public embeds, never in Realtime broadcasts, never in public API responses
3. The stored `guild_id` in session is a convenience hint only — always revalidate
4. Cross-server reads return 403, not 404 (do not confirm existence of other servers' data)
5. Webhook signature verification is mandatory before processing any payment event
6. Rate-limit all sensitive endpoints (registration, result submission, order creation)
7. Audit every action that changes tournament state, registration status, or result

### Server Isolation Pattern
```typescript
// Every repository function that touches tenant data must assert guild_id
async function getTournament(prisma, guildId, tournamentId) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, guild_id: guildId }  // guild_id ALWAYS in WHERE clause
  })
  if (!tournament) throw new NotFoundError()
}
```


---

## 15. Phase Task Breakdown

---

### PHASE 1 — Foundation
**Goal: Working monorepo, database, auth, server selector, bot skeleton, landing page with 3D hero**

---

#### Task 1: Monorepo Scaffold and Tooling

**Objective:** Create the complete project structure with all workspaces configured, TypeScript, ESLint, Prettier, and Git initialized.

**Implementation:**
- Initialize pnpm workspace with `pnpm-workspace.yaml` listing all `apps/*` and `packages/*`
- Create all directories as listed in Section 4
- Root `package.json` with scripts: `dev`, `build`, `lint`, `test`, `type-check`
- Shared `tsconfig.base.json` with strict mode, path aliases
- Each app/package has its own `tsconfig.json` extending base
- `.eslintrc.js` with TypeScript rules, import ordering
- `.prettierrc` with consistent formatting
- `.env.example` with all required variables (values empty)
- `.gitignore` covering `node_modules`, `.env*`, `.next`, `dist`, Prisma generated files
- Git initialized with initial commit

**Tests:**
- `pnpm build` from root completes with no TypeScript errors
- `pnpm lint` from root passes with no warnings

**Demo:** `pnpm dev` starts Next.js on port 3000 showing a blank page with no console errors.

---

#### Task 2: Database Schema and Migrations

**Objective:** Define the complete Prisma schema with all entities, relationships, constraints, enums, and indexes. Run initial migration against Supabase.

**Implementation:**
- Write full `schema.prisma` covering all tables from Section 5
- Define all enums: `TournamentStatus`, `MatchStatus`, `AppRole`, `EntryType`, `PaymentStatus`, `AwardType`, `OutboxStatus`, `JobStatus`
- All tenant-owned tables have `guild_id` with foreign key to `discord_servers`
- `Decimal` type for `orders.amount` — never `Float`
- All timestamp fields in UTC
- Unique constraints: `payment_events.provider_event_id`, `scheduled_jobs.job_key`, `matches.(stage_id, number)`
- Indexes: `tournaments(guild_id, status)`, `registrations(tournament_id)`, `matches(scheduled_start)`, `outbox_events(status, created_at)`
- Run `prisma migrate dev --name init`
- Create `packages/database/src/client.ts` exporting singleton PrismaClient
- Create typed repository stubs for each entity

**Tests:**
- Unit tests for enum transition guards in `packages/tournament-engine/src/state-machine.ts`
- `prisma validate` passes with no errors
- `prisma generate` creates fully typed client with no errors

**Demo:** `npx prisma studio` opens and shows all tables with correct column types and relationships visible.

---

#### Task 3: Discord OAuth2 Authentication

**Objective:** Complete auth flow — Discord login, session management, protected routes, user identity API.

**Implementation:**
- Configure Supabase Auth with Discord OAuth2 provider, scopes: `identify guilds`
- `/api/auth/callback` handles Supabase OAuth callback, stores session
- `/api/auth/me` returns `{ discord_id, username, avatar }`
- Next.js `middleware.ts` protects all `/servers/*` routes, redirects to `/?next=<original>` when unauthenticated
- On first login: upsert user into `users` table
- Client-side `useUser()` hook wrapping Supabase session

**Tests:**
- GET `/api/auth/me` without session → 401
- GET `/api/auth/me` with valid session → user object
- GET `/servers/123` without session → redirect to `/?next=/servers/123`

**Demo:** Click "Login with Discord" → Discord authorization page → callback → `/servers` page with user's Discord username and avatar displayed.

---

#### Task 4: Multi-Server Selector

**Objective:** After login, display all Discord servers grouped by bot connection status with tournament summaries.

**Implementation:**
- `/api/servers` route: fetch user guilds from Discord API using stored access token, cross-reference with `discord_servers` table, group into `connected` / `eligible` / `unavailable`
- For connected servers: join with tournament counts (live, upcoming)
- Cache Discord guild list per user for 60 seconds (Upstash Redis)
- Save last-used `guild_id` to session as convenience — always revalidate membership on subsequent API calls, never use as proof of permission
- Server card UI: server icon, name, bot status badge, active/upcoming tournament count chips
- "Add Bot" button for eligible servers uses Discord invite URL with `guild_id` pre-selected

**Tests:**
- Unit: grouping logic with mocked guild data and bot-installation data
- Unit: guild ID stored in session that user has since left → rejected on next API call
- Integration: `/api/servers` returns correctly grouped data

**Demo:** `/servers` shows Discord servers in three groups with server icons, names, and tournament counts. "Connected Servers" group links to tournament environments.

---

#### Task 5: Tenant Authorization Middleware

**Objective:** Every API route under `/api/servers/:guildId/*` enforces guild membership and application role. Server isolation is airtight.

**Implementation in `packages/permissions`:**
- `assertGuildMembership(userId, guildId)` — throws 403 if not member (never 404)
- `resolveUserRole(prisma, userId, guildId)` — role resolution in strict priority order:
  1. Fetch the guild from `discord_servers` — check if `guild.owner_id === userId`
  2. If owner: **return `SERVER_ADMIN` immediately** — no further checks needed, never overrideable
  3. If not owner: fetch user's current Discord roles for this guild via Discord API (`GET /guilds/{guildId}/members/{userId}`)
  4. Cross-reference returned Discord role IDs against `server_role_bindings` for this guild
  5. Among matching bindings, return the **highest** `app_role` found
  6. If no matching binding found: return `VIEWER` (read-only access, no admin panel)
  7. Role is resolved fresh on **every request** — never read from session cache
- `withPermission(requiredRole, handler)` — HOC that:
  1. Extracts session → 401 if missing
  2. Calls `assertGuildMembership` → 403 if not member
  3. Calls `resolveUserRole`
  4. Checks `role >= requiredRole` → 403 if insufficient
  5. Attaches `{ userId, guildId, role, isOwner }` to request context and calls handler

**Tests:**
- Unit: `REFEREE` attempting `SERVER_ADMIN` action → 403
- Unit: unauthenticated request → 401
- Unit: guild owner (`owner_id` match) → always resolves to `SERVER_ADMIN` regardless of `server_role_bindings`
- Unit: member with two Discord roles mapped to `REFEREE` and `TOURNAMENT_MANAGER` → resolves to `TOURNAMENT_MANAGER` (highest wins)
- Unit: member whose Discord role is removed → next request resolves to `VIEWER` (no cached role)
- Integration: request to Server B admin endpoint with Server A session → 403
- Integration: authenticated user not in guild → 403
- Integration: cross-server read returns 403, not 404 (does not confirm existence)

**Demo:** Non-member navigating directly to an admin URL sees "Access Denied." Correct server admin sees the dashboard skeleton.

---

#### Task 6: Discord Bot — Sapphire Scaffold and Server Registration

**Objective:** Running Discord bot with full personality, server registration/deregistration, `/server setup` and `/server status` commands.

**Implementation:**
- `SapphireClient` with intents: `Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`
- `@ready` listener: log bot online with custom emoji greeting in console
- `@guildCreate` listener:
  - Upsert server into `discord_servers`
  - Post welcome embed to system channel (see Section 17 for exact welcome message)
  - Warm, personalized greeting with custom emojis
- `@guildDelete` listener: mark `discord_servers.is_active = false`
- Preconditions: `GuildOnly`, `HasPermission(role)` (calls `packages/permissions`)
- `/server setup`: multi-step button flow → timezone → channel mapping → role binding (map Discord roles to app roles: TOURNAMENT_MANAGER, REFEREE) → saves `server_settings` and `server_role_bindings`
  - First screen after setup asks: "Who should have tournament management access?" — server owner selects Discord roles from a dropdown for each app role level
  - Setup is skippable and can be resumed via `/server roles`
- `/server status`: shows bot online status, database connectivity, Redis connectivity, outbox backlog count, last successful sync timestamp
- `/server roles list`: shows all current role bindings in an embed table
- `/server roles add`: modal to add a new binding (Discord role → app role)
- `/server roles remove`: select menu to remove a binding
- `/server roles members`: shows all Discord members who currently have admin access derived from bindings

**Tests:**
- Integration: `GuildCreate` event → `discord_servers` record upserted
- Integration: `GuildDelete` event → `is_active` set to `false`
- Integration: `/server setup` without `MANAGE_GUILD` Discord permission → friendly permission error with custom emoji
- Integration: `/server setup` with valid data → `server_settings` record created

**Demo:** Invite bot to test server → welcome embed appears with custom emojis and warm greeting message. `/server setup` runs the configuration wizard. `/server status` shows green health indicators.

---

#### Task 7: Landing Page and Design System Foundation

**Objective:** Complete visual identity established. Landing page is visually spectacular — a genuine premium esports product from first load.

**Implementation:**

Design tokens in `tailwind.config.ts`:
```
obsidian:     #0a0a0f
graphite:     #1a1a2e
deep-violet:  #16213e
electric:     #7c3aed
violet-glow:  #9f5bff
cyan:         #06b6d4
cyan-glow:    #22d3ee
silver:       #94a3b8
```

Typography:
- Display: **Orbitron** (headings, uppercase tracking, weights 700/900)
- Body: **Inter** (data, tables, forms, weights 400/500/600)
- Mono: **JetBrains Mono** (IDs, match numbers, codes)

UI Primitives in `components/ui/`:
- `GlassCard` — backdrop-blur, border lighting, layered shadows, hover depth effect
- `GlowButton` — animated gradient border on hover using conic-gradient
- `Badge` — game-specific and status-specific color variants
- `AnimatedCounter` — Framer Motion count-up animation
- `StatusPulse` — pulsing glow dot for live indicators
- `Skeleton` — shimmer loading states matching card layouts

Framer Motion variants in `lib/motion.ts`:
- `fadeUp`, `staggerChildren`, `slideInLeft`, `scaleIn`, `glowPulse`

Three.js hero scene (`components/three/HeroScene.tsx`):
- Rotating geometric esports emblem (custom icosahedron geometry with wireframe overlay)
- Ambient particle field (instanced mesh, 500 particles, slow drift animation)
- Violet and cyan point lights with intensity animation
- Post-processing: depth-of-field, bloom on accent colors
- Animated floating ring orbits around the emblem
- Loaded with `next/dynamic` — SSR disabled, client-only
- Entirely hidden when `prefers-reduced-motion: reduce` is detected

Landing page sections with Framer Motion scroll-triggered reveals:
1. **Hero:** Three.js canvas as full-viewport background, animated headline split by words, "Login with Discord" CTA with glow button
2. **Features:** three glass cards (Multi-Server, Live Tournaments, Discord-Native) with stagger animation
3. **Games:** BGMI / Free Fire / COD Mobile game tiles with artwork
4. **How It Works:** 3-step flow (Login → Select Server → Compete) with animated connecting line
5. **Footer:** minimal dark footer with links

**Tests:**
- Lighthouse accessibility score ≥ 90 on landing page
- `prefers-reduced-motion`: Three.js scene does not render, all transitions are instant
- CLS < 0.1 on initial load (no layout shift)
- All fonts loaded via `next/font` (zero FOUT)

**Demo:** Landing page loads in under 2 seconds with the 3D animated hero, dark esports aesthetic, smooth scroll-triggered section reveals, and a working "Login with Discord" button. It looks like a VC-funded esports product, not a side project.

---

### PHASE 2 — Website Panels
**Goal: Working public viewer panel and admin panel shell with correct permission gating**

---

#### Task 8: Public Viewer Panel — Tournament Catalogue

**Objective:** All public server pages built, functional, styled, and secure. No private data ever exposed.

**Implementation:**
- `/servers/[guildId]` — server homepage:
  - Server banner and icon header with accent color theming
  - Active tournament cards with live pulsing indicator
  - Upcoming tournament countdown cards
  - Recent winners strip (last 3 completed tournaments)
- `/servers/[guildId]/tournaments` — catalogue:
  - Grid/list toggle with Framer Motion layout animation
  - Status filter chips (All / Live / Registration Open / Upcoming / Completed)
  - Game filter (BGMI / Free Fire / COD Mobile)
  - Search with debounce
- `/servers/[guildId]/tournaments/[id]` — detail page:
  - Tournament banner, game badge, status pill, dates
  - Registration capacity bar (animated fill)
  - Countdown to registration deadline or match start
  - Multi-match schedule table (all matches with time, map, status)
  - Approved team roster accordion
  - Live standings table (if live or completed) with rank change animations
  - Rules section (collapsible)
  - Share + copy link button
  - Dynamic OG image via `@vercel/og`
- ISR `revalidate: 60` on all public pages
- Explicit field selection on all queries — `room_credentials`, pending registrations, and unreviewed submissions **never returned**

**Tests:**
- API: response contains no `room_credentials` fields
- API: response contains no registrations with `status: PENDING`
- API: response contains no `result_submissions` with `status: PENDING_REVIEW`
- Component snapshot: tournament card
- Accessibility: keyboard navigable, all images have alt text

**Demo:** Unauthenticated visitor browses tournaments, views approved team rosters, and sees a live standings table — no sensitive data visible anywhere.

---

#### Task 9: Admin Panel Shell and Navigation

**Objective:** Permission-aware admin layout with animated KPI overview, collapsible sidebar, and integration status badge.

**Implementation:**
- `app/servers/[guildId]/admin/layout.tsx`:
  - Fixed collapsible sidebar (desktop) / bottom nav (mobile)
  - Sections: Overview, Tournaments, Participants, Matches, Results, Analytics, Settings, Payments
  - Each item shows only if user's `AppRole` grants access
  - Server icon and name in sidebar header
  - Integration status badge: `Synced` (green pulse) / `Sync Pending` (amber pulse) / `Needs Attention` (red pulse)
  - User avatar + role chip in sidebar footer
- Overview page KPI cards (12 metrics, see Section 8):
  - Framer Motion stagger on load (each card fades up with 0.05s delay offset)
  - `AnimatedCounter` component for count-up on mount
  - Click-through to filtered list views
  - Color coding: red for open disputes and no-shows, green for completion rate
- Responsive: sidebar collapses to icon-only at 1024px, bottom nav at 768px

**Tests:**
- Render with `REFEREE` role → Tournaments and Matches visible, Settings and Payments hidden
- Render with `SERVER_ADMIN` → all nav items visible
- Integration: outbox FAILED event → sync badge shows "Needs Attention"
- Snapshot: sidebar renders correctly per role

**Demo:** Authenticated server admin sees animated KPI cards stagger in on load, correct role-gated navigation, and the integration status badge showing current sync state.

---

#### Task 10: Tournament List and Status Management

**Objective:** Full admin tournament list with filtering, sorting, virtual scrolling, and state machine enforcement on all actions.

**Implementation:**
- `/servers/[guildId]/admin/tournaments`:
  - TanStack Table with virtual scrolling (handles 1000+ rows)
  - Columns: name, game badge, mode, status badge, schedule, capacity bar, registered/max, current stage, organizer, Discord sync icon
  - Status filter tabs, game filter dropdown, search with debounce, sortable columns (click header)
  - Row actions: Edit, Duplicate, View, Cancel, Archive
  - Bulk select + bulk cancel / bulk archive
  - "New Tournament" button → wizard
- Status transitions enforced in `packages/tournament-engine/src/state-machine.ts`
- Invalid transitions return descriptive errors shown as toast notifications
- All status changes write to `audit_logs`

**Tests:**
- Unit: finalize with open disputes → `TournamentStateError` with list of blocking disputes
- Unit: `LIVE → REGISTRATION_OPEN` → `TournamentStateError`
- Integration: filter `status=LIVE` returns only live tournaments for that guild_id
- Integration: same query with a different guild_id returns empty (no cross-tenant leakage)

**Demo:** Tournament list renders with all filter controls, virtual scrolling handles large lists smoothly, and attempting an invalid status transition shows a clear error message.

---

#### Task 11: Tournament Creation Wizard — Steps 1–3

**Objective:** First half of the creation wizard fully functional with validation, auto-save, and smooth step navigation.

**Implementation:**
- Step indicator bar (1–6 with completion checkmarks and game-specific accent colors)
- Auto-save draft to `localStorage` every 30 seconds (keyed by guild + draft ID)
- **Step 1 — General Settings:**
  - Name, description (rich text with character count)
  - Game selector: three cards with game artwork (BGMI / FF / CODM) — click to select
  - Mode selector: dynamically populated from selected game's modes
  - Organizer assign (search users by Discord name)
  - Visibility: Public / Server Members Only
  - Banner upload to Supabase Storage with crop preview
  - Rules document upload (PDF) or link
  - Contact info
- **Step 2 — Registration and Participants:**
  - Team capacity (slider + number input)
  - Roster min/max size, substitute slots
  - Game-specific player identifier fields (IGN + UID labeled per game)
  - Eligibility rules (text + optional Discord role requirement)
  - Approval type: Auto-approve / Manual review
  - Registration deadline (date+time picker with timezone preview)
  - Waitlist toggle
  - Entry type selector: Free (active) / Paid (grayed out with "Requires legal review" tooltip — feature-flagged)
- **Step 3 — Schedule and Format:**
  - Registration open/close, check-in open/close, tournament start/end
  - Timezone selector (searchable, shows current time in selected zone)
  - Stage structure: Single Stage / Group + Knockout / Custom stages (add/remove)
  - Match format (links to multi-match scheduler in Phase 3)
- All form state: React Hook Form
- All validation: Zod schemas from `packages/shared-types`
- Back button navigates without data loss
- "Save Draft" explicitly saves to API

**Tests:**
- Zod: required field missing → inline error under field
- Zod: registration close before open → error on registration close field
- Zod: tournament start before check-in close → error
- E2E: fill Steps 1–3, navigate back to Step 1, change game, verify mode selector resets
- E2E: save draft → appears in tournament list with status DRAFT

**Demo:** Admin completes Steps 1–3, navigates back and forward without losing data, saves a draft that appears in the tournament list.

---

#### Task 12: Tournament Creation Wizard — Steps 4–6

**Objective:** Complete the wizard with game-specific scoring, award setup, Discord channel integration, and publish flow.

**Implementation:**
- **Step 4 — Scoring and Tie-breakers** (dynamically renders per game from Step 1):
  - BGMI / FF Battle Royale: editable placement points table (add/remove rows), kill value input, penalty policy toggle, tie-breaker order drag-and-drop list
  - FF Clash Squad: round win threshold, best-of-N selector
  - CODM Multiplayer: Best-of-N selector, map win conditions per mode
  - "Load Defaults" button fills from `packages/game-rules` default config
- **Step 5 — Winners and Awards:**
  - Champion, runner-up, third place (toggle on/off)
  - MVP criteria (text, or "highest kills", "most wins" dropdown)
  - Custom awards: add rows (label + criteria + description)
  - Prize description (text per placement)
  - Fulfillment process notes
- **Step 6 — Discord Setup and Publish:**
  - Channel selectors: announcement, match updates, results, disputes (fetches guild channels from Discord API)
  - Staff role selectors for tournament manager and referee
  - Notification template preview (renders the actual embed that will be posted)
  - Room release policy: automatic at scheduled time / manual release
  - Pre-publish checklist (green checkmarks for: channels set, scoring configured, capacity > 0, schedule valid)
  - Preview pane: shows public tournament page and Discord announcement side by side
  - "Publish Tournament" button → confirmation modal with checklist
- On publish:
  - Save `tournament_rule_versions` snapshot (immutable scoring config)
  - Write `outbox_events` record for the Discord announcement
  - Transition tournament to `REGISTRATION_OPEN` (or keep `DRAFT` if start date is far future — user choice)
  - Return created tournament with public URL

**Tests:**
- Unit: publish with no announcement channel → validation error listing missing fields
- Unit: `tournament_rule_versions` record created with full config on publish
- Unit: `outbox_events` record created atomically with tournament status change
- Integration: complete wizard end-to-end → tournament in `REGISTRATION_OPEN` → visible in public catalogue
- Integration: Discord announcement embed matches the preview shown in Step 6

**Demo:** Admin completes all 6 wizard steps, sees the preview, publishes — tournament appears in the public catalogue and the Discord announcement is posted within seconds.

---

### PHASE 3 — Tournament Engine
**Goal: Full tournament lifecycle from registration through final results and winner announcement**

---

#### Task 13: Registration System

**Objective:** Team registration with atomic slot reservation, duplicate detection, admin approval queue, and Discord confirmation.

**Implementation:**
- Registration form at `/servers/[guildId]/tournaments/[id]/register`:
  - Captain details auto-filled from Discord session
  - Roster member addition (search by Discord username)
  - Game-specific player identifier fields per member (IGN + UID)
  - Eligibility acknowledgment checkbox
  - Free: "Confirm Registration" button; Paid: fee displayed, checkout button disabled with legal notice
  - Form state persisted in `localStorage` between sessions
- Registration API `POST /api/servers/:guildId/tournaments/:id/registrations`:
  - Validate roster size against tournament min/max
  - Check for duplicate team registration (same captain in same tournament)
  - Check for conflicting IGNs within same tournament
  - **Atomic slot reservation:** `SELECT ... FOR UPDATE` on tournaments.accepted_count, compare against capacity, fail fast if full
  - If full and waitlist enabled: add to waitlist queue
  - Create `registration` + `registration_members` records (status: `PENDING`)
  - Write `outbox_events` for captain confirmation message
- Admin approval at `/servers/[guildId]/admin/participants`:
  - Searchable data table: team name, captain, member count, game profiles, submitted at, status
  - Actions: Approve, Reject (requires reason modal), Request Correction (message modal), Bulk Approve
  - Approve: transition to `APPROVED`, write `outbox_events` for Discord confirmation to captain
  - Reject: transition to `REJECTED` with reason, write `outbox_events` for notification

**Tests:**
- Concurrency: two teams submit the final registration slot simultaneously → exactly one succeeds, one gets "tournament full" error
- Unit: roster below minimum → validation error naming the minimum
- Unit: duplicate IGN in same tournament → specific error identifying which member and which existing registration has the conflict
- Integration: approve registration → `outbox_events` created → Discord DM queued for captain

**Demo:** Player registers a team through the website form. Admin sees the registration in the approval queue. Approving sends a Discord confirmation message to the captain.

---

#### Task 14: Multi-Match Scheduler

**Objective:** Bulk match generation, individual editing, rescheduling with cascade control, and scheduled job creation per match event.

**Implementation:**
- Bulk generation UI (wizard Step 3 + standalone match page):
  - Count selector: 1 / 2 / 3 / 4 / 6 / 8 / 10
  - First match date + time picker
  - Duration per match (minutes)
  - Gap between match end and next start (minutes)
  - Default map / mode selectors (game-specific options)
  - "Generate Preview" → shows timeline of all matches with calculated times before saving
  - "Confirm and Create" → `POST /api/servers/:guildId/tournaments/:id/matches/bulk`
- Bulk API:
  - Creates `matches` records with sequential numbers and calculated `scheduled_start` / `scheduled_end`
  - Creates `scheduled_jobs` for each match: `match:{id}:24h-reminder`, `match:{id}:15min-reminder`, `match:{id}:credential-release`, `match:{id}:result-deadline`
  - Creates corresponding BullMQ delayed jobs with matching job keys (idempotent)
- Individual match editing page: name, date, start time, end time, map, mode, stage assignment, result submission deadline, match-specific rule notes
- For COD Mobile: `match_segments` tab — add/remove maps within a Best-of-N series
- `PATCH /api/servers/:guildId/matches/:id/schedule`:
  - When time changes: modal "Shift subsequent matches to maintain gaps? [Shift] [Keep Fixed]"
  - If shift: recalculate all later match times maintaining original gap durations
  - **Always:** cancel old `scheduled_jobs` for that match (mark CANCELLED, remove BullMQ jobs by key), create new `scheduled_jobs` and BullMQ jobs
  - Write to `audit_logs` with old time, new time, cascade decision, actor
  - Conflict detection: warn with modal if two matches in same tournament now overlap (don't block, require explicit override)

**Tests:**
- Unit: bulk generate 4 matches, 30min duration, 10min gap → match times = [T, T+40, T+80, T+120]
- Unit: reschedule Match 2 forward 30min with cascade=true → Match 3 and 4 shift correctly
- Unit: reschedule Match 2 with cascade=false → Match 3 and 4 unchanged
- Unit: rescheduling cancels old `scheduled_jobs` keys and creates new ones with different keys
- Unit: overlap detection fires when Match 2 new end time > Match 3 start time

**Demo:** Admin generates 4 BGMI matches, sees the schedule preview timeline, reschedules Match 2 by 30 minutes, chooses to shift subsequent matches, and all times update correctly with a toast confirmation.

---

#### Task 15: Game-Specific Scoring Engines

**Objective:** Three pure, fully tested scoring modules — the mathematical heart of the platform.

**Implementation:**

`packages/game-rules/src/bgmi.ts`:
```typescript
defaultScoringConfig(): ScoringConfig          // Standard BGMI placement table
validateScoringConfig(config): ScoringConfig   // Zod parse + business rules
calculateMatchScore(params): number            // Placement pts + (kills × killValue) - penalties
calculateStandings(matches, rules): TeamStanding[]  // Sorted descending
applyTiebreakers(tied, rules): TeamStanding[]  // Total pts → kills → best placement → most wins
```

`packages/game-rules/src/free-fire.ts`:
- Battle Royale: identical structure to BGMI, fully independent config
- Clash Squad: `calculateSeriesResult(rounds, rules)` → `SeriesResult` with round win tracking and forfeit logic

`packages/game-rules/src/codm.ts`:
- Multiplayer: `calculateSeriesResult(maps, format, rules)` → `SeriesResult`, Best-of-N map win tracking
- Battle Royale: same structure as BGMI/FF BR

`packages/scoring/src/standings.ts`:
- `computeTournamentStandings(tournamentId, rules)` — loads approved `score_events`, calls correct game engine, returns final standings

**All engines are pure functions:**
- No database calls
- No side effects
- Always called with `tournament_rule_versions` snapshot, never live config
- Deterministic: same inputs always produce same output

**Tests:**
- BGMI: 16-team scenario, 4 matches, 3-way tie on total points → verify tie-breaker resolves via total kills, then best placement
- BGMI: penalty of -2 applied → score reduced correctly
- BGMI: zero-kill game → no kill points added, placement points still correct
- FF Clash Squad: 3-map series, forfeit on map 2 → series winner is non-forfeiting team with 1-0 record
- CODM Best-of-3: team wins maps 1 and 2 → series ends, map 3 not played
- CODM Best-of-5: 2-2 going into map 5 → map 5 played, winner takes series
- All engines: all teams tied on 0 points → ordering determined by tie-breakers without error

**Demo:** Calling `bgmi.calculateStandings()` with a prepared 4-match, 8-team dataset returns the correct standings array with all tie-breakers applied, verifiable by hand calculation.

---

#### Task 16: Result Submission and Approval Workflow

**Objective:** Full result lifecycle from submission through approval, dispute, and correction — with match state machine enforced at every step.

**Implementation:**
- Results admin page `/servers/[guildId]/admin/results`:
  - Tabs: Pending Review, Under Review, Approved, Open Disputes
  - Each row: match name, tournament, submitted by, submitted at, status, action button
- `POST /api/servers/:guildId/matches/:id/results`:
  - Authorization: registered captain of a team in this match, or REFEREE+
  - Validate: match must be in `AWAITING_RESULT` state
  - Validate scorecard structure against current game rules (placement count, kill non-negative, etc.)
  - Create `result_submission` (status: `PENDING_REVIEW`)
  - Transition match to `UNDER_REVIEW`
  - Write `outbox_events` for referee notification with submission summary
- `POST /api/servers/:guildId/matches/:id/approve` (REFEREE+):
  - Validate: match in `UNDER_REVIEW`
  - Run scoring engine using tournament's `rule_versions` snapshot
  - Create `score_events` records (one per team)
  - Transition match to `COMPLETED`
  - Trigger standings recalculation
  - Write `outbox_events` for result announcement embed
- Rejection (REFEREE+): transition back to `AWAITING_RESULT` with reason, write `outbox_events` notifying captain
- `POST /api/servers/:guildId/matches/:id/dispute` (PLAYER/REFEREE):
  - Creates `disputes` record with reason, evidence URL, raised_by
  - Transitions match to `DISPUTED`
  - Blocks tournament `finalize` endpoint while dispute is `OPEN`
- Correction flow (TOURNAMENT_MANAGER+):
  - Creates new `score_events` with `type: CORRECTION`, `correction_of: originalEventId`
  - Original `score_events` marked `status: SUPERSEDED`
  - Full standings recalculation triggered
  - Creates `outbox_events` with type `RESULT_CORRECTION` — clearly marked as a correction, not a silent rewrite

**Tests:**
- Integration: submit → approve → standings updated with correct points for all teams
- Integration: submit → dispute → resolve dispute → standings updated
- Unit: approve without REFEREE role → 403
- Unit: attempt correction without TOURNAMENT_MANAGER → 403
- Unit: attempt finalize with OPEN dispute → blocked with list of open disputes
- Unit: correction creates new `score_events`, original has `status: SUPERSEDED`
- Unit: correction triggers full standings recalculation

**Demo:** Referee approves a BGMI 4-team match result, standings update live on the public page. Opening a dispute blocks finalization and shows the dispute in the admin queue.

---

#### Task 17: Winner Finalization and Award System

**Objective:** Tournament finalization with locked immutable results, winner records, configurable award system, and prize fulfillment tracking.

**Implementation:**
- Finalization guard (checked before executing):
  - All matches in `COMPLETED` state (or `CANCELLED`/`FORFEIT`)
  - No `disputes` with `status: OPEN`
  - User has `TOURNAMENT_MANAGER` role
- `POST /api/servers/:guildId/tournaments/:id/finalize`:
  - Re-run full scoring engine against all approved `score_events` (authoritative recalculation)
  - Create `winner_records`: placement 1, 2, 3 with full team roster snapshots
  - Create `awards` records: MVP, top fragger, custom awards from tournament config
  - Set `tournament.results_locked = true` (blocks further result edits without explicit correction flow)
  - Transition tournament to `COMPLETED`
  - Write `outbox_events` with type `TOURNAMENT_COMPLETED` containing full winner data
- Public winner page `/servers/[guildId]/winners`:
  - Cinematic podium presentation for top 3
  - Full final scorecard (all matches, all teams)
  - Awards section
  - Share buttons
- Prize fulfillment tracking (independent of tournament status):
  - Admin updates `awards.fulfillment_status`: `PENDING → PROCESSING → FULFILLED / ON_HOLD`
  - Tournament being `COMPLETED` does not auto-fulfill prizes
- Post-finalization correction:
  - Creates new versioned `winner_records` (preserves original with `is_superseded: true`)
  - Write `outbox_events` with type `TOURNAMENT_CORRECTION` — clearly marked
  - Original announcement is not silently edited — correction notice posted separately

**Tests:**
- Unit: finalize with OPEN dispute → blocked, returns list of blocking disputes
- Unit: finalize with match still in `AWAITING_RESULT` → blocked, returns list of unresolved matches
- Unit: correction creates new `winner_records`, original has `is_superseded: true`
- Unit: `awards.fulfillment_status` can be `FULFILLED` while tournament is `COMPLETED` — transitions independent
- Unit: `awards.fulfillment_status` cannot be set to `FULFILLED` by non-SERVER_ADMIN
- Integration: finalize → `outbox_events` created → winner page shows correct champion and full scorecard

**Demo:** Manager finalizes tournament, Discord winner announcement appears with champion highlighted, public winner page renders with podium and full scorecard. Prize fulfillment status updated independently by admin.

---

### PHASE 4 — Discord Synchronization
**Goal: Reliable two-way sync — website and Discord always converge on the same state**

---

#### Task 18: Transactional Outbox and BullMQ Worker

**Objective:** The reliable synchronization backbone. Every Discord operation is delivered reliably with retries, rate limit respect, and automatic recovery after outages.

**Implementation in `apps/worker`:**
- BullMQ `Worker` connected to Upstash Redis, queue: `outbox-processor`
- Job processor (`processors/outbox.ts`):
  - Fetch `outbox_events` record by ID from database
  - Execute Discord API operation (post/edit/delete message, send ephemeral, DM)
  - Record Discord message ID in `discord_message_bindings`
  - Mark `outbox_events.status = DELIVERED`
  - On error: increment `retry_count`, use BullMQ `moveToFailed` with exponential backoff (1s, 2s, 4s, 8s, 16s)
  - After 5 failures: mark `FAILED`, write alert to `audit_logs`, write admin notification to `outbox_events`
- Rate limit middleware (wrapping Discord API client):
  - Read `X-RateLimit-Remaining` from every response
  - On 429: read `Retry-After` header, call BullMQ `moveToDelayed(retryAfterMs)` — never busy-retry
  - Track global rate limit bucket to prevent pre-emptive rate limiting
- Reconciliation job (BullMQ repeatable every 60 seconds):
  - `SELECT id FROM outbox_events WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '30 seconds'`
  - Re-enqueue each by ID as BullMQ job with `jobId = outbox_event.id` (idempotent — BullMQ ignores duplicate job IDs)
- Scheduled job processor (separate queue `scheduled-jobs`):
  - Fetch `scheduled_jobs` record by key
  - Validate job is still valid (match not cancelled, tournament not cancelled)
  - Execute action (send reminder, release credentials, expire order)
  - Mark job `COMPLETED`

**Tests:**
- Unit: process same `outbox_events` ID twice → exactly one Discord API call (BullMQ jobId idempotency)
- Unit: Discord API returns 429 with `Retry-After: 5` → job moves to delayed by 5000ms, not immediately retried
- Integration: create 3 outbox events while worker stopped → restart worker → all 3 delivered within 90 seconds
- Integration: 5 consecutive Discord API failures on one event → status = `FAILED`, admin alert created
- Integration: reconciliation job detects stale PENDING event → re-enqueues → delivered

**Demo:** Admin creates tournament on website. Within 3 seconds, Discord announcement appears in the configured channel. Admin panel integration badge shows "Synced" with green pulse.

---

#### Task 19: Core Discord Commands — Tournament Management

**Objective:** Full tournament command set operational in Discord, calling the exact same engine as the website.

**Implementation:**
- All commands import from `packages/tournament-engine` and call the same service functions as API routes — zero duplicate business logic
- All commands use the `packages/permissions` role resolver via `HasPermission` precondition

**Command implementations:**
- `/tournament create`: opens Step 1 as Discord Modal (name, game, mode), creates draft, posts button panel "Continue setup on website" + "Quick setup here" with step-by-step modals
- `/tournament edit [id]`: action panel embed with "Edit Name", "Edit Schedule", "Edit Capacity" buttons → each opens a modal → saves via API
- `/tournament publish [id]`: shows pre-publish checklist embed + "Confirm Publish" green button
- `/tournament cancel [id]`: reason modal + red "Confirm Cancel" button + confirmation of affected participants count
- `/tournament list`: paginated embed (5 per page) with status filter buttons, "Next Page" / "Prev Page" buttons
- `/tournament info [id]`: rich embed — banner image, game emoji, mode, dates, capacity bar (e.g. `████░░░░ 8/16`), "Register" button linking to website
- `/tournament participants [id]`: paginated embed with Approve / Reject buttons per registration (reject triggers reason modal)
- `/tournament standings [id]`: leaderboard embed with 🥇🥈🥉 for top 3, full table below, game emoji in title

**Tests:**
- Integration: `/tournament create` with valid modal data → tournament `DRAFT` record created → response embed with tournament ID
- Integration: user missing `TOURNAMENT_MANAGER` role → `HasPermission` precondition fires → warm, friendly error message with ❌ emoji
- Integration: `/tournament cancel` confirmation button → tournament cancelled → `audit_logs` created
- Integration: command run outside a guild (DM) → `GuildOnly` precondition fires with helpful message

**Demo:** Authorized Discord user runs `/tournament create`, completes the quick modal flow, tournament appears on the website immediately. User without permission gets a friendly, emoji-decorated error message — never a cold system error.

---

#### Task 20: Match Lifecycle Commands and Notification System

**Objective:** Full match command set, configurable scheduled notifications per match, persistent control panel, and private credential delivery.

**Implementation:**

**Match commands:**
- `/match schedule [tournament]`: embed with all upcoming matches, countdown timer (`<t:UNIX:R>` format), map/mode per match, check-in status
- `/match checkin [match]`: validates team registered and eligible, transitions team to checked-in, ephemeral success with emoji
- `/match room [match]`: validates: eligible team, credentials released, user is captain → returns credentials as **ephemeral message only** — never edits any public embed
- `/match result [match]`: modal with game-specific score fields (placements 1–16 for BR, map scores for CODM) + evidence screenshot URL
- `/match approve [match]`: shows submitted scorecard embed with Approve / Reject / Dispute buttons (referee only, confirmed by precondition)
- `/match dispute [match]`: modal for reason + evidence URL → creates dispute, confirms case opened

**Notification jobs (BullMQ scheduled, all job keys unique per match+type):**
- `match:{id}:24h-reminder` → general reminder embed to tournament announcement channel
- `match:{id}:15min-reminder` → captain ping, check-in reminder, match info embed
- `match:{id}:credential-release` → delivers room ID and password privately to each eligible, checked-in captain (ephemeral or configured DM)
- `match:{id}:result-deadline` → reminder to captains of matches still in `AWAITING_RESULT`

**Notification timing:** configurable in `server_settings.notification_config` (organizer can change 24h to 12h, 15min to 30min, etc.)

**Persistent Control Panel:**
- Pinned message in admin channel, updated by worker when any count changes
- Buttons: Live Events (count badge), Pending Results (count badge), Open Disputes (count badge), Upcoming Matches (count badge), Integration Health (status indicator)

**Tests:**
- Unit: `/match room` called in any channel → credentials returned as ephemeral, never posted to channel
- Unit: reschedule match → old `scheduled_jobs` keys cancelled + removed from BullMQ, new ones created with new keys
- Integration: 15min reminder job fires at `match_start - 15 minutes` (within 30 second tolerance)
- Integration: credential release job fires at `room_credentials.release_at`
- Integration: ineligible player requests room → 403 with clear explanation

**Demo:** A 3-match tournament sends correct reminders for each match. Room credentials delivered as ephemeral messages to eligible captains only. Control panel updates when a result is submitted.

---

#### Task 21: Real-Time Website Updates via Supabase Realtime

**Objective:** Website updates live when results are approved, match status changes, or standings shift — without page refresh.

**Implementation:**
- Worker, after delivering each Discord update, publishes a Supabase Realtime Broadcast:
  - Public channel `server:{guildId}:public` → standings updates, match status, tournament status changes
  - Private channel `server:{guildId}:admin` → registration changes, dispute updates, outbox health (requires valid Supabase JWT)
- React hooks in `apps/web/lib/realtime.ts`:
  - `useRealtimeTournament(tournamentId)` → subscribes, invalidates React Query cache on broadcast
  - `useRealtimeMatch(matchId)` → subscribes to match status events
  - `useRealtimeAdmin(guildId)` → admin events, requires REFEREE+ role (validated server-side)
- Broadcast payloads contain **only**: event type, record ID, new status — never sensitive field values
- Room credentials: **never broadcast** — always fetched on-demand via authenticated API call
- Integration status badge: polls `/api/servers/:guildId/sync-status` every 30 seconds (not Realtime — reduces Realtime message count)

**Tests:**
- Integration: approve result via API → standings React component re-renders without page refresh, within 3 seconds
- Unit: Realtime broadcast payload for standings update contains no `room_credentials` fields
- Unit: Realtime broadcast payload contains no pending `result_submissions` data
- Unit: private admin channel subscription rejected if user JWT is missing or expired
- Unit: public channel broadcast for a Server A event is not received by a Server B subscriber

**Demo:** Two browser windows open side by side. Admin approves a match result in Window 1. Standings table in Window 2 (viewer panel) updates within 2 seconds with animated rank change indicators — no page refresh.

---

### PHASE 5 — Analytics and Visual Polish
**Goal: Insightful analytics, visually spectacular UI, OBS overlay**

---

#### Task 22: Analytics System

**Objective:** Category-wise analytics dashboard with correct server isolation, comprehensive charts, and CSV export.

**Implementation:**
- Analytics repository in `packages/database/src/analytics.ts`:
  - Every query: `WHERE guild_id = :guildId` — absolute requirement, verified by tests
  - All 12 KPI metrics computed from actual database records (no estimates)
  - Game segmentation: separate indexed queries per game — never merged for competitive stats
  - Date range filtering applied consistently to **all** metrics using the same date boundaries
  - Optimized indexes used for all high-frequency analytics queries
- `/api/servers/:guildId/analytics`: Zod-validated filter params (game, mode, tournament, status, dateRange)
- Frontend at `/servers/[guildId]/admin/analytics`:
  - Sticky filter bar at top: game tabs + date range picker (7d / 30d / 90d / custom)
  - All charts update when filters change (React Query re-fetch)
  - Tabs: BGMI / Free Fire / COD Mobile / All Games
  - Chart inventory:
    - Registrations over time (Recharts LineChart)
    - Fill rate by tournament (BarChart)
    - Match completion rate (PieChart/donut)
    - Top 10 teams by points (HorizontalBarChart)
    - Most active players by registrations (Table with avatar)
    - Tournament format distribution (PieChart)
    - Reporting delay histogram (BarChart, x=hours, y=match count)
    - Points trend for top 5 teams over time (LineChart, one line per team)
  - All charts: dark theme, electric violet + cyan color palette, tooltips on hover, responsive containers
- CSV export endpoint returning `text/csv` with `Content-Disposition: attachment; filename="..."` — no JSON wrapper, no frontend conversion

**Tests:**
- Unit: analytics query with `guildId=serverA` returns zero records from `guildId=serverB` data
- Unit: filter `game=BGMI` correctly excludes Free Fire and COD Mobile tournament records
- Unit: date range filter applied consistently — all 12 KPIs use same date boundaries
- Unit: CSV export produces valid RFC 4180 CSV with correct headers
- Integration: changing date range filter → all KPIs update to reflect new period

**Demo:** Analytics dashboard shows game-segmented KPIs with animated charts. Switching between game tabs updates all metrics. Date range filter changes all charts simultaneously. CSV export downloads with correct headers and data.

---

#### Task 23: Premium UI Polish — 3D, Advanced CSS, Server Branding, OBS Overlay

**Objective:** The website is visually spectacular, performant, accessible, and branded per server. OBS overlay fully functional.

**Implementation:**

**Three.js scene enhancements:**
- Landing hero: enhanced particle field (800 particles with velocity trails), depth-of-field blur, bloom post-processing on accent geometry, game-specific color preset (violet for default, can shift to game colors)
- Winner page: cinematic 3D trophy on pedestal with rotating light rays, confetti particle system on load, particle count respects reduced-motion
- Match live page: subtle animated background geometry (very low-poly, barely visible — performance-first)
- All Three.js: `next/dynamic` with `ssr: false`, `Suspense` with skeleton fallback

**Advanced CSS techniques applied across the platform:**
```css
/* Animatable gradient using CSS @property */
@property --gradient-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }

/* Animated gradient border on glow buttons */
.glow-button {
  background: conic-gradient(from var(--gradient-angle), #7c3aed, #06b6d4, #7c3aed);
  animation: spin-gradient 3s linear infinite;
}

/* Card hover tilt (JS mouse tracking) */
.tilt-card { transform: perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry)); }

/* Clip-path polygon animation on hover */
.clip-hover { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
.clip-hover:hover { clip-path: polygon(2% 0, 100% 0, 98% 100%, 0 100%); }

/* Glass card (applied globally) */
.glass { backdrop-filter: blur(24px) saturate(180%); }
```

**Framer Motion additions:**
- `layoutId` transitions: tournament card in list → expands into detail view (shared element transition)
- Leaderboard rank changes: position swap animated via `layout` prop and `AnimatePresence`
- KPI cards: count-up animation on mount, color pulse on value change (red if degraded, green if improved)
- Page transitions: `AnimatePresence` on route change, 200ms cross-fade

**Interactive UI components:**
- Knockout bracket: interactive SVG with hover highlighting and animated progression lines connecting winners
- Team comparison modal: side-by-side animated stat bars
- Championship podium: stepped platform with height animation, confetti on 1st place reveal
- Battle Royale leaderboard dense mode: compact row height, animated rank change badges (▲/▼ with delta)

**Server branding system:**
- `server_settings.accent_color` injected as CSS custom property `--color-accent` on the server layout root
- `server_settings.logo_url` replaces platform logo in all server-scoped pages
- Color transitions smoothly when switching servers (CSS transition on custom property)

**OBS Stream Overlay (`/overlay/[guildId]/[tournamentId]?token=[token]`):**
- Read-only access token stored in `server_settings.overlay_token` (separate from all admin credentials)
- Renders with `background: transparent` for OBS browser source (1920×1080 optimized)
- Displays: live standings top 10, current match status, next match countdown, tournament name
- Auto-updates via Supabase Realtime public channel (no polling, minimal message usage)
- Token validation: 401 if missing, 403 if wrong server
- Never uses admin credentials or session tokens

**Tests:**
- Unit: overlay route without token → 401
- Unit: overlay route with Server B's token requesting Server A's data → 403
- Lighthouse Performance ≥ 80 on tournament detail page with Three.js loaded
- Lighthouse Accessibility ≥ 90 on all pages
- `prefers-reduced-motion`: Three.js scenes do not render, Framer Motion transitions are instant
- Unit: server branding from Server A does not appear in Server B's CSS custom properties

**Demo:** Platform looks like a premium esports product — glassmorphism cards, animated brackets, cinematic winner reveal, smooth page transitions. Streamer adds `/overlay/...` as an OBS browser source and live standings update in real time over a transparent background.

---

### PHASE 6 — Payment Scaffold
**Goal: Complete payment architecture built, tested, and safely disabled until legal clearance**

---

#### Task 24: Payment Module — Scaffold with Feature Flag

**Objective:** Complete payment data model, order flow, webhook handler, and admin operations — all behind `PAYMENTS_ENABLED=false`. Free tournaments are completely unaffected.

**Implementation:**
- `packages/payments/src/index.ts`: feature flag check as the **first line** of every exported function
  ```typescript
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    throw new PaymentsDisabledError('Payment module is disabled pending legal review.')
  }
  ```
- `POST /api/servers/:guildId/orders` (when enabled):
  - Validate tournament `entry_type === 'PAID'` and `PAYMENTS_ENABLED`
  - Atomic slot reservation: `BEGIN TRANSACTION → SELECT capacity FOR UPDATE → check open_slots > 0 → INSERT order (status: pending, expires_at: now+15min) → COMMIT`
  - Return Razorpay `order_id` to client
  - BullMQ delayed job created with key `order:{orderId}:expiry` at `expires_at`
- `POST /api/payments/webhooks/razorpay` (signature-verified, no auth):
  - Step 1: verify `X-Razorpay-Signature` HMAC-SHA256 → 400 + log on failure
  - Step 2: idempotency check → if `payment_events.provider_event_id` exists → return 200, skip
  - Step 3: compare `event.payment.amount` and `event.payment.currency` against stored order
  - Step 4: transition order status per event type (`payment.captured` → `paid`, `payment.failed` → `failed`)
  - Step 5: on `paid`: activate registration, write confirmation `outbox_events`
  - All steps in a database transaction
- Expiry job processor: if order still `pending` at `expires_at` → `expired`, release reserved slot (decrement `accepted_count`)
- Admin page at `/servers/[guildId]/admin/payments`:
  - Collections table: paid orders with team, amount, date, provider ref
  - Pending orders with time-to-expiry countdowns
  - Failed payments with reason
  - Refund management: approve refund request → `refund_pending` → provider confirms → `refunded`
  - CSV export for all payment records
- India legal notice: persistent amber banner on payment settings page and on "Paid" entry type hover in wizard, with link to official guidance

**Tests:**
- Unit: `PAYMENTS_ENABLED=false` → every `packages/payments` export throws `PaymentsDisabledError`
- Unit: identical webhook delivered twice → exactly one order update, one `payment_events` record (idempotency)
- Concurrency: two teams simultaneously order the last available slot → one `paid`, one `expired`
- Unit: webhook with invalid HMAC signature → 400, zero database writes
- Unit: webhook `amount` different from stored order `amount` → order not activated, alert created
- Unit: expiry job runs on pending order → `expired` status, `accepted_count` decremented by 1
- Integration: complete test payment flow (Razorpay test mode) → registration activated → admin sees team in participant list

**Demo:** In test environment with `PAYMENTS_ENABLED=true` and Razorpay test keys, team captain completes a test payment (card number 4111...), receives Discord confirmation, appears as approved in participant list. Submitting the same webhook twice does not create a duplicate activation.

---

### PHASE 7 — Hardening and Release
**Goal: Production-ready — fully tested, monitored, deployed, and documented**

---

#### Task 25: Comprehensive Test Suite

**Objective:** All acceptance criteria from Section 16 automated as integration and E2E tests. No critical path untested.

**Integration tests (Vitest + Prisma test client on isolated test database):**

| Test | Assertion |
|------|-----------|
| Server isolation — read | User with Server A session cannot read Server B's tournaments via any API route |
| Server isolation — write | Server A admin attempting Server B admin endpoint → 403 (not 404) |
| Concurrent registration | 2 teams claim last slot simultaneously → exactly 1 succeeds, 1 gets full error |
| Concurrent result approval | 2 referees approve conflicting results → state machine rejects the second |
| Worker recovery | 5 outbox events created during worker downtime → all delivered within 90s after restart |
| Rate limit handling | Discord mock returns 429 → job delayed by Retry-After, not immediately retried |
| Tied standings | 3-way tie → tie-breaker policy applied in configured order, deterministic result |
| Result correction | Authorized correction → original `score_events` preserved, new correction record created |
| Tournament cancellation | Cancelled tournament → registrations preserved, audit entries present |
| Public API privacy | Public tournament endpoint → no `room_credentials`, no pending submissions, no unapproved registrations |
| Room credential access | Player requests another team's room → 403 |
| Finalization guard | Finalize with open dispute → blocked with dispute list |
| Finalization guard | Finalize with incomplete matches → blocked with match list |
| Payment idempotency | Same Razorpay webhook delivered twice → one `payment_events` record |
| Payment concurrent | 2 teams order last slot → 1 paid, 1 expired |

**E2E tests (Playwright against local dev server):**
- Full tournament lifecycle: create on website (Steps 1–6) → edit name via Discord `/tournament edit` → register team → generate 4 BGMI matches → submit all results → approve all results → finalize → winner page shows correct champion with correct scorecard
- Cross-server access: authenticated user manually navigates to another server's admin URL → 403 page, not admin panel
- Registration flow: player registers team → admin approves → player receives Discord confirmation
- Multi-match rescheduling: reschedule Match 2 → confirm cascade → all subsequent matches shifted → no stale notification jobs

**Load tests:**
- 50 concurrent registrations for a tournament with 32 slots → exactly 32 succeed, 18 receive full/waitlist response
- 20 concurrent result submissions for the same match in `AWAITING_RESULT` → exactly 1 accepted, 19 rejected with state machine error

**Tests:**
- `pnpm test` from root → all unit + integration tests pass
- `pnpm test:e2e` → all Playwright tests pass
- Coverage ≥ 80% on `packages/tournament-engine`, `packages/scoring`, `packages/permissions`
- Zero TypeScript errors in strict mode

**Demo:** `pnpm test` runs the full suite in under 3 minutes and all tests pass with coverage report generated.

---

#### Task 26: Deployment, Monitoring, and Operations Runbook

**Objective:** Production deployment live on Vercel + Render, monitoring configured, operations runbook complete.

**Implementation:**
- `vercel.json`: Next.js config, ISR settings, function timeout for API routes (30s max)
- `render.yaml`: two background worker service definitions:
  - `discord-bot`: `cd apps/discord-bot && node dist/index.js`, env refs
  - `worker`: `cd apps/worker && node dist/index.js`, env refs
  - Both: `autoDeploy: true`, `envVars` referencing Render environment groups
- Sentry setup in all three apps:
  - `apps/web`: `@sentry/nextjs` with `sentry.server.config.ts` and `sentry.client.config.ts`
  - `apps/discord-bot`: `@sentry/node` wrapping the Sapphire client
  - `apps/worker`: `@sentry/node` wrapping BullMQ workers
  - Source maps uploaded on every deploy
- `/api/health` endpoint:
  ```typescript
  {
    status: 'ok' | 'degraded' | 'down',
    checks: {
      database: 'ok' | 'error',   // SELECT 1
      redis: 'ok' | 'error',      // PING
      outboxBacklog: number,       // PENDING events > 2 min old
    },
    timestamp: string
  }
  ```
- Sentry alert rules:
  - Failed outbox events: > 5 in any 10-minute window → alert
  - Scheduled jobs overdue: any job > 5 minutes past `scheduled_for` → alert
  - Discord API error rate: > 10 errors/minute → alert
  - Worker process crash (Sentry crash report) → immediate alert
- Database index migration covering all high-frequency analytics and admin queries
- `docs/operations-runbook.md` covering:
  - Step-by-step deployment: web (Vercel), bot (Render), worker (Render), database (Supabase)
  - Rollback procedure (Vercel instant rollback, Render previous deploy)
  - Re-enqueue failed outbox events: `UPDATE outbox_events SET status='PENDING', retry_count=0 WHERE status='FAILED' AND id = $1`
  - Manually release room credentials when automated delivery fails
  - Discord rate limit incident response
  - Restore Supabase backup to new project
  - Rotate Discord bot token (update Render env var, redeploy bot service)
  - Alert response playbook (which alert → which runbook section)

**Tests:**
- Deploy to Vercel preview and Render staging environments
- Run full E2E Playwright suite against staging URLs
- Simulate worker restart: stop Render worker → create 3 outbox events → restart → verify all 3 delivered within 2 minutes
- Health endpoint: with database connected → `{ status: 'ok' }` with all checks passing
- Health endpoint: with Redis unavailable → `{ status: 'degraded' }` with Redis check `'error'`

**Demo:** Platform is live on production Vercel URL and Render services. Health endpoint is green. End-to-end tournament runs in production from either Discord or website. Operations runbook is complete and readable.

---

## 16. Acceptance Criteria

Before public launch, every one of these must pass as an automated or manual test:

| # | Test | Expected Result |
|---|------|----------------|
| 1 | User selects Server A | Only Server A's authorized data returned |
| 2 | User attempts Server B admin endpoint directly | Backend returns 403 — access denied |
| 3 | Admin creates tournament on website | One DB record created + one Discord announcement posted |
| 4 | Admin edits tournament from Discord | Website reflects change + audit log entry created |
| 5 | Two teams claim final registration slot simultaneously | Exactly one succeeds |
| 6 | Worker restarts mid-operation | Outbox events recover without duplicate Discord posts |
| 7 | Discord rate-limits the bot (429) | Retries using the API-specified `Retry-After` delay |
| 8 | Two referees attempt conflicting result approvals | State machine rejects the second attempt |
| 9 | Player requests another team's room credentials | 403 denied — no credential data returned |
| 10 | Final standings have a three-way tie | Saved tie-breaker policy applied in correct order |
| 11 | Completed result needs post-finalization correction | Correction authorized, original records preserved, correction notice posted |
| 12 | Tournament is cancelled | Registrations and audit entries preserved — no hard deletes |
| 13 | Unauthenticated viewer opens public tournament page | Only publicly permitted fields returned — no credentials, no pending data |
| 14 | 50 concurrent registrations for 32-slot tournament | Exactly 32 succeed — database atomicity holds |
| 15 | Backup is restored to a new Supabase project | All records intact, application functions correctly |

---

## 17. Bot Personality & UX Guidelines

### Core Personality
The bot is a **knowledgeable, warm, esports-native teammate** — not a cold system bot. It knows the competitive scene, speaks the language of mobile gaming, and makes every server feel like it has a dedicated tournament organizer who actually cares.

### Tone Rules
- Warm, professional, encouraging — like a senior player who also manages events
- Uses esports terminology naturally: GG, clutch, squad, drop zone, frag, zone, placement
- Celebrates player milestones and tournament moments genuinely
- Clear and direct — no walls of text, no jargon overload
- Error messages explain exactly what went wrong and what to do next
- Never robotic, template-spammy, or passive-aggressive on errors
- Never exposes internal error codes, stack traces, or database errors to users

### Custom Emoji System
All emoji IDs defined in `apps/discord-bot/src/utils/emojis.ts`. Upload these to the bot's application emoji page on the Discord Developer Portal:

```typescript
export const EMOJIS = {
  // Status
  live:       '<:live:ID>',        // 🔴 pulsing red dot
  upcoming:   '<:upcoming:ID>',    // 🕐 clock
  completed:  '<:completed:ID>',   // ✅ check
  cancelled:  '<:cancelled:ID>',   // ❌ cross
  draft:      '<:draft:ID>',       // 📝 pencil
  // Actions
  register:   '<:register:ID>',    // ✍️ register
  checkin:    '<:checkin:ID>',     // ☑️ check-in
  results:    '<:results:ID>',     // 📊 chart
  dispute:    '<:dispute:ID>',     // ⚠️ alert
  room:       '<:room:ID>',        // 🔑 key
  // Games
  bgmi:       '<:bgmi:ID>',        // BGMI logo
  freeFire:   '<:freefire:ID>',    // Free Fire logo
  codm:       '<:codm:ID>',        // COD Mobile logo
  // Celebration
  trophy:     '<:trophy:ID>',      // 🏆 gold trophy
  crown:      '<:crown:ID>',       // 👑 crown
  fire:       '<:fire_:ID>',       // 🔥 fire
  lightning:  '<:lightning:ID>',   // ⚡ lightning
  // Awards
  gold:       '<:gold:ID>',        // 🥇 first place
  silver:     '<:silver:ID>',      // 🥈 second place
  bronze:     '<:bronze:ID>',      // 🥉 third place
  mvp:        '<:mvp:ID>',         // 🌟 MVP star
  // System
  loading:    '<a:loading:ID>',    // animated spinner
  success:    '<:success_:ID>',    // ✅ green check
  error:      '<:error_:ID>',      // ❌ red cross
  warning:    '<:warning_:ID>',    // ⚠️ amber warning
  sync:       '<a:sync:ID>',       // animated sync arrows
  bot:        '<:bot:ID>',         // bot logo
}
```

### Bot Join Welcome Message
```
{bot} Hey {serverName}! Your new tournament companion has arrived.

I'm here to help you run epic {bgmi} {freeFire} {codm} tournaments right from Discord.
Registrations, match scheduling, live standings, room credentials, and winner
announcements — all managed here without leaving your community.

{lightning} **Get started:** Use /server setup to configure your channels and roles.
{trophy} **First tournament:** Create one with /tournament create whenever you're ready.

If you have questions, /help has you covered.
Let's build something great together. {fire}
```

### Personality Response Templates (`apps/discord-bot/src/utils/responses.ts`)

**Success responses:**
```typescript
success(title, desc)       // Green embed, {success} emoji, clear confirmation
created(type, name)        // "{success} **{name}** is live! Here's what you can do next..."
updated(field)             // "{success} Got it — {field} updated successfully."
registered(teamName)       // "{register} **{teamName}** is registered! The admin will review shortly."
approved(teamName)         // "{success} **{teamName}** — approved and confirmed! {fire}"
```

**Error responses:**
```typescript
permissionDenied()         // "{error} You don't have permission for that. Ask a server admin to update your role in /server setup."
notFound(type)             // "{warning} Couldn't find that {type}. Double-check the ID and try again."
tournamentFull()           // "{warning} This tournament is full! You've been added to the waitlist if it's enabled."
matchNotReady(state)       // "{warning} This match isn't ready for that yet — it's currently **{state}**."
genericError()             // "{error} Something went sideways on our end. Our team's been notified. Try again in a moment!"
maintenanceMode()          // "{loading} We're doing a quick update. Be back in a few minutes!"
```

**Informational:**
```typescript
loading()                  // "{loading} On it..." (ephemeral, replaced immediately)
noResults()                // "{upcoming} Nothing here yet — check back soon or ask an admin!"
tournamentInfo(t)          // Rich embed with all tournament details and action buttons
standingsHeader(game)      // "{bgmi} **BGMI Standings** — Updated just now"
```

### Embed Design Consistency
- **All tournament embeds:** dark background `#0a0a0f`, violet (`#7c3aed`) left-side color bar, game emoji in title, game-specific thumbnail
- **Status indicators:** `{live}` for active, `{upcoming}` for scheduled, `{completed}` for done
- **Timestamps:** always use Discord's `<t:UNIX:R>` (relative) for upcoming events, `<t:UNIX:f>` (full) for past
- **Standings:** `{gold}` `{silver}` `{bronze}` for top 3, then numbered list below
- **Capacity bar:** Unicode blocks e.g. `████████░░ 8/10 teams`
- **Footer:** always `Legendary Esports • {serverName} • {bot}`
- **Ephemeral delivery:** all sensitive info (room credentials, rejection reasons) delivered as ephemeral only

---

## 18. Website Visual Specification

### Color System
```css
:root {
  /* Backgrounds */
  --color-bg-primary:      #0a0a0f;   /* Obsidian — page background */
  --color-bg-secondary:    #1a1a2e;   /* Graphite — sidebar, header */
  --color-bg-card:         #16213e;   /* Deep violet — cards, panels */
  --color-bg-elevated:     #1e2a4a;   /* Elevated surfaces */

  /* Accents (overridden per server via inline style) */
  --color-accent:          #7c3aed;   /* Electric violet */
  --color-accent-glow:     #9f5bff;   /* Glow variant */
  --color-accent-2:        #06b6d4;   /* Cyan */
  --color-accent-2-glow:   #22d3ee;   /* Cyan glow */

  /* Text */
  --color-text-primary:    #f8fafc;
  --color-text-secondary:  #94a3b8;
  --color-text-muted:      #64748b;

  /* Borders */
  --color-border:          rgba(255, 255, 255, 0.08);
  --color-border-accent:   rgba(124, 58, 237, 0.30);
  --color-border-hover:    rgba(124, 58, 237, 0.50);

  /* Status colors */
  --color-live:            #ef4444;   /* Red — live matches */
  --color-success:         #22c55e;   /* Green — completed, approved */
  --color-warning:         #f59e0b;   /* Amber — pending, check-in */
  --color-danger:          #ef4444;   /* Red — disputes, errors */
}
```

### Typography
| Usage | Font | Weight | Style |
|-------|------|--------|-------|
| Page headings, tournament names | Orbitron | 900 | uppercase, wide tracking |
| Section headers | Orbitron | 700 | sentence case |
| Body text, descriptions | Inter | 400 | normal |
| Labels, buttons, nav | Inter | 500 | normal |
| Table headers | Inter | 600 | uppercase, tight tracking |
| Player IDs, match codes | JetBrains Mono | 400 | normal |

### Glass Card System
```css
.glass-card {
  background: rgba(22, 33, 62, 0.60);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(124, 58, 237, 0.15),   /* inner accent ring */
    0 4px 24px rgba(0, 0, 0, 0.40),        /* depth shadow */
    0 1px 2px rgba(0, 0, 0, 0.60),         /* base shadow */
    inset 0 1px 0 rgba(255, 255, 255, 0.05); /* top edge highlight */
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.glass-card:hover {
  border-color: rgba(124, 58, 237, 0.40);
  box-shadow:
    0 0 0 1px rgba(124, 58, 237, 0.30),
    0 8px 40px rgba(124, 58, 237, 0.15),   /* violet glow on hover */
    0 2px 4px rgba(0, 0, 0, 0.60),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}
```

### Three.js Scene Inventory
| Scene | Route | Description | Performance Budget |
|-------|-------|-------------|-------------------|
| Hero emblem | `/` | Rotating icosahedron, 800 particles, violet+cyan lights, bloom, DoF | < 5ms/frame |
| Server cards | `/servers` | Subtle floating low-poly shapes, non-interactive | < 2ms/frame |
| Winner reveal | `/winners` | 3D trophy, confetti particles, light rays | < 8ms/frame on reveal |
| OBS overlay | `/overlay/*` | Minimal, transparent, no post-processing | < 1ms/frame |

All Three.js: loaded via `next/dynamic` with `ssr: false`. Hidden entirely when `prefers-reduced-motion: reduce` detected. Skeleton shown during load.

### Motion Design
| Interaction | Duration | Easing | Properties |
|-------------|----------|--------|-----------|
| Page entry | 300ms | ease-out | opacity 0→1, translateY 20→0 |
| Card hover | 150ms | ease | translateY -2px, box-shadow glow |
| Page transitions | 200ms | ease | opacity cross-fade |
| Leaderboard reorder | 400ms | ease-in-out | layout animation (Framer Motion) |
| Status badge change | 200ms | ease | color, box-shadow pulse |
| KPI count-up | 1200ms | ease-out | number animation |
| Skeleton shimmer | 1500ms | ease-in-out | background-position (infinite) |
| Live pulse | 2000ms | ease-in-out | opacity 0.5→1 (infinite) |

### Responsive Breakpoints
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, bottom navigation bar, horizontal-scroll tables with sticky first column |
| Tablet | 768–1024px | Two columns, collapsible sidebar (icon only when collapsed) |
| Desktop | > 1024px | Full three-column layout, fixed expanded sidebar |
| Wide | > 1440px | Max-width container, side margins increase |

### Performance Requirements
- Lighthouse Performance ≥ 80 on all pages
- Lighthouse Accessibility ≥ 90 on all pages
- Three.js dynamically imported — never in initial bundle
- All images via `next/image` with WebP + AVIF, `sizes` attribute set correctly
- All fonts loaded via `next/font` (zero FOUT, zero CLS from fonts)
- `prefers-reduced-motion`: all JS animations disabled, Three.js scenes hidden, CSS transitions set to `0s`
- CLS < 0.1 on all pages

---

## Implementation Order Summary

| Phase | Focus | Key Deliverable |
|-------|-------|----------------|
| 1 | Foundation | Auth, DB schema, bot skeleton, 3D landing page, server selector, tenant auth |
| 2 | Website Panels | Viewer panel, admin shell, tournament list, creation wizard (all 6 steps) |
| 3 | Tournament Engine | Registration, multi-match scheduler, scoring engines, results, winner finalization |
| 4 | Discord Sync | Outbox worker, all commands, notification system, Realtime live updates |
| 5 | Analytics + Polish | Game-segmented analytics, 3D polish, server branding, OBS overlay |
| 6 | Payments | Order flow, webhook handler, admin ops, expiry jobs (disabled by default) |
| 7 | Hardening | Full test suite, production deployment, monitoring, operations runbook |

---

## Critical Non-Negotiables

Every one of these must be true before the platform goes live:

1. **Every API query** includes `guild_id` in the WHERE clause — no exceptions, no routes skipped
2. **Room credentials** are never in public embeds, never in Realtime broadcast payloads, never in public API responses — ephemeral delivery only
3. **Payment module** stays at `PAYMENTS_ENABLED=false` in production until qualified legal review is complete
4. **Audit logs** written for every state change on tournaments, registrations, results, and server settings
5. **State machines** enforced at the database transaction level — UI validation is UX, not security
6. **Idempotent operations** — every BullMQ job has a unique key, every payment webhook has a deduplication check using `provider_event_id`
7. **Two-layer permissions** — UI hides controls the user cannot access (UX); API verifies permissions on every request (security)
8. **Worker restarts safely** — reconciliation job recovers all missed outbox events within 90 seconds
9. **`prefers-reduced-motion`** — all JavaScript animations, Three.js scenes, and CSS transitions are disabled for accessibility compliance
10. **India legal notice** is visible on all paid tournament configuration screens with link to official guidance
11. **Server owner always has `SERVER_ADMIN`** — ownership is checked against `guild.owner_id` from Discord on every request, bypasses `server_role_bindings`, and can never be revoked by other admins
12. **Admin access is explicit** — no Discord member (other than the server owner) can access the admin panel unless the server owner has mapped their Discord role to an app role in Staff Management — default is `VIEWER`
13. **Role resolution is live** — app roles are never cached on the session; they are re-resolved from Discord API on every request so role removals take effect immediately

---

*This document is the authoritative implementation plan for the Legendary Esports Tournament Platform.*
*All 26 tasks build on previous tasks — no orphaned code, no dead ends.*
*Every task ends with a demo-able, working, testable increment.*
*When implementation begins, work through phases in order. Do not skip tasks.*


---

## 19. Tournament Delay & Re-Registration

### Tournament Delay

A tournament organizer (TOURNAMENT_MANAGER+) can delay a tournament that has not yet started. This is separate from rescheduling individual matches.

**How it works:**
- Organizer clicks "Delay Tournament" in the admin panel or runs `/tournament delay [id]` in Discord
- A modal asks for: new start date/time, reason for delay
- The system recalculates **all match times** (maintaining original gaps) based on the new start time
- All `scheduled_jobs` for the tournament (reminders, room releases, check-in open/close) are cancelled and recreated with new times
- An `outbox_events` record is created to post a delay announcement in the configured announcement channel
- All registered team captains receive a DM notification about the delay (see Section 20)
- Delay is written to `audit_logs` with old start time, new start time, actor, and reason

**Delay rules:**
- A tournament can only be delayed while in `DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, or `CHECK_IN` status
- A tournament that is already `LIVE` cannot be delayed — individual matches can be postponed instead
- Maximum delay is 90 days from the original start date (configurable in `server_settings`)
- Every delay is recorded — organizers cannot silently move tournaments without a traceable reason

**Bot command:**
```
/tournament delay [id]
→ Opens modal: New Start Date | New Start Time | Reason
→ Confirmation embed showing old vs new schedule
→ "Confirm Delay" button
```

**Website:**
- "Delay Tournament" button in the tournament management page (shown when tournament is in a delayable state)
- Side-by-side preview: current schedule vs new schedule before confirming

---

### Re-Registration (Open More Slots)

After a tournament's registration closes, the organizer can reopen registration to fill remaining slots or add capacity.

**When this applies:**
- Slots are unfilled after registration deadline
- A registered team was disqualified and their slot is now empty
- Organizer wants to increase total team capacity

**How it works:**
1. Organizer clicks "Reopen Registration" in admin panel or runs `/tournament reopen [id]`
2. A modal asks for: new registration deadline, optional additional slot count, reason
3. Tournament status transitions: `REGISTRATION_CLOSED → REGISTRATION_OPEN`
4. All new `scheduled_jobs` for the new deadline are created
5. `outbox_events` posts a re-registration announcement in the announcement channel
6. New registrations use the same approval flow and format templates as the original registration

**Re-registration rules:**
- Only available when tournament is `REGISTRATION_CLOSED` or `CHECK_IN` (before matches start)
- Cannot reopen registration once the tournament is `LIVE`
- Re-registration announcement clearly states "Registration Reopened — X slots available" to avoid confusion with the original announcement
- All existing approved registrations are unaffected

**Database:**
- Add `registration_phase` field to `tournaments` to track `FIRST_OPEN`, `REOPENED`, `CLOSED`
- Each registration record has a `phase` field to identify which opening it came from

---

## 20. Player DM Notification System

Every registered and eligible player receives direct DM notifications at key tournament milestones. This is a first-class feature — not optional noise.

### Notification Schedule (per tournament, per player)

All times are relative to the **tournament's first match start time** (or check-in open time where specified), calculated in the **server's configured timezone**.

| Trigger | When | Who Receives |
|---------|------|-------------|
| Registration approved | Immediately on approval | Captain only |
| Registration reopened | Immediately | All registered captains + server announcement |
| Tournament delayed | Immediately | All registered captains |
| Tournament cancelled | Immediately | All registered captains |
| **24 hours before tournament** | Match start - 24h | All registered players (entire roster) |
| **30 minutes before tournament** | Match start - 30min | All registered players (entire roster) |
| **5 minutes before tournament** | Match start - 5min | All registered players (entire roster) |
| Check-in opens | Check-in open time | All registered captains |
| Check-in reminder | Check-in close - 15min | Captains who haven't checked in |
| Room credentials released | At `room_credentials.release_at` | Captains of checked-in teams (ephemeral) |
| Match result submitted | Immediately | Assigned referee |
| Match result approved | Immediately | Captain of affected team |
| Dispute opened | Immediately | Assigned referee + both captains |
| Tournament finalized | Immediately | All registered players |

### DM Message Format

**24-hour reminder:**
```
{lightning} Tournament Reminder — 24 Hours to Go!

{bgmi} **[Tournament Name]**
Server: [Server Name]
Start Time: <t:UNIX:F> (<t:UNIX:R>)
Your Team: **[Team Name]**

Make sure your squad is ready. Check in on time — 
late check-ins will forfeit your slot! {fire}

[View Tournament] → [website link]
```

**30-minute reminder:**
```
{fire} 30 Minutes — Game On Soon!

{bgmi} **[Tournament Name]** is starting in 30 minutes.
Your Team: **[Team Name]**
Start: <t:UNIX:R>

Get your squad online now. Check-in closes soon. {lightning}
```

**5-minute reminder:**
```
{crown} 5 MINUTES — LOCK IN!

**[Tournament Name]** starts in 5 minutes.
Squad up, check your gear, stay in the lobby.

See you in the drop zone. GG! {trophy}
```

### DM Delivery Implementation

- DM notifications are BullMQ scheduled jobs stored in `scheduled_jobs` per player per tournament
- Job key format: `dm:{userId}:{tournamentId}:{type}` (e.g. `dm:123456:789:24h`)
- On tournament delay: all DM jobs cancelled by key, new ones created with updated times
- On tournament cancellation: all pending DM jobs cancelled
- If a player has DMs disabled: the failure is logged, an in-server mention fallback is attempted in the configured announcement channel, admin is not alerted (DM failure is normal Discord behavior)
- DMs are sent per-player, not per-team — every roster member gets them individually
- Rate limiting respected: BullMQ jobs are spread across time, not blasted simultaneously for large tournaments

### Notification Timing Storage

Each `scheduled_jobs` record for a DM contains:
- `user_id` (Discord)
- `tournament_id`
- `notification_type` (24h / 30min / 5min / checkin_reminder / etc.)
- `scheduled_for` (UTC timestamp)
- `payload_json` (full message content, pre-rendered at job creation time)
- `status` (PENDING / DELIVERED / FAILED / CANCELLED)

Timings are configurable per server in `server_settings.dm_notification_config`:
```json
{
  "advance_1": { "hours": 24, "enabled": true },
  "advance_2": { "minutes": 30, "enabled": true },
  "advance_3": { "minutes": 5, "enabled": true },
  "checkin_reminder": { "minutes_before_close": 15, "enabled": true }
}
```

---

## 21. Tournament Lifecycle & Auto-Archive

### Design Decision: Archive, Not Delete

Completed tournaments are **archived**, not hard-deleted. Here is why this matters:

- Payment records must be retained for financial accountability (legal requirement)
- Winner logs are meaningless without the match records that prove them
- Disputes can surface days after a tournament ends
- Analytics become useless if the underlying data disappears

**What "archive" means in practice:**
- Tournament status transitions to `ARCHIVED`
- All tournament records remain in the database but are excluded from active queries by default
- Evidence files (screenshots) in Supabase Storage are **deleted** to free storage space
- Match score values, result submissions, registration data, and audit logs are kept
- Archived tournaments are filterable in the admin panel but hidden from public pages

**Storage savings from archiving evidence files:**
- The bulk of storage usage is Supabase Storage (screenshots, banners)
- Deleting evidence files from `ARCHIVED` tournaments frees the most space
- Keeping only score numbers and winner records takes under 10KB per tournament
- This means 500MB Supabase free tier can hold thousands of archived tournaments

### Auto-Archive Schedule

A BullMQ repeatable job runs daily at 03:00 UTC:
- Find all tournaments with `status = COMPLETED` and `completed_at < NOW() - INTERVAL '7 days'`
- Transition them to `ARCHIVED`
- Delete their evidence files from Supabase Storage
- Write `audit_logs` entry: `action: AUTO_ARCHIVED`

The 7-day window gives organizers time to raise post-tournament corrections before archival locks the evidence files.

### What Is Permanently Kept (Never Deleted)

| Data | Reason |
|------|--------|
| `winner_records` | Platform achievement history |
| `awards` | Award history per player |
| `score_events` | Proof of final standings |
| `audit_logs` | Regulatory and dispute record |
| `payment_events` | Financial record (never delete) |
| `orders` | Financial record (never delete) |
| `registrations` | Participation history |
| `discord_servers` | Server identity |

### What Is Deleted on Archive

| Data | When Deleted |
|------|-------------|
| Evidence files (Supabase Storage) | On archive (7 days after completion) |
| `room_credentials` | On archive |
| Bot/host can also trigger manual archive | Immediately after confirming |

### Draft Tournament Auto-Expiry (30-Day Rule)

A tournament draft that is never published wastes a slot in the system and confuses admins.

**Rule:** Any tournament with `status = DRAFT` and `created_at < NOW() - INTERVAL '30 days'` is automatically deleted (hard delete — it has no registrations, no results, no financial records).

**Warning at creation time:**

When an organizer starts the creation wizard, a persistent banner appears on every wizard step:
```
⚠️ Publish Warning: This tournament must be published within 30 days of creation
or it will be permanently deleted. Drafts do not count as published tournaments.
```

**Implementation:**
- BullMQ repeatable job runs daily at 04:00 UTC
- Finds `status = DRAFT` tournaments older than 30 days
- Writes `outbox_events` for a DM warning to the organizer: "Your tournament draft **[Name]** will be deleted in 3 days if not published."
- Warning sent at Day 27 (3 days before deletion)
- Hard deletes the draft at Day 30
- Writes `audit_logs`: `action: DRAFT_EXPIRED`

**Organizer can disable the 30-day expiry** for a specific draft by clicking "Extend Draft" in the admin panel — extends by 30 more days, maximum 3 extensions (90 days total).

---

## 22. Timezone-First Setup

### Why This Matters for an International Bot

When the bot joins a new server, **the very first thing it does** is ask the server owner to configure their timezone. Every tournament time, every scheduled notification, every check-in window, and every countdown in Discord embeds is calculated using this timezone.

If the server runs BGMI tournaments for Indian players, times are shown in IST. If it runs COD Mobile tournaments for players in the Philippines, times are shown in PHT. The bot handles the UTC storage and display conversion automatically.

### First-Join Timezone Flow

When the bot joins a server for the first time:

1. Bot posts a welcome embed in the system channel (see Section 17 for full message)
2. **Immediately below the welcome message**, a timezone setup prompt:

```
{lightning} One quick thing before we start!

What timezone does your server run tournaments in?
This affects all match times, reminders, and announcements.

[Select Timezone ▾]    ← Discord select menu
```

3. The select menu shows grouped timezone options:
   - **Asia** — IST (India), PKT (Pakistan), SGT (Singapore), PHT (Philippines), JST (Japan), CST (China), KST (Korea), +18 more
   - **Europe** — CET, GMT, BST, +10 more
   - **Americas** — EST, PST, CST, BRT, +10 more
   - **Middle East / Africa** — GST, EAT, +8 more
   - **Oceania** — AEST, NZST, +5 more

4. Owner selects their timezone → saved to `server_settings.timezone`
5. Bot confirms: "✅ Timezone set to **Asia/Kolkata (IST, UTC+5:30)**. All tournament times will use this zone."
6. Setup continues to channel and role configuration

**If the owner skips timezone setup**, the bot defaults to `UTC` and shows a yellow warning badge in the `/server status` output: "⚠️ Timezone not configured — using UTC. Run /server setup to fix this."

### Timezone Application Rules

- All times stored in database as **UTC** — the timezone is only a display/calculation layer
- Discord embeds use `<t:UNIX:F>` (full datetime) and `<t:UNIX:R>` (relative) — Discord auto-converts to each viewer's local time
- Website admin panel shows times in the server's configured timezone
- Website public pages show times using the server's timezone with a "(IST)" label
- BullMQ scheduled job times are always computed in UTC regardless of display timezone
- The timezone setting can be changed in `/server setup` or in admin settings — changing it recalculates all future scheduled job times

### `/server setup` Timezone Step

When running `/server setup` (the full configuration wizard), timezone is always **Step 1**. It cannot be skipped. If a timezone was previously configured, it shows the current value as default and asks for confirmation.

---

## 23. Registration Format Templates

### Overview

When creating a tournament, the organizer selects a **Registration Format** in the creation wizard (Step 2). This format determines how players register — both on the website form and in the Discord registration channel.

The selected format generates a **registration template** that is automatically posted in the configured registration channel as a pinned message, so players know exactly what to submit.

### The Six Registration Formats

---

**Format 1 — Simple Team (Mentions Only)**

Best for quick BGMI / Free Fire squad registrations where the organizer only needs Discord membership confirmed.

```
Team Name: [Your Team Name]
@Player1 @Player2 @Player3 @Player4
```

- Minimum required: team name + 2 Discord mentions
- Optional: up to 4 mentions (squad size)
- No IGN or UID required
- Auto-approval enabled by default for this format

---

**Format 2 — Captain-Based**

Best when you need to identify who is responsible for the team.

```
Team Name: [Your Team Name]
Team Captain: @CaptainMention
Player 1: @Player1
Player 2: @Player2
Player 3: @Player3
Player 4: @Player4
```

- Captain field required (must be a valid Discord mention)
- Players 1–4 required (at least 2)
- Auto-approval available

---

**Format 3 — Full Player Details**

Best for competitive tournaments where in-game identity verification is needed.

```
Team Name: [Your Team Name]
Captain: @CaptainMention

PLAYER 1
Discord: @Player1
IGN: [In-Game Name]
Game UID: [Numeric UID]

PLAYER 2
Discord: @Player2
IGN: [In-Game Name]
Game UID: [Numeric UID]

PLAYER 3
Discord: @Player3
IGN: [In-Game Name]
Game UID: [Numeric UID]

PLAYER 4
Discord: @Player4
IGN: [In-Game Name]
Game UID: [Numeric UID]
```

- All fields required per player
- Game UID must be numeric (validated)
- IGN must be non-empty
- Manual approval required for this format (default)

---

**Format 4 — Team + Substitute**

For tournaments that allow a reserve player.

```
Team Name: [Your Team Name]
Captain: @CaptainMention

MAIN ROSTER
1. @Player1
2. @Player2
3. @Player3
4. @Player4

SUBSTITUTE (Optional)
5. @SubstitutePlayer
```

- Main roster: 4 players required (minimum 2)
- Substitute: optional, maximum 1
- If substitute is listed, they must be a valid Discord mention

---

**Format 5 — COD Mobile 5-Player**

For CODM multiplayer where squads have 5 main players.

```
Team Name: [Your Team Name]
Captain: @CaptainMention

MAIN PLAYERS
1. @Player1
2. @Player2
3. @Player3
4. @Player4
5. @Player5

SUBSTITUTE (Optional)
6. @SubstitutePlayer
```

- 5 main players required (minimum 3)
- 1 optional substitute

---

**Format 6 — Full Details with Substitute (Tournament Standard)**

The most complete format, combining everything. Recommended for all serious tournaments.

```
Team Name: [Your Team Name]
Captain: @CaptainMention

PLAYER 1
Discord: @Player1  IGN: [Name]  UID: [Number]

PLAYER 2
Discord: @Player2  IGN: [Name]  UID: [Number]

PLAYER 3
Discord: @Player3  IGN: [Name]  UID: [Number]

PLAYER 4
Discord: @Player4  IGN: [Name]  UID: [Number]

SUBSTITUTE PLAYER
Discord: @SubPlayer  IGN: [Name]  UID: [Number]
```

This is the format shown in the blueprint example (ET BOYS team). UID and IGN per player, substitute optional.

---

### Registration Channel Behavior

When a tournament is published:
1. Bot posts the selected template as a **pinned message** in the configured registration channel
2. A second message is posted: "📋 Copy the template above, fill it in, and post your registration below. Minimum **2 Discord mentions** required."
3. Players post their filled registration in that channel
4. Bot auto-validates the submission:
   - Checks minimum Discord mentions present (≥ 2)
   - For Format 3/6: checks all IGN and UID fields are filled
   - For Format 3/6: validates UID is numeric
5. If **Auto-Approval** is enabled: registration is immediately approved and captain receives confirmation DM
6. If **Manual Approval** is enabled: registration goes to the admin approval queue

### Validation Rules (applied to all formats)

| Rule | Details |
|------|---------|
| Minimum mentions | At least 2 valid Discord @mentions required in every registration |
| No duplicate mentions | Same player cannot appear twice in one registration |
| No cross-team conflict | Same player cannot be registered in 2 different teams for the same tournament |
| UID format (Format 3/6) | Must be numeric digits only, 8–12 characters |
| Team name | Required, 3–30 characters, no special characters except spaces and hyphens |
| Capacity check | Registration rejected if tournament is at capacity |

### Auto-Approval Logic

For **Free tournaments** using **Format 1 or Format 2**: auto-approval is on by default. The organizer can disable it in Step 2 of the wizard.

For **Paid tournaments**: auto-approval is only available after payment is confirmed — registration is `PENDING` until payment webhook arrives.

For **Format 3, 4, 5, 6**: auto-approval is off by default (organizer should verify IGNs and UIDs manually).

### Website Registration Form

The website registration form dynamically renders based on the selected format:
- Format 1: Team name + player Discord username fields (2–4)
- Format 2: Team name + captain + 3 player fields
- Format 3/6: Team name + captain + per-player IGN + UID rows with add/remove
- Format 4/5: Team name + captain + main roster rows + optional substitute row

---

## 24. Slot System & Force-Fill

### Slot Definition

A **slot** is one team's position in a tournament. Each slot contains exactly one team roster.

Roster rules (configurable per tournament, defaults below):
- Minimum members per team: **2** (must have at least 2 Discord-confirmed players)
- Maximum members per team: **4** (standard squad size)
- Optional substitute: **1** additional member (5th slot per team, does not count toward min/max)

These defaults apply unless the organizer changes them in wizard Step 2.

### Slot Listing in Tournament Creation (Wizard Step 2)

When the organizer sets team capacity, the wizard shows a live slot visualizer:

```
Team Slots: [32] ←→ [+] [-]

Slot breakdown:
  32 slots × 4 players (main) = 128 main players
  32 slots × 1 substitute    = up to 32 substitutes
  Total participants:           up to 160 players

Each team: min 2 · max 4 · +1 substitute (optional)
```

The organizer can also view "Slot Overview" in the tournament admin page: a grid showing each slot number (1–32), which team occupies it, and registration status (empty / pending / approved / checked-in).

### Force-Fill on Slot Removal

When an admin removes (disqualifies) a team from a tournament that is `LIVE` or `CHECK_IN`:

**Problem:** Without force-fill, the total match count drops and remaining match results become unbalanced (e.g., a 16-team match now has 15 teams — one match plays short).

**Solution — Force-Fill:**

1. Admin removes a team (disqualification, withdrawal, admin action)
2. System checks: is there a **waitlisted team** for this tournament?
   - **Yes:** Automatically promote the first waitlisted team into the vacated slot. Captain receives DM: "✅ Good news! A slot opened up — your team **[Team Name]** has been moved from the waitlist into **[Tournament Name]**. Check-in by [time]."
   - **No waitlist or empty waitlist:** System flags the slot as `VACANT` with a warning badge on the admin panel: "⚠️ Slot {N} is vacant — match {X} may play short. Consider postponing or adjusting match assignments."
3. If the vacated slot is for a match that is `READY` or `LIVE`: admin must explicitly acknowledge the vacancy and decide: postpone that match or proceed short
4. The slot history is preserved: the disqualified team's record is kept with `status: DISQUALIFIED`, the new team's record shows `promoted_from_waitlist: true`

### Slot Numbering

- Slots are numbered sequentially (Slot 1 through Slot N)
- Slot number is assigned at registration approval, not at registration submission
- Slot numbers are visible to organizers in the admin panel
- Slot numbers are **not** shown to players publicly (prevents "Slot 1 is always the best team" meta)

---

## 25. Map Pools by Game

Each tournament has a configured map pool from the game's official competitive rotation. The organizer selects permitted maps during wizard Step 3. The system prevents scheduling matches on maps not in the tournament's pool.

### BGMI — Battle Royale Map Pool

Official KRAFTON competitive map pool (BGIS / BMPS standard):

| Map | Status | Description |
|-----|--------|-------------|
| **Erangel** | ✅ Primary | Classic map, majority of competitive matches |
| **Miramar** | ✅ Primary | Desert map, long-range sniping focus |
| **Rondo** | ✅ Primary | Grand map with diverse urban terrain, used in grand finals |
| Sanhok | ⚠️ Community | Available for community/smaller events, not major finals |
| Livik | ⚠️ Community | Available for community events, excluded from major finals |

Default tournament pool: Erangel, Miramar, Rondo
Community option: can add Sanhok and/or Livik

Map rotation (for multi-match tournaments) can be set to:
- **Fixed:** same map for all matches
- **Sequential:** Erangel → Miramar → Rondo → repeat
- **Custom:** organizer assigns map per match individually

---

### Free Fire — Map Pool

Official Garena esports circuit (FFWS / EWC standard):

| Map | Status | Description |
|-----|--------|-------------|
| **Bermuda** | ✅ Primary | Staple competitive map, balanced loot |
| **Purgatory** | ✅ Primary | Valley terrain, zip-line rotations |
| **Nexterra** | ✅ Primary | Futuristic, anti-gravity mechanics |
| **Kalahari** | ✅ Primary | Desert map, vertical fighting ridges |
| **Solara** | ✅ Primary | Latest global rotation addition |
| Alpine | ⚠️ Regional | Used in select regional tournaments |

Default pool: Bermuda, Purgatory, Nexterra, Kalahari, Solara
Alpine available as optional add-on

**Free Fire Clash Squad** uses a separate map pool (selected per series match):
- Bermuda (Clash Squad layout)
- Kalahari (Clash Squad layout)
- Purgatory (Clash Squad layout)

---

### COD Mobile — Multiplayer Map Pool

Official CODM World Championship settings (mode-specific):

#### Hardpoint
| Map | Included |
|-----|---------|
| Summit | ✅ |
| Hacienda | ✅ |
| Combine | ✅ |
| Takeoff | ✅ |
| Arsenal | ✅ |

#### Search & Destroy (S&D)
| Map | Included |
|-----|---------|
| Tunisia | ✅ |
| Firing Range | ✅ |
| Coastal | ✅ |
| Slums | ✅ |
| Meltdown | ✅ |

#### Control
| Map | Included |
|-----|---------|
| Raid | ✅ |
| Standoff | ✅ |
| Crossroads Strike | ✅ |
| Takeoff | ✅ |
| Crossfire | ✅ |

> **CODM Map Rotation Note:** CODM Esports follows a "Keep 7, Change 6" seasonal rotation rule. The platform's map pool config for COD Mobile should be updated by the server owner each season to reflect the current official pool. The system stores the map pool per `tournament_rule_versions` snapshot — old tournaments always show the map pool they were created with.

**COD Mobile Battle Royale** uses the Isolated and Alcatraz maps (configured separately from multiplayer).

### Map Pool in the Database

The `tournaments` table stores the selected map pool as a JSON array in `tournament_rule_versions.rules_json`:
```json
{
  "map_pool": ["Erangel", "Miramar", "Rondo"],
  "map_rotation": "sequential",
  "default_map": "Erangel"
}
```

The match scheduler uses this pool when generating matches — the default map is pre-filled, and the organizer can only select from the tournament's pool when editing individual matches.

---

## 26. Draft Auto-Expiry (30-Day Rule)

*(This section covers the full implementation detail referenced in Section 21.)*

### Warning Banner in Creation Wizard

Every page of the 6-step tournament creation wizard shows a persistent amber banner at the top:

```
⚠️  Draft Expiry Notice
This tournament draft must be published within 30 days of creation, or it will be
permanently and irreversibly deleted. Drafts do not appear publicly and do not
reserve slots until published.
```

### Expiry Jobs

A BullMQ delayed job is created at tournament draft creation:
- Job key: `draft:{tournamentId}:expiry-warn` — fires at `created_at + 27 days`
- Job key: `draft:{tournamentId}:expiry-delete` — fires at `created_at + 30 days`

**Warning job (Day 27):**
- Sends DM to the organizer who created the draft
- Posts a warning in the admin panel as a notification badge on that tournament's row
- Bot sends a message in the configured admin channel (if configured):
  ```
  {warning} Tournament Draft Expiry Warning
  The draft **[Tournament Name]** will be permanently deleted in 3 days
  if not published. Publish it now to keep it: [Link]
  ```

**Delete job (Day 30):**
- Hard deletes the tournament and all its wizard-step data
- Writes `audit_logs`: `action: DRAFT_EXPIRED, tournament_id: X, created_at: Y, deleted_at: Z`
- Sends DM to organizer: "Your tournament draft **[Name]** was automatically deleted after 30 days without being published."

### Draft Extension

The organizer can extend a draft's expiry up to 3 times (30 days each, maximum 90 days total):
- "Extend Draft" button in admin panel tournament row
- `/tournament extend [id]` Discord command
- Each extension cancels the old expiry jobs and creates new ones at `extension_date + 27/30 days`
- Extension count stored in `tournaments.extension_count` (max 3)
- After 3 extensions, the "Extend Draft" button is disabled with tooltip: "Maximum extensions reached. Publish or delete this draft."

---

## 27. Admin Panel Brute-Force Protection

### The Problem
Non-admin users should not be able to probe the admin panel by repeatedly guessing or attempting access. Even though the backend enforces permissions on every request, we add rate-limiting on failed admin access attempts as a deterrent and security signal.

### Implementation

**Failed admin access counter:**
- Stored in Upstash Redis: key `admin-attempts:{userId}:{guildId}`, value = attempt count, TTL = 24 hours
- Incremented every time a user hits a `403` response on any `/api/servers/:guildId/admin/*` or `/servers/:guildId/admin/*` route
- **Legitimate users do not trigger this** — a user who has the correct role will never get a 403 on an admin route they're authorized for

**At 4 failed attempts within 24 hours:**
1. User is flagged in `users.admin_ban_until` = `NOW() + 24 hours` for that guild (stored in `server_role_bindings` as a temporary override)
2. All subsequent requests from that user for admin routes on that guild return `403` with message: "Access suspended for 24 hours due to repeated unauthorized access attempts."
3. Server owner and SERVER_ADMINs receive a Discord DM alert: "{warning} **Security Alert** — User **@Username** (ID: 12345) made 4 failed admin access attempts on **[Server Name]** and has been temporarily suspended from admin access for 24 hours."
4. Event written to `audit_logs`: `action: ADMIN_ACCESS_SUSPENDED, actor_id: userId, guild_id: guildId`

**After 24 hours:** ban expires automatically (Redis TTL + `admin_ban_until` check).

**Server owner can manually lift the ban** early:
- Website: Settings → Staff Management → Suspended Users → "Lift Suspension"
- Discord: `/server roles unban [user]`

**Permanent ban option:**
The server owner can escalate a 24-hour suspension to a **permanent server ban** (from tournament participation, not Discord itself). This writes a `server_bans` record. Permanently banned users see "You have been banned from this tournament server" on any route.

### Rate Limiting on Sensitive Endpoints

Beyond admin brute-force, all sensitive endpoints have rate limits (implemented via Upstash Redis counters):

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/me` | 30 requests | 1 minute |
| `POST /api/servers/:guildId/tournaments/:id/registrations` | 5 requests | 1 minute per user |
| `POST /api/servers/:guildId/matches/:id/results` | 10 requests | 1 minute per user |
| `POST /api/payments/webhooks/razorpay` | 100 requests | 1 minute (IP-based) |
| Any admin route (403 path) | 4 failures → suspend | 24 hours per user per guild |

---

## 28. Docs Page

### Overview

A full documentation website built into the platform at `/docs`. This is a **separate section** of the Next.js app — not an external tool like Notion or GitBook. It is styled to match the platform's dark esports visual identity.

### URL Structure

| Route | Content |
|-------|---------|
| `/docs` | Docs home — getting started overview |
| `/docs/getting-started` | Invite the bot, first setup |
| `/docs/server-setup` | Configure channels, roles, timezone |
| `/docs/tournaments/create` | Step-by-step tournament creation |
| `/docs/tournaments/manage` | Edit, delay, cancel, reopen |
| `/docs/tournaments/formats` | Registration format guide |
| `/docs/tournaments/scoring` | Scoring systems per game |
| `/docs/matches` | Scheduling, room management, results |
| `/docs/players` | How to register, check in, submit results |
| `/docs/payments` | Paid tournaments, Razorpay flow |
| `/docs/discord-commands` | Full command reference |
| `/docs/faq` | Common questions |
| `/docs/changelog` | Platform updates |

### Design

The docs are visually distinct from the main platform but use the same design tokens:
- Left sidebar: collapsible section tree navigation
- Main content: wide prose layout with clear headings, code blocks, and screenshots
- Right sidebar: "On this page" anchor links
- Dark background matching the platform theme
- Syntax-highlighted code blocks for command examples
- Callout boxes: Info (blue), Warning (amber), Danger (red), Tip (green)

### Advanced Visual Elements

Each major docs page includes:
- **Interactive step diagram** — animated numbered steps (Framer Motion) walking through the process
- **Command preview embeds** — rendered HTML mockups of exactly what the Discord embed looks like (not screenshots — live-rendered HTML matching the Discord embed style)
- **Video placeholder sections** — reserved sections for future screen recordings or GIFs
- **Copy-to-clipboard** on all command snippets

### Key Docs Pages Detail

**Getting Started:**
1. Invite the bot → click the invite link → select your server → authorize
2. Bot joins → welcome message appears → select timezone
3. Run `/server setup` → configure channels and roles
4. Create your first tournament → link to Create Tournament guide

**Full Command Reference (`/docs/discord-commands`):**
A searchable, filterable table of every slash command with:
- Command name and syntax
- Required permission level
- Description
- Example usage
- What response the bot sends

**Registration Formats Guide (`/docs/tournaments/formats`):**
Shows all 6 formats with:
- Live preview of the template (rendered in Discord embed style)
- When to use each format
- What gets auto-validated
- Copy button for the template

**Scoring Guide (`/docs/tournaments/scoring`):**
Interactive formula display for each game:
- BGMI: interactive placement table editor (enter placement → see points calculated live)
- FF Clash Squad: round-win counter simulator
- CODM: Best-of-N series simulator

---

## 29. Revised Payment Rules

### Razorpay Only

The only supported payment provider is **Razorpay**. Razorpay supports:
- UPI (GPay, PhonePe, Paytm, BHIM, all UPI apps)
- Debit cards and credit cards (Visa, Mastercard, RuPay)
- Net banking (all major Indian banks)
- Wallets (Paytm wallet, Mobikwik, etc.)
- International cards (when enabled on the Razorpay account)

No other providers (Stripe, PayPal, etc.) are supported in the initial build. The `packages/payments` interface is designed to accept a provider adapter, so other providers can be added later without rewriting the core logic.

### Strict Payment Approval Rules

A registration is **only activated** when:
1. `orders.status = 'paid'`
2. The `paid` status was set by a **verified Razorpay webhook** (not by a browser callback)
3. The webhook amount matches the stored order amount exactly
4. The webhook currency matches the stored order currency
5. The `payment_events.provider_event_id` has not been processed before (idempotency)

If any of these conditions fail, the registration stays `PENDING` and the slot is **not activated**.

### Refund Rules (Simplified)

Refunds are triggered automatically by system events — **not manually by admins**:

| Scenario | Refund Triggered |
|----------|-----------------|
| Razorpay reports `payment.failed` | Yes — automatic, Razorpay handles the reversal |
| Razorpay chargeback received | Yes — after chargeback review |
| Tournament cancelled by organizer | Config-dependent: if `refund_on_cancel: true` in tournament settings, a Razorpay refund is initiated via API for all paid registrations |
| Player voluntarily withdraws | **No refund** — this is the organizer's stated policy, shown clearly before payment |
| Admin disqualifies a team | **No automatic refund** — admin must handle this case-by-case outside the platform |

There is **no "refund_pending" state initiated by admins**. The refund flow is:
- `paid → disputed` (Razorpay chargeback) → `refunded` (after review)
- `failed → refunded` (automatic, Razorpay handles)
- `paid → refunded` (only if tournament is cancelled and `refund_on_cancel = true`)

### Payment Log Details

Every payment is permanently logged in `payment_events` and shown in the admin Payments page with full details:

| Field | Source |
|-------|--------|
| Discord Username | `users.username` |
| Discord ID (Snowflake) | `users.discord_id` |
| Team Name | `registrations.team_name` |
| Tournament Name | `tournaments.name` |
| Amount Paid | `orders.amount` (Decimal, paise) |
| Currency | `orders.currency` |
| Razorpay Order ID | `orders.provider_ref` |
| Razorpay Payment ID | `payment_events.provider_event_id` |
| Payment Date | `payment_events.processed_at` (UTC) |
| Payment Date (local) | Converted to `server_settings.timezone` for display |
| Payment Status | `orders.status` |
| IP Address | From Razorpay webhook payload |

**Payment records are never deleted** — not on tournament archive, not on tournament cancellation. They are retained permanently for financial accountability.

### Cache Usage (Low-Cache Design)

To minimize Redis usage (Upstash free tier: 10k commands/day):

| What is cached | TTL | Where |
|----------------|-----|-------|
| User Discord guild list | 60 seconds | Upstash Redis |
| Guild membership check | 30 seconds | Upstash Redis |
| Sync status (outbox backlog count) | 30 seconds | Upstash Redis |
| Bot rate limit buckets | In-memory (worker process) | Not Redis |
| Session data | Supabase Auth (not Redis) | Supabase |
| Analytics query results | NOT cached — always live | — |
| Tournament data | NOT cached — ISR on Next.js | Vercel Edge |

**What is NOT cached:**
- Application roles (always resolved live from Discord API — see Section 14)
- Tournament data (Next.js ISR handles this without Redis)
- Match results (always fetched fresh — stale standings are a real problem)
- Analytics (always computed from database — cached results would be misleading)

This keeps Redis usage well under the 10k/day limit for typical server usage.


---

## 30. Welcome & Support Server System

### Bot Welcome on Server Join
When the bot joins a new Discord server, it must send a rich welcome embed to the system channel (or first available text channel) containing:

**Welcome Embed Content:**
```
🎮 Thanks for inviting SHADØW TOURNAMENTS Bot!

Welcome to the most powerful Discord-native tournament engine for 
BGMI, Free Fire & COD Mobile.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 GET STARTED IN 3 STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  /setup         → Configure timezone, channels & roles
2️⃣  /tournament create  → Create your first tournament  
3️⃣  /register      → Players register for tournaments

━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 WEB DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━
Manage everything visually at:
https://shadow-tournaments.vercel.app

━━━━━━━━━━━━━━━━━━━━━━━━━━
🆘 NEED HELP?
━━━━━━━━━━━━━━━━━━━━━━━━━━
Join our Support Server: [SUPPORT_SERVER_INVITE_URL]
Use /help for command reference
```

**Implementation:**
- File: `apps/discord-bot/src/listeners/guild-create.ts`
- Already auto-registers `discordServer` in the database
- Add the welcome embed send after the DB upsert
- Use `buildWelcomeEmbed(guild.name)` from `utils/embeds.ts`
- Add a button: `[Join Support Server]` with the support server invite link

### Support Server System

**Purpose:** A dedicated Discord server where users/admins can get help with the bot.

**Environment Variable to Add:**
```env
SUPPORT_SERVER_INVITE=https://discord.gg/YOUR_INVITE_CODE
SUPPORT_SERVER_ID=YOUR_GUILD_ID
```

**Bot Commands:**
- `/support` — sends an ephemeral message with the support server link
- `/help [command?]` — sends command reference (ephemeral)
  - No arg: shows all command categories with descriptions
  - With arg: shows detailed info for that specific command

**Support Server Features (to be set up manually in Discord):**
```
#welcome          → Auto-rules and bot intro
#announcements    → Bot updates and changelog
#general-help     → Community support
#bug-reports      → Bug submission with template
#feature-requests → Suggestion box
#tournaments-showcase → Community shares their tournaments
```

**Help Command Embed:**
```
📖 SHADØW TOURNAMENTS — Command Reference

🔧 SERVER SETUP
  /setup          Configure bot for your server
  /server status  Check integration health
  /support        Get help & join support server

🏆 TOURNAMENTS  
  /tournament create      Create a new tournament
  /tournament list        View all tournaments
  /tournament info [id]   Tournament details
  /tournament publish     Open registrations
  /tournament cancel      Cancel tournament
  /tournament standings   Live leaderboard

⚔️ MATCHES
  /match room      Get room credentials (private)
  /match result    Submit match results
  /match checkin   Check in for your match
  /match dispute   File a dispute

👥 PLAYERS
  /register [tournament]  Register your team
  /winners [tournament]   View champions

📊 ANALYTICS
  /analytics      Server tournament statistics

Need more help? → [Join Support Server]
```

---

## 31. Alok GFX × SHADØW TOURNAMENTS — Points Table (PT) System

### Overview

SHADØW TOURNAMENTS is partnering with **Alok GFX**, one of India's finest esports Points Table designers. His PT designs are sold **exclusively inside our platform** — admins pay via Razorpay, unlock the design for one tournament, and then use our built-in web dashboard PT generator to fill in team data and produce the final Points Table image.

**Key principles:**
- No external store. Everything lives inside SHADØW TOURNAMENTS.
- Admins purchase a PT design per tournament (1 design = 1 tournament unlock).
- Free low-quality preview available before purchase.
- After unlocking, admin fills a structured form → our system generates the PT image.
- /pt bot commands for Discord-side PT posting and score entry.

---

### 31.1 How the PT System Works (End-to-End)

```
ADMIN visits /servers/[guildId]/admin/pt
        ↓
Browses Alok GFX designs (free low-quality preview)
        ↓
Selects a design for their tournament
        ↓
Pays via Razorpay (our platform collects, forwards to Alok GFX)
        ↓
Design unlocked for that specific tournament
        ↓
Admin fills PT form:
  - Tournament name / logo
  - Number of teams (up to 16/20)
  - For each team: Team Name, Logo URL, Match-by-Match scores
    (Placement per match + Kills per match)
        ↓
System calculates: Total POS pts + Total KILLS + TOTAL points
        ↓
Generates the PT image using Alok GFX's design template
  (team names, logos, scores overlaid on his background)
        ↓
Admin downloads / shares / posts to Discord via /pt post
```

---

### 31.2 PT Form — Data Input Structure

When admin opens the PT generator, they fill this form:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOURNAMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tournament Title:    [BGMI PRO LEAGUE S4      ]
Organizer Name:      [Mythic Warriors Esports ]
Tournament Logo URL: [https://...             ]
Total Matches:       [ 6 ]
Scoring System:      [● BGMI BR  ○ FF  ○ CODM ○ Custom]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PLACEMENT POINTS TABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1st Place (WWCD):  [15] pts
2nd Place:         [12] pts
3rd Place:         [10] pts
4th Place:         [ 8] pts
5th Place:         [ 6] pts
6th Place:         [ 5] pts
7th Place:         [ 4] pts
8th Place:         [ 3] pts
9th-12th Place:    [ 2] pts
13th-16th Place:   [ 1] pts
Kill Points:       [ 1] pt per kill

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEAM DATA (repeat for each team)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEAM 1
  Team Name:   [Team Soul          ]
  Team Logo:   [https://...        ]  (optional)
  Match 1:  Placement [  1 ]  Kills [14]
  Match 2:  Placement [  3 ]  Kills [ 8]
  Match 3:  Placement [  2 ]  Kills [11]
  Match 4:  Placement [  1 ]  Kills [16]
  Match 5:  Placement [  5 ]  Kills [ 6]
  Match 6:  Placement [  4 ]  Kills [ 9]
  → AUTO CALCULATED: POS 52 pts | KILLS 64 | TOTAL 116

TEAM 2
  Team Name:   [GodLike Esports    ]
  ...

[+ Add Team]   [- Remove Team]
```

**Auto-calculated columns (read-only, system fills):**
- `WWC` — number of 1st place finishes
- `POS` — sum of placement points across all matches
- `KILLS` — total kills across all matches  
- `TOTAL` — POS + KILLS
- `RANK` — auto-sorted by TOTAL descending

**Final output looks like Alok GFX's designs** (as seen in the screenshot):
- RANK column
- TEAM NAME with logo thumbnail
- Per-match score bubbles (WWCD crown icon on wins)
- POS | KILLS | TOTAL columns
- Overlay on Alok GFX's premium background template

---

### 31.3 Database Schema

```sql
-- Alok GFX PT design catalog (admin-managed)
pt_designs (
  id            UUID PRIMARY KEY,
  name          TEXT,              -- e.g. "Red Warriors Pack"
  game          GAME_ENUM,         -- BGMI / FREE_FIRE / COD_MOBILE / ALL
  description   TEXT,
  preview_low_url  TEXT,           -- Free low-quality watermarked preview
  preview_high_url TEXT,           -- High quality (shown after unlock)
  template_config  JSONB,          -- Pixel coords for text/logo overlays
  price_inr     DECIMAL,           -- Price in INR (e.g. 299)
  is_active     BOOLEAN DEFAULT true,
  display_order INT,
  created_at    TIMESTAMP
)

-- Per-tournament purchase/unlock
tournament_pt_unlocks (
  id               UUID PRIMARY KEY,
  tournament_id    UUID → tournaments,
  guild_id         VARCHAR,
  pt_design_id     UUID → pt_designs,
  purchased_by     VARCHAR,         -- Discord user ID of admin who paid
  razorpay_order_id  TEXT,
  razorpay_payment_id TEXT,
  amount_paid      DECIMAL,
  status           ENUM(PENDING, PAID, FAILED, REFUNDED),
  unlocked_at      TIMESTAMP,
  created_at       TIMESTAMP
)

-- PT data filled by admin for a tournament
tournament_pt_entries (
  id              UUID PRIMARY KEY,
  tournament_id   UUID → tournaments,
  pt_unlock_id    UUID → tournament_pt_unlocks,
  guild_id        VARCHAR,
  title           TEXT,
  organizer_name  TEXT,
  logo_url        TEXT,
  total_matches   INT,
  scoring_config  JSONB,           -- placement table + kill points
  teams_data      JSONB,           -- array of team objects with match scores
  generated_image_url TEXT,        -- Final rendered PT image URL
  last_generated_at TIMESTAMP,
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP
)
```

**`teams_data` JSONB structure:**
```json
[
  {
    "rank": 1,
    "name": "Team Soul",
    "logo_url": "https://...",
    "matches": [
      { "match": 1, "placement": 1, "kills": 14 },
      { "match": 2, "placement": 3, "kills": 8 }
    ],
    "wwc": 2,
    "total_pos": 52,
    "total_kills": 64,
    "total": 116
  }
]
```

---

### 31.4 Website Pages

**`/pt`** — Public landing page for the PT system
```
┌──────────────────────────────────────────────────────────┐
│  🎨 POINTS TABLE DESIGNER                               │
│  Powered by Alok GFX × SHADØW TOURNAMENTS               │
│                                                          │
│  Create professional tournament points tables in         │
│  minutes. Choose a premium design by India's             │
│  finest PT creator — Alok GFX.                          │
│                                                          │
│  [Browse Designs]  [How It Works]                       │
└──────────────────────────────────────────────────────────┘

AVAILABLE DESIGNS (4 cards from screenshot above)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ [Preview]│ │ [Preview]│ │ [Preview]│ │ [Preview]│
│ Red Pack │ │ Blue Pack│ │ Purple   │ │ Violet   │
│  BGMI    │ │  FF Max  │ │  ALL     │ │  CODM    │
│ ₹299     │ │ ₹249     │ │ ₹349     │ │ ₹299     │
│[Preview] │ │[Preview] │ │[Preview] │ │[Preview] │
│[Unlock →]│ │[Unlock →]│ │[Unlock →]│ │[Unlock →]│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**`/servers/[guildId]/admin/pt`** — Admin PT management for a server
- Lists all PT unlocks for this server's tournaments
- Shows which tournament each design is assigned to
- "Create New PT" button

**`/servers/[guildId]/admin/pt/[tournamentId]`** — PT Generator (main tool)
- Full form with tournament details + team data entry
- Live preview panel (right side, updates as you type)
- "Generate PT" → renders and saves image
- "Download PNG" → full quality download
- "Post to Discord" → posts via bot to results channel

---

### 31.5 Purchase Flow (Razorpay)

```
Admin clicks "Unlock for Tournament X" on a design
        ↓
Payment modal opens showing:
  Design: Red Warriors Pack
  Tournament: BGMI Pro League S4
  Price: ₹299
  [Pay with Razorpay]
        ↓
Razorpay checkout opens (UPI / Cards / Netbanking)
        ↓
On payment.captured webhook:
  - tournament_pt_unlocks.status → PAID
  - unlocked_at = NOW()
  - Admin gets DM: "PT Design unlocked for your tournament! 🎨"
        ↓
Admin redirected to PT Generator page
```

**Note on revenue:** Platform can take a cut (e.g. ₹50) and forward rest to Alok GFX manually, OR set up a Razorpay Route to auto-split. Keep simple for now — full amount to platform, manual settlement to Alok GFX.

---

### 31.6 PT Image Generation

**How it works technically:**

1. Admin submits team data form
2. Backend receives `tournament_pt_entries` payload
3. Server-side image generation using **`@napi-rs/canvas`** or **`sharp`**:
   - Load Alok GFX's base template PNG (stored in Supabase Storage)
   - For each team row: draw team name, logo thumbnail, match scores, totals
   - Draw rank numbers, column headers
   - Apply Alok GFX's font/color theme from `template_config.json`
4. Save generated PNG to Supabase Storage → return URL
5. Display in preview panel + enable Download / Post to Discord

**Template config JSON structure:**
```json
{
  "background": "supabase://pt-templates/red-warriors-pack.png",
  "dimensions": { "width": 1920, "height": 1080 },
  "title": { "x": 960, "y": 80, "font": "Orbitron", "size": 48, "color": "#FFD700" },
  "columns": {
    "rank":      { "x": 120,  "y_start": 280, "row_height": 58 },
    "team_name": { "x": 280,  "y_start": 280, "row_height": 58 },
    "team_logo": { "x": 240,  "y_start": 275, "size": 40 },
    "wwc":       { "x": 900,  "y_start": 280, "row_height": 58 },
    "pos":       { "x": 1200, "y_start": 280, "row_height": 58 },
    "kills":     { "x": 1450, "y_start": 280, "row_height": 58 },
    "total":     { "x": 1700, "y_start": 280, "row_height": 58 }
  },
  "match_cols": [
    { "match": 1, "x": 680 },
    { "match": 2, "x": 730 },
    { "match": 3, "x": 780 }
  ],
  "branding": { "x": 960, "y": 1050, "text": "Design by @AlokGFX | SHADØW TOURNAMENTS" }
}
```

---

### 31.7 Bot Commands for PT

| Command | Who | Description |
|---------|-----|-------------|
| `/pt view [tournament_id]` | VIEWER | Show current PT standings embed in Discord |
| `/pt post [tournament_id]` | TOURNAMENT_MANAGER | Post PT image to results channel |
| `/pt update [tournament_id]` | TOURNAMENT_MANAGER | Re-generate PT after new match data |
| `/pt buy [tournament_id] [design_name]` | SERVER_ADMIN | Get payment link to unlock a design |

When `/pt post` is run:
- Fetches generated PT image URL from DB
- Posts it as a full-width embed image to the configured results channel
- Adds "Design by @AlokGFX" footer

---

### 31.8 Admin PT Generator UI (Web Dashboard)

**Page:** `/servers/[guildId]/admin/pt/[tournamentId]`

```
┌──────────────────────────────────┬───────────────────────┐
│  PT DATA ENTRY                   │  LIVE PREVIEW          │
│                                  │                        │
│  Design: Red Warriors Pack ✓     │  [PT image renders     │
│  ──────────────────────────      │   here in real-time    │
│  Tournament Title: [         ]   │   as admin types]      │
│  Organizer: [              ]     │                        │
│  Total Matches: [6]              │                        │
│  ──────────────────────────      │                        │
│  SCORING CONFIG                  │                        │
│  1st: [15] 2nd: [12] 3rd: [10]   │                        │
│  Kill pts: [1]                   │                        │
│  ──────────────────────────      │                        │
│  TEAMS                           │                        │
│  ┌────────────────────────────┐  │                        │
│  │ #1 Team Soul               │  │                        │
│  │ Logo: [url]                │  │                        │
│  │ M1: P[1] K[14]             │  │                        │
│  │ M2: P[3] K[ 8]             │  │                        │
│  │ M3: P[2] K[11]             │  │                        │
│  │ → WWC:2 POS:52 KIL:64 T:116│  │                        │
│  └────────────────────────────┘  │                        │
│  [+ Add Team]                    │                        │
│                                  │                        │
│  [Generate PT]  [Download PNG]   │                        │
│  [Post to Discord]               │                        │
└──────────────────────────────────┴───────────────────────┘
```

---

### 31.9 Environment Variables

```env
# PT System (Alok GFX)
PT_TEMPLATE_BUCKET=pt-templates        # Supabase Storage bucket name
PT_OUTPUT_BUCKET=pt-generated          # Where generated PTs are stored
PT_ALOK_GFX_CREDIT="Design by @AlokGFX | SHADØW TOURNAMENTS"
```

No external store URL needed. Everything is inside the platform.

---

## 32. Points Calculator System

### 32.1 Scoring Engine (Auto-calculation)

The system auto-calculates whenever match data is entered:

```typescript
function calculateTeamScore(
  matches: { placement: number; kills: number }[],
  config: {
    placementTable: Record<number, number>  // position → points
    killPoints: number
  }
): { wwc: number; pos: number; kills: number; total: number } {
  let wwc = 0, pos = 0, kills = 0
  for (const m of matches) {
    if (m.placement === 1) wwc++
    pos += config.placementTable[m.placement] ?? 0
    kills += m.kills
  }
  return { wwc, pos, kills, total: pos + (kills * config.killPoints) }
}
```

### 32.2 Default Scoring Presets

| Preset | Game | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9-12 | 13-16 | Kill |
|--------|------|-----|-----|-----|-----|-----|-----|-----|-----|------|-------|------|
| BGMI Standard | BGMI | 15 | 12 | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 1 |
| FF Standard | Free Fire | 15 | 12 | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 1 |
| CODM Standard | COD Mobile | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 0 | 0 | 2 |
| Custom | Any | configurable | | | | | | | | | | |

### 32.3 Web Dashboard Calculator

**Route:** `/servers/[guildId]/admin/tournaments/[tournamentId]/points`

Features:
- Match-by-match data entry table (rows = teams, columns = matches)
- Click any cell to enter placement + kills for that team in that match
- Totals auto-calculate in real-time
- "Export to PT" button — sends data to PT generator with Alok GFX design
- "Post Standings" — posts current standings embed to Discord

### 32.4 Bot Command

`/points calc [tournament_id]` — shows live standings:

```
📊 LIVE STANDINGS — BGMI Pro League S4
Matches: 3/6 | Scoring: BGMI Standard

🥇 Team Soul        116 pts  (KILLS: 64 | WWC: 2)
🥈 GodLike Esports   98 pts  (KILLS: 58 | WWC: 1)
🥉 Blind Esports     85 pts  (KILLS: 47 | WWC: 0)
 4. Team XSpark      79 pts  (KILLS: 41 | WWC: 1)
 5. Global Esports   71 pts  (KILLS: 39 | WWC: 0)
...

[View Full PT on Dashboard →]
[Design by @AlokGFX | SHADØW 🌑]
```

---

*Last updated: October 2026*
*Platform: shadow-tournaments.vercel.app*
*Collaboration: Alok GFX × SHADØW TOURNAMENTS*

### Full System Architecture

#### 31.1 PT Store & Purchase Flow

**Website Page:** `/pt-store` (public) and `/servers/[guildId]/admin/pt-setup`

**Purchase Flow:**
```
User sees PT designs in store
        ↓
Clicks "Buy This Design" (shows SHADØW exclusive discount price)
        ↓
Redirected to Alok GFX's payment link (external, with tracking ref)
        ↓
After purchase: user submits order proof / Alok GFX confirms
        ↓
PT design unlocked in their account
        ↓
Can use it in any of their tournaments on SHADØW TOURNAMENTS
```

**Database Tables to Add:**
```sql
-- PT design catalog (managed by Alok GFX / admin)
pt_designs (
  id UUID PRIMARY KEY,
  name VARCHAR,           -- e.g. "BGMI Pro League S4 Pack"
  game GAME_ENUM,         -- BGMI / FREE_FIRE / COD_MOBILE / ALL
  preview_url TEXT,       -- Alok GFX design preview image
  original_price DECIMAL, -- Original price INR
  shadow_price DECIMAL,   -- Discounted price for SHADØW users
  discount_percent INT,   -- e.g. 30 (for 30% off)
  purchase_link TEXT,     -- Alok GFX store link
  is_active BOOLEAN,
  created_at TIMESTAMP
)

-- User PT licenses
user_pt_licenses (
  id UUID PRIMARY KEY,
  user_discord_id VARCHAR,    -- Purchaser
  pt_design_id UUID → pt_designs,
  order_ref VARCHAR,          -- Order/transaction reference
  verified_at TIMESTAMP,      -- When admin verified purchase
  verified_by VARCHAR,        -- Admin who verified
  status ENUM(PENDING, ACTIVE, EXPIRED, REVOKED),
  created_at TIMESTAMP
)

-- PT usage in tournaments
tournament_pt_configs (
  id UUID PRIMARY KEY,
  tournament_id UUID → tournaments,
  pt_design_id UUID → pt_designs,
  pt_license_id UUID → user_pt_licenses,
  custom_branding_json JSONB,  -- Custom colors/team names for this PT
  generated_image_url TEXT,    -- Final generated PT image
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### 31.2 PT Store Website Page (`/pt-store`)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  🎨 ALOK GFX × SHADØW TOURNAMENTS                  │
│  Exclusive Points Table Designs for Indian Esports  │
│                                                     │
│  "India's finest PT designer, now on SHADØW         │
│   Tournaments with exclusive discounts"             │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  🤝 COLLABORATION BANNER                     │  │
│  │  Alok GFX logo | SHADØW logo | "×"           │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  AVAILABLE PT DESIGNS                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│  │ [Preview]  │ │ [Preview]  │ │ [Preview]  │     │
│  │ BGMI Pack  │ │ FF Pack    │ │ CODM Pack  │     │
│  │ ~~₹500~~   │ │ ~~₹400~~   │ │ ~~₹450~~   │     │
│  │ ₹350       │ │ ₹280       │ │ ₹315       │     │
│  │ 30% OFF    │ │ 30% OFF    │ │ 30% OFF    │     │
│  │ [Buy Now]  │ │ [Buy Now]  │ │ [Buy Now]  │     │
│  └────────────┘ └────────────┘ └────────────┘     │
│                                                     │
│  After purchase, submit your order proof below     │
│  to unlock the design in your account.             │
│  [Submit Purchase Proof]                           │
└─────────────────────────────────────────────────────┘
```

**Bot Command:** `/pt store` — shows PT designs embed with purchase links

#### 31.3 Points Calculator System

**Purpose:** Automatically calculate tournament standings using the PT format Alok GFX designed.

**Bot Command:** `/points calc [tournament_id]`
- Shows current match-by-match points breakdown
- Displays standings in Alok GFX PT style formatting

**Bot Command:** `/pt setup [tournament_id]`
- Walks the organizer through selecting their PT design
- Configures scoring weights (kills=1pt, placements=15/12/10/8...)
- Generates the PT image after each match update

**Scoring Calculation:**
```typescript
interface PTScoringConfig {
  ptDesignId: string            // Which Alok GFX design to use
  killPoints: number            // Points per kill (default: 1)
  placementTable: {             // Position → points mapping
    [position: number]: number
  }
  wwcdBonus: number             // Winner Winner Chicken Dinner bonus
  penaltyPerNoShow: number      // Deduction for no-shows
  format: 'SOLO' | 'DUO' | 'SQUAD'
  totalMatches: number          // e.g. 6 matches in a day
}
```

**Auto PT Image Generation:**
```
After every match result is approved:
  1. Fetch current standings from DB
  2. Apply PTScoringConfig to calculate points table
  3. Generate PT image using Alok GFX template
     (Template renders team names, ranks, points, kills, placement)
  4. Post to configured results channel with tournament banner
  5. Update pinned PT message if exists
```

**PT Image Template System:**
- Alok GFX provides base templates (PNG/PSD) as background
- System overlays: team names, ranks, WWCD count, kills, total points
- Each design has a template_config_json defining exact pixel coordinates
  for text overlay positions

#### 31.4 Admin PT Management

**Admin Page:** `/servers/[guildId]/admin/pt-setup`

Features:
- Select active PT design for tournament
- Preview how it will look
- Enter custom team names/colors
- Manually trigger PT generation
- View generated PT history

**Admin Commands:**
- `/pt assign [tournament_id] [design_id]` — assign PT design to tournament
- `/pt generate [match_id]` — manually regenerate PT after a match
- `/pt preview [tournament_id]` — preview current PT without posting

#### 31.5 PT Verification Flow (Admin)

When a user submits purchase proof:
1. User submits form on `/pt-store` with order reference + screenshot
2. Creates `user_pt_licenses` record with status=PENDING
3. Bot DMs the SHADØW admin/Alok GFX representative
4. Admin verifies and approves via `/pt verify [order_ref]` command
5. License status → ACTIVE
6. User gets DM: "Your Alok GFX PT license has been activated! 🎨"
7. PT design unlocked in their dashboard

**Bot Commands (Admin only):**
- `/pt verify [order_ref]` — approve a pending PT license
- `/pt revoke [user_id] [design_id]` — revoke a license
- `/pt licenses [user_id?]` — list all licenses

#### 31.6 Discord Bot PT Embed Style

When posting a PT after a match:
```
╔══════════════════════════════════════╗
║  🏆 BGMI PRO LEAGUE — SEASON 4      ║
║  📊 POINTS TABLE — MATCH 3/6        ║
╠══════════════════════════════════════╣
║ RNK │ TEAM          │ WWC │ KIL │ PTS ║
╠══════════════════════════════════════╣
║  1  │ Team Soul     │  2  │ 47  │ 89 ║
║  2  │ GodLike       │  1  │ 38  │ 71 ║
║  3  │ Blind Esports │  0  │ 31  │ 52 ║
║  4  │ Team XSpark   │  1  │ 28  │ 49 ║
║  5  │ Global Esports│  0  │ 25  │ 41 ║
╠══════════════════════════════════════╣
║  Design by: @AlokGFX  │  SHADØW 🌑  ║
╚══════════════════════════════════════╝
[View Full PT] [Download Image]
```

#### 31.7 Environment Variables to Add
```env
# Alok GFX Collaboration
ALOK_GFX_CONTACT=@AlokGFX  # Discord handle
ALOK_GFX_STORE_URL=https://your-alok-gfx-store-link
PT_ADMIN_DISCORD_ID=ADMIN_USER_ID  # Who can verify purchases
```

#### 31.8 Implementation Phases

**Phase 1 — Foundation:**
- Add `pt_designs`, `user_pt_licenses`, `tournament_pt_configs` tables to schema
- Create `/pt-store` public page
- Add `/pt store` bot command

**Phase 2 — Purchase & Verification:**
- Purchase proof submission form
- Admin verification flow
- License management commands

**Phase 3 — Scoring Integration:**
- `PTScoringConfig` in tournament creation wizard
- `/points calc` command
- Auto-generate text PT after each match

**Phase 4 — Image Generation:**
- Template overlay system
- Auto-post PT image to Discord
- Pinned PT message updates

---

## 32. Points Calculator & PT Setup System

### Scoring Engine Enhancement

The existing `packages/scoring` package needs these additions:

#### 32.1 Custom Points Table Builder (Website)

**Page:** `/servers/[guildId]/admin/tournaments/new` → Step 4 (Scoring & Ties)

**UI:**
```
PLACEMENT POINTS TABLE
──────────────────────
Position 1  (WWCD): [15] pts
Position 2:         [12] pts  
Position 3:         [10] pts
Position 4:         [ 8] pts
Position 5:         [ 6] pts
Position 6:         [ 4] pts
Position 7:         [ 3] pts
Position 8:         [ 2] pts
Position 9-16:      [ 1] pts
Position 17+:       [ 0] pts

Kill Points: [1] pts per kill
WWCD Bonus:  [0] pts (in addition to 1st place)
Penalty:     [-2] pts per no-show
Max Kill Cap: [unlimited / set limit]

[Use BGMI Standard] [Use Free Fire Standard] [Use Custom]
```

#### 32.2 Live Points Calculator Command

`/points calc [tournament_id] [match_id?]`

- No match_id: shows full tournament standings
- With match_id: shows points for that specific match
- Updates in real-time as results are approved

**Embed:**
```
📊 LIVE STANDINGS — Tournament Name
Matches Played: 3/6 | Scoring: 1pt/kill + placement

#1  Team Soul        89 pts (42 kills | 2 WWCD)
#2  GodLike Esports  71 pts (38 kills | 1 WWCD)
#3  Blind Esports    52 pts (31 kills | 0 WWCD)
...

[View Full Standings on Website →]
```

#### 32.3 Per-Tournament PT Configuration

When creating/editing a tournament, admin can:
1. Choose scoring preset (BGMI Standard, FF Standard, Custom)
2. Set custom kill points, placement table, penalties
3. Enable/disable PT auto-generation after each match
4. Select Alok GFX PT design (if they have a license)
5. Configure PT posting channel

This config is stored in `tournament_pt_configs` and used by the scoring engine.

---

*Last updated: October 2026*
*Platform: shadow-tournaments.vercel.app*
*Collaboration: Alok GFX × SHADØW TOURNAMENTS*
