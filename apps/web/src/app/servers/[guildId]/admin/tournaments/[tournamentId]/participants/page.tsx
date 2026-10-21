import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { ParticipantsTable, type RegistrationRow } from '@/components/admin/ParticipantsTable'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function ParticipantsPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth check
  let user: Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user'] = null
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/participants`)
  }

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/participants`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  // Direct DB-based role check instead of resolveUserRole
  let userRoleLevel = 0
  try {
    const serverRecord = await prisma.discordServer.findUnique({
      where: { guildId },
      select: { ownerId: true },
    })
    if (serverRecord?.ownerId === discordId) {
      userRoleLevel = AppRole.SERVER_ADMIN
    } else {
      const bindings = await prisma.serverRoleBinding.findMany({
        where: { guildId },
        select: { appRole: true },
      })
      const roles = bindings.map((b) => b.appRole)
      if (roles.includes('SERVER_ADMIN')) userRoleLevel = AppRole.SERVER_ADMIN
      else if (roles.includes('TOURNAMENT_MANAGER')) userRoleLevel = AppRole.TOURNAMENT_MANAGER
      else if (roles.includes('REFEREE')) userRoleLevel = AppRole.REFEREE
    }
  } catch {
    userRoleLevel = 0
  }

  // Must be at least TOURNAMENT_MANAGER
  if (userRoleLevel < AppRole.TOURNAMENT_MANAGER) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch registrations — all statuses for admin view, scoped to guildId
  let initialData: RegistrationRow[] = []
  try {
    const rawRegistrations = await prisma.registration.findMany({
      where: { tournamentId, guildId },
      include: {
        team: { select: { name: true, tag: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Serialize to plain objects (Date → ISO string)
    initialData = rawRegistrations.map((r) => ({
      id: r.id,
      status: r.status as RegistrationRow['status'],
      teamName: r.team.name,
      teamTag: r.team.tag,
      memberCount: r._count.members,
      slotNumber: r.slotNumber,
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? null,
      rejectionReason: r.rejectionReason,
    }))
  } catch {
    initialData = []
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-white">Participants</h1>
        <p className="text-white/50 text-sm mt-1">
          {initialData.length} total registration{initialData.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ParticipantsTable
        guildId={guildId}
        tournamentId={tournamentId}
        initialData={initialData}
      />
    </div>
  )
}
