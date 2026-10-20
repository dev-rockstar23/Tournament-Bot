import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@esports/database';

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { guildId: string; tournamentId: string } }
) {
  // Always scope by BOTH tournamentId AND guildId — prevents cross-guild data leakage
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, guildId: params.guildId },
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
      checkInOpenAt: true,
      checkInCloseAt: true,
      startAt: true,
      endAt: true,
      bannerUrl: true,
      rulesUrl: true,
      guildId: true,
      tournamentCode: true,
      // Approved registrations with team names only — no personal info
      registrations: {
        where: { status: 'APPROVED' },
        select: {
          id: true,
          team: { select: { name: true, tag: true } },
          _count: { select: { members: true } },
        },
      },
      // Stages with matches — no room credentials
      stages: {
        include: {
          matches: {
            select: {
              id: true,
              number: true,
              status: true,
              scheduledStart: true,
              scheduledEnd: true,
              map: true,
              mode: true,
              // roomCredentials intentionally excluded
            },
            orderBy: { number: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ tournament });
}
