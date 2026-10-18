import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@esports/database'
import type { Game, TournamentStatus } from '@esports/database'
import Navigation from '@/components/ui/Navigation'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonText } from '@/components/ui/NeonText'
import { StatusBar } from '@/components/ui/StatusBar'
import { StatusPulse } from '@/components/ui/StatusPulse'
import { GlowButton } from '@/components/ui/GlowButton'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Tournament {
  id: string
  name: string
  game: Game
  status: TournamentStatus
  startAt: Date | null
  registrationCloseAt: Date | null
  teamCapacity: number
  acceptedCount: number
}

interface WinnerRecord {
  id: string
  placement: number
  tournament: { name: string; game: Game }
  team: { name: string }
}

function statusVariant(
  status: TournamentStatus
): 'live' | 'upcoming' | 'completed' | 'cancelled' | 'draft' | 'default' {
  switch (status) {
    case 'LIVE': return 'live'
    case 'REGISTRATION_OPEN':
    case 'CHECK_IN': return 'upcoming'
    case 'COMPLETED': return 'completed'
    case 'CANCELLED':
    case 'ARCHIVED': return 'cancelled'
    case 'DRAFT': return 'draft'
    default: return 'default'
  }
}

function statusLabel(status: TournamentStatus): string {
  switch (status) {
    case 'REGISTRATION_OPEN': return 'Registration Open'
    case 'REGISTRATION_CLOSED': return 'Reg Closed'
    case 'CHECK_IN': return 'Check-In'
    case 'LIVE': return 'LIVE'
    case 'COMPLETED': return 'Completed'
    case 'CANCELLED': return 'Cancelled'
    case 'ARCHIVED': return 'Archived'
    case 'DRAFT': return 'Draft'
    default: return status
  }
}

function gameLabel(game: Game): string {
  switch (game) {
    case 'BGMI': return 'BGMI'
    case 'FREE_FIRE': return 'Free Fire'
    case 'COD_MOBILE': return 'CoD Mobile'
    default: return game
  }
}

const gameGradients: Record<string, string> = {
  BGMI: 'from-green-600/30 to-teal-700/30',
  FREE_FIRE: 'from-orange-600/30 to-red-700/30',
  COD_MOBILE: 'from-blue-600/30 to-purple-700/30',
}

function TournamentOperationCard({ t, guildId }: { t: Tournament; guildId: string }) {
  const dateValue = t.startAt ?? t.registrationCloseAt
  const fillPct = t.teamCapacity > 0
    ? Math.min((t.acceptedCount / t.teamCapacity) * 100, 100)
    : 0

  return (
    <GlassCard
      neonColor={t.status === 'LIVE' ? 'red' : 'violet'}
      className={`p-4 flex flex-col gap-3 ${t.status === 'LIVE' ? 'border-red-500/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`px-2 py-1 rounded text-xs font-mono font-bold tracking-widest uppercase inline-block bg-gradient-to-r ${gameGradients[t.game] ?? 'from-violet-600/30 to-indigo-700/30'} border border-white/10 text-white`}
        >
          {gameLabel(t.game)}
        </div>
        <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
      </div>
      <h3 className="text-white font-bold text-sm font-display leading-snug line-clamp-2 flex-1">
        {t.name}
      </h3>
      {dateValue && (
        <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-wider">
          {new Date(dateValue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
      {/* Slot bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-[var(--color-text-muted)]">
          <span>SLOTS</span>
          <span className="text-[var(--color-neon-cyan)]">{t.acceptedCount}/{t.teamCapacity}</span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-neon-violet)] to-[var(--color-neon-cyan)] transition-all"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
      <Link
        href={`/servers/${guildId}/tournaments/${t.id}`}
        className="text-xs font-mono text-[var(--color-neon-cyan)] hover:text-white transition-colors tracking-widest uppercase"
      >
        VIEW DETAILS →
      </Link>
    </GlassCard>
  )
}

export default async function ServerPage({
  params,
  searchParams,
}: {
  params: { guildId: string }
  searchParams?: { tab?: string }
}) {
  const { guildId } = params
  const activeTab = searchParams?.tab ?? 'ALL'

  const server = await prisma.discordServer.findUnique({
    where: { guildId },
    include: { settings: true },
  })

  if (!server) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const discordId = user?.user_metadata?.provider_id ?? user?.user_metadata?.sub ?? ''
  const isAdmin = server.ownerId === discordId

  const [allTournaments, recentWinners] = await Promise.all([
    prisma.tournament.findMany({
      where: { guildId, status: { notIn: ['DRAFT', 'ARCHIVED', 'CANCELLED'] } },
      orderBy: { startAt: 'asc' },
      take: 20,
      select: {
        id: true, name: true, game: true, status: true,
        startAt: true, registrationCloseAt: true,
        teamCapacity: true, acceptedCount: true,
      },
    }),
    prisma.winnerRecord.findMany({
      where: { tournament: { guildId }, placement: 1 },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        tournament: { select: { name: true, game: true } },
        team: { select: { name: true } },
      },
    }),
  ])

  // Derive filtered lists
  const liveTournaments = allTournaments.filter((t) => t.status === 'LIVE')
  const upcomingTournaments = allTournaments.filter(
    (t) => t.status === 'REGISTRATION_OPEN' || t.status === 'CHECK_IN'
  )
  const completedTournaments = allTournaments.filter((t) => t.status === 'COMPLETED')

  // Filter based on tab param
  const tabFilteredTournaments = (() => {
    switch (activeTab) {
      case 'LIVE': return liveTournaments
      case 'REGISTRATION OPEN': return allTournaments.filter((t) => t.status === 'REGISTRATION_OPEN')
      case 'UPCOMING': return upcomingTournaments
      case 'COMPLETED': return completedTournaments
      default: return allTournaments
    }
  })()

  const accentColor = server.settings?.accentColor ?? '#7c3aed'

  const liveNow = liveTournaments.length
  const featuredLive = liveTournaments[0] ?? null
  const operationsDeck = tabFilteredTournaments.slice(0, 8)

  return (
    <div
      style={{ '--color-accent': accentColor, backgroundColor: 'var(--color-bg-primary)' } as React.CSSProperties}
      className="min-h-screen pb-16"
    >
      <div className="scanline-overlay" aria-hidden="true" />
      <Navigation />

      <main className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <CyberBreadcrumb labels={{ servers: 'Servers', [guildId]: server.name }} className="mb-6" />

          {/* Server header */}
          <GlassCard hud className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Guild icon */}
              <div className="relative flex-shrink-0">
                {server.icon ? (
                  <Image
                    src={`https://cdn.discordapp.com/icons/${guildId}/${server.icon}.png?size=128`}
                    alt={`${server.name} icon`}
                    width={80}
                    height={80}
                    className="rounded-full border-2 border-[var(--color-neon-violet)]"
                    unoptimized
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-[var(--color-neon-violet)]"
                    style={{ backgroundColor: `${accentColor}33` }}
                  >
                    <span className="text-3xl font-black text-white font-display">
                      {server.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[var(--color-bg-primary)]" aria-label="Online" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <NeonText as="h1" color="violet" className="text-2xl sm:text-3xl font-black tracking-wider">
                    {server.name}
                  </NeonText>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/5">
                    ✓ DISCORD VERIFIED
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono text-green-400 border border-green-500/40 bg-green-500/5">
                    <StatusPulse variant="synced" />
                    BOT ENGINE ONLINE
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-text-muted)] tracking-wider flex-wrap">
                  <span>ID: {guildId}</span>
                  {server.settings?.timezone && <span>TZ: {server.settings.timezone}</span>}
                </div>
              </div>

              {isAdmin && (
                <Link
                  href={`/servers/${guildId}/admin/tournaments`}
                  className="ml-auto flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-widest uppercase text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/5 hover:bg-[var(--color-neon-cyan)]/15 transition-colors"
                >
                  ⚙ ADMIN PANEL
                </Link>
              )}
            </div>
          </GlassCard>

          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: 'TOTAL TOURNAMENTS',
                value: allTournaments.length,
                color: 'violet' as const,
              },
              {
                label: 'LIVE RIGHT NOW',
                value: liveNow,
                color: 'red' as const,
                pulse: true,
              },
              {
                label: 'ROSTERS ACTIVE',
                value: upcomingTournaments.reduce((acc, t) => acc + t.acceptedCount, 0),
                color: 'cyan' as const,
              },
              {
                label: 'CHAMPIONS CROWNED',
                value: recentWinners.length,
                color: 'green' as const,
              },
            ].map(({ label, value, color, pulse }) => (
              <GlassCard key={label} neonColor={color} className="p-4 text-center">
                <div className={`text-3xl font-black font-display mb-1 ${
                  color === 'violet' ? 'neon-text-violet' :
                  color === 'cyan' ? 'neon-text-cyan' :
                  color === 'red' ? 'text-red-400' :
                  'text-green-400'
                }`}>
                  {pulse && <StatusPulse variant="live" className="mr-2" />}
                  {value}
                </div>
                <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase">{label}</p>
              </GlassCard>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
            {[
              { tab: 'ALL', label: 'ALL' },
              { tab: 'LIVE', label: 'LIVE' },
              { tab: 'REGISTRATION OPEN', label: 'REGISTRATION OPEN' },
              { tab: 'UPCOMING', label: 'UPCOMING' },
              { tab: 'COMPLETED', label: 'COMPLETED' },
            ].map(({ tab, label }) => (
              <Link
                key={tab}
                href={tab === 'ALL' ? `?` : `?tab=${encodeURIComponent(tab)}`}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-mono font-bold whitespace-nowrap tracking-widest uppercase transition-all',
                  activeTab === tab
                    ? 'bg-[var(--color-neon-violet)] text-black'
                    : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 border border-white/10',
                ].join(' ')}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Featured LIVE hero card */}
          {featuredLive && (
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                  FEATURED LIVE TOURNAMENT
                </h2>
                <StatusPulse variant="live" />
              </div>
              <GlassCard neonColor="red" className="p-6 border-red-500/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-transparent" aria-hidden="true" />
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold text-red-400 border border-red-500/40 bg-red-500/10">
                          <StatusPulse variant="live" />
                          LIVE
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono text-white/60 border border-white/10">
                          {gameLabel(featuredLive.game)}
                        </span>
                      </div>
                      <NeonText as="h3" color="violet" className="text-2xl font-black tracking-wide mb-1">
                        {featuredLive.name}
                      </NeonText>
                      <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest">
                        {featuredLive.acceptedCount} / {featuredLive.teamCapacity} TEAMS
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Link
                        href={`/servers/${guildId}/tournaments/${featuredLive.id}/bracket`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-widest uppercase text-white border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        👁 WATCH BROADCAST
                      </Link>
                      <Link
                        href={`/servers/${guildId}/tournaments/${featuredLive.id}`}
                      >
                        <GlowButton variant="primary" size="sm">
                          VIEW STANDINGS
                        </GlowButton>
                      </Link>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </section>
          )}

          {/* Tournament Operations Deck */}
          {operationsDeck.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-[var(--color-neon-violet)] rounded-full" aria-hidden="true" />
                  <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                    TOURNAMENT OPERATIONS DECK
                  </h2>
                </div>
                <Link
                  href={`/servers/${guildId}/tournaments`}
                  className="text-xs font-mono text-[var(--color-neon-cyan)] hover:text-white transition-colors tracking-widest uppercase"
                >
                  VIEW ALL →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {operationsDeck.map((t) => (
                  <TournamentOperationCard key={t.id} t={t} guildId={guildId} />
                ))}
              </div>
            </section>
          )}

          {/* Hall of Champions strip */}
          {recentWinners.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-amber-500 rounded-full" aria-hidden="true" />
                  <h2 className="font-display text-sm font-bold text-white tracking-widest uppercase">
                    HALL OF CHAMPIONS
                  </h2>
                </div>
                <Link
                  href={`/servers/${guildId}/winners`}
                  className="text-xs font-mono text-[var(--color-neon-cyan)] hover:text-white transition-colors tracking-widest uppercase"
                >
                  FULL HALL →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(recentWinners as WinnerRecord[]).map((w) => (
                  <GlassCard key={w.id} neonColor="cyan" className="p-4 flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">🏆</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate font-display">{w.team.name}</p>
                      <p className="text-xs font-mono text-[var(--color-text-muted)] truncate tracking-wider">
                        {w.tournament.name}
                      </p>
                      <span className="text-xs font-mono text-[var(--color-neon-cyan)] tracking-wider">
                        {gameLabel(w.tournament.game)}
                      </span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>
          )}

          {/* No tournaments empty state */}
          {liveTournaments.length === 0 && upcomingTournaments.length === 0 && (
            <div className="text-center py-20">
              <p className="text-5xl mb-4" aria-hidden="true">🎮</p>
              <NeonText as="h2" color="violet" className="text-2xl font-bold mb-2">
                NO ACTIVE TOURNAMENTS
              </NeonText>
              <p className="text-[var(--color-text-secondary)] font-mono text-sm">
                No live or upcoming tournaments right now.
              </p>
            </div>
          )}
        </div>
      </main>

      <StatusBar shardOnline>
        <span className="text-[var(--color-neon-green)]">ACTIVE GATEWAY</span>
        <span className="mx-2 text-[var(--color-text-muted)]">|</span>
        <span>SHARD: <span className="text-[var(--color-neon-cyan)]">ALPHA-1</span></span>
      </StatusBar>
    </div>
  )
}
