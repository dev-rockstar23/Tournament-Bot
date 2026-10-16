import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { ResultsQueue } from '@/components/admin/ResultsQueue'

interface PageProps {
  params: { guildId: string }
}

// ─── Serializable shapes ──────────────────────────────────────────────────────

export interface SerializedResultSubmission {
  id: string
  matchId: string
  submittedBy: string
  scorecardJson: unknown
  evidenceUrl: string | null
  // status is ALWAYS omitted from here — PENDING_REVIEW submissions are
  // fetched server-side only and never serialized with status to the client
  createdAt: string
}

export interface SerializedMatchWithSubmission {
  id: string
  number: number
  status: string
  scheduledStart: string
  tournamentName: string
  stageId: string
  submission: SerializedResultSubmission | null
}

export interface SerializedDispute {
  id: string
  matchId: string
  matchNumber: number
  tournamentName: string
  raisedBy: string
  reason: string
  evidenceUrl: string | null
  status: string
  createdAt: string
}

export default async function AdminResultsPage({ params }: PageProps) {
  const { guildId } = params

  // Auth guard: REFEREE+
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/results`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  if (userRole < AppRole.REFEREE) {
    redirect(`/servers/${guildId}/admin`)
  }

  // Fetch matches AWAITING_RESULT (pending submission) — scoped to guildId
  const awaitingMatches = await prisma.match.findMany({
    where: { guildId, status: 'AWAITING_RESULT' },
    orderBy: { scheduledStart: 'asc' },
    select: {
      id: true,
      number: true,
      status: true,
      scheduledStart: true,
      stageId: true,
      stage: {
        select: {
          tournament: { select: { name: true } },
        },
      },
    },
  })

  // Fetch matches UNDER_REVIEW with their PENDING_REVIEW submissions — scoped to guildId
  // IMPORTANT: PENDING_REVIEW submissions are only fetched here for admin use;
  // they are serialized without their status field to ensure no public route can expose them.
  const underReviewMatches = await prisma.match.findMany({
    where: { guildId, status: 'UNDER_REVIEW' },
    orderBy: { scheduledStart: 'asc' },
    select: {
      id: true,
      number: true,
      status: true,
      scheduledStart: true,
      stageId: true,
      stage: {
        select: {
          tournament: { select: { name: true } },
        },
      },
      resultSubmissions: {
        where: { status: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          matchId: true,
          submittedBy: true,
          scorecardJson: true,
          evidenceUrl: true,
          // status intentionally excluded — see security rule above
          createdAt: true,
        },
      },
    },
  })

  // Fetch open disputes — scoped to guildId
  const openDisputes = await prisma.dispute.findMany({
    where: {
      status: 'OPEN',
      match: { guildId },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      matchId: true,
      raisedBy: true,
      reason: true,
      evidenceUrl: true,
      status: true,
      createdAt: true,
      match: {
        select: {
          number: true,
          stage: { select: { tournament: { select: { name: true } } } },
        },
      },
    },
  })

  // Serialize for client component
  const pendingSubmission: SerializedMatchWithSubmission[] = awaitingMatches.map((m) => ({
    id: m.id,
    number: m.number,
    status: m.status as string,
    scheduledStart: m.scheduledStart.toISOString(),
    tournamentName: m.stage.tournament.name,
    stageId: m.stageId,
    submission: null,
  }))

  const underReview: SerializedMatchWithSubmission[] = underReviewMatches.map((m) => {
    const sub = m.resultSubmissions[0] ?? null
    return {
      id: m.id,
      number: m.number,
      status: m.status as string,
      scheduledStart: m.scheduledStart.toISOString(),
      tournamentName: m.stage.tournament.name,
      stageId: m.stageId,
      submission: sub
        ? {
            id: sub.id,
            matchId: sub.matchId,
            submittedBy: sub.submittedBy,
            scorecardJson: sub.scorecardJson,
            evidenceUrl: sub.evidenceUrl,
            createdAt: sub.createdAt.toISOString(),
          }
        : null,
    }
  })

  const disputes: SerializedDispute[] = openDisputes.map((d) => ({
    id: d.id,
    matchId: d.matchId,
    matchNumber: d.match.number,
    tournamentName: d.match.stage.tournament.name,
    raisedBy: d.raisedBy,
    reason: d.reason,
    evidenceUrl: d.evidenceUrl,
    status: d.status as string,
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white">Results Queue</h1>
        <p className="text-white/50 text-sm mt-1">
          Review and approve match results, manage disputes
        </p>
      </div>

      <ResultsQueue
        guildId={guildId}
        pendingSubmission={pendingSubmission}
        underReview={underReview}
        disputes={disputes}
      />
    </div>
  )
}
