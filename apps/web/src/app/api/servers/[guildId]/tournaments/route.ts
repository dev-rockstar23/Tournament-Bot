import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@esports/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const game = searchParams.get('game');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const skip = (page - 1) * limit;

  // Always scope by guildId — non-negotiable
  const where: Record<string, unknown> = { guildId: params.guildId };

  // Only show non-draft, non-archived tournaments publicly
  if (status) {
    where['status'] = status;
  } else {
    where['status'] = { notIn: ['DRAFT', 'ARCHIVED'] };
  }

  if (game) where['game'] = game;
  if (search) where['name'] = { contains: search, mode: 'insensitive' };

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startAt: 'asc' },
      select: {
        // SAFE public fields only — never return room credentials or private data
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
      },
    }),
    prisma.tournament.count({ where }),
  ]);

  return NextResponse.json({
    tournaments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
