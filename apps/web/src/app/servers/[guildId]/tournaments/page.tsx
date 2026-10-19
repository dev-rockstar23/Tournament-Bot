export const revalidate = 60

import { prisma } from '@esports/database'
import { TournamentCatalogue } from '@/components/tournament/TournamentCatalogue'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { guildId: string }
}

export default async function TournamentsPage({ params }: PageProps) {
  const tournaments = await prisma.tournament.findMany({
    where: {
      guildId: params.guildId,
      status: { not: 'ARCHIVED' },
    },
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      name: true,
      game: true,
      mode: true,
      status: true,
      entryType: true,
      teamCapacity: true,
      acceptedCount: true,
      registrationOpenAt: true,
      registrationCloseAt: true,
      startAt: true,
      endAt: true,
      bannerUrl: true,
      guildId: true,
    },
    take: 100,
  })

  // Normalize schema field names for the catalogue component
  const normalized = tournaments.map((t) => ({
    id: t.id,
    guildId: t.guildId,
    name: t.name,
    game: t.game as 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE',
    mode: t.mode as string,
    status: t.status as string,
    entryType: t.entryType as string,
    capacity: t.teamCapacity,
    teamCapacity: t.teamCapacity,
    acceptedCount: t.acceptedCount,
    registrationClose: t.registrationCloseAt?.toISOString() ?? null,
    registrationCloseAt: t.registrationCloseAt?.toISOString() ?? null,
    registrationOpenAt: t.registrationOpenAt?.toISOString() ?? null,
    startAt: t.startAt?.toISOString() ?? null,
    endAt: t.endAt?.toISOString() ?? null,
    bannerUrl: t.bannerUrl,
  }))

  return <TournamentCatalogue tournaments={normalized} guildId={params.guildId} />
}
