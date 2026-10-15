import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AppRole, roleAtLeast } from './roles'
import { resolveUserRole } from './role-resolver'
import { recordFailedAttempt, isUserBanned } from './brute-force'
import { PermissionError } from './errors'
import { prisma } from '@esports/database'

type Handler = (
  req: NextRequest,
  context: {
    userId: string
    guildId: string
    role: AppRole
    isOwner: boolean
    params: Record<string, string>
  }
) => Promise<NextResponse>

export function withPermission(requiredRole: AppRole, handler: Handler) {
  return async function (
    req: NextRequest,
    { params }: { params: Record<string, string> }
  ): Promise<NextResponse> {
    try {
      // 1. Get session via Supabase server client
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // setAll called from a Server Component — safe to ignore
              }
            },
          },
        }
      )

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
      }

      // 2. Extract discordId from user metadata
      const discordId: string =
        user.user_metadata?.provider_id ?? user.user_metadata?.sub

      // 3. Extract guildId from params
      const guildId = params['guildId']
      if (!guildId) {
        return NextResponse.json({ error: 'Missing guildId' }, { status: 400 })
      }

      // 4. Check brute-force ban
      const banned = await isUserBanned(discordId, guildId)
      if (banned) {
        return NextResponse.json(
          { error: 'You have been temporarily banned for 24 hours due to repeated unauthorized access attempts.' },
          { status: 403 }
        )
      }

      // 5. Find user in DB
      const dbUser = await prisma.user.findUnique({ where: { discordId } })
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 403 })
      }

      // 6. Resolve role
      const role = await resolveUserRole({
        prisma,
        userId: discordId,
        guildId,
        botToken: process.env.DISCORD_BOT_TOKEN!,
      })

      // 7. Determine ownership
      const isOwner = role === AppRole.SERVER_ADMIN

      // 8. Check required role
      if (!roleAtLeast(role, requiredRole)) {
        if (requiredRole >= AppRole.REFEREE) {
          const attempts = await recordFailedAttempt(discordId, guildId)
          if (attempts >= 4) {
            await prisma.adminBan.upsert({
              where: {
                guildId_userId: { guildId, userId: dbUser.id },
              },
              update: {
                bannedUntil: new Date(Date.now() + 86400 * 1000),
                attemptCount: attempts,
              },
              create: {
                guildId,
                userId: dbUser.id,
                bannedUntil: new Date(Date.now() + 86400 * 1000),
                attemptCount: attempts,
              },
            })
          }
        }
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      // 9. Call the handler
      return handler(req, { userId: dbUser.id, guildId, role, isOwner, params })
    } catch (error) {
      if (error instanceof PermissionError) {
        return NextResponse.json({ error: error.message }, { status: error.httpStatus })
      }
      console.error('[withPermission] Unexpected error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
