import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { MatchScheduler, type StageWithMatches } from '@/components/admin/MatchScheduler'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function AdminMatchesPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth check
  let user: Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user'] = null
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/matches`)
  }

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/matches`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  // Direct DB-based role check instead of resolveUserRole
  let userRoleLevel = 0
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
    userRoleLevel = 0
  }

  // Must be at least TOURNAMENT_MANAGER
  if (userRoleLevel < AppRole.TOURNAMENT_MANAGER) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch tournament with stages and matches — scoped to guildId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tournament: any = null
  try {
    tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            matches: {
              orderBy: { number: 'asc' },
              select: {
                id: true,
                number: true,
                status: true,
                scheduledStart: true,
                scheduledEnd: true,
                map: true,
                mode: true,
              },
            },
          },
        },
      },
    })
  } catch {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  if (!tournament) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Serialize Date fields to ISO strings for client component
  const stages: StageWithMatches[] = tournament.stages.map((stage: any) => ({
    id: stage.id,
    name: stage.name,
    matches: stage.matches.map((m: any) => ({
      id: m.id,
      number: m.number,
      status: m.status as string,
      scheduledStart: m.scheduledStart.toISOString(),
      scheduledEnd: m.scheduledEnd.toISOString(),
      map: m.map,
      mode: m.mode,
    })),
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white">Matches</h1>
        <p className="text-white/50 text-sm mt-1">{tournament.name}</p>
      </div>

      <MatchScheduler
        guildId={guildId}
        tournamentId={tournamentId}
        stages={stages}
      />
    </div>
  )
}
