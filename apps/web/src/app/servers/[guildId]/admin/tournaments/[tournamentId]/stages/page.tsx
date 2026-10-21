import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { StageBuilderClient } from '@/components/admin/StageBuilderClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function StageBuilderPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}/stages`)
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
    redirect(`/servers/${guildId}/admin/tournaments/${tournamentId}`)
  }

  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, guildId },
    select: { id: true, name: true },
  })

  if (!tournament) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  const stages = await prisma.stage.findMany({
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

  const totalStages = stages.length
  const initialStages = stages.map(s => ({
    ...s,
    bracketLocked: s.order < totalStages - 2,
  }))

  return (
    <StageBuilderClient
      guildId={guildId}
      tournamentId={tournamentId}
      tournamentName={tournament.name}
      initialStages={initialStages}
    />
  )
}
