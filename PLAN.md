# 🏆 LEGENDARY ESPORTS — Discord Bot Tournament Platform
## Production Implementation Plan & Task Book (Bot-Only)

> **Status:** Ready for implementation
> **Type:** Greenfield — Discord Bot + Worker Only
> **Developer:** Solo
> **Last updated:** 2026-10-24

---

## 📋 Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Core Architecture](#2-core-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Database Schema](#5-database-schema)
6. [Discord Bot Specification](#6-discord-bot-specification)
7. [Tournament Engine Specification](#7-tournament-engine-specification)
8. [Group Stage & Qualification System](#8-group-stage--qualification-system)
9. [Bracket System](#9-bracket-system)
10. [Registration & Confirmation System](#10-registration--confirmation-system)
11. [Room ID & Match Management](#11-room-id--match-management)
12. [Synchronization System](#12-synchronization-system)
13. [Game Engines](#13-game-engines)
14. [Payment Module](#14-payment-module)
14. [Analytics System](#15-analytics-system)
15. [Deployment Architecture](#16-deployment-architecture)
15. [Security Model](#17-security-model)
16. [Phase Task Breakdown](#18-phase-task-breakdown)
17. [Acceptance Criteria](#19-acceptance-criteria)
18. [Bot Personality & UX Guidelines](#20-bot-personality--ux-guidelines)
19. [Tournament Delay & Re-Registration](#21-tournament-delay--re-registration)
20. [Player DM Notification System](#22-player-dm-notification-system)
21. [Tournament Lifecycle & Auto-Archive](#23-tournament-lifecycle--auto-archive)
22. [Timezone-First Setup](#24-timezone-first-setup)
23. [Registration Format Templates](#25-registration-format-templates)
24. [Slot System & Force-Fill](#26-slot-system--force-fill)
25. [Map Pools by Game](#27-map-pools-by-game)
26. [Draft Auto-Expiry (30-Day Rule)](#28-draft-auto-expiry-30-day-rule)
27. [Admin Panel Brute-Force Protection](#29-admin-panel-brute-force-protection)
28. [Revised Payment Rules](#30-revised-payment-rules)
29. [Tournament ID System](#31-tournament-id-system)

---

## 1. Platform Overview

### Core Principle
**One server. One source of truth. One control interface — Discord.**

Discord servers are the foundation. Each Discord server is a **tenant**. The Discord bot is the **single interface** to the tournament engine. All tournament operations happen through slash commands, buttons, modals, and DMs in Discord.

### What Gets Built
- A **powerful tournament engine** — shared by BGMI, Free Fire, and COD Mobile with configurable formats, registration, rosters, match timing, scoring, standings, disputes, and winners
- A **fully integrated Discord bot** — tournament creation, editing, registration, match control, result verification, notifications, server settings, and recovery
- A **background worker** — BullMQ for scheduled jobs, notifications, match lifecycle, and outbox processing
- **No website** — all admin and player operations through Discord

### Multi-Tenancy Rule
A moderator in Server A must **never** get administrative access to Server B. Every database record belonging to a server carries that server's `guild_id`. Enforced at database level with foreign keys and at API level with mandatory scope checks.

---

## 2. Core Architecture

```
+------------------------------------------------------------------+
|                        DISCORD BOT INTERFACE                       |
|                                                                     |
|   Sapphire Framework on discord.js                                 |
|   - Slash Commands                                                 |
|   - Buttons and Modals                                             |
|   - Embeds and Components                                          |
|   - DM Notifications                                               |
|   - Persistent Control Panel (pinned message)                      |
+------------------+-------------------------------+----------------+
                   |                               |
                   v                               v
+------------------------------------------------------------------+
|                    SHARED BACKEND (Bot + Worker)                   |
|                                                                   |
|   Auth & Permissions  |  Tournament Engine  |  Game Rules         |
|   Registration        |  Match Scheduler    |  Scoring Engine     |
|   Bracket Engine      |  Group Stage Engine |  Audit Logging      |
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
1. Action arrives (Discord interaction: slash command, button, modal, DM)
2. Auth middleware validates session / guild membership
3. Permissions layer verifies guild membership + application role
4. Tenant scope is asserted (`guild_id` locked to the request)
5. Business logic executes in the shared engine package
6. Database transaction commits state change + outbox event atomically
7. Worker picks up outbox event, delivers to Discord
8. Supabase Realtime broadcasts to any connected clients (if any)
9. Outcome written to audit log

---

## 3. Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Monorepo | pnpm workspaces | Best disk efficiency, native workspace protocol |
| Bot Framework | Sapphire Framework on discord.js | Preconditions, plugin system, structured command handling |
| Database | Supabase PostgreSQL (free tier) | Managed Postgres, free tier, built-in auth |
| ORM | Prisma | Type-safe queries, migrations, transactions |
| Auth | Supabase Auth + Discord OAuth2 | Sessions, Discord provider, guilds scope |
| Job Queue | BullMQ + Upstash Redis (free tier) | Durable queues, scheduled jobs, idempotent keys, retries |
| Realtime | Supabase Realtime Broadcast | Authorized channels, live updates, free tier |
| File Storage | Supabase Storage | Evidence uploads, banner images, free tier |
| Deployment Bot+Worker | Render Background Worker | Persistent process, no spin-down, free tier |
| Error Tracking | Sentry | All apps instrumented |
| Form Validation | Zod | Schema-first, shared types across packages |

### Free Tier Limits to Monitor
- **Supabase:** 500MB database, 1GB storage, 2GB bandwidth, 50k Realtime messages/month
- **Upstash Redis:** 10k commands/day on free tier — use efficiently
- **Render:** 750 hours/month for background workers (enough for one always-on service)

---

## 4. Monorepo Structure

```
esports-platform/
├── apps/
│   ├── discord-bot/                  # Sapphire bot
│   │   ├── src/
│   │   │   ├── index.ts              # SapphireClient setup
│   │   │   ├── commands/
│   │   │   │   ├── server/           # /server setup, status
│   │   │   │   ├── tournament/       # /tournament *
│   │   │   │   ├── match/            # /match *
│   │   │   │   ├── register/         # /register
│   │   │   │   ├── group/            # /group * (NEW)
│   │   │   │   ├── bracket/          # /bracket * (NEW)
│   │   │   │   ├── winners/          # /winners
│   │   │   │   └── analytics/        # /analytics
│   │   │   ├── listeners/
│   │   │   │   ├── guild-create.ts
│   │   │   │   ├── guild-delete.ts
│   │   │   │   └── interaction-create.ts
│   │   │   ├── preconditions/
│   │   │   │   ├── GuildOnly.ts
│   │   │   │   ├── HasPermission.ts
│   │   │   │   └── BotInstalled.ts
│   │   │   ├── services/
│   │   │   │   ├── control-panel.ts
│   │   │   │   ├── embed-builder.ts
│   │   │   │   ├── group-manager.ts  (NEW)
│   │   │   │   ├── bracket-manager.ts (NEW)
│   │   │   │   └── notification-service.ts
│   │   │   └── utils/
│   │   │       ├── emojis.ts
│   │   │       ├── responses.ts
│   │   │       └── tournament-id.ts  (NEW - short IDs)
│   │   └── package.json
│   │
│   └── worker/                       # BullMQ worker process
│       ├── src/
│       │   ├── index.ts              # Worker startup
│       │   ├── processors/
│       │   │   ├── outbox.ts         # Outbox event processor
│       │   │   ├── notifications.ts  # Scheduled reminders
│       │   │   ├── scheduler.ts      # Match lifecycle jobs
│       │   │   ├── group-processor.ts (NEW)
│       │       │   ├── bracket-processor.ts (NEW)
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
│   │   │   ├── repositories/
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
│   │   │   ├── scheduler.ts
│   │   │   ├── state-machine.ts
│   │   │   ├── group-engine.ts       (NEW)
│   │   │   ├── bracket-engine.ts     (NEW)
│   │   │   └── qualification-engine.ts (NEW)
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
│   │   │   ├── index.ts
│   │   │   ├── orders.ts
│   │   │   ├── state-machine.ts
│   │   │   ├── webhooks.ts
│   │   │   └── refunds.ts
│   │   └── package.json
│   │
│   ├── notifications/                # Embed + notification templates
│   │   ├── src/
│   │   │   ├── discord-embeds.ts
│   │   │   ├── dm-templates.ts       (NEW)
│   │   │   └── templates/
│   │   └── package.json
│   │
│   └── shared-types/                 # Zod schemas + DTOs
│       ├── src/
│       │   ├── tournament.ts
│       │   ├── match.ts
│       │   ├── registration.ts
│       │   ├── scoring.ts
│       │   ├── group.ts              (NEW)
│       │   ├── bracket.ts            (NEW)
│       │   └── payment.ts
│       └── package.json
│
├── infrastructure/
│   ├── deployment/
│   │   └── render.yaml
│   └── monitoring/
│       └── health-check.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
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
| `server_role_bindings` | Discord role to app role mapping | `guild_id`, `discord_role_id`, `app_role` — server owner bypasses, always `SERVER_ADMIN` |
| `users` | Discord-linked accounts | `discord_id`, `username`, `avatar`, `created_at` |
| `game_profiles` | Per-game player identity | `user_id`, `game`, `ign`, `uid`, `is_verified` |
| `teams` | Team records | `guild_id`, `name`, `tag`, `captain_id`, `created_at` |
| `team_members` | Roster entries | `team_id`, `user_id`, `role`, `joined_at` |
| `tournaments` | Tournament config | `guild_id`, `name`, `short_id` (NEW), `game`, `mode`, `status`, `entry_type`, `entry_price`, `start_at`, `end_at`, `max_teams`, `teams_per_group`, `total_stages`, `qualifier_stages` |
| `tournament_rule_versions` | Config snapshots | `tournament_id`, `version`, `rules_json`, `created_at` |
| `stages` | Tournament stages | `tournament_id`, `name`, `type` (QUALIFIER/ELIMINATION), `order`, `status`, `is_locked` (NEW) |
| `groups` (NEW) | Group stage groups | `stage_id`, `group_number`, `group_type` (QUALIFIER/ELIMINATION), `max_teams` (12), `status` |
| `group_members` (NEW) | Teams assigned to groups | `group_id`, `registration_id`, `team_id`, `position` (1-12), `is_qualified` (NEW) |
| `matches` | Individual matches | `stage_id`, `guild_id`, `number`, `status`, `scheduled_start`, `scheduled_end`, `map`, `mode` |
| `match_segments` | Rounds/maps in a series | `match_id`, `segment_number`, `map`, `mode`, `status` |
| `match_participants` | Teams in a match | `match_id`, `team_id`, `seeding`, `group_id` (NEW - reference to group) |
| `registrations` | Tournament entries | `tournament_id`, `guild_id`, `team_id`, `status`, `payment_status`, `slot_number`, `group_id` (NEW) |
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

### New: Tournament State Machine (Extended)

```
DRAFT -> REGISTRATION_OPEN -> REGISTRATION_CLOSED -> CHECK_IN -> LIVE -> COMPLETED
      -> CANCELLED (from any state except COMPLETED)
COMPLETED -> ARCHIVED

NEW: Registration auto-close when all slots filled
```

### New: Group Stage State Machine

```
GROUP_CREATED -> REGISTRATION_ASSIGNING -> MATCHES_SCHEDULED -> MATCHES_IN_PROGRESS -> QUALIFICATION_PENDING -> QUALIFICATION_COMPLETE -> LOCKED
```

### New: Bracket State Machine

```
LOCKED -> BRACKET_GENERATED -> MATCHES_IN_PROGRESS -> COMPLETED
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
9. **NEW:** `groups.max_teams` defaults to 12
10. **NEW:** `tournaments.short_id` unique per server, format: `T{4-digit}` (e.g., `T0042`)

---

## 6. Discord Bot Specification

### Bot Personality
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
| `/server roles` | SERVER_ADMIN | Manage Discord role → app role mappings |

#### Tournament Commands
| Command | Permission | Description |
|---------|-----------|-------------|
| `/tournament create` | TOURNAMENT_MANAGER | Multi-step modal tournament creation |
| `/tournament edit [id]` | TOURNAMENT_MANAGER | Edit tournament via action panel |
| `/tournament publish [id]` | TOURNAMENT_MANAGER | Publish with confirmation |
| `/tournament cancel [id]` | TOURNAMENT_MANAGER | Cancel with reason |
| `/tournament list` | VIEWER | View all tournaments for this server |
| `/tournament info [id]` | VIEWER | Tournament details embed (shows short ID) |
| `/tournament participants [id]` | REFEREE+ | Paginated registrations with approve/reject buttons |
| `/tournament standings [id]` | VIEWER | Current leaderboard embed |
| `/tournament stages [id]` | TOURNAMENT_MANAGER | Configure stages (NEW) |

#### Group Commands (NEW)
| Command | Permission | Description |
|---------|-----------|-------------|
| `/group create [tournament]` | TOURNAMENT_MANAGER | Auto-create groups from registrations |
| `/group list [tournament]` | REFEREE+ | List groups with team assignments |
| `/group view [tournament] [group]` | TOURNAMENT_MANAGER | View group details with team roster |
| `/group assign [tournament] [group]` | TOURNAMENT_MANAGER | Manual group assignment |
| `/group remove [tournament] [group] [team]` | TOURNAMENT_MANAGER | Remove team from group, auto-fill |
| `/group lock [tournament] [group]` | TOURNAMENT_MANAGER | Lock group for match scheduling |
| `/group qualify [tournament] [group]` | TOURNAMENT_MANAGER | Open qualification reactions |

#### Bracket Commands (NEW)
| Command | Permission | Description |
|---------|-----------|-------------|
| `/bracket generate [tournament]` | TOURNAMENT_MANAGER | Generate bracket from qualified teams |
| `/bracket view [tournament]` | VIEWER | View bracket embed |
| `/bracket start [tournament]` | TOURNAMENT_MANAGER | Start bracket matches |
| `/bracket lock [tournament]` | TOURNAMENT_MANAGER | Lock/unlock bracket |

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
- Group Status (NEW)

Updates automatically via the outbox worker whenever any of these counts change.

### Room Credential Delivery
- Room credentials are **never** posted in a public channel embed
- Delivered via ephemeral message or configured private thread
- If private delivery fails, credentials stay on the website's authorized match page (if website exists later)
- Admin is alerted if delivery fails after 3 attempts

---

## 7. Tournament Engine Specification

### Tournament Creation Wizard (Discord Modal Flow)

**Step 1 — General Settings**
- Tournament name
- Description
- Game (BGMI / Free Fire / COD Mobile)
- Mode (BR / Clash Squad / Multiplayer)
- Organizer (optional)
- Visibility (Public / Private)
- Banner URL
- Rules URL
- **Short ID auto-generated** (format: `T{4-digit}`, e.g., `T0042`)

**Step 2 — Registration & Participants**
- Max teams (e.g., 600)
- Roster min/max (2-4 for BR, 5 for CODM)
- Substitutes allowed (0-2)
- Waitlist enabled
- Registration format (Full with Sub / Captain-based / Simple Mentions)
- Auto-approve toggle
- Registration deadline
- Entry type (Free / Paid) + Price if paid
- Currency (INR default)

**Step 3 — Group Stage Configuration (NEW)**
- Teams per group (default 12, max 12)
- Total stages (e.g., 5 stages: 3 Qualifier + 2 Elimination)
- Qualifier stages count (e.g., 3 out of 5)
- Auto-close registration when max teams reached
- Group assignment: Auto / Manual / Balanced

**Step 4 — Schedule & Format**
- Timezone (required before scheduling)
- Registration open date
- Registration close date
- Check-in window
- Start date
- Match duration per stage

**Step 5 — Scoring & Tie-breakers**
- Game-specific scoring config
- Placement points table
- Kill value
- Penalty deductions
- Tie-breaker order

**Step 6 — Winners & Awards**
- Placements (1st, 2nd, 3rd)
- MVP, Top Fragger, Best Team
- Custom awards
- Prize descriptions

**Step 7 — Discord Setup & Publish**
- Channel selectors (announcement, match, results, disputes, registration, admin)
- Notification templates
- Role assignments
- Preview
- Publish

### Auto-Close Registration When Full
When `tournament.acceptedCount >= tournament.teamCapacity`:
1. Automatically set `status = REGISTRATION_CLOSED`
2. Set `registration_phase = CLOSED`
3. Send notification to registration channel
4. DM captains of waitlisted teams
5. Update control panel

---

## 8. Group Stage & Qualification System (NEW)

### Group Structure
- **Max 12 teams per group** (configurable, default 12)
- Groups created automatically when tournament publishes
- Groups named: `Group A`, `Group B`, `Group C`... or `Qualifier Group 1`, `Qualifier Group 2`...
- **Auto-create logic:** `total_groups = ceil(accepted_teams / teams_per_group)`
- Example: 600 teams / 12 = 50 groups for Qualifier Round 1

### Group Creation Flow
1. Tournament publishes → `status = REGISTRATION_CLOSED`
2. Get all `APPROVED` registrations
3. Calculate `total_groups = ceil(count / teams_per_group)`
4. For each group:
   - Create `groups` record with `group_number`, `group_type=QUALIFIER`, `max_teams=12`
   - Assign 12 teams sequentially (or balanced by skill if configured)
   - Create `group_members` records with `position` 1-12
5. Create Discord category: `🏆 Tournament Name - Qualifiers`
6. For each group, create channel: `group-{number}` (private, only assigned teams see)
7. Post group embed in channel with team list and members

### Group Privacy System
- **Each group has a private Discord channel** (or thread)
- **Channel permissions:** Only assigned team members (captain + players) + admins can see
- **Group 1 players CANNOT see Group 2 channel** and vice versa
- Implemented via Discord channel permission overwrites

### Group Embed Format
```
🏆 TOURNAMENT NAME — QUALIFIER GROUP 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Status: REGISTRATION ASSIGNING / MATCHES SCHEDULED / IN PROGRESS / QUALIFICATION
👥 Teams: 12/12 | Max: 12

🏳️ TEAM ROSTER:
1️⃣ Team Alpha [TMA] — @Captain @Player2 @Player3 @Player4
2️⃣ Team Beta [TMB] — @Captain @Player2 @Player3
...
12️⃣ Team Lambda [TML] — @Captain @Player2 @Player3 @Player4 @Sub

📋 Rules: 12 teams, top 4 qualify to next stage
⏰ Matches: Starting <t:timestamp:R>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Team Removal & Auto-Fill
**Command:** `/group remove [tournament] [group] [team]`

When admin removes a team:
1. Set `group_members.status = REMOVED` with reason
2. Find next waitlisted registration (`WAITLISTED` status, oldest first)
3. If found:
   - Promote to `APPROVED`
   - Assign to the freed `position` in group
   - DM new team: "You've been promoted from waitlist to Group X!"
4. If no waitlist: position stays empty, group has 11/12 teams
5. Log in audit log
6. Update group embed

### Qualification System
**Qualification Reaction Embed (sent after group matches complete):**

```
🏆 QUALIFICATION — GROUP 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
React with the team number that QUALIFIED:
1️⃣ Team Alpha [TMA] — 45 pts, 12 kills
2️⃣ Team Beta [TMB] — 38 pts, 8 kills
3️⃣ Team Gamma [TMG] — 35 pts, 10 kills
...
12️⃣ Team Lambda [TML] — 12 pts, 3 kills

✅ Top 4 qualify to next stage
🔒 Only ADMINS/TOURNAMENT_MANAGERS reactions count
⏰ Closes in 24 hours
```

**Rules:**
- Embed has reactions 1️⃣ through 🔟 (up to 12)
- **Only ADMINS/TOURNAMENT_MANAGERS** reactions count
- If other users react → ignored (filtered in handler)
- Admin can react multiple numbers (e.g., 1️⃣ 2️⃣ 3️⃣ 4️⃣ for top 4)
- When qualification complete:
  1. Mark `group_members.is_qualified = true` for selected
  2. Create next stage groups if not exist
  3. Assign qualified teams to next stage groups (sequential fill)
  4. Post new group embeds in next stage category
  5. DM qualified team captains: "Your team qualified to Group X of Stage Y!"

### Auto-Create Next Stage Groups
When qualification completes for all groups in a qualifier stage:
1. Collect all qualified teams across groups
2. Calculate next stage groups: `ceil(qualified_count / teams_per_group)`
3. Create next stage (type: QUALIFIER if more qualifier stages remain, else ELIMINATION)
4. Assign qualified teams to new groups
5. Create Discord channels for new groups
6. Post embeds
7. Update tournament stage status

### Match Finish → Next Group Flow
When a group match finishes:
1. Results approved → standings calculated
2. `/group qualify` opens reaction embed
3. Admins react with qualified team numbers
4. System creates next stage groups if needed
6. Qualified teams assigned to next groups
7. New group embeds posted in next stage category

---

## 9. Bracket System (NEW)

### Bracket Timing
- **Bracket starts at 3rd last stage, 2nd last stage, and last stage ONLY**
- **Example 5 stages:**
  - Stage 1: Qualifier Groups (locked)
  - Stage 2: Qualifier Groups (locked)
  - Stage 3: Qualifier Groups → **Bracket starts here** (Round of X)
  - Stage 4: Elimination Groups → **Bracket continues** (Quarter/Semi)
  - Stage 5: Finals → **Bracket final** (Grand Final)

### Bracket Lock System
- Stages 1 to (total_stages - 3) are **LOCKED** for bracket
- Bot shows 🔒 lock icon on bracket tab for early stages
- Tooltip: "Bracket starts at Stage 3 (Qualifier Round 3)"
- Admins can `/bracket lock` to manually control

### Bracket Generation
- From qualified teams of all previous stages
- Seeding based on: total points → total kills → best placement
- Single elimination bracket
- Best-of-N configurable per stage
- Auto-generate matches with room credentials

### Bracket Embed
```
🏆 TOURNAMENT NAME — ELIMINATION BRACKET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 3: Round of 16 (Best of 3)     🔓 UNLOCKED
Stage 4: Quarter Finals (Best of 5)  🔒 LOCKED
Stage 5: Semi/Finals (Best of 5)     🔒 LOCKED

🥇 Winner: TBD
🥈 Runner-up: TBD
🥉 3rd Place: TBD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 10. Registration & Confirmation System

### Registration Modal
Collects based on format:
- **Simple Mentions:** Captain mentions @members
- **Captain-based:** Captain info + @members
- **Full Player Details:** Each player's IGN, UID, Game Profile
- **Team with Substitute:** Main roster + 1-2 subs
- **CODM 5-Player:** Fixed 5 players
- **Full with Substitute:** Full roster + sub details

### Auto-Approval System
- If `auto_approve = true`: Instant `APPROVED`, slot assigned, DM sent
- If `auto_approve = false`: `PENDING` → admin approve/reject via `/tournament participants`

### Confirmation DM (Sent to Captain + ALL Members)
```
🎮 REGISTRATION CONFIRMED
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Tournament: [Tournament Name] (#T0042)
🎮 Game: BGMI — Battle Royale
👥 Team: Team Alpha [TMA]
👑 Captain: @CaptainUser
📋 Roster: 4 players (+1 sub)

📅 Schedule:
   Registration Closes: <t:timestamp:R>
   Check-in Opens: <t:timestamp:R>
   Tournament Starts: <t:timestamp:R>

📝 Your Slot: #12 (Group A — assigned after registration closes)
🔗 Discord: This server's tournament channels

⚠️ Important:
• Check-in opens 30 min before match — don't miss it!
• Room credentials sent via DM 15 min before match
• No-show = forfeit + slot to waitlist

Good luck! 🍀
```

### Rejection Notification (DM to Captain)
```
❌ REGISTRATION REJECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Tournament: [Tournament Name] (#T0042)
👥 Team: Team Alpha [TMA]

Reason: [Admin provided reason or "Incomplete roster / Invalid UID / Duplicate registration"]

You may re-register if the issue is fixed before registration closes.
```

### Waitlist Promotion DM
```
⬆️ PROMOTED FROM WAITLIST!
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Tournament: [Tournament Name] (#T0042)
👥 Team: Team Alpha [TMA]

A slot opened up! You've been promoted to Group B, Position 3.
Check the tournament channels for your group assignment.
```

---

## 11. Room ID & Match Management

### Room Credential Generation
- Generated at `room_credentials.release_at` (configurable, e.g., 15 min before match)
- Unique room ID + password per match
- Delivered via DM to **captain only** (ephemeral fallback)
- Format:
```
🔐 ROOM CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━
🏆 Match: #12 — Team Alpha vs Team Beta
🗺 Map: Erangel | 🎮 Mode: BR Squads
🆔 Room ID: 84729103
🔑 Password: T0042-BR-12
⏰ Expires: <t:timestamp:R>

⚠️ Share ONLY with your team. Do not post publicly.
```

### Match Channel Structure
```
🏆 TOURNAMENT NAME
├── 📢 announcements
├── 📋 registration
├── 🏁 check-in
├── 🏆 QUALIFIERS (Category)
│   ├── 🔒 group-1 (Private - Group 1 teams only)
│   ├── 🔒 group-2 (Private - Group 2 teams only)
│   └── ...
├── ⚔️ ELIMINATION (Category)
│   ├── 🔓 bracket-round-1 (Public)
│   └── 🔓 bracket-qf (Public)
├── 📊 results
└── ⚖️ disputes
```

---

## 12. Synchronization System

### The Transactional Outbox Pattern
Every mutation requiring Discord update:
1. Opens database transaction
2. Updates tournament/match/registration state
3. Writes `outbox_events` record in **same transaction**
4. Commits atomically

### BullMQ Worker
1. Polls `outbox_events` for PENDING
2. Executes Discord API operation
3. Records Discord message ID in `discord_message_bindings`
4. Marks outbox event DELIVERED
5. On failure: increments `retry_count`, exponential backoff
6. After 5 failures: marks FAILED, creates admin alert

### Rate Limit Handling
- Worker reads `X-RateLimit-Remaining` and `X-RateLimit-Reset-After`
- On 429: reads `Retry-After`, uses BullMQ delay
- Global rate limit bucket tracked across all operations

### Scheduled Jobs (NEW for Groups)
- Group creation job (after registration closes)
- Match scheduling job (per group)
- Qualification reaction timer (24h after matches)
- Next stage group creation (after qualification)
- Bracket generation (when elimination stages unlock)

---

## 13. Game Engines

### Shared Interface
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
- Placement points table (configurable)
- Kill value (configurable)
- Penalty deductions
- Aggregates across all matches
- Tie-breaker: Points → Kills → Best Placement → Match Wins
- Formula: `Match Points = Placement Points + (Kills × Kill Value) - Penalties`

### Free Fire — Battle Royale / Clash Squad
- BR: Same as BGMI, independent config
- Clash Squad: Round-based, first to threshold wins, map rotation

### COD Mobile — Multiplayer / Battle Royale
- Multiplayer: Best-of-N, first to ceil(N/2) map wins
- BR: Same scoring model as BGMI

### Engine Rules
- Pure functions — no DB calls, no side effects
- Called with `tournament_rule_versions` snapshot
- Standings from approved `score_events` only
- Corrections = new `score_events` with `type: CORRECTION`

---

## 14. Payment Module

### Feature Flag
```typescript
if (!process.env.PAYMENTS_ENABLED || process.env.PAYMENTS_ENABLED !== 'true') {
  throw new PaymentsDisabledError('Payment module is disabled pending legal review.')
}
```

### Payment States
```
pending -> paid (Razorpay webhook: payment.captured — verified)
pending -> failed (Razorpay webhook: payment.failed)
pending -> expired (deadline passed, slot released)
failed -> refunded (automatic)
paid -> disputed (chargeback — manual review)
disputed -> refunded (chargeback upheld)
```

### Strict Approval Rule
Only `status = paid` (verified by Razorpay webhook) activates registration. Browser callback never trusted.

---

## 15. Analytics System

### Metrics Per Server (guild_id scoped)
- Registrations over time
- Fill rate by tournament
- Match completion rate
- Top teams by points
- Most active players
- Tournament format distribution
- Points trend per team

### Exports
CSV for: tournaments, registrations, match results, audit log

---

## 16. Deployment Architecture

### Render (Bot + Worker)
- Two separate Render **background worker** services
  - `discord-bot` — `apps/discord-bot`
  - `worker` — `apps/worker`
- Auto-deploy on `main` branch push

### Supabase
- Free tier project
- RLS enabled on all tenant tables
- Realtime enabled for `tournaments`, `matches`, `score_events`, `groups`
- Storage buckets: `evidence` (private), `banners` (public)

### Environment Variables
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
SENTRY_DSN_BOT=
SENTRY_DSN_WORKER=
NODE_ENV=production
```

---

## 17. Security Model

### Two-Layer Permission Check
1. **UI layer:** hide controls (UX only)
2. **API layer:** verify permissions server-side on every request

### Application Roles
| Role | Capabilities |
|------|-------------|
| `VIEWER` | Read public tournament data |
| `PLAYER` | Register teams, submit results, check in |
| `REFEREE` | Approve/reject results, resolve disputes, view registrations |
| `TOURNAMENT_MANAGER` | Create/edit/publish/cancel tournaments, manage participants, groups, brackets |
| `SERVER_ADMIN` | All above + server settings, role bindings, payment operations, audit logs |

### Server Owner: Automatic `SERVER_ADMIN`
- Detected via Discord `owner_id`
- Cannot be revoked by other admins
- Only one who can configure staff roles

### Staff Management via Discord
`/server roles list|add|remove|members`

---

## 18. Phase Task Breakdown

### PHASE 1 — Foundation
**Goal:** Working monorepo, database, auth, bot skeleton

#### Task 1: Monorepo Scaffold
- pnpm workspace with `apps/discord-bot`, `apps/worker`, `packages/*`
- Shared `tsconfig.base.json`, ESLint, Prettier
- Git initialized

#### Task 2: Database Schema
- Full Prisma schema with all entities (including NEW: `groups`, `group_members`, `tournaments.short_id`)
- Run initial migration

#### Task 3: Discord OAuth2 Auth
- Supabase Auth + Discord OAuth2
- `/api/auth/callback`, `/api/auth/me`
- Upsert user on first login

#### Task 4: Bot Skeleton
- SapphireClient setup
- Preconditions: `GuildOnly`, `HasPermission`, `BotInstalled`
- Basic command structure

#### Task 5: Tournament Engine Core
- Create, publish, cancel, finalize
- State machines

---

### PHASE 2 — Group Stage System (NEW - CRITICAL)
**Goal:** Complete group stage automation

#### Task 6: Group Engine (`packages/tournament-engine/src/group-engine.ts`)
- `createGroups(tournamentId)` — auto-create groups from registrations
- `assignTeamsToGroups(tournamentId)` — sequential/balanced assignment
- `removeTeamFromGroup(groupId, teamId, reason)` — remove + auto-fill from waitlist
- `getGroupStandings(groupId)` — calculate points within group
- `getQualifiedTeams(groupId, count)` — top N teams

#### Task 7: Discord Group Management
- `/group create` command
- Auto-create Discord category + private channels per group
- Channel permission overwrites (group privacy)
- Post group embed with team roster
- Update embed on team assignment/removal

#### Task 8: Qualification Reaction System
- `/group qualify` command
- Send reaction embed with 1️⃣-🔟
- Reaction handler: filter only ADMIN/TOURNAMENT_MANAGER
- On reaction: mark qualified, create next stage groups
- Auto-assign qualified teams to next groups

#### Task 9: Next Stage Auto-Creation
- Detect when all groups in stage qualified
- Create next stage (QUALIFIER or ELIMINATION)
- Assign qualified teams sequentially
- Create Discord channels for new groups

---

### PHASE 3 — Bracket System (NEW)
**Goal:** Elimination bracket from qualified teams

#### Task 10: Bracket Engine (`packages/tournament-engine/src/bracket-engine.ts`)
- `generateBracket(tournamentId, qualifiedTeams)` — single elimination
- Seeding: points → kills → best placement
- Best-of-N per stage configurable
- Lock stages 1 to (total-3)

#### Task 11: Discord Bracket Management
- `/bracket generate` command
- `/bracket view` embed with lock icons
- `/bracket start` — schedule matches, generate room credentials
- Auto-schedule bracket matches per stage

---

### PHASE 4 — Registration & Notifications
**Goal:** Complete registration flow with detailed DMs

#### Task 10: Registration Modal & Confirmation
- Multi-format registration modals
- Auto-approval logic
- **Detailed confirmation DM** to captain + ALL members
- **Rejection DM** with reason
- **Waitlist promotion DM**

#### Task 11: Notification Service
- Scheduled reminders (24h, 15min, 5min, check-in)
- Room credential delivery (DM to captain)
- Result submission confirmations
- Dispute notifications

---

### PHASE 5 — Match & Room Management
**Goal:** Room credentials, match lifecycle

#### Task 12: Room Credential System
- Generate unique room ID + password
- Schedule release at configurable time before match
- DM to captain (ephemeral fallback)
- Expiry handling

#### Task 13: Match Lifecycle
- Check-in flow
- Result submission modal
- Approve/reject workflow
- Dispute system

---

### PHASE 6 — Admin Dashboard & Settings
**Goal:** Server config, staff management

#### Task 14: Server Setup Wizard
- `/server setup` multi-step modal
- Timezone (required before scheduling)
- Channel mappings
- Role bindings
- Branding

#### Task 15: Control Panel
- Pinned message with buttons
- Live counts, auto-update via outbox

---

## 19. Acceptance Criteria

### Group Stage
- [ ] 600 teams → 50 groups of 12 auto-created on publish
- [ ] Each group has private Discord channel (only assigned teams see)
- [ ] Team removal → waitlist promotion → auto-assign to same position
- [ ] Qualification reactions → only admins count → qualified teams move to next stage
- [ ] Next stage groups auto-created with qualified teams
- [ ] Group embeds update in real-time

### Bracket System
- [ ] Bracket locked until Stage (total-3)
- [ ] Bracket generates from qualified teams with correct seeding
- [ ] Bracket matches scheduled with room credentials

### Registration
- [ ] Captain + all members receive detailed confirmation DM
- [ ] Rejection sends DM with reason
- [ ] Waitlist promotion sends DM
- [ ] Auto-close when max teams reached

### Tournament ID
- [ ] Short ID format: `T{4-digit}` (e.g., `T0042`)
- [ ] Displayed next to tournament name everywhere

### Notifications
- [ ] DM to captain + all members on confirm/reject/waitlist
- [ ] Room credentials DM to captain
- [ ] Match reminders (24h, 15min, 5min)

---

## 20. Bot Personality & UX Guidelines
*(Same as before — warm, professional, esports-native, custom emojis)*

---

## 21. Tournament Delay & Re-Registration
*(Same as before — max delay days, re-registration logic)*

---

## 22. Player DM Notification System

### DM Templates
- Registration confirmed (captain + members)
- Registration rejected (captain)
- Waitlist promoted (captain + members)
- Check-in reminder (captain)
- Room credentials (captain)
- Match starting soon (captain + members)
- Result submitted (captain)
- Result approved/rejected (captain)
- Dispute opened (captain + admin)
- Dispute resolved (captain)
- Qualification (captain + members)
- Bracket match scheduled (captain)
- Tournament completed (captain)

### Delivery Guarantees
- Ephemeral fallback if DM fails
- Log failed DMs for admin review
- Rate limit: max 1 DM per user per 5 seconds

---

## 23. Tournament Lifecycle & Auto-Archive

### State Transitions
```
DRAFT -> REGISTRATION_OPEN -> REGISTRATION_CLOSED -> CHECK_IN -> LIVE -> COMPLETED -> ARCHIVED
      -> CANCELLED (any except COMPLETED)
```

### Auto-Close Registration
When `acceptedCount >= teamCapacity`:
1. `status = REGISTRATION_CLOSED`
2. `registration_phase = CLOSED`
3. Auto-create groups
4. Notify via channel + DM

### Auto-Archive
30 days after `COMPLETED` → `ARCHIVED` (configurable)

---

## 24. Timezone-First Setup
- Server must set timezone before scheduling (`/server setup` step 1)
- All match times stored UTC, displayed in server timezone
- `server_settings.timezone` required for `/tournament create` step 3

---

## 25. Registration Format Templates
1. **Simple Mentions** — `@captain @player2 @player3 @player4`
2. **Captain-based** — Captain info + mentions
3. **Full Player Details** — Each player: IGN, UID, Game Profile
4. **Team with Substitute** — Main roster + 1-2 subs
5. **CODM 5-Player** — Fixed 5 players
6. **Full with Substitute** — Full roster + sub details

---

## 26. Slot System & Force-Fill
- Slots 1 to teamCapacity
- Auto-assign on approve
- `/tournament force-fill` for admin override
- Waitlist promotion = FIFO

---

## 27. Map Pools by Game
- BGMI: Erangel, Miramar, Sanhok, Vikendi, Livik
- Free Fire: Bermuda, Purgatory, Kalahari
- COD Mobile: Multiplayer maps + BR maps

---

## 28. Draft Auto-Expiry (30-Day Rule)
- Draft tournaments auto-expire after 30 days
- Notification at 7 days, 1 day before
- Can be extended by admin

---

## 29. Admin Panel Brute-Force Protection
- Track failed admin access attempts
- Ban after 5 failures (configurable)
- Auto-lift after 24h or manual

---

## 30. Revised Payment Rules
*(Same as before — feature flag, strict webhook verification)*

---

## 31. Tournament ID System (NEW)

### Short ID Format
- **Format:** `T{4-digit}` (e.g., `T0001`, `T0042`, `T9999`)
- **Per-server unique** (not global)
- **Auto-increment** per server
- **Displayed everywhere:** Next to tournament name in all embeds, lists, DMs

### Implementation
```typescript
// packages/shared-types/src/tournament.ts
export const TOURNAMENT_ID_REGEX = /^T\d{4}$/

// Generate next short ID for server
async function generateShortId(prisma, guildId: string): Promise<string> {
  const lastTournament = await prisma.tournament.findFirst({
    where: { guildId },
    orderBy: { shortId: 'desc' },
    select: { shortId: true }
  })
  const nextNum = lastTournament ? parseInt(lastTournament.shortId.slice(1)) + 1 : 1
  return `T${nextNum.toString().padStart(4, '0')}`
}
```

### Display Examples
- Embed title: `🏆 Tournament Name #T0042`
- List: `T0042 — Tournament Name`
- DM: `🏆 Tournament Name #T0042`
- Bracket: `T0042 — Elimination Bracket`

---

## Appendix: New Database Tables for Groups & Brackets

```prisma
model Group {
  id            String   @id @default(cuid())
  stageId       String
  stage         Stage    @relation(fields: [stageId], references: [id], onDelete: Cascade)
  groupNumber   Int
  groupType     GroupType @default(QUALIFIER)
  maxTeams      Int      @default(12)
  status        GroupStatus @default(REGISTRATION_ASSIGNING)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  members       GroupMember[]
  matches       Match[]

  @@unique([stageId, groupNumber])
  @@index([stageId])
}

model GroupMember {
  id            String   @id @default(cuid())
  groupId       String
  group         Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  registrationId String
  registration  Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  teamId        String
  team          Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  position      Int      // 1-12
  isQualified   Boolean  @default(false)
  status        GroupMemberStatus @default(ASSIGNED)
  removedReason String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([groupId, position])
  @@unique([groupId, registrationId])
}

enum GroupType {
  QUALIFIER
  ELIMINATION
}

enum GroupStatus {
  REGISTRATION_ASSIGNING
  MATCHES_SCHEDULED
  MATCHES_IN_PROGRESS
  QUALIFICATION_PENDING
  QUALIFICATION_COMPLETE
  LOCKED
}

enum GroupMemberStatus {
  ASSIGNED
  REMOVED
  QUALIFIED
  ELIMINATED
}
```

### Stage Updates
```prisma
model Stage {
  // ... existing fields
  isLocked      Boolean @default(false)  // For bracket lock
  stageType     StageType @default(QUALIFIER)
  
  groups        Group[]
}

enum StageType {
  QUALIFIER
  ELIMINATION
}
```

### Tournament Updates
```prisma
model Tournament {
  // ... existing fields
  shortId           String   @unique @map("short_id") // T0042
  maxTeams          Int      @default(100) @map("max_teams")
  teamsPerGroup     Int      @default(12) @map("teams_per_group")
  totalStages       Int      @default(3) @map("total_stages")
  qualifierStages   Int      @default(2) @map("qualifier_stages")
  autoCloseOnFull   Boolean  @default(true) @map("auto_close_on_full")
}
```

---

This plan now focuses **entirely on the Discord bot** with comprehensive group stage, bracket, qualification, and notification systems. All website references removed. The bot handles everything from tournament creation → group auto-creation → qualification reactions → bracket generation → match management → winner announcement.