export const revalidate = 3600

import { notFound } from 'next/navigation'
import { prisma } from '@esports/database'
import { computeTournamentStandings } from '@esports/scoring'
import {
  WinnerDetailPodium,
  type WinnerEntry,
  type AwardEntry,
  type StandingRow,
} from '@/components/tournament/WinnerDetailPodium'
import { PodiumWrapper } from '@/components/tournament/PodiumWrapper'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

const gameLabels: Record<string, string> = {
  BGMI: 'BGMI',
  FREE_FIRE: 'Free Fire',
  COD_MOBILE: 'COD Mobile',
}

const gameBadgeClass: Record<string, string> = {
  BGMI: 'bg-green-500/15 border-green-500/30 text-green-400',
  FREE_FIRE: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  COD_MOBILE: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
}

export default async function TournamentWinnersPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Scope by BOTH tournamentId AND guildId — prevents cross-guild leakage
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, guildId },
    select: {
      id: true,
      name: true,
      game: true,
      status: true,
      completedAt: true,
    },
  })

  if (!tournament || tournament.status !== 'COMPLETED') {
    notFound()
  }

  // Fetch winner records — non-superseded only
  // NEVER returns PENDING registrations or private data
  const rawWinners = await prisma.winnerRecord.findMany({
    where: {
      tournamentId,
      tournament: { guildId },
      isSuperseded: false,
    },
    orderBy: { placement: 'asc' },
    select: {
      id: true,
      placement: true,
      awardType: true,
      team: { select: { name: true, tag: true } },
    },
  })

  // Fetch awards for this tournament
  const rawAwards = await prisma.award.findMany({
    where: { tournamentId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      type: true,
      label: true,
      criteria: true,
      teamId: true,
    },
  })

  // Enrich awards with team names
  const awardTeamIds = rawAwards.map((a) => a.teamId).filter(Boolean) as string[]
  const awardTeams = awardTeamIds.length
    ? await prisma.team.findMany({
        where: { id: { in: awardTeamIds } },
        select: { id: true, name: true, tag: true },
      })
    : []
  const awardTeamMap = new Map(awardTeams.map((t) => [t.id, t]))

  // Compute full standings for the table
  let standingsRows: StandingRow[] = []
  try {
    const raw = await computeTournamentStandings(prisma, tournamentId, guildId)

    // Enrich with team names from the DB
    const teamIds = raw.map((r) => r.teamId)
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    })
    const teamMap = new Map(teams.map((t) => [t.id, t.name]))

    standingsRows = raw.map((r) => ({
      ...r,
      teamName: teamMap.get(r.teamId),
    }))
  } catch {
    // standings failure must not break the page
  }

  const winners: WinnerEntry[] = rawWinners.map((w) => ({
    id: w.id,
    placement: w.placement,
    awardType: w.awardType as string,
    team: w.team,
  }))

  const awards: AwardEntry[] = rawAwards.map((a) => ({
    id: a.id,
    type: a.type as string,
    label: a.label,
    criteria: a.criteria,
    team: a.teamId ? (awardTeamMap.get(a.teamId) ?? null) : null,
  }))

  const badgeClass =
    gameBadgeClass[tournament.game as string] ??
    'bg-violet-500/15 border-violet-500/30 text-violet-400'

  const isCompleted = tournament.status === 'COMPLETED'

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tournament header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
            >
              {gameLabels[tournament.game as string] ?? tournament.game}
            </span>
          </div>
          <h1
            className="font-display text-4xl sm:text-5xl font-black text-white leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {tournament.name}
          </h1>
          {tournament.completedAt && (
            <p className="text-white/40 text-sm mt-3">
              Completed{' '}
              {new Intl.DateTimeFormat('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).format(tournament.completedAt)}
            </p>
          )}
        </div>

        {/* Podium section wrapped with framer-motion + CSS confetti */}
        <PodiumWrapper showConfetti={isCompleted}>
          <WinnerDetailPodium
            winners={winners}
            awards={awards}
            standings={standingsRows}
          />
        </PodiumWrapper>
      </div>
    </main>
  )
}
