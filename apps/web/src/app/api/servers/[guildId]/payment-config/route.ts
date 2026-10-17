import { NextResponse } from 'next/server'
import { withPermission, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { encryptCredential, decryptCredential, createRazorpayOrder } from '@esports/payments'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const paymentConfigSchema = z.object({
  razorpayKeyId: z.string().min(1),
  razorpayKeySecret: z.string().min(1),
  razorpayWebhookSecret: z.string().min(1),
})

// GET: Retrieve payment config (masked credentials)
export const GET = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, userId }) => {
    if (process.env.PAYMENTS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Payments disabled' }, { status: 503 })
    }

    const config = await prisma.organizerPaymentConfig.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      select: {
        id: true,
        provider: true,
        razorpayKeyId: true, // Encrypted, will mask in response
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!config) {
      return NextResponse.json({ configured: false })
    }

    // Decrypt and mask the key ID (show first 4 chars + '...')
    const keyId = decryptCredential(config.razorpayKeyId)
    const maskedKeyId = keyId.substring(0, 4) + '...'

    return NextResponse.json({
      configured: true,
      config: {
        id: config.id,
        provider: config.provider,
        maskedKeyId,
        hasKeySecret: true,
        hasWebhookSecret: true,
        isActive: config.isActive,
        isVerified: config.isVerified,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    })
  },
)

// POST: Create or update payment config
export const POST = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, userId }) => {
    if (process.env.PAYMENTS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Payments disabled' }, { status: 503 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = paymentConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 },
      )
    }

    const { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret } = parsed.data

    // Test Razorpay connection with a minimal order
    try {
      await createRazorpayOrder({
        keyId: razorpayKeyId,
        keySecret: razorpayKeySecret,
        amount: 1, // INR 1
        currency: 'INR',
        receiptId: `test_${Date.now()}`,
      })
    } catch (error) {
      console.error('Razorpay credential test failed:', error)
      return NextResponse.json(
        {
          error: 'Invalid credentials',
          message: 'Failed to connect to Razorpay with provided credentials',
        },
        { status: 400 },
      )
    }

    // Encrypt credentials
    const encryptedKeyId = encryptCredential(razorpayKeyId)
    const encryptedKeySecret = encryptCredential(razorpayKeySecret)
    const encryptedWebhookSecret = encryptCredential(razorpayWebhookSecret)

    // Upsert config
    const config = await prisma.organizerPaymentConfig.upsert({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
      update: {
        razorpayKeyId: encryptedKeyId,
        razorpayKeySecret: encryptedKeySecret,
        razorpayWebhookSecret: encryptedWebhookSecret,
        isVerified: true,
        isActive: true,
      },
      create: {
        guildId,
        userId,
        provider: 'RAZORPAY',
        razorpayKeyId: encryptedKeyId,
        razorpayKeySecret: encryptedKeySecret,
        razorpayWebhookSecret: encryptedWebhookSecret,
        isVerified: true,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      configId: config.id,
      message: 'Payment configuration saved and verified',
    })
  },
)

// DELETE: Deactivate payment config
export const DELETE = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, userId }) => {
    if (process.env.PAYMENTS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Payments disabled' }, { status: 503 })
    }

    const config = await prisma.organizerPaymentConfig.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    }

    await prisma.organizerPaymentConfig.update({
      where: { id: config.id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment configuration deactivated',
    })
  },
)
