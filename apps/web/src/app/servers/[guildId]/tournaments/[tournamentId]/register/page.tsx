import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@esports/database'
import { RegistrationForm } from '@/components/tournament/RegistrationForm'
import Navigation from '@/components/ui/Navigation'
import { NeonText } from '@/components/ui/NeonText'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBar } from '@/components/ui/StatusBar'
import { CyberBreadcrumb } from '@/components/ui/CyberBreadcrumb'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const roleLabels = ['IGL / CAPTAIN', 'ASSAULTER', 'ENTRY FRAGGER', 'SUPPORT', 'SUBSTITUTE']

const gameLabels: Record<string, string> = {
  BGMI: 'BGMI',
  FREE_FIRE: 'Free Fire',
  COD_MOBILE: 'CoD Mobile',
}

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function RegisterPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/?next=/servers/${params.guildId}/tournaments/${params.tournamentId}/register`)
  }

  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, guildId: params.guildId },
    select: {
      id: true,
      name: true,
      game: true,
      status: true,
      teamCapacity: true,
      acceptedCount: true,
      registrationOpenAt: true,
      registrationCloseAt: true,
      registrationFormat: true,
    },
  })

  if (!tournament) notFound()

  if (tournament.status !== 'REGISTRATION_OPEN') {
    return (
      <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="scanline-overlay" aria-hidden="true" />
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <NeonText as="h2" color="violet" className="text-2xl font-black tracking-widest mb-4">
            REGISTRATION CLOSED
          </NeonText>
          <p className="text-[var(--color-text-secondary)] font-mono text-sm mb-6">
            Registration is not currently open for this tournament.
          </p>
          <Link
            href={`/servers/${params.guildId}/tournaments/${params.tournamentId}`}
            className="text-xs font-mono text-[var(--color-neon-cyan)] hover:text-white tracking-widest uppercase transition-colors"
          >
            ← BACK TO TOURNAMENT
          </Link>
        </div>
        <StatusBar shardOnline={false} />
      </main>
    )
  }

  const slotsRemaining = tournament.teamCapacity - tournament.acceptedCount
  const fillPct = tournament.teamCapacity > 0
    ? Math.min((tournament.acceptedCount / tournament.teamCapacity) * 100, 100)
    : 0

  const tournamentInfo = {
    id: tournament.id,
    name: tournament.name,
    game: tournament.game as string,
    status: tournament.status as string,
    capacity: tournament.teamCapacity,
    acceptedCount: tournament.acceptedCount,
    registrationOpenAt: tournament.registrationOpenAt?.toISOString() ?? null,
    registrationCloseAt: tournament.registrationCloseAt?.toISOString() ?? null,
    registrationFormat: tournament.registrationFormat as string,
  }

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="scanline-overlay" aria-hidden="true" />
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CyberBreadcrumb
          labels={{
            servers: 'Servers',
            [params.guildId]: 'Guild',
            tournaments: 'Tournaments',
            [params.tournamentId]: tournament.name,
            register: 'Register',
          }}
          className="mb-6"
        />

        {/* Page header */}
        <div className="mb-8">
          <NeonText as="h1" color="violet" glitch className="text-3xl sm:text-4xl font-black tracking-wider mb-2">
            SQUAD REGISTRATION
          </NeonText>
          <p className="font-mono text-sm text-[var(--color-text-secondary)] tracking-widest">
            {tournament.name} · {gameLabels[tournament.game] ?? tournament.game}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Registration form */}
          <div className="lg:col-span-2">
            {/* Team Identity header */}
            <GlassCard neonColor="violet" className="p-5 mb-4">
              <p className="text-xs font-mono text-[var(--color-neon-violet)] tracking-widest uppercase mb-2 font-bold">
                TEAM IDENTITY
              </p>
              <p className="text-xs font-mono text-[var(--color-text-muted)]">
                Enter your squad details below. Captain must verify via Discord auth.
              </p>
            </GlassCard>

            {/* Roster slot labels */}
            <GlassCard hud className="p-4 mb-4">
              <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-3">ROSTER ROLE ASSIGNMENTS</p>
              <div className="grid grid-cols-5 gap-2">
                {roleLabels.map((role, i) => (
                  <div key={role} className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-sm font-bold border ${
                      i === 0 ? 'bg-[var(--color-neon-violet)]/20 border-[var(--color-neon-violet)]/40 text-[var(--color-neon-violet)]' :
                      i === 4 ? 'bg-white/5 border-white/10 text-[var(--color-text-muted)]' :
                      'bg-[var(--color-neon-cyan)]/10 border-[var(--color-neon-cyan)]/30 text-[var(--color-neon-cyan)]'
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-[10px] font-mono text-[var(--color-text-muted)] tracking-wider leading-tight">
                      {role}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <RegistrationForm tournament={tournamentInfo} guildId={params.guildId} />
          </div>

          {/* Slot Engine sidebar */}
          <div className="flex flex-col gap-4">
            {/* Slot Engine */}
            <GlassCard neonColor="cyan" className="p-5">
              <p className="text-xs font-mono text-[var(--color-neon-cyan)] tracking-widest uppercase mb-3 font-bold">
                SLOT ENGINE
              </p>
              <div className="grid grid-cols-5 gap-1.5 mb-4">
                {Array.from({ length: tournament.teamCapacity }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-6 rounded text-center text-[10px] font-mono font-bold leading-6 border ${
                      i < tournament.acceptedCount
                        ? 'bg-[var(--color-neon-violet)]/20 border-[var(--color-neon-violet)]/50 text-[var(--color-neon-violet)]'
                        : 'bg-white/5 border-white/10 text-[var(--color-text-muted)]'
                    }`}
                    title={i < tournament.acceptedCount ? 'TAKEN' : 'AVAILABLE'}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-[var(--color-text-muted)] tracking-wider">FILLED</span>
                <span className="text-[var(--color-neon-violet)]">{tournament.acceptedCount}/{tournament.teamCapacity}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-neon-violet)] to-[var(--color-neon-cyan)] transition-all"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div className="flex items-center gap-2 justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[var(--color-neon-violet)]/20 border border-[var(--color-neon-violet)]/50 inline-block" />
                  <span className="text-[var(--color-text-muted)]">TAKEN</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white/5 border border-white/10 inline-block" />
                  <span className="text-[var(--color-text-muted)]">AVAILABLE ({slotsRemaining})</span>
                </span>
              </div>
            </GlassCard>

            {/* Escrow checkout panel */}
            <GlassCard hud className="p-5">
              <p className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-3 font-bold">
                ESCROW CHECKOUT
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span className="tracking-wider">ENTRY FEE</span>
                  <span className="text-white font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span className="tracking-wider">SLOTS REMAINING</span>
                  <span className="text-[var(--color-neon-cyan)] font-bold">{slotsRemaining}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-[var(--color-text-muted)] tracking-wider">STATUS</span>
                  <span className="text-green-400 font-bold tracking-widest uppercase">OPEN</span>
                </div>
              </div>
            </GlassCard>

            {/* Nav links */}
            <div className="text-center">
              <Link
                href={`/servers/${params.guildId}/tournaments/${params.tournamentId}`}
                className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-neon-cyan)] tracking-widest uppercase transition-colors"
              >
                ← BACK TO TOURNAMENT
              </Link>
            </div>
          </div>
        </div>
      </div>

      <StatusBar shardOnline>
        <span className="text-[var(--color-neon-green)]">REGISTRATION OPEN</span>
        <span className="mx-2 text-[var(--color-text-muted)]">|</span>
        <span>SLOTS: <span className="text-[var(--color-neon-cyan)]">{slotsRemaining} REMAINING</span></span>
      </StatusBar>
    </main>
  )
}
