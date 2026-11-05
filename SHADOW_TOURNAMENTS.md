# SHADØW TOURNAMENTS — Complete System Specification

> **Document version:** November 2026
> **Status:** Canonical build reference for developers
> **Scope:** Discord-native tournament platform for BGMI, Free Fire & COD Mobile

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Supported Games & Modes](#2-supported-games--modes)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Server Onboarding & Setup](#4-server-onboarding--setup)
5. [Tournament Creation](#5-tournament-creation)
6. [Tournament Identity & Lifecycle](#6-tournament-identity--lifecycle)
7. [Tournament Management Commands](#7-tournament-management-commands)
8. [Automated Registration System](#8-automated-registration-system)
9. [Group Stage & Qualification](#9-group-stage--qualification)
10. [Bracket & Elimination](#10-bracket--elimination)
11. [Match Operations](#11-match-operations)
12. [Results, Scoring & Disputes](#12-results-scoring--disputes)
13. [Game-Specific Scoring Engines](#13-game-specific-scoring-engines)
14. [Tournament Finalization & Winners](#14-tournament-finalization--winners)
15. [PT — Points Table System (Alok GFX)](#15-pt--points-table-system-alok-gfx)
16. [Payment System (Razorpay + Stripe)](#16-payment-system-razorpay--stripe)
17. [Background Worker & Automation](#17-background-worker--automation)
18. [Transactional Outbox & Discord Sync](#18-transactional-outbox--discord-sync)
19. [Database Schema](#19-database-schema)
20. [Technology Stack & Architecture](#20-technology-stack--architecture)
21. [Deployment](#21-deployment)
22. [Complete Command Reference](#22-complete-command-reference)
23. [Dashboard Sync](#23-dashboard-sync)

---

## 1. Platform Overview

SHADØW is a multi-tenant, Discord-native esports tournament management platform. Each Discord server is an independent tenant that owns its tournaments, settings, roles and records.

### Three Technical Layers

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| **Discord Bot** | Sapphire + discord.js | Commands, buttons, modals, embeds, DMs, persistent panels, channel creation |
| **Tournament Engine** | TypeScript packages | Rules, registrations, stages, groups, brackets, matches, scoring, permissions |
| **Background Worker** | BullMQ + Upstash Redis | Notifications, scheduling, Discord sync, waitlist processing, retries, monitoring |

### Monorepo Structure

```
esports-platform/
├── apps/
│   ├── discord-bot/       # Sapphire bot — commands, listeners, preconditions
│   ├── worker/             # BullMQ worker — outbox, scheduled jobs, sync
│   └── web/               # Next.js dashboard (read-only companion)
├── packages/
│   ├── database/           # Prisma schema, client, migrations
│   ├── permissions/        # Role resolution, tenant scoping
│   ├── tournament-engine/  # Lifecycle, transitions, ID generation
│   ├── game-rules/         # Per-game validation
│   ├── scoring/            # Standings calculation
│   ├── payments/           # Razorpay integration
│   ├── notifications/      # DM/embed builders
│   └── shared-types/       # Zod schemas, shared types
├── infrastructure/
├── tests/
└── pnpm-workspace.yaml
```

Business logic lives in shared packages, not duplicated inside bot commands. The bot calls shared packages, the database package owns persistence, the permissions package controls access, and the worker handles async jobs.

---

## 2. Supported Games & Modes

Each game has separate scoring validation and configuration. The engine must not assume that a BGMI squad match, a Free Fire Clash Squad series and a COD Mobile multiplayer series follow identical rules.

| Game | Modes | Competition Format |
|------|-------|--------------------|
| **BGMI** | Battle Royale | Squad-based, placement + kill scoring |
| **Free Fire** | Battle Royale, Clash Squad | BR uses placement+kills; Clash Squad uses round wins |
| **COD Mobile** | Multiplayer, Battle Royale | MP uses best-of-N map wins; BR uses placement+kills |

---

## 3. User Roles & Permissions

### Five Application Roles

| Role | Responsibility |
|------|---------------|
| `VIEWER` | View public tournaments, schedules, brackets, standings, winners |
| `PLAYER` | Register teams, check in, submit results, raise disputes |
| `REFEREE` | Verify results, approve/reject them, resolve disputes |
| `TOURNAMENT_MANAGER` | Create and operate tournaments, manage participants, groups, brackets |
| `SERVER_ADMIN` | Full server-level admin, role config, settings, payments, audit access |

### How Permissions Work

A Discord role is mapped to a SHADØW application role. For example:

| Discord Role | SHADØW Role |
|-------------|-------------|
| Tournament Host | `TOURNAMENT_MANAGER` |
| Referee Team | `REFEREE` |
| Head Admin | `SERVER_ADMIN` |

The server owner receives `SERVER_ADMIN` automatically.

The permission package checks the member's current Discord guild roles and resolves their highest mapped application role. The actual action must be authorized in the shared service layer — not just hidden from the command list.

### Tenant Isolation

Every server-owned record is associated with `guildId`. Server A's tournament queries must be scoped to Server A. Server B's registration data must not be available to Server A's manager. This is a non-negotiable database and authorization requirement.

---

## 4. Server Onboarding & Setup

### 4.1 Bot Joins a Server

When SHADØW is invited to a Discord guild:

1. The `guildCreate` listener fires.
2. It upserts the `DiscordServer` record (guildId, name, icon, ownerId, isActive).
3. It upserts `ServerSettings` (timezone: UTC, timezoneConfigured: false).
4. It DMs the server owner a welcome embed with setup instructions.

### 4.2 Server Setup

Server-wide configuration (not tournament-specific):

| Setting | Controls |
|---------|---------|
| Timezone | All tournament dates, times, reminders, countdown calculations |
| Staff roles | Which Discord roles map to SHADØW application permissions |
| Announcement channel | General tournament announcements |
| Admin channel | Administrative messages and control panel |
| Server branding | Logo, banner, accent color |
| Notification preferences | Which events generate Discord notifications |

Timestamps are stored in UTC. The server timezone is used for scheduling calculations and human-readable display. Discord timestamp markup (`<t:...>`) displays times in each viewer's local timezone.

### 4.3 Role Configuration

The server owner configures which Discord roles receive administrative permissions:

| Command | Function |
|---------|---------|
| `/server roles list` | List all Discord→app role bindings |
| `/server roles add` | Bind a Discord role to an app permission level |
| `/server roles remove` | Remove a role binding |
| `/server roles members` | Show who has admin access and which role grants it |

---

## 5. Tournament Creation

### 5.1 Eight-Step Creation Wizard

The tournament creation wizard (`/tournament create`) guides the organizer through a multi-step modal/select/button flow. The server owner or admin creates all Discord channels beforehand and selects them in the wizard — **the bot never creates Discord channels or categories on its own**.

| Step | Configuration |
|------|--------------|
| **1 — General Settings** | Tournament name, game, team size, max teams |
| **2 — Game Mode** | Select game mode based on chosen game |
| **3 — Schedule** | Tournament start date, registration close date, prize pool |
| **4 — Entry Type** | FREE or PAID (if PAID, entry fee modal + payment provider selection) |
| **5 — Channel Selection** | Admin selects existing Discord channels for this tournament (see §5.3) |
| **6 — Scoring & Rules** | Game-specific scoring settings, placement/kill points, penalties, tie-breakers |
| **7 — Confirmation** | Review all details before publishing |
| **8 — Publish/Draft** | PUBLISH NOW (opens registration immediately) or SAVE AS DRAFT |

### 5.2 What Gets Created

When a tournament is created, the following are persisted:

- A `Tournament` record with all configuration
- A sequential short ID (see §6.1)
- A `TournamentRuleVersion` snapshot of the active rules
- Channel IDs referencing existing channels the admin selected
- An audit log entry
- An outbox event if published immediately

The bot does **not** create any Discord channels, categories, or voice channels. All channels must be pre-created by the server owner/admin and selected during the wizard.

### 5.3 Channel Selection Step

The admin selects existing Discord text channels for each tournament function. Every channel is optional except registration — the admin can skip channels they don't need and the bot will fall back to server-level settings where available.

| Channel | Required | Purpose |
|---------|----------|---------|
| **Registration channel** | Yes | Where players post their team registration messages |
| **Approved registrations** | Recommended | Where the bot posts approved team embeds |
| **Announcement channel** | Optional | Tournament announcements (falls back to server-level setting) |
| **Match channel** | Optional | Match schedules and live match updates |
| **Results channel** | Optional | Approved results and standings posts |
| **Disputes channel** | Optional | Dispute threads and resolution posts |
| **Admin channel** | Optional | Administrative messages and control panel (falls back to server-level setting) |

---

## 6. Tournament Identity & Lifecycle

### 6.1 Sequential Short IDs

Every tournament receives a sequential short ID per Discord server:

```
T0001  T0002  T0003  ...  T9999
```

- Format: `T` + 4-digit zero-padded number.
- Sequential per guild — Guild A's `T0001` and Guild B's `T0001` are independent.
- Generated at creation time inside a database transaction.
- Stored in the `tournamentCode` column with a per-guild unique constraint `@@unique([guildId, tournamentCode])`.
- Displayed in all embeds, lists, DMs, brackets, and the dashboard as `#T0001`.
- Can be used as a lookup alternative to the full database ID.

### 6.2 Tournament Lifecycle State Machine

```
DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → CHECK_IN → LIVE → COMPLETED → ARCHIVED
                                                                                    
                              CANCELLED  ←  (from most active states)
```

| State | Meaning |
|-------|---------|
| `DRAFT` | Organizer is configuring; not visible to players |
| `REGISTRATION_OPEN` | Players can register via the channel system |
| `REGISTRATION_CLOSED` | Registration is full or manually closed; rosters preparing |
| `CHECK_IN` | Eligible teams confirm attendance |
| `LIVE` | Tournament matches are running |
| `COMPLETED` | Competitive activity finished; winners can be finalized |
| `ARCHIVED` | Historical records retained; removed from active views |
| `CANCELLED` | Event stopped; separate from completion |

The lifecycle governs which actions are allowed. A tournament that is live cannot have its entire schedule moved — individual matches must be postponed instead.

### 6.3 Draft Expiry

- A draft can expire after 30 days.
- The organizer gets a warning before expiry.
- The organizer can extend a draft (up to 3 extensions, each adding 30 days).

---

## 7. Tournament Management Commands

| Command | Function |
|---------|---------|
| `/tournament create` | Launch the creation wizard |
| `/tournament edit` | Edit permitted tournament settings |
| `/tournament publish` | Publish a DRAFT tournament and open registration |
| `/tournament cancel` | Cancel an event |
| `/tournament delete` | Soft-delete a DRAFT tournament |
| `/tournament list` | List events with optional game/status filters |
| `/tournament info` | Show complete tournament information |
| `/tournament participants` | View and manage registered teams |
| `/tournament standings` | Display current standings |
| `/tournament slots` | View the slot matrix (filled/available) |
| `/tournament delay` | Delay tournament start (before live only) |
| `/tournament reopen` | Reopen registration |
| `/tournament extend` | Extend a DRAFT timeline |
| `/tournament finalize` | Lock results and compute winners |
| `/tournament archive` | Archive a completed tournament |
| `/tournament terminate` | Pause (recoverable) or permanently delete |

### Cancel vs Pause vs Archive vs Delete

- **Cancel**: Stop an event that will not proceed as planned.
- **Pause (terminate)**: Tournament is paused but recoverable. Requires a formal resume transition.
- **Archive**: Preserve history of a completed event while removing it from active views.
- **Delete**: Remove an eligible tournament with strong confirmation (warning + confirmation button + modal where user types the tournament name). Soft deletion by default; financial records must be retained.

---

## 8. Automated Registration System

Registration is fully automated through the Discord channel listener. There is no slash-command form — players post their team details in the tournament's configured `#registration` channel and the bot handles everything.

### 8.1 Registration Flow

```
Player posts in #registration channel
        ↓
Bot parses the message
        ↓
Validate: mentions, roster size, duplicates
        ↓
  ┌─────────────┐
  |  VALID       |  → React ✅ → Save Registration → Post to #approved
  |              |  → Assign balanced group → DM captain + all members
  └─────────────┘
  ┌─────────────┐
  |  INVALID     |  → React ❌ → Reply with reason → Auto-delete reason after 20s
  |              |  → DM captain the rejection reason
  └─────────────┘
```

### 8.2 Validation Rules

The `registration-channel.ts` listener checks:

1. **Minimum 2 Discord mentions** — the team must have at least 2 players.
2. **Maximum 5 Discord mentions** — 4 starters + 1 substitute (configurable per tournament via `rosterMin`/`rosterMax`).
3. **No duplicate mentions** in the same message — each player listed once.
4. **Team name on the first non-mention line** — extracted as the team name.
5. **No duplicate registrations** — checks existing `PENDING`/`APPROVED` registrations for the same Discord user IDs.
6. **Roster size** validated against the tournament's `rosterMin` and `rosterMax`.

### 8.3 Six Registration Templates

Each tournament stores its selected template so later changes to a server's default don't silently modify an existing tournament's requirements.

| Template | What It Collects |
|----------|-----------------|
| `SIMPLE_MENTIONS` | Team name + Discord member mentions |
| `CAPTAIN_BASED` | Team name, captain, player mentions |
| `FULL_PLAYER_DETAILS` | Each player's Discord account, IGN, game UID |
| `TEAM_WITH_SUBSTITUTE` | Main roster + optional substitute |
| `CODM_FIVE_PLAYER` | Five main players + optional substitute |
| `FULL_WITH_SUBSTITUTE` | Full player identities + optional substitute details |

### 8.4 Registration States

| State | Meaning |
|-------|---------|
| `PENDING` | Awaiting staff review (manual approval) or payment verification |
| `APPROVED` | Entry accepted, slot assigned |
| `WAITLISTED` | No available place, on the FIFO waitlist |
| `REJECTED` | Application declined |
| `DISQUALIFIED` | Removed after acceptance for rule violation |

### 8.5 Auto-Approval vs Manual Approval

- **Auto-approval** (`autoApprove: true`): A valid registration is accepted immediately, slot assigned, group assigned, DMs sent.
- **Manual approval** (`autoApprove: false`): Registration is saved as `PENDING`. The manager reviews via `/tournament participants` and accepts or rejects.

### 8.6 Slot System

- Slots are numbered 1 to the tournament `teamCapacity`.
- Assigned automatically on approval.
- The waitlist uses FIFO ordering.
- When a team is removed, its slot is offered to the next eligible waitlisted team.
- Atomic slot reservation is required — concurrent submissions must never assign the same slot.
- The `/api/servers/.../registrations` route uses `SELECT ... FOR UPDATE` inside a transaction to guarantee atomicity.

### 8.7 Auto-Close

When the accepted-team count reaches the configured capacity (and waitlist is disabled), the tournament automatically transitions to `REGISTRATION_CLOSED`, sends a closure notification, and creates an outbox event.

### 8.8 Paid Registration

For paid tournaments (`entryType: PAID`):

1. The system checks the tournament and the organizer's payment configuration (Razorpay or Stripe, see §16).
2. It creates a database `Order`.
3. It creates a payment order using the organizer's configured provider (Razorpay for India, Stripe for international).
4. The player receives checkout information.
5. The player completes payment.
6. The provider sends a server-to-server webhook.
7. SHADØW verifies the webhook signature.
8. The registration is activated only after the verified payment event.

The system must never trust a browser redirect or a player's claim. Only the verified webhook activates a paid registration.

---

## 9. Group Stage & Qualification

### 9.1 Balanced Group Assignment

When a registration is confirmed (free+valid, or paid+payment-verified), the team is automatically assigned to a group using **balanced assignment**:

- The engine selects the eligible group with the **fewest current teams**.
- If multiple groups are tied, the one with the lowest `groupNumber` wins (stable ordering).
- A group cannot exceed its configured `maxTeams` (default 12).
- This is count-balancing, not skill-based matchmaking.

```
Confirmed Registration
    ↓
Balanced Group Engine
    ↓
Find Group With Fewest Teams
    ↓
Assign Team Automatically
    ↓
Update Group Capacity + Embed
    ↓
Discord Confirmation + DM
```

### 9.2 Group Creation

- Maximum 12 teams per group (configurable).
- Automatic group numbering.
- Groups are created on-demand as teams register (when all existing groups are full).
- The `TournamentGroup` record stores `groupNumber`, `maxTeams`, `discordChannelId`, `discordCategoryId`, `rosterMessageId`, `isLocked`.

Groups required = ⌈ Approved teams ÷ Teams per group ⌉

Example: 600 teams ÷ 12 per group = 50 groups.

### 9.3 Group Channels (Admin-Managed)

The bot does **not** create Discord channels or categories for groups. Group assignment is handled entirely at the database level — teams are assigned to `TournamentGroup` records with their roster and status tracked in the database.

The server owner or admin is responsible for creating any Discord channels they want for group communication. The bot can post group rosters and updates to existing channels that the admin has configured.

```
🏆 TOURNAMENT NAME (created by admin)
│
├── 📢 announcements         ← admin creates, bot posts to it
├── 📋 registration          ← admin creates, bot monitors it
│
├── 🏆 QUALIFIERS            ← admin creates category + channels
│   ├── 🔒 group-1          ← admin creates, bot can be given access
│   ├── 🔒 group-2
│   ├── 🔒 group-3
│   └── ...
│
├── ⚔️ ELIMINATION           ← admin creates
├── 📊 results               ← admin creates
└── ⚖️ disputes              ← admin creates
```

- Group rosters, member lists, and standings are tracked in the database (`TournamentGroup`, `GroupTeamAssignment`).
- The bot can post group roster embeds to an existing channel if the admin configures one.
- The admin controls all channel permissions and visibility — the bot does not modify channel permissions.

### 9.4 Group Removal & Auto-Fill

When a team is removed from a group:

1. Mark the group membership as `REMOVED` (`isActive: false` on `GroupTeamAssignment`).
2. Save the removal reason.
3. Find the next eligible waitlisted registration (FIFO).
4. Promote it and assign it to the newly available group position.
5. DM the promoted captain.
6. Update the group embed.
7. Record the operation in the audit log.

If no waitlisted team exists, the group remains with an empty position.

### 9.5 Qualification System

After group matches finish, standings are calculated. The manager runs `/group qualify`:

1. The bot posts a qualification embed showing standings and qualifying teams.
2. Authorized staff confirm the qualifying teams (numbered reactions, only admin/manager reactions count).
3. The system records qualified teams.
4. When the relevant groups have completed qualification, the next stage is created.
5. Qualified teams are assigned into new groups.
6. Captain notifications are sent.

### 9.6 Multiple Qualifier Stages

A tournament can have multiple rounds of qualification:

```
Stage 1 — Qualifier Round 1:  600 teams → 50 groups of 12  → Top N qualify
Stage 2 — Qualifier Round 2:  Qualified teams → new groups  → Top N qualify
Stage 3 — Qualifier/Bracket:   Final qualifier or bracket entry
Stage 4 — Elimination:         Remaining teams compete
Stage 5 — Grand Final:          Champion determination
```

The number of stages and qualifying teams per group are configurable per tournament.

---

## 10. Bracket & Elimination

### 10.1 When the Bracket Starts

The bracket begins in the third-last stage of a multi-stage tournament. Early qualification rounds use groups; later rounds use an elimination bracket.

### 10.2 Bracket Generation

The bracket engine:

1. Collects qualified teams.
2. Calculates their seeds using the defined ranking criteria.
3. Sorts teams by seeding order.
4. Generates the single-elimination bracket.
5. Creates the associated matches.
6. Applies the configured best-of-N format.
7. Schedules matches and prepares room credentials.
8. Updates bracket progression when matches complete.

**Seeding order:**
1. Total points
2. Total kills
3. Best single-match placement

### 10.3 Bracket State Machine

```
LOCKED → BRACKET_GENERATED → MATCHES_IN_PROGRESS → COMPLETED
```

### 10.4 Bracket Commands

| Command | Function |
|---------|---------|
| `/bracket generate` | Generate the bracket from qualified teams |
| `/bracket view` | View the bracket |
| `/bracket start` | Schedule and start bracket matches |
| `/bracket lock` | Control bracket availability and locking |

---

## 11. Match Operations

### 11.1 Match Lifecycle

```
SCHEDULED → CHECK_IN → READY → LIVE → AWAITING_RESULT → UNDER_REVIEW → COMPLETED
```

Other paths: `POSTPONED`, `CANCELLED`, `FORFEIT`, `DISPUTED`.

A disputed result must be resolved before the match can be treated as completed.

### 11.2 Match Scheduling

The scheduler handles:

- Tournament stage and group assignment
- Match number and scheduled start/end
- Map and game mode
- Match participants
- Match segments for multi-round/multi-map series
- Collision detection
- Match rescheduling

| Command | Function |
|---------|---------|
| `/match schedule` | View or configure the match schedule |
| `/match generate` | Generate multiple matches |
| `/match reschedule` | Change a match's scheduled time |
| `/match checkin` | Confirm team attendance |
| `/match room` | Get/set/release room credentials |
| `/match result` | Submit match results |
| `/match approve` | Approve or reject results |
| `/match dispute` | Open a dispute |
| `/match resolve` | Resolve a dispute |

### 11.3 Check-In System

1. Check-in opens at the configured time.
2. Eligible captains receive a reminder.
3. The team checks in.
4. The system records attendance.
5. Teams that fail to check in can be marked absent or forfeited per tournament rules.
6. Staff can review the check-in list before the match.

### 11.4 Room Credentials

For each match, authorized staff can set:

- Room ID
- Room password
- Release time (example: 15 minutes before match)
- Expiration time

| Subcommand | Function |
|------------|---------|
| `/match room set` | Set room credentials |
| `/match room get` | Get credentials (ephemeral, private) |
| `/match room release` | Release credentials to the match channel |

Room credentials are **never** displayed in public embeds. They are delivered privately to the eligible checked-in team captain via DM. Failure handling is required if the captain cannot receive DMs.

---

## 12. Results, Scoring & Disputes

### 12.1 Result Submission

After a match, an eligible player, captain or referee submits the result:

- Match identifier
- Team identity
- Placement
- Kills
- Round wins (game-dependent)
- Supporting evidence/screenshot
- Submitter identity

The database distinguishes raw `ResultSubmission` records from approved `ScoreEvent` records.

```
Match played → Result submitted → Awaits review → Referee verifies → Approve/Reject → Approved score event saved → Standings recalculated
```

A submitted score is **not** automatically a final, approved score.

### 12.2 Approval & Rejection

A referee reviews the submission and can:

- Approve the result → creates a `ScoreEvent` with `type: MATCH_SCORE`
- Reject the result → records rejection reason
- Request correction/resubmission

### 12.3 Disputes

1. Player or referee opens the dispute (`/match dispute`).
2. Reason is recorded.
3. Relevant match and result are identified.
4. Referee and affected captains are DM-notified.
5. Authorized staff examine the case.
6. The dispute is resolved (`/match resolve`).
7. Match/result status is updated.
8. All actions are stored in the audit trail.

### 12.4 Corrections & Historical Accuracy

Standings are computed from approved `ScoreEvent` records, not from raw submissions.

Corrections create a new `ScoreEvent` with `type: CORRECTION` rather than silently overwriting previous scoring history. This preserves the ability to explain later why a team received a particular score.

---

## 13. Game-Specific Scoring Engines

Each engine accepts a saved tournament-rules snapshot and calculates results using that tournament's actual configuration.

### 13.1 BGMI Battle Royale

**Formula:**
```
Match Points = Placement Points + (Kills × Kill Value) − Penalties
```

Example: 2nd place (12 placement points) + 8 kills × 1 point/kill = 20 points.

**Tie-breakers:**
1. Total points
2. Total kills
3. Best single-match placement
4. Most match wins

### 13.2 Free Fire

**Battle Royale:** Configurable placement points, kill points, penalties. Similar structure to BGMI but with its own configuration.

**Clash Squad:** Records round wins. A team that reaches the configured round-win threshold wins the series. Supports forfeit handling and configurable map rotation.

### 13.3 COD Mobile

**Multiplayer:** Best-of-N competition (Bo1, Bo3, Bo5). First to ⌈N/2⌉ map wins wins the series. Match composed of individual map segments. Supports forfeits and walkovers.

**Battle Royale:** Separate module. Placement and kill-based points model.

### 13.4 Scoring Commands

| Command | Function |
|---------|---------|
| `/points calc` | Calculate a tournament's points (or a single match's) |
| `/tournament standings` | Show current standings |
| `/winners` | Show finalized official winners |

Standings = provisional/current competitive rankings. Winners = official finalized outcome.

---

## 14. Tournament Finalization & Winners

### 14.1 Finalization Procedure

1. Ensure all required matches are completed.
2. Check that all relevant results are approved.
3. Ensure no unresolved disputes prevent finalization.
4. Calculate final standings.
5. Apply configured tie-breakers.
6. Generate `WinnerRecord` entries for the relevant placements.
7. Record any awards (MVP, Top Fragger, Best Team, custom awards).
8. Transition tournament to `COMPLETED`.
9. Send official winner announcement.
10. Keep results and audit history.

### 14.2 Winner Records & Awards

- `WinnerRecord` table stores placements (Champion, Runner-up, Third Place) with a roster snapshot.
- `Award` table stores individual/team awards (MVP, Top Fragger, Best Team, Custom) with fulfillment status.

Finalization locks the competitive outcome into an official historical record. Later corrections should be auditable (`type: CORRECTION` score events) rather than silently changing original winner history.

---

## 15. PT — Points Table System (Alok GFX)

The PT system is a collaboration between **Alok GFX** (designer) and SHADØW (platform). It combines competitive scoring with professionally designed esports graphics.

### 15.1 What the PT System Does

1. Provides a catalogue of points-table designs (created by Alok GFX).
2. Allows users/organizers to preview designs.
3. Verifies the user has the required license to use a design.
4. Assigns a design to a tournament.
5. Accepts or fetches match-by-match team data.
6. Calculates total points using the tournament's scoring configuration.
7. Renders a branded points-table image using the design template.
8. Allows preview and regeneration.
9. Downloads the image or publishes it to the Discord results channel.
10. Updates the existing pinned PT message when appropriate.

### 15.2 PT Graphic Content

The rendered image can show:

- Team name and logo
- Overall rank
- Number of WWCDs (Winner Winner Chicken Dinner)
- Placement points
- Kill totals
- Match-by-match points
- Total points
- Tournament branding
- Designer credit (Alok GFX)

### 15.3 PT Licensing Model

Users purchase a license through Alok GFX's external payment link, submit proof, and obtain an active license after manual verification.

**License states:** `PENDING` → `ACTIVE` → `EXPIRED` / `REVOKED`

An admin verifies or revokes the license. The bot has commands for inspecting licenses.

### 15.4 PT Database Models

| Model | Purpose |
|-------|---------|
| `PtDesign` | Catalogue of available designs (name, game, designerName, previewUrl, price, metadata) |
| `PtLicense` | License granting a tournament the right to use a specific design (status, grantedBy, revokedBy) |

A `PtLicense` is unique per `(tournamentId, designId)`.

### 15.5 PT Commands

| Command | Function |
|---------|---------|
| `/pt store` | Browse available designs |
| `/pt view` | View points-table standings |
| `/pt setup` | Configure a PT for a tournament |
| `/pt assign` | Assign a design to a tournament |
| `/pt buy` | Begin a design purchase flow |
| `/pt verify` | Verify a submitted license/purchase |
| `/pt licenses` | View license records |
| `/pt revoke` | Revoke a license |
| `/pt preview` | Preview a generated points table |
| `/pt generate` | Generate or regenerate a PT image |
| `/pt update` | Update the existing PT |
| `/pt post` | Publish the PT image in Discord |

### 15.6 Automatic PT Updates

```
Match result approved
    ↓
Fetch approved score events
    ↓
Calculate current standings
    ↓
Apply tournament scoring configuration
    ↓
Render selected PT template
    ↓
Save generated image
    ↓
Post or update Discord PT message
```

This way the organizer does not need to design a new points-table image manually after every match.

---

## 16. Payment System (Razorpay + Stripe)

The payment module is feature-flagged (`PAYMENTS_ENABLED=false` by default) and separate from the free registration system. Each Discord-server organizer can configure their own payment provider account.

SHADØW supports **two payment providers** to serve both Indian and international users:

| Provider | Region | Currency | Use Case |
|----------|--------|----------|---------|
| **Razorpay** | India | INR | Indian organizers and players — UPI, cards, netbanking, wallets |
| **Stripe** | International | USD, EUR, GBP, etc. | Non-Indian organizers and players — cards, Apple Pay, Google Pay |

The organizer configures one or both providers. The tournament's `currency` field determines which provider is used at checkout — INR defaults to Razorpay, all other currencies default to Stripe. The organizer can also explicitly set the provider per tournament.

### 16.1 Organizer Payment Setup

The organizer provides credentials for the provider(s) they want to use:

**Razorpay (India):**
- Razorpay Key ID
- Razorpay Key Secret
- Webhook Secret

**Stripe (International):**
- Stripe Secret Key
- Stripe Webhook Secret
- Stripe Account ID (for Connect / express accounts, optional)

Credentials are stored with **AES-256-GCM encryption**. Responses mask all secrets. A test-connection process verifies the configuration for each provider. The `OrganizerPaymentConfig` model stores both Razorpay and Stripe fields — only the fields for the active provider need to be filled.

### 16.2 Payment Provider Selection

When a player registers for a paid tournament:

1. The system checks the tournament's `currency` (default: `INR`).
2. If currency is `INR` → uses Razorpay (if configured).
3. If currency is anything else (`USD`, `EUR`, etc.) → uses Stripe (if configured).
4. The organizer can override this by explicitly setting the provider on the tournament or payment config.
5. If the selected provider is not configured, the system returns an error directing the organizer to set up that provider.

### 16.3 Paid Tournament Workflow

1. System checks tournament and organizer's payment configuration.
2. Creates a database `Order` with the amount, currency, and provider.
3. Creates a payment order using the configured provider:
   - **Razorpay:** Creates a Razorpay order via the Razorpay API using the organizer's encrypted credentials.
   - **Stripe:** Creates a Stripe PaymentIntent via the Stripe API using the organizer's encrypted secret key.
4. Player receives checkout information (Razorpay checkout or Stripe Checkout URL).
5. Player completes payment.
6. Provider sends a server-to-server webhook:
   - **Razorpay:** `payment.captured` webhook with signature verification.
   - **Stripe:** `payment_intent.succeeded` webhook with Stripe-Signature header verification.
7. SHADØW verifies the webhook signature.
8. Checks that amount and currency match the stored order.
9. Checks the provider event's idempotency (`providerEventId` unique constraint).
10. Order is marked paid or failed.
11. Registration is activated only after the verified payment event and any required approval.

The system must never trust a browser redirect or a player's claim. Only the verified webhook activates a paid registration.

### 16.4 Payment Status System

```
PENDING → PAID
PENDING → FAILED
PENDING → EXPIRED
FAILED  → REFUNDED
PAID    → DISPUTED
DISPUTED → REFUNDED
```

An unpaid order can expire and release its reserved place. A payment dispute or chargeback goes into manual review. Order and provider event records are retained for financial accountability.

### 16.5 Refunds

Refunds are supported through both providers:
- **Razorpay:** Refund API with reason tracking.
- **Stripe:** Refund API with reason tracking.

The `Refund` model records the amount, reason, status, and provider reference for auditability.

### 16.6 Database Models

| Model | Purpose |
|-------|---------|
| `OrganizerPaymentConfig` | Per-guild, per-organizer encrypted credentials for Razorpay and/or Stripe |
| `Order` | One per paid registration (amount, currency, provider, status) |
| `PaymentEvent` | Idempotent provider webhook events (providerEventId unique) |
| `Refund` | Refund records linked to orders |

### 16.7 Environment Variables

| Variable | Purpose |
|----------|---------|
| `PAYMENTS_ENABLED` | Feature flag — `false` by default, requires legal review before enabling |
| `ENCRYPTION_KEY` | AES-256-GCM key for encrypting all provider credentials |
| `STRIPE_SECRET_KEY` | (Per-organizer, stored encrypted in DB) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |

> **Important:** Production payments must remain disabled until the feature is deliberately cleared, legally reviewed, and the provider accounts are verified. The `PAYMENTS_ENABLED` flag gates the entire payment flow.

---

## 17. Background Worker & Automation

The worker (BullMQ + Upstash Redis) handles everything that must happen later, repeatedly, or retry when Discord is unavailable.

### 17.1 Notification Automation

| Event | Recipient |
|-------|-----------|
| Registration confirmed | Captain + all roster members |
| Registration rejected | Captain, with reason |
| Waitlist promotion | Captain and roster members |
| Registration reopened | Registered captains + announcement channel |
| Tournament delayed | Registered captains |
| Tournament cancelled | Registered captains |
| 24-hour reminder | All registered players |
| 30-minute reminder | All registered players |
| 5-minute reminder | All registered players |
| Check-in opens | Captains |
| Check-in closing reminder | Captains who haven't checked in |
| Room credentials released | Checked-in team captain (private DM) |
| Result submitted | Assigned referee |
| Result approved/rejected | Affected captain |
| Dispute opened | Referee + affected captains |
| Dispute resolved | Affected captain |
| Qualification | Qualified captains and players |
| Match scheduled | Affected captains |
| Tournament completed | Registered players |

The notification service uses scheduled jobs rather than attempting to send every message at creation time. This matters when a tournament is weeks away.

### 17.2 Scheduled Jobs

Scheduled jobs cover:
- Match reminders
- Check-in opening and closing
- Room credential release
- Result deadlines
- Payment expiry
- Group creation
- Qualification timers
- Next-stage creation
- Bracket generation

If a match is rescheduled, its old scheduled jobs are cancelled and replaced with jobs at the new times.

### 17.3 Tournament Delay

The manager provides a new start date/time and a reason. The system:
- Recalculates match dates preserving original gaps
- Cancels old scheduled notifications and room-release jobs
- Recreates jobs for the new schedule
- Sends an announcement
- Notifies registered captains
- Writes reason and old/new times to the audit log

Delay is only permitted before the tournament goes live. A live tournament must use individual match postponement.

### 17.4 Registration Reopening

Used when places remain unfilled, a team is disqualified, or capacity is increased. The manager provides a new deadline and optional additional slots. Existing approved registrations remain intact. Reopening is not permitted once the tournament is live.

### 17.5 Auto-Close & Auto-Archive

- Registration closes automatically when accepted-team count reaches capacity.
- Completed tournaments are retained as historical records and removed from active views after the retention period.
- Evidence files and room credentials can be deleted after retention; winner records, awards, scores, audit logs, payment events, orders and registrations are retained.

---

## 18. Transactional Outbox & Discord Sync

### 18.1 The Outbox Pattern

When an administrator approves a registration:

1. Update the registration in PostgreSQL.
2. Record an `OutboxEvent` in the **same database transaction**.
3. Commit both together.
4. The worker picks up the outbox event.
5. Sends the Discord notification (embed, DM, channel update).
6. Records the message binding and delivery status.
7. Retries if delivery fails.

This prevents a situation where the registration is approved in the database but no Discord update is ever sent because the process crashed between the two actions.

### 18.2 Outbox Processing

- The worker polls for `PENDING` outbox events.
- Retries failures with exponential backoff.
- Respects Discord rate limits (HTTP 429 → retry with `Retry-After`).
- Alerts administrators after repeated failures.
- A 60-second reconciliation task checks for events left pending — with a recency guard that excludes events touched in the last 60 seconds to avoid re-queueing in-flight events.

### 18.3 Discord Message Bindings

The `DiscordMessageBinding` table tracks which Discord message corresponds to which database record (tournament, match, etc.). This allows the worker to edit existing messages rather than creating duplicates when data changes.

### 18.4 Persistent Control Panel

The bot maintains a pinned control-panel message in the administrator channel. It is continuously updated by the outbox worker. Buttons include:

- Live Events
- Pending Results
- Open Disputes
- Upcoming Matches
- Integration Health
- Group Status

---

## 19. Database Schema

### 19.1 Model Overview

| Group | Models | Responsibility |
|-------|--------|---------------|
| Server management | `DiscordServer`, `ServerSettings`, `ServerRoleBinding` | Server identity, configuration, permissions |
| Player identity | `User`, `ServerMembership`, `GameProfile` | Discord identity, memberships, game profiles |
| Team management | `Team`, `TeamMember` | Reusable team identity and roster |
| Tournament config | `Tournament`, `TournamentRuleVersion` | Event data and rules snapshots |
| Competition structure | `Stage`, `TournamentGroup`, `GroupTeamAssignment` | Qualifier groups and elimination stages |
| Registration | `Registration`, `RegistrationMember` | Team entry and tournament-specific roster |
| Match management | `Match`, `MatchSegment`, `MatchParticipant` | Scheduled games and participants |
| Room management | `RoomCredential` | Private match access information |
| Results & scoring | `ResultSubmission`, `ScoreEvent` | Submitted and approved scores |
| Disputes & winners | `Dispute`, `WinnerRecord`, `Award` | Contested results and official outcomes |
| Payment | `OrganizerPaymentConfig`, `Order`, `PaymentEvent`, `Refund` | Financial transactions and history |
| PT system | `PtDesign`, `PtLicense` | Points-table designs and licenses |
| Discord integration | `DiscordMessageBinding`, `OutboxEvent` | Sync between DB records and Discord messages |
| Automation | `ScheduledJob` | Delayed or scheduled actions |
| Accountability | `AuditLog`, `AdminBan` | Administrative action history |
| Monitoring | `SystemMetric`, `ErrorLog`, `BridgeHealthCheck` | Health and error tracking |

### 19.2 Key Enums

| Enum | Values |
|------|--------|
| `AppRole` | VIEWER, PLAYER, REFEREE, TOURNAMENT_MANAGER, SERVER_ADMIN |
| `Game` | BGMI, FREE_FIRE, COD_MOBILE |
| `GameMode` | BATTLE_ROYALE, CLASH_SQUAD, MULTIPLAYER |
| `TournamentStatus` | DRAFT, REGISTRATION_OPEN, REGISTRATION_CLOSED, CHECK_IN, LIVE, COMPLETED, CANCELLED, ARCHIVED |
| `RegistrationStatus` | PENDING, APPROVED, REJECTED, DISQUALIFIED, WAITLISTED |
| `MatchStatus` | SCHEDULED, CHECK_IN, READY, LIVE, AWAITING_RESULT, UNDER_REVIEW, COMPLETED, POSTPONED, CANCELLED, FORFEIT, DISPUTED |
| `EntryType` | FREE, PAID |
| `PaymentStatus` | PENDING, PAID, FAILED, EXPIRED, DISPUTED, REFUNDED |
| `PaymentProvider` | RAZORPAY, STRIPE |
| `RegistrationFormat` | SIMPLE_MENTIONS, CAPTAIN_BASED, FULL_PLAYER_DETAILS, TEAM_WITH_SUBSTITUTE, CODM_FIVE_PLAYER, FULL_WITH_SUBSTITUTE |
| `ScoreEventType` | MATCH_SCORE, CORRECTION |
| `AwardType` | CHAMPION, RUNNER_UP, THIRD_PLACE, MVP, TOP_FRAGGER, BEST_TEAM, CUSTOM |

### 19.3 Rules Versioning

When a tournament is configured and published, its scoring and competition rules are associated with a specific `TournamentRuleVersion`. The scoring engine calculates a historical match using the relevant tournament rules, not whatever scoring configuration happens to be active now. This protects historical results from accidental changes to later tournaments.

### 19.4 Tournament Short ID Constraint

The `Tournament.tournamentCode` field uses a per-guild composite unique constraint:

```
@@unique([guildId, tournamentCode], name: "tournament_guild_code_unique")
```

This allows two different guilds to both have `T0001` while preventing a single guild from having duplicates.

---

## 20. Technology Stack & Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Language | TypeScript | Shared typed application code |
| Monorepo | pnpm workspaces | Organize bot, worker and packages |
| Discord framework | Sapphire + discord.js | Commands, listeners, interactions |
| Database | Supabase PostgreSQL | Persistent data |
| ORM | Prisma | Database schema and queries |
| Validation | Zod | Validate inputs and shared types |
| Queue | BullMQ | Background job execution |
| Redis | Upstash Redis | Queue storage and coordination |
| File storage | Supabase Storage | Evidence and assets |
| Monitoring | Sentry | Error reporting |
| Auth (web) | Supabase Auth + Discord OAuth | Web dashboard authentication |

### Architecture Principles

1. **Business logic in shared packages** — not duplicated in bot commands.
2. **Database is the source of truth** — Discord messages are derived views synced via the outbox.
3. **Tenant isolation via `guildId`** — every server-owned query is scoped.
4. **Atomic operations** — slot reservation, group assignment, and outbox events use database transactions.
5. **Idempotent processing** — outbox events and payment webhooks check for duplicates.

---

## 21. Deployment

### 21.1 Services

| Service | Platform | Purpose |
|---------|----------|---------|
| `discord-bot` | Render Background Worker | Maintain Discord connection, process interactions |
| `worker` | Render Background Worker | Process BullMQ jobs, scheduled events, notifications |
| Database | Supabase | PostgreSQL records |
| Queue | Upstash | BullMQ coordination and job queues |
| Web dashboard | Vercel | Next.js companion dashboard |

### 21.2 Redis Configuration

The worker requires a **TCP** Redis connection (`redis://` or `rediss://`). The Upstash REST URL (`https://...`) is HTTP-only and incompatible with ioredis/BullMQ. The worker must convert the Upstash REST URL to the proper `rediss://` TCP format with TLS options.

### 21.3 Environment Variables (Key)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection (pooler URL) |
| `DIRECT_URL` | Prisma migrations (direct connection) |
| `DISCORD_BOT_TOKEN` | Bot authentication |
| `DISCORD_CLIENT_ID` | Bot application ID (also used for invite URLs) |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Client-exposed bot ID for web invite URLs |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint (caching) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST auth token |
| `REDIS_URL` | TCP Redis URL for BullMQ (must be `redis://` or `rediss://`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | Web app base URL |
| `PAYMENTS_ENABLED` | Payment feature flag (default: false) |
| `ENCRYPTION_KEY` | AES-256-GCM key for payment credential encryption |
| `STRIPE_SECRET_KEY` | Stripe API secret key (per-organizer, stored encrypted in DB) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `SENTRY_DSN_*` | Error reporting per service |

---

## 22. Complete Command Reference

### Setup & Server

| Command | Function |
|---------|---------|
| `/setup` | Run the server setup wizard |
| `/server status` | Show system health and bot configuration |
| `/server branding` | Set server logo, accent color, banner |
| `/server roles list` | List all Discord→app role bindings |
| `/server roles add` | Bind a Discord role to an app permission level |
| `/server roles remove` | Remove a role binding |
| `/server roles members` | Show member counts per app role |

### Help & Support

| Command | Function |
|---------|---------|
| `/help` | Browse command documentation (paginated, 5 categories, 5-min session) |
| `/support` | Open support server invitation (ephemeral) |

### Tournament

| Command | Function |
|---------|---------|
| `/tournament create` | Create a new tournament via the wizard |
| `/tournament edit` | Edit tournament details |
| `/tournament publish` | Open registration for a tournament |
| `/tournament cancel` | Cancel a tournament |
| `/tournament delete` | Delete a draft tournament |
| `/tournament list` | List tournaments with optional filters |
| `/tournament info` | Show detailed information |
| `/tournament participants` | List registered teams |
| `/tournament standings` | Show live standings |
| `/tournament slots` | View slot matrix |
| `/tournament delay` | Delay tournament start |
| `/tournament reopen` | Reopen registration |
| `/tournament extend` | Extend a DRAFT timeline |
| `/tournament finalize` | Lock results and compute winners |
| `/tournament archive` | Archive a completed tournament |
| `/tournament terminate` | Pause or permanently delete |

### Group

| Command | Function |
|---------|---------|
| `/group create` | Generate groups |
| `/group list` | List groups |
| `/group view` | Inspect one group |
| `/group assign` | Assign teams |
| `/group remove` | Remove a team and handle vacancies |
| `/group lock` | Lock a group |
| `/group qualify` | Run qualification |

### Bracket

| Command | Function |
|---------|---------|
| `/bracket generate` | Generate elimination bracket |
| `/bracket view` | View bracket |
| `/bracket start` | Start bracket matches |
| `/bracket lock` | Lock or unlock bracket |

### Match

| Command | Function |
|---------|---------|
| `/match schedule` | View schedule |
| `/match generate` | Generate multiple matches |
| `/match reschedule` | Reschedule match |
| `/match checkin` | Confirm attendance |
| `/match room get` | Get room credentials (ephemeral) |
| `/match room set` | Set room credentials |
| `/match room release` | Release room credentials |
| `/match result` | Submit match results |
| `/match approve` | Approve or reject results |
| `/match dispute` | Open a dispute |
| `/match resolve` | Resolve a dispute |

### Players & Winners

| Command | Function |
|---------|---------|
| `/winners view` | View tournament winners/podium |
| `/points calc` | Calculate standings and point totals |

### Analytics

| Command | Function |
|---------|---------|
| `/analytics summary` | Server-wide tournament statistics |
| `/analytics export` | Export tournament data as CSV |

### PT (Points Table)

| Command | Function |
|---------|---------|
| `/pt store` | Browse available designs |
| `/pt view` | View points-table standings |
| `/pt setup` | Configure a PT for a tournament |
| `/pt assign` | Assign a design to a tournament |
| `/pt buy` | Begin a design purchase flow |
| `/pt verify` | Verify/activate a license (admin) |
| `/pt licenses` | List licenses for a tournament |
| `/pt revoke` | Revoke a license (admin) |
| `/pt preview` | Preview generated PT image |
| `/pt generate` | Generate PT image |
| `/pt update` | Update existing PT |
| `/pt post` | Publish PT image to Discord channel |

---

## 23. Dashboard Sync

The web dashboard (`/servers` page) automatically syncs with Discord to detect newly added servers.

### How It Works

1. **On page load** — the dashboard calls `POST /api/servers/sync`.
2. **On window focus** — when the user returns from the Discord OAuth tab after adding the bot, sync triggers automatically.
3. **Manual sync** — a "SYNC SERVERS" button in the page header forces a refresh.

### Sync Endpoint (`POST /api/servers/sync`)

1. Fetches the user's Discord guilds via the OAuth access token (with JWT claim fallback and Redis cache fallback).
2. For each guild where the user has `MANAGE_GUILD` but no `DiscordServer` record exists, checks whether the bot is actually in the guild (via `GET /guilds/{guildId}` with the bot token).
3. If the bot is present but no DB record exists, creates the `DiscordServer` and `ServerSettings` records — the same thing `guild-create.ts` does on the bot side.
4. Invalidates the Redis cache.
5. Returns the updated server list.

This closes the gap where the bot's `guildCreate` listener hasn't fired yet (bot restarting, gateway lag) or the user added the bot from the web invite link and immediately returned to the dashboard.

### Bot Invite URL

The bot invite URL is generated server-side via `getBotInviteUrl()`:

- Uses `discord.com/oauth2/authorize` (not the deprecated `/api/oauth2/authorize`).
- Uses a specific permission bitmask (not Administrator `0x8`, which Discord warns about).
- Can pre-select a guild via `guild_id` and `disable_guild_select=true` parameters.
- The `DISCORD_CLIENT_ID` is exposed to the browser via `next.config.js` `env` block as `NEXT_PUBLIC_DISCORD_CLIENT_ID`.

---

## End-to-End Example

A hypothetical SHADØW BGMI tournament with 600 teams and five stages:

| Phase | Action |
|-------|--------|
| **A — Server Prep** | Owner invites SHADØW, configures timezone, maps roles, **creates Discord channels** (registration, approved, announcement, match, results, disputes) |
| **B — Tournament Creation** | Manager runs `/tournament create`, configures BGMI Battle Royale, 600 capacity, 12 per group, 5 stages. **Selects existing Discord channels** in the wizard. Saved as draft, then published as `T0001` |
| **C — Registration** | Captains post teams in `#registration`. Bot validates, assigns slots, creates groups (DB-only, no channel creation), DMs captains, assigns balanced groups |
| **D — Qualifier Groups** | 600 ÷ 12 = 50 groups created in database. Admin creates group channels if desired. Bot posts rosters to configured channels |
| **E — Group Matches** | Matches created, scheduled, check-in managed, room credentials released privately. Results submitted → referees review → standings updated |
| **F — Qualification** | Manager runs `/group qualify` for each group. Qualified teams advance to next stage |
| **G — Bracket** | Engine collects qualified teams, seeds them, generates single-elimination bracket, creates matches |
| **H — Finals** | Final rounds played, results reviewed and approved, final standings calculated using the tournament's rule snapshot |
| **I — Winners** | Manager runs `/tournament finalize`. SHADØW creates official winner records and awards, publishes winner announcement |
| **J — PT & Archive** | System generates branded points table from approved data. After retention period, tournament is archived; competitive records retained |

> **Note:** If this is a paid tournament for Indian players, Razorpay handles checkout (INR). For international players, Stripe handles checkout (USD/EUR/etc). The provider is selected automatically based on the tournament's currency setting.

---

*This document is the canonical build reference for SHADØW TOURNAMENTS. All features described herein are to be implemented as specified. Deviations require explicit design review.*
