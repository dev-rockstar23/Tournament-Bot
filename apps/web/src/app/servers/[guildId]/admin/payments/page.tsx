import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { PaymentsTabs } from './PaymentsTabs'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string }
}

interface SerializedOrder {
  id: string
  registrationId: string
  amount: string
  currency: string
  createdAt: string
}

async function fetchOrders(
  guildId: string,
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'DISPUTED' | 'REFUNDED'
): Promise<SerializedOrder[]> {
  try {
    const rows = await prisma.order.findMany({
      where: { status, registration: { guildId } },
      select: {
        id: true,
        registrationId: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((o) => ({
      id: o.id,
      registrationId: o.registrationId,
      amount: String(o.amount),
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
    }))
  } catch {
    // Order/PaymentEvent models may not be migrated yet
    return []
  }
}

export default async function AdminPaymentsPage({ params }: PageProps) {
  const { guildId } = params

  // Auth guard: SERVER_ADMIN required
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/payments`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  if (userRole < AppRole.SERVER_ADMIN) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <h1 className="font-display text-4xl font-black text-white mb-4">
            Access Denied
          </h1>
          <p className="text-white/50">
            You need Server Admin role to manage payments.
          </p>
        </div>
      </main>
    )
  }

  const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true'

  const [collections, pending, failed, refunds] = await Promise.all([
    fetchOrders(guildId, 'PAID'),
    fetchOrders(guildId, 'PENDING'),
    fetchOrders(guildId, 'FAILED'),
    // REFUNDED and DISPUTED both appear in the refunds tab
    (async () => {
      const refunded = await fetchOrders(guildId, 'REFUNDED')
      const disputed = await fetchOrders(guildId, 'DISPUTED')
      return [...refunded, ...disputed].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    })(),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white">Payments</h1>
        <p className="text-white/50 text-sm mt-1">
          Manage paid tournament entry collections, refunds, and disputes.
        </p>
      </div>

      {/* Legal notice banner */}
      <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-amber-900 text-sm">
        <span className="font-semibold">⚠️ Legal Notice: </span>
        Paid tournaments require legal review under India&apos;s Online Gaming Rules 2026 before
        enabling.{' '}
        <a
          href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2254606"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:text-amber-700"
        >
          Read the notification
        </a>
        .
      </div>

      {/* Feature flag badge */}
      <div className="flex items-center gap-2">
        <span className="text-white/60 text-sm">Payments status:</span>
        {paymentsEnabled ? (
          <span className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400 ring-1 ring-green-500/30">
            ENABLED
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 ring-1 ring-red-500/30">
            DISABLED
          </span>
        )}
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: 'var(--color-bg-secondary, #1a1a2e)' }}
      >
        <PaymentsTabs
          guildId={guildId}
          collections={collections}
          pending={pending}
          failed={failed}
          refunds={refunds}
        />
      </div>
    </div>
  )
}
