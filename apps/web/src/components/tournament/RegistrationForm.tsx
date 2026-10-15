'use client'
import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GlassCard } from '@/components/ui/GlassCard'
import { CheckCircle } from 'lucide-react'

type RegistrationFormat =
  | 'SIMPLE_MENTIONS'
  | 'CAPTAIN_BASED'
  | 'FULL_PLAYER_DETAILS'
  | 'TEAM_WITH_SUBSTITUTE'
  | 'CODM_FIVE_PLAYER'
  | 'FULL_WITH_SUBSTITUTE'

interface TournamentInfo {
  id: string
  name: string
  game: string
  status: string
  capacity: number
  acceptedCount: number
  registrationOpen?: string | null
  registrationOpenAt?: string | null
  registrationClose?: string | null
  registrationCloseAt?: string | null
  registrationFormat: string
}

interface RegistrationFormProps {
  tournament: TournamentInfo
  guildId: string
}

// ── Schemas per format ────────────────────────────────────────────────────────

const discordUsername = z.string().min(2, 'Discord username required')

const simpleMentionsSchema = z.object({
  teamName: z.string().min(2, 'Team name is required'),
  player1: discordUsername,
  player2: discordUsername,
  player3: discordUsername.optional().or(z.literal('')),
  player4: discordUsername.optional().or(z.literal('')),
})

const captainBasedSchema = z.object({
  teamName: z.string().min(2, 'Team name is required'),
  captain: discordUsername,
  member1: discordUsername,
  member2: discordUsername,
  member3: discordUsername,
})

const playerRow = z.object({
  ign: z.string().min(1, 'IGN required'),
  uid: z.string().min(1, 'UID required'),
  isCaptain: z.boolean().optional(),
  isSubstitute: z.boolean().optional(),
})

const fullDetailsSchema = z.object({
  teamName: z.string().min(2, 'Team name is required'),
  players: z.array(playerRow).min(2, 'At least 2 players required'),
})

type SimpleMentionsData = z.infer<typeof simpleMentionsSchema>
type CaptainBasedData = z.infer<typeof captainBasedSchema>
type FullDetailsData = z.infer<typeof fullDetailsSchema>

// ── Sub-forms ────────────────────────────────────────────────────────────────

function SimpleMentionsForm({
  onSubmit,
}: {
  onSubmit: (data: Record<string, unknown>) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SimpleMentionsData>({ resolver: zodResolver(simpleMentionsSchema) })

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d))} className="flex flex-col gap-4">
      <Field label="Team Name" error={errors.teamName?.message}>
        <input {...register('teamName')} className={inputClass} placeholder="Your Team Name" />
      </Field>
      <Field label="Player 1 (Discord)" error={errors.player1?.message}>
        <input {...register('player1')} className={inputClass} placeholder="username#1234" />
      </Field>
      <Field label="Player 2 (Discord)" error={errors.player2?.message}>
        <input {...register('player2')} className={inputClass} placeholder="username#1234" />
      </Field>
      <Field label="Player 3 (Discord, optional)" error={errors.player3?.message}>
        <input {...register('player3')} className={inputClass} placeholder="username#1234" />
      </Field>
      <Field label="Player 4 (Discord, optional)" error={errors.player4?.message}>
        <input {...register('player4')} className={inputClass} placeholder="username#1234" />
      </Field>
      <SubmitBtn disabled={isSubmitting} />
    </form>
  )
}

function CaptainBasedForm({
  onSubmit,
}: {
  onSubmit: (data: Record<string, unknown>) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CaptainBasedData>({ resolver: zodResolver(captainBasedSchema) })

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d))} className="flex flex-col gap-4">
      <Field label="Team Name" error={errors.teamName?.message}>
        <input {...register('teamName')} className={inputClass} placeholder="Your Team Name" />
      </Field>
      <Field label="Captain (Discord)" error={errors.captain?.message}>
        <input {...register('captain')} className={inputClass} placeholder="username#1234" />
      </Field>
      {(['member1', 'member2', 'member3'] as const).map((f, i) => (
        <Field key={f} label={`Member ${i + 1} (Discord)`} error={errors[f]?.message}>
          <input {...register(f)} className={inputClass} placeholder="username#1234" />
        </Field>
      ))}
      <SubmitBtn disabled={isSubmitting} />
    </form>
  )
}

const DEFAULT_PLAYER_COUNT = 4

function FullDetailsForm({
  onSubmit,
  withSubstitute = false,
  playerCount = DEFAULT_PLAYER_COUNT,
}: {
  onSubmit: (data: Record<string, unknown>) => void
  withSubstitute?: boolean
  playerCount?: number
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FullDetailsData>({
    resolver: zodResolver(fullDetailsSchema),
    defaultValues: {
      teamName: '',
      players: Array.from({ length: playerCount }, (_, i) => ({
        ign: '',
        uid: '',
        isCaptain: i === 0,
        isSubstitute: withSubstitute && i === playerCount - 1,
      })),
    },
  })
  const { fields } = useFieldArray({ control, name: 'players' })

  const formErrors = errors as { players?: Array<{ ign?: { message?: string }; uid?: { message?: string } }>; teamName?: { message?: string } }

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d))} className="flex flex-col gap-4">
      <Field label="Team Name" error={formErrors.teamName?.message}>
        <input {...register('teamName')} className={inputClass} placeholder="Your Team Name" />
      </Field>
      {fields.map((field, idx) => (
        <div key={field.id} className="glass-card p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            {idx === 0 ? 'Captain' : withSubstitute && idx === fields.length - 1 ? `Substitute` : `Player ${idx + 1}`}
          </p>
          <Field label="In-Game Name (IGN)" error={formErrors.players?.[idx]?.ign?.message}>
            <input {...register(`players.${idx}.ign`)} className={inputClass} placeholder="IGN" />
          </Field>
          <Field label="UID" error={formErrors.players?.[idx]?.uid?.message}>
            <input {...register(`players.${idx}.uid`)} className={inputClass} placeholder="Game UID" />
          </Field>
        </div>
      ))}
      <SubmitBtn disabled={isSubmitting} />
    </form>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[var(--color-text-muted)] bg-white/5 border border-[rgba(255,255,255,0.10)] focus:outline-none focus:border-[rgba(124,58,237,0.6)] focus:bg-white/8 transition-colors'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#7c3aed] to-[#9f5bff] text-white border border-[rgba(124,58,237,0.5)] hover:from-[#6d28d9] hover:to-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {disabled ? 'Submitting…' : 'Submit Registration'}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RegistrationForm({ tournament, guildId }: RegistrationFormProps) {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const format = tournament.registrationFormat as RegistrationFormat

  async function handleSubmit(data: Record<string, unknown>) {
    setServerError(null)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/tournaments/${tournament.id}/registrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, registrationFormat: format }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setServerError((body as { error?: string }).error ?? 'Registration failed. Please try again.')
        return
      }
      setSuccess(true)
    } catch {
      setServerError('Network error. Please check your connection.')
    }
  }

  if (success) {
    return (
      <GlassCard className="p-8 flex flex-col items-center text-center gap-4">
        <CheckCircle size={48} className="text-green-400" aria-hidden="true" />
        <h2 className="font-display text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Registration Submitted!
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Your team registration for <strong className="text-white">{tournament.name}</strong> has been received.
          Please wait for approval from the tournament organizer.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      {serverError && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
        >
          {serverError}
        </div>
      )}

      {(format === 'SIMPLE_MENTIONS') && (
        <SimpleMentionsForm onSubmit={handleSubmit} />
      )}

      {format === 'CAPTAIN_BASED' && (
        <CaptainBasedForm onSubmit={handleSubmit} />
      )}

      {format === 'FULL_PLAYER_DETAILS' && (
        <FullDetailsForm onSubmit={handleSubmit} playerCount={4} />
      )}

      {format === 'TEAM_WITH_SUBSTITUTE' && (
        <FullDetailsForm onSubmit={handleSubmit} playerCount={5} withSubstitute />
      )}

      {format === 'CODM_FIVE_PLAYER' && (
        <FullDetailsForm onSubmit={handleSubmit} playerCount={5} />
      )}

      {format === 'FULL_WITH_SUBSTITUTE' && (
        <FullDetailsForm onSubmit={handleSubmit} playerCount={5} withSubstitute />
      )}
    </GlassCard>
  )
}
