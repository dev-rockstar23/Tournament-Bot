import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { ParticipantsTable, type RegistrationRow } from '@/components/admin/ParticipantsTable'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function ParticipantsPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/participants`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  const userRole = await resolveUserRole({
    prisma,
    userId: discordId,
    guildId,
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  })

  // Must be at least TOURNAMENT_MANAGER
  if (userRole < AppRole.TOURNAMENT_MANAGER) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch registrations — all statuses for admin view, scoped to guildId
  const rawRegistrations = await prisma.registration.findMany({
    where: { tournamentId, guildId },
    include: {
      team: { select: { name: true, tag: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Serialize to plain objects (Date → ISO string)
  const initialData: RegistrationRow[] = rawRegistrations.map((r) => ({
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
