import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { guildId: string } },
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken)
    return NextResponse.json({ error: 'Bot not configured' }, { status: 503 })

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${params.guildId}/channels`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    },
  )
  if (!res.ok)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: res.status })

  const channels = (await res.json()) as Array<{
    id: string
    name: string
    type: number
    position: number
  }>
  // Type 0 = GUILD_TEXT
  const textChannels = channels
    .filter((c) => c.type === 0)
    .sort((a, b) => a.position - b.position)

  return NextResponse.json({
    channels: textChannels.map((c) => ({ id: c.id, name: c.name })),
  })
}
