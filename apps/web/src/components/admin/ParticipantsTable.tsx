'use client'

import { useState, useMemo, useCallback } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { GlassCard } from '@/components/ui/GlassCard'
import { CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegistrationRow {
  id: string
  status: 'PENDING' | 'APPROVED' | 'WAITLISTED' | 'REJECTED'
  teamName: string
  teamTag: string | null
  memberCount: number
  slotNumber: number | null
  createdAt: string
  approvedAt: string | null
  rejectionReason: string | null
}

interface ParticipantsTableProps {
  guildId: string
  tournamentId: string
  initialData: RegistrationRow[]
}

type TabValue = 'PENDING' | 'APPROVED' | 'WAITLISTED' | 'REJECTED'

// ─── Action dialog state ──────────────────────────────────────────────────────

interface ActionState {
  registrationId: string
  action: 'approve' | 'reject' | 'request_correction'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ParticipantsTable({
  guildId,
  tournamentId,
  initialData,
}: ParticipantsTableProps) {
  const [rows, setRows] = useState<RegistrationRow[]>(initialData)
  const [activeTab, setActiveTab] = useState<TabValue>('PENDING')
  const [pendingAction, setPendingAction] = useState<ActionState | null>(null)
  const [reasonInput, setReasonInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  // Re-fetch list from the admin GET endpoint
  const refetch = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/servers/${guildId}/tournaments/${tournamentId}/registrations`
      )
      if (!res.ok) throw new Error('Failed to fetch')
      const data = (await res.json()) as {
        registrations: Array<{
          id: string
          status: string
          slotNumber: number | null
          createdAt: string
          approvedAt: string | null
          rejectionReason: string | null
          team: { name: string; tag: string | null }
          _count: { members: number }
        }>
      }
      setRows(
        data.registrations.map((r) => ({
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
      )
    } catch (err) {
      console.error('[ParticipantsTable] refetch failed', err)
    }
  }, [guildId, tournamentId])

  // Execute an action via PATCH
  const executeAction = useCallback(
    async (registrationId: string, action: 'approve' | 'reject' | 'request_correction', reason?: string) => {
      setActionLoading(true)
      try {
        const res = await fetch(
          `/api/servers/${guildId}/registrations/${registrationId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, reason: reason || undefined }),
          }
        )
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(body.error ?? 'Action failed')
          return
        }
        const label =
          action === 'approve'
            ? 'Registration approved'
            : action === 'reject'
            ? 'Registration rejected'
            : 'Correction requested'
        toast.success(label)
        setPendingAction(null)
        setReasonInput('')
        await refetch()
      } catch {
        toast.error('Network error. Please try again.')
      } finally {
        setActionLoading(false)
      }
    },
    [guildId, refetch]
  )

  // Tab data
  const tabData = useMemo<Record<TabValue, RegistrationRow[]>>(
    () => ({
      PENDING: rows.filter((r) => r.status === 'PENDING'),
      APPROVED: rows.filter((r) => r.status === 'APPROVED'),
      WAITLISTED: rows.filter((r) => r.status === 'WAITLISTED'),
      REJECTED: rows.filter((r) => r.status === 'REJECTED'),
    }),
    [rows]
  )

  // Columns for the active tab
  const columns = useMemo<ColumnDef<RegistrationRow>[]>(() => {
    const base: ColumnDef<RegistrationRow>[] = [
      {
        id: 'team',
        header: 'Team',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <span className="font-medium text-white">{row.original.teamName}</span>
            {row.original.teamTag && (
              <span className="ml-1.5 text-xs text-white/40">[{row.original.teamTag}]</span>
            )}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'members',
        header: 'Members',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-sm text-white/70">
            <Users size={14} aria-hidden="true" />
            {row.original.memberCount}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'registeredAt',
        header: 'Registered',
        accessorKey: 'createdAt',
        cell: ({ row }) => (
          <span className="text-sm text-white/60">{formatDate(row.original.createdAt)}</span>
        ),
        enableSorting: true,
      },
    ]

    // Slot column only on Approved tab
    if (activeTab === 'APPROVED') {
      base.push({
        id: 'slot',
        header: 'Slot',
        cell: ({ row }) => (
          <span className="text-sm font-mono text-violet-300">
            {row.original.slotNumber ?? '—'}
          </span>
        ),
        enableSorting: true,
      })
    }

    // Actions column
    base.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          activeTab={activeTab}
          onAction={(action) => {
            if (action === 'approve') {
              // No reason needed for approve — fire directly
              void executeAction(row.original.id, 'approve')
            } else {
              setPendingAction({ registrationId: row.original.id, action })
              setReasonInput('')
            }
          }}
        />
      ),
      enableSorting: false,
      size: 220,
    })

    return base
  }, [activeTab, executeAction])

  const table = useReactTable({
    data: tabData[activeTab],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const TABS: { value: TabValue; label: string; count: number }[] = [
    { value: 'PENDING', label: 'Pending', count: tabData.PENDING.length },
    { value: 'APPROVED', label: 'Approved', count: tabData.APPROVED.length },
    { value: 'WAITLISTED', label: 'Waitlisted', count: tabData.WAITLISTED.length },
    { value: 'REJECTED', label: 'Rejected', count: tabData.REJECTED.length },
  ]

  return (
    <div className="space-y-6">
      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        {/* Tab list */}
        <Tabs.List
          className="flex items-center gap-1 border-b border-white/10 overflow-x-auto"
          aria-label="Filter registrations by status"
        >
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={[
                'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex items-center gap-2',
                activeTab === tab.value
                  ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                  : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/5',
              ].join(' ')}
            >
              {tab.label}
              <span
                className={[
                  'inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs font-semibold px-1.5',
                  activeTab === tab.value
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-white/10 text-white/40',
                ].join(' ')}
              >
                {tab.count}
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Tab content — one panel per status */}
        {TABS.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value} className="mt-4">
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
                            {header.isPlaceholder ? null : (
                              <button
                                type="button"
                                className={
                                  header.column.getCanSort()
                                    ? 'cursor-pointer select-none hover:text-white/80'
                                    : 'cursor-default'
                                }
                                onClick={header.column.getToggleSortingHandler()}
                                aria-label={
                                  header.column.getCanSort()
                                    ? `Sort by ${header.column.id}`
                                    : undefined
                                }
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getIsSorted() === 'asc' && (
                                  <span aria-label="sorted ascending"> ↑</span>
                                )}
                                {header.column.getIsSorted() === 'desc' && (
                                  <span aria-label="sorted descending"> ↓</span>
                                )}
                              </button>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-4 py-12 text-center text-white/40 text-sm"
                        >
                          No {tab.label.toLowerCase()} registrations
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
          </Tabs.Content>
        ))}
      </Tabs.Root>

      {/* Reason modal for reject / request_correction */}
      {pendingAction && (
        <ReasonModal
          action={pendingAction.action}
          loading={actionLoading}
          reason={reasonInput}
          onReasonChange={setReasonInput}
          onConfirm={() =>
            void executeAction(
              pendingAction.registrationId,
              pendingAction.action,
              reasonInput || undefined
            )
          }
          onCancel={() => {
            setPendingAction(null)
            setReasonInput('')
          }}
        />
      )}
    </div>
  )
}

// ─── Row action buttons ───────────────────────────────────────────────────────

function RowActions({
  row,
  activeTab,
  onAction,
}: {
  row: RegistrationRow
  activeTab: TabValue
  onAction: (action: 'approve' | 'reject' | 'request_correction') => void
}) {
  return (
    <div className="flex items-center gap-2">
      {(activeTab === 'PENDING' || activeTab === 'WAITLISTED') && (
        <button
          type="button"
          onClick={() => onAction('approve')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
          aria-label={`Approve ${row.teamName}`}
        >
          <CheckCircle size={12} aria-hidden="true" />
          Approve
        </button>
      )}
      {activeTab === 'PENDING' && (
        <>
          <button
            type="button"
            onClick={() => onAction('reject')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            aria-label={`Reject ${row.teamName}`}
          >
            <XCircle size={12} aria-hidden="true" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => onAction('request_correction')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
            aria-label={`Request correction for ${row.teamName}`}
          >
            <AlertCircle size={12} aria-hidden="true" />
            Correction
          </button>
        </>
      )}
      {activeTab === 'REJECTED' && (
        <span className="text-xs text-white/30 italic">
          {row.rejectionReason ?? '—'}
        </span>
      )}
    </div>
  )
}

// ─── Reason modal ─────────────────────────────────────────────────────────────

function ReasonModal({
  action,
  loading,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  action: 'approve' | 'reject' | 'request_correction'
  loading: boolean
  reason: string
  onReasonChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const isReject = action === 'reject'
  const title = isReject ? 'Reject Registration' : 'Request Correction'
  const placeholder = isReject
    ? 'Reason for rejection (optional)'
    : 'Describe the correction required (optional)'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reason-modal-title"
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#0f0f19] p-6 shadow-2xl">
        <h2
          id="reason-modal-title"
          className="font-display text-lg font-bold text-white mb-4"
        >
          {title}
        </h2>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
          aria-label={placeholder}
        />
        <p className="text-xs text-white/30 mt-1 text-right">{reason.length}/500</p>
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              'px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50',
              isReject
                ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                : 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30',
            ].join(' ')}
          >
            {loading ? 'Saving…' : title}
          </button>
        </div>
      </div>
    </div>
  )
}
