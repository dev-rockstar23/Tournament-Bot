import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@esports/database'

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  permissions?: string
}

interface ServerItem {
  guildId: string
  name: string
  icon: string | null
  isConnected: boolean
  liveCount: number
  upcomingCount: number
}

export async function GET() {
  try {
  const supabase = createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('[servers] session error:', sessionError)
    return NextResponse.json({ error: 'Session error', detail: sessionError.message }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = session.provider_token
  if (!accessToken) {
    return NextResponse.json(
      {
        connected: [],
        eligible: [],
        unavailable: [],
        note: 'Discord access token not available. Please re-authenticate.',
      },
      { status: 200 }
    )
  }

  // Fetch user's Discord guilds
  let discordGuilds: DiscordGuild[] = []
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    })
    if (res.ok) {
      discordGuilds = await res.json()
    }
  } catch {
    // Proceed with empty list on network error
  }

  // Try to cache in Upstash Redis (optional — skip if env vars missing or package absent)
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
    if (upstashUrl && upstashToken) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Redis } = await import('@upstash/redis' as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const redis = new Redis({ url: upstashUrl, token: upstashToken }) as any
      const cacheKey = `discord_guilds:${session.user.id}`
      if (discordGuilds.length > 0) {
        await redis.set(cacheKey, JSON.stringify(discordGuilds), { ex: 60 })
      } else {
        const cached: unknown = await redis.get(cacheKey)
        if (cached) {
          discordGuilds =
            typeof cached === 'string'
              ? (JSON.parse(cached) as DiscordGuild[])
              : (cached as DiscordGuild[])
        }
      }
    }
  } catch {
    // Skip caching on error
  }

  // Query all active servers in the DB
  let dbServers: { guildId: string; name: string; icon: string | null }[] = []
  try {
    dbServers = await prisma.discordServer.findMany({
      where: { isActive: true },
    })
  } catch (dbErr) {
    console.error('[servers] DB error:', dbErr)
    return NextResponse.json({ 
      error: 'Database error', 
      detail: dbErr instanceof Error ? dbErr.message : String(dbErr),
      dbUrl: process.env.DATABASE_URL ? 'set' : 'MISSING'
    }, { status: 500 })
  }
  const dbGuildIdSet = new Set(dbServers.map((s) => s.guildId))

  // Categorize guilds
  const connected: string[] = []
  const eligible: DiscordGuild[] = []
  const unavailable: DiscordGuild[] = []

  for (const guild of discordGuilds) {
    const inDb = dbGuildIdSet.has(guild.id)
    const hasManageGuild =
      (BigInt(guild.permissions ?? '0') & BigInt(0x20)) !== BigInt(0)

    if (inDb) {
      connected.push(guild.id)
    } else if (hasManageGuild) {
      eligible.push(guild)
    } else {
      unavailable.push(guild)
    }
  }

  // Fetch tournament counts for connected servers
  const connectedGuildIds = connected

  const [liveCounts, upcomingCounts] = await Promise.all([
    connectedGuildIds.length > 0
      ? prisma.tournament.groupBy({
          by: ['guildId'],
          where: { guildId: { in: connectedGuildIds }, status: 'LIVE' },
          _count: { id: true },
        })
      : Promise.resolve([]),
    connectedGuildIds.length > 0
      ? prisma.tournament.groupBy({
          by: ['guildId'],
          where: {
            guildId: { in: connectedGuildIds },
            status: { in: ['REGISTRATION_OPEN', 'CHECK_IN'] },
          },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ])

  const liveCountMap = new Map(liveCounts.map((c) => [c.guildId, c._count.id]))
  const upcomingCountMap = new Map(
    upcomingCounts.map((c) => [c.guildId, c._count.id])
  )
  const dbServerMap = new Map(dbServers.map((s) => [s.guildId, s]))

  const connectedItems: ServerItem[] = connectedGuildIds.map((guildId) => {
    const dbServer = dbServerMap.get(guildId)
    const discordGuild = discordGuilds.find((g) => g.id === guildId)
    return {
      guildId,
      name: dbServer?.name ?? discordGuild?.name ?? guildId,
      icon: dbServer?.icon ?? discordGuild?.icon ?? null,
      isConnected: true,
      liveCount: liveCountMap.get(guildId) ?? 0,
      upcomingCount: upcomingCountMap.get(guildId) ?? 0,
    }
  })

  const eligibleItems: ServerItem[] = eligible.map((guild) => ({
    guildId: guild.id,
    name: guild.name,
    icon: guild.icon,
    isConnected: false,
    liveCount: 0,
    upcomingCount: 0,
  }))

  const unavailableItems: ServerItem[] = unavailable.map((guild) => ({
    guildId: guild.id,
    name: guild.name,
    icon: guild.icon,
    isConnected: false,
    liveCount: 0,
    upcomingCount: 0,
  }))

  return NextResponse.json({
    connected: connectedItems,
    eligible: eligibleItems,
    unavailable: unavailableItems,
  })
  } catch (err) {
    console.error('[servers] unhandled error:', err)
    return NextResponse.json({ 
      error: 'Internal server error', 
      detail: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}
