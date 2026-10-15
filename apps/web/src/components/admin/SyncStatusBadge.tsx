'use client'
import { useEffect, useState } from 'react'
import { StatusPulse } from '@/components/ui/StatusPulse'

interface SyncStatus {
  status: 'SYNCED' | 'PENDING' | 'DEGRADED'
  pendingCount: number
  failedCount: number
  lastDeliveredAt: string | null
}

interface SyncStatusBadgeProps {
  guildId: string
}

export function SyncStatusBadge({ guildId }: SyncStatusBadgeProps) {
  const [data, setData] = useState<SyncStatus | null>(null)
  const [expanded, setExpanded] = useState(false)

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/servers/${guildId}/sync-status`)
      if (res.ok) {
        const json = (await res.json()) as SyncStatus
        setData(json)
      }
    } catch {
      // Silently ignore network errors — stale data is fine
    }
  }

  useEffect(() => {
    void fetchStatus()
    const id = setInterval(() => void fetchStatus(), 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId])

  if (!data) return null

  const variant =
    data.status === 'SYNCED'
      ? 'synced'
      : data.status === 'PENDING'
        ? 'pending'
        : 'live' // live = red for DEGRADED

  const label =
    data.status === 'SYNCED'
      ? 'Synced'
      : data.status === 'PENDING'
        ? 'Sync Pending'
        : 'Needs Attention'

  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors w-full"
        aria-expanded={expanded}
      >
        <StatusPulse variant={variant} />
        <span>{label}</span>
      </button>

      {expanded && (
        <div className="mt-2 rounded-md bg-[rgba(255,255,255,0.04)] border border-white/10 p-3 text-xs space-y-1 text-[var(--color-text-secondary)]">
          <p>
            <span className="text-white/60">Pending:</span>{' '}
            <span className="text-white">{data.pendingCount}</span>
          </p>
          <p>
            <span className="text-white/60">Failed:</span>{' '}
            <span className={data.failedCount > 0 ? 'text-red-400' : 'text-white'}>
              {data.failedCount}
            </span>
          </p>
          <p>
            <span className="text-white/60">Last delivered:</span>{' '}
            <span className="text-white">
              {data.lastDeliveredAt
                ? new Date(data.lastDeliveredAt).toLocaleString()
                : '—'}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
