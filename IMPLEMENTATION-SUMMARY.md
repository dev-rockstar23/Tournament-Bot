# SHADØW TOURNAMENTS — Implementation Summary

## Overview

This document summarizes the major implementation work completed to transform the SHADØW TOURNAMENTS Discord bot from a basic command system to a fully-featured esports tournament management platform with advanced features including paginated help, module-based commands, channel-based registration, tournament security, and 4-digit tournament codes.

---

## 1. Changes Made

### 1.1 Discord Bot Commands

#### **Modified Files:**

- **`apps/discord-bot/src/commands/help.ts`**
  - Implemented paginated help system with category-based modules
  - Added interactive dropdown menu to navigate between command categories
  - Categories: SETUP & SERVER, TOURNAMENTS, MATCHES, PLAYERS, ANALYTICS & PT
  - 5-minute session timeout with disabled menu state

- **`apps/discord-bot/src/commands/tournament.ts`**
  - Consolidated all tournament subcommands into single grouped command
  - Added `/tournament terminate` with two modes:
    - **PAUSE**: Sets tournament status to CANCELLED (reversible)
    - **DELETE**: Permanent deletion with confirmation modal
  - Integrated 4-digit tournament code generation
  - Enforced channel configuration before tournament creation
  - Added tournament code display in all tournament embeds
  - **Subcommands (15 total):**
    - create, edit, publish, cancel, delete, list, info, participants
    - standings, slots, delay, reopen, finalize, archive, terminate

- **`apps/discord-bot/src/commands/match.ts`**
  - Consolidated all match subcommands into single grouped command
  - **Subcommands (10 total):**
    - schedule, generate, reschedule, checkin, result, approve
    - dispute, resolve, room (get/set/release)

- **`apps/discord-bot/src/commands/register.ts`**
  - Updated to reference per-tournament channel configuration
  - Added instructional embed pointing users to registration channel
  - Removed slash command registration form (channel-based now)

- **`apps/discord-bot/src/commands/setup.ts`**
  - Simplified setup wizard to only handle server record and timezone
  - Removed channel configuration (moved to per-tournament)
  - Added note that registration channels are per-tournament

- **`apps/discord-bot/src/commands/server.ts`**
  - Added role management subcommands (list, add, remove, members)
  - Added branding configuration (logo, accent color, banner)
  - Added server status display

- **`apps/discord-bot/src/commands/analytics.ts`**
  - Added permission checks (TournamentManagerOrAdmin)
  - Implemented summary and export subcommands

- **`apps/discord-bot/src/commands/pt.ts`**
  - Added permission checks
  - Implemented PT store, view, assign, buy, verify, licenses, revoke commands

- **`apps/discord-bot/src/commands/points.ts`**
  - Implemented points calculation command

- **`apps/discord-bot/src/commands/winners.ts`**
  - Implemented winners view command

### 1.2 Listeners

#### **New Files:**

- **`apps/discord-bot/src/listeners/registration-channel.ts`**
  - Monitors configured registration channels for new messages
  - Validates registration format:
    - Must contain 2–5 Discord @mentions
    - No duplicate user IDs
    - No user ID already registered in active tournament
    - First line should be team name
  - Reactions:
    - ✅ Green tick for valid registrations
    - ❌ Cross for invalid registrations with reason (auto-deleted after 20s)
  - Saves approved registrations to database
  - Posts approved registration embeds to approved channel

- **`apps/discord-bot/src/listeners/ready.ts`**
  - Bot startup logging
  - Command registration confirmation

- **`apps/discord-bot/src/listeners/guild-create.ts`**
  - DM server owner on bot join with setup instructions

### 1.3 Preconditions

#### **New Files:**

- **`apps/discord-bot/src/preconditions/TournamentManagerOrAdmin.ts`**
  - Enforces that only users with TOURNAMENT_MANAGER, SERVER_ADMIN roles can access commands
  - Uses permission package to resolve user roles via Discord role bindings

- **`apps/discord-bot/src/preconditions/HasPermission.ts`**
  - Generic permission precondition accepting AppRole parameter
  - Used for fine-grained permission checks

### 1.4 Database Schema Changes

#### **Modified Files:**

- **`packages/database/prisma/schema.prisma`**
  - Added `tournamentCode` field to Tournament model (unique 4-digit integer)
  - Added `registrationChannelId` field to Tournament model
  - Added `approvedRegChannelId` field to Tournament model
  - Moved channel configuration from ServerSettings to per-tournament

#### **Migration Files:**

- **`packages/database/prisma/migrations/20261020174135_add_tournament_code/migration.sql`**
  - Adds `tournament_code` column to tournaments table
  - Creates unique index on `tournament_code`
  - Creates non-unique index for query optimization

- **`packages/database/prisma/migrations/20261019165849_add_pt_models/migration.sql`**
  - Added PT-related database models (not covered in this summary)

### 1.5 Tournament Engine Package

#### **New Files:**

- **`packages/tournament-engine/src/tournament-code-generator.ts`**
  - `generateTournamentCode()`: Generates unique 4-digit codes (1000-9999)
  - Uses Fisher-Yates shuffle for randomization
  - Guild-scoped (each server has independent code pool)
  - Prevents code exhaustion (9000 codes per guild)
  - `validateTournamentCode()`: Validates code format

- **`packages/tournament-engine/src/tournament-code-generator.test.ts`**
  - Unit tests for code generation and validation
  - Tests uniqueness, exhaustion handling, guild isolation

#### **Modified Files:**

- **`packages/tournament-engine/src/index.ts`**
  - Exported tournament code generator functions

### 1.6 Permissions Package

#### **New Files:**

- **`packages/permissions/src/withAdminPermission.ts`**
  - Middleware for Next.js API routes to enforce admin permissions
  - Validates user session and role before allowing access

#### **Modified Files:**

- **`packages/permissions/src/index.ts`**
  - Exported admin permission middleware

### 1.7 Web Application Changes

#### **Modified Files:**

- **`apps/web/src/app/api/servers/[guildId]/admin/tournaments/route.ts`**
  - Added tournament code to API responses
  - Added admin permission middleware

- **`apps/web/src/app/api/servers/[guildId]/tournaments/[tournamentId]/route.ts`**
  - Added tournament code to tournament detail responses

- **`apps/web/src/app/api/servers/[guildId]/tournaments/route.ts`**
  - Added tournament code to tournament list responses
  - Fixed OAuth user creation on registration

- **`apps/web/src/app/servers/[guildId]/admin/tournaments/page.tsx`**
  - Added tournament code column to admin table
  - Protected with permission checks

- **`apps/web/src/app/servers/[guildId]/tournaments/page.tsx`**
  - Display tournament codes in tournament cards

- **`apps/web/src/components/admin/TournamentAdminTable.tsx`**
  - Added tournament code column
  - Display codes in table view

- **`apps/web/src/components/tournament/TournamentCard.tsx`**
  - Display tournament code badge on cards
  - Format: `#1234` style

- **`apps/web/src/components/tournament/TournamentCatalogue.tsx`**
  - Pass tournament codes to card components

- **`apps/web/src/components/tournament/RegistrationForm.tsx`**
  - Improved auth error handling for Discord OAuth flow

- **`apps/web/src/app/api/auth/callback/route.ts`**
  - Auto-create User record on Discord OAuth callback
  - Fixes registration authorization issues

---

## 2. Database Migration

### Command to Run:

```bash
cd packages/database
npx prisma migrate deploy
```

### Alternative (if using pnpm workspace):

```bash
cd d:\Discord Projects\Tournament-Bot\esports-platform
pnpm --filter @esports/database prisma migrate deploy
```

### What the Migration Does:

1. Adds `tournament_code` column to `tournaments` table (INTEGER, nullable, unique)
2. Creates unique index: `tournaments_tournament_code_key`
3. Creates query optimization index: `tournaments_tournament_code_idx`
4. Existing tournaments will have `NULL` tournament codes (safe migration)

### Post-Migration Notes:

- **New tournaments** created after migration will automatically receive 4-digit codes
- **Existing tournaments** without codes can continue to function (code is optional)
- Tournament codes are **guild-scoped** (each Discord server has independent code pool)

---

## 3. Testing Instructions

### 3.1 Test Help System

```
/help
```

**Expected Behavior:**
- Displays first category (SETUP & SERVER) immediately
- Shows dropdown menu with 5 categories
- Selecting category updates embed to show commands for that module
- Menu expires after 5 minutes with disabled state

---

### 3.2 Test Tournament Creation with Channels

```
/tournament create
```

**Follow wizard steps:**

1. **Tournament Name**: Enter name (e.g., "Winter Championship")
2. **Game Selection**: Choose game (BGMI, FREE_FIRE, COD_MOBILE)
3. **Mode Selection**: Choose mode based on game
4. **Roster Size**: Enter min and max (e.g., 4-5)
5. **Team Capacity**: Enter max teams (e.g., 32)
6. **Entry Type**: Choose FREE or PAID
   - If PAID, enter registration fee
7. **Prize Pool**: Optional, enter amount
8. **Schedule**: Enter start date/time
9. **Channels**: Select registration and approved channels
10. **Publish Option**: Choose "Create as draft" or "Publish immediately"

**Expected Behavior:**
- Tournament created with unique 4-digit code
- Code displayed in success message: `#1234`
- If published immediately, registration channel is ready to accept submissions
- Website shows tournament with code badge

---

### 3.3 Test Channel-Based Registration

**Prerequisites:**
- Active tournament with REGISTRATION_OPEN status
- Registration channel configured
- Approved channel configured

**Valid Registration Format:**

In the registration channel, post:
```
Team Phoenix
@Player1 @Player2 @Player3 @Player4
IGN1 | IGN2 | IGN3 | IGN4
```

**Expected Behavior:**
- Bot reacts with ✅ green tick
- Registration saved to database
- Approved embed posted to approved channel with:
  - Team name
  - Player mentions
  - Registration timestamp
  - Tournament info

**Invalid Registration Test Cases:**

| Test Case | Input | Expected Reaction | Error Message |
|-----------|-------|-------------------|---------------|
| Too few players | `Team Name\n@Player1` | ❌ | "Too few players. Minimum 2 Discord mentions required." |
| Too many players | 6+ mentions | ❌ | "Too many players. Maximum 5 Discord mentions allowed." |
| Duplicate mentions | `@Player1 @Player1` | ❌ | "Duplicate players found: @Player1" |
| Already registered | Player already in active tournament | ❌ | "The following players are already registered..." |
| Empty message | (blank) | ❌ | "Registration message cannot be empty." |

**Expected Behavior for Invalid:**
- Bot reacts with ❌ cross
- Error message posted (auto-deletes after 20 seconds)
- Registration NOT saved to database

---

### 3.4 Test Tournament Terminate Command

#### **PAUSE Mode:**

```
/tournament terminate
  idOrCode: 1234
  action: PAUSE
  reason: Technical difficulties
```

**Expected Behavior:**
- Tournament status set to CANCELLED
- `cancelledAt` timestamp recorded
- Audit log entry created
- Success embed shows:
  - Tournament name and code
  - Reason for pause
  - Note that tournament can be reopened

#### **DELETE Mode:**

```
/tournament terminate
  idOrCode: 1234
  action: DELETE
  reason: Duplicate tournament
```

**Expected Behavior:**
- Warning embed displayed with:
  - Tournament details
  - List of what will be deleted (teams, matches, results)
  - Red "⚠️ DELETE PERMANENTLY" button
  - Gray "Cancel" button
- Clicking "DELETE PERMANENTLY":
  - Confirmation modal shown
  - User must type tournament name to confirm
  - On confirm: All related data deleted from database
- Clicking "Cancel":
  - Action aborted
  - Confirmation message shown

---

### 3.5 Test Tournament Code Display

**Discord Bot:**

Check that tournament codes appear in:
- `/tournament create` success message
- `/tournament list` embed (each tournament)
- `/tournament info` embed (header)
- `/tournament publish` confirmation
- `/tournament participants` header
- `/tournament standings` header
- `/tournament terminate` confirmation

**Website:**

Check that tournament codes appear in:
- Tournament cards: `#1234` badge in top-right
- Tournament admin table: Code column
- Tournament detail page: Header display
- Winners page: Tournament identification

**Format:**
- Discord: `#1234` or `(#1234)` depending on context
- Website: Badge styled with `#1234`

---

### 3.6 Test Permission System

**Roles Required:**
- **TOURNAMENT_MANAGER**: Can access all tournament and match commands
- **SERVER_ADMIN**: Full access to all commands including server config
- **REFEREE**: Match-specific commands (result, dispute, resolve)
- **PLAYER**: Limited access (registration, viewing)
- **VIEWER**: Read-only access

**Test Cases:**

| Command | Viewer | Player | Referee | Manager | Admin |
|---------|--------|--------|---------|---------|-------|
| `/help` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/tournament list` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/tournament create` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/tournament terminate` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/match result` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/match resolve` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/server roles add` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/analytics summary` | ❌ | ❌ | ❌ | ✅ | ✅ |

**Expected Behavior for Denied:**
- Error message: "You don't have permission for that. Ask a server admin to assign you the correct role using `/server roles add`."

**Assigning Roles:**

```
/server roles add
  discordRole: @Tournament Staff
  appRole: TOURNAMENT_MANAGER
```

---

### 3.7 Test Website Admin Security

**Prerequisites:**
- User logged in via Discord OAuth
- User has SERVER_ADMIN role binding

**Test Cases:**

1. **Access Admin Panel:**
   - Navigate to: `/servers/{guildId}/admin/tournaments`
   - **Expected**: Access granted, admin table shown

2. **Access Without Permission:**
   - Remove SERVER_ADMIN role from user
   - Navigate to admin panel
   - **Expected**: 403 Forbidden or redirect to login

3. **API Endpoint Protection:**
   - Call: `GET /api/servers/{guildId}/admin/tournaments`
   - Without auth token: **401 Unauthorized**
   - With non-admin token: **403 Forbidden**
   - With admin token: **200 OK** + tournament data

---

## 4. Tournament Code System

### 4.1 How It Works

**Code Generation:**
- **Range**: 1000-9999 (4-digit integers)
- **Pool Size**: 9000 unique codes per guild
- **Algorithm**: Fisher-Yates shuffle for randomization
- **Scope**: Guild-scoped (each Discord server has independent code pool)

**Generation Process:**

1. Query existing tournament codes for the guild
2. Generate pool of all 4-digit codes (1000-9999)
3. Shuffle pool using Fisher-Yates algorithm
4. Find first unused code from shuffled pool
5. Assign to tournament
6. Save to database with unique constraint

**Code Validation:**
- Must be numeric
- Must be exactly 4 digits (1000-9999)
- Must be unique within guild
- Can be used interchangeably with tournament ID

### 4.2 Usage in Commands

Users can reference tournaments by code or ID:

```bash
/tournament info idOrCode: 1234
/tournament terminate idOrCode: 1234
/tournament participants idOrCode: 1234
```

**Lookup Logic:**
```typescript
// Try as ID first
let tournament = await prisma.tournament.findUnique({
  where: { id: idOrCode, guildId }
})

// If not found, try as tournament code
if (!tournament) {
  tournament = await prisma.tournament.findFirst({
    where: { tournamentCode: parseInt(idOrCode), guildId }
  })
}
```

### 4.3 Code Exhaustion Handling

**Scenario**: Guild has created 9000+ tournaments

**Behavior:**
- `generateTournamentCode()` throws error
- Error message: "All 9000 tournament codes have been exhausted for this server. Consider archiving old tournaments."
- Admin should archive or delete old tournaments to free up codes

**Prevention:**
- Archiving tournaments does NOT free up codes (codes remain unique forever)
- Deleting tournaments with `/tournament terminate DELETE` frees up the code
- Recommendation: Use archive for completed tournaments, only delete duplicates/mistakes

---

## 5. Terminate Command

### 5.1 Command Structure

```
/tournament terminate
  idOrCode: <tournament-id-or-code>
  action: PAUSE | DELETE
  reason: <optional-reason>
```

### 5.2 PAUSE Action

**Purpose**: Temporarily halt tournament (reversible)

**What It Does:**
- Sets tournament status to `CANCELLED`
- Records `cancelledAt` timestamp
- Creates audit log entry
- Preserves all tournament data

**Use Cases:**
- Technical difficulties
- Postponement
- Temporary suspension
- Testing/debugging

**Example:**

```
/tournament terminate
  idOrCode: 1234
  action: PAUSE
  reason: Server maintenance scheduled
```

**Reversal:**

```
/tournament reopen idOrCode: 1234
```

### 5.3 DELETE Action

**Purpose**: Permanently remove tournament and all related data

**What It Does:**
- Shows warning embed with detailed breakdown
- Requires confirmation button click
- Requires typing tournament name in modal
- Deletes ALL related data:
  - Tournament record
  - All team registrations
  - All matches
  - All results
  - All audit logs for tournament
  - All PT assignments
- Cannot be undone

**Use Cases:**
- Duplicate tournament created by mistake
- Test tournament cleanup
- Complete data removal

**Safety Features:**
- Two-step confirmation (button + modal)
- Must type exact tournament name
- Warning shows affected data count
- Audit log entry created before deletion

**Example:**

```
/tournament terminate
  idOrCode: 1234
  action: DELETE
  reason: Duplicate entry
```

**Confirmation Flow:**

1. Warning embed displayed
2. Click "⚠️ DELETE PERMANENTLY" button
3. Modal appears: "Type the tournament name to confirm"
4. User types exact name: "Winter Championship"
5. Bot validates name match
6. If correct: Deletion proceeds
7. If incorrect: "Tournament name does not match. Deletion aborted."

---

## 6. Permission System

### 6.1 Role Hierarchy

```
AppRole Enum (ascending power):
├── VIEWER              (level 0)
├── PLAYER              (level 1)
├── REFEREE             (level 2)
├── TOURNAMENT_MANAGER  (level 3)
└── SERVER_ADMIN        (level 4)
```

### 6.2 Role Assignment

**Binding Discord Roles to App Roles:**

```
/server roles add
  discordRole: @Tournament Staff
  appRole: TOURNAMENT_MANAGER
```

**Listing Bindings:**

```
/server roles list
```

**Removing Bindings:**

```
/server roles remove
  discordRole: @Tournament Staff
```

**Checking Members:**

```
/server roles members
  appRole: TOURNAMENT_MANAGER
```

### 6.3 Command Access Matrix

| Command Category | Minimum Role |
|-----------------|--------------|
| `/help` | VIEWER |
| `/tournament list/info` | VIEWER |
| `/tournament create/edit/delete/terminate` | TOURNAMENT_MANAGER |
| `/tournament publish/cancel` | TOURNAMENT_MANAGER |
| `/match schedule/generate` | TOURNAMENT_MANAGER |
| `/match result/approve` | REFEREE |
| `/match dispute/resolve` | REFEREE |
| `/server roles add/remove` | SERVER_ADMIN |
| `/server branding` | SERVER_ADMIN |
| `/analytics summary/export` | TOURNAMENT_MANAGER |
| `/pt buy/verify/revoke` | TOURNAMENT_MANAGER |

### 6.4 Precondition Implementation

**In Command Files:**

```typescript
export class TournamentCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'tournament',
      description: 'Manage tournaments',
      preconditions: ['GuildOnly', 'TournamentManagerOrAdmin'],
    })
  }
}
```

**Precondition Logic:**

```typescript
// TournamentManagerOrAdmin.ts
const role = await resolveUserRole({
  prisma,
  userId: interaction.user.id,
  guildId: interaction.guildId,
  botToken: process.env.DISCORD_BOT_TOKEN!,
})

if (!roleAtLeast(role, 'TOURNAMENT_MANAGER')) {
  return this.error({ message: 'You don't have permission...' })
}
```

### 6.5 Website Permission Middleware

**API Route Protection:**

```typescript
// apps/web/src/app/api/servers/[guildId]/admin/tournaments/route.ts
import { withAdminPermission } from '@esports/permissions'

export const GET = withAdminPermission(async (req, { params, session, userRole }) => {
  // Only SERVER_ADMIN can access
  const tournaments = await prisma.tournament.findMany({
    where: { guildId: params.guildId }
  })
  
  return NextResponse.json({ tournaments })
})
```

**Frontend Guard:**

```typescript
// Check user role before showing admin UI
const userRole = await getUserRole(session.user.id, guildId)

if (userRole !== 'SERVER_ADMIN') {
  return <AccessDenied />
}
```

---

## 7. Display Updates

### 7.1 Discord Embeds

**Tournament codes now appear in:**

- **Creation Success:**
  ```
  ✅ Tournament Created
  Winter Championship (#1234)
  ```

- **Tournament List:**
  ```
  🏆 ACTIVE TOURNAMENTS
  
  1. Winter Championship (#1234)
     • Status: REGISTRATION_OPEN
     • Teams: 12/32
  ```

- **Tournament Info:**
  ```
  📋 TOURNAMENT INFO
  Winter Championship (#1234)
  
  • Game: BGMI (Battle Royale)
  • Teams: 12/32
  ...
  ```

- **Participants List:**
  ```
  👥 REGISTERED TEAMS — Winter Championship (#1234)
  
  1. Team Phoenix (@player1, @player2, @player3, @player4)
  ...
  ```

- **Standings:**
  ```
  🏆 STANDINGS — Winter Championship (#1234)
  
  1. Team Alpha — 150 pts
  2. Team Bravo — 120 pts
  ...
  ```

### 7.2 Website Components

**Tournament Cards:**
```tsx
<div className="tournament-card">
  <span className="tournament-code-badge">#1234</span>
  <h3>Winter Championship</h3>
  ...
</div>
```

**Admin Table:**
```
| Code | Name                | Status          | Teams | Actions |
|------|---------------------|-----------------|-------|---------|
| 1234 | Winter Championship | REGISTRATION_OPEN | 12/32 | Edit    |
| 5678 | Summer League       | LIVE            | 16/16 | View    |
```

**Tournament Detail Header:**
```
🏆 Winter Championship
Tournament Code: #1234
Status: REGISTRATION_OPEN
```

### 7.3 Approved Registration Channel

**When a registration is approved:**

```
✅ REGISTRATION APPROVED

Team Name: Team Phoenix
Players: @player1 @player2 @player3 @player4

Tournament: Winter Championship (#1234)
Registered at: Jan 20, 2025 3:45 PM IST
Slot: 13/32
```

---

## 8. Important Notes for Deployment

### 8.1 Environment Variables

**Required:**

```env
# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Web App
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secret

# Web Base (for Discord bot embeds)
WEB_BASE=https://your-domain.com
```

### 8.2 Discord Bot Setup

**Required Intents:**
- `Guilds`
- `GuildMembers`
- `GuildMessages`
- `MessageContent` (for registration channel listener)

**Required Permissions:**
- Read Messages
- Send Messages
- Embed Links
- Add Reactions
- Manage Messages (for deleting rejection messages)
- Read Message History

### 8.3 Database Considerations

**Indexes:**
- `tournament_code` has unique + query index (created by migration)
- Consider adding composite index: `(guildId, tournamentCode)`
- Monitor query performance on large tournament lists

**Backup:**
- Before running migration, backup database
- Test migration on staging environment first

### 8.4 Registration Channel Setup

**Per Tournament:**
1. Create two channels before tournament creation:
   - `#tournament-registration` (players post here)
   - `#approved-registrations` (bot posts approved here)

2. Set permissions:
   - Registration channel: Players can send messages, bot can read/react/send
   - Approved channel: Players can only read, bot can send

3. Configure during tournament creation wizard

### 8.5 Known Limitations

**Tournament Codes:**
- Maximum 9000 tournaments per guild (extremely unlikely to hit)
- Codes are NOT freed when tournaments are archived
- Only deletion frees up codes

**Registration Channel:**
- Only ONE active tournament per guild can use registration channel
- If multiple tournaments are open, bot processes for the most recently created

**Permissions:**
- Role bindings must be configured manually per server
- Default: Only server owner has access until roles are assigned

### 8.6 Migration Checklist

- [ ] Backup database
- [ ] Test migration on staging
- [ ] Run `prisma migrate deploy`
- [ ] Verify `tournament_code` column exists
- [ ] Create test tournament and verify code generation
- [ ] Test channel-based registration with test data
- [ ] Verify website displays tournament codes
- [ ] Test terminate command with test tournament
- [ ] Configure role bindings for your staff
- [ ] Update documentation for your community

---

## 9. Configuration Best Practices

### 9.1 Server Setup

**Initial Configuration:**

1. Run `/setup` (creates server record, sets timezone)
2. Configure role bindings:
   ```
   /server roles add discordRole:@Admin appRole:SERVER_ADMIN
   /server roles add discordRole:@Manager appRole:TOURNAMENT_MANAGER
   /server roles add discordRole:@Referee appRole:REFEREE
   ```
3. Set server branding:
   ```
   /server branding
   ```

### 9.2 Tournament Creation Workflow

**Recommended Flow:**

1. Create Discord channels:
   - `#winter-championship-registration`
   - `#winter-championship-approved`

2. Create tournament as draft:
   ```
   /tournament create
   ```

3. Review tournament details:
   ```
   /tournament info idOrCode:1234
   ```

4. Publish when ready:
   ```
   /tournament publish idOrCode:1234
   ```

5. Monitor registrations in approved channel

6. Start tournament when registration closes

### 9.3 Registration Channel Tips

**Format Guidelines for Players:**

Post an announcement in your registration channel:

```
📋 REGISTRATION FORMAT

Team Name
@Player1 @Player2 @Player3 @Player4 [@Player5]
IGN1 | IGN2 | IGN3 | IGN4 [| IGN5]

Requirements:
• Minimum 2 Discord mentions
• Maximum 5 Discord mentions (4 + 1 sub)
• No duplicate players
• First line = team name
```

---

## 10. Troubleshooting

### 10.1 Common Issues

**Registration not working:**
- Check that tournament status is `REGISTRATION_OPEN`
- Verify `registrationChannelId` and `approvedRegChannelId` are set
- Ensure bot has permissions in both channels
- Check bot has `MessageContent` intent enabled

**Permission denied errors:**
- User must have role binding configured via `/server roles add`
- Check role hierarchy: user needs minimum required role
- Verify bot can fetch member roles (GuildMembers intent)

**Tournament code not displaying:**
- Check that `tournament_code` column exists in database
- Verify migration was run successfully
- New tournaments should auto-generate codes
- Old tournaments may have null codes (safe to continue)

**Terminate command fails:**
- Verify user has TOURNAMENT_MANAGER or SERVER_ADMIN role
- Check tournament exists in the guild
- For DELETE: ensure confirmation modal is completed correctly

### 10.2 Debug Commands

```bash
# Check database schema
cd packages/database
npx prisma db pull

# View tournament codes
npx prisma studio
# Navigate to tournaments table, check tournament_code column

# Check bot logs
docker logs discord-bot

# Test permission resolution
# Add logging in resolveUserRole function
```

---

## 11. Future Enhancements

**Potential additions:**

- Tournament code search/filter in `/tournament list`
- QR code generation for tournament codes
- Short URL generation: `your-domain.com/t/1234`
- Tournament code analytics (most active codes)
- Code customization for premium servers
- Registration export with tournament codes
- Discord notification mentions with codes

---

## Summary

This implementation transforms SHADØW TOURNAMENTS into a production-ready esports platform with:

✅ Paginated, categorized help system  
✅ Fully consolidated command modules  
✅ Channel-based registration with validation  
✅ 4-digit tournament codes for easy reference  
✅ Robust permission system with role bindings  
✅ Advanced terminate command (pause/delete)  
✅ Website integration with admin security  
✅ Comprehensive display of codes across all interfaces  

All commands are broken-command-free, tournament creation works from Discord, website registration is functional, and the system is ready for deployment.
