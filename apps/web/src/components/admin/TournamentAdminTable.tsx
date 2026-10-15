'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  MoreVertical,
  Plus,
  Search,
  Check,
  Trophy,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import type { AppRole } from '@esports/permissions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminTournament {
  id: string
  name: string
  game: 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE'
  mode: string
  status: string
  entryType: string
  teamCapacity: number
  acceptedCount: number
  registrationOpenAt: string | null
  registrationCloseAt: string | null
  startAt: string | null
  endAt: string | null
  visibility: string
  description: string | null
  createdAt: string
  updatedAt: string
  stages?: Array<{ name: string; status: string }>
}

interface TournamentAdminTableProps {
  guildId: string
  initialData: AdminTournament[]
  userRole: AppRole
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

function gameBadgeClass(game: string): string {
  switch (game) {
    case 'BGMI':
      return 'bg-violet-500/15 border-violet-500/30 text-violet-300'
    case 'FREE_FIRE':
      return 'bg-orange-500/15 border-orange-500/30 text-orange-300'
    case 'COD_MOBILE':
      return 'bg-green-500/15 border-green-500/30 text-green-300'
    default:
      return 'bg-white/10 border-white/20 text-white/70'
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Sync icon ────────────────────────────────────────────────────────────────

function SyncIcon({ status }: { status: 'synced' | 'pending' | 'failed' }) {
  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400" title="Synced">
        <Check size={12} aria-hidden="true" />
        Synced
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-400" title="Pending">
        <Clock size={12} aria-hidden="true" />
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400" title="Failed">
      <AlertTriangle size={12} aria-hidden="true" />
      Failed
    </span>
  )
}

// ─── Actions Dropdown ─────────────────────────────────────────────────────────

function ActionsMenu({
  tournament,
  guildId,
  onActionDone,
}: {
  tournament: AdminTournament
  guildId: string
  onActionDone: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleCancel() {
    const reason = prompt(
      `Cancel "${tournament.name}"?\n\nProvide a reason (required):`
    )
    if (reason === null) return // user dismissed
    if (!reason.trim()) {
      alert('A cancellation reason is required.')
      return
    }
    await fetch(`/api/servers/${guildId}/tournaments/${tournament.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setOpen(false)
    onActionDone()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <>
          {/* Click-away overlay */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-8 z-20 min-w-[160px] rounded-xl border border-white/10 bg-[#0f0f19] shadow-xl overflow-hidden"
          >
            <button
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5 transition-colors"
              onClick={() => {
                router.push(`/servers/${guildId}/admin/tournaments/${tournament.id}`)
                setOpen(false)
              }}
            >
              View
            </button>
            <button
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5 transition-colors"
              onClick={() => {
                router.push(`/servers/${guildId}/admin/tournaments/${tournament.id}/edit`)
                setOpen(false)
              }}
            >
              Edit
            </button>
            <button
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-white/50 hover:bg-white/5 transition-colors cursor-not-allowed"
              disabled
              aria-disabled="true"
              title="Coming soon"
            >
              Duplicate
            </button>
            <div className="border-t border-white/10" />
            <button
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-white/50 hover:bg-white/5 transition-colors cursor-not-allowed"
              disabled
              aria-disabled="true"
              title="Coming soon"
            >
              Archive
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Registration Open', value: 'REGISTRATION_OPEN' },
  { label: 'Live', value: 'LIVE' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const GAME_OPTIONS = [
  { label: 'All Games', value: '' },
  { label: 'BGMI', value: 'BGMI' },
  { label: 'Free Fire', value: 'FREE_FIRE' },
  { label: 'COD Mobile', value: 'COD_MOBILE' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function TournamentAdminTable({
  guildId,
  initialData,
  userRole: _userRole, // available for future role-gated actions
}: TournamentAdminTableProps) {
  const router = useRouter()
  const parentRef = useRef<HTMLDivElement>(null)

  const [tournaments, setTournaments] = useState<AdminTournament[]>(initialData)
  const [total, setTotal] = useState(initialData.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [gameFilter, setGameFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)

  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [page] = useState(1)

  const fetchTournaments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      if (gameFilter) qs.set('game', gameFilter)
      if (debouncedSearch) qs.set('search', debouncedSearch)
      qs.set('page', String(page))
      qs.set('limit', '100')

      const res = await fetch(`/api/servers/${guildId}/admin/tournaments?${qs.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch tournaments')
      const data = (await res.json()) as {
        tournaments: AdminTournament[]
        total: number
      }
      setTournaments(data.tournaments)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [guildId, statusFilter, gameFilter, debouncedSearch, page])

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  const columns = useMemo<ColumnDef<AdminTournament>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded accent-violet-500"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded accent-violet-500"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Select row"
          />
        ),
        size: 40,
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <a
              href={`/servers/${guildId}/admin/tournaments/${row.original.id}`}
              className="font-medium text-white hover:text-violet-300 transition-colors"
            >
              {row.original.name}
            </a>
            <p className="text-xs text-white/40">
              {gameLabel(row.original.game)} · {row.original.mode.replace(/_/g, ' ')}
            </p>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'game',
        header: 'Game',
        cell: ({ getValue }) => {
          const g = getValue() as string
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${gameBadgeClass(g)}`}
            >
              {gameLabel(g)}
            </span>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue() as string
          return <Badge variant={statusToBadgeVariant(s)}>{statusLabel(s)}</Badge>
        },
        enableSorting: false,
      },
      {
        id: 'schedule',
        header: 'Schedule',
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs">
            <p className="text-white/70">{formatDate(row.original.startAt)}</p>
            {row.original.registrationCloseAt && (
              <p className="text-white/40">
                Reg. closes: {formatDate(row.original.registrationCloseAt)}
              </p>
            )}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'capacity',
        header: 'Capacity',
        cell: ({ row }) => {
          const accepted = row.original.acceptedCount
          const capacity = row.original.teamCapacity
          const pct = capacity > 0 ? Math.min((accepted / capacity) * 100, 100) : 0
          return (
            <div className="space-y-1 min-w-[100px]">
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-white/50 whitespace-nowrap">
                {accepted}/{capacity} teams
              </span>
            </div>
          )
        },
        enableSorting: false,
      },
      {
        id: 'stage',
        header: 'Stage',
        cell: ({ row }) => {
          const stages = row.original.stages ?? []
          const activeStage = stages.find((s) => s.status === 'active' || s.status === 'live')
          return (
            <span className="text-xs text-white/60">
              {activeStage ? activeStage.name : 'Not started'}
            </span>
          )
        },
        enableSorting: false,
      },
      {
        id: 'sync',
        header: 'Sync',
        cell: () => <SyncIcon status="synced" />,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <ActionsMenu
            tournament={row.original}
            guildId={guildId}
            onActionDone={fetchTournaments}
          />
        ),
        size: 48,
        enableSorting: false,
      },
    ],
    [guildId, fetchTournaments]
  )

  const table = useReactTable({
    data: tournaments,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  const rows = table.getRowModel().rows

  // Virtual scrolling for the row list
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // approximate row height in px
    overscan: 10,
  })

  const selectedCount = Object.values(rowSelection).filter(Boolean).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-white">Tournaments</h1>
          <p className="text-white/50 text-sm mt-1">{total} total</p>
        </div>
        <GlowButton
          variant="primary"
          size="md"
          onClick={() => router.push(`/servers/${guildId}/admin/tournaments/new`)}
        >
          <Plus size={16} aria-hidden="true" />
          New Tournament
        </GlowButton>
      </div>

      {/* Status filter tabs */}
      <div
        className="flex items-center gap-1 border-b border-white/10 overflow-x-auto"
        role="tablist"
        aria-label="Filter by status"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap',
              statusFilter === tab.value
                ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/5',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search with 300ms debounce */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search tournaments…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
            aria-label="Search tournaments"
          />
        </div>

        {/* Game filter dropdown */}
        <select
          value={gameFilter}
          onChange={(e) => setGameFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
          aria-label="Filter by game"
        >
          {GAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0f0f19]">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <span className="text-sm text-violet-300">{selectedCount} selected</span>
          <GlowButton
            variant="destructive"
            size="sm"
            onClick={async () => {
              const reason = prompt(
                `Cancel ${selectedCount} tournament(s)? Provide a reason:`
              )
              if (!reason) return
              const selectedIds = rows
                .filter((r) => rowSelection[r.id])
                .map((r) => r.original.id)
              await Promise.all(
                selectedIds.map((id) =>
                  fetch(`/api/servers/${guildId}/tournaments/${id}/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason }),
                  })
                )
              )
              setRowSelection({})
              fetchTournaments()
            }}
          >
            Cancel Selected
          </GlowButton>
          <button
            type="button"
            className="text-sm text-white/50 hover:bg-white/5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white/70 transition-colors cursor-not-allowed"
            disabled
            title="Archive: coming soon"
            aria-disabled="true"
          >
            Archive Selected
          </button>
          <button
            type="button"
            className="ml-auto text-sm text-white/40 hover:text-white/70 transition-colors"
            onClick={() => setRowSelection({})}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <GlassCard className="p-4 border-red-500/20 text-red-400 text-sm" role="alert">
          {error}
        </GlassCard>
      )}

      {/* Table */}
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
                      style={{
                        width:
                          header.column.getSize() !== 150
                            ? header.column.getSize()
                            : undefined,
                      }}
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

            {/* Virtualized body for 1000+ rows */}
            <tbody>
              {loading ? (
                // Loading skeleton — 5 rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <Trophy
                        size={40}
                        className="text-white/20"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-white/60 font-medium">No tournaments yet</p>
                        <p className="text-white/30 text-xs mt-1">
                          Create your first tournament to get started
                        </p>
                      </div>
                      <GlowButton
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          router.push(`/servers/${guildId}/admin/tournaments/new`)
                        }
                      >
                        <Plus size={14} aria-hidden="true" />
                        New Tournament
                      </GlowButton>
                    </div>
                  </td>
                </tr>
              ) : (
                // Virtual scroll container
                <>
                  {/* Spacer to push the real rows down */}
                  {rowVirtualizer.getVirtualItems().length > 0 &&
                    rowVirtualizer.getVirtualItems()[0]?.start > 0 && (
                      <tr
                        style={{
                          height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0,
                        }}
                      />
                    )}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index]
                    if (!row) return null
                    return (
                      <tr
                        key={row.id}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors bg-deep-violet/30"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {/* Bottom spacer */}
                  {rowVirtualizer.getVirtualItems().length > 0 && (() => {
                    const lastItem =
                      rowVirtualizer.getVirtualItems()[
                        rowVirtualizer.getVirtualItems().length - 1
                      ]
                    const totalSize = rowVirtualizer.getTotalSize()
                    const endOffset = lastItem
                      ? totalSize - lastItem.start - lastItem.size
                      : 0
                    return endOffset > 0 ? (
                      <tr style={{ height: endOffset }} />
                    ) : null
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Scroll container for virtualizer — wraps the table for >200 rows */}
        {rows.length > 200 && (
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ height: '600px' }}
            aria-label="Tournament list"
          />
        )}
      </GlassCard>
    </div>
  )
}
