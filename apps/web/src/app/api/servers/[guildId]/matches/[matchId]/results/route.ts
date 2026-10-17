import { withPermission, AppRole, roleAtLeast } from '@esports/permissions'
import { prisma } from '@esports/database'
import { assertMatchTransition, InvalidTransitionError } from '@esports/tournament-engine'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ResultSubmitSchema = z.object({
  scorecardJson: z.array(
    z.object({
      teamId: z.string().cuid(),
      placement: z.number().int().min(1).max(64),
      kills: z.number().int().min(0).max(999),
      penalties: z.number().min(0).default(0),
    })
  ),
  evidenceUrl: z.string().url().optional(),
})

// POST /api/servers/[guildId]/matches/[matchId]/results
// Submit a result scorecard for a match. Requires PLAYER (captain) or REFEREE+.
export const POST = withPermission(
  AppRole.PLAYER,
  async (req, { guildId, userId, role, params }) => {
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

    const parsed = ResultSubmitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { scorecardJson, evidenceUrl } = parsed.data

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch match with stage.tournament — validate guildId
        const match = await tx.match.findFirst({
          where: { id: matchId, guildId },
          select: {
            id: true,
            status: true,
            number: true,
            stage: {
              select: {
                tournamentId: true,
                tournament: { select: { id: true } },
              },
            },
            participants: {
              select: { teamId: true, team: { select: { captainId: true } } },
            },
          },
        })

        if (!match) {
          throw Object.assign(new Error('Match not found'), { httpStatus: 404 })
        }

        // 2. assertMatchTransition — throws 409 if match is not AWAITING_RESULT
        assertMatchTransition(match.status, 'UNDER_REVIEW')

        // 3. Validate submitter authorization: captain of a participant team OR REFEREE+
        const isRefereeOrAbove = roleAtLeast(role, AppRole.REFEREE)
        const isCaptainOfParticipant = match.participants.some(
          (p) => p.team.captainId === userId
        )

        if (!isRefereeOrAbove && !isCaptainOfParticipant) {
          throw Object.assign(new Error('unauthorized'), {
            httpStatus: 403,
            message: 'You must be the captain of a participating team or a Referee to submit results',
          })
        }

        // 4. Validate each teamId in scorecardJson is a MatchParticipant of this match
        const participantTeamIds = new Set(match.participants.map((p) => p.teamId))
        const invalidTeams = scorecardJson.filter((e) => !participantTeamIds.has(e.teamId))
        if (invalidTeams.length > 0) {
          throw Object.assign(new Error('invalid_teams'), {
            httpStatus: 422,
            message: `Teams not in match: ${invalidTeams.map((e) => e.teamId).join(', ')}`,
          })
        }

        // 5. Create ResultSubmission
        const submission = await tx.resultSubmission.create({
          data: {
            matchId,
            submittedBy: userId,
            scorecardJson,
            evidenceUrl: evidenceUrl ?? null,
            status: 'PENDING_REVIEW',
          },
        })

        // 6. Update match status to UNDER_REVIEW
        await tx.match.update({
          where: { id: matchId },
          data: { status: 'UNDER_REVIEW' },
        })

        // 7. Create OutboxEvent
        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'RESULT_SUBMITTED',
            payloadJson: { matchId, submittedBy: userId },
            status: 'PENDING',
          },
        })

        // 8. Write AuditLog
        await tx.auditLog.create({
          data: {
            guildId,
            actorId: userId,
            action: 'RESULT_SUBMITTED',
            targetType: 'Match',
            targetId: matchId,
            metadata: {
              submissionId: submission.id,
              teamsCount: scorecardJson.length,
            },
          },
        })

        return { submissionId: submission.id }
      })

      return NextResponse.json({ submissionId: result.submissionId }, { status: 201 })
    } catch (err: unknown) {
      if (err instanceof InvalidTransitionError) {
        return NextResponse.json(
          { error: 'invalid_transition', message: err.message },
          { status: err.httpStatus }
        )
      }
      const e = err as { httpStatus?: number; message?: string; code?: string }
      if (e.httpStatus) {
        return NextResponse.json(
          { error: e.code ?? e.message },
          { status: e.httpStatus }
        )
      }
      console.error('[results POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
