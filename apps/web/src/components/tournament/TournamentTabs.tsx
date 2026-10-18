'use client'
import { useState } from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { NeonText } from '@/components/ui/NeonText'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'
import { ShareButton } from '@/components/tournament/ShareButton'
import { formatDistanceToNow, format } from 'date-fns'

type BadgeVariant = 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default'

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

type TabKey = 'OVERVIEW' | 'PARTICIPANTS' | 'BRACKET' | 'STANDINGS'

interface MatchRow {
  id: string
  number: number
  status: string
  scheduledStart: Date | null
  map: string | null
  mode: string | null
  stageName: string
}

interface RegistrationRow {
  id: string
  team: { name: string; tag: string | null }
  _count: { members: number }
}

interface StandingRow {
  rank: number
  teamId: string
  name: string
  totalPoints: number
  totalKills: number
}

interface TournamentInfo {
  name: string
  mode: string
  entryType: string | null
  acceptedCount: number
  teamCapacity: number
  registrationCloseAt: Date | null
  startAt: Date | null
  description: string | null
  rulesUrl: string | null
  status: string
}

interface TournamentTabsProps {
  guildId: string
  tournamentId: string
  tournament: TournamentInfo
  allMatches: MatchRow[]
  registrations: RegistrationRow[]
  standings: StandingRow[]
  showStandings: boolean
  isLive: boolean
  fillPct: number
}

export function TournamentTabs({
  guildId,
  tournamentId,
  tournament,
  allMatches,
  registrations,
  standings,
  showStandings,
  isLive,
  fillPct,
}: TournamentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW')

  const tabs: TabKey[] = ['OVERVIEW', 'PARTICIPANTS', 'BRACKET', 'STANDINGS']

  return (
    <>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1" role="tablist" aria-label="Tournament sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => {
              if (tab === 'BRACKET') return // bracket is a separate page
              setActiveTab(tab)
            }}
            className={[
              'px-4 py-2 rounded-t text-xs font-mono font-bold whitespace-nowrap tracking-widest uppercase transition-all border-b-2',
              activeTab === tab
                ? 'border-[var(--color-neon-violet)] text-[var(--color-neon-violet)] bg-[var(--color-neon-violet)]/5'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5',
            ].join(' ')}
          >
            {tab === 'BRACKET' ? (
              <Link
                href={`/servers/${guildId}/tournaments/${tournamentId}/bracket`}
                className="no-underline text-inherit"
                onClick={(e) => e.stopPropagation()}
              >
                BRACKET
              </Link>
            ) : tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW tab */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Description */}
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

            {/* Registration */}
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
                  <Link href={`/servers/${guildId}/tournaments/${tournamentId}/register`}>
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
                            {match.scheduledStart ? format(match.scheduledStart, 'PP p') : '—'}
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
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <GlassCard neonColor="cyan" className="p-4 flex flex-col gap-3">
              <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase">QUICK ACTIONS</p>
              <Link href={`/servers/${guildId}/tournaments/${tournamentId}/bracket`}>
                <GlowButton variant="ghost" size="sm" className="w-full justify-start gap-3">
                  🏆 VIEW BRACKET
                </GlowButton>
              </Link>
              {tournament.status === 'REGISTRATION_OPEN' && (
                <Link href={`/servers/${guildId}/tournaments/${tournamentId}/register`}>
                  <GlowButton variant="cyber" size="sm" className="w-full justify-start gap-3">
                    ⚡ REGISTER SQUAD
                  </GlowButton>
                </Link>
              )}
              <Link href={`/servers/${guildId}/leaderboards`}>
                <GlowButton variant="ghost" size="sm" className="w-full justify-start gap-3">
                  📊 LEADERBOARDS
                </GlowButton>
              </Link>
            </GlassCard>

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
                        row.rank <= 3
                          ? 'bg-[var(--color-neon-violet)]/10 border border-[var(--color-neon-violet)]/20'
                          : 'bg-white/3 border border-white/5'
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
      )}

      {/* PARTICIPANTS tab */}
      {activeTab === 'PARTICIPANTS' && (
        <GlassCard className="p-5">
          <NeonText as="h2" color="violet" className="text-lg font-bold tracking-widest uppercase mb-4">
            REGISTERED TEAMS ({registrations.length})
          </NeonText>
          {registrations.length === 0 ? (
            <p className="text-[var(--color-text-muted)] font-mono text-sm">No teams registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {registrations.map((reg, idx) => (
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
          )}
        </GlassCard>
      )}

      {/* STANDINGS tab */}
      {activeTab === 'STANDINGS' && (
        <GlassCard hud className="p-5">
          <div className="flex items-center gap-2 mb-4">
            {isLive && <StatusPulse variant="live" />}
            <NeonText as="h2" color={isLive ? 'red' : 'cyan'} className="text-lg font-bold tracking-widest uppercase">
              {isLive ? 'LIVE STANDINGS' : 'FINAL STANDINGS'}
            </NeonText>
          </div>
          {standings.length === 0 ? (
            <p className="text-[var(--color-text-muted)] font-mono text-sm">
              Standings will appear once matches begin.
            </p>
          ) : (
            <div className="space-y-2">
              {standings.map((row) => (
                <div
                  key={row.teamId}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    row.rank <= 3
                      ? 'bg-[var(--color-neon-violet)]/10 border border-[var(--color-neon-violet)]/20'
                      : 'bg-white/3 border border-white/5'
                  }`}
                >
                  <span className="text-sm font-bold w-8 text-center font-mono">
                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                  </span>
                  <span className="flex-1 text-sm font-bold text-white font-display truncate">{row.name}</span>
                  <div className="flex items-center gap-6 text-xs font-mono">
                    <span>
                      <span className="text-[var(--color-text-muted)] tracking-wider">PTS </span>
                      <span className="text-[var(--color-neon-cyan)] font-bold">{row.totalPoints}</span>
                    </span>
                    <span>
                      <span className="text-[var(--color-text-muted)] tracking-wider">KILLS </span>
                      <span className="text-red-400 font-bold">{row.totalKills}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </>
  )
}
