'use client'
import { useState, useEffect, useCallback } from 'react'
import { LayoutGrid, List } from 'lucide-react'
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
  tournamentCode?: number | null
  [key: string]: unknown
}

type FilterTab = 'all' | 'live' | 'registration' | 'upcoming' | 'completed'

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'registration', label: 'Registration Open' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
]

const gameOptions: { value: string; label: string }[] = [
  { value: '', label: 'All Games' },
  { value: 'BGMI', label: 'BGMI' },
  { value: 'FREE_FIRE', label: 'Free Fire' },
  { value: 'COD_MOBILE', label: 'COD Mobile' },
]

function matchesTab(status: string, tab: FilterTab): boolean {
  if (tab === 'all') return true
  if (tab === 'live') return status === 'LIVE'
  if (tab === 'registration') return status === 'REGISTRATION_OPEN'
  if (tab === 'upcoming') return ['DRAFT', 'REGISTRATION_CLOSED', 'CHECK_IN'].includes(status)
  if (tab === 'completed') return status === 'COMPLETED'
  return true
}

interface TournamentCatalogueProps {
  tournaments: TournamentItem[]
  guildId: string
}

export function TournamentCatalogue({ tournaments, guildId }: TournamentCatalogueProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isGrid, setIsGrid] = useState(true)

  // 300ms debounce on search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const filtered = tournaments.filter((t) => {
    if (!matchesTab(t.status, activeTab)) return false
    if (selectedGame && t.game !== selectedGame) return false
    if (debouncedSearch && !t.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    return true
  })

  const handleTabChange = useCallback((tab: FilterTab) => setActiveTab(tab), [])

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="font-display text-4xl font-black text-white mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tournaments
          </h1>
          <p className="text-[var(--color-text-secondary)]">Find and register for upcoming competitions</p>
        </div>

        {/* Controls row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Tournament filter">
            {filterTabs.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => handleTabChange(key)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === key
                    ? 'bg-[#7c3aed] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <input
              type="search"
              placeholder="Search tournaments…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search tournaments"
              className="w-48 sm:w-56 px-3 py-1.5 rounded-lg text-sm text-white placeholder-[var(--color-text-muted)] bg-white/5 border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(124,58,237,0.5)] focus:bg-white/8"
            />

            {/* Game filter */}
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              aria-label="Filter by game"
              className="px-3 py-1.5 rounded-lg text-sm text-white bg-white/5 border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(124,58,237,0.5)] cursor-pointer"
            >
              {gameOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1a2e]">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div className="flex items-center gap-1 border border-[rgba(255,255,255,0.08)] rounded-lg p-0.5">
              <button
                onClick={() => setIsGrid(true)}
                aria-label="Grid view"
                aria-pressed={isGrid}
                className={`p-1.5 rounded-md transition-colors ${isGrid ? 'bg-[#7c3aed] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setIsGrid(false)}
                aria-label="List view"
                aria-pressed={!isGrid}
                className={`p-1.5 rounded-md transition-colors ${!isGrid ? 'bg-[#7c3aed] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          {filtered.length} tournament{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Grid / List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-2xl mb-2" aria-hidden="true">🎮</p>
            <p className="text-[var(--color-text-secondary)] text-lg font-medium">No tournaments found</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div
            className={
              isGrid
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'flex flex-col gap-4'
            }
          >
            {filtered.map((t) => (
              <TournamentCard
                key={t.id}
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
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
