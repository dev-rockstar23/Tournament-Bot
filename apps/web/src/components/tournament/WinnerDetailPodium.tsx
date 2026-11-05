'use client'

import { motion } from 'framer-motion'
import { Trophy, Zap, Star, Flame, Medal } from 'lucide-react'

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

const podiumConfig = [
  { rank: 2, height: 160, delay: 0.15, color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', label: '2ND', emoji: '🥈' },
  { rank: 1, height: 220, delay: 0,    color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  label: '1ST', emoji: '🥇' },
  { rank: 3, height: 120, delay: 0.25, color: '#cd7c32', glow: 'rgba(205,124,50,0.3)',  label: '3RD', emoji: '🥉' },
]

function awardIcon(type: string) {
  switch (type) {
    case 'CHAMPION':    return <Trophy size={18} className="text-[#f59e0b]" />
    case 'RUNNER_UP':   return <Medal size={18} className="text-[#94a3b8]" />
    case 'THIRD_PLACE': return <Medal size={18} className="text-[#cd7c32]" />
    case 'MVP':         return <Star size={18} className="text-[#22d3ee]" />
    case 'TOP_FRAGGER': return <Flame size={18} className="text-[#ef4444]" />
    default:            return <Zap size={18} className="text-[#9f5bff]" />
  }
}

function awardAccent(type: string) {
  switch (type) {
    case 'CHAMPION':    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  ring: 'rgba(245,158,11,0.2)' }
    case 'RUNNER_UP':   return { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', ring: 'rgba(148,163,184,0.2)' }
    case 'THIRD_PLACE': return { color: '#cd7c32', bg: 'rgba(205,124,50,0.08)',  ring: 'rgba(205,124,50,0.2)' }
    case 'MVP':         return { color: '#22d3ee', bg: 'rgba(34,211,238,0.08)',  ring: 'rgba(34,211,238,0.2)' }
    case 'TOP_FRAGGER': return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   ring: 'rgba(239,68,68,0.2)' }
    default:            return { color: '#9f5bff', bg: 'rgba(159,91,255,0.08)',  ring: 'rgba(159,91,255,0.2)' }
  }
}

export function WinnerDetailPodium({ winners, awards, standings }: WinnerDetailPodiumProps) {
  return (
    <div className="flex flex-col gap-16">

      {/* ═══════════════ PODIUM ═══════════════ */}
      <section aria-labelledby="podium-heading">
        <h2 id="podium-heading" className="sr-only">Final Standings</h2>

        {/* Cinematic podium */}
        <div className="relative flex items-end justify-center gap-4 sm:gap-8 py-12">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(124,58,237,0.12) 0%,transparent 70%)',
          }} />

          {podiumConfig.map(({ rank, height, delay, color, glow, label, emoji }) => {
            const entry = winners.find(w => w.placement === rank)
            const isFirst = rank === 1
            return (
              <motion.div key={rank}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
                className={`flex flex-col items-center gap-3 ${isFirst ? 'podium-first' : rank === 2 ? 'podium-second' : 'podium-third'}`}>

                {/* Rank badge above pillar */}
                {isFirst && (
                  <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    className="flex items-center justify-center rounded-full size-10"
                    style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }}>
                    <Trophy size={18} className="text-[#f59e0b]" />
                  </motion.div>
                )}

                {/* Team name plate */}
                <div className="flex flex-col items-center gap-1 text-center px-2">
                  <span className="text-2xl">{emoji}</span>
                  {entry ? (
                    <>
                      <p className="font-black text-[13px] text-[#f1f5f9] leading-tight"
                        style={{ fontFamily: 'var(--font-orbitron)' }}>
                        {entry.team.name}
                      </p>
                      {entry.team.tag && (
                        <p className="text-[10px] text-[#64748b]">[{entry.team.tag}]</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-[#334155]">—</p>
                  )}
                </div>

                {/* Pillar */}
                <div className="relative w-28 sm:w-36 rounded-t-[12px] flex flex-col items-center justify-end pb-4"
                  style={{
                    height,
                    background: isFirst
                      ? `linear-gradient(180deg, ${color}25 0%, ${color}10 100%)`
                      : `rgba(255,255,255,0.03)`,
                    border: `1px solid ${color}40`,
                    borderBottom: 'none',
                    boxShadow: isFirst ? `0 0 40px ${glow}, 0 0 80px ${glow}40` : `0 0 12px ${glow}`,
                  }}>
                  <span className="font-black text-[11px] tracking-widest"
                    style={{ fontFamily: 'var(--font-jetbrains)', color }}>
                    {label}
                  </span>
                  {/* Scanline */}
                  <div className="absolute inset-0 scanline-overlay rounded-t-[12px]" aria-hidden />
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ═══════════════ AWARDS ═══════════════ */}
      {awards.length > 0 && (
        <section aria-labelledby="awards-heading">
          <h2 id="awards-heading" className="font-black text-[18px] text-[#f1f5f9] mb-5"
            style={{ fontFamily: 'var(--font-orbitron)' }}>
            AWARDS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {awards.map((award, i) => {
              const acc = awardAccent(award.type)
              return (
                <motion.div key={award.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-4 p-5 rounded-[16px]"
                  style={{ background: acc.bg, border: `1px solid ${acc.ring}`, backdropFilter: 'blur(12px)' }}>
                  <div className="shrink-0 size-9 flex items-center justify-center rounded-[8px]"
                    style={{ background: `${acc.color}14`, border: `1px solid ${acc.color}25` }}>
                    {awardIcon(award.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] text-[#f1f5f9]"
                      style={{ fontFamily: 'var(--font-orbitron)' }}>
                      {award.label}
                    </p>
                    {award.team && (
                      <p className="text-[12px] mt-0.5" style={{ color: acc.color }}>{award.team.name}</p>
                    )}
                    {award.criteria && (
                      <p className="text-[11px] text-[#475569] mt-0.5">{award.criteria}</p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══════════════ FULL STANDINGS ═══════════════ */}
      {standings.length > 0 && (
        <section aria-labelledby="standings-heading">
          <h2 id="standings-heading" className="font-black text-[18px] text-[#f1f5f9] mb-5"
            style={{ fontFamily: 'var(--font-orbitron)' }}>
            FULL STANDINGS
          </h2>
          <div className="rounded-[16px] overflow-hidden"
            style={{ background: 'rgba(8,8,18,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Full standings">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Rank', 'Team', 'Points', 'Kills', 'Games'].map((h, i) => (
                      <th key={h} className={`px-5 py-3.5 text-[10px] font-semibold tracking-widest uppercase text-[#334155] ${i > 1 ? 'text-right' : 'text-left'}`}
                        style={{ fontFamily: 'var(--font-jetbrains)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => {
                    const topThree = row.rank <= 3
                    const rankEmoji = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null
                    return (
                      <motion.tr key={row.teamId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.04 }}
                        className="liquid-table-row transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-5 py-3.5">
                          {rankEmoji ? (
                            <span className="text-base">{rankEmoji}</span>
                          ) : (
                            <span className="text-[12px] text-[#475569] font-mono">#{row.rank}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`font-bold text-[13px] ${topThree ? 'text-[#f1f5f9]' : 'text-[#64748b]'}`}
                            style={{ fontFamily: 'var(--font-orbitron)' }}>
                            {row.teamName ?? row.teamId}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[13px]"
                          style={{ color: topThree ? '#9f5bff' : '#475569' }}>
                          {row.totalPoints.toFixed(0)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[12px] text-[#475569]">
                          {row.totalKills}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[12px] text-[#475569]">
                          {row.matchesPlayed}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
