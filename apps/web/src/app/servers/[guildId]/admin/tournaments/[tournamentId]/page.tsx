import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppRole } from '@esports/permissions'
import { prisma } from '@esports/database'
import { TournamentDetailPanel, type TournamentDetail } from '@/components/admin/TournamentDetailPanel'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { guildId, tournamentId } = params

  // Auth check
  let user: Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user'] = null
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}`)
  }

  if (!user) {
    redirect(`/?next=/servers/${guildId}/admin/tournaments/${tournamentId}`)
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

  if (userRoleLevel < AppRole.TOURNAMENT_MANAGER) {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

  // Fetch tournament with stages, matches, and registrations — scoped to guildId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: any = null
  try {
    raw = await prisma.tournament.findFirst({
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
  } catch {
    redirect(`/servers/${guildId}/admin/tournaments`)
  }

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
    stages: raw.stages.map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      matches: stage.matches.map((match: any) => ({
        id: match.id,
        number: match.number,
        status: match.status,
        scheduledStart: match.scheduledStart?.toISOString() ?? null,
        scheduledEnd: match.scheduledEnd?.toISOString() ?? null,
        map: match.map,
        mode: match.mode,
      })),
    })),
    registrations: raw.registrations.map((reg: any) => ({
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

  const accepted = tournament.registrations.filter(r => r.status === 'ACCEPTED')
  const pending = tournament.registrations.filter(r => r.status === 'PENDING')
  const totalSlots = tournament.teamCapacity ?? 0
  const usedSlots = tournament.acceptedCount ?? 0

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Page header */}
      <div className="hud-grid-bg border-b border-[var(--color-neon-violet)] px-6 py-4">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1
            className="font-display text-2xl font-black tracking-widest uppercase"
            style={{ color: 'var(--color-neon-cyan)', textShadow: '0 0 12px rgba(6,182,212,0.7)' }}
          >
            {tournament.name}
          </h1>
          <span className={[
            'px-2 py-0.5 rounded border text-[10px] font-mono tracking-widest uppercase',
            tournament.status === 'LIVE' ? 'text-red-400 border-red-500/40 bg-red-500/10' :
            tournament.status === 'PUBLISHED' ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' :
            tournament.status === 'COMPLETED' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
            'text-white/40 border-white/10',
          ].join(' ')}>
            {tournament.status}
          </span>
        </div>
        <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase">
          {tournament.game.replace(/_/g, ' ')} · {tournament.mode.replace(/_/g, ' ')} · {usedSlots}/{totalSlots} SLOTS
        </p>

        {/* Slot visualizer grid */}
        <div className="mt-4">
          <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-2">SLOT VISUALIZER</p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: Math.min(totalSlots, 64) }, (_, i) => (
              <div
                key={i}
                title={accepted[i]?.team?.name ?? pending[i]?.team?.name ?? `Slot ${i + 1}`}
                className={[
                  'w-5 h-5 rounded-sm border transition-colors',
                  i < usedSlots
                    ? 'bg-violet-600/60 border-violet-500/60'
                    : i < usedSlots + pending.length
                    ? 'bg-amber-500/30 border-amber-500/40'
                    : 'bg-white/5 border-white/10',
                ].join(' ')}
              />
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-white/30">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-violet-600/60 border border-violet-500/60" />
              ACCEPTED ({usedSlots})
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/40" />
              PENDING ({pending.length})
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
              OPEN ({Math.max(0, totalSlots - usedSlots - pending.length)})
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <TournamentDetailPanel guildId={guildId} tournament={tournament} />
      </div>
    </div>
  )
}
