import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@esports/database'
import { RegistrationForm } from '@/components/tournament/RegistrationForm'

interface PageProps {
  params: { guildId: string; tournamentId: string }
}

export default async function RegisterPage({ params }: PageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/?next=/servers/${params.guildId}/tournaments/${params.tournamentId}/register`
    )
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
      <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <p className="text-[var(--color-text-secondary)] text-lg">
            Registration is not currently open for this tournament.
          </p>
        </div>
      </main>
    )
  }

  // Normalize field names for RegistrationForm
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
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1
          className="font-display text-3xl font-black text-white mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {tournament.name}
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Register Your Team</p>
        <RegistrationForm tournament={tournamentInfo} guildId={params.guildId} />
      </div>
    </main>
  )
}
