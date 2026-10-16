import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@esports/database';

// Public endpoint — no auth required
// Scoped by BOTH guildId AND tournamentId — prevents cross-guild data leakage
// NEVER returns PENDING registrations or private data
export async function GET(
  _request: NextRequest,
  { params }: { params: { guildId: string; tournamentId: string } }
) {
  const { guildId, tournamentId } = params;

  // Validate tournament belongs to guild before returning any data
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, guildId },
    select: { id: true, name: true, game: true, completedAt: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const winners = await prisma.winnerRecord.findMany({
    where: {
      tournamentId,
      tournament: { guildId },
      isSuperseded: false,
    },
    orderBy: { placement: 'asc' },
    select: {
      id: true,
      tournamentId: true,
      placement: true,
      awardType: true,
      version: true,
      createdAt: true,
      team: {
        select: { name: true, tag: true },
      },
    },
  });

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      game: tournament.game,
      completedAt: tournament.completedAt,
    },
    winners,
  });
}
