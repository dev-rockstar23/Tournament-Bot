import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { TournamentAdminTable, type AdminTournament } from '@/components/admin/TournamentAdminTable'
import { redirect } from 'next/navigation'

interface PageProps {
  params: { guildId: string }
}

export default async function AdminTournamentsPage({ params }: PageProps) {
  const { guildId } = params

  // Auth check — layout already handles this, but guard defensively
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  // Fetch initial page of tournaments server-side for fast first paint
  const rawTournaments = await prisma.tournament.findMany({
    where: { guildId },
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      game: true,
      mode: true,
      status: true,
      entryType: true,
      teamCapacity: true,
      acceptedCount: true,
      registrationOpenAt: true,
      registrationCloseAt: true,
      startAt: true,
      endAt: true,
      visibility: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      stages: {
        select: { name: true, status: true },
        orderBy: { order: 'asc' },
        take: 1,
      },
    },
  })

  // Serialize Date fields for client component hydration
  const initialData: AdminTournament[] = rawTournaments.map((t) => ({
    ...t,
    registrationOpenAt: t.registrationOpenAt?.toISOString() ?? null,
    registrationCloseAt: t.registrationCloseAt?.toISOString() ?? null,
    startAt: t.startAt?.toISOString() ?? null,
    endAt: t.endAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    stages: t.stages,
  }))

  return (
    <TournamentAdminTable
      guildId={guildId}
      initialData={initialData}
      userRole={userRole as AppRole}
    />
  )
}
