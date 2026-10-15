'use client'

import { useState } from 'react'
import type { WizardState } from './TournamentWizard'

interface Step3Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

const STAGE_STRUCTURES = [
  {
    id: 'single',
    label: 'Single Stage',
    description: 'All matches in one continuous stage',
    icon: '🎯',
  },
  {
    id: 'group_knockout',
    label: 'Group + Knockout',
    description: 'Group stage followed by elimination bracket',
    icon: '🏆',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Define your own stage structure',
    icon: '⚙️',
  },
]

const MATCH_COUNT_OPTIONS = [1, 2, 3, 4, 6, 8, 10]

function addMinutes(isoStr: string, minutes: number): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString().slice(0, 16)
}

export function Step3Schedule({ state, onChange }: Step3Props) {
  const [stageStructure, setStageStructure] = useState('single')
  const [matchCount, setMatchCount] = useState(1)
  const [matchDuration, setMatchDuration] = useState(30)
  const [matchGap, setMatchGap] = useState(15)

  // Generate preview match times
  const matchTimes: string[] = []
  if (state.startAt && matchCount > 0) {
    for (let i = 0; i < matchCount; i++) {
      const offsetMinutes = i * (matchDuration + matchGap)
      matchTimes.push(addMinutes(state.startAt, offsetMinutes))
    }
  }

  return (
    <div className="space-y-6">
      {/* Registration Open */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Registration Opens</label>
          <input
            type="datetime-local"
            value={state.registrationOpen}
            onChange={(e) => onChange({ registrationOpen: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Registration Closes</label>
          <input
            type="datetime-local"
            value={state.registrationClose}
            onChange={(e) => onChange({ registrationClose: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Check-in */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Check-In Opens</label>
          <input
            type="datetime-local"
            value={state.checkinOpen}
            onChange={(e) => onChange({ checkinOpen: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Check-In Closes</label>
          <input
            type="datetime-local"
            value={state.checkinClose}
            onChange={(e) => onChange({ checkinClose: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Tournament Start / End */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">
            Tournament Start <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            value={state.startAt}
            onChange={(e) => onChange({ startAt: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Tournament End</label>
          <input
            type="datetime-local"
            value={state.endAt}
            onChange={(e) => onChange({ endAt: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Timezone note */}
      <p className="text-xs text-white/40">
        All times are in server timezone: <strong className="text-white/60">{state.timezone || 'UTC'}</strong>
      </p>

      {/* Stage structure */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Stage Structure</label>
        <div className="grid grid-cols-3 gap-3">
          {STAGE_STRUCTURES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStageStructure(s.id)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center',
                stageStructure === s.id
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              <span className="text-xl" role="img" aria-label={s.label}>{s.icon}</span>
              <span className="text-xs font-semibold">{s.label}</span>
              <span className="text-xs text-white/40 leading-tight">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-match schedule */}
      <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-sm font-medium text-white/80">Match Schedule Preview</p>

        {/* Match count */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">Matches:</span>
          {MATCH_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMatchCount(n)}
              className={[
                'px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                matchCount === n
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Duration / gap */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Duration (min):</span>
            <input
              type="number"
              min={5}
              max={240}
              value={matchDuration}
              onChange={(e) => setMatchDuration(parseInt(e.target.value, 10) || 30)}
              className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Gap (min):</span>
            <input
              type="number"
              min={0}
              max={120}
              value={matchGap}
              onChange={(e) => setMatchGap(parseInt(e.target.value, 10) || 0)}
              className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Preview table */}
        {matchTimes.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-1">Match #</th>
                <th className="text-left py-1">Start Time</th>
                <th className="text-left py-1">End Time</th>
              </tr>
            </thead>
            <tbody>
              {matchTimes.map((startIso, idx) => {
                const endIso = addMinutes(startIso, matchDuration)
                return (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-1 text-white/60">M{idx + 1}</td>
                    <td className="py-1 text-white/80">
                      {new Date(startIso).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-1 text-white/60">
                      {new Date(endIso).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {matchTimes.length === 0 && (
          <p className="text-xs text-white/30">Set Tournament Start to see preview</p>
        )}
      </div>
    </div>
  )
}
