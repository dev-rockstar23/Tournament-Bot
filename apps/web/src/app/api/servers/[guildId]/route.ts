import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@esports/database'

export const dynamic = 'force-dynamic'
export async function GET(
  _req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { guildId } = params

  const server = await prisma.discordServer.findUnique({
    where: { guildId },
    include: { settings: true },
  })

  if (!server || !server.isActive) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  const [liveCounts, upcomingCounts, completedCounts] = await Promise.all([
    prisma.tournament.groupBy({
      by: ['guildId'],
      where: { guildId, status: 'LIVE' },
      _count: { id: true },
    }),
    prisma.tournament.groupBy({
      by: ['guildId'],
      where: { guildId, status: { in: ['REGISTRATION_OPEN', 'CHECK_IN'] } },
      _count: { id: true },
    }),
    prisma.tournament.groupBy({
      by: ['guildId'],
      where: { guildId, status: 'COMPLETED' },
      _count: { id: true },
    }),
  ])

  const liveCount = liveCounts[0]?._count.id ?? 0
  const upcomingCount = upcomingCounts[0]?._count.id ?? 0
  const completedCount = completedCounts[0]?._count.id ?? 0

  return NextResponse.json({
    guildId: server.guildId,
    name: server.name,
    icon: server.icon,
    settings: {
      timezone: server.settings?.timezone ?? 'UTC',
      accentColor: server.settings?.accentColor ?? null,
      logoUrl: server.settings?.logoUrl ?? null,
    },
    liveCount,
    upcomingCount,
    completedCount,
  })
}
