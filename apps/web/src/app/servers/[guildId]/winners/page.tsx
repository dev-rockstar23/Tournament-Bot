export const revalidate = 60

import { prisma } from '@esports/database'
import { WinnersPodium } from '@/components/tournament/WinnersPodium'

interface PageProps {
  params: { guildId: string }
}

export default async function WinnersPage({ params }: PageProps) {
  const winners = await prisma.winnerRecord.findMany({
    where: {
      tournament: { guildId: params.guildId },
      isSuperseded: false,
    },
    orderBy: [{ createdAt: 'desc' }, { placement: 'asc' }],
    take: 30,
    include: {
      tournament: { select: { id: true, name: true, game: true, endAt: true } },
      team: { select: { name: true, tag: true } },
    },
  })

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
      </div>
    </main>
  )
}
