export const revalidate = 300

import { prisma } from '@esports/database'
import { LeaderboardsClient } from '@/components/tournament/LeaderboardsClient'

interface PageProps {
  params: { guildId: string }
}

interface AggregatedTeam {
  teamId: string
  name: string
  tag: string | null
  game: string
  tournamentIds: Set<string>
  totalPoints: number
  totalKills: number
  bestPlacement: number | null
}

export default async function LeaderboardsPage({ params }: PageProps) {
  const scoreEvents = await prisma.scoreEvent.findMany({
    where: {
      status: 'active',
      match: {
        stage: {
          tournament: { guildId: params.guildId, status: 'COMPLETED' },
        },
      },
    },
    include: {
      team: { select: { name: true, tag: true } },
      match: {
        select: {
          stage: {
            select: {
              tournamentId: true,
              tournament: { select: { game: true } },
            },
          },
        },
      },
    },
  })

  // Aggregate by team + game
  const teamMap = new Map<string, AggregatedTeam>()

  for (const ev of scoreEvents) {
    const game = ev.match.stage.tournament.game as string
    const key = `${ev.teamId}::${game}`
    const existing = teamMap.get(key) ?? {
      teamId: ev.teamId,
      name: ev.team.name,
      tag: ev.team.tag,
      game,
      tournamentIds: new Set<string>(),
      totalPoints: 0,
      totalKills: 0,
      bestPlacement: null,
    }
    existing.tournamentIds.add(ev.match.stage.tournamentId)
    existing.totalPoints += Number(ev.points)
    existing.totalKills += ev.kills
    if (ev.placement !== null) {
      existing.bestPlacement =
        existing.bestPlacement === null
          ? ev.placement
          : Math.min(existing.bestPlacement, ev.placement)
    }
    teamMap.set(key, existing)
  }

  const rows = Array.from(teamMap.values())
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalKills - a.totalKills)
    .map((entry) => ({
      teamId: entry.teamId,
      name: entry.name,
      tag: entry.tag,
      game: entry.game,
      tournamentsPlayed: entry.tournamentIds.size,
      totalPoints: entry.totalPoints,
      totalKills: entry.totalKills,
      bestPlacement: entry.bestPlacement,
    }))

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1
            className="font-display text-4xl font-black text-white mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Leaderboards
          </h1>
          <p className="text-[var(--color-text-secondary)]">Overall standings across all completed tournaments</p>
        </div>
        <LeaderboardsClient rows={rows} />
      </div>
    </main>
  )
}
