export const revalidate = 60

import Link from 'next/link'
import { prisma } from '@esports/database'
import { WinnersPodium } from '@/components/tournament/WinnersPodium'
import Navigation from '@/components/ui/Navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string }
}

const gameLabels: Record<string, string> = {
  BGMI: 'BGMI',
  FREE_FIRE: 'Free Fire',
  COD_MOBILE: 'CoD Mobile',
}

const gameColors: Record<string, string> = {
  BGMI: 'border-green-500/30 text-green-400',
  FREE_FIRE: 'border-orange-500/30 text-orange-400',
  COD_MOBILE: 'border-blue-500/30 text-blue-400',
}

export default async function WinnersPage({ params }: PageProps) {
  const { guildId } = params

  const winners = await prisma.winnerRecord.findMany({
    where: {
      tournament: { guildId },
      isSuperseded: false,
    },
    orderBy: [{ createdAt: 'desc' }, { placement: 'asc' }],
    take: 30,
    include: {
      tournament: { select: { id: true, name: true, game: true, endAt: true } },
      team: { select: { name: true, tag: true } },
    },
  })

  const tournamentIds = [...new Set(winners.map((w) => w.tournamentId))]
  const completedTournaments = await prisma.tournament.findMany({
    where: {
      id: { in: tournamentIds },
      guildId,
      status: 'COMPLETED',
    },
    select: { id: true, name: true, game: true, endAt: true },
    orderBy: { endAt: 'desc' },
  })
  const completedSet = new Set(completedTournaments.map((t) => t.id))

  // Compute stats
  const totalChampions = new Set(winners.filter((w) => w.placement === 1).map((w) => w.teamId)).size
  const totalDistributed = completedTournaments.length

  // Featured / pinned — most recent completed tournament
  const pinnedTournament = completedTournaments[0] ?? null
  const pinnedWinners = pinnedTournament
    ? winners
        .filter((w) => w.tournamentId === pinnedTournament.id)
        .sort((a, b) => a.placement - b.placement)
        .slice(0, 3)
    : []

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="scanline-overlay" aria-hidden="true" />
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CyberBreadcrumb
          labels={{ servers: 'Servers', [guildId]: 'Guild', winners: 'Hall of Fame' }}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div>
            <NeonText as="h1" color="violet" glitch className="text-4xl sm:text-5xl font-black tracking-wider mb-2">
              CHAMPIONS &amp; HALL OF FAME
            </NeonText>
            <p className="font-mono text-sm text-[var(--color-text-secondary)] tracking-widest">
              Tournament champions and top finishers
            </p>
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <div className="text-center px-4 py-2 rounded-lg bg-white/5 border border-[var(--color-neon-violet)]/30">
              <p className="text-2xl font-black font-display neon-text-violet">{totalDistributed}</p>
              <p className="text-[10px] font-mono text-[var(--color-text-muted)] tracking-widest uppercase">TOURNEYS</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-white/5 border border-amber-500/30">
              <p className="text-2xl font-black font-display text-amber-400">{totalChampions}</p>
              <p className="text-[10px] font-mono text-[var(--color-text-muted)] tracking-widest uppercase">CROWNED</p>
            </div>
          </div>
        </div>

        {/* Season finale pinned record */}
        {pinnedTournament && pinnedWinners.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 bg-amber-500 rounded-full" aria-hidden="true" />
              <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                LATEST SEASON FINALE
              </h2>
              <span className="text-xs font-mono text-amber-400 tracking-wider">PINNED</span>
            </div>
            <GlassCard neonColor="violet" className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-900/10 to-transparent" aria-hidden="true" />
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border bg-transparent mb-2 ${gameColors[pinnedTournament.game as string] ?? 'border-white/20 text-white/60'}`}>
                      {gameLabels[pinnedTournament.game as string] ?? pinnedTournament.game}
                    </span>
                    <NeonText as="h3" color="cyan" className="text-xl font-black tracking-wide">
                      {pinnedTournament.name}
                    </NeonText>
                    {pinnedTournament.endAt && (
                      <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1 tracking-wider">
                        COMPLETED: {new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }).format(pinnedTournament.endAt)}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/servers/${guildId}/winners/${pinnedTournament.id}`}
                    className="text-xs font-mono text-[var(--color-neon-cyan)] hover:text-white tracking-widest uppercase transition-colors whitespace-nowrap"
                  >
                    FULL RESULTS →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {pinnedWinners.map((w) => (
                    <div
                      key={w.id}
                      className={`p-4 rounded-xl border text-center ${
                        w.placement === 1
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : w.placement === 2
                          ? 'bg-gray-500/10 border-gray-500/30'
                          : 'bg-orange-800/10 border-orange-800/30'
                      }`}
                    >
                      <p className="text-3xl mb-2">
                        {w.placement === 1 ? '🥇' : w.placement === 2 ? '🥈' : '🥉'}
                      </p>
                      <p className="text-sm font-black text-white font-display truncate">{w.team.name}</p>
                      {w.team.tag && (
                        <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">[{w.team.tag}]</p>
                      )}
                      <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1 tracking-widest uppercase">
                        {w.placement === 1 ? 'CHAMPION' : w.placement === 2 ? 'RUNNER-UP' : '3RD PLACE'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </section>
        )}

        {/* WinnersPodium component */}
        <section className="mb-10">
          <WinnersPodium winners={winners} />
        </section>

        {/* Historic tournament champions grid */}
        {completedTournaments.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 bg-[var(--color-neon-cyan)] rounded-full" aria-hidden="true" />
              <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                HISTORIC TOURNAMENT CHAMPIONS
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTournaments.map((t) => {
                const champion = winners.find((w) => w.tournamentId === t.id && w.placement === 1)
                return (
                  <Link
                    key={t.id}
                    href={`/servers/${guildId}/winners/${t.id}`}
                    className="block group"
                  >
                    <GlassCard neonColor="violet" className="p-4 hover:border-[var(--color-neon-violet)]/50 transition-all">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`text-[10px] font-mono border rounded px-1.5 py-0.5 bg-transparent ${gameColors[t.game as string] ?? 'border-white/20 text-white/60'}`}>
                          {gameLabels[t.game as string] ?? t.game}
                        </span>
                        {t.endAt && (
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)] tracking-wider">
                            {new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short' }).format(t.endAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white font-display mb-2 group-hover:text-[var(--color-neon-violet)] transition-colors leading-snug line-clamp-2">
                        {t.name}
                      </p>
                      {champion ? (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-amber-400">🏆</span>
                          <span className="text-white font-bold">{champion.team.name}</span>
                          {champion.team.tag && (
                            <span className="text-[var(--color-text-muted)]">[{champion.team.tag}]</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs font-mono text-[var(--color-text-muted)]">No champion recorded</p>
                      )}
                      <div className="mt-3 text-xs font-mono text-[var(--color-neon-cyan)] group-hover:text-white transition-colors tracking-widest uppercase">
                        VIEW RESULTS →
                      </div>
                    </GlassCard>
                  </Link>
                )
              })}
            </div>

            {tournamentIds.filter((id) => !completedSet.has(id)).length > 0 && (
              <p className="text-xs font-mono text-white/30 pt-3 text-center tracking-wider">
                Some tournaments are still in progress.
              </p>
            )}
          </section>
        )}
      </div>

      <StatusBar shardOnline>
        <span className="text-amber-400">HALL OF FAME</span>
        <span className="mx-2 text-[var(--color-text-muted)]">|</span>
        <span>CHAMPIONS: <span className="text-[var(--color-neon-violet)]">{totalChampions}</span></span>
      </StatusBar>
    </main>
  )
}
