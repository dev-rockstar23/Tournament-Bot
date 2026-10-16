import prisma from '@esports/database';
import { outboxQueue } from '../queues/definitions';
import { discordClient } from '../discord-client';

export async function reportHealth(guildId: string): Promise<void> {
  try {
    // Query pending outbox events
    const pendingCount = await prisma.outboxEvent.count({
      where: {
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
