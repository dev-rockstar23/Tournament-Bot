import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole } from '@esports/permissions'
import { AppRole, roleName } from '@esports/permissions'
import { prisma } from '@esports/database'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { guildId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${params.guildId}/admin`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  // Resolve user role
  const role = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId: params.guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  // REFEREE is the minimum for any admin access
  if (role < AppRole.REFEREE) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <h1 className="font-display text-4xl font-black text-white mb-4">
            Access Denied
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            You need at least Referee role to access the admin panel.
          </p>
        </div>
      </main>
    )
  }

  // Fetch server info for sidebar
  const server = await prisma.discordServer.findUnique({
    where: { guildId: params.guildId },
    select: { name: true, icon: true },
  })

  // roleName is imported but used via AdminSidebar — suppress unused warning
  void roleName

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <AdminSidebar
        guildId={params.guildId}
        guildName={server?.name ?? 'Server'}
        guildIcon={server?.icon ?? null}
        userRole={role}
        userName={user.user_metadata?.full_name ?? user.email ?? 'User'}
        userAvatar={user.user_metadata?.avatar_url ?? null}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
