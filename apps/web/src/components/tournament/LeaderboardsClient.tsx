'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Crown, Target, Zap } from 'lucide-react'

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

const gameTabs: { key: Game; label: string; color: string }[] = [
  { key: 'all',       label: 'All Games',  color: '#9f5bff' },
  { key: 'BGMI',      label: 'BGMI',       color: '#22d3ee' },
  { key: 'FREE_FIRE', label: 'Free Fire',  color: '#f97316' },
  { key: 'COD_MOBILE',label: 'COD Mobile', color: '#a855f7' },
]

const gameColor: Record<string, string> = {
  BGMI: '#22d3ee', FREE_FIRE: '#f97316', COD_MOBILE: '#a855f7',
}

const gameLabel: Record<string, string> = {
  BGMI: 'BGMI', FREE_FIRE: 'Free Fire', COD_MOBILE: 'COD Mobile',
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="inline-flex items-center justify-center size-7 rounded-full text-base"
      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
      aria-label="1st">🥇</span>
  )
  if (rank === 2) return (
    <span className="inline-flex items-center justify-center size-7 rounded-full text-base"
      style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' }}
      aria-label="2nd">🥈</span>
  )
  if (rank === 3) return (
    <span className="inline-flex items-center justify-center size-7 rounded-full text-base"
      style={{ background: 'rgba(205,124,50,0.1)', border: '1px solid rgba(205,124,50,0.2)' }}
      aria-label="3rd">🥉</span>
  )
  return (
    <span className="inline-flex items-center justify-center size-7 text-[12px] font-mono text-[#475569]">
      #{rank}
    </span>
  )
}

export function LeaderboardsClient({ rows }: { rows: LeaderboardRow[] }) {
  const [activeGame, setActiveGame] = useState<Game>('all')

  const filtered = activeGame === 'all' ? rows : rows.filter(r => r.game === activeGame)
  const ranked = filtered.map((r, i) => ({ ...r, rank: i + 1 }))

  const activeTab = gameTabs.find(t => t.key === activeGame)!

  return (
    <div className="flex flex-col gap-8">

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Filter by game">
        {gameTabs.map(({ key, label, color }) => {
          const isActive = activeGame === key
          return (
            <button key={key} role="tab" aria-selected={isActive}
              onClick={() => setActiveGame(key)}
              className="relative px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200"
              style={{
                background: isActive ? `${color}14` : 'rgba(255,255,255,0.04)',
                color: isActive ? color : '#475569',
                border: `1px solid ${isActive ? `${color}35` : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isActive ? `0 0 16px ${color}25` : 'none',
              }}>
              {isActive && (
                <motion.span layoutId="lb-tab-indicator"
                  className="absolute inset-0 rounded-full"
                  style={{ background: `${color}10` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {ranked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="size-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <Crown size={24} className="text-[#7c3aed]" />
          </div>
          <p className="text-[#94a3b8] text-base font-semibold">No leaderboard data yet</p>
          <p className="text-[#475569] text-[13px]">Standings populate once tournaments complete.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeGame} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>

            {/* Top-3 hero cards */}
            {ranked.length >= 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {ranked.slice(0, 3).map((row, i) => {
                  const medals = ['🥇','🥈','🥉']
                  const colors = ['#f59e0b','#94a3b8','#cd7c32']
                  const heights = ['order-first sm:order-none','sm:order-first','sm:order-last']
                  return (
                    <motion.div key={row.teamId}
                      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`flex flex-col items-center gap-3 p-5 rounded-[16px] text-center ${heights[i]}`}
                      style={{
                        background: `${colors[i]}08`,
                        border: `1px solid ${colors[i]}25`,
                        boxShadow: i === 0 ? `0 0 32px ${colors[i]}15` : 'none',
                      }}>
                      <span className="text-3xl">{medals[i]}</span>
                      <div>
                        <p className="font-black text-[14px] text-[#f1f5f9]"
                          style={{ fontFamily: 'var(--font-orbitron)' }}>
                          {row.name}
                        </p>
                        {row.tag && <p className="text-[10px] text-[#475569] mt-0.5">[{row.tag}]</p>}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] font-mono"
                        style={{ color: colors[i] }}>
                        <Zap size={12} />
                        {row.totalPoints} pts
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <div className="rounded-[16px] overflow-hidden"
              style={{ background: 'rgba(8,8,18,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Leaderboard">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['#', 'Team', ...(activeGame === 'all' ? ['Game'] : []), 'Events', 'Points', 'Kills', 'Best'].map((h, i) => (
                        <th key={h} className={`px-4 py-3.5 text-[10px] font-medium tracking-widest uppercase text-[#334155] ${i > 1 ? 'text-right' : 'text-left'}`}
                          style={{ fontFamily: 'var(--font-jetbrains)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((row, i) => (
                      <motion.tr key={`${row.teamId}-${row.game}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.03 }}
                        className="liquid-table-row"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-4 py-3">
                          <RankBadge rank={row.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[13px] text-[#f1f5f9]"
                            style={{ fontFamily: 'var(--font-orbitron)' }}>
                            {row.name}
                          </p>
                          {row.tag && <p className="text-[10px] text-[#334155]">[{row.tag}]</p>}
                        </td>
                        {activeGame === 'all' && (
                          <td className="px-4 py-3 text-right">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                              style={{ color: gameColor[row.game] ?? '#64748b', background: `${gameColor[row.game] ?? '#64748b'}12` }}>
                              {gameLabel[row.game] ?? row.game}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-[#475569]">
                          {row.tournamentsPlayed}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[13px]"
                          style={{ color: row.rank <= 3 ? activeTab.color : '#64748b' }}>
                          {row.totalPoints}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-[#475569]">
                          {row.totalKills}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-[#475569]">
                          {row.bestPlacement !== null ? `#${row.bestPlacement}` : '—'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
