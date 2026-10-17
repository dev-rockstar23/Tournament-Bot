import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    id: user.id,
    discordId: user.user_metadata?.provider_id,
    username: user.user_metadata?.full_name ?? user.user_metadata?.name,
    avatar: user.user_metadata?.avatar_url,
  })
}
