import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { PaymentOperationsClient } from './PaymentOperationsClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string }
}

export default async function PaymentOperationsPage({ params }: PageProps) {
  const { guildId } = params

  // Auth guard: SERVER_ADMIN required
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
            You need Server Admin role to manage payment operations.
          </p>
        </div>
      </main>
    )
  }

  return <PaymentOperationsClient guildId={guildId} />
}
