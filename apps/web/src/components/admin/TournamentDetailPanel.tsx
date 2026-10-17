'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Tabs from '@radix-ui/react-tabs'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { Badge } from '@/components/ui/Badge'
import { ParticipantsTable, type RegistrationRow } from '@/components/admin/ParticipantsTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchSummary {
  id: string
  number: number
  status: string
  scheduledStart: string | null
  scheduledEnd: string | null
  map: string | null
  mode: string | null
}

interface StageSummary {
  id: string
  name: string
  order: number
  matches: MatchSummary[]
}

interface RegistrationDetail {
  id: string
  status: string
  createdAt: string
  approvedAt: string | null
  rejectionReason: string | null
  slotNumber: number | null
  team: { name: string; tag: string | null }
  _count: { members: number }
}

export interface TournamentDetail {
  id: string
  name: string
  description: string | null
  game: string
  mode: string
  status: string
  entryType: string
  entryPrice: number | null
  teamCapacity: number
  acceptedCount: number
  rosterMin: number
  rosterMax: number
  substituteAllowed: number
  waitlistEnabled: boolean
  autoApprove: boolean
  registrationFormat: string
  mapPool: string[]
  bannerUrl: string | null
  rulesUrl: string | null
  visibility: string
  registrationOpenAt: string | null
  registrationCloseAt: string | null
  checkInOpenAt: string | null
  checkInCloseAt: string | null
  startAt: string | null
  endAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  stages: StageSummary[]
  registrations: RegistrationDetail[]
}

interface TournamentDetailPanelProps {
  guildId: string
  tournament: TournamentDetail
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusToBadgeVariant(
  status: string
): 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default' {
  switch (status) {
    case 'LIVE':
      return 'live'
    case 'REGISTRATION_OPEN':
    case 'REGISTRATION_CLOSED':
    case 'CHECK_IN':
      return 'upcoming'
    case 'COMPLETED':
      return 'completed'
    case 'CANCELLED':
      return 'cancelled'
    case 'DRAFT':
      return 'draft'
    default:
      return 'default'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'REGISTRATION_OPEN':
      return 'Registration Open'
    case 'REGISTRATION_CLOSED':
      return 'Reg. Closed'
    case 'CHECK_IN':
      return 'Check-In'
    case 'LIVE':
      return 'Live'
    case 'COMPLETED':
      return 'Completed'
    case 'CANCELLED':
      return 'Cancelled'
    case 'ARCHIVED':
      return 'Archived'
    default:
      return status
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function gameLabel(game: string): string {
  switch (game) {
    case 'BGMI':
      return 'BGMI'
    case 'FREE_FIRE':
      return 'Free Fire'
    case 'COD_MOBILE':
      return 'COD Mobile'
    default:
      return game
  }
}

/** Format ISO string to datetime-local input value (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

// ─── Settings form type ───────────────────────────────────────────────────────

interface SettingsFormValues {
  name: string
  description: string
  visibility: string
  teamCapacity: number
  rosterMin: number
  rosterMax: number
  registrationOpenAt: string
  registrationCloseAt: string
  checkInOpenAt: string
  checkInCloseAt: string
  startAt: string
  endAt: string
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  guildId,
  tournament,
}: {
  guildId: string
  tournament: TournamentDetail
}) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const accepted = tournament.acceptedCount
  const capacity = tournament.teamCapacity
  const pct = capacity > 0 ? Math.min((accepted / capacity) * 100, 100) : 0

  const isTerminal =
    tournament.status === 'CANCELLED' ||
    tournament.status === 'COMPLETED' ||
    tournament.status === 'ARCHIVED'

  async function handlePublish() {
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/tournaments/${tournament.id}/publish`,
        { method: 'POST' }
      )
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error ?? 'Failed to publish tournament')
        return
      }
      toast.success('Tournament published!')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/tournaments/${tournament.id}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason || undefined }),
        }
      )
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error ?? 'Failed to cancel tournament')
        return
      }
      toast.success('Tournament cancelled')
      setCancelOpen(false)
      setCancelReason('')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard hover={false} className="p-5">
        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <MetaField label="Name" value={tournament.name} />
          <MetaField label="Game" value={gameLabel(tournament.game)} />
          <MetaField
            label="Mode"
            value={tournament.mode.replace(/_/g, ' ')}
          />
          <div className="space-y-1">
            <p className="text-xs text-white/40 uppercase tracking-wider">Status</p>
            <Badge variant={statusToBadgeVariant(tournament.status)}>
              {statusLabel(tournament.status)}
            </Badge>
          </div>
          <MetaField label="Entry" value={tournament.entryType} />
          <div className="space-y-1">
            <p className="text-xs text-white/40 uppercase tracking-wider">Capacity</p>
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-white/60">
                {accepted}/{capacity} teams
              </span>
            </div>
          </div>
          <MetaField label="Registration Opens" value={formatDate(tournament.registrationOpenAt)} />
          <MetaField label="Registration Closes" value={formatDate(tournament.registrationCloseAt)} />
          <MetaField label="Check-In Opens" value={formatDate(tournament.checkInOpenAt)} />
          <MetaField label="Starts" value={formatDate(tournament.startAt)} />
          <MetaField label="Ends" value={formatDate(tournament.endAt)} />
          {tournament.completedAt && (
            <MetaField label="Completed" value={formatDate(tournament.completedAt)} />
          )}
          {tournament.cancelledAt && (
            <MetaField label="Cancelled" value={formatDate(tournament.cancelledAt)} />
          )}
        </div>

        {tournament.description && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-white/70">{tournament.description}</p>
          </div>
        )}
      </GlassCard>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {tournament.status === 'DRAFT' && (
          <GlowButton
            variant="primary"
            size="md"
            disabled={actionLoading}
            onClick={() => void handlePublish()}
          >
            Publish Tournament
          </GlowButton>
        )}

        {!isTerminal && (
          <GlowButton
            variant="destructive"
            size="md"
            disabled={actionLoading}
            onClick={() => setCancelOpen(true)}
          >
            Cancel Tournament
          </GlowButton>
        )}

        {tournament.status === 'LIVE' && (
          <GlowButton
            variant="ghost"
            size="md"
            onClick={() =>
              router.push(
                `/servers/${guildId}/admin/tournaments/${tournament.id}/finalize`
              )
            }
          >
            Finalize →
          </GlowButton>
        )}
      </div>

      {/* Inline cancel reason panel */}
      {cancelOpen && (
        <div className="rounded-2xl border border-white/10 bg-[#0f0f19] p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-white">
            Cancel Tournament
          </h3>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (optional)"
            maxLength={500}
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
            aria-label="Cancellation reason"
          />
          <p className="text-xs text-white/30 text-right">{cancelReason.length}/500</p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setCancelOpen(false)
                setCancelReason('')
              }}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white/80">{value}</p>
    </div>
  )
}

// ─── Matches Tab ──────────────────────────────────────────────────────────────

function MatchesTab({
  guildId,
  tournament,
}: {
  guildId: string
  tournament: TournamentDetail
}) {
  const router = useRouter()

  return (
    <div className="space-y-5">
      <GlassCard hover={false} className="p-5">
        <p className="text-sm text-white/60 mb-4">
          Matches are managed per-tournament via the match scheduler. Use the button below
          to open the full scheduler where you can create, reschedule, and manage matches.
        </p>
        <GlowButton
          variant="primary"
          size="md"
          onClick={() =>
            router.push(
              `/servers/${guildId}/admin/tournaments/${tournament.id}/matches`
            )
          }
        >
          Open Match Scheduler
        </GlowButton>
      </GlassCard>

      {/* Stages summary table */}
      {tournament.stages.length > 0 && (
        <GlassCard hover={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="grid">
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap"
                  >
                    Stage
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap"
                  >
                    Matches
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap"
                  >
                    First Scheduled
                  </th>
                </tr>
              </thead>
              <tbody>
                {tournament.stages.map((stage) => {
                  const firstMatch = stage.matches.find(
                    (m) => m.scheduledStart !== null
                  )
                  return (
                    <tr
                      key={stage.id}
                      className="border-b border-white/10 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white">{stage.name}</td>
                      <td className="px-4 py-3 text-white/60">{stage.matches.length}</td>
                      <td className="px-4 py-3 text-white/60">
                        {firstMatch?.scheduledStart
                          ? formatDate(firstMatch.scheduledStart)
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  guildId,
  tournament,
}: {
  guildId: string
  tournament: TournamentDetail
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SettingsFormValues>({
    defaultValues: {
      name: tournament.name,
      description: tournament.description ?? '',
      visibility: tournament.visibility,
      teamCapacity: tournament.teamCapacity,
      rosterMin: tournament.rosterMin,
      rosterMax: tournament.rosterMax,
      registrationOpenAt: toDatetimeLocal(tournament.registrationOpenAt),
      registrationCloseAt: toDatetimeLocal(tournament.registrationCloseAt),
      checkInOpenAt: toDatetimeLocal(tournament.checkInOpenAt),
      checkInCloseAt: toDatetimeLocal(tournament.checkInCloseAt),
      startAt: toDatetimeLocal(tournament.startAt),
      endAt: toDatetimeLocal(tournament.endAt),
    },
  })

  async function onSubmit(values: SettingsFormValues) {
    const payload: Record<string, unknown> = {
      name: values.name,
      description: values.description || undefined,
      visibility: values.visibility,
      teamCapacity: Number(values.teamCapacity),
      rosterMin: Number(values.rosterMin),
      rosterMax: Number(values.rosterMax),
      registrationOpenAt: values.registrationOpenAt
        ? new Date(values.registrationOpenAt).toISOString()
        : null,
      registrationCloseAt: values.registrationCloseAt
        ? new Date(values.registrationCloseAt).toISOString()
        : null,
      checkInOpenAt: values.checkInOpenAt
        ? new Date(values.checkInOpenAt).toISOString()
        : null,
      checkInCloseAt: values.checkInCloseAt
        ? new Date(values.checkInCloseAt).toISOString()
        : null,
      startAt: values.startAt ? new Date(values.startAt).toISOString() : null,
      endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
    }

    try {
      const res = await fetch(
        `/api/servers/${guildId}/admin/tournaments/${tournament.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error ?? 'Failed to save settings')
        return
      }
      toast.success('Settings saved')
    } catch {
      toast.error('Network error. Please try again.')
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors'
  const labelClass = 'block text-sm font-medium text-white/80 mb-1'

  return (
    <GlassCard hover={false} className="p-5">
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="settings-name" className={labelClass}>
            Tournament Name
          </label>
          <input
            id="settings-name"
            type="text"
            {...register('name', { required: true, minLength: 3, maxLength: 100 })}
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="settings-desc" className={labelClass}>
            Description
          </label>
          <textarea
            id="settings-desc"
            rows={3}
            {...register('description', { maxLength: 500 })}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Visibility */}
        <div>
          <label htmlFor="settings-visibility" className={labelClass}>
            Visibility
          </label>
          <select
            id="settings-visibility"
            {...register('visibility')}
            className={inputClass}
          >
            <option value="public" className="bg-[#0f0f19]">
              Public
            </option>
            <option value="members_only" className="bg-[#0f0f19]">
              Members Only
            </option>
          </select>
        </div>

        {/* Capacity + Roster */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="settings-capacity" className={labelClass}>
              Team Capacity
            </label>
            <input
              id="settings-capacity"
              type="number"
              min={1}
              {...register('teamCapacity', { valueAsNumber: true })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-rosterMin" className={labelClass}>
              Roster Min
            </label>
            <input
              id="settings-rosterMin"
              type="number"
              min={1}
              {...register('rosterMin', { valueAsNumber: true })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-rosterMax" className={labelClass}>
              Roster Max
            </label>
            <input
              id="settings-rosterMax"
              type="number"
              min={1}
              {...register('rosterMax', { valueAsNumber: true })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-regOpen" className={labelClass}>
              Registration Opens
            </label>
            <input
              id="settings-regOpen"
              type="datetime-local"
              {...register('registrationOpenAt')}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-regClose" className={labelClass}>
              Registration Closes
            </label>
            <input
              id="settings-regClose"
              type="datetime-local"
              {...register('registrationCloseAt')}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-checkInOpen" className={labelClass}>
              Check-In Opens
            </label>
            <input
              id="settings-checkInOpen"
              type="datetime-local"
              {...register('checkInOpenAt')}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-checkInClose" className={labelClass}>
              Check-In Closes
            </label>
            <input
              id="settings-checkInClose"
              type="datetime-local"
              {...register('checkInCloseAt')}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-startAt" className={labelClass}>
              Tournament Start
            </label>
            <input
              id="settings-startAt"
              type="datetime-local"
              {...register('startAt')}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-endAt" className={labelClass}>
              Tournament End
            </label>
            <input
              id="settings-endAt"
              type="datetime-local"
              {...register('endAt')}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <GlowButton type="submit" variant="primary" size="md" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Settings'}
          </GlowButton>
        </div>
      </form>
    </GlassCard>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'registrations', label: 'Registrations' },
  { value: 'matches', label: 'Matches' },
  { value: 'settings', label: 'Settings' },
]

export function TournamentDetailPanel({
  guildId,
  tournament,
}: TournamentDetailPanelProps) {
  // Serialize registrations into RegistrationRow[] for ParticipantsTable
  const initialRegistrations: RegistrationRow[] = tournament.registrations.map((r) => ({
    id: r.id,
    status: r.status as RegistrationRow['status'],
    teamName: r.team.name,
    teamTag: r.team.tag,
    memberCount: r._count.members,
    slotNumber: r.slotNumber,
    createdAt: r.createdAt,
    approvedAt: r.approvedAt,
    rejectionReason: r.rejectionReason,
  }))

  return (
    <Tabs.Root defaultValue="overview" className="space-y-0">
      {/* Tab list */}
      <Tabs.List
        className="flex items-center gap-1 border-b border-white/10 overflow-x-auto"
        aria-label="Tournament detail sections"
      >
        {TABS.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap',
              'data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-violet-500/10',
              'data-[state=inactive]:border-transparent data-[state=inactive]:text-white/50',
              'data-[state=inactive]:hover:text-white/80 data-[state=inactive]:hover:bg-white/5',
            ].join(' ')}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* Overview */}
      <Tabs.Content value="overview" className="mt-5">
        <OverviewTab guildId={guildId} tournament={tournament} />
      </Tabs.Content>

      {/* Registrations */}
      <Tabs.Content value="registrations" className="mt-5">
        <ParticipantsTable
          guildId={guildId}
          tournamentId={tournament.id}
          initialData={initialRegistrations}
        />
      </Tabs.Content>

      {/* Matches */}
      <Tabs.Content value="matches" className="mt-5">
        <MatchesTab guildId={guildId} tournament={tournament} />
      </Tabs.Content>

      {/* Settings */}
      <Tabs.Content value="settings" className="mt-5">
        <SettingsTab guildId={guildId} tournament={tournament} />
      </Tabs.Content>
    </Tabs.Root>
  )
}
