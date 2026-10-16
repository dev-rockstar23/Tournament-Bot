import { prisma } from '@esports/database'
import type { Prisma } from '@esports/database/src/generated/client'
import { assertPaymentsEnabled } from './errors'
import { decryptCredential } from './encryption'
import { createRazorpayOrder } from './razorpay'

export async function createOrder({
  registrationId,
  amount,
  currency,
  expiresInMinutes,
  guildId,
}: {
  registrationId: string
  amount: number
  currency: string
  expiresInMinutes: number
  guildId?: string
}) {
  assertPaymentsEnabled()

  return prisma.$transaction(async (tx) => {
    // Lock the registration row for update to prevent race conditions
    const registrations = await tx.$queryRaw<
      Array<{ id: string; tournament_id: string }>
    >`SELECT id, tournament_id FROM registrations WHERE id = ${registrationId} FOR UPDATE`

    if (registrations.length === 0) {
      throw new Error(`Registration not found: ${registrationId}`)
    }

    const registration = registrations[0]

    // Load the tournament to check capacity and payment config
    const tournament = await tx.tournament.findUnique({
      where: { id: registration.tournament_id },
      select: {
        id: true,
        teamCapacity: true,
        entryType: true,
        paymentConfig: true,
      },
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

    // If tournament requires payment, create Razorpay order
    let razorpayCheckout: {
      orderId: string
      amount: number
      currency: string
      keyId: string
    } | undefined

    if (tournament.entryType === 'PAID') {
      if (!tournament.paymentConfig) {
        throw new Error(
          `Tournament ${tournament.id} has no payment configuration. Organizer must configure Razorpay credentials.`,
        )
      }

      // Decrypt credentials
      const keyId = decryptCredential(tournament.paymentConfig.razorpayKeyId)
      const keySecret = decryptCredential(tournament.paymentConfig.razorpayKeySecret)

      // Create Razorpay order
      const razorpayOrder = await createRazorpayOrder({
        keyId,
        keySecret,
        amount,
        currency,
        receiptId: order.id,
      })

      // Update order with Razorpay order ID
      await tx.order.update({
        where: { id: order.id },
        data: { providerRef: razorpayOrder.id },
      })

      razorpayCheckout = {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId, // Public key ID (safe to send to client)
      }
    }

    return {
      order,
      razorpayCheckout,
    }
  })
}
