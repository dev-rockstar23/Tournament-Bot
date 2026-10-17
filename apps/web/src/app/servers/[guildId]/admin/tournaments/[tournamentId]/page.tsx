import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { TournamentDetailPanel, type TournamentDetail } from '@/components/admin/TournamentDetailPanel'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}`)
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
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch tournament with stages, matches, and registrations — scoped to guildId
  const raw = await prisma.tournament.findFirst({
    where: { id: tournamentId, guildId },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: {
          matches: {
            orderBy: { number: 'asc' },
            select: {
              id: true,
              number: true,
              status: true,
              scheduledStart: true,
              scheduledEnd: true,
              map: true,
              mode: true,
            },
          },
        },
      },
      registrations: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          rejectionReason: true,
          slotNumber: true,
          team: { select: { name: true, tag: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!raw) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Serialize all Date fields to ISO strings for client component
  const tournament: TournamentDetail = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    game: raw.game,
    mode: raw.mode,
    status: raw.status,
    entryType: raw.entryType,
    entryPrice: raw.entryPrice ? raw.entryPrice.toNumber() : null,
    teamCapacity: raw.teamCapacity,
    acceptedCount: raw.acceptedCount,
    rosterMin: raw.rosterMin,
    rosterMax: raw.rosterMax,
    substituteAllowed: raw.substituteAllowed,
    waitlistEnabled: raw.waitlistEnabled,
    autoApprove: raw.autoApprove,
    registrationFormat: raw.registrationFormat,
    mapPool: Array.isArray(raw.mapPool) ? (raw.mapPool as string[]) : [],
    bannerUrl: raw.bannerUrl,
    rulesUrl: raw.rulesUrl,
    visibility: raw.visibility,
    registrationOpenAt: raw.registrationOpenAt?.toISOString() ?? null,
    registrationCloseAt: raw.registrationCloseAt?.toISOString() ?? null,
    checkInOpenAt: raw.checkInOpenAt?.toISOString() ?? null,
    checkInCloseAt: raw.checkInCloseAt?.toISOString() ?? null,
    startAt: raw.startAt?.toISOString() ?? null,
    endAt: raw.endAt?.toISOString() ?? null,
    completedAt: raw.completedAt?.toISOString() ?? null,
    cancelledAt: raw.cancelledAt?.toISOString() ?? null,
    stages: raw.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      matches: stage.matches.map((match) => ({
        id: match.id,
        number: match.number,
        status: match.status,
        scheduledStart: match.scheduledStart?.toISOString() ?? null,
        scheduledEnd: match.scheduledEnd?.toISOString() ?? null,
        map: match.map,
        mode: match.mode,
      })),
    })),
    registrations: raw.registrations.map((reg) => ({
      id: reg.id,
      status: reg.status,
      createdAt: reg.createdAt.toISOString(),
      approvedAt: reg.approvedAt?.toISOString() ?? null,
      rejectionReason: reg.rejectionReason,
      slotNumber: reg.slotNumber,
      team: { name: reg.team.name, tag: reg.team.tag },
      _count: { members: reg._count.members },
    })),
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-black text-white">{tournament.name}</h1>
        <p className="text-white/50 text-sm mt-1">
          {tournament.game.replace(/_/g, ' ')} · {tournament.mode.replace(/_/g, ' ')}
        </p>
      </div>

      <TournamentDetailPanel guildId={guildId} tournament={tournament} />
    </div>
  )
}
