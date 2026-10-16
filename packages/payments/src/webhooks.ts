import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@esports/database'
import type { Prisma } from '@esports/database/src/generated/client'
import { assertPaymentsEnabled } from './errors'
import { PaymentStatus, assertPaymentTransition } from './state-machine'
import { decryptCredential } from './encryption'

/**
 * Verify a Razorpay webhook signature using HMAC-SHA256.
 * Uses timingSafeEqual to prevent timing-based attacks.
 */
export function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  // Validate that signature is hex-encoded before parsing
  if (!/^[0-9a-f]+$/i.test(signature)) {
    return false
  }

  const digest = createHmac('sha256', secret).update(body).digest()
  const signatureBuffer = Buffer.from(signature, 'hex')

  if (digest.length !== signatureBuffer.length) return false

  return timingSafeEqual(digest, signatureBuffer)
}

/** Map Razorpay event type strings to internal PaymentStatus values. */
function mapEventTypeToStatus(eventType: string): PaymentStatus {
  switch (eventType) {
    case 'payment.captured':
      return PaymentStatus.PAID
    case 'payment.failed':
      return PaymentStatus.FAILED
    case 'payment.refunded':
      return PaymentStatus.REFUNDED
    case 'payment.dispute.created':
      return PaymentStatus.DISPUTED
    default:
      throw new Error(`Unrecognised payment event type: ${eventType}`)
  }
}

export async function processWebhookEvent({
  providerEventId,
  razorpayOrderId,
  eventType,
  amount,
  currency,
}: {
  providerEventId: string
  razorpayOrderId: string
  eventType: string
  amount: number
  currency: string
}): Promise<void> {
  assertPaymentsEnabled()

  // Idempotency: skip if this event has already been processed
  const existing = await prisma.paymentEvent.findUnique({
    where: { providerEventId },
  })
  if (existing) return

  // Load the order by providerRef (Razorpay order_id)
  const order = await prisma.order.findFirst({
    where: { providerRef: razorpayOrderId },
    include: {
      registration: {
        include: {
          tournament: {
            include: {
              paymentConfig: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    throw new Error(`Order not found for Razorpay order_id: ${razorpayOrderId}`)
  }

  if (!order.registration.tournament.paymentConfig) {
    throw new Error(
      `Tournament ${order.registration.tournament.id} has no payment configuration.`,
    )
  }

  // Verify amount and currency match
  const orderAmount = Number(order.amount)
  if (orderAmount !== amount) {
    throw new Error(
      `Amount mismatch for order ${order.id}: expected ${orderAmount}, got ${amount}`,
    )
  }
  if (order.currency !== currency) {
    throw new Error(
      `Currency mismatch for order ${order.id}: expected ${order.currency}, got ${currency}`,
    )
  }

  // Map and validate the transition
  const newStatus = mapEventTypeToStatus(eventType)
  assertPaymentTransition(order.status as PaymentStatus, newStatus)

  await prisma.$transaction(async (tx) => {
    // Record the payment event; store amount and currency in payloadJson
    await tx.paymentEvent.create({
      data: {
        orderId: order.id,
        providerEventId,
        type: eventType,
        payloadJson: { amount, currency },
      },
    })

    // Update the order status
    await tx.order.update({
      where: { id: order.id },
      data: { status: newStatus },
    })

    // If the payment succeeded, potentially activate the registration
    if (newStatus === PaymentStatus.PAID) {
      // Only auto-approve if tournament has autoApprove enabled
      if (order.registration.tournament.autoApprove) {
        await tx.registration.update({
          where: { id: order.registrationId },
          data: { status: 'APPROVED' },
        })
      }
      // Otherwise leave as PENDING for manual approval
    }
  })
}
