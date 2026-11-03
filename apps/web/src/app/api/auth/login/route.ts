import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const requestUrl = new URL(request.url)
  const next = requestUrl.searchParams.get('next') ?? '/servers'

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${requestUrl.protocol}//${requestUrl.host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      // Request identify + guilds so we can list the user's servers
      scopes: 'identify guilds',
      // PKCE redirect — must match exactly what is listed in Supabase
      // Dashboard → Auth → URL Configuration → Redirect URLs
      redirectTo: `${appUrl}/api/auth/callback?next=${encodeURIComponent(next)}`,
      // access_type=offline requests a refresh token so the provider_token
      // survives across page reloads (Discord refresh tokens last 30 days)
      queryParams: {
        access_type: 'offline',
        prompt: 'none', // skip the Discord consent screen on re-login
      },
    },
  })

  if (error || !data.url) {
    console.error('[auth/login] OAuth initiation failed:', error)
    return NextResponse.json(
      { error: 'OAuth failed', detail: error?.message ?? 'No URL returned' },
      { status: 500 },
    )
  }

  return NextResponse.redirect(data.url)
}
