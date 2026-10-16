import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { MatchSchedulerPanel, type TournamentWithMatches } from '@/components/admin/MatchSchedulerPanel'

interface PageProps {
  params: { guildId: string }
}

export default async function AdminMatchesOverviewPage({ params }: PageProps) {
  const { guildId } = params

  // Auth guard: REFEREE+
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/matches`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  if (userRole < AppRole.REFEREE) {
    redirect(`/servers/${guildId}/admin`)
  }

  // Fetch all matches for the server grouped by tournament, scoped by guildId
  const tournaments = await prisma.tournament.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      mapPool: true,
      stages: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          matches: {
            orderBy: { number: 'asc' },
            select: {
              id: true,
              number: true,
              status: true,
              scheduledStart: true,
              scheduledEnd: true,
              resultDeadline: true,
              map: true,
              mode: true,
              stageId: true,
            },
          },
        },
      },
    },
  })

  // Serialize for client component (Dates → ISO strings)
  const serialized: TournamentWithMatches[] = tournaments.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status as string,
    mapPool: Array.isArray(t.mapPool) ? (t.mapPool as string[]) : [],
    stages: t.stages.map((s) => ({
      id: s.id,
      name: s.name,
      matches: s.matches.map((m) => ({
        id: m.id,
        number: m.number,
        status: m.status as string,
        scheduledStart: m.scheduledStart.toISOString(),
        scheduledEnd: m.scheduledEnd.toISOString(),
        resultDeadline: m.resultDeadline?.toISOString() ?? null,
        map: m.map,
        mode: m.mode,
        stageId: m.stageId,
      })),
    })),
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white">Match Scheduler</h1>
        <p className="text-white/50 text-sm mt-1">
          Manage and schedule matches across all tournaments
        </p>
      </div>

      <MatchSchedulerPanel
        guildId={guildId}
        tournaments={serialized}
      />
    </div>
  )
}
