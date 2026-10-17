import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { MatchScheduler, type StageWithMatches } from '@/components/admin/MatchScheduler'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function AdminMatchesPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/matches`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  // Must be at least TOURNAMENT_MANAGER
  if (userRole < AppRole.TOURNAMENT_MANAGER) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch tournament with stages and matches — scoped to guildId
  const tournament = await prisma.tournament.findFirst({
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

  if (!tournament) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Serialize Date fields to ISO strings for client component
  const stages: StageWithMatches[] = tournament.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    matches: stage.matches.map((m) => ({
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
