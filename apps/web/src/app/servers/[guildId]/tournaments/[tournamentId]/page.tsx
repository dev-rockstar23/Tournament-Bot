export const revalidate = 60

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@esports/database'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { ShareButton } from '@/components/tournament/ShareButton'
import { formatDistanceToNow, format } from 'date-fns'

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

  const showStandings =
    tournament.status === 'LIVE' || tournament.status === 'COMPLETED'

  const allMatches = tournament.stages.flatMap((s) =>
    s.matches.map((m) => ({ ...m, stageName: s.name }))
  )

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Hero */}
      <div className="relative w-full h-56 sm:h-72 overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-black/30 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-6 left-4 sm:left-8 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${gameBadgeClass[tournament.game] ?? 'bg-violet-500/15 border-violet-500/30 text-violet-400'}`}
            >
              {gameLabels[tournament.game] ?? tournament.game}
            </span>
            <Badge variant={statusBadgeVariant[tournament.status] ?? 'default'}>
              {statusLabel[tournament.status] ?? tournament.status}
            </Badge>
          </div>
          <h1
            className="font-display text-3xl sm:text-4xl font-black text-white leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {tournament.name}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Description + share */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {tournament.description && (
              <p className="text-[var(--color-text-secondary)] leading-relaxed">{tournament.description}</p>
            )}
            <p className="text-[var(--color-text-muted)] text-sm mt-2">
              Mode: <span className="text-[var(--color-text-secondary)]">{tournament.mode}</span>
            </p>
          </div>
          <ShareButton />
        </div>

        {/* Registration section */}
        <GlassCard className="p-5">
          <h2 className="font-display text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Registration
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-secondary)]">Teams registered</span>
              <span className="text-sm font-semibold text-white">
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
              <p className="text-sm text-[var(--color-text-muted)]">
                Registration closes{' '}
                <span className="text-[var(--color-text-secondary)]">
                  {formatDistanceToNow(tournament.registrationCloseAt)}
                </span>
              </p>
            )}
            {tournament.startAt && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Tournament starts{' '}
                <span className="text-[var(--color-text-secondary)]">
                  {format(tournament.startAt, 'PPP p')}
                </span>
              </p>
            )}
            {tournament.status === 'REGISTRATION_OPEN' && (
              <Link
                href={`/servers/${params.guildId}/tournaments/${params.tournamentId}/register`}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#7c3aed] to-[#9f5bff] text-white border border-[rgba(124,58,237,0.5)] hover:from-[#6d28d9] hover:to-[#8b5cf6] transition-all"
              >
                Register Your Team
              </Link>
            )}
          </div>
        </GlassCard>

        {/* Match Schedule */}
        {allMatches.length > 0 && (
          <GlassCard className="p-5">
            <h2
              className="font-display text-lg font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Match Schedule
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Match schedule">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">Stage</th>
                    <th className="pb-2 pr-4 font-medium">Scheduled</th>
                    <th className="pb-2 pr-4 font-medium">Map</th>
                    <th className="pb-2 pr-4 font-medium">Mode</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allMatches.map((match) => (
                    <tr
                      key={match.id}
                      className="border-b border-[var(--color-border)] last:border-0 hover:bg-white/3"
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
            <h2
              className="font-display text-lg font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Registered Teams ({tournament.registrations.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tournament.registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-[var(--color-border)]"
                >
                  <div>
                    <span className="text-sm font-medium text-white">{reg.team.name}</span>
                    {reg.team.tag && (
                      <span className="ml-2 text-xs text-[var(--color-text-muted)]">[{reg.team.tag}]</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {reg._count.members} member{reg._count.members !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Standings */}
        {showStandings && standings.length > 0 && (
          <GlassCard className="p-5">
            <h2
              className="font-display text-lg font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Standings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tournament standings">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                    <th className="pb-2 pr-4 font-medium">Rank</th>
                    <th className="pb-2 pr-4 font-medium">Team</th>
                    <th className="pb-2 pr-4 font-medium">Points</th>
                    <th className="pb-2 font-medium">Kills</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr
                      key={row.teamId}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-bold text-[var(--color-text-secondary)]">
                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                      </td>
                      <td className="py-2.5 pr-4 text-white font-medium">{row.name}</td>
                      <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">{row.totalPoints}</td>
                      <td className="py-2.5 text-[var(--color-text-secondary)]">{row.totalKills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* Rules link */}
        {tournament.rulesUrl && (
          <div>
            <a
              href={tournament.rulesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-accent-2)] hover:text-[var(--color-accent-2-glow)] underline underline-offset-2"
            >
              View Tournament Rules ↗
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
