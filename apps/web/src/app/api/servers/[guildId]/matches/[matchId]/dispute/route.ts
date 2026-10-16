import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { assertMatchTransition, InvalidTransitionError } from '@esports/tournament-engine'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const DisputeSchema = z.object({
  reason: z.string().min(10).max(1000),
  evidenceUrl: z.string().url().optional(),
})

// POST /api/servers/[guildId]/matches/[matchId]/dispute
// Raises a dispute on a match. Requires PLAYER role.
export const POST = withPermission(
  AppRole.PLAYER,
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

    const parsed = DisputeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { reason, evidenceUrl } = parsed.data

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Validate match exists and belongs to guildId
        const match = await tx.match.findFirst({
          where: { id: matchId, guildId },
          select: { id: true, status: true, number: true },
        })

        if (!match) {
          throw Object.assign(new Error('Match not found'), { httpStatus: 404 })
        }

        // 2. Create Dispute
        const dispute = await tx.dispute.create({
          data: {
            matchId,
            raisedBy: userId,
            reason,
            evidenceUrl: evidenceUrl ?? null,
            status: 'OPEN',
          },
        })

        // 3. assertMatchTransition then update match status to DISPUTED
        assertMatchTransition(match.status, 'DISPUTED')
        await tx.match.update({
          where: { id: matchId },
          data: { status: 'DISPUTED' },
        })

        // 4. Create OutboxEvent
        await tx.outboxEvent.create({
          data: {
            guildId,
            type: 'DISPUTE_OPENED',
            payloadJson: { matchId, disputeId: dispute.id },
            status: 'PENDING',
          },
        })

        // 5. Write AuditLog
        await tx.auditLog.create({
          data: {
            guildId,
            actorId: userId,
            action: 'DISPUTE_OPENED',
            targetType: 'Match',
            targetId: matchId,
            metadata: { disputeId: dispute.id, reason },
          },
        })

        return { disputeId: dispute.id }
      })

      return NextResponse.json({ disputeId: result.disputeId }, { status: 201 })
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
      console.error('[dispute POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
