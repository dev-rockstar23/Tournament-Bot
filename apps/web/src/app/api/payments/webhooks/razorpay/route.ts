import { NextRequest, NextResponse } from 'next/server'
import { processWebhookEvent, verifyRazorpaySignature } from '@esports/payments'
import { prisma } from '@esports/database'
import { decryptCredential } from '@esports/payments'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Gate: payments must be enabled
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Payments disabled' }, { status: 503 })
  }

  // Read raw body for signature verification
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  let event: unknown
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event: eventType, payload } = event as {
    event: string
    payload: {
      payment: { entity: { id: string; amount: number; currency: string } }
      order: { entity: { id: string } }
    }
  }

  if (!payload?.payment?.entity || !payload?.order?.entity) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
  }

  const razorpayOrderId = payload.order.entity.id
  const paymentId = payload.payment.entity.id
  const amountInPaise = payload.payment.entity.amount
  const currency = payload.payment.entity.currency

  // Look up order to get webhook secret from payment config
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
    return NextResponse.json(
      { error: 'Order not found for Razorpay order_id' },
      { status: 404 },
    )
  }

  if (!order.registration.tournament.paymentConfig) {
    return NextResponse.json(
      { error: 'Tournament has no payment configuration' },
      { status: 400 },
    )
  }

  // Decrypt webhook secret and verify signature
  let webhookSecret: string
  try {
    webhookSecret = decryptCredential(
      order.registration.tournament.paymentConfig.razorpayWebhookSecret,
    )
  } catch (error) {
    console.error('Failed to decrypt webhook secret:', error)
    return NextResponse.json(
      { error: 'Invalid payment configuration - decryption failed' },
      { status: 400 },
    )
  }

  const isValid = verifyRazorpaySignature(body, signature, webhookSecret)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    // Process the webhook event
    await processWebhookEvent({
      providerEventId: paymentId,
      razorpayOrderId,
      eventType,
      amount: amountInPaise / 100, // Convert paise to major currency unit
      currency,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    )
  }
}
