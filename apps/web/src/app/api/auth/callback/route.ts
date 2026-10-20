import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@esports/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/servers'

  if (code) {
    const supabase = createClient()
    const { data: session } = await supabase.auth.exchangeCodeForSession(code)

    // If session established, ensure User record exists in database
    if (session?.user) {
      const user = session.user
      const discordId = user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? user.id
      const username = user.user_metadata?.user_name ?? user.user_metadata?.full_name ?? 'User'
      const discriminator = user.user_metadata?.custom_claims?.global_name ?? null
      const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
      const email = user.email ?? null

      // Upsert User record (create if not exists, update if exists)
      await prisma.user.upsert({
        where: { discordId },
        update: {
          username,
          discriminator,
          avatar,
          email,
        },
        create: {
          discordId,
          username,
          discriminator,
          avatar,
          email,
        },
      })
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
