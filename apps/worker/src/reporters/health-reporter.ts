import prisma from '@esports/database';
import { outboxQueue } from '../queues/definitions';
import { discordClient } from '../discord-client';

/**
 * Reports health per active guild.
 * Pass a real guild ID from your environment (HEALTH_CHECK_GUILD_ID).
 * Passing the sentinel value 'global' is meaningless for per-guild sync-status
 * queries — this function skips writing if guildId is 'global' to avoid
 * polluting the BridgeHealthCheck table with fake rows.
 *
 * For full coverage, call this function once per active guild by fetching
 * distinct guildIds from the outbox (see index.ts for the pattern).
 */
export async function reportHealth(guildId: string): Promise<void> {
  // Skip sentinel — it has no relationship to real guild sync state
  if (guildId === 'global') {
    console.warn('[HealthReporter] Skipping health report: guildId is the sentinel "global". Set HEALTH_CHECK_GUILD_ID to a real guild ID or use the multi-guild path.')
    return
  }

  try {
    // Query pending outbox events for this specific guild
    const pendingCount = await prisma.outboxEvent.count({
      where: {
        guildId,
        status: 'PENDING',
      },
    });

    // Check if Discord client is ready
    const botReady = discordClient.isReady();

    // Determine health status based on pending count
    const status = pendingCount > 10 ? 'degraded' : 'healthy';

    // Write health check to database
    await prisma.bridgeHealthCheck.create({
      data: {
        guildId,
        component: 'outbox-worker',
        status,
        latencyMs: null,
        metadata: {
          pendingCount,
          botReady,
        },
      },
    });
  } catch (error) {
    console.error('[HealthReporter] Failed to report health:', error);
  }
}

/**
 * Reports health for all guilds that have pending or recent outbox events.
 * Use this when you do not have a single HEALTH_CHECK_GUILD_ID configured.
 */
export async function reportHealthAllGuilds(): Promise<void> {
  try {
    const activeGuilds = await prisma.outboxEvent.findMany({
      where: {
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { guildId: true },
      distinct: ['guildId'],
      take: 50,
    })

    if (activeGuilds.length === 0) return

    await Promise.allSettled(activeGuilds.map(({ guildId }) => reportHealth(guildId)))
  } catch (error) {
    console.error('[HealthReporter] Failed to fetch active guilds for health report:', error)
  }
}
