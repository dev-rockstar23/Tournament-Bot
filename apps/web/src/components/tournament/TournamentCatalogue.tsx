'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react'
import { TournamentCard } from './TournamentCard'

type Game = 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE'

interface TournamentItem {
  id: string
  guildId: string
  name: string
  game: Game
  mode: string
  status: string
  entryType: string
  capacity?: number
  teamCapacity?: number
  acceptedCount: number
  registrationOpen?: string | null
  registrationOpenAt?: string | null
  registrationClose?: string | null
  registrationCloseAt?: string | null
  startAt: string | null
  endAt: string | null
  bannerUrl: string | null
  tournamentCode?: string | null
  [key: string]: unknown
}

type FilterTab = 'all' | 'live' | 'registration' | 'upcoming' | 'completed'

const filterTabs: { key: FilterTab; label: string; dot?: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'live',         label: 'Live',             dot: '#ef4444' },
  { key: 'registration', label: 'Registration Open', dot: '#22d3ee' },
  { key: 'upcoming',     label: 'Upcoming',          dot: '#f59e0b' },
  { key: 'completed',    label: 'Completed',         dot: '#22c55e' },
]

const gameOptions = [
  { value: '', label: 'All Games' },
  { value: 'BGMI', label: 'BGMI' },
  { value: 'FREE_FIRE', label: 'Free Fire' },
  { value: 'COD_MOBILE', label: 'COD Mobile' },
]

function matchesTab(status: string, tab: FilterTab): boolean {
  if (tab === 'all')          return true
  if (tab === 'live')         return status === 'LIVE'
  if (tab === 'registration') return status === 'REGISTRATION_OPEN'
  if (tab === 'upcoming')     return ['DRAFT','REGISTRATION_CLOSED','CHECK_IN'].includes(status)
  if (tab === 'completed')    return status === 'COMPLETED'
  return true
}

const stagger = { visible: { transition: { staggerChildren: 0.06 } } }
const cardAnim = { hidden: { opacity: 0, y: 24, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22,1,0.36,1] } } }

export function TournamentCatalogue({ tournaments, guildId }: { tournaments: TournamentItem[]; guildId: string }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedGame, setSelectedGame] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isGrid, setIsGrid] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 280)
    return () => clearTimeout(t)
  }, [searchInput])

  const filtered = tournaments.filter(t => {
    if (!matchesTab(t.status, activeTab)) return false
    if (selectedGame && t.game !== selectedGame) return false
    if (debouncedSearch && !t.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    return true
  })

  const handleTab = useCallback((tab: FilterTab) => setActiveTab(tab), [])

  // Live count
  const liveCount = tournaments.filter(t => t.status === 'LIVE').length

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-[1400px] mx-auto px-6 py-10">

        {/* ── Page header ── */}
        <div className="flex flex-col gap-3 mb-10">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-black text-[#f1f5f9]"
              style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(1.4rem,3vw,2rem)' }}>
              TOURNAMENT CATALOGUE
            </h1>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="size-[5px] rounded-full bg-[#ef4444] animate-pulse" aria-hidden />
                {liveCount} LIVE NOW
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#475569]">
            {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''} — find and join upcoming competitions
          </p>
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Tournament filter">
            {filterTabs.map(({ key, label, dot }) => {
              const isActive = activeTab === key
              return (
                <button key={key} role="tab" aria-selected={isActive}
                  onClick={() => handleTab(key)}
                  className="relative flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200"
                  style={{
                    background: isActive ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? '#f1f5f9' : '#475569',
                    border: `1px solid ${isActive ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: isActive ? '0 0 16px rgba(124,58,237,0.15)' : 'none',
                  }}>
                  {dot && <span className={`size-[5px] rounded-full shrink-0 ${isActive ? 'animate-pulse' : ''}`}
                    style={{ background: dot }} aria-hidden />}
                  {label}
                </button>
              )
            })}
          </div>

          {/* Search + game filter + view toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]" />
              <input type="search" placeholder="Search tournaments…"
                value={searchInput} onChange={e => setSearchInput(e.target.value)}
                aria-label="Search tournaments"
                className="w-full pl-8 pr-3 py-2 rounded-[8px] text-[12px] text-[#f1f5f9] transition-all focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }} />
            </div>

            {/* Game filter */}
            <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)}
              aria-label="Filter by game"
              className="px-3 py-2 rounded-[8px] text-[12px] text-[#94a3b8] cursor-pointer transition-all focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'inherit' }}>
              {gameOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#0d0d1a]">{opt.label}</option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-1 p-1 rounded-[8px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[{ v: true, Icon: LayoutGrid }, { v: false, Icon: List }].map(({ v, Icon }) => (
                <button key={`${v}`} onClick={() => setIsGrid(v)} aria-label={v ? 'Grid view' : 'List view'}
                  className="p-1.5 rounded-[6px] transition-colors"
                  style={{ background: isGrid === v ? '#7c3aed' : 'transparent', color: isGrid === v ? '#fff' : '#475569' }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-[11px] text-[#334155] mb-5" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Content */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-28 gap-4">
              <div className="size-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <SlidersHorizontal size={22} className="text-[#7c3aed]" />
              </div>
              <p className="text-[#64748b] text-base font-medium">No tournaments match your filters</p>
              <p className="text-[#334155] text-[13px]">Try adjusting the status filter or search query.</p>
            </motion.div>
          ) : (
            <motion.div key={`${activeTab}-${selectedGame}`}
              className={isGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-4'}
              variants={stagger} initial="hidden" animate="visible">
              {filtered.map(t => (
                <motion.div key={t.id} variants={cardAnim}>
                  <TournamentCard
                    id={t.id}
                    guildId={guildId}
                    name={t.name}
                    game={t.game}
                    mode={t.mode}
                    status={t.status}
                    capacity={t.capacity ?? t.teamCapacity ?? 0}
                    acceptedCount={t.acceptedCount}
                    registrationClose={t.registrationClose ?? t.registrationCloseAt ?? null}
                    startAt={t.startAt}
                    bannerUrl={t.bannerUrl}
                    tournamentCode={t.tournamentCode}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
