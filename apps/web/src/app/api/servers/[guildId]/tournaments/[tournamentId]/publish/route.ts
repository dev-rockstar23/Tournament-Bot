import { withPermission, AppRole } from '@esports/permissions';
import { prisma } from '@esports/database';
import { NextResponse } from 'next/server';

export const POST = withPermission(
  AppRole.TOURNAMENT_MANAGER,
  async (_req, { guildId, userId, params }) => {
    const tournamentId = params['tournamentId'];
    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    // Always scope by both tournamentId AND guildId — prevents cross-guild data leakage
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, guildId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT tournaments can be published' },
        { status: 400 }
      );
    }

    // Validate required fields before publishing
    const validationErrors: string[] = [];
    if (!tournament.name || tournament.name.trim().length === 0) {
      validationErrors.push('Tournament name is required');
    }
    if (!tournament.game) {
      validationErrors.push('Game is required');
    }
    if (!tournament.mode) {
      validationErrors.push('Mode is required');
    }
    if (!tournament.teamCapacity || tournament.teamCapacity <= 0) {
      validationErrors.push('Team capacity must be greater than 0');
    }
    if (!tournament.registrationOpenAt) {
      validationErrors.push('Registration open date is required');
    }
    if (!tournament.registrationCloseAt) {
      validationErrors.push('Registration close date is required');
    }
    if (!tournament.startAt) {
      validationErrors.push('Tournament start date is required');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Tournament is missing required fields', validationErrors },
        { status: 422 }
      );
    }

    // Create TournamentRuleVersion snapshot
    const lastVersion = await prisma.tournamentRuleVersion.findFirst({
      where: { tournamentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    await prisma.tournamentRuleVersion.create({
      data: {
        tournamentId,
        version: (lastVersion?.version ?? 0) + 1,
        rulesJson: {
          name: tournament.name,
          game: tournament.game,
          mode: tournament.mode,
          capacity: tournament.teamCapacity,
        },
        createdBy: userId,
      },
    });

    // Create OutboxEvent for announcement
    await prisma.outboxEvent.create({
      data: {
        type: 'TOURNAMENT_PUBLISHED',
        payloadJson: {
          tournamentId,
          guildId,
          name: tournament.name,
          game: tournament.game,
        },
        guildId,
        status: 'PENDING',
      },
    });

    // Update tournament status to REGISTRATION_OPEN
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'REGISTRATION_OPEN' },
    });

    return NextResponse.json({ tournament: updated });
  }
);
