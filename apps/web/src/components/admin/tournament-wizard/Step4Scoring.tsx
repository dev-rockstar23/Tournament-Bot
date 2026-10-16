'use client'

import { useState } from 'react'
import type { WizardState } from './TournamentWizard'

interface Step4Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

// Default placement points for BR games
const DEFAULT_BR_POINTS = [
  { placement: 1, points: 15 },
  { placement: 2, points: 12 },
  { placement: 3, points: 10 },
  { placement: 4, points: 8 },
  { placement: 5, points: 6 },
  { placement: 6, points: 4 },
  { placement: 7, points: 3 },
  { placement: 8, points: 2 },
  { placement: 9, points: 1 },
  { placement: 10, points: 1 },
]

const COD_MAPS = ['Hardpoint', 'Search & Destroy', 'Control', 'Domination', 'TDM', 'Kill Confirmed']

const TIE_BREAKER_OPTIONS = ['Total Kills', 'Placement Points', 'Most Wins', 'Headshots', 'Survival Time']

// ─── BR Scoring (BGMI / FREE_FIRE BR) ────────────────────────────────────────

function BRScoring({ state, onChange }: Step4Props) {
  const config = (state.scoringConfig as {
    placementPoints?: { placement: number; points: number }[]
    killValue?: number
    tieBreakers?: string[]
  }) || {}

  const rows = config.placementPoints ?? DEFAULT_BR_POINTS
  const killValue = config.killValue ?? 1
  const tieBreakers: string[] = config.tieBreakers ?? ['Total Kills', 'Placement Points']

  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function updateConfig(patch: Record<string, unknown>) {
    onChange({ scoringConfig: { ...config, ...patch } })
  }

  function updateRow(idx: number, points: number) {
    const updated = rows.map((r, i) => (i === idx ? { ...r, points } : r))
    updateConfig({ placementPoints: updated })
  }

  function loadDefaults() {
    updateConfig({ placementPoints: DEFAULT_BR_POINTS, killValue: 1 })
  }

  // Drag-and-drop for tie-breakers
  function onDragStart(idx: number) {
    setDragIndex(idx)
  }

  function onDragOver(e: React.DragEvent, targetIdx: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIdx) return
    const reordered = [...tieBreakers]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIdx, 0, moved)
    updateConfig({ tieBreakers: reordered })
    setDragIndex(targetIdx)
  }

  return (
    <div className="space-y-6">
      {/* Placement Points Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-white/80">Placement Points</label>
          <button
            type="button"
            onClick={loadDefaults}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Load Defaults
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-4 py-2 text-left text-xs text-white/50">Placement</th>
                <th className="px-4 py-2 text-left text-xs text-white/50">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white/60">#{row.placement}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.points}
                      onChange={(e) => updateRow(idx, parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kill Value */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">Kill Point Value</label>
        <input
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={killValue}
          onChange={(e) => updateConfig({ killValue: parseFloat(e.target.value) || 0 })}
          className="w-24 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>

      {/* Tie-breaker order */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Tie-Breaker Order</label>
        <p className="text-xs text-white/40">Drag to reorder priority</p>
        <div className="space-y-1">
          {TIE_BREAKER_OPTIONS.map((tb, _idx) => {
            const activeIdx = tieBreakers.indexOf(tb)
            const isActive = activeIdx !== -1
            return (
              <div
                key={tb}
                draggable={isActive}
                onDragStart={() => isActive && onDragStart(activeIdx)}
                onDragOver={(e) => isActive && onDragOver(e, activeIdx)}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors',
                  isActive
                    ? 'bg-violet-500/10 border-violet-500/20 text-white cursor-grab'
                    : 'bg-white/5 border-white/5 text-white/30',
                ].join(' ')}
              >
                {isActive && (
                  <span className="text-white/30 select-none">⠿</span>
                )}
                {isActive && (
                  <span className="w-5 h-5 rounded-full bg-violet-600/40 flex items-center justify-center text-xs text-violet-300">
                    {activeIdx + 1}
                  </span>
                )}
                <span>{tb}</span>
                {!isActive && (
                  <button
                    type="button"
                    className="ml-auto text-xs text-violet-400 hover:text-violet-300"
                    onClick={() => updateConfig({ tieBreakers: [...tieBreakers, tb] })}
                  >
                    Add
                  </button>
                )}
                {isActive && (
                  <button
                    type="button"
                    className="ml-auto text-xs text-white/30 hover:text-red-400"
                    onClick={() => updateConfig({ tieBreakers: tieBreakers.filter((t) => t !== tb) })}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Clash Squad Scoring ──────────────────────────────────────────────────────

function ClashSquadScoring({ state, onChange }: Step4Props) {
  const config = (state.scoringConfig as { roundWinThreshold?: number; bestOf?: number }) || {}

  function updateConfig(patch: Record<string, unknown>) {
    onChange({ scoringConfig: { ...config, ...patch } })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">Round Win Threshold</label>
        <input
          type="number"
          min={1}
          max={10}
          value={config.roundWinThreshold ?? 4}
          onChange={(e) => updateConfig({ roundWinThreshold: parseInt(e.target.value, 10) || 4 })}
          className="w-24 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Best Of</label>
        <div className="flex gap-2">
          {[1, 3, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => updateConfig({ bestOf: n })}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                config.bestOf === n
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
              ].join(' ')}
            >
              BO{n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── COD Multiplayer Scoring ──────────────────────────────────────────────────

function CODMultiplayerScoring({ state, onChange }: Step4Props) {
  const config = (state.scoringConfig as { bestOf?: number; mapPool?: string[] }) || {}

  function updateConfig(patch: Record<string, unknown>) {
    onChange({ scoringConfig: { ...config, ...patch } })
  }

  const mapPool: string[] = config.mapPool ?? []

  function toggleMap(map: string) {
    const updated = mapPool.includes(map)
      ? mapPool.filter((m) => m !== map)
      : [...mapPool, map]
    updateConfig({ mapPool: updated })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Best Of</label>
        <div className="flex gap-2">
          {[1, 3, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => updateConfig({ bestOf: n })}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                config.bestOf === n
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
              ].join(' ')}
            >
              <input
                type="radio"
                name="bestOf"
                value={n}
                checked={config.bestOf === n}
                onChange={() => updateConfig({ bestOf: n })}
                className="sr-only"
              />
              BO{n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Map Pool</label>
        <div className="flex flex-wrap gap-2">
          {COD_MAPS.map((map) => (
            <label
              key={map}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors',
                mapPool.includes(map)
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={mapPool.includes(map)}
                onChange={() => toggleMap(map)}
                className="rounded accent-blue-500"
              />
              {map}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Step4 ───────────────────────────────────────────────────────────────

export function Step4Scoring({ state, onChange }: Step4Props) {
  const isBR =
    state.game === 'BGMI' ||
    (state.game === 'FREE_FIRE' && state.mode === 'BATTLE_ROYALE')
  const isClashSquad =
    state.game === 'FREE_FIRE' && state.mode === 'CLASH_SQUAD'
  const isCODMultiplayer =
    state.game === 'COD_MOBILE' && state.mode === 'MULTIPLAYER'
  // COD BR uses same BR scoring
  const isCODBR =
    state.game === 'COD_MOBILE' && state.mode === 'BATTLE_ROYALE'

  if (!state.game || !state.mode) {
    return (
      <div className="flex items-center justify-center py-16 text-white/40 text-sm">
        Please select a game and mode in Step 1 first
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {(isBR || isCODBR) && <BRScoring state={state} onChange={onChange} />}
      {isClashSquad && <ClashSquadScoring state={state} onChange={onChange} />}
      {isCODMultiplayer && <CODMultiplayerScoring state={state} onChange={onChange} />}
    </div>
  )
}
