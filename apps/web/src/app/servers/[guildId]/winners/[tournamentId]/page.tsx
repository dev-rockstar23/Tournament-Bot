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
import Navigation from '@/components/ui/Navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
    const teamIds = raw.map((r) => r.teamId)
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    })
    const teamMap = new Map(teams.map((t) => [t.id, t.name]))
    standingsRows = raw.map((r) => ({ ...r, teamName: teamMap.get(r.teamId) }))
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
  const champion = winners.find((w) => w.placement === 1)

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="scanline-overlay" aria-hidden="true" />
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CyberBreadcrumb
          labels={{
            servers: 'Servers',
            [guildId]: 'Guild',
            winners: 'Hall of Fame',
            [tournamentId]: tournament.name,
          }}
          className="mb-6"
        />

        {/* Tournament header */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${badgeClass}`}>
              {gameLabels[tournament.game as string] ?? tournament.game}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border bg-amber-500/15 border-amber-500/30 text-amber-400">
              COMPLETED
            </span>
          </div>
          <NeonText as="h1" color="violet" glitch className="text-4xl sm:text-5xl font-black leading-tight mb-3">
            {tournament.name}
          </NeonText>
          {tournament.completedAt && (
            <p className="text-[var(--color-text-muted)] text-sm font-mono tracking-wider">
              COMPLETED:{' '}
              {new Intl.DateTimeFormat('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).format(tournament.completedAt)}
            </p>
          )}
          {champion && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <span className="text-xl">🏆</span>
              <span className="text-sm font-bold font-display text-amber-400">{champion.team.name}</span>
              <span className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase">CHAMPION</span>
            </div>
          )}
        </div>

        {/* Full result detail */}
        <GlassCard neonColor="violet" className="p-6 mb-8">
          <NeonText as="h2" color="cyan" className="text-sm font-bold tracking-widest uppercase mb-4">
            TOURNAMENT RESULT DETAIL
          </NeonText>
          {/* Podium section wrapped with framer-motion + CSS confetti */}
          <PodiumWrapper showConfetti={isCompleted}>
            <WinnerDetailPodium
              winners={winners}
              awards={awards}
              standings={standingsRows}
            />
          </PodiumWrapper>
        </GlassCard>

        {/* Nav links */}
        <div className="flex items-center justify-between">
          <Link
            href={`/servers/${guildId}/winners`}
            className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-neon-cyan)] tracking-widest uppercase transition-colors"
          >
            ← ALL CHAMPIONS
          </Link>
          <Link
            href={`/servers/${guildId}/tournaments/${tournamentId}`}
            className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-neon-violet)] tracking-widest uppercase transition-colors"
          >
            TOURNAMENT DETAILS →
          </Link>
        </div>
      </div>

      <StatusBar shardOnline>
        <span className="text-amber-400">TOURNAMENT COMPLETED</span>
        <span className="mx-2 text-[var(--color-text-muted)]">|</span>
        {champion && <span>CHAMPION: <span className="text-[var(--color-neon-violet)]">{champion.team.name}</span></span>}
      </StatusBar>
    </main>
  )
}
