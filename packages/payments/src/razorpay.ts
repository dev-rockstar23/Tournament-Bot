import Razorpay from 'razorpay'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Create a Razorpay order using the organizer's credentials.
 * @param amount Amount in major currency units (e.g., INR, not paise). Will be converted to paise internally.
 *               Maximum allowed: 10000 INR (to catch paise-unit mistakes).
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
  // Validate amount to catch paise-unit mistakes (amounts > 10000 likely indicate paise)
  if (amount > 10000) {
    throw new Error(
      `Amount ${amount} exceeds maximum of 10000 INR. If you intended to pass paise, divide by 100 first.`,
    )
  }

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
  // Validate signature is hex format
  if (!/^[0-9a-fA-F]+$/.test(signature)) {
    throw new Error('Invalid signature format: must be hexadecimal')
  }

  const text = `${orderId}|${paymentId}`
  const expectedSignature = createHmac('sha256', secret).update(text).digest('hex')
  const signatureBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer)
}
