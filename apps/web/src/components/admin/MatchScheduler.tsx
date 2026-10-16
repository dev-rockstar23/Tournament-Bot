'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { Plus, X, Calendar } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { Badge } from '@/components/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchRow {
  id: string
  number: number
  status: string
  scheduledStart: string | null
  scheduledEnd: string | null
  map: string | null
  mode: string | null
}

export interface StageWithMatches {
  id: string
  name: string
  matches: MatchRow[]
}

interface MatchSchedulerProps {
  guildId: string
  tournamentId: string
  stages: StageWithMatches[]
}

// ─── Flat match type for table ─────────────────────────────────────────────────

interface FlatMatch extends MatchRow {
  stageName: string
  stageId: string
}

// ─── Bulk match form row ───────────────────────────────────────────────────────

interface BulkMatchFormRow {
  stageId: string
  number: string
  scheduledStart: string
  scheduledEnd: string
  map: string
  mode: string
}

function emptyRow(): BulkMatchFormRow {
  return { stageId: '', number: '', scheduledStart: '', scheduledEnd: '', map: '', mode: '' }
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

function toDatetimeLocal(iso: string): string {
  // datetime-local input expects YYYY-MM-DDTHH:mm
  return iso.slice(0, 16)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MatchScheduler({ guildId, tournamentId, stages }: MatchSchedulerProps) {
  const router = useRouter()

  // All matches flattened for the table
  const allMatches = useMemo<FlatMatch[]>(
    () =>
      stages.flatMap((s) =>
        s.matches.map((m) => ({ ...m, stageName: s.name, stageId: s.id }))
      ),
    [stages]
  )

  // ─── Bulk create state ─────────────────────────────────────────────────────
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkMatchFormRow[]>([emptyRow()])
  const [bulkLoading, setBulkLoading] = useState(false)

  // ─── Reschedule state ──────────────────────────────────────────────────────
  const [rescheduleTarget, setRescheduleTarget] = useState<FlatMatch | null>(null)
  const [rescheduleStart, setRescheduleStart] = useState('')
  const [rescheduleEnd, setRescheduleEnd] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)

  const openReschedule = useCallback((match: FlatMatch) => {
    setRescheduleTarget(match)
    setRescheduleStart(match.scheduledStart ? toDatetimeLocal(match.scheduledStart) : '')
    setRescheduleEnd(match.scheduledEnd ? toDatetimeLocal(match.scheduledEnd) : '')
    setRescheduleReason('')
  }, [])

  // ─── Table columns ─────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<FlatMatch>[]>(
    () => [
      {
        accessorKey: 'stageName',
        header: 'Stage',
        cell: ({ getValue }) => (
          <span className="text-sm text-white/70">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'number',
        header: 'Match #',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-white">#{getValue() as number}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue() as string
          return <Badge variant={matchStatusVariant(s)}>{s.replace(/_/g, ' ')}</Badge>
        },
      },
      {
        accessorKey: 'scheduledStart',
        header: 'Scheduled Start',
        cell: ({ getValue }) => (
          <span className="text-sm text-white/70">
            {formatDatetime(getValue() as string | null)}
          </span>
        ),
      },
      {
        accessorKey: 'map',
        header: 'Map',
        cell: ({ getValue }) => (
          <span className="text-sm text-white/60">
            {(getValue() as string | null) ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'mode',
        header: 'Mode',
        cell: ({ getValue }) => (
          <span className="text-sm text-white/60">
            {(getValue() as string | null) ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const canReschedule =
            row.original.status === 'SCHEDULED' || row.original.status === 'POSTPONED'
          return (
            <button
              type="button"
              disabled={!canReschedule}
              onClick={() => openReschedule(row.original)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                canReschedule
                  ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed',
              ].join(' ')}
              aria-label={`Reschedule match #${row.original.number}`}
            >
              <Calendar size={12} aria-hidden="true" />
              Reschedule
            </button>
          )
        },
      },
    ],
    [openReschedule]
  )

  const table = useReactTable({
    data: allMatches,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // ─── Bulk create handlers ──────────────────────────────────────────────────

  function addBulkRow() {
    if (bulkRows.length < 10) {
      setBulkRows((prev) => [...prev, emptyRow()])
    }
  }

  function removeBulkRow(index: number) {
    setBulkRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateBulkRow(index: number, field: keyof BulkMatchFormRow, value: string) {
    setBulkRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  async function submitBulk() {
    for (const [i, row] of bulkRows.entries()) {
      if (!row.stageId || !row.number || !row.scheduledStart || !row.scheduledEnd) {
        toast.error(`Row ${i + 1}: stage, match number, start and end are required`)
        return
      }
    }

    setBulkLoading(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/tournaments/${tournamentId}/matches/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            bulkRows.map((row) => ({
              stageId: row.stageId,
              number: parseInt(row.number, 10),
              scheduledStart: new Date(row.scheduledStart).toISOString(),
              scheduledEnd: new Date(row.scheduledEnd).toISOString(),
              map: row.map || undefined,
              mode: row.mode || undefined,
            }))
          ),
        }
      )

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? 'Failed to create matches')
        return
      }

      const data = (await res.json()) as { matches: unknown[] }
      toast.success(`Created ${data.matches.length} match(es) successfully`)
      setBulkModalOpen(false)
      setBulkRows([emptyRow()])
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setBulkLoading(false)
    }
  }

  // ─── Reschedule handler ────────────────────────────────────────────────────

  async function submitReschedule() {
    if (!rescheduleTarget) return
    if (!rescheduleStart || !rescheduleEnd) {
      toast.error('Start and end time are required')
      return
    }

    setRescheduleLoading(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/matches/${rescheduleTarget.id}/schedule`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledStart: new Date(rescheduleStart).toISOString(),
            scheduledEnd: new Date(rescheduleEnd).toISOString(),
            reason: rescheduleReason || undefined,
          }),
        }
      )

      if (!res.ok) {
        const data = (await res.json()) as { error?: string; message?: string }
        toast.error(data.message ?? data.error ?? 'Failed to reschedule')
        return
      }

      toast.success(`Match #${rescheduleTarget.number} rescheduled`)
      setRescheduleTarget(null)
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setRescheduleLoading(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">{allMatches.length} match(es)</p>
        <GlowButton
          variant="primary"
          size="md"
          onClick={() => {
            setBulkRows([emptyRow()])
            setBulkModalOpen(true)
          }}
        >
          <Plus size={16} aria-hidden="true" />
          Bulk Create Matches
        </GlowButton>
      </div>

      {/* Matches table */}
      <GlassCard hover={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-white/10">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <p className="text-white/40 text-sm">No matches yet</p>
                    <p className="text-white/25 text-xs mt-1">
                      Use &quot;Bulk Create Matches&quot; to add matches to this tournament
                    </p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ─── Bulk Create Modal ─────────────────────────────────────────────── */}
      <Dialog.Root open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0f0f19] p-6 shadow-2xl max-h-[90vh] overflow-y-auto focus:outline-none"
            aria-describedby="bulk-modal-desc"
          >
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-white">
                Bulk Create Matches
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <p id="bulk-modal-desc" className="text-sm text-white/50 mb-4">
              Add up to 10 matches. Each match will automatically get 4 scheduled jobs.
            </p>

            <div className="space-y-3">
              {bulkRows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_1fr_1fr_1fr_1fr_auto] gap-2 items-end p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  {/* Stage */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Stage</label>
                    <select
                      value={row.stageId}
                      onChange={(e) => updateBulkRow(i, 'stageId', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      aria-label={`Stage for row ${i + 1}`}
                    >
                      <option value="" className="bg-[#0f0f19]">
                        Select stage
                      </option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0f0f19]">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Match # */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Match #</label>
                    <input
                      type="number"
                      min={1}
                      value={row.number}
                      onChange={(e) => updateBulkRow(i, 'number', e.target.value)}
                      placeholder="1"
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      aria-label={`Match number for row ${i + 1}`}
                    />
                  </div>

                  {/* Scheduled Start */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Start</label>
                    <input
                      type="datetime-local"
                      value={row.scheduledStart}
                      onChange={(e) => updateBulkRow(i, 'scheduledStart', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      aria-label={`Start time for row ${i + 1}`}
                    />
                  </div>

                  {/* Scheduled End */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">End</label>
                    <input
                      type="datetime-local"
                      value={row.scheduledEnd}
                      onChange={(e) => updateBulkRow(i, 'scheduledEnd', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      aria-label={`End time for row ${i + 1}`}
                    />
                  </div>

                  {/* Map */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Map</label>
                    <input
                      type="text"
                      value={row.map}
                      onChange={(e) => updateBulkRow(i, 'map', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      aria-label={`Map for row ${i + 1}`}
                    />
                  </div>

                  {/* Mode */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Mode</label>
                    <input
                      type="text"
                      value={row.mode}
                      onChange={(e) => updateBulkRow(i, 'mode', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      aria-label={`Mode for row ${i + 1}`}
                    />
                  </div>

                  {/* Remove row */}
                  <button
                    type="button"
                    onClick={() => removeBulkRow(i)}
                    disabled={bulkRows.length === 1}
                    className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed self-end"
                    aria-label={`Remove row ${i + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={addBulkRow}
                disabled={bulkRows.length >= 10}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                Add Row ({bulkRows.length}/10)
              </button>

              <div className="flex items-center gap-3">
                <Dialog.Close asChild>
                  <GlowButton variant="ghost" size="sm" disabled={bulkLoading}>
                    Cancel
                  </GlowButton>
                </Dialog.Close>
                <GlowButton
                  variant="primary"
                  size="sm"
                  onClick={submitBulk}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? 'Creating…' : `Create ${bulkRows.length} Match(es)`}
                </GlowButton>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ─── Reschedule Modal ──────────────────────────────────────────────── */}
      <Dialog.Root
        open={rescheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0f0f19] p-6 shadow-2xl focus:outline-none"
            aria-describedby="reschedule-modal-desc"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-white">
                Reschedule Match{rescheduleTarget ? ` #${rescheduleTarget.number}` : ''}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <p id="reschedule-modal-desc" className="text-sm text-white/50 mb-4">
              Existing pending scheduled jobs will be cancelled and new ones created.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="reschedule-start"
                  className="block text-sm font-medium text-white/70"
                >
                  New Start Time
                </label>
                <input
                  id="reschedule-start"
                  type="datetime-local"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reschedule-end"
                  className="block text-sm font-medium text-white/70"
                >
                  New End Time
                </label>
                <input
                  id="reschedule-end"
                  type="datetime-local"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reschedule-reason"
                  className="block text-sm font-medium text-white/70"
                >
                  Reason{' '}
                  <span className="text-white/30 font-normal">(optional)</span>
                </label>
                <textarea
                  id="reschedule-reason"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="e.g. Server maintenance, team request…"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 resize-none focus:outline-none focus:border-violet-500/50"
                />
                <p className="text-xs text-white/30 text-right">
                  {rescheduleReason.length}/500
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close asChild>
                <GlowButton variant="ghost" size="sm" disabled={rescheduleLoading}>
                  Cancel
                </GlowButton>
              </Dialog.Close>
              <GlowButton
                variant="primary"
                size="sm"
                onClick={submitReschedule}
                disabled={rescheduleLoading}
              >
                {rescheduleLoading ? 'Saving…' : 'Reschedule'}
              </GlowButton>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
