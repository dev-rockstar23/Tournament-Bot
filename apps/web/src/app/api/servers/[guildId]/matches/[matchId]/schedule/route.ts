import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const RescheduleSchema = z.object({
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  cascadeSubsequent: z.boolean().default(false),
  map: z.string().optional(),
  mode: z.string().optional(),
})

// PATCH /api/servers/[guildId]/matches/[matchId]/schedule
// Reschedules a match (and optionally all subsequent matches in the same stage).
// Cancels PENDING ScheduledJobs, creates new ones, writes AuditLog + OutboxEvent.
export const PATCH = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, userId, params }) => {
    const matchId = params['matchId']
    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = RescheduleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { scheduledStart, scheduledEnd, cascadeSubsequent, map, mode } = parsed.data

    // Fetch match scoped to guildId
    const match = await prisma.match.findFirst({
      where: { id: matchId, guildId },
      select: {
        id: true,
        status: true,
        number: true,
        scheduledStart: true,
        scheduledEnd: true,
        resultDeadline: true,
        stageId: true,
        stage: { select: { tournamentId: true } },
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const newStart = new Date(scheduledStart)
    const newEnd = new Date(scheduledEnd)
    const timeDelta = newStart.getTime() - match.scheduledStart.getTime()
    const tournamentId = match.stage.tournamentId

    // Collect matches to update: primary + cascaded subsequent
    const matchesToUpdate: typeof match[] = [match]

    if (cascadeSubsequent) {
      const subsequent = await prisma.match.findMany({
        where: {
          stageId: match.stageId,
          number: { gt: match.number },
          guildId,
        },
        orderBy: { number: 'asc' },
        select: {
          id: true,
          status: true,
          number: true,
          scheduledStart: true,
          scheduledEnd: true,
          resultDeadline: true,
          stageId: true,
          stage: { select: { tournamentId: true } },
        },
      })
      matchesToUpdate.push(...subsequent)
    }

    const rescheduleTimestamp = Date.now()

    const updatedMatches = await prisma.$transaction(async (tx) => {
      const results: Awaited<ReturnType<typeof tx.match.update>>[] = []

      for (const m of matchesToUpdate) {
        const isPrimary = m.id === matchId
        const mNewStart = isPrimary
          ? newStart
          : new Date(m.scheduledStart.getTime() + timeDelta)
        const mNewEnd = isPrimary
          ? newEnd
          : new Date(m.scheduledEnd.getTime() + timeDelta)
        const mNewDeadline = m.resultDeadline
          ? new Date(m.resultDeadline.getTime() + timeDelta)
          : null

        const updated = await tx.match.update({
          where: { id: m.id },
          data: {
            scheduledStart: mNewStart,
            scheduledEnd: mNewEnd,
            ...(mNewDeadline ? { resultDeadline: mNewDeadline } : {}),
            ...(isPrimary && map !== undefined ? { map } : {}),
            ...(isPrimary && mode !== undefined ? { mode } : {}),
          },
        })
        results.push(updated)

        // Cancel old pending jobs for this match
        await tx.scheduledJob.updateMany({
          where: { matchId: m.id, status: 'PENDING' },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })

        // Create new jobs with versioned keys to avoid unique constraint collisions
        const jobVersion = `${rescheduleTimestamp}-${m.number}`
        await tx.scheduledJob.createMany({
          data: [
            {
              jobKey: `match:${m.id}:24h-reminder-v${jobVersion}`,
              type: 'DM_REMINDER_24H',
              payloadJson: { matchId: m.id, tournamentId, type: '24h' },
              scheduledFor: new Date(mNewStart.getTime() - 24 * 60 * 60_000),
              matchId: m.id,
              tournamentId,
            },
            {
              jobKey: `match:${m.id}:30min-reminder-v${jobVersion}`,
              type: 'DM_REMINDER_30MIN',
              payloadJson: { matchId: m.id, tournamentId, type: '30min' },
              scheduledFor: new Date(mNewStart.getTime() - 30 * 60_000),
              matchId: m.id,
              tournamentId,
            },
            {
              jobKey: `match:${m.id}:5min-reminder-v${jobVersion}`,
              type: 'DM_REMINDER_5MIN',
              payloadJson: { matchId: m.id, tournamentId, type: '5min' },
              scheduledFor: new Date(mNewStart.getTime() - 5 * 60_000),
              matchId: m.id,
              tournamentId,
            },
            {
              jobKey: `match:${m.id}:result-deadline-v${jobVersion}`,
              type: 'RESULT_DEADLINE_REMINDER',
              payloadJson: { matchId: m.id, tournamentId, type: 'result-deadline' },
              scheduledFor: mNewDeadline ?? new Date(mNewEnd.getTime() + 30 * 60_000),
              matchId: m.id,
              tournamentId,
            },
          ],
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'MATCH_RESCHEDULED',
            payloadJson: {
              matchId: m.id,
              oldStart: m.scheduledStart.toISOString(),
              newStart: mNewStart.toISOString(),
            },
            status: 'PENDING',
          },
        })
      }

      // Audit log for the whole reschedule operation
      await tx.auditLog.create({
        data: {
          guildId,
          actorId: userId,
          action: 'MATCH_RESCHEDULED',
          targetType: 'Match',
          targetId: matchId,
          metadata: {
            oldStart: match.scheduledStart.toISOString(),
            newStart: newStart.toISOString(),
            cascade: cascadeSubsequent,
            matchesAffected: matchesToUpdate.length,
          },
        },
      })

      return results
    })

    // 6. Detect overlap: check if any two matches in the tournament have overlapping windows (non-blocking)
    const warnings: string[] = []
    const overlapCount = await prisma.match.count({
      where: {
        guildId,
        stage: { tournamentId },
        id: { in: updatedMatches.map((m) => m.id) },
        AND: [
          {
            id: {
              not: updatedMatches[0]!.id,
            },
          },
        ],
      },
    })

    // Simpler overlap detection: check if any match in the tournament overlaps another
    const allTournamentMatches = await prisma.match.findMany({
      where: {
        guildId,
        stage: { tournamentId },
      },
      select: { id: true, scheduledStart: true, scheduledEnd: true },
      orderBy: { scheduledStart: 'asc' },
    })

    outer: for (let i = 0; i < allTournamentMatches.length; i++) {
      for (let j = i + 1; j < allTournamentMatches.length; j++) {
        const a = allTournamentMatches[i]!
        const b = allTournamentMatches[j]!
        if (
          a.scheduledStart < b.scheduledEnd &&
          a.scheduledEnd > b.scheduledStart
        ) {
          warnings.push('OVERLAP_DETECTED')
          break outer
        }
      }
    }

    // Suppress unused variable
    void overlapCount

    return NextResponse.json({
      matches: updatedMatches.map((m) => ({
        ...m,
        scheduledStart: m.scheduledStart.toISOString(),
        scheduledEnd: m.scheduledEnd.toISOString(),
        resultDeadline: m.resultDeadline?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      warnings,
    })
  }
)
