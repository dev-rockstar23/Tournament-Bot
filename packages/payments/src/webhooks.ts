import { createHmac, timingSafeEqual } from 'crypto'
import { prisma, Prisma } from '@esports/database'
import { assertPaymentsEnabled } from './errors'
import { PaymentStatus, assertPaymentTransition } from './state-machine'

/**
 * Verify a Razorpay webhook signature using HMAC-SHA256.
 * Uses timingSafeEqual to prevent timing-based attacks.
 */
export function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
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
  orderId,
  eventType,
  amount,
  currency,
}: {
  providerEventId: string
  orderId: string
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

  // Load the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })
  if (!order) {
    throw new Error(`Order not found: ${orderId}`)
  }

  // Verify amount and currency match
  const orderAmount = Number(order.amount)
  if (orderAmount !== amount) {
    throw new Error(
      `Amount mismatch for order ${orderId}: expected ${orderAmount}, got ${amount}`,
    )
  }
  if (order.currency !== currency) {
    throw new Error(
      `Currency mismatch for order ${orderId}: expected ${order.currency}, got ${currency}`,
    )
  }

  // Map and validate the transition
  const newStatus = mapEventTypeToStatus(eventType)
  assertPaymentTransition(order.status as PaymentStatus, newStatus)

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Record the payment event; store amount and currency in payloadJson
    await tx.paymentEvent.create({
      data: {
        orderId,
        providerEventId,
        type: eventType,
        payloadJson: { amount, currency },
      },
    })

    // Update the order status
    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    })

    // If the payment succeeded, activate the registration
    if (newStatus === PaymentStatus.PAID) {
      await tx.registration.update({
        where: { id: order.registrationId },
        data: { status: 'APPROVED' },
      })
    }
  })
}
