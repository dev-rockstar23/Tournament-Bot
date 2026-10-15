'use client'
import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'

type Game = 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE' | 'all'

interface LeaderboardRow {
  teamId: string
  name: string
  tag: string | null
  game: string
  tournamentsPlayed: number
  totalPoints: number
  totalKills: number
  bestPlacement: number | null
}

interface LeaderboardsClientProps {
  rows: LeaderboardRow[]
}

const gameTabs: { key: Game; label: string }[] = [
  { key: 'all', label: 'All Games' },
  { key: 'BGMI', label: 'BGMI' },
  { key: 'FREE_FIRE', label: 'Free Fire' },
  { key: 'COD_MOBILE', label: 'COD Mobile' },
]

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span aria-label="1st place">🥇</span>
  if (rank === 2) return <span aria-label="2nd place">🥈</span>
  if (rank === 3) return <span aria-label="3rd place">🥉</span>
  return <span className="text-[var(--color-text-muted)]">#{rank}</span>
}

export function LeaderboardsClient({ rows }: LeaderboardsClientProps) {
  const [activeGame, setActiveGame] = useState<Game>('all')

  const filtered =
    activeGame === 'all'
      ? rows
      : rows.filter((r) => r.game === activeGame)

  // Re-rank after filter
  const ranked = filtered.map((r, idx) => ({ ...r, rank: idx + 1 }))

  return (
    <div className="flex flex-col gap-6">
      {/* Game tabs */}
      <div
        className="flex items-center gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Filter by game"
      >
        {gameTabs.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeGame === key}
            onClick={() => setActiveGame(key)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              activeGame === key
                ? 'bg-[#7c3aed] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[var(--color-text-secondary)] text-lg font-medium">No data yet</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Leaderboard populates after tournaments complete</p>
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Leaderboard table">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 font-medium w-12">Rank</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                  {activeGame === 'all' && (
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Game</th>
                  )}
                  <th className="px-4 py-3 font-medium text-right">Events</th>
                  <th className="px-4 py-3 font-medium text-right">Points</th>
                  <th className="px-4 py-3 font-medium text-right">Kills</th>
                  <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Best</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((row) => (
                  <tr
                    key={`${row.teamId}-${row.game}`}
                    className={[
                      'border-b border-[var(--color-border)] last:border-0 transition-colors',
                      row.rank <= 3
                        ? 'bg-white/3'
                        : 'hover:bg-white/2',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 font-bold text-lg">
                      <RankIcon rank={row.rank} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-display font-bold text-white text-sm"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {row.name}
                      </span>
                      {row.tag && (
                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">[{row.tag}]</span>
                      )}
                    </td>
                    {activeGame === 'all' && (
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden sm:table-cell text-xs">
                        {row.game === 'FREE_FIRE' ? 'Free Fire' : row.game === 'COD_MOBILE' ? 'COD Mobile' : row.game}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                      {row.tournamentsPlayed}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {row.totalPoints}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                      {row.totalKills}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] hidden sm:table-cell">
                      {row.bestPlacement !== null ? `#${row.bestPlacement}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
