'use client'

import type { WizardState } from './TournamentWizard'

interface Step2Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

const REGISTRATION_FORMATS = [
  { value: 'SIMPLE_MENTIONS', label: 'Simple Mentions', description: 'Players mention teammates in a single message. Easiest to set up.' },
  { value: 'CAPTAIN_BASED', label: 'Captain Based', description: 'Team captain registers and lists their roster by username.' },
  { value: 'FULL_PLAYER_DETAILS', label: 'Full Player Details', description: 'Requires IGN, UID, and game profile for every player. Defaults to manual approval.' },
  { value: 'TEAM_WITH_SUBSTITUTE', label: 'Team with Substitute', description: 'Team roster + optional substitute slot.' },
  { value: 'CODM_FIVE_PLAYER', label: 'CODM Five Player', description: 'Fixed 5-player roster format optimised for COD Mobile Multiplayer.' },
  { value: 'FULL_WITH_SUBSTITUTE', label: 'Full with Substitute', description: 'Full player details for each member including a substitute. Defaults to manual approval.' },
]

const MANUAL_DEFAULT_FORMATS = new Set(['FULL_PLAYER_DETAILS', 'FULL_WITH_SUBSTITUTE'])

export function Step2Registration({ state, onChange }: Step2Props) {
  const selectedFormat = REGISTRATION_FORMATS.find((f) => f.value === state.registrationFormat)
  const totalPlayers = state.capacity * state.rosterMax

  function handleFormatChange(value: string) {
    const patch: Partial<WizardState> = { registrationFormat: value }
    if (MANUAL_DEFAULT_FORMATS.has(value)) {
      patch.approvalType = 'MANUAL'
    }
    onChange(patch)
  }

  return (
    <div className="space-y-6">
      {/* Team Capacity */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">
          Team Capacity <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min={2}
          max={256}
          value={state.capacity}
          onChange={(e) => onChange({ capacity: parseInt(e.target.value, 10) || 0 })}
          className="w-32 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        {/* Slot visualizer */}
        {state.capacity > 0 && state.rosterMax > 0 && (
          <div className="mt-2 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300">
            {state.capacity} slots × {state.rosterMax} players = <strong>{totalPlayers}</strong> main players
          </div>
        )}
      </div>

      {/* Roster Min / Max */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Roster Min</label>
          <input
            type="number"
            min={1}
            max={state.rosterMax}
            value={state.rosterMin}
            onChange={(e) => onChange({ rosterMin: parseInt(e.target.value, 10) || 1 })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Roster Max</label>
          <input
            type="number"
            min={state.rosterMin}
            max={10}
            value={state.rosterMax}
            onChange={(e) => onChange({ rosterMax: parseInt(e.target.value, 10) || 1 })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Substitutes toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div>
          <p className="text-sm font-medium text-white">Allow Substitutes</p>
          <p className="text-xs text-white/40 mt-0.5">Teams can register an extra substitute player</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.hasSubstitute}
          onClick={() => onChange({ hasSubstitute: !state.hasSubstitute })}
          className={[
            'relative w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            state.hasSubstitute ? 'bg-violet-600' : 'bg-white/20',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
              state.hasSubstitute ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Registration Format */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Registration Format</label>
        <select
          value={state.registrationFormat}
          onChange={(e) => handleFormatChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        >
          {REGISTRATION_FORMATS.map((f) => (
            <option key={f.value} value={f.value} className="bg-[#0f0f19]">
              {f.label}
            </option>
          ))}
        </select>
        {selectedFormat && (
          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
            {selectedFormat.description}
          </div>
        )}
      </div>

      {/* Approval Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Approval Type</label>
        <div className="flex gap-2">
          {(['AUTO', 'MANUAL'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ approvalType: type })}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                state.approvalType === type
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              {type === 'AUTO' ? '⚡ Auto Approve' : '👤 Manual Review'}
            </button>
          ))}
        </div>
        {MANUAL_DEFAULT_FORMATS.has(state.registrationFormat) && (
          <p className="text-xs text-amber-400">
            ⚠️ Full details formats default to Manual approval
          </p>
        )}
      </div>

      {/* Entry Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Entry Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ entryType: 'FREE' })}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              state.entryType === 'FREE'
                ? 'bg-green-600/30 border-green-500 text-green-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10',
            ].join(' ')}
          >
            🆓 Free
          </button>
          <div
            className="relative group"
            title="Paid entry coming in Phase 3"
          >
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-lg text-sm font-medium border border-white/5 bg-white/[0.02] text-white/25 cursor-not-allowed"
            >
              💰 Paid
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 -top-9 px-2 py-1 rounded bg-black/90 text-xs text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Payment integration coming in Phase 3
            </div>
          </div>
        </div>
      </div>

      {/* Registration Deadline */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">Registration Deadline</label>
        <input
          type="datetime-local"
          value={state.registrationClose}
          onChange={(e) => onChange({ registrationClose: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>

      {/* Waitlist */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div>
          <p className="text-sm font-medium text-white">Enable Waitlist</p>
          <p className="text-xs text-white/40 mt-0.5">Teams can join a waitlist when tournament is full</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.waitlistEnabled ?? false}
          onClick={() => onChange({ waitlistEnabled: !(state.waitlistEnabled ?? false) })}
          className={[
            'relative w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            (state.waitlistEnabled ?? false) ? 'bg-violet-600' : 'bg-white/20',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
              (state.waitlistEnabled ?? false) ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  )
}
