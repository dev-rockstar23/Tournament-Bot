import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@esports/database'
import type { Game, TournamentStatus } from '@esports/database'
import Navigation from '@/components/ui/Navigation'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Tournament {
  id: string
  name: string
  game: Game
  status: TournamentStatus
  startAt: Date | null
  registrationCloseAt: Date | null
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
    case 'LIVE':
      return 'live'
    case 'REGISTRATION_OPEN':
    case 'CHECK_IN':
      return 'upcoming'
    case 'COMPLETED':
      return 'completed'
    case 'CANCELLED':
    case 'ARCHIVED':
      return 'cancelled'
    case 'DRAFT':
      return 'draft'
    default:
      return 'default'
  }
}

function statusLabel(status: TournamentStatus): string {
  switch (status) {
    case 'REGISTRATION_OPEN':
      return 'Registration Open'
    case 'REGISTRATION_CLOSED':
      return 'Registration Closed'
    case 'CHECK_IN':
      return 'Check-In'
    case 'LIVE':
      return 'Live'
    case 'COMPLETED':
      return 'Completed'
    case 'CANCELLED':
      return 'Cancelled'
    case 'ARCHIVED':
      return 'Archived'
    case 'DRAFT':
      return 'Draft'
    default:
      return status
  }
}

function gameLabel(game: Game): string {
  switch (game) {
    case 'BGMI':
      return 'BGMI'
    case 'FREE_FIRE':
      return 'Free Fire'
    case 'COD_MOBILE':
      return 'CoD Mobile'
    default:
      return game
  }
}

function TournamentCard({ t }: { t: Tournament }) {
  const dateValue = t.startAt ?? t.registrationCloseAt
  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 flex-1">
          {t.name}
        </h3>
        <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default">{gameLabel(t.game)}</Badge>
        {dateValue && (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {new Date(dateValue).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  )
}

export default async function ServerPage({
  params,
}: {
  params: { guildId: string }
}) {
  const { guildId } = params

  const server = await prisma.discordServer.findUnique({
    where: { guildId },
    include: { settings: true },
  })

  if (!server) notFound()

  // Check if current user is the server owner to show admin button
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const discordId = user?.user_metadata?.provider_id ?? user?.user_metadata?.sub ?? ''
  const isAdmin = server.ownerId === discordId

  const [liveTournaments, upcomingTournaments, recentWinners] =
    await Promise.all([
      prisma.tournament.findMany({
        where: { guildId, status: 'LIVE' },
        orderBy: { startAt: 'asc' },
        take: 6,
      }),
      prisma.tournament.findMany({
        where: { guildId, status: { in: ['REGISTRATION_OPEN', 'CHECK_IN'] } },
        orderBy: { registrationCloseAt: 'asc' },
        take: 6,
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

  const accentColor = server.settings?.accentColor ?? '#7c3aed'

  return (
    <div
      style={{ '--color-accent': accentColor, backgroundColor: 'var(--color-bg-primary)' } as React.CSSProperties}
      className="min-h-screen"
    >
      <Navigation />

      <main className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Server header */}
          <div className="flex items-center gap-5 mb-10">
            {server.icon ? (
              <Image
                src={`https://cdn.discordapp.com/icons/${guildId}/${server.icon}.png?size=128`}
                alt={`${server.name} icon`}
                width={80}
                height={80}
                className="rounded-full border border-white/10"
                unoptimized
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center border border-[var(--color-border-accent)]"
                style={{ backgroundColor: `${accentColor}33` }}
              >
                <span
                  className="text-3xl font-black text-white"
                  style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
                >
                  {server.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1
                className="text-3xl font-black text-white"
                style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
              >
                {server.name}
              </h1>
              {server.settings?.timezone && (
                <p className="text-[var(--color-text-secondary)] text-sm mt-0.5">
                  {server.settings.timezone}
                </p>
              )}
            </div>
            {/* Admin button — shown to server owner/admins */}
            {isAdmin && (
              <Link
                href={`/servers/${guildId}/admin/tournaments`}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white border border-[rgba(124,58,237,0.5)] bg-[rgba(124,58,237,0.15)] hover:bg-[rgba(124,58,237,0.3)] transition-colors"
              >
                ⚙️ Admin Dashboard
              </Link>
            )}
          </div>

          {/* Live Tournaments */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
              >
                🔴 Live Tournaments
              </h2>
              <Link
                href={`/servers/${guildId}/tournaments`}
                className="text-sm text-[var(--color-accent)] hover:underline"
              >
                View all →
              </Link>
            </div>
            {liveTournaments.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-sm">
                No live tournaments right now.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveTournaments.map((t) => (
                  <TournamentCard key={t.id} t={t} />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Tournaments */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
              >
                📅 Upcoming Tournaments
              </h2>
              <Link
                href={`/servers/${guildId}/tournaments`}
                className="text-sm text-[var(--color-accent)] hover:underline"
              >
                View all →
              </Link>
            </div>
            {upcomingTournaments.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-sm">
                No upcoming tournaments at the moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTournaments.map((t) => (
                  <TournamentCard key={t.id} t={t} />
                ))}
              </div>
            )}
          </section>

          {/* Recent Champions */}
          {recentWinners.length > 0 && (
            <section className="mb-10">
              <h2
                className="text-xl font-bold text-white mb-4"
                style={{ fontFamily: 'var(--font-display, Orbitron, sans-serif)' }}
              >
                🏆 Recent Champions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(recentWinners as WinnerRecord[]).map((w) => (
                  <div key={w.id} className="glass-card p-4 flex flex-col gap-1">
                    <div className="text-xs text-[var(--color-text-secondary)] truncate">
                      {w.tournament.name}
                    </div>
                    <div className="text-white font-bold truncate">{w.team.name}</div>
                    <Badge variant="default">{gameLabel(w.tournament.game)}</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
