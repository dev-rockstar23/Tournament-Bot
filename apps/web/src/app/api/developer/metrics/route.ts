import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';

export const GET = withPermission(
  AppRole.SERVER_ADMIN,
  async (req, { guildId }) => {
    const { searchParams } = new URL(req.url);
    const metricType = searchParams.get('metricType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);

    const where: Record<string, unknown> = { guildId };

    if (metricType) {
      where['metricType'] = metricType;
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        where['timestamp'] = { ...where['timestamp'] as object, gte: start };
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        where['timestamp'] = { ...where['timestamp'] as object, lte: end };
      }
    }

    const metrics = await prisma.systemMetric.findMany({
      where,
      take: limit,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        guildId: true,
        metricType: true,
        metricName: true,
        value: true,
        metadata: true,
        timestamp: true,
        createdAt: true,
      },
    });

    return NextResponse.json(metrics);
  }
);
