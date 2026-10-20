import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@esports/database';

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? '20', 10),
    100
  );

  // Scope winners to guild via tournament relation — non-negotiable
  const winners = await prisma.winnerRecord.findMany({
    where: {
      tournament: { guildId: params.guildId },
      isSuperseded: false,
    },
    orderBy: [{ createdAt: 'desc' }, { placement: 'asc' }],
    take: limit,
    include: {
      tournament: {
        select: { id: true, name: true, game: true, completedAt: true, tournamentCode: true },
      },
      team: { select: { name: true, tag: true } },
    },
  });

  return NextResponse.json({ winners });
}
