'use client'

import { useCallback } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as Tabs from '@radix-ui/react-tabs'
import { AlertTriangle, Clock, Inbox } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'
import { Badge } from '@/components/ui/Badge'
import { ResultReviewCard } from './ResultReviewCard'
import type {
  SerializedMatchWithSubmission,
  SerializedDispute,
} from '@/app/servers/[guildId]/admin/results/page'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResultsQueueProps {
  guildId: string
  pendingSubmission: SerializedMatchWithSubmission[]
  underReview: SerializedMatchWithSubmission[]
  disputes: SerializedDispute[]
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-white/30">
      <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

// ─── Dispute Card ─────────────────────────────────────────────────────────────

function DisputeCard({
  dispute,
  guildId,
  onAction,
}: {
  dispute: SerializedDispute
  guildId: string
  onAction: () => void
}) {
  const [loading, setLoading] = useState<'resolve' | 'dismiss' | null>(null)

  const handleAction = useCallback(
    async (type: 'resolve' | 'dismiss') => {
      setLoading(type)
      try {
        // TODO: implement PATCH /api/servers/[guildId]/disputes/[disputeId]
        toast.info(`Dispute ${type === 'resolve' ? 'resolution' : 'dismissal'} coming soon`)
        void guildId
      } finally {
        setLoading(null)
      }
      onAction()
    },
    [guildId, onAction]
  )

  return (
    <GlassCard hover={false} className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-white">
            Match {dispute.matchNumber} — {dispute.tournamentName}
          </h3>
          <p className="text-white/40 text-xs mt-0.5">
            Raised by: {dispute.raisedBy} ·{' '}
            {new Date(dispute.createdAt).toLocaleDateString('en-IN')}
          </p>
        </div>
        <Badge variant="live">OPEN</Badge>
      </div>

      <p className="text-sm text-white/70 bg-white/5 rounded-lg px-3 py-2 whitespace-pre-wrap">
        {dispute.reason}
      </p>

      {dispute.evidenceUrl && (
        <a
          href={dispute.evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--color-primary,#7c3aed)] hover:underline inline-flex items-center gap-1"
        >
          View evidence ↗
        </a>
      )}

      <div className="flex items-center gap-3 pt-1">
        <GlowButton
          variant="secondary"
          size="sm"
          onClick={() => handleAction('resolve')}
          disabled={!!loading}
          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border-green-500/50"
        >
          {loading === 'resolve' ? 'Resolving…' : 'Resolve'}
        </GlowButton>
        <GlowButton
          variant="ghost"
          size="sm"
          onClick={() => handleAction('dismiss')}
          disabled={!!loading}
        >
          {loading === 'dismiss' ? 'Dismissing…' : 'Dismiss'}
        </GlowButton>
      </div>
    </GlassCard>
  )
}

// ─── Tab trigger style helper ─────────────────────────────────────────────────

const triggerBase =
  'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus:outline-none select-none ' +
  'text-white/40 hover:text-white/70 hover:bg-white/5 ' +
  'data-[state=active]:bg-white/10 data-[state=active]:text-white'

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResultsQueue({
  guildId,
  pendingSubmission,
  underReview,
  disputes,
}: ResultsQueueProps) {
  const router = useRouter()
  const refresh = useCallback(() => router.refresh(), [router])

  return (
    <Tabs.Root defaultValue="under-review" className="space-y-4">
      <Tabs.List className="flex gap-2 bg-white/5 rounded-xl p-1.5 w-fit">
        <Tabs.Trigger value="pending" className={triggerBase}>
          <Clock className="w-4 h-4" />
          Pending Submission
          {pendingSubmission.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
              {pendingSubmission.length}
            </span>
          )}
        </Tabs.Trigger>

        <Tabs.Trigger value="under-review" className={triggerBase}>
          <AlertTriangle className="w-4 h-4" />
          Under Review
          {underReview.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-400/20 text-yellow-400 rounded-full">
              {underReview.length}
            </span>
          )}
        </Tabs.Trigger>

        <Tabs.Trigger value="disputes" className={triggerBase}>
          {/* Using AlertTriangle for disputes since no dedicated icon imported */}
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Disputes
          {disputes.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-400/20 text-red-400 rounded-full">
              {disputes.length}
            </span>
          )}
        </Tabs.Trigger>
      </Tabs.List>

      {/* Pending Submission tab */}
      <Tabs.Content value="pending">
        {pendingSubmission.length === 0 ? (
          <EmptyState label="No matches awaiting result submission" />
        ) : (
          <div className="space-y-3">
            {pendingSubmission.map((m) => (
              <GlassCard key={m.id} hover={false} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-base font-bold text-white">
                      Match {m.number} — {m.tournamentName}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      Scheduled:{' '}
                      {new Date(m.scheduledStart).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge variant="upcoming">Awaiting Result</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </Tabs.Content>

      {/* Under Review tab */}
      <Tabs.Content value="under-review">
        {underReview.length === 0 ? (
          <EmptyState label="No results pending review" />
        ) : (
          <div className="space-y-3">
            {underReview.map((m) =>
              m.submission ? (
                <ResultReviewCard
                  key={m.id}
                  guildId={guildId}
                  matchId={m.id}
                  matchNumber={m.number}
                  tournamentName={m.tournamentName}
                  scheduledStart={m.scheduledStart}
                  submission={m.submission}
                />
              ) : (
                <GlassCard key={m.id} hover={false} className="p-4">
                  <p className="text-white/40 text-sm">
                    Match {m.number} is under review but has no pending submission on record.
                  </p>
                </GlassCard>
              )
            )}
          </div>
        )}
      </Tabs.Content>

      {/* Disputes tab */}
      <Tabs.Content value="disputes">
        {disputes.length === 0 ? (
          <EmptyState label="No open disputes" />
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <DisputeCard
                key={d.id}
                dispute={d}
                guildId={guildId}
                onAction={refresh}
              />
            ))}
          </div>
        )}
      </Tabs.Content>
    </Tabs.Root>
  )
}
