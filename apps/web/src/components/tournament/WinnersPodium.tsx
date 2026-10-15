'use client'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { format } from 'date-fns'

type Game = 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE'

interface WinnerRecord {
  id: string
  placement: number
  tournamentId: string
  tournament: { id: string; name: string; game: Game; endAt: Date | null }
  team: { name: string; tag: string | null }
}

interface WinnersPodiumProps {
  winners: WinnerRecord[]
}

// Group by tournamentId
function groupByTournament(winners: WinnerRecord[]) {
  const map = new Map<string, { tournament: WinnerRecord['tournament']; placements: WinnerRecord[] }>()
  for (const w of winners) {
    const existing = map.get(w.tournamentId)
    if (existing) {
      existing.placements.push(w)
    } else {
      map.set(w.tournamentId, { tournament: w.tournament, placements: [w] })
    }
  }
  // Sort placements within each tournament
  for (const entry of map.values()) {
    entry.placements.sort((a, b) => a.placement - b.placement)
  }
  return Array.from(map.values())
}

function getPlacementByRank(placements: WinnerRecord[], rank: number) {
  return placements.find((p) => p.placement === rank)
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

const placementLabel: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }

export function WinnersPodium({ winners }: WinnersPodiumProps) {
  if (winners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Trophy size={48} className="text-[var(--color-text-muted)] mb-4" aria-hidden="true" />
        <p className="text-[var(--color-text-secondary)] text-lg font-medium">No winners yet</p>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Champions will appear here after tournaments complete</p>
      </div>
    )
  }

  const grouped = groupByTournament(winners)

  // Use the most recent tournament for the podium spotlight
  const latest = grouped[0]
  const podiumEntries: [WinnerRecord | undefined, WinnerRecord | undefined, WinnerRecord | undefined] = [
    getPlacementByRank(latest.placements, 1),
    getPlacementByRank(latest.placements, 2),
    getPlacementByRank(latest.placements, 3),
  ]

  return (
    <div className="flex flex-col gap-12">
      {/* Podium spotlight for latest tournament */}
      {(podiumEntries[0] ?? podiumEntries[1] ?? podiumEntries[2]) && (
        <section aria-labelledby="podium-heading">
          <h2
            id="podium-heading"
            className="font-display text-xl font-bold text-white mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {latest.tournament.name}
          </h2>

          {/* Podium layout: 2nd | 1st | 3rd */}
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {/* 2nd */}
            <PodiumSlot entry={podiumEntries[1]} rank={2} height="h-36" delay={0.15} />
            {/* 1st */}
            <PodiumSlot entry={podiumEntries[0]} rank={1} height="h-48" delay={0} highlight />
            {/* 3rd */}
            <PodiumSlot entry={podiumEntries[2]} rank={3} height="h-28" delay={0.25} />
          </div>
        </section>
      )}

      {/* Full winners list */}
      <section aria-labelledby="winners-list-heading">
        <h2
          id="winners-list-heading"
          className="font-display text-xl font-bold text-white mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          All Results
        </h2>
        <div className="flex flex-col gap-4">
          {grouped.map(({ tournament, placements }, tIdx) => (
            <GlassCard key={tournament.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3
                    className="font-display text-base font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {tournament.name}
                  </h3>
                  {tournament.endAt && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {format(tournament.endAt, 'PP')}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${gameBadgeClass[tournament.game] ?? 'bg-violet-500/15 border-violet-500/30 text-violet-400'}`}
                >
                  {gameLabels[tournament.game] ?? tournament.game}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {placements.map((w, wIdx) => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (tIdx * 3 + wIdx) * 0.1 }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-[var(--color-border)]"
                  >
                    <span className="text-lg w-8 text-center" aria-hidden="true">
                      {w.placement === 1 ? '🥇' : w.placement === 2 ? '🥈' : w.placement === 3 ? '🥉' : `#${w.placement}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-display text-sm font-bold text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {w.team.name}
                      </span>
                      {w.team.tag && (
                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">[{w.team.tag}]</span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {placementLabel[w.placement] ?? `#${w.placement}`}
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  )
}

interface PodiumSlotProps {
  entry: WinnerRecord | undefined
  rank: number
  height: string
  delay: number
  highlight?: boolean
}

function PodiumSlot({ entry, rank, height, delay, highlight }: PodiumSlotProps) {
  const rankLabel = placementLabel[rank] ?? `#${rank}`
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center gap-2 w-28 sm:w-36"
    >
      {/* Card */}
      <div
        className={[
          'w-full rounded-2xl flex flex-col items-center justify-end pb-4 pt-3 px-2',
          height,
          highlight
            ? 'bg-gradient-to-b from-violet-600/30 to-violet-900/40 border border-violet-500/40 shadow-[0_0_24px_rgba(124,58,237,0.4)]'
            : 'bg-white/5 border border-[rgba(255,255,255,0.08)]',
        ].join(' ')}
        aria-label={entry ? `${rankLabel} place: ${entry.team.name}` : `${rankLabel} place: no entry`}
      >
        {rank === 1 && (
          <Trophy
            size={20}
            className="text-yellow-400 mb-1"
            aria-hidden="true"
          />
        )}
        <span className="text-2xl" aria-hidden="true">{rankEmoji}</span>
        {entry ? (
          <p
            className="font-display text-xs font-bold text-white text-center mt-1 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {entry.team.name}
          </p>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)] text-center mt-1">—</p>
        )}
      </div>
      {/* Rank label */}
      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{rankLabel}</span>
    </motion.div>
  )
}
