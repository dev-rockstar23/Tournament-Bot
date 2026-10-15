'use client'

import type { WizardState } from './TournamentWizard'

interface Step5Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

type Award = { type: string; label: string; description: string }

const MVP_CRITERIA_OPTIONS = [
  { value: 'MOST_KILLS', label: 'Most Kills' },
  { value: 'MOST_POINTS', label: 'Most Points' },
  { value: 'MANUAL', label: 'Manual Selection' },
]

export function Step5Awards({ state, onChange }: Step5Props) {
  const awards: Award[] = state.awards ?? []

  function updateAward(idx: number, patch: Partial<Award>) {
    const updated = awards.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    onChange({ awards: updated })
  }

  function removeAward(idx: number) {
    onChange({ awards: awards.filter((_, i) => i !== idx) })
  }

  function addCustomAward() {
    onChange({ awards: [...awards, { type: 'CUSTOM', label: '', description: '' }] })
  }

  const championAward: Award = awards.find((a) => a.type === 'CHAMPION') ?? {
    type: 'CHAMPION',
    label: 'Champion',
    description: '',
  }
  const runnerUpAward = awards.find((a) => a.type === 'RUNNER_UP')
  const thirdPlaceAward = awards.find((a) => a.type === 'THIRD_PLACE')
  const mvpAward = awards.find((a) => a.type === 'MVP')
  const customAwards = awards.filter((a) =>
    !['CHAMPION', 'RUNNER_UP', 'THIRD_PLACE', 'MVP'].includes(a.type)
  )

  function toggleStandardAward(type: string, label: string) {
    const exists = awards.find((a) => a.type === type)
    if (exists) {
      onChange({ awards: awards.filter((a) => a.type !== type) })
    } else {
      onChange({ awards: [...awards, { type, label, description: '' }] })
    }
  }

  // Ensure champion is always in the list
  const hasChampion = awards.some((a) => a.type === 'CHAMPION')

  return (
    <div className="space-y-6">
      {/* Champion — always enabled */}
      <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" role="img" aria-label="champion">🏆</span>
          <span className="font-semibold text-yellow-300">Champion Award</span>
          <span className="ml-auto text-xs text-white/40">Always enabled</span>
        </div>
        <input
          type="text"
          placeholder="Award label (e.g. Summer Champions)"
          value={championAward.label}
          onChange={(e) => {
            if (!hasChampion) {
              onChange({ awards: [...awards, { type: 'CHAMPION', label: e.target.value, description: '' }] })
            } else {
              const updated = awards.map((a) =>
                a.type === 'CHAMPION' ? { ...a, label: e.target.value } : a
              )
              onChange({ awards: updated })
            }
          }}
          className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
        />
      </div>

      {/* Runner-up */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="runner-up">🥈</span>
          <span className="font-medium text-white/80">Runner-Up Award</span>
          <button
            type="button"
            role="switch"
            aria-checked={!!runnerUpAward}
            onClick={() => toggleStandardAward('RUNNER_UP', 'Runner-Up')}
            className={[
              'ml-auto relative w-10 h-6 rounded-full transition-colors focus:outline-none',
              runnerUpAward ? 'bg-violet-600' : 'bg-white/20',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                runnerUpAward ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
        {runnerUpAward && (
          <input
            type="text"
            placeholder="Description"
            value={runnerUpAward.description}
            onChange={(e) => {
              const updated = awards.map((a) =>
                a.type === 'RUNNER_UP' ? { ...a, description: e.target.value } : a
              )
              onChange({ awards: updated })
            }}
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
          />
        )}
      </div>

      {/* Third Place */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="third-place">🥉</span>
          <span className="font-medium text-white/80">Third Place Award</span>
          <button
            type="button"
            role="switch"
            aria-checked={!!thirdPlaceAward}
            onClick={() => toggleStandardAward('THIRD_PLACE', 'Third Place')}
            className={[
              'ml-auto relative w-10 h-6 rounded-full transition-colors focus:outline-none',
              thirdPlaceAward ? 'bg-violet-600' : 'bg-white/20',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                thirdPlaceAward ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
        {thirdPlaceAward && (
          <input
            type="text"
            placeholder="Description"
            value={thirdPlaceAward.description}
            onChange={(e) => {
              const updated = awards.map((a) =>
                a.type === 'THIRD_PLACE' ? { ...a, description: e.target.value } : a
              )
              onChange({ awards: updated })
            }}
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
          />
        )}
      </div>

      {/* MVP */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="mvp">⭐</span>
          <span className="font-medium text-white/80">MVP Award</span>
          <button
            type="button"
            role="switch"
            aria-checked={!!mvpAward}
            onClick={() => toggleStandardAward('MVP', 'MVP')}
            className={[
              'ml-auto relative w-10 h-6 rounded-full transition-colors focus:outline-none',
              mvpAward ? 'bg-violet-600' : 'bg-white/20',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                mvpAward ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
        {mvpAward && (
          <div className="space-y-2">
            <select
              value={mvpAward.description || 'MOST_KILLS'}
              onChange={(e) => {
                const updated = awards.map((a) =>
                  a.type === 'MVP' ? { ...a, description: e.target.value } : a
                )
                onChange({ awards: updated })
              }}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
            >
              {MVP_CRITERIA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0f0f19]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Custom Awards */}
      {customAwards.map((award, idx) => {
        const realIdx = awards.indexOf(award)
        return (
          <div key={idx} className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-violet-300">Custom Award</span>
              <button
                type="button"
                onClick={() => removeAward(realIdx)}
                className="ml-auto text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              placeholder="Label"
              value={award.label}
              onChange={(e) => updateAward(realIdx, { label: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
            />
            <input
              type="text"
              placeholder="Description"
              value={award.description}
              onChange={(e) => updateAward(realIdx, { description: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
            />
          </div>
        )
      })}

      <button
        type="button"
        onClick={addCustomAward}
        className="w-full px-4 py-3 rounded-xl border border-dashed border-white/20 text-sm text-white/50 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
      >
        + Add Custom Award
      </button>

      {/* Fulfillment Notes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">Fulfillment Notes</label>
        <textarea
          rows={3}
          placeholder="Notes for prize fulfillment (e.g. Google Form link, payment method…)"
          value={(state.scoringConfig as { fulfillmentNotes?: string })?.fulfillmentNotes ?? ''}
          onChange={(e) =>
            onChange({
              scoringConfig: {
                ...(state.scoringConfig as Record<string, unknown>),
                fulfillmentNotes: e.target.value,
              },
            })
          }
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
        />
      </div>
    </div>
  )
}
