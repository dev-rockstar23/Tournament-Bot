import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';

export const GET = withPermission(
  AppRole.SERVER_ADMIN,
  async (req, { guildId }) => {
    const { searchParams } = new URL(req.url);
    const component = searchParams.get('component');

    const where: Record<string, unknown> = { guildId };

    if (component) {
      where['component'] = component;
    }

    // Get the latest health check for each component
    const healthChecks = await prisma.bridgeHealthCheck.findMany({
      where,
      orderBy: { checkedAt: 'desc' },
      select: {
        id: true,
        guildId: true,
        component: true,
        status: true,
        latencyMs: true,
        metadata: true,
        checkedAt: true,
        createdAt: true,
      },
    });

    // Group by component and return only the latest for each
    const latestByComponent = new Map<string, typeof healthChecks[0]>();
    for (const check of healthChecks) {
      if (!latestByComponent.has(check.component)) {
        latestByComponent.set(check.component, check);
      }
    }

    return NextResponse.json(Array.from(latestByComponent.values()));
  }
);
