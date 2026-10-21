import { createClient } from '@/lib/supabase/server'
import { AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { type AdminTournament } from '@/components/admin/TournamentAdminTable'
import { AdminDashboardNexus } from '@/components/admin/AdminDashboardNexus'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string }
}

export default async function AdminTournamentsPage({ params }: PageProps) {
  const { guildId } = params

  // Auth check — layout already handles this, but guard defensively
  let user: Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user'] = null
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    redirect(`/?next=/servers/${guildId}/admin/tournaments`)
  }

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  // Direct DB-based role check instead of resolveUserRole
  let userRoleLevel: AppRole = AppRole.REFEREE
  try {
    const serverRecord = await prisma.discordServer.findUnique({
      where: { guildId },
      select: { ownerId: true },
    })
    if (serverRecord?.ownerId === discordId) {
      userRoleLevel = AppRole.SERVER_ADMIN
    } else {
      const bindings = await prisma.serverRoleBinding.findMany({
        where: { guildId },
        select: { appRole: true },
      })
      const roles = bindings.map((b) => b.appRole)
      if (roles.includes('SERVER_ADMIN')) userRoleLevel = AppRole.SERVER_ADMIN
      else if (roles.includes('TOURNAMENT_MANAGER')) userRoleLevel = AppRole.TOURNAMENT_MANAGER
      else if (roles.includes('REFEREE')) userRoleLevel = AppRole.REFEREE
    }
  } catch {
    userRoleLevel = AppRole.REFEREE
  }

  // Fetch initial page of tournaments server-side for fast first paint
  let initialData: AdminTournament[] = []
  try {
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
        tournamentCode: true,
        stages: {
          select: { name: true, status: true },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    })

    // Serialize Date fields for client component hydration
    initialData = rawTournaments.map((t) => ({
      ...t,
      registrationOpenAt: t.registrationOpenAt?.toISOString() ?? null,
      registrationCloseAt: t.registrationCloseAt?.toISOString() ?? null,
      startAt: t.startAt?.toISOString() ?? null,
      endAt: t.endAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      stages: t.stages,
    }))
  } catch {
    // Return empty list on DB error — the page will show empty state
    initialData = []
  }

  return (
    <AdminDashboardNexus
      guildId={guildId}
      tournaments={initialData}
      userRole={userRoleLevel as AppRole}
    />
  )
}
