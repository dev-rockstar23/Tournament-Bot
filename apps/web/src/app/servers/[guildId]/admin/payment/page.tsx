import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { PaymentConfigPanel } from '@/components/admin/PaymentConfigPanel'

interface PageProps {
  params: { guildId: string }
}

export default async function AdminPaymentPage({ params }: PageProps) {
  const { guildId } = params

  // Auth guard: TOURNAMENT_MANAGER required
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/payment`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  if (userRole < AppRole.TOURNAMENT_MANAGER) {
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
            You need Tournament Manager role to manage payment settings.
          </p>
        </div>
      </main>
    )
  }

  // Check if payments are enabled
  const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true'

  if (!paymentsEnabled) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center max-w-2xl">
          <h1 className="font-display text-4xl font-black text-white mb-4">
            Payments Not Enabled
          </h1>
          <p className="text-white/50">
            Payment collection is not yet enabled. It requires legal review under India's
            Online Gaming Rules 2026.
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white">Payment Settings</h1>
        <p className="text-white/50 text-sm mt-1">
          Configure Razorpay credentials for paid tournament entry fees
        </p>
      </div>

      <PaymentConfigPanel guildId={guildId} userId={discordId} />
    </div>
  )
}
