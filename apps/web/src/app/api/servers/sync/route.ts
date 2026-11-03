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
 * Check whether the bot is a member of a given guild by querying the
 * Discord API with the bot token.  Returns the guild's current name/icon
 * if the bot is present, or null if it is not.
 *
 * Uses GET /guilds/{guildId} with the bot token — this returns 200 if
 * the bot is in the guild, 403/404 otherwise.
 */
async function checkBotInGuild(
  guildId: string,
): Promise<{ name: string; icon: string | null } | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) return null

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
        'User-Agent': 'SHADOW-Tournaments/1.0',
      },
      cache: 'no-store',
    })

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After')
      console.warn(`[sync] Discord rate-limited on guild ${guildId} (retry after ${retryAfter ?? '?'}s)`)
      return null
    }

    if (!res.ok) {
      // 403 = bot not in guild, 404 = unknown guild
      return null
    }

    const data = (await res.json()) as { name: string; icon: string | null }
    return { name: data.name, icon: data.icon }
  } catch {
    return null
  }
}

/**
 * POST /api/servers/sync
 *
 * Synchronises the database with the user's actual Discord guilds.
 * For each guild where the user has MANAGE_GUILD but no DiscordServer
 * record exists in the database, checks whether the bot has been added
 * (via the bot token).  If the bot is present, creates the DiscordServer
 * and ServerSettings records — the same thing guild-create.ts does on
 * the bot side.
 *
 * This closes the gap where the bot's guildCreate listener hasn't fired
 * yet (bot restarting, gateway lag) or the user added the bot from the
 * web invite link and immediately returned to the dashboard.
 */
export async function POST() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        connected: [],
        eligible: [],
        synced: 0,
        note: 'Database not configured',
      })
    }

    const supabase = createClient()

    const [sessionResult, userResult] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ])

    if (userResult.error || !userResult.data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session } = sessionResult.data

    // ── Get the user's Discord access token ──────────────────────────────
    let accessToken: string | null = null
    if (session?.provider_token) {
      accessToken = session.provider_token
    } else if (session?.access_token) {
      // Decode JWT for provider_token
      try {
        const [, payloadB64] = session.access_token.split('.')
        if (payloadB64) {
          const payload = JSON.parse(
            Buffer.from(payloadB64, 'base64url').toString('utf8'),
          ) as Record<string, unknown>
          accessToken =
            (payload['provider_token'] as string | undefined) ??
            ((payload['app_metadata'] as Record<string, unknown> | undefined)?.[
              'provider_token'
            ] as string | undefined) ??
            null
        }
      } catch {
        // Fall through
      }
    }

    // ── Fetch user's Discord guilds ──────────────────────────────────────
    let discordGuilds: DiscordGuild[] = []
    if (accessToken) {
      try {
        const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'SHADOW-Tournaments/1.0',
          },
          cache: 'no-store',
        })
        if (res.ok) {
          discordGuilds = (await res.json()) as DiscordGuild[]
        }
      } catch {
        // Fall through to cache
      }
    }

    // Fallback: Redis cache
    if (discordGuilds.length === 0) {
      try {
        const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
        const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
        if (upstashUrl && upstashToken) {
          const { Redis } = (await import('@upstash/redis')) as {
            Redis: new (opts: { url: string; token: string }) => {
              get: (key: string) => Promise<unknown>
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
        // No cache available
      }
    }

    if (discordGuilds.length === 0) {
      return NextResponse.json({
        connected: [],
        eligible: [],
        synced: 0,
        note: 'Discord token unavailable. Re-login to sync servers.',
      })
    }

    // ── Find guilds that need syncing ───────────────────────────────────
    // A guild needs syncing if:
    //   - The user has MANAGE_GUILD permission (they can manage the bot)
    //   - No DiscordServer record exists in the database
    const dbServers = await prisma.discordServer.findMany({
      where: { isActive: true },
      select: { guildId: true, name: true, icon: true },
    })
    const dbGuildIdSet = new Set(dbServers.map((s) => s.guildId))

    const guildsToCheck: DiscordGuild[] = []
    for (const guild of discordGuilds) {
      if (dbGuildIdSet.has(guild.id)) continue
      const hasManageGuild =
        (BigInt(guild.permissions ?? '0') & BigInt(0x20)) !== BigInt(0)
      if (hasManageGuild) {
        guildsToCheck.push(guild)
      }
    }

    // ── Check bot presence and create DB records ────────────────────────
    // Rate-limit: Discord allows ~50 guild lookups per second with a bot
    // token. We cap at 30 concurrent to stay safe.
    let syncedCount = 0
    const BATCH_SIZE = 30

    for (let i = 0; i < guildsToCheck.length; i += BATCH_SIZE) {
      const batch = guildsToCheck.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (guild) => {
          const botPresent = await checkBotInGuild(guild.id)
          if (!botPresent) return null

          // Bot is in this guild but no DB record — create it
          try {
            await prisma.discordServer.upsert({
              where: { guildId: guild.id },
              update: {
                name: botPresent.name ?? guild.name,
                icon: botPresent.icon ?? guild.icon,
                isActive: true,
              },
              create: {
                guildId: guild.id,
                name: botPresent.name ?? guild.name,
                icon: botPresent.icon ?? guild.icon,
                ownerId: userResult.data.user.id, // web user who triggered sync
              },
            })

            // Ensure settings exist
            await prisma.serverSettings.upsert({
              where: { guildId: guild.id },
              update: {},
              create: { guildId: guild.id, timezone: 'UTC', timezoneConfigured: false },
            })

            return guild.id
          } catch (err) {
            console.error(`[sync] Failed to create record for ${guild.id}:`, err)
            return null
          }
        }),
      )
      syncedCount += results.filter((r): r is string => r !== null).length
    }

    // ── Invalidate Redis cache ──────────────────────────────────────────
    try {
      const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
      const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
      if (upstashUrl && upstashToken) {
        const { Redis } = (await import('@upstash/redis')) as {
          Redis: new (opts: { url: string; token: string }) => {
            del: (key: string) => Promise<unknown>
          }
        }
        const redis = new Redis({ url: upstashUrl, token: upstashToken })
        await redis.del(`discord_guilds:${userResult.data.user.id}`)
      }
    } catch {
      // Non-fatal
    }

    // ── Return updated server list (same format as GET /api/servers) ────
    const updatedDbServers = await prisma.discordServer.findMany({
      where: { isActive: true },
      select: { guildId: true, name: true, icon: true },
    })
    const updatedDbSet = new Set(updatedDbServers.map((s) => s.guildId))
    const updatedDbMap = new Map(updatedDbServers.map((s) => [s.guildId, s]))

    const connected: string[] = []
    const eligible: DiscordGuild[] = []

    for (const guild of discordGuilds) {
      const inDb = updatedDbSet.has(guild.id)
      const hasManageGuild =
        (BigInt(guild.permissions ?? '0') & BigInt(0x20)) !== BigInt(0)
      if (inDb) {
        connected.push(guild.id)
      } else if (hasManageGuild) {
        eligible.push(guild)
      }
    }

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
      const dbServer = updatedDbMap.get(guildId)
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

    return NextResponse.json({
      connected: connectedItems,
      eligible: eligibleItems,
      unavailable: [],
      synced: syncedCount,
    })
  } catch (err) {
    console.error('[sync] unhandled error:', err)
    return NextResponse.json(
      { error: 'Sync failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
