import { NextResponse } from 'next/server'
import { withPermission, AppRole } from '@esports/permissions'
import { createOrder } from '@esports/payments'
import { z } from 'zod'

const createOrderSchema = z.object({
  registrationId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  expiresInMinutes: z.number().int().positive(),
})

export const POST = withPermission(AppRole.PLAYER, async (req, { guildId }) => {
  // Gate: payments must be enabled
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    return NextResponse.json(
      {
        error: 'PAYMENTS_DISABLED',
        message:
          "Payment collection is not yet enabled. It requires legal review under India's Online Gaming Rules 2026.",
        legalNotice:
          'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2254606',
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { registrationId, amount, currency, expiresInMinutes } = parsed.data

  // createOrder validates that the registration belongs to the tournament;
  // guildId scoping is enforced at the DB level through the registration relation.
  const order = await createOrder({
    registrationId,
    amount,
    currency,
    expiresInMinutes,
  })

  return NextResponse.json({ order }, { status: 201 })
})
