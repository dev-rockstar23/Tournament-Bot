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
    `https://discord.com/api/v10/guilds/${params.guildId}/roles`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    },
  )
  if (!res.ok)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: res.status })

  const roles = (await res.json()) as Array<{
    id: string
    name: string
    position: number
    managed: boolean
  }>
  // Exclude managed (bot/integration) roles and the @everyone role
  const userRoles = roles
    .filter((r) => !r.managed && r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)

  return NextResponse.json({
    roles: userRoles.map((r) => ({ id: r.id, name: r.name })),
  })
}
