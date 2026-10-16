import Razorpay from 'razorpay'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Create a Razorpay order using the organizer's credentials.
 * Amount is in the smallest currency unit (paise for INR).
 */
export async function createRazorpayOrder({
  keyId,
  keySecret,
  amount,
  currency,
  receiptId,
}: {
  keyId: string
  keySecret: string
  amount: number
  currency: string
  receiptId: string
}): Promise<{ id: string; amount: number; currency: string }> {
  const instance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })

  // Razorpay expects amount in paise (smallest unit)
  const amountInPaise = Math.round(amount * 100)

  const order = await instance.orders.create({
    amount: amountInPaise,
    currency: currency.toUpperCase(),
    receipt: receiptId,
    payment_capture: 1, // Auto-capture payment
  })

  return {
    id: order.id,
    amount: order.amount / 100, // Convert back to major currency unit
    currency: order.currency,
  }
}

/**
 * Verify Razorpay payment signature using HMAC-SHA256.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
  secret,
}: {
  orderId: string
  paymentId: string
  signature: string
  secret: string
}): boolean {
  const text = `${orderId}|${paymentId}`
  const expectedSignature = createHmac('sha256', secret).update(text).digest('hex')
  const signatureBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer)
}
