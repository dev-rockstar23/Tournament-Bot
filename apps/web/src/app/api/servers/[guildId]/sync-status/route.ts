import { withPermission } from '@esports/permissions'
import { AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { NextResponse } from 'next/server'

export const GET = withPermission(AppRole.REFEREE, async (_req, { guildId }) => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

  const [pendingCount, failedCount, lastDelivered] = await Promise.all([
    prisma.outboxEvent.count({
      where: { guildId, status: 'PENDING', createdAt: { lt: twoMinutesAgo } },
    }),
    prisma.outboxEvent.count({
      where: { guildId, status: 'FAILED' },
    }),
    prisma.outboxEvent.findFirst({
      where: { guildId, status: 'DELIVERED' },
      orderBy: { lastAttemptedAt: 'desc' },
      select: { lastAttemptedAt: true },
    }),
  ])

  let status: 'SYNCED' | 'PENDING' | 'DEGRADED'
  if (failedCount > 0) status = 'DEGRADED'
  else if (pendingCount > 0) status = 'PENDING'
  else status = 'SYNCED'

  return NextResponse.json({
    status,
    pendingCount,
    failedCount,
    lastDeliveredAt: lastDelivered?.lastAttemptedAt?.toISOString() ?? null,
  })
})
