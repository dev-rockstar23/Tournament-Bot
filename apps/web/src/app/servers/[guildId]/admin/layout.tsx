import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppRole } from '@esports/permissions'
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
  // Auth check — wrap createClient in try/catch to handle missing env vars
  let user: Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user'] = null
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase not configured — redirect to home
    redirect(`/?next=/servers/${params.guildId}/admin`)
  }

  if (!user) {
    redirect(`/?next=/servers/${params.guildId}/admin`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  // Direct DB-based access check instead of resolveUserRole
  let hasAdminAccess = false
  let userAppRole: AppRole = AppRole.REFEREE
  try {
    // Check if server owner
    const serverRecord = await prisma.discordServer.findUnique({
      where: { guildId: params.guildId },
      select: { ownerId: true },
    })
    if (serverRecord?.ownerId === discordId) {
      hasAdminAccess = true
      userAppRole = AppRole.SERVER_ADMIN
    } else {
      // Check role bindings
      const bindings = await prisma.serverRoleBinding.findMany({
        where: { guildId: params.guildId },
        select: { appRole: true },
      })
      const roles = bindings.map((b) => b.appRole)
      if (roles.includes('SERVER_ADMIN')) {
        hasAdminAccess = true
        userAppRole = AppRole.SERVER_ADMIN
      } else if (roles.includes('TOURNAMENT_MANAGER')) {
        hasAdminAccess = true
        userAppRole = AppRole.TOURNAMENT_MANAGER
      } else if (roles.includes('REFEREE')) {
        hasAdminAccess = true
        userAppRole = AppRole.REFEREE
      }
    }
  } catch {
    // DB unavailable — deny access
    hasAdminAccess = false
  }

  if (!hasAdminAccess) {
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
  let server: { name: string; icon: string | null } | null = null
  try {
    server = await prisma.discordServer.findUnique({
      where: { guildId: params.guildId },
      select: { name: true, icon: true },
    })
  } catch {
    // Non-fatal — sidebar will use fallback values
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <AdminSidebar
        guildId={params.guildId}
        guildName={server?.name ?? 'Server'}
        guildIcon={server?.icon ?? null}
        userRole={userAppRole}
        userName={user.user_metadata?.full_name ?? user.email ?? 'User'}
        userAvatar={user.user_metadata?.avatar_url ?? null}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
