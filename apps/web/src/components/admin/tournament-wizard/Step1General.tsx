'use client'

import type { WizardState } from './TournamentWizard'

interface Step1Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

const GAME_CARDS = [
  {
    id: 'BGMI' as const,
    label: 'BGMI',
    subtitle: 'Battlegrounds Mobile India',
    gradient: 'from-green-900/60 to-green-700/30',
    border: 'border-green-600/40',
    activeBorder: 'border-green-500',
    emoji: '🎯',
  },
  {
    id: 'FREE_FIRE' as const,
    label: 'Free Fire',
    subtitle: 'Garena Free Fire',
    gradient: 'from-orange-900/60 to-orange-700/30',
    border: 'border-orange-600/40',
    activeBorder: 'border-orange-500',
    emoji: '🔥',
  },
  {
    id: 'COD_MOBILE' as const,
    label: 'COD Mobile',
    subtitle: 'Call of Duty Mobile',
    gradient: 'from-blue-900/60 to-blue-700/30',
    border: 'border-blue-600/40',
    activeBorder: 'border-blue-500',
    emoji: '🎖️',
  },
]

const GAME_MODES: Record<string, { value: string; label: string }[]> = {
  BGMI: [{ value: 'BATTLE_ROYALE', label: 'Battle Royale' }],
  FREE_FIRE: [
    { value: 'BATTLE_ROYALE', label: 'Battle Royale' },
    { value: 'CLASH_SQUAD', label: 'Clash Squad' },
  ],
  COD_MOBILE: [
    { value: 'MULTIPLAYER', label: 'Multiplayer' },
    { value: 'BATTLE_ROYALE', label: 'Battle Royale' },
  ],
}

export function Step1General({ state, onChange }: Step1Props) {
  const descLen = state.description.length
  const modes = state.game ? GAME_MODES[state.game] ?? [] : []

  return (
    <div className="space-y-6">
      {/* Tournament Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">
          Tournament Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          maxLength={100}
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Summer BGMI Championship 2025"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <p className="text-xs text-white/30 text-right">{state.name.length}/100</p>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">Description</label>
        <textarea
          maxLength={500}
          rows={3}
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe your tournament…"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
        />
        <p className="text-xs text-white/30 text-right">{descLen}/500</p>
      </div>

      {/* Game Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">
          Game <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {GAME_CARDS.map((card) => {
            const active = state.game === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onChange({ game: card.id, mode: '' })}
                className={[
                  'flex flex-col items-center gap-2 p-4 rounded-xl border bg-gradient-to-br transition-all',
                  card.gradient,
                  active ? card.activeBorder + ' ring-1 ring-offset-0' : card.border,
                  'hover:scale-[1.02]',
                ].join(' ')}
              >
                <span className="text-2xl" role="img" aria-label={card.label}>{card.emoji}</span>
                <span className="font-semibold text-white text-sm">{card.label}</span>
                <span className="text-xs text-white/50 text-center">{card.subtitle}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mode Selector */}
      {state.game && modes.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">
            Mode <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => onChange({ mode: m.value })}
                className={[
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  state.mode === m.value
                    ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10',
                ].join(' ')}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visibility */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Visibility</label>
        <div className="flex gap-2">
          {(['PUBLIC', 'MEMBERS_ONLY'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ visibility: v })}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                state.visibility === v
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              {v === 'PUBLIC' ? '🌐 Public' : '🔒 Members Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Banner URL */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">
          Banner URL
          <span className="ml-2 text-xs text-white/30">(Full upload available in Phase 3)</span>
        </label>
        <input
          type="url"
          value={state.bannerUrl}
          onChange={(e) => onChange({ bannerUrl: e.target.value })}
          placeholder="https://example.com/banner.png"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>

      {/* Rules URL */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white/80">Rules URL</label>
        <input
          type="url"
          value={state.rulesUrl}
          onChange={(e) => onChange({ rulesUrl: e.target.value })}
          placeholder="https://example.com/rules.pdf"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>
    </div>
  )
}
