import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { assertMatchTransition, InvalidTransitionError } from '@esports/tournament-engine'
import { getDefaultConfig, calculateBgmiMatchScore } from '@esports/game-rules'
import type { MatchScoreParams } from '@esports/game-rules'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ApproveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().min(1).max(1000).optional(),
})

// POST /api/servers/[guildId]/matches/[matchId]/approve
// Referee+ approves or rejects a result submission. Runs scoring and completes the match on approve.
export const POST = withPermission(
  AppRole.REFEREE,
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

    const parsed = ApproveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { action, reason } = parsed.data

    try {
      if (action === 'approve') {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Fetch match — validate guildId, assert status is UNDER_REVIEW
          const match = await tx.match.findFirst({
            where: { id: matchId, guildId },
            select: {
              id: true,
              status: true,
              number: true,
              stage: {
                select: {
                  tournamentId: true,
                  tournament: {
                    select: {
                      game: true,
                      mode: true,
                      ruleVersions: {
                        where: { isActive: true },
                        take: 1,
                        orderBy: { version: 'desc' },
                        select: { rulesJson: true },
                      },
                    },
                  },
                },
              },
            },
          })

          if (!match) {
            throw Object.assign(new Error('Match not found'), { httpStatus: 404 })
          }

          if (match.status !== 'UNDER_REVIEW') {
            throw Object.assign(new Error('match_not_under_review'), {
              httpStatus: 409,
              message: `Match must be UNDER_REVIEW to approve (current: ${match.status})`,
            })
          }

          // 2. Get latest ResultSubmission with status PENDING_REVIEW for this match
          const submission = await tx.resultSubmission.findFirst({
            where: { matchId, status: 'PENDING_REVIEW' },
            orderBy: { createdAt: 'desc' },
          })

          if (!submission) {
            throw Object.assign(new Error('no_pending_submission'), {
              httpStatus: 404,
              message: 'No pending submission found for this match',
            })
          }

          // 3. Parse scorecardJson from submission
          const scorecard = submission.scorecardJson as Array<{
            teamId: string
            placement: number
            kills: number
            penalties: number
          }>

          // 4. Get tournament's scoring config
          const tournament = match.stage.tournament
          const ruleVersion = tournament.ruleVersions[0]

          // Use rule version config if available, otherwise fall back to game defaults
          // rulesJson is stored as ScoringConfig-compatible shape
          let config = getDefaultConfig(tournament.game, tournament.mode)
          if (ruleVersion?.rulesJson) {
            try {
              const rj = ruleVersion.rulesJson as Record<string, unknown>
              // Only use stored config if it has the expected scoring fields
              if (
                typeof rj['killPoints'] === 'number' &&
                Array.isArray(rj['placementPoints'])
              ) {
                config = {
                  ...config,
                  killPoints: rj['killPoints'] as number,
                  placementPoints: rj['placementPoints'] as number[],
                  ...(typeof rj['maxKillPoints'] === 'number'
                    ? { maxKillPoints: rj['maxKillPoints'] as number }
                    : {}),
                }
              }
            } catch {
              // fall through to defaults
            }
          }

          // 5. Calculate scores for each entry — all three game modules share the same
          // MatchScoreParams signature; calculateBgmiMatchScore works generically.
          const scoreParams: MatchScoreParams = {
            config,
            placements: scorecard.map((e) => ({
              teamId: e.teamId,
              placement: e.placement,
              kills: e.kills,
              penalties: e.penalties,
            })),
            matchId,
          }
          const approvedScores = calculateBgmiMatchScore(scoreParams)

          // 6. Create ScoreEvent records — one per team
          await tx.scoreEvent.createMany({
            data: approvedScores.map((score) => {
              const entry = scorecard.find((e) => e.teamId === score.teamId)!
              return {
                matchId,
                teamId: score.teamId,
                type: 'MATCH_SCORE' as const,
                points: score.points,
                kills: score.kills,
                placement: score.placement,
                penalties: Number(entry.penalties ?? 0),
                status: 'active',
                createdBy: userId,
              }
            }),
          })

          // 7. Update ResultSubmission to APPROVED
          await tx.resultSubmission.update({
            where: { id: submission.id },
            data: {
              status: 'APPROVED',
              reviewedBy: userId,
              reviewedAt: new Date(),
            },
          })

          // 8. assertMatchTransition then update to COMPLETED
          assertMatchTransition(match.status, 'COMPLETED')
          await tx.match.update({
            where: { id: matchId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          })

          // 9. Create OutboxEvent
          await tx.outboxEvent.create({
            data: {
              guildId,
              type: 'RESULT_APPROVED',
              payloadJson: {
                matchId,
                scores: approvedScores.map((s) => ({
                  teamId: s.teamId,
                  points: s.points,
                })),
              },
              status: 'PENDING',
            },
          })

          // 10. Write AuditLog
          await tx.auditLog.create({
            data: {
              guildId,
              actorId: userId,
              action: 'RESULT_APPROVED',
              targetType: 'Match',
              targetId: matchId,
              metadata: {
                submissionId: submission.id,
                scoresCount: approvedScores.length,
              },
            },
          })

          return { submissionId: submission.id, scoresCount: approvedScores.length }
        })

        return NextResponse.json({
          message: 'Result approved',
          submissionId: result.submissionId,
          scoresCount: result.scoresCount,
        })
      }

      // action === 'reject'
      const result = await prisma.$transaction(async (tx) => {
        // 1. Validate match is UNDER_REVIEW
        const match = await tx.match.findFirst({
          where: { id: matchId, guildId },
          select: { id: true, status: true },
        })

        if (!match) {
          throw Object.assign(new Error('Match not found'), { httpStatus: 404 })
        }

        if (match.status !== 'UNDER_REVIEW') {
          throw Object.assign(new Error('match_not_under_review'), {
            httpStatus: 409,
            message: `Match must be UNDER_REVIEW to reject (current: ${match.status})`,
          })
        }

        // 2. Update ResultSubmission to REJECTED
        const submission = await tx.resultSubmission.findFirst({
          where: { matchId, status: 'PENDING_REVIEW' },
          orderBy: { createdAt: 'desc' },
        })

        if (!submission) {
          throw Object.assign(new Error('no_pending_submission'), {
            httpStatus: 404,
            message: 'No pending submission found for this match',
          })
        }

        await tx.resultSubmission.update({
          where: { id: submission.id },
          data: {
            status: 'REJECTED',
            reviewedBy: userId,
            reviewedAt: new Date(),
            rejectionReason: reason ?? null,
          },
        })

        // 3. assertMatchTransition and revert to AWAITING_RESULT
        assertMatchTransition(match.status, 'AWAITING_RESULT')
        await tx.match.update({
          where: { id: matchId },
          data: { status: 'AWAITING_RESULT' },
        })

        // 4. Create OutboxEvent
        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'RESULT_REJECTED',
            payloadJson: { matchId, reason: reason ?? null },
            status: 'PENDING',
          },
        })

        // 5. Write AuditLog
        await tx.auditLog.create({
          data: {
            guildId,
            actorId: userId,
            action: 'RESULT_REJECTED',
            targetType: 'Match',
            targetId: matchId,
            reason: reason ?? null,
            metadata: { submissionId: submission.id },
          },
        })

        return { submissionId: submission.id }
      })

      return NextResponse.json({
        message: 'Result rejected',
        submissionId: result.submissionId,
      })
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
      console.error('[approve POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
