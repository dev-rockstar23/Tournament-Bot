# Phase 1 Implementation Plan — Legendary Esports Tournament Platform

> **Scope:** Tasks 1–7 from PLAN.md Phase 1 (Foundation)
> **Root:** `d:\Discord Projects\Tournament-Bot\esports-platform\`
> **Approach:** Greenfield monorepo. Every item leaves the codebase buildable.
> **Build/verify commands** discovered from PLAN.md tech stack:
> - Type-check: `pnpm type-check` (runs `tsc --noEmit` across all packages)
> - Lint: `pnpm lint` (ESLint with TypeScript rules)
> - Build: `pnpm build`
> - Dev: `pnpm dev`

---

## Dependency Map (read before starting)

```
Item 1  (scaffold + config)
  └─► Item 2  (database schema — depends on workspace being set up)
        └─► Item 3  (shared-types — depends on database enums being defined)
              └─► Item 4  (auth — depends on shared-types + Supabase config)
                    └─► Item 5  (permissions — depends on shared-types + prisma client)
                          └─► Item 6  (discord bot — depends on permissions package)
                                └─► Item 7  (landing page — depends on auth + shared-types)
```

Items 3 and 5 have no build-order dependency on each other; both depend only on Item 2.

---

## TypeScript Pitfalls to Avoid (read-first list)

1. **`Decimal` vs `number`:** Prisma maps `Decimal` to `Prisma.Decimal`, not native `number`. Never use `Float` for `orders.amount`. Import `Prisma` from `@prisma/client` and use `new Prisma.Decimal(value)`.
2. **`@sapphire/framework` generic types:** `Command.ChatInputCommandInteraction` changed names between versions. Always import from `@sapphire/framework` directly, not from `discord.js`, for Sapphire-typed interactions.
3. **Next.js 14 App Router `'use client'` / `'use server'` boundary:** Server Components cannot import `useState`/`useEffect`. The Supabase browser client must only be instantiated in client components or route handlers, never in Server Components.
4. **`next/dynamic` with `ssr: false` + TypeScript:** wrap the dynamic import type explicitly to avoid `any`. Pattern: `const HeroScene = dynamic<Record<string, never>>(() => import('@/components/three/HeroScene'), { ssr: false })`.
5. **Prisma singleton in Next.js:** Next.js hot-reload creates multiple PrismaClient instances in dev. Use `globalThis` cache pattern in `packages/database/src/client.ts` to prevent "too many connections" error.
6. **Zod `.parse()` vs `.safeParse()`:** In API route handlers always use `.safeParse()` and return structured errors — never let a thrown `ZodError` propagate to the response unhandled.
7. **`pnpm` workspace protocol:** Internal package references in `package.json` must use `"workspace:*"`, not a version string. Example: `"@esports/shared-types": "workspace:*"`.
8. **Path aliases in tsconfig:** Each package's `tsconfig.json` must extend `../../tsconfig.base.json` (relative). The base uses `"baseUrl": "."` and `"paths"` — each package must add its own `src` alias.
9. **Supabase auth cookies in Next.js 14:** Use `@supabase/ssr` package (not the older `@supabase/auth-helpers-nextjs`) for App Router cookie handling. The `createServerClient` from `@supabase/ssr` accepts `cookieStore` from `next/headers`.
10. **`discord.js` intents as bit flags:** Pass intents as an array of `GatewayIntentBits` values — never as raw numbers. Missing `GuildMembers` intent will silently cause `guild.members.fetch()` to fail.

---

## Implementation Plan

- [ ] 1. **Root monorepo scaffold — workspace config, root package.json, tsconfig base, linting, formatting, env example, gitignore**

  Create the `esports-platform/` directory tree. All directories listed here must exist (as empty folders with a `.gitkeep` where needed). Then write all root-level config files.

  **Directories to create:**
  ```
  esports-platform/
  ├── apps/web/src/app/
  ├── apps/web/src/components/ui/
  ├── apps/web/src/components/three/
  ├── apps/web/src/components/tournament/
  ├── apps/web/src/components/analytics/
  ├── apps/web/src/components/admin/
  ├── apps/web/src/lib/supabase/
  ├── apps/web/src/lib/hooks/
  ├── apps/discord-bot/src/commands/server/
  ├── apps/discord-bot/src/commands/tournament/
  ├── apps/discord-bot/src/commands/match/
  ├── apps/discord-bot/src/commands/register/
  ├── apps/discord-bot/src/commands/winners/
  ├── apps/discord-bot/src/commands/analytics/
  ├── apps/discord-bot/src/listeners/
  ├── apps/discord-bot/src/preconditions/
  ├── apps/discord-bot/src/services/
  ├── apps/discord-bot/src/utils/
  ├── apps/worker/src/processors/
  ├── apps/worker/src/queues/
  ├── packages/database/prisma/
  ├── packages/database/src/repositories/
  ├── packages/permissions/src/
  ├── packages/tournament-engine/src/
  ├── packages/game-rules/src/
  ├── packages/scoring/src/
  ├── packages/payments/src/
  ├── packages/notifications/src/templates/
  ├── packages/shared-types/src/
  ├── infrastructure/deployment/
  ├── infrastructure/monitoring/
  ├── tests/unit/
  ├── tests/integration/
  ├── tests/e2e/
  └── docs/
  ```

  **Files to create:**

  `esports-platform/pnpm-workspace.yaml`
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```

  `esports-platform/package.json` — root with `private: true`, workspaces scripts:
  - `dev`: `pnpm --filter @esports/web dev`
  - `build`: `pnpm -r build`
  - `lint`: `pnpm -r lint`
  - `type-check`: `pnpm -r type-check`
  - `test`: `pnpm -r test`
  - `db:generate`: `pnpm --filter @esports/database db:generate`
  - `db:migrate`: `pnpm --filter @esports/database db:migrate`

  `esports-platform/tsconfig.base.json` — strict TypeScript base:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2022"],
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "exactOptionalPropertyTypes": true,
      "noUncheckedIndexedAccess": true,
      "noImplicitReturns": true,
      "noFallthroughCasesInSwitch": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true
    }
  }
  ```

  `esports-platform/.eslintrc.js` — TypeScript-aware ESLint config using `@typescript-eslint/recommended`, `import/order` rule with groups: `['builtin', 'external', 'internal', 'parent', 'sibling']`. No `any` allowed (`@typescript-eslint/no-explicit-any: error`).

  `esports-platform/.prettierrc`:
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```

  `esports-platform/.gitignore` — covers: `node_modules/`, `.env`, `.env.local`, `.env*.local`, `.next/`, `dist/`, `build/`, `*.tsbuildinfo`, `src/generated/` (Prisma), `.turbo/`, `coverage/`, `.DS_Store`.

  `esports-platform/.env.example` — all variables from PLAN.md Section 13, all values empty:
  ```
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
  NODE_ENV=development
  ```

  **Per-package `package.json` files** (one per app/package — all reference `workspace:*` for internal deps):

  | Package name | Location | Key deps |
  |---|---|---|
  | `@esports/web` | `apps/web/` | `next@14`, `react@18`, `@supabase/ssr`, `@supabase/supabase-js`, `framer-motion`, `three`, `@react-three/fiber`, `@react-three/drei`, `tailwindcss`, `@esports/shared-types workspace:*`, `@esports/permissions workspace:*`, `@esports/database workspace:*` |
  | `@esports/discord-bot` | `apps/discord-bot/` | `discord.js@14`, `@sapphire/framework`, `@sapphire/plugin-logger`, `@sapphire/plugin-i18next`, `@esports/permissions workspace:*`, `@esports/database workspace:*`, `@esports/shared-types workspace:*` |
  | `@esports/worker` | `apps/worker/` | `bullmq`, `@upstash/redis`, `@esports/database workspace:*`, `@esports/shared-types workspace:*` |
  | `@esports/database` | `packages/database/` | `@prisma/client`, `prisma` (dev) |
  | `@esports/permissions` | `packages/permissions/` | `@esports/database workspace:*`, `@esports/shared-types workspace:*` |
  | `@esports/tournament-engine` | `packages/tournament-engine/` | `@esports/database workspace:*`, `@esports/shared-types workspace:*` |
  | `@esports/game-rules` | `packages/game-rules/` | `@esports/shared-types workspace:*`, `zod` |
  | `@esports/scoring` | `packages/scoring/` | `@esports/database workspace:*`, `@esports/game-rules workspace:*` |
  | `@esports/payments` | `packages/payments/` | `@esports/database workspace:*`, `@esports/shared-types workspace:*` |
  | `@esports/notifications` | `packages/notifications/` | `discord.js@14`, `@esports/shared-types workspace:*` |
  | `@esports/shared-types` | `packages/shared-types/` | `zod` |

  Each `package.json` includes scripts: `build: tsc`, `type-check: tsc --noEmit`, `lint: eslint src`.

  **Per-package `tsconfig.json`** (each extends `../../tsconfig.base.json` for packages, `../../../tsconfig.base.json` for apps):
  - `apps/web/tsconfig.json`: extends base, overrides `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"jsx": "preserve"`, adds `"@/*": ["./src/*"]` path alias, includes `next-env.d.ts`.
  - `apps/discord-bot/tsconfig.json`: extends base, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"outDir": "dist"`.
  - `apps/worker/tsconfig.json`: same as discord-bot.
  - All packages: extends base, `"outDir": "dist"`, `"rootDir": "src"`.

  **Stub `src/index.ts`** for every package — just `export {};` to satisfy TypeScript. For `apps/web`, the stub is `apps/web/src/app/page.tsx` with `export default function Page() { return <main />; }`.

  Files: `esports-platform/pnpm-workspace.yaml`, `esports-platform/package.json`, `esports-platform/tsconfig.base.json`, `esports-platform/.eslintrc.js`, `esports-platform/.prettierrc`, `esports-platform/.gitignore`, `esports-platform/.env.example`, plus one `package.json` + `tsconfig.json` + `src/index.ts` per app/package (27 files total).

  Verify: from `esports-platform/`, run `pnpm install` — resolves all workspace links with no errors. Then `pnpm type-check` — zero TypeScript errors across all stubs.

---

- [ ] 2. **Database schema — `packages/database/prisma/schema.prisma`, client singleton, and `src/index.ts` re-export**

  Write the complete Prisma schema. All enums must be declared before the models that use them (Prisma requires this ordering).

  **File: `packages/database/prisma/schema.prisma`**

  **Enums (declare in this order):**
  ```
  AppRole         { VIEWER PLAYER REFEREE TOURNAMENT_MANAGER SERVER_ADMIN }
  TournamentStatus { DRAFT REGISTRATION_OPEN REGISTRATION_CLOSED CHECK_IN LIVE COMPLETED CANCELLED ARCHIVED }
  EntryType       { FREE PAID }
  MatchStatus     { SCHEDULED CHECK_IN READY LIVE AWAITING_RESULT UNDER_REVIEW DISPUTED COMPLETED POSTPONED CANCELLED FORFEIT }
  StageType       { SINGLE_ELIMINATION DOUBLE_ELIMINATION ROUND_ROBIN GROUP_STAGE SWISS CUSTOM }
  StageStatus     { PENDING ACTIVE COMPLETED CANCELLED }
  GameType        { BGMI FREE_FIRE CODM }
  RegistrationStatus { PENDING APPROVED REJECTED WAITLISTED CANCELLED }
  PaymentStatus   { PENDING PAID FAILED EXPIRED DISPUTED REFUNDED }
  AwardType       { CHAMPION RUNNER_UP THIRD_PLACE MVP TOP_FRAGGER CUSTOM }
  AwardFulfillmentStatus { PENDING PROCESSING FULFILLED ON_HOLD }
  OutboxStatus    { PENDING DELIVERED FAILED }
  JobStatus       { PENDING COMPLETED FAILED CANCELLED }
  RegistrationPhase { FIRST_OPEN REOPENED CLOSED }
  ScoreEventType  { MATCH_SCORE CORRECTION }
  ScoreEventStatus { ACTIVE SUPERSEDED }
  DisputeStatus   { OPEN RESOLVED DISMISSED }
  ResultSubmissionStatus { PENDING_REVIEW APPROVED REJECTED }
  SegmentStatus   { PENDING LIVE COMPLETED CANCELLED }
  RefundStatus    { PENDING APPROVED PAID REJECTED }
  ```

  **Models (declare in dependency order — no forward references):**

  1. `DiscordServer` — maps to `discord_servers`. Fields: `id`, `guildId String @unique`, `name`, `icon String?`, `ownerId String`, `installedAt DateTime @default(now())`, `isActive Boolean @default(true)`. Relations: `serverSettings`, `serverRoleBindings`, `tournaments`, `teams`, `users` (through registrations), `auditLogs`, `outboxEvents`, `scheduledJobs`, `discordMessageBindings`.

  2. `ServerSettings` — `id`, `guildId String @unique`, `timezone String @default("UTC")`, `accentColor String?`, `logoUrl String?`, `announcementChannelId String?`, `matchUpdatesChannelId String?`, `resultsChannelId String?`, `disputesChannelId String?`, `registrationChannelId String?`, `adminChannelId String?`, `overlayToken String?`, `notificationConfig Json?`, `dmNotificationConfig Json?`, `maxDelayDays Int @default(90)`. FK: `guildId → DiscordServer.guildId`.

  3. `ServerRoleBinding` — `id`, `guildId String`, `discordRoleId String`, `appRole AppRole`. Unique: `@@unique([guildId, discordRoleId])`. FK: `guildId → DiscordServer.guildId`.

  4. `User` — `id`, `discordId String @unique`, `username String`, `discriminator String?`, `avatar String?`, `accessToken String?`, `refreshToken String?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. Relations: `gameProfiles`, `teamMemberships`, `registrationMembers`, `captainRegistrations`.

  5. `GameProfile` — `id`, `userId String`, `game GameType`, `ign String`, `uid String`, `isVerified Boolean @default(false)`. Unique: `@@unique([userId, game])`. FK: `userId → User.id`.

  6. `Team` — `id`, `guildId String`, `name String`, `tag String?`, `captainId String`, `createdAt DateTime @default(now())`. FK: `guildId → DiscordServer.guildId`, `captainId → User.id`. Unique: `@@unique([guildId, name])`.

  7. `TeamMember` — `id`, `teamId String`, `userId String`, `role String @default("MEMBER")`, `joinedAt DateTime @default(now())`. Unique: `@@unique([teamId, userId])`. FKs to `Team` and `User`.

  8. `Tournament` — `id`, `guildId String`, `name String`, `description String?`, `game GameType`, `mode String`, `status TournamentStatus @default(DRAFT)`, `entryType EntryType @default(FREE)`, `entryPrice Decimal?`, `capacity Int`, `acceptedCount Int @default(0)`, `registrationPhase RegistrationPhase @default(FIRST_OPEN)`, `registrationOpen DateTime?`, `registrationClose DateTime?`, `checkinOpen DateTime?`, `checkinClose DateTime?`, `startAt DateTime?`, `endAt DateTime?`, `completedAt DateTime?`, `bannerUrl String?`, `rulesUrl String?`, `organizerId String?`, `visibility String @default("PUBLIC")`, `resultsLocked Boolean @default(false)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. FK: `guildId → DiscordServer.guildId`. Index: `@@index([guildId, status])`.

  9. `TournamentRuleVersion` — `id`, `tournamentId String`, `version Int`, `rulesJson Json`, `createdAt DateTime @default(now())`. Unique: `@@unique([tournamentId, version])`. FK: `tournamentId → Tournament.id`.

  10. `Stage` — `id`, `tournamentId String`, `name String`, `type StageType`, `order Int`, `status StageStatus @default(PENDING)`. FK: `tournamentId → Tournament.id`.

  11. `Match` — `id`, `stageId String`, `guildId String`, `number Int`, `status MatchStatus @default(SCHEDULED)`, `scheduledStart DateTime?`, `scheduledEnd DateTime?`, `map String?`, `mode String?`, `resultDeadline DateTime?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. Unique: `@@unique([stageId, number])`. Index: `@@index([scheduledStart])`, `@@index([guildId, status])`. FKs to `Stage` and `DiscordServer`.

  12. `MatchSegment` — `id`, `matchId String`, `segmentNumber Int`, `map String?`, `mode String?`, `status SegmentStatus @default(PENDING)`. Unique: `@@unique([matchId, segmentNumber])`. FK: `matchId → Match.id`.

  13. `MatchParticipant` — `id`, `matchId String`, `teamId String`, `seeding Int?`. Unique: `@@unique([matchId, teamId])`. FKs to `Match` and `Team`.

  14. `Registration` — `id`, `tournamentId String`, `guildId String`, `teamId String`, `status RegistrationStatus @default(PENDING)`, `paymentStatus PaymentStatus @default(PENDING)`, `phase RegistrationPhase @default(FIRST_OPEN)`, `submittedAt DateTime @default(now())`, `reviewedAt DateTime?`, `reviewedBy String?`, `rejectionReason String?`. Index: `@@index([tournamentId])`, `@@index([guildId, status])`. FKs to `Tournament`, `DiscordServer`, `Team`.

  15. `RegistrationMember` — `id`, `registrationId String`, `userId String`, `gameProfileId String?`, `status String @default("ACTIVE")`. Unique: `@@unique([registrationId, userId])`. FKs to `Registration`, `User`, `GameProfile`.

  16. `RoomCredential` — `id`, `matchId String @unique`, `roomId String`, `password String`, `releaseAt DateTime`, `expiresAt DateTime`. FK: `matchId → Match.id`.

  17. `ResultSubmission` — `id`, `matchId String`, `submittedBy String`, `scorecardJson Json`, `evidenceUrl String?`, `status ResultSubmissionStatus @default(PENDING_REVIEW)`, `submittedAt DateTime @default(now())`, `reviewedAt DateTime?`, `reviewedBy String?`, `rejectionReason String?`. FK: `matchId → Match.id`.

  18. `ScoreEvent` — `id`, `matchId String`, `teamId String`, `type ScoreEventType @default(MATCH_SCORE)`, `status ScoreEventStatus @default(ACTIVE)`, `points Decimal`, `kills Int @default(0)`, `placement Int?`, `correctionOf String?`, `createdAt DateTime @default(now())`. FKs to `Match`, `Team`. Self-relation: `correctionOf → ScoreEvent.id`.

  19. `Dispute` — `id`, `matchId String`, `raisedBy String`, `reason String`, `evidenceUrl String?`, `status DisputeStatus @default(OPEN)`, `resolvedBy String?`, `resolution String?`, `createdAt DateTime @default(now())`, `resolvedAt DateTime?`. FK: `matchId → Match.id`.

  20. `WinnerRecord` — `id`, `tournamentId String`, `teamId String`, `placement Int`, `awardType AwardType?`, `rosterSnapshot Json`, `isSuperseded Boolean @default(false)`, `createdAt DateTime @default(now())`. FKs to `Tournament`, `Team`.

  21. `Award` — `id`, `tournamentId String`, `userId String?`, `teamId String?`, `type AwardType`, `label String`, `criteria String?`, `fulfillmentStatus AwardFulfillmentStatus @default(PENDING)`. FKs to `Tournament`, optional `User`, optional `Team`.

  22. `Order` — `id`, `registrationId String`, `amount Decimal`, `currency String @default("INR")`, `status PaymentStatus @default(PENDING)`, `expiresAt DateTime`, `providerRef String?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. FK: `registrationId → Registration.id`.

  23. `PaymentEvent` — `id`, `orderId String`, `providerEventId String @unique`, `type String`, `payloadJson Json`, `processedAt DateTime @default(now())`. FK: `orderId → Order.id`. Index on `providerEventId` (unique constraint covers this).

  24. `Refund` — `id`, `orderId String`, `amount Decimal`, `status RefundStatus @default(PENDING)`, `authorizedBy String?`, `providerRef String?`, `createdAt DateTime @default(now())`. FK: `orderId → Order.id`.

  25. `DiscordMessageBinding` — `id`, `guildId String`, `channelId String`, `messageId String`, `recordType String`, `recordId String`, `lastSyncedAt DateTime @default(now())`. Unique: `@@unique([channelId, messageId])`. FK: `guildId → DiscordServer.guildId`.

  26. `OutboxEvent` — `id`, `type String`, `payloadJson Json`, `status OutboxStatus @default(PENDING)`, `retryCount Int @default(0)`, `lastAttemptedAt DateTime?`, `createdAt DateTime @default(now())`, `guildId String?`. Index: `@@index([status, createdAt])`.

  27. `ScheduledJob` — `id`, `jobKey String @unique`, `type String`, `payloadJson Json`, `scheduledFor DateTime`, `status JobStatus @default(PENDING)`, `createdAt DateTime @default(now())`. Index: `@@index([status, scheduledFor])`.

  28. `AuditLog` — `id`, `guildId String`, `actorId String`, `action String`, `targetType String?`, `targetId String?`, `reason String?`, `metadata Json?`, `createdAt DateTime @default(now())`. Index: `@@index([guildId, createdAt])`. FK: `guildId → DiscordServer.guildId`.

  **File: `packages/database/src/client.ts`** — Prisma singleton using `globalThis` cache to prevent multiple instances in Next.js dev hot-reload:
  ```typescript
  import { PrismaClient } from '@prisma/client';

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
  ```

  **File: `packages/database/src/index.ts`** — re-exports `prisma` from `./client` and re-exports everything from `@prisma/client` so consuming packages never import directly from `@prisma/client`.

  **Dependency note:** `@prisma/client` types are generated from schema, so `packages/database/src/index.ts` must be written to import from `@prisma/client` after `prisma generate` runs. The coder must run `pnpm db:generate` as part of this item.

  Files: `packages/database/prisma/schema.prisma`, `packages/database/src/client.ts`, `packages/database/src/index.ts`.

  Verify: run `pnpm --filter @esports/database db:generate` — Prisma client generated with no errors. Run `pnpm --filter @esports/database type-check` — zero TypeScript errors.

---

- [ ] 3. **Shared types — Zod schemas for all domain objects in `packages/shared-types/src/`**

  **Dependency:** Item 2 must be complete (enums defined in schema.prisma are referenced conceptually — Zod schemas mirror the enum values as `z.enum([...])` literals, not as imports from Prisma, to keep `shared-types` free of a Prisma dependency).

  **File: `packages/shared-types/src/enums.ts`** — re-declare all enums as `const` objects and `z.enum()` schemas. This is the single source of truth for the Zod layer. Example pattern:
  ```typescript
  import { z } from 'zod';
  export const AppRoleValues = ['VIEWER', 'PLAYER', 'REFEREE', 'TOURNAMENT_MANAGER', 'SERVER_ADMIN'] as const;
  export const AppRoleSchema = z.enum(AppRoleValues);
  export type AppRole = z.infer<typeof AppRoleSchema>;
  // Repeat for every enum: TournamentStatus, MatchStatus, EntryType, GameType,
  // RegistrationStatus, PaymentStatus, AwardType, OutboxStatus, JobStatus,
  // StageType, RegistrationPhase, ScoreEventType, DisputeStatus, etc.
  ```

  **File: `packages/shared-types/src/tournament.ts`** — Zod schemas:
  - `CreateTournamentSchema` — validates the wizard Step 1-3 payload: `name` (min 3, max 80), `description` (max 1000, optional), `game: GameTypeSchema`, `mode: z.string()`, `capacity: z.number().int().min(2).max(512)`, `entryType: EntryTypeSchema`, `registrationOpen: z.coerce.date()`, `registrationClose: z.coerce.date()`, `startAt: z.coerce.date()`, `endAt: z.coerce.date()`. Refinement: `registrationClose` must be after `registrationOpen`; `startAt` must be after `registrationClose`; `endAt` must be after `startAt`.
  - `UpdateTournamentSchema` — `CreateTournamentSchema.partial()`.
  - `TournamentResponseSchema` — public-safe response shape (no `accessToken`, no `providerRef`).
  - `PublishTournamentSchema` — validates Step 6 payload: requires `announcementChannelId`, `scoring config`, `capacity > 0`.

  **File: `packages/shared-types/src/match.ts`** — Zod schemas:
  - `ScheduleMatchSchema` — `scheduledStart: z.coerce.date()`, `scheduledEnd: z.coerce.date()`, `map: z.string().optional()`, `mode: z.string().optional()`. Refinement: `scheduledEnd` must be after `scheduledStart`.
  - `BulkCreateMatchesSchema` — `count: z.number().int().min(1).max(20)`, `firstMatchStart: z.coerce.date()`, `durationMinutes: z.number().int().min(5).max(720)`, `gapMinutes: z.number().int().min(0).max(120)`, `defaultMap: z.string().optional()`, `defaultMode: z.string().optional()`.
  - `SubmitResultSchema` — `scorecardJson: z.record(z.unknown())`, `evidenceUrl: z.string().url().optional()`.

  **File: `packages/shared-types/src/registration.ts`** — Zod schemas for all 6 registration formats:
  - `RegistrationMemberSchema` — `discordId: z.string()`, `ign: z.string().optional()`, `uid: z.string().regex(/^\d+$/).optional()`.
  - `Format1Schema` (Simple Team): `teamName`, `members: z.array(RegistrationMemberSchema).min(2).max(4)`.
  - `Format2Schema` (Captain-Based): `teamName`, `captainDiscordId: z.string()`, `members: z.array(RegistrationMemberSchema).min(2).max(4)`.
  - `Format3Schema` (Full Player Details): `teamName`, `captainDiscordId`, `members: z.array(RegistrationMemberSchema.extend({ ign: z.string().min(1), uid: z.string().regex(/^\d+$/) })).min(2).max(4)`.
  - `Format4Schema` (Team + Substitute): `teamName`, `captainDiscordId`, `members: z.array(...).min(2).max(4)`, `substitute: RegistrationMemberSchema.optional()`.
  - `Format5Schema` (COD Mobile 5-Player): like Format 4 but `members.min(3).max(5)`.
  - `Format6Schema` (Full Details with Substitute): like Format 3 + optional substitute with ign+uid required.
  - Export union `RegistrationSchema = z.union([Format1Schema, ..., Format6Schema])` — discriminated by `format: z.literal(1..6)` added to each.

  **File: `packages/shared-types/src/scoring.ts`** — Zod schemas:
  - `PlacementPointRowSchema` — `placement: z.number().int().min(1)`, `points: z.number().int().min(0)`.
  - `BRScoringConfigSchema` — `game: z.enum(['BGMI', 'FREE_FIRE'])`, `killValue: z.number().min(0)`, `penaltyPerInfraction: z.number().min(0)`, `placementTable: z.array(PlacementPointRowSchema).min(1).max(20)`, `tiebreakerOrder: z.array(z.enum(['TOTAL_POINTS', 'TOTAL_KILLS', 'BEST_PLACEMENT', 'MOST_WINS']))`.
  - `ClashSquadConfigSchema` — `game: z.literal('FREE_FIRE')`, `roundWinThreshold: z.number().int().min(1)`, `bestOf: z.number().int().min(1).max(5)`.
  - `CODMMultiplayerConfigSchema` — `game: z.literal('CODM')`, `bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)])`.
  - `ScoringConfigSchema = z.discriminatedUnion('type', [BRScoringConfigSchema, ClashSquadConfigSchema, CODMMultiplayerConfigSchema])`.

  **File: `packages/shared-types/src/payment.ts`** — Zod schemas:
  - `CreateOrderSchema` — `tournamentId: z.string()`, `teamId: z.string()`.
  - `RazorpayWebhookSchema` — `event: z.string()`, `payload: z.object({ payment: z.object({ entity: z.object({ id: z.string(), order_id: z.string(), amount: z.number().int(), currency: z.string(), status: z.string() }) }) })`.
  - `PaymentEventSchema` — shape for audit/log display.

  **File: `packages/shared-types/src/index.ts`** — barrel re-export of all above files:
  ```typescript
  export * from './enums';
  export * from './tournament';
  export * from './match';
  export * from './registration';
  export * from './scoring';
  export * from './payment';
  ```

  Files: `packages/shared-types/src/enums.ts`, `tournament.ts`, `match.ts`, `registration.ts`, `scoring.ts`, `payment.ts`, `index.ts`.

  Verify: `pnpm --filter @esports/shared-types type-check` — zero TypeScript errors. `pnpm --filter @esports/shared-types build` — compiles cleanly.

---

- [ ] 4. **Auth and Supabase setup — server/client/middleware helpers, Next.js middleware, and auth API routes**

  **Dependency:** Item 1 (Next.js app scaffold), Item 3 (shared types for user shape).

  **pitfall:** Use `@supabase/ssr` — NOT `@supabase/auth-helpers-nextjs` — for App Router compatibility.

  **File: `apps/web/src/lib/supabase/server.ts`** — creates a Supabase client for Server Components and Route Handlers using `next/headers` cookie store:
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { cookies } from 'next/headers';

  export function createSupabaseServerClient() {
    const cookieStore = cookies();
    return createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) { cookieStore.set({ name, value, ...options }); },
          remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );
  }
  ```

  **File: `apps/web/src/lib/supabase/client.ts`** — creates a Supabase browser client (singleton, client-side only):
  ```typescript
  'use client';
  import { createBrowserClient } from '@supabase/ssr';
  let client: ReturnType<typeof createBrowserClient> | null = null;
  export function getSupabaseBrowserClient() {
    if (!client) {
      client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return client;
  }
  ```
  Note: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.example`.

  **File: `apps/web/src/lib/supabase/middleware.ts`** — exported `updateSession` helper that refreshes the Supabase session in middleware context (required by `@supabase/ssr` for token refresh):
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { NextResponse, type NextRequest } from 'next/server';

  export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request: { headers: request.headers } });
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return request.cookies.get(name)?.value; },
          set(name, value, options) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value, ...options });
          },
          remove(name, options) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );
    await supabase.auth.getUser();
    return response;
  }
  ```

  **File: `apps/web/src/middleware.ts`** — Next.js Edge middleware. Protects all `/servers/*` and `/api/servers/*` routes. Unauthenticated requests are redirected to `/?next=<original-path>`. Uses `updateSession` from `./lib/supabase/middleware`:
  ```typescript
  import { type NextRequest, NextResponse } from 'next/server';
  import { createServerClient } from '@supabase/ssr';

  export async function middleware(request: NextRequest) {
    const response = await updateSession(request);
    const { pathname } = request.nextUrl;
    const protectedPrefixes = ['/servers', '/api/servers'];
    if (protectedPrefixes.some(p => pathname.startsWith(p))) {
      const supabase = createServerClient(...);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const redirectUrl = new URL('/', request.url);
        redirectUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }
    return response;
  }
  export const config = { matcher: ['/servers/:path*', '/api/servers/:path*', '/api/auth/:path*'] };
  ```

  **File: `apps/web/src/app/api/auth/callback/route.ts`** — handles Supabase OAuth2 callback:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createSupabaseServerClient } from '@/lib/supabase/server';
  import { prisma } from '@esports/database';

  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/servers';
    if (!code) return NextResponse.redirect(new URL('/', request.url));

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/?error=${error.message}`, request.url));

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Upsert user into our users table
      await prisma.user.upsert({
        where: { discordId: user.user_metadata['provider_id'] ?? user.id },
        update: { username: user.user_metadata['full_name'] ?? user.email ?? '', avatar: user.user_metadata['avatar_url'] },
        create: { discordId: user.user_metadata['provider_id'] ?? user.id, username: user.user_metadata['full_name'] ?? user.email ?? '', avatar: user.user_metadata['avatar_url'] },
      });
    }
    return NextResponse.redirect(new URL(next, request.url));
  }
  ```

  **File: `apps/web/src/app/api/auth/logout/route.ts`** — POST handler: calls `supabase.auth.signOut()`, returns 200.

  **File: `apps/web/src/app/api/auth/me/route.ts`** — GET handler:
  - Call `supabase.auth.getUser()` — return 401 if no user.
  - Return `{ discordId, username, avatar }` derived from `user.user_metadata` — never return raw Supabase session data or tokens.

  **File: `apps/web/src/app/api/auth/login/route.ts`** — GET handler that initiates the Discord OAuth2 flow:
  - Calls `supabase.auth.signInWithOAuth({ provider: 'discord', options: { scopes: 'identify guilds', redirectTo: process.env.DISCORD_REDIRECT_URI } })`.
  - Redirects to the returned URL.

  Files: `apps/web/src/lib/supabase/server.ts`, `client.ts`, `middleware.ts`; `apps/web/src/middleware.ts`; `apps/web/src/app/api/auth/callback/route.ts`, `logout/route.ts`, `me/route.ts`, `login/route.ts`.

  Verify: `pnpm --filter @esports/web type-check` — zero TypeScript errors. With a real Supabase project configured in `.env`, `GET /api/auth/me` without a session returns 401.

---

- [ ] 5. **Permissions package — role resolution, guild membership assertion, `withPermission` HOC, brute-force protection, and index re-export**

  **Dependency:** Item 2 (Prisma client + `AppRole` enum), Item 3 (shared types `AppRole` schema).

  **Design decision:** The permissions package is a Node.js module imported by both `apps/web` (Next.js route handlers) and `apps/discord-bot` (Sapphire preconditions). It must not import anything Next.js-specific. Discord API calls use the native `fetch` (available in Node 18+), not a Discord.js client — the permissions package has no discord.js dependency.

  **File: `packages/permissions/src/roles.ts`** — role hierarchy as a numeric map for comparison:
  ```typescript
  import { AppRole } from '@esports/shared-types';

  export const ROLE_HIERARCHY: Record<AppRole, number> = {
    VIEWER: 0,
    PLAYER: 1,
    REFEREE: 2,
    TOURNAMENT_MANAGER: 3,
    SERVER_ADMIN: 4,
  };

  export function roleAtLeast(userRole: AppRole, required: AppRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
  }
  ```

  **File: `packages/permissions/src/guild-membership.ts`** — Discord API guild membership check:
  ```typescript
  export class NotGuildMemberError extends Error { constructor() { super('Not a member of this guild'); } }

  export async function assertGuildMembership(
    accessToken: string,
    guildId: string
  ): Promise<void> {
    const response = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new NotGuildMemberError();
    const guilds = await response.json() as Array<{ id: string }>;
    if (!guilds.some(g => g.id === guildId)) throw new NotGuildMemberError();
  }
  ```

  **File: `packages/permissions/src/role-resolver.ts`** — resolves a user's `AppRole` for a given guild. Follows the strict priority from PLAN.md Section 14:
  ```typescript
  import { prisma } from '@esports/database';
  import { AppRole } from '@esports/shared-types';

  export async function resolveUserRole(
    userId: string,      // our internal user.id
    guildId: string,
    discordUserId: string,  // Discord snowflake
    botToken: string
  ): Promise<AppRole> {
    // Step 1: check guild owner
    const server = await prisma.discordServer.findUnique({ where: { guildId } });
    if (!server) throw new Error('Server not found');
    if (server.ownerId === discordUserId) return 'SERVER_ADMIN';

    // Step 2: fetch member's Discord roles for this guild via bot token
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
    if (memberRes.status === 404) return 'VIEWER';
    if (!memberRes.ok) throw new Error('Failed to fetch guild member');
    const member = await memberRes.json() as { roles: string[] };

    // Step 3: cross-reference with server_role_bindings
    const bindings = await prisma.serverRoleBinding.findMany({
      where: { guildId, discordRoleId: { in: member.roles } },
    });
    if (bindings.length === 0) return 'VIEWER';

    // Step 4: return highest app role
    const ROLE_ORDER: AppRole[] = ['VIEWER', 'PLAYER', 'REFEREE', 'TOURNAMENT_MANAGER', 'SERVER_ADMIN'];
    let highest: AppRole = 'VIEWER';
    for (const binding of bindings) {
      if (ROLE_ORDER.indexOf(binding.appRole as AppRole) > ROLE_ORDER.indexOf(highest)) {
        highest = binding.appRole as AppRole;
      }
    }
    return highest;
  }
  ```

  **File: `packages/permissions/src/withPermission.ts`** — Next.js Route Handler HOC. Wraps a handler and enforces auth + membership + role in order:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createSupabaseServerClient } from '@esports/web/lib/supabase/server'; // ← AVOID THIS
  ```
  **Pitfall:** `withPermission` cannot import from `apps/web`. Instead, it accepts the resolved user context as parameters — the actual session extraction happens in the route handler, which passes `{ userId, discordUserId, accessToken }` into `withPermission`. The HOC signature is:
  ```typescript
  export function withPermission(
    requiredRole: AppRole,
    handler: (req: NextRequest, ctx: PermissionContext, params: Record<string, string>) => Promise<NextResponse>
  ): (req: NextRequest, params: { params: Record<string, string> }) => Promise<NextResponse>
  ```
  Where `PermissionContext = { userId: string; discordUserId: string; guildId: string; role: AppRole; isOwner: boolean }`.

  The HOC implementation:
  1. Extract `guildId` from route params.
  2. Accept `userId`, `discordUserId`, `accessToken` via a session extractor function passed as a third argument (or via a request header set by middleware — choose the header approach to keep the HOC free of Next.js imports). Design decision: pass a `getSession` callback as the third parameter, so `withPermission` is framework-agnostic.
  3. Call `resolveUserRole(userId, guildId, discordUserId, process.env.DISCORD_BOT_TOKEN!)`.
  4. If `!roleAtLeast(resolvedRole, requiredRole)` → return 403 JSON `{ error: 'Forbidden' }`.
  5. Call `handler(req, { userId, discordUserId, guildId, role: resolvedRole, isOwner }, params)`.

  **File: `packages/permissions/src/brute-force.ts`** — login attempt rate limiting for admin panel. Uses an in-memory sliding window per IP (for dev/test) plus an optional Upstash Redis backend for production:
  ```typescript
  export interface BruteForceStore {
    increment(key: string): Promise<number>;
    reset(key: string): Promise<void>;
  }

  export class InMemoryBruteForceStore implements BruteForceStore {
    private counts = new Map<string, { count: number; expiresAt: number }>();
    async increment(key: string) { /* sliding window, 5 attempts per 15min */ }
    async reset(key: string) { this.counts.delete(key); }
  }

  export async function checkBruteForce(
    store: BruteForceStore,
    ip: string,
    maxAttempts = 5
  ): Promise<{ allowed: boolean; remainingAttempts: number }> { ... }
  ```

  **File: `packages/permissions/src/index.ts`** — barrel re-export:
  ```typescript
  export * from './roles';
  export * from './guild-membership';
  export * from './role-resolver';
  export * from './withPermission';
  export * from './brute-force';
  ```

  Files: `packages/permissions/src/roles.ts`, `guild-membership.ts`, `role-resolver.ts`, `withPermission.ts`, `brute-force.ts`, `index.ts`.

  Verify: `pnpm --filter @esports/permissions type-check` — zero TypeScript errors. `pnpm --filter @esports/permissions build` — compiles cleanly.

---

- [ ] 6. **Discord bot — Sapphire scaffold, utility files, preconditions, listeners, and all command stubs**

  **Dependency:** Item 5 (permissions package for `HasPermission` precondition and role resolver).

  **File: `apps/discord-bot/src/index.ts`** — SapphireClient setup:
  ```typescript
  import { SapphireClient, LogLevel } from '@sapphire/framework';
  import { GatewayIntentBits } from 'discord.js';

  const client = new SapphireClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    logger: { level: process.env.NODE_ENV === 'production' ? LogLevel.Info : LogLevel.Debug },
    loadMessageCommandListeners: false,
  });

  client.login(process.env.DISCORD_BOT_TOKEN!).catch(console.error);
  ```

  **File: `apps/discord-bot/src/utils/emojis.ts`** — full `EMOJIS` constant object with all emoji IDs from PLAN.md Section 17. All IDs are placeholder strings `'PLACEHOLDER_ID'` — to be replaced by the bot developer after uploading custom emoji to the Discord Developer Portal. Export: `export const EMOJIS = { live: '<:live:PLACEHOLDER_ID>', ... }` (all 26 entries from PLAN.md).

  **File: `apps/discord-bot/src/utils/responses.ts`** — all personality response builder functions from PLAN.md Section 17:
  - `success(title: string, desc: string): EmbedBuilder`
  - `created(type: string, name: string): EmbedBuilder`
  - `updated(field: string): EmbedBuilder`
  - `registered(teamName: string): EmbedBuilder`
  - `approved(teamName: string): EmbedBuilder`
  - `permissionDenied(): EmbedBuilder`
  - `notFound(type: string): EmbedBuilder`
  - `tournamentFull(): EmbedBuilder`
  - `matchNotReady(state: string): EmbedBuilder`
  - `genericError(): EmbedBuilder`
  - `maintenanceMode(): EmbedBuilder`
  - `loading(): EmbedBuilder`
  - `noResults(): EmbedBuilder`
  Each returns a pre-configured `EmbedBuilder` from `discord.js` using the design tokens (color `0x0a0a0f`, left-bar `0x7c3aed`, appropriate emoji from `EMOJIS`).

  **File: `apps/discord-bot/src/utils/embeds.ts`** — shared embed builders for tournament info, standings, and capacity bar:
  - `buildTournamentInfoEmbed(tournament): EmbedBuilder`
  - `buildStandingsEmbed(standings, game): EmbedBuilder`
  - `buildCapacityBar(accepted: number, capacity: number): string` — returns Unicode block string e.g. `████████░░ 8/10`.
  - `buildWelcomeEmbed(serverName: string): EmbedBuilder` — exact welcome message from PLAN.md Section 17.

  **File: `apps/discord-bot/src/preconditions/GuildOnly.ts`** — extends `Precondition`:
  ```typescript
  import { Precondition } from '@sapphire/framework';
  import type { CommandInteraction } from 'discord.js';

  export class GuildOnlyPrecondition extends Precondition {
    public override chatInputRun(interaction: CommandInteraction) {
      return interaction.guildId
        ? this.ok()
        : this.error({ message: 'This command can only be used inside a Discord server.' });
    }
  }
  declare module '@sapphire/framework' {
    interface Preconditions { GuildOnly: never; }
  }
  ```

  **File: `apps/discord-bot/src/preconditions/HasPermission.ts`** — extends `Precondition`, accepts a required `AppRole` via constructor options, calls `resolveUserRole` from `@esports/permissions`, returns `this.error({ message: responses.permissionDenied() })` on failure. Pattern for passing required role: use Sapphire's precondition context:
  ```typescript
  import { Precondition, type PreconditionContext } from '@sapphire/framework';
  import { resolveUserRole, roleAtLeast } from '@esports/permissions';
  import type { AppRole } from '@esports/shared-types';

  export interface HasPermissionContext extends PreconditionContext {
    requiredRole: AppRole;
  }

  export class HasPermissionPrecondition extends Precondition {
    public override async chatInputRun(
      interaction: ChatInputCommandInteraction,
      _command: Command,
      context: HasPermissionContext
    ) {
      if (!interaction.guildId) return this.error({ message: 'Guild only.' });
      // resolve role and check
      const role = await resolveUserRole(...);
      return roleAtLeast(role, context.requiredRole)
        ? this.ok()
        : this.error({ message: `You need ${context.requiredRole} role for this.` });
    }
  }
  declare module '@sapphire/framework' {
    interface Preconditions { HasPermission: HasPermissionContext; }
  }
  ```

  **File: `apps/discord-bot/src/listeners/ready.ts`** — `@ApplyOptions<Listener.Options>({ event: Events.ClientReady, once: true })`. Logs `Bot online: ${client.user.tag}` with the bot emoji from `EMOJIS`. Registers global slash commands via `client.application.commands.set(...)`.

  **File: `apps/discord-bot/src/listeners/guild-create.ts`** — upserts `DiscordServer` record, posts welcome embed (from `buildWelcomeEmbed`) to `guild.systemChannel`, then posts the timezone setup prompt (a Select Menu with grouped timezone options). Uses `prisma` from `@esports/database`.

  **File: `apps/discord-bot/src/listeners/guild-delete.ts`** — marks `discordServer.isActive = false` via `prisma.discordServer.update(...)`.

  **Server command stubs** (full implementation for setup/status, stubs for roles):

  **File: `apps/discord-bot/src/commands/server/setup.ts`** — `@ApplyOptions<Command.Options>({ name: 'setup', description: 'Configure your server', preconditions: ['GuildOnly'] })`. `chatInputRun`: posts Step 1 embed (timezone selector via `StringSelectMenuBuilder`). On timezone selection: saves to `server_settings.timezone`, proceeds to channel mapping step. On channel mapping: saves channel IDs. On role binding: opens modal to map Discord roles to app roles, saves `ServerRoleBinding` records. Each step is a separate button interaction — uses `interaction.awaitMessageComponent`. Full multi-step wizard implementation.

  **File: `apps/discord-bot/src/commands/server/status.ts`** — `chatInputRun`: fetches `server_settings`, checks DB connectivity (`prisma.$queryRaw\`SELECT 1\``), checks Redis via Upstash ping, counts pending `outbox_events`, builds status embed. Returns embed with green/amber/red indicators.

  **File: `apps/discord-bot/src/commands/server/roles.ts`** — stub with `chatInputRun` returning a "Coming soon" embed. Subcommands: `list`, `add`, `remove`, `members`.

  **Tournament command stubs** — all files in `apps/discord-bot/src/commands/tournament/`: `create.ts`, `edit.ts`, `publish.ts`, `cancel.ts`, `list.ts`, `info.ts`, `participants.ts`, `standings.ts`. Each exports a class extending `Command` with the correct `name` and `description` from PLAN.md Section 7, `preconditions: ['GuildOnly']`, and a `chatInputRun` that returns `responses.loading()` (stub).

  **Match command stubs** — all files in `apps/discord-bot/src/commands/match/`: `schedule.ts`, `checkin.ts`, `room.ts`, `result.ts`, `approve.ts`, `dispute.ts`. Same stub pattern.

  **Other command stubs**: `apps/discord-bot/src/commands/register/register.ts`, `apps/discord-bot/src/commands/winners/winners.ts`, `apps/discord-bot/src/commands/analytics/analytics.ts`.

  Files: `apps/discord-bot/src/index.ts`, `utils/emojis.ts`, `utils/responses.ts`, `utils/embeds.ts`, `preconditions/GuildOnly.ts`, `preconditions/HasPermission.ts`, `listeners/ready.ts`, `listeners/guild-create.ts`, `listeners/guild-delete.ts`, `commands/server/setup.ts`, `commands/server/status.ts`, `commands/server/roles.ts`, plus 14 command stub files.

  Verify: `pnpm --filter @esports/discord-bot type-check` — zero TypeScript errors. Bot starts without crashing: `pnpm --filter @esports/discord-bot build && node apps/discord-bot/dist/index.js` — logs "Bot online" and exits cleanly on `CTRL+C`.

---

- [ ] 7. **Next.js landing page and design system — globals.css, layout.tsx, page.tsx, UI components, Three.js hero, motion variants, and servers page**

  **Dependency:** Item 4 (Supabase auth client for login button), Item 3 (shared types).

  **File: `apps/web/src/app/globals.css`** — full CSS custom property system from PLAN.md Section 18. Includes:
  - All `--color-*` variables in `:root` (all 18 design tokens from Section 18).
  - `@property --gradient-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }` for animatable gradient border.
  - `.glass-card` class with full `backdrop-filter`, border, box-shadow, and hover state from Section 18.
  - `.glow-button` with `conic-gradient` using `--gradient-angle` and `@keyframes spin-gradient`.
  - Skeleton shimmer `@keyframes shimmer` with `background-position` animation.
  - Live pulse `@keyframes live-pulse` with opacity animation.
  - `@media (prefers-reduced-motion: reduce)` block: sets all `animation: none !important`, `transition: none !important`.
  - Google Fonts import for Orbitron, Inter, JetBrains Mono (or `next/font` via `layout.tsx` — prefer `next/font`).

  **File: `apps/web/src/app/layout.tsx`** — root Server Component layout. Uses `next/font` to load Orbitron, Inter, and JetBrains Mono (zero FOUT). Sets `<html>` with font CSS variables. Imports `globals.css`. Includes `<meta name="viewport">` and basic SEO metadata via `export const metadata`. Returns `<html lang="en"><body>{children}</body></html>`.

  **File: `apps/web/src/app/page.tsx`** — landing page. Server Component. Renders:
  1. `<HeroSceneWrapper>` — dynamic import wrapper (see below).
  2. Features section (three `<GlassCard>` components).
  3. Games section (BGMI, Free Fire, COD Mobile tiles).
  4. How It Works section (3-step flow).
  5. Footer.
  All section reveals use Framer Motion (`fadeUp`, `staggerChildren` from `lib/motion.ts`) — **but** because page.tsx is a Server Component, the Framer Motion wrappers must be in a separate `'use client'` component. Create `apps/web/src/components/LandingAnimations.tsx` as a client component that wraps each section.

  **File: `apps/web/src/lib/motion.ts`** — Framer Motion variant definitions (client-safe, no `'use client'` directive needed here since it's just objects):
  ```typescript
  import { Variants } from 'framer-motion';
  export const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };
  export const staggerChildren: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
  export const slideInLeft: Variants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } };
  export const scaleIn: Variants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } } };
  export const glowPulse: Variants = { idle: { boxShadow: '0 0 8px rgba(124,58,237,0.3)' }, active: { boxShadow: ['0 0 8px rgba(124,58,237,0.3)', '0 0 24px rgba(124,58,237,0.7)', '0 0 8px rgba(124,58,237,0.3)'], transition: { duration: 2, repeat: Infinity } } };
  ```

  **File: `apps/web/src/components/ui/GlassCard.tsx`** — `'use client'`. Renders a `<div>` with `className="glass-card"` and optional hover tilt (via `onMouseMove`/`onMouseLeave` setting `--rx`/`--ry` CSS vars). Props: `children`, `className?`, `tilt?: boolean`. Accessible: `role="region"` when `aria-label` provided.

  **File: `apps/web/src/components/ui/GlowButton.tsx`** — `'use client'`. Renders a `<button>` or `<a>` (if `href` provided) with `className="glow-button"`. Props: `children`, `href?`, `onClick?`, `className?`, `disabled?`. Animated gradient border on hover via CSS class toggle.

  **File: `apps/web/src/components/ui/Badge.tsx`** — Server Component. Renders a `<span>` with variant-based className. Variants: game variants (`bgmi`, `freeFire`, `codm`) and status variants (`live`, `upcoming`, `completed`, `cancelled`, `draft`). Each variant maps to specific background/text colors from the design tokens.

  **File: `apps/web/src/components/ui/AnimatedCounter.tsx`** — `'use client'`. Uses Framer Motion `useMotionValue` + `useTransform` + `useSpring` to animate a number from 0 to `value` on mount. Respects `prefers-reduced-motion` via `window.matchMedia('(prefers-reduced-motion: reduce)')` — if true, renders `value` directly without animation. Props: `value: number`, `duration?: number`, `className?`.

  **File: `apps/web/src/components/ui/StatusPulse.tsx`** — Server Component. Renders a `<span>` with a CSS `live-pulse` animation and color based on `status` prop (`live` = red, `synced` = green, `pending` = amber, `degraded` = red). Props: `status: 'live' | 'synced' | 'pending' | 'degraded'`, `label?: string`.

  **File: `apps/web/src/components/ui/Skeleton.tsx`** — Server Component. Renders a shimmer placeholder `<div>` using the `shimmer` CSS animation. Props: `className?` for sizing. Variants: `card`, `text`, `avatar` preset sizes.

  **File: `apps/web/src/components/ui/Navigation.tsx`** — `'use client'`. Top navigation bar. Shows platform logo + name. If user is authenticated (check via `getSupabaseBrowserClient().auth.getUser()`), shows avatar + username + logout button. If unauthenticated, shows "Login with Discord" `<GlowButton>` that links to `/api/auth/login`. Uses `useRouter` for client-side navigation.

  **File: `apps/web/src/components/three/HeroScene.tsx`** — `'use client'`. The Three.js hero scene. Implements:
  - `<Canvas>` from `@react-three/fiber` with `camera={{ position: [0, 0, 5] }}`.
  - An `<IcosahedronGeometry>` mesh with `wireframe` overlay and violet `MeshStandardMaterial`.
  - 500 instanced particles (`<InstancedMesh>`) with slow drift using `useFrame`.
  - Two `<pointLight>` sources: violet `#7c3aed` and cyan `#06b6d4`, both with animated intensity via `useFrame`.
  - Post-processing: `<EffectComposer>` from `@react-three/postprocessing` with `<Bloom>` (threshold 0.5, strength 0.8) and `<DepthOfField>` (focusDistance 0, focalLength 0.02, bokehScale 2).
  - Floating ring orbits: 2 `<TorusGeometry>` meshes with `useFrame` rotation at different speeds.
  - Returns `null` (empty fragment) when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
  - **pitfall:** `useFrame` runs inside the Canvas — check for `prefers-reduced-motion` in a `useEffect` before adding animation loops. Stop all animations (set `frameloop="never"` on Canvas) when `prefers-reduced-motion` is true.

  **File: `apps/web/src/components/three/HeroSceneWrapper.tsx`** — `'use client'`. Uses `next/dynamic` with `{ ssr: false }` to import `HeroScene`. Wraps in a `<Suspense fallback={<Skeleton className="w-full h-screen" />}>`. Returns the dynamically loaded scene positioned as a full-viewport background behind the hero text.

  **File: `apps/web/src/app/servers/page.tsx`** — Server Component. The post-login server selector page. Renders:
  - Page header with user avatar (fetched via `createSupabaseServerClient().auth.getUser()`).
  - Three sections: "Connected Servers", "Eligible Servers" (bot not installed), "Other Servers" (not owner/admin eligible).
  - Each server rendered as a `<GlassCard>` with server icon (via Discord CDN), name, and status badge.
  - Data fetched from `/api/servers` (internal fetch to the same Next.js instance). For Phase 1, stub the `/api/servers` route to return the user's Discord guilds from the Supabase session's `provider_token` scope — the full guild-grouping logic is Phase 2 (Task 4).
  - "Add Bot" button for eligible servers links to `https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot+applications.commands&guild_id=GUILD_ID`.

  Files: `apps/web/src/app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `lib/motion.ts`, `components/ui/GlassCard.tsx`, `GlowButton.tsx`, `Badge.tsx`, `AnimatedCounter.tsx`, `StatusPulse.tsx`, `Skeleton.tsx`, `Navigation.tsx`, `components/three/HeroScene.tsx`, `HeroSceneWrapper.tsx`, `app/servers/page.tsx`, `app/api/auth/login/route.ts` (already in Item 4).

  Verify: `pnpm --filter @esports/web type-check` — zero TypeScript errors. `pnpm --filter @esports/web dev` starts on port 3000. Landing page loads with no console errors. `HeroScene` is not included in SSR bundle (verify by checking `/_next/static/chunks` — no `three` in server-rendered HTML). `prefers-reduced-motion` media query: disable animations in browser devtools — Three.js canvas disappears and all Framer Motion animations are instant.

---

## Cross-Cutting Concerns

**Environment setup before any item:** Copy `.env.example` to `.env` and fill in real Supabase URL, anon key, and Discord credentials. Without `SUPABASE_URL` and `DISCORD_BOT_TOKEN`, Items 4, 5, and 6 will fail at runtime (type-check still passes).

**Prisma generate must run before any package that imports `@esports/database`:** The generated types in `node_modules/.prisma/client` are required for TypeScript to resolve `PrismaClient` types. Add `"postinstall": "prisma generate --schema=packages/database/prisma/schema.prisma"` to the root `package.json` scripts so `pnpm install` auto-generates the client.

**`@react-three/postprocessing` peer dependency:** requires `three >= 0.137`. Pin exact versions: `three@0.160.0`, `@react-three/fiber@8.15.0`, `@react-three/drei@9.99.0`, `@react-three/postprocessing@2.15.0` to avoid incompatibility.

**Tailwind CSS config for `apps/web`:** create `apps/web/tailwind.config.ts` extending the design tokens as Tailwind custom colors. All `glass-card`, `glow-button` etc. classes must be in `globals.css` (not Tailwind utilities) because they use complex multi-value properties not expressible as single utilities. The Tailwind config covers: `colors.obsidian`, `colors.graphite`, `colors['deep-violet']`, `colors.electric`, `colors['violet-glow']`, `colors.cyan`, `colors['cyan-glow']`, `colors.silver`.

**Vercel deployment config (stub):** create `infrastructure/deployment/vercel.json` with `{ "framework": "nextjs", "buildCommand": "pnpm --filter @esports/web build" }` so Vercel can build the monorepo correctly.
