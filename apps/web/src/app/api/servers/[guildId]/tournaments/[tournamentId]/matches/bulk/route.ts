import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BulkMatchSchema = z.object({
  count: z.number().int().min(1).max(10),
  firstMatchStart: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  gapMinutes: z.number().int().min(0).max(120),
  defaultMap: z.string().min(1),
  defaultMode: z.string().min(1),
  stageId: z.string().cuid(),
  resultDeadlineMinutes: z.number().int().min(5).max(1440).default(30),
})

// POST /api/servers/[guildId]/tournaments/[tournamentId]/matches/bulk
// Generates count matches in sequential time slots, each with 4 ScheduledJob rows.
export const POST = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, params }) => {
    const tournamentId = params['tournamentId']
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = BulkMatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const {
      count,
      firstMatchStart,
      durationMinutes,
      gapMinutes,
      defaultMap,
      defaultMode,
      stageId,
      resultDeadlineMinutes,
    } = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate stage belongs to tournament belongs to guildId
      const stage = await tx.stage.findFirst({
        where: {
          id: stageId,
          tournamentId,
          tournament: { guildId },
        },
        select: { id: true },
      })

      if (!stage) {
        throw Object.assign(new Error('Stage not found'), { httpStatus: 404 })
      }

      // 2. Get current highest match number for sequential numbering
      const lastMatch = await tx.match.findFirst({
        where: { stageId },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      const startNumber = lastMatch?.number ?? 0

      const firstStart = new Date(firstMatchStart)
      const slotMs = (durationMinutes + gapMinutes) * 60_000
      const durationMs = durationMinutes * 60_000
      const deadlineMs = resultDeadlineMinutes * 60_000

      const createdMatches: {
        match: Awaited<ReturnType<typeof tx.match.create>>
        scheduledJobs: Awaited<ReturnType<typeof tx.scheduledJob.createMany>>
      }[] = []

      // 3. Create each match with its jobs and outbox event
      for (let i = 0; i < count; i++) {
        const scheduledStart = new Date(firstStart.getTime() + i * slotMs)
        const scheduledEnd = new Date(scheduledStart.getTime() + durationMs)
        const resultDeadline = new Date(scheduledEnd.getTime() + deadlineMs)

        const match = await tx.match.create({
          data: {
            stageId,
            guildId,
            number: startNumber + i + 1,
            status: 'SCHEDULED',
            scheduledStart,
            scheduledEnd,
            resultDeadline,
            map: defaultMap,
            mode: defaultMode,
          },
        })

        const matchId = match.id

        const scheduledJobs = await tx.scheduledJob.createMany({
          data: [
            {
              jobKey: `match:${matchId}:24h-reminder`,
              type: 'DM_REMINDER_24H',
              payloadJson: { matchId, tournamentId, type: '24h' },
              scheduledFor: new Date(scheduledStart.getTime() - 24 * 60 * 60_000),
              matchId,
              tournamentId,
            },
            {
              jobKey: `match:${matchId}:30min-reminder`,
              type: 'DM_REMINDER_30MIN',
              payloadJson: { matchId, tournamentId, type: '30min' },
              scheduledFor: new Date(scheduledStart.getTime() - 30 * 60_000),
              matchId,
              tournamentId,
            },
            {
              jobKey: `match:${matchId}:5min-reminder`,
              type: 'DM_REMINDER_5MIN',
              payloadJson: { matchId, tournamentId, type: '5min' },
              scheduledFor: new Date(scheduledStart.getTime() - 5 * 60_000),
              matchId,
              tournamentId,
            },
            {
              jobKey: `match:${matchId}:result-deadline`,
              type: 'RESULT_DEADLINE_REMINDER',
              payloadJson: { matchId, tournamentId, type: 'result-deadline' },
              scheduledFor: resultDeadline,
              matchId,
              tournamentId,
            },
          ],
        })

        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'MATCH_SCHEDULED',
            payloadJson: {
              matchId,
              number: startNumber + i + 1,
              scheduledStart: scheduledStart.toISOString(),
            },
            status: 'PENDING',
          },
        })

        createdMatches.push({ match, scheduledJobs })
      }

      return createdMatches
    }).catch((err: unknown) => {
      const e = err as { httpStatus?: number; message?: string }
      if (e.httpStatus === 404) {
        return { __error: 404 } as const
      }
      throw err
    })

    if ('__error' in result) {
      return NextResponse.json(
        { error: 'Stage not found for this tournament / guild' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        matches: result.map(({ match }) => ({
          ...match,
          scheduledStart: match.scheduledStart.toISOString(),
          scheduledEnd: match.scheduledEnd.toISOString(),
          resultDeadline: match.resultDeadline?.toISOString() ?? null,
          createdAt: match.createdAt.toISOString(),
          updatedAt: match.updatedAt.toISOString(),
        })),
      },
      { status: 201 }
    )
  }
)
