'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Plus, Calendar } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { Badge } from '@/components/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchRow {
  id: string
  number: number
  status: string
  scheduledStart: string
  scheduledEnd: string
  resultDeadline: string | null
  map: string | null
  mode: string | null
  stageId: string
}

export interface StageRow {
  id: string
  name: string
  matches: MatchRow[]
}

export interface TournamentWithMatches {
  id: string
  name: string
  status: string
  mapPool: string[]
  stages: StageRow[]
}

interface MatchSchedulerPanelProps {
  guildId: string
  tournaments: TournamentWithMatches[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchStatusVariant(
  status: string
): 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default' {
  switch (status) {
    case 'LIVE':
      return 'live'
    case 'SCHEDULED':
    case 'CHECK_IN':
    case 'READY':
      return 'upcoming'
    case 'COMPLETED':
      return 'completed'
    case 'CANCELLED':
    case 'FORFEIT':
      return 'cancelled'
    case 'POSTPONED':
    case 'AWAITING_RESULT':
    case 'UNDER_REVIEW':
    case 'DISPUTED':
      return 'draft'
    default:
      return 'default'
  }
}

function formatDatetime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Preview item type ────────────────────────────────────────────────────────

interface PreviewMatch {
  number: number
  scheduledStart: Date
  scheduledEnd: Date
  resultDeadline: Date
  map: string
  mode: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MatchSchedulerPanel({ guildId, tournaments }: MatchSchedulerPanelProps) {
  const router = useRouter()

  // Tournament selector
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    tournaments[0]?.id ?? ''
  )

  const selectedTournament = useMemo(
    () => tournaments.find((t) => t.id === selectedTournamentId) ?? null,
    [tournaments, selectedTournamentId]
  )

  const allMatches = useMemo<(MatchRow & { stageName: string })[]>(() => {
    if (!selectedTournament) return []
    return selectedTournament.stages.flatMap((s) =>
      s.matches.map((m) => ({ ...m, stageName: s.name }))
    )
  }, [selectedTournament])

  // ─── Bulk generation form state ───────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkCount, setBulkCount] = useState(4)
  const [bulkFirstStart, setBulkFirstStart] = useState('')
  const [bulkDuration, setBulkDuration] = useState(60)
  const [bulkGap, setBulkGap] = useState(15)
  const [bulkMap, setBulkMap] = useState('')
  const [bulkMode, setBulkMode] = useState('')
  const [bulkStageId, setBulkStageId] = useState('')
  const [bulkDeadline, setBulkDeadline] = useState(30)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewMatch[] | null>(null)

  // Sync stageId default when tournament changes
  const stageOptions = selectedTournament?.stages ?? []

  // ─── Preview generation ────────────────────────────────────────────────────
  const generatePreview = useCallback(() => {
    if (!bulkFirstStart) {
      toast.error('Please set a first match start time')
      return
    }
    const firstStart = new Date(bulkFirstStart)
    if (isNaN(firstStart.getTime())) {
      toast.error('Invalid start time')
      return
    }

    const slotMs = (bulkDuration + bulkGap) * 60_000
    const durationMs = bulkDuration * 60_000
    const deadlineMs = bulkDeadline * 60_000
    const items: PreviewMatch[] = []

    for (let i = 0; i < bulkCount; i++) {
      const scheduledStart = new Date(firstStart.getTime() + i * slotMs)
      const scheduledEnd = new Date(scheduledStart.getTime() + durationMs)
      const resultDeadline = new Date(scheduledEnd.getTime() + deadlineMs)
      items.push({
        number: i + 1,
        scheduledStart,
        scheduledEnd,
        resultDeadline,
        map: bulkMap || 'TBD',
        mode: bulkMode || 'TBD',
      })
    }
    setPreview(items)
  }, [bulkCount, bulkFirstStart, bulkDuration, bulkGap, bulkMap, bulkMode, bulkDeadline])

  // ─── Bulk create submit ────────────────────────────────────────────────────
  async function submitBulk() {
    if (!selectedTournamentId) {
      toast.error('No tournament selected')
      return
    }
    if (!bulkStageId) {
      toast.error('Please select a stage')
      return
    }
    if (!bulkFirstStart) {
      toast.error('Please set a first match start time')
      return
    }
    if (!bulkMap) {
      toast.error('Please enter a default map')
      return
    }
    if (!bulkMode) {
      toast.error('Please enter a default mode')
      return
    }

    setBulkLoading(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/tournaments/${selectedTournamentId}/matches/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: bulkCount,
            firstMatchStart: new Date(bulkFirstStart).toISOString(),
            durationMinutes: bulkDuration,
            gapMinutes: bulkGap,
            defaultMap: bulkMap,
            defaultMode: bulkMode,
            stageId: bulkStageId,
            resultDeadlineMinutes: bulkDeadline,
          }),
        }
      )

      const data = (await res.json()) as { matches?: unknown[]; error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create matches')
        return
      }

      toast.success(`Created ${(data.matches ?? []).length} match(es) successfully`)
      setBulkOpen(false)
      setPreview(null)
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setBulkLoading(false)
    }
  }

  const COUNT_OPTIONS = [1, 2, 3, 4, 6, 8, 10]

  return (
    <div className="space-y-6">
      {/* Tournament selector */}
      <GlassCard hover={false} className="p-4">
        <label htmlFor="tournament-select" className="block text-sm font-medium text-white/70 mb-2">
          Tournament
        </label>
        <select
          id="tournament-select"
          value={selectedTournamentId}
          onChange={(e) => {
            setSelectedTournamentId(e.target.value)
            setBulkStageId('')
            setPreview(null)
          }}
          className="w-full max-w-sm px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
        >
          <option value="" className="bg-[#0f0f19]">
            Select a tournament
          </option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id} className="bg-[#0f0f19]">
              {t.name}
            </option>
          ))}
        </select>
      </GlassCard>

      {/* Match list table */}
      <GlassCard hover={false} className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-white/50 text-sm">
            {allMatches.length} match{allMatches.length !== 1 ? 'es' : ''}
          </p>
          {selectedTournament && (
            <GlowButton
              variant="primary"
              size="sm"
              onClick={() => setBulkOpen((v) => !v)}
            >
              <Plus size={14} aria-hidden="true" />
              Bulk Generate
            </GlowButton>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-white/10">
                {['Stage', 'Match #', 'Status', 'Scheduled Start', 'Map', 'Mode'].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {allMatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-white/40 text-sm">
                      {selectedTournament
                        ? 'No matches yet — use Bulk Generate to create them'
                        : 'Select a tournament to view its matches'}
                    </p>
                  </td>
                </tr>
              ) : (
                allMatches.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white/70">{m.stageName}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      #{m.number}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={matchStatusVariant(m.status)}>
                        {m.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70">
                      {formatDatetime(m.scheduledStart)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {m.map ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {m.mode ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ─── Bulk generation collapsible panel ────────────────────────────── */}
      {selectedTournament && (
        <GlassCard hover={false} className="overflow-hidden">
          <button
            type="button"
            onClick={() => setBulkOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            aria-expanded={bulkOpen}
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-violet-400" aria-hidden="true" />
              <span className="text-sm font-semibold text-white">Bulk Match Generator</span>
            </div>
            {bulkOpen ? (
              <ChevronUp size={16} className="text-white/50" aria-hidden="true" />
            ) : (
              <ChevronDown size={16} className="text-white/50" aria-hidden="true" />
            )}
          </button>

          {bulkOpen && (
            <div className="border-t border-white/10 p-4 space-y-5">
              {/* Row 1: Count button group */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">
                  Match Count
                </label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Match count">
                  {COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBulkCount(n)}
                      className={[
                        'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                        bulkCount === n
                          ? 'bg-violet-500 border-violet-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10',
                      ].join(' ')}
                      aria-pressed={bulkCount === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Stage + First match start */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="bulk-stage"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    Stage
                  </label>
                  <select
                    id="bulk-stage"
                    value={bulkStageId}
                    onChange={(e) => setBulkStageId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="" className="bg-[#0f0f19]">
                      Select stage
                    </option>
                    {stageOptions.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0f0f19]">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="bulk-first-start"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    First Match Start
                  </label>
                  <input
                    id="bulk-first-start"
                    type="datetime-local"
                    value={bulkFirstStart}
                    onChange={(e) => {
                      setBulkFirstStart(e.target.value)
                      setPreview(null)
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Row 3: Duration + Gap */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="bulk-duration"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    Duration (min)
                  </label>
                  <input
                    id="bulk-duration"
                    type="number"
                    min={5}
                    max={480}
                    value={bulkDuration}
                    onChange={(e) => {
                      setBulkDuration(Number(e.target.value))
                      setPreview(null)
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="bulk-gap"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    Gap (min)
                  </label>
                  <input
                    id="bulk-gap"
                    type="number"
                    min={0}
                    max={120}
                    value={bulkGap}
                    onChange={(e) => {
                      setBulkGap(Number(e.target.value))
                      setPreview(null)
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="bulk-deadline"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    Result Deadline (min)
                  </label>
                  <input
                    id="bulk-deadline"
                    type="number"
                    min={5}
                    max={1440}
                    value={bulkDeadline}
                    onChange={(e) => setBulkDeadline(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Row 4: Map + Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="bulk-map"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    Default Map
                  </label>
                  {selectedTournament.mapPool.length > 0 ? (
                    <select
                      id="bulk-map"
                      value={bulkMap}
                      onChange={(e) => setBulkMap(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                    >
                      <option value="" className="bg-[#0f0f19]">
                        Select map
                      </option>
                      {selectedTournament.mapPool.map((m) => (
                        <option key={m} value={m} className="bg-[#0f0f19]">
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="bulk-map"
                      type="text"
                      value={bulkMap}
                      onChange={(e) => setBulkMap(e.target.value)}
                      placeholder="e.g. Erangel"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="bulk-mode"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    Default Mode
                  </label>
                  <input
                    id="bulk-mode"
                    type="text"
                    value={bulkMode}
                    onChange={(e) => setBulkMode(e.target.value)}
                    placeholder="e.g. Battle Royale"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <GlowButton
                  variant="ghost"
                  size="sm"
                  onClick={generatePreview}
                  disabled={bulkLoading}
                  type="button"
                >
                  Generate Preview
                </GlowButton>
                <GlowButton
                  variant="primary"
                  size="sm"
                  onClick={submitBulk}
                  disabled={bulkLoading || !bulkStageId}
                  type="button"
                >
                  {bulkLoading ? 'Creating…' : `Create ${bulkCount} Match${bulkCount !== 1 ? 'es' : ''}`}
                </GlowButton>
              </div>

              {/* Preview timeline */}
              {preview && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    Preview Timeline
                  </p>
                  <div className="space-y-2">
                    {preview.map((item, idx) => (
                      <GlassCard
                        key={idx}
                        hover={false}
                        className="p-3 flex items-center gap-4"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-violet-300">
                            #{item.number}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">
                            {item.scheduledStart.toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-xs text-white/50">
                            {item.map} · {item.mode}
                          </p>
                        </div>
                        <p className="text-xs text-white/40 whitespace-nowrap">
                          {bulkDuration} min
                        </p>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
