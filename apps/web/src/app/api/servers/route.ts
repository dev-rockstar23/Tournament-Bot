import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma, isDatabaseAvailable } from '@esports/database'

export const dynamic = 'force-dynamic'

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

/**
 * Fetch guilds the user belongs to from Discord using their OAuth access token.
 * Returns an empty array (never throws) so callers can always fall through to
 * the DB-only path.
 */
async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'SHADOW-Tournaments/1.0',
      },
      // Never cache — permissions can change between requests
      cache: 'no-store',
    })

    if (res.status === 401) {
      // Token expired — caller will fall through to DB-only path
      return []
    }

    if (res.status === 429) {
      // Rate-limited — honour the retry-after header and return empty for now
      const retryAfter = res.headers.get('Retry-After')
      console.warn(`[servers] Discord rate-limited (retry after ${retryAfter ?? '?'}s)`)
      return []
    }

    if (!res.ok) {
      console.warn(`[servers] Discord guilds fetch returned ${res.status}`)
      return []
    }

    return (await res.json()) as DiscordGuild[]
  } catch (err) {
    console.warn('[servers] Discord guilds fetch failed:', err)
    return []
  }
}

/**
 * Try to retrieve the Discord OAuth access token from the active session.
 *
 * Supabase persists the provider_token in the session only when the OAuth
 * flow uses the PKCE code exchange AND the token is refreshed within its
 * lifetime.  On many deployments the token is lost after the first page
 * load.  We therefore also try reading it from the raw session JWT claims
 * before giving up.
 */
async function getDiscordAccessToken(
  session: { provider_token?: string | null; access_token?: string },
): Promise<string | null> {
  // Preferred: provider_token set directly on the session object
  if (session.provider_token) return session.provider_token

  // Fallback: decode the Supabase JWT and look for the Discord token in the
  // app_metadata / user_metadata claims that some Supabase versions store.
  try {
    const jwt = session.access_token
    if (!jwt) return null
    const [, payloadB64] = jwt.split('.')
    if (!payloadB64) return null
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as Record<string, unknown>

    // Supabase sometimes stores it under app_metadata.provider_token
    const providerToken =
      (payload['provider_token'] as string | undefined) ??
      ((payload['app_metadata'] as Record<string, unknown> | undefined)?.[
        'provider_token'
      ] as string | undefined)

    return providerToken ?? null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        connected: [],
        eligible: [],
        unavailable: [],
        note: 'Database not configured',
      })
    }

    const supabase = createClient()

    // getSession() can return stale data from cookies — always validate with getUser()
    const [sessionResult, userResult] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ])

    if (userResult.error || !userResult.data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session } = sessionResult.data

    // ── Fetch user's Discord guilds ───────────────────────────────────────
    let discordGuilds: DiscordGuild[] = []

    // 1. Try the live Discord API via the OAuth access token
    if (session) {
      const accessToken = await getDiscordAccessToken(session)
      if (accessToken) {
        discordGuilds = await fetchUserGuilds(accessToken)
      }
    }

    // 2. If the Discord call returned nothing, try Upstash Redis cache
    if (discordGuilds.length === 0) {
      try {
        const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
        const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
        if (upstashUrl && upstashToken) {
          const { Redis } = (await import('@upstash/redis')) as {
            Redis: new (opts: { url: string; token: string }) => {
              get: (key: string) => Promise<unknown>
              set: (key: string, value: string, opts?: { ex: number }) => Promise<void>
            }
          }
          const redis = new Redis({ url: upstashUrl, token: upstashToken })
          const cacheKey = `discord_guilds:${userResult.data.user.id}`
          const cached: unknown = await redis.get(cacheKey)
          if (cached) {
            discordGuilds =
              typeof cached === 'string'
                ? (JSON.parse(cached) as DiscordGuild[])
                : (cached as DiscordGuild[])
          }
        }
      } catch {
        // Cache miss or Redis unavailable — proceed without it
      }
    } else {
      // Warm the cache with fresh data (best-effort, non-blocking)
      void (async () => {
        try {
          const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
          const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
          if (upstashUrl && upstashToken && discordGuilds.length > 0) {
            const { Redis } = (await import('@upstash/redis')) as {
              Redis: new (opts: { url: string; token: string }) => {
                set: (key: string, value: string, opts?: { ex: number }) => Promise<void>
              }
            }
            const redis = new Redis({ url: upstashUrl, token: upstashToken })
            const cacheKey = `discord_guilds:${userResult.data.user.id}`
            await redis.set(cacheKey, JSON.stringify(discordGuilds), { ex: 120 })
          }
        } catch {
          // Non-fatal
        }
      })()
    }

    // ── Query all active servers from DB ─────────────────────────────────
    let dbServers: { guildId: string; name: string; icon: string | null }[] = []
    try {
      dbServers = await prisma.discordServer.findMany({
        where: { isActive: true },
        select: { guildId: true, name: true, icon: true },
      })
    } catch (dbErr) {
      console.error('[servers] DB error:', dbErr)
      return NextResponse.json(
        { error: 'Database unavailable', detail: dbErr instanceof Error ? dbErr.message : String(dbErr) },
        { status: 503 },
      )
    }

    const dbGuildIdSet = new Set(dbServers.map((s) => s.guildId))
    const dbServerMap = new Map(dbServers.map((s) => [s.guildId, s]))
    // Pre-index Discord guilds by ID to avoid O(n²) lookup in the map below
    const discordGuildMap = new Map(discordGuilds.map((g) => [g.id, g]))

    // ── Categorize ────────────────────────────────────────────────────────
    // If we have Discord guilds data, use it for full categorization.
    // If not (token expired), fall back to showing DB servers as connected only.
    const connected: string[] = []
    const eligible: DiscordGuild[] = []

    if (discordGuilds.length > 0) {
      for (const guild of discordGuilds) {
        const inDb = dbGuildIdSet.has(guild.id)
        // MANAGE_GUILD permission bit = 0x20 (32)
        const hasManageGuild =
          (BigInt(guild.permissions ?? '0') & BigInt(0x20)) !== BigInt(0)

        if (inDb) {
          connected.push(guild.id)
        } else if (hasManageGuild) {
          eligible.push(guild)
        }
        // Servers without MANAGE_GUILD are silently excluded — user can't add bot there
      }
    } else {
      // No Discord token — show all DB servers the user might own/admin
      for (const s of dbServers) {
        connected.push(s.guildId)
      }
    }

    // ── Fetch tournament counts for connected servers ─────────────────────
    const [liveCounts, upcomingCounts] =
      connected.length > 0
        ? await Promise.all([
            prisma.tournament.groupBy({
              by: ['guildId'],
              where: { guildId: { in: connected }, status: 'LIVE' },
              _count: { id: true },
            }),
            prisma.tournament.groupBy({
              by: ['guildId'],
              where: {
                guildId: { in: connected },
                status: { in: ['REGISTRATION_OPEN', 'CHECK_IN'] },
              },
              _count: { id: true },
            }),
          ])
        : [[], []]

    const liveCountMap = new Map(liveCounts.map((c) => [c.guildId, c._count.id]))
    const upcomingCountMap = new Map(upcomingCounts.map((c) => [c.guildId, c._count.id]))

    const connectedItems: ServerItem[] = connected.map((guildId) => {
      const dbServer = dbServerMap.get(guildId)
      const discordGuild = discordGuildMap.get(guildId)
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

    const note =
      discordGuilds.length === 0
        ? 'Discord token unavailable — showing servers from database. Re-login to see all your servers.'
        : undefined

    return NextResponse.json({
      connected: connectedItems,
      eligible: eligibleItems,
      unavailable: [],
      ...(note ? { note } : {}),
    })
  } catch (err) {
    console.error('[servers] unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
