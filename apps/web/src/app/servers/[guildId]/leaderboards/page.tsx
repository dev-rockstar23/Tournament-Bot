export const revalidate = 300

import Link from 'next/link'
import { prisma } from '@esports/database'
import Navigation from '@/components/ui/Navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'
import { LeaderboardsClient } from '@/components/tournament/LeaderboardsClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string }
  searchParams?: { game?: string }
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

export default async function LeaderboardsPage({ params, searchParams }: PageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let scoreEvents: any[] = []
  try {
    scoreEvents = await prisma.scoreEvent.findMany({
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
  } catch {
    // Show empty leaderboard on DB error
  }

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

  // Apply game filter from URL params
  const activeGame = searchParams?.game ?? 'ALL GAMES'
  const filteredRows = activeGame === 'ALL GAMES'
    ? rows
    : rows.filter((r) => {
        if (activeGame === 'BGMI') return r.game === 'BGMI'
        if (activeGame === 'FREE FIRE') return r.game === 'FREE_FIRE'
        if (activeGame === 'COD MOBILE') return r.game === 'COD_MOBILE'
        return true
      })

  // Top 3 podium entries (overall, all games combined by team)
  const podiumMap = new Map<string, { teamId: string; name: string; tag: string | null; totalPoints: number; totalKills: number }>()
  for (const r of filteredRows) {
    const existing = podiumMap.get(r.teamId)
    if (!existing) {
      podiumMap.set(r.teamId, { teamId: r.teamId, name: r.name, tag: r.tag, totalPoints: r.totalPoints, totalKills: r.totalKills })
    } else {
      existing.totalPoints += r.totalPoints
      existing.totalKills += r.totalKills
    }
  }
  const podium = Array.from(podiumMap.values())
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalKills - a.totalKills)
    .slice(0, 3)

  const totalPlayers = filteredRows.length

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="scanline-overlay" aria-hidden="true" />
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CyberBreadcrumb
          labels={{ servers: 'Servers', [params.guildId]: 'Guild', leaderboards: 'Leaderboards' }}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div>
            <NeonText as="h1" color="violet" glitch className="text-4xl sm:text-5xl font-black tracking-wider mb-2">
              SEASON CHAMPIONSHIP
            </NeonText>
            <p className="font-mono text-sm text-[var(--color-text-secondary)] tracking-widest">
              Official standings across all completed tournaments
            </p>
          </div>
          {/* Season selector */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest">SEASON</span>
            <select
              className="text-xs font-mono text-white bg-white/5 border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-[var(--color-neon-cyan)] tracking-widest uppercase"
              aria-label="Select season"
            >
              <option value="current" className="bg-[#0a0a14]">CURRENT</option>
              <option value="s2" className="bg-[#0a0a14]">SEASON 2</option>
              <option value="s1" className="bg-[#0a0a14]">SEASON 1</option>
            </select>
          </div>
        </div>

        {/* Season Championship Podium */}
        {podium.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-amber-500 rounded-full" aria-hidden="true" />
              <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                CHAMPIONSHIP PODIUM
              </h2>
            </div>
            <div className="flex items-end justify-center gap-4 px-4">
              {/* 2nd place (left) */}
              {podium[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[200px]">
                  <div className="w-16 h-16 rounded-full bg-gray-500/20 border-2 border-gray-400 flex items-center justify-center mb-2">
                    <span className="text-2xl font-black font-display text-gray-300">
                      {podium[1].name.charAt(0)}
                    </span>
                  </div>
                  <GlassCard neonColor="cyan" className="w-full p-3 text-center" style={{ height: '120px' }}>
                    <p className="text-2xl font-black text-gray-300 mb-1">🥈</p>
                    <p className="text-sm font-bold text-white font-display truncate">{podium[1].name}</p>
                    <p className="text-xs font-mono text-[var(--color-neon-cyan)]">{podium[1].totalPoints}pt</p>
                  </GlassCard>
                </div>
              )}

              {/* 1st place (center/tallest) */}
              {podium[0] && (
                <div className="flex flex-col items-center flex-1 max-w-[240px]">
                  <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-2 ring-4 ring-amber-500/30">
                    <span className="text-3xl font-black font-display text-amber-300">
                      {podium[0].name.charAt(0)}
                    </span>
                  </div>
                  <GlassCard neonColor="violet" className="w-full p-4 text-center border-amber-500/30" style={{ height: '150px' }}>
                    <p className="text-3xl font-black text-amber-400 mb-1">🏆</p>
                    <NeonText as="p" color="violet" className="text-base font-black font-display truncate">
                      {podium[0].name}
                    </NeonText>
                    <p className="text-sm font-mono text-[var(--color-neon-cyan)]">{podium[0].totalPoints}pt</p>
                  </GlassCard>
                </div>
              )}

              {/* 3rd place (right) */}
              {podium[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[200px]">
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-600 flex items-center justify-center mb-2">
                    <span className="text-2xl font-black font-display text-orange-400">
                      {podium[2].name.charAt(0)}
                    </span>
                  </div>
                  <GlassCard className="w-full p-3 text-center" style={{ height: '100px' }}>
                    <p className="text-2xl font-black text-orange-400 mb-1">🥉</p>
                    <p className="text-sm font-bold text-white font-display truncate">{podium[2].name}</p>
                    <p className="text-xs font-mono text-[var(--color-text-secondary)]">{podium[2].totalPoints}pt</p>
                  </GlassCard>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Game filter tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {[
            { label: 'ALL GAMES', param: 'ALL GAMES' },
            { label: 'BGMI', param: 'BGMI' },
            { label: 'FREE FIRE', param: 'FREE FIRE' },
            { label: 'COD MOBILE', param: 'COD MOBILE' },
          ].map(({ label, param }) => (
            <Link
              key={param}
              href={param === 'ALL GAMES' ? '?' : `?game=${encodeURIComponent(param)}`}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-mono font-bold whitespace-nowrap tracking-widest uppercase transition-all',
                activeGame === param
                  ? 'bg-[var(--color-neon-violet)] text-black'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 border border-white/10',
              ].join(' ')}
            >
              {label}
            </Link>
          ))}
          <div className="ml-auto text-xs font-mono text-[var(--color-text-muted)] tracking-widest whitespace-nowrap">
            {totalPlayers} TEAMS RANKED
          </div>
        </div>

        {/* Official standings table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GlassCard hud className="overflow-hidden">
              <div className="p-4 border-b border-[var(--color-neon-cyan)]/20">
                <NeonText as="h2" color="cyan" className="text-sm font-bold tracking-widest uppercase">
                  OFFICIAL STANDINGS TABLE
                </NeonText>
              </div>
              <LeaderboardsClient rows={filteredRows} />
            </GlassCard>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* MVP Frag Race */}
            <GlassCard neonColor="red" className="p-4">
              <p className="text-xs font-mono text-red-400 tracking-widest uppercase mb-3 font-bold">
                MVP FRAG RACE
              </p>
              {filteredRows.length > 0 ? (
                <div className="space-y-2">
                  {filteredRows.slice(0, 5).map((r, i) => (
                    <div key={r.teamId + r.game} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[var(--color-text-muted)] w-4">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white font-display truncate">{r.name}</p>
                        <div className="mt-0.5 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                            style={{ width: `${filteredRows[0] ? Math.min((r.totalKills / Math.max(filteredRows[0].totalKills, 1)) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-red-400 font-bold">{r.totalKills}K</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-[var(--color-text-muted)]">No kill data yet.</p>
              )}
            </GlassCard>

            {/* Server Records */}
            <GlassCard neonColor="cyan" className="p-4">
              <p className="text-xs font-mono text-[var(--color-neon-cyan)] tracking-widest uppercase mb-3 font-bold">
                SERVER RECORDS
              </p>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { label: 'HIGHEST SCORE', value: filteredRows.length > 0 ? `${filteredRows[0].totalPoints}pt` : '—', color: 'text-[var(--color-neon-violet)]' },
                  { label: 'MOST KILLS', value: filteredRows.length > 0 ? `${filteredRows.reduce((a, b) => a.totalKills > b.totalKills ? a : b, filteredRows[0]).totalKills}K` : '—', color: 'text-red-400' },
                  { label: 'TOURNAMENTS', value: String(new Set(filteredRows.map((r) => r.game)).size > 0 ? filteredRows[0]?.tournamentsPlayed ?? 0 : 0), color: 'text-[var(--color-neon-cyan)]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-[var(--color-text-muted)] tracking-wider">{label}</span>
                    <span className={`font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <StatusBar shardOnline>
        <span className="text-[var(--color-neon-green)]">LEADERBOARD LIVE</span>
        <span className="mx-2 text-[var(--color-text-muted)]">|</span>
        <span>TEAMS RANKED: <span className="text-[var(--color-neon-cyan)]">{totalPlayers}</span></span>
      </StatusBar>
    </main>
  )
}
