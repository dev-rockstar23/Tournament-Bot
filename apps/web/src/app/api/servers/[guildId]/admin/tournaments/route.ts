import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const GET = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId }) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const game = searchParams.get('game');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    // Always scope by guildId — non-negotiable
    const where: Record<string, unknown> = { guildId };

    // Admin can see ALL statuses including DRAFT; filter only when explicitly requested
    if (status) {
      where['status'] = status;
    }
    // No status filter applied when status param is absent — admin sees everything

    if (game) where['game'] = game;
    if (search) where['name'] = { contains: search, mode: 'insensitive' };

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          visibility: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          organizerId: true,
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
);

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  game: z.enum(['BGMI', 'FREE_FIRE', 'COD_MOBILE']),
  mode: z.string().min(1),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PUBLIC', 'MEMBERS_ONLY']).default('PUBLIC'),
});

export const POST = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, userId }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createTournamentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { name, game, mode, description, visibility } = parsed.data;

    // Map game mode string to GameMode enum value
    const gameModeMap: Record<string, string> = {
      'Battle Royale': 'BATTLE_ROYALE',
      'Clash Squad': 'CLASH_SQUAD',
      'Multiplayer': 'MULTIPLAYER',
      'BATTLE_ROYALE': 'BATTLE_ROYALE',
      'CLASH_SQUAD': 'CLASH_SQUAD',
      'MULTIPLAYER': 'MULTIPLAYER',
    };
    const mappedMode = gameModeMap[mode] ?? mode;

    const tournament = await prisma.tournament.create({
      data: {
        guildId,                 // always from params, never from body
        name,
        game: game as 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE',
        mode: mappedMode as 'BATTLE_ROYALE' | 'CLASH_SQUAD' | 'MULTIPLAYER',
        description,
        visibility: visibility.toLowerCase(),
        status: 'DRAFT',
        organizerId: userId,
        teamCapacity: 0,         // caller updates in wizard steps
        rosterMin: 2,
        rosterMax: 4,
      },
    });

    return NextResponse.json({ tournament }, { status: 201 });
  }
);
