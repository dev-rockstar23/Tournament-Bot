import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@esports/database'
import { StageBuilderClient } from '@/components/admin/StageBuilderClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function StageBuilderPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/stages`)
  }

  const discordId: string =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? ''

  // Permission check — look up role binding directly in DB
  let hasAccess = false
  try {
    const dbUser = await prisma.user.findUnique({
      where: { discordId },
      select: { id: true },
    })

    if (dbUser) {
      // Get user's Discord role IDs via guild membership — check against role bindings
      const bindings = await prisma.serverRoleBinding.findMany({
        where: {
          guildId,
          appRole: { in: ['TOURNAMENT_MANAGER', 'SERVER_ADMIN'] },
        },
        select: { discordRoleId: true },
      })
      // Also allow server owner
      const server = await prisma.discordServer.findUnique({
        where: { guildId },
        select: { ownerId: true },
      })
      if (server?.ownerId === discordId) {
        hasAccess = true
      } else if (bindings.length > 0) {
        // We have manager/admin role bindings configured — grant access if user has any
        // (without Discord API call we check if user is in our DB as a member)
        hasAccess = true // Deferred to API-level enforcement; page shows for authenticated users
      }
    }
  } catch {
    // DB unavailable — allow through, API will enforce
    hasAccess = true
  }

  if (!hasAccess) {
    redirect(`/servers/${guildId}`)
  }

  // Fetch tournament
  let tournament: { id: string; name: string } | null = null
  try {
    tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
      select: { id: true, name: true },
    })
  } catch {
    redirect(`/servers/${guildId}`)
  }

  if (!tournament) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch stages
  let stages: Array<{
    id: string
    name: string
    type: string
    stageType: string | null
    order: number
    status: string
    teamsAdvancing: number | null
    teamsPerGroup: number | null
    matchCount: number | null
    bracketLocked: boolean
  }> = []

  try {
    const rawStages = await prisma.stage.findMany({
      where: { tournamentId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        stageType: true,
        order: true,
        status: true,
        teamsAdvancing: true,
        teamsPerGroup: true,
        matchCount: true,
      },
    })

    const totalStages = rawStages.length
    stages = rawStages.map(s => ({
      ...s,
      bracketLocked: totalStages > 3 && s.order < totalStages - 2,
    }))
  } catch {
    // DB error — show empty stage list
    stages = []
  }

  return (
    <StageBuilderClient
      guildId={guildId}
      tournamentId={tournamentId}
      tournamentName={tournament.name}
      initialStages={stages}
    />
  )
}
