import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';

// Force dynamic rendering - this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export const GET = withPermission(
  AppRole.SERVER_ADMIN,
  async (req, { guildId }) => {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);

    const where: Record<string, unknown> = { guildId };

    if (source && ['bot', 'worker', 'api'].includes(source)) {
      where['source'] = source;
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

    const errors = await prisma.errorLog.findMany({
      where,
      take: limit,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        guildId: true,
        source: true,
        errorType: true,
        message: true,
        stack: true,
        metadata: true,
        timestamp: true,
        createdAt: true,
      },
    });

    return NextResponse.json(errors);
  }
);
