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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server: any = null
  try {
    server = await prisma.discordServer.findUnique({
      where: { guildId },
      include: { settings: true },
    })
  } catch (dbErr) {
    console.error(`[api/servers/${guildId}] Database error fetching server:`, dbErr)
    return NextResponse.json({ error: 'Database error fetching server' }, { status: 503 })
  }

  if (!server || !server.isActive) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }

  let liveCount = 0
  let upcomingCount = 0
  let completedCount = 0
  try {
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
    liveCount = liveCounts[0]?._count.id ?? 0
    upcomingCount = upcomingCounts[0]?._count.id ?? 0
    completedCount = completedCounts[0]?._count.id ?? 0
  } catch (countsErr) {
    // Counts are non-critical — log and return 0s so the response still succeeds
    console.error(`[api/servers/${guildId}] Failed to fetch tournament counts:`, countsErr)
  }

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
