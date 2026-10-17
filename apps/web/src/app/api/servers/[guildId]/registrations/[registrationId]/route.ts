import { NextResponse } from 'next/server'
import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_correction']),
  reason: z.string().max(500).optional(),
})

// ─── PATCH /api/servers/[guildId]/registrations/[registrationId] ──────────────
// Admin: approve, reject, or request_correction on a registration.

export const PATCH = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, userId, params }) => {
    const registrationId = params['registrationId']
    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 })
    }

    // Parse body
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { action, reason } = parsed.data

    // Fetch the registration scoped to guildId
    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, guildId },
      include: {
        tournament: {
          select: { id: true, teamCapacity: true, acceptedCount: true },
        },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const tournamentId = registration.tournament.id

    try {
      if (action === 'approve') {
        const updated = await prisma.$transaction(async (tx) => {
          // Lock the tournament row
          const rows = await tx.$queryRaw<
            Array<{ id: string; team_capacity: number; accepted_count: number }>
          >`SELECT id, team_capacity, accepted_count FROM tournaments WHERE id = ${tournamentId} AND guild_id = ${guildId} FOR UPDATE`

          const row = rows[0]
          if (!row) throw new Error('Tournament not found')

          if (row.accepted_count >= row.team_capacity) {
            throw Object.assign(new Error('slots_full'), { httpStatus: 409, code: 'slots_full' })
          }

          const slotNumber = row.accepted_count + 1

          const reg = await tx.registration.update({
            where: { id: registrationId },
            data: {
              status: 'APPROVED',
              slotNumber,
              approvedBy: userId,
              approvedAt: new Date(),
            },
          })

          await tx.tournament.update({
            where: { id: tournamentId },
            data: { acceptedCount: { increment: 1 } },
          })

          await tx.auditLog.create({
            data: {
              guildId,
              actorId: userId,
              action: 'REGISTRATION_APPROVED',
              targetType: 'Registration',
              targetId: registrationId,
              reason: reason ?? null,
            },
          })

          await tx.outboxEvent.create({
            data: {
              guildId,
              type: 'REGISTRATION_APPROVED',
              payloadJson: { registrationId, teamId: registration.teamId },
              status: 'PENDING',
            },
          })

          return reg
        })

        return NextResponse.json({ registration: serializeRegistration(updated) })
      }

      if (action === 'reject') {
        const updated = await prisma.$transaction(async (tx) => {
          const reg = await tx.registration.update({
            where: { id: registrationId },
            data: {
              status: 'REJECTED',
              rejectedBy: userId,
              rejectedAt: new Date(),
              rejectionReason: reason ?? null,
            },
          })

          await tx.auditLog.create({
            data: {
              guildId,
              actorId: userId,
              action: 'REGISTRATION_REJECTED',
              targetType: 'Registration',
              targetId: registrationId,
              reason: reason ?? null,
            },
          })

          await tx.outboxEvent.create({
            data: {
              guildId,
              type: 'REGISTRATION_REJECTED',
              payloadJson: { registrationId, teamId: registration.teamId },
              status: 'PENDING',
            },
          })

          return reg
        })

        return NextResponse.json({ registration: serializeRegistration(updated) })
      }

      // request_correction: revert to PENDING
      const updated = await prisma.$transaction(async (tx) => {
        const reg = await tx.registration.update({
          where: { id: registrationId },
          data: { status: 'PENDING' },
        })

        await tx.auditLog.create({
          data: {
            guildId,
            actorId: userId,
            action: 'REGISTRATION_CORRECTION_REQUESTED',
            targetType: 'Registration',
            targetId: registrationId,
            reason: reason ?? null,
          },
        })

        return reg
      })

      return NextResponse.json({ registration: serializeRegistration(updated) })
    } catch (err: unknown) {
      const e = err as { httpStatus?: number; code?: string; message?: string }
      if (e.httpStatus) {
        return NextResponse.json({ error: e.code ?? e.message }, { status: e.httpStatus })
      }
      console.error('[registrations PATCH]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeRegistration(reg: {
  id: string
  status: string
  slotNumber: number | null
  approvedBy: string | null
  approvedAt: Date | null
  rejectedBy: string | null
  rejectedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...reg,
    approvedAt: reg.approvedAt?.toISOString() ?? null,
    rejectedAt: reg.rejectedAt?.toISOString() ?? null,
    createdAt: reg.createdAt.toISOString(),
    updatedAt: reg.updatedAt.toISOString(),
  }
}
