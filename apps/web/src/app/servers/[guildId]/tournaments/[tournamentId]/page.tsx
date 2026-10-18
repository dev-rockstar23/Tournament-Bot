export const revalidate = 60

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@esports/database'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'
import { ShareButton } from '@/components/tournament/ShareButton'
import { formatDistanceToNow, format } from 'date-fns'
import Navigation from '@/components/ui/Navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, guildId: params.guildId },
    select: { name: true },
  })
  if (!tournament) return { title: 'Tournament Not Found' }
  return { title: `${tournament.name} — Tournament` }
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

const matchStatusLabel: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  CHECK_IN: 'Check-In',
  READY: 'Ready',
  LIVE: 'Live',
  AWAITING_RESULT: 'Awaiting Result',
  UNDER_REVIEW: 'Under Review',
  COMPLETED: 'Completed',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  FORFEIT: 'Forfeit',
  DISPUTED: 'Disputed',
}

const matchStatusVariant: Record<string, BadgeVariant> = {
  SCHEDULED: 'upcoming',
  CHECK_IN: 'draft',
  READY: 'upcoming',
  LIVE: 'live',
  AWAITING_RESULT: 'draft',
  UNDER_REVIEW: 'default',
  COMPLETED: 'completed',
  POSTPONED: 'cancelled',
  CANCELLED: 'cancelled',
  FORFEIT: 'cancelled',
  DISPUTED: 'live',
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
                <NeonText as="h1" color="violet" glitch className="text-3xl sm:text-4xl font-black tracking-wide">
                  {tournament.name}
                </NeonText>
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
        {/* Tabs navigation */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
          {['OVERVIEW', 'PARTICIPANTS', 'BRACKET', 'STANDINGS'].map((tab, i) => (
            <button
              key={tab}
              className={[
                'px-4 py-2 rounded-t text-xs font-mono font-bold whitespace-nowrap tracking-widest uppercase transition-all border-b-2',
                i === 0
                  ? 'border-[var(--color-neon-violet)] text-[var(--color-neon-violet)] bg-[var(--color-neon-violet)]/5'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              {tab === 'BRACKET' ? (
                <Link href={`/servers/${params.guildId}/tournaments/${params.tournamentId}/bracket`} className="no-underline text-inherit">
                  BRACKET
                </Link>
              ) : tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Description + share */}
            <GlassCard className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <NeonText as="h2" color="cyan" className="text-lg font-bold tracking-widest uppercase">
                  OVERVIEW
                </NeonText>
                <ShareButton />
              </div>
              {tournament.description ? (
                <p className="text-[var(--color-text-secondary)] leading-relaxed font-mono text-sm">
                  {tournament.description}
                </p>
              ) : (
                <p className="text-[var(--color-text-muted)] font-mono text-sm">No description provided.</p>
              )}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-[var(--color-text-muted)] tracking-widest mb-1">FORMAT</p>
                  <p className="text-white font-bold">{tournament.mode}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-[var(--color-text-muted)] tracking-widest mb-1">ENTRY</p>
                  <p className="text-white font-bold">{tournament.entryType ?? 'FREE'}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-[var(--color-text-muted)] tracking-widest mb-1">SLOTS</p>
                  <p className="text-[var(--color-neon-cyan)] font-bold">
                    {tournament.acceptedCount}/{tournament.teamCapacity}
                  </p>
                </div>
              </div>
              {tournament.rulesUrl && (
                <a
                  href={tournament.rulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-xs font-mono text-[var(--color-neon-cyan)] hover:text-white underline underline-offset-2 tracking-widest uppercase transition-colors"
                >
                  VIEW TOURNAMENT RULES ↗
                </a>
              )}
            </GlassCard>

            {/* Registration card */}
            <GlassCard neonColor="violet" className="p-5">
              <NeonText as="h2" color="violet" className="text-lg font-bold tracking-widest uppercase mb-4">
                REGISTRATION
              </NeonText>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm font-mono">
                  <span className="text-[var(--color-text-secondary)] tracking-wider">TEAMS REGISTERED</span>
                  <span className="font-bold text-white">
                    {tournament.acceptedCount} / {tournament.teamCapacity}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={tournament.acceptedCount}
                  aria-valuemin={0}
                  aria-valuemax={tournament.teamCapacity}
                  aria-label={`${tournament.acceptedCount} of ${tournament.teamCapacity} teams registered`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] transition-all duration-500"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                {tournament.registrationCloseAt && (
                  <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-wider">
                    REGISTRATION CLOSES{' '}
                    <span className="text-[var(--color-text-secondary)]">
                      {formatDistanceToNow(tournament.registrationCloseAt, { addSuffix: true })}
                    </span>
                  </p>
                )}
                {tournament.startAt && (
                  <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-wider">
                    TOURNAMENT STARTS{' '}
                    <span className="text-[var(--color-text-secondary)]">
                      {format(tournament.startAt, 'PPP p')}
                    </span>
                  </p>
                )}
                {tournament.status === 'REGISTRATION_OPEN' && (
                  <Link
                    href={`/servers/${params.guildId}/tournaments/${params.tournamentId}/register`}
                  >
                    <GlowButton variant="cyber" size="md" className="w-full justify-center">
                      REGISTER YOUR SQUAD
                    </GlowButton>
                  </Link>
                )}
              </div>
            </GlassCard>

            {/* Match Schedule */}
            {allMatches.length > 0 && (
              <GlassCard hud className="p-5">
                <NeonText as="h2" color="cyan" className="text-lg font-bold tracking-widest uppercase mb-4">
                  MATCH SCHEDULE
                </NeonText>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono" aria-label="Match schedule">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)] tracking-widest uppercase">
                        <th className="pb-2 pr-4 font-medium">#</th>
                        <th className="pb-2 pr-4 font-medium">STAGE</th>
                        <th className="pb-2 pr-4 font-medium">SCHEDULED</th>
                        <th className="pb-2 pr-4 font-medium">MAP</th>
                        <th className="pb-2 pr-4 font-medium">MODE</th>
                        <th className="pb-2 font-medium">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMatches.map((match) => (
                        <tr
                          key={match.id}
                          className="border-b border-[var(--color-border)] last:border-0 hover:bg-white/3 transition-colors"
                        >
                          <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">{match.number}</td>
                          <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">{match.stageName}</td>
                          <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">
                            {format(match.scheduledStart, 'PP p')}
                          </td>
                          <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">{match.map ?? '—'}</td>
                          <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">{match.mode ?? '—'}</td>
                          <td className="py-2.5">
                            <Badge variant={matchStatusVariant[match.status] ?? 'default'}>
                              {matchStatusLabel[match.status] ?? match.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {/* Registered Teams */}
            {tournament.registrations.length > 0 && (
              <GlassCard className="p-5">
                <NeonText as="h2" color="violet" className="text-lg font-bold tracking-widest uppercase mb-4">
                  REGISTERED TEAMS ({tournament.registrations.length})
                </NeonText>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tournament.registrations.map((reg, idx) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-[var(--color-border)] hover:border-[var(--color-neon-violet)]/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--color-text-muted)] w-6">#{idx + 1}</span>
                        <div>
                          <span className="text-sm font-bold text-white font-display">{reg.team.name}</span>
                          {reg.team.tag && (
                            <span className="ml-2 text-xs text-[var(--color-text-muted)] font-mono">[{reg.team.tag}]</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] font-mono">
                        {reg._count.members}P
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          {/* Live Standings Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Quick actions */}
            <GlassCard neonColor="cyan" className="p-4 flex flex-col gap-3">
              <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase">QUICK ACTIONS</p>
              <Link href={`/servers/${params.guildId}/tournaments/${params.tournamentId}/bracket`}>
                <GlowButton variant="ghost" size="sm" className="w-full justify-start gap-3">
                  🏆 VIEW BRACKET
                </GlowButton>
              </Link>
              {tournament.status === 'REGISTRATION_OPEN' && (
                <Link href={`/servers/${params.guildId}/tournaments/${params.tournamentId}/register`}>
                  <GlowButton variant="cyber" size="sm" className="w-full justify-start gap-3">
                    ⚡ REGISTER SQUAD
                  </GlowButton>
                </Link>
              )}
              <Link href={`/servers/${params.guildId}/leaderboards`}>
                <GlowButton variant="ghost" size="sm" className="w-full justify-start gap-3">
                  📊 LEADERBOARDS
                </GlowButton>
              </Link>
            </GlassCard>

            {/* Live Standings snapshot */}
            {showStandings && standings.length > 0 && (
              <GlassCard hud className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  {isLive && <StatusPulse variant="live" />}
                  <NeonText as="h2" color={isLive ? 'red' : 'cyan'} className="text-sm font-bold tracking-widest uppercase">
                    {isLive ? 'LIVE STANDINGS' : 'FINAL STANDINGS'}
                  </NeonText>
                </div>
                <div className="space-y-2">
                  {standings.slice(0, 8).map((row) => (
                    <div
                      key={row.teamId}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        row.rank <= 3 ? 'bg-[var(--color-neon-violet)]/10 border border-[var(--color-neon-violet)]/20' : 'bg-white/3 border border-white/5'
                      }`}
                    >
                      <span className="text-sm font-bold w-6 text-center font-mono">
                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                      </span>
                      <span className="flex-1 text-sm font-bold text-white font-display truncate">{row.name}</span>
                      <div className="flex flex-col items-end text-xs font-mono">
                        <span className="text-[var(--color-neon-cyan)]">{row.totalPoints}pt</span>
                        <span className="text-[var(--color-text-muted)]">{row.totalKills}k</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>

      <StatusBar shardOnline={isLive}>
        <span className={isLive ? 'text-red-400' : 'text-[var(--color-neon-green)]'}>
          {isLive ? 'MATCH IN PROGRESS' : 'TOURNAMENT ONLINE'}
        </span>
      </StatusBar>
    </main>
  )
}
