# Implementation Plan: Developer Dashboard

## Overview

Build a comprehensive developer dashboard at `/servers/[guildId]/developer` for the esports platform. The dashboard will display bridge connection analytics, bot command metrics, detailed error logs for both bot and website, and worker health status. Access restricted to SERVER_ADMIN users.

## Project Context

- **Monorepo**: pnpm workspaces with Next.js 14 web app, Discord.js bot (Sapphire framework), BullMQ worker
- **Database**: PostgreSQL via Prisma, existing models in `packages/database/prisma/schema.prisma`
- **Auth**: `withPermission(AppRole.SERVER_ADMIN, handler)` HOC from `@esports/permissions`
- **UI Libraries**: Radix UI (tabs, dialogs, etc.), recharts for charts, Tailwind CSS, existing components in `apps/web/src/components/ui/`
- **Patterns**:
  - API routes: `withPermission` wrapper, NextResponse.json()
  - Dashboard pages: async Server Components, inline Prisma queries, pass data to client components
  - Bot commands: extend `Command` from `@sapphire/framework`
  - Bot listeners: extend `Listener` from `@sapphire/framework`
  - Worker: BullMQ with reconciliation loop every 60s
  - Outbox pattern: OutboxEvent table, worker processes events

## Implementation Plan

- [ ] 1. **Add SystemMetric model to Prisma schema**
      Create model in `packages/database/prisma/schema.prisma` with fields: id (cuid), guildId (FK to DiscordServer), metricType (string, e.g. 'command_executed'), metricName (string, e.g. command name), value (Decimal), metadata (Json, nullable), timestamp (DateTime, default now), createdAt (DateTime, default now). Add @@index([guildId, timestamp]) and @@map('system_metrics'). Include relation from DiscordServer to SystemMetric.
      Files: `packages/database/prisma/schema.prisma`
      Verify: `pnpm --filter @esports/database exec -- prisma format` exits 0, no syntax errors

- [ ] 2. **Add ErrorLog model to Prisma schema**
      Create model with fields: id (cuid), guildId (FK), source (string: 'bot'|'worker'|'api'), errorType (string), message (string), stack (string, nullable), metadata (Json, nullable), timestamp (DateTime, default now), createdAt (DateTime, default now). Add @@index([guildId, timestamp]), @@index([source, timestamp]), @@map('error_logs'). Include relation from DiscordServer to ErrorLog.
      Files: `packages/database/prisma/schema.prisma`
      Verify: `pnpm --filter @esports/database exec -- prisma format` exits 0

- [ ] 3. **Add BridgeHealthCheck model to Prisma schema**
      Create model with fields: id (cuid), guildId (FK), component (string: 'outbox-worker'|'discord-bot'), status (string: 'healthy'|'degraded'|'down'), latencyMs (Int, nullable), metadata (Json, nullable), checkedAt (DateTime, default now), createdAt (DateTime, default now). Add @@index([guildId, checkedAt]), @@map('bridge_health_checks'). Include relation from DiscordServer to BridgeHealthCheck.
      Files: `packages/database/prisma/schema.prisma`
      Verify: `pnpm --filter @esports/database exec -- prisma format` exits 0

- [ ] 4. **Generate Prisma client with new models**
      Run `pnpm --filter @esports/database exec -- prisma generate` to regenerate client with SystemMetric, ErrorLog, and BridgeHealthCheck types. Commit the generated files in `packages/database/src/generated/client/`.
      Files: `packages/database/src/generated/client/*` (generated)
      Verify: `pnpm --filter @esports/database exec -- prisma generate` exits 0, generated client includes new models

- [ ] 5. **Create API route for system metrics**
      Create `apps/web/src/app/api/developer/metrics/route.ts` with GET handler using `withPermission(AppRole.SERVER_ADMIN, handler)`. Accept query params: guildId (required), metricType (optional), startDate (ISO string, optional), endDate (ISO string, optional), limit (default 100, max 500). Query `prisma.systemMetric` filtered by params, order by timestamp desc. Return JSON array.
      Files: `apps/web/src/app/api/developer/metrics/route.ts`
      Verify: Start web app with `pnpm --filter web dev`, make GET request to `/api/developer/metrics?guildId=<testGuildId>` with SERVER_ADMIN auth, confirm 200 status and JSON response

- [ ] 6. **Create API route for error logs**
      Create `apps/web/src/app/api/developer/errors/route.ts` with GET handler using `withPermission(AppRole.SERVER_ADMIN)`. Accept query params: guildId, source ('bot'|'worker'|'api', optional), startDate, endDate, limit (default 100, max 500). Query `prisma.errorLog`, return JSON array.
      Files: `apps/web/src/app/api/developer/errors/route.ts`
      Verify: GET request to `/api/developer/errors?guildId=<testGuildId>` returns 200 with JSON array

- [ ] 7. **Create API route for bridge health checks**
      Create `apps/web/src/app/api/developer/bridge-health/route.ts` with GET handler using `withPermission(AppRole.SERVER_ADMIN)`. Accept query params: guildId, component (optional). Query `prisma.bridgeHealthCheck` for latest status per component (group by component, order by checkedAt desc, take 1 per group). Return JSON array.
      Files: `apps/web/src/app/api/developer/bridge-health/route.ts`
      Verify: GET request returns 200 with array of latest health checks per component

- [ ] 8. **Create API route for bot analytics**
      Create `apps/web/src/app/api/developer/bot-analytics/route.ts` with GET handler using `withPermission(AppRole.SERVER_ADMIN)`. Accept query params: guildId, days (default 7). Aggregate `SystemMetric` where metricType='command_executed', group by metricName, sum value. Return JSON: {totalCommands, uniqueCommands, topCommands: [{name, count}], avgResponseTimeMs (from metadata if available)}.
      Files: `apps/web/src/app/api/developer/bot-analytics/route.ts`
      Verify: GET request returns 200 with aggregated command metrics

- [ ] 9. **Create API route for website error logs**
      Create `apps/web/src/app/api/developer/website-errors/route.ts` with GET handler using `withPermission(AppRole.SERVER_ADMIN)`. Accept query params: guildId, startDate, endDate, limit. Query `prisma.errorLog` where source='api', return JSON array.
      Files: `apps/web/src/app/api/developer/website-errors/route.ts`
      Verify: GET request returns 200 with filtered error logs

- [ ] 10. **Create bot listener for command metrics**
       Create `apps/discord-bot/src/listeners/command-metrics.ts` extending `Listener` from `@sapphire/framework`. Listen to `Events.ChatInputCommandSuccess`. In `run()`, extract guildId, commandName from interaction. Write to `prisma.systemMetric.create()` with metricType='command_executed', metricName=commandName, value=1, metadata={userId, timestamp}.
       Files: `apps/discord-bot/src/listeners/command-metrics.ts`
       Verify: Start bot with `pnpm --filter discord-bot dev`, execute a slash command, query SystemMetric table and confirm new row created

- [ ] 11. **Create bot listener for command errors**
       Create `apps/discord-bot/src/listeners/command-error.ts` extending `Listener`, listen to `Events.ChatInputCommandError`. In `run()`, extract error details. Write to `prisma.errorLog.create()` with source='bot', errorType=error.name, message=error.message, stack=error.stack, metadata={commandName, userId}.
       Files: `apps/discord-bot/src/listeners/command-error.ts`
       Verify: Trigger a command error in bot, query ErrorLog table and confirm new row with source='bot'

- [ ] 12. **Create worker health reporter**
       Create `apps/worker/src/reporters/health-reporter.ts` with `export async function reportHealth(guildId: string)`. Query outboxQueue for pending count, check `discordClient.isReady()`. Write to `prisma.bridgeHealthCheck.create()` with component='outbox-worker', status='healthy' if pendingCount <= 10 else 'degraded', metadata={pendingCount, botReady}.
       Files: `apps/worker/src/reporters/health-reporter.ts`
       Verify: Import and call reportHealth() from worker index, confirm no errors

- [ ] 13. **Integrate health reporter into worker reconciliation loop**
       Modify `apps/worker/src/index.ts`: import `reportHealth`. In the `reconcile` job handler (where job.name === 'reconcile'), after `await reconcile()`, extract unique guildIds from recent outbox events or use a sentinel 'global' value. Call `await reportHealth(guildId)` for each. If per-guild reporting is complex, use a single hardcoded guildId for MVP.
       Files: `apps/worker/src/index.ts`
       Verify: Start worker with `pnpm --filter worker dev`, wait 60s, query BridgeHealthCheck table and confirm new rows every 60s

- [ ] 14. **Create developer dashboard page**
       Create `apps/web/src/app/servers/[guildId]/developer/page.tsx` as async Server Component. Fetch user session, check role is SERVER_ADMIN (use pattern from existing admin pages). If not authorized, return 403 or redirect. Fetch initial data from all 5 API routes (metrics, errors, bridge-health, bot-analytics, website-errors). Pass data to client component `<DeveloperDashboard initialData={...} guildId={guildId} />`.
       Files: `apps/web/src/app/servers/[guildId]/developer/page.tsx`
       Verify: Navigate to `/servers/<testGuildId>/developer` as SERVER_ADMIN, page loads without errors

- [ ] 15. **Create DeveloperDashboard client component with tabs**
       Create `apps/web/src/components/developer/DeveloperDashboard.tsx`: 'use client'. Import `@radix-ui/react-tabs`. Render 4 tabs: 'Bridge Analytics', 'Bot Analytics', 'Bot Errors', 'Website Errors'. Each tab renders a separate sub-component. Use Radix Tabs.Root, Tabs.List, Tabs.Trigger, Tabs.Content pattern from existing code (see `apps/web/src/components/admin/ResultsQueue.tsx` for example).
       Files: `apps/web/src/components/developer/DeveloperDashboard.tsx`
       Verify: Tabs render and switching tabs changes content

- [ ] 16. **Create BridgeAnalyticsTab component**
       Create `apps/web/src/components/developer/BridgeAnalyticsTab.tsx`: display BridgeHealthCheck data. Show status for each component (outbox-worker, discord-bot) using `StatusPulse` component (or Badge with color). Display latency, last checked time, metadata. Use `GlassCard` for layout. Add recharts `LineChart` showing health checks over time (x=checkedAt, y=status as numeric: healthy=1, degraded=0.5, down=0). Use VIOLET and CYAN colors from existing AnalyticsDashboard.tsx.
       Files: `apps/web/src/components/developer/BridgeAnalyticsTab.tsx`
       Verify: Tab displays health status and chart

- [ ] 17. **Create BotAnalyticsTab component**
       Create `apps/web/src/components/developer/BotAnalyticsTab.tsx`: display bot command metrics. Show KPIs in GlassCard: total commands (use `AnimatedCounter`), unique command types, avg response time. Render recharts `BarChart` for top 10 commands (Y=command name, X=count). Style following existing dashboard patterns.
       Files: `apps/web/src/components/developer/BotAnalyticsTab.tsx`
       Verify: Tab displays command KPIs and top commands bar chart

- [ ] 18. **Create BotErrorsTab component with table**
       Create `apps/web/src/components/developer/BotErrorsTab.tsx`: use `@tanstack/react-table` (already installed) to render error logs where source='bot'. Columns: timestamp (formatted with date-fns), errorType, message, commandName (from metadata.commandName), actions (button to expand stack trace). Use GlassCard wrapper. Implement pagination (page state, prev/next buttons). Expandable row shows stack trace in a code block.
       Files: `apps/web/src/components/developer/BotErrorsTab.tsx`
       Verify: Tab displays error table, pagination works, expanding row shows stack trace

- [ ] 19. **Create WebsiteErrorsTab component with table**
       Create `apps/web/src/components/developer/WebsiteErrorsTab.tsx`: same structure as BotErrorsTab but filters source='api'. Columns: timestamp, errorType, message, endpoint (from metadata.endpoint or metadata.path), actions (expand for stack). Use same table pattern.
       Files: `apps/web/src/components/developer/WebsiteErrorsTab.tsx`
       Verify: Tab displays API error logs with pagination and expandable rows

- [ ] 20. **Add Developer navigation link**
       Modify `apps/web/src/components/ui/Navigation.tsx`: add a new link 'Developer' visible only when user role is SERVER_ADMIN. Link href: `/servers/[guildId]/developer`, icon: `Code` or `Terminal` from lucide-react. Follow existing pattern for conditional rendering based on user role (check existing nav links for pattern).
       Files: `apps/web/src/components/ui/Navigation.tsx`
       Verify: Navigation shows 'Developer' link for SERVER_ADMIN users, link navigates to developer dashboard

- [ ] 21. **Style all dashboard components**
       Apply Tailwind classes to all developer dashboard components matching the existing dashboard aesthetic. Use colors: VIOLET (#7c3aed), CYAN (#06b6d4), GRID_COLOR rgba(255,255,255,0.05), AXIS_COLOR #94a3b8. Ensure GlassCard, borders, text colors match `apps/web/src/app/servers/[guildId]/dashboard/page.tsx` and `apps/web/src/components/analytics/AnalyticsDashboard.tsx`.
       Files: All components in `apps/web/src/components/developer/`
       Verify: Visual inspection confirms consistent styling with existing dashboard

- [ ] 22. **Commit all changes**
       Stage and commit all new files and modifications with descriptive commit messages. Suggested messages: 'feat(database): add SystemMetric, ErrorLog, BridgeHealthCheck models', 'feat(api): add developer dashboard API routes', 'feat(bot): add command metrics and error logging listeners', 'feat(worker): add health reporter', 'feat(web): add developer dashboard page with 4 tabs'.
       Files: All files created/modified in steps 1-21
       Verify: `git status` shows no uncommitted changes, `git log` shows new commits

- [ ] 23. **Integration test: full workflow**
       Run all services: `pnpm --filter web dev`, `pnpm --filter discord-bot dev`, `pnpm --filter worker dev`. Execute a bot command in Discord. Trigger a bot error (e.g., pass invalid args). Navigate to `/servers/<testGuildId>/developer` as SERVER_ADMIN. Confirm: Bridge Analytics tab shows worker and bot health, Bot Analytics tab shows command metrics, Bot Errors tab shows the error just triggered, Website Errors tab is empty (unless API errors exist). Verify charts render correctly.
       Files: N/A (integration test)
       Verify: All 4 tabs display expected data, no console errors, charts render

## Notes

- **Database migrations**: After adding models to schema.prisma, run `prisma migrate dev` to create migration files if in a dev environment. For production, use `prisma migrate deploy`. The plan assumes dev environment.
- **Auth enforcement**: All API routes must use `withPermission(AppRole.SERVER_ADMIN)` to restrict access.
- **Data aggregation**: Bot analytics route aggregates SystemMetric entries. If volume is high, consider adding a cron job to pre-aggregate daily stats.
- **Error handling**: All API routes should handle Prisma errors and return appropriate HTTP status codes (400 for validation, 500 for server errors).
- **Pagination**: Error log tables should support server-side pagination if fetching large datasets. Consider adding offset/limit params to API routes.
- **Real-time updates**: For MVP, use initial data load. Future enhancement: use polling or WebSocket for live updates.
- **Testing**: No automated tests specified (test framework not configured). Manual testing steps provided in each verification item.
