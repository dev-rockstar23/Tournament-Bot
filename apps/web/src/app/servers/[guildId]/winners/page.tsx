export const revalidate = 60

import Link from 'next/link'
import { prisma } from '@esports/database'
import { WinnersPodium } from '@/components/tournament/WinnersPodium'

interface PageProps {
  params: { guildId: string }
}

export default async function WinnersPage({ params }: PageProps) {
  const { guildId } = params

  const winners = await prisma.winnerRecord.findMany({
    where: {
      tournament: { guildId },
      isSuperseded: false,
    },
    orderBy: [{ createdAt: 'desc' }, { placement: 'asc' }],
    take: 30,
    include: {
      tournament: { select: { id: true, name: true, game: true, endAt: true } },
      team: { select: { name: true, tag: true } },
    },
  })

  // Collect unique completed tournaments for "View details" links
  const tournamentIds = [...new Set(winners.map((w) => w.tournamentId))]
  const completedTournaments = await prisma.tournament.findMany({
    where: {
      id: { in: tournamentIds },
      guildId,
      status: 'COMPLETED',
    },
    select: { id: true, name: true },
  })
  const completedSet = new Set(completedTournaments.map((t) => t.id))

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1
            className="font-display text-4xl font-black text-white mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hall of Fame
          </h1>
          <p className="text-[var(--color-text-secondary)]">Tournament champions and top finishers</p>
        </div>

        <WinnersPodium winners={winners} />

        {/* Per-tournament detail links */}
        {tournamentIds.length > 0 && (
          <div className="mt-10 space-y-2">
            <h2 className="font-display text-lg font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Tournament Results
            </h2>
            {completedTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/servers/${guildId}/winners/${t.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-[var(--color-border)] hover:bg-white/10 hover:border-violet-500/40 transition-all group"
              >
                <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                  {t.name}
                </span>
                <span className="text-xs text-white/40 group-hover:text-violet-400 transition-colors">
                  View details →
                </span>
              </Link>
            ))}
            {/* Tournaments that have winners but aren't in completedSet are handled above — completedSet shows only finalized ones */}
            {tournamentIds.filter((id) => !completedSet.has(id)).length > 0 && (
              <p className="text-xs text-white/30 pt-1">
                Some tournaments are still in progress.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
