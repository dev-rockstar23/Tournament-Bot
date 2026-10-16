import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';

// Force dynamic rendering - this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export const GET = withPermission(
  AppRole.SERVER_ADMIN,
  async (req, { guildId }) => {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') ?? '7', 10);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all command_executed metrics
    const commandMetrics = await prisma.systemMetric.findMany({
      where: {
        guildId,
        metricType: 'command_executed',
        timestamp: { gte: since },
      },
      select: {
        metricName: true,
        value: true,
        metadata: true,
      },
    });

    // Aggregate by command name
    const commandCounts = new Map<string, number>();
    let totalCommands = 0;
    const responseTimes: number[] = [];

    for (const metric of commandMetrics) {
      const count = Number(metric.value);
      totalCommands += count;
      commandCounts.set(
        metric.metricName,
        (commandCounts.get(metric.metricName) ?? 0) + count
      );

      // Extract response time from metadata if available
      if (metric.metadata && typeof metric.metadata === 'object') {
        const meta = metric.metadata as Record<string, unknown>;
        if (typeof meta.responseTimeMs === 'number') {
          responseTimes.push(meta.responseTimeMs);
        }
      }
    }

    // Sort commands by count
    const topCommands = Array.from(commandCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate average response time
    const avgResponseTimeMs =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

    return NextResponse.json({
      totalCommands,
      uniqueCommands: commandCounts.size,
      topCommands,
      avgResponseTimeMs,
    });
  }
);
