'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { WizardState } from './TournamentWizard'

interface Step6Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  guildId: string
  onSaveDraft: () => void
  onPublish: () => void
  publishing: boolean
}

interface DiscordChannel { id: string; name: string }
interface DiscordRole { id: string; name: string }

export function Step6Discord({ state, onChange, guildId, onSaveDraft, onPublish, publishing }: Step6Props) {
  const [channels, setChannels] = useState<DiscordChannel[]>([])
  const [roles, setRoles] = useState<DiscordRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [roomReleasePolicy, setRoomReleasePolicy] = useState<'automatic' | 'manual'>('automatic')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [chRes, rolesRes] = await Promise.all([
          fetch(`/api/servers/${guildId}/channels`),
          fetch(`/api/servers/${guildId}/roles`),
        ])
        if (chRes.ok) {
          const data = (await chRes.json()) as { channels: DiscordChannel[] }
          setChannels(data.channels)
        }
        if (rolesRes.ok) {
          const data = (await rolesRes.json()) as { roles: DiscordRole[] }
          setRoles(data.roles)
        }
      } catch {
        // Non-fatal — UI degrades gracefully
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [guildId])

  // Pre-publish checklist
  const checks = [
    {
      label: 'Tournament name set',
      ok: state.name.trim().length > 0,
    },
    {
      label: 'Game and mode selected',
      ok: Boolean(state.game) && Boolean(state.mode),
    },
    {
      label: 'Registration dates configured',
      ok: Boolean(state.registrationOpen) && Boolean(state.registrationClose),
    },
    {
      label: 'Team capacity > 0',
      ok: state.capacity > 0,
    },
    {
      label: 'Announcement channel selected',
      ok: Boolean(state.announcementChannelId),
    },
    {
      label: 'Scoring config configured',
      ok: Object.keys(state.scoringConfig ?? {}).length > 0,
    },
  ]

  const allChecksPassed = checks.every((c) => c.ok)

  function gameLabel(game: string) {
    switch (game) {
      case 'BGMI': return 'BGMI'
      case 'FREE_FIRE': return 'Free Fire'
      case 'COD_MOBILE': return 'COD Mobile'
      default: return game
    }
  }

  return (
    <div className="space-y-6">
      {/* Channel Selectors */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/80">Discord Channels</h3>
        {loading ? (
          <p className="text-xs text-white/40">Loading channels…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Announcement Channel', key: 'announcementChannelId' as const },
              { label: 'Match Updates Channel', key: 'matchChannelId' as const },
              { label: 'Results Channel', key: 'resultsChannelId' as const },
              { label: 'Disputes Channel', key: 'disputesChannelId' as const },
            ].map(({ label, key }) => (
              <div key={key} className="space-y-1.5">
                <label className="block text-xs text-white/50">{label}</label>
                <select
                  value={state[key] as string}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  <option value="" className="bg-[#0f0f19]">— Select —</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-[#0f0f19]">
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role Selectors */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/80">Discord Roles</h3>
        {loading ? (
          <p className="text-xs text-white/40">Loading roles…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tournament Manager Role', key: 'tmRoleId' as const },
              { label: 'Referee Role', key: 'refereeRoleId' as const },
            ].map(({ label, key }) => (
              <div key={key} className="space-y-1.5">
                <label className="block text-xs text-white/50">{label}</label>
                <select
                  value={state[key] as string}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  <option value="" className="bg-[#0f0f19]">— Select —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#0f0f19]">
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Room Release Policy */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div>
          <p className="text-sm font-medium text-white">Room Release Policy</p>
          <p className="text-xs text-white/40 mt-0.5">How room credentials are released to participants</p>
        </div>
        <div className="flex gap-2">
          {(['automatic', 'manual'] as const).map((policy) => (
            <button
              key={policy}
              type="button"
              onClick={() => setRoomReleasePolicy(policy)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                roomReleasePolicy === policy
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white',
              ].join(' ')}
            >
              {policy.charAt(0).toUpperCase() + policy.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-publish Checklist */}
      <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-sm font-semibold text-white/80 mb-3">Pre-Publish Checklist</h3>
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-sm">
            {check.ok ? (
              <Check size={16} className="text-green-400 shrink-0" />
            ) : (
              <X size={16} className="text-red-400 shrink-0" />
            )}
            <span className={check.ok ? 'text-white/70' : 'text-white/40'}>{check.label}</span>
          </div>
        ))}
      </div>

      {/* Discord Embed Preview */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/80">Discord Embed Preview</h3>
        <div className="rounded-xl border border-violet-500/30 bg-[#1e1f22] overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <div className="w-1 self-stretch rounded-full bg-violet-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 mb-1">Tournament Manager</p>
              <p className="font-bold text-white text-sm mb-2">
                {state.name || 'Tournament Name'}
              </p>
              {state.description && (
                <p className="text-white/70 text-xs mb-3 line-clamp-2">{state.description}</p>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div>
                  <p className="text-white/40 text-xs">Game</p>
                  <p className="text-white/80 text-xs font-medium">
                    {state.game ? gameLabel(state.game) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Mode</p>
                  <p className="text-white/80 text-xs font-medium">{state.mode || '—'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Slots</p>
                  <p className="text-white/80 text-xs font-medium">
                    {state.capacity > 0 ? `${state.capacity} teams` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Entry</p>
                  <p className="text-white/80 text-xs font-medium">{state.entryType || 'FREE'}</p>
                </div>
              </div>
              {state.registrationClose && (
                <p className="text-white/40 text-xs mt-2">
                  Reg. closes: {new Date(state.registrationClose).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveDraft}
          className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => setShowConfirmModal(true)}
          disabled={!allChecksPassed || publishing}
          className={[
            'flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all',
            allChecksPassed
              ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]'
              : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed',
          ].join(' ')}
        >
          {publishing ? 'Publishing…' : 'Publish Tournament'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f19] p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Publish Tournament?</h2>
            <p className="text-white/60 text-sm">
              Publishing will set the status to{' '}
              <strong className="text-cyan-400">Registration Open</strong> and send a Discord
              announcement. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  onPublish()
                }}
                disabled={publishing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all"
              >
                {publishing ? 'Publishing…' : 'Confirm Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
