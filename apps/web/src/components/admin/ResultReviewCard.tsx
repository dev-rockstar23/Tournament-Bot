'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowButton } from '@/components/ui/GlowButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScorecardEntry {
  teamId: string
  placement: number
  kills: number
  penalties: number
}

export interface ResultReviewCardProps {
  guildId: string
  matchId: string
  matchNumber: number
  tournamentName: string
  scheduledStart: string
  submission: {
    id: string
    submittedBy: string
    scorecardJson: unknown
    evidenceUrl: string | null
    createdAt: string
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultReviewCard({
  guildId,
  matchId,
  matchNumber,
  tournamentName,
  scheduledStart,
  submission,
}: ResultReviewCardProps) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const scorecard = (
    Array.isArray(submission.scorecardJson) ? submission.scorecardJson : []
  ) as ScorecardEntry[]

  const handleApprove = useCallback(async () => {
    setApproving(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/matches/${matchId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? 'Failed to approve result')
        return
      }
      toast.success('Result approved and match completed')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setApproving(false)
    }
  }, [guildId, matchId, router])

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setRejecting(true)
    try {
      const res = await fetch(
        `/api/servers/${guildId}/matches/${matchId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? 'Failed to reject result')
        return
      }
      toast.success('Result rejected — match returned to awaiting result')
      setRejectOpen(false)
      setRejectReason('')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setRejecting(false)
    }
  }, [guildId, matchId, rejectReason, router])

  return (
    <GlassCard hover={false} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-white">
            Match {matchNumber} — {tournamentName}
          </h3>
          <p className="text-white/40 text-xs mt-0.5">
            Scheduled:{' '}
            {new Date(scheduledStart).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded-md">
          <Clock className="w-3 h-3" />
          <span>Under Review</span>
        </div>
      </div>

      {/* Submission meta */}
      <div className="text-xs text-white/50 space-y-0.5">
        <p>
          Submitted by: <span className="text-white/80">{submission.submittedBy}</span>
        </p>
        <p>
          At:{' '}
          <span className="text-white/80">
            {new Date(submission.createdAt).toLocaleString('en-IN')}
          </span>
        </p>
        {submission.evidenceUrl && (
          <a
            href={submission.evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--color-primary,#7c3aed)] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View Evidence
          </a>
        )}
      </div>

      {/* Scorecard table */}
      {scorecard.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-3 py-2 text-left text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Team
                </th>
                <th className="px-3 py-2 text-center text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Placement
                </th>
                <th className="px-3 py-2 text-center text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Kills
                </th>
                <th className="px-3 py-2 text-center text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Penalties
                </th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((entry, i) => (
                <tr
                  key={entry.teamId}
                  className={`border-b border-white/5 last:border-0 ${
                    i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                  }`}
                >
                  <td className="px-3 py-2 text-white/80 font-mono text-xs truncate max-w-[120px]">
                    {entry.teamId}
                  </td>
                  <td className="px-3 py-2 text-center text-white font-bold">
                    #{entry.placement}
                  </td>
                  <td className="px-3 py-2 text-center text-white">
                    {entry.kills}
                  </td>
                  <td className="px-3 py-2 text-center text-red-400">
                    {entry.penalties > 0 ? `-${entry.penalties}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-white/40 text-sm italic">No scorecard entries</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <GlowButton
          variant="secondary"
          size="sm"
          onClick={handleApprove}
          disabled={approving || rejecting}
          className="flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border-green-500/50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {approving ? 'Approving…' : 'Approve'}
        </GlowButton>

        <Dialog.Root open={rejectOpen} onOpenChange={setRejectOpen}>
          <Dialog.Trigger asChild>
            <GlowButton
              variant="destructive"
              size="sm"
              disabled={approving || rejecting}
              className="flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </GlowButton>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
            <Dialog.Content
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[#0d0d14] shadow-2xl space-y-4 focus:outline-none"
            >
              <Dialog.Title className="font-display text-lg font-bold text-white">
                Reject Result — Match {matchNumber}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-white/50">
                Provide a reason for rejecting this submission. The match will return to
                awaiting result.
              </Dialog.Description>
              <textarea
                className="w-full h-32 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
                placeholder="Explain why the result is being rejected…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={1000}
              />
              <p className="text-right text-xs text-white/30">{rejectReason.length}/1000</p>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <GlowButton variant="ghost" size="sm" disabled={rejecting}>
                    Cancel
                  </GlowButton>
                </Dialog.Close>
                <GlowButton
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={rejecting || !rejectReason.trim()}
                >
                  {rejecting ? 'Rejecting…' : 'Confirm Reject'}
                </GlowButton>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </GlassCard>
  )
}
