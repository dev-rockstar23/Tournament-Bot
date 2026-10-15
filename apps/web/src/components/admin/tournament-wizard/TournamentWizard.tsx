'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { Step1General } from './Step1General'
import { Step2Registration } from './Step2Registration'
import { Step3Schedule } from './Step3Schedule'
import { Step4Scoring } from './Step4Scoring'
import { Step5Awards } from './Step5Awards'
import { Step6Discord } from './Step6Discord'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardState {
  step: number
  // Step 1
  name: string
  description: string
  game: 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE' | ''
  mode: string
  visibility: 'PUBLIC' | 'MEMBERS_ONLY'
  bannerUrl: string
  rulesUrl: string
  // Step 2
  capacity: number
  rosterMin: number
  rosterMax: number
  hasSubstitute: boolean
  registrationFormat: string
  approvalType: 'AUTO' | 'MANUAL'
  entryType: 'FREE' | 'PAID'
  registrationClose: string
  waitlistEnabled: boolean
  // Step 3
  registrationOpen: string
  checkinOpen: string
  checkinClose: string
  startAt: string
  endAt: string
  timezone: string
  // Step 4
  scoringConfig: Record<string, unknown>
  // Step 5
  awards: Array<{ type: string; label: string; description: string }>
  // Step 6
  announcementChannelId: string
  matchChannelId: string
  resultsChannelId: string
  disputesChannelId: string
  tmRoleId: string
  refereeRoleId: string
}

const INITIAL_STATE: WizardState = {
  step: 1,
  name: '',
  description: '',
  game: '',
  mode: '',
  visibility: 'PUBLIC',
  bannerUrl: '',
  rulesUrl: '',
  capacity: 16,
  rosterMin: 2,
  rosterMax: 4,
  hasSubstitute: false,
  registrationFormat: 'FULL_WITH_SUBSTITUTE',
  approvalType: 'MANUAL',
  entryType: 'FREE',
  registrationClose: '',
  waitlistEnabled: true,
  registrationOpen: '',
  checkinOpen: '',
  checkinClose: '',
  startAt: '',
  endAt: '',
  timezone: 'Asia/Kolkata',
  scoringConfig: {},
  awards: [{ type: 'CHAMPION', label: 'Champion', description: '' }],
  announcementChannelId: '',
  matchChannelId: '',
  resultsChannelId: '',
  disputesChannelId: '',
  tmRoleId: '',
  refereeRoleId: '',
}

const STEP_LABELS = [
  'General',
  'Registration',
  'Schedule',
  'Scoring',
  'Awards',
  'Discord',
]

// ─── Component ────────────────────────────────────────────────────────────────

interface TournamentWizardProps {
  guildId: string
}

export function TournamentWizard({ guildId }: TournamentWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [showRestoreBanner, setShowRestoreBanner] = useState(false)
  const [savedTournamentId, setSavedTournamentId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const draftKey = `tournament-draft-${guildId}`

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { data: WizardState; savedAt: number }
        const ageDays = (Date.now() - parsed.savedAt) / (1000 * 60 * 60 * 24)
        if (ageDays < 30) {
          setShowRestoreBanner(true)
        } else {
          localStorage.removeItem(draftKey)
        }
      }
    } catch {
      // Malformed data — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ data: state, savedAt: Date.now() })
        )
      } catch {
        // Storage may be full — non-fatal
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [state, draftKey])

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { data: WizardState }
        setState(parsed.data)
      }
    } catch {
      // Ignore
    }
    setShowRestoreBanner(false)
  }

  function discardDraft() {
    localStorage.removeItem(draftKey)
    setShowRestoreBanner(false)
  }

  function patch(update: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...update }))
  }

  function goNext() {
    if (state.step < 6) patch({ step: state.step + 1 })
  }

  function goBack() {
    if (state.step > 1) patch({ step: state.step - 1 })
  }

  const saveDraft = useCallback(async () => {
    // Always persist locally
    try {
      localStorage.setItem(draftKey, JSON.stringify({ data: state, savedAt: Date.now() }))
    } catch {
      // Storage full — non-fatal
    }

    if (!state.name.trim() || !state.game) return // can't save nameless draft to API

    try {
      if (savedTournamentId) {
        // PATCH existing draft
        await fetch(
          `/api/servers/${guildId}/admin/tournaments/${savedTournamentId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: state.name,
              description: state.description,
              game: state.game,
              mode: state.mode,
              visibility: state.visibility,
            }),
          }
        )
      } else {
        // POST new draft
        const res = await fetch(`/api/servers/${guildId}/admin/tournaments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.name || 'Untitled Draft',
            game: state.game,
            mode: state.mode || 'BATTLE_ROYALE',
            description: state.description,
            visibility: state.visibility,
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as { tournament: { id: string } }
          setSavedTournamentId(data.tournament.id)
        }
      }
    } catch {
      // Non-fatal — draft saved locally regardless
    }
  }, [state, guildId, savedTournamentId, draftKey])

  const publish = useCallback(async () => {
    setError(null)
    setPublishing(true)

    try {
      let tournamentId = savedTournamentId

      // Step 1: Create tournament if not yet saved
      if (!tournamentId) {
        const res = await fetch(`/api/servers/${guildId}/admin/tournaments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.name,
            game: state.game,
            mode: state.mode,
            description: state.description,
            visibility: state.visibility,
          }),
        })
        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          throw new Error(body.error ?? 'Failed to create tournament')
        }
        const data = (await res.json()) as { tournament: { id: string } }
        tournamentId = data.tournament.id
        setSavedTournamentId(tournamentId)
      }

      // Step 2: Publish
      const pubRes = await fetch(
        `/api/servers/${guildId}/tournaments/${tournamentId}/publish`,
        { method: 'POST' }
      )

      if (!pubRes.ok) {
        const body = (await pubRes.json()) as { error?: string; validationErrors?: string[] }
        throw new Error(
          body.validationErrors ? body.validationErrors.join(', ') : (body.error ?? 'Publish failed')
        )
      }

      // Clear local draft on success
      localStorage.removeItem(draftKey)

      // Redirect to tournament list
      window.location.href = `/servers/${guildId}/admin/tournaments`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setPublishing(false)
    }
  }, [state, guildId, savedTournamentId, draftKey])

  return (
    <div className="space-y-6">
      {/* Restore banner */}
      {showRestoreBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
          <span>🗂️ A previous draft was found. Restore it?</span>
          <button
            type="button"
            onClick={restoreDraft}
            className="ml-auto px-3 py-1 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-200 hover:bg-blue-600/50 transition-colors"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={discardDraft}
            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
          >
            No
          </button>
        </div>
      )}

      {/* Draft expiry warning */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
        ⚠️ <strong>Draft Expiry Notice:</strong> This tournament draft must be published within 30 days or it will be permanently deleted.
      </div>

      {/* Error state */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1
          const isDone = stepNum < state.step
          const isCurrent = stepNum === state.step
          return (
            <div key={label} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => stepNum < state.step && patch({ step: stepNum })}
                className={[
                  'flex flex-col items-center gap-1 group',
                  stepNum < state.step ? 'cursor-pointer' : 'cursor-default',
                ].join(' ')}
                disabled={stepNum > state.step}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                    isDone
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : isCurrent
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-white/5 border-white/15 text-white/30',
                  ].join(' ')}
                >
                  {isDone ? <Check size={14} /> : stepNum}
                </div>
                <span
                  className={[
                    'text-xs hidden sm:block',
                    isCurrent ? 'text-violet-300' : isDone ? 'text-white/60' : 'text-white/25',
                  ].join(' ')}
                >
                  {label}
                </span>
              </button>

              {/* Connecting line — not after last step */}
              {idx < STEP_LABELS.length - 1 && (
                <div
                  className={[
                    'flex-1 h-0.5 mx-2 transition-colors',
                    stepNum < state.step ? 'bg-violet-500/50' : 'bg-white/10',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <GlassCard hover={false} className="p-6">
        <h2 className="font-display text-lg font-bold text-white mb-6">
          Step {state.step}: {STEP_LABELS[state.step - 1]}
        </h2>

        {state.step === 1 && <Step1General state={state} onChange={patch} />}
        {state.step === 2 && <Step2Registration state={state} onChange={patch} />}
        {state.step === 3 && <Step3Schedule state={state} onChange={patch} />}
        {state.step === 4 && <Step4Scoring state={state} onChange={patch} />}
        {state.step === 5 && <Step5Awards state={state} onChange={patch} />}
        {state.step === 6 && (
          <Step6Discord
            state={state}
            onChange={patch}
            guildId={guildId}
            onSaveDraft={saveDraft}
            onPublish={publish}
            publishing={publishing}
          />
        )}
      </GlassCard>

      {/* Navigation buttons (hidden on step 6 since Step6 has its own buttons) */}
      {state.step < 6 && (
        <div className="flex items-center justify-between">
          <GlowButton
            variant="ghost"
            size="md"
            onClick={goBack}
            disabled={state.step === 1}
          >
            ← Back
          </GlowButton>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveDraft}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Save Draft
            </button>
            <GlowButton variant="primary" size="md" onClick={goNext}>
              {state.step === 5 ? 'Next: Discord' : 'Next →'}
            </GlowButton>
          </div>
        </div>
      )}
    </div>
  )
}
