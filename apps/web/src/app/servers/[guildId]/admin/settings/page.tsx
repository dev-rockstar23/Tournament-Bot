import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { SettingsNexus } from '@/components/admin/SettingsNexus'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string }
}

export default async function AdminSettingsPage({ params }: PageProps) {
  const { guildId } = params

  // Auth guard: SERVER_ADMIN required
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/settings`)
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
            You need Server Admin role to manage server settings.
          </p>
        </div>
      </main>
    )
  }

  // Fetch settings server-side for initial state
  const [server, settings] = await Promise.all([
    prisma.discordServer.findUnique({
      where: { guildId },
      select: { name: true, icon: true },
    }),
    prisma.serverSettings.findUnique({
      where: { guildId },
    }),
  ])

  const initialSettings = {
    name: server?.name ?? '',
    icon: server?.icon ?? null,
    timezone: settings?.timezone ?? 'UTC',
    accentColor: settings?.accentColor ?? '#7c3aed',
    logoUrl: settings?.logoUrl ?? null,
    bannerUrl: settings?.bannerUrl ?? null,
    announcementChannelId: settings?.announcementChannelId ?? null,
    matchChannelId: settings?.matchChannelId ?? null,
    resultsChannelId: settings?.resultsChannelId ?? null,
    disputesChannelId: settings?.disputesChannelId ?? null,
    adminChannelId: settings?.adminChannelId ?? null,
    refundOnCancel: settings?.refundOnCancel ?? false,
    // Mask overlay token — expose last 8 chars only
    overlayTokenTail: settings?.overlayToken
      ? settings.overlayToken.slice(-8)
      : null,
    hasOverlayToken: Boolean(settings?.overlayToken),
  }

  return (
    <SettingsNexus guildId={guildId} initialSettings={initialSettings} />
  )
}
