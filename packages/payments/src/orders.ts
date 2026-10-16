import { prisma, Prisma } from '@esports/database'
import { assertPaymentsEnabled } from './errors'

export async function createOrder({
  registrationId,
  amount,
  currency,
  expiresInMinutes,
}: {
  registrationId: string
  amount: number
  currency: string
  expiresInMinutes: number
}) {
  assertPaymentsEnabled()

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Lock the registration row for update to prevent race conditions
    const registrations = await tx.$queryRaw<
      Array<{ id: string; tournament_id: string }>
    >`SELECT id, tournament_id FROM registrations WHERE id = ${registrationId} FOR UPDATE`

    if (registrations.length === 0) {
      throw new Error(`Registration not found: ${registrationId}`)
    }

    const registration = registrations[0]

    // Load the tournament to check capacity
    const tournament = await tx.tournament.findUnique({
      where: { id: registration.tournament_id },
      select: { id: true, teamCapacity: true },
    })

    if (!tournament) {
      throw new Error(`Tournament not found for registration: ${registrationId}`)
    }

    // Count existing PAID orders for this tournament
    const paidCount = await tx.order.count({
      where: {
        status: 'PAID',
        registration: {
          tournamentId: tournament.id,
        },
      },
    })

    if (paidCount >= tournament.teamCapacity) {
      throw new Error(
        `Tournament is at capacity (${paidCount}/${tournament.teamCapacity} paid slots).`,
      )
    }

    // Create the Order record
    const order = await tx.order.create({
      data: {
        registrationId,
        amount,
        currency,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      },
    })

    return order
  })
}
