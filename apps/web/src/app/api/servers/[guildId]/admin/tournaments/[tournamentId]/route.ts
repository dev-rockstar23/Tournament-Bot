import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic'

// GET /api/servers/[guildId]/admin/tournaments/[tournamentId]
// Returns full admin view of a single tournament including stages, registrations, etc.
export const GET = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (_req, { guildId, params }) => {
    const tournamentId = params['tournamentId'];
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    // Always scope by both IDs — prevents cross-guild data leakage
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            matches: {
              orderBy: { number: 'asc' },
              select: {
                id: true,
                number: true,
                status: true,
                scheduledStart: true,
                scheduledEnd: true,
                map: true,
                mode: true,
                // roomCredentials intentionally excluded from admin list view
              },
            },
          },
        },
        ruleVersions: {
          where: { isActive: true },
          take: 1,
          orderBy: { version: 'desc' },
        },
        registrations: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            team: { select: { id: true, name: true, tag: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json({ tournament });
  }
);

const patchTournamentSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  game: z.enum(['BGMI', 'FREE_FIRE', 'COD_MOBILE']).optional(),
  mode: z.enum(['BATTLE_ROYALE', 'CLASH_SQUAD', 'MULTIPLAYER']).optional(),
  status: z
    .enum([
      'DRAFT',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'CHECK_IN',
      'LIVE',
      'COMPLETED',
      'CANCELLED',
      'ARCHIVED',
    ])
    .optional(),
  visibility: z.string().optional(),
  teamCapacity: z.number().int().min(0).optional(),
  rosterMin: z.number().int().min(1).optional(),
  rosterMax: z.number().int().min(1).optional(),
  substituteAllowed: z.number().int().min(0).max(2).optional(),
  waitlistEnabled: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
  registrationFormat: z
    .enum([
      'SIMPLE_MENTIONS',
      'CAPTAIN_BASED',
      'FULL_PLAYER_DETAILS',
      'TEAM_WITH_SUBSTITUTE',
      'CODM_FIVE_PLAYER',
      'FULL_WITH_SUBSTITUTE',
    ])
    .optional(),
  entryType: z.enum(['FREE', 'PAID']).optional(),
  bannerUrl: z.string().url().optional(),
  rulesUrl: z.string().url().optional(),
  registrationOpenAt: z.string().datetime().optional().nullable(),
  registrationCloseAt: z.string().datetime().optional().nullable(),
  checkInOpenAt: z.string().datetime().optional().nullable(),
  checkInCloseAt: z.string().datetime().optional().nullable(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  mapPool: z.array(z.string()).optional(),
});

// PATCH /api/servers/[guildId]/admin/tournaments/[tournamentId]
// Update tournament fields. guildId always comes from params, never from body.
export const PATCH = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (req, { guildId, params }) => {
    const tournamentId = params['tournamentId'];
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    // Verify tournament belongs to this guild
    const existing = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = patchTournamentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const {
      registrationOpenAt,
      registrationCloseAt,
      checkInOpenAt,
      checkInCloseAt,
      startAt,
      endAt,
      ...rest
    } = parsed.data;

    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        ...rest,
        // Convert ISO string dates to Date objects for Prisma
        ...(registrationOpenAt !== undefined && {
          registrationOpenAt: registrationOpenAt ? new Date(registrationOpenAt) : null,
        }),
        ...(registrationCloseAt !== undefined && {
          registrationCloseAt: registrationCloseAt ? new Date(registrationCloseAt) : null,
        }),
        ...(checkInOpenAt !== undefined && {
          checkInOpenAt: checkInOpenAt ? new Date(checkInOpenAt) : null,
        }),
        ...(checkInCloseAt !== undefined && {
          checkInCloseAt: checkInCloseAt ? new Date(checkInCloseAt) : null,
        }),
        ...(startAt !== undefined && {
          startAt: startAt ? new Date(startAt) : null,
        }),
        ...(endAt !== undefined && {
          endAt: endAt ? new Date(endAt) : null,
        }),
      },
    });

    return NextResponse.json({ tournament: updated });
  }
);
