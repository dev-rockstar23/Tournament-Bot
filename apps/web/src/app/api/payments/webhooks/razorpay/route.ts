export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyRazorpaySignature, processWebhookEvent } from '@esports/payments'

export async function POST(request: Request) {
  // Gate: payments must be enabled
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    return NextResponse.json(
      {
        error: 'PAYMENTS_DISABLED',
        message: 'Payment module is disabled pending legal review.',
      },
      { status: 503 }
    )
  }

  // Read raw body as text for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

  // Verify HMAC signature
  if (!verifyRazorpaySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  // Extract fields from Razorpay webhook payload shape
  // Razorpay sends: { event: 'payment.captured', payload: { payment: { entity: { id, order_id, amount, currency } } } }
  const eventType = payload['event'] as string
  const paymentEntity = (
    (payload['payload'] as Record<string, unknown>)?.['payment'] as Record<string, unknown>
  )?.['entity'] as Record<string, unknown> | undefined

  const providerEventId = (paymentEntity?.['id'] as string) ?? ''
  const orderId = (paymentEntity?.['order_id'] as string) ?? ''
  const amount = Number(paymentEntity?.['amount'] ?? 0) / 100 // Razorpay sends paise
  const currency = (paymentEntity?.['currency'] as string) ?? 'INR'

  try {
    await processWebhookEvent({
      providerEventId,
      orderId,
      eventType,
      amount,
      currency,
    })
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // Idempotency: already processed — return 200 so Razorpay stops retrying
    if (message.toLowerCase().includes('already') || message.toLowerCase().includes('idempotent')) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Validation / state-machine errors
    if (
      message.toLowerCase().includes('mismatch') ||
      message.toLowerCase().includes('not found') ||
      message.toLowerCase().includes('invalid') ||
      message.toLowerCase().includes('transition')
    ) {
      console.error('[razorpay webhook] Validation error:', message)
      return NextResponse.json({ error: message }, { status: 400 })
    }

    console.error('[razorpay webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
