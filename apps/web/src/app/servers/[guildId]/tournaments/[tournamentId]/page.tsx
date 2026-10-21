export const revalidate = 60

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { prisma } from '@esports/database'
import { Badge } from '@/components/ui/Badge'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'
import { TournamentTabs } from '@/components/tournament/TournamentTabs'
import Navigation from '@/components/ui/Navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, guildId: params.guildId },
    select: { name: true, tournamentCode: true },
  })
  if (!tournament) return { title: 'Tournament Not Found' }
  return {
    title: `${tournament.tournamentCode ? '#' + tournament.tournamentCode + ' — ' : ''}${tournament.name} — Tournament`,
  }
}

type BadgeVariant = 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default'

const statusBadgeVariant: Record<string, BadgeVariant> = {
  LIVE: 'live',
  REGISTRATION_OPEN: 'upcoming',
  CHECK_IN: 'draft',
  COMPLETED: 'completed',
  DRAFT: 'default',
  CANCELLED: 'cancelled',
  REGISTRATION_CLOSED: 'cancelled',
  ARCHIVED: 'cancelled',
}

const statusLabel: Record<string, string> = {
  LIVE: 'Live',
  REGISTRATION_OPEN: 'Registration Open',
  CHECK_IN: 'Check-In',
  COMPLETED: 'Completed',
  DRAFT: 'Draft',
  CANCELLED: 'Cancelled',
  REGISTRATION_CLOSED: 'Registration Closed',
  ARCHIVED: 'Archived',
}

const gameBadgeClass: Record<string, string> = {
  BGMI: 'bg-green-500/15 border-green-500/30 text-green-400',
  FREE_FIRE: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  COD_MOBILE: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
}

const gameLabels: Record<string, string> = {
  BGMI: 'BGMI',
  FREE_FIRE: 'Free Fire',
  COD_MOBILE: 'COD Mobile',
}

const gameGradients: Record<string, string> = {
  BGMI: 'from-green-600/40 to-teal-700/40',
  FREE_FIRE: 'from-orange-600/40 to-red-700/40',
  COD_MOBILE: 'from-blue-600/40 to-purple-700/40',
}


export default async function TournamentDetailPage({ params }: PageProps) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, guildId: params.guildId },
    include: {
      registrations: {
        where: { status: 'APPROVED' },
        include: {
          team: { select: { name: true, tag: true } },
          _count: { select: { members: true } },
        },
      },
      stages: {
        include: {
          matches: {
            select: {
              id: true,
              number: true,
              status: true,
              scheduledStart: true,
              scheduledEnd: true,
              map: true,
              mode: true,
            },
            orderBy: { number: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!tournament) notFound()

  const scoreEvents = await prisma.scoreEvent.findMany({
    where: {
      match: { stage: { tournamentId: params.tournamentId } },
      status: 'active',
    },
    include: { team: { select: { name: true } } },
  })

  // Aggregate standings
  const teamMap = new Map<
    string,
    { teamId: string; name: string; totalPoints: number; totalKills: number }
  >()
  for (const ev of scoreEvents) {
    const existing = teamMap.get(ev.teamId) ?? {
      teamId: ev.teamId,
      name: ev.team.name,
      totalPoints: 0,
      totalKills: 0,
    }
    existing.totalPoints += Number(ev.points)
    existing.totalKills += ev.kills
    teamMap.set(ev.teamId, existing)
  }
  const standings = Array.from(teamMap.values())
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalKills - a.totalKills)
    .map((entry, index) => ({ rank: index + 1, ...entry }))

  const fillPct =
    tournament.teamCapacity > 0
      ? Math.min((tournament.acceptedCount / tournament.teamCapacity) * 100, 100)
      : 0

  const showStandings = tournament.status === 'LIVE' || tournament.status === 'COMPLETED'

  const allMatches = tournament.stages.flatMap((s) =>
    s.matches.map((m) => ({ ...m, stageName: s.name }))
  )

  const isLive = tournament.status === 'LIVE'
  const spectatorCount = tournament.registrations.length * 3 // approximate

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="scanline-overlay" aria-hidden="true" />
      <Navigation />

      {/* Tournament Hero Banner */}
      <div className="relative w-full h-64 sm:h-80 overflow-hidden">
        {tournament.bannerUrl ? (
          <Image
            src={tournament.bannerUrl}
            alt={`${tournament.name} banner`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gameGradients[tournament.game] ?? 'from-violet-600/40 to-indigo-700/40'}`}
            aria-hidden="true"
          />
        )}
        {/* HUD scan line overlay */}
        <div className="absolute inset-0 scanline-overlay opacity-30" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-black/40 to-transparent" aria-hidden="true" />

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <CyberBreadcrumb
              labels={{ servers: 'Servers', [params.guildId]: 'Guild', tournaments: 'Tournaments', [params.tournamentId]: tournament.name }}
              className="mb-3"
            />
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${gameBadgeClass[tournament.game] ?? 'bg-violet-500/15 border-violet-500/30 text-violet-400'}`}>
                    {gameLabels[tournament.game] ?? tournament.game}
                  </span>
                  <Badge variant={statusBadgeVariant[tournament.status] ?? 'default'}>
                    {statusLabel[tournament.status] ?? tournament.status}
                  </Badge>
                  {isLive && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono text-white/60 border border-white/10">
                      👁 {spectatorCount} SPECTATORS
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tournament.tournamentCode && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border border-violet-500/40 bg-violet-500/10 text-violet-300">
                      #{tournament.tournamentCode}
                    </span>
                  )}
                  <h1 className="text-3xl sm:text-4xl font-black tracking-wide neon-text-violet font-display">
                    {tournament.name}
                  </h1>
                </div>
              </div>
              {/* Prize pool prominent */}
              <div className="flex-shrink-0 text-right hidden sm:block">
                <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-1">Prize Pool</p>
                <p className="text-2xl font-black font-display neon-text-cyan">TBA</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TournamentTabs
          guildId={params.guildId}
          tournamentId={params.tournamentId}
          tournament={{
            name: tournament.name,
            mode: tournament.mode,
            entryType: tournament.entryType ?? null,
            acceptedCount: tournament.acceptedCount,
            teamCapacity: tournament.teamCapacity,
            registrationCloseAt: tournament.registrationCloseAt ?? null,
            startAt: tournament.startAt ?? null,
            description: tournament.description ?? null,
            rulesUrl: tournament.rulesUrl ?? null,
            status: tournament.status,
          }}
          allMatches={allMatches}
          registrations={tournament.registrations}
          standings={standings}
          showStandings={showStandings}
          isLive={isLive}
          fillPct={fillPct}
        />
      </div>

      <StatusBar shardOnline={isLive}>
        <span className={isLive ? 'text-red-400' : 'text-[var(--color-neon-green)]'}>
          {isLive ? 'MATCH IN PROGRESS' : 'TOURNAMENT ONLINE'}
        </span>
      </StatusBar>
    </main>
  )
}
