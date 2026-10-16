'use client'

import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

export interface WinnerEntry {
  id: string
  placement: number
  awardType: string
  team: { name: string; tag: string | null }
}

export interface AwardEntry {
  id: string
  type: string
  label: string
  criteria: string | null
  team: { name: string; tag: string | null } | null
}

export interface StandingRow {
  teamId: string
  rank: number
  totalPoints: number
  totalKills: number
  matchesPlayed: number
  bestPlacement: number | null
  teamName?: string
}

interface WinnerDetailPodiumProps {
  winners: WinnerEntry[]
  awards: AwardEntry[]
  standings: StandingRow[]
}

const STAGGER_DELAY = [0.15, 0, 0.25] // 2nd, 1st, 3rd

export function WinnerDetailPodium({ winners, awards, standings }: WinnerDetailPodiumProps) {
  const first = winners.find((w) => w.placement === 1)
  const second = winners.find((w) => w.placement === 2)
  const third = winners.find((w) => w.placement === 3)

  // Podium order: 2nd | 1st | 3rd
  const podiumSlots: { entry: WinnerEntry | undefined; rank: number; height: string; delay: number; highlight?: boolean }[] = [
    { entry: second, rank: 2, height: 'h-36', delay: STAGGER_DELAY[0] },
    { entry: first, rank: 1, height: 'h-52', delay: STAGGER_DELAY[1], highlight: true },
    { entry: third, rank: 3, height: 'h-28', delay: STAGGER_DELAY[2] },
  ]

  return (
    <div className="flex flex-col gap-14">
      {/* ── Cinematic podium ────────────────────────────────────── */}
      <section aria-labelledby="podium-heading">
        <h2
          id="podium-heading"
          className="font-display text-xl font-bold text-white mb-8 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Final Standings
        </h2>

        <div className="flex items-end justify-center gap-4 sm:gap-8">
          {podiumSlots.map(({ entry, rank, height, delay, highlight }) => (
            <motion.div
              key={rank}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay, ease: 'easeOut' }}
              className="flex flex-col items-center gap-3 w-28 sm:w-40"
            >
              {/* Column card */}
              <div
                className={[
                  'w-full rounded-2xl flex flex-col items-center justify-end pb-5 pt-4 px-3',
                  height,
                  highlight
                    ? 'bg-gradient-to-b from-violet-600/35 to-violet-900/45 border border-violet-500/50 shadow-[0_0_32px_rgba(124,58,237,0.5),0_0_64px_rgba(124,58,237,0.2)] animate-[glow-pulse_2s_ease-in-out_infinite]'
                    : 'bg-white/5 border border-[rgba(255,255,255,0.09)]',
                ].join(' ')}
                aria-label={
                  entry
                    ? `${rank === 1 ? 'Champion' : rank === 2 ? 'Runner-Up' : 'Third Place'}: ${entry.team.name}`
                    : `${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} place: no entry`
                }
              >
                {rank === 1 && (
                  <Trophy size={22} className="text-yellow-400 mb-1" aria-hidden="true" />
                )}
                <span className="text-3xl" aria-hidden="true">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </span>
                {entry ? (
                  <p
                    className="font-display text-sm font-black text-white text-center mt-2 leading-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {entry.team.name}
                    {entry.team.tag ? (
                      <span className="block text-xs font-normal text-white/50">
                        [{entry.team.tag}]
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-xs text-white/30 text-center mt-2">—</p>
                )}
              </div>
              {/* Rank label */}
              <span className="text-xs font-semibold text-white/50">
                {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Awards section ──────────────────────────────────────── */}
      {awards.length > 0 && (
        <section aria-labelledby="awards-heading">
          <h2
            id="awards-heading"
            className="font-display text-lg font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Awards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {awards.map((award, i) => (
              <motion.div
                key={award.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <GlassCard className="p-4" hover={false}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {awardEmoji(award.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-display text-sm font-bold text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {award.label}
                      </p>
                      {award.team && (
                        <p className="text-xs text-white/60 mt-0.5">{award.team.name}</p>
                      )}
                      {award.criteria && (
                        <p className="text-xs text-white/40 mt-0.5">{award.criteria}</p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Full standings table ─────────────────────────────────── */}
      {standings.length > 0 && (
        <section aria-labelledby="standings-heading">
          <h2
            id="standings-heading"
            className="font-display text-lg font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Full Standings
          </h2>
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">Team</th>
                    <th className="text-right px-4 py-3">Points</th>
                    <th className="text-right px-4 py-3">Kills</th>
                    <th className="text-right px-4 py-3">Games</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {standings.map((row, i) => (
                    <motion.tr
                      key={row.teamId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="text-white/80 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-white/60">
                        {row.rank === 1
                          ? '🥇'
                          : row.rank === 2
                          ? '🥈'
                          : row.rank === 3
                          ? '🥉'
                          : `#${row.rank}`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {row.teamName ?? row.teamId}
                      </td>
                      <td className="px-4 py-3 text-right text-violet-300 font-mono">
                        {row.totalPoints.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{row.totalKills}</td>
                      <td className="px-4 py-3 text-right font-mono">{row.matchesPlayed}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </section>
      )}
    </div>
  )
}

function awardEmoji(type: string): string {
  switch (type) {
    case 'CHAMPION': return '🏆'
    case 'RUNNER_UP': return '🥈'
    case 'THIRD_PLACE': return '🥉'
    case 'MVP': return '⭐'
    case 'TOP_FRAGGER': return '💥'
    case 'BEST_TEAM': return '🌟'
    default: return '🎖️'
  }
}
